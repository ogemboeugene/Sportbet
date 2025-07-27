import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ComplianceAlert, ComplianceAlertDocument } from '../../database/schemas/compliance-alert.schema'
import { RiskProfile, RiskProfileDocument } from '../../database/schemas/risk-profile.schema'
import { FraudDetectionService } from './services/fraud-detection.service'
import { RiskScoringService } from './services/risk-scoring.service'
import { UsersService } from '../users/users.service'

@Injectable()
export class ComplianceService {
  constructor(
    @InjectModel(ComplianceAlert.name) private complianceAlertModel: Model<ComplianceAlertDocument>,
    @InjectModel(RiskProfile.name) private riskProfileModel: Model<RiskProfileDocument>,
    private fraudDetectionService: FraudDetectionService,
    private riskScoringService: RiskScoringService,
    private usersService: UsersService,
  ) {}

  // Automated compliance checks
  async performLoginCompliance(userId: string, ipAddress: string, userAgent: string, location?: string) {
    const alerts = []

    // Run fraud detection
    const fraudAlerts = await this.fraudDetectionService.detectSuspiciousLogin(
      userId, ipAddress, userAgent, location
    )
    alerts.push(...fraudAlerts)

    // Update risk score
    const riskScore = await this.riskScoringService.calculateRiskScore(userId)
    
    // Check if risk score triggers additional alerts
    if (riskScore > 80) {
      const alert = await this.fraudDetectionService.createAlert(
        userId,
        'geo_location_risk',
        'high',
        'High risk score detected during login',
        { riskScore, ipAddress, userAgent, location }
      )
      alerts.push(alert)
    }

    return { alerts, riskScore }
  }

  async performTransactionCompliance(userId: string, transactionData: any) {
    const alerts = []

    // Check transaction limits based on KYC status
    const user = await this.usersService.findById(userId)
    if (!user) return { alerts, approved: false }

    const limits = this.getTransactionLimits(user.kycStatus)
    
    if (transactionData.amount > limits.single) {
      alerts.push(await this.fraudDetectionService.createAlert(
        userId,
        'large_transaction',
        'medium',
        'Transaction exceeds single transaction limit',
        { 
          transactionAmount: transactionData.amount,
          limit: limits.single,
          kycStatus: user.kycStatus
        }
      ))
    }

    // Run fraud detection
    const fraudAlerts = await this.fraudDetectionService.detectLargeTransaction(userId, transactionData)
    alerts.push(...fraudAlerts)

    // Check daily/monthly limits
    const dailyTotal = await this.getDailyTransactionTotal(userId, transactionData.type)
    if (dailyTotal + transactionData.amount > limits.daily) {
      alerts.push(await this.fraudDetectionService.createAlert(
        userId,
        'rapid_deposits',
        'medium',
        'Daily transaction limit exceeded',
        { 
          dailyTotal,
          transactionAmount: transactionData.amount,
          limit: limits.daily
        }
      ))
    }

    // Determine if transaction should be approved
    const approved = this.shouldApproveTransaction(alerts, user.kycStatus, transactionData.amount)

    return { alerts, approved }
  }

  async performBettingCompliance(userId: string, betData: any) {
    const alerts = []

    // Run fraud detection
    const fraudAlerts = await this.fraudDetectionService.detectUnusualBettingPattern(userId, betData)
    alerts.push(...fraudAlerts)

    // Check betting limits
    const user = await this.usersService.findById(userId)
    if (!user) return { alerts, approved: false }

    const bettingLimits = this.getBettingLimits(user.kycStatus)
    
    if (betData.amount > bettingLimits.maxBet) {
      alerts.push(await this.fraudDetectionService.createAlert(
        userId,
        'unusual_betting_pattern',
        'medium',
        'Bet amount exceeds maximum limit',
        { 
          betAmount: betData.amount,
          limit: bettingLimits.maxBet,
          kycStatus: user.kycStatus
        }
      ))
    }

    const approved = betData.amount <= bettingLimits.maxBet && alerts.length === 0

    return { alerts, approved }
  }

