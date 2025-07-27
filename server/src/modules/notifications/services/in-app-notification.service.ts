import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { NotificationDocument, Notification } from '../../../database/schemas/notification.schema'
import { NotificationAnalyticsService } from './notification-analytics.service'
import { WalletGateway } from '../../wallet/wallet.gateway'

export interface InAppNotificationData {
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  actionUrl?: string
  actionText?: string
  metadata?: Record<string, any>
  expiresAt?: Date
}

@Injectable()
export class InAppNotificationService {
  private readonly logger = new Logger(InAppNotificationService.name)

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    private analyticsService: NotificationAnalyticsService,
    private walletGateway: WalletGateway,
  ) {}

  async sendNotification(
    notification: NotificationDocument
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Update notification status in database
      await this.notificationModel.findByIdAndUpdate(
        notification._id,
        {
          status: 'delivered',
          sentAt: new Date(),
          deliveredAt: new Date(),
        }
      )

      // Emit real-time notification via WebSocket
      const userId = notification.userId.toString()
      if (this.walletGateway.isUserConnected(userId)) {
        this.walletGateway.emitNotification(userId, {
          type: this.mapNotificationTypeToSocketType(notification.type),
          title: notification.title,
          message: notification.message,
          data: {
            id: notification._id.toString(),
            type: notification.type,
            priority: notification.priority,
            metadata: notification.metadata,
            createdAt: new Date(),
            actionUrl: notification.metadata?.actionUrl,
            actionText: notification.metadata?.actionText,
          },
        })

        this.logger.log(`Real-time notification sent to user ${userId}`)
      } else {
        this.logger.log(`User ${userId} not connected, notification stored for later retrieval`)
      }

      // Track successful delivery
      await this.analyticsService.trackEvent(
        notification._id as any,
        notification.userId as any,
        notification.type,
        notification.channel,
        'sent'
      )

      await this.analyticsService.trackEvent(
        notification._id as any,
        notification.userId as any,
        notification.type,
        notification.channel,
        'delivered'
      )

      this.logger.log(`In-app notification delivered: ${notification._id}`)
      return { success: true }
    } catch (error) {
      this.logger.error(`Failed to deliver in-app notification: ${error.message}`)

      // Track failure
      await this.analyticsService.trackEvent(
        notification._id as any,
        notification.userId as any,
        notification.type,
        notification.channel,
        'failed',
        {
          errorMessage: error.message,
        }
      )

      return { success: false, error: error.message }
    }
  }

  async createAndSendRealTimeNotification(
    userId: string,
    data: InAppNotificationData
  ): Promise<NotificationDocument> {
    try {
      // Create notification in database
      const notification = new this.notificationModel({
        userId: new Types.ObjectId(userId),
        title: data.title,
        message: data.message,
        type: data.type,
        channel: 'in_app',
        priority: data.priority,
        metadata: {
          ...data.metadata,
          actionUrl: data.actionUrl,
          actionText: data.actionText,
        },
        expiresAt: data.expiresAt,
      })

      await notification.save()

      // Send real-time notification
      await this.sendNotification(notification)

      return notification
    } catch (error) {
      this.logger.error(`Failed to create and send real-time notification: ${error.message}`)
      throw error
    }
  }

  async sendBulkRealTimeNotifications(
    userIds: string[],
    data: InAppNotificationData
  ): Promise<NotificationDocument[]> {
    try {
      const notifications = userIds.map(userId => new this.notificationModel({
        userId: new Types.ObjectId(userId),
        title: data.title,
        message: data.message,
        type: data.type,
        channel: 'in_app',
        priority: data.priority,
        metadata: {
          ...data.metadata,
          actionUrl: data.actionUrl,
          actionText: data.actionText,
        },
        expiresAt: data.expiresAt,
      }))

      await this.notificationModel.insertMany(notifications)

      // Send real-time notifications to connected users
      const connectedUserIds = this.walletGateway.getConnectedUserIds()
      const connectedNotifications = notifications.filter(n => 
        connectedUserIds.includes(n.userId.toString())
      )

      for (const notification of connectedNotifications) {
        await this.sendNotification(notification)
      }

      this.logger.log(`Bulk notifications sent to ${userIds.length} users, ${connectedNotifications.length} delivered in real-time`)
      return notifications
    } catch (error) {
      this.logger.error(`Failed to send bulk real-time notifications: ${error.message}`)
      throw error
    }
  }

  async sendSystemAnnouncement(
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
  ): Promise<void> {
    try {
      // Broadcast to all connected users
      this.walletGateway.broadcastNotification({
        type: 'info',
        title,
        message,
        data: {
          type: 'system_announcement',
          priority,
          timestamp: new Date(),
        },
      })

      // Also store for offline users
      const connectedUserIds = this.walletGateway.getConnectedUserIds()
      if (connectedUserIds.length > 0) {
        const notifications = connectedUserIds.map(userId => new this.notificationModel({
          userId: new Types.ObjectId(userId),
          title,
          message,
          type: 'system_announcement',
          channel: 'in_app',
          priority,
          status: 'delivered',
          sentAt: new Date(),
          deliveredAt: new Date(),
        }))

        await this.notificationModel.insertMany(notifications)
      }

      this.logger.log(`System announcement sent to ${connectedUserIds.length} connected users`)
    } catch (error) {
      this.logger.error(`Failed to send system announcement: ${error.message}`)
      throw error
    }
  }

  private mapNotificationTypeToSocketType(notificationType: string): 'info' | 'success' | 'warning' | 'error' {
    const typeMap: Record<string, 'info' | 'success' | 'warning' | 'error'> = {
      'bet_won': 'success',
      'bet_lost': 'info',
      'bet_void': 'warning',
      'deposit_success': 'success',
      'deposit_failed': 'error',
      'withdrawal_success': 'success',
      'withdrawal_failed': 'error',
      'kyc_approved': 'success',
      'kyc_rejected': 'error',
      'security_alert': 'error',
      'login_alert': 'warning',
      'limit_warning': 'warning',
      'promotion': 'info',
      'system_announcement': 'info',
      'account_suspended': 'error',
      'account_verified': 'success',
    }

    return typeMap[notificationType] || 'info'
  }

  async getUnreadNotifications(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<NotificationDocument[]> {
    return this.notificationModel
      .find({
        userId,
        channel: 'in_app',
        isRead: false,
        isArchived: false,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .exec()
  }

  async getAllNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    includeRead: boolean = true
  ): Promise<{ notifications: NotificationDocument[], total: number }> {
    const query: any = {
      userId,
      channel: 'in_app',
      isArchived: false,
    }

    if (!includeRead) {
      query.isRead = false
    }

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .exec(),
      this.notificationModel.countDocuments(query)
    ])

    return { notifications, total }
  }

  async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<NotificationDocument> {
    const notification = await this.notificationModel.findOneAndUpdate(
      {
        _id: notificationId,
        userId,
        channel: 'in_app',
      },
      {
        isRead: true,
        readAt: new Date(),
        status: 'read',
      },
      { new: true }
    )

    if (notification) {
      // Track read event
      await this.analyticsService.trackEvent(
        notification._id as any,
        notification.userId as any,
        notification.type,
        notification.channel,
        'opened'
      )
    }

    return notification
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationModel.updateMany(
      {
        userId,
        channel: 'in_app',
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
        status: 'read',
      }
    )

    this.logger.log(`Marked ${result.modifiedCount} notifications as read for user ${userId}`)
    return result.modifiedCount
  }

  async archiveNotification(
    notificationId: string,
    userId: string
  ): Promise<NotificationDocument> {
    return this.notificationModel.findOneAndUpdate(
      {
        _id: notificationId,
        userId,
        channel: 'in_app',
      },
      {
        isArchived: true,
      },
      { new: true }
    )
  }

  async deleteNotification(
    notificationId: string,
    userId: string
  ): Promise<boolean> {
    const result = await this.notificationModel.deleteOne({
      _id: notificationId,
      userId,
      channel: 'in_app',
    })

    return result.deletedCount > 0
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      userId,
      channel: 'in_app',
      isRead: false,
      isArchived: false,
    })
  }

  async getNotificationsByType(
    userId: string,
    type: string,
    limit: number = 20
  ): Promise<NotificationDocument[]> {
    return this.notificationModel
      .find({
        userId,
        channel: 'in_app',
        type,
        isArchived: false,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec()
  }

  async getRecentNotifications(
    userId: string,
    hours: number = 24,
    limit: number = 10
  ): Promise<NotificationDocument[]> {
    const cutoffDate = new Date()
    cutoffDate.setHours(cutoffDate.getHours() - hours)

    return this.notificationModel
      .find({
        userId,
        channel: 'in_app',
        createdAt: { $gte: cutoffDate },
        isArchived: false,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec()
  }

  async getNotificationStats(userId: string): Promise<any> {
    const pipeline = [
      {
        $match: {
          userId,
          channel: 'in_app',
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: {
            $sum: {
              $cond: [{ $eq: ['$isRead', false] }, 1, 0]
            }
          },
          archived: {
            $sum: {
              $cond: [{ $eq: ['$isArchived', true] }, 1, 0]
            }
          },
          byType: {
            $push: {
              type: '$type',
              isRead: '$isRead',
              priority: '$priority',
            }
          }
        }
      },
      {
        $addFields: {
          readPercentage: {
            $cond: [
              { $gt: ['$total', 0] },
              { $multiply: [{ $divide: [{ $subtract: ['$total', '$unread'] }, '$total'] }, 100] },
              0
            ]
          }
        }
      }
    ]

    const result = await this.notificationModel.aggregate(pipeline).exec()
    return result[0] || {
      total: 0,
      unread: 0,
      archived: 0,
      readPercentage: 0,
      byType: []
    }
  }

  async cleanupOldNotifications(userId: string, daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const result = await this.notificationModel.deleteMany({
      userId,
      channel: 'in_app',
      createdAt: { $lt: cutoffDate },
      isRead: true,
    })

    this.logger.log(`Cleaned up ${result.deletedCount} old notifications for user ${userId}`)
    return result.deletedCount
  }
}