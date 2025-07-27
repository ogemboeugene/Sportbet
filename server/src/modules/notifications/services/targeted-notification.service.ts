import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { Notification, NotificationDocument } from '../../../database/schemas/notification.schema'
import { User, UserDocument } from '../../../database/schemas/user.schema'
import { PushNotificationService } from './push-notification.service'
import { NotificationTemplateService } from './notification-template.service'
import { NotificationPreferenceService } from './notification-preference.service'

export interface BetSettlementNotificationData {
  betId: string
  betType: 'single' | 'multiple' | 'system'
  stake: number
  outcome: 'won' | 'lost' | 'void'
  winAmount?: number
  selections: Array<{
    eventName: string
    marketName: string
    selectionName: string
    odds: number
    outcome: 'won' | 'lost' | 'void'
  }>
}

export interface PromotionNotificationData {
  promotionId: string
  title: string
  description: string
  bonusAmount?: number
  bonusType?: 'deposit_match' | 'free_bet' | 'cashback' | 'loyalty'
  validUntil?: Date
  minDeposit?: number
  terms?: string
}

export interface SecurityAlertData {
  alertType: 'login_attempt' | 'password_change' | 'suspicious_activity' | 'account_locked'
  location?: string
  ipAddress?: string
  userAgent?: string
  timestamp: Date
  actionRequired?: boolean
}

