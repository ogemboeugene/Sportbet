import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { SecurityIncident, SecurityIncidentDocument } from '../../database/schemas/security-incident.schema';
import { SecurityThreat, SecurityThreatDocument } from '../../database/schemas/security-threat.schema';
import { SecurityEvent, SecurityEventDocument } from '../../database/schemas/security-event.schema';

@Injectable()
export class IncidentResponseService {
  private readonly logger = new Logger(IncidentResponseService.name);
  private alertWebhooks: string[] = [];
  private autoContainmentEnabled: boolean;

  constructor(
    @InjectModel(SecurityIncident.name) private securityIncidentModel: Model<SecurityIncidentDocument>,
    @InjectModel(SecurityThreat.name) private securityThreatModel: Model<SecurityThreatDocument>,
    @InjectModel(SecurityEvent.name) private securityEventModel: Model<SecurityEventDocument>,
    private configService: ConfigService,
  ) {
    this.alertWebhooks = this.configService.get<string>('SECURITY_ALERT_WEBHOOKS', '').split(',').filter(Boolean);
    this.autoContainmentEnabled = this.configService.get<boolean>('AUTO_CONTAINMENT_ENABLED', true);
  }

  /**
   * Create a security incident from a threat
   */
  async createIncidentFromThreat(threat: SecurityThreatDocument): Promise<SecurityIncidentDocument> {
    try {
      const incident = new this.securityIncidentModel({
        title: `${threat.type.toUpperCase()}: ${threat.severity} severity threat detected`,
        description: this.generateIncidentDescription(threat),
        type: this.mapThreatTypeToIncidentType(threat.type),
        severity: threat.severity,
        status: 'new',
        priority: this.calculatePriority(threat.severity, threat.type),
        affectedUsers: threat.targetUserId ? [threat.targetUserId] : [],
        affectedSystems: threat.targetResource ? [threat.targetResource] : [],
        affectedData: [],
        timeline: {
          detected: threat.firstDetected,
        },
        responseActions: [],
        preventiveMeasures: [],
        evidence: [{
          type: 'threat_detection',
          location: `threat_id:${threat._id}`,
          description: 'Automatically generated from threat detection',
          collectedBy: null, // System generated
          collectedAt: new Date(),
        }],
        relatedThreats: [threat._id],
        relatedEvents: [],
        tags: ['auto_generated', threat.type, threat.severity],
        notes: [],
      });

      const savedIncident = await incident.save();

      // Update threat with incident reference
      await this.securityThreatModel.updateOne(
        { _id: threat._id },
        { 
          $push: { 
            notes: `Incident created: ${savedIncident._id}`,
            mitigationActions: 'incident_created',
          }
        }
      );

      // Trigger automated response
      await this.triggerAutomatedResponse(savedIncident, threat);

      // Send notifications
      await this.sendIncidentNotifications(savedIncident);

      this.logger.error(`Security incident created: ${savedIncident.title}`, {
        incidentId: savedIncident._id,
        threatId: threat._id,
        severity: threat.severity,
        type: threat.type,
      });

      return savedIncident;
    } catch (error) {
      this.logger.error('Failed to create incident from threat', error.stack);
      throw error;
    }
  }

  /**
   * Create a manual security incident
   */
  async createIncident(incidentData: {
    title: string;
    description: string;
    type: 'data_breach' | 'unauthorized_access' | 'system_compromise' | 'malware' | 'phishing' | 'ddos' | 'insider_threat' | 'other';
    severity: 'low' | 'medium' | 'high' | 'critical';
    reportedBy?: string;
    affectedUsers?: string[];
    affectedSystems?: string[];
    affectedData?: string[];
    evidence?: any[];
    tags?: string[];
  }): Promise<SecurityIncidentDocument> {
    try {
      const incident = new this.securityIncidentModel({
        ...incidentData,
        status: 'new',
        priority: this.calculatePriority(incidentData.severity, incidentData.type),
        timeline: {
          detected: new Date(),
          reported: new Date(),
        },
        responseActions: [],
        preventiveMeasures: [],
        relatedThreats: [],
        relatedEvents: [],
        notes: [],
        affectedUsers: incidentData.affectedUsers || [],
        affectedSystems: incidentData.affectedSystems || [],
        affectedData: incidentData.affectedData || [],
        evidence: incidentData.evidence || [],
        tags: incidentData.tags || [],
      });

      const savedIncident = await incident.save();

      // Trigger automated response for critical incidents
      if (incidentData.severity === 'critical') {
        await this.triggerAutomatedResponse(savedIncident);
      }

      await this.sendIncidentNotifications(savedIncident);

      return savedIncident;
    } catch (error) {
      this.logger.error('Failed to create manual incident', error.stack);
      throw error;
    }
  }

