import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { User, UserDocument } from '../../../database/schemas/user.schema'

export interface SelfExclusionRequest {
  duration?: number // in days, null for permanent
  reason: string
  isPermanent: boolean
}

export interface ReactivationRequest {
  reason: string
}

@Injectable()
export class SelfExclusionService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async excludeUser(userId: string, request: SelfExclusionRequest): Promise<UserDocument> {
    const user = await this.userModel.findById(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    if (user.selfExclusion?.isExcluded) {
      throw new BadRequestException('User is already self-excluded')
    }

    // Validate exclusion request
    if (!request.isPermanent && (!request.duration || request.duration < 1)) {
      throw new BadRequestException('Duration must be at least 1 day for temporary exclusions')
    }

    if (request.isPermanent && request.duration) {
      throw new BadRequestException('Permanent exclusions cannot have a duration')
    }

    const excludedUntil = request.isPermanent 
      ? null 
      : new Date(Date.now() + (request.duration || 30) * 24 * 60 * 60 * 1000)

    const selfExclusion = {
      isExcluded: true,
      excludedAt: new Date(),
      excludedUntil,
      reason: request.reason,
      isPermanent: request.isPermanent,
    }

    // Immediately restrict account and clear any active sessions
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { 
        selfExclusion,
        accountStatus: 'restricted',
        // Clear any active login sessions by updating a timestamp
        lastLogin: new Date()
      },
      { new: true }
    )

    // Log the self-exclusion for audit purposes
    console.log(`User ${userId} self-excluded: ${request.isPermanent ? 'Permanent' : `${request.duration} days`} - Reason: ${request.reason}`)

    return updatedUser!
  }

  async requestReactivation(userId: string, request: ReactivationRequest): Promise<UserDocument> {
    const user = await this.userModel.findById(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    if (!user.selfExclusion?.isExcluded) {
      throw new BadRequestException('User is not self-excluded')
    }

    if (user.selfExclusion.isPermanent) {
      throw new BadRequestException('Cannot request reactivation for permanent exclusion')
    }

    // Check if exclusion period has ended
    if (user.selfExclusion.excludedUntil && user.selfExclusion.excludedUntil > new Date()) {
      throw new BadRequestException('Exclusion period has not ended yet')
    }

    const reactivationRequest = {
      requestedAt: new Date(),
      reason: request.reason,
      status: 'pending' as const,
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { 
        'selfExclusion.reactivationRequest': reactivationRequest
      },
      { new: true }
    )

    return updatedUser!
  }

  async reviewReactivationRequest(
    userId: string, 
    adminId: string, 
    decision: 'approved' | 'rejected',
    rejectionReason?: string
  ): Promise<UserDocument> {
    const user = await this.userModel.findById(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    if (!user.selfExclusion?.reactivationRequest) {
      throw new BadRequestException('No reactivation request found')
    }

    if (decision === 'approved') {
      const updatedUser = await this.userModel.findByIdAndUpdate(
        userId,
        { 
          $unset: { selfExclusion: 1 },
          accountStatus: 'active'
        },
        { new: true }
      )
      return updatedUser!
    } else {
      const updatedUser = await this.userModel.findByIdAndUpdate(
        userId,
        { 
          'selfExclusion.reactivationRequest.status': 'rejected',
          'selfExclusion.reactivationRequest.reviewedBy': adminId,
          'selfExclusion.reactivationRequest.rejectedAt': new Date(),
          'selfExclusion.reactivationRequest.rejectionReason': rejectionReason,
        },
        { new: true }
      )
      return updatedUser!
    }
  }

  async checkExclusionStatus(userId: string): Promise<boolean> {
    const user = await this.userModel.findById(userId)
    if (!user) {
      return false
    }

    if (!user.selfExclusion?.isExcluded) {
      return false
    }

    // Check if temporary exclusion has expired
    if (!user.selfExclusion.isPermanent && 
        user.selfExclusion.excludedUntil && 
        user.selfExclusion.excludedUntil <= new Date()) {
      
      // Auto-reactivate expired exclusions
      await this.userModel.findByIdAndUpdate(
        userId,
        { 
          $unset: { selfExclusion: 1 },
          accountStatus: 'active'
        }
      )
      return false
    }

    return true
  }

  async getExcludedUsers(page = 1, limit = 10): Promise<{ users: UserDocument[]; total: number }> {
    const skip = (page - 1) * limit
    
    const [users, total] = await Promise.all([
      this.userModel
        .find({ 'selfExclusion.isExcluded': true })
        .select('-passwordHash -twoFactorSecret -twoFactorBackupCodes')
        .skip(skip)
        .limit(limit)
        .sort({ 'selfExclusion.excludedAt': -1 })
        .exec(),
      this.userModel.countDocuments({ 'selfExclusion.isExcluded': true }).exec(),
    ])

    return { users, total }
  }

  async getPendingReactivationRequests(): Promise<UserDocument[]> {
    return this.userModel
      .find({ 'selfExclusion.reactivationRequest.status': 'pending' })
      .select('-passwordHash -twoFactorSecret -twoFactorBackupCodes')
      .sort({ 'selfExclusion.reactivationRequest.requestedAt': 1 })
      .exec()
  }
}