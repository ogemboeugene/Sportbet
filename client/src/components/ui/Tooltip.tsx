import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  trigger?: 'hover' | 'click' | 'focus'
  delay?: number
  className?: string
  disabled?: boolean
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  trigger = 'hover',
  delay = 200,
  className,
  disabled = false
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const showTooltip = () => {
    if (disabled) return
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
      updatePosition()
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  const updatePosition = () => {
    if (!triggerRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current?.getBoundingClientRect()
    
    let x = 0
    let y = 0

    switch (position) {
      case 'top':
        x = triggerRect.left + triggerRect.width / 2
        y = triggerRect.top - (tooltipRect?.height || 0) - 8
        break
      case 'bottom':
        x = triggerRect.left + triggerRect.width / 2
        y = triggerRect.bottom + 8
        break
      case 'left':
        x = triggerRect.left - (tooltipRect?.width || 0) - 8
        y = triggerRect.top + triggerRect.height / 2
        break
      case 'right':
        x = triggerRect.right + 8
        y = triggerRect.top + triggerRect.height / 2
        break
    }

    setTooltipPosition({ x, y })
  }

  useEffect(() => {
    if (isVisible) {
      updatePosition()
      window.addEventListener('scroll', updatePosition)
      window.addEventListener('resize', updatePosition)
    }

    return () => {
      window.removeEventListener('scroll', updatePosition)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isVisible])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleTriggerEvents = () => {
    const events: Record<string, () => void> = {}

    if (trigger === 'hover') {
      events.onMouseEnter = showTooltip
      events.onMouseLeave = hideTooltip
    } else if (trigger === 'click') {
      events.onClick = () => isVisible ? hideTooltip() : showTooltip()
    } else if (trigger === 'focus') {
      events.onFocus = showTooltip
      events.onBlur = hideTooltip
    }

    return events
  }

  const getArrowClasses = () => {
    const base = 'absolute w-2 h-2 bg-gray-900 dark:bg-gray-100 transform rotate-45'
    
    switch (position) {
      case 'top':
        return `${base} -bottom-1 left-1/2 -translate-x-1/2`
      case 'bottom':
        return `${base} -top-1 left-1/2 -translate-x-1/2`
      case 'left':
        return `${base} -right-1 top-1/2 -translate-y-1/2`
      case 'right':
        return `${base} -left-1 top-1/2 -translate-y-1/2`
      default:
        return base
    }
  }

  const getTransformOrigin = () => {
    switch (position) {
      case 'top':
        return 'origin-bottom'
      case 'bottom':
        return 'origin-top'
      case 'left':
        return 'origin-right'
      case 'right':
        return 'origin-left'
      default:
        return 'origin-bottom'
    }
  }

  const tooltipClasses = twMerge(
    clsx(
      'absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded shadow-lg transition-all duration-200',
      getTransformOrigin(),
      isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none',
      position === 'left' || position === 'right' ? '-translate-y-1/2' : '',
      position === 'top' || position === 'bottom' ? '-translate-x-1/2' : '',
      className
    )
  )

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-block"
        {...handleTriggerEvents()}
      >
        {children}
      </div>
      
      {isVisible && createPortal(
        <div
          ref={tooltipRef}
          className={tooltipClasses}
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
          }}
        >
          {content}
          <div className={getArrowClasses()} />
        </div>,
        document.body
      )}
    </>
  )
}

export default Tooltip