import React from 'react'
import { Card, CardHeader, CardContent, Skeleton } from '../ui'

interface TableSkeletonProps {
  rows?: number
  columns?: number
  showHeader?: boolean
  showActions?: boolean
  showPagination?: boolean
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  showHeader = true,
  showActions = true,
  showPagination = true
}) => {
  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton height={24} width="30%" />
            <div className="flex space-x-2">
              <Skeleton height={36} width={80} rounded="md" />
              <Skeleton height={36} width={100} rounded="md" />
            </div>
          </div>
        </CardHeader>
      )}
      
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Table Header */}
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                {Array.from({ length: columns }, (_, i) => (
                  <th key={i} className="text-left py-3 px-4">
                    <Skeleton height={16} width={`${60 + Math.random() * 40}%`} />
                  </th>
                ))}
                {showActions && (
                  <th className="text-right py-3 px-4">
                    <Skeleton height={16} width="60%" className="ml-auto" />
                  </th>
                )}
              </tr>
            </thead>
            
            {/* Table Body */}
            <tbody>
              {Array.from({ length: rows }, (_, rowIndex) => (
                <tr key={rowIndex} className="border-b border-gray-100 dark:border-gray-800">
                  {Array.from({ length: columns }, (_, colIndex) => (
                    <td key={colIndex} className="py-4 px-4">
                      {colIndex === 0 ? (
                        <div className="flex items-center space-x-3">
                          <Skeleton height={40} width={40} rounded="full" />
                          <div className="space-y-1">
                            <Skeleton height={16} width="80%" />
                            <Skeleton height={14} width="60%" />
                          </div>
                        </div>
                      ) : (
                        <Skeleton height={16} width={`${50 + Math.random() * 50}%`} />
                      )}
                    </td>
                  ))}
                  {showActions && (
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <Skeleton height={32} width={32} rounded="md" />
                        <Skeleton height={32} width={32} rounded="md" />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {showPagination && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Skeleton height={16} width="20%" />
            <div className="flex space-x-2">
              <Skeleton height={36} width={36} rounded="md" />
              <Skeleton height={36} width={36} rounded="md" />
              <Skeleton height={36} width={36} rounded="md" />
              <Skeleton height={36} width={36} rounded="md" />
              <Skeleton height={36} width={36} rounded="md" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default TableSkeleton