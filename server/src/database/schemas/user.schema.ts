import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type UserDocument = User & Document & {
  isLocked(): boolean;
  incLoginAttempts(): Promise<any>;
  resetLoginAttempts(): Promise<any>;
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true })
  email: string

  @Prop({ required: true })
  passwordHash: string

  @Prop({ default: false })
  emailVerified: boolean

  @Prop({ default: false })
  twoFactorEnabled: boolean

  @Prop()
  twoFactorSecret?: string

  @Prop({ type: [String], default: [] })
  twoFactorBackupCodes: string[]

  @Prop()
  ussdPin?: string

  @Prop({ type: Object, required: true })
  profile: {
    firstName: string
    lastName: string
    dateOfBirth: Date
    phoneNumber: string
    country: string
    address?: string
    city?: string
    postalCode?: string
  }

  @Prop({ enum: ['pending', 'verified', 'rejected'], default: 'pending' })
  kycStatus: string

  @Prop({ type: Object, default: () => ({
    theme: 'light',
    oddsFormat: 'decimal',
    currency: 'USD',
    language: 'en',
    notifications: {
      email: true,
      push: true,
      sms: false,
    },
  }) })
  preferences: {
    theme: 'light' | 'dark'
    oddsFormat: 'decimal' | 'fractional' | 'american'
    currency: string
    language: string
    notifications: {
      email: boolean
      push: boolean
      sms: boolean
    }
  }

  @Prop({ type: Object, default: () => ({
    dailyDeposit: 1000,
    weeklyDeposit: 5000,
    monthlyDeposit: 20000,
    dailyBetting: 500,
    weeklyBetting: 2500,
    monthlyBetting: 10000,
    sessionTime: 240, // 4 hours in minutes
    dailyLoss: 200,
    weeklyLoss: 1000,
    monthlyLoss: 4000,
    lastUpdated: new Date(),
  }) })
  limits: {
    dailyDeposit: number
    weeklyDeposit: number
    monthlyDeposit: number
    dailyBetting: number
    weeklyBetting: number
    monthlyBetting: number
    sessionTime: number
    dailyLoss: number
    weeklyLoss: number
    monthlyLoss: number
    lastUpdated: Date
  }

  @Prop({ default: 0 })
  failedLoginAttempts: number

  @Prop()
  lockedUntil?: Date

  @Prop()
  lastLoginAt?: Date

  @Prop({ type: Object })
  selfExclusion?: {
    isExcluded: boolean
    excludedAt?: Date
    excludedUntil?: Date
    reason?: string
    isPermanent: boolean
    reactivationRequest?: {
      requestedAt: Date
      reason: string
      status: 'pending' | 'approved' | 'rejected'
      reviewedBy?: string
      rejectedAt?: Date
      rejectionReason?: string
    }
  }

  @Prop({ type: Object, default: () => ({
    totalSessions: 0,
    totalSessionTime: 0,
    lastSessionDuration: 0,
    lastSessionEnd: null,
  }) })
  stats: {
    totalSessions: number
    totalSessionTime: number
    lastSessionDuration: number
    lastSessionEnd?: Date
  }

  @Prop({ enum: ['active', 'restricted', 'suspended'], default: 'active' })
  accountStatus: string

  @Prop()
  statusReason?: string

  @Prop()
  statusUpdatedAt?: Date

  @Prop()
  statusUpdatedBy?: string

  @Prop()
  statusExpiresAt?: Date

  @Prop()
  verifiedBy?: string

  @Prop({ default: false })
  isFlagged: boolean

  @Prop()
  flaggedReason?: string

  @Prop()
  flaggedAt?: Date

  @Prop()
  flaggedBy?: string

  @Prop({ type: Object, default: () => ({
    teams: [],
    sports: []
  }) })
  favorites?: {
    teams: Array<{
      teamName: string
      sportKey: string
      addedAt: Date
    }>
    sports: Array<{
      sportKey: string
      sportTitle: string
      addedAt: Date
    }>
  }

  @Prop()
  lastLogin?: Date

  @Prop({ default: Date.now })
  createdAt: Date

  @Prop({ default: Date.now })
  updatedAt: Date
}

export const UserSchema = SchemaFactory.createForClass(User)

// Indexes for performance
UserSchema.index({ 'profile.phoneNumber': 1 })
UserSchema.index({ createdAt: -1 })
UserSchema.index({ kycStatus: 1 })

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  return `${this.profile.firstName} ${this.profile.lastName}`
})

// Check if account is locked
UserSchema.methods.isLocked = function() {
  return !!(this.lockedUntil && this.lockedUntil > Date.now())
}

// Increment failed login attempts
UserSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockedUntil && this.lockedUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockedUntil: 1 },
      $set: { failedLoginAttempts: 1 }
    })
  }
  
  const updates: any = { $inc: { failedLoginAttempts: 1 } }
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.failedLoginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockedUntil: Date.now() + 2 * 60 * 60 * 1000 } // 2 hours
  }
  
  return this.updateOne(updates)
}

// Reset login attempts
UserSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { failedLoginAttempts: 1, lockedUntil: 1 }
  })
}