  // Compliance reporting
  async generateComplianceReport(startDate: Date, endDate: Date) {
    const [alerts, riskProfiles, userStats] = await Promise.all([
      this.getAlertsInPeriod(startDate, endDate),
      this.getRiskProfileStats(),
      this.getUserComplianceStats(startDate, endDate),
    ])

    return {
      period: { startDate, endDate },
      summary: {
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
        highRiskUsers: riskProfiles.highRisk,
        resolvedAlerts: alerts.filter(a => a.status === 'resolved').length,
        averageResolutionTime: this.calculateAverageResolutionTime(alerts),
      },
      alertsByType: this.groupAlertsByType(alerts),
      alertsBySeverity: this.groupAlertsBySeverity(alerts),
      riskDistribution: riskProfiles.distribution,
      userStats,
      recommendations: this.generateRecommendations(alerts, riskProfiles),
    }
  }

  async getComplianceDashboard() {
    const [activeAlerts, highRiskUsers, recentAlerts, stats] = await Promise.all([
      this.fraudDetectionService.getActiveAlerts(),
      this.riskScoringService.getHighRiskUsers(20),
      this.getRecentAlerts(50),
      this.getComplianceStats(),
    ])

    return {
      activeAlerts: activeAlerts.length,
      highRiskUsers: highRiskUsers.length,
      criticalAlerts: activeAlerts.filter(a => a.severity === 'critical').length,
      recentAlerts,
      stats,
      alertsByType: this.groupAlertsByType(activeAlerts),
      riskDistribution: await this.getRiskDistribution(),
    }
  }

  // Manual review functions
  async assignAlertToReviewer(alertId: string, reviewerId: string) {
    return this.fraudDetectionService.assignAlert(alertId, reviewerId)
  }

  async updateAlertStatus(alertId: string, status: string, notes?: string, resolution?: string) {
    return this.fraudDetectionService.updateAlertStatus(alertId, status, notes, resolution)
  }

  async escalateAlert(alertId: string, reason: string) {
    const alert = await this.complianceAlertModel.findById(alertId).exec()
    if (!alert) throw new Error('Alert not found')

    // Increase severity
    const severityLevels = ['low', 'medium', 'high', 'critical']
    const currentIndex = severityLevels.indexOf(alert.severity)
    const newSeverity = severityLevels[Math.min(currentIndex + 1, severityLevels.length - 1)]

    return this.complianceAlertModel.findByIdAndUpdate(
      alertId,
      {
        severity: newSeverity,
        investigationNotes: `${alert.investigationNotes || ''}\n\nEscalated: ${reason}`,
        status: 'investigating',
      },
      { new: true }
    ).exec()
  }

