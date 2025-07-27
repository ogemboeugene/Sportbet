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

interface Currency {
  code: string
  name: string
  symbol: string
}

interface DepositFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export const DepositForm: React.FC<DepositFormProps> = ({ onSuccess, onCancel }) => {
  const { wallet, loading } = useSelector((state: RootState) => state.wallet)

  const [formData, setFormData] = useState({
    amount: '',
    currency: 'USD',
    paymentMethod: '',
    gatewayName: '',
  })

  const [availableGateways, setAvailableGateways] = useState<PaymentGateway[]>([])
  const [supportedCurrencies, setSupportedCurrencies] = useState<Currency[]>([])
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
      // Transform the response to match our Currency interface
      const currencies = (response.currencies || []).map((currency: any) => {
        if (typeof currency === 'string') {
          return { code: currency, name: currency, symbol: currency }
        }
        return currency
      })
      setSupportedCurrencies(currencies)
    } catch (error) {
      console.error('Failed to load supported currencies:', error)
      // Set default currencies if API fails
      setSupportedCurrencies([
        { code: 'USD', name: 'US Dollar', symbol: '$' },
        { code: 'EUR', name: 'Euro', symbol: '€' },
        { code: 'GBP', name: 'British Pound', symbol: '£' },
      ])
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

    if (parseFloat(formData.amount) > 100000) {
      newErrors.amount = 'Amount cannot exceed 100,000'
    }

    if (!formData.currency) {
      newErrors.currency = 'Currency is required'
    }

    if (!formData.gatewayName) {
      newErrors.gatewayName = 'Payment gateway is required'
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
      const response = await walletApi.initiateDeposit({
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        paymentMethod: formData.paymentMethod,
        gatewayName: formData.gatewayName,
      })

      if (response.success) {
        toast.success('Deposit initiated successfully!')
        
        // Redirect to payment URL if provided
        if (response.paymentUrl) {
          window.open(response.paymentUrl, '_blank')
        }

        onSuccess?.()
      } else {
        toast.error(response.message || 'Deposit initiation failed')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Deposit initiation failed')
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

  const selectedGateway = availableGateways.find(g => g.name === formData.gatewayName)

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 max-w-full sm:max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Deposit Funds</h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              min="0"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              className={`w-full px-3 py-2 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
            className={`w-full px-3 py-2 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.currency ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            {supportedCurrencies.map(currency => (
              <option key={currency.code} value={currency.code}>
                {currency.name} ({currency.symbol})
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
            className={`w-full px-3 py-2 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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

        {/* Payment Methods */}
        {selectedGateway && selectedGateway.paymentMethods && selectedGateway.paymentMethods.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method (Optional)
            </label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Any available method</option>
              {selectedGateway.paymentMethods.map(method => (
                <option key={method} value={method}>
                  {method.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Current Balance Display */}
        {wallet && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">Current Balance</div>
            <div className="text-base sm:text-lg font-semibold text-gray-900">
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
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm sm:text-base"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : (
            'Deposit Funds'
          )}
        </button>
      </form>

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-blue-700">
            <p className="font-medium">Deposit Information</p>
            <p>• Deposits are usually processed instantly</p>
            <p>• You'll be redirected to complete payment</p>
            <p>• Check your email for confirmation</p>
          </div>
        </div>
      </div>
    </div>
  )
}