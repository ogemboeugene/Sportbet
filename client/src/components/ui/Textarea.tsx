import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'default' | 'filled' | 'outlined'
  inputSize?: 'sm' | 'md' | 'lg'
  error?: boolean
  helperText?: string
  label?: string
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
  autoResize?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    className,
    variant = 'default',
    inputSize = 'md',
    error = false,
    helperText,
    label,
    resize = 'vertical',
    autoResize = false,
    id,
    ...props
  }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)
    
    // Combine refs
    React.useImperativeHandle(ref, () => textareaRef.current!)

    const baseClasses = 'w-full rounded-md border bg-white text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400'
    
    const variants = {
      default: 'border-gray-300 dark:border-gray-600 focus-visible:ring-primary-500',
      filled: 'border-transparent bg-gray-100 dark:bg-gray-700 focus-visible:ring-primary-500',
      outlined: 'border-2 border-gray-300 dark:border-gray-600 focus-visible:ring-primary-500'
    }
    
    const sizes = {
      sm: 'px-3 py-2 text-xs min-h-[80px]',
      md: 'px-3 py-2 text-sm min-h-[100px]',
      lg: 'px-4 py-3 text-base min-h-[120px]'
    }

    const resizeClasses = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize'
    }
    
    const errorClasses = error ? 'border-red-500 focus-visible:ring-red-500' : ''
    
    const textareaClasses = twMerge(
      clsx(
        baseClasses,
        variants[variant],
        sizes[inputSize],
        resizeClasses[resize],
        errorClasses,
        className
      )
    )

    // Auto-resize functionality
    React.useEffect(() => {
      if (autoResize && textareaRef.current) {
        const textarea = textareaRef.current
        
        const adjustHeight = () => {
          textarea.style.height = 'auto'
          textarea.style.height = `${textarea.scrollHeight}px`
        }

        textarea.addEventListener('input', adjustHeight)
        adjustHeight() // Initial adjustment

        return () => {
          textarea.removeEventListener('input', adjustHeight)
        }
      }
    }, [autoResize, props.value])
    
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}
        <textarea
          ref={textareaRef}
          id={textareaId}
          className={textareaClasses}
          {...props}
        />
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

Textarea.displayName = 'Textarea'

export default Textarea