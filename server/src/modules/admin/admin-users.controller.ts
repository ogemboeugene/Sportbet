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
  ParseIntPipe,
  BadRequestException,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard'
import { AdminRoleGuard } from '../auth/guards/admin-role.guard'
import { AdminRoles, AdminPermissions } from '../auth/decorators/admin.decorators'
import { AdminRole, AdminPermission } from '../../database/schemas/admin-user.schema'
import { User, UserDocument } from '../../database/schemas/user.schema'
import { UsersService } from '../users/users.service'
import { SelfExclusionService } from '../users/services/self-exclusion.service'
import { RiskScoringService } from '../compliance/services/risk-scoring.service'
import { AdminAuthService } from '../auth/services/admin-auth.service'
import { AdminActivityType } from '../../database/schemas/admin-activity-log.schema'

@Controller('admin/users')
@UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
export class AdminUsersController {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly usersService: UsersService,
    private readonly selfExclusionService: SelfExclusionService,
    private readonly riskScoringService: RiskScoringService,
    private readonly adminAuthService: AdminAuthService,
  ) {}

  @Get()
  @AdminPermissions(AdminPermission.VIEW_USERS)
  async getAllUsers(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('kycStatus') kycStatus?: string,
    @Query('accountStatus') accountStatus?: string,
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortOrder') sortOrder: string = 'desc',
  ) {
    const query: any = {}

    // Search functionality
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
        { 'profile.phoneNumber': { $regex: search, $options: 'i' } },
      ]
    }

    // Filter by various statuses
    if (status) query.status = status
    if (kycStatus) query.kycStatus = kycStatus
    if (accountStatus) query.accountStatus = accountStatus

    const skip = (page - 1) * limit
    const sort: any = {}
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1

    const [users, total] = await Promise.all([
      this.userModel
        .find(query)
        .select('-passwordHash -twoFactorSecret -twoFactorBackupCodes')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(query).exec(),
    ])

    return {
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      message: 'Users retrieved successfully',
    }
  }

  @Get(':userId')
  @AdminPermissions(AdminPermission.VIEW_USER_DETAILS)
  async getUserById(@Param('userId') userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-passwordHash -twoFactorSecret -twoFactorBackupCodes')
      .exec()

    if (!user) {
      throw new NotFoundException('User not found')
    }

    // Get additional user data
    const [riskScore, recentActivity] = await Promise.all([
      this.riskScoringService.getUserRiskScore(userId),
      this.getUserRecentActivity(userId),
    ])

    return {
      success: true,
      data: {
        user,
        riskScore,
        recentActivity,
      },
      message: 'User details retrieved successfully',
    }
  }

  @Put(':userId/status')
  @AdminPermissions(AdminPermission.SUSPEND_USERS)
  async updateUserStatus(
    @Param('userId') userId: string,
    @Body() updateData: {
      accountStatus: 'active' | 'suspended' | 'restricted' | 'deactivated'
      reason?: string
      duration?: number // in days
    },
    @Request() req,
  ) {
    const user = await this.userModel.findById(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    const oldStatus = user.accountStatus
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      {
        accountStatus: updateData.accountStatus,
        statusReason: updateData.reason,
        statusUpdatedAt: new Date(),
        statusUpdatedBy: req.admin.sub,
        ...(updateData.duration && {
          statusExpiresAt: new Date(Date.now() + updateData.duration * 24 * 60 * 60 * 1000),
        }),
      },
      { new: true }
    )

    // Log the activity
    await this.adminAuthService.logActivity({
      adminId: req.admin.sub,
      adminEmail: req.admin.email,
      adminName: req.admin.fullName,
      activityType: AdminActivityType.USER_UPDATE,
      description: `Updated user status from ${oldStatus} to ${updateData.accountStatus}`,
      details: {
        targetId: userId,
        targetType: 'user',
        targetName: `${user.profile.firstName} ${user.profile.lastName}`,
        oldValues: { accountStatus: oldStatus },
        newValues: { accountStatus: updateData.accountStatus },
        reason: updateData.reason,
      },
      ipAddress: req.ip || req.connection.remoteAddress,
    })

    return {
      success: true,
      data: updatedUser,
      message: `User status updated to ${updateData.accountStatus}`,
    }
  }

  @Put(':userId/kyc-status')
  @AdminPermissions(AdminPermission.APPROVE_KYC, AdminPermission.REJECT_KYC)
  async updateKycStatus(
    @Param('userId') userId: string,
    @Body() updateData: {
      kycStatus: 'pending' | 'verified' | 'rejected'
      reason?: string
    },
    @Request() req,
  ) {
    const user = await this.userModel.findById(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    const oldStatus = user.kycStatus
    const updatedUser = await this.usersService.updateKycStatus(userId, updateData.kycStatus)

    // Log the activity
    await this.adminAuthService.logActivity({
      adminId: req.admin.sub,
      adminEmail: req.admin.email,
      adminName: req.admin.fullName,
      activityType: AdminActivityType.KYC_UPDATE,
      description: `Updated KYC status from ${oldStatus} to ${updateData.kycStatus}`,
      details: {
        targetId: userId,
        targetType: 'user',
        targetName: `${user.profile.firstName} ${user.profile.lastName}`,
        oldValues: { kycStatus: oldStatus },
        newValues: { kycStatus: updateData.kycStatus },
        reason: updateData.reason,
      },
      ipAddress: req.ip || req.connection.remoteAddress,
    })

    return {
      success: true,
      data: updatedUser,
      message: `KYC status updated to ${updateData.kycStatus}`,
    }
  }

  @Put(':userId/limits')
  @AdminPermissions(AdminPermission.EDIT_USERS)
  async updateUserLimits(
    @Param('userId') userId: string,
    @Body() updateData: {
      dailyDepositLimit?: number
      weeklyDepositLimit?: number
      monthlyDepositLimit?: number
      dailyBetLimit?: number
      weeklyBetLimit?: number
      monthlyBetLimit?: number
      sessionTimeLimit?: number
      reason?: string
    },
    @Request() req,
  ) {
    const user = await this.userModel.findById(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    const oldLimits = { ...user.limits }
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      {
        responsibleGambling: {
          ...user.limits,
          ...updateData,
          lastUpdatedBy: req.admin.sub,
          lastUpdatedAt: new Date(),
        },
      },
      { new: true }
    )

    // Log the activity
    await this.adminAuthService.logActivity({
      adminId: req.admin.sub,
      adminEmail: req.admin.email,
      adminName: req.admin.fullName,
      activityType: AdminActivityType.USER_UPDATE,
      description: 'Updated user responsible gambling limits',
      details: {
        targetId: userId,
        targetType: 'user',
        targetName: `${user.profile.firstName} ${user.profile.lastName}`,
        oldValues: { limits: oldLimits },
        newValues: { limits: updateData },
        reason: updateData.reason,
      },
      ipAddress: req.ip || req.connection.remoteAddress,
    })

    return {
      success: true,
      data: updatedUser,
      message: 'User limits updated successfully',
    }
  }

  @Post(':userId/verify')
  @AdminPermissions(AdminPermission.EDIT_USERS)
  async verifyUser(
    @Param('userId') userId: string,
    @Body() verifyData: { reason?: string },
    @Request() req,
  ) {
    const user = await this.userModel.findById(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      {
        emailVerified: true,
        accountStatus: 'active',
        verifiedBy: req.admin.sub,
        verifiedAt: new Date(),
      },
      { new: true }
    )

    // Log the activity
    await this.adminAuthService.logActivity({
      adminId: req.admin.sub,
      adminEmail: req.admin.email,
      adminName: req.admin.fullName,
      activityType: AdminActivityType.USER_VERIFICATION,
      description: 'Manually verified user account',
      details: {
        targetId: userId,
        targetType: 'user',
        targetName: `${user.profile.firstName} ${user.profile.lastName}`,
        reason: verifyData.reason,
      },
      ipAddress: req.ip || req.connection.remoteAddress,
    })

    return {
      success: true,
      data: updatedUser,
      message: 'User verified successfully',
    }
  }

  @Get(':userId/activity')
  @AdminPermissions(AdminPermission.VIEW_USER_DETAILS)
  async getUserActivity(
    @Param('userId') userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('type') type?: string,
  ) {
    const activity = await this.getUserRecentActivity(userId, page, limit, type)

    return {
      success: true,
      data: activity,
      message: 'User activity retrieved successfully',
    }
  }

  @Get('suspicious')
  @AdminPermissions(AdminPermission.VIEW_USERS)
  async getSuspiciousUsers(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('riskLevel') riskLevel?: 'low' | 'medium' | 'high',
  ) {
    const users = await this.riskScoringService.getSuspiciousUsers({
      page,
      limit,
      riskLevel,
    })

    return {
      success: true,
      data: users,
      message: 'Suspicious users retrieved successfully',
    }
  }

  @Put(':userId/flag')
  @AdminPermissions(AdminPermission.EDIT_USERS)
  async flagUser(
    @Param('userId') userId: string,
    @Body() flagData: {
      reason: string
      severity: 'low' | 'medium' | 'high'
      category: string
    },
    @Request() req,
  ) {
    const user = await this.userModel.findById(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    const result = await this.riskScoringService.flagUser(
      userId,
      flagData.reason,
      flagData.severity,
      req.admin.sub,
      flagData.category
    )

    // Log the activity
    await this.adminAuthService.logActivity({
      adminId: req.admin.sub,
      adminEmail: req.admin.email,
      adminName: req.admin.fullName,
      activityType: AdminActivityType.USER_FLAG,
      description: `Flagged user for ${flagData.category}`,
      details: {
        targetId: userId,
        targetType: 'user',
        targetName: `${user.profile.firstName} ${user.profile.lastName}`,
        reason: flagData.reason,
        severity: flagData.severity,
        category: flagData.category,
      },
      ipAddress: req.ip || req.connection.remoteAddress,
    })

    return {
      success: true,
      data: result,
      message: 'User flagged successfully',
    }
  }

  @Delete(':userId/flag')
  @AdminPermissions(AdminPermission.EDIT_USERS)
  async unflagUser(
    @Param('userId') userId: string,
    @Body() unflagData: { reason?: string },
    @Request() req,
  ) {
    const user = await this.userModel.findById(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    const result = await this.riskScoringService.unflagUser(userId, req.admin.sub)

    // Log the activity
    await this.adminAuthService.logActivity({
      adminId: req.admin.sub,
      adminEmail: req.admin.email,
      adminName: req.admin.fullName,
      activityType: AdminActivityType.USER_UNFLAG,
      description: 'Removed user flag',
      details: {
        targetId: userId,
        targetType: 'user',
        targetName: `${user.profile.firstName} ${user.profile.lastName}`,
        reason: unflagData.reason,
      },
      ipAddress: req.ip || req.connection.remoteAddress,
    })

    return {
      success: true,
      data: result,
      message: 'User flag removed successfully',
    }
  }

  @Post('bulk-actions')
  @AdminPermissions(AdminPermission.EDIT_USERS)
  async bulkUserActions(
    @Body() bulkData: {
      action: 'suspend' | 'activate' | 'verify' | 'flag' | 'export'
      userIds: string[]
      reason?: string
      metadata?: any
    },
    @Request() req,
  ) {
    const { action, userIds, reason, metadata } = bulkData

    if (action === 'export') {
      return this.exportUsers(userIds, req)
    }

    const results = []

    for (const userId of userIds) {
      try {
        const user = await this.userModel.findById(userId)
        if (!user) {
          results.push({ userId, success: false, message: 'User not found' })
          continue
        }

        switch (action) {
          case 'suspend':
            await this.userModel.findByIdAndUpdate(userId, {
              accountStatus: 'suspended',
              statusReason: reason,
              statusUpdatedBy: req.admin.sub,
              statusUpdatedAt: new Date(),
            })
            break
          case 'activate':
            await this.userModel.findByIdAndUpdate(userId, {
              accountStatus: 'active',
              statusReason: reason,
              statusUpdatedBy: req.admin.sub,
              statusUpdatedAt: new Date(),
            })
            break
          case 'verify':
            await this.userModel.findByIdAndUpdate(userId, {
              emailVerified: true,
              verifiedBy: req.admin.sub,
              verifiedAt: new Date(),
            })
            break
          case 'flag':
            await this.riskScoringService.flagUser(
              userId,
              reason || 'Bulk action',
              metadata?.severity || 'medium',
              req.admin.sub,
              metadata?.category || 'admin_review'
            )
            break
        }

        // Log the activity
        await this.adminAuthService.logActivity({
          adminId: req.admin.sub,
          adminEmail: req.admin.email,
          adminName: req.admin.fullName,
          activityType: AdminActivityType.USER_UPDATE,
          description: `Bulk ${action}: ${user.email}`,
          details: {
            targetId: userId,
            targetType: 'user',
            targetName: `${user.profile.firstName} ${user.profile.lastName}`,
            reason,
            metadata,
          },
          ipAddress: req.ip || req.connection.remoteAddress,
        })

        results.push({ userId, success: true, message: `${action} successful` })
      } catch (error) {
        results.push({
          userId,
          success: false,
          message: error.message || 'Unknown error',
        })
      }
    }

    return {
      success: true,
      data: results,
      message: 'Bulk action completed',
    }
  }

  @Get('stats/overview')
  @AdminPermissions(AdminPermission.VIEW_USERS)
  async getUserStats() {
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      verifiedUsers,
      pendingKyc,
      suspiciousUsers,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ accountStatus: 'active' }),
      this.userModel.countDocuments({ accountStatus: 'suspended' }),
      this.userModel.countDocuments({ kycStatus: 'verified' }),
      this.userModel.countDocuments({ kycStatus: 'pending' }),
      this.riskScoringService.getSuspiciousUsersCount(),
    ])

    return {
      success: true,
      data: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        verifiedUsers,
        pendingKyc,
        suspiciousUsers,
        registrationToday: await this.getUserRegistrationCount('today'),
        registrationWeek: await this.getUserRegistrationCount('week'),
        registrationMonth: await this.getUserRegistrationCount('month'),
      },
      message: 'User statistics retrieved successfully',
    }
  }

  // Helper methods
  private async getUserRecentActivity(
    userId: string,
    page = 1,
    limit = 20,
    type?: string
  ) {
    // This would integrate with your activity logging system
    // For now, return a placeholder structure
    return {
      activities: [],
      pagination: {
        page,
        limit,
        total: 0,
        pages: 0,
      },
    }
  }

  private async exportUsers(userIds: string[], req: any) {
    const users = await this.userModel
      .find({ _id: { $in: userIds } })
      .select('-passwordHash -twoFactorSecret -twoFactorBackupCodes')
      .exec()

    // Log the export activity
    await this.adminAuthService.logActivity({
      adminId: req.admin.sub,
      adminEmail: req.admin.email,
      adminName: req.admin.fullName,
      activityType: AdminActivityType.DATA_EXPORT,
      description: `Exported ${users.length} user records`,
      details: {
        exportType: 'user_data',
        recordCount: users.length,
        userIds,
      },
      ipAddress: req.ip || req.connection.remoteAddress,
    })

    return {
      success: true,
      data: {
        users,
        exportedAt: new Date(),
        exportedBy: req.admin.sub,
      },
      message: 'Users exported successfully',
    }
  }

  private async getUserRegistrationCount(period: 'today' | 'week' | 'month') {
    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
    }

    return this.userModel.countDocuments({
      createdAt: { $gte: startDate },
    })
  }
}
