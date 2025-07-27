import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'filled' | 'outlined'
  inputSize?: 'sm' | 'md' | 'lg'
  error?: boolean
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  label?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    variant = 'default',
    inputSize = 'md',
    error = false,
    helperText,
    leftIcon,
    rightIcon,
    label,
    id,
    ...props
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
    
    const baseClasses = 'w-full rounded-md border bg-white text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400'
    
    const variants = {
      default: 'border-gray-300 dark:border-gray-600 focus-visible:ring-primary-500',
      filled: 'border-transparent bg-gray-100 dark:bg-gray-700 focus-visible:ring-primary-500',
      outlined: 'border-2 border-gray-300 dark:border-gray-600 focus-visible:ring-primary-500'
    }
    
    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-3 text-sm',
      lg: 'h-12 px-4 text-base'
    }
    
    const errorClasses = error ? 'border-red-500 focus-visible:ring-red-500' : ''
    
    const inputClasses = twMerge(
      clsx(
        baseClasses,
        variants[variant],
        sizes[inputSize],
        leftIcon && 'pl-10',
        rightIcon && 'pr-10',
        errorClasses,
        className
      )
    )
    
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={inputClasses}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
        {helperText && (
          <p className={clsx(
            'mt-1 text-xs',
            error ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
          )}>
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input