import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';

export type BetDocument = Bet & Document;

export interface BetSelection {
  eventId: string;
  marketId: string;
  selectionId: string;
  odds: number;
  eventName: string;
  marketName: string;
  selectionName: string;
  startTime: Date;
  status: 'pending' | 'won' | 'lost' | 'void';
}

@Schema({ timestamps: true })
export class Bet {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Types.ObjectId;

  @Prop({ required: true, min: 0.01 })
  stake: number;

  @Prop({ required: true, min: 0 })
  potentialWin: number;

  @Prop({ enum: ['single', 'multiple', 'system'], required: true })
  betType: string;

  @Prop({ enum: ['pending', 'won', 'lost', 'void', 'cashout'], default: 'pending' })
  status: string;

  @Prop([{
    eventId: { type: String, required: true },
    marketId: { type: String, required: true },
    selectionId: { type: String, required: true },
    odds: { type: Number, required: true, min: 1.01 },
    eventName: { type: String, required: true },
    marketName: { type: String, required: true },
    selectionName: { type: String, required: true },
    startTime: { type: Date, required: true },
    status: { 
      type: String, 
      enum: ['pending', 'won', 'lost', 'void'], 
      default: 'pending' 
    }
  }])
  selections: BetSelection[];

  @Prop()
  settledAt?: Date;

  @Prop({ min: 0 })
  winAmount?: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop()
  reference: string;

  @Prop({ type: Object })
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    placedVia?: 'web' | 'mobile' | 'sms' | 'ussd';
    oddsFormat?: 'decimal' | 'fractional' | 'american';
    flag?: {
      reason: string;
      severity: 'low' | 'medium' | 'high';
      flaggedBy: string;
      flaggedAt: Date;
    };
    [key: string]: any;
  };

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const BetSchema = SchemaFactory.createForClass(Bet);

// Create indexes for better query performance
BetSchema.index({ userId: 1, createdAt: -1 });
BetSchema.index({ status: 1, createdAt: -1 });
BetSchema.index({ reference: 1 });
BetSchema.index({ 'selections.eventId': 1 });
BetSchema.index({ settledAt: 1 });

// Pre-save middleware to generate reference
BetSchema.pre('save', function(next) {
  if (!this.reference) {
    this.reference = `BET${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }
  next();
});