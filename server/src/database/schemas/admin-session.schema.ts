import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'
import * as mongoose from 'mongoose'

export type AdminSessionDocument = AdminSession & Document & {
  isExpired(): boolean;
  terminate(terminatedBy?: string, reason?: string): Promise<any>;
  updateActivity(): Promise<any>;
}

@Schema({ timestamps: true })
export class AdminSession {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true })
  adminId: string

  @Prop({ required: true, unique: true })
  sessionToken: string

  @Prop({ required: true })
  refreshToken: string

  @Prop({ required: true })
  ipAddress: string

  @Prop()
  userAgent?: string

  @Prop()
  deviceInfo?: string

  @Prop({ type: Object })
  location?: {
    country?: string
    city?: string
    timezone?: string
  }

  @Prop({ required: true })
  expiresAt: Date

  @Prop({ default: false })
  isActive: boolean

  @Prop()
  lastActivityAt?: Date

  @Prop()
  terminatedAt?: Date

  @Prop()
  terminatedBy?: string

  @Prop()
  terminationReason?: string

  @Prop({ default: Date.now })
  createdAt: Date

  @Prop({ default: Date.now })
  updatedAt: Date
}

export const AdminSessionSchema = SchemaFactory.createForClass(AdminSession)

// Indexes for performance
AdminSessionSchema.index({ adminId: 1, isActive: 1 })
AdminSessionSchema.index({ createdAt: -1 })

// TTL index to automatically delete expired sessions
AdminSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Methods
AdminSessionSchema.methods.isExpired = function() {
  return this.expiresAt < new Date()
}

AdminSessionSchema.methods.terminate = function(terminatedBy?: string, reason?: string) {
  return this.updateOne({
    $set: {
      isActive: false,
      terminatedAt: new Date(),
      terminatedBy,
      terminationReason: reason
    }
  })
}

AdminSessionSchema.methods.updateActivity = function() {
  return this.updateOne({
    $set: {
      lastActivityAt: new Date()
    }
  })
}
