import React, { useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { ChevronDown, Check, X } from 'lucide-react'

export interface SelectOptionProps {
  value: string
  label: string
  disabled?: boolean
  icon?: React.ReactNode
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: SelectOptionProps[]
  placeholder?: string
  size?: 'sm' | 'md' | 'lg'
  error?: boolean
  helperText?: string
  label?: string
  clearable?: boolean
  searchable?: boolean
  loading?: boolean
  onClear?: () => void
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({
    options,
    placeholder = 'Select an option...',
    size = 'md',
    error = false,
    helperText,
    label,
    clearable = false,
    searchable = false,
    loading = false,
    onClear,
    value,
    onChange,
    disabled,
    className,
    id,
    ...props
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [highlightedIndex, setHighlightedIndex] = useState(-1)
    
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`
    const containerRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)
    
    const selectedOption = options.find(option => option.value === value)
    
    const filteredOptions = searchable
      ? options.filter(option =>
          option.label.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : options

    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-3 text-sm',
      lg: 'h-12 px-4 text-base'
    }

    const selectClasses = twMerge(
      clsx(
        'w-full rounded-md border bg-white text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-100 cursor-pointer flex items-center justify-between',
        sizes[size],
        error
          ? 'border-red-500 focus-visible:ring-red-500'
          : 'border-gray-300 dark:border-gray-600 focus-visible:ring-primary-500',
        disabled && 'cursor-not-allowed',
        className
      )
    )

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false)
          setSearchTerm('')
          setHighlightedIndex(-1)
        }
      }

      const handleKeyDown = (event: KeyboardEvent) => {
        if (!isOpen) return

        switch (event.key) {
          case 'Escape':
            setIsOpen(false)
            setSearchTerm('')
            setHighlightedIndex(-1)
            break
          case 'ArrowDown':
            event.preventDefault()
            setHighlightedIndex(prev => 
              prev < filteredOptions.length - 1 ? prev + 1 : 0
            )
            break
          case 'ArrowUp':
            event.preventDefault()
            setHighlightedIndex(prev => 
              prev > 0 ? prev - 1 : filteredOptions.length - 1
            )
            break
          case 'Enter':
            event.preventDefault()
            if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
              handleOptionSelect(filteredOptions[highlightedIndex])
            }
            break
        }
      }

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleKeyDown)
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('keydown', handleKeyDown)
      }
    }, [isOpen, filteredOptions, highlightedIndex])

    useEffect(() => {
      if (isOpen && searchable && searchInputRef.current) {
        searchInputRef.current.focus()
      }
    }, [isOpen, searchable])

    const handleToggle = () => {
      if (!disabled) {
        setIsOpen(!isOpen)
        if (!isOpen) {
          setSearchTerm('')
          setHighlightedIndex(-1)
        }
      }
    }

    const handleOptionSelect = (option: SelectOptionProps) => {
      if (option.disabled) return

      const event = {
        target: { value: option.value }
      } as React.ChangeEvent<HTMLSelectElement>

      onChange?.(event)
      setIsOpen(false)
      setSearchTerm('')
      setHighlightedIndex(-1)
    }

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation()
      const event = {
        target: { value: '' }
      } as React.ChangeEvent<HTMLSelectElement>
      
      onChange?.(event)
      onClear?.()
    }

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}
        
        <div ref={containerRef} className="relative">
          {/* Hidden native select for form compatibility */}
          <select
            ref={ref}
            id={selectId}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className="sr-only"
            {...props}
          >
            <option value="">{placeholder}</option>
            {options.map(option => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Custom select trigger */}
          <div onClick={handleToggle} className={selectClasses}>
            <div className="flex items-center flex-1 min-w-0">
              {selectedOption?.icon && (
                <span className="mr-2 flex-shrink-0">
                  {selectedOption.icon}
                </span>
              )}
              <span className={clsx(
                'truncate',
                !selectedOption && 'text-gray-500 dark:text-gray-400'
              )}>
                {selectedOption?.label || placeholder}
              </span>
            </div>
            
            <div className="flex items-center space-x-1">
              {clearable && selectedOption && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <ChevronDown className={clsx(
                'h-4 w-4 transition-transform',
                isOpen && 'rotate-180'
              )} />
            </div>
          </div>

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
              {searchable && (
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search options..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              )}
              
              {loading ? (
                <div className="p-3 text-center text-sm text-gray-500">
                  Loading...
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-sm text-gray-500">
                  No options found
                </div>
              ) : (
                <div className="py-1">
                  {filteredOptions.map((option, index) => (
                    <div
                      key={option.value}
                      onClick={() => handleOptionSelect(option)}
                      className={clsx(
                        'flex items-center px-3 py-2 text-sm cursor-pointer transition-colors',
                        option.disabled
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-700 dark:text-gray-300',
                        index === highlightedIndex && !option.disabled && 'bg-primary-50 dark:bg-primary-900/20',
                        !option.disabled && 'hover:bg-gray-100 dark:hover:bg-gray-700',
                        selectedOption?.value === option.value && 'bg-primary-100 dark:bg-primary-900/30'
                      )}
                    >
                      {option.icon && (
                        <span className="mr-2 flex-shrink-0">
                          {option.icon}
                        </span>
                      )}
                      <span className="flex-1">{option.label}</span>
                      {selectedOption?.value === option.value && (
                        <Check className="h-4 w-4 text-primary-600" />
                      )}
                    </div>
                  ))}
                </div>
              )}
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

Select.displayName = 'Select'

export default Select