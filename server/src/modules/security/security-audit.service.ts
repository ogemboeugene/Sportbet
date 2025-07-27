import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { SecurityAuditLog, SecurityAuditLogDocument } from '../../database/schemas/security-audit-log.schema';
import { SecurityEvent, SecurityEventDocument } from '../../database/schemas/security-event.schema';
import { EncryptionService } from './encryption.service';

@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger(SecurityAuditService.name);
  private readonly retentionPeriods: Map<string, number>;
  private readonly complianceReporting: boolean;

  constructor(
    @InjectModel(SecurityAuditLog.name) private securityAuditLogModel: Model<SecurityAuditLogDocument>,
    @InjectModel(SecurityEvent.name) private securityEventModel: Model<SecurityEventDocument>,
    private configService: ConfigService,
    private encryptionService: EncryptionService,
  ) {
    // Configure retention periods for different audit log categories
    this.retentionPeriods = new Map([
      ['authentication', 2 * 365 * 24 * 60 * 60 * 1000], // 2 years
      ['authorization', 2 * 365 * 24 * 60 * 60 * 1000], // 2 years
      ['data_access', 7 * 365 * 24 * 60 * 60 * 1000], // 7 years (compliance)
      ['data_modification', 7 * 365 * 24 * 60 * 60 * 1000], // 7 years
      ['system_access', 1 * 365 * 24 * 60 * 60 * 1000], // 1 year
      ['configuration', 3 * 365 * 24 * 60 * 60 * 1000], // 3 years
      ['security_event', 5 * 365 * 24 * 60 * 60 * 1000], // 5 years
    ]);

    this.complianceReporting = this.configService.get<boolean>('COMPLIANCE_REPORTING_ENABLED', true);
  }

  /**
   * Create tamper-proof audit log entry
   */
  async createAuditLog(auditData: {
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
      // Encrypt sensitive data
      let encryptedSensitiveData: string | undefined;
      if (auditData.sensitiveData) {
        encryptedSensitiveData = this.encryptionService.encryptField(
          JSON.stringify(auditData.sensitiveData),
          'audit-sensitive-data'
        );
      }

      // Generate correlation ID if not provided
      const correlationId = auditData.correlationId || this.generateCorrelationId();

      // Create integrity hash
      const integrityData = {
        eventType: auditData.eventType,
        category: auditData.category,
        userId: auditData.userId,
        adminId: auditData.adminId,
        ipAddress: auditData.ipAddress,
        resource: auditData.resource,
        action: auditData.action,
        success: auditData.success,
        timestamp: new Date().toISOString(),
        correlationId,
      };

      const integrity = this.createIntegrityHash(integrityData);

      // Determine retention policy
      const retentionPolicy = this.getRetentionPolicy(auditData.category);

      // Create audit log entry
      const auditLog = new this.securityAuditLogModel({
        ...auditData,
        sensitiveData: encryptedSensitiveData,
        correlationId,
        integrity,
        timestamp: new Date(),
        retentionPolicy,
        context: auditData.context || {},
        complianceFlags: this.generateComplianceFlags(auditData),
        tags: auditData.tags || [],
      });

      const savedLog = await auditLog.save();

      // Log critical events immediately
      if (auditData.riskLevel === 'critical' || !auditData.success) {
        this.logger.warn(`Audit event logged: ${auditData.eventType}`, {
          logId: savedLog._id,
          category: auditData.category,
          success: auditData.success,
          riskLevel: auditData.riskLevel,
        });
      }

      return savedLog;
    } catch (error) {
      this.logger.error('Failed to create audit log', error.stack);
      throw error;
    }
  }

  /**
   * Verify audit log integrity
   */
  async verifyAuditLogIntegrity(logId: string): Promise<{
    isValid: boolean;
    originalIntegrity: string;
    calculatedIntegrity: string;
    tampered: boolean;
  }> {
    try {
      const log = await this.securityAuditLogModel.findById(logId);
      if (!log) {
        throw new Error('Audit log not found');
      }

      const integrityData = {
        eventType: log.eventType,
        category: log.category,
        userId: log.userId?.toString(),
        adminId: log.adminId?.toString(),
        ipAddress: log.ipAddress,
        resource: log.resource,
        action: log.action,
        success: log.success,
        timestamp: log.timestamp.toISOString(),
        correlationId: log.correlationId,
      };

      const calculatedIntegrity = this.createIntegrityHash(integrityData);
      const tampered = log.integrity !== calculatedIntegrity;

      if (tampered) {
        this.logger.error(`Audit log tampering detected`, {
          logId,
          originalIntegrity: log.integrity,
          calculatedIntegrity,
        });

        // Create security event for tampering
        await this.securityEventModel.create({
          type: 'audit_log_tampering',
          severity: 'critical',
          source: 'audit_service',
          details: {
            auditLogId: logId,
            originalIntegrity: log.integrity,
            calculatedIntegrity,
            detectionTime: new Date(),
          },
          metadata: {
            automated: true,
            integrityViolation: true,
          },
          tags: ['tampering', 'audit_integrity', 'security_violation'],
        });
      }

      return {
        isValid: !tampered,
        originalIntegrity: log.integrity,
        calculatedIntegrity,
        tampered,
      };
    } catch (error) {
      this.logger.error('Failed to verify audit log integrity', error.stack);
      throw error;
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(params: {
    startDate: Date;
    endDate: Date;
    categories?: string[];
    includeFailures?: boolean;
    format: 'json' | 'csv' | 'pdf';
  }): Promise<{
    reportId: string;
    summary: {
      totalEvents: number;
      successfulEvents: number;
      failedEvents: number;
      criticalEvents: number;
      byCategory: Record<string, number>;
      byRiskLevel: Record<string, number>;
    };
    data: any[];
    metadata: {
      generatedAt: Date;
      period: { start: Date; end: Date };
      filters: any;
      integrityChecked: boolean;
    };
  }> {
    try {
      const reportId = this.generateReportId();
      
      // Build query
      const query: any = {
        timestamp: {
          $gte: params.startDate,
          $lte: params.endDate,
        },
      };

      if (params.categories && params.categories.length > 0) {
        query.category = { $in: params.categories };
      }

      if (params.includeFailures === false) {
        query.success = true;
      }

      // Get audit logs
      const logs = await this.securityAuditLogModel
        .find(query)
        .sort({ timestamp: -1 })
        .lean();

      // Verify integrity of critical logs
      const integrityChecked = await this.verifyBatchIntegrity(logs.slice(0, 100)); // Sample check

      // Generate summary statistics
      const summary = {
        totalEvents: logs.length,
        successfulEvents: logs.filter(log => log.success).length,
        failedEvents: logs.filter(log => !log.success).length,
        criticalEvents: logs.filter(log => log.riskLevel === 'critical').length,
        byCategory: this.groupByField(logs, 'category'),
        byRiskLevel: this.groupByField(logs, 'riskLevel'),
      };

      // Format data based on requested format
      let formattedData: any[];
      switch (params.format) {
        case 'csv':
          formattedData = this.formatForCsv(logs);
          break;
        case 'pdf':
          formattedData = this.formatForPdf(logs);
          break;
        default:
          formattedData = this.formatForJson(logs);
      }

      const report = {
        reportId,
        summary,
        data: formattedData,
        metadata: {
          generatedAt: new Date(),
          period: { start: params.startDate, end: params.endDate },
          filters: {
            categories: params.categories,
            includeFailures: params.includeFailures,
            format: params.format,
          },
          integrityChecked,
        },
      };

      // Log report generation
      await this.createAuditLog({
        eventType: 'compliance_report_generated',
        category: 'system_access',
        ipAddress: 'system',
        success: true,
        riskLevel: 'medium',
        context: {
          reportId,
          period: { start: params.startDate, end: params.endDate },
          eventCount: logs.length,
        },
        complianceFlags: ['audit_report', 'compliance'],
        tags: ['compliance', 'reporting', 'audit'],
      });

      return report;
    } catch (error) {
      this.logger.error('Failed to generate compliance report', error.stack);
      throw error;
    }
  }

  /**
   * Search audit logs with advanced filtering
   */
  async searchAuditLogs(filters: {
    eventType?: string;
    category?: string;
    userId?: string;
    adminId?: string;
    ipAddress?: string;
    success?: boolean;
    riskLevel?: string;
    startDate?: Date;
    endDate?: Date;
    correlationId?: string;
    complianceFlags?: string[];
    tags?: string[];
    textSearch?: string;
    limit?: number;
    skip?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    logs: SecurityAuditLogDocument[];
    total: number;
    aggregations: {
      byCategory: Record<string, number>;
      byRiskLevel: Record<string, number>;
      bySuccess: Record<string, number>;
      timeline: { date: string; count: number }[];
    };
  }> {
    try {
      // Build query
      const query: any = {};

      if (filters.eventType) query.eventType = new RegExp(filters.eventType, 'i');
      if (filters.category) query.category = filters.category;
      if (filters.userId) query.userId = filters.userId;
      if (filters.adminId) query.adminId = filters.adminId;
      if (filters.ipAddress) query.ipAddress = filters.ipAddress;
      if (filters.success !== undefined) query.success = filters.success;
      if (filters.riskLevel) query.riskLevel = filters.riskLevel;
      if (filters.correlationId) query.correlationId = filters.correlationId;

      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) query.timestamp.$gte = filters.startDate;
        if (filters.endDate) query.timestamp.$lte = filters.endDate;
      }

      if (filters.complianceFlags && filters.complianceFlags.length > 0) {
        query.complianceFlags = { $in: filters.complianceFlags };
      }

      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      if (filters.textSearch) {
        query.$text = { $search: filters.textSearch };
      }

      // Execute search
      const total = await this.securityAuditLogModel.countDocuments(query);
      
      let sortQuery: any = { timestamp: -1 };
      if (filters.sortBy) {
        sortQuery = { [filters.sortBy]: filters.sortOrder === 'asc' ? 1 : -1 };
      }

      const logs = await this.securityAuditLogModel
        .find(query)
        .sort(sortQuery)
        .limit(filters.limit || 50)
        .skip(filters.skip || 0)
        .exec();

      // Generate aggregations
      const aggregations = await this.generateSearchAggregations(query);

      return {
        logs,
        total,
        aggregations,
      };
    } catch (error) {
      this.logger.error('Failed to search audit logs', error.stack);
      throw error;
    }
  }

  /**
   * Clean up old audit logs based on retention policies
   */
  async cleanupOldAuditLogs(): Promise<{
    deletedCount: number;
    byCategory: Record<string, number>;
  }> {
    try {
      const deletionResults: Record<string, number> = {};
      let totalDeleted = 0;

      for (const [category, retentionMs] of this.retentionPeriods.entries()) {
        const cutoffDate = new Date(Date.now() - retentionMs);
        
        const result = await this.securityAuditLogModel.deleteMany({
          category,
          timestamp: { $lt: cutoffDate },
        });

        deletionResults[category] = result.deletedCount;
        totalDeleted += result.deletedCount;
      }

      if (totalDeleted > 0) {
        this.logger.log(`Cleaned up ${totalDeleted} old audit logs`, deletionResults);

        // Log the cleanup activity
        await this.createAuditLog({
          eventType: 'audit_log_cleanup',
          category: 'system_access',
          ipAddress: 'system',
          success: true,
          riskLevel: 'low',
          context: {
            deletedCount: totalDeleted,
            byCategory: deletionResults,
          },
          complianceFlags: ['data_retention', 'cleanup'],
          tags: ['cleanup', 'retention', 'audit'],
        });
      }

      return {
        deletedCount: totalDeleted,
        byCategory: deletionResults,
      };
    } catch (error) {
      this.logger.error('Failed to cleanup old audit logs', error.stack);
      throw error;
    }
  }

  /**
   * Export audit logs for external compliance systems
   */
  async exportAuditLogs(params: {
    startDate: Date;
    endDate: Date;
    categories?: string[];
    format: 'json' | 'csv' | 'xml';
    includeIntegrityProof?: boolean;
  }): Promise<{
    exportId: string;
    data: string;
    integrityProof?: string;
    metadata: {
      recordCount: number;
      exportedAt: Date;
      format: string;
    };
  }> {
    try {
      const exportId = this.generateExportId();
      
      // Build query
      const query: any = {
        timestamp: {
          $gte: params.startDate,
          $lte: params.endDate,
        },
      };

      if (params.categories && params.categories.length > 0) {
        query.category = { $in: params.categories };
      }

      // Get audit logs
      const logs = await this.securityAuditLogModel
        .find(query)
        .sort({ timestamp: 1 })
        .lean();

      // Format data
      let formattedData: string;
      switch (params.format) {
        case 'csv':
          formattedData = this.exportToCsv(logs);
          break;
        case 'xml':
          formattedData = this.exportToXml(logs);
          break;
        default:
          formattedData = JSON.stringify(logs, null, 2);
      }

      // Generate integrity proof if requested
      let integrityProof: string | undefined;
      if (params.includeIntegrityProof) {
        integrityProof = this.generateIntegrityProof(logs);
      }

      // Log export activity
      await this.createAuditLog({
        eventType: 'audit_log_export',
        category: 'data_access',
        ipAddress: 'system',
        success: true,
        riskLevel: 'medium',
        context: {
          exportId,
          recordCount: logs.length,
          period: { start: params.startDate, end: params.endDate },
          format: params.format,
        },
        complianceFlags: ['data_export', 'compliance'],
        tags: ['export', 'compliance', 'audit'],
      });

      return {
        exportId,
        data: formattedData,
        integrityProof,
        metadata: {
          recordCount: logs.length,
          exportedAt: new Date(),
          format: params.format,
        },
      };
    } catch (error) {
      this.logger.error('Failed to export audit logs', error.stack);
      throw error;
    }
  }

  // Private helper methods

  private createIntegrityHash(data: any): string {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return this.encryptionService.createDataFingerprint(dataString);
  }

  private generateCorrelationId(): string {
    return `audit_${Date.now()}_${this.encryptionService.generateSecureToken(8)}`;
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${this.encryptionService.generateSecureToken(8)}`;
  }

  private generateExportId(): string {
    return `export_${Date.now()}_${this.encryptionService.generateSecureToken(8)}`;
  }

  private getRetentionPolicy(category: string): string {
    const retentionMs = this.retentionPeriods.get(category) || (365 * 24 * 60 * 60 * 1000);
    const retentionYears = Math.ceil(retentionMs / (365 * 24 * 60 * 60 * 1000));
    return `${retentionYears}_years`;
  }

  private generateComplianceFlags(auditData: any): string[] {
    const flags = auditData.complianceFlags || [];
    
    // Add automatic compliance flags based on content
    if (auditData.category === 'data_access' || auditData.category === 'data_modification') {
      flags.push('gdpr', 'data_protection');
    }
    
    if (auditData.category === 'authentication' || auditData.category === 'authorization') {
      flags.push('access_control', 'identity_management');
    }
    
    if (auditData.riskLevel === 'critical' || auditData.riskLevel === 'high') {
      flags.push('security_incident', 'high_risk');
    }

    if (!auditData.success) {
      flags.push('failure_event', 'security_concern');
    }

    return [...new Set(flags as string[])]; // Remove duplicates
  }

  private groupByField(logs: any[], field: string): Record<string, number> {
    return logs.reduce((acc, log) => {
      const key = log[field] || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  private formatForJson(logs: any[]): any[] {
    return logs.map(log => ({
      id: log._id,
      eventType: log.eventType,
      category: log.category,
      timestamp: log.timestamp,
      success: log.success,
      riskLevel: log.riskLevel,
      userId: log.userId,
      adminId: log.adminId,
      ipAddress: log.ipAddress,
      resource: log.resource,
      action: log.action,
      correlationId: log.correlationId,
      complianceFlags: log.complianceFlags,
      tags: log.tags,
    }));
  }

  private formatForCsv(logs: any[]): any[] {
    return logs.map(log => ({
      timestamp: log.timestamp.toISOString(),
      eventType: log.eventType,
      category: log.category,
      success: log.success,
      riskLevel: log.riskLevel,
      ipAddress: log.ipAddress,
      userId: log.userId || '',
      adminId: log.adminId || '',
      resource: log.resource || '',
      action: log.action || '',
      correlationId: log.correlationId || '',
    }));
  }

  private formatForPdf(logs: any[]): any[] {
    // Simplified format for PDF generation
    return this.formatForJson(logs);
  }

  private async verifyBatchIntegrity(logs: any[]): Promise<boolean> {
    try {
      const sampleSize = Math.min(10, logs.length);
      const sample = logs.slice(0, sampleSize);
      
      for (const log of sample) {
        const verification = await this.verifyAuditLogIntegrity(log._id.toString());
        if (verification.tampered) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      this.logger.error('Batch integrity verification failed', error.stack);
      return false;
    }
  }

  private async generateSearchAggregations(query: any): Promise<{
    byCategory: Record<string, number>;
    byRiskLevel: Record<string, number>;
    bySuccess: Record<string, number>;
    timeline: { date: string; count: number }[];
  }> {
    const [categoryAgg, riskLevelAgg, successAgg, timelineAgg] = await Promise.all([
      this.securityAuditLogModel.aggregate([
        { $match: query },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      this.securityAuditLogModel.aggregate([
        { $match: query },
        { $group: { _id: '$riskLevel', count: { $sum: 1 } } },
      ]),
      this.securityAuditLogModel.aggregate([
        { $match: query },
        { $group: { _id: '$success', count: { $sum: 1 } } },
      ]),
      this.securityAuditLogModel.aggregate([
        { $match: query },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return {
      byCategory: Object.fromEntries(categoryAgg.map(item => [item._id, item.count])),
      byRiskLevel: Object.fromEntries(riskLevelAgg.map(item => [item._id, item.count])),
      bySuccess: Object.fromEntries(successAgg.map(item => [item._id ? 'success' : 'failure', item.count])),
      timeline: timelineAgg.map(item => ({ date: item._id, count: item.count })),
    };
  }

  private exportToCsv(logs: any[]): string {
    const headers = ['timestamp', 'eventType', 'category', 'success', 'riskLevel', 'ipAddress', 'userId', 'resource', 'action'];
    const csvRows = [headers.join(',')];
    
    logs.forEach(log => {
      const row = headers.map(header => {
        const value = log[header] || '';
        return `"${value.toString().replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  }

  private exportToXml(logs: any[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<auditLogs>\n';
    
    logs.forEach(log => {
      xml += '  <auditLog>\n';
      xml += `    <timestamp>${log.timestamp.toISOString()}</timestamp>\n`;
      xml += `    <eventType>${this.escapeXml(log.eventType)}</eventType>\n`;
      xml += `    <category>${this.escapeXml(log.category)}</category>\n`;
      xml += `    <success>${log.success}</success>\n`;
      xml += `    <riskLevel>${this.escapeXml(log.riskLevel)}</riskLevel>\n`;
      xml += `    <ipAddress>${this.escapeXml(log.ipAddress)}</ipAddress>\n`;
      if (log.userId) xml += `    <userId>${this.escapeXml(log.userId.toString())}</userId>\n`;
      if (log.resource) xml += `    <resource>${this.escapeXml(log.resource)}</resource>\n`;
      if (log.action) xml += `    <action>${this.escapeXml(log.action)}</action>\n`;
      xml += '  </auditLog>\n';
    });
    
    xml += '</auditLogs>';
    return xml;
  }

  private escapeXml(str: string): string {
    return str.replace(/[<>&'"]/g, (match) => {
      switch (match) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case "'": return '&apos;';
        case '"': return '&quot;';
        default: return match;
      }
    });
  }

  private generateIntegrityProof(logs: any[]): string {
    const concatenated = logs.map(log => log.integrity).join('');
    return this.encryptionService.createDataFingerprint(concatenated);
  }
}
