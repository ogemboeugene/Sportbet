import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { RiskProfile, RiskProfileDocument } from '../../../database/schemas/risk-profile.schema'
import { UsersService } from '../../users/users.service'

@Injectable()
export class RiskScoringService {
  constructor(
    @InjectModel(RiskProfile.name) private riskProfileModel: Model<RiskProfileDocument>,
    private usersService: UsersService,
  ) {}

  async calculateRiskScore(userId: string): Promise<number> {
    const user = await this.usersService.findById(userId)
    if (!user) return 100 // Maximum risk for non-existent user

    let riskProfile = await this.riskProfileModel.findOne({ userId }).exec()
    if (!riskProfile) {
      riskProfile = await this.createInitialRiskProfile(userId) as any
    }

    const riskFactors = await this.calculateRiskFactors(userId, user)
    const behaviorMetrics = await this.calculateBehaviorMetrics(userId)

    // Calculate weighted risk score
    const weights = {
      accountAge: 0.15,
      kycStatus: 0.20,
      loginPatterns: 0.10,
      transactionPatterns: 0.15,
      bettingPatterns: 0.15,
      geolocation: 0.10,
      deviceFingerprint: 0.10,
      socialSignals: 0.05,
    }

    let overallScore = 0
    for (const [factor, weight] of Object.entries(weights)) {
      overallScore += (riskFactors[factor] || 50) * weight
    }

    // Apply behavior metric adjustments
    overallScore = this.adjustScoreForBehavior(overallScore, behaviorMetrics)

    // Ensure score is within bounds
    overallScore = Math.max(0, Math.min(100, overallScore))

    // Update risk profile
    await this.updateRiskProfile(userId, overallScore, riskFactors, behaviorMetrics)

    return overallScore
  }

  async getRiskProfile(userId: string): Promise<RiskProfileDocument | null> {
    return this.riskProfileModel.findOne({ userId }).exec()
  }

  async updateRiskFlags(userId: string, flags: string[]) {
    return this.riskProfileModel
      .findOneAndUpdate(
        { userId },
        { 
          $addToSet: { riskFlags: { $each: flags } },
          lastAssessment: new Date()
        },
        { new: true, upsert: true }
      )
      .exec()
  }

  async removeRiskFlag(userId: string, flag: string) {
    return this.riskProfileModel
      .findOneAndUpdate(
        { userId },
        { $pull: { riskFlags: flag } },
        { new: true }
      )
      .exec()
  }

  async setBlacklistStatus(userId: string, isBlacklisted: boolean, reason?: string) {
    const update: any = { 
      isBlacklisted,
      lastAssessment: new Date()
    }

    if (reason) {
      update.notes = reason
    }

    return this.riskProfileModel
      .findOneAndUpdate({ userId }, update, { new: true, upsert: true })
      .exec()
  }

  async requireManualReview(userId: string, reason: string) {
    return this.riskProfileModel
      .findOneAndUpdate(
        { userId },
        { 
          requiresManualReview: true,
          notes: reason,
          lastAssessment: new Date()
        },
        { new: true, upsert: true }
      )
      .exec()
  }

  async getHighRiskUsers(limit = 50) {
    return this.riskProfileModel
      .find({ overallRiskScore: { $gte: 70 } })
      .populate('userId', 'email profile kycStatus')
      .sort({ overallRiskScore: -1 })
      .limit(limit)
      .exec()
  }

  async getUsersRequiringReview() {
    return this.riskProfileModel
      .find({ requiresManualReview: true })
      .populate('userId', 'email profile kycStatus')
      .sort({ lastAssessment: -1 })
      .exec()
  }

  private async createInitialRiskProfile(userId: string): Promise<RiskProfileDocument> {
    const riskProfile = new this.riskProfileModel({
      userId,
      overallRiskScore: 50, // Neutral starting score
      riskLevel: 'medium',
      lastAssessment: new Date(),
      nextAssessment: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    })

    return riskProfile.save()
  }

  private async calculateRiskFactors(userId: string, user: any) {
    const factors = {
      accountAge: this.calculateAccountAgeScore(user.createdAt),
      kycStatus: this.calculateKycScore(user.kycStatus),
      loginPatterns: await this.calculateLoginPatternScore(userId),
      transactionPatterns: await this.calculateTransactionPatternScore(userId),
      bettingPatterns: await this.calculateBettingPatternScore(userId),
      geolocation: await this.calculateGeolocationScore(userId),
      deviceFingerprint: await this.calculateDeviceFingerprintScore(userId),
      socialSignals: this.calculateSocialSignalsScore(user),
    }

    return factors
  }

  private async calculateBehaviorMetrics(userId: string) {
    // These would integrate with actual services
    return {
      avgSessionDuration: 0,
      loginFrequency: 0,
      uniqueDevices: 0,
      uniqueIPs: 0,
      avgBetAmount: 0,
      bettingFrequency: 0,
      winLossRatio: 0,
      depositFrequency: 0,
      withdrawalFrequency: 0,
      avgTransactionAmount: 0,
    }
  }

  private calculateAccountAgeScore(createdAt: Date): number {
    const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    
    if (ageInDays < 1) return 80 // Very new account - high risk
    if (ageInDays < 7) return 60 // Less than a week - medium-high risk
    if (ageInDays < 30) return 40 // Less than a month - medium risk
    if (ageInDays < 90) return 20 // Less than 3 months - low-medium risk
    return 10 // Established account - low risk
  }

  private calculateKycScore(kycStatus: string): number {
    switch (kycStatus) {
      case 'verified': return 10 // Low risk
      case 'pending': return 40 // Medium risk
      case 'rejected': return 80 // High risk
      default: return 60 // Not started - medium-high risk
    }
  }

