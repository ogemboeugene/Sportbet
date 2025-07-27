import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Wallet, WalletDocument } from '../../database/schemas/wallet.schema'
import { Transaction, TransactionDocument } from '../../database/schemas/transaction.schema'
import { TransactionService } from './services/transaction.service'
import { WalletGateway } from './wallet.gateway'

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    private transactionService: TransactionService,
    private walletGateway: WalletGateway,
  ) {}

  async createWallet(userId: string): Promise<WalletDocument> {
    console.log('Creating wallet for userId:', userId);
    
    if (!userId) {
      throw new BadRequestException('UserId is required to create wallet')
    }

    const existingWallet = await this.walletModel.findOne({ userId })
    if (existingWallet) {
      throw new BadRequestException('Wallet already exists for this user')
    }

    const wallet = new this.walletModel({
      userId,
      balance: 0,
      bonusBalance: 0,
      lockedBalance: 0,
      currency: 'USD',
      dailyLimits: {
        deposit: 10000,
        withdrawal: 5000,
        spent: 10000,
      },
      monthlyLimits: {
        deposit: 100000,
        withdrawal: 50000,
        spent: 100000,
      },
      dailyTotals: {
        deposited: 0,
        withdrawn: 0,
        spent: 0,
        lastReset: new Date(),
      },
      monthlyTotals: {
        deposited: 0,
        withdrawn: 0,
        spent: 0,
        lastReset: new Date(),
      },
    })

    return await wallet.save()
  }

  async getWallet(userId: string): Promise<WalletDocument> {
    const wallet = await this.walletModel.findOne({ userId })
    if (!wallet) {
      // Auto-create wallet if it doesn't exist
      return await this.createWallet(userId)
    }

    // Reset daily/monthly limits if needed
    await wallet.resetDailyLimits()
    await wallet.resetMonthlyLimits()

    return wallet
  }

  async getBalance(userId: string): Promise<{ balance: number; bonusBalance: number; availableBalance: number; lockedBalance: number }> {
    const wallet = await this.getWallet(userId)
    return {
      balance: wallet.balance,
      bonusBalance: wallet.bonusBalance,
      availableBalance: wallet.balance + wallet.bonusBalance - wallet.lockedBalance,
      lockedBalance: wallet.lockedBalance,
    }
  }

  async addFunds(
    userId: string,
    amount: number,
    type: 'deposit' | 'win' | 'refund' | 'bonus' | 'adjustment',
    metadata: any = {},
    isBonus = false,
  ): Promise<{ wallet: WalletDocument; transaction: TransactionDocument }> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive')
    }

    const wallet = await this.getWallet(userId)
    
    // Record balance before transaction
    const balanceBefore = wallet.balance
    const bonusBalanceBefore = wallet.bonusBalance

    // Create transaction record
    const transaction = await this.transactionService.createTransaction({
      userId,
      type,
      amount,
      currency: wallet.currency,
      status: 'processing',
      metadata,
      balanceBefore,
      bonusBalanceBefore,
    })

    try {
      // Add funds to wallet
      await wallet.addBalance(amount, isBonus)
      
      // Update transaction with new balances
      await transaction.markAsCompleted(
        isBonus ? wallet.balance : wallet.balance + amount,
        isBonus ? wallet.bonusBalance + amount : wallet.bonusBalance,
      )

      // Update daily/monthly totals for deposits
      if (type === 'deposit') {
        await this.updateDepositTotals(wallet, amount)
      }

      const updatedWallet = await this.getWallet(userId)

      // Emit real-time balance update
      this.walletGateway.emitBalanceUpdate(userId, {
        balance: updatedWallet.balance,
        bonusBalance: updatedWallet.bonusBalance,
        lockedBalance: updatedWallet.lockedBalance,
      })

      // Emit transaction created event
      this.walletGateway.emitTransactionCreated(userId, transaction)

      // Send notification for significant deposits
      if (type === 'deposit' && amount >= 100) {
        this.walletGateway.emitNotification(userId, {
          type: 'success',
          title: 'Deposit Successful',
          message: `Your deposit of $${amount.toFixed(2)} has been processed successfully.`,
          data: { transactionId: transaction._id, amount },
        })
      }

      return { wallet: updatedWallet, transaction }
    } catch (error) {
      await transaction.markAsFailed(error.message)
      throw error
    }
  }

  async deductFunds(
    userId: string,
    amount: number,
    type: 'withdrawal' | 'bet' | 'fee' | 'adjustment',
    metadata: any = {},
    useBonus = true,
  ): Promise<{ wallet: WalletDocument; transaction: TransactionDocument; breakdown: any }> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive')
    }

    const wallet = await this.getWallet(userId)
    
    if (!wallet.canDeduct(amount, useBonus)) {
      throw new BadRequestException('Insufficient funds or wallet frozen')
    }

    // Record balance before transaction
    const balanceBefore = wallet.balance
    const bonusBalanceBefore = wallet.bonusBalance

    // Create transaction record
    const transaction = await this.transactionService.createTransaction({
      userId,
      type,
      amount: -amount, // Negative for deductions
      currency: wallet.currency,
      status: 'processing',
      metadata,
      balanceBefore,
      bonusBalanceBefore,
    })

    try {
      // Deduct funds from wallet
      const breakdown = await wallet.deductBalance(amount, useBonus)
      
      // Update transaction with new balances
      await transaction.markAsCompleted(wallet.balance, wallet.bonusBalance)

      // Update daily/monthly totals
      if (type === 'withdrawal') {
        await this.updateWithdrawalTotals(wallet, amount)
      } else if (type === 'bet') {
        await this.updateSpentTotals(wallet, amount)
      }

      const updatedWallet = await this.getWallet(userId)

      // Emit real-time balance update
      this.walletGateway.emitBalanceUpdate(userId, {
        balance: updatedWallet.balance,
        bonusBalance: updatedWallet.bonusBalance,
        lockedBalance: updatedWallet.lockedBalance,
      })

      // Emit transaction created event
      this.walletGateway.emitTransactionCreated(userId, transaction)

      // Send notification for withdrawals
      if (type === 'withdrawal') {
        this.walletGateway.emitNotification(userId, {
          type: 'info',
          title: 'Withdrawal Processed',
          message: `Your withdrawal of $${amount.toFixed(2)} is being processed.`,
          data: { transactionId: transaction._id, amount },
        })
      }

      return { 
        wallet: updatedWallet, 
        transaction,
        breakdown,
      }
    } catch (error) {
      await transaction.markAsFailed(error.message)
      throw error
    }
  }

  async lockFunds(userId: string, amount: number, metadata: any = {}): Promise<WalletDocument> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive')
    }

    const wallet = await this.getWallet(userId)
    await wallet.lockFunds(amount)

    // Create transaction record for fund locking
    await this.transactionService.createTransaction({
      userId,
      type: 'bet',
      amount: 0, // No actual balance change, just locking
      currency: wallet.currency,
      status: 'completed',
      metadata: { ...metadata, action: 'lock_funds', lockedAmount: amount },
      balanceBefore: wallet.balance,
      bonusBalanceBefore: wallet.bonusBalance,
    })

    return await this.getWallet(userId)
  }

  async unlockFunds(userId: string, amount: number, metadata: any = {}): Promise<WalletDocument> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive')
    }

    const wallet = await this.getWallet(userId)
    const unlockedAmount = await wallet.unlockFunds(amount)

    // Create transaction record for fund unlocking
    await this.transactionService.createTransaction({
      userId,
      type: 'refund',
      amount: 0, // No actual balance change, just unlocking
      currency: wallet.currency,
      status: 'completed',
      metadata: { ...metadata, action: 'unlock_funds', unlockedAmount },
      balanceBefore: wallet.balance,
      bonusBalanceBefore: wallet.bonusBalance,
    })

    return await this.getWallet(userId)
  }

  async freezeWallet(userId: string, reason: string): Promise<WalletDocument> {
    const wallet = await this.getWallet(userId)
    await wallet.updateOne({
      isFrozen: true,
      frozenReason: reason,
      updatedAt: new Date(),
    })

    return await this.getWallet(userId)
  }

  async unfreezeWallet(userId: string): Promise<WalletDocument> {
    const wallet = await this.getWallet(userId)
    await wallet.updateOne({
      isFrozen: false,
      $unset: { frozenReason: 1 },
      updatedAt: new Date(),
    })

    return await this.getWallet(userId)
  }

  async updateLimits(
    userId: string,
    limits: {
      dailyDeposit?: number
      dailyWithdrawal?: number
      dailySpent?: number
      monthlyDeposit?: number
      monthlyWithdrawal?: number
      monthlySpent?: number
    },
  ): Promise<WalletDocument> {
    const wallet = await this.getWallet(userId)
    const updateData: any = {}

    if (limits.dailyDeposit !== undefined) updateData['dailyLimits.deposit'] = limits.dailyDeposit
    if (limits.dailyWithdrawal !== undefined) updateData['dailyLimits.withdrawal'] = limits.dailyWithdrawal
    if (limits.dailySpent !== undefined) updateData['dailyLimits.spent'] = limits.dailySpent
    if (limits.monthlyDeposit !== undefined) updateData['monthlyLimits.deposit'] = limits.monthlyDeposit
    if (limits.monthlyWithdrawal !== undefined) updateData['monthlyLimits.withdrawal'] = limits.monthlyWithdrawal
    if (limits.monthlySpent !== undefined) updateData['monthlyLimits.spent'] = limits.monthlySpent

    await wallet.updateOne({ ...updateData, updatedAt: new Date() })
    return await this.getWallet(userId)
  }

  private async updateDepositTotals(wallet: WalletDocument, amount: number): Promise<void> {
    await wallet.updateOne({
      $inc: {
        'dailyTotals.deposited': amount,
        'monthlyTotals.deposited': amount,
      },
    })
  }

  private async updateWithdrawalTotals(wallet: WalletDocument, amount: number): Promise<void> {
    await wallet.updateOne({
      $inc: {
        'dailyTotals.withdrawn': amount,
        'monthlyTotals.withdrawn': amount,
      },
    })
  }

  private async updateSpentTotals(wallet: WalletDocument, amount: number): Promise<void> {
    await wallet.updateOne({
      $inc: {
        'dailyTotals.spent': amount,
        'monthlyTotals.spent': amount,
      },
    })
  }
}