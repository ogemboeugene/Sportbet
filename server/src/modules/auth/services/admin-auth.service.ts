import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import * as speakeasy from 'speakeasy'
import * as qrcode from 'qrcode'
import { AdminUser, AdminUserDocument, AdminRole, getDefaultPermissionsByRole } from '../../../database/schemas/admin-user.schema'
import { AdminSession, AdminSessionDocument } from '../../../database/schemas/admin-session.schema'
import { AdminActivityLog, AdminActivityLogDocument, AdminActivityType } from '../../../database/schemas/admin-activity-log.schema'

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectModel(AdminUser.name) private adminUserModel: Model<AdminUserDocument>,
    @InjectModel(AdminSession.name) private adminSessionModel: Model<AdminSessionDocument>,
    @InjectModel(AdminActivityLog.name) private adminActivityLogModel: Model<AdminActivityLogDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async createAdmin(createAdminDto: {
    email: string
    password: string
    firstName: string
    lastName: string
    role: AdminRole
    permissions?: string[]
    createdBy?: string
  }): Promise<AdminUserDocument> {
    const existingAdmin = await this.adminUserModel.findOne({ email: createAdminDto.email })
    if (existingAdmin) {
      throw new ConflictException('Admin with this email already exists')
    }

    try {
      // Use proper salt rounds parsing
      const saltRounds = parseInt(this.configService.get<string>('BCRYPT_ROUNDS', '12'), 10)
      console.log('Using salt rounds:', saltRounds)
      console.log('Password to hash:', createAdminDto.password.substring(0, 5) + '...')
      
      const passwordHash = await bcrypt.hash(createAdminDto.password, saltRounds)
      console.log('Generated hash:', passwordHash.substring(0, 20) + '...')

      const defaultPermissions = getDefaultPermissionsByRole(createAdminDto.role)
      const permissions = createAdminDto.permissions || defaultPermissions

      const admin = new this.adminUserModel({
        ...createAdminDto,
        passwordHash,
        permissions,
        passwordChangedAt: new Date()
      })

      const savedAdmin = await admin.save()

      // Log admin creation - skip for system initialization to avoid ObjectId issues
      if (createAdminDto.createdBy && createAdminDto.createdBy !== 'system') {
        await this.logActivity({
          adminId: createAdminDto.createdBy || savedAdmin._id.toString(),
          adminEmail: 'system',
          adminName: 'System',
          activityType: AdminActivityType.ADMIN_CREATE,
          description: `Created new admin: ${savedAdmin.email}`,
          details: {
            targetId: savedAdmin._id.toString(),
            targetType: 'admin',
            targetName: savedAdmin.fullName
          },
          ipAddress: '127.0.0.1'
        })
      }

      return savedAdmin
    } catch (error) {
      console.error('Error in createAdmin:', error.message)
      console.error('Error stack:', error.stack)
      throw error
    }
  }

  async validateAdmin(email: string, password: string, ipAddress: string, userAgent?: string): Promise<any> {
    const admin = await this.adminUserModel.findOne({ email: email.toLowerCase() })
    
    if (!admin) {
      await this.logActivity({
        adminId: 'unknown',
        adminEmail: email,
        adminName: 'Unknown',
        activityType: AdminActivityType.FAILED_LOGIN,
        description: `Failed login attempt for non-existent admin: ${email}`,
        ipAddress,
        userAgent,
        status: 'failure'
      })
      throw new UnauthorizedException('Invalid credentials')
    }

    if (!admin.isActive) {
      await this.logActivity({
        adminId: admin._id.toString(),
        adminEmail: admin.email,
        adminName: admin.fullName,
        activityType: AdminActivityType.FAILED_LOGIN,
        description: 'Failed login attempt - account deactivated',
        ipAddress,
        userAgent,
        status: 'failure'
      })
      throw new UnauthorizedException('Admin account is deactivated')
    }

    // Check if account is locked
    if (admin.isLocked()) {
      await this.logActivity({
        adminId: admin._id.toString(),
        adminEmail: admin.email,
        adminName: admin.fullName,
        activityType: AdminActivityType.FAILED_LOGIN,
        description: 'Failed login attempt - account locked',
        ipAddress,
        userAgent,
        status: 'failure'
      })
      throw new UnauthorizedException('Admin account is temporarily locked due to too many failed login attempts')
    }

    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash)
    
    if (!isPasswordValid) {
      await admin.incLoginAttempts()
      await this.logActivity({
        adminId: admin._id.toString(),
        adminEmail: admin.email,
        adminName: admin.fullName,
        activityType: AdminActivityType.FAILED_LOGIN,
        description: 'Failed login attempt - invalid password',
        ipAddress,
        userAgent,
        status: 'failure'
      })
      throw new UnauthorizedException('Invalid credentials')
    }

    // Reset failed login attempts on successful validation
    if (admin.failedLoginAttempts > 0) {
      await admin.resetLoginAttempts()
    }

    return admin
  }

  async adminLogin(
    email: string,
    password: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<any> {
    const admin = await this.validateAdmin(email, password, ipAddress, userAgent)

    // Check if 2FA is enabled
    if (admin.twoFactorEnabled) {
      const tempToken = this.jwtService.sign(
        {
          sub: admin._id,
          email: admin.email,
          type: 'admin',
          temp: true
        },
        {
          secret: this.configService.get<string>('ADMIN_JWT_SECRET'),
          expiresIn: '10m'
        }
      )

      return {
        requiresTwoFactor: true,
        tempToken,
        message: 'Two-factor authentication required'
      }
    }

    return this.generateTokensAndSession(admin, ipAddress, userAgent)
  }

  async verifyAdminTwoFactor(tempToken: string, totpToken: string, ipAddress: string, userAgent?: string): Promise<any> {
    try {
      const decoded = this.jwtService.verify(tempToken, {
        secret: this.configService.get<string>('ADMIN_JWT_SECRET')
      })

      if (!decoded.temp || decoded.type !== 'admin') {
        throw new UnauthorizedException('Invalid temporary token')
      }

      const admin = await this.adminUserModel.findById(decoded.sub)
      if (!admin || !admin.twoFactorEnabled) {
        throw new UnauthorizedException('Admin not found or 2FA not enabled')
      }

      // Verify TOTP token
      const isValidToken = speakeasy.totp.verify({
        secret: admin.twoFactorSecret,
        encoding: 'base32',
        token: totpToken,
        window: 2
      })

      if (!isValidToken) {
        // Check backup codes
        const isValidBackupCode = admin.twoFactorBackupCodes.includes(totpToken)
        if (!isValidBackupCode) {
          await this.logActivity({
            adminId: admin._id.toString(),
            adminEmail: admin.email,
            adminName: admin.fullName,
            activityType: AdminActivityType.FAILED_LOGIN,
            description: 'Failed 2FA verification',
            ipAddress,
            userAgent,
            status: 'failure'
          })
          throw new UnauthorizedException('Invalid two-factor authentication code')
        }

        // Remove used backup code
        admin.twoFactorBackupCodes = admin.twoFactorBackupCodes.filter(code => code !== totpToken)
        await admin.save()
      }

      return this.generateTokensAndSession(admin, ipAddress, userAgent)
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired temporary token')
    }
  }

  async generateTokensAndSession(admin: AdminUserDocument, ipAddress: string, userAgent?: string) {
    const sessionTimeout = admin.securitySettings.sessionTimeout || 480 // 8 hours default
    const expiresAt = new Date(Date.now() + sessionTimeout * 60 * 1000)

    // Create session
    const session = new this.adminSessionModel({
      adminId: admin._id,
      sessionToken: this.generateRandomToken(),
      refreshToken: this.generateRandomToken(),
      ipAddress,
      userAgent,
      expiresAt,
      isActive: true,
      lastActivityAt: new Date()
    })

    await session.save()

    // Generate JWT tokens
    const payload = {
      sub: admin._id,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions,
      type: 'admin',
      sessionId: session._id
    }

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('ADMIN_JWT_SECRET'),
      expiresIn: this.configService.get<string>('ADMIN_JWT_EXPIRES_IN', '8h')
    })

    // Update admin last login
    await admin.updateOne({
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress,
      lastLoginUserAgent: userAgent
    })

    // Log successful login
    await this.logActivity({
      adminId: admin._id.toString(),
      adminEmail: admin.email,
      adminName: admin.fullName,
      activityType: AdminActivityType.LOGIN,
      description: 'Successful admin login',
      ipAddress,
      userAgent,
      sessionId: session._id.toString()
    })

    return {
      accessToken,
      refreshToken: session.refreshToken,
      expiresIn: sessionTimeout * 60,
      admin: {
        id: admin._id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
        permissions: admin.permissions
      }
    }
  }

  async validateAdminById(adminId: string): Promise<AdminUserDocument | null> {
    return this.adminUserModel.findById(adminId).exec()
  }

  async validateSession(sessionId: string): Promise<boolean> {
    const session = await this.adminSessionModel.findById(sessionId)
    return session && session.isActive && !session.isExpired()
  }

  async setup2FA(adminId: string): Promise<any> {
    const admin = await this.adminUserModel.findById(adminId)
    if (!admin) {
      throw new UnauthorizedException('Admin not found')
    }

    const secret = speakeasy.generateSecret({
      name: `SportBet Admin (${admin.email})`,
      issuer: this.configService.get<string>('ADMIN_2FA_ISSUER', 'SportBet-Admin'),
      length: 32
    })

    // Temporarily store the secret (not yet enabled)
    await admin.updateOne({ twoFactorSecret: secret.base32 })

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url)

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntry: secret.otpauth_url
    }
  }

  async enable2FA(adminId: string, token: string): Promise<{ message: string; backupCodes: string[] }> {
    const admin = await this.adminUserModel.findById(adminId)
    if (!admin || !admin.twoFactorSecret) {
      throw new BadRequestException('2FA setup not initiated')
    }

    const isValidToken = speakeasy.totp.verify({
      secret: admin.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    })

    if (!isValidToken) {
      throw new BadRequestException('Invalid verification code')
    }

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () => 
      Math.random().toString(36).substring(2, 8).toUpperCase()
    )

    await admin.updateOne({
      twoFactorEnabled: true,
      twoFactorBackupCodes: backupCodes
    })

    await this.logActivity({
      adminId: admin._id.toString(),
      adminEmail: admin.email,
      adminName: admin.fullName,
      activityType: AdminActivityType.PROFILE_UPDATE,
      description: 'Enabled two-factor authentication',
      ipAddress: '127.0.0.1'
    })

    return {
      message: 'Two-factor authentication enabled successfully',
      backupCodes
    }
  }

  async disable2FA(adminId: string, token: string): Promise<{ message: string }> {
    const admin = await this.adminUserModel.findById(adminId)
    if (!admin) {
      throw new UnauthorizedException('Admin not found')
    }

    if (!admin.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled')
    }

    // Verify current password or 2FA token
    const isValidToken = speakeasy.totp.verify({
      secret: admin.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    })

    if (!isValidToken) {
      throw new BadRequestException('Invalid verification code')
    }

    await admin.updateOne({
      twoFactorEnabled: false,
      twoFactorSecret: undefined,
      twoFactorBackupCodes: []
    })

    await this.logActivity({
      adminId: admin._id.toString(),
      adminEmail: admin.email,
      adminName: admin.fullName,
      activityType: AdminActivityType.PROFILE_UPDATE,
      description: 'Disabled two-factor authentication',
      ipAddress: '127.0.0.1'
    })

    return { message: 'Two-factor authentication disabled successfully' }
  }

  async adminLogout(adminId: string, sessionId: string, ipAddress: string): Promise<{ message: string }> {
    const admin = await this.adminUserModel.findById(adminId)
    if (!admin) {
      throw new UnauthorizedException('Admin not found')
    }

    // Terminate session
    await this.adminSessionModel.findByIdAndUpdate(sessionId, {
      isActive: false,
      terminatedAt: new Date(),
      terminatedBy: adminId,
      terminationReason: 'logout'
    })

    await this.logActivity({
      adminId: admin._id.toString(),
      adminEmail: admin.email,
      adminName: admin.fullName,
      activityType: AdminActivityType.LOGOUT,
      description: 'Admin logout',
      ipAddress,
      sessionId
    })

    return { message: 'Logged out successfully' }
  }

  async getAdminSessions(adminId: string): Promise<AdminSession[]> {
    return this.adminSessionModel
      .find({ adminId, isActive: true })
      .sort({ createdAt: -1 })
      .exec()
  }

  async terminateSession(adminId: string, sessionId: string, terminatedBy: string, reason?: string): Promise<void> {
    await this.adminSessionModel.findByIdAndUpdate(sessionId, {
      isActive: false,
      terminatedAt: new Date(),
      terminatedBy,
      terminationReason: reason || 'manual_termination'
    })

    const admin = await this.adminUserModel.findById(adminId)
    if (admin) {
      await this.logActivity({
        adminId: terminatedBy,
        adminEmail: 'system',
        adminName: 'System',
        activityType: AdminActivityType.SESSION_TERMINATE,
        description: `Terminated session for admin: ${admin.email}`,
        details: {
          targetId: adminId,
          targetType: 'admin',
          targetName: admin.fullName,
          reason
        },
        ipAddress: '127.0.0.1'
      })
    }
  }

  async logActivity(activityData: Partial<AdminActivityLog>): Promise<void> {
    const activity = new this.adminActivityLogModel(activityData)
    await activity.save()
  }

  async getActivityLogs(
    filters: {
      adminId?: string
      activityType?: AdminActivityType
      startDate?: Date
      endDate?: Date
      page?: number
      limit?: number
    }
  ): Promise<{ logs: AdminActivityLog[]; total: number }> {
    const query: any = {}

    if (filters.adminId) query.adminId = filters.adminId
    if (filters.activityType) query.activityType = filters.activityType
    if (filters.startDate || filters.endDate) {
      query.createdAt = {}
      if (filters.startDate) query.createdAt.$gte = filters.startDate
      if (filters.endDate) query.createdAt.$lte = filters.endDate
    }

    const page = filters.page || 1
    const limit = filters.limit || 50
    const skip = (page - 1) * limit

    const [logs, total] = await Promise.all([
      this.adminActivityLogModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.adminActivityLogModel.countDocuments(query)
    ])

    return { logs, total }
  }

  private generateRandomToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  async initializeDefaultAdmin(): Promise<void> {
    const existingAdmin = await this.adminUserModel.findOne({
      role: AdminRole.SUPER_ADMIN
    })

    if (!existingAdmin) {
      const defaultEmail = this.configService.get<string>('ADMIN_DEFAULT_EMAIL', 'admin@sportbet.com')
      const defaultPassword = this.configService.get<string>('ADMIN_DEFAULT_PASSWORD', 'SuperSecureAdminPassword123!')

      console.log('Creating default admin with email:', defaultEmail)
      console.log('Password length:', defaultPassword.length)

      await this.createAdmin({
        email: defaultEmail,
        password: defaultPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: AdminRole.SUPER_ADMIN,
        createdBy: 'system'
      })

      console.log(`Default super admin created with email: ${defaultEmail}`)
      console.log(`Please change the default password immediately after first login!`)
    } else {
      console.log('Super admin already exists, skipping creation')
    }
  }
}
