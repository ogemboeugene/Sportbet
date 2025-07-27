import { ExtractJwt, Strategy } from 'passport-jwt'
import { PassportStrategy } from '@nestjs/passport'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { UsersService } from '../../users/users.service'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    })
  }

  async validate(payload: any) {
    // Check if this is a temporary 2FA token
    if (payload.temp) {
      return { 
        sub: payload.sub, 
        email: payload.email, 
        temp: true 
      }
    }

    const user = await this.usersService.findById(payload.sub)
    
    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    // Check if account is locked
    if (user.isLocked()) {
      throw new UnauthorizedException('Account is locked')
    }

    return {
      userId: user._id.toString(),
      sub: user._id,
      email: user.email,
      kycStatus: user.kycStatus,
      emailVerified: user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      preferences: user.preferences,
    }
  }
}