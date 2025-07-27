import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'
import * as mongoose from 'mongoose'

export type WalletDocument = Wallet & Document & {
  canDeduct(amount: number, includeBonus?: boolean): boolean;
  deductBalance(amount: number, useBonus?: boolean): Promise<any>;
  addBalance(amount: number, isBonus?: boolean): Promise<any>;
  lockFunds(amount: number): Promise<any>;
  unlockFunds(amount: number): Promise<any>;
  resetDailyLimits(): Promise<any>;
  resetMonthlyLimits(): Promise<any>;
}

@Schema({ timestamps: true })
export class Wallet {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: mongoose.Types.ObjectId

  @Prop({ type: Number, default: 0, min: 0 })
  balance: number

  @Prop({ type: Number, default: 0, min: 0 })
  bonusBalance: number

  @Prop({ type: Number, default: 0, min: 0 })
  lockedBalance: number // Funds locked in pending bets

  @Prop({ default: 'USD' })
  currency: string

  @Prop({ type: Object, default: {} })
  dailyLimits: {
    deposit: number
    withdrawal: number
    spent: number
  }

  @Prop({ type: Object, default: {} })
  monthlyLimits: {
    deposit: number
    withdrawal: number
    spent: number
  }

  @Prop({ type: Object, default: {} })
  dailyTotals: {
    deposited: number
    withdrawn: number
    spent: number
    lastReset: Date
  }

  @Prop({ type: Object, default: {} })
  monthlyTotals: {
    deposited: number
    withdrawn: number
    spent: number
    lastReset: Date
  }

  @Prop({ default: Date.now })
  lastActivity: Date

  @Prop({ default: false })
  isFrozen: boolean

  @Prop()
  frozenReason?: string

  @Prop({ default: Date.now })
  createdAt: Date

  @Prop({ default: Date.now })
  updatedAt: Date
}

export const WalletSchema = SchemaFactory.createForClass(Wallet)

// Indexes for performance
WalletSchema.index({ balance: -1 })
WalletSchema.index({ lastActivity: -1 })
WalletSchema.index({ isFrozen: 1 })

// Virtual for total available balance
WalletSchema.virtual('availableBalance').get(function() {
  return this.balance + this.bonusBalance - this.lockedBalance
})

// Methods for atomic operations
WalletSchema.methods.canDeduct = function(amount: number, includeBonus = true) {
  const availableBalance = includeBonus 
    ? this.balance + this.bonusBalance - this.lockedBalance
    : this.balance - this.lockedBalance
  return availableBalance >= amount && !this.isFrozen
}

WalletSchema.methods.deductBalance = async function(amount: number, useBonus = true) {
  if (!this.canDeduct(amount, useBonus)) {
    throw new Error('Insufficient funds or wallet frozen')
  }

  let remainingAmount = amount
  let bonusUsed = 0
  let mainUsed = 0

  // Use bonus balance first if allowed
  if (useBonus && this.bonusBalance > 0) {
    bonusUsed = Math.min(remainingAmount, this.bonusBalance)
    remainingAmount -= bonusUsed
  }

  // Use main balance for remaining amount
  if (remainingAmount > 0) {
    mainUsed = remainingAmount
  }

  // Update balances atomically
  const update = {
    $inc: {
      balance: -mainUsed,
      bonusBalance: -bonusUsed,
    },
    $set: {
      lastActivity: new Date(),
      updatedAt: new Date(),
    }
  }

  await this.updateOne(update)
  
  return { mainUsed, bonusUsed, totalUsed: amount }
}

WalletSchema.methods.addBalance = async function(amount: number, isBonus = false) {
  const field = isBonus ? 'bonusBalance' : 'balance'
  
  const update = {
    $inc: { [field]: amount },
    $set: {
      lastActivity: new Date(),
      updatedAt: new Date(),
    }
  }

  await this.updateOne(update)
  return this
}

WalletSchema.methods.lockFunds = async function(amount: number) {
  if (!this.canDeduct(amount)) {
    throw new Error('Insufficient funds to lock')
  }

  await this.updateOne({
    $inc: { lockedBalance: amount },
    $set: { lastActivity: new Date(), updatedAt: new Date() }
  })
}

WalletSchema.methods.unlockFunds = async function(amount: number) {
  const unlockAmount = Math.min(amount, this.lockedBalance)
  
  await this.updateOne({
    $inc: { lockedBalance: -unlockAmount },
    $set: { lastActivity: new Date(), updatedAt: new Date() }
  })
  
  return unlockAmount
}

WalletSchema.methods.resetDailyLimits = async function() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  if (!this.dailyTotals.lastReset || this.dailyTotals.lastReset < today) {
    await this.updateOne({
      'dailyTotals.deposited': 0,
      'dailyTotals.withdrawn': 0,
      'dailyTotals.spent': 0,
      'dailyTotals.lastReset': today,
    })
  }
}

WalletSchema.methods.resetMonthlyLimits = async function() {
  const thisMonth = new Date()
  thisMonth.setDate(1)
  thisMonth.setHours(0, 0, 0, 0)
  
  if (!this.monthlyTotals.lastReset || this.monthlyTotals.lastReset < thisMonth) {
    await this.updateOne({
      'monthlyTotals.deposited': 0,
      'monthlyTotals.withdrawn': 0,
      'monthlyTotals.spent': 0,
      'monthlyTotals.lastReset': thisMonth,
    })
  }
}