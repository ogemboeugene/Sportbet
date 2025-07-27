import { 
  Controller, 
  Get, 
  Put, 
  Post,
  Delete,
  Body, 
  UseGuards, 
  Request,
  Query,
  Param,
  ParseIntPipe 
} from '@nestjs/common'
import { UsersService } from './users.service'
import { ResponsibleGamblingService } from './services/responsible-gambling.service'
import { SelfExclusionService } from './services/self-exclusion.service'
import { SessionManagementService } from './services/session-management.service'
import { UserDashboardService } from './services/user-dashboard.service'
import { UserProfileService } from './services/user-profile.service'
import { BetHistoryService } from './services/bet-history.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UpdatePreferencesDto } from './dto/update-preferences.dto'
import { UpdateLimitsDto } from './dto/update-limits.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private usersService: UsersService,
    private responsibleGamblingService: ResponsibleGamblingService,
    private selfExclusionService: SelfExclusionService,
    private sessionManagementService: SessionManagementService,
    private userDashboardService: UserDashboardService,
    private userProfileService: UserProfileService,
    private betHistoryService: BetHistoryService,
  ) {}

  // Dashboard endpoints
  @Get('dashboard')
  async getDashboard(@Request() req) {
    const dashboard = await this.userDashboardService.getDashboardOverview(req.user.sub)
    
    return {
      success: true,
      data: dashboard,
      message: 'Dashboard data retrieved successfully'
    }
  }

  @Get('dashboard/analytics')
  async getBettingAnalytics(
    @Request() req,
    @Query('period') period: 'week' | 'month' | 'year' = 'month'
  ) {
    const analytics = await this.userDashboardService.getBettingAnalytics(req.user.sub, period)
    
    return {
      success: true,
      data: analytics,
      message: 'Betting analytics retrieved successfully'
    }
  }

  // Profile management endpoints
  @Get('profile/detailed')
  async getDetailedProfile(@Request() req) {
    const profile = await this.userProfileService.getUserProfile(req.user.sub)
    
    return {
      success: true,
      data: profile,
      message: 'Detailed profile retrieved successfully'
    }
  }

  @Put('profile/update')
  async updateDetailedProfile(
    @Request() req,
    @Body() updateProfileDto: UpdateProfileDto
  ) {
    const result = await this.userProfileService.updateProfile(req.user.sub, updateProfileDto)
    
    return result
  }

  // Favorites endpoints
  @Get('favorites/teams')
  async getFavoriteTeams(@Request() req) {
    const teams = await this.userProfileService.getFavoriteTeams(req.user.sub)
    
    return {
      success: true,
      data: teams,
      message: 'Favorite teams retrieved successfully'
    }
  }

  @Post('favorites/teams')
  async addFavoriteTeam(
    @Request() req,
    @Body() body: { teamName: string; sportKey: string }
  ) {
    return this.userProfileService.addFavoriteTeam(req.user.sub, body.teamName, body.sportKey)
  }

  @Delete('favorites/teams')
  async removeFavoriteTeam(
    @Request() req,
    @Body() body: { teamName: string; sportKey: string }
  ) {
    return this.userProfileService.removeFavoriteTeam(req.user.sub, body.teamName, body.sportKey)
  }

  @Get('favorites/sports')
  async getFavoriteSports(@Request() req) {
    const sports = await this.userProfileService.getFavoriteSports(req.user.sub)
    
    return {
      success: true,
      data: sports,
      message: 'Favorite sports retrieved successfully'
    }
  }

  @Post('favorites/sports')
  async addFavoriteSport(
    @Request() req,
    @Body() body: { sportKey: string }
  ) {
    return this.userProfileService.addFavoriteSport(req.user.sub, body.sportKey)
  }

  @Delete('favorites/sports')
  async removeFavoriteSport(
    @Request() req,
    @Body() body: { sportKey: string }
  ) {
    return this.userProfileService.removeFavoriteSport(req.user.sub, body.sportKey)
  }

  @Get('favorites/events')
  async getFavoriteEvents(@Request() req, @Query('limit') limit?: number) {
    const quickAccess = await this.userProfileService.getQuickBettingAccess(req.user.sub)
    
    return {
      success: true,
      data: quickAccess,
      message: 'Favorite events retrieved successfully'
    }
  }

  // Bet history endpoints
  @Get('bets/history')
  async getBetHistory(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
    @Query('sportKey') sportKey?: string,
    @Query('betType') betType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('minStake') minStake?: number,
    @Query('maxStake') maxStake?: number,
    @Query('search') search?: string,
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    const filters = {
      status,
      sportKey,
      betType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      minStake,
      maxStake,
      search
    }

    const history = await this.betHistoryService.getBetHistory(
      req.user.sub,
      page,
      limit,
      filters,
      sortBy,
      sortOrder
    )
    
    return {
      success: true,
      data: history,
      message: 'Bet history retrieved successfully'
    }
  }

  @Get('bets/search')
  async searchBets(
    @Request() req,
    @Query('q') searchTerm: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    const results = await this.betHistoryService.searchBets(req.user.sub, searchTerm, page, limit)
    
    return {
      success: true,
      data: results,
      message: 'Bet search completed successfully'
    }
  }

  @Get('bets/:betId')
  async getBetDetails(@Request() req, @Param('betId') betId: string) {
    const bet = await this.betHistoryService.getBetDetails(req.user.sub, betId)
    
    if (!bet) {
      return {
        success: false,
        message: 'Bet not found'
      }
    }
    
    return {
      success: true,
      data: bet,
      message: 'Bet details retrieved successfully'
    }
  }

  @Get('bets/statistics/summary')
  async getBetStatistics(
    @Request() req,
    @Query('status') status?: string,
    @Query('sportKey') sportKey?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const filters = {
      status,
      sportKey,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    }

    const stats = await this.betHistoryService.getBetStatisticsSummary(req.user.sub, filters)
    
    return {
      success: true,
      data: stats,
      message: 'Bet statistics retrieved successfully'
    }
  }

  @Get('bets/popular-selections')
  async getPopularSelections(@Request() req, @Query('limit') limit: number = 10) {
    const selections = await this.betHistoryService.getPopularSelections(req.user.sub, limit)
    
    return {
      success: true,
      data: selections,
      message: 'Popular selections retrieved successfully'
    }
  }

  @Get('profile')
  async getProfile(@Request() req) {
    const user = await this.usersService.findById(req.user.sub)
    
    if (!user) {
      throw new Error('User not found')
    }

    const { passwordHash, twoFactorSecret, twoFactorBackupCodes, ...profile } = user.toObject()
    
    return {
      success: true,
      data: profile,
      message: 'Profile retrieved successfully'
    }
  }

  @Put('preferences')
  async updatePreferences(
    @Request() req,
    @Body() updatePreferencesDto: UpdatePreferencesDto
  ) {
    const user = await this.usersService.updatePreferences(
      req.user.sub,
      updatePreferencesDto as any
    )

    return {
      success: true,
      data: user.preferences,
      message: 'Preferences updated successfully'
    }
  }

  @Put('limits')
  async updateLimits(
    @Request() req,
    @Body() updateLimitsDto: UpdateLimitsDto
  ) {
    const user = await this.usersService.updateLimits(
      req.user.sub,
      updateLimitsDto
    )

    return {
      success: true,
      data: user.limits,
      message: 'Limits updated successfully'
    }
  }

  @Get('responsible-gambling/limits')
  async getResponsibleGamblingLimits(@Request() req) {
    const limits = await this.responsibleGamblingService.getUserLimits(req.user.sub)
    
    return {
      success: true,
      data: limits,
      message: 'Responsible gambling limits retrieved successfully'
    }
  }

  @Put('responsible-gambling/limits')
  async updateResponsibleGamblingLimits(
    @Request() req,
    @Body() updateLimitsDto: UpdateLimitsDto
  ) {
    const limits = await this.responsibleGamblingService.updateUserLimits(
      req.user.sub,
      updateLimitsDto
    )

    return {
      success: true,
      data: limits,
      message: 'Responsible gambling limits updated successfully'
    }
  }

  @Get('responsible-gambling/usage')
  async getLimitUsage(@Request() req) {
    const usage = await this.responsibleGamblingService.getLimitUsage(req.user.sub)
    
    return {
      success: true,
      data: usage,
      message: 'Limit usage retrieved successfully'
    }
  }

  @Post('self-exclusion')
  async requestSelfExclusion(
    @Request() req,
    @Body() body: { duration?: number; reason: string; isPermanent: boolean }
  ) {
    const user = await this.selfExclusionService.excludeUser(req.user.sub, body)
    
    return {
      success: true,
      data: user.selfExclusion,
      message: 'Self-exclusion request processed successfully'
    }
  }

  @Post('self-exclusion/reactivation')
  async requestReactivation(
    @Request() req,
    @Body() body: { reason: string }
  ) {
    const user = await this.selfExclusionService.requestReactivation(req.user.sub, body)
    
    return {
      success: true,
      data: user.selfExclusion,
      message: 'Reactivation request submitted successfully'
    }
  }

  @Get('self-exclusion/status')
  async getSelfExclusionStatus(@Request() req) {
    const isExcluded = await this.selfExclusionService.checkExclusionStatus(req.user.sub)
    const user = await this.usersService.findById(req.user.sub)
    
    return {
      success: true,
      data: {
        isExcluded,
        exclusionDetails: user?.selfExclusion
      },
      message: 'Self-exclusion status retrieved successfully'
    }
  }

  @Get('self-exclusion/resources')
  async getResponsibleGamblingResources() {
    const resources = {
      helplines: [
        {
          name: 'National Problem Gambling Helpline',
          phone: '1-800-522-4700',
          website: 'https://www.ncpgambling.org',
          description: '24/7 confidential support for problem gambling'
        },
        {
          name: 'Gamblers Anonymous',
          website: 'https://www.gamblersanonymous.org',
          description: 'Fellowship of men and women who share their experience'
        }
      ],
      tools: [
        {
          name: 'Self-Assessment Quiz',
          description: 'Evaluate your gambling habits',
          action: 'Take Quiz'
        },
        {
          name: 'Spending Tracker',
          description: 'Monitor your gambling expenses',
          action: 'Start Tracking'
        }
      ],
      tips: [
        'Set time and money limits before you start',
        'Never gamble when upset, angry, or depressed',
        'Take regular breaks during gambling sessions',
        'Don\'t chase losses with bigger bets'
      ]
    }
    
    return {
      success: true,
      data: resources,
      message: 'Responsible gambling resources retrieved successfully'
    }
  }

  @Get('session/info')
  async getSessionInfo(@Request() req) {
    const sessionInfo = await this.sessionManagementService.getSessionInfo(req.user.sub)
    
    return {
      success: true,
      data: sessionInfo,
      message: 'Session information retrieved successfully'
    }
  }

  @Post('session/start')
  async startSession(@Request() req) {
    const ipAddress = req.ip
    const userAgent = req.get('User-Agent')
    
    await this.sessionManagementService.startSession(req.user.sub, ipAddress, userAgent)
    
    return {
      success: true,
      message: 'Session started successfully'
    }
  }

  @Post('session/activity')
  async updateActivity(@Request() req) {
    await this.sessionManagementService.updateSessionActivity(req.user.sub)
    
    return {
      success: true,
      message: 'Session activity updated successfully'
    }
  }

  @Post('session/end')
  async endSession(@Request() req) {
    await this.sessionManagementService.endSession(req.user.sub)
    
    return {
      success: true,
      message: 'Session ended successfully'
    }
  }

  @Get('session/history')
  async getSessionHistory(@Request() req, @Query('days') days?: number) {
    const history = await this.sessionManagementService.getUserSessionHistory(
      req.user.sub, 
      days ? parseInt(days.toString()) : 30
    )
    
    return {
      success: true,
      data: history,
      message: 'Session history retrieved successfully'
    }
  }

  @Get('gambling-pattern/analysis')
  async analyzeGamblingPattern(@Request() req) {
    const analysis = await this.sessionManagementService.analyzeGamblingPattern(req.user.sub)
    
    return {
      success: true,
      data: analysis,
      message: 'Gambling pattern analysis completed successfully'
    }
  }



  @Get()
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    const { users, total } = await this.usersService.findAll(page, limit)
    
    return {
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      message: 'Users retrieved successfully'
    }
  }
}