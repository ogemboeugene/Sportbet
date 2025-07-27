import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { NotificationTemplateService } from './notification-template.service'

@Injectable()
export class NotificationInitService implements OnModuleInit {
  private readonly logger = new Logger(NotificationInitService.name)

  constructor(
    private templateService: NotificationTemplateService,
  ) {}

  async onModuleInit() {
    try {
      await this.templateService.seedDefaultTemplates()
      this.logger.log('Notification templates initialized successfully')
    } catch (error) {
      this.logger.error(`Failed to initialize notification templates: ${error.message}`)
    }
  }
}