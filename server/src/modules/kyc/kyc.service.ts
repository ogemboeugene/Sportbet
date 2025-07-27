import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { UsersService } from '../users/users.service'
import { SumsubService } from './services/sumsub.service'
import { KycDocument, KycDocumentDocument } from '../../database/schemas/kyc-document.schema'

@Injectable()
export class KycService {
  constructor(
    @InjectModel(KycDocument.name) private kycDocumentModel: Model<KycDocumentDocument>,
    private usersService: UsersService,
    private sumsubService: SumsubService,
  ) {}

  async initiateKyc(userId: string) {
    const user = await this.usersService.findById(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    if (user.kycStatus === 'verified') {
      throw new BadRequestException('KYC already completed')
    }

    // Create or get existing Sumsub applicant
    let applicantId: string
    const existingDocument = await this.kycDocumentModel.findOne({ userId }).exec()
    
    if (existingDocument) {
      applicantId = existingDocument.applicantId
    } else {
      const applicant = await this.sumsubService.createApplicant(userId, {
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        dateOfBirth: user.profile.dateOfBirth,
        country: user.profile.country,
        phoneNumber: user.profile.phoneNumber,
      })
      applicantId = applicant.id
    }

    return {
      applicantId,
      status: user.kycStatus,
      requiredDocuments: this.getRequiredDocuments(user.profile.country),
    }
  }

  async uploadDocument(
    userId: string,
    documentType: string,
    file: any,
  ) {
    const user = await this.usersService.findById(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    if (user.kycStatus === 'verified') {
      throw new BadRequestException('KYC already completed')
    }

    // Validate file
    this.validateFile(file, documentType)

    // Get or create applicant
    let applicantId: string
    const existingDocument = await this.kycDocumentModel.findOne({ userId }).exec()
    
    if (existingDocument) {
      applicantId = existingDocument.applicantId
    } else {
      const applicant = await this.sumsubService.createApplicant(userId, {
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        dateOfBirth: user.profile.dateOfBirth,
        country: user.profile.country,
        phoneNumber: user.profile.phoneNumber,
      })
      applicantId = applicant.id
    }

    // Upload to Sumsub
    const sumsubResponse = await this.sumsubService.uploadDocument(
      applicantId,
      documentType,
      file.buffer,
      file.originalname,
    )

    // Save document record
    const kycDocument = new this.kycDocumentModel({
      userId,
      applicantId,
      documentType,
      fileName: file.originalname,
      fileUrl: sumsubResponse.fileUrl || '',
      mimeType: file.mimetype,
      fileSize: file.size,
      sumsubResponse,
      metadata: this.extractMetadata(sumsubResponse),
    })

    await kycDocument.save()

    // Update user KYC status to pending if not already
    if (user.kycStatus === 'pending') {
      await this.usersService.updateKycStatus(userId, 'pending')
    }

    return {
      documentId: kycDocument._id,
      status: 'uploaded',
      message: 'Document uploaded successfully',
    }
  }

  async submitForReview(userId: string) {
    const user = await this.usersService.findById(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    const documents = await this.kycDocumentModel.find({ userId }).exec()
    if (documents.length === 0) {
      throw new BadRequestException('No documents uploaded')
    }

    const applicantId = documents[0].applicantId

    // Check if all required documents are uploaded
    const requiredDocs = this.getRequiredDocuments(user.profile.country)
    const uploadedTypes = documents.map(doc => doc.documentType)
    const missingDocs = requiredDocs.filter(doc => !uploadedTypes.includes(doc.type))

    if (missingDocs.length > 0) {
      throw new BadRequestException(`Missing required documents: ${missingDocs.map(d => d.name).join(', ')}`)
    }

    // Submit to Sumsub for review
    await this.sumsubService.requestCheck(applicantId)

    // Update user status
    await this.usersService.updateKycStatus(userId, 'pending')

    return {
      status: 'submitted',
      message: 'KYC documents submitted for review',
    }
  }

  async getKycStatus(userId: string) {
    const user = await this.usersService.findById(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    const documents = await this.kycDocumentModel.find({ userId }).exec()
    
    let applicantStatus = null
    if (documents.length > 0) {
      try {
        applicantStatus = await this.sumsubService.getApplicantStatus(documents[0].applicantId)
      } catch (error) {
        // Handle case where applicant doesn't exist in Sumsub
      }
    }

    return {
      status: user.kycStatus,
      documents: documents.map(doc => ({
        id: doc._id,
        type: doc.documentType,
        status: doc.status,
        fileName: doc.fileName,
        submittedAt: doc.submittedAt,
        rejectionReason: doc.rejectionReason,
      })),
      applicantStatus,
      requiredDocuments: this.getRequiredDocuments(user.profile.country),
    }
  }

  async handleWebhook(payload: any, signature: string) {
    // Verify webhook signature
    if (!this.sumsubService.verifyWebhookSignature(JSON.stringify(payload), signature)) {
      throw new ForbiddenException('Invalid webhook signature')
    }

    const { applicantId, reviewStatus, reviewResult } = payload

    // Find documents by applicant ID
    const documents = await this.kycDocumentModel.find({ applicantId }).exec()
    if (documents.length === 0) {
      return { message: 'No documents found for applicant' }
    }

    const userId = documents[0].userId
    const newStatus = this.sumsubService.mapSumsubStatus(reviewStatus)

    // Update document statuses
    await this.kycDocumentModel.updateMany(
      { applicantId },
      {
        status: newStatus,
        rejectionReason: reviewResult?.rejectLabels?.join(', '),
        reviewedAt: new Date(),
      }
    )

    // Update user KYC status
    await this.usersService.updateKycStatus(userId.toString(), newStatus)

    // TODO: Send notification to user about status change
    // await this.notificationService.sendKycStatusUpdate(userId, newStatus)

    return { message: 'Webhook processed successfully' }
  }

  // Admin methods
  async getAllKycSubmissions(page = 1, limit = 20, status?: string) {
    const query = status ? { status } : {}
    const skip = (page - 1) * limit

    const [documents, total] = await Promise.all([
      this.kycDocumentModel
        .find(query)
        .populate('userId', 'email profile')
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.kycDocumentModel.countDocuments(query).exec(),
    ])

    return {
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async reviewKycDocument(documentId: string, action: 'approve' | 'reject', reason?: string, reviewerId?: string) {
    const document = await this.kycDocumentModel.findById(documentId).exec()
    if (!document) {
      throw new NotFoundException('Document not found')
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    
    await document.updateOne({
      status: newStatus,
      rejectionReason: reason,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    })

    // Check if all documents for this user are approved
    const userDocuments = await this.kycDocumentModel.find({ userId: document.userId }).exec()
    const allApproved = userDocuments.every(doc => doc.status === 'approved')
    const anyRejected = userDocuments.some(doc => doc.status === 'rejected')

    let userKycStatus = 'pending'
    if (allApproved) {
      userKycStatus = 'verified'
    } else if (anyRejected) {
      userKycStatus = 'rejected'
    }

    await this.usersService.updateKycStatus(document.userId.toString(), userKycStatus)

    return {
      status: newStatus,
      message: `Document ${action}ed successfully`,
    }
  }

  private validateFile(file: any, documentType: string) {
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']

    if (file.size > maxSize) {
      throw new BadRequestException('File size too large. Maximum 10MB allowed.')
    }

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, and PDF files are allowed.')
    }

    // Additional validation based on document type
    if (documentType === 'selfie' && file.mimetype === 'application/pdf') {
      throw new BadRequestException('Selfie must be an image file, not PDF.')
    }
  }

  private getRequiredDocuments(country: string) {
    // Basic required documents - can be customized per country
    return [
      {
        type: 'identity',
        name: 'Government ID',
        description: 'Passport, driver\'s license, or national ID card',
        required: true,
      },
      {
        type: 'proof_of_address',
        name: 'Proof of Address',
        description: 'Utility bill, bank statement, or rental agreement (not older than 3 months)',
        required: true,
      },
      {
        type: 'selfie',
        name: 'Selfie',
        description: 'Clear photo of yourself holding your ID document',
        required: true,
      },
    ]
  }

  private extractMetadata(sumsubResponse: any) {
    return {
      country: sumsubResponse?.country,
      documentNumber: sumsubResponse?.idDocNumber,
      expiryDate: sumsubResponse?.expiryDate ? new Date(sumsubResponse.expiryDate) : undefined,
      issueDate: sumsubResponse?.issueDate ? new Date(sumsubResponse.issueDate) : undefined,
      extractedData: sumsubResponse?.extractedData,
    }
  }
}