import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AdminManagementController } from './admin-management.controller'
import { AdminUsersController } from './admin-users.controller'
import { AdminInitializationService } from './services/admin-initialization.service'
import { AuthModule } from '../auth/auth.module'
import { UsersModule } from '../users/users.module'
import { ComplianceModule } from '../compliance/compliance.module'
import { AdminUser, AdminUserSchema } from '../../database/schemas/admin-user.schema'
import { AdminSession, AdminSessionSchema } from '../../database/schemas/admin-session.schema'
import { AdminActivityLog, AdminActivityLogSchema } from '../../database/schemas/admin-activity-log.schema'
import { User, UserSchema } from '../../database/schemas/user.schema'

@Module({
  imports: [
    AuthModule,
    UsersModule,
    ComplianceModule,
    MongooseModule.forFeature([
      { name: AdminUser.name, schema: AdminUserSchema },
      { name: AdminSession.name, schema: AdminSessionSchema },
      { name: AdminActivityLog.name, schema: AdminActivityLogSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [AdminManagementController, AdminUsersController],
  providers: [AdminInitializationService],
  exports: [AdminInitializationService],
})
export class AdminModule {}
