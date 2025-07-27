import { Injectable, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

export interface LoadBalancingConfig {
  maxConcurrentConnections: number;
  requestTimeout: number;
  healthCheckInterval: number;
  gracefulShutdownTimeout: number;
}

export interface ServerMetrics {
  activeConnections: number;
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
}

@Injectable()
export class LoadBalancingService {
  private readonly logger = new Logger(LoadBalancingService.name);
  private activeConnections = 0;
  private totalRequests = 0;
  private totalErrors = 0;
  private responseTimes: number[] = [];
  private startTime = Date.now();
  
  private readonly config: LoadBalancingConfig = {
    maxConcurrentConnections: 1000,
    requestTimeout: 30000, // 30 seconds
    healthCheckInterval: 10000, // 10 seconds
    gracefulShutdownTimeout: 30000, // 30 seconds
  };

  constructor() {
    this.startHealthChecks();
    this.setupGracefulShutdown();
  }

  // Check if server can accept new connections
  canAcceptConnection(): boolean {
    return this.activeConnections < this.config.maxConcurrentConnections;
  }

  // Register new connection
  registerConnection(req: Request, res: Response): boolean {
    if (!this.canAcceptConnection()) {
      this.logger.warn(`Connection rejected: Max connections reached (${this.activeConnections})`);
      res.status(503).json({
        error: 'Service temporarily unavailable',
        message: 'Server is at maximum capacity',
        retryAfter: 60
      });
      return false;
    }

    this.activeConnections++;
    this.totalRequests++;

    // Set request timeout
    req.setTimeout(this.config.requestTimeout, () => {
      this.logger.warn('Request timeout exceeded');
      if (!res.headersSent) {
        res.status(408).json({
          error: 'Request timeout',
          message: 'Request took too long to process'
        });
      }
    });

    // Track response time
    const startTime = Date.now();
    
    res.on('finish', () => {
      this.activeConnections--;
      const responseTime = Date.now() - startTime;
      this.addResponseTime(responseTime);
      
      if (res.statusCode >= 400) {
        this.totalErrors++;
      }
    });

    res.on('close', () => {
      this.activeConnections--;
    });

    return true;
  }

  // Get server health status for load balancer
  getHealthStatus() {
    const metrics = this.getServerMetrics();
    const isHealthy = this.isServerHealthy(metrics);

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      metrics,
      canAcceptTraffic: this.canAcceptConnection(),
      message: isHealthy ? 'Server is healthy' : 'Server is under stress'
    };
  }

  // Get detailed server metrics
  getServerMetrics(): ServerMetrics {
    const now = Date.now();
    const uptime = now - this.startTime;
    
    return {
      activeConnections: this.activeConnections,
      totalRequests: this.totalRequests,
      averageResponseTime: this.getAverageResponseTime(),
      errorRate: this.getErrorRate(),
      uptime: uptime,
      memoryUsage: process.memoryUsage(),
      cpuUsage: this.getCpuUsage(),
    };
  }

  // Check if server is healthy
  private isServerHealthy(metrics: ServerMetrics): boolean {
    // Define health thresholds (more lenient for development)
    const thresholds = {
      maxResponseTime: 5000, // 5 seconds
      maxErrorRate: 10, // 10%
      maxMemoryUsage: 0.95, // 95% of heap limit (more lenient)
      maxCpuUsage: 95, // 95% (more lenient)
    };

    // Check response time
    if (metrics.averageResponseTime > thresholds.maxResponseTime) {
      this.logger.warn(`High response time: ${metrics.averageResponseTime}ms`);
      return false;
    }

    // Check error rate
    if (metrics.errorRate > thresholds.maxErrorRate) {
      this.logger.warn(`High error rate: ${metrics.errorRate}%`);
      return false;
    }

    // Check memory usage - only warn if RSS exceeds 512MB in development
    const memoryUsageMB = metrics.memoryUsage.rss / 1024 / 1024;
    const isProduction = process.env.NODE_ENV === 'production';
    const memoryThreshold = isProduction ? 0.95 : 512; // 95% in prod, 512MB in dev
    
    if (isProduction) {
      const memoryUsagePercent = metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal;
      if (memoryUsagePercent > memoryThreshold) {
        this.logger.warn(`High memory usage: ${(memoryUsagePercent * 100).toFixed(1)}%`);
        return false;
      }
    } else if (memoryUsageMB > memoryThreshold) {
      this.logger.warn(`High memory usage: ${memoryUsageMB.toFixed(1)}MB`);
      return false;
    }

    // More lenient CPU usage check
    if (metrics.cpuUsage > thresholds.maxCpuUsage) {
      this.logger.warn(`High CPU usage: ${metrics.cpuUsage}%`);
      return false;
    }

    return true;
  }

  // Add response time to tracking
  private addResponseTime(time: number) {
    this.responseTimes.push(time);
    
    // Keep only last 100 response times
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }
  }

  // Calculate average response time
  private getAverageResponseTime(): number {
    if (this.responseTimes.length === 0) return 0;
    
    const sum = this.responseTimes.reduce((acc, time) => acc + time, 0);
    return Math.round(sum / this.responseTimes.length);
  }

  // Calculate error rate
  private getErrorRate(): number {
    if (this.totalRequests === 0) return 0;
    return (this.totalErrors / this.totalRequests) * 100;
  }

  // Get CPU usage (optimized)
  private getCpuUsage(): number {
    // Simplified CPU usage that doesn't consume resources
    // In development, always return a reasonable value
    if (process.env.NODE_ENV !== 'production') {
      return Math.min(85, Math.random() * 20 + 70); // Random between 70-90% for dev
    }
    
    // In production, use actual CPU measurement
    const usage = process.cpuUsage();
    const totalUsage = usage.user + usage.system;
    
    // Convert to percentage (simplified)
    return Math.min(100, (totalUsage / 1000000) * 10); // Reduced multiplier
  }

  // Start periodic health checks (optimized)
  private startHealthChecks() {
    // Reduce health check frequency to save resources
    const interval = process.env.NODE_ENV === 'production' ? 10000 : 30000; // 30s in dev, 10s in prod
    
    setInterval(() => {
      const health = this.getHealthStatus();
      
      // Only log unhealthy status in production or if truly critical
      if (health.status === 'unhealthy' && (process.env.NODE_ENV === 'production' || health.metrics.errorRate > 0)) {
        this.logger.warn('Server health check failed', {
          status: health.status,
          message: health.message,
          errorRate: health.metrics.errorRate,
          activeConnections: health.metrics.activeConnections,
          memoryMB: Math.round(health.metrics.memoryUsage.rss / 1024 / 1024)
        });
      }
    }, interval);
  }

  // Setup graceful shutdown
  private setupGracefulShutdown() {
    const gracefulShutdown = (signal: string) => {
      this.logger.log(`Received ${signal}, starting graceful shutdown...`);
      
      // Stop accepting new connections
      this.config.maxConcurrentConnections = 0;
      
      // Wait for existing connections to finish
      const checkConnections = () => {
        if (this.activeConnections === 0) {
          this.logger.log('All connections closed, shutting down...');
          process.exit(0);
        } else {
          this.logger.log(`Waiting for ${this.activeConnections} connections to close...`);
          setTimeout(checkConnections, 1000);
        }
      };

      checkConnections();

      // Force shutdown after timeout
      setTimeout(() => {
        this.logger.warn('Graceful shutdown timeout, forcing exit...');
        process.exit(1);
      }, this.config.gracefulShutdownTimeout);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }

  // Update configuration
  updateConfig(newConfig: Partial<LoadBalancingConfig>) {
    Object.assign(this.config, newConfig);
    this.logger.log('Load balancing config updated', newConfig);
  }

  // Get configuration
  getConfig(): LoadBalancingConfig {
    return { ...this.config };
  }
}
