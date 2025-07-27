import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { AdminAuthService } from '../services/admin-auth.service'

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    private configService: ConfigService,
    private adminAuthService: AdminAuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('ADMIN_JWT_SECRET'),
    })
  }

  async validate(payload: any) {
    if (payload.type !== 'admin') {
      throw new UnauthorizedException('Invalid token type')
    }

    const admin = await this.adminAuthService.validateAdminById(payload.sub)
    if (!admin) {
      throw new UnauthorizedException('Admin not found')
    }

    if (!admin.isActive) {
      throw new UnauthorizedException('Admin account is deactivated')
    }

    // Check if session is still valid
    if (payload.sessionId) {
      const isValidSession = await this.adminAuthService.validateSession(payload.sessionId)
      if (!isValidSession) {
        throw new UnauthorizedException('Session expired or terminated')
      }
    }

    return {
      sub: admin._id,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions,
      sessionId: payload.sessionId,
      temp: payload.temp || false,
      ...admin.toObject()
    }
  }
}
