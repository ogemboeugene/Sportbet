import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { UsersService } from '../users/users.service'
import { TwoFactorService } from './services/two-factor.service'
import { EmailService } from './services/email.service'
import { SecurityService } from './services/security.service'
import { User, UserDocument } from '../../database/schemas/user.schema'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private twoFactorService: TwoFactorService,
    private emailService: EmailService,
    private securityService: SecurityService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email)
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    // Check if account is locked
    if (user.isLocked()) {
      throw new UnauthorizedException('Account is temporarily locked due to too many failed login attempts')
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    
    if (!isPasswordValid) {
      // Increment failed login attempts
      await user.incLoginAttempts()
      throw new UnauthorizedException('Invalid credentials')
    }

    // Reset failed login attempts on successful login
    if (user.failedLoginAttempts > 0) {
      await user.resetLoginAttempts()
    }

    // Update last login
    await user.updateOne({ lastLoginAt: new Date() })

    const { passwordHash, twoFactorSecret, twoFactorBackupCodes, ...result } = user.toObject()
    return result
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    try {
      const user = await this.validateUser(loginDto.email, loginDto.password)
      
      // Log successful login attempt
      if (ipAddress && userAgent) {
        await this.securityService.logLoginAttempt(
          user._id,
          ipAddress,
          userAgent,
          'success'
        )
      }
      
      if (user.twoFactorEnabled) {
        // Return temporary token for 2FA verification
        const tempToken = this.jwtService.sign(
          { sub: user._id, email: user.email, temp: true },
          { expiresIn: '10m' }
        )
        
        return {
          requiresTwoFactor: true,
          tempToken,
          message: 'Two-factor authentication required'
        }
      }

      return this.generateTokens(user)
    } catch (error) {
      // Log failed login attempt
      if (ipAddress && userAgent) {
        const user = await this.usersService.findByEmail(loginDto.email)
        if (user) {
          await this.securityService.logLoginAttempt(
            user._id.toString(),
            ipAddress,
            userAgent,
            'failed',
            error.message
          )
        }
      }
      throw error
    }
  }

  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email)
    if (existingUser) {
      throw new BadRequestException('User with this email already exists')
    }

    // Hash password with proper salt rounds
    const saltRounds = parseInt(this.configService.get<string>('BCRYPT_ROUNDS', '12'), 10)
    const passwordHash = await bcrypt.hash(registerDto.password, saltRounds)

    // Create user
    const userData = {
      email: registerDto.email,
      passwordHash,
      profile: {
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        dateOfBirth: new Date(registerDto.dateOfBirth),
        phoneNumber: registerDto.phoneNumber,
        country: registerDto.country,
      },
    }

    const user = await this.usersService.create(userData)
    
    // Generate tokens
    return this.generateTokens(user)
  }

  async generateTokens(user: any) {
    const payload = { 
      sub: user._id, 
      email: user.email,
      kycStatus: user.kycStatus 
    }

    const accessToken = this.jwtService.sign(payload)
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' })

    return {
      user: {
        id: user._id,
        email: user.email,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        profile: user.profile,
        kycStatus: user.kycStatus,
        preferences: user.preferences,
        limits: user.limits,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      accessToken,
      refreshToken,
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken)
      const user = await this.usersService.findById(payload.sub)
      
      if (!user) {
        throw new UnauthorizedException('Invalid refresh token')
      }

      return this.generateTokens(user)
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token')
    }
  }

  async requestPasswordReset(email: string) {
    const user = await this.usersService.findByEmail(email)
    
    if (!user) {
      // Don't reveal if email exists or not
      return { message: 'If an account with that email exists, a password reset link has been sent.' }
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = this.jwtService.sign(
      { sub: user._id, type: 'password-reset' },
      { expiresIn: '1h' }
    )

    // Send email with reset link
    await this.emailService.sendPasswordResetEmail(user.email, resetToken)

    return { message: 'If an account with that email exists, a password reset link has been sent.' }
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const payload = this.jwtService.verify(token)
      
      if (payload.type !== 'password-reset') {
        throw new UnauthorizedException('Invalid reset token')
      }

      const user = await this.usersService.findById(payload.sub)
      if (!user) {
        throw new UnauthorizedException('Invalid reset token')
      }

      // Hash new password with proper salt rounds
      const saltRounds = parseInt(this.configService.get<string>('BCRYPT_ROUNDS', '12'), 10)
      const passwordHash = await bcrypt.hash(newPassword, saltRounds)

      // Update password and reset failed login attempts
      await user.updateOne({
        passwordHash,
        $unset: { failedLoginAttempts: 1, lockedUntil: 1 }
      })

      return { message: 'Password has been reset successfully' }
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired reset token')
    }
  }

  async verifyEmail(token: string) {
    try {
      const payload = this.jwtService.verify(token)
      
      if (payload.type !== 'email-verification') {
        throw new UnauthorizedException('Invalid verification token')
      }

      const user = await this.usersService.findById(payload.sub)
      if (!user) {
        throw new UnauthorizedException('Invalid verification token')
      }

      await user.updateOne({ emailVerified: true })

      return { message: 'Email verified successfully' }
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired verification token')
    }
  }

  async sendEmailVerification(userId: string) {
    const user = await this.usersService.findById(userId)
    
    if (!user) {
      throw new BadRequestException('User not found')
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified')
    }

    // Generate verification token (valid for 24 hours)
    const verificationToken = this.jwtService.sign(
      { sub: user._id, type: 'email-verification' },
      { expiresIn: '24h' }
    )

    // Send verification email
    await this.emailService.sendEmailVerification(user.email, verificationToken)

    return { message: 'Verification email sent' }
  }

  async verifyTwoFactor(tempToken: string, token: string) {
    try {
      const payload = this.jwtService.verify(tempToken)
      
      if (!payload.temp) {
        throw new UnauthorizedException('Invalid temporary token')
      }

      const user = await this.usersService.findById(payload.sub)
      if (!user) {
        throw new UnauthorizedException('User not found')
      }

      // Verify 2FA token
      const isValid = await this.twoFactorService.verifyTwoFactor(user._id.toString(), token)
      if (!isValid) {
        throw new UnauthorizedException('Invalid two-factor authentication token')
      }

      // Generate full access tokens
      return this.generateTokens(user)
    } catch (error) {
      throw new UnauthorizedException('Invalid token or two-factor authentication failed')
    }
  }

  async setup2FA(userId: string) {
    return this.twoFactorService.generateSecret(userId)
  }

  async enable2FA(userId: string, token: string) {
    return this.twoFactorService.enableTwoFactor(userId, token)
  }

  async disable2FA(userId: string, token: string) {
    return this.twoFactorService.disableTwoFactor(userId, token)
  }

  async regenerateBackupCodes(userId: string, token: string) {
    return this.twoFactorService.regenerateBackupCodes(userId, token)
  }

  async getLoginHistory(userId: string) {
    return this.securityService.getLoginHistory(userId)
  }

  async getSecurityAnalysis(userId: string) {
    return this.securityService.detectAnomalousActivity(userId)
  }
}