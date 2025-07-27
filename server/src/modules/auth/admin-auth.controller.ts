import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Request,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import { AdminAuthService } from './services/admin-auth.service'
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard'
import { AdminRoleGuard } from './guards/admin-role.guard'
import { AdminRoles, AdminPermissions } from './decorators/admin.decorators'
import { AdminRole, AdminPermission } from '../../database/schemas/admin-user.schema'
import { AdminActivityType } from '../../database/schemas/admin-activity-log.schema'
import {
  AdminLoginDto,
  AdminRegisterDto,
  AdminVerify2FADto,
  AdminSetup2FADto,
  AdminDisable2FADto,
  AdminUpdateProfileDto,
  AdminUpdatePermissionsDto,
  AdminUpdateStatusDto,
  AdminChangePasswordDto
} from './dto/admin-auth.dto'

@Controller('admin/auth')
@UseGuards(ThrottlerGuard)
export class AdminAuthController {
  constructor(private adminAuthService: AdminAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: AdminLoginDto, @Request() req) {
    const ipAddress = req.ip || req.connection.remoteAddress
    const userAgent = req.get('User-Agent')
    
    const result = await this.adminAuthService.adminLogin(
      loginDto.email,
      loginDto.password,
      ipAddress,
      userAgent
    )
    
    if (result.requiresTwoFactor) {
      return {
        success: true,
        data: result,
        message: result.message
      }
    }

    return {
      success: true,
      data: result,
      message: 'Admin login successful'
    }
  }

  @Post('verify-2fa')
  @HttpCode(HttpStatus.OK)
  async verifyTwoFactor(@Body() verifyDto: AdminVerify2FADto, @Request() req) {
    const ipAddress = req.ip || req.connection.remoteAddress
    const userAgent = req.get('User-Agent')
    
    const result = await this.adminAuthService.verifyAdminTwoFactor(
      verifyDto.tempToken,
      verifyDto.token,
      ipAddress,
      userAgent
    )
    
    return {
      success: true,
      data: result,
      message: 'Two-factor authentication successful'
    }
  }

  @Post('logout')
  @UseGuards(AdminJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req) {
    const ipAddress = req.ip || req.connection.remoteAddress
    
    await this.adminAuthService.adminLogout(
      req.admin.sub,
      req.admin.sessionId,
      ipAddress
    )
    
    return {
      success: true,
      message: 'Logged out successfully'
    }
  }

  @Get('me')
  @UseGuards(AdminJwtAuthGuard)
  async getProfile(@Request() req) {
    return {
      success: true,
      data: req.admin,
      message: 'Admin profile retrieved successfully'
    }
  }

  @Post('setup-2fa')
  @UseGuards(AdminJwtAuthGuard)
  async setup2FA(@Request() req) {
    const result = await this.adminAuthService.setup2FA(req.admin.sub)
    return {
      success: true,
      data: result,
      message: 'Two-factor authentication setup initiated'
    }
  }

  @Post('enable-2fa')
  @UseGuards(AdminJwtAuthGuard)
  async enable2FA(@Request() req, @Body() enableDto: AdminSetup2FADto) {
    const result = await this.adminAuthService.enable2FA(req.admin.sub, enableDto.token)
    return {
      success: true,
      data: result,
      message: result.message
    }
  }

  @Post('disable-2fa')
  @UseGuards(AdminJwtAuthGuard)
  async disable2FA(@Request() req, @Body() disableDto: AdminDisable2FADto) {
    const result = await this.adminAuthService.disable2FA(req.admin.sub, disableDto.token)
    return {
      success: true,
      message: result.message
    }
  }

  @Get('sessions')
  @UseGuards(AdminJwtAuthGuard)
  async getSessions(@Request() req) {
    const sessions = await this.adminAuthService.getAdminSessions(req.admin.sub)
    return {
      success: true,
      data: sessions,
      message: 'Active sessions retrieved successfully'
    }
  }

  @Delete('sessions/:sessionId')
  @UseGuards(AdminJwtAuthGuard)
  async terminateSession(@Request() req, @Param('sessionId') sessionId: string) {
    await this.adminAuthService.terminateSession(
      req.admin.sub,
      sessionId,
      req.admin.sub,
      'manual_termination'
    )
    
    return {
      success: true,
      message: 'Session terminated successfully'
    }
  }

  @Get('activity-logs')
  @UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
  @AdminPermissions(AdminPermission.VIEW_AUDIT_LOGS)
  async getActivityLogs(
    @Query('adminId') adminId?: string,
    @Query('activityType') activityType?: AdminActivityType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
  ) {
    const filters: any = { page, limit }
    
    if (adminId) filters.adminId = adminId
    if (activityType) filters.activityType = activityType
    if (startDate) filters.startDate = new Date(startDate)
    if (endDate) filters.endDate = new Date(endDate)
    
    const result = await this.adminAuthService.getActivityLogs(filters)
    
    return {
      success: true,
      data: result,
      message: 'Activity logs retrieved successfully'
    }
  }

  @Post('register')
  @UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
  @AdminPermissions(AdminPermission.MANAGE_ADMINS)
  async register(@Body() registerDto: AdminRegisterDto, @Request() req) {
    const result = await this.adminAuthService.createAdmin({
      ...registerDto,
      createdBy: req.admin.sub
    })
    
    return {
      success: true,
      data: {
        id: (result as any)._id.toString(),
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        role: result.role
      },
      message: 'Admin account created successfully'
    }
  }

