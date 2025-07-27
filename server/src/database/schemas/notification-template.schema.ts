import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type NotificationTemplateDocument = NotificationTemplate & Document

@Schema({ timestamps: true })
export class NotificationTemplate {
  @Prop({ required: true, unique: true })
  templateId: string

  @Prop({ required: true })
  name: string

  @Prop()
  description?: string

  @Prop({ 
    enum: [
      'bet_placed', 'bet_won', 'bet_lost', 'bet_void', 'bet_cashout',
      'deposit_success', 'deposit_failed', 'withdrawal_success', 'withdrawal_failed',
      'kyc_approved', 'kyc_rejected', 'kyc_pending',
      'security_alert', 'login_alert', 'password_changed',
      'limit_warning', 'session_timeout', 'self_exclusion',
      'promotion', 'bonus_awarded', 'system_maintenance',
      'account_suspended', 'account_verified'
    ],
    required: true 
  })
  type: string

  @Prop({ 
    enum: ['email', 'push', 'sms', 'in_app'],
    required: true 
  })
  channel: string

  @Prop({ required: true })
  subject: string

  @Prop()
  title: string

  @Prop({ required: true })
  content: string

  @Prop()
  htmlContent?: string

  @Prop({ type: [String], default: [] })
  variables: string[]

  @Prop({ 
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium' 
  })
  defaultPriority: string

  @Prop({ default: true })
  isActive: boolean

  @Prop()
  version: string

  @Prop({ type: Object, default: {} })
  settings: {
    retryAttempts?: number
    retryDelay?: number
    expiryHours?: number
    requiresAuth?: boolean
  }

  @Prop()
  createdBy?: string

  @Prop()
  lastModifiedBy?: string
}

export const NotificationTemplateSchema = SchemaFactory.createForClass(NotificationTemplate)

// Indexes for performance
NotificationTemplateSchema.index({ type: 1, channel: 1 })
NotificationTemplateSchema.index({ isActive: 1 })