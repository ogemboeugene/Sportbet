import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'
import * as mongoose from 'mongoose'

export type TransactionDocument = Transaction & Document & {
  markAsProcessing(): Promise<any>;
  markAsCompleted(balanceAfter?: number, bonusBalanceAfter?: number): Promise<any>;
  markAsFailed(reason: string): Promise<any>;
  addChildTransaction(childId: mongoose.Types.ObjectId): Promise<any>;
}

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Types.ObjectId

  @Prop({ 
    enum: ['deposit', 'withdrawal', 'bet', 'win', 'refund', 'bonus', 'fee', 'adjustment'], 
    required: true 
  })
  type: string

  @Prop({ required: true })
  amount: number

  @Prop({ default: 'USD' })
  currency: string

  @Prop({ 
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'expired'], 
    default: 'pending' 
  })
  status: string

  @Prop()
  description?: string

  @Prop()
  paymentMethod?: string

  @Prop()
  paymentGateway?: string

  @Prop()
  externalTransactionId?: string

  @Prop()
  gatewayResponse?: string

  @Prop({ type: Object })
  metadata: {
    betId?: string
    bonusId?: string
    promotionId?: string
    feeType?: string
    originalAmount?: number
    exchangeRate?: number
    gatewayFee?: number
    processingFee?: number
    ipAddress?: string
    userAgent?: string
    location?: string
    paymentDetails?: any
  }

  @Prop()
  balanceBefore?: number

  @Prop()
  balanceAfter?: number

  @Prop()
  bonusBalanceBefore?: number

  @Prop()
  bonusBalanceAfter?: number

  @Prop()
  processedAt?: Date

  @Prop()
  failureReason?: string

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  processedBy?: mongoose.Types.ObjectId

  @Prop()
  parentTransactionId?: mongoose.Types.ObjectId

  @Prop([{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }])
  childTransactions: mongoose.Types.ObjectId[]

  @Prop({ default: Date.now })
  createdAt: Date

  @Prop({ default: Date.now })
  updatedAt: Date
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction)

// Indexes for performance
TransactionSchema.index({ userId: 1, createdAt: -1 })
TransactionSchema.index({ type: 1, status: 1 })
TransactionSchema.index({ status: 1, createdAt: -1 })
TransactionSchema.index({ externalTransactionId: 1 })
TransactionSchema.index({ paymentGateway: 1, status: 1 })
TransactionSchema.index({ createdAt: -1 })

// Compound indexes for common queries
TransactionSchema.index({ userId: 1, type: 1, status: 1 })
TransactionSchema.index({ userId: 1, status: 1, createdAt: -1 })

// Methods
TransactionSchema.methods.markAsProcessing = async function() {
  await this.updateOne({
    status: 'processing',
    processedAt: new Date(),
    updatedAt: new Date(),
  })
}

TransactionSchema.methods.markAsCompleted = async function(balanceAfter?: number, bonusBalanceAfter?: number) {
  const update: any = {
    status: 'completed',
    processedAt: new Date(),
    updatedAt: new Date(),
  }
  
  if (balanceAfter !== undefined) update.balanceAfter = balanceAfter
  if (bonusBalanceAfter !== undefined) update.bonusBalanceAfter = bonusBalanceAfter
  
  await this.updateOne(update)
}

TransactionSchema.methods.markAsFailed = async function(reason: string) {
  await this.updateOne({
    status: 'failed',
    failureReason: reason,
    processedAt: new Date(),
    updatedAt: new Date(),
  })
}

TransactionSchema.methods.addChildTransaction = async function(childId: mongoose.Types.ObjectId) {
  await this.updateOne({
    $push: { childTransactions: childId },
    updatedAt: new Date(),
  })
}