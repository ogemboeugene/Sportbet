import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { EmailNotificationService } from './email-notification.service'
import { NotificationAnalyticsService } from './notification-analytics.service'
import { NotificationTemplateService } from './notification-template.service'
import { NotificationQueueService } from './notification-queue.service'
import { Notification } from '../../../database/schemas/notification.schema'

describe('EmailNotificationService', () => {
  let service: EmailNotificationService
  let analyticsService: NotificationAnalyticsService
  let templateService: NotificationTemplateService
  let queueService: NotificationQueueService

  const mockNotification = {
    _id: '507f1f77bcf86cd799439011',
    userId: '507f1f77bcf86cd799439012',
    type: 'bet_placed',
    channel: 'email',
    title: 'Bet Placed Successfully',
    message: 'Your bet has been placed successfully',
    metadata: {
      betId: 'BET123',
      stake: 10,
      currency: 'USD',
      potentialWin: 25
    },
    priority: 'medium',
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockAnalyticsService = {
    trackEvent: jest.fn().mockResolvedValue({}),
  }

  const mockTemplateService = {
    findByTypeAndChannel: jest.fn(),
    renderTemplate: jest.fn(),
  }

  const mockQueueService = {
    addNotificationJob: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailNotificationService,
        {
          provide: NotificationAnalyticsService,
          useValue: mockAnalyticsService,
        },
        {
          provide: NotificationTemplateService,
          useValue: mockTemplateService,
        },
        {
          provide: NotificationQueueService,
          useValue: mockQueueService,
        },
      ],
    }).compile()

    service = module.get<EmailNotificationService>(EmailNotificationService)
    analyticsService = module.get<NotificationAnalyticsService>(NotificationAnalyticsService)
    templateService = module.get<NotificationTemplateService>(NotificationTemplateService)
    queueService = module.get<NotificationQueueService>(NotificationQueueService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('sendNotification', () => {
    it('should send email notification successfully', async () => {
      // Mock template service response
      mockTemplateService.findByTypeAndChannel.mockResolvedValue({
        templateId: 'bet_placed_email',
        subject: 'Bet Placed - {{betId}}',
        content: 'Your bet {{betId}} has been placed',
        htmlContent: '<p>Your bet {{betId}} has been placed</p>'
      })

      mockTemplateService.renderTemplate.mockReturnValue({
        subject: 'Bet Placed - BET123',
        content: 'Your bet BET123 has been placed',
        htmlContent: '<p>Your bet BET123 has been placed</p>'
      })

      // Mock successful email sending
      jest.spyOn(service as any, 'transporter', 'get').mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({
          messageId: 'test-message-id'
        })
      })

      const result = await service.sendNotification(
        mockNotification as any,
        'test@example.com',
        'Test User'
      )

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('test-message-id')
      expect(analyticsService.trackEvent).toHaveBeenCalledWith(
        mockNotification._id,
        mockNotification.userId,
        mockNotification.type,
        mockNotification.channel,
        'sent',
        expect.objectContaining({
          messageId: 'test-message-id',
          recipientEmail: 'test@example.com'
        })
      )
    })

    it('should handle email sending failure', async () => {
      // Mock template service response
      mockTemplateService.findByTypeAndChannel.mockResolvedValue(null)

      // Mock failed email sending
      jest.spyOn(service as any, 'transporter', 'get').mockReturnValue({
        sendMail: jest.fn().mockRejectedValue(new Error('SMTP Error'))
      })

      const result = await service.sendNotification(
        mockNotification as any,
        'test@example.com',
        'Test User'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('SMTP Error')
      expect(analyticsService.trackEvent).toHaveBeenCalledWith(
        mockNotification._id,
        mockNotification.userId,
        mockNotification.type,
        mockNotification.channel,
        'failed',
        expect.objectContaining({
          errorMessage: 'SMTP Error',
          recipientEmail: 'test@example.com'
        })
      )
    })
  })

  describe('verifyConnection', () => {
    it('should verify SMTP connection successfully', async () => {
      jest.spyOn(service as any, 'transporter', 'get').mockReturnValue({
        verify: jest.fn().mockResolvedValue(true)
      })

      const result = await service.verifyConnection()
      expect(result).toBe(true)
    })

    it('should handle SMTP connection failure', async () => {
      jest.spyOn(service as any, 'transporter', 'get').mockReturnValue({
        verify: jest.fn().mockRejectedValue(new Error('Connection failed'))
      })

      const result = await service.verifyConnection()
      expect(result).toBe(false)
    })
  })

  describe('trackEmailOpened', () => {
    it('should track email opened event', async () => {
      await service.trackEmailOpened('notification-id', 'user-id', { userAgent: 'test' })

      expect(analyticsService.trackEvent).toHaveBeenCalledWith(
        'notification-id',
        'user-id',
        'email',
        'email',
        'opened',
        { userAgent: 'test' }
      )
    })
  })

  describe('trackEmailClicked', () => {
    it('should track email clicked event', async () => {
      await service.trackEmailClicked('notification-id', 'user-id', 'https://example.com', { userAgent: 'test' })

      expect(analyticsService.trackEvent).toHaveBeenCalledWith(
        'notification-id',
        'user-id',
        'email',
        'email',
        'clicked',
        { link: 'https://example.com', userAgent: 'test' }
      )
    })
  })

  describe('handleUnsubscribe', () => {
    it('should handle unsubscribe request', async () => {
      const token = Buffer.from(JSON.stringify({
        userId: 'user-id',
        email: 'test@example.com',
        timestamp: Date.now()
      })).toString('base64url')

      const result = await service.handleUnsubscribe(token)
      expect(result.success).toBe(true)
    })

    it('should handle invalid unsubscribe token', async () => {
      const result = await service.handleUnsubscribe('invalid-token')
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})