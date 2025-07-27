import React, { createContext, useContext } from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface RadioGroupContextType {
  name: string
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
  error?: boolean
}

const RadioGroupContext = createContext<RadioGroupContextType | undefined>(undefined)

export interface RadioGroupProps {
  name: string
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  disabled?: boolean
  error?: boolean
  label?: string
  description?: string
  helperText?: string
  className?: string
  children: React.ReactNode
}

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  value: string
  size?: 'sm' | 'md' | 'lg'
  label?: string
  description?: string
}

const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  value,
  defaultValue,
  onChange,
  disabled = false,
  error = false,
  label,
  description,
  helperText,
  className,
  children
}) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || '')
  
  const currentValue = value !== undefined ? value : internalValue
  
  const handleChange = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue)
    }
    onChange?.(newValue)
  }

  return (
    <RadioGroupContext.Provider value={{ name, value: currentValue, onChange: handleChange, disabled, error }}>
      <div className={twMerge(clsx('space-y-2', className))}>
        {label && (
          <div>
            <label className={clsx(
              'block text-sm font-medium',
              error ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300',
              disabled && 'opacity-50'
            )}>
              {label}
            </label>
            {description && (
              <p className={clsx(
                'text-xs mt-1',
                error ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400',
                disabled && 'opacity-50'
              )}>
                {description}
              </p>
            )}
          </div>
        )}
        
        <div className="space-y-2">
          {children}
        </div>
        
        {helperText && (
          <p className={clsx(
            'text-xs',
            error ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
          )}>
            {helperText}
          </p>
        )}
      </div>
    </RadioGroupContext.Provider>
  )
}

const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({
    value,
    size = 'md',
    label,
    description,
    className,
    disabled: propDisabled,
    id,
    ...props
  }, ref) => {
    const context = useContext(RadioGroupContext)
    if (!context) throw new Error('Radio must be used within RadioGroup')
    
    const { name, value: groupValue, onChange, disabled: groupDisabled, error } = context
    const disabled = propDisabled || groupDisabled
    const checked = groupValue === value
    
    const radioId = id || `radio-${name}-${value}`
    
    const sizes = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6'
    }

    const handleChange = () => {
      if (!disabled && onChange) {
        onChange(value)
      }
    }

    const radioClasses = twMerge(
      clsx(
        'rounded-full border-2 transition-all duration-200 focus:ring-2 focus:ring-offset-2 cursor-pointer relative',
        sizes[size],
        checked
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
              type="radio"
              id={radioId}
              name={name}
              value={value}
              checked={checked}
              onChange={handleChange}
              disabled={disabled}
              className="sr-only"
              {...props}
            />
            <label htmlFor={radioId} className={radioClasses}>
              {checked && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={clsx(
                    'rounded-full bg-white',
                    size === 'sm' ? 'w-1.5 h-1.5' : size === 'md' ? 'w-2 h-2' : 'w-2.5 h-2.5'
                  )} />
                </div>
              )}
            </label>
          </div>
        </div>
        
        {(label || description) && (
          <div className="ml-3 flex-1">
            {label && (
              <label
                htmlFor={radioId}
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
      </div>
    )
  }
)

RadioGroup.displayName = 'RadioGroup'
Radio.displayName = 'Radio'

export { RadioGroup, Radio }
export default Radio