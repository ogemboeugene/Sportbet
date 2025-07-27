import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { DeviceToken, DeviceTokenDocument } from '../../../database/schemas/device-token.schema'

export interface RegisterDeviceTokenDto {
  token: string
  platform: 'web' | 'android' | 'ios'
  deviceId?: string
  userAgent?: string
  appVersion?: string
}

@Injectable()
export class DeviceTokenService {
  private readonly logger = new Logger(DeviceTokenService.name)

  constructor(
    @InjectModel(DeviceToken.name)
    private deviceTokenModel: Model<DeviceTokenDocument>,
  ) {}

  async registerDeviceToken(
    userId: string,
    tokenData: RegisterDeviceTokenDto
  ): Promise<DeviceTokenDocument> {
    try {
      // Check if token already exists for this user
      const existingToken = await this.deviceTokenModel.findOne({
        userId: new Types.ObjectId(userId),
        token: tokenData.token,
      })

      if (existingToken) {
        // Update existing token
        existingToken.isActive = true
        existingToken.lastUsedAt = new Date()
        existingToken.userAgent = tokenData.userAgent
        existingToken.appVersion = tokenData.appVersion
        await existingToken.save()
        
        this.logger.log(`Updated existing device token for user ${userId}`)
        return existingToken
      }

      // Create new token
      const deviceToken = new this.deviceTokenModel({
        userId: new Types.ObjectId(userId),
        ...tokenData,
        isActive: true,
        lastUsedAt: new Date(),
      })

      await deviceToken.save()
      this.logger.log(`Registered new device token for user ${userId} on ${tokenData.platform}`)
      
      return deviceToken
    } catch (error) {
      this.logger.error(`Failed to register device token: ${error.message}`)
      throw error
    }
  }

  async getActiveTokensForUser(userId: string): Promise<DeviceTokenDocument[]> {
    return this.deviceTokenModel.find({
      userId: new Types.ObjectId(userId),
      isActive: true,
    }).exec()
  }

  async getActiveTokensForUsers(userIds: string[]): Promise<Map<string, DeviceTokenDocument[]>> {
    const objectIds = userIds.map(id => new Types.ObjectId(id))
    const tokens = await this.deviceTokenModel.find({
      userId: { $in: objectIds },
      isActive: true,
    }).exec()

    const tokenMap = new Map<string, DeviceTokenDocument[]>()
    
    tokens.forEach(token => {
      const userId = token.userId.toString()
      if (!tokenMap.has(userId)) {
        tokenMap.set(userId, [])
      }
      tokenMap.get(userId)!.push(token)
    })

    return tokenMap
  }

  async removeDeviceToken(userId: string, token: string): Promise<void> {
    await this.deviceTokenModel.updateOne(
      {
        userId: new Types.ObjectId(userId),
        token,
      },
      {
        isActive: false,
      }
    )

    this.logger.log(`Deactivated device token for user ${userId}`)
  }

  async removeAllUserTokens(userId: string): Promise<void> {
    await this.deviceTokenModel.updateMany(
      { userId: new Types.ObjectId(userId) },
      { isActive: false }
    )

    this.logger.log(`Deactivated all device tokens for user ${userId}`)
  }

  async cleanupExpiredTokens(): Promise<void> {
    const result = await this.deviceTokenModel.deleteMany({
      $or: [
        { expiresAt: { $lt: new Date() } },
        { lastUsedAt: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } }, // 90 days
      ],
    })

    this.logger.log(`Cleaned up ${result.deletedCount} expired device tokens`)
  }

  async markTokenAsInvalid(token: string): Promise<void> {
    await this.deviceTokenModel.updateOne(
      { token },
      { isActive: false }
    )

    this.logger.log(`Marked device token as invalid: ${token.substring(0, 20)}...`)
  }

  async updateTokenLastUsed(token: string): Promise<void> {
    await this.deviceTokenModel.updateOne(
      { token },
      { lastUsedAt: new Date() }
    )
  }

  async getTokensByPlatform(platform: 'web' | 'android' | 'ios'): Promise<DeviceTokenDocument[]> {
    return this.deviceTokenModel.find({
      platform,
      isActive: true,
    }).exec()
  }

  async getTokenStats(): Promise<{
    total: number
    active: number
    byPlatform: Record<string, number>
  }> {
    const [total, active, byPlatform] = await Promise.all([
      this.deviceTokenModel.countDocuments(),
      this.deviceTokenModel.countDocuments({ isActive: true }),
      this.deviceTokenModel.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$platform', count: { $sum: 1 } } },
      ]),
    ])

    const platformStats = byPlatform.reduce((acc, item) => {
      acc[item._id] = item.count
      return acc
    }, {} as Record<string, number>)

    return {
      total,
      active,
      byPlatform: platformStats,
    }
  }
}