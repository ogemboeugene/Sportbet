import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { 
  NotificationPreference, 
  NotificationPreferenceDocument 
} from '../../../database/schemas/notification-preference.schema'

@Injectable()
export class NotificationPreferenceService {
  private readonly logger = new Logger(NotificationPreferenceService.name)

  constructor(
    @InjectModel(NotificationPreference.name)
    private preferenceModel: Model<NotificationPreferenceDocument>,
  ) {}

  async getUserPreferences(userId: string): Promise<NotificationPreferenceDocument> {
    let preferences = await this.preferenceModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec()

    if (!preferences) {
      preferences = await this.createDefaultPreferences(userId) as any
    }

    return preferences
  }

  async updatePreferences(
    userId: string,
    updates: Partial<NotificationPreference>
  ): Promise<NotificationPreferenceDocument> {
    return this.preferenceModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        updates,
        { new: true, upsert: true }
      )
      .exec()
  }

  async updateGlobalSettings(
    userId: string,
    globalSettings: {
      email?: boolean
      push?: boolean
      sms?: boolean
      in_app?: boolean
    }
  ): Promise<NotificationPreferenceDocument> {
    const preferences = await this.getUserPreferences(userId)
    
    // Merge with existing settings
    const updatedGlobalSettings = {
      ...preferences.globalSettings,
      ...globalSettings
    }
    
    return this.updatePreferences(userId, { globalSettings: updatedGlobalSettings })
  }

  async updateTypePreference(
    userId: string,
    type: string,
    channelPreferences: {
      email?: boolean
      push?: boolean
      sms?: boolean
      in_app?: boolean
    }
  ): Promise<NotificationPreferenceDocument> {
    const preferences = await this.getUserPreferences(userId)
    
    preferences.preferences[type] = {
      ...preferences.preferences[type],
      ...channelPreferences
    }

    return preferences.save()
  }

  async muteNotificationType(userId: string, type: string): Promise<NotificationPreferenceDocument> {
    const preferences = await this.getUserPreferences(userId)
    
    if (!preferences.mutedTypes.includes(type)) {
      preferences.mutedTypes.push(type)
      await preferences.save()
    }

    return preferences
  }

  async unmuteNotificationType(userId: string, type: string): Promise<NotificationPreferenceDocument> {
    const preferences = await this.getUserPreferences(userId)
    
    preferences.mutedTypes = preferences.mutedTypes.filter(t => t !== type)
    await preferences.save()

    return preferences
  }

  async updateQuietHours(
    userId: string,
    quietHours: {
      start: string
      end: string
      timezone: string
    }
  ): Promise<NotificationPreferenceDocument> {
    return this.updatePreferences(userId, { quietHours })
  }

  async updateUrgentChannels(
    userId: string,
    urgentChannels: string[]
  ): Promise<NotificationPreferenceDocument> {
    return this.updatePreferences(userId, { urgentChannels })
  }

  async isNotificationAllowed(
    userId: string,
    type: string,
    channel: string,
    priority: string = 'medium'
  ): Promise<boolean> {
    try {
      const preferences = await this.getUserPreferences(userId)

      // Check global settings
      if (!preferences.globalSettings[channel]) {
        return false
      }

      // Check if type is muted
      if (preferences.mutedTypes.includes(type)) {
        return false
      }

      // Check specific type preferences
      const typePrefs = preferences.preferences[type]
      if (!typePrefs || !typePrefs[channel]) {
        return false
      }

      // Check quiet hours for non-urgent notifications
      if (priority !== 'urgent' && this.isInQuietHours(preferences.quietHours)) {
        const urgentChannels = preferences.urgentChannels || []
        if (!urgentChannels.includes(channel)) {
          return false
        }
      }

      return true
    } catch (error) {
      this.logger.error(`Error checking notification permission: ${error.message}`)
      return false
    }
  }

  async getPreferredChannels(userId: string, type: string): Promise<string[]> {
    const preferences = await this.getUserPreferences(userId)
    const typePrefs = preferences.preferences[type]
    const globalSettings = preferences.globalSettings
    
    if (!typePrefs) return []

    const channels = []
    
    if (typePrefs.push && globalSettings.push) channels.push('push')
    if (typePrefs.email && globalSettings.email) channels.push('email')
    if (typePrefs.in_app && globalSettings.in_app) channels.push('in_app')
    if (typePrefs.sms && globalSettings.sms) channels.push('sms')

    return channels
  }

  async createDefaultPreferences(userId: string): Promise<NotificationPreferenceDocument> {
    const defaultPreferences = new this.preferenceModel({
      userId: new Types.ObjectId(userId)
    })

    return defaultPreferences.save()
  }

  async deleteUserPreferences(userId: string): Promise<void> {
    await this.preferenceModel
      .deleteOne({ userId: new Types.ObjectId(userId) })
      .exec()
  }

  private isInQuietHours(quietHours: any): boolean {
    if (!quietHours) return false

    try {
      const now = new Date()
      const currentTime = now.toTimeString().slice(0, 5) // HH:MM format
      
      // Simple time comparison (doesn't handle timezone conversion)
      return currentTime >= quietHours.start && currentTime <= quietHours.end
    } catch (error) {
      this.logger.error(`Error checking quiet hours: ${error.message}`)
      return false
    }
  }
}