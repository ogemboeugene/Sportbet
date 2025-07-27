import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'
import * as mongoose from 'mongoose'

export type LoginHistoryDocument = LoginHistory & Document

@Schema({ timestamps: true })
export class LoginHistory {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Types.ObjectId

  @Prop({ required: true })
  ipAddress: string

  @Prop({ required: true })
  userAgent: string

  @Prop()
  location?: string

  @Prop({ enum: ['success', 'failed', 'blocked'], required: true })
  status: string

  @Prop()
  failureReason?: string

  @Prop({ default: Date.now })
  timestamp: Date
}

export const LoginHistorySchema = SchemaFactory.createForClass(LoginHistory)

// Indexes for performance
LoginHistorySchema.index({ userId: 1, timestamp: -1 })
LoginHistorySchema.index({ ipAddress: 1 })
LoginHistorySchema.index({ timestamp: -1 })