import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Bet, BetDocument, BetSelection } from '../../../database/schemas/bet.schema';
import { WalletService } from '../../wallet/wallet.service';
import { OddsService } from '../../odds/services/odds.service';
import { ResponsibleGamblingService } from '../../users/services/responsible-gambling.service';
import { PlaceBetDto } from '../dto/place-bet.dto';
import { BetValidationResult } from '../interfaces/bet-validation.interface';

@Injectable()
export class BettingService {
  private readonly logger = new Logger(BettingService.name);

  constructor(
    @InjectModel(Bet.name) private betModel: Model<BetDocument>,
    private walletService: WalletService,
    private oddsService: OddsService,
    private responsibleGamblingService: ResponsibleGamblingService,
  ) {}

  async placeBet(userId: string, placeBetDto: PlaceBetDto, metadata?: any): Promise<Bet> {
    this.logger.log(`Placing bet for user ${userId}`);

    // Validate the bet
    const validation = await this.validateBet(userId, placeBetDto);
    if (!validation.isValid) {
      throw new BadRequestException(validation.errors.join(', '));
    }

    // Calculate potential winnings
    const potentialWin = this.calculatePotentialWin(placeBetDto.selections, placeBetDto.stake);

    // Create bet object
    const bet = new this.betModel({
      userId,
      stake: placeBetDto.stake,
      potentialWin,
      betType: placeBetDto.selections.length === 1 ? 'single' : 'multiple',
      selections: placeBetDto.selections,
      currency: placeBetDto.currency || 'USD',
      metadata,
    });

    // Start transaction to ensure atomicity
    const session = await this.betModel.db.startSession();
    session.startTransaction();

    try {
      // Deduct funds from wallet
      await this.walletService.deductFunds(userId, placeBetDto.stake, 'bet', {
        betId: bet._id,
        reference: bet.reference,
      });

      // Save the bet
      const savedBet = await bet.save({ session });

      await session.commitTransaction();
      
      this.logger.log(`Bet placed successfully: ${savedBet.reference}`);
      return savedBet;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Failed to place bet:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  async validateBet(userId: string, placeBetDto: PlaceBetDto): Promise<BetValidationResult> {
    const errors: string[] = [];

    // Check minimum stake
    if (placeBetDto.stake < 0.01) {
      errors.push('Minimum stake is $0.01');
    }

    // Check maximum stake (you can make this configurable)
    if (placeBetDto.stake > 10000) {
      errors.push('Maximum stake is $10,000');
    }

    // Check user balance
    const balance = await this.walletService.getBalance(userId);
    if (balance.availableBalance < placeBetDto.stake) {
      errors.push('Insufficient funds');
    }

    // Check responsible gambling limits
    const bettingLimitCheck = await this.responsibleGamblingService.checkBettingLimit(userId, placeBetDto.stake);
    if (!bettingLimitCheck.allowed) {
      errors.push(bettingLimitCheck.message || 'Betting limit exceeded');
    }

    // Check potential loss limits
    const potentialWin = this.calculatePotentialWin(placeBetDto.selections, placeBetDto.stake);
    const potentialLoss = placeBetDto.stake; // Maximum loss is the stake amount
    const lossLimitCheck = await this.responsibleGamblingService.checkLossLimit(userId, potentialLoss);
    if (!lossLimitCheck.allowed) {
      errors.push(lossLimitCheck.message || 'Loss limit exceeded');
    }

    // Validate selections
    if (!placeBetDto.selections || placeBetDto.selections.length === 0) {
      errors.push('At least one selection is required');
    }

    if (placeBetDto.selections.length > 20) {
      errors.push('Maximum 20 selections allowed');
    }

    // Validate each selection
    for (const selection of placeBetDto.selections) {
      const selectionErrors = await this.validateSelection(selection);
      errors.push(...selectionErrors);
    }

    // Check for duplicate selections
    const selectionIds = placeBetDto.selections.map(s => s.selectionId);
    const uniqueSelectionIds = new Set(selectionIds);
    if (selectionIds.length !== uniqueSelectionIds.size) {
      errors.push('Duplicate selections are not allowed');
    }

    // Check for conflicting selections (same event, different outcomes)
    const eventIds = placeBetDto.selections.map(s => s.eventId);
    const uniqueEventIds = new Set(eventIds);
    if (eventIds.length !== uniqueEventIds.size) {
      errors.push('Cannot bet on multiple outcomes for the same event');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private async validateSelection(selection: BetSelection): Promise<string[]> {
    const errors: string[] = [];

    // Check if event exists and is still available
    const event = await this.oddsService.getEventById(selection.eventId);
    if (!event) {
      errors.push(`Event ${selection.eventId} not found`);
      return errors;
    }

    // Check if event hasn't started
    if (new Date(event.startTime) <= new Date()) {
      errors.push(`Event ${event.homeTeam} vs ${event.awayTeam} has already started`);
    }

    // Check if event is not cancelled
    if (event.status === 'cancelled') {
      errors.push(`Event ${event.homeTeam} vs ${event.awayTeam} has been cancelled`);
    }

    // Find the market and selection
    const market = event.markets.find(m => m.marketId === selection.marketId);
    if (!market) {
      errors.push(`Market ${selection.marketId} not found`);
      return errors;
    }

    const marketSelection = market.selections.find(s => s.selectionId === selection.selectionId);
    if (!marketSelection) {
      errors.push(`Selection ${selection.selectionId} not found`);
      return errors;
    }

    // Check if selection is active
    if (!marketSelection.active) {
      errors.push(`Selection ${marketSelection.selectionName} is not available`);
    }

    // Check odds variance (allow 5% variance)
    const oddsVariance = Math.abs(marketSelection.odds - selection.odds) / marketSelection.odds;
    if (oddsVariance > 0.05) {
      errors.push(`Odds have changed for ${marketSelection.selectionName}. Current odds: ${marketSelection.odds}`);
    }

    return errors;
  }

  private calculatePotentialWin(selections: BetSelection[], stake: number): number {
    if (selections.length === 1) {
      // Single bet
      return stake * selections[0].odds;
    } else {
      // Multiple bet (accumulator)
      const totalOdds = selections.reduce((acc, selection) => acc * selection.odds, 1);
      return stake * totalOdds;
    }
  }

  async getUserBets(
    userId: string,
    options?: {
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Bet[]> {
    const { status, limit = 50, offset = 0 } = options || {};
    const query: any = { userId };
    
    if (status && status !== 'all') {
      query.status = status;
    }

    return this.betModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .exec();
  }

  async getUserBetsWithTotal(
    userId: string,
    status?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ bets: Bet[]; total: number }> {
    const query: any = { userId };
    if (status && status !== 'all') {
      query.status = status;
    }

    const [bets, total] = await Promise.all([
      this.betModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .exec(),
      this.betModel.countDocuments(query),
    ]);

    return { bets, total };
  }

  async getBetById(betId: string, userId?: string): Promise<Bet | null> {
    const query: any = { _id: betId };
    if (userId) {
      query.userId = userId;
    }

    return this.betModel.findOne(query);
  }

  async getBetByReference(reference: string, userId?: string): Promise<Bet | null> {
    const query: any = { reference };
    if (userId) {
      query.userId = userId;
    }

    return this.betModel.findOne(query);
  }

  async getActiveBets(userId: string): Promise<Bet[]> {
    return this.betModel
      .find({ 
        userId, 
        status: 'pending',
        'selections.startTime': { $gt: new Date() }
      })
      .sort({ createdAt: -1 });
  }

  async cancelBet(betId: string, userId: string): Promise<Bet> {
    const bet = await this.betModel.findOne({ _id: betId, userId });
    
    if (!bet) {
      throw new NotFoundException('Bet not found');
    }

    if (bet.status !== 'pending') {
      throw new BadRequestException('Only pending bets can be cancelled');
    }

    // Check if any selection has started
    const now = new Date();
    const hasStarted = bet.selections.some(selection => new Date(selection.startTime) <= now);
    
    if (hasStarted) {
      throw new BadRequestException('Cannot cancel bet after event has started');
    }

    // Start transaction
    const session = await this.betModel.db.startSession();
    session.startTransaction();

    try {
      // Update bet status
      bet.status = 'void';
      bet.settledAt = new Date();
      await bet.save({ session });

      // Refund the stake
      await this.walletService.addFunds(userId, bet.stake, 'refund', {
        betId: bet._id,
        reference: bet.reference,
        reason: 'bet_cancelled',
      });

      await session.commitTransaction();
      
      this.logger.log(`Bet cancelled: ${bet.reference}`);
      return bet;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Failed to cancel bet:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getBettingStats(userId: string): Promise<any> {
    const stats = await this.betModel.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalStake: { $sum: '$stake' },
          totalWin: { $sum: { $ifNull: ['$winAmount', 0] } },
        },
      },
    ]);

    const result = {
      totalBets: 0,
      totalStake: 0,
      totalWinnings: 0,
      pendingBets: 0,
      wonBets: 0,
      lostBets: 0,
      voidBets: 0,
      profitLoss: 0,
    };

    stats.forEach(stat => {
      result.totalBets += stat.count;
      result.totalStake += stat.totalStake;
      result.totalWinnings += stat.totalWin;

      switch (stat._id) {
        case 'pending':
          result.pendingBets = stat.count;
          break;
        case 'won':
          result.wonBets = stat.count;
          break;
        case 'lost':
          result.lostBets = stat.count;
          break;
        case 'void':
          result.voidBets = stat.count;
          break;
      }
    });

    result.profitLoss = result.totalWinnings - result.totalStake;

    return result;
  }

  // Admin methods
  async getAllBets(filters: {
    status?: string;
    userId?: string;
    eventId?: string;
    limit: number;
    offset: number;
  }): Promise<{ bets: Bet[]; total: number }> {
    const query: any = {};
    
    if (filters.status) query.status = filters.status;
    if (filters.userId) query.userId = filters.userId;
    if (filters.eventId) query['selections.eventId'] = filters.eventId;

    const [bets, total] = await Promise.all([
      this.betModel.find(query)
        .sort({ createdAt: -1 })
        .skip(filters.offset)
        .limit(filters.limit)
        .exec(),
      this.betModel.countDocuments(query)
    ]);

    return { bets, total };
  }

  async settleBet(betId: string, result: string, settledBy: string, winAmount?: number): Promise<Bet> {
    const bet = await this.betModel.findById(betId);
    if (!bet) {
      throw new NotFoundException('Bet not found');
    }

    bet.status = result === 'won' ? 'won' : 'lost';
    bet.settledAt = new Date();
    bet.winAmount = result === 'won' ? (winAmount || bet.potentialWin) : 0;
    
    return bet.save();
  }

  async voidBet(betId: string, reason: string, voidedBy: string): Promise<Bet> {
    const bet = await this.betModel.findById(betId);
    if (!bet) {
      throw new NotFoundException('Bet not found');
    }

    bet.status = 'void';
    bet.settledAt = new Date();
    
    return bet.save();
  }

  async getBettingAnalytics(filters: {
    startDate?: Date;
    endDate?: Date;
    groupBy: 'day' | 'week' | 'month';
  }): Promise<any> {
    const query: any = {};
    
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = filters.startDate;
      if (filters.endDate) query.createdAt.$lte = filters.endDate;
    }

    const analytics = await this.betModel.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalBets: { $sum: 1 },
          totalStake: { $sum: '$stake' },
          totalWinnings: { $sum: '$winAmount' },
          averageStake: { $avg: '$stake' }
        }
      }
    ]);

