import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { ThreatDetectionService } from '../threat-detection.service';
import { IncidentResponseService } from '../incident-response.service';
import { SecurityAuditService } from '../security-audit.service';

@Injectable()
export class ThreatDetectionGuard implements CanActivate {
  constructor(
    private threatDetectionService: ThreatDetectionService,
    private incidentResponseService: IncidentResponseService,
    private securityAuditService: SecurityAuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    try {
      // Create a security event for threat analysis
      const securityEvent = await this.securityAuditService.createAuditLog({
        eventType: 'threat_analysis',
        category: 'security_event',
        ipAddress: request.ip || 'unknown',
        userAgent: request.get('User-Agent'),
        method: request.method,
        resource: request.path,
        success: true,
        riskLevel: 'low',
        context: {
          headers: request.headers,
          body: request.body,
        },
        tags: ['threat_detection', 'analysis'],
      });

      // For now, we'll do basic validation without the analyzeRequest method
      const threats: any[] = [];

      // Basic threat detection
      const userAgent = request.get('User-Agent') || '';
      const body = JSON.stringify(request.body || {});
      
      // Check for SQL injection patterns
      const sqlPatterns = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'UNION', '--', ';'];
      const hasSqlPattern = sqlPatterns.some(pattern => 
        body.toUpperCase().includes(pattern) || request.url.toUpperCase().includes(pattern)
      );
      
      if (hasSqlPattern) {
        threats.push({
          type: 'sql_injection',
          riskLevel: 'high',
          description: 'SQL injection pattern detected',
        });
      }

      // Check for XSS patterns
      const xssPatterns = ['<script', 'javascript:', 'onclick=', 'onerror='];
      const hasXssPattern = xssPatterns.some(pattern => 
        body.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (hasXssPattern) {
        threats.push({
          type: 'xss_attempt',
          riskLevel: 'high',
          description: 'XSS pattern detected',
        });
      }

      // Check for high-risk threats
      const highRiskThreats = threats.filter(threat => 
        threat.riskLevel === 'high' || threat.riskLevel === 'critical'
      );

      if (highRiskThreats.length > 0) {
        // Log threat detection
        await this.securityAuditService.createAuditLog({
          eventType: 'threat_detected_blocked',
          category: 'security_event',
          ipAddress: request.ip || 'unknown',
          userAgent: request.get('User-Agent'),
          method: request.method,
          resource: request.path,
          success: false,
          failureReason: 'High-risk threats detected',
          riskLevel: 'critical',
          context: {
            threats: highRiskThreats,
            requestData: {
              headers: request.headers,
              body: request.body,
            },
          },
          tags: ['threat_detection', 'blocked', 'high_risk'],
        });

        // Create security incident for critical threats
        const criticalThreats = highRiskThreats.filter(t => t.riskLevel === 'critical');
        if (criticalThreats.length > 0) {
          await this.incidentResponseService.createIncident({
            title: `Critical Security Threat Detected - ${request.ip}`,
            description: `Critical security threats detected from IP ${request.ip}: ${criticalThreats.map(t => t.type).join(', ')}`,
            type: 'unauthorized_access',
            severity: 'critical',
            affectedSystems: ['api'],
            evidence: [
              {
                type: 'threat_logs',
                data: JSON.stringify(threats),
              },
              {
                type: 'request_data',
                data: {
                  ip: request.ip,
                  userAgent: request.get('User-Agent'),
                  method: request.method,
                  url: request.url,
                  threats: criticalThreats,
                },
              },
            ],
            tags: ['automated', 'threat_detection', 'blocked'],
          });
        }

        throw new ForbiddenException('Request blocked due to security threats');
      }

      // Log successful threat analysis for high-volume endpoints
      if (this.isHighVolumeEndpoint(request.path)) {
        await this.securityAuditService.createAuditLog({
          eventType: 'threat_analysis_passed',
          category: 'security_event',
          ipAddress: request.ip || 'unknown',
          method: request.method,
          resource: request.path,
          success: true,
          riskLevel: 'low',
          context: {
            threatCount: threats.length,
            lowRiskThreats: threats.filter(t => t.riskLevel === 'low').length,
            mediumRiskThreats: threats.filter(t => t.riskLevel === 'medium').length,
          },
          tags: ['threat_detection', 'passed'],
        });
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      // Log unexpected error
      await this.securityAuditService.createAuditLog({
        eventType: 'threat_detection_error',
        category: 'security_event',
        ipAddress: request.ip || 'unknown',
        success: false,
        failureReason: error.message,
        riskLevel: 'medium',
        context: { error: error.stack },
        tags: ['threat_detection', 'error'],
      });

      // Allow request to proceed on error (fail open)
      return true;
    }
  }

  private isHighVolumeEndpoint(path: string): boolean {
    const highVolumePatterns = [
      '/auth/login',
      '/auth/register',
      '/betting/place',
      '/wallet/deposit',
      '/wallet/withdraw',
    ];
    
    return highVolumePatterns.some(pattern => path.includes(pattern));
  }
}
