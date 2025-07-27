import axios from 'axios'
import { ApiResponse } from '../types'

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000'

const complianceApiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/compliance`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
complianceApiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export interface ComplianceAlert {
  _id: string
  userId: {
    _id: string
    email: string
    profile: {
      firstName: string
      lastName: string
    }
  }
  alertType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'investigating' | 'resolved' | 'false_positive'
  description: string
  metadata: any
  assignedTo?: string
  investigationNotes?: string
  resolution?: string
  triggeredAt: string
  resolvedAt?: string
}

export interface RiskProfile {
  _id: string
  userId: {
    _id: string
    email: string
    profile: {
      firstName: string
      lastName: string
    }
  }
  overallRiskScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  riskFactors: any
  behaviorMetrics: any
  riskFlags: string[]
  lastAssessment: string
  isBlacklisted: boolean
  requiresManualReview: boolean
  notes?: string
}

export interface ComplianceDashboard {
  activeAlerts: number
  highRiskUsers: number
  criticalAlerts: number
  recentAlerts: ComplianceAlert[]
  stats: {
    totalAlerts: number
    activeAlerts: number
    resolvedToday: number
  }
  alertsByType: Record<string, number>
  riskDistribution: Array<{ _id: string; count: number }>
}

export const complianceApi = {
  getDashboard: (): Promise<ApiResponse<ComplianceDashboard>> =>
    complianceApiClient.get('/dashboard'),

  getAlerts: (params?: {
    userId?: string
    severity?: string
    alertType?: string
    status?: string
  }): Promise<ApiResponse<ComplianceAlert[]>> => {
    const searchParams = new URLSearchParams()
    if (params?.userId) searchParams.append('userId', params.userId)
    if (params?.severity) searchParams.append('severity', params.severity)
    if (params?.alertType) searchParams.append('alertType', params.alertType)
    if (params?.status) searchParams.append('status', params.status)
    
    return complianceApiClient.get(`/alerts?${searchParams.toString()}`)
  },

  assignAlert: (alertId: string, assignedTo: string): Promise<ApiResponse<ComplianceAlert>> =>
    complianceApiClient.put(`/alerts/${alertId}/assign`, { assignedTo }),

  updateAlertStatus: (
    alertId: string,
    status: string,
    notes?: string,
    resolution?: string
  ): Promise<ApiResponse<ComplianceAlert>> =>
    complianceApiClient.put(`/alerts/${alertId}/status`, { status, notes, resolution }),

  escalateAlert: (alertId: string, reason: string): Promise<ApiResponse<ComplianceAlert>> =>
    complianceApiClient.post(`/alerts/${alertId}/escalate`, { reason }),

  getHighRiskUsers: (limit = 50): Promise<ApiResponse<RiskProfile[]>> =>
    complianceApiClient.get(`/risk-profiles/high-risk?limit=${limit}`),

  getUsersRequiringReview: (): Promise<ApiResponse<RiskProfile[]>> =>
    complianceApiClient.get('/risk-profiles/manual-review'),

  getUserRiskProfile: (userId: string): Promise<ApiResponse<RiskProfile>> =>
    complianceApiClient.get(`/risk-profiles/${userId}`),

  recalculateRiskScore: (userId: string): Promise<ApiResponse<{ riskScore: number }>> =>
    complianceApiClient.post(`/risk-profiles/${userId}/recalculate`),

  updateBlacklistStatus: (
    userId: string,
    isBlacklisted: boolean,
    reason?: string
  ): Promise<ApiResponse<RiskProfile>> =>
    complianceApiClient.put(`/risk-profiles/${userId}/blacklist`, { isBlacklisted, reason }),

  requireManualReview: (userId: string, reason: string): Promise<ApiResponse<RiskProfile>> =>
    complianceApiClient.post(`/risk-profiles/${userId}/manual-review`, { reason }),

  addRiskFlags: (userId: string, flags: string[]): Promise<ApiResponse<RiskProfile>> =>
    complianceApiClient.post(`/risk-profiles/${userId}/flags`, { flags }),

  removeRiskFlag: (userId: string, flag: string): Promise<ApiResponse<RiskProfile>> =>
    complianceApiClient.delete(`/risk-profiles/${userId}/flags/${flag}`),

  generateComplianceReport: (
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<any>> =>
    complianceApiClient.get(`/reports/compliance?startDate=${startDate}&endDate=${endDate}`),

  checkTransactionCompliance: (transactionData: {
    userId: string
    amount: number
    type: string
    paymentMethod: string
    currency: string
  }): Promise<ApiResponse<any>> =>
    complianceApiClient.post('/check/transaction', transactionData),

  checkBettingCompliance: (betData: {
    userId: string
    amount: number
    type: string
    odds: number
    sport: string
  }): Promise<ApiResponse<any>> =>
    complianceApiClient.post('/check/betting', betData),
}