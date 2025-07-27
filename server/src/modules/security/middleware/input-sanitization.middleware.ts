import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InputSanitizationService } from '../input-sanitization.service';
import { SecurityAuditService } from '../security-audit.service';

@Injectable()
export class InputSanitizationMiddleware implements NestMiddleware {
  constructor(
    private inputSanitizationService: InputSanitizationService,
    private securityAuditService: SecurityAuditService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Sanitize query parameters
      if (req.query && Object.keys(req.query).length > 0) {
        req.query = this.sanitizeObject(req.query);
      }

      // Sanitize request body for POST/PUT/PATCH requests
      if (req.body && Object.keys(req.body).length > 0) {
        const originalBody = JSON.stringify(req.body);
        req.body = this.sanitizeObject(req.body);
        const sanitizedBody = JSON.stringify(req.body);

        // Log if sanitization made changes
        if (originalBody !== sanitizedBody) {
          await this.securityAuditService.createAuditLog({
            eventType: 'input_sanitized',
            category: 'security_event',
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('User-Agent'),
            method: req.method,
            resource: req.path,
            success: true,
            riskLevel: 'medium',
            context: {
              sanitizationPerformed: true,
              fieldsModified: this.getModifiedFields(JSON.parse(originalBody), req.body),
            },
            tags: ['input_sanitization', 'security_protection'],
          });
        }
      }

      // Sanitize headers (certain headers that might contain user input)
      const headersToSanitize = ['referer', 'user-agent', 'x-forwarded-for'];
      headersToSanitize.forEach(header => {
        if (req.headers[header] && typeof req.headers[header] === 'string') {
          req.headers[header] = this.inputSanitizationService.escapeHtml(req.headers[header] as string);
        }
      });

      next();
    } catch (error) {
      // Log error but don't block the request
      await this.securityAuditService.createAuditLog({
        eventType: 'input_sanitization_error',
        category: 'security_event',
        ipAddress: req.ip || 'unknown',
        success: false,
        failureReason: error.message,
        riskLevel: 'medium',
        context: { error: error.stack },
        tags: ['input_sanitization', 'error'],
      });

      next();
    }
  }

  private sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.inputSanitizationService.escapeHtml(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize both keys and values
        const sanitizedKey = this.inputSanitizationService.escapeHtml(key);
        sanitized[sanitizedKey] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }

  private getModifiedFields(original: any, sanitized: any, path = ''): string[] {
    const modifiedFields: string[] = [];

    if (typeof original !== typeof sanitized) {
      modifiedFields.push(path || 'root');
      return modifiedFields;
    }

    if (typeof original === 'string') {
      if (original !== sanitized) {
        modifiedFields.push(path);
      }
    } else if (Array.isArray(original) && Array.isArray(sanitized)) {
      const maxLength = Math.max(original.length, sanitized.length);
      for (let i = 0; i < maxLength; i++) {
        const currentPath = path ? `${path}[${i}]` : `[${i}]`;
        if (original[i] !== undefined && sanitized[i] !== undefined) {
          modifiedFields.push(...this.getModifiedFields(original[i], sanitized[i], currentPath));
        } else if (original[i] !== sanitized[i]) {
          modifiedFields.push(currentPath);
        }
      }
    } else if (original && sanitized && typeof original === 'object' && typeof sanitized === 'object') {
      const allKeys = new Set([...Object.keys(original), ...Object.keys(sanitized)]);
      for (const key of allKeys) {
        const currentPath = path ? `${path}.${key}` : key;
        if (original[key] !== undefined && sanitized[key] !== undefined) {
          modifiedFields.push(...this.getModifiedFields(original[key], sanitized[key], currentPath));
        } else if (original[key] !== sanitized[key]) {
          modifiedFields.push(currentPath);
        }
      }
    }

    return modifiedFields;
  }
}
