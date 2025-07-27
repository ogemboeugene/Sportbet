import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface PerformanceMetric {
  timestamp: Date;
  metric: string;
  value: number;
  tags?: Record<string, string>;
}

export interface SystemHealth {
  timestamp: Date;
  status: 'healthy' | 'warning' | 'critical';
  services: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
    external_apis: 'up' | 'down';
  };
  metrics: {
    cpu_usage: number;
    memory_usage: number;
    response_time: number;
    error_rate: number;
  };
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly performanceMetrics: PerformanceMetric[] = [];
  private readonly healthHistory: SystemHealth[] = [];

  constructor(
    @InjectModel('User') private userModel: Model<any>,
    @InjectModel('Bet') private betModel: Model<any>,
    @InjectModel('Transaction') private transactionModel: Model<any>,
  ) {}

  // Track performance metrics
  trackMetric(metric: string, value: number, tags?: Record<string, string>) {
    const performanceMetric: PerformanceMetric = {
      timestamp: new Date(),
      metric,
      value,
      tags: tags || {},
    };

    this.performanceMetrics.push(performanceMetric);
    
    // Keep only last 1000 metrics in memory
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics.shift();
    }

    // Log critical metrics
    if (this.isCriticalMetric(metric, value)) {
      this.logger.warn(`Critical metric detected: ${metric} = ${value}`, { tags });
    }
  }

  // Get system health status
  async getSystemHealth(): Promise<SystemHealth> {
    const now = new Date();
    
    try {
      // Check database connectivity
      const dbStatus = await this.checkDatabaseHealth();
      
      // Check Redis connectivity (if available)
      const redisStatus = 'up'; // Will implement Redis check later
      
      // Check external APIs
      const externalApiStatus = 'up'; // Will implement API checks
      
      // Calculate system metrics
      const metrics = await this.calculateSystemMetrics();
      
      const health: SystemHealth = {
        timestamp: now,
        status: this.determineOverallStatus(metrics),
        services: {
          database: dbStatus,
          redis: redisStatus,
          external_apis: externalApiStatus,
        },
        metrics,
      };

      this.healthHistory.push(health);
      
      // Keep only last 100 health checks
      if (this.healthHistory.length > 100) {
        this.healthHistory.shift();
      }

      return health;
    } catch (error) {
      this.logger.error('Failed to get system health', error);
      return {
        timestamp: now,
        status: 'critical',
        services: {
          database: 'down',
          redis: 'down',
          external_apis: 'down',
        },
        metrics: {
          cpu_usage: 0,
          memory_usage: 0,
          response_time: 0,
          error_rate: 100,
        },
      };
    }
  }

  // Get performance analytics
  getPerformanceAnalytics() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const recentMetrics = this.performanceMetrics.filter(
      m => m.timestamp >= oneHourAgo
    );

    return {
      totalRequests: recentMetrics.filter(m => m.metric === 'request_count').length,
      averageResponseTime: this.calculateAverage(
        recentMetrics.filter(m => m.metric === 'response_time').map(m => m.value)
      ),
      errorRate: this.calculateErrorRate(recentMetrics),
      topEndpoints: this.getTopEndpoints(recentMetrics),
    };
  }

  // Get user analytics
  async getUserAnalytics() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsersToday,
      activeUsersWeek,
      newUsersToday,
      totalBetsToday,
      totalVolumeToday,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ lastLogin: { $gte: oneDayAgo } }),
      this.userModel.countDocuments({ lastLogin: { $gte: oneWeekAgo } }),
      this.userModel.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      this.betModel.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      this.betModel.aggregate([
        { $match: { createdAt: { $gte: oneDayAgo } } },
        { $group: { _id: null, total: { $sum: '$stake' } } }
      ]).then(result => result[0]?.total || 0),
    ]);

    return {
      totalUsers,
      activeUsersToday,
      activeUsersWeek,
      newUsersToday,
      totalBetsToday,
      totalVolumeToday,
      userGrowthRate: await this.calculateUserGrowthRate(),
    };
  }

  // Health check cron job
  @Cron(CronExpression.EVERY_MINUTE)
  async performHealthCheck() {
    try {
      const health = await this.getSystemHealth();
      
      if (health.status === 'critical') {
        this.logger.error('System health is critical', health);
      } else if (health.status === 'warning') {
        this.logger.warn('System health warning', health);
      }
    } catch (error) {
      this.logger.error('Health check failed', error);
    }
  }

  // Private helper methods
  private async checkDatabaseHealth(): Promise<'up' | 'down'> {
    try {
      await this.userModel.findOne().limit(1).exec();
      return 'up';
    } catch (error) {
      return 'down';
    }
  }

  private async calculateSystemMetrics() {
    const recentMetrics = this.performanceMetrics.filter(
      m => m.timestamp >= new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
    );

    return {
      cpu_usage: this.getLatestMetricValue(recentMetrics, 'cpu_usage') || 0,
      memory_usage: this.getLatestMetricValue(recentMetrics, 'memory_usage') || 0,
      response_time: this.calculateAverage(
        recentMetrics.filter(m => m.metric === 'response_time').map(m => m.value)
      ),
      error_rate: this.calculateErrorRate(recentMetrics),
    };
  }

  private determineOverallStatus(metrics: any): 'healthy' | 'warning' | 'critical' {
    if (metrics.error_rate > 10 || metrics.response_time > 5000) {
      return 'critical';
    }
    if (metrics.error_rate > 5 || metrics.response_time > 2000) {
      return 'warning';
    }
    return 'healthy';
  }

  private isCriticalMetric(metric: string, value: number): boolean {
    const thresholds = {
      response_time: 5000,
      error_rate: 10,
      cpu_usage: 90,
      memory_usage: 90,
    };
    
    return thresholds[metric] && value >= thresholds[metric];
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateErrorRate(metrics: PerformanceMetric[]): number {
    const requests = metrics.filter(m => m.metric === 'request_count');
    const errors = metrics.filter(m => m.metric === 'error_count');
    
    if (requests.length === 0) return 0;
    return (errors.length / requests.length) * 100;
  }

  private getLatestMetricValue(metrics: PerformanceMetric[], metricName: string): number | null {
    const metric = metrics
      .filter(m => m.metric === metricName)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
    
    return metric?.value || null;
  }

  private getTopEndpoints(metrics: PerformanceMetric[]) {
    const endpointCounts = {};
    
    metrics
      .filter(m => m.metric === 'request_count' && m.tags?.endpoint)
      .forEach(m => {
        const endpoint = m.tags.endpoint;
        endpointCounts[endpoint] = (endpointCounts[endpoint] || 0) + 1;
      });

    return Object.entries(endpointCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));
  }

  private async calculateUserGrowthRate(): Promise<number> {
    const now = new Date();
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [thisWeekUsers, lastWeekUsers] = await Promise.all([
      this.userModel.countDocuments({ 
        createdAt: { $gte: thisWeek, $lte: now } 
      }),
      this.userModel.countDocuments({ 
        createdAt: { $gte: lastWeek, $lte: thisWeek } 
      }),
    ]);

    if (lastWeekUsers === 0) return thisWeekUsers > 0 ? 100 : 0;
    return ((thisWeekUsers - lastWeekUsers) / lastWeekUsers) * 100;
  }
}
