import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as speakeasy from 'speakeasy'
import * as QRCode from 'qrcode'
import * as crypto from 'crypto'
import { UsersService } from '../../users/users.service'

@Injectable()
export class TwoFactorService {
  constructor(
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  async generateSecret(userId: string) {
    const user = await this.usersService.findById(userId)
    if (!user) {
      throw new BadRequestException('User not found')
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled')
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `BetPlatform (${user.email})`,
      issuer: 'BetPlatform',
      length: 32,
    })

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!)

    // Generate backup codes
    const backupCodes = this.generateBackupCodes()

    // Store secret temporarily (not enabled yet)
    await user.updateOne({
      twoFactorSecret: secret.base32,
      twoFactorBackupCodes: backupCodes.map(code => this.hashBackupCode(code)),
    })

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes,
    }
  }

  async enableTwoFactor(userId: string, token: string) {
    const user = await this.usersService.findById(userId)
    if (!user) {
      throw new BadRequestException('User not found')
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled')
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException('Two-factor secret not found. Please generate a new secret.')
    }

    // Verify token
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps (60 seconds) of drift
    })

    if (!isValid) {
      throw new UnauthorizedException('Invalid two-factor authentication token')
    }

    // Enable 2FA
    await user.updateOne({ twoFactorEnabled: true })

    return { message: 'Two-factor authentication enabled successfully' }
  }

  async disableTwoFactor(userId: string, token: string) {
    const user = await this.usersService.findById(userId)
    if (!user) {
      throw new BadRequestException('User not found')
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled')
    }

    // Verify token (either TOTP or backup code)
    const isValidTotp = this.verifyTotpToken(user.twoFactorSecret!, token)
    const isValidBackup = this.verifyBackupCode(user.twoFactorBackupCodes, token)

    if (!isValidTotp && !isValidBackup) {
      throw new UnauthorizedException('Invalid two-factor authentication token')
    }

    // Disable 2FA and clear secrets
    await user.updateOne({
      twoFactorEnabled: false,
      $unset: { twoFactorSecret: 1 },
      twoFactorBackupCodes: [],
    })

    return { message: 'Two-factor authentication disabled successfully' }
  }

  async verifyTwoFactor(userId: string, token: string): Promise<boolean> {
    const user = await this.usersService.findById(userId)
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return false
    }

    // Try TOTP token first
    const isValidTotp = this.verifyTotpToken(user.twoFactorSecret, token)
    if (isValidTotp) {
      return true
    }

    // Try backup code
    const isValidBackup = this.verifyBackupCode(user.twoFactorBackupCodes, token)
    if (isValidBackup) {
      // Remove used backup code
      const hashedToken = this.hashBackupCode(token)
      const updatedBackupCodes = user.twoFactorBackupCodes.filter(
        code => code !== hashedToken
      )
      await user.updateOne({ twoFactorBackupCodes: updatedBackupCodes })
      return true
    }

    return false
  }

  async regenerateBackupCodes(userId: string, token: string) {
    const user = await this.usersService.findById(userId)
    if (!user) {
      throw new BadRequestException('User not found')
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled')
    }

    // Verify current token
    const isValid = this.verifyTotpToken(user.twoFactorSecret!, token)
    if (!isValid) {
      throw new UnauthorizedException('Invalid two-factor authentication token')
    }

    // Generate new backup codes
    const backupCodes = this.generateBackupCodes()
    const hashedCodes = backupCodes.map(code => this.hashBackupCode(code))

    await user.updateOne({ twoFactorBackupCodes: hashedCodes })

    return { backupCodes }
  }

  private verifyTotpToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps (60 seconds) of drift
    })
  }

  private verifyBackupCode(backupCodes: string[], token: string): boolean {
    const hashedToken = this.hashBackupCode(token)
    return backupCodes.includes(hashedToken)
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = []
    for (let i = 0; i < 10; i++) {
      // Generate 8-character alphanumeric codes
      const code = crypto.randomBytes(4).toString('hex').toUpperCase()
      codes.push(code)
    }
    return codes
  }

  private hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex')
  }
}