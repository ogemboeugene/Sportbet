import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OddsService } from './services/odds.service';
import { SeedService } from './services/seed.service';
import { Sport } from '../../database/schemas/sport.schema';
import { Event } from '../../database/schemas/event.schema';

@Controller('odds')
export class OddsController {
  constructor(
    private readonly oddsService: OddsService,
    private readonly seedService: SeedService,
  ) {}

  @Get('sports')
  async getSports(): Promise<Sport[]> {
    return this.oddsService.getAllSports();
  }

  @Get('sports/:sportKey/events')
  async getEventsBySport(
    @Param('sportKey') sportKey: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ): Promise<Event[]> {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const statusFilter = status || 'upcoming';
    
    return this.oddsService.getEventsBySport(sportKey, limitNum, statusFilter);
  }

  @Get('events/:eventId')
  async getEventById(@Param('eventId') eventId: string): Promise<Event | null> {
    return this.oddsService.getEventById(eventId);
  }

  @Post('sync/sports')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async syncSports(): Promise<{ message: string }> {
    await this.oddsService.syncSports();
    return { message: 'Sports synchronization completed' };
  }

  @Post('sync/odds/:sportKey')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async syncOddsForSport(
    @Param('sportKey') sportKey: string,
  ): Promise<{ message: string }> {
    await this.oddsService.syncOddsForSport(sportKey);
    return { message: `Odds synchronization completed for ${sportKey}` };
  }

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  async seedData(): Promise<{ message: string }> {
    await this.seedService.seedAll();
    return { message: 'Sample data seeded successfully' };
  }

  @Get('popular')
  async getPopularEvents(): Promise<Event[]> {
    // Get events from popular sports (football, basketball, soccer)
    const popularSports = ['americanfootball_nfl', 'basketball_nba', 'soccer_epl'];
    const events: Event[] = [];
    
    for (const sportKey of popularSports) {
      const sportEvents = await this.oddsService.getEventsBySport(sportKey, 10, 'upcoming');
      events.push(...sportEvents);
    }
    
    // Sort by start time and return top 20
    return events
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 20);
  }

  @Get('live')
  async getLiveEvents(): Promise<Event[]> {
    const sports = await this.oddsService.getAllSports();
    const liveEvents: Event[] = [];
    
    for (const sport of sports) {
      const events = await this.oddsService.getEventsBySport(sport.key, 20, 'live');
      liveEvents.push(...events);
    }
    
    return liveEvents.slice(0, 50);
  }

  @Get('upcoming')
  async getUpcomingEvents(
    @Query('limit') limit?: string,
    @Query('hours') hours?: string,
  ): Promise<Event[]> {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const hoursNum = hours ? parseInt(hours, 10) : 24;
    
    const sports = await this.oddsService.getAllSports();
    const upcomingEvents: Event[] = [];
    
    const now = new Date();
    const maxTime = new Date(now.getTime() + hoursNum * 60 * 60 * 1000);
    
    for (const sport of sports) {
      const events = await this.oddsService.getEventsBySport(sport.key, 50, 'upcoming');
      const filteredEvents = events.filter(event => 
        new Date(event.startTime) <= maxTime
      );
      upcomingEvents.push(...filteredEvents);
    }
    
    return upcomingEvents
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, limitNum);
  }

  @Get('search')
  async searchEvents(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ): Promise<Event[]> {
    if (!query) {
      return [];
    }
    const limitNum = limit ? parseInt(limit, 10) : 25;
    return this.oddsService.searchEvents(query, limitNum);
  }

  @Get('sports/:sportKey/odds')
  async getOddsBySport(
    @Param('sportKey') sportKey: string,
    @Query('region') region: string = 'us',
    @Query('market') market: string = 'h2h',
  ) {
    return this.oddsService.getOddsBySportFromApi(sportKey, region, market);
  }
}