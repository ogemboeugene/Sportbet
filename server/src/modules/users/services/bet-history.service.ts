import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Bet, BetDocument } from '../../../database/schemas/bet.schema';

export interface BetHistoryFilter {
  status?: string;
  sportKey?: string;
  betType?: string;
  startDate?: Date;
  endDate?: Date;
  minStake?: number;
  maxStake?: number;
  search?: string;
}

export interface BetHistoryResponse {
  bets: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: {
    statuses: string[];
    sports: string[];
    betTypes: string[];
  };
}

@Injectable()
export class BetHistoryService {
  private readonly logger = new Logger(BetHistoryService.name);

  constructor(
    @InjectModel(Bet.name) private betModel: Model<BetDocument>,
  ) {}

  async getBetHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
    filters: BetHistoryFilter = {},
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<BetHistoryResponse> {
    try {
      const skip = (page - 1) * limit;
      
      // Build query
      const query = this.buildQuery(userId, filters);
      
      // Build sort object
      const sort: any = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Execute queries
      const [bets, total, filterData] = await Promise.all([
        this.betModel
          .find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        this.betModel.countDocuments(query),
        this.getFilterOptions(userId)
      ]);

      // Enrich bet data
      const enrichedBets = bets.map(bet => this.enrichBetData(bet));

      return {
        bets: enrichedBets,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        filters: {
          ...filterData,
          sports: filterData.sports as string[]
        }
      };
    } catch (error) {
      this.logger.error(`Failed to get bet history for user ${userId}:`, error);
      throw error;
    }
  }

  async searchBets(
    userId: string,
    searchTerm: string,
    page: number = 1,
    limit: number = 20
  ) {
    try {
      const skip = (page - 1) * limit;
      
      // Build search query
      const searchQuery = {
        userId: userId,
        $or: [
          { reference: { $regex: searchTerm, $options: 'i' } },
          { 'selections.homeTeam': { $regex: searchTerm, $options: 'i' } },
          { 'selections.awayTeam': { $regex: searchTerm, $options: 'i' } },
          { 'selections.marketName': { $regex: searchTerm, $options: 'i' } },
          { 'selections.selectionName': { $regex: searchTerm, $options: 'i' } },
          { 'selections.sportKey': { $regex: searchTerm, $options: 'i' } }
        ]
      };

      const [bets, total] = await Promise.all([
        this.betModel
          .find(searchQuery)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        this.betModel.countDocuments(searchQuery)
      ]);

      const enrichedBets = bets.map(bet => this.enrichBetData(bet));

      return {
        bets: enrichedBets,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        searchTerm
      };
    } catch (error) {
      this.logger.error(`Failed to search bets for user ${userId}:`, error);
      throw error;
    }
  }

  async getBetDetails(userId: string, betId: string) {
    try {
      const bet = await this.betModel
        .findOne({ _id: betId, userId })
        .lean();

      if (!bet) {
        return null;
      }

      return this.enrichBetData(bet, true);
    } catch (error) {
      this.logger.error(`Failed to get bet details for user ${userId}, bet ${betId}:`, error);
      throw error;
    }
  }

  private buildQuery(userId: string, filters: BetHistoryFilter) {
    const query: any = { userId };

    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    }

    if (filters.sportKey) {
      query['selections.sportKey'] = filters.sportKey;
    }

