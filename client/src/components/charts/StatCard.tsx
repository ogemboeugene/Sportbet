import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent, Badge } from '../ui'

interface StatCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease' | 'neutral'
    period?: string
  }
  icon?: React.ReactNode
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray'
  size?: 'sm' | 'md' | 'lg'
  formatValue?: (value: string | number) => string
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon,
  color = 'blue',
  size = 'md',
  formatValue = (val) => val.toString()
}) => {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      icon: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800'
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      icon: 'text-green-600 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800'
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      icon: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800'
    },
    yellow: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      icon: 'text-yellow-600 dark:text-yellow-400',
      border: 'border-yellow-200 dark:border-yellow-800'
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      icon: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-800'
    },
    gray: {
      bg: 'bg-gray-50 dark:bg-gray-800',
      icon: 'text-gray-600 dark:text-gray-400',
      border: 'border-gray-200 dark:border-gray-700'
    }
  }

  const sizeClasses = {
    sm: {
      padding: 'p-4',
      title: 'text-xs',
      value: 'text-lg',
      icon: 'h-4 w-4'
    },
    md: {
      padding: 'p-6',
      title: 'text-sm',
      value: 'text-2xl',
      icon: 'h-5 w-5'
    },
    lg: {
      padding: 'p-8',
      title: 'text-base',
      value: 'text-3xl',
      icon: 'h-6 w-6'
    }
  }

  const getChangeIcon = () => {
    switch (change?.type) {
      case 'increase':
        return <TrendingUp className="h-3 w-3" />
      case 'decrease':
        return <TrendingDown className="h-3 w-3" />
      default:
        return <Minus className="h-3 w-3" />
    }
  }

  const getChangeColor = () => {
    switch (change?.type) {
      case 'increase':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400'
      case 'decrease':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400'
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  return (
    <Card className={`${colorClasses[color].border} transition-all duration-200 hover:shadow-md`}>
      <CardContent className={sizeClasses[size].padding}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className={`${sizeClasses[size].title} font-medium text-gray-600 dark:text-gray-400 mb-1`}>
              {title}
            </p>
            <p className={`${sizeClasses[size].value} font-bold text-gray-900 dark:text-gray-100`}>
              {formatValue(value)}
            </p>
            
            {change && (
              <div className="mt-2">
                <Badge
                  variant="secondary"
                  className={`${getChangeColor()} text-xs px-2 py-1`}
                >
                  <span className="flex items-center space-x-1">
                    {getChangeIcon()}
                    <span>
                      {change.value > 0 && change.type !== 'decrease' ? '+' : ''}
                      {change.value}%
                    </span>
                    {change.period && (
                      <span className="text-gray-500">
                        {change.period}
                      </span>
                    )}
                  </span>
                </Badge>
              </div>
            )}
          </div>
          
          {icon && (
            <div className={`${colorClasses[color].bg} ${colorClasses[color].icon} p-3 rounded-lg`}>
              <div className={sizeClasses[size].icon}>
                {icon}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default StatCard