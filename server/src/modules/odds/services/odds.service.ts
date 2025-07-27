import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Sport, SportDocument } from '../../../database/schemas/sport.schema';
import { Event, EventDocument, Market } from '../../../database/schemas/event.schema';
import { OddsApiService, OddsApiSport, OddsApiEvent } from './odds-api.service';
import { CacheService } from './cache.service';

@Injectable()
export class OddsService {
  private readonly logger = new Logger(OddsService.name);

  constructor(
    @InjectModel(Sport.name) private sportModel: Model<SportDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    private oddsApiService: OddsApiService,
    private cacheService: CacheService,
  ) {}

  async syncSports(): Promise<void> {
    try {
      this.logger.log('Starting sports synchronization...');
      
      const apiSports = await this.oddsApiService.getSports();
      
      for (const apiSport of apiSports) {
        await this.sportModel.findOneAndUpdate(
          { key: apiSport.key },
          {
            key: apiSport.key,
            title: apiSport.title,
            description: apiSport.description,
            active: apiSport.active,
            updatedAt: new Date(),
          },
          { upsert: true, new: true }
        );
      }

      this.logger.log(`Synchronized ${apiSports.length} sports`);
      
      // Cache the sports data
      await this.cacheService.set('sports:all', apiSports, 3600); // Cache for 1 hour
    } catch (error) {
      this.logger.error('Failed to sync sports:', error);
      throw error;
    }
  }

  async syncOddsForSport(sportKey: string): Promise<void> {
    try {
      this.logger.log(`Starting odds synchronization for sport: ${sportKey}`);
      
      const apiEvents = await this.oddsApiService.getOdds(sportKey);
      
      for (const apiEvent of apiEvents) {
        const markets = this.transformMarketsFromApi(apiEvent);
        
        await this.eventModel.findOneAndUpdate(
          { eventId: apiEvent.id },
          {
            eventId: apiEvent.id,
            sportKey: apiEvent.sport_key,
            homeTeam: apiEvent.home_team,
            awayTeam: apiEvent.away_team,
            startTime: new Date(apiEvent.commence_time),
            markets,
            status: this.determineEventStatus(new Date(apiEvent.commence_time)),
            lastOddsUpdate: new Date(),
            updatedAt: new Date(),
          },
          { upsert: true, new: true }
        );
      }

      this.logger.log(`Synchronized ${apiEvents.length} events for sport ${sportKey}`);
      
      // Cache the odds data
      await this.cacheService.set(`odds:${sportKey}`, apiEvents, 300); // Cache for 5 minutes
    } catch (error) {
      this.logger.error(`Failed to sync odds for sport ${sportKey}:`, error);
      throw error;
    }
  }

  private transformMarketsFromApi(apiEvent: OddsApiEvent): Market[] {
    const markets: Market[] = [];
    
    if (apiEvent.bookmakers && apiEvent.bookmakers.length > 0) {
      // Use the first bookmaker's markets (you can implement logic to choose best odds)
      const bookmaker = apiEvent.bookmakers[0];
      
      for (const apiMarket of bookmaker.markets) {
        const market: Market = {
          marketId: `${apiEvent.id}_${apiMarket.key}`,
          marketName: this.getMarketDisplayName(apiMarket.key),
          selections: apiMarket.outcomes.map((outcome, index) => ({
            selectionId: `${apiEvent.id}_${apiMarket.key}_${index}`,
            selectionName: outcome.name,
            odds: outcome.price,
            active: true,
          })),
        };
        
        markets.push(market);
      }
    }
    
    return markets;
  }

  private getMarketDisplayName(marketKey: string): string {
    const marketNames = {
      'h2h': 'Match Winner',
      'spreads': 'Point Spread',
      'totals': 'Total Points',
    };
    
    return marketNames[marketKey] || marketKey;
  }

  private determineEventStatus(startTime: Date): string {
    const now = new Date();
    const timeDiff = startTime.getTime() - now.getTime();
    
    if (timeDiff > 0) {
      return 'upcoming';
    } else if (timeDiff > -7200000) { // Within 2 hours of start time
      return 'live';
    } else {
      return 'finished';
    }
  }

  async getAllSports(): Promise<Sport[]> {
    try {
      // Try to get from cache first
      const cachedSports = await this.cacheService.get('sports:all');
      if (cachedSports && Array.isArray(cachedSports)) {
        return cachedSports;
      }

      // If not in cache, get from database
      const sports = await this.sportModel.find({ active: true }).sort({ order: 1, title: 1 });
      
      // Cache the result
      await this.cacheService.set('sports:all', sports, 3600);
      
      return sports;
    } catch (error) {
      this.logger.error('Failed to get sports:', error);
      throw error;
    }
  }

