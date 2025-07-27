import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type AdminUserDocument = AdminUser & Document & {
  fullName: string;
  isLocked(): boolean;
  incLoginAttempts(): Promise<any>;
  resetLoginAttempts(): Promise<any>;
  hasPermission(permission: AdminPermission): boolean;
  hasAnyPermission(permissions: AdminPermission[]): boolean;
}

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  SUPPORT = 'support',
  FINANCE = 'finance',
  COMPLIANCE = 'compliance'
}

export enum AdminPermission {
  // User Management
  VIEW_USERS = 'view_users',
  EDIT_USERS = 'edit_users',
  SUSPEND_USERS = 'suspend_users',
  DELETE_USERS = 'delete_users',
  VIEW_USER_DETAILS = 'view_user_details',
  
  // Betting Management
  VIEW_BETS = 'view_bets',
  SETTLE_BETS = 'settle_bets',
  VOID_BETS = 'void_bets',
  VIEW_BETTING_ANALYTICS = 'view_betting_analytics',
  
  // Financial Management
  VIEW_TRANSACTIONS = 'view_transactions',
  PROCESS_WITHDRAWALS = 'process_withdrawals',
  VIEW_FINANCIAL_REPORTS = 'view_financial_reports',
  MANAGE_PAYMENT_METHODS = 'manage_payment_methods',
  
  // KYC & Compliance
  VIEW_KYC_SUBMISSIONS = 'view_kyc_submissions',
  APPROVE_KYC = 'approve_kyc',
  REJECT_KYC = 'reject_kyc',
  VIEW_COMPLIANCE_REPORTS = 'view_compliance_reports',
  MANAGE_RISK_SETTINGS = 'manage_risk_settings',
  
  // Content Management
  MANAGE_SPORTS = 'manage_sports',
  MANAGE_ODDS = 'manage_odds',
  MANAGE_NOTIFICATIONS = 'manage_notifications',
  
  // System Administration
  VIEW_SYSTEM_LOGS = 'view_system_logs',
  MANAGE_ADMINS = 'manage_admins',
  MANAGE_SETTINGS = 'manage_settings',
  VIEW_AUDIT_LOGS = 'view_audit_logs',
  
  // Support
  VIEW_SUPPORT_TICKETS = 'view_support_tickets',
  RESPOND_TO_TICKETS = 'respond_to_tickets',
  ESCALATE_TICKETS = 'escalate_tickets'
}

@Schema({ timestamps: true })
export class AdminUser {
  @Prop({ required: true, unique: true, lowercase: true })
  email: string

  @Prop({ required: true })
  passwordHash: string

  @Prop({ required: true })
  firstName: string

  @Prop({ required: true })
  lastName: string

  @Prop({ enum: AdminRole, required: true })
  role: AdminRole

  @Prop({ type: [String], enum: AdminPermission, default: [] })
  permissions: AdminPermission[]

  @Prop({ default: true })
  isActive: boolean

  @Prop({ default: false })
  twoFactorEnabled: boolean

  @Prop()
  twoFactorSecret?: string

  @Prop({ type: [String], default: [] })
  twoFactorBackupCodes: string[]

  @Prop()
  lastLoginAt?: Date

  @Prop()
  lastLoginIp?: string

  @Prop()
  lastLoginUserAgent?: string

  @Prop({ default: 0 })
  failedLoginAttempts: number

  @Prop()
  lockedUntil?: Date

  @Prop()
  department?: string

  @Prop()
  employeeId?: string

  @Prop()
  phoneNumber?: string

  @Prop({ type: Object, default: () => ({
    sessionTimeout: 480, // 8 hours in minutes
    requirePasswordChange: false,
    allowMultipleSessions: false,
    ipWhitelist: []
  }) })
  securitySettings: {
    sessionTimeout: number
    requirePasswordChange: boolean
    allowMultipleSessions: boolean
    ipWhitelist: string[]
  }

  @Prop()
  createdBy?: string

  @Prop()
  lastModifiedBy?: string

  @Prop()
  passwordChangedAt?: Date

  @Prop()
  notes?: string

  @Prop({ default: Date.now })
  createdAt: Date

  @Prop({ default: Date.now })
  updatedAt: Date
}

export const AdminUserSchema = SchemaFactory.createForClass(AdminUser)

// Include virtuals in JSON serialization
AdminUserSchema.set('toJSON', { virtuals: true })

// Indexes for performance
AdminUserSchema.index({ role: 1 })
AdminUserSchema.index({ isActive: 1 })
AdminUserSchema.index({ createdAt: -1 })

