import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { JwtService } from '@nestjs/jwt'
import { NotificationPreferenceService } from './notification-preference.service'
import { NotificationAnalyticsService } from './notification-analytics.service'
import { User, UserDocument } from '../../../database/schemas/user.schema'

interface UnsubscribeToken {
  userId: string
  email: string
  timestamp: number
  type?: string // specific notification type to unsubscribe from
}

export interface UnsubscribeResult {
  success: boolean
  message: string
  userEmail?: string
  unsubscribedTypes?: string[]
}

@Injectable()
export class UnsubscribeService {
  private readonly logger = new Logger(UnsubscribeService.name)

  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private preferenceService: NotificationPreferenceService,
    private analyticsService: NotificationAnalyticsService,
  ) {}

  generateUnsubscribeToken(userId: string, email: string, type?: string): string {
    const payload: UnsubscribeToken = {
      userId,
      email,
      timestamp: Date.now(),
      type
    }

    // Use JWT for secure token generation
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET + '_unsubscribe',
      expiresIn: '30d' // Unsubscribe links valid for 30 days
    })
  }

  async validateUnsubscribeToken(token: string): Promise<UnsubscribeToken> {
    try {
      const decoded = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET + '_unsubscribe'
      }) as UnsubscribeToken

      // Verify user still exists
      const user = await this.userModel.findById(decoded.userId).exec()
      if (!user) {
        throw new Error('User not found')
      }

      // Verify email matches
      if (user.email !== decoded.email) {
        throw new Error('Email mismatch')
      }

      return decoded
    } catch (error) {
      this.logger.error(`Invalid unsubscribe token: ${error.message}`)
      throw new Error('Invalid or expired unsubscribe token')
    }
  }

  async unsubscribeFromAll(token: string): Promise<UnsubscribeResult> {
    try {
      const decoded = await this.validateUnsubscribeToken(token)
      
      // Disable all email notifications
      await this.preferenceService.updateGlobalSettings(decoded.userId, {
        email: false
      })

      // Track unsubscribe event
      await this.analyticsService.trackEvent(
        null,
        decoded.userId as any,
        'unsubscribe',
        'email',
        'unsubscribed_all',
        {
          email: decoded.email,
          timestamp: new Date()
        }
      )

      this.logger.log(`User unsubscribed from all emails: ${decoded.email}`)

      return {
        success: true,
        message: 'Successfully unsubscribed from all email notifications',
        userEmail: decoded.email,
        unsubscribedTypes: ['all']
      }
    } catch (error) {
      this.logger.error(`Unsubscribe failed: ${error.message}`)
      return {
        success: false,
        message: error.message
      }
    }
  }

  async unsubscribeFromType(token: string, notificationType: string): Promise<UnsubscribeResult> {
    try {
      const decoded = await this.validateUnsubscribeToken(token)
      
      // Disable specific notification type for email
      await this.preferenceService.updateTypePreference(decoded.userId, notificationType, {
        email: false
      })

      // Track unsubscribe event
      await this.analyticsService.trackEvent(
        null,
        decoded.userId as any,
        'unsubscribe',
        'email',
        'unsubscribed_type',
        {
          email: decoded.email,
          notificationType,
          timestamp: new Date()
        }
      )

      this.logger.log(`User unsubscribed from ${notificationType} emails: ${decoded.email}`)

      return {
        success: true,
        message: `Successfully unsubscribed from ${notificationType} email notifications`,
        userEmail: decoded.email,
        unsubscribedTypes: [notificationType]
      }
    } catch (error) {
      this.logger.error(`Type-specific unsubscribe failed: ${error.message}`)
      return {
        success: false,
        message: error.message
      }
    }
  }

  async resubscribe(token: string, notificationTypes?: string[]): Promise<UnsubscribeResult> {
    try {
      const decoded = await this.validateUnsubscribeToken(token)
      
      if (notificationTypes && notificationTypes.length > 0) {
        // Re-enable specific notification types
        for (const type of notificationTypes) {
          await this.preferenceService.updateTypePreference(decoded.userId, type, {
            email: true
          })
        }

        // Track resubscribe event
        await this.analyticsService.trackEvent(
          null,
          decoded.userId as any,
          'resubscribe',
          'email',
          'resubscribed_types',
          {
            email: decoded.email,
            notificationTypes,
            timestamp: new Date()
          }
        )

        return {
          success: true,
          message: `Successfully resubscribed to ${notificationTypes.join(', ')} email notifications`,
          userEmail: decoded.email,
          unsubscribedTypes: notificationTypes
        }
      } else {
        // Re-enable all email notifications
        await this.preferenceService.updateGlobalSettings(decoded.userId, {
          email: true
        })

        // Track resubscribe event
        await this.analyticsService.trackEvent(
          null,
          decoded.userId as any,
          'resubscribe',
          'email',
          'resubscribed_all',
          {
            email: decoded.email,
            timestamp: new Date()
          }
        )

        return {
          success: true,
          message: 'Successfully resubscribed to all email notifications',
          userEmail: decoded.email,
          unsubscribedTypes: ['all']
        }
      }
    } catch (error) {
      this.logger.error(`Resubscribe failed: ${error.message}`)
      return {
        success: false,
        message: error.message
      }
    }
  }

  async getUnsubscribePreferences(token: string): Promise<{
    success: boolean
    userEmail?: string
    preferences?: any
    availableTypes?: string[]
  }> {
    try {
      const decoded = await this.validateUnsubscribeToken(token)
      
      const preferences = await this.preferenceService.getUserPreferences(decoded.userId)
      
      const availableTypes = [
        'bet_placed',
        'bet_won',
        'bet_lost',
        'deposit_success',
        'withdrawal_success',
        'kyc_approved',
        'kyc_rejected',
        'security_alert',
        'password_changed',
        'limit_warning',
        'promotion',
        'welcome'
      ]

      return {
        success: true,
        userEmail: decoded.email,
        preferences: preferences.preferences,
        availableTypes
      }
    } catch (error) {
      this.logger.error(`Failed to get unsubscribe preferences: ${error.message}`)
      return {
        success: false
      }
    }
  }

  async updateUnsubscribePreferences(
    token: string, 
    preferences: Record<string, { email: boolean }>
  ): Promise<UnsubscribeResult> {
    try {
      const decoded = await this.validateUnsubscribeToken(token)
      
      // Update each notification type preference
      const updatedTypes = []
      for (const [type, prefs] of Object.entries(preferences)) {
        await this.preferenceService.updateTypePreference(decoded.userId, type, prefs)
        if (!prefs.email) {
          updatedTypes.push(type)
        }
      }

      // Track preference update
      await this.analyticsService.trackEvent(
        null,
        decoded.userId as any,
        'unsubscribe',
        'email',
        'preferences_updated',
        {
          email: decoded.email,
          updatedTypes,
          timestamp: new Date()
        }
      )

      return {
        success: true,
        message: 'Email preferences updated successfully',
        userEmail: decoded.email,
        unsubscribedTypes: updatedTypes
      }
    } catch (error) {
      this.logger.error(`Failed to update unsubscribe preferences: ${error.message}`)
      return {
        success: false,
        message: error.message
      }
    }
  }

  async getUnsubscribeStats(dateFrom?: Date, dateTo?: Date): Promise<any> {
    const matchStage: any = {
      event: { $in: ['unsubscribed_all', 'unsubscribed_type', 'resubscribed_all', 'resubscribed_types'] }
    }

    if (dateFrom || dateTo) {
      matchStage.timestamp = {}
      if (dateFrom) matchStage.timestamp.$gte = dateFrom
      if (dateTo) matchStage.timestamp.$lte = dateTo
    }

    return this.analyticsService.getNotificationStats(dateFrom, dateTo, 'unsubscribe', 'email')
  }

  generateUnsubscribeUrl(userId: string, email: string, type?: string): string {
    const token = this.generateUnsubscribeToken(userId, email, type)
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000'
    
    if (type) {
      return `${baseUrl}/unsubscribe?token=${token}&type=${type}`
    }
    
    return `${baseUrl}/unsubscribe?token=${token}`
  }

  generateOneClickUnsubscribeHeaders(userId: string, email: string): Record<string, string> {
    const token = this.generateUnsubscribeToken(userId, email)
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000'
    
    return {
      'List-Unsubscribe': `<${baseUrl}/unsubscribe?token=${token}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
    }
  }
}