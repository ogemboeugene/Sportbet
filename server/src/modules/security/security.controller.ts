import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  ValidationPipe,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { SecurityService } from './security.service';
import { InputSanitizationService } from './input-sanitization.service';
import { CsrfProtectionService } from './csrf-protection.service';
import { ThreatDetectionService } from './threat-detection.service';
import { IncidentResponseService } from './incident-response.service';
import { EncryptionService } from './encryption.service';
import { FileSecurityService } from './file-security.service';
import { SecurityAuditService } from './security-audit.service';

@Controller('security')
@UseGuards(ThrottlerGuard)
export class SecurityController {
  constructor(
    private readonly securityService: SecurityService,
    private readonly inputSanitizationService: InputSanitizationService,
    private readonly csrfProtectionService: CsrfProtectionService,
    private readonly threatDetectionService: ThreatDetectionService,
    private readonly incidentResponseService: IncidentResponseService,
    private readonly encryptionService: EncryptionService,
    private readonly fileSecurityService: FileSecurityService,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  // CSRF Protection Endpoints
  @Get('csrf-token')
  async getCsrfToken(@Request() req: any) {
    const token = await this.csrfProtectionService.generateToken(req);
    return { csrfToken: token };
  }

  @Post('csrf-validate')
  @HttpCode(HttpStatus.OK)
  async validateCsrfToken(
    @Body('token') token: string,
    @Request() req: any,
  ) {
    const isValid = await this.csrfProtectionService.validateToken(token, req);
    return { isValid };
  }

  // Input Sanitization Endpoints
  @Post('sanitize-input')
  @HttpCode(HttpStatus.OK)
  async sanitizeInput(@Body() data: { input: string; type?: string }) {
    const sanitized = this.inputSanitizationService.escapeHtml(data.input);
    return { 
      original: data.input,
      sanitized,
      safe: sanitized === data.input,
    };
  }

  @Post('validate-registration')
  @HttpCode(HttpStatus.OK)
  async validateRegistrationData(@Body() registrationData: any) {
    const result = this.inputSanitizationService.validateRegistrationData(registrationData);
    return result;
  }

  // File Security Endpoints
  @Post('upload-scan')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAndScanFile(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const scanResult = this.fileSecurityService.validateFile({
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    });
    return { isValid: scanResult };
  }

  // Security Events Endpoints
  @Post('events')
  @HttpCode(HttpStatus.CREATED)
  async logSecurityEvent(@Body() eventData: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    source: string;
    userId?: string;
    ipAddress: string;
    details: Record<string, any>;
    metadata?: Record<string, any>;
    tags?: string[];
  }) {
    const event = await this.securityService.logSecurityEvent({
      ...eventData,
      userAgent: 'api',
      endpoint: '/security/events',
      method: 'POST',
    });
    return { eventId: event._id };
  }

  @Get('events')
  async getSecurityEvents(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('severity') severity?: string,
    @Query('type') type?: string,
  ) {
    const events = await this.securityService.getSecurityEvents({
      limit,
      skip,
      severity: severity as any,
      type,
    });
    return events;
  }

  // Incident Response Endpoints
  @Post('incidents')
  @HttpCode(HttpStatus.CREATED)
  async createIncident(@Body() incidentData: {
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: 'data_breach' | 'unauthorized_access' | 'system_compromise' | 'malware' | 'phishing' | 'ddos' | 'insider_threat' | 'other';
    affectedUsers?: string[];
    affectedSystems?: string[];
    affectedData?: string[];
    evidence?: any[];
    tags?: string[];
  }) {
    const incident = await this.incidentResponseService.createIncident(incidentData);
    return { incidentId: incident._id };
  }

  // Audit Logs Endpoints
  @Post('audit')
  @HttpCode(HttpStatus.CREATED)
  async createAuditLog(@Body() auditData: {
    eventType: string;
    category: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'system_access' | 'configuration' | 'security_event';
    userId?: string;
    adminId?: string;
    sessionId?: string;
    ipAddress: string;
    userAgent?: string;
    resource?: string;
    action?: string;
    method?: string;
    success: boolean;
    failureReason?: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    context?: Record<string, any>;
    tags?: string[];
  }) {
    const auditLog = await this.securityAuditService.createAuditLog(auditData);
    return { auditLogId: auditLog._id };
  }

