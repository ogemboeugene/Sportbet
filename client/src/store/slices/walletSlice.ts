import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { walletApi, WalletBalance, Transaction, TransactionStats, TransactionFilters } from '../../services/walletApi'

interface WalletState {
  wallet: WalletBalance | null
  balance: number
  transactions: Transaction[]
  transactionStats: TransactionStats | null
  loading: boolean
  transactionsLoading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  filters: TransactionFilters
}

const initialState: WalletState = {
  wallet: null,
  balance: 0,
  transactions: [],
  transactionStats: null,
  loading: false,
  transactionsLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  filters: {
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
}

// Async thunks
export const fetchWallet = createAsyncThunk(
  'wallet/fetchWallet',
  async (_, { rejectWithValue }) => {
    try {
      return await walletApi.getWallet()
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch wallet')
    }
  }
)

export const fetchBalance = createAsyncThunk(
  'wallet/fetchBalance',
  async (_, { rejectWithValue }) => {
    try {
      return await walletApi.getBalance()
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch balance')
    }
  }
)

export const fetchTransactions = createAsyncThunk(
  'wallet/fetchTransactions',
  async (filters: TransactionFilters, { rejectWithValue }) => {
    try {
      return await walletApi.getTransactions(filters)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch transactions')
    }
  }
)

export const fetchTransactionStats = createAsyncThunk(
  'wallet/fetchTransactionStats',
  async ({ dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }, { rejectWithValue }) => {
    try {
      return await walletApi.getTransactionStats(dateFrom, dateTo)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch transaction stats')
    }
  }
)

export const addFunds = createAsyncThunk(
  'wallet/addFunds',
  async (
    {
      amount,
      type,
      isBonus = false,
      metadata = {},
    }: {
      amount: number
      type: 'deposit' | 'win' | 'refund' | 'bonus' | 'adjustment'
      isBonus?: boolean
      metadata?: any
    },
    { rejectWithValue }
  ) => {
    try {
      return await walletApi.addFunds(amount, type, isBonus, metadata)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add funds')
    }
  }
)

export const deductFunds = createAsyncThunk(
  'wallet/deductFunds',
  async (
    {
      amount,
      type,
      useBonus = true,
      metadata = {},
    }: {
      amount: number
      type: 'withdrawal' | 'bet' | 'fee' | 'adjustment'
      useBonus?: boolean
      metadata?: any
    },
    { rejectWithValue }
  ) => {
    try {
      return await walletApi.deductFunds(amount, type, useBonus, metadata)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to deduct funds')
    }
  }
)

export const lockFunds = createAsyncThunk(
  'wallet/lockFunds',
  async ({ amount, metadata = {} }: { amount: number; metadata?: any }, { rejectWithValue }) => {
    try {
      return await walletApi.lockFunds(amount, metadata)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to lock funds')
    }
  }
)

export const unlockFunds = createAsyncThunk(
  'wallet/unlockFunds',
  async ({ amount, metadata = {} }: { amount: number; metadata?: any }, { rejectWithValue }) => {
    try {
      return await walletApi.unlockFunds(amount, metadata)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to unlock funds')
    }
  }
)

export const updateLimits = createAsyncThunk(
  'wallet/updateLimits',
  async (
    limits: {
      dailyDeposit?: number
      dailyWithdrawal?: number
      dailySpent?: number
      monthlyDeposit?: number
      monthlyWithdrawal?: number
      monthlySpent?: number
    },
    { rejectWithValue }
  ) => {
    try {
      return await walletApi.updateLimits(limits)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update limits')
    }
  }
)

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setFilters: (state, action: PayloadAction<Partial<TransactionFilters>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    resetFilters: (state) => {
      state.filters = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }
    },
    updateBalance: (state, action: PayloadAction<{ balance: number; bonusBalance: number; lockedBalance: number }>) => {
      if (state.wallet) {
        state.wallet.balance = action.payload.balance
        state.wallet.bonusBalance = action.payload.bonusBalance
        state.wallet.lockedBalance = action.payload.lockedBalance
        state.wallet.availableBalance = action.payload.balance + action.payload.bonusBalance - action.payload.lockedBalance
      }
    },
    addTransaction: (state, action: PayloadAction<Transaction>) => {
      state.transactions.unshift(action.payload)
      state.pagination.total += 1
    },
  },
  extraReducers: (builder) => {
    // Fetch wallet
    builder
      .addCase(fetchWallet.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchWallet.fulfilled, (state, action) => {
        state.loading = false
        state.wallet = action.payload
      })
      .addCase(fetchWallet.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Fetch balance
    builder
      .addCase(fetchBalance.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchBalance.fulfilled, (state, action) => {
        state.loading = false
        if (state.wallet) {
          state.wallet.balance = action.payload.balance
          state.wallet.bonusBalance = action.payload.bonusBalance
          state.wallet.lockedBalance = action.payload.lockedBalance
          state.wallet.availableBalance = action.payload.availableBalance
        }
      })
      .addCase(fetchBalance.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Fetch transactions
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.transactionsLoading = true
        state.error = null
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.transactionsLoading = false
        state.transactions = action.payload.transactions
        state.pagination = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          totalPages: action.payload.totalPages,
        }
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.transactionsLoading = false
        state.error = action.payload as string
      })

    // Fetch transaction stats
    builder
      .addCase(fetchTransactionStats.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTransactionStats.fulfilled, (state, action) => {
        state.loading = false
        state.transactionStats = action.payload
      })
      .addCase(fetchTransactionStats.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Add funds
    builder
      .addCase(addFunds.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(addFunds.fulfilled, (state, action) => {
        state.loading = false
        if (state.wallet) {
          state.wallet.balance = action.payload.wallet.balance
          state.wallet.bonusBalance = action.payload.wallet.bonusBalance
          state.wallet.availableBalance = action.payload.wallet.availableBalance
        }
        // Add transaction to the beginning of the list
        state.transactions.unshift(action.payload.transaction)
        state.pagination.total += 1
      })
      .addCase(addFunds.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Deduct funds
    builder
      .addCase(deductFunds.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deductFunds.fulfilled, (state, action) => {
        state.loading = false
        if (state.wallet) {
          state.wallet.balance = action.payload.wallet.balance
          state.wallet.bonusBalance = action.payload.wallet.bonusBalance
          state.wallet.availableBalance = action.payload.wallet.availableBalance
        }
        // Add transaction to the beginning of the list
        state.transactions.unshift(action.payload.transaction)
        state.pagination.total += 1
      })
      .addCase(deductFunds.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Lock funds
    builder
      .addCase(lockFunds.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(lockFunds.fulfilled, (state, action) => {
        state.loading = false
        if (state.wallet) {
          state.wallet.balance = action.payload.wallet.balance
          state.wallet.bonusBalance = action.payload.wallet.bonusBalance
          state.wallet.lockedBalance = action.payload.wallet.lockedBalance
          state.wallet.availableBalance = action.payload.wallet.availableBalance
        }
      })
      .addCase(lockFunds.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Unlock funds
    builder
      .addCase(unlockFunds.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(unlockFunds.fulfilled, (state, action) => {
        state.loading = false
        if (state.wallet) {
          state.wallet.balance = action.payload.wallet.balance
          state.wallet.bonusBalance = action.payload.wallet.bonusBalance
          state.wallet.lockedBalance = action.payload.wallet.lockedBalance
          state.wallet.availableBalance = action.payload.wallet.availableBalance
        }
      })
      .addCase(unlockFunds.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Update limits
    builder
      .addCase(updateLimits.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateLimits.fulfilled, (state, action) => {
        state.loading = false
        if (state.wallet) {
          state.wallet.limits = action.payload.limits
        }
      })
      .addCase(updateLimits.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const { clearError, setFilters, resetFilters, updateBalance, addTransaction } = walletSlice.actions
export default walletSlice.reducer