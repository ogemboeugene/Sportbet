import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { NotificationPreferenceService } from './services/notification-preference.service'
import { NotificationAnalyticsService } from './services/notification-analytics.service'
import { NotificationQueueService } from './services/notification-queue.service'
import { InAppNotificationService } from './services/in-app-notification.service'
import { UnsubscribeService, UnsubscribeResult } from './services/unsubscribe.service'
import { CreateNotificationDto } from './dto/create-notification.dto'
import { UpdateNotificationDto } from './dto/update-notification.dto'
import { NotificationFiltersDto } from './dto/notification-filters.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly preferenceService: NotificationPreferenceService,
    private readonly analyticsService: NotificationAnalyticsService,
    private readonly queueService: NotificationQueueService,
    private readonly inAppService: InAppNotificationService,
    private readonly unsubscribeService: UnsubscribeService,
  ) {}

  @Post()
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto)
  }

  @Post('template')
  async createFromTemplate(
    @Body() body: {
      templateId: string
      userId: string
      templateData?: Record<string, any>
      options?: {
        priority?: string
        scheduledFor?: Date
        channel?: string
      }
    }
  ) {
    const { templateId, userId, templateData, options } = body
    return this.notificationsService.createFromTemplate(
      templateId,
      userId,
      templateData,
      options
    )
  }

  @Post('bulk')
  async sendBulkNotifications(
    @Body() body: {
      userIds: string[]
      templateId: string
      templateData?: Record<string, any>
      options?: {
        priority?: string
        scheduledFor?: Date
        channel?: string
      }
    }
  ) {
    const { userIds, templateId, templateData, options } = body
    return this.notificationsService.sendBulkNotifications(
      userIds,
      templateId,
      templateData,
      options
    )
  }

  @Get()
  async findAll(@Query() filters: NotificationFiltersDto) {
    return this.notificationsService.findAll(undefined, filters)
  }

  @Get('my')
  async findMyNotifications(
    @Request() req,
    @Query() filters: NotificationFiltersDto
  ) {
    return this.notificationsService.findAll(req.user.userId, filters)
  }

  @Get('my/in-app')
  async getMyInAppNotifications(
    @Request() req,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('includeRead') includeRead?: boolean
  ) {
    return this.inAppService.getAllNotifications(
      req.user.userId,
      limit ? parseInt(limit.toString()) : 50,
      offset ? parseInt(offset.toString()) : 0,
      includeRead === true
    )
  }

  @Get('my/unread')
  async getMyUnreadNotifications(
    @Request() req,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    return this.inAppService.getUnreadNotifications(
      req.user.userId,
      limit ? parseInt(limit.toString()) : 20,
      offset ? parseInt(offset.toString()) : 0
    )
  }

  @Get('my/unread-count')
  async getMyUnreadCount(@Request() req) {
    const count = await this.inAppService.getUnreadCount(req.user.userId)
    return { count }
  }

  @Get('my/stats')
  async getMyNotificationStats(@Request() req) {
    return this.inAppService.getNotificationStats(req.user.userId)
  }

  @Get('preferences')
  async getMyPreferences(@Request() req) {
    return this.preferenceService.getUserPreferences(req.user.userId)
  }

  @Patch('preferences')
  async updateMyPreferences(
    @Request() req,
    @Body() updates: any
  ) {
    return this.preferenceService.updatePreferences(req.user.userId, updates)
  }

  @Patch('preferences/global')
  async updateGlobalSettings(
    @Request() req,
    @Body() globalSettings: {
      email?: boolean
      push?: boolean
      sms?: boolean
      in_app?: boolean
    }
  ) {
    return this.preferenceService.updateGlobalSettings(req.user.userId, globalSettings)
  }

  @Patch('preferences/type/:type')
  async updateTypePreference(
    @Request() req,
    @Param('type') type: string,
    @Body() channelPreferences: {
      email?: boolean
      push?: boolean
      sms?: boolean
      in_app?: boolean
    }
  ) {
    return this.preferenceService.updateTypePreference(
      req.user.userId,
      type,
      channelPreferences
    )
  }

  @Post('preferences/mute/:type')
  async muteNotificationType(
    @Request() req,
    @Param('type') type: string
  ) {
    return this.preferenceService.muteNotificationType(req.user.userId, type)
  }

  @Delete('preferences/mute/:type')
  async unmuteNotificationType(
    @Request() req,
    @Param('type') type: string
  ) {
    return this.preferenceService.unmuteNotificationType(req.user.userId, type)
  }

  @Get('analytics/stats')
  async getNotificationStats(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('type') type?: string,
    @Query('channel') channel?: string
  ) {
    return this.analyticsService.getNotificationStats(
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
      type,
      channel
    )
  }

  @Get('analytics/delivery-rates')
  async getDeliveryRates(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('type') type?: string,
    @Query('channel') channel?: string
  ) {
    return this.analyticsService.getDeliveryRates(
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
      type,
      channel
    )
  }

  @Get('analytics/channel-performance')
  async getChannelPerformance(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    return this.analyticsService.getChannelPerformance(
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined
    )
  }

  @Get('analytics/failures')
  async getFailureAnalysis(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('channel') channel?: string
  ) {
    return this.analyticsService.getFailureAnalysis(
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
      channel
    )
  }

  @Get('queue/stats')
  async getQueueStats() {
    return this.queueService.getQueueStats()
  }

  @Get('queue/failed')
  async getFailedJobs(@Query('limit') limit?: number) {
    return this.queueService.getFailedJobs(
      limit ? parseInt(limit.toString()) : 50
    )
  }

  @Post('queue/retry/:notificationId')
  async retryFailedNotification(@Param('notificationId') notificationId: string) {
    await this.queueService.retryFailedNotification(notificationId)
    return { message: 'Notification retry queued' }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(id)
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto
  ) {
    return this.notificationsService.update(id, updateNotificationDto)
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    return this.inAppService.markAsRead(id, req.user.userId)
  }

  @Patch(':id/archive')
  async markAsArchived(@Param('id') id: string, @Request() req) {
    return this.inAppService.archiveNotification(id, req.user.userId)
  }

  @Post('mark-all-read')
  async markAllAsRead(@Request() req) {
    const count = await this.inAppService.markAllAsRead(req.user.userId)
    return { message: `${count} notifications marked as read` }
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    const deleted = await this.inAppService.deleteNotification(id, req.user.userId)
    if (deleted) {
      return { message: 'Notification deleted' }
    } else {
      return { message: 'Notification not found or already deleted' }
    }
  }

  @Get('track/opened/:id')
  @HttpCode(HttpStatus.OK)
  async trackOpened(@Param('id') id: string, @Request() req) {
    // This endpoint is used for email tracking pixels
    try {
      const notification = await this.notificationsService.findOne(id)
      if (notification) {
        await this.analyticsService.trackEvent(
          notification._id as any,
          notification.userId as any,
          notification.type,
          notification.channel,
          'opened',
          {
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip,
            timestamp: new Date()
          }
        )
      }
    } catch (error) {
      // Silently fail for tracking pixels
    }
    
    // Return 1x1 transparent pixel
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    )
    
    return {
      type: 'image/png',
      data: pixel
    }
  }

  @Get('track/clicked/:id')
  @HttpCode(HttpStatus.OK)
  async trackClicked(
    @Param('id') id: string,
    @Query('link') link: string,
    @Request() req
  ) {
    try {
      const notification = await this.notificationsService.findOne(id)
      if (notification) {
        await this.analyticsService.trackEvent(
          notification._id as any,
          notification.userId as any,
          notification.type,
          notification.channel,
          'clicked',
          {
            link,
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip,
            timestamp: new Date()
          }
        )
      }
    } catch (error) {
      // Silently fail for tracking
    }
    
    return { success: true }
  }

  @Post('unsubscribe')
  @HttpCode(HttpStatus.OK)
  async handleUnsubscribe(@Body() body: { 
    token: string
    type?: string
    action?: 'unsubscribe' | 'resubscribe'
  }) {
    const { token, type, action = 'unsubscribe' } = body

    if (action === 'resubscribe') {
      return this.unsubscribeService.resubscribe(token, type ? [type] : undefined)
    }

    if (type) {
      return this.unsubscribeService.unsubscribeFromType(token, type)
    }

    return this.unsubscribeService.unsubscribeFromAll(token)
  }

  @Get('unsubscribe')
  @HttpCode(HttpStatus.OK)
  async showUnsubscribePage(@Query('token') token: string, @Query('type') type?: string) {
    if (type) {
      return this.unsubscribeService.unsubscribeFromType(token, type)
    }
    
    return this.unsubscribeService.getUnsubscribePreferences(token)
  }

  @Post('unsubscribe/preferences')
  @HttpCode(HttpStatus.OK)
  async updateUnsubscribePreferences(
    @Body() body: { 
      token: string
      preferences: Record<string, { email: boolean }>
    }
  ) {
    const { token, preferences } = body
    return this.unsubscribeService.updateUnsubscribePreferences(token, preferences)
  }

  @Get('unsubscribe/stats')
  async getUnsubscribeStats(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    return this.unsubscribeService.getUnsubscribeStats(
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined
    )
  }
}