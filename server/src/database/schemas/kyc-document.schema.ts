import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'
import * as mongoose from 'mongoose'

export type KycDocumentDocument = KycDocument & Document

@Schema({ timestamps: true })
export class KycDocument {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Types.ObjectId

  @Prop({ required: true })
  applicantId: string // Sumsub applicant ID

  @Prop({ enum: ['pending', 'processing', 'approved', 'rejected', 'resubmission_required'], default: 'pending' })
  status: string

  @Prop({ enum: ['identity', 'proof_of_address', 'selfie', 'additional'], required: true })
  documentType: string

  @Prop({ required: true })
  fileName: string

  @Prop({ required: true })
  fileUrl: string

  @Prop({ required: true })
  mimeType: string

  @Prop({ required: true })
  fileSize: number

  @Prop()
  rejectionReason?: string

  @Prop({ type: Object })
  sumsubResponse?: any

  @Prop({ type: Object })
  metadata: {
    country?: string
    documentNumber?: string
    expiryDate?: Date
    issueDate?: Date
    extractedData?: any
  }

  @Prop()
  reviewedBy?: mongoose.Types.ObjectId

  @Prop()
  reviewedAt?: Date

  @Prop({ default: Date.now })
  submittedAt: Date
}

export const KycDocumentSchema = SchemaFactory.createForClass(KycDocument)

// Indexes for performance
KycDocumentSchema.index({ userId: 1, status: 1 })
KycDocumentSchema.index({ applicantId: 1 })
KycDocumentSchema.index({ status: 1, submittedAt: -1 })
KycDocumentSchema.index({ reviewedAt: -1 })