  /**
   * Update incident status and timeline
   */
  async updateIncidentStatus(
    incidentId: string,
    status: 'new' | 'investigating' | 'contained' | 'resolved' | 'closed',
    updatedBy: string,
    notes?: string
  ): Promise<SecurityIncidentDocument> {
    try {
      const updateData: any = { status };
      const timestamp = new Date();

      // Update timeline based on status
      switch (status) {
        case 'investigating':
          updateData['timeline.investigating'] = timestamp;
          break;
        case 'contained':
          updateData['timeline.contained'] = timestamp;
          break;
        case 'resolved':
          updateData['timeline.resolved'] = timestamp;
          break;
        case 'closed':
          updateData['timeline.closed'] = timestamp;
          break;
      }

      // Add response action
      const responseAction = {
        action: `Status changed to ${status}`,
        timestamp,
        performedBy: updatedBy,
        result: notes || `Incident status updated to ${status}`,
      };

      const incident = await this.securityIncidentModel.findByIdAndUpdate(
        incidentId,
        {
          ...updateData,
          $push: { 
            responseActions: responseAction,
            ...(notes && { notes: { content: notes, author: updatedBy, timestamp } }),
          },
        },
        { new: true }
      );

      if (!incident) {
        throw new Error('Incident not found');
      }

      this.logger.log(`Incident ${incidentId} status updated to ${status}`, {
        incidentId,
        status,
        updatedBy,
      });

      return incident;
    } catch (error) {
      this.logger.error('Failed to update incident status', error.stack);
      throw error;
    }
  }

  /**
   * Add response action to incident
   */
  async addResponseAction(
    incidentId: string,
    action: string,
    performedBy: string,
    result?: string
  ): Promise<SecurityIncidentDocument> {
    try {
      const responseAction = {
        action,
        timestamp: new Date(),
        performedBy,
        result,
      };

      const incident = await this.securityIncidentModel.findByIdAndUpdate(
        incidentId,
        { $push: { responseActions: responseAction } },
        { new: true }
      );

      if (!incident) {
        throw new Error('Incident not found');
      }

      return incident;
    } catch (error) {
      this.logger.error('Failed to add response action', error.stack);
      throw error;
    }
  }

  /**
   * Trigger automated response based on incident severity and type
   */
  private async triggerAutomatedResponse(
    incident: SecurityIncidentDocument,
    threat?: SecurityThreatDocument
  ): Promise<void> {
    if (!this.autoContainmentEnabled) {
      return;
    }

    try {
      const actions: string[] = [];

      // Critical incidents get immediate containment
      if (incident.severity === 'critical') {
        actions.push('immediate_containment');
        
        // Block suspicious IPs if available
        if (threat?.sourceIp) {
          actions.push(`block_ip:${threat.sourceIp}`);
          await this.blockSuspiciousIp(threat.sourceIp, incident._id.toString());
        }

        // Lock affected user accounts
        if (incident.affectedUsers.length > 0) {
          for (const userId of incident.affectedUsers) {
            actions.push(`lock_user:${userId}`);
            await this.lockUserAccount(userId.toString(), incident._id.toString());
          }
        }

        // Disable affected systems
        if (incident.affectedSystems.length > 0) {
          for (const system of incident.affectedSystems) {
            actions.push(`disable_system:${system}`);
            await this.disableSystemAccess(system, incident._id.toString());
          }
        }
      }

      // High severity incidents get enhanced monitoring
      if (incident.severity === 'high' || incident.severity === 'critical') {
        actions.push('enhance_monitoring');
        await this.enhanceMonitoring(incident);
      }

      // DDoS specific responses
      if (incident.type === 'ddos') {
        actions.push('activate_ddos_protection');
        await this.activateDDoSProtection(threat?.sourceIp);
      }

      // Data breach specific responses
      if (incident.type === 'data_breach') {
        actions.push('initiate_breach_protocol');
        await this.initiateDataBreachProtocol(incident);
      }

      // Log all automated actions
      for (const action of actions) {
        await this.addResponseAction(
          incident._id.toString(),
          `Automated: ${action}`,
          'system',
          'Automated response executed'
        );
      }

      this.logger.log(`Automated response triggered for incident ${incident._id}`, {
        incidentId: incident._id,
        severity: incident.severity,
        type: incident.type,
        actions,
      });
    } catch (error) {
      this.logger.error('Failed to trigger automated response', error.stack);
    }
  }

