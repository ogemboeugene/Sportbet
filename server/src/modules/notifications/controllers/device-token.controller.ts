import { 
  Controller, 
  Post, 
  Delete, 
  Get, 
  Body, 
  Param, 
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { DeviceTokenService, RegisterDeviceTokenDto } from '../services/device-token.service'

@Controller('notifications/device-tokens')
@UseGuards(JwtAuthGuard)
export class DeviceTokenController {
  constructor(private deviceTokenService: DeviceTokenService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async registerDeviceToken(
    @Request() req: any,
    @Body() tokenData: RegisterDeviceTokenDto
  ) {
    const userId = req.user.id
    const deviceToken = await this.deviceTokenService.registerDeviceToken(userId, tokenData)
    
    return {
      success: true,
      message: 'Device token registered successfully',
      data: {
        id: deviceToken._id,
        platform: deviceToken.platform,
        isActive: deviceToken.isActive,
        registeredAt: deviceToken.createdAt || new Date(),
      },
    }
  }

  @Delete(':token')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeDeviceToken(
    @Request() req: any,
    @Param('token') token: string
  ) {
    const userId = req.user.id
    await this.deviceTokenService.removeDeviceToken(userId, token)
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAllDeviceTokens(@Request() req: any) {
    const userId = req.user.id
    await this.deviceTokenService.removeAllUserTokens(userId)
  }

  @Get()
  async getUserDeviceTokens(@Request() req: any) {
    const userId = req.user.id
    const tokens = await this.deviceTokenService.getActiveTokensForUser(userId)
    
    return {
      success: true,
      data: tokens.map(token => ({
        id: token._id,
        platform: token.platform,
        deviceId: token.deviceId,
        lastUsedAt: token.lastUsedAt,
        registeredAt: token.createdAt || new Date(),
      })),
    }
  }

  @Get('stats')
  async getTokenStats(@Request() req: any) {
    const userId = req.user.id
    const userTokens = await this.deviceTokenService.getActiveTokensForUser(userId)
    
    const stats = {
      total: userTokens.length,
      byPlatform: userTokens.reduce((acc, token) => {
        acc[token.platform] = (acc[token.platform] || 0) + 1
        return acc
      }, {} as Record<string, number>),
    }
    
    return {
      success: true,
      data: stats,
    }
  }
}