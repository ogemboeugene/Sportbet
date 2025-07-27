import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type NotificationPreferenceDocument = NotificationPreference & Document & {
  push: boolean;
  betUpdates: boolean;
  promotions: boolean;
  financial: boolean;
}

@Schema({ timestamps: true })
export class NotificationPreference {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId

  @Prop({ type: Object, default: () => ({
    bet_placed: { email: true, push: true, sms: false, in_app: true },
    bet_won: { email: true, push: true, sms: true, in_app: true },
    bet_lost: { email: false, push: true, sms: false, in_app: true },
    bet_void: { email: true, push: true, sms: false, in_app: true },
    bet_cashout: { email: true, push: true, sms: false, in_app: true },
    deposit_success: { email: true, push: true, sms: true, in_app: true },
    deposit_failed: { email: true, push: true, sms: true, in_app: true },
    withdrawal_success: { email: true, push: true, sms: true, in_app: true },
    withdrawal_failed: { email: true, push: true, sms: true, in_app: true },
    kyc_approved: { email: true, push: true, sms: true, in_app: true },
    kyc_rejected: { email: true, push: true, sms: true, in_app: true },
    kyc_pending: { email: true, push: true, sms: false, in_app: true },
    security_alert: { email: true, push: true, sms: true, in_app: true },
    login_alert: { email: true, push: false, sms: false, in_app: false },
    password_changed: { email: true, push: true, sms: true, in_app: true },
    limit_warning: { email: true, push: true, sms: false, in_app: true },
    session_timeout: { email: false, push: true, sms: false, in_app: true },
    self_exclusion: { email: true, push: true, sms: true, in_app: true },
    promotion: { email: true, push: true, sms: false, in_app: true },
    bonus_awarded: { email: true, push: true, sms: false, in_app: true },
    system_maintenance: { email: true, push: true, sms: false, in_app: true },
    account_suspended: { email: true, push: true, sms: true, in_app: true },
    account_verified: { email: true, push: true, sms: true, in_app: true }
  }) })
  preferences: Record<string, {
    email: boolean
    push: boolean
    sms: boolean
    in_app: boolean
  }>

  @Prop({ type: Object, default: () => ({
    email: true,
    push: true,
    sms: false,
    in_app: true
  }) })
  globalSettings: {
    email: boolean
    push: boolean
    sms: boolean
    in_app: boolean
  }

  @Prop({ type: [String], default: [] })
  mutedTypes: string[]

  @Prop({ type: Object, default: () => ({
    start: '09:00',
    end: '22:00',
    timezone: 'UTC'
  }) })
  quietHours: {
    start: string
    end: string
    timezone: string
  }

  @Prop({ type: [String], default: ['email'] })
  urgentChannels: string[]

  @Prop()
  language?: string

  @Prop()
  timezone?: string
}

export const NotificationPreferenceSchema = SchemaFactory.createForClass(NotificationPreference)

// No additional indexes needed - userId already has unique: true which creates an index