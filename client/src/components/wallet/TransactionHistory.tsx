import React from 'react'
import { Transaction } from '../../services/walletApi'

interface TransactionHistoryProps {
  transactions: Transaction[]
  loading?: boolean
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  onPageChange?: (page: number) => void
  showPagination?: boolean
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  loading = false,
  pagination,
  onPageChange,
  showPagination = true,
}) => {
  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(Math.abs(amount))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return '💰'
      case 'withdrawal':
        return '💸'
      case 'bet':
        return '🎯'
      case 'win':
        return '🏆'
      case 'refund':
        return '↩️'
      case 'bonus':
        return '🎁'
      case 'fee':
        return '💳'
      case 'adjustment':
        return '⚖️'
      default:
        return '📄'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      case 'expired':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getAmountColor = (type: string, amount: number) => {
    if (type === 'deposit' || type === 'win' || type === 'refund' || type === 'bonus') {
      return 'text-green-600'
    }
    if (type === 'withdrawal' || type === 'bet' || type === 'fee') {
      return 'text-red-600'
    }
    return amount > 0 ? 'text-green-600' : 'text-red-600'
  }

  const getAmountPrefix = (type: string, amount: number) => {
    if (type === 'deposit' || type === 'win' || type === 'refund' || type === 'bonus') {
      return '+'
    }
    if (type === 'withdrawal' || type === 'bet' || type === 'fee') {
      return '-'
    }
    return amount > 0 ? '+' : '-'
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
              <div className="w-20 h-4 bg-gray-300 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions</h3>
        <p className="mt-1 text-sm text-gray-500">You haven't made any transactions yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Transaction List */}
      <div className="space-y-2">
        {transactions.map((transaction) => (
          <div
            key={transaction._id}
            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg">
                  {getTransactionIcon(transaction.type)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {transaction.type.replace('_', ' ')}
                  </p>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      transaction.status
                    )}`}
                  >
                    {transaction.status}
                  </span>
                </div>
                <div className="flex items-center space-x-4 mt-1">
                  <p className="text-sm text-gray-500">{formatDate(transaction.createdAt)}</p>
                  {transaction.paymentMethod && (
                    <p className="text-sm text-gray-500">via {transaction.paymentMethod}</p>
                  )}
                  {transaction.description && (
                    <p className="text-sm text-gray-500">{transaction.description}</p>
                  )}
                </div>
                {transaction.failureReason && (
                  <p className="text-sm text-red-600 mt-1">Error: {transaction.failureReason}</p>
                )}
              </div>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className={`text-sm font-semibold ${getAmountColor(transaction.type, transaction.amount)}`}>
                {getAmountPrefix(transaction.type, transaction.amount)}
                {formatCurrency(transaction.amount, transaction.currency)}
              </p>
              {transaction.balanceAfter !== undefined && (
                <p className="text-xs text-gray-500 mt-1">
                  Balance: {formatCurrency(transaction.balanceAfter, transaction.currency)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {showPagination && pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {(pagination.page - 1) * pagination.limit + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{' '}
                of <span className="font-medium">{pagination.total}</span> results
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => onPageChange?.(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                  </svg>
                </button>

                {/* Page Numbers */}
                {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                  const pageNum = i + Math.max(1, pagination.page - 2)
                  if (pageNum > pagination.totalPages) return null
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange?.(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                        pageNum === pagination.page
                          ? 'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}

                <button
                  onClick={() => onPageChange?.(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}