import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SecurityConfigService } from '../security-config.service';
import { ThreatDetectionService } from '../threat-detection.service';
import { SecurityAuditService } from '../security-audit.service';
import { InputSanitizationService } from '../input-sanitization.service';

@Injectable()
export class AdvancedSecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AdvancedSecurityMiddleware.name);

  constructor(
    private readonly securityConfig: SecurityConfigService,
    private readonly threatDetection: ThreatDetectionService,
    private readonly auditService: SecurityAuditService,
    private readonly sanitizationService: InputSanitizationService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    const clientIp = this.getClientIp(req);
    
    // Add request tracking
    (req as any).requestId = requestId;
    (req as any).startTime = startTime;

    try {
      // Check if route should be exempt from security checks
      if (this.isExemptRoute(req.url)) {
        this.setBasicSecurityHeaders(res);
        return next();
      }

      // 1. Security Headers
      this.setSecurityHeaders(res);

      // 2. Request Size Validation
      if (!this.validateRequestSize(req)) {
        return this.blockRequest(res, 'Request too large', 413);
      }

      // 3. IP-based Security Checks (relaxed for development)
      const ipCheck = await this.performIpSecurityChecks(clientIp, req);
      if (!ipCheck.allowed) {
        return this.blockRequest(res, ipCheck.reason, 403);
      }

      // 4. Rate Limiting Check (relaxed for health checks)
      if (!this.isHealthCheck(req.url)) {
        const rateLimitCheck = await this.checkRateLimit(clientIp, req);
        if (!rateLimitCheck.allowed) {
          return this.blockRequest(res, 'Rate limit exceeded', 429);
        }
      }

      // 5. Content Validation and Sanitization (only for user input)
      if (this.requiresContentValidation(req)) {
        await this.sanitizeRequest(req);
      }

      // 6. Threat Detection (relaxed for API endpoints)
      if (!this.isApiEndpoint(req.url)) {
        const threatAnalysis = await this.performThreatDetection(req, clientIp);
        if (threatAnalysis.isBlocked) {
          await this.logSecurityEvent('threat_blocked', req, {
            threat: threatAnalysis.threat,
            confidence: threatAnalysis.confidence,
          });
          return this.blockRequest(res, 'Security threat detected', 403);
        }
      }

      // 7. SQL Injection Detection (only for data modification endpoints)
      if (this.requiresSqlProtection(req) && this.detectSqlInjection(req)) {
        await this.logSecurityEvent('sql_injection_attempt', req, {
          suspiciousPayload: this.getSuspiciousContent(req),
        });
        return this.blockRequest(res, 'Invalid request format', 400);
      }

      // 8. XSS Detection (only for user input endpoints)
      if (this.requiresXssProtection(req) && this.detectXss(req)) {
        await this.logSecurityEvent('xss_attempt', req, {
          suspiciousPayload: this.getSuspiciousContent(req),
        });
        return this.blockRequest(res, 'Invalid request content', 400);
      }

      // 9. Path Traversal Detection
      if (this.detectPathTraversal(req)) {
        await this.logSecurityEvent('path_traversal_attempt', req, {
          requestedPath: req.url,
        });
        return this.blockRequest(res, 'Invalid path', 400);
      }

      // 10. File Upload Security
      if (req.method === 'POST' && req.url.includes('upload')) {
        const fileCheck = await this.validateFileUpload(req);
        if (!fileCheck.valid) {
          return this.blockRequest(res, fileCheck.reason, 400);
        }
      }

      // 11. Session Security (only for authenticated endpoints)
      if (this.requiresSessionSecurity(req)) {
        this.enforceSessionSecurity(req, res);
      }

      // Set response time header before response is sent
      const responseTime = Date.now() - startTime;
      res.setHeader('X-Response-Time', `${responseTime}ms`);

      // 12. Audit Logging (async, non-blocking)
      setImmediate(async () => {
        try {
          await this.logSecurityEvent('request_processed', req, {
            method: req.method,
            url: req.url,
            userAgent: req.get('User-Agent'),
            processingTime: responseTime,
          });
        } catch (error) {
          this.logger.error(`Failed to log security event: ${error.message}`);
        }
      });

      next();
    } catch (error) {
      this.logger.error(`Security middleware error: ${error.message}`, error.stack);
      
      // Log error asynchronously
      setImmediate(async () => {
        try {
          await this.logSecurityEvent('middleware_error', req, {
            error: error.message,
            stack: error.stack,
          });
        } catch (logError) {
          this.logger.error(`Failed to log middleware error: ${logError.message}`);
        }
      });

      return this.blockRequest(res, 'Security validation failed', 500);
    }
  }

  /**
   * Set comprehensive security headers
   */
  private setSecurityHeaders(res: Response): void {
    const headers = this.securityConfig.getSecurityHeaders();
    
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Additional dynamic headers
    res.setHeader('X-Request-ID', this.generateRequestId());
    res.setHeader('X-Security-Version', '1.0');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  /**
   * Set basic security headers for exempt routes
   */
  private setBasicSecurityHeaders(res: Response): void {
    res.setHeader('X-Request-ID', this.generateRequestId());
    res.setHeader('X-Security-Version', '1.0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
  }

  /**
   * Check if route should be exempt from aggressive security checks
   */
  private isExemptRoute(url: string): boolean {
    const exemptRoutes = [
      '/api/health',
      '/api/monitoring',
      '/favicon.ico',
      '/sw.js',
      '/manifest.json',
    ];
    
    return exemptRoutes.some(route => url.startsWith(route));
  }

  /**
   * Check if this is a health check endpoint
   */
  private isHealthCheck(url: string): boolean {
    return url.includes('/health') || url.includes('/monitoring');
  }

  /**
   * Check if this is an API endpoint that should have relaxed threat detection
   */
  private isApiEndpoint(url: string): boolean {
    return url.startsWith('/api/');
  }

  /**
   * Check if request requires content validation
   */
  private requiresContentValidation(req: Request): boolean {
    // Only validate content for POST, PUT, PATCH requests to user-facing endpoints
    const methodsRequiringValidation = ['POST', 'PUT', 'PATCH'];
    const userFacingEndpoints = ['/api/auth', '/api/users', '/api/betting', '/api/wallet'];
    
    return methodsRequiringValidation.includes(req.method) && 
           userFacingEndpoints.some(endpoint => req.url.startsWith(endpoint));
  }

  /**
   * Check if request requires SQL protection
   */
  private requiresSqlProtection(req: Request): boolean {
    // Only check for SQL injection on data modification endpoints
    const dataEndpoints = ['/api/users', '/api/betting', '/api/wallet', '/api/auth'];
    const methodsRequiringSqlProtection = ['POST', 'PUT', 'PATCH', 'DELETE'];
    
    return methodsRequiringSqlProtection.includes(req.method) && 
           dataEndpoints.some(endpoint => req.url.startsWith(endpoint));
  }

  /**
   * Check if request requires XSS protection
   */
  private requiresXssProtection(req: Request): boolean {
    // Only check for XSS on user input endpoints
    const inputEndpoints = ['/api/auth', '/api/users', '/api/betting'];
    
    return req.method === 'POST' && 
           inputEndpoints.some(endpoint => req.url.startsWith(endpoint));
  }

  /**
   * Check if request requires session security
   */
  private requiresSessionSecurity(req: Request): boolean {
    // Only enforce session security on authenticated endpoints
    const authenticatedEndpoints = ['/api/users', '/api/betting', '/api/wallet', '/api/admin'];
    
    return authenticatedEndpoints.some(endpoint => req.url.startsWith(endpoint));
  }

  /**
   * Validate request size limits
   */
  private validateRequestSize(req: Request): boolean {
    const config = this.securityConfig.getSecurityConfig();
    const contentLength = parseInt(req.get('content-length') || '0', 10);
    
    if (contentLength > 1024 * 1024) { // 1MB limit
      return false;
    }

    if (req.url && req.url.length > config.validation.maxUrlLength) {
      return false;
    }

    return true;
  }

  /**
   * Perform IP-based security checks
   */
  private async performIpSecurityChecks(ip: string, req: Request): Promise<{ allowed: boolean; reason?: string }> {
    const config = this.securityConfig.getSecurityConfig();
    
    // Check IP blacklist
    if (config.threatDetection.ipBlacklist.includes(ip)) {
      return { allowed: false, reason: 'IP blacklisted' };
    }

    // Check if IP is whitelisted (if whitelist is configured)
    if (config.threatDetection.ipWhitelist.length > 0 && !config.threatDetection.ipWhitelist.includes(ip)) {
      return { allowed: false, reason: 'IP not whitelisted' };
    }

    // Check for known malicious IPs (you could integrate with threat intelligence feeds)
    const isMalicious = await this.checkMaliciousIp(ip);
    if (isMalicious) {
      return { allowed: false, reason: 'Malicious IP detected' };
    }

    return { allowed: true };
  }

  /**
   * Check rate limiting
   */
  private async checkRateLimit(ip: string, req: Request): Promise<{ allowed: boolean; reason?: string }> {
    // This would integrate with your rate limiting service
    // For now, we'll implement a simple in-memory rate limiter
    const key = `rate_limit_${ip}_${req.url}`;
    // Implementation would depend on your caching strategy (Redis, etc.)
    return { allowed: true };
  }

  /**
   * Sanitize request content
   */
  private async sanitizeRequest(req: Request): Promise<void> {
    if (req.body && typeof req.body === 'object') {
      req.body = this.sanitizationService.sanitizeObject(req.body);
    }

    if (req.query && typeof req.query === 'object') {
      req.query = this.sanitizationService.sanitizeObject(req.query as any);
    }
  }

  /**
   * Perform threat detection analysis
   */
  private async performThreatDetection(req: Request, ip: string): Promise<{
    isBlocked: boolean;
    threat?: string;
    confidence?: number;
  }> {
    try {
      // Skip threat detection for local development
      if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return { isBlocked: false };
      }

      const threats = await this.threatDetection.analyzeRequest({
        ipAddress: ip,
        userAgent: req.get('User-Agent'),
        headers: req.headers as Record<string, string>,
        body: req.body,
        method: req.method,
        url: req.url,
        userId: (req as any).user?.id,
      });

      // Only block on critical threats with high confidence
      const criticalThreat = threats.find(threat => 
        threat.severity === 'critical' && 
        threat.confidence > 0.8 &&
        !this.isLegitimateRequest(req)
      );
      
      if (criticalThreat) {
        return {
          isBlocked: true,
          threat: criticalThreat.type,
          confidence: criticalThreat.confidence,
        };
      }

      return { isBlocked: false };
    } catch (error) {
      this.logger.error(`Threat detection failed: ${error.message}`);
      return { isBlocked: false };
    }
  }

  /**
   * Check if request appears to be legitimate
   */
  private isLegitimateRequest(req: Request): boolean {
    const userAgent = req.get('User-Agent') || '';
    
    // Allow legitimate browsers and tools
    const legitimateUserAgents = [
      'Mozilla',
      'Chrome',
      'Firefox',
      'Safari',
      'Edge',
      'WindowsPowerShell',
      'curl',
      'wget',
      'PostmanRuntime',
      'Insomnia',
    ];
    
    return legitimateUserAgents.some(agent => userAgent.includes(agent));
  }

  /**
   * Detect SQL injection attempts
   */
  private detectSqlInjection(req: Request): boolean {
    const sqlPatterns = [
      /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
      /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
      /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
      /((\%27)|(\'))union/i,
      /exec(\s|\+)+(s|x)p\w+/i,
    ];

    const content = JSON.stringify({ body: req.body, query: req.query, params: req.params });
    
    return sqlPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Detect XSS attempts
   */
  private detectXss(req: Request): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi,
      /<form/gi,
    ];

    const content = JSON.stringify({ body: req.body, query: req.query, params: req.params });
    
    return xssPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Detect path traversal attempts
   */
  private detectPathTraversal(req: Request): boolean {
    const pathTraversalPatterns = [
      /\.\.\//g,
      /\.\.\\/g,
      /%2e%2e%2f/gi,
      /%2e%2e%5c/gi,
      /\.\.%2f/gi,
      /\.\.%5c/gi,
    ];

    return pathTraversalPatterns.some(pattern => pattern.test(req.url));
  }

  /**
   * Validate file uploads
   */
  private async validateFileUpload(req: Request): Promise<{ valid: boolean; reason?: string }> {
    const config = this.securityConfig.getSecurityConfig();
    
    // Check file size
    const contentLength = parseInt(req.get('content-length') || '0', 10);
    if (contentLength > config.fileSecurity.sizeLimit) {
      return { valid: false, reason: 'File too large' };
    }

    // Check content type
    const contentType = req.get('content-type');
    if (contentType && !config.fileSecurity.allowedMimeTypes.some(type => contentType.includes(type))) {
      return { valid: false, reason: 'Invalid file type' };
    }

    return { valid: true };
  }

  /**
   * Enforce session security
   */
  private enforceSessionSecurity(req: Request, res: Response): void {
    const config = this.securityConfig.getSecurityConfig();
    
    // Set secure cookie attributes
    res.cookie('secure', 'true', {
      secure: config.session.secure,
      httpOnly: config.session.httpOnly,
      sameSite: config.session.sameSite as any,
      maxAge: config.session.maxAge,
    });
  }

  /**
   * Block request with appropriate response
   */
  private blockRequest(res: Response, reason: string, statusCode: number): void {
    this.logger.warn(`Request blocked: ${reason}`);
    
    res.status(statusCode).json({
      error: 'Request blocked',
      message: 'Your request has been blocked for security reasons',
      code: statusCode,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log security events
   */
  private async logSecurityEvent(eventType: string, req: Request, details: any): Promise<void> {
    try {
      await this.auditService.createAuditLog({
        eventType,
        category: 'security_event',
        ipAddress: this.getClientIp(req),
        userAgent: req.get('User-Agent'),
        method: req.method,
        resource: req.url,
        success: !eventType.includes('attempt') && !eventType.includes('blocked'),
        riskLevel: this.getRiskLevel(eventType),
        context: {
          requestId: (req as any).requestId,
          details,
        },
        tags: ['security', 'middleware', eventType],
      });
    } catch (error) {
      this.logger.error(`Failed to log security event: ${error.message}`);
    }
  }

  /**
   * Get client IP address
   */
  private getClientIp(req: Request): string {
    return (req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req as any).info?.remoteAddress ||
      '127.0.0.1').replace('::ffff:', '');
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get suspicious content for logging
   */
  private getSuspiciousContent(req: Request): any {
    return {
      body: req.body,
      query: req.query,
      params: req.params,
      url: req.url,
    };
  }

  /**
   * Check if IP is malicious (integrate with threat intelligence)
   */
  private async checkMaliciousIp(ip: string): Promise<boolean> {
    // This would integrate with threat intelligence feeds
    // For now, return false (you can implement actual checks)
    return false;
  }

  /**
   * Get risk level based on event type
   */
  private getRiskLevel(eventType: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalEvents = ['sql_injection_attempt', 'xss_attempt', 'threat_blocked'];
    const highEvents = ['path_traversal_attempt', 'rate_limit_exceeded'];
    const mediumEvents = ['invalid_file_upload', 'suspicious_request'];
    
    if (criticalEvents.some(event => eventType.includes(event))) {
      return 'critical';
    } else if (highEvents.some(event => eventType.includes(event))) {
      return 'high';
    } else if (mediumEvents.some(event => eventType.includes(event))) {
      return 'medium';
    }
    
    return 'low';
  }
}
