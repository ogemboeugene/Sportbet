import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  description?: string
  error?: boolean
  helperText?: string
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({
    size = 'md',
    label,
    description,
    error = false,
    helperText,
    className,
    disabled,
    checked,
    id,
    ...props
  }, ref) => {
    const switchId = id || `switch-${Math.random().toString(36).substr(2, 9)}`
    
    const sizes = {
      sm: {
        track: 'w-8 h-4',
        thumb: 'w-3 h-3',
        translate: 'translate-x-4'
      },
      md: {
        track: 'w-11 h-6',
        thumb: 'w-5 h-5',
        translate: 'translate-x-5'
      },
      lg: {
        track: 'w-14 h-7',
        thumb: 'w-6 h-6',
        translate: 'translate-x-7'
      }
    }

    const trackClasses = twMerge(
      clsx(
        'relative inline-flex flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        sizes[size].track,
        checked
          ? error
            ? 'bg-red-600'
            : 'bg-primary-600'
          : 'bg-gray-200 dark:bg-gray-700',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )
    )

    const thumbClasses = clsx(
      'pointer-events-none inline-block rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out',
      sizes[size].thumb,
      checked ? sizes[size].translate : 'translate-x-0'
    )

    return (
      <div className="flex items-start">
        <div className="flex items-center">
          <label htmlFor={switchId} className={trackClasses}>
            <span className="sr-only">{label || 'Toggle'}</span>
            <span className={thumbClasses} />
          </label>
          <input
            ref={ref}
            type="checkbox"
            id={switchId}
            className="sr-only"
            checked={checked}
            disabled={disabled}
            {...props}
          />
        </div>
        
        {(label || description) && (
          <div className="ml-3 flex-1">
            {label && (
              <label
                htmlFor={switchId}
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

Switch.displayName = 'Switch'

export default Switch