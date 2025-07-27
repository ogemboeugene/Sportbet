import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'
import * as mongoose from 'mongoose'

export type RiskProfileDocument = RiskProfile & Document

@Schema({ timestamps: true })
export class RiskProfile {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: mongoose.Types.ObjectId

  @Prop({ min: 0, max: 100, default: 50 })
  overallRiskScore: number

  @Prop({ enum: ['low', 'medium', 'high', 'critical'], default: 'medium' })
  riskLevel: string

  @Prop({ type: Object, default: {} })
  riskFactors: {
    accountAge: number // days since account creation
    kycStatus: number // 0-100 based on verification level
    loginPatterns: number // 0-100 based on login behavior
    transactionPatterns: number // 0-100 based on transaction behavior
    bettingPatterns: number // 0-100 based on betting behavior
    geolocation: number // 0-100 based on location risk
    deviceFingerprint: number // 0-100 based on device consistency
    socialSignals: number // 0-100 based on social media verification
  }

  @Prop({ type: Object, default: {} })
  behaviorMetrics: {
    avgSessionDuration: number
    loginFrequency: number
    uniqueDevices: number
    uniqueIPs: number
    avgBetAmount: number
    bettingFrequency: number
    winLossRatio: number
    depositFrequency: number
    withdrawalFrequency: number
    avgTransactionAmount: number
  }

  @Prop({ type: [String], default: [] })
  riskFlags: string[]

  @Prop({ type: [Object], default: [] })
  riskHistory: Array<{
    date: Date
    score: number
    level: string
    reason: string
    triggeredBy: string
  }>

  @Prop()
  lastAssessment: Date

  @Prop()
  nextAssessment: Date

  @Prop({ default: false })
  isBlacklisted: boolean

  @Prop({ default: false })
  requiresManualReview: boolean

  @Prop()
  notes?: string
}

export const RiskProfileSchema = SchemaFactory.createForClass(RiskProfile)

// Indexes for performance
RiskProfileSchema.index({ overallRiskScore: -1 })
RiskProfileSchema.index({ riskLevel: 1 })
RiskProfileSchema.index({ lastAssessment: -1 })
RiskProfileSchema.index({ isBlacklisted: 1 })
RiskProfileSchema.index({ requiresManualReview: 1 })