import { Injectable, Logger } from '@nestjs/common'
import * as AfricasTalking from 'africastalking'
import { NotificationDocument } from '../../../database/schemas/notification.schema'
import { NotificationAnalyticsService } from './notification-analytics.service'

@Injectable()
export class SmsNotificationService {
  private readonly logger = new Logger(SmsNotificationService.name)
  private smsClient: any

  constructor(
    private analyticsService: NotificationAnalyticsService,
  ) {
    this.initializeSmsClient()
  }

  private initializeSmsClient(): void {
    if (process.env.AFRICAS_TALKING_USERNAME && process.env.AFRICAS_TALKING_API_KEY) {
      const africasTalking = AfricasTalking({
        apiKey: process.env.AFRICAS_TALKING_API_KEY,
        username: process.env.AFRICAS_TALKING_USERNAME,
      })
      this.smsClient = africasTalking.SMS
    } else {
      this.logger.warn('Africa\'s Talking credentials not configured. SMS notifications will be simulated.')
    }
  }

  async sendNotification(
    notification: NotificationDocument,
    phoneNumber: string,
    countryCode: string = '+254'
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber, countryCode)
      const message = this.formatSmsMessage(notification)

      let result
      if (this.smsClient) {
        result = await this.smsClient.send({
          to: [formattedNumber],
          message,
          from: process.env.SMS_SENDER_ID || 'BettingApp',
        })
      } else {
        // Simulate SMS sending for development
        result = await this.simulateSmsDelivery(formattedNumber, message)
      }

      if (result.SMSMessageData?.Recipients?.[0]?.status === 'Success' || result.success) {
        const messageId = result.SMSMessageData?.Recipients?.[0]?.messageId || result.messageId

        // Track successful send
        await this.analyticsService.trackEvent(
          notification._id as any,
          notification.userId as any,
          notification.type,
          notification.channel,
          'sent',
          {
            messageId,
            phoneNumber: formattedNumber,
            messageLength: message.length,
          }
        )

        this.logger.log(`SMS sent successfully: ${messageId}`)
        return { success: true, messageId }
      } else {
        const error = result.SMSMessageData?.Recipients?.[0]?.status || result.error || 'Unknown error'
        
        // Track failure
        await this.analyticsService.trackEvent(
          notification._id as any,
          notification.userId as any,
          notification.type,
          notification.channel,
          'failed',
          {
            errorMessage: error,
            phoneNumber: formattedNumber,
          }
        )

        this.logger.error(`SMS sending failed: ${error}`)
        return { success: false, error }
      }
    } catch (error) {
      this.logger.error(`Failed to send SMS notification: ${error.message}`)

      // Track failure
      await this.analyticsService.trackEvent(
        notification._id as any,
        notification.userId as any,
        notification.type,
        notification.channel,
        'failed',
        {
          errorMessage: error.message,
          phoneNumber,
        }
      )

      return { success: false, error: error.message }
    }
  }

  async sendBulkNotifications(
    notifications: Array<{
      notification: NotificationDocument
      phoneNumber: string
      countryCode?: string
    }>
  ): Promise<Array<{ success: boolean; messageId?: string; error?: string }>> {
    const results = []

    // Process in batches to avoid rate limiting
    const batchSize = 10
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize)
      
      const batchPromises = batch.map(({ notification, phoneNumber, countryCode }) =>
        this.sendNotification(notification, phoneNumber, countryCode)
      )

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Add delay between batches
      if (i + batchSize < notifications.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return results
  }

  private formatSmsMessage(notification: NotificationDocument): string {
    // SMS messages should be concise (160 characters for single SMS)
    let message = notification.message

    // Add branding
    const brandName = process.env.BRAND_NAME || 'BettingApp'
    
    // Truncate if too long and add brand
    const maxLength = 140 // Leave space for brand
    if (message.length > maxLength) {
      message = message.substring(0, maxLength - 3) + '...'
    }

    // Add unsubscribe info for promotional messages
    if (notification.type === 'promotion') {
      message += ` Reply STOP to opt out.`
    }

    message += ` - ${brandName}`

    return message
  }

  private formatPhoneNumber(phoneNumber: string, countryCode: string): string {
    // Remove any non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '')
    
    // If number starts with 0, replace with country code
    if (cleaned.startsWith('0')) {
      cleaned = countryCode.replace('+', '') + cleaned.substring(1)
    }
    
    // If number doesn't start with country code, add it
    if (!cleaned.startsWith(countryCode.replace('+', ''))) {
      cleaned = countryCode.replace('+', '') + cleaned
    }

    return '+' + cleaned
  }

  private async simulateSmsDelivery(phoneNumber: string, message: string): Promise<any> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500))

    // Simulate 90% success rate
    const success = Math.random() > 0.1

    if (success) {
      return {
        success: true,
        messageId: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      }
    } else {
      return {
        success: false,
        error: 'Simulated delivery failure',
      }
    }
  }

  async checkDeliveryStatus(messageId: string): Promise<any> {
    if (!this.smsClient) {
      return { status: 'simulated', delivered: true }
    }

    try {
      // Note: Africa's Talking doesn't provide a direct delivery status check
      // You would typically handle delivery reports via webhooks
      return { status: 'unknown', message: 'Delivery status checking not implemented' }
    } catch (error) {
      this.logger.error(`Failed to check SMS delivery status: ${error.message}`)
      return { status: 'error', error: error.message }
    }
  }

  async handleDeliveryReport(data: any): Promise<void> {
    try {
      // Handle delivery reports from Africa's Talking webhook
      const { id: messageId, status, phoneNumber } = data

      if (status === 'Success') {
        // Find the notification by messageId and track delivery
        // This would require storing messageId in the notification record
        this.logger.log(`SMS delivered successfully: ${messageId}`)
      } else {
        this.logger.warn(`SMS delivery failed: ${messageId}, status: ${status}`)
      }
    } catch (error) {
      this.logger.error(`Failed to handle SMS delivery report: ${error.message}`)
    }
  }

  async getAccountBalance(): Promise<any> {
    if (!this.smsClient) {
      return { balance: 'N/A', currency: 'USD' }
    }

    try {
      // Note: This would require the Application service from Africa's Talking
      // const application = AfricasTalking.APPLICATION
      // return await application.fetchApplicationData()
      return { balance: 'Unknown', currency: 'USD' }
    } catch (error) {
      this.logger.error(`Failed to get SMS account balance: ${error.message}`)
      return { balance: 'Error', currency: 'USD' }
    }
  }
}