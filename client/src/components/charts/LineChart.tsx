import React from 'react'
import { Card, CardHeader, CardContent } from '../ui'

interface DataPoint {
  x: string | number
  y: number
  label?: string
}

interface LineChartProps {
  data: DataPoint[]
  title?: string
  xAxisLabel?: string
  yAxisLabel?: string
  color?: string
  height?: number
  showGrid?: boolean
  showPoints?: boolean
  formatValue?: (value: number) => string
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  title,
  xAxisLabel,
  yAxisLabel,
  color = '#3B82F6',
  height = 300,
  showGrid = true,
  showPoints = true,
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

  const maxY = Math.max(...data.map(d => d.y))
  const minY = Math.min(...data.map(d => d.y))
  const yRange = maxY - minY || 1
  const padding = 40
  const chartWidth = 600
  const chartHeight = height - padding * 2

  // Generate path for the line
  const pathData = data.map((point, index) => {
    const x = (index / (data.length - 1)) * chartWidth + padding
    const y = chartHeight - ((point.y - minY) / yRange) * chartHeight + padding
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')

  // Generate grid lines
  const gridLines = []
  if (showGrid) {
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = (i / 5) * chartHeight + padding
      gridLines.push(
        <line
          key={`h-${i}`}
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

    // Vertical grid lines
    for (let i = 0; i <= 4; i++) {
      const x = (i / 4) * chartWidth + padding
      gridLines.push(
        <line
          key={`v-${i}`}
          x1={x}
          y1={padding}
          x2={x}
          y2={chartHeight + padding}
          stroke="#E5E7EB"
          strokeWidth="1"
          strokeDasharray="2,2"
        />
      )
    }
  }

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
            {/* Grid */}
            {gridLines}
            
            {/* Line */}
            <path
              d={pathData}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Area under line */}
            <path
              d={`${pathData} L ${chartWidth + padding} ${chartHeight + padding} L ${padding} ${chartHeight + padding} Z`}
              fill={color}
              fillOpacity="0.1"
            />
            
            {/* Data points */}
            {showPoints && data.map((point, index) => {
              const x = (index / (data.length - 1)) * chartWidth + padding
              const y = chartHeight - ((point.y - minY) / yRange) * chartHeight + padding
              
              return (
                <g key={index}>
                  <circle
                    cx={x}
                    cy={y}
                    r="4"
                    fill={color}
                    stroke="white"
                    strokeWidth="2"
                  />
                  {/* Tooltip on hover */}
                  <circle
                    cx={x}
                    cy={y}
                    r="8"
                    fill="transparent"
                    className="cursor-pointer"
                  >
                    <title>{`${point.label || point.x}: ${formatValue(point.y)}`}</title>
                  </circle>
                </g>
              )
            })}
            
            {/* Y-axis labels */}
            {Array.from({ length: 6 }, (_, i) => {
              const value = minY + (yRange * i) / 5
              const y = chartHeight - (i / 5) * chartHeight + padding
              
              return (
                <text
                  key={i}
                  x={padding - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-gray-600 dark:fill-gray-400"
                >
                  {formatValue(value)}
                </text>
              )
            })}
            
            {/* X-axis labels */}
            {data.map((point, index) => {
              if (index % Math.ceil(data.length / 5) !== 0) return null
              
              const x = (index / (data.length - 1)) * chartWidth + padding
              
              return (
                <text
                  key={index}
                  x={x}
                  y={height - 10}
                  textAnchor="middle"
                  className="text-xs fill-gray-600 dark:fill-gray-400"
                >
                  {point.label || point.x}
                </text>
              )
            })}
            
            {/* Axis labels */}
            {yAxisLabel && (
              <text
                x={15}
                y={height / 2}
                textAnchor="middle"
                transform={`rotate(-90, 15, ${height / 2})`}
                className="text-sm fill-gray-700 dark:fill-gray-300"
              >
                {yAxisLabel}
              </text>
            )}
            
            {xAxisLabel && (
              <text
                x={chartWidth / 2 + padding}
                y={height - 5}
                textAnchor="middle"
                className="text-sm fill-gray-700 dark:fill-gray-300"
              >
                {xAxisLabel}
              </text>
            )}
          </svg>
        </div>
      </CardContent>
    </Card>
  )
}

export default LineChart