  @Get('audit')
  async searchAuditLogs(
    @Query('eventType') eventType?: string,
    @Query('category') category?: string,
    @Query('userId') userId?: string,
    @Query('success') success?: boolean,
    @Query('riskLevel') riskLevel?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number = 50,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number = 0,
  ) {
    const result = await this.securityAuditService.searchAuditLogs({
      eventType,
      category: category as any,
      userId,
      success,
      riskLevel: riskLevel as any,
      limit,
      skip,
    });
    return result;
  }

  @Get('audit/:id/verify')
  async verifyAuditLogIntegrity(@Param('id') id: string) {
    const result = await this.securityAuditService.verifyAuditLogIntegrity(id);
    return result;
  }

  @Post('audit/compliance-report')
  @HttpCode(HttpStatus.OK)
  async generateComplianceReport(@Body() params: {
    startDate: string;
    endDate: string;
    categories?: string[];
    includeFailures?: boolean;
    format: 'json' | 'csv' | 'pdf';
  }) {
    const report = await this.securityAuditService.generateComplianceReport({
      startDate: new Date(params.startDate),
      endDate: new Date(params.endDate),
      categories: params.categories,
      includeFailures: params.includeFailures,
      format: params.format,
    });
    return report;
  }

  // Encryption Services Endpoints
  @Post('encrypt')
  @HttpCode(HttpStatus.OK)
  async encryptData(@Body() data: { text: string; purpose?: string }) {
    const encrypted = this.encryptionService.encryptField(data.text, data.purpose || 'general');
    return { encrypted };
  }

  @Post('decrypt')
  @HttpCode(HttpStatus.OK)
  async decryptData(@Body() data: { encryptedText: string; purpose?: string }) {
    const decrypted = this.encryptionService.decryptField(data.encryptedText, data.purpose || 'general');
    return { decrypted };
  }

  @Post('hash-password')
  @HttpCode(HttpStatus.OK)
  async hashPassword(@Body() data: { password: string }) {
    const hashed = await this.encryptionService.hashPassword(data.password);
    return { hashed };
  }

  @Post('verify-password')
  @HttpCode(HttpStatus.OK)
  async verifyPassword(@Body() data: { password: string; hash: string }) {
    const isValid = await this.encryptionService.verifyPassword(data.password, data.hash);
    return { isValid };
  }

  @Post('generate-token')
  @HttpCode(HttpStatus.OK)
  async generateSecureToken(@Body() data: { length?: number }) {
    const token = this.encryptionService.generateSecureToken(data.length || 32);
    return { token };
  }

  // Security Health Check
  @Get('health')
  async securityHealthCheck() {
    const healthStatus = {
      timestamp: new Date().toISOString(),
      services: {
        security: true,
        inputSanitization: true,
        csrfProtection: true,
        threatDetection: true,
        incidentResponse: true,
        encryption: true,
        fileSecurity: true,
        audit: true,
      },
      status: 'healthy',
    };

    // Log health check
    await this.securityAuditService.createAuditLog({
      eventType: 'security_health_check',
      category: 'system_access',
      ipAddress: 'system',
      success: true,
      riskLevel: 'low',
      context: healthStatus,
      tags: ['health_check', 'monitoring'],
    });

    return healthStatus;
  }

  // Security Configuration
  @Get('config')
  async getSecurityConfig() {
    const config = {
      csrfProtection: {
        enabled: true,
        sameSitePolicy: 'strict',
        tokenLength: 32,
      },
      rateLimiting: {
        enabled: true,
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100,
      },
      fileUpload: {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
        virusScanning: true,
      },
      encryption: {
        algorithm: 'AES-256-GCM',
        keyRotation: true,
        pciCompliant: true,
      },
      audit: {
        enabled: true,
        retentionPeriod: '7 years',
        integrityChecking: true,
      },
    };

    return config;
  }
}
