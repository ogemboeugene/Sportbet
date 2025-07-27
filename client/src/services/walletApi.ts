import { api } from './api'

export interface WalletBalance {
  balance: number
  bonusBalance: number
  lockedBalance: number
  availableBalance: number
  currency: string
  limits: {
    daily: {
      deposit: number
      withdrawal: number
      spent: number
    }
    monthly: {
      deposit: number
      withdrawal: number
      spent: number
    }
  }
  totals: {
    daily: {
      deposited: number
      withdrawn: number
      spent: number
      lastReset: string
    }
    monthly: {
      deposited: number
      withdrawn: number
      spent: number
      lastReset: string
    }
  }
  isFrozen: boolean
  frozenReason?: string
  lastActivity: string
}

export interface Transaction {
  _id: string
  userId: string
  type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'refund' | 'bonus' | 'fee' | 'adjustment'
  amount: number
  currency: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired'
  description?: string
  paymentMethod?: string
  paymentGateway?: string
  externalTransactionId?: string
  metadata: any
  balanceBefore?: number
  balanceAfter?: number
  bonusBalanceBefore?: number
  bonusBalanceAfter?: number
  processedAt?: string
  failureReason?: string
  createdAt: string
  updatedAt: string
}

export interface TransactionResponse {
  transactions: Transaction[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface TransactionStats {
  totalDeposits: number
  totalWithdrawals: number
  totalBets: number
  totalWins: number
  totalRefunds: number
  transactionCount: number
  avgTransactionAmount: number
}

export interface TransactionFilters {
  page?: number
  limit?: number
  type?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

class WalletApi {
  async getWallet(): Promise<WalletBalance> {
    const response = await api.get('/wallet')
    return response.data
  }

  async getBalance(): Promise<{
    balance: number
    bonusBalance: number
    availableBalance: number
    lockedBalance: number
  }> {
    const response = await api.get('/wallet/balance')
    return response.data
  }

  async getTransactions(filters: TransactionFilters = {}): Promise<TransactionResponse> {
    const params = new URLSearchParams()
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString())
      }
    })

    const response = await api.get(`/wallet/transactions?${params.toString()}`)
    return response.data
  }

  async getTransaction(transactionId: string): Promise<Transaction> {
    const response = await api.get(`/wallet/transactions/${transactionId}`)
    return response.data
  }

  async getTransactionStats(dateFrom?: string, dateTo?: string): Promise<TransactionStats> {
    const params = new URLSearchParams()
    if (dateFrom) params.append('dateFrom', dateFrom)
    if (dateTo) params.append('dateTo', dateTo)

    const response = await api.get(`/wallet/stats?${params.toString()}`)
    return response.data
  }

  async addFunds(
    amount: number,
    type: 'deposit' | 'win' | 'refund' | 'bonus' | 'adjustment',
    isBonus = false,
    metadata: any = {},
  ): Promise<{
    success: boolean
    wallet: {
      balance: number
      bonusBalance: number
      availableBalance: number
    }
    transaction: Transaction
  }> {
    const response = await api.post('/wallet/add-funds', {
      amount,
      type,
      isBonus,
      metadata,
    })
    return response.data
  }

  async deductFunds(
    amount: number,
    type: 'withdrawal' | 'bet' | 'fee' | 'adjustment',
    useBonus = true,
    metadata: any = {},
  ): Promise<{
    success: boolean
    wallet: {
      balance: number
      bonusBalance: number
      availableBalance: number
    }
    transaction: Transaction
    breakdown: {
      mainUsed: number
      bonusUsed: number
      totalUsed: number
    }
  }> {
    const response = await api.post('/wallet/deduct-funds', {
      amount,
      type,
      useBonus,
      metadata,
    })
    return response.data
  }

  async lockFunds(amount: number, metadata: any = {}): Promise<{
    success: boolean
    wallet: {
      balance: number
      bonusBalance: number
      lockedBalance: number
      availableBalance: number
    }
  }> {
    const response = await api.post('/wallet/lock-funds', {
      amount,
      metadata,
    })
    return response.data
  }

  async unlockFunds(amount: number, metadata: any = {}): Promise<{
    success: boolean
    wallet: {
      balance: number
      bonusBalance: number
      lockedBalance: number
      availableBalance: number
    }
  }> {
    const response = await api.post('/wallet/unlock-funds', {
      amount,
      metadata,
    })
    return response.data
  }

  async updateLimits(limits: {
    dailyDeposit?: number
    dailyWithdrawal?: number
    dailySpent?: number
    monthlyDeposit?: number
    monthlyWithdrawal?: number
    monthlySpent?: number
  }): Promise<{
    success: boolean
    limits: {
      daily: {
        deposit: number
        withdrawal: number
        spent: number
      }
      monthly: {
        deposit: number
        withdrawal: number
        spent: number
      }
    }
  }> {
    const response = await api.put('/wallet/limits', limits)
    return response.data
  }

  // Payment Gateway Methods
  async getAvailableGateways(currency: string, country?: string): Promise<any[]> {
    const params = new URLSearchParams({ currency })
    if (country) params.append('country', country)
    
    const response = await api.get(`/wallet/payment-gateways?${params.toString()}`)
    return response.data
  }

  async getSupportedCurrencies(): Promise<{ currencies: string[] }> {
    const response = await api.get('/wallet/supported-currencies')
    return response.data
  }

  async getSupportedCountries(): Promise<{ countries: string[] }> {
    const response = await api.get('/wallet/supported-countries')
    return response.data
  }

  async initiateDeposit(data: {
    amount: number
    currency: string
    paymentMethod?: string
    gatewayName?: string
    metadata?: any
  }): Promise<{
    success: boolean
    transactionId: string
    paymentUrl?: string
    status: string
    message?: string
  }> {
    const response = await api.post('/wallet/deposit', data)
    return response.data
  }

  async initiateWithdrawal(data: {
    amount: number
    currency: string
    withdrawalDetails: {
      bankAccount?: {
        accountNumber: string
        bankCode: string
        accountName: string
      }
      mobileWallet?: {
        phoneNumber: string
        provider: string
      }
    }
    gatewayName?: string
    metadata?: any
  }): Promise<{
    success: boolean
    transactionId: string
    status: string
    message?: string
  }> {
    const response = await api.post('/wallet/withdraw', data)
    return response.data
  }

  async verifyTransaction(
    transactionId: string,
    gatewayName: string,
    type: 'deposit' | 'withdrawal'
  ): Promise<{
    success: boolean
    status: string
    message?: string
    metadata?: any
  }> {
    const response = await api.post(`/wallet/verify/${transactionId}`, {
      gatewayName,
      type,
    })
    return response.data
  }
}

export const walletApi = new WalletApi()