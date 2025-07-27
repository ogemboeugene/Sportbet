import axios from 'axios'
import { ApiResponse } from '../types'

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000'

const kycApiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/kyc`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
kycApiClient.interceptors.request.use(
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

export interface KycDocument {
  id: string
  type: string
  status: string
  fileName: string
  submittedAt: string
  rejectionReason?: string
}

export interface KycStatus {
  status: string
  documents: KycDocument[]
  applicantStatus?: any
  requiredDocuments: Array<{
    type: string
    name: string
    description: string
    required: boolean
  }>
}

export const kycApi = {
  initiateKyc: (): Promise<ApiResponse<any>> =>
    kycApiClient.post('/initiate'),

  uploadDocument: (documentType: string, file: File): Promise<ApiResponse<any>> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('documentType', documentType)
    
    return kycApiClient.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  submitForReview: (): Promise<ApiResponse<any>> =>
    kycApiClient.post('/submit'),

  getKycStatus: (): Promise<ApiResponse<KycStatus>> =>
    kycApiClient.get('/status'),
}