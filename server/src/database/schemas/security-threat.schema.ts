import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SecurityThreatDocument = SecurityThreat & Document;

@Schema({ timestamps: true })
export class SecurityThreat {
  @Prop({ required: true })
  type: 'brute_force' | 'ddos' | 'sql_injection' | 'xss' | 'csrf' | 'malware' | 'suspicious_activity' | 'data_breach' | 'unauthorized_access';

  @Prop({ required: true })
  severity: 'low' | 'medium' | 'high' | 'critical';

  @Prop({ required: true })
  status: 'detected' | 'investigating' | 'contained' | 'resolved' | 'false_positive';

  @Prop({ required: true })
  source: string;

  @Prop()
  targetUserId?: Types.ObjectId;

  @Prop()
  targetResource?: string;

  @Prop({ required: true })
  sourceIp: string;

  @Prop()
  userAgent?: string;

  @Prop({ type: Object })
  geolocation?: {
    country: string;
    region: string;
    city: string;
    latitude: number;
    longitude: number;
  };

  @Prop({ type: Object })
  indicators: Record<string, any>;

  @Prop({ type: Object })
  evidence: Record<string, any>;

  @Prop()
  attackVector?: string;

  @Prop()
  mitigationActions: string[];

  @Prop()
  assignedTo?: Types.ObjectId;

  @Prop()
  estimatedImpact?: string;

  @Prop()
  actualImpact?: string;

  @Prop({ default: Date.now })
  firstDetected: Date;

  @Prop()
  lastActivity?: Date;

  @Prop()
  resolvedAt?: Date;

  @Prop()
  notes: string[];

  @Prop()
  relatedThreats: Types.ObjectId[];

  @Prop()
  tags: string[];
}

export const SecurityThreatSchema = SchemaFactory.createForClass(SecurityThreat);

// Indexes for performance and security monitoring
SecurityThreatSchema.index({ type: 1, severity: 1, status: 1 });
SecurityThreatSchema.index({ sourceIp: 1, firstDetected: -1 });
SecurityThreatSchema.index({ targetUserId: 1, firstDetected: -1 });
SecurityThreatSchema.index({ status: 1, severity: 1 });
SecurityThreatSchema.index({ firstDetected: -1 });
