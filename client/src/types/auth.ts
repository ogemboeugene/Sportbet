export interface TwoFactorSetup {
  secret: string
  qrCode: string
  backupCodes: string[]
}

export interface TwoFactorVerification {
  tempToken: string
  token: string
}