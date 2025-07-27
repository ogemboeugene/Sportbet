import React from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import Skeleton from '../ui/Skeleton'

interface EventsListSkeletonProps {
  count?: number
}

const EventsListSkeleton: React.FC<EventsListSkeletonProps> = ({ count = 5 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i}>
          <CardHeader padding="sm">
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <Skeleton height={18} width="80%" />
                <div className="flex items-center space-x-2">
                  <Skeleton height={16} width={60} rounded="full" />
                  <Skeleton height={16} width={80} />
                </div>
              </div>
              <Skeleton height={16} width={100} />
            </div>
          </CardHeader>
          <CardContent padding="sm">
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }, (_, j) => (
                <div key={j} className="space-y-1">
                  <Skeleton height={14} width="60%" />
                  <Skeleton height={36} width="100%" rounded="md" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default EventsListSkeleton