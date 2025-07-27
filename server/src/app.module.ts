import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { ThrottlerModule } from '@nestjs/throttler'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { AuthModule } from './modules/auth/auth.module'
import { AdminModule } from './modules/admin/admin.module'
import { UsersModule } from './modules/users/users.module'
import { KycModule } from './modules/kyc/kyc.module'
import { ComplianceModule } from './modules/compliance/compliance.module'
import { OddsModule } from './modules/odds/odds.module'
import { BettingModule } from './modules/betting/betting.module'
import { WalletModule } from './modules/wallet/wallet.module'
import { UssdModule } from './modules/ussd/ussd.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { MonitoringModule } from './modules/monitoring/monitoring.module'
import { SecurityModule } from './modules/security/security.module'
import { DatabaseModule } from './database/database.module'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'
import { CompressionMiddleware } from './common/middleware/compression.middleware'
import { MobileOptimizationMiddleware } from './common/middleware/mobile-optimization.middleware'
import { InputSanitizationMiddleware } from './modules/security/middleware/input-sanitization.middleware'
import { SecurityAuditMiddleware } from './modules/security/middleware/security-audit.middleware'
import { AdvancedSecurityMiddleware } from './modules/security/middleware/advanced-security.middleware'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        retryWrites: true,
        w: 'majority',
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
          limit: configService.get('RATE_LIMIT_MAX_REQUESTS', 100),
        },
      ],
      inject: [ConfigService],
    }),
    DatabaseModule,
    SecurityModule,
    AuthModule,
    AdminModule,
    UsersModule,
    WalletModule,
    KycModule,
    ComplianceModule,
    OddsModule,
    BettingModule,
    UssdModule,
    NotificationsModule,
    MonitoringModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        CompressionMiddleware,
        MobileOptimizationMiddleware,
        AdvancedSecurityMiddleware,
        InputSanitizationMiddleware,
        SecurityAuditMiddleware
      )
      .forRoutes('*');
  }
}