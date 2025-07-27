import { Injectable, Logger } from '@nestjs/common'
import { NotificationDocument } from '../../../database/schemas/notification.schema'
import { NotificationAnalyticsService } from './notification-analytics.service'
import { FirebaseService } from './firebase.service'
import { DeviceTokenService } from './device-token.service'
import * as admin from 'firebase-admin'

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name)

  constructor(
    private analyticsService: NotificationAnalyticsService,
    private firebaseService: FirebaseService,
    private deviceTokenService: DeviceTokenService,
  ) {}

  async sendNotification(
    notification: NotificationDocument,
    deviceTokens: string[],
    userId: string
  ): Promise<{ success: boolean; successCount: number; failureCount: number; errors?: any[] }> {
    try {
      if (deviceTokens.length === 0) {
        this.logger.warn(`No device tokens provided for user ${userId}`)
        return { success: false, successCount: 0, failureCount: 0 }
      }

      const payload = this.buildNotificationPayload(notification)
      const results = await this.sendToDevices(deviceTokens, payload)

      const successCount = results.filter(r => r.success).length
      const failureCount = results.filter(r => !r.success).length

      // Handle invalid tokens
      const invalidTokens = results
        .filter(r => !r.success && r.invalidToken)
        .map(r => r.token)
      
      if (invalidTokens.length > 0) {
        await this.handleInvalidTokens(invalidTokens)
      }

      // Track analytics for successful sends
      if (successCount > 0) {
        await this.analyticsService.trackEvent(
          notification._id as any,
          notification.userId as any,
          notification.type,
          notification.channel,
          'sent',
          {
            deviceCount: deviceTokens.length,
            successCount,
            failureCount,
          }
        )
      }

      // Track failures
      if (failureCount > 0) {
        const errors = results.filter(r => !r.success).map(r => r.error)
        await this.analyticsService.trackEvent(
          notification._id as any,
          notification.userId as any,
          notification.type,
          notification.channel,
          'failed',
          {
            deviceCount: deviceTokens.length,
            failureCount,
            errors: errors.slice(0, 5), // Limit error details
          }
        )
      }

      this.logger.log(`Push notification sent: ${successCount} success, ${failureCount} failed`)
      
      return {
        success: successCount > 0,
        successCount,
        failureCount,
        errors: failureCount > 0 ? results.filter(r => !r.success).map(r => r.error) : undefined
      }
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${error.message}`)

      await this.analyticsService.trackEvent(
        notification._id as any,
        notification.userId as any,
        notification.type,
        notification.channel,
        'failed',
        {
          errorMessage: error.message,
          deviceCount: deviceTokens.length,
        }
      )

      return {
        success: false,
        successCount: 0,
        failureCount: deviceTokens.length,
        errors: [error.message]
      }
    }
  }

  async sendNotificationToUser(
    notification: NotificationDocument,
    userId: string
  ): Promise<{ success: boolean; successCount: number; failureCount: number; errors?: any[] }> {
    try {
      const deviceTokens = await this.deviceTokenService.getActiveTokensForUser(userId)
      const tokens = deviceTokens.map(dt => dt.token)
      
      if (tokens.length === 0) {
        this.logger.warn(`No active device tokens found for user ${userId}`)
        return { success: false, successCount: 0, failureCount: 0 }
      }

      return await this.sendNotification(notification, tokens, userId)
    } catch (error) {
      this.logger.error(`Failed to send notification to user ${userId}: ${error.message}`)
      return {
        success: false,
        successCount: 0,
        failureCount: 0,
        errors: [error.message]
      }
    }
  }

  async sendBulkNotifications(
    notifications: Array<{
      notification: NotificationDocument
      deviceTokens: string[]
      userId: string
    }>
  ): Promise<Array<{ success: boolean; successCount: number; failureCount: number }>> {
    const results = []

    for (const { notification, deviceTokens, userId } of notifications) {
      const result = await this.sendNotification(notification, deviceTokens, userId)
      results.push(result)

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    return results
  }

  async sendBulkNotificationsToUsers(
    userNotifications: Array<{
      notification: NotificationDocument
      userId: string
    }>
  ): Promise<Array<{ userId: string; success: boolean; successCount: number; failureCount: number }>> {
    const userIds = userNotifications.map(un => un.userId)
    const userTokensMap = await this.deviceTokenService.getActiveTokensForUsers(userIds)
    
    const results = []

    for (const { notification, userId } of userNotifications) {
      const deviceTokens = userTokensMap.get(userId) || []
      const tokens = deviceTokens.map(dt => dt.token)
      
      if (tokens.length === 0) {
        this.logger.warn(`No active device tokens found for user ${userId}`)
        results.push({
          userId,
          success: false,
          successCount: 0,
          failureCount: 0,
        })
        continue
      }

      const result = await this.sendNotification(notification, tokens, userId)
      results.push({
        userId,
        ...result,
      })

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    return results
  }

  private buildNotificationPayload(notification: NotificationDocument): any {
    const basePayload = {
      notification: {
        title: notification.title,
        body: notification.message,
        icon: this.getNotificationIcon(notification.type),
        badge: this.getNotificationBadge(notification.type),
        sound: this.getNotificationSound(notification.priority),
        click_action: this.getClickAction(notification),
      },
      data: {
        notificationId: notification._id.toString(),
        type: notification.type,
        priority: notification.priority,
        timestamp: new Date().toISOString(),
        ...notification.metadata,
      },
      android: {
        priority: this.getAndroidPriority(notification.priority),
        notification: {
          channel_id: this.getChannelId(notification.type),
          color: this.getNotificationColor(notification.type),
          default_sound: true,
          default_vibrate_timings: true,
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: notification.title,
              body: notification.message,
            },
            badge: 1,
            sound: this.getNotificationSound(notification.priority),
            category: notification.type,
          },
        },
      },
      webpush: {
        headers: {
          Urgency: this.getWebPushUrgency(notification.priority),
        },
        notification: {
          title: notification.title,
          body: notification.message,
          icon: '/icons/notification-icon.png',
          badge: '/icons/notification-badge.png',
          tag: notification.type,
          requireInteraction: notification.priority === 'urgent',
          actions: this.getWebPushActions(notification),
        },
      },
    }

    return basePayload
  }

  private async sendToDevices(
    deviceTokens: string[],
    payload: any
  ): Promise<Array<{ success: boolean; error?: string; token?: string; invalidToken?: boolean }>> {
    if (!this.firebaseService.isInitialized()) {
      this.logger.warn('Firebase not initialized, simulating push notifications')
      return this.simulatePushNotifications(deviceTokens)
    }

    try {
      const messaging = this.firebaseService.getMessaging()
      const results = []

      // Send notifications in batches to avoid rate limiting
      const batchSize = 500 // FCM allows up to 500 tokens per batch
      const batches = this.chunkArray(deviceTokens, batchSize)

      for (const batch of batches) {
        try {
          const message: admin.messaging.MulticastMessage = {
            tokens: batch,
            notification: payload.notification,
            data: this.convertDataToStrings(payload.data),
            android: payload.android,
            apns: payload.apns,
            webpush: payload.webpush,
          }

          const response = await messaging.sendEachForMulticast(message)
          
          // Process results for this batch
          response.responses.forEach((result, index) => {
            const token = batch[index]
            if (result.success) {
              results.push({ success: true, token })
              // Update token last used
              this.deviceTokenService.updateTokenLastUsed(token).catch(err => 
                this.logger.warn(`Failed to update token last used: ${err.message}`)
              )
            } else {
              const error = result.error
              const isInvalidToken = this.isInvalidTokenError(error)
              
              results.push({
                success: false,
                error: error?.message || 'Unknown error',
                token,
                invalidToken: isInvalidToken,
              })
            }
          })

          this.logger.log(`Batch sent: ${response.successCount} success, ${response.failureCount} failed`)
        } catch (batchError) {
          this.logger.error(`Batch send failed: ${batchError.message}`)
          // Mark all tokens in this batch as failed
          batch.forEach(token => {
            results.push({
              success: false,
              error: batchError.message,
              token,
            })
          })
        }

        // Small delay between batches
        if (batches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      return results
    } catch (error) {
      this.logger.error(`FCM send failed: ${error.message}`)
      // Return all as failed
      return deviceTokens.map(token => ({
        success: false,
        error: error.message,
        token,
      }))
    }
  }

  private simulatePushNotifications(
    deviceTokens: string[]
  ): Promise<Array<{ success: boolean; error?: string; token?: string; invalidToken?: boolean }>> {
    return Promise.resolve(
      deviceTokens.map(token => {
        // Simulate 95% success rate
        const success = Math.random() > 0.05
        
        if (success) {
          return { success: true, token }
        } else {
          return { 
            success: false, 
            error: 'Simulated: Invalid device token or device not reachable',
            token,
            invalidToken: Math.random() > 0.7, // 30% of failures are invalid tokens
          }
        }
      })
    )
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  private convertDataToStrings(data: Record<string, any>): Record<string, string> {
    const stringData: Record<string, string> = {}
    
    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined) {
        stringData[key] = typeof value === 'string' ? value : JSON.stringify(value)
      }
    }
    
    return stringData
  }

  private isInvalidTokenError(error: any): boolean {
    if (!error) return false
    
    const invalidTokenCodes = [
      'messaging/invalid-registration-token',
      'messaging/registration-token-not-registered',
      'messaging/invalid-argument',
    ]
    
    return invalidTokenCodes.includes(error.code)
  }

  private async handleInvalidTokens(invalidTokens: string[]): Promise<void> {
    try {
      await Promise.all(
        invalidTokens.map(token => 
          this.deviceTokenService.markTokenAsInvalid(token)
        )
      )
      
      this.logger.log(`Marked ${invalidTokens.length} invalid tokens as inactive`)
    } catch (error) {
      this.logger.error(`Failed to handle invalid tokens: ${error.message}`)
    }
  }

  private getNotificationIcon(type: string): string {
    const iconMap = {
      'bet_won': 'ic_trophy',
      'bet_lost': 'ic_info',
      'bet_placed': 'ic_sports',
      'deposit_success': 'ic_money_in',
      'withdrawal_success': 'ic_money_out',
      'security_alert': 'ic_security',
      'kyc_approved': 'ic_verified',
      'promotion': 'ic_gift',
    }
    return iconMap[type] || 'ic_notification'
  }

  private getNotificationBadge(type: string): string {
    return '/icons/notification-badge.png'
  }

  private getNotificationSound(priority: string): string {
    return priority === 'urgent' ? 'urgent_sound.wav' : 'default'
  }

  private getNotificationColor(type: string): string {
    const colorMap = {
      'bet_won': '#28a745',
      'bet_lost': '#6c757d',
      'security_alert': '#dc3545',
      'deposit_success': '#28a745',
      'withdrawal_success': '#17a2b8',
      'promotion': '#ffc107',
    }
    return colorMap[type] || '#007bff'
  }

  private getChannelId(type: string): string {
    const channelMap = {
      'bet_placed': 'betting_updates',
      'bet_won': 'betting_results',
      'bet_lost': 'betting_results',
      'deposit_success': 'financial_updates',
      'withdrawal_success': 'financial_updates',
      'security_alert': 'security_alerts',
      'kyc_approved': 'account_updates',
      'promotion': 'promotions',
    }
    return channelMap[type] || 'general'
  }

  private getAndroidPriority(priority: string): string {
    const priorityMap = {
      'low': 'normal',
      'medium': 'normal',
      'high': 'high',
      'urgent': 'high',
    }
    return priorityMap[priority] || 'normal'
  }

  private getWebPushUrgency(priority: string): string {
    const urgencyMap = {
      'low': 'low',
      'medium': 'normal',
      'high': 'high',
      'urgent': 'high',
    }
    return urgencyMap[priority] || 'normal'
  }

  private getClickAction(notification: NotificationDocument): string {
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000'
    
    switch (notification.type) {
      case 'bet_won':
      case 'bet_lost':
      case 'bet_void':
        return `${baseUrl}/bets/${notification.metadata?.betId}`
      case 'deposit_success':
      case 'withdrawal_success':
        return `${baseUrl}/wallet/transactions`
      case 'kyc_approved':
      case 'kyc_rejected':
        return `${baseUrl}/kyc`
      case 'security_alert':
        return `${baseUrl}/security`
      case 'promotion':
        return `${baseUrl}/promotions`
      default:
        return `${baseUrl}/dashboard`
    }
  }

  private getWebPushActions(notification: NotificationDocument): any[] {
    const actions = []

    switch (notification.type) {
      case 'bet_won':
        actions.push(
          { action: 'view', title: 'View Details' },
          { action: 'place_bet', title: 'Place New Bet' }
        )
        break
      case 'deposit_success':
        actions.push(
          { action: 'view', title: 'View Transaction' },
          { action: 'place_bet', title: 'Start Betting' }
        )
        break
      case 'promotion':
        actions.push(
          { action: 'view', title: 'View Offer' },
          { action: 'dismiss', title: 'Dismiss' }
        )
        break
      default:
        actions.push({ action: 'view', title: 'View' })
    }

    return actions
  }
}