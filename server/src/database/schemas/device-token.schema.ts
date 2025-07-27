import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type DeviceTokenDocument = DeviceToken & Document & {
  createdAt: Date;
  updatedAt: Date;
}

@Schema({ timestamps: true })
export class DeviceToken {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId

  @Prop({ required: true })
  token: string

  @Prop({ 
    enum: ['web', 'android', 'ios'],
    required: true 
  })
  platform: string

  @Prop()
  deviceId?: string

  @Prop()
  userAgent?: string

  @Prop()
  appVersion?: string

  @Prop({ default: true })
  isActive: boolean

  @Prop()
  lastUsedAt?: Date

  @Prop()
  expiresAt?: Date
}

export const DeviceTokenSchema = SchemaFactory.createForClass(DeviceToken)

// Indexes for performance
DeviceTokenSchema.index({ userId: 1, isActive: 1 })
DeviceTokenSchema.index({ token: 1 }, { unique: true })
DeviceTokenSchema.index({ platform: 1, isActive: 1 })
DeviceTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
DeviceTokenSchema.index({ lastUsedAt: 1 })