import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SecurityAuditLogDocument = SecurityAuditLog & Document;

@Schema({ timestamps: true })
export class SecurityAuditLog {
  @Prop({ required: true })
  eventType: string;

  @Prop({ required: true })
  category: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'system_access' | 'configuration' | 'security_event';

  @Prop()
  userId?: Types.ObjectId;

  @Prop()
  adminId?: Types.ObjectId;

  @Prop()
  sessionId?: string;

  @Prop({ required: true })
  ipAddress: string;

  @Prop()
  userAgent?: string;

  @Prop()
  resource?: string;

  @Prop()
  action?: string;

  @Prop()
  method?: string;

  @Prop({ required: true })
  success: boolean;

  @Prop()
  failureReason?: string;

  @Prop({ type: Object })
  requestData?: Record<string, any>;

  @Prop({ type: Object })
  responseData?: Record<string, any>;

  @Prop({ type: Object })
  sensitiveData?: Record<string, any>; // Encrypted sensitive data

  @Prop()
  riskLevel: 'low' | 'medium' | 'high' | 'critical';

  @Prop({ type: Object })
  context: Record<string, any>;

  @Prop()
  parentEventId?: Types.ObjectId;

  @Prop()
  correlationId?: string;

  @Prop({ type: Object })
  geolocation?: {
    country: string;
    region: string;
    city: string;
  };

  @Prop()
  deviceFingerprint?: string;

  @Prop({ required: true })
  integrity: string; // Hash for tamper detection

  @Prop({ default: Date.now })
  timestamp: Date;

  @Prop()
  retentionPolicy?: string;

  @Prop({ type: [String] })
  complianceFlags: string[];

  @Prop({ type: [String] })
  tags: string[];
}

export const SecurityAuditLogSchema = SchemaFactory.createForClass(SecurityAuditLog);

// Indexes for audit trail queries and compliance
SecurityAuditLogSchema.index({ userId: 1, timestamp: -1 });
SecurityAuditLogSchema.index({ adminId: 1, timestamp: -1 });
SecurityAuditLogSchema.index({ category: 1, eventType: 1, timestamp: -1 });
SecurityAuditLogSchema.index({ ipAddress: 1, timestamp: -1 });
SecurityAuditLogSchema.index({ resource: 1, action: 1, timestamp: -1 });
SecurityAuditLogSchema.index({ success: 1, riskLevel: 1, timestamp: -1 });
SecurityAuditLogSchema.index({ correlationId: 1 });
SecurityAuditLogSchema.index({ timestamp: -1 });
SecurityAuditLogSchema.index({ complianceFlags: 1, timestamp: -1 });
