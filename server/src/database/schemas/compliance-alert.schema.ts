import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'
import * as mongoose from 'mongoose'

export type ComplianceAlertDocument = ComplianceAlert & Document

@Schema({ timestamps: true })
export class ComplianceAlert {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Types.ObjectId

  @Prop({ 
    enum: [
      'suspicious_login',
      'unusual_betting_pattern',
      'large_transaction',
      'rapid_deposits',
      'multiple_accounts',
      'kyc_mismatch',
      'velocity_check',
      'geo_location_risk',
      'device_fingerprint_risk'
    ], 
    required: true 
  })
  alertType: string

  @Prop({ enum: ['low', 'medium', 'high', 'critical'], required: true })
  severity: string

  @Prop({ enum: ['open', 'investigating', 'resolved', 'false_positive'], default: 'open' })
  status: string

  @Prop({ required: true })
  description: string

  @Prop({ type: Object, required: true })
  metadata: {
    ipAddress?: string
    userAgent?: string
    location?: string
    transactionAmount?: number
    betAmount?: number
    frequency?: number
    timeWindow?: string
    riskScore?: number
    additionalData?: any
  }

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  assignedTo?: mongoose.Types.ObjectId

  @Prop()
  investigationNotes?: string

  @Prop()
  resolution?: string

  @Prop()
  resolvedAt?: Date

  @Prop({ default: Date.now })
  triggeredAt: Date
}

export const ComplianceAlertSchema = SchemaFactory.createForClass(ComplianceAlert)

// Indexes for performance
ComplianceAlertSchema.index({ userId: 1, triggeredAt: -1 })
ComplianceAlertSchema.index({ alertType: 1, status: 1 })
ComplianceAlertSchema.index({ severity: 1, status: 1 })
ComplianceAlertSchema.index({ triggeredAt: -1 })
ComplianceAlertSchema.index({ assignedTo: 1, status: 1 })