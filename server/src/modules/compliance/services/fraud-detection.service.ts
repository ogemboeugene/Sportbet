import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { ComplianceAlert, ComplianceAlertDocument } from '../../../database/schemas/compliance-alert.schema'
import { RiskProfile, RiskProfileDocument } from '../../../database/schemas/risk-profile.schema'
import { SecurityService } from '../../auth/services/security.service'

@Injectable()
export class FraudDetectionService {
  constructor(
    @InjectModel(ComplianceAlert.name) private complianceAlertModel: Model<ComplianceAlertDocument>,
    @InjectModel(RiskProfile.name) private riskProfileModel: Model<RiskProfileDocument>,
    private securityService: SecurityService,
  ) {}

  async detectSuspiciousLogin(userId: string, ipAddress: string, userAgent: string, location?: string) {
    const alerts = []

    // Check for rapid login attempts from different locations
    const recentLogins = await this.securityService.getLoginHistory(userId, 50)
    const last24Hours = recentLogins.filter(
      login => new Date(login.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    )

    // Check for multiple IPs in short time
    const uniqueIPs = new Set(last24Hours.map(login => login.ipAddress))
    if (uniqueIPs.size > 5) {
      alerts.push(await this.createAlert(userId, 'suspicious_login', 'high', 
        'Multiple IP addresses used within 24 hours', {
          ipAddress,
          userAgent,
          location,
          uniqueIPs: uniqueIPs.size,
          timeWindow: '24h'
        }))
    }

    // Check for unusual location
    const commonLocations = last24Hours
      .filter(login => login.location && login.location !== 'Unknown Location')
      .map(login => login.location)
    
    if (location && location !== 'Unknown Location' && !commonLocations.includes(location)) {
      const isNewLocation = !recentLogins.some(login => login.location === location)
      if (isNewLocation) {
        alerts.push(await this.createAlert(userId, 'geo_location_risk', 'medium',
          'Login from new geographical location', {
            ipAddress,
            location,
            previousLocations: commonLocations
          }))
      }
    }

    return alerts
  }

  async detectUnusualBettingPattern(userId: string, betData: any) {
    const alerts = []

    // Check for unusually large bets
    if (betData.amount > 10000) { // $10,000 threshold
      alerts.push(await this.createAlert(userId, 'unusual_betting_pattern', 'high',
        'Unusually large bet amount', {
          betAmount: betData.amount,
          betType: betData.type,
          odds: betData.odds
        }))
    }

    // Check for rapid betting (velocity check)
    const recentBets = await this.getRecentBets(userId, 60) // Last hour
    if (recentBets.length > 50) {
      alerts.push(await this.createAlert(userId, 'velocity_check', 'medium',
        'High frequency betting detected', {
          betCount: recentBets.length,
          timeWindow: '1h',
          totalAmount: recentBets.reduce((sum, bet) => sum + bet.amount, 0)
        }))
    }

    // Check for unusual betting patterns (always betting on favorites, etc.)
    const bettingPatternScore = await this.analyzeBettingPatterns(userId)
    if (bettingPatternScore > 80) {
      alerts.push(await this.createAlert(userId, 'unusual_betting_pattern', 'medium',
        'Suspicious betting pattern detected', {
          patternScore: bettingPatternScore,
          analysis: 'Consistent pattern suggesting possible insider knowledge or manipulation'
        }))
    }

    return alerts
  }

  async detectLargeTransaction(userId: string, transactionData: any) {
    const alerts = []

    // Check for large deposits
    if (transactionData.type === 'deposit' && transactionData.amount > 50000) {
      alerts.push(await this.createAlert(userId, 'large_transaction', 'high',
        'Large deposit transaction', {
          transactionAmount: transactionData.amount,
          paymentMethod: transactionData.paymentMethod,
          currency: transactionData.currency
        }))
    }

    // Check for rapid deposits
    const recentDeposits = await this.getRecentTransactions(userId, 'deposit', 24) // Last 24 hours
    const totalDeposits = recentDeposits.reduce((sum, tx) => sum + tx.amount, 0)
    
    if (totalDeposits > 25000) {
      alerts.push(await this.createAlert(userId, 'rapid_deposits', 'medium',
        'Multiple large deposits in short timeframe', {
          totalAmount: totalDeposits,
          transactionCount: recentDeposits.length,
          timeWindow: '24h'
        }))
    }

    return alerts
  }

  async detectMultipleAccounts(userId: string, userData: any) {
    // Check for duplicate personal information
    const duplicateChecks = [
      { field: 'phoneNumber', value: userData.phoneNumber },
      { field: 'address', value: userData.address },
      { field: 'bankAccount', value: userData.bankAccount },
    ]

    const alerts = []
    
    for (const check of duplicateChecks) {
      if (check.value) {
        const duplicateCount = await this.checkForDuplicates(check.field, check.value, userId)
        if (duplicateCount > 0) {
          alerts.push(await this.createAlert(userId, 'multiple_accounts', 'high',
            `Duplicate ${check.field} detected`, {
              field: check.field,
              value: check.value,
              duplicateCount
            }))
        }
      }
    }

    return alerts
  }

  async detectKycMismatch(userId: string, kycData: any, userData: any) {
    const alerts = []

    // Check for name mismatches
    if (kycData.firstName.toLowerCase() !== userData.firstName.toLowerCase() ||
        kycData.lastName.toLowerCase() !== userData.lastName.toLowerCase()) {
      alerts.push(await this.createAlert(userId, 'kyc_mismatch', 'high',
        'Name mismatch between KYC document and profile', {
          profileName: `${userData.firstName} ${userData.lastName}`,
          kycName: `${kycData.firstName} ${kycData.lastName}`
        }))
    }

    // Check for date of birth mismatch
    if (kycData.dateOfBirth !== userData.dateOfBirth) {
      alerts.push(await this.createAlert(userId, 'kyc_mismatch', 'medium',
        'Date of birth mismatch', {
          profileDob: userData.dateOfBirth,
          kycDob: kycData.dateOfBirth
        }))
    }

    return alerts
  }

  async createAlert(
    userId: string,
    alertType: string,
    severity: string,
    description: string,
    metadata: any
  ): Promise<ComplianceAlertDocument> {
    const alert = new this.complianceAlertModel({
      userId,
      alertType,
      severity,
      description,
      metadata,
    })

    return alert.save()
  }

  async getActiveAlerts(userId?: string, severity?: string, alertType?: string) {
    const query: any = { status: { $in: ['open', 'investigating'] } }
    
    if (userId) query.userId = userId
    if (severity) query.severity = severity
    if (alertType) query.alertType = alertType

    return this.complianceAlertModel
      .find(query)
      .populate('userId', 'email profile')
      .sort({ triggeredAt: -1 })
      .exec()
  }

  async updateAlertStatus(alertId: string, status: string, notes?: string, resolution?: string) {
    const updateData: any = { status }
    
    if (notes) updateData.investigationNotes = notes
    if (resolution) updateData.resolution = resolution
    if (status === 'resolved') updateData.resolvedAt = new Date()

    return this.complianceAlertModel
      .findByIdAndUpdate(alertId, updateData, { new: true })
      .exec()
  }

  async assignAlert(alertId: string, assignedTo: string) {
    return this.complianceAlertModel
      .findByIdAndUpdate(alertId, { assignedTo, status: 'investigating' }, { new: true })
      .exec()
  }

  private async getRecentBets(userId: string, hours: number) {
    // This would integrate with the betting service
    // For now, return mock data
    return []
  }

  private async getRecentTransactions(userId: string, type: string, hours: number) {
    // This would integrate with the wallet service
    // For now, return mock data
    return []
  }

  private async analyzeBettingPatterns(userId: string): Promise<number> {
    // Analyze betting patterns and return risk score (0-100)
    // This would involve complex analysis of betting history
    return Math.floor(Math.random() * 100)
  }

  private async checkForDuplicates(field: string, value: string, excludeUserId: string): Promise<number> {
    // This would check for duplicate values in user profiles
    // For now, return 0
    return 0
  }
}