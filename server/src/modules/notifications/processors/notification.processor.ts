import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { NotificationsService } from '../notifications.service'
import { EmailNotificationService } from '../services/email-notification.service'
import { PushNotificationService } from '../services/push-notification.service'
import { SmsNotificationService } from '../services/sms-notification.service'
import { InAppNotificationService } from '../services/in-app-notification.service'
import { NotificationTemplateService } from '../services/notification-template.service'
import { 
  Notification, 
  NotificationDocument 
} from '../../../database/schemas/notification.schema'
import { 
  User, 
  UserDocument 
} from '../../../database/schemas/user.schema'

@Injectable()
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name)

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private notificationsService: NotificationsService,
    private emailService: EmailNotificationService,
    private pushService: PushNotificationService,
    private smsService: SmsNotificationService,
    private inAppService: InAppNotificationService,
    private templateService: NotificationTemplateService,
  ) {}

  async handleSendNotification(jobData: any): Promise<void> {
    const { notificationId, userId, type, channel, priority } = jobData

    try {
      this.logger.log(`Processing notification job: ${notificationId}`)

      // Get the notification from database
      const notification = await this.notificationModel.findById(notificationId)
      if (!notification) {
        throw new Error(`Notification not found: ${notificationId}`)
      }

      // Get user information
      const user = await this.userModel.findById(userId)
      if (!user) {
        throw new Error(`User not found: ${userId}`)
      }

      // Update notification status to sending
      await this.notificationModel.findByIdAndUpdate(notificationId, {
        status: 'sending',
        sentAt: new Date(),
      })

      // Send notification based on channel
      let result
      switch (channel) {
        case 'email':
          result = await this.sendEmailNotification(notification, user)
          break
        case 'push':
          result = await this.sendPushNotification(notification, user)
          break
        case 'sms':
          result = await this.sendSmsNotification(notification, user)
          break
        case 'in_app':
          result = await this.sendInAppNotification(notification, user)
          break
        default:
          throw new Error(`Unsupported notification channel: ${channel}`)
      }

      // Update notification status based on result
      if (result.success) {
        await this.notificationModel.findByIdAndUpdate(notificationId, {
          status: 'sent',
          deliveredAt: new Date(),
          externalId: result.messageId,
        })
        this.logger.log(`Notification sent successfully: ${notificationId}`)
      } else {
        await this.notificationModel.findByIdAndUpdate(notificationId, {
          status: 'failed',
          failureReason: result.error,
          retryCount: notification.retryCount + 1,
        })
        
        // Retry if within retry limits
        if (notification.retryCount < notification.maxRetries) {
          throw new Error(`Notification failed, will retry: ${result.error}`)
        } else {
          this.logger.error(`Notification failed permanently: ${notificationId}, ${result.error}`)
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process notification job: ${error.message}`)
      
      // Update notification status
      await this.notificationModel.findByIdAndUpdate(notificationId, {
        status: 'failed',
        failureReason: error.message,
      })

      throw error // This will trigger Bull's retry mechanism
    }
  }

  async handleRetryNotification(jobData: any): Promise<void> {
    const { notificationId } = jobData

    try {
      const notification = await this.notificationModel.findById(notificationId)
      if (!notification) {
        throw new Error(`Notification not found: ${notificationId}`)
      }

      // Reset status and retry
      await this.notificationModel.findByIdAndUpdate(notificationId, {
        status: 'pending',
        retryCount: notification.retryCount + 1,
      })

      // Re-queue the notification
      await this.notificationsService['queueService'].addNotificationJob(notification)
      
      this.logger.log(`Notification retry queued: ${notificationId}`)
    } catch (error) {
      this.logger.error(`Failed to retry notification: ${error.message}`)
      throw error
    }
  }

  async handleRecurringNotification(jobData: any): Promise<void> {
    const { templateId, userId, templateData } = jobData

    try {
      this.logger.log(`Processing recurring notification: ${templateId} for user ${userId}`)

      // Create notification from template
      const notification = await this.notificationsService.createFromTemplate(
        templateId,
        userId,
        templateData
      )

      if (notification) {
        this.logger.log(`Recurring notification created: ${notification._id}`)
      } else {
        this.logger.log(`Recurring notification skipped due to user preferences`)
      }
    } catch (error) {
      this.logger.error(`Failed to process recurring notification: ${error.message}`)
      throw error
    }
  }

  async handleBulkNotification(jobData: any): Promise<void> {
    const { templateId, userIds, templateData, options } = jobData

    try {
      this.logger.log(`Processing bulk notification: ${templateId} for ${userIds.length} users`)

      const notifications = await this.notificationsService.sendBulkNotifications(
        userIds,
        templateId,
        templateData,
        options
      )

      this.logger.log(`Bulk notification created: ${notifications.length} notifications`)
    } catch (error) {
      this.logger.error(`Failed to process bulk notification: ${error.message}`)
      throw error
    }
  }

  private async sendEmailNotification(
    notification: NotificationDocument,
    user: UserDocument
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const recipientEmail = user.email
    const recipientName = user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : undefined

    return this.emailService.sendNotification(notification, recipientEmail, recipientName)
  }

  private async sendPushNotification(
    notification: NotificationDocument,
    user: UserDocument
  ): Promise<{ success: boolean; successCount?: number; failureCount?: number; error?: string }> {
    // In a real implementation, you would get device tokens from a user devices table
    const deviceTokens = this.getUserDeviceTokens(user._id.toString())

    if (deviceTokens.length === 0) {
      return { success: false, error: 'No device tokens found for user' }
    }

    return this.pushService.sendNotification(notification, deviceTokens, user._id.toString())
  }

  private async sendSmsNotification(
    notification: NotificationDocument,
    user: UserDocument
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!user.profile?.phoneNumber) {
      return { success: false, error: 'No phone number found for user' }
    }

    return this.smsService.sendNotification(
      notification,
      user.profile.phoneNumber,
      user.profile.country === 'KE' ? '+254' : '+1' // Default country codes
    )
  }

  private async sendInAppNotification(
    notification: NotificationDocument,
    user: UserDocument
  ): Promise<{ success: boolean; error?: string }> {
    return this.inAppService.sendNotification(notification)
  }

  private getUserDeviceTokens(userId: string): string[] {
    // In a real implementation, you would query a user_devices table
    // For now, return mock tokens for development
    return [
      `mock_token_${userId}_web`,
      `mock_token_${userId}_mobile`,
    ]
  }
}