import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SecurityAuditService } from '../security-audit.service';

@Injectable()
export class SecurityAuditMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityAuditMiddleware.name);
  private readonly auditQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

  constructor(private securityAuditService: SecurityAuditService) {
    // Process audit queue in batches to prevent memory buildup
    this.processAuditQueue();
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const self = this; // Capture 'this' context for callbacks
    
    // Store original response methods
    const originalSend = res.send;
    const originalJson = res.json;
    
    let responseBody: any;
    let responseSent = false;

    // Override response methods to capture response data
    res.send = function (body: any) {
      if (!responseSent) {
        responseBody = body;
        responseSent = true;
      }
      return originalSend.call(this, body);
    };

    res.json = function (body: any) {
      if (!responseSent) {
        responseBody = body;
        responseSent = true;
      }
      return originalJson.call(this, body);
    };

    // Wait for response to complete
    res.on('finish', () => {
      try {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Determine if this is a sensitive operation that should be audited
        const shouldAudit = self.shouldAuditRequest(req, res);
        
        if (shouldAudit) {
          // Queue the audit operation instead of doing it immediately
          self.queueAuditOperation(async () => {
            const auditData = self.buildAuditData(req, res, responseBody, duration);
            await self.securityAuditService.createAuditLog(auditData);
          });
        }
      } catch (error) {
        // Use logger instead of console.error for production
        self.logger.error('Security audit middleware error:', error.stack);
      }
    });

    // Restore original methods to prevent memory leaks
    res.on('close', () => {
      res.send = originalSend;
      res.json = originalJson;
    });

    next();
  }

  private queueAuditOperation(operation: () => Promise<void>) {
    // Prevent queue from growing too large
    if (this.auditQueue.length > 1000) {
      this.logger.warn('Audit queue is full, dropping audit operation');
      return;
    }
    
    this.auditQueue.push(operation);
  }

  private async processAuditQueue() {
    setInterval(async () => {
      if (this.isProcessingQueue || this.auditQueue.length === 0) {
        return;
      }

      this.isProcessingQueue = true;
      
      try {
        // Process up to 10 audit operations at once
        const batchSize = Math.min(10, this.auditQueue.length);
        const batch = this.auditQueue.splice(0, batchSize);
        
        await Promise.allSettled(batch.map(operation => operation()));
      } catch (error) {
        this.logger.error('Error processing audit queue:', error.stack);
      } finally {
        this.isProcessingQueue = false;
      }
    }, 1000); // Process every second
  }

  private shouldAuditRequest(req: Request, res: Response): boolean {
    // Always audit authentication operations
    if (req.path.includes('/auth/')) {
      return true;
    }

    // Always audit administrative operations
    if (req.path.includes('/admin/')) {
      return true;
    }

    // Always audit financial operations
    if (req.path.includes('/wallet/') || req.path.includes('/betting/')) {
      return true;
    }

    // Always audit user data modifications
    if (req.path.includes('/users/') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return true;
    }

    // Always audit KYC operations
    if (req.path.includes('/kyc/')) {
      return true;
    }

    // Always audit security operations
    if (req.path.includes('/security/')) {
      return true;
    }

    // Audit failed requests (4xx, 5xx status codes)
    if (res.statusCode >= 400) {
      return true;
    }

    // Audit sensitive HTTP methods
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return true;
    }

    return false;
  }

  private buildAuditData(req: Request, res: Response, responseBody: any, duration: number): any {
    const user = (req as any).user;
    const admin = (req as any).admin;
    
    return {
      eventType: this.determineEventType(req),
      category: this.determineCategory(req),
      userId: user?.id,
      adminId: admin?.id,
      sessionId: (req as any).sessionId || (req as any).session?.id,
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent'),
      resource: req.path,
      action: req.method,
      method: req.method,
      success: res.statusCode < 400,
      failureReason: res.statusCode >= 400 ? this.getFailureReason(res.statusCode, responseBody) : undefined,
      requestData: this.sanitizeRequestData(req),
      responseData: this.sanitizeResponseData(responseBody, res.statusCode),
      riskLevel: this.determineRiskLevel(req, res),
      context: {
        statusCode: res.statusCode,
        duration,
        contentLength: res.get('Content-Length'),
        timestamp: new Date().toISOString(),
      },
      geolocation: this.extractGeolocation(req),
      deviceFingerprint: this.generateDeviceFingerprint(req),
      complianceFlags: this.generateComplianceFlags(req, res),
      tags: this.generateTags(req, res),
    };
  }

  private determineEventType(req: Request): string {
    if (req.path.includes('/auth/login')) return 'user_login';
    if (req.path.includes('/auth/logout')) return 'user_logout';
    if (req.path.includes('/auth/register')) return 'user_registration';
    if (req.path.includes('/auth/password')) return 'password_change';
    if (req.path.includes('/wallet/deposit')) return 'wallet_deposit';
    if (req.path.includes('/wallet/withdraw')) return 'wallet_withdrawal';
    if (req.path.includes('/betting/place')) return 'bet_placement';
    if (req.path.includes('/admin/')) return 'admin_action';
    if (req.path.includes('/kyc/')) return 'kyc_operation';
    if (req.path.includes('/users/')) return 'user_data_access';
    
    return `${req.method.toLowerCase()}_${req.path.split('/')[1] || 'unknown'}`;
  }

  private determineCategory(req: Request): string {
    if (req.path.includes('/auth/')) return 'authentication';
    if (req.path.includes('/admin/')) return 'authorization';
    if (req.path.includes('/users/') && ['GET'].includes(req.method)) return 'data_access';
    if (req.path.includes('/users/') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return 'data_modification';
    if (req.path.includes('/wallet/') || req.path.includes('/betting/')) return 'data_modification';
    if (req.path.includes('/security/')) return 'security_event';
    if (req.path.includes('/config/') || req.path.includes('/admin/settings')) return 'configuration';
    
    return 'system_access';
  }

  private determineRiskLevel(req: Request, res: Response): 'low' | 'medium' | 'high' | 'critical' {
    // Critical risk for failed authentication
    if (req.path.includes('/auth/') && res.statusCode >= 400) {
      return 'critical';
    }

    // High risk for financial operations
    if ((req.path.includes('/wallet/') || req.path.includes('/betting/')) && res.statusCode < 400) {
      return 'high';
    }

    // High risk for failed financial operations
    if ((req.path.includes('/wallet/') || req.path.includes('/betting/')) && res.statusCode >= 400) {
      return 'critical';
    }

    // High risk for admin operations
    if (req.path.includes('/admin/')) {
      return 'high';
    }

    // Medium risk for user data modifications
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return 'medium';
    }

    // Medium risk for failed requests
    if (res.statusCode >= 400) {
      return 'medium';
    }

    return 'low';
  }

  private sanitizeRequestData(req: Request): any {
    const sensitiveFields = ['password', 'pin', 'token', 'secret', 'key', 'auth'];
    
    return {
      headers: this.sanitizeObject(req.headers, sensitiveFields),
      query: this.sanitizeObject(req.query, sensitiveFields),
      body: this.sanitizeObject(req.body, sensitiveFields),
      params: req.params,
    };
  }

  private sanitizeResponseData(responseBody: any, statusCode: number): any {
    // Don't log response body for successful requests to reduce storage
    if (statusCode < 400) {
      return { statusCode, message: 'Success' };
    }

    const sensitiveFields = ['password', 'pin', 'token', 'secret', 'key', 'auth'];
    return this.sanitizeObject(responseBody, sensitiveFields);
  }

  private sanitizeObject(obj: any, sensitiveFields: string[]): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const sanitized = Array.isArray(obj) ? [] : {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        (sanitized as any)[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        (sanitized as any)[key] = this.sanitizeObject(value, sensitiveFields);
      } else {
        (sanitized as any)[key] = value;
      }
    }

    return sanitized;
  }

  private getFailureReason(statusCode: number, responseBody: any): string {
    if (responseBody && typeof responseBody === 'object' && responseBody.message) {
      // Handle array messages (from validation errors)
      if (Array.isArray(responseBody.message)) {
        return responseBody.message.join(', ');
      }
      return responseBody.message;
    }

    switch (statusCode) {
      case 400: return 'Bad Request';
      case 401: return 'Unauthorized';
      case 403: return 'Forbidden';
      case 404: return 'Not Found';
      case 422: return 'Validation Failed';
      case 429: return 'Rate Limit Exceeded';
      case 500: return 'Internal Server Error';
      default: return `HTTP ${statusCode}`;
    }
  }

  private extractGeolocation(req: Request): any {
    // Extract geolocation from headers if available
    const country = req.get('CF-IPCountry') || req.get('X-Country-Code');
    const region = req.get('CF-Region') || req.get('X-Region-Code');
    const city = req.get('CF-IPCity') || req.get('X-City');

    if (country || region || city) {
      return { country, region, city };
    }

    return undefined;
  }

  private generateDeviceFingerprint(req: Request): string {
    const userAgent = req.get('User-Agent') || '';
    const acceptLanguage = req.get('Accept-Language') || '';
    const acceptEncoding = req.get('Accept-Encoding') || '';
    
    // Simple fingerprint based on headers
    const fingerprint = Buffer.from(`${userAgent}:${acceptLanguage}:${acceptEncoding}`)
      .toString('base64')
      .substring(0, 16);
    
    return fingerprint;
  }

  private generateComplianceFlags(req: Request, res: Response): string[] {
    const flags: string[] = [];

    if (req.path.includes('/auth/')) {
      flags.push('identity_management', 'access_control');
    }

    if (req.path.includes('/wallet/') || req.path.includes('/betting/')) {
      flags.push('financial_transaction', 'anti_money_laundering');
    }

    if (req.path.includes('/kyc/')) {
      flags.push('know_your_customer', 'identity_verification');
    }

    if (req.path.includes('/admin/')) {
      flags.push('privileged_access', 'administrative_action');
    }

    if (res.statusCode >= 400) {
      flags.push('failure_event', 'security_concern');
    }

    return flags;
  }

  private generateTags(req: Request, res: Response): string[] {
    const tags: string[] = ['audit', 'security'];

    if (req.path.includes('/auth/')) tags.push('authentication');
    if (req.path.includes('/admin/')) tags.push('admin');
    if (req.path.includes('/wallet/')) tags.push('wallet');
    if (req.path.includes('/betting/')) tags.push('betting');
    if (req.path.includes('/kyc/')) tags.push('kyc');

    if (res.statusCode >= 400) tags.push('error');
    if (res.statusCode >= 500) tags.push('server_error');

    return tags;
  }
}