  // Automated compliance tasks
  @Cron(CronExpression.EVERY_HOUR)
  async runHourlyComplianceChecks() {
    console.log('Running hourly compliance checks...')
    
    // Check for users requiring risk assessment
    const usersForAssessment = await this.riskProfileModel
      .find({ nextAssessment: { $lte: new Date() } })
      .limit(100)
      .exec()

    for (const profile of usersForAssessment) {
      await this.riskScoringService.calculateRiskScore(profile.userId.toString())
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runDailyComplianceReport() {
    console.log('Generating daily compliance report...')
    
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const today = new Date()
    
    const report = await this.generateComplianceReport(yesterday, today)
    
    // TODO: Send report to compliance team
    console.log('Daily compliance report generated:', report.summary)
  }

  // Helper methods
  private getTransactionLimits(kycStatus: string) {
    const limits = {
      pending: { single: 1000, daily: 2000, monthly: 10000 },
      verified: { single: 50000, daily: 100000, monthly: 500000 },
      rejected: { single: 100, daily: 200, monthly: 1000 },
    }

    return limits[kycStatus] || limits.pending
  }

  private getBettingLimits(kycStatus: string) {
    const limits = {
      pending: { maxBet: 500, dailyLimit: 1000 },
      verified: { maxBet: 25000, dailyLimit: 50000 },
      rejected: { maxBet: 50, dailyLimit: 100 },
    }

    return limits[kycStatus] || limits.pending
  }

  private async getDailyTransactionTotal(userId: string, type: string): Promise<number> {
    // This would integrate with the wallet service
    return 0
  }

  private shouldApproveTransaction(alerts: any[], kycStatus: string, amount: number): boolean {
    const criticalAlerts = alerts.filter(a => a.severity === 'critical')
    if (criticalAlerts.length > 0) return false

    const highAlerts = alerts.filter(a => a.severity === 'high')
    if (highAlerts.length > 2) return false

    if (kycStatus === 'rejected' && amount > 100) return false

    return true
  }

  private async getAlertsInPeriod(startDate: Date, endDate: Date) {
    return this.complianceAlertModel
      .find({
        triggeredAt: { $gte: startDate, $lte: endDate }
      })
      .exec()
  }

  private async getRiskProfileStats() {
    const [total, critical, high, medium, low] = await Promise.all([
      this.riskProfileModel.countDocuments().exec(),
      this.riskProfileModel.countDocuments({ riskLevel: 'critical' }).exec(),
      this.riskProfileModel.countDocuments({ riskLevel: 'high' }).exec(),
      this.riskProfileModel.countDocuments({ riskLevel: 'medium' }).exec(),
      this.riskProfileModel.countDocuments({ riskLevel: 'low' }).exec(),
    ])

    return {
      total,
      highRisk: critical + high,
      distribution: { critical, high, medium, low }
    }
  }

  private async getUserComplianceStats(startDate: Date, endDate: Date) {
    // This would integrate with user service to get registration stats
    return {
      newUsers: 0,
      kycCompleted: 0,
      kycPending: 0,
      suspendedUsers: 0,
    }
  }

  private calculateAverageResolutionTime(alerts: any[]): number {
    const resolvedAlerts = alerts.filter(a => a.status === 'resolved' && a.resolvedAt)
    if (resolvedAlerts.length === 0) return 0

    const totalTime = resolvedAlerts.reduce((sum, alert) => {
      return sum + (new Date(alert.resolvedAt).getTime() - new Date(alert.triggeredAt).getTime())
    }, 0)

    return totalTime / resolvedAlerts.length / (1000 * 60 * 60) // Convert to hours
  }

  private groupAlertsByType(alerts: any[]) {
    return alerts.reduce((acc, alert) => {
      acc[alert.alertType] = (acc[alert.alertType] || 0) + 1
      return acc
    }, {})
  }

  private groupAlertsBySeverity(alerts: any[]) {
    return alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1
      return acc
    }, {})
  }

  private generateRecommendations(alerts: any[], riskProfiles: any) {
    const recommendations = []

    if (riskProfiles.highRisk > riskProfiles.total * 0.1) {
      recommendations.push('High number of high-risk users detected. Consider tightening KYC requirements.')
    }

    const criticalAlerts = alerts.filter(a => a.severity === 'critical')
    if (criticalAlerts.length > 10) {
      recommendations.push('Multiple critical alerts detected. Review fraud detection thresholds.')
    }

    return recommendations
  }

  private async getRecentAlerts(limit: number) {
    return this.complianceAlertModel
      .find()
      .populate('userId', 'email profile')
      .sort({ triggeredAt: -1 })
      .limit(limit)
      .exec()
  }

  private async getComplianceStats() {
    const [totalAlerts, activeAlerts, resolvedToday] = await Promise.all([
      this.complianceAlertModel.countDocuments().exec(),
      this.complianceAlertModel.countDocuments({ status: { $in: ['open', 'investigating'] } }).exec(),
      this.complianceAlertModel.countDocuments({
        status: 'resolved',
        resolvedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }).exec(),
    ])

    return { totalAlerts, activeAlerts, resolvedToday }
  }

  private async getRiskDistribution() {
    return this.riskProfileModel.aggregate([
      {
        $group: {
          _id: '$riskLevel',
          count: { $sum: 1 }
        }
      }
    ]).exec()
  }
}