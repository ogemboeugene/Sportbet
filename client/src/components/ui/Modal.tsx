import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { X } from 'lucide-react'
import Button from './Button'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  showCloseButton?: boolean
  children: React.ReactNode
  className?: string
}

export interface ModalHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
export interface ModalContentProps extends React.HTMLAttributes<HTMLDivElement> {}
export interface ModalFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  children,
  className
}) => {
  useEffect(() => {
    if (!closeOnEscape) return
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, closeOnEscape, onClose])
  
  if (!isOpen) return null
  
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4'
  }
  
  const modalClasses = twMerge(
    clsx(
      'relative w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl',
      sizes[size],
      className
    )
  )
  
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose()
    }
  }
  
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleOverlayClick}
    >
      <div className={modalClasses}>
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-6">
            {title && (
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="ml-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

const ModalHeader: React.FC<ModalHeaderProps> = ({ className, children, ...props }) => {
  const classes = twMerge(
    clsx(
      'border-b border-gray-200 dark:border-gray-700 p-6',
      className
    )
  )
  
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  )
}

const ModalContent: React.FC<ModalContentProps> = ({ className, children, ...props }) => {
  const classes = twMerge(
    clsx(
      'p-6',
      className
    )
  )
  
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  )
}

const ModalFooter: React.FC<ModalFooterProps> = ({ className, children, ...props }) => {
  const classes = twMerge(
    clsx(
      'flex items-center justify-end space-x-2 border-t border-gray-200 dark:border-gray-700 p-6',
      className
    )
  )
  
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  )
}

Modal.displayName = 'Modal'
ModalHeader.displayName = 'ModalHeader'
ModalContent.displayName = 'ModalContent'
ModalFooter.displayName = 'ModalFooter'

export { Modal, ModalHeader, ModalContent, ModalFooter }
export default Modal