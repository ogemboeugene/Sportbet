import React, { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, TrendingDown, Clock, AlertTriangle } from 'lucide-react'
import { Button, Card, CardHeader, CardContent, Badge, Modal, ModalContent, ModalFooter } from '../ui'
import { Bet } from '../../types'

interface CashOutProps {
  bet: Bet
  onCashOut: (betId: string, amount: number) => Promise<void>
  loading?: boolean
}

interface CashOutOffer {
  amount: number
  percentage: number
  expiresAt: Date
  guaranteed: boolean
}

const CashOut: React.FC<CashOutProps> = ({
  bet,
  onCashOut,
  loading = false
}) => {
  const [cashOutOffer, setCashOutOffer] = useState<CashOutOffer | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [isCalculating, setIsCalculating] = useState(false)

  // Simulate cash out offer calculation
  useEffect(() => {
    if (bet.status !== 'pending') return

    const calculateCashOut = () => {
      setIsCalculating(true)
      
      // Simulate API call delay
      setTimeout(() => {
        const currentValue = bet.stake * 0.7 + Math.random() * (bet.potentialWin - bet.stake) * 0.6
        const percentage = (currentValue / bet.stake) * 100
        
        setCashOutOffer({
          amount: Math.round(currentValue * 100) / 100,
          percentage: Math.round(percentage * 100) / 100,
          expiresAt: new Date(Date.now() + 30000), // 30 seconds
          guaranteed: Math.random() > 0.3
        })
        
        setIsCalculating(false)
      }, 1000)
    }

    calculateCashOut()
    const interval = setInterval(calculateCashOut, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [bet])

  // Countdown timer for offer expiration
  useEffect(() => {
    if (!cashOutOffer) return

    const updateTimer = () => {
      const remaining = Math.max(0, cashOutOffer.expiresAt.getTime() - Date.now())
      setTimeRemaining(remaining)
      
      if (remaining === 0) {
        setCashOutOffer(null)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [cashOutOffer])

  const handleCashOut = async () => {
    if (!cashOutOffer) return
    
    try {
      await onCashOut(bet._id, cashOutOffer.amount)
      setShowConfirmModal(false)
      setCashOutOffer(null)
    } catch (error) {
      console.error('Cash out failed:', error)
    }
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`
  }

  const getProfitLossColor = (percentage: number) => {
    if (percentage > 100) return 'text-green-600'
    if (percentage < 100) return 'text-red-600'
    return 'text-gray-600'
  }

  const getProfitLossIcon = (percentage: number) => {
    if (percentage > 100) return <TrendingUp className="h-4 w-4" />
    if (percentage < 100) return <TrendingDown className="h-4 w-4" />
    return <DollarSign className="h-4 w-4" />
  }

  if (bet.status !== 'pending') {
    return null
  }

  return (
    <>
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader padding="sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-sm">Cash Out Available</span>
            </div>
            {cashOutOffer && (
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>{formatTime(timeRemaining)}</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent padding="sm">
          {isCalculating ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
              <span className="ml-2 text-sm text-gray-600">Calculating offer...</span>
            </div>
          ) : cashOutOffer ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Cash Out Value:</span>
                <div className="flex items-center space-x-2">
                  {getProfitLossIcon(cashOutOffer.percentage)}
                  <span className={`font-bold ${getProfitLossColor(cashOutOffer.percentage)}`}>
                    ${cashOutOffer.amount.toFixed(2)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Return:</span>
                <Badge 
                  variant={cashOutOffer.percentage > 100 ? 'success' : 'warning'}
                  size="sm"
                >
                  {cashOutOffer.percentage > 100 ? '+' : ''}{(cashOutOffer.percentage - 100).toFixed(1)}%
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Original Stake: ${bet.stake.toFixed(2)}</span>
                <span>Potential Win: ${bet.potentialWin.toFixed(2)}</span>
              </div>

              {!cashOutOffer.guaranteed && (
                <div className="flex items-center space-x-1 text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Offer may change based on live odds</span>
                </div>
              )}

              <Button
                onClick={() => setShowConfirmModal(true)}
                disabled={loading || timeRemaining === 0}
                className="w-full"
                variant="primary"
              >
                Cash Out ${cashOutOffer.amount.toFixed(2)}
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">Cash out not available at this time</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Cash Out"
        size="md"
      >
        <ModalContent>
          {cashOutOffer && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Cash Out Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Original Stake:</span>
                    <span>${bet.stake.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cash Out Amount:</span>
                    <span className="font-bold">${cashOutOffer.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Profit/Loss:</span>
                    <span className={getProfitLossColor(cashOutOffer.percentage)}>
                      {cashOutOffer.amount > bet.stake ? '+' : ''}
                      ${(cashOutOffer.amount - bet.stake).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <p>
                  By cashing out, you will receive ${cashOutOffer.amount.toFixed(2)} immediately 
                  and your bet will be settled. This action cannot be undone.
                </p>
              </div>

              {timeRemaining > 0 && (
                <div className="text-xs text-gray-500 text-center">
                  Offer expires in {formatTime(timeRemaining)}
                </div>
              )}
            </div>
          )}
        </ModalContent>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setShowConfirmModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCashOut}
            loading={loading}
            disabled={!cashOutOffer || timeRemaining === 0}
          >
            Confirm Cash Out
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}

export default CashOut