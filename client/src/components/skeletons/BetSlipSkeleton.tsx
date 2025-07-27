import React from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import Skeleton from '../ui/Skeleton'

const BetSlipSkeleton: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <Skeleton height={24} width="60%" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Bet selections skeleton */}
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Skeleton height={16} width="70%" />
                <Skeleton height={20} width={50} rounded="md" />
              </div>
              <Skeleton height={14} width="50%" />
            </div>
          ))}
          
          {/* Stake input skeleton */}
          <div className="space-y-2">
            <Skeleton height={16} width="30%" />
            <Skeleton height={40} width="100%" rounded="md" />
          </div>
          
          {/* Potential win skeleton */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <Skeleton height={16} width="40%" />
            <Skeleton height={20} width="60%" />
          </div>
          
          {/* Place bet button skeleton */}
          <Skeleton height={44} width="100%" rounded="md" />
        </div>
      </CardContent>
    </Card>
  )
}

export default BetSlipSkeleton