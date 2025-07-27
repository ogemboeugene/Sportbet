import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { SecurityEvent, SecurityEventDocument } from '../../database/schemas/security-event.schema';
import { SecurityThreat, SecurityThreatDocument } from '../../database/schemas/security-threat.schema';
import { SecurityIncident, SecurityIncidentDocument } from '../../database/schemas/security-incident.schema';
import { SecurityAuditLog, SecurityAuditLogDocument } from '../../database/schemas/security-audit-log.schema';
import { ThreatDetectionService } from './threat-detection.service';
import { IncidentResponseService } from './incident-response.service';

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  constructor(
    @InjectModel(SecurityEvent.name) private securityEventModel: Model<SecurityEventDocument>,
    @InjectModel(SecurityThreat.name) private securityThreatModel: Model<SecurityThreatDocument>,
    @InjectModel(SecurityIncident.name) private securityIncidentModel: Model<SecurityIncidentDocument>,
    @InjectModel(SecurityAuditLog.name) private securityAuditLogModel: Model<SecurityAuditLogDocument>,
    private configService: ConfigService,
    private threatDetectionService: ThreatDetectionService,
    private incidentResponseService: IncidentResponseService,
  ) {}

  async logSecurityEvent(eventData: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    source: string;
    userId?: string;
    sessionId?: string;
    ipAddress: string;
    userAgent?: string;
    endpoint?: string;
    method?: string;
    details: Record<string, any>;
    metadata?: Record<string, any>;
    tags?: string[];
  }): Promise<SecurityEventDocument> {
    try {
      const event = new this.securityEventModel({
        ...eventData,
        detectedAt: new Date(),
      });

      const savedEvent = await event.save();

      // Check if this event indicates a threat
      await this.threatDetectionService.analyzeEvent(savedEvent);

      // Log critical events immediately
      if (eventData.severity === 'critical') {
        this.logger.error(`Critical security event detected: ${eventData.type}`, {
          eventId: savedEvent._id,
          details: eventData.details,
        });
      }

      return savedEvent;
    } catch (error) {
      this.logger.error('Failed to log security event', error.stack);
      throw error;
    }
  }

  async createSecurityThreat(threatData: {
    type: 'brute_force' | 'ddos' | 'sql_injection' | 'xss' | 'csrf' | 'malware' | 'suspicious_activity' | 'data_breach' | 'unauthorized_access';
    severity: 'low' | 'medium' | 'high' | 'critical';
    source: string;
    targetUserId?: string;
    targetResource?: string;
    sourceIp: string;
    userAgent?: string;
    indicators: Record<string, any>;
    evidence: Record<string, any>;
    attackVector?: string;
    estimatedImpact?: string;
  }): Promise<SecurityThreatDocument> {
    try {
      const threat = new this.securityThreatModel({
        ...threatData,
        status: 'detected',
        firstDetected: new Date(),
        lastActivity: new Date(),
        mitigationActions: [],
        notes: [],
        relatedThreats: [],
        tags: [],
      });

      const savedThreat = await threat.save();

      // Auto-escalate critical threats to incidents
      if (threatData.severity === 'critical') {
        await this.incidentResponseService.createIncidentFromThreat(savedThreat);
      }

      this.logger.warn(`Security threat detected: ${threatData.type}`, {
        threatId: savedThreat._id,
        severity: threatData.severity,
        sourceIp: threatData.sourceIp,
      });

      return savedThreat;
    } catch (error) {
      this.logger.error('Failed to create security threat', error.stack);
      throw error;
    }
  }

  async logAuditEvent(auditData: {
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
    requestData?: Record<string, any>;
    responseData?: Record<string, any>;
    sensitiveData?: Record<string, any>;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    context?: Record<string, any>;
    correlationId?: string;
    geolocation?: {
      country: string;
      region: string;
      city: string;
    };
    deviceFingerprint?: string;
    complianceFlags?: string[];
    tags?: string[];
  }): Promise<SecurityAuditLogDocument> {
    try {
      // Encrypt sensitive data if present
      let encryptedSensitiveData = null;
      if (auditData.sensitiveData) {
        encryptedSensitiveData = await this.encryptSensitiveData(auditData.sensitiveData);
      }

      // Create integrity hash
      const dataToHash = JSON.stringify({
        eventType: auditData.eventType,
        category: auditData.category,
        userId: auditData.userId,
        timestamp: new Date().toISOString(),
        success: auditData.success,
        resource: auditData.resource,
        action: auditData.action,
      });
      const integrity = crypto.createHash('sha256').update(dataToHash).digest('hex');

      const auditLog = new this.securityAuditLogModel({
        ...auditData,
        sensitiveData: encryptedSensitiveData,
        integrity,
        timestamp: new Date(),
        context: auditData.context || {},
        complianceFlags: auditData.complianceFlags || [],
        tags: auditData.tags || [],
      });

      return await auditLog.save();
    } catch (error) {
      this.logger.error('Failed to log audit event', error.stack);
      throw error;
    }
  }

  async getSecurityEvents(filters: {
    type?: string;
    severity?: string;
    userId?: string;
    ipAddress?: string;
    resolved?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    skip?: number;
  } = {}): Promise<{ events: SecurityEventDocument[]; total: number }> {
    const query: any = {};

    if (filters.type) query.type = filters.type;
    if (filters.severity) query.severity = filters.severity;
    if (filters.userId) query.userId = filters.userId;
    if (filters.ipAddress) query.ipAddress = filters.ipAddress;
    if (filters.resolved !== undefined) query.resolved = filters.resolved;
    
    if (filters.startDate || filters.endDate) {
      query.detectedAt = {};
      if (filters.startDate) query.detectedAt.$gte = filters.startDate;
      if (filters.endDate) query.detectedAt.$lte = filters.endDate;
    }

    const total = await this.securityEventModel.countDocuments(query);
    const events = await this.securityEventModel
      .find(query)
      .sort({ detectedAt: -1 })
      .limit(filters.limit || 50)
      .skip(filters.skip || 0)
      .exec();

    return { events, total };
  }

  async getSecurityThreats(filters: {
    type?: string;
    severity?: string;
    status?: string;
    sourceIp?: string;
    assignedTo?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    skip?: number;
  } = {}): Promise<{ threats: SecurityThreatDocument[]; total: number }> {
    const query: any = {};

    if (filters.type) query.type = filters.type;
    if (filters.severity) query.severity = filters.severity;
    if (filters.status) query.status = filters.status;
    if (filters.sourceIp) query.sourceIp = filters.sourceIp;
    if (filters.assignedTo) query.assignedTo = filters.assignedTo;
    
    if (filters.startDate || filters.endDate) {
      query.firstDetected = {};
      if (filters.startDate) query.firstDetected.$gte = filters.startDate;
      if (filters.endDate) query.firstDetected.$lte = filters.endDate;
    }

    const total = await this.securityThreatModel.countDocuments(query);
    const threats = await this.securityThreatModel
      .find(query)
      .sort({ firstDetected: -1 })
      .limit(filters.limit || 50)
      .skip(filters.skip || 0)
      .exec();

    return { threats, total };
  }

  async getSecurityIncidents(filters: {
    type?: string;
    severity?: string;
    status?: string;
    assignedTo?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    skip?: number;
  } = {}): Promise<{ incidents: SecurityIncidentDocument[]; total: number }> {
    const query: any = {};

    if (filters.type) query.type = filters.type;
    if (filters.severity) query.severity = filters.severity;
    if (filters.status) query.status = filters.status;
    if (filters.assignedTo) query.assignedTo = filters.assignedTo;
    
    if (filters.startDate || filters.endDate) {
      query['timeline.detected'] = {};
      if (filters.startDate) query['timeline.detected'].$gte = filters.startDate;
      if (filters.endDate) query['timeline.detected'].$lte = filters.endDate;
    }

    const total = await this.securityIncidentModel.countDocuments(query);
    const incidents = await this.securityIncidentModel
      .find(query)
      .sort({ 'timeline.detected': -1 })
      .limit(filters.limit || 50)
      .skip(filters.skip || 0)
      .exec();

    return { incidents, total };
  }

  async getAuditLogs(filters: {
    eventType?: string;
    category?: string;
    userId?: string;
    adminId?: string;
    ipAddress?: string;
    success?: boolean;
    riskLevel?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    skip?: number;
  } = {}): Promise<{ logs: SecurityAuditLogDocument[]; total: number }> {
    const query: any = {};

    if (filters.eventType) query.eventType = filters.eventType;
    if (filters.category) query.category = filters.category;
    if (filters.userId) query.userId = filters.userId;
    if (filters.adminId) query.adminId = filters.adminId;
    if (filters.ipAddress) query.ipAddress = filters.ipAddress;
    if (filters.success !== undefined) query.success = filters.success;
    if (filters.riskLevel) query.riskLevel = filters.riskLevel;
    
    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = filters.startDate;
      if (filters.endDate) query.timestamp.$lte = filters.endDate;
    }

    const total = await this.securityAuditLogModel.countDocuments(query);
    const logs = await this.securityAuditLogModel
      .find(query)
      .sort({ timestamp: -1 })
      .limit(filters.limit || 100)
      .skip(filters.skip || 0)
      .exec();

    return { logs, total };
  }

  async validatePasswordStrength(password: string): Promise<{
    isValid: boolean;
    score: number;
    feedback: string[];
  }> {
    const feedback = [];
    let score = 0;

    // Length check
    if (password.length < 8) {
      feedback.push('Password must be at least 8 characters long');
    } else if (password.length >= 12) {
      score += 20;
    } else {
      score += 10;
    }

    // Complexity checks
    if (!/[a-z]/.test(password)) {
      feedback.push('Password must contain lowercase letters');
    } else {
      score += 10;
    }

    if (!/[A-Z]/.test(password)) {
      feedback.push('Password must contain uppercase letters');
    } else {
      score += 10;
    }

    if (!/\d/.test(password)) {
      feedback.push('Password must contain numbers');
    } else {
      score += 15;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      feedback.push('Password must contain special characters');
    } else {
      score += 15;
    }

    // Common password check (simplified)
    const commonPasswords = ['password', '123456', 'qwerty', 'admin'];
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      feedback.push('Password contains common patterns');
      score -= 20;
    } else {
      score += 10;
    }

    // Sequential character check
    if (/(.)\1{2,}/.test(password)) {
      feedback.push('Password contains repeated characters');
      score -= 10;
    } else {
      score += 10;
    }

    // Final validation
    score = Math.max(0, Math.min(100, score));
    const isValid = score >= 70 && feedback.length === 0;

    if (!isValid && feedback.length === 0) {
      feedback.push('Password strength is too weak');
    }

    return { isValid, score, feedback };
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = parseInt(this.configService.get<string>('BCRYPT_ROUNDS', '12'), 10);
    return await bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  private async encryptSensitiveData(data: Record<string, any>): Promise<string> {
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    if (!key) {
      throw new Error('Encryption key not configured');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', key);
    cipher.setAutoPadding(true);

    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  async getSecurityMetrics(): Promise<{
    events: { total: number; byType: Record<string, number>; bySeverity: Record<string, number> };
    threats: { total: number; active: number; byType: Record<string, number>; bySeverity: Record<string, number> };
    incidents: { total: number; open: number; byType: Record<string, number>; bySeverity: Record<string, number> };
    auditLogs: { total: number; failed: number; byCategory: Record<string, number> };
  }> {
    const [eventStats, threatStats, incidentStats, auditStats] = await Promise.all([
      this.getEventMetrics(),
      this.getThreatMetrics(),
      this.getIncidentMetrics(),
      this.getAuditMetrics(),
    ]);

    return {
      events: eventStats,
      threats: threatStats,
      incidents: incidentStats,
      auditLogs: auditStats,
    };
  }

  private async getEventMetrics() {
    const [total, byType, bySeverity] = await Promise.all([
      this.securityEventModel.countDocuments(),
      this.securityEventModel.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      this.securityEventModel.aggregate([
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      total,
      byType: Object.fromEntries(byType.map(item => [item._id, item.count])),
      bySeverity: Object.fromEntries(bySeverity.map(item => [item._id, item.count])),
    };
  }

  private async getThreatMetrics() {
    const [total, active, byType, bySeverity] = await Promise.all([
      this.securityThreatModel.countDocuments(),
      this.securityThreatModel.countDocuments({ status: { $in: ['detected', 'investigating', 'contained'] } }),
      this.securityThreatModel.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      this.securityThreatModel.aggregate([
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      total,
      active,
      byType: Object.fromEntries(byType.map(item => [item._id, item.count])),
      bySeverity: Object.fromEntries(bySeverity.map(item => [item._id, item.count])),
    };
  }

  private async getIncidentMetrics() {
    const [total, open, byType, bySeverity] = await Promise.all([
      this.securityIncidentModel.countDocuments(),
      this.securityIncidentModel.countDocuments({ status: { $in: ['new', 'investigating', 'contained'] } }),
      this.securityIncidentModel.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      this.securityIncidentModel.aggregate([
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      total,
      open,
      byType: Object.fromEntries(byType.map(item => [item._id, item.count])),
      bySeverity: Object.fromEntries(bySeverity.map(item => [item._id, item.count])),
    };
  }

  private async getAuditMetrics() {
    const [total, failed, byCategory] = await Promise.all([
      this.securityAuditLogModel.countDocuments(),
      this.securityAuditLogModel.countDocuments({ success: false }),
      this.securityAuditLogModel.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      total,
      failed,
      byCategory: Object.fromEntries(byCategory.map(item => [item._id, item.count])),
    };
  }
}
