import React, { useState, useEffect } from 'react'
import { notificationApi, Notification, NotificationStats } from '../../services/notificationApi'
import { useWebSocket } from '../../hooks/useWebSocket'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('unread')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const { isConnected } = useWebSocket()

  useEffect(() => {
    if (isOpen) {
      loadNotifications()
      loadStats()
    }
  }, [isOpen, activeTab])

  const loadNotifications = async (pageNum = 1, append = false) => {
    try {
      setLoading(true)
      const response = activeTab === 'unread' 
        ? await notificationApi.getUnreadNotifications({ limit: 20, offset: (pageNum - 1) * 20 })
        : await notificationApi.getNotifications({ 
            page: pageNum, 
            limit: 20, 
            channel: 'in_app',
            includeRead: true 
          })

      const newNotifications = Array.isArray(response) ? response : response.notifications || []
      
      if (append) {
        setNotifications(prev => [...prev, ...newNotifications])
      } else {
        setNotifications(newNotifications)
      }

      setHasMore(newNotifications.length === 20)
      setPage(pageNum)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const statsData = await notificationApi.getNotificationStats()
      setStats(statsData)
    } catch (error) {
      console.error('Failed to load notification stats:', error)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationApi.markAsRead(notificationId)
      setNotifications(prev =>
        prev.map(n =>
          n._id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        )
      )
      loadStats()
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })))
      loadStats()
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  const handleArchive = async (notificationId: string) => {
    try {
      await notificationApi.archiveNotification(notificationId)
      setNotifications(prev => prev.filter(n => n._id !== notificationId))
      loadStats()
    } catch (error) {
      console.error('Failed to archive notification:', error)
    }
  }

  const handleDelete = async (notificationId: string) => {
    try {
      await notificationApi.deleteNotification(notificationId)
      setNotifications(prev => prev.filter(n => n._id !== notificationId))
      loadStats()
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      loadNotifications(page + 1, true)
    }
  }

  const getNotificationIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      'bet_won': '🏆',
      'bet_lost': 'ℹ️',
      'bet_void': '⚠️',
      'deposit_success': '💰',
      'withdrawal_success': '💸',
      'security_alert': '🔒',
      'kyc_approved': '✅',
      'promotion': '🎁',
      'system_announcement': '📢',
    }
    return iconMap[type] || '🔔'
  }

  const getPriorityColor = (priority: string) => {
    const colorMap: Record<string, string> = {
      'urgent': 'text-red-600 bg-red-50',
      'high': 'text-orange-600 bg-orange-50',
      'medium': 'text-blue-600 bg-blue-50',
      'low': 'text-gray-600 bg-gray-50',
    }
    return colorMap[priority] || 'text-gray-600 bg-gray-50'
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
              <div className="flex items-center space-x-2">
                <div className={`flex items-center space-x-1 text-xs ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span>{isConnected ? 'Live' : 'Offline'}</span>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Stats */}
            {stats && (
              <div className="mt-2 flex space-x-4 text-sm text-gray-600">
                <span>Total: {stats.total}</span>
                <span>Unread: {stats.unread}</span>
                <span>Read: {Math.round(stats.readPercentage)}%</span>
              </div>
            )}

            {/* Tabs */}
            <div className="mt-3 flex space-x-1">
              <button
                onClick={() => setActiveTab('unread')}
                className={`px-3 py-1 text-sm font-medium rounded-md ${
                  activeTab === 'unread'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Unread ({stats?.unread || 0})
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 text-sm font-medium rounded-md ${
                  activeTab === 'all'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All
              </button>
            </div>

            {/* Actions */}
            <div className="mt-2 flex space-x-2">
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800"
                disabled={loading}
              >
                Mark all read
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">Loading notifications...</div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="text-4xl mb-2">🔔</div>
                  <div className="text-gray-500">No notifications</div>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`p-4 hover:bg-gray-50 ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-xl">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {notification.title}
                          </h4>
                          <div className="flex items-center space-x-1">
                            <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(notification.priority)}`}>
                              {notification.priority}
                            </span>
                            {!notification.isRead && (
                              <div className="h-2 w-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                        </div>
                        
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                          
                          <div className="flex items-center space-x-2">
                            {!notification.isRead && (
                              <button
                                onClick={() => handleMarkAsRead(notification._id)}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                Mark read
                              </button>
                            )}
                            <button
                              onClick={() => handleArchive(notification._id)}
                              className="text-xs text-gray-600 hover:text-gray-800"
                            >
                              Archive
                            </button>
                            <button
                              onClick={() => handleDelete(notification._id)}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {notification.metadata?.actionUrl && (
                          <div className="mt-2">
                            <a
                              href={notification.metadata.actionUrl}
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              {notification.metadata.actionText || 'View Details'}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {hasMore && (
                  <div className="p-4 text-center">
                    <button
                      onClick={loadMore}
                      disabled={loading}
                      className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                    >
                      {loading ? 'Loading...' : 'Load more'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}