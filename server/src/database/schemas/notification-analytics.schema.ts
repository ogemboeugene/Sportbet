import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type NotificationAnalyticsDocument = NotificationAnalytics & Document

@Schema({ timestamps: true })
export class NotificationAnalytics {
  @Prop({ type: Types.ObjectId, ref: 'Notification', required: true })
  notificationId: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId

  @Prop({ required: true })
  notificationType: string

  @Prop({ 
    enum: ['email', 'push', 'sms', 'in_app'],
    required: true 
  })
  channel: string

  @Prop({ 
    enum: ['sent', 'delivered', 'read', 'clicked', 'failed', 'bounced'],
    required: true 
  })
  event: string

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>

  @Prop()
  deviceToken?: string

  @Prop()
  userAgent?: string

  @Prop()
  ipAddress?: string

  @Prop()
  errorMessage?: string

  @Prop({ default: Date.now })
  timestamp: Date
}

export const NotificationAnalyticsSchema = SchemaFactory.createForClass(NotificationAnalytics)

// Indexes for performance
NotificationAnalyticsSchema.index({ notificationId: 1 })
NotificationAnalyticsSchema.index({ userId: 1, timestamp: -1 })
NotificationAnalyticsSchema.index({ notificationType: 1, channel: 1 })
NotificationAnalyticsSchema.index({ event: 1, timestamp: -1 })
NotificationAnalyticsSchema.index({ timestamp: -1 })