  private async calculateLoginPatternScore(userId: string): Promise<number> {
    // Analyze login patterns for suspicious behavior
    // This would integrate with SecurityService
    return 30 // Placeholder
  }

  private async calculateTransactionPatternScore(userId: string): Promise<number> {
    // Analyze transaction patterns
    // This would integrate with WalletService
    return 25 // Placeholder
  }

  private async calculateBettingPatternScore(userId: string): Promise<number> {
    // Analyze betting patterns
    // This would integrate with BettingService
    return 35 // Placeholder
  }

  private async calculateGeolocationScore(userId: string): Promise<number> {
    // Analyze geographical risk based on login locations
    return 20 // Placeholder
  }

  private async calculateDeviceFingerprintScore(userId: string): Promise<number> {
    // Analyze device consistency
    return 15 // Placeholder
  }

  private calculateSocialSignalsScore(user: any): number {
    // Analyze social media verification, email domain, etc.
    let score = 50

    // Check email domain
    const emailDomain = user.email.split('@')[1]
    const trustedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com']
    if (trustedDomains.includes(emailDomain)) {
      score -= 10
    }

    return Math.max(0, score)
  }

  private adjustScoreForBehavior(baseScore: number, metrics: any): number {
    let adjustedScore = baseScore

    // Adjust based on behavior metrics
    if (metrics.uniqueIPs > 10) adjustedScore += 10
    if (metrics.uniqueDevices > 5) adjustedScore += 5
    if (metrics.avgBetAmount > 1000) adjustedScore += 5
    if (metrics.winLossRatio > 0.8) adjustedScore += 10 // Suspiciously high win rate

    return adjustedScore
  }

  private async updateRiskProfile(
    userId: string,
    overallScore: number,
    riskFactors: any,
    behaviorMetrics: any
  ) {
    const riskLevel = this.determineRiskLevel(overallScore)
    
    const update = {
      overallRiskScore: overallScore,
      riskLevel,
      riskFactors,
      behaviorMetrics,
      lastAssessment: new Date(),
      nextAssessment: new Date(Date.now() + this.getNextAssessmentInterval(riskLevel)),
      $push: {
        riskHistory: {
          date: new Date(),
          score: overallScore,
          level: riskLevel,
          reason: 'Automated assessment',
          triggeredBy: 'system'
        }
      }
    }

    return this.riskProfileModel
      .findOneAndUpdate({ userId }, update, { new: true, upsert: true })
      .exec()
  }

  private determineRiskLevel(score: number): string {
    if (score >= 80) return 'critical'
    if (score >= 60) return 'high'
    if (score >= 40) return 'medium'
    return 'low'
  }

  private getNextAssessmentInterval(riskLevel: string): number {
    const intervals = {
      critical: 1 * 24 * 60 * 60 * 1000, // 1 day
      high: 3 * 24 * 60 * 60 * 1000, // 3 days
      medium: 7 * 24 * 60 * 60 * 1000, // 1 week
      low: 30 * 24 * 60 * 60 * 1000, // 1 month
    }

    return intervals[riskLevel] || intervals.medium
  }

  // Admin helper methods
  async getUserRiskScore(userId: string): Promise<any> {
    const riskProfile = await this.getRiskProfile(userId)
    if (!riskProfile) {
      return {
        score: 50,
        level: 'medium',
        lastAssessment: null,
        riskFactors: {},
      }
    }

    return {
      score: riskProfile.overallRiskScore,
      level: riskProfile.riskLevel,
      lastAssessment: riskProfile.lastAssessment,
      riskFactors: riskProfile.riskFactors,
      flags: riskProfile.riskFlags || [],
      requiresReview: riskProfile.requiresManualReview,
    }
  }

  async getSuspiciousUsers(options: {
    page: number
    limit: number
    riskLevel?: 'low' | 'medium' | 'high'
  }): Promise<any> {
    const { page, limit, riskLevel } = options
    const skip = (page - 1) * limit

    let query: any = {}
    
    if (riskLevel) {
      const scoreThresholds = {
        low: { $gte: 0, $lt: 40 },
        medium: { $gte: 40, $lt: 60 },
        high: { $gte: 60 }
      }
      query.overallRiskScore = scoreThresholds[riskLevel]
    } else {
      // Default to medium and high risk users
      query.overallRiskScore = { $gte: 40 }
    }

    const [users, total] = await Promise.all([
      this.riskProfileModel
        .find(query)
        .populate('userId', 'email profile kycStatus accountStatus')
        .sort({ overallRiskScore: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.riskProfileModel.countDocuments(query).exec(),
    ])

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  async getSuspiciousUsersCount(): Promise<number> {
    return this.riskProfileModel
      .countDocuments({ overallRiskScore: { $gte: 60 } })
      .exec()
  }

  async flagUser(
    userId: string,
    reason: string,
    severity: 'low' | 'medium' | 'high',
    flaggedBy: string,
    category: string
  ): Promise<any> {
    const flag = {
      reason,
      severity,
      category,
      flaggedBy,
      flaggedAt: new Date(),
    }

    return this.riskProfileModel
      .findOneAndUpdate(
        { userId },
        {
          $push: { flags: flag },
          $set: {
            isFlagged: true,
            lastAssessment: new Date(),
          },
        },
        { new: true, upsert: true }
      )
      .exec()
  }

  async unflagUser(userId: string, unflaggedBy: string): Promise<any> {
    return this.riskProfileModel
      .findOneAndUpdate(
        { userId },
        {
          $set: {
            isFlagged: false,
            flags: [],
            unflaggedBy,
            unflaggedAt: new Date(),
            lastAssessment: new Date(),
          },
        },
        { new: true }
      )
      .exec()
  }
}