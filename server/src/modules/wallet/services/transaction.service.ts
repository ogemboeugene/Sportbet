import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Transaction, TransactionDocument } from '../../../database/schemas/transaction.schema'

export interface CreateTransactionDto {
  userId: string
  type: string
  amount: number
  currency?: string
  status?: string
  description?: string
  paymentMethod?: string
  paymentGateway?: string
  externalTransactionId?: string
  metadata?: any
  balanceBefore?: number
  bonusBalanceBefore?: number
  parentTransactionId?: string
}

export interface TransactionFilters {
  userId?: string
  type?: string | string[]
  status?: string | string[]
  paymentMethod?: string
  paymentGateway?: string
  dateFrom?: Date
  dateTo?: Date
  amountMin?: number
  amountMax?: number
}

export interface PaginationOptions {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
  ) {}

  async createTransaction(data: CreateTransactionDto): Promise<TransactionDocument> {
    const transaction = new this.transactionModel({
      ...data,
      currency: data.currency || 'USD',
      status: data.status || 'pending',
      metadata: data.metadata || {},
    })

    return await transaction.save()
  }

  async getTransaction(transactionId: string): Promise<TransactionDocument> {
    return await this.transactionModel.findById(transactionId).populate('userId', 'email profile.firstName profile.lastName')
  }

  async getTransactionByExternalId(externalId: string): Promise<TransactionDocument> {
    return await this.transactionModel.findOne({ externalTransactionId: externalId })
  }

  async getTransactionByReference(reference: string): Promise<TransactionDocument> {
    // Try to find by external transaction ID first, then by our internal reference
    let transaction = await this.transactionModel.findOne({ externalTransactionId: reference })
    
    if (!transaction) {
      // If not found, try to find by our internal transaction ID pattern
      transaction = await this.transactionModel.findOne({
        $or: [
          { _id: reference },
          { 'metadata.reference': reference },
          { 'metadata.transactionId': reference }
        ]
      })
    }
    
    return transaction
  }

  async getTransactions(
    filters: TransactionFilters = {},
    pagination: PaginationOptions = {},
  ): Promise<{
    transactions: TransactionDocument[]
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = pagination

    // Build query
    const query: any = {}

    if (filters.userId) {
      query.userId = filters.userId
    }

    if (filters.type) {
      query.type = Array.isArray(filters.type) ? { $in: filters.type } : filters.type
    }

    if (filters.status) {
      query.status = Array.isArray(filters.status) ? { $in: filters.status } : filters.status
    }

    if (filters.paymentMethod) {
      query.paymentMethod = filters.paymentMethod
    }

    if (filters.paymentGateway) {
      query.paymentGateway = filters.paymentGateway
    }

    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {}
      if (filters.dateFrom) {
        query.createdAt.$gte = filters.dateFrom
      }
      if (filters.dateTo) {
        query.createdAt.$lte = filters.dateTo
      }
    }

    if (filters.amountMin !== undefined || filters.amountMax !== undefined) {
      query.amount = {}
      if (filters.amountMin !== undefined) {
        query.amount.$gte = filters.amountMin
      }
      if (filters.amountMax !== undefined) {
        query.amount.$lte = filters.amountMax
      }
    }

    // Execute query with pagination
    const skip = (page - 1) * limit
    const sortOptions: any = {}
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1

    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find(query)
        .populate('userId', 'email profile.firstName profile.lastName')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.transactionModel.countDocuments(query),
    ])

    return {
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async getUserTransactions(
    userId: string,
    filters: Omit<TransactionFilters, 'userId'> = {},
    pagination: PaginationOptions = {},
  ) {
    return this.getTransactions({ ...filters, userId }, pagination)
  }

  async updateTransactionStatus(
    transactionId: string,
    status: string,
    metadata: any = {},
  ): Promise<TransactionDocument> {
    const transaction = await this.transactionModel.findById(transactionId)
    if (!transaction) {
      throw new Error('Transaction not found')
    }

    const updateData: any = {
      status,
      updatedAt: new Date(),
      metadata: { ...transaction.metadata, ...metadata },
    }

    if (status === 'completed' || status === 'failed') {
      updateData.processedAt = new Date()
    }

    await transaction.updateOne(updateData)
    return await this.getTransaction(transactionId)
  }

  async getTransactionStats(
    userId?: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<{
    totalDeposits: number
    totalWithdrawals: number
    totalBets: number
    totalWins: number
    totalRefunds: number
    transactionCount: number
    avgTransactionAmount: number
  }> {
    const matchStage: any = {}

    if (userId) {
      matchStage.userId = userId
    }

    if (dateFrom || dateTo) {
      matchStage.createdAt = {}
      if (dateFrom) matchStage.createdAt.$gte = dateFrom
      if (dateTo) matchStage.createdAt.$lte = dateTo
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalDeposits: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$type', 'deposit'] }, { $eq: ['$status', 'completed'] }] },
                '$amount',
                0,
              ],
            },
          },
          totalWithdrawals: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$type', 'withdrawal'] }, { $eq: ['$status', 'completed'] }] },
                { $abs: '$amount' },
                0,
              ],
            },
          },
          totalBets: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$type', 'bet'] }, { $eq: ['$status', 'completed'] }] },
                { $abs: '$amount' },
                0,
              ],
            },
          },
          totalWins: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$type', 'win'] }, { $eq: ['$status', 'completed'] }] },
                '$amount',
                0,
              ],
            },
          },
          totalRefunds: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$type', 'refund'] }, { $eq: ['$status', 'completed'] }] },
                '$amount',
                0,
              ],
            },
          },
          transactionCount: { $sum: 1 },
          avgTransactionAmount: { $avg: { $abs: '$amount' } },
        },
      },
    ]

    const result = await this.transactionModel.aggregate(pipeline)
    
    if (result.length === 0) {
      return {
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalBets: 0,
        totalWins: 0,
        totalRefunds: 0,
        transactionCount: 0,
        avgTransactionAmount: 0,
      }
    }

    return result[0]
  }

  async getPendingTransactions(limit = 100): Promise<TransactionDocument[]> {
    return await this.transactionModel
      .find({ status: 'pending' })
      .sort({ createdAt: 1 })
      .limit(limit)
      .populate('userId', 'email profile.firstName profile.lastName')
  }

  async getFailedTransactions(
    dateFrom?: Date,
    limit = 100,
  ): Promise<TransactionDocument[]> {
    const query: any = { status: 'failed' }
    
    if (dateFrom) {
      query.createdAt = { $gte: dateFrom }
    }

    return await this.transactionModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'email profile.firstName profile.lastName')
  }

  async retryFailedTransaction(transactionId: string): Promise<TransactionDocument> {
    const transaction = await this.transactionModel.findById(transactionId)
    if (!transaction) {
      throw new Error('Transaction not found')
    }

    if (transaction.status !== 'failed') {
      throw new Error('Only failed transactions can be retried')
    }

    await transaction.updateOne({
      status: 'pending',
      failureReason: undefined,
      processedAt: undefined,
      updatedAt: new Date(),
    })

    return await this.getTransaction(transactionId)
  }
}