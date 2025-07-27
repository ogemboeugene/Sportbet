import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe
} from '@nestjs/common'
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard'
import { AdminRoleGuard } from '../auth/guards/admin-role.guard'
import { AdminRoles, AdminPermissions } from '../auth/decorators/admin.decorators'
import { AdminRole, AdminPermission } from '../../database/schemas/admin-user.schema'
import { BettingService } from './services/betting.service'

@Controller('admin/betting')
@UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
export class AdminBettingController {
  constructor(private bettingService: BettingService) {}

  @Get('bets')
  @AdminPermissions(AdminPermission.VIEW_BETS)
  async getAllBets(
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('eventId') eventId?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    return this.bettingService.getAllBets({
      status,
      userId,
      eventId,
      limit: limit || 50,
      offset: offset || 0,
    })
  }

  @Get('bets/:betId')
  @AdminPermissions(AdminPermission.VIEW_BETS)
  async getBetById(@Param('betId') betId: string) {
    return this.bettingService.getBetById(betId)
  }

  @Put('bets/:betId/settle')
  @AdminPermissions(AdminPermission.SETTLE_BETS)
  async settleBet(
    @Param('betId') betId: string,
    @Body() settleData: { result: string; winAmount?: number },
    @Request() req
  ) {
    return this.bettingService.settleBet(betId, settleData.result, req.admin.sub, settleData.winAmount)
  }

  @Put('bets/:betId/void')
  @AdminPermissions(AdminPermission.VOID_BETS)
  async voidBet(
    @Param('betId') betId: string,
    @Body() voidData: { reason: string },
    @Request() req
  ) {
    return this.bettingService.voidBet(betId, voidData.reason, req.admin.sub)
  }

  @Get('analytics')
  @AdminPermissions(AdminPermission.VIEW_BETTING_ANALYTICS)
  async getBettingAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: 'day' | 'week' | 'month',
  ) {
    return this.bettingService.getBettingAnalytics({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      groupBy: groupBy || 'day',
    })
  }

  @Get('analytics/users')
  @AdminPermissions(AdminPermission.VIEW_BETTING_ANALYTICS)
  async getUserBettingAnalytics(
    @Query('userId') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.bettingService.getUserBettingAnalytics(userId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    })
  }

  @Get('suspicious')
  @AdminPermissions(AdminPermission.VIEW_BETS)
  async getSuspiciousBets(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    return this.bettingService.getSuspiciousBets({
      limit: limit || 50,
      offset: offset || 0,
    })
  }

  @Put('bets/:betId/flag')
  @AdminPermissions(AdminPermission.SETTLE_BETS)
  async flagBet(
    @Param('betId') betId: string,
    @Body() flagData: { reason: string; severity: 'low' | 'medium' | 'high' },
    @Request() req
  ) {
    return this.bettingService.flagBet(betId, flagData.reason, flagData.severity, req.admin.sub)
  }

  @Delete('bets/:betId/flag')
  @AdminPermissions(AdminPermission.SETTLE_BETS)
  async unflagBet(@Param('betId') betId: string, @Request() req) {
    return this.bettingService.unflagBet(betId, req.admin.sub)
  }
}
