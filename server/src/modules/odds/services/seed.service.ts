import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Sport, SportDocument } from '../../../database/schemas/sport.schema';
import { Event, EventDocument } from '../../../database/schemas/event.schema';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(Sport.name) private sportModel: Model<SportDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
  ) {}

  async seedSports(): Promise<void> {
    try {
      const existingSports = await this.sportModel.countDocuments();
      if (existingSports > 0) {
        this.logger.log('Sports already exist, skipping seed');
        return;
      }

      const sports = [
        {
          key: 'soccer_epl',
          title: 'English Premier League',
          description: 'English Premier League Soccer',
          active: true,
          order: 1,
        },
        {
          key: 'soccer_uefa_champs_league',
          title: 'UEFA Champions League',
          description: 'UEFA Champions League Soccer',
          active: true,
          order: 2,
        },
        {
          key: 'basketball_nba',
          title: 'NBA',
          description: 'National Basketball Association',
          active: true,
          order: 3,
        },
        {
          key: 'americanfootball_nfl',
          title: 'NFL',
          description: 'National Football League',
          active: true,
          order: 4,
        },
        {
          key: 'tennis_atp_aus_open_singles',
          title: 'Australian Open',
          description: 'Tennis Australian Open Singles',
          active: true,
          order: 5,
        },
        {
          key: 'baseball_mlb',
          title: 'MLB',
          description: 'Major League Baseball',
          active: true,
          order: 6,
        },
        {
          key: 'icehockey_nhl',
          title: 'NHL',
          description: 'National Hockey League',
          active: true,
          order: 7,
        },
        {
          key: 'soccer_fifa_world_cup',
          title: 'FIFA World Cup',
          description: 'FIFA World Cup Soccer',
          active: true,
          order: 8,
        },
      ];

      await this.sportModel.insertMany(sports);
      this.logger.log(`Seeded ${sports.length} sports`);
    } catch (error) {
      this.logger.error('Failed to seed sports:', error);
    }
  }

  async seedEvents(): Promise<void> {
    try {
      const existingEvents = await this.eventModel.countDocuments();
      if (existingEvents > 0) {
        this.logger.log('Events already exist, skipping seed');
        return;
      }

      const now = new Date();
      const events = [
        // Premier League Events
        {
          eventId: 'epl_001',
          sportKey: 'soccer_epl',
          homeTeam: 'Manchester United',
          awayTeam: 'Liverpool',
          startTime: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
          status: 'upcoming',
          markets: [
            {
              marketId: 'epl_001_h2h',
              marketName: 'Match Winner',
              selections: [
                { selectionId: 'epl_001_h2h_home', selectionName: 'Manchester United', odds: 2.45, active: true },
                { selectionId: 'epl_001_h2h_draw', selectionName: 'Draw', odds: 3.20, active: true },
                { selectionId: 'epl_001_h2h_away', selectionName: 'Liverpool', odds: 2.80, active: true },
              ],
            },
            {
              marketId: 'epl_001_totals',
              marketName: 'Total Goals',
              selections: [
                { selectionId: 'epl_001_totals_over', selectionName: 'Over 2.5', odds: 1.85, active: true },
                { selectionId: 'epl_001_totals_under', selectionName: 'Under 2.5', odds: 1.95, active: true },
              ],
            },
          ],
        },
        {
          eventId: 'epl_002',
          sportKey: 'soccer_epl',
          homeTeam: 'Arsenal',
          awayTeam: 'Chelsea',
          startTime: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 1 day from now
          status: 'upcoming',
          markets: [
            {
              marketId: 'epl_002_h2h',
              marketName: 'Match Winner',
              selections: [
                { selectionId: 'epl_002_h2h_home', selectionName: 'Arsenal', odds: 2.10, active: true },
                { selectionId: 'epl_002_h2h_draw', selectionName: 'Draw', odds: 3.40, active: true },
                { selectionId: 'epl_002_h2h_away', selectionName: 'Chelsea', odds: 3.60, active: true },
              ],
            },
          ],
        },
        // NBA Events
        {
          eventId: 'nba_001',
          sportKey: 'basketball_nba',
          homeTeam: 'Los Angeles Lakers',
          awayTeam: 'Boston Celtics',
          startTime: new Date(now.getTime() + 6 * 60 * 60 * 1000), // 6 hours from now
          status: 'upcoming',
          markets: [
            {
              marketId: 'nba_001_h2h',
              marketName: 'Match Winner',
              selections: [
                { selectionId: 'nba_001_h2h_home', selectionName: 'Los Angeles Lakers', odds: 1.90, active: true },
                { selectionId: 'nba_001_h2h_away', selectionName: 'Boston Celtics', odds: 1.90, active: true },
              ],
            },
            {
              marketId: 'nba_001_totals',
              marketName: 'Total Points',
              selections: [
                { selectionId: 'nba_001_totals_over', selectionName: 'Over 220.5', odds: 1.90, active: true },
                { selectionId: 'nba_001_totals_under', selectionName: 'Under 220.5', odds: 1.90, active: true },
              ],
            },
          ],
        },
        // NFL Events
        {
          eventId: 'nfl_001',
          sportKey: 'americanfootball_nfl',
          homeTeam: 'Kansas City Chiefs',
          awayTeam: 'Buffalo Bills',
          startTime: new Date(now.getTime() + 48 * 60 * 60 * 1000), // 2 days from now
          status: 'upcoming',
          markets: [
            {
              marketId: 'nfl_001_h2h',
              marketName: 'Match Winner',
              selections: [
                { selectionId: 'nfl_001_h2h_home', selectionName: 'Kansas City Chiefs', odds: 2.20, active: true },
                { selectionId: 'nfl_001_h2h_away', selectionName: 'Buffalo Bills', odds: 1.70, active: true },
              ],
            },
            {
              marketId: 'nfl_001_spreads',
              marketName: 'Point Spread',
              selections: [
                { selectionId: 'nfl_001_spreads_home', selectionName: 'Kansas City Chiefs +3.5', odds: 1.90, active: true },
                { selectionId: 'nfl_001_spreads_away', selectionName: 'Buffalo Bills -3.5', odds: 1.90, active: true },
              ],
            },
          ],
        },
        // Champions League
        {
          eventId: 'ucl_001',
          sportKey: 'soccer_uefa_champs_league',
          homeTeam: 'Real Madrid',
          awayTeam: 'Manchester City',
          startTime: new Date(now.getTime() + 72 * 60 * 60 * 1000), // 3 days from now
          status: 'upcoming',
          markets: [
            {
              marketId: 'ucl_001_h2h',
              marketName: 'Match Winner',
              selections: [
                { selectionId: 'ucl_001_h2h_home', selectionName: 'Real Madrid', odds: 2.75, active: true },
                { selectionId: 'ucl_001_h2h_draw', selectionName: 'Draw', odds: 3.20, active: true },
                { selectionId: 'ucl_001_h2h_away', selectionName: 'Manchester City', odds: 2.60, active: true },
              ],
            },
          ],
        },
        // Live Event Example
        {
          eventId: 'epl_live_001',
          sportKey: 'soccer_epl',
          homeTeam: 'Tottenham',
          awayTeam: 'Newcastle',
          startTime: new Date(now.getTime() - 30 * 60 * 1000), // Started 30 minutes ago
          status: 'live',
          score: { home: 1, away: 0 },
          markets: [
            {
              marketId: 'epl_live_001_h2h',
              marketName: 'Match Winner',
              selections: [
                { selectionId: 'epl_live_001_h2h_home', selectionName: 'Tottenham', odds: 1.75, active: true },
                { selectionId: 'epl_live_001_h2h_draw', selectionName: 'Draw', odds: 3.80, active: true },
                { selectionId: 'epl_live_001_h2h_away', selectionName: 'Newcastle', odds: 4.20, active: true },
              ],
            },
          ],
        },
      ];

      await this.eventModel.insertMany(events);
      this.logger.log(`Seeded ${events.length} events`);
    } catch (error) {
      this.logger.error('Failed to seed events:', error);
    }
  }

  async seedAll(): Promise<void> {
    this.logger.log('Starting data seeding...');
    await this.seedSports();
    await this.seedEvents();
    this.logger.log('Data seeding completed');
  }
}
