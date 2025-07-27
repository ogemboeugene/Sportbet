import React, { useState } from 'react'
import { walletApi } from '../../services/walletApi'
import toast from 'react-hot-toast'

interface TransactionVerificationProps {
  transactionId: string
  gatewayName: string
  type: 'deposit' | 'withdrawal'
  onVerified?: (result: any) => void
}

export const TransactionVerification: React.FC<TransactionVerificationProps> = ({
  transactionId,
  gatewayName,
  type,
  onVerified,
}) => {
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<any>(null)

  const handleVerify = async () => {
    setIsVerifying(true)

    try {
      const result = await walletApi.verifyTransaction(transactionId, gatewayName, type)
      setVerificationResult(result)
      
      if (result.success) {
        toast.success('Transaction verified successfully!')
      } else {
        toast.error(result.message || 'Transaction verification failed')
      }

      onVerified?.(result)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Verification failed')
    } finally {
      setIsVerifying(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      case 'processing':
        return 'text-blue-600 bg-blue-100'
      case 'failed':
        return 'text-red-600 bg-red-100'
      case 'cancelled':
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Transaction Verification</h3>
        <button
          onClick={handleVerify}
          disabled={isVerifying}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {isVerifying ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Verifying...
            </div>
          ) : (
            'Verify Transaction'
          )}
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Transaction ID:</span>
          <span className="text-sm font-mono text-gray-900">{transactionId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Gateway:</span>
          <span className="text-sm text-gray-900 capitalize">{gatewayName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Type:</span>
          <span className="text-sm text-gray-900 capitalize">{type}</span>
        </div>
      </div>

      {verificationResult && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Verification Result</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              <span className={`text-sm px-2 py-1 rounded-full ${getStatusColor(verificationResult.status)}`}>
                {verificationResult.status}
              </span>
            </div>
            {verificationResult.message && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Message:</span>
                <span className="text-sm text-gray-900">{verificationResult.message}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Success:</span>
              <span className={`text-sm ${verificationResult.success ? 'text-green-600' : 'text-red-600'}`}>
                {verificationResult.success ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}