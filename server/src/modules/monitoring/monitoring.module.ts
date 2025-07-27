import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
import { AlertingService } from './alerting.service';
import { GracefulDegradationService } from './graceful-degradation.service';
import { LoadBalancingService } from './load-balancing.service';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: 'User', schema: {} }, // Will use existing schema
      { name: 'Bet', schema: {} },   // Will use existing schema
      { name: 'Transaction', schema: {} }, // Will use existing schema
    ]),
  ],
  controllers: [MonitoringController, HealthController],
  providers: [
    LoadBalancingService,
    GracefulDegradationService,
    AlertingService,
    MonitoringService,
  ],
  exports: [
    MonitoringService,
    AlertingService,
    GracefulDegradationService,
    LoadBalancingService,
  ],
})
export class MonitoringModule {}