    return analytics[0] || {
      totalBets: 0,
      totalStake: 0,
      totalWinnings: 0,
      averageStake: 0
    };
  }

  async getUserBettingAnalytics(userId: string, filters: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<any> {
    const query: any = { userId };
    
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = filters.startDate;
      if (filters.endDate) query.createdAt.$lte = filters.endDate;
    }

    return this.getBettingStats(userId);
  }

  async getSuspiciousBets(filters: {
    limit: number;
    offset: number;
  }): Promise<{ bets: Bet[]; total: number }> {
    // Simple implementation - in reality would have more sophisticated detection
    const query = {
      $or: [
        { stake: { $gt: 10000 } }, // High stakes
        { potentialWin: { $gt: 50000 } } // High potential winnings
      ]
    };

    const [bets, total] = await Promise.all([
      this.betModel.find(query)
        .sort({ createdAt: -1 })
        .skip(filters.offset)
        .limit(filters.limit)
        .exec(),
      this.betModel.countDocuments(query)
    ]);

    return { bets, total };
  }

  async flagBet(betId: string, reason: string, severity: 'low' | 'medium' | 'high', flaggedBy: string): Promise<Bet> {
    const bet = await this.betModel.findById(betId);
    if (!bet) {
      throw new NotFoundException('Bet not found');
    }

    // Add flag to metadata
    if (!bet.metadata) bet.metadata = {};
    bet.metadata.flag = {
      reason,
      severity,
      flaggedBy,
      flaggedAt: new Date()
    };
    
    return bet.save();
  }

  async unflagBet(betId: string, unflaggedBy: string): Promise<Bet> {
    const bet = await this.betModel.findById(betId);
    if (!bet) {
      throw new NotFoundException('Bet not found');
    }

    if (bet.metadata && bet.metadata.flag) {
      delete bet.metadata.flag;
    }
    
    return bet.save();
  }
}