import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number
  height?: string | number
  rounded?: boolean | 'sm' | 'md' | 'lg' | 'full'
  animate?: boolean
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, width, height, rounded = true, animate = true, style, ...props }, ref) => {
    const roundedClasses = {
      true: 'rounded',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      full: 'rounded-full',
      false: ''
    }

    const classes = twMerge(
      clsx(
        'bg-gray-200 dark:bg-gray-700',
        animate && 'animate-pulse',
        rounded && roundedClasses[rounded.toString() as keyof typeof roundedClasses],
        className
      )
    )

    const skeletonStyle = {
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      ...style
    }

    return (
      <div
        ref={ref}
        className={classes}
        style={skeletonStyle}
        {...props}
      />
    )
  }
)

Skeleton.displayName = 'Skeleton'

export default Skeleton