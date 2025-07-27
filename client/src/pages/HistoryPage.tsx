import React, { useState, useEffect } from 'react'
import { walletApi, Transaction } from '../services/walletApi'
import { getUserBets } from '../services/bettingApi'
import toast from 'react-hot-toast'

interface Bet {
  _id: string
  betId: string
  userId: string
  type: 'single' | 'multiple' | 'system'
  stake: number
  potentialWin: number
  status: 'pending' | 'won' | 'lost' | 'void' | 'cashout' | 'cancelled'
  selections: Array<{
    eventId: string
    marketId: string
    selectionId: string
    eventName: string
    marketName: string
    selectionName: string
    odds: number
    result?: 'won' | 'lost' | 'void'
  }>
  placedAt: string
  settledAt?: string
  actualWin?: number
}

type HistoryType = 'transactions' | 'bets'

const HistoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<HistoryType>('transactions')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [bets, setBets] = useState<Bet[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    dateFrom: '',
    dateTo: '',
    type: '',
  })

  useEffect(() => {
    if (activeTab === 'transactions') {
      loadTransactions()
    } else {
      loadBets()
    }
  }, [activeTab, filters])

  const loadTransactions = async () => {
    setLoading(true)
    try {
      const response = await walletApi.getTransactions({
        ...filters,
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
      setTransactions(response.transactions)
    } catch (error) {
      console.error('Failed to load transactions:', error)
      toast.error('Failed to load transaction history')
    } finally {
      setLoading(false)
    }
  }

  const loadBets = async () => {
    setLoading(true)
    try {
      const response = await getUserBets(filters.status, 50, 0)
      setBets(response.bets || [])
    } catch (error) {
      console.error('Failed to load bets:', error)
      toast.error('Failed to load betting history')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const formatAmount = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'won':
        return 'text-green-600 bg-green-100'
      case 'failed':
      case 'lost':
        return 'text-red-600 bg-red-100'
      case 'pending':
      case 'processing':
        return 'text-yellow-600 bg-yellow-100'
      case 'cancelled':
      case 'void':
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-blue-600 bg-blue-100'
    }
  }

  const renderTransactionRow = (transaction: Transaction) => (
    <tr key={transaction._id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">
          {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
        </div>
        <div className="text-sm text-gray-500">
          {new Date(transaction.createdAt).toLocaleDateString()}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={`text-sm font-semibold ${
          ['deposit', 'win', 'refund', 'bonus'].includes(transaction.type) 
            ? 'text-green-600' 
            : 'text-red-600'
        }`}>
          {['deposit', 'win', 'refund', 'bonus'].includes(transaction.type) ? '+' : '-'}
          {formatAmount(transaction.amount, transaction.currency)}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
          {transaction.status}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-gray-900">
          {transaction.description || '-'}
        </div>
        {transaction.paymentMethod && (
          <div className="text-sm text-gray-500">
            via {transaction.paymentMethod}
          </div>
        )}
      </td>
    </tr>
  )

  const renderBetRow = (bet: Bet) => (
    <tr key={bet._id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">
          {bet.betId}
        </div>
        <div className="text-sm text-gray-500">
          {new Date(bet.placedAt).toLocaleDateString()}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          {bet.type.charAt(0).toUpperCase() + bet.type.slice(1)}
        </div>
        <div className="text-sm text-gray-500">
          {bet.selections.length} selection{bet.selections.length > 1 ? 's' : ''}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">
          {formatAmount(bet.stake)}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          {formatAmount(bet.potentialWin)}
        </div>
        {bet.actualWin && (
          <div className="text-sm text-green-600">
            Won: {formatAmount(bet.actualWin)}
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(bet.status)}`}>
          {bet.status}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-gray-900 max-w-xs truncate">
          {bet.selections.map(s => s.eventName).join(', ')}
        </div>
      </td>
    </tr>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Transaction & Betting History</h1>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('transactions')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'transactions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Transactions
              </button>
              <button
                onClick={() => setActiveTab('bets')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'bets'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Betting History
              </button>
            </nav>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 bg-gray-50 border-b">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  {activeTab === 'transactions' ? (
                    <>
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                      <option value="cancelled">Cancelled</option>
                    </>
                  ) : (
                    <>
                      <option value="pending">Pending</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                      <option value="void">Void</option>
                      <option value="cancelled">Cancelled</option>
                    </>
                  )}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              {activeTab === 'transactions' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={filters.type}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="deposit">Deposit</option>
                    <option value="withdrawal">Withdrawal</option>
                    <option value="bet">Bet</option>
                    <option value="win">Win</option>
                    <option value="refund">Refund</option>
                    <option value="bonus">Bonus</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {activeTab === 'transactions' ? (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type & Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bet ID & Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stake
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Potential Win
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Events
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activeTab === 'transactions' ? (
                    transactions.length > 0 ? (
                      transactions.map(renderTransactionRow)
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                          No transactions found
                        </td>
                      </tr>
                    )
                  ) : (
                    bets.length > 0 ? (
                      bets.map(renderBetRow)
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                          No bets found
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default HistoryPage
