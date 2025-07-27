import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Check, Minus } from 'lucide-react'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  description?: string
  error?: boolean
  helperText?: string
  indeterminate?: boolean
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({
    size = 'md',
    label,
    description,
    error = false,
    helperText,
    indeterminate = false,
    className,
    disabled,
    checked,
    id,
    ...props
  }, ref) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`
    
    const sizes = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6'
    }

    const iconSizes = {
      sm: 'w-3 h-3',
      md: 'w-4 h-4',
      lg: 'w-5 h-5'
    }

    const checkboxClasses = twMerge(
      clsx(
        'rounded border-2 transition-all duration-200 focus:ring-2 focus:ring-offset-2 cursor-pointer',
        sizes[size],
        checked || indeterminate
          ? error
            ? 'bg-red-600 border-red-600 focus:ring-red-500'
            : 'bg-primary-600 border-primary-600 focus:ring-primary-500'
          : error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )
    )

    return (
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <div className="relative">
            <input
              ref={ref}
              type="checkbox"
              id={checkboxId}
              className="sr-only"
              checked={checked}
              disabled={disabled}
              {...props}
            />
            <label htmlFor={checkboxId} className={checkboxClasses}>
              {(checked || indeterminate) && (
                <div className="flex items-center justify-center w-full h-full text-white">
                  {indeterminate ? (
                    <Minus className={iconSizes[size]} />
                  ) : (
                    <Check className={iconSizes[size]} />
                  )}
                </div>
              )}
            </label>
          </div>
        </div>
        
        {(label || description) && (
          <div className="ml-3 flex-1">
            {label && (
              <label
                htmlFor={checkboxId}
                className={clsx(
                  'block text-sm font-medium cursor-pointer',
                  error ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p className={clsx(
                'text-xs',
                error ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400',
                disabled && 'opacity-50'
              )}>
                {description}
              </p>
            )}
          </div>
        )}
        
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

Checkbox.displayName = 'Checkbox'

export default Checkbox