import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { User, UserDocument } from '../../../database/schemas/user.schema'

export interface SessionData {
  userId: string
  startTime: Date
  lastActivity: Date
  ipAddress?: string
  userAgent?: string
}

export interface SessionWarning {
  type: 'time_limit' | 'break_reminder' | 'daily_limit'
  message: string
  remainingTime?: number
  suggestedBreak?: number
}

@Injectable()
export class SessionManagementService {
  private activeSessions = new Map<string, SessionData>()
  private sessionTimers = new Map<string, NodeJS.Timeout>()

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async startSession(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const user = await this.userModel.findById(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    // Check if user is self-excluded
    if (user.selfExclusion?.isExcluded) {
      throw new Error('User is self-excluded and cannot start a session')
    }

    const sessionData: SessionData = {
      userId,
      startTime: new Date(),
      lastActivity: new Date(),
      ipAddress,
      userAgent,
    }

    this.activeSessions.set(userId, sessionData)
    this.setupSessionTimer(userId, user.limits.sessionTime)

    // Update user stats
    await this.userModel.findByIdAndUpdate(userId, {
      $inc: { 'stats.totalSessions': 1 },
      lastLogin: new Date(),
    })
  }

  async updateSessionActivity(userId: string): Promise<void> {
    const session = this.activeSessions.get(userId)
    if (session) {
      session.lastActivity = new Date()
    }
  }

  async endSession(userId: string): Promise<void> {
    const session = this.activeSessions.get(userId)
    if (!session) {
      return
    }

    const sessionDuration = Date.now() - session.startTime.getTime()
    const sessionDurationMinutes = Math.floor(sessionDuration / (1000 * 60))

    // Update user stats
    await this.userModel.findByIdAndUpdate(userId, {
      $inc: { 'stats.totalSessionTime': sessionDurationMinutes },
      'stats.lastSessionDuration': sessionDurationMinutes,
      'stats.lastSessionEnd': new Date(),
    })

    // Clean up
    this.activeSessions.delete(userId)
    const timer = this.sessionTimers.get(userId)
    if (timer) {
      clearTimeout(timer)
      this.sessionTimers.delete(userId)
    }
  }

  async getSessionInfo(userId: string): Promise<{
    isActive: boolean
    startTime?: Date
    duration?: number
    remainingTime?: number
    warnings: SessionWarning[]
  }> {
    const session = this.activeSessions.get(userId)
    const user = await this.userModel.findById(userId)
    
    if (!session || !user) {
      return { isActive: false, warnings: [] }
    }

    const duration = Date.now() - session.startTime.getTime()
    const durationMinutes = Math.floor(duration / (1000 * 60))
    const sessionLimitMinutes = user.limits.sessionTime
    const remainingMinutes = Math.max(0, sessionLimitMinutes - durationMinutes)

    const warnings: SessionWarning[] = []

    // Critical time limit warnings
    if (remainingMinutes <= 5 && remainingMinutes > 0) {
      warnings.push({
        type: 'time_limit',
        message: `URGENT: Your session will end in ${remainingMinutes} minutes. Please finish your current activities.`,
        remainingTime: remainingMinutes,
      })
    } else if (remainingMinutes <= 15 && remainingMinutes > 5) {
      warnings.push({
        type: 'time_limit',
        message: `Your session will end in ${remainingMinutes} minutes. Consider wrapping up.`,
        remainingTime: remainingMinutes,
      })
    } else if (remainingMinutes <= 30 && remainingMinutes > 15) {
      warnings.push({
        type: 'time_limit',
        message: `You have ${remainingMinutes} minutes remaining in this session.`,
        remainingTime: remainingMinutes,
      })
    }

    // Progressive break reminders
    if (durationMinutes >= 120 && durationMinutes % 60 === 0) { // Every hour after 2 hours
      warnings.push({
        type: 'break_reminder',
        message: `You've been playing for ${Math.floor(durationMinutes / 60)} hours. Consider taking a 15-minute break.`,
        suggestedBreak: 15,
      })
    } else if (durationMinutes >= 60 && durationMinutes % 30 === 0) { // Every 30 minutes after 1 hour
      warnings.push({
        type: 'break_reminder',
        message: 'Consider taking a short break. You\'ve been playing for over an hour.',
        suggestedBreak: 10,
      })
    }

    // Daily limit warnings (simplified - would need more sophisticated tracking)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const dailyPlayTime = durationMinutes // Simplified - would track across all sessions today
    
    if (dailyPlayTime > 240) { // More than 4 hours today
      warnings.push({
        type: 'daily_limit',
        message: 'You\'ve been gambling for over 4 hours today. Consider taking a longer break.',
        suggestedBreak: 60,
      })
    }

    return {
      isActive: true,
      startTime: session.startTime,
      duration: durationMinutes,
      remainingTime: remainingMinutes,
      warnings,
    }
  }

  async forceEndSession(userId: string, reason: string): Promise<void> {
    await this.endSession(userId)
    
    // Log the forced session end
    console.log(`Session forcefully ended for user ${userId}: ${reason}`)
  }

  async getActiveSessions(): Promise<SessionData[]> {
    return Array.from(this.activeSessions.values())
  }

  async getUserSessionHistory(userId: string, days = 30): Promise<{
    totalSessions: number
    totalTime: number
    averageSessionTime: number
    longestSession: number
    recentSessions: Array<{
      date: Date
      duration: number
    }>
  }> {
    const user = await this.userModel.findById(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    // This is a simplified version - in production, you'd want to store detailed session history
    const averageSessionTime = user.stats.totalSessions > 0 
      ? Math.floor(user.stats.totalSessionTime / user.stats.totalSessions)
      : 0

    return {
      totalSessions: user.stats.totalSessions,
      totalTime: user.stats.totalSessionTime,
      averageSessionTime,
      longestSession: user.stats.lastSessionDuration, // Simplified
      recentSessions: [], // Would be populated from detailed session logs
    }
  }

  private setupSessionTimer(userId: string, sessionLimitMinutes: number): void {
    const timer = setTimeout(async () => {
      await this.forceEndSession(userId, 'Session time limit reached')
    }, sessionLimitMinutes * 60 * 1000)

    this.sessionTimers.set(userId, timer)
  }

  async analyzeGamblingPattern(userId: string): Promise<{
    riskLevel: 'low' | 'medium' | 'high'
    indicators: string[]
    recommendations: string[]
    riskScore: number
    sessionPatterns: {
      averageSessionTime: number
      longestSession: number
      sessionsPerDay: number
      lateNightSessions: number
      weekendSessions: number
    }
  }> {
    const user = await this.userModel.findById(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    const indicators: string[] = []
    const recommendations: string[] = []
    let riskScore = 0

    // Calculate session patterns
    const avgSessionTime = user.stats.totalSessions > 0 
      ? user.stats.totalSessionTime / user.stats.totalSessions 
      : 0

    const daysSinceRegistration = Math.max(1, Math.floor(
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    ))
    const sessionsPerDay = user.stats.totalSessions / daysSinceRegistration

    // Session duration analysis
    if (avgSessionTime > 240) { // More than 4 hours average
      indicators.push('Very long average session duration (>4 hours)')
      recommendations.push('Consider setting shorter session limits (2-3 hours maximum)')
      riskScore += 30
    } else if (avgSessionTime > 180) { // More than 3 hours average
      indicators.push('Long average session duration (>3 hours)')
      recommendations.push('Consider setting shorter session limits')
      riskScore += 20
    } else if (avgSessionTime > 120) { // More than 2 hours average
      indicators.push('Moderate session duration')
      recommendations.push('Monitor your session time and take regular breaks')
      riskScore += 10
    }

    if (user.stats.lastSessionDuration > 360) { // More than 6 hours
      indicators.push('Extremely long recent session (>6 hours)')
      recommendations.push('Take immediate breaks and consider self-exclusion options')
      riskScore += 40
    } else if (user.stats.lastSessionDuration > 300) { // More than 5 hours
      indicators.push('Very long recent session (>5 hours)')
      recommendations.push('Take regular breaks during gaming sessions')
      riskScore += 25
    }

    // Frequency analysis
    if (sessionsPerDay > 5) {
      indicators.push('Very high frequency of gaming sessions (>5 per day)')
      recommendations.push('Consider limiting daily gaming sessions to 1-2 maximum')
      riskScore += 35
    } else if (sessionsPerDay > 3) {
      indicators.push('High frequency of gaming sessions (>3 per day)')
      recommendations.push('Consider limiting daily gaming sessions')
      riskScore += 20
    } else if (sessionsPerDay > 2) {
      indicators.push('Moderate frequency of gaming sessions')
      recommendations.push('Monitor your gaming frequency')
      riskScore += 10
    }

    // Time pattern analysis (simplified - would need more detailed session logs in production)
    const currentSession = this.activeSessions.get(userId)
    let lateNightSessions = 0
    let weekendSessions = 0

    if (currentSession) {
      const sessionHour = currentSession.startTime.getHours()
      const sessionDay = currentSession.startTime.getDay()

      if (sessionHour >= 23 || sessionHour <= 5) {
        lateNightSessions = 1
        indicators.push('Late night gaming sessions detected')
        recommendations.push('Avoid gaming during late hours (11 PM - 6 AM)')
        riskScore += 15
      }

      if (sessionDay === 0 || sessionDay === 6) {
        weekendSessions = 1
      }
    }

    // Limit breach analysis
    const sessionLimitMinutes = user.limits.sessionTime
    if (avgSessionTime > sessionLimitMinutes) {
      indicators.push('Regularly exceeding set session time limits')
      recommendations.push('Review and enforce your session time limits')
      riskScore += 25
    }

    // Recent activity spike
    if (user.stats.lastSessionEnd) {
      const hoursSinceLastSession = (Date.now() - user.stats.lastSessionEnd.getTime()) / (1000 * 60 * 60)
      if (hoursSinceLastSession < 2 && user.stats.lastSessionDuration > 120) {
        indicators.push('Quick return after long session')
        recommendations.push('Take longer breaks between gaming sessions')
        riskScore += 20
      }
    }

    // Determine risk level based on score
    let riskLevel: 'low' | 'medium' | 'high'
    if (riskScore >= 60) {
      riskLevel = 'high'
    } else if (riskScore >= 30) {
      riskLevel = 'medium'
    } else {
      riskLevel = 'low'
    }

    // Add risk-level specific recommendations
    if (riskLevel === 'high') {
      recommendations.unshift('Consider self-exclusion or seeking professional help')
      recommendations.push('Contact gambling support services immediately')
    } else if (riskLevel === 'medium') {
      recommendations.push('Consider using our responsible gambling tools')
      recommendations.push('Set stricter deposit and time limits')
    } else if (indicators.length === 0) {
      recommendations.push('Your gaming patterns appear healthy')
      recommendations.push('Continue to gamble responsibly')
    }

    // Always include general responsible gambling advice
    recommendations.push('Never gamble more than you can afford to lose')
    recommendations.push('Set budgets and time limits before you start')

    const sessionPatterns = {
      averageSessionTime: Math.round(avgSessionTime),
      longestSession: user.stats.lastSessionDuration,
      sessionsPerDay: Math.round(sessionsPerDay * 10) / 10,
      lateNightSessions,
      weekendSessions,
    }

    return {
      riskLevel,
      indicators,
      recommendations,
      riskScore,
      sessionPatterns,
    }
  }
}