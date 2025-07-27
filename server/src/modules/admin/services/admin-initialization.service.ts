import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { AdminAuthService } from '../../auth/services/admin-auth.service'

@Injectable()
export class AdminInitializationService implements OnModuleInit {
  private readonly logger = new Logger(AdminInitializationService.name)

  constructor(private readonly adminAuthService: AdminAuthService) {}

  async onModuleInit() {
    try {
      await this.adminAuthService.initializeDefaultAdmin()
      this.logger.log('Admin initialization completed')
    } catch (error) {
      this.logger.error('Failed to initialize default admin:', error.message)
      this.logger.error('Error stack:', error.stack)
    }
  }
}
