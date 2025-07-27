import { Controller, Get, UseGuards, Post, Body, Param, Optional } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { AlertingService } from './alerting.service';
import { GracefulDegradationService } from './graceful-degradation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';

@Controller('monitoring')
@UseGuards(JwtAuthGuard, AdminGuard)
export class MonitoringController {
  constructor(
    private readonly monitoringService: MonitoringService,
    @Optional() private readonly alertingService: AlertingService,
    @Optional() private readonly gracefulDegradationService: GracefulDegradationService,
  ) {}

  @Get('health')
  async getSystemHealth() {
    return this.monitoringService.getSystemHealth();
  }

  @Get('performance')
  getPerformanceAnalytics() {
    return this.monitoringService.getPerformanceAnalytics();
  }

  @Get('users')
  async getUserAnalytics() {
    return this.monitoringService.getUserAnalytics();
  }

  @Get('dashboard')
  async getDashboardData() {
    const [health, performance, users] = await Promise.all([
      this.monitoringService.getSystemHealth(),
      this.monitoringService.getPerformanceAnalytics(),
      this.monitoringService.getUserAnalytics(),
    ]);

    return {
      health,
      performance,
      users,
      timestamp: new Date(),
    };
  }

  @Get('alerts')
  getAlerts() {
    if (!this.alertingService) {
      return { error: 'Alerting service not available' };
    }
    return this.alertingService.getAlerts();
  }

  @Get('alerts/rules')
  getAlertRules() {
    if (!this.alertingService) {
      return { error: 'Alerting service not available' };
    }
    return this.alertingService.getAlertRules();
  }

  @Post('alerts/:id/resolve')
  resolveAlert(@Param('id') id: string) {
    if (!this.alertingService) {
      return { error: 'Alerting service not available' };
    }
    const resolved = this.alertingService.resolveAlert(id);
    return { success: resolved };
  }

  @Get('degradation/status')
  getDegradationStatus() {
    if (!this.gracefulDegradationService) {
      return { error: 'Degradation service not available' };
    }
    return this.gracefulDegradationService.getSystemStatus();
  }

  @Post('degradation/fallback')
  setFallbackMode(@Body() body: { enabled: boolean }) {
    if (!this.gracefulDegradationService) {
      return { error: 'Degradation service not available' };
    }
    this.gracefulDegradationService.setFallbackMode(body.enabled);
    return { success: true };
  }
}
