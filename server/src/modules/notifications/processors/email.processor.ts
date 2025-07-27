import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { EmailNotificationService } from '../services/email-notification.service'
import { NotificationAnalyticsService } from '../services/notification-analytics.service'
import { NotificationPreferenceService } from '../services/notification-preference.service'
import { 
  Notification, 
  NotificationDocument 
} from '../../../database/schemas/notification.schema'
import { User, UserDocument } from '../../../database/schemas/user.schema'

interface EmailJobData {
  notificationId: string
  userId: string
  recipientEmail: string
  recipientName?: string
  retryCount?: number
  maxRetries?: number
  scheduledFor?: Date
}

@Injectable()
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name)
  private readonly maxRetries = 3
  private readonly retryDelays = [5000, 15000, 60000] // 5s, 15s, 1m
  private isProcessing = false
  private emailQueue: EmailJobData[] = []

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private emailService: EmailNotificationService,
    private analyticsService: NotificationAnalyticsService,
    private preferenceService: NotificationPreferenceService,
  ) {
    this.startProcessor()
  }

  async queueEmail(jobData: EmailJobData): Promise<void> {
    // Check if user allows email notifications
    const isAllowed = await this.preferenceService.isNotificationAllowed(
      jobData.userId,
      'email',
      'email'
    )

    if (!isAllowed) {
      this.logger.log(`Email notification blocked by user preferences: ${jobData.notificationId}`)
      return
    }

    this.emailQueue.push({
      ...jobData,
      retryCount: jobData.retryCount || 0,
      maxRetries: jobData.maxRetries || this.maxRetries
    })

    this.logger.log(`Email queued: ${jobData.notificationId}`)
    
    if (!this.isProcessing) {
      this.processQueue()
    }
  }

  async queueBulkEmails(jobs: EmailJobData[]): Promise<void> {
    const validJobs = []

    for (const job of jobs) {
      const isAllowed = await this.preferenceService.isNotificationAllowed(
        job.userId,
        'email',
        'email'
      )

      if (isAllowed) {
        validJobs.push({
          ...job,
          retryCount: job.retryCount || 0,
          maxRetries: job.maxRetries || this.maxRetries
        })
      }
    }

    this.emailQueue.push(...validJobs)
    this.logger.log(`${validJobs.length} emails queued in bulk`)

    if (!this.isProcessing) {
      this.processQueue()
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.emailQueue.length === 0) {
      return
    }

    this.isProcessing = true
    this.logger.log(`Processing email queue: ${this.emailQueue.length} jobs`)

    while (this.emailQueue.length > 0) {
      const job = this.emailQueue.shift()
      if (!job) continue

      try {
        // Check if job is scheduled for future
        if (job.scheduledFor && job.scheduledFor > new Date()) {
          // Re-queue for later
          setTimeout(() => {
            this.emailQueue.unshift(job)
          }, job.scheduledFor.getTime() - Date.now())
          continue
        }

        await this.processEmailJob(job)
        
        // Rate limiting - wait between emails
        await this.delay(200)
      } catch (error) {
        this.logger.error(`Failed to process email job: ${error.message}`)
        await this.handleJobFailure(job, error)
      }
    }

    this.isProcessing = false
  }

  private async processEmailJob(job: EmailJobData): Promise<void> {
    try {
      // Get notification from database
      const notification = await this.notificationModel
        .findById(job.notificationId)
        .exec()

      if (!notification) {
        throw new Error(`Notification not found: ${job.notificationId}`)
      }

      // Get user details if not provided
      let recipientName = job.recipientName
      let recipientEmail = job.recipientEmail

      if (!recipientEmail) {
        const user = await this.userModel.findById(job.userId).exec()
        if (!user) {
          throw new Error(`User not found: ${job.userId}`)
        }
        recipientEmail = user.email
        recipientName = recipientName || `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim()
      }

      // Send email
      const result = await this.emailService.sendNotification(
        notification,
        recipientEmail,
        recipientName
      )

      if (!result.success) {
        throw new Error(result.error || 'Email sending failed')
      }

      // Update notification status
      await this.notificationModel
        .findByIdAndUpdate(job.notificationId, {
          status: 'sent',
          sentAt: new Date(),
          deliveryStatus: {
            email: {
              sent: true,
              sentAt: new Date(),
              messageId: result.messageId
            }
          }
        })
        .exec()

      this.logger.log(`Email sent successfully: ${job.notificationId}`)
    } catch (error) {
      throw error
    }
  }

  private async handleJobFailure(job: EmailJobData, error: Error): Promise<void> {
    job.retryCount = (job.retryCount || 0) + 1

    // Track failure
    await this.analyticsService.trackEvent(
      job.notificationId as any,
      job.userId as any,
      'email',
      'email',
      'failed',
      {
        errorMessage: error.message,
        retryCount: job.retryCount,
        maxRetries: job.maxRetries
      }
    )

    if (job.retryCount < job.maxRetries) {
      // Schedule retry
      const retryDelay = this.retryDelays[job.retryCount - 1] || this.retryDelays[this.retryDelays.length - 1]
      
      setTimeout(() => {
        this.emailQueue.push(job)
        this.logger.log(`Email job scheduled for retry ${job.retryCount}/${job.maxRetries}: ${job.notificationId}`)
      }, retryDelay)
    } else {
      // Final failure
      this.logger.error(`Email job failed permanently: ${job.notificationId}`)
      
      // Update notification status
      await this.notificationModel
        .findByIdAndUpdate(job.notificationId, {
          status: 'failed',
          failedAt: new Date(),
          deliveryStatus: {
            email: {
              sent: false,
              failed: true,
              failedAt: new Date(),
              error: error.message,
              retryCount: job.retryCount
            }
          }
        })
        .exec()

      // Track final failure
      await this.analyticsService.trackEvent(
        job.notificationId as any,
        job.userId as any,
        'email',
        'email',
        'failed',
        {
          errorMessage: error.message,
          finalFailure: true,
          retryCount: job.retryCount
        }
      )
    }
  }

  async retryFailedEmail(notificationId: string): Promise<void> {
    try {
      const notification = await this.notificationModel
        .findById(notificationId)
        .exec()

      if (!notification) {
        throw new Error(`Notification not found: ${notificationId}`)
      }

      const user = await this.userModel.findById(notification.userId).exec()
      if (!user) {
        throw new Error(`User not found: ${notification.userId}`)
      }

      const job: EmailJobData = {
        notificationId: notification._id.toString(),
        userId: notification.userId.toString(),
        recipientEmail: user.email,
        recipientName: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim(),
        retryCount: 0,
        maxRetries: this.maxRetries
      }

      await this.queueEmail(job)
      this.logger.log(`Email retry queued: ${notificationId}`)
    } catch (error) {
      this.logger.error(`Failed to queue email retry: ${error.message}`)
      throw error
    }
  }

  async getQueueStats(): Promise<{
    pending: number
    processing: boolean
    totalProcessed: number
    totalFailed: number
  }> {
    const totalProcessed = await this.notificationModel
      .countDocuments({
        channel: 'email',
        status: 'sent'
      })
      .exec()

    const totalFailed = await this.notificationModel
      .countDocuments({
        channel: 'email',
        status: 'failed'
      })
      .exec()

    return {
      pending: this.emailQueue.length,
      processing: this.isProcessing,
      totalProcessed,
      totalFailed
    }
  }

  async pauseQueue(): Promise<void> {
    this.isProcessing = false
    this.logger.log('Email queue paused')
  }

  async resumeQueue(): Promise<void> {
    if (!this.isProcessing && this.emailQueue.length > 0) {
      this.processQueue()
      this.logger.log('Email queue resumed')
    }
  }

  async clearQueue(): Promise<number> {
    const count = this.emailQueue.length
    this.emailQueue = []
    this.logger.log(`Email queue cleared: ${count} jobs removed`)
    return count
  }

  private startProcessor(): void {
    // Process queue every 30 seconds
    setInterval(() => {
      if (!this.isProcessing && this.emailQueue.length > 0) {
        this.processQueue()
      }
    }, 30000)

    // Cleanup old failed notifications every hour
    setInterval(async () => {
      try {
        const cutoffDate = new Date()
        cutoffDate.setHours(cutoffDate.getHours() - 24)

        const result = await this.notificationModel
          .deleteMany({
            channel: 'email',
            status: 'failed',
            failedAt: { $lt: cutoffDate }
          })
          .exec()

        if (result.deletedCount > 0) {
          this.logger.log(`Cleaned up ${result.deletedCount} old failed email notifications`)
        }
      } catch (error) {
        this.logger.error(`Failed to cleanup old notifications: ${error.message}`)
      }
    }, 3600000) // 1 hour
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}