  /**
   * Block suspicious IP address
   */
  private async blockSuspiciousIp(ipAddress: string, incidentId: string): Promise<void> {
    // In a real implementation, this would integrate with firewall/CDN
    this.logger.warn(`AUTO-CONTAINMENT: Blocking IP ${ipAddress}`, { incidentId });
    
    // Create security event for the IP block
    await this.securityEventModel.create({
      type: 'ip_blocked',
      severity: 'high',
      source: 'incident_response',
      ipAddress,
      details: {
        reason: 'automated_containment',
        incidentId,
        blockTime: new Date(),
      },
      metadata: {
        automated: true,
        containmentAction: true,
      },
      tags: ['auto_containment', 'ip_block'],
    });
  }

  /**
   * Lock user account
   */
  private async lockUserAccount(userId: string, incidentId: string): Promise<void> {
    // In a real implementation, this would update the user's account status
    this.logger.warn(`AUTO-CONTAINMENT: Locking user account ${userId}`, { incidentId });
    
    // Create security event for the account lock
    await this.securityEventModel.create({
      type: 'account_locked',
      severity: 'high',
      source: 'incident_response',
      userId,
      details: {
        reason: 'automated_containment',
        incidentId,
        lockTime: new Date(),
      },
      metadata: {
        automated: true,
        containmentAction: true,
      },
      tags: ['auto_containment', 'account_lock'],
    });
  }

  /**
   * Disable system access
   */
  private async disableSystemAccess(system: string, incidentId: string): Promise<void> {
    this.logger.warn(`AUTO-CONTAINMENT: Disabling system access ${system}`, { incidentId });
    
    // Create security event for the system disable
    await this.securityEventModel.create({
      type: 'system_disabled',
      severity: 'critical',
      source: 'incident_response',
      details: {
        system,
        reason: 'automated_containment',
        incidentId,
        disableTime: new Date(),
      },
      metadata: {
        automated: true,
        containmentAction: true,
      },
      tags: ['auto_containment', 'system_disable'],
    });
  }

  /**
   * Enhance monitoring for incident
   */
  private async enhanceMonitoring(incident: SecurityIncidentDocument): Promise<void> {
    this.logger.log(`Enhancing monitoring for incident ${incident._id}`);
    
    // This would typically increase log levels, add specific monitoring rules, etc.
    await this.securityEventModel.create({
      type: 'monitoring_enhanced',
      severity: 'medium',
      source: 'incident_response',
      details: {
        incidentId: incident._id,
        enhancementType: 'automated',
        startTime: new Date(),
      },
      metadata: {
        automated: true,
        monitoringAction: true,
      },
      tags: ['enhanced_monitoring', 'incident_response'],
    });
  }

  /**
   * Activate DDoS protection
   */
  private async activateDDoSProtection(sourceIp?: string): Promise<void> {
    this.logger.warn('Activating DDoS protection measures');
    
    // This would typically involve CDN/firewall configuration
    await this.securityEventModel.create({
      type: 'ddos_protection_activated',
      severity: 'high',
      source: 'incident_response',
      ipAddress: sourceIp,
      details: {
        activationType: 'automated',
        sourceIp,
        activationTime: new Date(),
      },
      metadata: {
        automated: true,
        ddosProtection: true,
      },
      tags: ['ddos_protection', 'incident_response'],
    });
  }

  /**
   * Initiate data breach protocol
   */
  private async initiateDataBreachProtocol(incident: SecurityIncidentDocument): Promise<void> {
    this.logger.error('Initiating data breach protocol');
    
    // This would typically involve legal team notification, regulatory reporting, etc.
    await this.securityEventModel.create({
      type: 'breach_protocol_initiated',
      severity: 'critical',
      source: 'incident_response',
      details: {
        incidentId: incident._id,
        protocolType: 'automated',
        initiationTime: new Date(),
        affectedUsers: incident.affectedUsers.length,
        affectedData: incident.affectedData,
      },
      metadata: {
        automated: true,
        breachProtocol: true,
      },
      tags: ['data_breach', 'incident_response', 'legal_action_required'],
    });
  }

  /**
   * Send incident notifications
   */
  private async sendIncidentNotifications(incident: SecurityIncidentDocument): Promise<void> {
    try {
      const notification = {
        incidentId: incident._id,
        title: incident.title,
        severity: incident.severity,
        type: incident.type,
        status: incident.status,
        detectedAt: incident.timeline.detected,
        affectedUsers: incident.affectedUsers.length,
        affectedSystems: incident.affectedSystems.length,
      };

      // Send to configured webhooks
      for (const webhook of this.alertWebhooks) {
        try {
          // In a real implementation, this would make HTTP requests to webhook URLs
          this.logger.log(`Sending incident notification to ${webhook}`, notification);
        } catch (error) {
          this.logger.error(`Failed to send notification to ${webhook}`, error.stack);
        }
      }

      // Critical incidents get additional notifications
      if (incident.severity === 'critical') {
        await this.sendCriticalIncidentNotifications(incident);
      }
    } catch (error) {
      this.logger.error('Failed to send incident notifications', error.stack);
    }
  }