    if (filters.betType) {
      query.betType = filters.betType;
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.createdAt.$lte = filters.endDate;
      }
    }

    if (filters.minStake !== undefined || filters.maxStake !== undefined) {
      query.stake = {};
      if (filters.minStake !== undefined) {
        query.stake.$gte = filters.minStake;
      }
      if (filters.maxStake !== undefined) {
        query.stake.$lte = filters.maxStake;
      }
    }

    if (filters.search) {
      query.$or = [
        { reference: { $regex: filters.search, $options: 'i' } },
        { 'selections.homeTeam': { $regex: filters.search, $options: 'i' } },
        { 'selections.awayTeam': { $regex: filters.search, $options: 'i' } },
        { 'selections.marketName': { $regex: filters.search, $options: 'i' } },
        { 'selections.selectionName': { $regex: filters.search, $options: 'i' } }
      ];
    }

    return query;
  }

  private async getFilterOptions(userId: string) {
    const [statusData, sportData, betTypeData] = await Promise.all([
      this.betModel.distinct('status', { userId }),
      this.betModel.distinct('selections.sportKey', { userId }),
      this.betModel.distinct('betType', { userId })
    ]);

    return {
      statuses: statusData,
      sports: sportData,
      betTypes: betTypeData
    };
  }

  private enrichBetData(bet: any, includeDetails: boolean = false) {
    const enriched = {
      id: bet._id,
      reference: bet.reference,
      status: bet.status,
      betType: bet.betType,
      stake: bet.stake,
      potentialWin: bet.potentialWin,
      winAmount: bet.winAmount,
      currency: bet.currency || 'USD',
      createdAt: bet.createdAt,
      settledAt: bet.settledAt,
      selections: bet.selections?.map((selection: any) => ({
        eventId: selection.eventId,
        sportKey: selection.sportKey,
        homeTeam: selection.homeTeam,
        awayTeam: selection.awayTeam,
        marketName: selection.marketName,
        selectionName: selection.selectionName,
        odds: selection.odds,
        startTime: selection.startTime,
        status: selection.status,
        result: selection.result
      })) || [],
      // Calculated fields
      isWon: bet.status === 'won',
      isLost: bet.status === 'lost',
      isPending: bet.status === 'pending',
      isVoid: bet.status === 'void',
      profit: bet.winAmount ? bet.winAmount - bet.stake : (bet.status === 'lost' ? -bet.stake : 0),
      totalOdds: bet.selections?.reduce((acc: number, sel: any) => acc * sel.odds, 1) || 0,
      selectionCount: bet.selections?.length || 0
    };

    if (includeDetails) {
      // Add more detailed information for individual bet view
      (enriched as any).metadata = bet.metadata;
      (enriched as any).cashoutAvailable = this.isCashoutAvailable(bet);
      (enriched as any).cashoutValue = this.calculateCashoutValue(bet);
    }

    return enriched;
  }

  private isCashoutAvailable(bet: any): boolean {
    // Cashout is available if:
    // 1. Bet is pending
    // 2. Not all selections have started
    // 3. At least one selection has started (partial cashout)
    if (bet.status !== 'pending') return false;

    const now = new Date();
    const hasUnstartedSelections = bet.selections?.some((sel: any) => 
      new Date(sel.startTime) > now
    ) || false;

    return hasUnstartedSelections;
  }

  private calculateCashoutValue(bet: any): number {
    // This is a simplified cashout calculation
    // In a real system, this would consider current odds and market conditions
    if (!this.isCashoutAvailable(bet)) return 0;

    const now = new Date();
    const unstartedSelections = bet.selections?.filter((sel: any) => 
      new Date(sel.startTime) > now
    ) || [];

    if (unstartedSelections.length === bet.selections?.length) {
      // No selections have started - offer 85% of stake back
      return bet.stake * 0.85;
    } else {
      // Some selections have started - calculate partial value
      const partialValue = bet.potentialWin * 0.6;
      return Math.max(partialValue, bet.stake * 0.3);
    }
  }

  async getBetStatisticsSummary(userId: string, filters: BetHistoryFilter = {}) {
    try {
      const query = this.buildQuery(userId, filters);

      const stats = await this.betModel.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalBets: { $sum: 1 },
            totalStake: { $sum: '$stake' },
            totalWinnings: { $sum: { $ifNull: ['$winAmount', 0] } },
            wonBets: {
              $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] }
            },
            lostBets: {
              $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] }
            },
            pendingBets: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            voidBets: {
              $sum: { $cond: [{ $eq: ['$status', 'void'] }, 1, 0] }
            },
            averageStake: { $avg: '$stake' },
            averageOdds: { $avg: '$selections.odds' },
            maxWin: { $max: '$winAmount' },
            maxStake: { $max: '$stake' },
            minStake: { $min: '$stake' }
          }
        }
      ]);

      if (stats.length === 0) {
        return {
          totalBets: 0,
          totalStake: 0,
          totalWinnings: 0,
          profitLoss: 0,
          winRate: 0,
          roi: 0,
          wonBets: 0,
          lostBets: 0,
          pendingBets: 0,
          voidBets: 0,
          averageStake: 0,
          averageOdds: 0,
          maxWin: 0,
          maxStake: 0,
          minStake: 0
        };
      }

      const data = stats[0];
      const profitLoss = data.totalWinnings - data.totalStake;
      const settlledBets = data.wonBets + data.lostBets;
      const winRate = settlledBets > 0 ? (data.wonBets / settlledBets) * 100 : 0;
      const roi = data.totalStake > 0 ? (profitLoss / data.totalStake) * 100 : 0;

      return {
        totalBets: data.totalBets,
        totalStake: data.totalStake,
        totalWinnings: data.totalWinnings,
        profitLoss,
        winRate,
        roi,
        wonBets: data.wonBets,
        lostBets: data.lostBets,
        pendingBets: data.pendingBets,
        voidBets: data.voidBets,
        averageStake: data.averageStake || 0,
        averageOdds: data.averageOdds || 0,
        maxWin: data.maxWin || 0,
        maxStake: data.maxStake || 0,
        minStake: data.minStake || 0
      };
    } catch (error) {
      this.logger.error(`Failed to get bet statistics summary for user ${userId}:`, error);
      throw error;
    }
  }

  async getPopularSelections(userId: string, limit: number = 10) {
    try {
      const popularSelections = await this.betModel.aggregate([
        { $match: { userId } },
        { $unwind: '$selections' },
        {
          $group: {
            _id: {
              marketName: '$selections.marketName',
              selectionName: '$selections.selectionName',
              sportKey: '$selections.sportKey'
            },
            count: { $sum: 1 },
            totalStake: { $sum: '$stake' },
            won: {
              $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] }
            },
            lost: {
              $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] }
            }
          }
        },
        {
          $project: {
            marketName: '$_id.marketName',
            selectionName: '$_id.selectionName',
            sportKey: '$_id.sportKey',
            count: 1,
            totalStake: 1,
            won: 1,
            lost: 1,
            winRate: {
              $cond: [
                { $gt: [{ $add: ['$won', '$lost'] }, 0] },
                { $multiply: [{ $divide: ['$won', { $add: ['$won', '$lost'] }] }, 100] },
                0
              ]
            }
          }
        },
        { $sort: { count: -1 } },
        { $limit: limit }
      ]);

      return popularSelections;
    } catch (error) {
      this.logger.error(`Failed to get popular selections for user ${userId}:`, error);
      throw error;
    }
  }
}
