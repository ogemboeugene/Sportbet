import React from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import Skeleton from '../ui/Skeleton'

const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton height={14} width="60%" />
                  <Skeleton height={28} width="80%" />
                  <Skeleton height={20} width={60} rounded="full" />
                </div>
                <Skeleton height={48} width={48} rounded="lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton height={20} width="50%" />
          </CardHeader>
          <CardContent>
            <Skeleton height={300} width="100%" rounded="md" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <Skeleton height={20} width="50%" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <Skeleton height={250} width={250} rounded="full" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton height={20} width="40%" />
                <Skeleton height={32} width={80} rounded="md" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <Skeleton height={40} width={40} rounded="full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton height={16} width="70%" />
                      <Skeleton height={14} width="50%" />
                    </div>
                    <div className="space-y-1">
                      <Skeleton height={16} width={60} />
                      <Skeleton height={14} width={40} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <Skeleton height={20} width="60%" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Skeleton height={14} width="60%" />
                      <Skeleton height={16} width={40} rounded="full" />
                    </div>
                    <Skeleton height={12} width="80%" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default DashboardSkeleton