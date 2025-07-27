import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EventDocument = Event & Document;

export interface Market {
  marketId: string;
  marketName: string;
  selections: Selection[];
}

export interface Selection {
  selectionId: string;
  selectionName: string;
  odds: number;
  active: boolean;
}

@Schema({ timestamps: true })
export class Event {
  @Prop({ required: true, unique: true })
  eventId: string;

  @Prop({ required: true })
  sportKey: string;

  @Prop({ required: true })
  homeTeam: string;

  @Prop({ required: true })
  awayTeam: string;

  @Prop({ required: true })
  startTime: Date;

  @Prop([{
    marketId: String,
    marketName: String,
    selections: [{
      selectionId: String,
      selectionName: String,
      odds: Number,
      active: { type: Boolean, default: true }
    }]
  }])
  markets: Market[];

  @Prop({ enum: ['upcoming', 'live', 'finished', 'cancelled'], default: 'upcoming' })
  status: string;

  @Prop({ type: Object })
  score?: {
    home: number;
    away: number;
  };

  @Prop()
  league?: string;

  @Prop()
  country?: string;

  @Prop({ default: Date.now })
  lastOddsUpdate: Date;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const EventSchema = SchemaFactory.createForClass(Event);

// Create indexes for better query performance
EventSchema.index({ sportKey: 1, startTime: 1 });
EventSchema.index({ status: 1, startTime: 1 });
EventSchema.index({ startTime: 1 });
EventSchema.index({ 'markets.marketId': 1 });