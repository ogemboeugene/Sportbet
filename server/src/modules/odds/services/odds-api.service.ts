import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface OddsApiSport {
  key: string;
  title: string;
  description: string;
  active: boolean;
  has_outrights: boolean;
}

export interface OddsApiEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiBookmaker[];
}

export interface OddsApiBookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: OddsApiMarket[];
}

export interface OddsApiMarket {
  key: string;
  last_update: string;
  outcomes: OddsApiOutcome[];
}

export interface OddsApiOutcome {
  name: string;
  price: number;
  point?: number;
}

@Injectable()
export class OddsApiService {
  private readonly logger = new Logger(OddsApiService.name);
  private readonly httpClient: AxiosInstance;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ODDS_API_KEY');
    this.baseUrl = this.configService.get<string>('ODDS_API_BASE_URL', 'https://api.the-odds-api.com');
    
    if (!this.apiKey) {
      throw new Error('ODDS_API_KEY is required');
    }

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      params: {
        apiKey: this.apiKey,
      },
    });

    // Add request/response interceptors for logging
    this.httpClient.interceptors.request.use(
      (config) => {
        this.logger.debug(`Making request to: ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    this.httpClient.interceptors.response.use(
      (response) => {
        // Log API quota usage for monitoring
        const remainingRequests = response.headers['x-requests-remaining'];
        const usedRequests = response.headers['x-requests-used'];
        const lastRequestCost = response.headers['x-requests-last'];
        
        if (remainingRequests) {
          this.logger.log(`API Quota - Remaining: ${remainingRequests}, Used: ${usedRequests}, Last Cost: ${lastRequestCost}`);
        }
        
        this.logger.debug(`Response from ${response.config.url}: ${response.status}`);
        return response;
      },
      (error) => {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        
        if (status === 401 && message.includes('quota')) {
          this.logger.warn(`API quota exceeded: ${message}`);
          // Return empty data instead of throwing error to prevent app crash
          return { data: [] };
        }
        
        this.logger.error(`API Error: ${status} - ${message}`);
        return Promise.reject(error);
      }
    );
  }

  async getSports(): Promise<OddsApiSport[]> {
    try {
      const response = await this.httpClient.get('/v4/sports');
      return response.data || [];
    } catch (error) {
      this.logger.error('Failed to fetch sports:', error);
      // Return empty array instead of throwing error when quota exceeded
      if (error.response?.status === 401 && error.response?.data?.message?.includes('quota')) {
        this.logger.warn('API quota exceeded, returning empty sports list');
        return [];
      }
      throw new HttpException(
        'Failed to fetch sports data',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  async getOdds(
    sportKey: string,
    regions: string = 'us,uk,eu',
    markets: string = 'h2h,spreads,totals',
    oddsFormat: string = 'decimal',
    dateFormat: string = 'iso'
  ): Promise<OddsApiEvent[]> {
    try {
      // Check if this is a championship/winner sport that requires different parameters
      const isChampionshipSport = sportKey.includes('_winner') || 
                                  sportKey.includes('_championship') ||
                                  sportKey.includes('_tournament');

      const effectiveMarkets = isChampionshipSport 
        ? 'outrights' // Use outrights for championship sports
        : markets; // Use provided markets for regular sports

      const response = await this.httpClient.get(`/v4/sports/${sportKey}/odds`, {
        params: {
          regions,
          markets: effectiveMarkets,
          oddsFormat,
          dateFormat,
        },
      });
      return response.data || [];
    } catch (error) {
      this.logger.error(`Failed to fetch odds for sport ${sportKey}:`, error);
      // Return empty array instead of throwing error when quota exceeded
      if (error.response?.status === 401 && error.response?.data?.message?.includes('quota')) {
        this.logger.warn(`API quota exceeded for sport ${sportKey}, returning empty odds`);
        return [];
      }
      // Return empty array for invalid parameter combinations (422 errors)
      if (error.response?.status === 422) {
        this.logger.warn(`Invalid parameter combination for sport ${sportKey}, skipping...`);
        return [];
      }
      throw new HttpException(
        `Failed to fetch odds for sport ${sportKey}`,
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  async getOddsBySport(
    sportKey: string,
    regions: string,
    markets: string,
    oddsFormat: string = 'decimal',
    dateFormat: string = 'iso'
  ): Promise<OddsApiEvent[]> {
    try {
      const response = await this.httpClient.get(`/v4/sports/${sportKey}/odds`, {
        params: {
          regions,
          markets,
          oddsFormat,
          dateFormat,
        },
      });
      return response.data || [];
    } catch (error) {
      this.logger.error(`Failed to fetch odds for sport ${sportKey} with custom params:`, error);
      if (error.response?.status === 422) {
        this.logger.warn(`Invalid parameter combination for sport ${sportKey}, returning empty array.`);
        return [];
      }
      throw new HttpException(
        `Failed to fetch odds for sport ${sportKey}`,
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  async getEventOdds(
    sportKey: string,
    eventId: string,
    regions: string = 'us,uk,eu',
    markets: string = 'h2h,spreads,totals',
    oddsFormat: string = 'decimal'
  ): Promise<OddsApiEvent> {
    try {
      const response = await this.httpClient.get(`/v4/sports/${sportKey}/events/${eventId}/odds`, {
        params: {
          regions,
          markets,
          oddsFormat,
        },
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch odds for event ${eventId}:`, error);
      throw new HttpException(
        `Failed to fetch odds for event ${eventId}`,
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  async getScores(sportKey: string, daysFrom: number = 3): Promise<any[]> {
    try {
      const response = await this.httpClient.get(`/v4/sports/${sportKey}/scores`, {
        params: {
          daysFrom,
        },
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch scores for sport ${sportKey}:`, error);
      throw new HttpException(
        `Failed to fetch scores for sport ${sportKey}`,
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }
}