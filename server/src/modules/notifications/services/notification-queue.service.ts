import { Injectable, Logger } from '@nestjs/common'
import Redis from 'ioredis'
import { NotificationDocument } from '../../../database/schemas/notification.schema'

@Injectable()
export class NotificationQueueService {
  private readonly logger = new Logger(NotificationQueueService.name)
  private redis: Redis

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
    })
  }

  async addNotificationJob(
    notification: NotificationDocument,
    options: {
      delay?: number
      priority?: number
      attempts?: number
    } = {}
  ): Promise<void> {
    try {
      const job = {
        id: notification._id.toString(),
        type: 'send-notification',
        data: {
          notificationId: notification._id.toString(),
          userId: notification.userId.toString(),
          type: notification.type,
          channel: notification.channel,
          priority: notification.priority,
        },
        priority: this.getPriorityValue(notification.priority),
        attempts: options.attempts || notification.maxRetries || 3,
        createdAt: new Date().toISOString(),
        scheduledFor: notification.scheduledFor?.toISOString() || new Date().toISOString(),
      }

      const queueKey = `notifications:queue:${notification.channel}`
      const priorityScore = this.getPriorityValue(notification.priority)
      
      // Add to priority queue (sorted set)
      await this.redis.zadd(queueKey, priorityScore, JSON.stringify(job))
      
      // Add to processing queue if immediate
      if (!notification.scheduledFor || notification.scheduledFor <= new Date()) {
        await this.redis.lpush('notifications:processing', JSON.stringify(job))
      } else {
        // Add to delayed queue
        const delayScore = notification.scheduledFor.getTime()
        await this.redis.zadd('notifications:delayed', delayScore, JSON.stringify(job))
      }

      this.logger.log(`Notification job queued: ${notification._id}`)
    } catch (error) {
      this.logger.error(`Failed to queue notification: ${error.message}`)
      throw error
    }
  }

  async addBulkNotificationJobs(
    notifications: NotificationDocument[],
    options: {
      delay?: number
      priority?: number
      attempts?: number
    } = {}
  ): Promise<void> {
    const pipeline = this.redis.pipeline()

    for (const notification of notifications) {
      const job = {
        id: notification._id.toString(),
        type: 'send-notification',
        data: {
          notificationId: notification._id.toString(),
          userId: notification.userId.toString(),
          type: notification.type,
          channel: notification.channel,
          priority: notification.priority,
        },
        priority: this.getPriorityValue(notification.priority),
        attempts: options.attempts || notification.maxRetries || 3,
        createdAt: new Date().toISOString(),
        scheduledFor: notification.scheduledFor?.toISOString() || new Date().toISOString(),
      }

      const queueKey = `notifications:queue:${notification.channel}`
      const priorityScore = this.getPriorityValue(notification.priority)
      
      pipeline.zadd(queueKey, priorityScore, JSON.stringify(job))
      
      if (!notification.scheduledFor || notification.scheduledFor <= new Date()) {
        pipeline.lpush('notifications:processing', JSON.stringify(job))
      } else {
        const delayScore = notification.scheduledFor.getTime()
        pipeline.zadd('notifications:delayed', delayScore, JSON.stringify(job))
      }
    }

    await pipeline.exec()
    this.logger.log(`${notifications.length} notification jobs queued in bulk`)
  }

  async scheduleRecurringNotification(
    templateId: string,
    userId: string,
    cronExpression: string,
    templateData: Record<string, any> = {}
  ): Promise<void> {
    const job = {
      id: `recurring_${templateId}_${userId}`,
      type: 'recurring-notification',
      data: {
        templateId,
        userId,
        templateData,
      },
      cronExpression,
      createdAt: new Date().toISOString(),
    }

    await this.redis.hset('notifications:recurring', job.id, JSON.stringify(job))
    this.logger.log(`Recurring notification scheduled: ${templateId} for user ${userId}`)
  }

  async cancelScheduledNotification(jobId: string): Promise<void> {
    // Remove from delayed queue
    const delayedJobs = await this.redis.zrange('notifications:delayed', 0, -1)
    for (const jobStr of delayedJobs) {
      const job = JSON.parse(jobStr)
      if (job.id === jobId) {
        await this.redis.zrem('notifications:delayed', jobStr)
        this.logger.log(`Scheduled notification cancelled: ${jobId}`)
        return
      }
    }

    // Remove from recurring jobs
    await this.redis.hdel('notifications:recurring', jobId)
  }

  async retryFailedNotification(notificationId: string): Promise<void> {
    const job = {
      id: `retry_${notificationId}`,
      type: 'retry-notification',
      data: { notificationId },
      priority: this.getPriorityValue('high'),
      attempts: 1,
      createdAt: new Date().toISOString(),
    }

    await this.redis.lpush('notifications:processing', JSON.stringify(job))
    this.logger.log(`Retry job queued for notification: ${notificationId}`)
  }

  async getQueueStats(): Promise<any> {
    const [processing, delayed, failed, recurring] = await Promise.all([
      this.redis.llen('notifications:processing'),
      this.redis.zcard('notifications:delayed'),
      this.redis.llen('notifications:failed'),
      this.redis.hlen('notifications:recurring'),
    ])

    // Get channel-specific queues
    const channels = ['email', 'push', 'sms', 'in_app']
    const channelStats = {}
    
    for (const channel of channels) {
      const queueKey = `notifications:queue:${channel}`
      channelStats[channel] = await this.redis.zcard(queueKey)
    }

    return {
      processing,
      delayed,
      failed,
      recurring,
      channels: channelStats,
      total: processing + delayed + failed,
    }
  }

  async getFailedJobs(limit: number = 50): Promise<any[]> {
    const failedJobsStr = await this.redis.lrange('notifications:failed', 0, limit - 1)
    return failedJobsStr.map(jobStr => {
      try {
        return JSON.parse(jobStr)
      } catch (error) {
        this.logger.error(`Failed to parse failed job: ${error.message}`)
        return null
      }
    }).filter(job => job !== null)
  }

  async cleanupCompletedJobs(olderThanHours: number = 24): Promise<void> {
    const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000)
    
    // Clean up delayed jobs that are older than cutoff
    const removedDelayed = await this.redis.zremrangebyscore('notifications:delayed', 0, cutoffTime)
    
    // Clean up failed jobs (keep only recent ones)
    const failedJobs = await this.redis.lrange('notifications:failed', 0, -1)
    let removedFailed = 0
    
    for (const jobStr of failedJobs) {
      try {
        const job = JSON.parse(jobStr)
        const jobTime = new Date(job.createdAt).getTime()
        if (jobTime < cutoffTime) {
          await this.redis.lrem('notifications:failed', 1, jobStr)
          removedFailed++
        }
      } catch (error) {
        // Remove malformed jobs
        await this.redis.lrem('notifications:failed', 1, jobStr)
        removedFailed++
      }
    }
    
    this.logger.log(`Cleaned up ${removedDelayed + removedFailed} old jobs older than ${olderThanHours} hours`)
  }

  async pauseQueue(): Promise<void> {
    await this.redis.set('notifications:paused', '1')
    this.logger.log('Notification queue paused')
  }

  async resumeQueue(): Promise<void> {
    await this.redis.del('notifications:paused')
    this.logger.log('Notification queue resumed')
  }

  async isQueuePaused(): Promise<boolean> {
    const paused = await this.redis.get('notifications:paused')
    return paused === '1'
  }

  private getPriorityValue(priority: string): number {
    const priorityMap = {
      'low': 1,
      'medium': 5,
      'high': 10,
      'urgent': 20,
    }
    return priorityMap[priority] || 5
  }
}