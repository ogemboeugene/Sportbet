import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard'
import { AdminRoleGuard } from '../auth/guards/admin-role.guard'
import { AdminPermissions } from '../auth/decorators/admin.decorators'
import { AdminPermission } from '../../database/schemas/admin-user.schema'
import { ComplianceService } from './compliance.service'
import { FraudDetectionService } from './services/fraud-detection.service'
import { RiskScoringService } from './services/risk-scoring.service'

@Controller('compliance')
@UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
@AdminPermissions(AdminPermission.VIEW_COMPLIANCE_REPORTS)
export class ComplianceController {
  constructor(
    private complianceService: ComplianceService,
    private fraudDetectionService: FraudDetectionService,
    private riskScoringService: RiskScoringService,
  ) {}

  @Get('dashboard')
  async getComplianceDashboard() {
    const result = await this.complianceService.getComplianceDashboard()
    return {
      success: true,
      data: result,
      message: 'Compliance dashboard data retrieved',
    }
  }

  @Get('alerts')
  async getAlerts(
    @Query('userId') userId?: string,
    @Query('severity') severity?: string,
    @Query('alertType') alertType?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.fraudDetectionService.getActiveAlerts(userId, severity, alertType)
    return {
      success: true,
      data: result,
      message: 'Compliance alerts retrieved',
    }
  }

  @Put('alerts/:alertId/assign')
  async assignAlert(
    @Param('alertId') alertId: string,
    @Body('assignedTo') assignedTo: string,
  ) {
    const result = await this.complianceService.assignAlertToReviewer(alertId, assignedTo)
    return {
      success: true,
      data: result,
      message: 'Alert assigned successfully',
    }
  }

  @Put('alerts/:alertId/status')
  async updateAlertStatus(
    @Param('alertId') alertId: string,
    @Body() body: { status: string; notes?: string; resolution?: string },
  ) {
    const result = await this.complianceService.updateAlertStatus(
      alertId,
      body.status,
      body.notes,
      body.resolution,
    )
    return {
      success: true,
      data: result,
      message: 'Alert status updated successfully',
    }
  }

  @Post('alerts/:alertId/escalate')
  async escalateAlert(
    @Param('alertId') alertId: string,
    @Body('reason') reason: string,
  ) {
    const result = await this.complianceService.escalateAlert(alertId, reason)
    return {
      success: true,
      data: result,
      message: 'Alert escalated successfully',
    }
  }

  @Get('risk-profiles/high-risk')
  async getHighRiskUsers(@Query('limit', new ParseIntPipe({ optional: true })) limit = 50) {
    const result = await this.riskScoringService.getHighRiskUsers(limit)
    return {
      success: true,
      data: result,
      message: 'High risk users retrieved',
    }
  }

  @Get('risk-profiles/manual-review')
  async getUsersRequiringReview() {
    const result = await this.riskScoringService.getUsersRequiringReview()
    return {
      success: true,
      data: result,
      message: 'Users requiring manual review retrieved',
    }
  }

  @Get('risk-profiles/:userId')
  async getUserRiskProfile(@Param('userId') userId: string) {
    const result = await this.riskScoringService.getRiskProfile(userId)
    return {
      success: true,
      data: result,
      message: 'User risk profile retrieved',
    }
  }

  @Post('risk-profiles/:userId/recalculate')
  async recalculateRiskScore(@Param('userId') userId: string) {
    const result = await this.riskScoringService.calculateRiskScore(userId)
    return {
      success: true,
      data: { riskScore: result },
      message: 'Risk score recalculated successfully',
    }
  }

  @Put('risk-profiles/:userId/blacklist')
  async updateBlacklistStatus(
    @Param('userId') userId: string,
    @Body() body: { isBlacklisted: boolean; reason?: string },
  ) {
    const result = await this.riskScoringService.setBlacklistStatus(
      userId,
      body.isBlacklisted,
      body.reason,
    )
    return {
      success: true,
      data: result,
      message: `User ${body.isBlacklisted ? 'blacklisted' : 'removed from blacklist'} successfully`,
    }
  }

  @Post('risk-profiles/:userId/manual-review')
  async requireManualReview(
    @Param('userId') userId: string,
    @Body('reason') reason: string,
  ) {
    const result = await this.riskScoringService.requireManualReview(userId, reason)
    return {
      success: true,
      data: result,
      message: 'User flagged for manual review',
    }
  }

  @Post('risk-profiles/:userId/flags')
  async addRiskFlags(
    @Param('userId') userId: string,
    @Body('flags') flags: string[],
  ) {
    const result = await this.riskScoringService.updateRiskFlags(userId, flags)
    return {
      success: true,
      data: result,
      message: 'Risk flags added successfully',
    }
  }

  @Delete('risk-profiles/:userId/flags/:flag')
  async removeRiskFlag(
    @Param('userId') userId: string,
    @Param('flag') flag: string,
  ) {
    const result = await this.riskScoringService.removeRiskFlag(userId, flag)
    return {
      success: true,
      data: result,
      message: 'Risk flag removed successfully',
    }
  }

  @Get('reports/compliance')
  async generateComplianceReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    const result = await this.complianceService.generateComplianceReport(start, end)
    return {
      success: true,
      data: result,
      message: 'Compliance report generated successfully',
    }
  }

  @Post('check/transaction')
  async checkTransactionCompliance(
    @Body() transactionData: {
      userId: string
      amount: number
      type: string
      paymentMethod: string
      currency: string
    },
  ) {
    const result = await this.complianceService.performTransactionCompliance(
      transactionData.userId,
      transactionData,
    )
    return {
      success: true,
      data: result,
      message: 'Transaction compliance check completed',
    }
  }

  @Post('check/betting')
  async checkBettingCompliance(
    @Body() betData: {
      userId: string
      amount: number
      type: string
      odds: number
      sport: string
    },
  ) {
    const result = await this.complianceService.performBettingCompliance(betData.userId, betData)
    return {
      success: true,
      data: result,
      message: 'Betting compliance check completed',
    }
  }
}