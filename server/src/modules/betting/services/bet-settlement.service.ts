import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Bet, BetDocument, BetSelection } from '../../../database/schemas/bet.schema';
import { Event, EventDocument } from '../../../database/schemas/event.schema';
import { WalletService } from '../../wallet/wallet.service';
import { OddsService } from '../../odds/services/odds.service';

export interface SettlementResult {
  betId: string;
  reference: string;
  oldStatus: string;
  newStatus: string;
  winAmount?: number;
  settledAt: Date;
}

@Injectable()
export class BetSettlementService {
  private readonly logger = new Logger(BetSettlementService.name);

  constructor(
    @InjectModel(Bet.name) private betModel: Model<BetDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    private walletService: WalletService,
    private oddsService: OddsService,
  ) {}

  async settleBet(betId: string, outcome: 'won' | 'lost' | 'void', winAmount?: number): Promise<SettlementResult> {
    const bet = await this.betModel.findById(betId);
    
    if (!bet) {
      throw new Error(`Bet ${betId} not found`);
    }

    if (bet.status !== 'pending') {
      throw new Error(`Bet ${bet.reference} is already settled with status: ${bet.status}`);
    }

    const oldStatus = bet.status;
    const session = await this.betModel.db.startSession();
    session.startTransaction();

    try {
      // Update bet status
      bet.status = outcome;
      bet.settledAt = new Date();

      if (outcome === 'won') {
        const calculatedWinAmount = winAmount || bet.potentialWin;
        bet.winAmount = calculatedWinAmount;
        
        // Credit winnings to user's wallet
        await this.walletService.addFunds(
          bet.userId.toString(),
          calculatedWinAmount,
          'win',
          {
            betId: bet._id,
            reference: bet.reference,
            originalStake: bet.stake,
          }
        );
      } else if (outcome === 'void') {
        // Refund the stake for voided bets
        await this.walletService.addFunds(
          bet.userId.toString(),
          bet.stake,
          'refund',
          {
            betId: bet._id,
            reference: bet.reference,
            reason: 'bet_voided',
          }
        );
      }
      // For 'lost' bets, no action needed as stake was already deducted

      await bet.save({ session });
      await session.commitTransaction();

      this.logger.log(`Bet ${bet.reference} settled as ${outcome}${outcome === 'won' ? ` for $${bet.winAmount}` : ''}`);

      return {
        betId: bet._id.toString(),
        reference: bet.reference,
        oldStatus,
        newStatus: outcome,
        winAmount: bet.winAmount,
        settledAt: bet.settledAt,
      };
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(`Failed to settle bet ${bet.reference}:`, error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  async settleBetsByEvent(eventId: string, results: Record<string, 'won' | 'lost' | 'void'>): Promise<SettlementResult[]> {
    const bets = await this.betModel.find({
      status: 'pending',
      'selections.eventId': eventId,
    });

    const settlementResults: SettlementResult[] = [];

    for (const bet of bets) {
      try {
        const outcome = this.determineBetOutcome(bet, results);
        const result = await this.settleBet(bet._id.toString(), outcome.status, outcome.winAmount);
        settlementResults.push(result);
      } catch (error) {
        this.logger.error(`Failed to settle bet ${bet.reference}:`, error);
      }
    }

    return settlementResults;
  }

  private determineBetOutcome(bet: Bet, selectionResults: Record<string, 'won' | 'lost' | 'void'>): {
    status: 'won' | 'lost' | 'void';
    winAmount?: number;
  } {
    // Check if any selection is void
    const hasVoidSelection = bet.selections.some(selection => 
      selectionResults[selection.selectionId] === 'void'
    );

    if (hasVoidSelection) {
      return { status: 'void' };
    }

    // For single bets
    if (bet.betType === 'single') {
      const selection = bet.selections[0];
      const result = selectionResults[selection.selectionId];
      
      if (result === 'won') {
        return {
          status: 'won',
          winAmount: bet.stake * selection.odds,
        };
      } else {
        return { status: 'lost' };
      }
    }

    // For multiple bets (accumulators)
    if (bet.betType === 'multiple') {
      const allWon = bet.selections.every(selection => 
        selectionResults[selection.selectionId] === 'won'
      );

      if (allWon) {
        const totalOdds = bet.selections.reduce((acc, selection) => acc * selection.odds, 1);
        return {
          status: 'won',
          winAmount: bet.stake * totalOdds,
        };
      } else {
        return { status: 'lost' };
      }
    }

    // Default to lost if we can't determine
    return { status: 'lost' };
  }

  async voidBet(betId: string, reason: string): Promise<SettlementResult> {
    this.logger.log(`Voiding bet ${betId} - Reason: ${reason}`);
    return this.settleBet(betId, 'void');
  }

  async voidBetsByEvent(eventId: string, reason: string): Promise<SettlementResult[]> {
    this.logger.log(`Voiding all bets for event ${eventId} - Reason: ${reason}`);
    
    const bets = await this.betModel.find({
      status: 'pending',
      'selections.eventId': eventId,
    });

    const results: SettlementResult[] = [];

    for (const bet of bets) {
      try {
        const result = await this.voidBet(bet._id.toString(), reason);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to void bet ${bet.reference}:`, error);
      }
    }

    return results;
  }

  async getUnsettledBets(eventId?: string): Promise<Bet[]> {
    const query: any = { status: 'pending' };
    
    if (eventId) {
      query['selections.eventId'] = eventId;
    }

    return this.betModel.find(query).sort({ createdAt: -1 });
  }

  async getSettlementHistory(
    limit: number = 100,
    offset: number = 0,
    status?: string
  ): Promise<{ bets: Bet[]; total: number }> {
    const query: any = { status: { $ne: 'pending' } };
    
    if (status && status !== 'all') {
      query.status = status;
    }

    const [bets, total] = await Promise.all([
      this.betModel
        .find(query)
        .sort({ settledAt: -1 })
        .limit(limit)
        .skip(offset),
      this.betModel.countDocuments(query),
    ]);

    return { bets, total };
  }

  // Automated settlement based on event results
  @Cron(CronExpression.EVERY_5_MINUTES)
  async autoSettleBets(): Promise<void> {
    this.logger.log('Running automated bet settlement...');

    try {
      // Get finished events that haven't been processed
      const finishedEvents = await this.eventModel.find({
        status: 'finished',
        // Add a field to track if bets have been settled for this event
        // For now, we'll check if there are any pending bets for finished events
      });

      for (const event of finishedEvents) {
        const pendingBets = await this.betModel.find({
          status: 'pending',
          'selections.eventId': event.eventId,
        });

        if (pendingBets.length > 0) {
          this.logger.log(`Found ${pendingBets.length} pending bets for finished event ${event.eventId}`);
          
          // For now, we'll need manual settlement or integration with a results provider
          // This is a placeholder for automatic settlement logic
          await this.processFinishedEvent(event);
        }
      }
    } catch (error) {
      this.logger.error('Auto settlement failed:', error);
    }
  }

  private async processFinishedEvent(event: any): Promise<void> {
    // This would integrate with a sports results API or manual admin input
    // For now, we'll log that the event needs manual settlement
    this.logger.log(`Event ${event.eventId} (${event.homeTeam} vs ${event.awayTeam}) requires manual settlement`);
    
    // In a real implementation, you would:
    // 1. Get the actual results from a sports data provider
    // 2. Map the results to selection outcomes
    // 3. Call settleBetsByEvent with the results
    
    // Example of how it would work:
    // const results = await this.getEventResults(event.eventId);
    // const selectionResults = this.mapResultsToSelections(event, results);
    // await this.settleBetsByEvent(event.eventId, selectionResults);
  }

  // Manual settlement methods for admin use
  async manuallySettleSelection(
    eventId: string,
    marketId: string,
    selectionId: string,
    outcome: 'won' | 'lost' | 'void'
  ): Promise<SettlementResult[]> {
    const bets = await this.betModel.find({
      status: 'pending',
      'selections.eventId': eventId,
      'selections.marketId': marketId,
      'selections.selectionId': selectionId,
    });

    const results: SettlementResult[] = [];

    for (const bet of bets) {
      try {
        // Update the specific selection status
        const selection = bet.selections.find(s => s.selectionId === selectionId);
        if (selection) {
          selection.status = outcome;
        }

        // Check if all selections in the bet are settled
        const allSettled = bet.selections.every(s => s.status !== 'pending');
        
        if (allSettled) {
          const betOutcome = this.determineBetOutcomeFromSelections(bet);
          const result = await this.settleBet(bet._id.toString(), betOutcome.status, betOutcome.winAmount);
          results.push(result);
        } else {
          // Save the bet with updated selection status
          await bet.save();
        }
      } catch (error) {
        this.logger.error(`Failed to settle bet ${bet.reference}:`, error);
      }
    }

    return results;
  }

  private determineBetOutcomeFromSelections(bet: Bet): {
    status: 'won' | 'lost' | 'void';
    winAmount?: number;
  } {
    // Check if any selection is void
    const hasVoidSelection = bet.selections.some(s => s.status === 'void');
    if (hasVoidSelection) {
      return { status: 'void' };
    }

    // For single bets
    if (bet.betType === 'single') {
      const selection = bet.selections[0];
      if (selection.status === 'won') {
        return {
          status: 'won',
          winAmount: bet.stake * selection.odds,
        };
      } else {
        return { status: 'lost' };
      }
    }

    // For multiple bets
    if (bet.betType === 'multiple') {
      const allWon = bet.selections.every(s => s.status === 'won');
      if (allWon) {
        const totalOdds = bet.selections.reduce((acc, s) => acc * s.odds, 1);
        return {
          status: 'won',
          winAmount: bet.stake * totalOdds,
        };
      } else {
        return { status: 'lost' };
      }
    }

    return { status: 'lost' };
  }
}