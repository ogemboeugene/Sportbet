import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type NotificationDocument = Notification & Document

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId

  @Prop({ required: true })
  title: string

  @Prop({ required: true })
  message: string

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

  @Prop({ 
    enum: ['pending', 'sent', 'delivered', 'failed', 'read'],
    default: 'pending' 
  })
  status: string

  @Prop({ 
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium' 
  })
  priority: string

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>

  @Prop({ type: Object })
  templateData?: Record<string, any>

  @Prop()
  templateId?: string

  @Prop()
  scheduledFor?: Date

  @Prop()
  sentAt?: Date

  @Prop()
  deliveredAt?: Date

  @Prop()
  readAt?: Date

  @Prop()
  failureReason?: string

  @Prop({ default: 0 })
  retryCount: number

  @Prop({ default: 3 })
  maxRetries: number

  @Prop()
  externalId?: string

  @Prop({ default: false })
  isRead: boolean

  @Prop({ default: false })
  isArchived: boolean

  @Prop()
  expiresAt?: Date
}

export const NotificationSchema = SchemaFactory.createForClass(Notification)

// Indexes for performance
NotificationSchema.index({ userId: 1, createdAt: -1 })
NotificationSchema.index({ status: 1, scheduledFor: 1 })
NotificationSchema.index({ type: 1, channel: 1 })
NotificationSchema.index({ priority: 1, status: 1 })
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
NotificationSchema.index({ isRead: 1, isArchived: 1 })