  async getAvailableSports(): Promise<Sport[]> {
    return this.getAllSports();
  }

  async getEventsBySport(
    sportKey: string,
    limit: number = 50,
    status: string = 'upcoming'
  ): Promise<Event[]> {
    try {
      const cacheKey = `events:${sportKey}:${status}:${limit}`;
      
      // Try to get from cache first
      const cachedEvents = await this.cacheService.get(cacheKey);
      if (cachedEvents && Array.isArray(cachedEvents)) {
        return cachedEvents;
      }

      const query: any = { sportKey };
      if (status !== 'all') {
        query.status = status;
      }

      const events = await this.eventModel
        .find(query)
        .sort({ startTime: 1 })
        .limit(limit);
      
      // Cache the result for 2 minutes
      await this.cacheService.set(cacheKey, events, 120);
      
      return events;
    } catch (error) {
      this.logger.error(`Failed to get events for sport ${sportKey}:`, error);
      throw error;
    }
  }

  async getEventById(eventId: string): Promise<Event | null> {
    try {
      const cacheKey = `event:${eventId}`;
      
      // Try to get from cache first
      const cachedEvent = await this.cacheService.get(cacheKey);
      if (cachedEvent && typeof cachedEvent === 'object' && (cachedEvent as any).eventId) {
        return cachedEvent as any;
      }

      const event = await this.eventModel.findOne({ eventId });
      
      if (event) {
        // Cache the result for 1 minute
        await this.cacheService.set(cacheKey, event, 60);
      }
      
      return event;
    } catch (error) {
      this.logger.error(`Failed to get event ${eventId}:`, error);
      throw error;
    }
  }

  async updateEventStatus(eventId: string, status: string, score?: { home: number; away: number }): Promise<void> {
    try {
      const updateData: any = { status, updatedAt: new Date() };
      if (score) {
        updateData.score = score;
      }

      await this.eventModel.findOneAndUpdate(
        { eventId },
        updateData
      );

      // Invalidate cache
      await this.cacheService.delete(`event:${eventId}`);
      
      this.logger.log(`Updated event ${eventId} status to ${status}`);
    } catch (error) {
      this.logger.error(`Failed to update event ${eventId} status:`, error);
      throw error;
    }
  }

  async getOddsBySportFromApi(sportKey: string, region: string = 'eu', market: string = 'h2h') {
    try {
      // Use longer cache (15 minutes) to reduce API calls
      const cacheKey = `odds-api:${sportKey}:${region}:${market}`;
      const cachedData = await this.cacheService.get(cacheKey);
      if (cachedData) {
        this.logger.log(`Returning cached odds for ${sportKey}`);
        return cachedData;
      }

      this.logger.log(`Fetching fresh odds for ${sportKey} from API - using 1 API request`);
      const odds = await this.oddsApiService.getOddsBySport(sportKey, region, market);
      
      // Cache for 15 minutes to reduce API usage
      await this.cacheService.set(cacheKey, odds, 900);
      
      return odds;
    } catch (error) {
      this.logger.error(`Failed to get odds from API for sport ${sportKey}:`, error);
      
      // Try to return stale cache if API fails
      const staleCache = await this.cacheService.get(`odds-api:${sportKey}:${region}:${market}`);
      if (staleCache) {
        this.logger.warn(`API failed, returning stale cache for ${sportKey}`);
        return staleCache;
      }
      
      throw error;
    }
  }

  async searchEvents(query: string, limit: number): Promise<Event[]> {
    try {
      const searchRegex = new RegExp(query, 'i');
      return this.eventModel.find({
        $or: [
          { homeTeam: searchRegex },
          { awayTeam: searchRegex },
          { sportKey: searchRegex },
        ],
        status: 'upcoming'
      })
      .sort({ startTime: 1 })
      .limit(limit)
      .exec();
    } catch (error) {
      this.logger.error(`Failed to search events for query "${query}":`, error);
      throw error;
    }
  }

  // DISABLED: Scheduled jobs to save API quota - now using on-demand fetching with smart caching
  // Only sync sports list once per day at midnight
  @Cron('0 0 * * *') // Daily at midnight
  async scheduledSportsSync(): Promise<void> {
    this.logger.log('Running daily sports synchronization...');
    try {
      await this.syncSports();
    } catch (error) {
      this.logger.error('Scheduled sports sync failed:', error);
    }
  }

  // DISABLED: Too aggressive - was using up API quota
  // @Cron(CronExpression.EVERY_5_MINUTES)
  // async scheduledOddsSync(): Promise<void> { ... }

  // DISABLED: Too aggressive - was using up API quota  
  // @Cron(CronExpression.EVERY_10_MINUTES)
  // async scheduledScoresSync(): Promise<void> { ... }
}