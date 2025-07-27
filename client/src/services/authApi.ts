import axios from 'axios'
import { LoginCredentials, RegisterData, ApiResponse, AuthResponse, User } from '../types'

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000'

const authApiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
authApiClient.interceptors.request.use(
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

// Response interceptor to handle token refresh
authApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (refreshToken) {
          const response = await authApiClient.post('/refresh', { refreshToken })
          const { accessToken, refreshToken: newRefreshToken } = response.data.data

          localStorage.setItem('token', accessToken)
          localStorage.setItem('refreshToken', newRefreshToken)

          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return authApiClient(originalRequest)
        }
      } catch (refreshError) {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export const authApi = {
  login: (credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> =>
    authApiClient.post('/login', credentials),

  register: (userData: RegisterData): Promise<ApiResponse<AuthResponse>> =>
    authApiClient.post('/register', userData),

  logout: (): Promise<ApiResponse> =>
    authApiClient.post('/logout'),

  getProfile: (): Promise<ApiResponse<User>> =>
    authApiClient.get('/me'),

  refreshToken: (refreshToken: string): Promise<ApiResponse<AuthResponse>> =>
    authApiClient.post('/refresh', { refreshToken }),

  forgotPassword: (email: string): Promise<ApiResponse> =>
    authApiClient.post('/forgot-password', { email }),

  resetPassword: (token: string, password: string): Promise<ApiResponse> =>
    authApiClient.post('/reset-password', { token, password }),

  verifyEmail: (token: string): Promise<ApiResponse> =>
    authApiClient.post('/verify-email', { token }),

  resendVerification: (): Promise<ApiResponse> =>
    authApiClient.post('/resend-verification'),

  // 2FA endpoints
  verifyTwoFactor: (tempToken: string, token: string): Promise<ApiResponse<AuthResponse>> =>
    authApiClient.post('/verify-2fa', { tempToken, token }),

  setup2FA: (): Promise<ApiResponse<{ secret: string; qrCode: string; backupCodes: string[] }>> =>
    authApiClient.post('/setup-2fa'),

  enable2FA: (token: string): Promise<ApiResponse> =>
    authApiClient.post('/enable-2fa', { token }),

  disable2FA: (token: string): Promise<ApiResponse> =>
    authApiClient.post('/disable-2fa', { token }),

  regenerateBackupCodes: (token: string): Promise<ApiResponse<{ backupCodes: string[] }>> =>
    authApiClient.post('/regenerate-backup-codes', { token }),

  // Security endpoints
  getLoginHistory: (): Promise<ApiResponse<any[]>> =>
    authApiClient.get('/login-history'),

  getSecurityAnalysis: (): Promise<ApiResponse<any>> =>
    authApiClient.get('/security-analysis'),
}