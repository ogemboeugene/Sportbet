import React from 'react'
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react'
import { Button, Card, CardContent } from '../ui'

interface ErrorFallbackProps {
  error?: Error
  resetError?: () => void
  title?: string
  message?: string
  showDetails?: boolean
  actions?: Array<{
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary' | 'danger'
    icon?: React.ReactNode
  }>
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  showDetails = false,
  actions
}) => {
  const defaultActions = [
    {
      label: 'Try Again',
      onClick: resetError || (() => window.location.reload()),
      variant: 'primary' as const,
      icon: <RefreshCw className="h-4 w-4" />
    },
    {
      label: 'Go Back',
      onClick: () => window.history.back(),
      variant: 'secondary' as const,
      icon: <ArrowLeft className="h-4 w-4" />
    }
  ]

  const finalActions = actions || defaultActions

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-lg w-full">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {message}
            </p>
          </div>

          {showDetails && error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-left">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                Error Details:
              </h3>
              <pre className="text-xs text-red-700 dark:text-red-300 overflow-auto whitespace-pre-wrap">
                {error.message}
              </pre>
              {process.env.NODE_ENV === 'development' && error.stack && (
                <details className="mt-2">
                  <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer">
                    Stack Trace
                  </summary>
                  <pre className="text-xs text-red-700 dark:text-red-300 overflow-auto whitespace-pre-wrap mt-1">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            {finalActions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant}
                onClick={action.onClick}
                leftIcon={action.icon}
                className="flex-1"
              >
                {action.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ErrorFallback