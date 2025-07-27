import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CsrfProtectionService } from '../csrf-protection.service';
import { SecurityAuditService } from '../security-audit.service';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private csrfProtectionService: CsrfProtectionService,
    private securityAuditService: SecurityAuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if CSRF protection is disabled for this route
    const skipCsrf = this.reflector.get<boolean>('skipCsrf', context.getHandler());
    if (skipCsrf) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();

    // Only check CSRF for state-changing methods
    const stateMutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!stateMutatingMethods.includes(request.method)) {
      return true;
    }

    try {
      const token = request.body._csrf || request.headers['x-csrf-token'] || request.query._csrf;
      const sessionId = (request as any).sessionID || (request as any).session?.id || 'anonymous';
      const userId = (request as any).user?.id || (request as any).user?.userId;
      const isValid = this.csrfProtectionService.validateToken(token, sessionId, userId);
      
      if (!isValid) {
        // Log CSRF violation
        await this.securityAuditService.createAuditLog({
          eventType: 'csrf_validation_failed',
          category: 'security_event',
          ipAddress: request.ip || 'unknown',
          userAgent: request.get('User-Agent'),
          method: request.method,
          resource: request.path,
          success: false,
          failureReason: 'Invalid or missing CSRF token',
          riskLevel: 'high',
          context: {
            headers: request.headers,
            body: request.body,
          },
          tags: ['csrf', 'security_violation', 'blocked'],
        });

        throw new ForbiddenException('Invalid CSRF token');
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      
      // Log unexpected error
      await this.securityAuditService.createAuditLog({
        eventType: 'csrf_guard_error',
        category: 'security_event',
        ipAddress: request.ip || 'unknown',
        success: false,
        failureReason: error.message,
        riskLevel: 'medium',
        context: { error: error.stack },
        tags: ['csrf', 'error'],
      });

      throw new ForbiddenException('CSRF validation failed');
    }
  }
}

// Decorator to skip CSRF protection for specific routes
export const SkipCsrf = () => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata('skipCsrf', true, descriptor.value);
    } else {
      Reflect.defineMetadata('skipCsrf', true, target);
    }
  };
};
