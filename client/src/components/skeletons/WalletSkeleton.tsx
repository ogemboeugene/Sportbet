import React from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import Skeleton from '../ui/Skeleton'

const WalletSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Balance Card Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton height={20} width="40%" />
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <Skeleton height={48} width="60%" className="mx-auto" />
            <div className="flex justify-center space-x-4">
              <Skeleton height={40} width={100} rounded="md" />
              <Skeleton height={40} width={100} rounded="md" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Quick Actions Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <Skeleton height={18} width="50%" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Skeleton height={40} width="100%" rounded="md" />
              <Skeleton height={40} width="100%" rounded="md" />
              <Skeleton height={44} width="100%" rounded="md" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <Skeleton height={18} width="50%" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Skeleton height={40} width="100%" rounded="md" />
              <Skeleton height={40} width="100%" rounded="md" />
              <Skeleton height={44} width="100%" rounded="md" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Transaction History Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton height={20} width="40%" />
            <Skeleton height={32} width={80} rounded="md" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Skeleton height={40} width={40} rounded="full" />
                  <div className="space-y-1">
                    <Skeleton height={16} width={120} />
                    <Skeleton height={14} width={80} />
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <Skeleton height={16} width={60} />
                  <Skeleton height={14} width={40} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default WalletSkeleton