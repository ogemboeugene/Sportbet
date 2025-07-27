import { Controller, Get, HttpStatus, Res, Optional } from '@nestjs/common';
import { Response } from 'express';
import { LoadBalancingService } from './load-balancing.service';
import { MonitoringService } from './monitoring.service';
import { GracefulDegradationService } from './graceful-degradation.service';

@Controller('health')
export class HealthController {
  constructor(
    @Optional() private readonly loadBalancingService: LoadBalancingService,
    private readonly monitoringService: MonitoringService,
    @Optional() private readonly gracefulDegradationService: GracefulDegradationService,
  ) {}

  // Simple health check for load balancer
  @Get()
  async healthCheck(@Res() res: Response) {
    try {
      if (this.loadBalancingService) {
        const health = this.loadBalancingService.getHealthStatus();
        
        if (health.status === 'healthy') {
          res.status(HttpStatus.OK).json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
          });
        } else {
          res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            message: 'Service unhealthy',
          });
        }
      } else {
        // Basic health check without load balancing service
        res.status(HttpStatus.OK).json({
          status: 'ok',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        });
      }
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        message: 'Health check failed',
      });
    }
  }

  // Detailed health check
  @Get('detailed')
  async detailedHealthCheck() {
    try {
      const systemHealth = await this.monitoringService.getSystemHealth();
      
      const loadBalancingHealth = this.loadBalancingService 
        ? this.loadBalancingService.getHealthStatus()
        : { status: 'not_available' };
        
      const degradationStatus = this.gracefulDegradationService
        ? this.gracefulDegradationService.getSystemStatus()
        : { status: 'not_available' };

      return {
        status: this.determineOverallHealth([
          loadBalancingHealth.status,
          systemHealth.status,
          degradationStatus.status
        ]),
        timestamp: new Date().toISOString(),
        details: {
          loadBalancing: loadBalancingHealth,
          system: systemHealth,
          degradation: degradationStatus,
        },
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Failed to perform detailed health check',
        message: error.message,
      };
    }
  }

  // Readiness probe (for Kubernetes)
  @Get('ready')
  async readinessProbe(@Res() res: Response) {
    try {
      // Check if application is ready to serve traffic
      const canAcceptConnections = this.loadBalancingService 
        ? this.loadBalancingService.canAcceptConnection()
        : true;
      const systemHealth = await this.monitoringService.getSystemHealth();
      
      const isReady = canAcceptConnections && 
                     systemHealth.services.database === 'up' &&
                     systemHealth.status !== 'critical';

      if (isReady) {
        res.status(HttpStatus.OK).json({
          status: 'ready',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
          status: 'not_ready',
          timestamp: new Date().toISOString(),
          reasons: this.getNotReadyReasons(canAcceptConnections, systemHealth),
        });
      }
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        message: 'Readiness check failed',
      });
    }
  }

  // Liveness probe (for Kubernetes)
  @Get('live')
  async livenessProbe(@Res() res: Response) {
    try {
      // Check if application is running (basic check)
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();
      
      // Application is considered alive if it can respond and isn't completely out of memory
      const isAlive = uptime > 0 && memoryUsage.heapUsed < memoryUsage.heapTotal * 0.95;

      if (isAlive) {
        res.status(HttpStatus.OK).json({
          status: 'alive',
          timestamp: new Date().toISOString(),
          uptime: uptime,
        });
      } else {
        res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
          status: 'dead',
          timestamp: new Date().toISOString(),
          uptime: uptime,
          memoryUsage: memoryUsage,
        });
      }
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        message: 'Liveness check failed',
      });
    }
  }

  // Startup probe (for Kubernetes)
  @Get('startup')
  async startupProbe(@Res() res: Response) {
    try {
      // Check if application has fully started
      const systemHealth = await this.monitoringService.getSystemHealth();
      const hasStarted = systemHealth.services.database === 'up';

      if (hasStarted) {
        res.status(HttpStatus.OK).json({
          status: 'started',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
          status: 'starting',
          timestamp: new Date().toISOString(),
          message: 'Application is still starting up',
        });
      }
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        message: 'Startup check failed',
      });
    }
  }

  // Private helper methods
  private determineOverallHealth(statuses: string[]): 'healthy' | 'degraded' | 'unhealthy' {
    // Filter out 'not_available' statuses
    const validStatuses = statuses.filter(status => status !== 'not_available');
    
    if (validStatuses.includes('critical') || validStatuses.includes('unhealthy')) {
      return 'unhealthy';
    }
    
    if (validStatuses.includes('warning') || validStatuses.includes('degraded')) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  private getNotReadyReasons(canAcceptConnections: boolean, systemHealth: any): string[] {
    const reasons: string[] = [];
    
    if (!canAcceptConnections) {
      reasons.push('Cannot accept new connections (at capacity)');
    }
    
    if (systemHealth.services.database !== 'up') {
      reasons.push('Database is not available');
    }
    
    if (systemHealth.status === 'critical') {
      reasons.push('System health is critical');
    }
    
    return reasons;
  }
}
