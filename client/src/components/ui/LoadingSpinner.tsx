import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'secondary' | 'white' | 'gray'
  text?: string
  overlay?: boolean
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size = 'md', color = 'primary', text, overlay = false, ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12'
    }

    const colorClasses = {
      primary: 'border-primary-600 border-t-transparent',
      secondary: 'border-gray-600 border-t-transparent',
      white: 'border-white border-t-transparent',
      gray: 'border-gray-400 border-t-transparent'
    }

    const textSizeClasses = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
      xl: 'text-lg'
    }

    const spinner = (
      <div
        className={twMerge(
          clsx(
            'animate-spin rounded-full border-2',
            sizeClasses[size],
            colorClasses[color],
            className
          )
        )}
      />
    )

    const content = (
      <div className="flex flex-col items-center space-y-2">
        {spinner}
        {text && (
          <p className={clsx(
            'text-gray-600 dark:text-gray-400',
            textSizeClasses[size]
          )}>
            {text}
          </p>
        )}
      </div>
    )

    if (overlay) {
      return (
        <div
          ref={ref}
          className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-80 dark:bg-gray-900 dark:bg-opacity-80"
          {...props}
        >
          {content}
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={twMerge(clsx('flex items-center justify-center', className))}
        {...props}
      >
        {content}
      </div>
    )
  }
)

LoadingSpinner.displayName = 'LoadingSpinner'

export default LoadingSpinner