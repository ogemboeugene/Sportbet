import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    email: string;
    kycStatus?: string;
    emailVerified?: boolean;
    twoFactorEnabled?: boolean;
    preferences?: any;
    temp?: boolean;
  };
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';

    const logData = {
      timestamp: new Date().toISOString(),
      method,
      url,
      ip,
      userAgent,
      userId: request.user?.sub || 'anonymous',
    };

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - now;
        this.logger.log({
          ...logData,
          statusCode: response.statusCode,
          responseTime: `${responseTime}ms`,
          type: 'REQUEST_SUCCESS'
        });
      }),
      catchError((error) => {
        const responseTime = Date.now() - now;
        this.logger.error({
          ...logData,
          statusCode: error.status || 500,
          responseTime: `${responseTime}ms`,
          error: error.message,
          stack: error.stack,
          type: 'REQUEST_ERROR'
        });
        throw error;
      }),
    );
  }
}
