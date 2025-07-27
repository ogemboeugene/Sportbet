import { api } from './api'

export interface SelfExclusionRequest {
  duration: '24h' | '7d' | '30d' | '90d' | '180d' | '365d' | 'permanent'
  reason?: string
}

export interface ReactivationRequest {
  reason: string
}

export interface SelfExclusionStatus {
  isExcluded: boolean
  excludedAt?: string
  excludedUntil?: string
  reason?: string
  isPermanent?: boolean
  reactivationRequest?: {
    requestedAt: string
    reason: string
    status: 'pending' | 'approved' | 'rejected'
    reviewedBy?: string
    rejectedAt?: string
    rejectionReason?: string
  }
  exclusionDetails?: {
    isExcluded: boolean
    excludedAt?: string
    excludedUntil?: string
    reason?: string
    isPermanent: boolean
    reactivationRequest?: {
      requestedAt: string
      reason: string
      status: 'pending' | 'approved' | 'rejected'
      reviewedBy?: string
      rejectedAt?: string
      rejectionReason?: string
    }
  }
}

export interface ResponsibleGamblingResource {
  name: string
  phone?: string
  url: string
  description: string
}

export interface ResponsibleGamblingResources {
  helplines: Array<{
    name: string
    phone?: string
    website: string
    description: string
  }>
  tools: Array<{
    name: string
    description: string
    action: string
  }>
  tips: string[]
}

export const selfExclusionApi = {
  // Request self-exclusion
  requestSelfExclusion: async (request: SelfExclusionRequest) => {
    // Convert duration to backend format
    const durationMap = {
      '24h': { duration: 1, isPermanent: false },
      '7d': { duration: 7, isPermanent: false },
      '30d': { duration: 30, isPermanent: false },
      '90d': { duration: 90, isPermanent: false },
      '180d': { duration: 180, isPermanent: false },
      '365d': { duration: 365, isPermanent: false },
      'permanent': { duration: undefined, isPermanent: true }
    }
    
    const backendRequest = {
      ...durationMap[request.duration],
      reason: request.reason || 'User requested self-exclusion'
    }
    
    const response = await api.post('/users/self-exclusion', backendRequest)
    return response.data
  },

  // Request reactivation
  requestReactivation: async (request: ReactivationRequest) => {
    const response = await api.post('/users/self-exclusion/reactivation', request)
    return response.data
  },

  // Get self-exclusion status
  getStatus: async (): Promise<SelfExclusionStatus> => {
    const response = await api.get('/users/self-exclusion/status')
    const data = response.data.data
    
    // Transform backend response to match frontend interface
    if (data.exclusionDetails) {
      return {
        isExcluded: data.isExcluded,
        excludedAt: data.exclusionDetails.excludedAt,
        excludedUntil: data.exclusionDetails.excludedUntil,
        reason: data.exclusionDetails.reason,
        isPermanent: data.exclusionDetails.isPermanent,
        reactivationRequest: data.exclusionDetails.reactivationRequest,
        exclusionDetails: data.exclusionDetails
      }
    }
    
    return data
  },

  // Alias for getStatus to match component usage
  getSelfExclusionStatus: async (): Promise<SelfExclusionStatus> => {
    return selfExclusionApi.getStatus()
  },

  // Get responsible gambling resources
  getResources: async (): Promise<ResponsibleGamblingResources> => {
    const response = await api.get('/users/self-exclusion/resources')
    return response.data.data
  },

  // Alias for getResources to match component usage
  getResponsibleGamblingResources: async (): Promise<ResponsibleGamblingResource[]> => {
    const resources = await selfExclusionApi.getResources()
    
    // Transform to match component interface
    return resources.helplines.map(helpline => ({
      name: helpline.name,
      phone: helpline.phone,
      url: helpline.website,
      description: helpline.description
    }))
  },
}