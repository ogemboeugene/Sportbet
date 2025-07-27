import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export interface DropdownItemProps {
  value: string
  label: React.ReactNode
  disabled?: boolean
  icon?: React.ReactNode
  onClick?: () => void
}

export interface DropdownProps {
  trigger: React.ReactNode
  items: DropdownItemProps[]
  onSelect?: (value: string) => void
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
  className?: string
  itemClassName?: string
  disabled?: boolean
  closeOnSelect?: boolean
}

const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  onSelect,
  position = 'bottom-left',
  className,
  itemClassName,
  disabled = false,
  closeOnSelect = true
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const updatePosition = () => {
    if (!triggerRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const dropdownRect = dropdownRef.current?.getBoundingClientRect()
    
    let x = 0
    let y = 0

    switch (position) {
      case 'bottom-left':
        x = triggerRect.left
        y = triggerRect.bottom + 4
        break
      case 'bottom-right':
        x = triggerRect.right - (dropdownRect?.width || 0)
        y = triggerRect.bottom + 4
        break
      case 'top-left':
        x = triggerRect.left
        y = triggerRect.top - (dropdownRect?.height || 0) - 4
        break
      case 'top-right':
        x = triggerRect.right - (dropdownRect?.width || 0)
        y = triggerRect.top - (dropdownRect?.height || 0) - 4
        break
    }

    // Ensure dropdown stays within viewport
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    if (x + (dropdownRect?.width || 0) > viewportWidth) {
      x = viewportWidth - (dropdownRect?.width || 0) - 8
    }
    if (x < 8) {
      x = 8
    }
    if (y + (dropdownRect?.height || 0) > viewportHeight) {
      y = triggerRect.top - (dropdownRect?.height || 0) - 4
    }
    if (y < 8) {
      y = triggerRect.bottom + 4
    }

    setDropdownPosition({ x, y })
  }

  useEffect(() => {
    if (isOpen) {
      updatePosition()
      window.addEventListener('scroll', updatePosition)
      window.addEventListener('resize', updatePosition)
    }

    return () => {
      window.removeEventListener('scroll', updatePosition)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleTriggerClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
    }
  }

  const handleItemClick = (item: DropdownItemProps) => {
    if (item.disabled) return

    if (item.onClick) {
      item.onClick()
    }

    if (onSelect) {
      onSelect(item.value)
    }

    if (closeOnSelect) {
      setIsOpen(false)
    }
  }

  const dropdownClasses = twMerge(
    clsx(
      'absolute z-50 min-w-[200px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 transition-all duration-200',
      isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none',
      className
    )
  )

  return (
    <>
      <div
        ref={triggerRef}
        onClick={handleTriggerClick}
        className={clsx(
          'cursor-pointer',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {trigger}
      </div>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className={dropdownClasses}
          style={{
            left: dropdownPosition.x,
            top: dropdownPosition.y,
          }}
        >
          {items.map((item, index) => (
            <div
              key={item.value || index}
              onClick={() => handleItemClick(item)}
              className={twMerge(
                clsx(
                  'flex items-center px-3 py-2 text-sm cursor-pointer transition-colors',
                  item.disabled
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                  itemClassName
                )
              )}
            >
              {item.icon && (
                <span className="mr-2 flex-shrink-0">
                  {item.icon}
                </span>
              )}
              <span className="flex-1">{item.label}</span>
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}

export default Dropdown