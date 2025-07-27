import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md' | 'lg'
  rounded?: boolean
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', rounded = false, children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center font-medium'
    
    const variants = {
      default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      primary: 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200',
      secondary: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
      success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    }
    
    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
      lg: 'px-3 py-1.5 text-base'
    }
    
    const classes = twMerge(
      clsx(
        baseClasses,
        variants[variant],
        sizes[size],
        rounded ? 'rounded-full' : 'rounded-md',
        className
      )
    )
    
    return (
      <span ref={ref} className={classes} {...props}>
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export default Badge