import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { 
  NotificationAnalytics, 
  NotificationAnalyticsDocument 
} from '../../../database/schemas/notification-analytics.schema'

@Injectable()
export class NotificationAnalyticsService {
  private readonly logger = new Logger(NotificationAnalyticsService.name)

  constructor(
    @InjectModel(NotificationAnalytics.name)
    private analyticsModel: Model<NotificationAnalyticsDocument>,
  ) {}

  async trackEvent(
    notificationId: Types.ObjectId,
    userId: Types.ObjectId,
    type: string,
    channel: string,
    event: string,
    metadata: Record<string, any> = {}
  ): Promise<NotificationAnalyticsDocument> {
    try {
      const analytics = new this.analyticsModel({
        notificationId,
        userId,
        type,
        channel,
        event,
        timestamp: new Date(),
        metadata,
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress,
        deviceType: metadata.deviceType,
        location: metadata.location,
        errorCode: metadata.errorCode,
        errorMessage: metadata.errorMessage
      })

      return analytics.save()
    } catch (error) {
      this.logger.error(`Failed to track notification event: ${error.message}`)
      throw error
    }
  }

  async getNotificationStats(
    dateFrom?: Date,
    dateTo?: Date,
    type?: string,
    channel?: string
  ): Promise<any> {
    const matchStage: any = {}

    if (dateFrom || dateTo) {
      matchStage.timestamp = {}
      if (dateFrom) matchStage.timestamp.$gte = dateFrom
      if (dateTo) matchStage.timestamp.$lte = dateTo
    }

    if (type) matchStage.type = type
    if (channel) matchStage.channel = channel

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            type: '$type',
            channel: '$channel',
            event: '$event'
          },
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $addFields: {
          uniqueUserCount: { $size: '$uniqueUsers' }
        }
      },
      {
        $group: {
          _id: {
            type: '$_id.type',
            channel: '$_id.channel'
          },
          events: {
            $push: {
              event: '$_id.event',
              count: '$count',
              uniqueUsers: '$uniqueUserCount'
            }
          },
          totalEvents: { $sum: '$count' },
          totalUniqueUsers: { $sum: '$uniqueUserCount' }
        }
      }
    ]

    return this.analyticsModel.aggregate(pipeline).exec()
  }

  async getDeliveryRates(
    dateFrom?: Date,
    dateTo?: Date,
    type?: string,
    channel?: string
  ): Promise<any> {
    const matchStage: any = {}

    if (dateFrom || dateTo) {
      matchStage.timestamp = {}
      if (dateFrom) matchStage.timestamp.$gte = dateFrom
      if (dateTo) matchStage.timestamp.$lte = dateTo
    }

    if (type) matchStage.type = type
    if (channel) matchStage.channel = channel

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            type: '$type',
            channel: '$channel'
          },
          sent: {
            $sum: {
              $cond: [{ $eq: ['$event', 'sent'] }, 1, 0]
            }
          },
          delivered: {
            $sum: {
              $cond: [{ $eq: ['$event', 'delivered'] }, 1, 0]
            }
          },
          opened: {
            $sum: {
              $cond: [{ $eq: ['$event', 'opened'] }, 1, 0]
            }
          },
          clicked: {
            $sum: {
              $cond: [{ $eq: ['$event', 'clicked'] }, 1, 0]
            }
          },
          failed: {
            $sum: {
              $cond: [{ $eq: ['$event', 'failed'] }, 1, 0]
            }
          }
        }
      },
      {
        $addFields: {
          deliveryRate: {
            $cond: [
              { $gt: ['$sent', 0] },
              { $multiply: [{ $divide: ['$delivered', '$sent'] }, 100] },
              0
            ]
          },
          openRate: {
            $cond: [
              { $gt: ['$delivered', 0] },
              { $multiply: [{ $divide: ['$opened', '$delivered'] }, 100] },
              0
            ]
          },
          clickRate: {
            $cond: [
              { $gt: ['$opened', 0] },
              { $multiply: [{ $divide: ['$clicked', '$opened'] }, 100] },
              0
            ]
          },
          failureRate: {
            $cond: [
              { $gt: ['$sent', 0] },
              { $multiply: [{ $divide: ['$failed', '$sent'] }, 100] },
              0
            ]
          }
        }
      }
    ]

    return this.analyticsModel.aggregate(pipeline).exec()
  }

  async getUserEngagementStats(
    userId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<any> {
    const matchStage: any = {
      userId: new Types.ObjectId(userId)
    }

    if (dateFrom || dateTo) {
      matchStage.timestamp = {}
      if (dateFrom) matchStage.timestamp.$gte = dateFrom
      if (dateTo) matchStage.timestamp.$lte = dateTo
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$event',
          count: { $sum: 1 },
          types: { $addToSet: '$type' },
          channels: { $addToSet: '$channel' }
        }
      },
      {
        $group: {
          _id: null,
          events: {
            $push: {
              event: '$_id',
              count: '$count',
              types: '$types',
              channels: '$channels'
            }
          },
          totalEvents: { $sum: '$count' }
        }
      }
    ]

    const result = await this.analyticsModel.aggregate(pipeline).exec()
    return result[0] || { events: [], totalEvents: 0 }
  }

  async getChannelPerformance(
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<any> {
    const matchStage: any = {}

    if (dateFrom || dateTo) {
      matchStage.timestamp = {}
      if (dateFrom) matchStage.timestamp.$gte = dateFrom
      if (dateTo) matchStage.timestamp.$lte = dateTo
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$channel',
          sent: {
            $sum: {
              $cond: [{ $eq: ['$event', 'sent'] }, 1, 0]
            }
          },
          delivered: {
            $sum: {
              $cond: [{ $eq: ['$event', 'delivered'] }, 1, 0]
            }
          },
          opened: {
            $sum: {
              $cond: [{ $eq: ['$event', 'opened'] }, 1, 0]
            }
          },
          failed: {
            $sum: {
              $cond: [{ $eq: ['$event', 'failed'] }, 1, 0]
            }
          },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $addFields: {
          uniqueUserCount: { $size: '$uniqueUsers' },
          successRate: {
            $cond: [
              { $gt: ['$sent', 0] },
              { $multiply: [{ $divide: ['$delivered', '$sent'] }, 100] },
              0
            ]
          },
          engagementRate: {
            $cond: [
              { $gt: ['$delivered', 0] },
              { $multiply: [{ $divide: ['$opened', '$delivered'] }, 100] },
              0
            ]
          }
        }
      },
      {
        $project: {
          uniqueUsers: 0
        }
      }
    ]

    return this.analyticsModel.aggregate(pipeline).exec()
  }

  async getFailureAnalysis(
    dateFrom?: Date,
    dateTo?: Date,
    channel?: string
  ): Promise<any> {
    const matchStage: any = {
      event: 'failed'
    }

    if (dateFrom || dateTo) {
      matchStage.timestamp = {}
      if (dateFrom) matchStage.timestamp.$gte = dateFrom
      if (dateTo) matchStage.timestamp.$lte = dateTo
    }

    if (channel) matchStage.channel = channel

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            channel: '$channel',
            errorCode: '$errorCode',
            errorMessage: '$errorMessage'
          },
          count: { $sum: 1 },
          affectedUsers: { $addToSet: '$userId' }
        }
      },
      {
        $addFields: {
          affectedUserCount: { $size: '$affectedUsers' }
        }
      },
      {
        $sort: { count: -1 as any }
      },
      {
        $project: {
          affectedUsers: 0
        }
      }
    ]

    return this.analyticsModel.aggregate(pipeline).exec()
  }

  async cleanupOldAnalytics(daysToKeep: number = 90): Promise<void> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const result = await this.analyticsModel
      .deleteMany({
        timestamp: { $lt: cutoffDate }
      })
      .exec()

    this.logger.log(`Cleaned up ${result.deletedCount} old analytics records`)
  }
}