import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../store'
import { walletApi } from '../../services/walletApi'
import toast from 'react-hot-toast'

interface PaymentGateway {
  name: string
  supportedCurrencies: string[]
  supportedCountries: string[]
  paymentMethods: string[]
}

interface WithdrawalFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export const WithdrawalForm: React.FC<WithdrawalFormProps> = ({ onSuccess, onCancel }) => {
  const { wallet, loading } = useSelector((state: RootState) => state.wallet)

  const [formData, setFormData] = useState({
    amount: '',
    currency: 'USD',
    gatewayName: '',
    withdrawalType: 'bank', // 'bank' or 'mobile'
    // Bank details
    accountNumber: '',
    bankCode: '',
    accountName: '',
    // Mobile wallet details
    phoneNumber: '',
    provider: '',
  })

  const [availableGateways, setAvailableGateways] = useState<PaymentGateway[]>([])
  const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadSupportedCurrencies()
  }, [])

  useEffect(() => {
    if (formData.currency) {
      loadAvailableGateways()
    }
  }, [formData.currency])

  const loadSupportedCurrencies = async () => {
    try {
      const response = await walletApi.getSupportedCurrencies()
      setSupportedCurrencies(response.currencies)
    } catch (error) {
      console.error('Failed to load supported currencies:', error)
    }
  }

  const loadAvailableGateways = async () => {
    try {
      const gateways = await walletApi.getAvailableGateways(formData.currency)
      setAvailableGateways(gateways)
      
      // Auto-select first gateway if none selected
      if (gateways.length > 0 && !formData.gatewayName) {
        setFormData(prev => ({ ...prev, gatewayName: gateways[0].name }))
      }
    } catch (error) {
      console.error('Failed to load available gateways:', error)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0'
    }

    if (wallet && parseFloat(formData.amount) > wallet.availableBalance) {
      newErrors.amount = 'Amount exceeds available balance'
    }

    if (parseFloat(formData.amount) < 10) {
      newErrors.amount = 'Minimum withdrawal amount is 10'
    }

    if (!formData.currency) {
      newErrors.currency = 'Currency is required'
    }

    if (!formData.gatewayName) {
      newErrors.gatewayName = 'Payment gateway is required'
    }

    if (formData.withdrawalType === 'bank') {
      if (!formData.accountNumber) {
        newErrors.accountNumber = 'Account number is required'
      }
      if (!formData.bankCode) {
        newErrors.bankCode = 'Bank code is required'
      }
      if (!formData.accountName) {
        newErrors.accountName = 'Account name is required'
      }
    } else if (formData.withdrawalType === 'mobile') {
      if (!formData.phoneNumber) {
        newErrors.phoneNumber = 'Phone number is required'
      }
      if (!formData.provider) {
        newErrors.provider = 'Mobile wallet provider is required'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const withdrawalDetails: any = {}

      if (formData.withdrawalType === 'bank') {
        withdrawalDetails.bankAccount = {
          accountNumber: formData.accountNumber,
          bankCode: formData.bankCode,
          accountName: formData.accountName,
        }
      } else {
        withdrawalDetails.mobileWallet = {
          phoneNumber: formData.phoneNumber,
          provider: formData.provider,
        }
      }

      const response = await walletApi.initiateWithdrawal({
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        withdrawalDetails,
        gatewayName: formData.gatewayName,
      })

      if (response.success) {
        toast.success('Withdrawal request submitted successfully!')
        onSuccess?.()
      } else {
        toast.error(response.message || 'Withdrawal request failed')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Withdrawal request failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const mobileWalletProviders = [
    { value: 'mpesa', label: 'M-Pesa' },
    { value: 'airtel', label: 'Airtel Money' },
    { value: 'mtn', label: 'MTN Mobile Money' },
    { value: 'vodafone', label: 'Vodafone Cash' },
    { value: 'tigo', label: 'Tigo Pesa' },
  ]

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Withdraw Funds</h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="10"
              max={wallet?.availableBalance || 0}
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.amount ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter amount"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-gray-500 text-sm">{formData.currency}</span>
            </div>
          </div>
          {errors.amount && (
            <p className="text-red-500 text-xs mt-1">{errors.amount}</p>
          )}
        </div>

        {/* Currency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Currency
          </label>
          <select
            value={formData.currency}
            onChange={(e) => handleInputChange('currency', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.currency ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            {supportedCurrencies.map(currency => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
          {errors.currency && (
            <p className="text-red-500 text-xs mt-1">{errors.currency}</p>
          )}
        </div>

        {/* Payment Gateway */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Gateway
          </label>
          <select
            value={formData.gatewayName}
            onChange={(e) => handleInputChange('gatewayName', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.gatewayName ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select payment gateway</option>
            {availableGateways.map(gateway => (
              <option key={gateway.name} value={gateway.name}>
                {gateway.name.charAt(0).toUpperCase() + gateway.name.slice(1)}
              </option>
            ))}
          </select>
          {errors.gatewayName && (
            <p className="text-red-500 text-xs mt-1">{errors.gatewayName}</p>
          )}
        </div>

        {/* Withdrawal Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Withdrawal Method
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="bank"
                checked={formData.withdrawalType === 'bank'}
                onChange={(e) => handleInputChange('withdrawalType', e.target.value)}
                className="mr-2"
              />
              Bank Account
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="mobile"
                checked={formData.withdrawalType === 'mobile'}
                onChange={(e) => handleInputChange('withdrawalType', e.target.value)}
                className="mr-2"
              />
              Mobile Wallet
            </label>
          </div>
        </div>

        {/* Bank Account Details */}
        {formData.withdrawalType === 'bank' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Number
              </label>
              <input
                type="text"
                value={formData.accountNumber}
                onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.accountNumber ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter account number"
              />
              {errors.accountNumber && (
                <p className="text-red-500 text-xs mt-1">{errors.accountNumber}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Code
              </label>
              <input
                type="text"
                value={formData.bankCode}
                onChange={(e) => handleInputChange('bankCode', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.bankCode ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter bank code"
              />
              {errors.bankCode && (
                <p className="text-red-500 text-xs mt-1">{errors.bankCode}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Name
              </label>
              <input
                type="text"
                value={formData.accountName}
                onChange={(e) => handleInputChange('accountName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.accountName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter account name"
              />
              {errors.accountName && (
                <p className="text-red-500 text-xs mt-1">{errors.accountName}</p>
              )}
            </div>
          </>
        )}

        {/* Mobile Wallet Details */}
        {formData.withdrawalType === 'mobile' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter phone number"
              />
              {errors.phoneNumber && (
                <p className="text-red-500 text-xs mt-1">{errors.phoneNumber}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobile Wallet Provider
              </label>
              <select
                value={formData.provider}
                onChange={(e) => handleInputChange('provider', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.provider ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select provider</option>
                {mobileWalletProviders.map(provider => (
                  <option key={provider.value} value={provider.value}>
                    {provider.label}
                  </option>
                ))}
              </select>
              {errors.provider && (
                <p className="text-red-500 text-xs mt-1">{errors.provider}</p>
              )}
            </div>
          </>
        )}

        {/* Current Balance Display */}
        {wallet && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">Available Balance</div>
            <div className="text-lg font-semibold text-gray-900">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: wallet.currency,
              }).format(wallet.availableBalance)}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : (
            'Request Withdrawal'
          )}
        </button>
      </form>

      {/* Info */}
      <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
        <div className="flex">
          <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-yellow-700">
            <p className="font-medium">Withdrawal Information</p>
            <p>• Withdrawals may take 1-3 business days</p>
            <p>• Minimum withdrawal amount is $10</p>
            <p>• KYC verification may be required</p>
            <p>• Processing fees may apply</p>
          </div>
        </div>
      </div>
    </div>
  )
}