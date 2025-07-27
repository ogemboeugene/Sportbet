import React, { useState } from 'react'
import { TransactionFilters as TransactionFiltersType } from '../../services/walletApi'

interface TransactionFiltersProps {
  filters: TransactionFiltersType
  onFilterChange: (filters: Partial<TransactionFiltersType>) => void
}

export const TransactionFilters: React.FC<TransactionFiltersProps> = ({ filters, onFilterChange }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const transactionTypes = [
    { value: 'deposit', label: 'Deposits' },
    { value: 'withdrawal', label: 'Withdrawals' },
    { value: 'bet', label: 'Bets' },
    { value: 'win', label: 'Wins' },
    { value: 'refund', label: 'Refunds' },
    { value: 'bonus', label: 'Bonuses' },
    { value: 'fee', label: 'Fees' },
    { value: 'adjustment', label: 'Adjustments' },
  ]

  const transactionStatuses = [
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'expired', label: 'Expired' },
  ]

  const sortOptions = [
    { value: 'createdAt', label: 'Date' },
    { value: 'amount', label: 'Amount' },
    { value: 'type', label: 'Type' },
    { value: 'status', label: 'Status' },
  ]

  const handleTypeChange = (type: string, checked: boolean) => {
    const currentTypes = filters.type ? filters.type.split(',') : []
    let newTypes: string[]

    if (checked) {
      newTypes = [...currentTypes, type]
    } else {
      newTypes = currentTypes.filter(t => t !== type)
    }

    onFilterChange({ type: newTypes.length > 0 ? newTypes.join(',') : undefined })
  }

  const handleStatusChange = (status: string, checked: boolean) => {
    const currentStatuses = filters.status ? filters.status.split(',') : []
    let newStatuses: string[]

    if (checked) {
      newStatuses = [...currentStatuses, status]
    } else {
      newStatuses = currentStatuses.filter(s => s !== status)
    }

    onFilterChange({ status: newStatuses.length > 0 ? newStatuses.join(',') : undefined })
  }

  const clearFilters = () => {
    onFilterChange({
      type: undefined,
      status: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      page: 1,
    })
  }

  const hasActiveFilters = filters.type || filters.status || filters.dateFrom || filters.dateTo

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear all
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-500 font-medium"
          >
            {isExpanded ? 'Hide filters' : 'Show filters'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-6">
          {/* Quick Filters Row */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onFilterChange({ type: 'deposit,win,refund,bonus' })}
              className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full hover:bg-green-200 transition-colors"
            >
              💰 Money In
            </button>
            <button
              onClick={() => onFilterChange({ type: 'withdrawal,bet,fee' })}
              className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-full hover:bg-red-200 transition-colors"
            >
              💸 Money Out
            </button>
            <button
              onClick={() => onFilterChange({ type: 'bet,win' })}
              className="px-3 py-1 text-sm bg-purple-100 text-purple-800 rounded-full hover:bg-purple-200 transition-colors"
            >
              🎯 Betting Activity
            </button>
            <button
              onClick={() => onFilterChange({ status: 'pending,processing' })}
              className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200 transition-colors"
            >
              ⏳ Pending
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Transaction Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Types
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {transactionTypes.map((type) => (
                  <label key={type.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.type?.split(',').includes(type.value) || false}
                      onChange={(e) => handleTypeChange(type.value, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Transaction Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {transactionStatuses.map((status) => (
                  <label key={status.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.status?.split(',').includes(status.value) || false}
                      onChange={(e) => handleStatusChange(status.value, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{status.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => onFilterChange({ dateFrom: e.target.value || undefined })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="From date"
                />
                <input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => onFilterChange({ dateTo: e.target.value || undefined })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="To date"
                />
              </div>
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <div className="space-y-2">
                <select
                  value={filters.sortBy || 'createdAt'}
                  onChange={(e) => onFilterChange({ sortBy: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.sortOrder || 'desc'}
                  onChange={(e) => onFilterChange({ sortOrder: e.target.value as 'asc' | 'desc' })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results per page */}
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">
              Results per page:
            </label>
            <select
              value={filters.limit || 20}
              onChange={(e) => onFilterChange({ limit: parseInt(e.target.value), page: 1 })}
              className="px-3 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap gap-2">
          {filters.type && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Types: {filters.type.split(',').length}
              <button
                onClick={() => onFilterChange({ type: undefined })}
                className="ml-1 text-blue-600 hover:text-blue-500"
              >
                ×
              </button>
            </span>
          )}
          {filters.status && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Status: {filters.status.split(',').length}
              <button
                onClick={() => onFilterChange({ status: undefined })}
                className="ml-1 text-green-600 hover:text-green-500"
              >
                ×
              </button>
            </span>
          )}
          {filters.dateFrom && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              From: {filters.dateFrom}
              <button
                onClick={() => onFilterChange({ dateFrom: undefined })}
                className="ml-1 text-purple-600 hover:text-purple-500"
              >
                ×
              </button>
            </span>
          )}
          {filters.dateTo && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              To: {filters.dateTo}
              <button
                onClick={() => onFilterChange({ dateTo: undefined })}
                className="ml-1 text-purple-600 hover:text-purple-500"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}