import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { ConfigModule } from '@nestjs/config'
import { ComplianceController } from './compliance.controller'
import { ComplianceService } from './compliance.service'
import { FraudDetectionService } from './services/fraud-detection.service'
import { RiskScoringService } from './services/risk-scoring.service'
import { UsersModule } from '../users/users.module'
import { AuthModule } from '../auth/auth.module'
import { ComplianceAlert, ComplianceAlertSchema } from '../../database/schemas/compliance-alert.schema'
import { RiskProfile, RiskProfileSchema } from '../../database/schemas/risk-profile.schema'

@Module({
  imports: [
    UsersModule,
    AuthModule,
    ConfigModule,
    MongooseModule.forFeature([
      { name: ComplianceAlert.name, schema: ComplianceAlertSchema },
      { name: RiskProfile.name, schema: RiskProfileSchema },
    ]),
  ],
  controllers: [ComplianceController],
  providers: [ComplianceService, FraudDetectionService, RiskScoringService],
  exports: [ComplianceService, FraudDetectionService, RiskScoringService],
})
export class ComplianceModule {}