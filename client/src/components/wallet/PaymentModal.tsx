import React from 'react'
import { DepositForm } from './DepositForm'
import { WithdrawalForm } from './WithdrawalForm'

interface PaymentModalProps {
  isOpen: boolean
  type: 'deposit' | 'withdrawal'
  onClose: () => void
  onSuccess?: () => void
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  type,
  onClose,
  onSuccess,
}) => {
  if (!isOpen) return null

  const handleSuccess = () => {
    onSuccess?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal positioning */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        {/* Modal content */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {type === 'deposit' ? (
            <DepositForm onSuccess={handleSuccess} onCancel={onClose} />
          ) : (
            <WithdrawalForm onSuccess={handleSuccess} onCancel={onClose} />
          )}
        </div>
      </div>
    </div>
  )
}