@Injectable()
export class TargetedNotificationService {
  private readonly logger = new Logger(TargetedNotificationService.name)

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private pushNotificationService: PushNotificationService,
    private templateService: NotificationTemplateService,
    private preferenceService: NotificationPreferenceService,
  ) {}

  async sendBetSettlementNotification(
    userId: string,
    data: BetSettlementNotificationData
  ): Promise<void> {
    try {
      const user = await this.userModel.findById(userId)
      if (!user) {
        this.logger.error(`User not found: ${userId}`)
        return
      }

      // Check user preferences
      const preferences = await this.preferenceService.getUserPreferences(userId)
      if (!preferences.push || !preferences.betUpdates) {
        this.logger.log(`User ${userId} has disabled bet update notifications`)
        return
      }

      const notificationType = `bet_${data.outcome}`
      const template = await this.templateService.getTemplate(notificationType, 'push')
      
      if (!template) {
        this.logger.error(`Template not found for ${notificationType}`)
        return
      }

      const { title, message } = this.renderBetSettlementTemplate(template, data, user)

      const notification = new this.notificationModel({
        userId: new Types.ObjectId(userId),
        title,
        message,
        type: notificationType,
        channel: 'push',
        priority: data.outcome === 'won' ? 'high' : 'medium',
        metadata: {
          betId: data.betId,
          betType: data.betType,
          stake: data.stake,
          outcome: data.outcome,
          winAmount: data.winAmount,
          selectionsCount: data.selections.length,
        },
      })

      await notification.save()
      await this.pushNotificationService.sendNotificationToUser(notification, userId)

      this.logger.log(`Bet settlement notification sent to user ${userId} for bet ${data.betId}`)
    } catch (error) {
      this.logger.error(`Failed to send bet settlement notification: ${error.message}`)
    }
  }

  async sendPromotionNotification(
    userIds: string[],
    data: PromotionNotificationData
  ): Promise<void> {
    try {
      const users = await this.userModel.find({ _id: { $in: userIds.map(id => new Types.ObjectId(id)) } })
      const template = await this.templateService.getTemplate('promotion', 'push')
      
      if (!template) {
        this.logger.error('Promotion template not found')
        return
      }

      const notifications = []
      const userNotifications = []

      for (const user of users) {
        // Check user preferences
        const preferences = await this.preferenceService.getUserPreferences(user._id.toString())
        if (!preferences.push || !preferences.promotions) {
          continue
        }

        const { title, message } = this.renderPromotionTemplate(template, data, user)

        const notification = new this.notificationModel({
          userId: user._id,
          title,
          message,
          type: 'promotion',
          channel: 'push',
          priority: 'medium',
          metadata: {
            promotionId: data.promotionId,
            bonusAmount: data.bonusAmount,
            bonusType: data.bonusType,
            validUntil: data.validUntil,
            minDeposit: data.minDeposit,
          },
        })

        notifications.push(notification)
        userNotifications.push({
          notification,
          userId: user._id.toString(),
        })
      }

      if (notifications.length === 0) {
        this.logger.log('No users eligible for promotion notification')
        return
      }

      await this.notificationModel.insertMany(notifications)
      await this.pushNotificationService.sendBulkNotificationsToUsers(userNotifications)

      this.logger.log(`Promotion notification sent to ${notifications.length} users`)
    } catch (error) {
      this.logger.error(`Failed to send promotion notification: ${error.message}`)
    }
  }

  async sendSecurityAlert(
    userId: string,
    data: SecurityAlertData
  ): Promise<void> {
    try {
      const user = await this.userModel.findById(userId)
      if (!user) {
        this.logger.error(`User not found: ${userId}`)
        return
      }

      // Security alerts are always sent regardless of preferences
      const template = await this.templateService.getTemplate('security_alert', 'push')
      
      if (!template) {
        this.logger.error('Security alert template not found')
        return
      }

      const { title, message } = this.renderSecurityAlertTemplate(template, data, user)

      const notification = new this.notificationModel({
        userId: new Types.ObjectId(userId),
        title,
        message,
        type: 'security_alert',
        channel: 'push',
        priority: 'urgent',
        metadata: {
          alertType: data.alertType,
          location: data.location,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          timestamp: data.timestamp,
          actionRequired: data.actionRequired,
        },
      })

      await notification.save()
      await this.pushNotificationService.sendNotificationToUser(notification, userId)

      this.logger.log(`Security alert sent to user ${userId} for ${data.alertType}`)
    } catch (error) {
      this.logger.error(`Failed to send security alert: ${error.message}`)
    }
  }

  async sendDepositSuccessNotification(
    userId: string,
    amount: number,
    currency: string,
    paymentMethod: string
  ): Promise<void> {
    try {
      const user = await this.userModel.findById(userId)
      if (!user) return

      const preferences = await this.preferenceService.getUserPreferences(userId)
      if (!preferences.push || !preferences.financial) return

      const template = await this.templateService.getTemplate('deposit_success', 'push')
      if (!template) return

      const templateData = {
        firstName: user.profile.firstName,
        amount: amount.toFixed(2),
        currency,
        paymentMethod,
      }

      const title = this.renderTemplate(template.title, templateData)
      const message = this.renderTemplate(template.content, templateData)

      const notification = new this.notificationModel({
        userId: new Types.ObjectId(userId),
        title,
        message,
        type: 'deposit_success',
        channel: 'push',
        priority: 'medium',
        metadata: {
          amount,
          currency,
          paymentMethod,
        },
      })

      await notification.save()
      await this.pushNotificationService.sendNotificationToUser(notification, userId)
    } catch (error) {
      this.logger.error(`Failed to send deposit success notification: ${error.message}`)
    }
  }

  async sendWithdrawalSuccessNotification(
    userId: string,
    amount: number,
    currency: string,
    paymentMethod: string
  ): Promise<void> {
    try {
      const user = await this.userModel.findById(userId)
      if (!user) return

      const preferences = await this.preferenceService.getUserPreferences(userId)
      if (!preferences.push || !preferences.financial) return

      const template = await this.templateService.getTemplate('withdrawal_success', 'push')
      if (!template) return

      const templateData = {
        firstName: user.profile.firstName,
        amount: amount.toFixed(2),
        currency,
        paymentMethod,
      }

      const title = this.renderTemplate(template.title, templateData)
      const message = this.renderTemplate(template.content, templateData)

      const notification = new this.notificationModel({
        userId: new Types.ObjectId(userId),
        title,
        message,
        type: 'withdrawal_success',
        channel: 'push',
        priority: 'medium',
        metadata: {
          amount,
          currency,
          paymentMethod,
        },
      })

      await notification.save()
      await this.pushNotificationService.sendNotificationToUser(notification, userId)
    } catch (error) {
      this.logger.error(`Failed to send withdrawal success notification: ${error.message}`)
    }
  }

  private renderBetSettlementTemplate(
    template: any,
    data: BetSettlementNotificationData,
    user: UserDocument
  ): { title: string; message: string } {
    const templateData = {
      firstName: user.profile.firstName,
      betId: data.betId,
      stake: data.stake.toFixed(2),
      currency: user.preferences.currency,
      winAmount: data.winAmount?.toFixed(2) || '0.00',
      selectionsCount: data.selections.length,
      outcome: data.outcome,
      eventName: data.selections[0]?.eventName || 'Multiple Events',
    }

    return {
      title: this.renderTemplate(template.title, templateData),
      message: this.renderTemplate(template.content, templateData),
    }
  }

  private renderPromotionTemplate(
    template: any,
    data: PromotionNotificationData,
    user: UserDocument
  ): { title: string; message: string } {
    const templateData = {
      firstName: user.profile.firstName,
      promotionTitle: data.title,
      description: data.description,
      bonusAmount: data.bonusAmount?.toFixed(2) || '0.00',
      currency: user.preferences.currency,
      validUntil: data.validUntil?.toLocaleDateString() || 'Limited time',
      minDeposit: data.minDeposit?.toFixed(2) || '0.00',
    }

    return {
      title: this.renderTemplate(template.title, templateData),
      message: this.renderTemplate(template.content, templateData),
    }
  }

  private renderSecurityAlertTemplate(
    template: any,
    data: SecurityAlertData,
    user: UserDocument
  ): { title: string; message: string } {
    const templateData = {
      firstName: user.profile.firstName,
      alertType: data.alertType.replace('_', ' '),
      location: data.location || 'Unknown location',
      timestamp: data.timestamp.toLocaleString(),
      actionRequired: data.actionRequired ? 'Action required' : 'No action required',
    }

    return {
      title: this.renderTemplate(template.title, templateData),
      message: this.renderTemplate(template.content, templateData),
    }
  }

  private renderTemplate(template: string, data: Record<string, any>): string {
    let rendered = template
    
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{{${key}}}`
      rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value))
    }
    
    return rendered
  }
}