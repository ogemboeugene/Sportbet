import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { ConfigService } from '@nestjs/config'
import { LoginHistory, LoginHistoryDocument } from '../../../database/schemas/login-history.schema'
import { EmailService } from './email.service'

@Injectable()
export class SecurityService {
  constructor(
    @InjectModel(LoginHistory.name) private loginHistoryModel: Model<LoginHistoryDocument>,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async logLoginAttempt(
    userId: string,
    ipAddress: string,
    userAgent: string,
    status: 'success' | 'failed' | 'blocked',
    failureReason?: string,
  ) {
    const loginRecord = new this.loginHistoryModel({
      userId,
      ipAddress,
      userAgent,
      status,
      failureReason,
      location: await this.getLocationFromIP(ipAddress),
    })

    await loginRecord.save()

    // Check for suspicious activity
    if (status === 'success') {
      await this.checkForSuspiciousActivity(userId, ipAddress, userAgent)
    }

    return loginRecord
  }

  async getLoginHistory(userId: string, limit = 20) {
    return this.loginHistoryModel
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec()
  }

  async checkForSuspiciousActivity(userId: string, ipAddress: string, userAgent: string) {
    const recentLogins = await this.loginHistoryModel
      .find({
        userId,
        status: 'success',
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      })
      .sort({ timestamp: -1 })
      .limit(10)
      .exec()

    // Check for login from new location/device
    const isNewLocation = !recentLogins.some(login => 
      login.ipAddress === ipAddress && login.userAgent === userAgent
    )

    if (isNewLocation && recentLogins.length > 0) {
      // Send security alert
      const user = await this.getUserById(userId)
      if (user) {
        await this.emailService.sendSecurityAlert(user.email, 'login from new location/device', {
          ipAddress,
          userAgent,
          location: await this.getLocationFromIP(ipAddress),
        })
      }
    }

    // Check for multiple failed attempts
    const failedAttempts = await this.loginHistoryModel
      .countDocuments({
        userId,
        status: 'failed',
        timestamp: { $gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
      })
      .exec()

    if (failedAttempts >= 3) {
      const user = await this.getUserById(userId)
      if (user) {
        await this.emailService.sendSecurityAlert(user.email, 'multiple failed login attempts', {
          ipAddress,
          userAgent,
          failedAttempts,
        })
      }
    }
  }

  async detectAnomalousActivity(userId: string) {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Get recent login patterns
    const recentLogins = await this.loginHistoryModel
      .find({
        userId,
        status: 'success',
        timestamp: { $gte: oneWeekAgo },
      })
      .sort({ timestamp: -1 })
      .exec()

    const todayLogins = recentLogins.filter(login => login.timestamp >= oneDayAgo)
    const uniqueIPs = new Set(recentLogins.map(login => login.ipAddress))
    const uniqueUserAgents = new Set(recentLogins.map(login => login.userAgent))

    // Detect anomalies
    const anomalies = []

    // Too many logins in a short period
    if (todayLogins.length > 20) {
      anomalies.push('Excessive login frequency')
    }

    // Login from too many different IPs
    if (uniqueIPs.size > 5) {
      anomalies.push('Multiple IP addresses')
    }

    // Login from too many different devices
    if (uniqueUserAgents.size > 3) {
      anomalies.push('Multiple devices')
    }

    return {
      isAnomalous: anomalies.length > 0,
      anomalies,
      stats: {
        totalLogins: recentLogins.length,
        todayLogins: todayLogins.length,
        uniqueIPs: uniqueIPs.size,
        uniqueDevices: uniqueUserAgents.size,
      },
    }
  }

  private async getLocationFromIP(ipAddress: string): Promise<string> {
    // In a real application, you would use a geolocation service
    // For now, return a placeholder
    if (ipAddress === '127.0.0.1' || ipAddress.startsWith('192.168.')) {
      return 'Local Network'
    }
    return 'Unknown Location'
  }

  private async getUserById(userId: string) {
    // This would typically use the UsersService
    // For now, return null to avoid circular dependency
    return null
  }
}