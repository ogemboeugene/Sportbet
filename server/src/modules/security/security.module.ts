import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { SecurityService } from './security.service';
import { SecurityController } from './security.controller';
import { InputSanitizationService } from './input-sanitization.service';
import { CsrfProtectionService } from './csrf-protection.service';
import { ThreatDetectionService } from './threat-detection.service';
import { IncidentResponseService } from './incident-response.service';
import { SecurityAuditService } from './security-audit.service';
import { EncryptionService } from './encryption.service';
import { FileSecurityService } from './file-security.service';
import { SecurityConfigService } from './security-config.service';
import { VirusScanningService } from './virus-scanning.service';
import { CsrfGuard } from './guards/csrf.guard';
import { ThreatDetectionGuard } from './guards/threat-detection.guard';
import { InputSanitizationMiddleware } from './middleware/input-sanitization.middleware';
import { SecurityAuditMiddleware } from './middleware/security-audit.middleware';
import { AdvancedSecurityMiddleware } from './middleware/advanced-security.middleware';
import { SecurityEvent, SecurityEventSchema } from '../../database/schemas/security-event.schema';
import { SecurityThreat, SecurityThreatSchema } from '../../database/schemas/security-threat.schema';
import { SecurityIncident, SecurityIncidentSchema } from '../../database/schemas/security-incident.schema';
import { SecurityAuditLog, SecurityAuditLogSchema } from '../../database/schemas/security-audit-log.schema';

@Module({
  imports: [
    ConfigModule,
    ThrottlerModule,
    MongooseModule.forFeature([
      { name: SecurityEvent.name, schema: SecurityEventSchema },
      { name: SecurityThreat.name, schema: SecurityThreatSchema },
      { name: SecurityIncident.name, schema: SecurityIncidentSchema },
      { name: SecurityAuditLog.name, schema: SecurityAuditLogSchema },
    ]),
  ],
  providers: [
    SecurityService,
    InputSanitizationService,
    CsrfProtectionService,
    ThreatDetectionService,
    IncidentResponseService,
    SecurityAuditService,
    EncryptionService,
    FileSecurityService,
    SecurityConfigService,
    VirusScanningService,
    CsrfGuard,
    ThreatDetectionGuard,
    InputSanitizationMiddleware,
    SecurityAuditMiddleware,
    AdvancedSecurityMiddleware,
  ],
  controllers: [SecurityController],
  exports: [
    SecurityService,
    InputSanitizationService,
    CsrfProtectionService,
    ThreatDetectionService,
    IncidentResponseService,
    SecurityAuditService,
    EncryptionService,
    FileSecurityService,
    SecurityConfigService,
    VirusScanningService,
    CsrfGuard,
    ThreatDetectionGuard,
    InputSanitizationMiddleware,
    SecurityAuditMiddleware,
    AdvancedSecurityMiddleware,
  ],
})
export class SecurityModule {}
