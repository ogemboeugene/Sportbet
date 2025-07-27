import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Reflector } from '@nestjs/core'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name)

  constructor(private reflector: Reflector) {
    super()
  }

  canActivate(context: ExecutionContext) {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ])
    
    if (isPublic) {
      return true
    }

    return super.canActivate(context)
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Log the authorization header for debugging
    const request = context.switchToHttp().getRequest()
    const authHeader = request.headers.authorization
    
    this.logger.debug(`Request to ${request.url}`)
    this.logger.debug(`Authorization header: ${authHeader ? 'Bearer ***' : 'missing'}`)
    
    if (err || !user) {
      this.logger.error(`Authentication failed: ${err?.message || info?.message || 'Unknown error'}`)
      throw err || new UnauthorizedException('Invalid or expired token')
    }

    // Check if this is a temporary 2FA token and the route requires full auth
    if (user.temp) {
      const path = request.route?.path || request.url
      
      // Allow 2FA verification endpoints with temp tokens
      if (!path.includes('verify-2fa') && !path.includes('setup-2fa')) {
        throw new UnauthorizedException('Two-factor authentication required')
      }
    }

    this.logger.debug(`User authenticated: ${user.email}`)
    return user
  }
}