  @Put('profile')
  @UseGuards(AdminJwtAuthGuard)
  async updateProfile(@Request() req, @Body() updateDto: AdminUpdateProfileDto) {
    const admin = await this.adminAuthService.validateAdminById(req.admin.sub)
    if (!admin) {
      return {
        success: false,
        message: 'Admin not found'
      }
    }

    await admin.updateOne(updateDto)

    await this.adminAuthService.logActivity({
      adminId: req.admin.sub,
      adminEmail: admin.email,
      adminName: admin.fullName,
      activityType: AdminActivityType.PROFILE_UPDATE,
      description: 'Updated admin profile',
      details: {
        oldValues: {
          firstName: admin.firstName,
          lastName: admin.lastName,
          department: admin.department,
          phoneNumber: admin.phoneNumber
        },
        newValues: updateDto
      },
      ipAddress: req.ip || req.connection.remoteAddress
    })

    return {
      success: true,
      message: 'Profile updated successfully'
    }
  }

  @Put(':adminId/permissions')
  @UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @AdminPermissions(AdminPermission.MANAGE_ADMINS)
  async updatePermissions(
    @Param('adminId') adminId: string,
    @Body() updateDto: AdminUpdatePermissionsDto,
    @Request() req
  ) {
    const targetAdmin = await this.adminAuthService.validateAdminById(adminId)
    if (!targetAdmin) {
      return {
        success: false,
        message: 'Admin not found'
      }
    }

    const oldPermissions = [...targetAdmin.permissions]
    await targetAdmin.updateOne({ permissions: updateDto.permissions })

    await this.adminAuthService.logActivity({
      adminId: req.admin.sub,
      adminEmail: req.admin.email,
      adminName: req.admin.fullName,
      activityType: AdminActivityType.PERMISSION_CHANGE,
      description: `Updated permissions for admin: ${targetAdmin.email}`,
      details: {
        targetId: adminId,
        targetType: 'admin',
        targetName: targetAdmin.fullName,
        oldValues: { permissions: oldPermissions },
        newValues: { permissions: updateDto.permissions }
      },
      ipAddress: req.ip || req.connection.remoteAddress
    })

    return {
      success: true,
      message: 'Permissions updated successfully'
    }
  }

  @Put(':adminId/status')
  @UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @AdminPermissions(AdminPermission.MANAGE_ADMINS)
  async updateStatus(
    @Param('adminId') adminId: string,
    @Body() updateDto: AdminUpdateStatusDto,
    @Request() req
  ) {
    const targetAdmin = await this.adminAuthService.validateAdminById(adminId)
    if (!targetAdmin) {
      return {
        success: false,
        message: 'Admin not found'
      }
    }

    // Prevent self-deactivation
    if (adminId === req.admin.sub && !updateDto.isActive) {
      return {
        success: false,
        message: 'Cannot deactivate your own account'
      }
    }

    const oldStatus = targetAdmin.isActive
    await targetAdmin.updateOne({ isActive: updateDto.isActive })

    await this.adminAuthService.logActivity({
      adminId: req.admin.sub,
      adminEmail: req.admin.email,
      adminName: req.admin.fullName,
      activityType: updateDto.isActive ? AdminActivityType.ADMIN_UPDATE : AdminActivityType.ADMIN_UPDATE,
      description: `${updateDto.isActive ? 'Activated' : 'Deactivated'} admin: ${targetAdmin.email}`,
      details: {
        targetId: adminId,
        targetType: 'admin',
        targetName: targetAdmin.fullName,
        oldValues: { isActive: oldStatus },
        newValues: { isActive: updateDto.isActive },
        reason: updateDto.reason
      },
      ipAddress: req.ip || req.connection.remoteAddress
    })

    return {
      success: true,
      message: `Admin ${updateDto.isActive ? 'activated' : 'deactivated'} successfully`
    }
  }

  @Post('change-password')
  @UseGuards(AdminJwtAuthGuard)
  async changePassword(@Request() req, @Body() changePasswordDto: AdminChangePasswordDto) {
    const admin = await this.adminAuthService.validateAdminById(req.admin.sub)
    if (!admin) {
      return {
        success: false,
        message: 'Admin not found'
      }
    }

    // Verify current password
    const bcrypt = require('bcrypt')
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      admin.passwordHash
    )

    if (!isCurrentPasswordValid) {
      return {
        success: false,
        message: 'Current password is incorrect'
      }
    }

    // Hash new password with proper salt rounds
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10)
    const newPasswordHash = await bcrypt.hash(changePasswordDto.newPassword, saltRounds)

    await admin.updateOne({
      passwordHash: newPasswordHash,
      passwordChangedAt: new Date()
    })

    await this.adminAuthService.logActivity({
      adminId: req.admin.sub,
      adminEmail: admin.email,
      adminName: admin.fullName,
      activityType: AdminActivityType.PASSWORD_CHANGE,
      description: 'Changed admin password',
      ipAddress: req.ip || req.connection.remoteAddress
    })

    return {
      success: true,
      message: 'Password changed successfully'
    }
  }
}
