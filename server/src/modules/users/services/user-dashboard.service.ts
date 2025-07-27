import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../../database/schemas/user.schema';
import { Bet, BetDocument } from '../../../database/schemas/bet.schema';
import { Transaction, TransactionDocument } from '../../../database/schemas/transaction.schema';
import { BettingService } from '../../betting/services/betting.service';
import { WalletService } from '../../wallet/wallet.service';

@Injectable()
export class UserDashboardService {
  private readonly logger = new Logger(UserDashboardService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Bet.name) private betModel: Model<BetDocument>,
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    @Inject(forwardRef(() => BettingService)) private bettingService: BettingService,
    private walletService: WalletService,
  ) {}

  async getDashboardOverview(userId: string) {
    try {
      const [
        user,
        bettingStats,
        walletBalance,
        recentTransactions,
        activeBets,
        recentActivity
      ] = await Promise.all([
        this.userModel.findById(userId).select('-passwordHash -twoFactorSecret -twoFactorBackupCodes'),
        this.getBettingStatistics(userId),
        this.walletService.getBalance(userId),
        this.getRecentTransactions(userId, 5),
        this.getActiveBets(userId),
        this.getRecentActivity(userId, 10)
      ]);

      return {
        user: {
          id: user._id,
          email: user.email,
          profile: user.profile,
          kycStatus: user.kycStatus,
          emailVerified: user.emailVerified,
          twoFactorEnabled: user.twoFactorEnabled,
          preferences: user.preferences,
          limits: user.limits,
          createdAt: user.createdAt
        },
        wallet: {
          balance: walletBalance,
          currency: user.preferences?.currency || 'USD'
        },
        betting: bettingStats,
        activeBets: activeBets.length,
        recentTransactions,
        recentActivity,
        notifications: {
          unread: 0, // TODO: Implement when notifications are ready
          total: 0
        }
      };
    } catch (error) {
      this.logger.error(`Failed to get dashboard overview for user ${userId}:`, error);
      throw error;
    }
  }

  async getBettingStatistics(userId: string) {
    try {
      const [
        bettingStats,
        monthlyStats,
        sportStats,
        performanceMetrics
      ] = await Promise.all([
        this.bettingService.getBettingStats(userId),
        this.getMonthlyBettingStats(userId),
        this.getBettingStatsBySport(userId),
        this.getPerformanceMetrics(userId)
      ]);

      return {
        overall: bettingStats,
        monthly: monthlyStats,
        sports: sportStats,
        performance: performanceMetrics
      };
    } catch (error) {
      this.logger.error(`Failed to get betting statistics for user ${userId}:`, error);
      throw error;
    }
  }

  private async getMonthlyBettingStats(userId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const stats = await this.betModel.aggregate([
      {
        $match: {
          userId: userId,
          createdAt: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalStake: { $sum: '$stake' },
          totalWin: { $sum: { $ifNull: ['$winAmount', 0] } }
        }
      }
    ]);

    const result = {
      totalBets: 0,
      totalStake: 0,
      totalWinnings: 0,
      profitLoss: 0,
      wonBets: 0,
      lostBets: 0,
      pendingBets: 0
    };

    stats.forEach(stat => {
      result.totalBets += stat.count;
      result.totalStake += stat.totalStake;
      result.totalWinnings += stat.totalWin;

      switch (stat._id) {
        case 'won':
          result.wonBets = stat.count;
          break;
        case 'lost':
          result.lostBets = stat.count;
          break;
        case 'pending':
          result.pendingBets = stat.count;
          break;
      }
    });

    result.profitLoss = result.totalWinnings - result.totalStake;

    return result;
  }

  private async getBettingStatsBySport(userId: string) {
    const stats = await this.betModel.aggregate([
      {
        $match: { userId: userId }
      },
      {
        $unwind: '$selections'
      },
      {
        $group: {
          _id: '$selections.sportKey',
          count: { $sum: 1 },
          totalStake: { $sum: '$stake' },
          totalWin: { $sum: { $ifNull: ['$winAmount', 0] } },
          won: {
            $sum: {
              $cond: [{ $eq: ['$status', 'won'] }, 1, 0]
            }
          },
          lost: {
            $sum: {
              $cond: [{ $eq: ['$status', 'lost'] }, 1, 0]
            }
          }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    return stats.map(stat => ({
      sport: stat._id,
      bets: stat.count,
      stake: stat.totalStake,
      winnings: stat.totalWin,
      profitLoss: stat.totalWin - stat.totalStake,
      winRate: stat.count > 0 ? (stat.won / stat.count) * 100 : 0
    }));
  }

  private async getPerformanceMetrics(userId: string) {
    const [
      last30Days,
      last7Days,
      winStreakData,
      averageStake
    ] = await Promise.all([
      this.getPerformanceForPeriod(userId, 30),
      this.getPerformanceForPeriod(userId, 7),
      this.getWinStreakData(userId),
      this.getAverageStake(userId)
    ]);

    return {
      last30Days,
      last7Days,
      currentWinStreak: winStreakData.current,
      longestWinStreak: winStreakData.longest,
      averageStake,
      riskLevel: this.calculateRiskLevel(averageStake)
    };
  }

  private async getPerformanceForPeriod(userId: string, days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.betModel.aggregate([
      {
        $match: {
          userId: userId,
          createdAt: { $gte: startDate },
          status: { $in: ['won', 'lost'] }
        }
      },
      {
        $group: {
          _id: null,
          totalBets: { $sum: 1 },
          wonBets: {
            $sum: {
              $cond: [{ $eq: ['$status', 'won'] }, 1, 0]
            }
          },
          totalStake: { $sum: '$stake' },
          totalWinnings: { $sum: { $ifNull: ['$winAmount', 0] } }
        }
      }
    ]);

    if (stats.length === 0) {
      return {
        bets: 0,
        winRate: 0,
        profitLoss: 0,
        roi: 0
      };
    }

    const data = stats[0];
    const profitLoss = data.totalWinnings - data.totalStake;
    const roi = data.totalStake > 0 ? (profitLoss / data.totalStake) * 100 : 0;

    return {
      bets: data.totalBets,
      winRate: data.totalBets > 0 ? (data.wonBets / data.totalBets) * 100 : 0,
      profitLoss,
      roi
    };
  }

  private async getWinStreakData(userId: string) {
    const recentBets = await this.betModel
      .find({
        userId: userId,
        status: { $in: ['won', 'lost'] }
      })
      .sort({ settledAt: -1 })
      .limit(100);

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < recentBets.length; i++) {
      if (recentBets[i].status === 'won') {
        tempStreak++;
        if (i === 0) currentStreak = tempStreak;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        if (i === 0) currentStreak = 0;
        tempStreak = 0;
      }
    }

    return {
      current: currentStreak,
      longest: longestStreak
    };
  }

  private async getAverageStake(userId: string) {
    const result = await this.betModel.aggregate([
      {
        $match: { userId: userId }
      },
      {
        $group: {
          _id: null,
          averageStake: { $avg: '$stake' },
          totalBets: { $sum: 1 }
        }
      }
    ]);

    return result.length > 0 ? result[0].averageStake : 0;
  }

  private calculateRiskLevel(averageStake: number): 'low' | 'medium' | 'high' {
    if (averageStake < 10) return 'low';
    if (averageStake < 50) return 'medium';
    return 'high';
  }

  private async getRecentTransactions(userId: string, limit: number = 5) {
    return this.transactionModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('type amount status createdAt metadata');
  }

  private async getActiveBets(userId: string) {
    return this.betModel
      .find({
        userId,
        status: 'pending'
      })
      .sort({ createdAt: -1 });
  }

  private async getRecentActivity(userId: string, limit: number = 10) {
    const [recentBets, recentTransactions] = await Promise.all([
      this.betModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit / 2)
        .select('status stake potentialWin createdAt'),
      this.transactionModel
        .find({ userId, type: { $in: ['deposit', 'withdrawal'] } })
        .sort({ createdAt: -1 })
        .limit(limit / 2)
        .select('type amount status createdAt')
    ]);

    const activities = [];

    recentBets.forEach(bet => {
      activities.push({
        type: 'bet',
        action: `Placed ${bet.status} bet`,
        amount: bet.stake,
        potentialWin: bet.potentialWin,
        timestamp: bet.createdAt,
        status: bet.status
      });
    });

    recentTransactions.forEach(transaction => {
      activities.push({
        type: 'transaction',
        action: transaction.type === 'deposit' ? 'Deposited funds' : 'Withdrew funds',
        amount: transaction.amount,
        timestamp: transaction.createdAt,
        status: transaction.status
      });
    });

    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async getBettingAnalytics(userId: string, period: 'week' | 'month' | 'year' = 'month') {
    try {
      const [
        chartData,
        sportBreakdown,
        betTypeAnalysis,
        streakAnalysis
      ] = await Promise.all([
        this.getBettingChartData(userId, period),
        this.getSportBreakdown(userId, period),
        this.getBetTypeAnalysis(userId, period),
        this.getDetailedStreakAnalysis(userId)
      ]);

      return {
        chartData,
        sportBreakdown,
        betTypeAnalysis,
        streakAnalysis
      };
    } catch (error) {
      this.logger.error(`Failed to get betting analytics for user ${userId}:`, error);
      throw error;
    }
  }

  private async getBettingChartData(userId: string, period: 'week' | 'month' | 'year') {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const data = await this.betModel.aggregate([
      {
        $match: {
          userId: userId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          bets: { $sum: 1 },
          stake: { $sum: '$stake' },
          winnings: { $sum: { $ifNull: ['$winAmount', 0] } },
          won: {
            $sum: {
              $cond: [{ $eq: ['$status', 'won'] }, 1, 0]
            }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    return data.map(item => ({
      date: new Date(item._id.year, item._id.month - 1, item._id.day),
      bets: item.bets,
      stake: item.stake,
      winnings: item.winnings,
      profit: item.winnings - item.stake,
      winRate: item.bets > 0 ? (item.won / item.bets) * 100 : 0
    }));
  }

  private async getSportBreakdown(userId: string, period: 'week' | 'month' | 'year') {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.betModel.aggregate([
      {
        $match: {
          userId: userId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $unwind: '$selections'
      },
      {
        $group: {
          _id: '$selections.sportKey',
          bets: { $sum: 1 },
          stake: { $sum: '$stake' },
          winnings: { $sum: { $ifNull: ['$winAmount', 0] } },
          won: {
            $sum: {
              $cond: [{ $eq: ['$status', 'won'] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          sport: '$_id',
          bets: 1,
          stake: 1,
          winnings: 1,
          profit: { $subtract: ['$winnings', '$stake'] },
          winRate: {
            $cond: [
              { $gt: ['$bets', 0] },
              { $multiply: [{ $divide: ['$won', '$bets'] }, 100] },
              0
            ]
          }
        }
      },
      {
        $sort: { bets: -1 }
      }
    ]);
  }

  private async getBetTypeAnalysis(userId: string, period: 'week' | 'month' | 'year') {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.betModel.aggregate([
      {
        $match: {
          userId: userId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$betType',
          count: { $sum: 1 },
          totalStake: { $sum: '$stake' },
          totalWinnings: { $sum: { $ifNull: ['$winAmount', 0] } },
          won: {
            $sum: {
              $cond: [{ $eq: ['$status', 'won'] }, 1, 0]
            }
          },
          averageOdds: { $avg: '$selections.odds' }
        }
      },
      {
        $project: {
          betType: '$_id',
          count: 1,
          totalStake: 1,
          totalWinnings: 1,
          profit: { $subtract: ['$totalWinnings', '$totalStake'] },
          winRate: {
            $cond: [
              { $gt: ['$count', 0] },
              { $multiply: [{ $divide: ['$won', '$count'] }, 100] },
              0
            ]
          },
          averageOdds: 1,
          averageStake: { $divide: ['$totalStake', '$count'] }
        }
      }
    ]);
  }

  private async getDetailedStreakAnalysis(userId: string) {
    const recentBets = await this.betModel
      .find({
        userId: userId,
        status: { $in: ['won', 'lost'] }
      })
      .sort({ settledAt: -1 })
      .limit(200);

    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let winStreaks = [];
    let lossStreaks = [];
    let tempWinStreak = 0;
    let tempLossStreak = 0;

    for (let i = 0; i < recentBets.length; i++) {
      const bet = recentBets[i];
      
      if (bet.status === 'won') {
        tempWinStreak++;
        if (i === 0) currentWinStreak = tempWinStreak;
        
        if (tempLossStreak > 0) {
          lossStreaks.push(tempLossStreak);
          tempLossStreak = 0;
        }
      } else {
        tempLossStreak++;
        if (i === 0) currentLossStreak = tempLossStreak;
        
        if (tempWinStreak > 0) {
          winStreaks.push(tempWinStreak);
          longestWinStreak = Math.max(longestWinStreak, tempWinStreak);
          tempWinStreak = 0;
        }
      }
    }

    // Handle the last streak
    if (tempWinStreak > 0) {
      winStreaks.push(tempWinStreak);
      longestWinStreak = Math.max(longestWinStreak, tempWinStreak);
    }
    if (tempLossStreak > 0) {
      lossStreaks.push(tempLossStreak);
      longestLossStreak = Math.max(longestLossStreak, tempLossStreak);
    }

    return {
      current: {
        wins: currentWinStreak,
        losses: currentLossStreak
      },
      longest: {
        wins: longestWinStreak,
        losses: longestLossStreak
      },
      average: {
        winStreak: winStreaks.length > 0 ? winStreaks.reduce((a, b) => a + b, 0) / winStreaks.length : 0,
        lossStreak: lossStreaks.length > 0 ? lossStreaks.reduce((a, b) => a + b, 0) / lossStreaks.length : 0
      }
    };
  }
}
