import React from 'react'
import { WalletBalance as WalletBalanceType } from '../../services/walletApi'

interface WalletBalanceProps {
  wallet: WalletBalanceType
  onDeposit?: () => void
  onWithdraw?: () => void
}

export const WalletBalance: React.FC<WalletBalanceProps> = ({ wallet, onDeposit, onWithdraw }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: wallet.currency,
    }).format(amount)
  }

  const formatPercentage = (used: number, limit: number) => {
    if (limit === 0) return 0
    return Math.min((used / limit) * 100, 100)
  }

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Main Balance */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Available Balance</p>
                <p className="text-3xl font-bold">{formatCurrency(wallet.availableBalance)}</p>
              </div>
              <div className="bg-blue-400 bg-opacity-30 rounded-full p-3">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            {wallet.isFrozen && (
              <div className="mt-2 flex items-center text-red-200">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span className="text-xs">Wallet Frozen</span>
              </div>
            )}
          </div>

          {/* Main Balance Breakdown */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Balance Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Main Balance</span>
                <span className="text-sm font-medium text-gray-900">{formatCurrency(wallet.balance)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Bonus Balance</span>
                <span className="text-sm font-medium text-green-600">{formatCurrency(wallet.bonusBalance)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Locked Funds</span>
                <span className="text-sm font-medium text-red-600">-{formatCurrency(wallet.lockedBalance)}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">Available</span>
                  <span className="text-sm font-bold text-blue-600">{formatCurrency(wallet.availableBalance)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Limits */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Daily Limits</h3>
            <div className="space-y-4">
              {/* Deposit Limit */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600">Deposits</span>
                  <span className="text-xs text-gray-900">
                    {formatCurrency(wallet.totals.daily.deposited)} / {formatCurrency(wallet.limits.daily.deposit)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getProgressBarColor(
                      formatPercentage(wallet.totals.daily.deposited, wallet.limits.daily.deposit)
                    )}`}
                    style={{
                      width: `${formatPercentage(wallet.totals.daily.deposited, wallet.limits.daily.deposit)}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Withdrawal Limit */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600">Withdrawals</span>
                  <span className="text-xs text-gray-900">
                    {formatCurrency(wallet.totals.daily.withdrawn)} / {formatCurrency(wallet.limits.daily.withdrawal)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getProgressBarColor(
                      formatPercentage(wallet.totals.daily.withdrawn, wallet.limits.daily.withdrawal)
                    )}`}
                    style={{
                      width: `${formatPercentage(wallet.totals.daily.withdrawn, wallet.limits.daily.withdrawal)}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Spending Limit */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600">Spending</span>
                  <span className="text-xs text-gray-900">
                    {formatCurrency(wallet.totals.daily.spent)} / {formatCurrency(wallet.limits.daily.spent)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getProgressBarColor(
                      formatPercentage(wallet.totals.daily.spent, wallet.limits.daily.spent)
                    )}`}
                    style={{
                      width: `${formatPercentage(wallet.totals.daily.spent, wallet.limits.daily.spent)}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Limits */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Monthly Limits</h3>
            <div className="space-y-4">
              {/* Deposit Limit */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600">Deposits</span>
                  <span className="text-xs text-gray-900">
                    {formatCurrency(wallet.totals.monthly.deposited)} / {formatCurrency(wallet.limits.monthly.deposit)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getProgressBarColor(
                      formatPercentage(wallet.totals.monthly.deposited, wallet.limits.monthly.deposit)
                    )}`}
                    style={{
                      width: `${formatPercentage(wallet.totals.monthly.deposited, wallet.limits.monthly.deposit)}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Withdrawal Limit */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600">Withdrawals</span>
                  <span className="text-xs text-gray-900">
                    {formatCurrency(wallet.totals.monthly.withdrawn)} / {formatCurrency(wallet.limits.monthly.withdrawal)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getProgressBarColor(
                      formatPercentage(wallet.totals.monthly.withdrawn, wallet.limits.monthly.withdrawal)
                    )}`}
                    style={{
                      width: `${formatPercentage(wallet.totals.monthly.withdrawn, wallet.limits.monthly.withdrawal)}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Spending Limit */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600">Spending</span>
                  <span className="text-xs text-gray-900">
                    {formatCurrency(wallet.totals.monthly.spent)} / {formatCurrency(wallet.limits.monthly.spent)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getProgressBarColor(
                      formatPercentage(wallet.totals.monthly.spent, wallet.limits.monthly.spent)
                    )}`}
                    style={{
                      width: `${formatPercentage(wallet.totals.monthly.spent, wallet.limits.monthly.spent)}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button 
            onClick={onDeposit}
            disabled={wallet.isFrozen}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            💰 Deposit Funds
          </button>
          <button 
            onClick={onWithdraw}
            disabled={wallet.isFrozen || wallet.availableBalance <= 0}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            💸 Withdraw Funds
          </button>
          <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors">
            ⚙️ Manage Limits
          </button>
        </div>
      </div>
    </div>
  )
}