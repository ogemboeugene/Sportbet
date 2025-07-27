import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react'
import Button from './Button'

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md' | 'lg'
  title?: string
  description?: string
  icon?: React.ReactNode
  showIcon?: boolean
  dismissible?: boolean
  onDismiss?: () => void
  actions?: Array<{
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary'
  }>
}

const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  size = 'md',
  title,
  description,
  icon,
  showIcon = true,
  dismissible = false,
  onDismiss,
  actions,
  className,
  children,
  ...props
}) => {
  const baseClasses = 'relative rounded-lg border'
  
  const variants = {
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200',
    success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
    error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
  }

  const sizes = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  }

  const getDefaultIcon = () => {
    switch (variant) {
      case 'info':
        return <Info className="h-5 w-5" />
      case 'success':
        return <CheckCircle className="h-5 w-5" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />
      case 'error':
        return <AlertCircle className="h-5 w-5" />
      default:
        return <Info className="h-5 w-5" />
    }
  }

  const displayIcon = icon || (showIcon ? getDefaultIcon() : null)

  const classes = twMerge(
    clsx(
      baseClasses,
      variants[variant],
      sizes[size],
      className
    )
  )

  return (
    <div className={classes} {...props}>
      <div className="flex">
        {displayIcon && (
          <div className="flex-shrink-0">
            {displayIcon}
          </div>
        )}
        
        <div className={clsx('flex-1', displayIcon && 'ml-3')}>
          {title && (
            <h3 className="text-sm font-medium mb-1">
              {title}
            </h3>
          )}
          
          {description && (
            <div className="text-sm opacity-90">
              {description}
            </div>
          )}
          
          {children && (
            <div className={clsx('text-sm', (title || description) && 'mt-2')}>
              {children}
            </div>
          )}
          
          {actions && actions.length > 0 && (
            <div className="flex space-x-2 mt-3">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant={action.variant || 'secondary'}
                  onClick={action.onClick}
                  className="text-xs"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
        
        {dismissible && (
          <div className="flex-shrink-0 ml-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="p-1 hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Alert