import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'danger'
  showLabel?: boolean
  label?: string
  animated?: boolean
  striped?: boolean
}

const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  label,
  animated = false,
  striped = false,
  className,
  ...props
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  
  const baseClasses = 'w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'
  
  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-4'
  }

  const variants = {
    default: 'bg-primary-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    danger: 'bg-red-600'
  }

  const containerClasses = twMerge(
    clsx(
      baseClasses,
      sizes[size],
      className
    )
  )

  const barClasses = clsx(
    'h-full transition-all duration-300 ease-in-out',
    variants[variant],
    striped && 'bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:1rem_1rem]',
    animated && striped && 'animate-pulse'
  )

  return (
    <div {...props}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label || 'Progress'}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {percentage.toFixed(0)}%
          </span>
        </div>
      )}
      
      <div className={containerClasses}>
        <div
          className={barClasses}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  )
}

export default Progress