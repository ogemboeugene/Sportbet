import { api } from './api'

export interface Notification {
  _id: string
  title: string
  message: string
  type: string
  channel: string
  priority: string
  status: string
  isRead: boolean
  isArchived: boolean
  metadata?: Record<string, any>
  createdAt: string
  readAt?: string
}

export interface NotificationPreferences {
  email: boolean
  push: boolean
  sms: boolean
  in_app: boolean
  betUpdates: boolean
  financial: boolean
  security: boolean
  promotions: boolean
  system: boolean
}

export interface DeviceToken {
  id: string
  platform: 'web' | 'android' | 'ios'
  deviceId?: string
  lastUsedAt: string
  registeredAt: string
}

export interface NotificationStats {
  total: number
  unread: number
  archived: number
  readPercentage: number
  byType: Array<{
    type: string
    isRead: boolean
    priority: string
  }>
}

class NotificationApiService {
  // Notification management
  async getNotifications(params?: {
    page?: number
    limit?: number
    type?: string
    channel?: string
    includeRead?: boolean
    priority?: string
  }) {
    const response = await api.get('/notifications', { params })
    return response.data
  }

  async getUnreadNotifications(params?: { limit?: number; offset?: number }) {
    const response = await api.get('/notifications/my/unread', { params })
    return response.data
  }

  async getUnreadCount() {
    const response = await api.get('/notifications/my/unread-count')
    return response.data.count
  }

  async getRecentNotifications(params?: { hours?: number; limit?: number }) {
    const response = await api.get('/notifications/recent', { params })
    return response.data
  }

  async getNotificationStats(): Promise<NotificationStats> {
    const response = await api.get('/notifications/my/stats')
    return response.data
  }

  async getNotificationsByType(type: string, limit?: number) {
    const response = await api.get(`/notifications/by-type/${type}`, {
      params: { limit }
    })
    return response.data
  }

  async markAsRead(notificationId: string) {
    const response = await api.post(`/notifications/${notificationId}/read`)
    return response.data
  }

  async markAllAsRead() {
    const response = await api.post('/notifications/mark-all-read')
    return response.data
  }

  async archiveNotification(notificationId: string) {
    const response = await api.post(`/notifications/${notificationId}/archive`)
    return response.data
  }

  async deleteNotification(notificationId: string) {
    await api.delete(`/notifications/${notificationId}`)
  }

  async cleanupOldNotifications(daysToKeep?: number) {
    const response = await api.post('/notifications/cleanup', { daysToKeep })
    return response.data
  }

  // Preferences
  async getPreferences(): Promise<NotificationPreferences> {
    const response = await api.get('/notifications/preferences')
    return response.data
  }

  async updatePreferences(preferences: Partial<NotificationPreferences>) {
    const response = await api.put('/notifications/preferences', preferences)
    return response.data
  }

  // Device tokens
  async registerDeviceToken(tokenData: {
    token: string
    platform: 'web' | 'android' | 'ios'
    deviceId?: string
    userAgent?: string
    appVersion?: string
  }) {
    const response = await api.post('/notifications/device-tokens/register', tokenData)
    return response.data
  }

  async getDeviceTokens(): Promise<DeviceToken[]> {
    const response = await api.get('/notifications/device-tokens')
    return response.data
  }

  async removeDeviceToken(token: string) {
    await api.delete(`/notifications/device-tokens/${token}`)
  }

  async removeAllDeviceTokens() {
    await api.delete('/notifications/device-tokens')
  }

  async getDeviceTokenStats() {
    const response = await api.get('/notifications/device-tokens/stats')
    return response.data
  }

  // Test notifications
  async sendTestInAppNotification() {
    const response = await api.post('/notifications/test/in-app')
    return response.data
  }

  async sendTestPushNotification() {
    const response = await api.post('/notifications/test/push')
    return response.data
  }

  // Real-time subscription helpers
  requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return Promise.reject(new Error('This browser does not support notifications'))
    }

    return Notification.requestPermission()
  }

  async registerServiceWorker(): Promise<ServiceWorkerRegistration> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported')
    }

    const registration = await navigator.serviceWorker.register('/sw.js')
    return registration
  }

  async getFirebaseToken(): Promise<string> {
    // This would be implemented with Firebase SDK
    // For now, return a mock token
    return 'mock-firebase-token-' + Date.now()
  }
}

export const notificationApi = new NotificationApiService()