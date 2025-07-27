import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class AdminJwtAuthGuard extends AuthGuard('admin-jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context)
  }

  handleRequest(err: any, admin: any, info: any, context: ExecutionContext) {
    if (err || !admin) {
      throw err || new UnauthorizedException('Invalid or expired admin token')
    }

    // Check if this is a temporary 2FA token and the route requires full auth
    if (admin.temp) {
      const request = context.switchToHttp().getRequest()
      const path = request.route?.path || request.url
      
      // Allow 2FA verification endpoints with temp tokens
      if (!path.includes('verify-2fa') && !path.includes('setup-2fa')) {
        throw new UnauthorizedException('Two-factor authentication required')
      }
    }

    // Attach admin to request for use in controllers
    const request = context.switchToHttp().getRequest()
    request.admin = admin

    return admin
  }
}