// Virtual for full name
AdminUserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`
})

// Check if account is locked
AdminUserSchema.methods.isLocked = function() {
  return !!(this.lockedUntil && this.lockedUntil > Date.now())
}

// Increment failed login attempts
AdminUserSchema.methods.incLoginAttempts = function() {
  if (this.lockedUntil && this.lockedUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockedUntil: 1 },
      $set: { failedLoginAttempts: 1 }
    })
  }
  
  const updates: any = { $inc: { failedLoginAttempts: 1 } }
  
  // Lock account after 3 failed attempts for 30 minutes (stricter for admins)
  if (this.failedLoginAttempts + 1 >= 3 && !this.isLocked()) {
    updates.$set = { lockedUntil: Date.now() + 30 * 60 * 1000 } // 30 minutes
  }
  
  return this.updateOne(updates)
}

// Reset login attempts
AdminUserSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { failedLoginAttempts: 1, lockedUntil: 1 }
  })
}

// Check if admin has permission
AdminUserSchema.methods.hasPermission = function(permission: AdminPermission): boolean {
  return this.permissions.includes(permission)
}

// Check if admin has any of the specified permissions
AdminUserSchema.methods.hasAnyPermission = function(permissions: AdminPermission[]): boolean {
  return permissions.some(permission => this.permissions.includes(permission))
}

// Get default permissions for role
export const getDefaultPermissionsByRole = (role: AdminRole): AdminPermission[] => {
  switch (role) {
    case AdminRole.SUPER_ADMIN:
      return Object.values(AdminPermission)
    
    case AdminRole.ADMIN:
      return [
        AdminPermission.VIEW_USERS,
        AdminPermission.EDIT_USERS,
        AdminPermission.SUSPEND_USERS,
        AdminPermission.VIEW_USER_DETAILS,
        AdminPermission.VIEW_BETS,
        AdminPermission.SETTLE_BETS,
        AdminPermission.VOID_BETS,
        AdminPermission.VIEW_BETTING_ANALYTICS,
        AdminPermission.VIEW_TRANSACTIONS,
        AdminPermission.PROCESS_WITHDRAWALS,
        AdminPermission.VIEW_FINANCIAL_REPORTS,
        AdminPermission.VIEW_KYC_SUBMISSIONS,
        AdminPermission.APPROVE_KYC,
        AdminPermission.REJECT_KYC,
        AdminPermission.VIEW_COMPLIANCE_REPORTS,
        AdminPermission.MANAGE_SPORTS,
        AdminPermission.MANAGE_ODDS,
        AdminPermission.VIEW_SYSTEM_LOGS
      ]
    
    case AdminRole.MODERATOR:
      return [
        AdminPermission.VIEW_USERS,
        AdminPermission.EDIT_USERS,
        AdminPermission.VIEW_USER_DETAILS,
        AdminPermission.VIEW_BETS,
        AdminPermission.SETTLE_BETS,
        AdminPermission.VIEW_BETTING_ANALYTICS,
        AdminPermission.VIEW_SUPPORT_TICKETS,
        AdminPermission.RESPOND_TO_TICKETS,
        AdminPermission.ESCALATE_TICKETS
      ]
    
    case AdminRole.SUPPORT:
      return [
        AdminPermission.VIEW_USERS,
        AdminPermission.VIEW_USER_DETAILS,
        AdminPermission.VIEW_BETS,
        AdminPermission.VIEW_SUPPORT_TICKETS,
        AdminPermission.RESPOND_TO_TICKETS,
        AdminPermission.ESCALATE_TICKETS
      ]
    
    case AdminRole.FINANCE:
      return [
        AdminPermission.VIEW_TRANSACTIONS,
        AdminPermission.PROCESS_WITHDRAWALS,
        AdminPermission.VIEW_FINANCIAL_REPORTS,
        AdminPermission.MANAGE_PAYMENT_METHODS,
        AdminPermission.VIEW_USERS,
        AdminPermission.VIEW_USER_DETAILS
      ]
    
    case AdminRole.COMPLIANCE:
      return [
        AdminPermission.VIEW_KYC_SUBMISSIONS,
        AdminPermission.APPROVE_KYC,
        AdminPermission.REJECT_KYC,
        AdminPermission.VIEW_COMPLIANCE_REPORTS,
        AdminPermission.MANAGE_RISK_SETTINGS,
        AdminPermission.VIEW_USERS,
        AdminPermission.VIEW_USER_DETAILS,
        AdminPermission.VIEW_TRANSACTIONS
      ]
    
    default:
      return []
  }
}
