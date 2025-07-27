import React, { useState, createContext, useContext } from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface TabsContextType {
  activeTab: string
  setActiveTab: (tab: string) => void
  variant: 'default' | 'pills' | 'underline'
  size: 'sm' | 'md' | 'lg'
}

const TabsContext = createContext<TabsContextType | undefined>(undefined)

export interface TabsProps {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  variant?: 'default' | 'pills' | 'underline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  children: React.ReactNode
}

export interface TabProps {
  value: string
  disabled?: boolean
  className?: string
  children: React.ReactNode
}

export interface TabsListProps {
  className?: string
  children: React.ReactNode
}

export interface TabsContentProps {
  value: string
  className?: string
  children: React.ReactNode
}

const Tabs: React.FC<TabsProps> = ({
  defaultValue,
  value,
  onValueChange,
  variant = 'default',
  size = 'md',
  className,
  children
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue || '')
  
  const activeTab = value !== undefined ? value : internalValue
  
  const setActiveTab = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
  }

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, variant, size }}>
      <div className={twMerge(clsx('w-full', className))}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

const TabsList: React.FC<TabsListProps> = ({ className, children }) => {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabsList must be used within Tabs')
  
  const { variant } = context

  const baseClasses = 'flex'
  const variantClasses = {
    default: 'border-b border-gray-200 dark:border-gray-700',
    pills: 'bg-gray-100 dark:bg-gray-800 p-1 rounded-lg',
    underline: 'space-x-8'
  }

  return (
    <div className={twMerge(clsx(baseClasses, variantClasses[variant], className))}>
      {children}
    </div>
  )
}

const Tab: React.FC<TabProps> = ({ value, disabled = false, className, children }) => {
  const context = useContext(TabsContext)
  if (!context) throw new Error('Tab must be used within Tabs')
  
  const { activeTab, setActiveTab, variant, size } = context
  const isActive = activeTab === value

  const handleClick = () => {
    if (!disabled) {
      setActiveTab(value)
    }
  }

  const baseClasses = 'cursor-pointer transition-all duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  const variantClasses = {
    default: clsx(
      'border-b-2 -mb-px',
      isActive
        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
    ),
    pills: clsx(
      'rounded-md',
      isActive
        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
    ),
    underline: clsx(
      'relative',
      isActive
        ? 'text-primary-600 dark:text-primary-400'
        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
      isActive && 'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary-500'
    )
  }

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : ''

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={twMerge(
        clsx(
          baseClasses,
          sizeClasses[size],
          variantClasses[variant],
          disabledClasses,
          className
        )
      )}
    >
      {children}
    </button>
  )
}

const TabsContent: React.FC<TabsContentProps> = ({ value, className, children }) => {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabsContent must be used within Tabs')
  
  const { activeTab } = context

  if (activeTab !== value) return null

  return (
    <div className={twMerge(clsx('mt-4', className))}>
      {children}
    </div>
  )
}

Tabs.displayName = 'Tabs'
TabsList.displayName = 'TabsList'
Tab.displayName = 'Tab'
TabsContent.displayName = 'TabsContent'

export { Tabs, TabsList, Tab, TabsContent }
export default Tabs