  /**
   * Send critical incident notifications
   */
  private async sendCriticalIncidentNotifications(incident: SecurityIncidentDocument): Promise<void> {
    this.logger.error(`CRITICAL INCIDENT: ${incident.title}`, {
      incidentId: incident._id,
      type: incident.type,
      affectedUsers: incident.affectedUsers.length,
      affectedSystems: incident.affectedSystems.length,
      affectedData: incident.affectedData.length,
    });

    // In a real implementation, this would:
    // - Send SMS/email to security team
    // - Create tickets in external systems
    // - Notify management
    // - Update status pages
  }

  /**
   * Generate incident description from threat
   */
  private generateIncidentDescription(threat: SecurityThreatDocument): string {
    let description = `Security threat of type "${threat.type}" detected with ${threat.severity} severity. `;
    
    if (threat.sourceIp) {
      description += `Source IP: ${threat.sourceIp}. `;
    }
    
    if (threat.targetUserId) {
      description += `Target user: ${threat.targetUserId}. `;
    }
    
    if (threat.targetResource) {
      description += `Target resource: ${threat.targetResource}. `;
    }
    
    if (threat.estimatedImpact) {
      description += `Estimated impact: ${threat.estimatedImpact}.`;
    }

    return description;
  }

  /**
   * Map threat type to incident type
   */
  private mapThreatTypeToIncidentType(threatType: string): string {
    const mapping = {
      'brute_force': 'unauthorized_access',
      'ddos': 'ddos',
      'sql_injection': 'system_compromise',
      'xss': 'system_compromise',
      'csrf': 'system_compromise',
      'malware': 'malware',
      'suspicious_activity': 'unauthorized_access',
      'data_breach': 'data_breach',
      'unauthorized_access': 'unauthorized_access',
    };

    return mapping[threatType] || 'other';
  }

  /**
   * Calculate incident priority
   */
  private calculatePriority(severity: string, type: string): 'low' | 'medium' | 'high' | 'urgent' {
    if (severity === 'critical') return 'urgent';
    if (severity === 'high') return 'high';
    if (severity === 'medium' && ['data_breach', 'unauthorized_access'].includes(type)) return 'high';
    if (severity === 'medium') return 'medium';
    return 'low';
  }

  /**
   * Get incident response metrics
   */
  async getResponseMetrics(timeframe: 'day' | 'week' | 'month' = 'day'): Promise<{
    totalIncidents: number;
    byStatus: Record<string, number>;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    averageResponseTime: number;
    averageResolutionTime: number;
    criticalIncidents: number;
    autoContainmentActions: number;
  }> {
    const timeframeDays = { day: 1, week: 7, month: 30 }[timeframe];
    const startDate = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000);

    const [incidents, containmentActions] = await Promise.all([
      this.securityIncidentModel.find({
        'timeline.detected': { $gte: startDate },
      }),
      this.securityEventModel.countDocuments({
        type: { $in: ['ip_blocked', 'account_locked', 'system_disabled'] },
        detectedAt: { $gte: startDate },
      }),
    ]);

    const metrics = {
      totalIncidents: incidents.length,
      byStatus: {},
      bySeverity: {},
      byType: {},
      averageResponseTime: 0,
      averageResolutionTime: 0,
      criticalIncidents: 0,
      autoContainmentActions: containmentActions,
    };

    let totalResponseTime = 0;
    let totalResolutionTime = 0;
    let incidentsWithResponse = 0;
    let incidentsResolved = 0;

    incidents.forEach(incident => {
      // Count by status
      metrics.byStatus[incident.status] = (metrics.byStatus[incident.status] || 0) + 1;
      
      // Count by severity
      metrics.bySeverity[incident.severity] = (metrics.bySeverity[incident.severity] || 0) + 1;
      
      // Count by type
      metrics.byType[incident.type] = (metrics.byType[incident.type] || 0) + 1;
      
      // Count critical incidents
      if (incident.severity === 'critical') {
        metrics.criticalIncidents++;
      }

      // Calculate response time (time to containment)
      if (incident.timeline.contained) {
        const responseTime = incident.timeline.contained.getTime() - incident.timeline.detected.getTime();
        totalResponseTime += responseTime;
        incidentsWithResponse++;
      }

      // Calculate resolution time
      if (incident.timeline.resolved) {
        const resolutionTime = incident.timeline.resolved.getTime() - incident.timeline.detected.getTime();
        totalResolutionTime += resolutionTime;
        incidentsResolved++;
      }
    });

    metrics.averageResponseTime = incidentsWithResponse > 0 ? totalResponseTime / incidentsWithResponse : 0;
    metrics.averageResolutionTime = incidentsResolved > 0 ? totalResolutionTime / incidentsResolved : 0;

    return metrics;
  }
}
