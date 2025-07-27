// User types
export interface User {
  id: string
  email: string
  emailVerified: boolean
  twoFactorEnabled: boolean
  profile: UserProfile
  kycStatus?: 'pending' | 'verified' | 'rejected' | 'approved'
  preferences: UserPreferences
  limits: UserLimits
  createdAt: string
  updatedAt: string
}

export interface UserProfile {
  firstName: string
  lastName: string
  dateOfBirth: string
  phoneNumber: string
  country: string
}

export interface UserPreferences {
  theme: 'light' | 'dark'
  oddsFormat: 'decimal' | 'fractional' | 'american'
  currency: string
  language: string
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
  }
}

export interface UserLimits {
  dailyDeposit: number
  weeklyDeposit: number
  monthlyDeposit: number
  sessionTime: number
}

// Auth types
export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
  dateOfBirth: string
  phoneNumber: string
  country: string
}

export interface AuthResponse {
  user: User
  token: string
  accessToken: string
  refreshToken: string
  requiresTwoFactor?: boolean
  tempToken?: string
}

export interface TwoFactorSetup {
  secret: string
  qrCode: string
  backupCodes: string[]
}

// API types
export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
  errors?: Record<string, string[]>
}

export interface ApiError {
  message: string
  statusCode: number
  errors?: Record<string, string[]>
}

// Common types
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface SelectOption {
  value: string
  label: string
}

// Theme types
export type Theme = 'light' | 'dark'

export interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

// Sports and Events
export interface Sport {
  _id: string
  key: string
  title: string
  active: boolean
  order: number
  description?: string
  createdAt: string
  updatedAt: string
}

export interface Selection {
  selectionId: string
  selectionName: string
  odds: number
  active: boolean
}

export interface Market {
  marketId: string
  marketName: string
  selections: Selection[]
}

export interface Event {
  _id: string
  eventId: string
  sportKey: string
  homeTeam: string
  awayTeam: string
  startTime: string
  markets: Market[]
  status: 'upcoming' | 'live' | 'finished' | 'cancelled'
  score?: {
    home: number
    away: number
  }
  league?: string
  country?: string
  lastOddsUpdate: string
  createdAt: string
  updatedAt: string
}

// Betting
export interface BetSelection {
  eventId: string
  marketId: string
  selectionId: string
  odds: number
  eventName: string
  marketName: string
  selectionName: string
  startTime: string
  status: 'pending' | 'won' | 'lost' | 'void'
  stake?: number
}

export interface Bet {
  _id: string
  userId: string
  stake: number
  potentialWin: number
  betType: 'single' | 'multiple' | 'system'
  status: 'pending' | 'won' | 'lost' | 'void' | 'cashout'
  selections: BetSelection[]
  settledAt?: string
  winAmount?: number
  currency: string
  reference: string
  metadata?: {
    ipAddress?: string
    userAgent?: string
    placedVia?: 'web' | 'mobile' | 'sms' | 'ussd'
    oddsFormat?: 'decimal' | 'fractional' | 'american'
  }
  createdAt: string
  updatedAt: string
}