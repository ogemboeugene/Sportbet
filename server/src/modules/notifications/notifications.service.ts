import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { NotificationQueueService } from './services/notification-queue.service'
import { NotificationPreferenceService } from './services/notification-preference.service'
import { NotificationTemplateService } from './services/notification-template.service'
import { NotificationAnalyticsService } from './services/notification-analytics.service'
import { 
  Notification, 
  NotificationDocument 
} from '../../database/schemas/notification.schema'
import { CreateNotificationDto } from './dto/create-notification.dto'
import { UpdateNotificationDto } from './dto/update-notification.dto'
import { NotificationFiltersDto } from './dto/notification-filters.dto'

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    private queueService: NotificationQueueService,
    private preferenceService: NotificationPreferenceService,
    private templateService: NotificationTemplateService,
    private analyticsService: NotificationAnalyticsService,
  ) {}

  async create(createNotificationDto: CreateNotificationDto): Promise<NotificationDocument> {
    try {
      const notification = new this.notificationModel(createNotificationDto)
      const savedNotification = await notification.save()

      // Queue the notification for processing
      await this.queueService.addNotificationJob(savedNotification)

      this.logger.log(`Notification created and queued: ${savedNotification._id}`)
      return savedNotification
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error.message}`)
      throw error
    }
  }

  async createFromTemplate(
    templateId: string,
    userId: string,
    templateData: Record<string, any> = {},
    options: {
      priority?: string
      scheduledFor?: Date
      channel?: string
    } = {}
  ): Promise<NotificationDocument> {
    try {
      const template = await this.templateService.findByTemplateId(templateId)
      if (!template) {
        throw new Error(`Template not found: ${templateId}`)
      }

      // Check user preferences for this notification type and channel
      const preferences = await this.preferenceService.getUserPreferences(userId)
      const channel = options.channel || this.getPreferredChannel(preferences, template.type)
      
      if (!this.shouldSendNotification(preferences, template.type, channel)) {
        this.logger.log(`Notification skipped due to user preferences: ${userId}, ${template.type}, ${channel}`)
        return null
      }

      // Render template content
      const renderedContent = this.templateService.renderTemplate(template, templateData)

      const createDto: CreateNotificationDto = {
        userId: new Types.ObjectId(userId),
        title: renderedContent.subject,
        message: renderedContent.content,
        type: template.type,
        channel,
        priority: options.priority || template.defaultPriority,
        templateId: template.templateId,
        templateData,
        scheduledFor: options.scheduledFor,
        metadata: {
          templateVersion: template.version,
          ...templateData
        }
      }

      return await this.create(createDto)
    } catch (error) {
      this.logger.error(`Failed to create notification from template: ${error.message}`)
      throw error
    }
  }

  async sendBulkNotifications(
    userIds: string[],
    templateId: string,
    templateData: Record<string, any> = {},
    options: {
      priority?: string
      scheduledFor?: Date
      channel?: string
    } = {}
  ): Promise<NotificationDocument[]> {
    const notifications = []
    
    for (const userId of userIds) {
      try {
        const notification = await this.createFromTemplate(
          templateId,
          userId,
          templateData,
          options
        )
        if (notification) {
          notifications.push(notification)
        }
      } catch (error) {
        this.logger.error(`Failed to create bulk notification for user ${userId}: ${error.message}`)
      }
    }

    return notifications
  }

  async findAll(
    userId?: string,
    filters: NotificationFiltersDto = {}
  ): Promise<{ notifications: NotificationDocument[], total: number }> {
    const query: any = {}
    
    if (userId) {
      query.userId = new Types.ObjectId(userId)
    }

    if (filters.type) {
      query.type = filters.type
    }

    if (filters.channel) {
      query.channel = filters.channel
    }

    if (filters.status) {
      query.status = filters.status
    }

    if (filters.priority) {
      query.priority = filters.priority
    }

    if (filters.isRead !== undefined) {
      query.isRead = filters.isRead
    }

    if (filters.isArchived !== undefined) {
      query.isArchived = filters.isArchived
    }

    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {}
      if (filters.dateFrom) {
        query.createdAt.$gte = new Date(filters.dateFrom)
      }
      if (filters.dateTo) {
        query.createdAt.$lte = new Date(filters.dateTo)
      }
    }

    const page = filters.page || 1
    const limit = filters.limit || 20
    const skip = (page - 1) * limit

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(query)
    ])

    return { notifications, total }
  }

  async findOne(id: string): Promise<NotificationDocument> {
    return this.notificationModel.findById(id).exec()
  }

  async update(id: string, updateNotificationDto: UpdateNotificationDto): Promise<NotificationDocument> {
    return this.notificationModel
      .findByIdAndUpdate(id, updateNotificationDto, { new: true })
      .exec()
  }

  async markAsRead(id: string): Promise<NotificationDocument> {
    const notification = await this.notificationModel
      .findByIdAndUpdate(
        id,
        { 
          isRead: true, 
          readAt: new Date(),
          status: 'read'
        },
        { new: true }
      )
      .exec()

    if (notification) {
      // Track analytics
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

  async markAsArchived(id: string): Promise<NotificationDocument> {
    return this.notificationModel
      .findByIdAndUpdate(id, { isArchived: true }, { new: true })
      .exec()
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel
      .updateMany(
        { userId: new Types.ObjectId(userId), isRead: false },
        { 
          isRead: true, 
          readAt: new Date(),
          status: 'read'
        }
      )
      .exec()
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel
      .countDocuments({
        userId: new Types.ObjectId(userId),
        isRead: false,
        isArchived: false
      })
      .exec()
  }

  async deleteExpired(): Promise<void> {
    const result = await this.notificationModel
      .deleteMany({
        expiresAt: { $lte: new Date() }
      })
      .exec()

    this.logger.log(`Deleted ${result.deletedCount} expired notifications`)
  }

  async remove(id: string): Promise<void> {
    await this.notificationModel.findByIdAndDelete(id).exec()
  }

  private getPreferredChannel(preferences: any, type: string): string {
    const typePrefs = preferences?.preferences?.[type]
    if (!typePrefs) return 'in_app'

    // Priority order: push > email > in_app > sms
    if (typePrefs.push && preferences.globalSettings?.push) return 'push'
    if (typePrefs.email && preferences.globalSettings?.email) return 'email'
    if (typePrefs.in_app && preferences.globalSettings?.in_app) return 'in_app'
    if (typePrefs.sms && preferences.globalSettings?.sms) return 'sms'

    return 'in_app' // fallback
  }

  private shouldSendNotification(preferences: any, type: string, channel: string): boolean {
    // Check global settings
    if (!preferences?.globalSettings?.[channel]) {
      return false
    }

    // Check if type is muted
    if (preferences?.mutedTypes?.includes(type)) {
      return false
    }

    // Check specific type preferences
    const typePrefs = preferences?.preferences?.[type]
    if (!typePrefs?.[channel]) {
      return false
    }

    // Check quiet hours for non-urgent notifications
    if (this.isInQuietHours(preferences?.quietHours)) {
      const urgentChannels = preferences?.urgentChannels || []
      if (!urgentChannels.includes(channel)) {
        return false
      }
    }

    return true
  }

  private isInQuietHours(quietHours: any): boolean {
    if (!quietHours) return false

    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 5) // HH:MM format
    
    return currentTime >= quietHours.start && currentTime <= quietHours.end
  }
}