import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../../database/schemas/user.schema';
import { Transaction } from '../../../database/schemas/transaction.schema';

export interface LimitUsage {
  dailyDeposit: { used: number; limit: number; percentage: number };
  weeklyDeposit: { used: number; limit: number; percentage: number };
  monthlyDeposit: { used: number; limit: number; percentage: number };
  dailyBetting: { used: number; limit: number; percentage: number };
  weeklyBetting: { used: number; limit: number; percentage: number };
  monthlyBetting: { used: number; limit: number; percentage: number };
  sessionTime: { used: number; limit: number; percentage: number };
  dailyLoss: { used: number; limit: number; percentage: number };
  weeklyLoss: { used: number; limit: number; percentage: number };
  monthlyLoss: { used: number; limit: number; percentage: number };
}

@Injectable()
export class ResponsibleGamblingService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
  ) {}

  async getUserLimits(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user.limits;
  }

  async updateUserLimits(userId: string, newLimits: Partial<any>) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Validate that new limits are not higher than current limits (cooling-off period logic)
    const currentLimits = user.limits;
    const updatedLimits = { ...currentLimits, ...newLimits, lastUpdated: new Date() };

    // In a real implementation, you might want to add cooling-off periods for limit increases
    // For now, we'll allow any changes
    
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: { limits: updatedLimits } },
      { new: true }
    );

    return updatedUser?.limits;
  }

  async getLimitUsage(userId: string): Promise<LimitUsage> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const limits = user.limits;
    const now = new Date();
    
    // Calculate date ranges
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get transaction data for usage calculation
    const [dailyTransactions, weeklyTransactions, monthlyTransactions] = await Promise.all([
      this.getTransactionsInRange(userId, startOfDay, now),
      this.getTransactionsInRange(userId, startOfWeek, now),
      this.getTransactionsInRange(userId, startOfMonth, now),
    ]);

    // Calculate usage
    const dailyDeposits = this.calculateTransactionSum(dailyTransactions, 'deposit');
    const weeklyDeposits = this.calculateTransactionSum(weeklyTransactions, 'deposit');
    const monthlyDeposits = this.calculateTransactionSum(monthlyTransactions, 'deposit');

    const dailyBetting = this.calculateTransactionSum(dailyTransactions, 'bet');
    const weeklyBetting = this.calculateTransactionSum(weeklyTransactions, 'bet');
    const monthlyBetting = this.calculateTransactionSum(monthlyTransactions, 'bet');

    // For losses, we need to calculate net losses (bets - wins)
    const dailyWins = this.calculateTransactionSum(dailyTransactions, 'win');
    const weeklyWins = this.calculateTransactionSum(weeklyTransactions, 'win');
    const monthlyWins = this.calculateTransactionSum(monthlyTransactions, 'win');

    const dailyLoss = Math.max(0, dailyBetting - dailyWins);
    const weeklyLoss = Math.max(0, weeklyBetting - weeklyWins);
    const monthlyLoss = Math.max(0, monthlyBetting - monthlyWins);

    // Session time would come from session management service
    // For now, we'll use a placeholder
    const sessionTimeUsed = user.stats?.lastSessionDuration || 0;

    return {
      dailyDeposit: this.createUsageObject(dailyDeposits, limits.dailyDeposit),
      weeklyDeposit: this.createUsageObject(weeklyDeposits, limits.weeklyDeposit),
      monthlyDeposit: this.createUsageObject(monthlyDeposits, limits.monthlyDeposit),
      dailyBetting: this.createUsageObject(dailyBetting, limits.dailyBetting),
      weeklyBetting: this.createUsageObject(weeklyBetting, limits.weeklyBetting),
      monthlyBetting: this.createUsageObject(monthlyBetting, limits.monthlyBetting),
      sessionTime: this.createUsageObject(sessionTimeUsed, limits.sessionTime),
      dailyLoss: this.createUsageObject(dailyLoss, limits.dailyLoss),
      weeklyLoss: this.createUsageObject(weeklyLoss, limits.weeklyLoss),
      monthlyLoss: this.createUsageObject(monthlyLoss, limits.monthlyLoss),
    };
  }

  private async getTransactionsInRange(userId: string, startDate: Date, endDate: Date) {
    return this.transactionModel.find({
      userId,
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'completed'
    });
  }

  private calculateTransactionSum(transactions: any[], type: string): number {
    return transactions
      .filter(t => t.type === type)
      .reduce((sum, t) => sum + t.amount, 0);
  }

  private createUsageObject(used: number, limit: number) {
    const percentage = limit > 0 ? (used / limit) * 100 : 0;
    return {
      used,
      limit,
      percentage: Math.min(100, percentage)
    };
  }

  async checkLimitViolation(userId: string, transactionType: string, amount: number): Promise<boolean> {
    const usage = await this.getLimitUsage(userId);
    
    switch (transactionType) {
      case 'deposit':
        return usage.dailyDeposit.used + amount > usage.dailyDeposit.limit ||
               usage.weeklyDeposit.used + amount > usage.weeklyDeposit.limit ||
               usage.monthlyDeposit.used + amount > usage.monthlyDeposit.limit;
      
      case 'bet':
        return usage.dailyBetting.used + amount > usage.dailyBetting.limit ||
               usage.weeklyBetting.used + amount > usage.weeklyBetting.limit ||
               usage.monthlyBetting.used + amount > usage.monthlyBetting.limit;
      
      default:
        return false;
    }
  }

  async getLimitWarnings(userId: string): Promise<string[]> {
    const usage = await this.getLimitUsage(userId);
    const warnings: string[] = [];

    // Check for limits approaching 80%
    Object.entries(usage).forEach(([key, value]) => {
      if (value.percentage >= 80 && value.percentage < 100) {
        const limitName = key.replace(/([A-Z])/g, ' $1').toLowerCase();
        warnings.push(`You've used ${value.percentage.toFixed(0)}% of your ${limitName} limit`);
      }
    });

    return warnings;
  }

  async checkBettingLimit(userId: string, amount: number): Promise<{ allowed: boolean; message?: string }> {
    // Simple implementation - would need actual limit checking
    return { allowed: true };
  }

  async checkLossLimit(userId: string, potentialLoss: number): Promise<{ allowed: boolean; message?: string }> {
    // Simple implementation - would need actual limit checking
    return { allowed: true };
  }
}