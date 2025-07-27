import { Injectable, Logger } from '@nestjs/common';

export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'unavailable';
  lastCheck: Date;
  responseTime?: number;
}

export interface DegradationConfig {
  maxResponseTime: number;
  maxErrorRate: number;
  maxConcurrentUsers: number;
  fallbackEnabled: boolean;
}

@Injectable()
export class GracefulDegradationService {
  private readonly logger = new Logger(GracefulDegradationService.name);
  private serviceStatuses = new Map<string, ServiceStatus>();
  private readonly config: DegradationConfig = {
    maxResponseTime: 3000, // 3 seconds
    maxErrorRate: 10, // 10%
    maxConcurrentUsers: 1000,
    fallbackEnabled: true,
  };

  private currentLoad = {
    concurrent_users: 0,
    response_time: 0,
    error_rate: 0,
  };

  // Update system load metrics
  updateSystemLoad(metrics: Partial<typeof this.currentLoad>) {
    this.currentLoad = { ...this.currentLoad, ...metrics };
    this.evaluateSystemHealth();
  }

  // Check if a service should be degraded
  shouldDegrade(serviceName: string): boolean {
    const status = this.serviceStatuses.get(serviceName);
    return status?.status === 'degraded' || this.isSystemOverloaded();
  }

  // Check if system is overloaded
  isSystemOverloaded(): boolean {
    return (
      this.currentLoad.concurrent_users > this.config.maxConcurrentUsers ||
      this.currentLoad.response_time > this.config.maxResponseTime ||
      this.currentLoad.error_rate > this.config.maxErrorRate
    );
  }

  // Get degraded response for betting
  getBettingDegradedResponse() {
    if (!this.config.fallbackEnabled) {
      throw new Error('Service temporarily unavailable');
    }

    return {
      message: 'High traffic detected. Some features may be limited.',
      degraded: true,
      available_features: [
        'view_odds',
        'view_balance',
        'simple_bets_only'
      ],
      disabled_features: [
        'live_betting',
        'bet_builder',
        'cash_out'
      ],
      retry_after: 60, // seconds
    };
  }

  // Get degraded odds response
  getOddsDegradedResponse() {
    return {
      message: 'Showing cached odds due to high load',
      degraded: true,
      cache_age: 300, // 5 minutes
      update_frequency: 'reduced',
      live_updates: false,
    };
  }

  // Get degraded user profile response
  getUserProfileDegradedResponse() {
    return {
      message: 'Limited profile features available',
      degraded: true,
      available_sections: ['basic_info', 'balance', 'active_bets'],
      disabled_sections: ['bet_history', 'statistics', 'preferences'],
    };
  }

  // Register service status
  updateServiceStatus(serviceName: string, status: Omit<ServiceStatus, 'name'>) {
    this.serviceStatuses.set(serviceName, {
      name: serviceName,
      ...status,
    });

    if (status.status === 'unavailable') {
      this.logger.warn(`Service ${serviceName} is unavailable`);
    } else if (status.status === 'degraded') {
      this.logger.warn(`Service ${serviceName} is degraded`);
    }
  }

  // Get all service statuses
  getServiceStatuses(): ServiceStatus[] {
    return Array.from(this.serviceStatuses.values());
  }

  // Get system status
  getSystemStatus() {
    const isOverloaded = this.isSystemOverloaded();
    const degradedServices = Array.from(this.serviceStatuses.values())
      .filter(s => s.status !== 'healthy').length;

    return {
      status: isOverloaded || degradedServices > 0 ? 'degraded' : 'healthy',
      overloaded: isOverloaded,
      degraded_services_count: degradedServices,
      current_load: this.currentLoad,
      config: this.config,
      timestamp: new Date(),
    };
  }

  // Enable/disable fallback mode
  setFallbackMode(enabled: boolean) {
    this.config.fallbackEnabled = enabled;
    this.logger.log(`Fallback mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Update degradation config
  updateConfig(newConfig: Partial<DegradationConfig>) {
    Object.assign(this.config, newConfig);
    this.logger.log('Degradation config updated', newConfig);
  }

  // Private methods
  private evaluateSystemHealth() {
    const wasOverloaded = this.isSystemOverloaded();
    
    if (wasOverloaded) {
      this.logger.warn('System overload detected', this.currentLoad);
      
      // Auto-enable fallback if not already enabled
      if (!this.config.fallbackEnabled) {
        this.setFallbackMode(true);
      }
    }
  }

  // Get reduced data for mobile/low bandwidth
  getReducedResponse(data: any, isMobile: boolean, isLowBandwidth: boolean) {
    if (!isMobile && !isLowBandwidth) return data;

    // For mobile users, reduce unnecessary data
    if (Array.isArray(data)) {
      // Limit array size for mobile
      const limit = isLowBandwidth ? 10 : isMobile ? 20 : data.length;
      return data.slice(0, limit).map(item => this.reduceObjectSize(item, isMobile, isLowBandwidth));
    }

    return this.reduceObjectSize(data, isMobile, isLowBandwidth);
  }

  private reduceObjectSize(obj: any, isMobile: boolean, isLowBandwidth: boolean): any {
    if (!obj || typeof obj !== 'object') return obj;

    const reduced = { ...obj };

    // Remove heavy fields for low bandwidth
    if (isLowBandwidth) {
      delete reduced.images;
      delete reduced.detailed_stats;
      delete reduced.history;
      delete reduced.metadata;
    }

    // Reduce precision for mobile
    if (isMobile) {
      Object.keys(reduced).forEach(key => {
        if (typeof reduced[key] === 'number' && reduced[key] % 1 !== 0) {
          reduced[key] = parseFloat(reduced[key].toFixed(2));
        }
      });
    }

    return reduced;
  }
}
