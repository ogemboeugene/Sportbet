import React from 'react'
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react'
import { Card, CardContent, Button, Alert } from '../ui'

interface NetworkErrorProps {
  onRetry?: () => void
  isRetrying?: boolean
  retryCount?: number
  maxRetries?: number
  showDetails?: boolean
  error?: Error
}

const NetworkError: React.FC<NetworkErrorProps> = ({
  onRetry,
  isRetrying = false,
  retryCount = 0,
  maxRetries = 3,
  showDetails = false,
  error
}) => {
  const isOnline = navigator.onLine
  const canRetry = retryCount < maxRetries

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            {isOnline ? (
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            ) : (
              <WifiOff className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            )}
            
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {isOnline ? 'Connection Error' : 'No Internet Connection'}
            </h2>
            
            <p className="text-gray-600 dark:text-gray-400">
              {isOnline 
                ? 'Unable to connect to our servers. Please check your connection and try again.'
                : 'Please check your internet connection and try again.'
              }
            </p>
          </div>

          {retryCount > 0 && (
            <Alert
              variant="warning"
              size="sm"
              className="mb-4"
              description={`Failed attempts: ${retryCount}/${maxRetries}`}
            />
          )}

          {showDetails && error && (
            <Alert
              variant="error"
              size="sm"
              className="mb-4 text-left"
              title="Error Details"
              description={error.message}
            />
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            {onRetry && canRetry && (
              <Button
                onClick={onRetry}
                loading={isRetrying}
                leftIcon={<RefreshCw className="h-4 w-4" />}
                className="flex-1"
                disabled={!isOnline}
              >
                {isRetrying ? 'Retrying...' : 'Try Again'}
              </Button>
            )}
            
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
              className="flex-1"
            >
              Reload Page
            </Button>
          </div>

          {!canRetry && (
            <p className="text-sm text-gray-500 mt-4">
              Maximum retry attempts reached. Please refresh the page or contact support.
            </p>
          )}

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              {isOnline ? (
                <>
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span>Connected to Internet</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-500" />
                  <span>No Internet Connection</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default NetworkError