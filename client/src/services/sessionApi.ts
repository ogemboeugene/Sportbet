import { api } from './api'

export interface SessionWarning {
  type: 'time_limit' | 'break_reminder' | 'daily_limit'
  message: string
  remainingTime?: number
  suggestedBreak?: number
}

export interface SessionInfo {
  isActive: boolean
  startTime?: string
  duration?: number
  remainingTime?: number
  warnings: SessionWarning[]
}

export interface SessionStatus {
  isActive: boolean
  startTime?: Date
  duration: number
  timeRemaining: number
  shouldShowWarning: boolean
  shouldShowBreakReminder: boolean
  warningMessage?: string
}

export interface SessionHistory {
  totalSessions: number
  totalTime: number
  averageSessionTime: number
  longestSession: number
  recentSessions: Array<{
    date: string
    duration: number
  }>
}

export interface GamblingPatternAnalysis {
  riskLevel: 'low' | 'medium' | 'high'
  indicators: string[]
  recommendations: string[]
  riskScore: number
  sessionPatterns: {
    averageSessionTime: number
    frequencyPerWeek: number
    largestBet: number
    totalSpent: number
    longestSession: number
    sessionsPerDay: number
    lateNightSessions: number
    weekendSessions: number
  }
}

export const sessionApi = {
  // Start a new session
  startSession: async () => {
    const response = await api.post('/users/session/start')
    return response.data
  },

  // Update session activity
  updateActivity: async () => {
    const response = await api.post('/users/session/activity')
    return response.data
  },

  // End current session
  endSession: async () => {
    const response = await api.post('/users/session/end')
    return response.data
  },

  // Get current session info
  getSessionInfo: async (): Promise<SessionInfo> => {
    const response = await api.get('/users/session/info')
    return response.data.data
  },

  // Get session status (enhanced version with warnings)
  getSessionStatus: async (): Promise<SessionStatus> => {
    const response = await api.get('/users/session/info')
    const sessionInfo = response.data.data
    
    // Transform SessionInfo to SessionStatus format
    const hasTimeWarning = sessionInfo.warnings?.some((w: SessionWarning) => w.type === 'time_limit')
    const hasBreakReminder = sessionInfo.warnings?.some((w: SessionWarning) => w.type === 'break_reminder')
    const timeWarning = sessionInfo.warnings?.find((w: SessionWarning) => w.type === 'time_limit')
    
    return {
      isActive: sessionInfo.isActive,
      startTime: sessionInfo.startTime ? new Date(sessionInfo.startTime) : undefined,
      duration: sessionInfo.duration || 0,
      timeRemaining: sessionInfo.remainingTime || 0,
      shouldShowWarning: hasTimeWarning,
      shouldShowBreakReminder: hasBreakReminder,
      warningMessage: timeWarning?.message
    }
  },

  // Get session history
  getSessionHistory: async (days = 30): Promise<SessionHistory> => {
    const response = await api.get(`/users/session/history?days=${days}`)
    return response.data.data
  },

  // Get gambling pattern analysis
  getGamblingPatternAnalysis: async (): Promise<GamblingPatternAnalysis> => {
    const response = await api.get('/users/gambling-pattern/analysis')
    return response.data.data
  },
}