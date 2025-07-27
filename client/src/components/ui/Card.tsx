import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'filled'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
    const baseClasses = 'rounded-lg bg-white dark:bg-gray-800'
    
    const variants = {
      default: 'border border-gray-200 dark:border-gray-700',
      elevated: 'shadow-lg border border-gray-200 dark:border-gray-700',
      outlined: 'border-2 border-gray-300 dark:border-gray-600',
      filled: 'bg-gray-50 dark:bg-gray-900'
    }
    
    const paddings = {
      none: '',
      sm: 'p-3',
      md: 'p-6',
      lg: 'p-8'
    }
    
    const classes = twMerge(
      clsx(
        baseClasses,
        variants[variant],
        paddings[padding],
        className
      )
    )
    
    return (
      <div ref={ref} className={classes} {...props}>
        {children}
      </div>
    )
  }
)

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, padding = 'md', children, ...props }, ref) => {
    const paddings = {
      none: '',
      sm: 'p-3 pb-1',
      md: 'p-6 pb-3',
      lg: 'p-8 pb-4'
    }
    
    const classes = twMerge(
      clsx(
        'flex flex-col space-y-1.5',
        paddings[padding],
        className
      )
    )
    
    return (
      <div ref={ref} className={classes} {...props}>
        {children}
      </div>
    )
  }
)

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, padding = 'md', children, ...props }, ref) => {
    const paddings = {
      none: '',
      sm: 'p-3 pt-0',
      md: 'p-6 pt-0',
      lg: 'p-8 pt-0'
    }
    
    const classes = twMerge(
      clsx(
        paddings[padding],
        className
      )
    )
    
    return (
      <div ref={ref} className={classes} {...props}>
        {children}
      </div>
    )
  }
)

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, padding = 'md', children, ...props }, ref) => {
    const paddings = {
      none: '',
      sm: 'p-3 pt-1',
      md: 'p-6 pt-3',
      lg: 'p-8 pt-4'
    }
    
    const classes = twMerge(
      clsx(
        'flex items-center',
        paddings[padding],
        className
      )
    )
    
    return (
      <div ref={ref} className={classes} {...props}>
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'
CardHeader.displayName = 'CardHeader'
CardContent.displayName = 'CardContent'
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardContent, CardFooter }