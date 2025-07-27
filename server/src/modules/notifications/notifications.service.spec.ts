import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { NotificationsService } from './notifications.service'
import { NotificationQueueService } from './services/notification-queue.service'
import { NotificationPreferenceService } from './services/notification-preference.service'
import { NotificationTemplateService } from './services/notification-template.service'
import { NotificationAnalyticsService } from './services/notification-analytics.service'
import { Notification } from '../../database/schemas/notification.schema'

describe('NotificationsService', () => {
  let service: NotificationsService

  const mockNotificationModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    updateMany: jest.fn(),
    findByIdAndDelete: jest.fn(),
    deleteMany: jest.fn(),
  }

  const mockQueueService = {
    addNotificationJob: jest.fn(),
  }

  const mockPreferenceService = {
    getUserPreferences: jest.fn(),
  }

  const mockTemplateService = {
    findByTemplateId: jest.fn(),
    renderTemplate: jest.fn(),
  }

  const mockAnalyticsService = {
    trackEvent: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getModelToken(Notification.name),
          useValue: mockNotificationModel,
        },
        {
          provide: NotificationQueueService,
          useValue: mockQueueService,
        },
        {
          provide: NotificationPreferenceService,
          useValue: mockPreferenceService,
        },
        {
          provide: NotificationTemplateService,
          useValue: mockTemplateService,
        },
        {
          provide: NotificationAnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile()

    service = module.get<NotificationsService>(NotificationsService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      const userId = '507f1f77bcf86cd799439011'
      const expectedCount = 5

      mockNotificationModel.countDocuments.mockResolvedValue(expectedCount)

      const result = await service.getUnreadCount(userId)

      expect(result).toBe(expectedCount)
      expect(mockNotificationModel.countDocuments).toHaveBeenCalledWith({
        userId: expect.any(Object),
        isRead: false,
        isArchived: false,
      })
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for a user', async () => {
      const userId = '507f1f77bcf86cd799439011'

      mockNotificationModel.updateMany.mockResolvedValue({ modifiedCount: 3 })

      await service.markAllAsRead(userId)

      expect(mockNotificationModel.updateMany).toHaveBeenCalledWith(
        { userId: expect.any(Object), isRead: false },
        { 
          isRead: true, 
          readAt: expect.any(Date),
          status: 'read'
        }
      )
    })
  })
})