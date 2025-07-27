import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SecurityEventDocument = SecurityEvent & Document;

@Schema({ timestamps: true })
export class SecurityEvent {
  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  severity: 'low' | 'medium' | 'high' | 'critical';

  @Prop({ required: true })
  source: string;

  @Prop()
  userId?: Types.ObjectId;

  @Prop()
  sessionId?: string;

  @Prop({ required: true })
  ipAddress: string;

  @Prop()
  userAgent?: string;

  @Prop()
  endpoint?: string;

  @Prop()
  method?: string;

  @Prop({ type: Object })
  details: Record<string, any>;

  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop({ default: false })
  resolved: boolean;

  @Prop()
  resolvedAt?: Date;

  @Prop()
  resolvedBy?: Types.ObjectId;

  @Prop()
  resolution?: string;

  @Prop({ default: Date.now })
  detectedAt: Date;

  @Prop({ type: [String] })
  tags: string[];
}

export const SecurityEventSchema = SchemaFactory.createForClass(SecurityEvent);

// Indexes for performance
SecurityEventSchema.index({ type: 1, severity: 1 });
SecurityEventSchema.index({ userId: 1, detectedAt: -1 });
SecurityEventSchema.index({ ipAddress: 1, detectedAt: -1 });
SecurityEventSchema.index({ resolved: 1, severity: 1 });
SecurityEventSchema.index({ detectedAt: -1 });
