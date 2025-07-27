import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  metadata?: Record<string, any>;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals';
  threshold: number;
  enabled: boolean;
  cooldownMinutes: number;
  lastTriggered?: Date;
}

@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name);
  private alerts: Alert[] = [];
  private alertRules: AlertRule[] = [
    {
      id: 'high_error_rate',
      name: 'High Error Rate',
      metric: 'error_rate',
      condition: 'greater_than',
      threshold: 5,
      enabled: true,
      cooldownMinutes: 15,
    },
    {
      id: 'slow_response_time',
      name: 'Slow Response Time',
      metric: 'response_time',
      condition: 'greater_than',
      threshold: 2000,
      enabled: true,
      cooldownMinutes: 10,
    },
    {
      id: 'high_cpu_usage',
      name: 'High CPU Usage',
      metric: 'cpu_usage',
      condition: 'greater_than',
      threshold: 80,
      enabled: true,
      cooldownMinutes: 5,
    },
    {
      id: 'high_memory_usage',
      name: 'High Memory Usage',
      metric: 'memory_usage',
      condition: 'greater_than',
      threshold: 85,
      enabled: true,
      cooldownMinutes: 5,
    },
  ];

  constructor(
    @InjectModel('User') private userModel: Model<any>,
  ) {}

  // Evaluate metrics against alert rules
  evaluateMetrics(metrics: Record<string, number>) {
    this.alertRules.forEach(rule => {
      if (!rule.enabled) return;

      const metricValue = metrics[rule.metric];
      if (metricValue === undefined) return;

      // Check cooldown period
      if (rule.lastTriggered) {
        const cooldownEnd = new Date(rule.lastTriggered.getTime() + rule.cooldownMinutes * 60 * 1000);
        if (new Date() < cooldownEnd) return;
      }

      // Evaluate condition
      const triggered = this.evaluateCondition(metricValue, rule.condition, rule.threshold);
      
      if (triggered) {
        this.triggerAlert(rule, metricValue);
        rule.lastTriggered = new Date();
      }
    });
  }

  // Trigger a new alert
  private triggerAlert(rule: AlertRule, currentValue: number) {
    const alert: Alert = {
      id: `${rule.id}_${Date.now()}`,
      type: this.getAlertType(rule.metric),
      title: rule.name,
      message: `${rule.name}: ${rule.metric} is ${currentValue} (threshold: ${rule.threshold})`,
      timestamp: new Date(),
      resolved: false,
      metadata: {
        rule: rule.id,
        metric: rule.metric,
        value: currentValue,
        threshold: rule.threshold,
      },
    };

    this.alerts.unshift(alert);
    
    // Keep only last 100 alerts in memory
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100);
    }

    // Log the alert
    if (alert.type === 'critical') {
      this.logger.error(`CRITICAL ALERT: ${alert.message}`, alert.metadata);
    } else {
      this.logger.warn(`ALERT: ${alert.message}`, alert.metadata);
    }

    // Send notifications (implement as needed)
    this.sendAlertNotification(alert);
  }

  // Send alert notification
  private async sendAlertNotification(alert: Alert) {
    try {
      // Here you would integrate with your notification system
      // For now, we'll just log it
      this.logger.log(`Sending alert notification: ${alert.title}`);
      
      // You could integrate with:
      // - Email notifications
      // - Slack/Discord webhooks
      // - SMS alerts
      // - Push notifications to admin app
    } catch (error) {
      this.logger.error('Failed to send alert notification', error);
    }
  }

  // Get all alerts
  getAlerts(limit = 50, onlyUnresolved = false): Alert[] {
    let filteredAlerts = this.alerts;
    
    if (onlyUnresolved) {
      filteredAlerts = this.alerts.filter(alert => !alert.resolved);
    }
    
    return filteredAlerts.slice(0, limit);
  }

  // Resolve an alert
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.logger.log(`Alert resolved: ${alert.title}`);
      return true;
    }
    return false;
  }

  // Get alert rules
  getAlertRules(): AlertRule[] {
    return this.alertRules;
  }

  // Update alert rule
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const ruleIndex = this.alertRules.findIndex(r => r.id === ruleId);
    if (ruleIndex !== -1) {
      this.alertRules[ruleIndex] = { ...this.alertRules[ruleIndex], ...updates };
      this.logger.log(`Alert rule updated: ${ruleId}`);
      return true;
    }
    return false;
  }

  // Private helper methods
  private evaluateCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'greater_than':
        return value > threshold;
      case 'less_than':
        return value < threshold;
      case 'equals':
        return value === threshold;
      default:
        return false;
    }
  }

  private getAlertType(metric: string): 'critical' | 'warning' | 'info' {
    const criticalMetrics = ['error_rate', 'response_time'];
    return criticalMetrics.includes(metric) ? 'critical' : 'warning';
  }
}
