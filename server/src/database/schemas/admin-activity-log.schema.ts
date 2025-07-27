import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'
import * as mongoose from 'mongoose'

export type AdminActivityLogDocument = AdminActivityLog & Document

export enum AdminActivityType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  FAILED_LOGIN = 'failed_login',
  PASSWORD_CHANGE = 'password_change',
  PROFILE_UPDATE = 'profile_update',
  PERMISSION_CHANGE = 'permission_change',
  
  // User Management Actions
  USER_VIEW = 'user_view',
  USER_UPDATE = 'user_update',
  USER_SUSPEND = 'user_suspend',
  USER_ACTIVATE = 'user_activate',
  USER_DELETE = 'user_delete',
  USER_VERIFICATION = 'user_verification',
  USER_FLAG = 'user_flag',
  USER_UNFLAG = 'user_unflag',
  
  // Betting Actions
  BET_SETTLE = 'bet_settle',
  BET_VOID = 'bet_void',
  BET_VIEW = 'bet_view',
  
  // Financial Actions
  WITHDRAWAL_APPROVE = 'withdrawal_approve',
  WITHDRAWAL_REJECT = 'withdrawal_reject',
  TRANSACTION_VIEW = 'transaction_view',
  
  // KYC Actions
  KYC_APPROVE = 'kyc_approve',
  KYC_REJECT = 'kyc_reject',
  KYC_VIEW = 'kyc_view',
  KYC_UPDATE = 'kyc_update',
  
  // System Actions
  SETTINGS_UPDATE = 'settings_update',
  ADMIN_CREATE = 'admin_create',
  ADMIN_UPDATE = 'admin_update',
  ADMIN_DELETE = 'admin_delete',
  DATA_EXPORT = 'data_export',
  
  // Security Actions
  SECURITY_ALERT = 'security_alert',
  IP_WHITELIST_UPDATE = 'ip_whitelist_update',
  SESSION_TERMINATE = 'session_terminate'
}

@Schema({ timestamps: true })
export class AdminActivityLog {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true })
  adminId: string

  @Prop({ required: true })
  adminEmail: string

  @Prop({ required: true })
  adminName: string

  @Prop({ enum: AdminActivityType, required: true })
  activityType: AdminActivityType

  @Prop({ required: true })
  description: string

  @Prop({ type: Object })
  details?: {
    targetId?: string
    targetType?: string
    targetName?: string
    oldValues?: any
    newValues?: any
    reason?: string
    metadata?: any
    [key: string]: any // Allow additional properties
  }

  @Prop({ required: true })
  ipAddress: string

  @Prop()
  userAgent?: string

  @Prop()
  sessionId?: string

  @Prop({ enum: ['success', 'failure', 'warning'], default: 'success' })
  status: string

  @Prop()
  errorMessage?: string

  @Prop({ default: Date.now })
  createdAt: Date
}

export const AdminActivityLogSchema = SchemaFactory.createForClass(AdminActivityLog)

// Indexes for performance and querying
AdminActivityLogSchema.index({ adminId: 1, createdAt: -1 })
AdminActivityLogSchema.index({ activityType: 1, createdAt: -1 })
AdminActivityLogSchema.index({ createdAt: -1 })
AdminActivityLogSchema.index({ 'details.targetId': 1 })
AdminActivityLogSchema.index({ status: 1 })

// TTL index to automatically delete logs after 2 years
AdminActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 }) // 2 years
