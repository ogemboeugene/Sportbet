import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthController } from './auth.controller'
import { AdminAuthController } from './admin-auth.controller'
import { AuthService } from './auth.service'
import { AdminAuthService } from './services/admin-auth.service'
import { TwoFactorService } from './services/two-factor.service'
import { EmailService } from './services/email.service'
import { SecurityService } from './services/security.service'
import { UsersModule } from '../users/users.module'
import { JwtStrategy } from './strategies/jwt.strategy'
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy'
import { LocalStrategy } from './strategies/local.strategy'
import { LoginHistory, LoginHistorySchema } from '../../database/schemas/login-history.schema'
import { AdminUser, AdminUserSchema } from '../../database/schemas/admin-user.schema'
import { AdminSession, AdminSessionSchema } from '../../database/schemas/admin-session.schema'
import { AdminActivityLog, AdminActivityLogSchema } from '../../database/schemas/admin-activity-log.schema'

@Module({
  imports: [
    UsersModule,
    PassportModule,
    MongooseModule.forFeature([
      { name: LoginHistory.name, schema: LoginHistorySchema },
      { name: AdminUser.name, schema: AdminUserSchema },
      { name: AdminSession.name, schema: AdminSessionSchema },
      { name: AdminActivityLog.name, schema: AdminActivityLogSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, AdminAuthController],
  providers: [
    AuthService, 
    AdminAuthService,
    TwoFactorService, 
    EmailService, 
    SecurityService, 
    LocalStrategy, 
    JwtStrategy,
    AdminJwtStrategy
  ],
  exports: [AuthService, AdminAuthService, SecurityService],
})
export class AuthModule {}