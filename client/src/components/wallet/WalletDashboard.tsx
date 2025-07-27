import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../../store'
import { fetchWallet, fetchTransactions, fetchTransactionStats, setFilters } from '../../store/slices/walletSlice'
import { WalletBalance } from './WalletBalance'
import { TransactionHistory } from './TransactionHistory'
import { TransactionStats } from './TransactionStats'
import { TransactionFilters } from './TransactionFilters'
import { PaymentModal } from './PaymentModal'

export const WalletDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { wallet, transactions, transactionStats, loading, transactionsLoading, error, pagination, filters } = useSelector(
    (state: RootState) => state.wallet
  )

  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'stats'>('overview')
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean
    type: 'deposit' | 'withdrawal'
  }>({
    isOpen: false,
    type: 'deposit'
  })

  useEffect(() => {
    dispatch(fetchWallet())
    dispatch(fetchTransactions(filters))
    dispatch(fetchTransactionStats({}))
  }, [dispatch])

  const handleFilterChange = (newFilters: any) => {
    const updatedFilters = { ...filters, ...newFilters, page: 1 }
    dispatch(setFilters(updatedFilters))
    dispatch(fetchTransactions(updatedFilters))
  }

  const handlePageChange = (page: number) => {
    const updatedFilters = { ...filters, page }
    dispatch(setFilters(updatedFilters))
    dispatch(fetchTransactions(updatedFilters))
  }

  const openPaymentModal = (type: 'deposit' | 'withdrawal') => {
    setPaymentModal({ isOpen: true, type })
  }

  const closePaymentModal = () => {
    setPaymentModal({ isOpen: false, type: 'deposit' })
  }

  const handlePaymentSuccess = () => {
    // Refresh wallet data after successful payment
    dispatch(fetchWallet())
    dispatch(fetchTransactions(filters))
    dispatch(fetchTransactionStats({}))
  }

  if (loading && !wallet) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading wallet</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your funds, view transaction history, and monitor your spending.
          </p>
        </div>
      </div>

      {/* Wallet Balance */}
      {wallet && (
        <WalletBalance 
          wallet={wallet} 
          onDeposit={() => openPaymentModal('deposit')}
          onWithdraw={() => openPaymentModal('withdrawal')}
        />
      )}

      {/* Navigation Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: 'overview', name: 'Overview', icon: '📊' },
              { id: 'transactions', name: 'Transactions', icon: '📋' },
              { id: 'stats', name: 'Statistics', icon: '📈' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {transactionStats && <TransactionStats stats={transactionStats} />}
              
              {/* Recent Transactions */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Transactions</h3>
                <TransactionHistory
                  transactions={transactions.slice(0, 5)}
                  loading={transactionsLoading}
                  showPagination={false}
                />
                {transactions.length > 5 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setActiveTab('transactions')}
                      className="text-blue-600 hover:text-blue-500 font-medium"
                    >
                      View all transactions →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <TransactionFilters
                filters={filters}
                onFilterChange={handleFilterChange}
              />
              <TransactionHistory
                transactions={transactions}
                loading={transactionsLoading}
                pagination={pagination}
                onPageChange={handlePageChange}
              />
            </div>
          )}

          {activeTab === 'stats' && transactionStats && (
            <TransactionStats stats={transactionStats} detailed />
          )}
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={paymentModal.isOpen}
        type={paymentModal.type}
        onClose={closePaymentModal}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  )
}