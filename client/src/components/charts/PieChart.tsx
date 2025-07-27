import React from 'react'
import { Card, CardHeader, CardContent } from '../ui'

interface PieData {
  label: string
  value: number
  color?: string
}

interface PieChartProps {
  data: PieData[]
  title?: string
  size?: number
  showLegend?: boolean
  showPercentages?: boolean
  formatValue?: (value: number) => string
}

const PieChart: React.FC<PieChartProps> = ({
  data,
  title,
  size = 300,
  showLegend = true,
  showPercentages = true,
  formatValue = (value) => value.toString()
}) => {
  if (!data || data.length === 0) {
    return (
      <Card>
        {title && (
          <CardHeader>
            <h3 className="text-lg font-semibold">{title}</h3>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const total = data.reduce((sum, item) => sum + item.value, 0)
  const radius = size / 2 - 20
  const centerX = size / 2
  const centerY = size / 2

  const defaultColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6B7280'
  ]

  // Calculate angles for each slice
  let currentAngle = -90 // Start from top
  const slices = data.map((item, index) => {
    const percentage = (item.value / total) * 100
    const angle = (item.value / total) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    
    currentAngle += angle
    
    const startAngleRad = (startAngle * Math.PI) / 180
    const endAngleRad = (endAngle * Math.PI) / 180
    
    const x1 = centerX + radius * Math.cos(startAngleRad)
    const y1 = centerY + radius * Math.sin(startAngleRad)
    const x2 = centerX + radius * Math.cos(endAngleRad)
    const y2 = centerY + radius * Math.sin(endAngleRad)
    
    const largeArcFlag = angle > 180 ? 1 : 0
    
    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ')
    
    // Calculate label position
    const labelAngle = (startAngle + endAngle) / 2
    const labelAngleRad = (labelAngle * Math.PI) / 180
    const labelRadius = radius * 0.7
    const labelX = centerX + labelRadius * Math.cos(labelAngleRad)
    const labelY = centerY + labelRadius * Math.sin(labelAngleRad)
    
    return {
      ...item,
      pathData,
      percentage,
      color: item.color || defaultColors[index % defaultColors.length],
      labelX,
      labelY,
      angle
    }
  })

  return (
    <Card>
      {title && (
        <CardHeader>
          <h3 className="text-lg font-semibold">{title}</h3>
        </CardHeader>
      )}
      <CardContent>
        <div className={`flex ${showLegend ? 'flex-col lg:flex-row' : 'justify-center'} items-center gap-6`}>
          {/* Pie Chart */}
          <div className="flex-shrink-0">
            <svg width={size} height={size} className="drop-shadow-sm">
              {slices.map((slice, index) => (
                <g key={index}>
                  <path
                    d={slice.pathData}
                    fill={slice.color}
                    stroke="white"
                    strokeWidth="2"
                    className="transition-all duration-200 hover:opacity-80 cursor-pointer"
                  >
                    <title>{`${slice.label}: ${formatValue(slice.value)} (${slice.percentage.toFixed(1)}%)`}</title>
                  </path>
                  
                  {/* Percentage labels on slices */}
                  {showPercentages && slice.percentage > 5 && (
                    <text
                      x={slice.labelX}
                      y={slice.labelY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-xs font-medium fill-white"
                      style={{ textShadow: '1px 1px 1px rgba(0,0,0,0.5)' }}
                    >
                      {slice.percentage.toFixed(0)}%
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>
          
          {/* Legend */}
          {showLegend && (
            <div className="flex-1 min-w-0">
              <div className="space-y-2">
                {slices.map((slice, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                        {slice.label}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="font-medium">
                        {formatValue(slice.value)}
                      </span>
                      <span className="text-gray-500">
                        ({slice.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Total */}
              <div className="mt-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between font-medium">
                  <span>Total</span>
                  <span>{formatValue(total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default PieChart