import React from 'react'
import { Card, CardHeader, CardContent } from '../ui'

interface BarData {
  label: string
  value: number
  color?: string
}

interface BarChartProps {
  data: BarData[]
  title?: string
  xAxisLabel?: string
  yAxisLabel?: string
  height?: number
  showValues?: boolean
  formatValue?: (value: number) => string
  horizontal?: boolean
}

const BarChart: React.FC<BarChartProps> = ({
  data,
  title,
  xAxisLabel,
  yAxisLabel,
  height = 300,
  showValues = true,
  formatValue = (value) => value.toString(),
  horizontal = false
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

  const maxValue = Math.max(...data.map(d => d.value))
  const padding = 60
  const chartWidth = 600
  const chartHeight = height - padding * 2

  const barWidth = horizontal 
    ? chartHeight / data.length - 10
    : chartWidth / data.length - 10

  const defaultColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6B7280'
  ]

  return (
    <Card>
      {title && (
        <CardHeader>
          <h3 className="text-lg font-semibold">{title}</h3>
        </CardHeader>
      )}
      <CardContent>
        <div className="w-full overflow-x-auto">
          <svg width={chartWidth + padding * 2} height={height} className="w-full">
            {/* Grid lines */}
            {Array.from({ length: 6 }, (_, i) => {
              if (horizontal) {
                const x = (i / 5) * chartWidth + padding
                return (
                  <line
                    key={i}
                    x1={x}
                    y1={padding}
                    x2={x}
                    y2={chartHeight + padding}
                    stroke="#E5E7EB"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                )
              } else {
                const y = (i / 5) * chartHeight + padding
                return (
                  <line
                    key={i}
                    x1={padding}
                    y1={y}
                    x2={chartWidth + padding}
                    y2={y}
                    stroke="#E5E7EB"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                )
              }
            })}
            
            {/* Bars */}
            {data.map((item, index) => {
              const color = item.color || defaultColors[index % defaultColors.length]
              
              if (horizontal) {
                const barLength = (item.value / maxValue) * chartWidth
                const y = (index / data.length) * chartHeight + padding + 5
                
                return (
                  <g key={index}>
                    <rect
                      x={padding}
                      y={y}
                      width={barLength}
                      height={barWidth}
                      fill={color}
                      rx="4"
                      className="transition-all duration-200 hover:opacity-80"
                    />
                    {showValues && (
                      <text
                        x={padding + barLength + 5}
                        y={y + barWidth / 2 + 4}
                        className="text-xs fill-gray-600 dark:fill-gray-400"
                      >
                        {formatValue(item.value)}
                      </text>
                    )}
                  </g>
                )
              } else {
                const barHeight = (item.value / maxValue) * chartHeight
                const x = (index / data.length) * chartWidth + padding + 5
                const y = chartHeight - barHeight + padding
                
                return (
                  <g key={index}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      fill={color}
                      rx="4"
                      className="transition-all duration-200 hover:opacity-80"
                    />
                    {showValues && (
                      <text
                        x={x + barWidth / 2}
                        y={y - 5}
                        textAnchor="middle"
                        className="text-xs fill-gray-600 dark:fill-gray-400"
                      >
                        {formatValue(item.value)}
                      </text>
                    )}
                  </g>
                )
              }
            })}
            
            {/* Axis labels */}
            {data.map((item, index) => {
              if (horizontal) {
                const y = (index / data.length) * chartHeight + padding + barWidth / 2 + 4
                
                return (
                  <text
                    key={index}
                    x={padding - 10}
                    y={y}
                    textAnchor="end"
                    className="text-xs fill-gray-600 dark:fill-gray-400"
                  >
                    {item.label}
                  </text>
                )
              } else {
                const x = (index / data.length) * chartWidth + padding + barWidth / 2 + 5
                
                return (
                  <text
                    key={index}
                    x={x}
                    y={height - 10}
                    textAnchor="middle"
                    className="text-xs fill-gray-600 dark:fill-gray-400"
                    transform={item.label.length > 8 ? `rotate(-45, ${x}, ${height - 10})` : undefined}
                  >
                    {item.label}
                  </text>
                )
              }
            })}
            
            {/* Value axis labels */}
            {Array.from({ length: 6 }, (_, i) => {
              const value = (maxValue * i) / 5
              
              if (horizontal) {
                const x = (i / 5) * chartWidth + padding
                
                return (
                  <text
                    key={i}
                    x={x}
                    y={height - 10}
                    textAnchor="middle"
                    className="text-xs fill-gray-600 dark:fill-gray-400"
                  >
                    {formatValue(value)}
                  </text>
                )
              } else {
                const y = chartHeight - (i / 5) * chartHeight + padding + 4
                
                return (
                  <text
                    key={i}
                    x={padding - 10}
                    y={y}
                    textAnchor="end"
                    className="text-xs fill-gray-600 dark:fill-gray-400"
                  >
                    {formatValue(value)}
                  </text>
                )
              }
            })}
            
            {/* Axis titles */}
            {yAxisLabel && (
              <text
                x={15}
                y={height / 2}
                textAnchor="middle"
                transform={`rotate(-90, 15, ${height / 2})`}
                className="text-sm fill-gray-700 dark:fill-gray-300"
              >
                {horizontal ? xAxisLabel : yAxisLabel}
              </text>
            )}
            
            {xAxisLabel && (
              <text
                x={chartWidth / 2 + padding}
                y={height - 5}
                textAnchor="middle"
                className="text-sm fill-gray-700 dark:fill-gray-300"
              >
                {horizontal ? yAxisLabel : xAxisLabel}
              </text>
            )}
          </svg>
        </div>
      </CardContent>
    </Card>
  )
}

export default BarChart