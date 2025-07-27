import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UssdSessionDocument = UssdSession & Document;

@Schema({ timestamps: true })
export class UssdSession {
  @Prop({ required: true, unique: true })
  sessionId: string;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop()
  userId?: string;

  @Prop({ default: 'main_menu' })
  currentMenu: string;

  @Prop({ type: Object, default: {} })
  sessionData: Record<string, any>;

  @Prop({ type: [String], default: [] })
  menuHistory: string[];

  @Prop({ default: Date.now })
  lastActivity: Date;

  @Prop({ default: false })
  isActive: boolean;

  @Prop()
  expiresAt: Date;
}

export const UssdSessionSchema = SchemaFactory.createForClass(UssdSession);

// Index for automatic cleanup of expired sessions
UssdSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
UssdSessionSchema.index({ phoneNumber: 1 });