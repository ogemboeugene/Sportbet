import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AdminRole, AdminPermission } from '../../../database/schemas/admin-user.schema'

export const ADMIN_ROLES_KEY = 'adminRoles'
export const ADMIN_PERMISSIONS_KEY = 'adminPermissions'

@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(ADMIN_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    const requiredPermissions = this.reflector.getAllAndOverride<AdminPermission[]>(ADMIN_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles && !requiredPermissions) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const admin = request.admin

    if (!admin) {
      throw new ForbiddenException('Admin authentication required')
    }

    if (!admin.isActive) {
      throw new ForbiddenException('Admin account is deactivated')
    }

    // Check roles
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.includes(admin.role)
      if (!hasRole) {
        throw new ForbiddenException(`Required admin role: ${requiredRoles.join(' or ')}`)
      }
    }

    // Check permissions
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasPermission = admin.hasAnyPermission(requiredPermissions)
      if (!hasPermission) {
        throw new ForbiddenException(`Required admin permission: ${requiredPermissions.join(' or ')}`)
      }
    }

    return true
  }
}
