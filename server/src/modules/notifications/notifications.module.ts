import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { JwtModule } from '@nestjs/jwt'
import { NotificationsController } from './notifications.controller'
import { DeviceTokenController } from './controllers/device-token.controller'
import { NotificationsService } from './notifications.service'
import { NotificationTemplateService } from './services/notification-template.service'
import { NotificationPreferenceService } from './services/notification-preference.service'
import { NotificationAnalyticsService } from './services/notification-analytics.service'
import { NotificationQueueService } from './services/notification-queue.service'
import { EmailNotificationService } from './services/email-notification.service'
import { PushNotificationService } from './services/push-notification.service'
import { SmsNotificationService } from './services/sms-notification.service'
import { InAppNotificationService } from './services/in-app-notification.service'
import { FirebaseService } from './services/firebase.service'
import { DeviceTokenService } from './services/device-token.service'
import { TargetedNotificationService } from './services/targeted-notification.service'
import { UnsubscribeService } from './services/unsubscribe.service'
import { NotificationProcessor } from './processors/notification.processor'
import { EmailProcessor } from './processors/email.processor'
import { WalletModule } from '../wallet/wallet.module'
import { 
  Notification, 
  NotificationSchema 
} from '../../database/schemas/notification.schema'
import { 
  NotificationTemplate, 
  NotificationTemplateSchema 
} from '../../database/schemas/notification-template.schema'
import { 
  NotificationPreference, 
  NotificationPreferenceSchema 
} from '../../database/schemas/notification-preference.schema'
import { 
  NotificationAnalytics, 
  NotificationAnalyticsSchema 
} from '../../database/schemas/notification-analytics.schema'
import { 
  DeviceToken, 
  DeviceTokenSchema 
} from '../../database/schemas/device-token.schema'
import { User, UserSchema } from '../../database/schemas/user.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: NotificationPreference.name, schema: NotificationPreferenceSchema },
      { name: NotificationAnalytics.name, schema: NotificationAnalyticsSchema },
      { name: DeviceToken.name, schema: DeviceTokenSchema },
      { name: User.name, schema: UserSchema },
    ]),
    JwtModule.register({}),
    WalletModule,
  ],
  controllers: [NotificationsController, DeviceTokenController],
  providers: [
    NotificationsService,
    NotificationTemplateService,
    NotificationPreferenceService,
    NotificationAnalyticsService,
    NotificationQueueService,
    EmailNotificationService,
    PushNotificationService,
    SmsNotificationService,
    InAppNotificationService,
    FirebaseService,
    DeviceTokenService,
    TargetedNotificationService,
    UnsubscribeService,
    NotificationProcessor,
    EmailProcessor,
  ],
  exports: [
    NotificationsService,
    NotificationTemplateService,
    NotificationPreferenceService,
    NotificationQueueService,
    EmailNotificationService,
    PushNotificationService,
    InAppNotificationService,
    TargetedNotificationService,
    UnsubscribeService,
    DeviceTokenService,
  ],
})
export class NotificationsModule {}