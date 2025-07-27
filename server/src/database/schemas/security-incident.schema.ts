import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SecurityIncidentDocument = SecurityIncident & Document;

@Schema({ timestamps: true })
export class SecurityIncident {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  type: 'data_breach' | 'unauthorized_access' | 'system_compromise' | 'malware' | 'phishing' | 'ddos' | 'insider_threat' | 'other';

  @Prop({ required: true })
  severity: 'low' | 'medium' | 'high' | 'critical';

  @Prop({ required: true })
  status: 'new' | 'investigating' | 'contained' | 'resolved' | 'closed';

  @Prop({ required: true })
  priority: 'low' | 'medium' | 'high' | 'urgent';

  @Prop()
  assignedTo?: Types.ObjectId;

  @Prop()
  reportedBy?: Types.ObjectId;

  @Prop()
  affectedUsers: Types.ObjectId[];

  @Prop()
  affectedSystems: string[];

  @Prop()
  affectedData: string[];

  @Prop({ type: Object })
  timeline: {
    detected: Date;
    reported?: Date;
    contained?: Date;
    resolved?: Date;
    closed?: Date;
  };

  @Prop()
  rootCause?: string;

  @Prop({ type: Object })
  impactAssessment?: {
    financialLoss?: number;
    dataCompromised?: number;
    usersAffected?: number;
    systemsDown?: number;
    reputationalDamage?: string;
  };

  @Prop({ type: [Object] })
  responseActions: {
    action: string;
    timestamp: Date;
    performedBy: Types.ObjectId;
    result?: string;
  }[];

  @Prop({ type: [String] })
  preventiveMeasures: string[];

  @Prop()
  lessonsLearned?: string;

  @Prop({ type: Object })
  communicationPlan?: {
    internal?: boolean;
    external?: boolean;
    regulatory?: boolean;
    customers?: boolean;
    media?: boolean;
  };

  @Prop({ type: [Object] })
  evidence: {
    type: string;
    location: string;
    description: string;
    collectedBy: Types.ObjectId;
    collectedAt: Date;
  }[];

  @Prop({ type: [Types.ObjectId] })
  relatedThreats: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId] })
  relatedEvents: Types.ObjectId[];

  @Prop({ type: [String] })
  tags: string[];

  @Prop({ type: [Object] })
  notes: {
    content: string;
    author: Types.ObjectId;
    timestamp: Date;
  }[];
}

export const SecurityIncidentSchema = SchemaFactory.createForClass(SecurityIncident);

// Indexes for incident management
SecurityIncidentSchema.index({ status: 1, severity: 1, priority: 1 });
SecurityIncidentSchema.index({ assignedTo: 1, status: 1 });
SecurityIncidentSchema.index({ type: 1, 'timeline.detected': -1 });
SecurityIncidentSchema.index({ affectedUsers: 1 });
SecurityIncidentSchema.index({ 'timeline.detected': -1 });
