import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SportDocument = Sport & Document;

@Schema({ timestamps: true })
export class Sport {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ required: true })
  title: string;

  @Prop({ default: true })
  active: boolean;

  @Prop({ default: 0 })
  order: number;

  @Prop()
  description?: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const SportSchema = SchemaFactory.createForClass(Sport);

// Create indexes for better query performance
SportSchema.index({ active: 1, order: 1 });