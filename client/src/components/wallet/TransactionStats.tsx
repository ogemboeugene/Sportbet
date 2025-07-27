import React from 'react'
import { TransactionStats as TransactionStatsType } from '../../services/walletApi'

interface TransactionStatsProps {
  stats: TransactionStatsType
  detailed?: boolean
}

export const TransactionStats: React.FC<TransactionStatsProps> = ({ stats, detailed = false }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const netProfit = stats.totalWins - stats.totalBets
  const profitMargin = stats.totalBets > 0 ? (netProfit / stats.totalBets) * 100 : 0

  const statCards = [
    {
      title: 'Total Deposits',
      value: formatCurrency(stats.totalDeposits),
      icon: '💰',
      color: 'bg-green-500',
      textColor: 'text-green-600',
    },
    {
      title: 'Total Withdrawals',
      value: formatCurrency(stats.totalWithdrawals),
      icon: '💸',
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
    },
    {
      title: 'Total Bets',
      value: formatCurrency(stats.totalBets),
      icon: '🎯',
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
    },
    {
      title: 'Total Wins',
      value: formatCurrency(stats.totalWins),
      icon: '🏆',
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
    },
  ]

  const additionalStats = [
    {
      title: 'Total Refunds',
      value: formatCurrency(stats.totalRefunds),
      icon: '↩️',
      color: 'bg-gray-500',
      textColor: 'text-gray-600',
    },
    {
      title: 'Net Profit/Loss',
      value: formatCurrency(netProfit),
      icon: netProfit >= 0 ? '📈' : '📉',
      color: netProfit >= 0 ? 'bg-green-500' : 'bg-red-500',
      textColor: netProfit >= 0 ? 'text-green-600' : 'text-red-600',
    },
    {
      title: 'Transaction Count',
      value: stats.transactionCount.toLocaleString(),
      icon: '📊',
      color: 'bg-indigo-500',
      textColor: 'text-indigo-600',
    },
    {
      title: 'Avg Transaction',
      value: formatCurrency(stats.avgTransactionAmount),
      icon: '📋',
      color: 'bg-pink-500',
      textColor: 'text-pink-600',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`${stat.color} rounded-md p-3`}>
                <span className="text-white text-xl">{stat.icon}</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                <p className={`text-2xl font-semibold ${stat.textColor}`}>{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Stats (shown in detailed view) */}
      {detailed && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {additionalStats.map((stat, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className={`${stat.color} rounded-md p-3`}>
                    <span className="text-white text-xl">{stat.icon}</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                    <p className={`text-2xl font-semibold ${stat.textColor}`}>{stat.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Performance Metrics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Performance Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Win Rate */}
              <div className="text-center">
                <div className="relative inline-flex items-center justify-center w-20 h-20">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="30"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-200"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="30"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 30}`}
                      strokeDashoffset={`${2 * Math.PI * 30 * (1 - (stats.totalWins > 0 && stats.totalBets > 0 ? stats.totalWins / stats.totalBets : 0))}`}
                      className="text-green-500"
                    />
                  </svg>
                  <span className="absolute text-sm font-semibold text-gray-900">
                    {stats.totalBets > 0 ? Math.round((stats.totalWins / stats.totalBets) * 100) : 0}%
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-gray-900">Win Rate</p>
                <p className="text-xs text-gray-500">Wins vs Total Bets</p>
              </div>

              {/* Profit Margin */}
              <div className="text-center">
                <div className="relative inline-flex items-center justify-center w-20 h-20">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="30"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-200"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="30"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 30}`}
                      strokeDashoffset={`${2 * Math.PI * 30 * (1 - Math.min(Math.abs(profitMargin) / 100, 1))}`}
                      className={profitMargin >= 0 ? 'text-green-500' : 'text-red-500'}
                    />
                  </svg>
                  <span className="absolute text-sm font-semibold text-gray-900">
                    {Math.round(Math.abs(profitMargin))}%
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-gray-900">Profit Margin</p>
                <p className="text-xs text-gray-500">
                  {profitMargin >= 0 ? 'Profit' : 'Loss'} vs Bets
                </p>
              </div>

              {/* Activity Level */}
              <div className="text-center">
                <div className="relative inline-flex items-center justify-center w-20 h-20">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="30"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-200"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="30"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 30}`}
                      strokeDashoffset={`${2 * Math.PI * 30 * (1 - Math.min(stats.transactionCount / 100, 1))}`}
                      className="text-blue-500"
                    />
                  </svg>
                  <span className="absolute text-xs font-semibold text-gray-900">
                    {stats.transactionCount}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-gray-900">Activity Level</p>
                <p className="text-xs text-gray-500">Total Transactions</p>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Financial Summary */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
              <h4 className="text-lg font-semibold mb-4">Financial Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-blue-100">Money In:</span>
                  <span className="font-semibold">{formatCurrency(stats.totalDeposits + stats.totalWins + stats.totalRefunds)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-100">Money Out:</span>
                  <span className="font-semibold">{formatCurrency(stats.totalWithdrawals + stats.totalBets)}</span>
                </div>
                <div className="border-t border-blue-400 pt-2">
                  <div className="flex justify-between">
                    <span className="text-blue-100">Net Position:</span>
                    <span className={`font-bold ${netProfit >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                      {formatCurrency(stats.totalDeposits + stats.totalWins + stats.totalRefunds - stats.totalWithdrawals - stats.totalBets)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Betting Summary */}
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
              <h4 className="text-lg font-semibold mb-4">Betting Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-purple-100">Total Wagered:</span>
                  <span className="font-semibold">{formatCurrency(stats.totalBets)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-100">Total Won:</span>
                  <span className="font-semibold">{formatCurrency(stats.totalWins)}</span>
                </div>
                <div className="border-t border-purple-400 pt-2">
                  <div className="flex justify-between">
                    <span className="text-purple-100">Betting P&L:</span>
                    <span className={`font-bold ${netProfit >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                      {formatCurrency(netProfit)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}