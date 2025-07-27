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
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard'
import { AdminRoleGuard } from '../auth/guards/admin-role.guard'
import { AdminRoles, AdminPermissions } from '../auth/decorators/admin.decorators'
import { AdminRole, AdminPermission } from '../../database/schemas/admin-user.schema'
import { AdminAuthService } from '../auth/services/admin-auth.service'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { AdminUser, AdminUserDocument } from '../../database/schemas/admin-user.schema'
import { AdminActivityType } from '../../database/schemas/admin-activity-log.schema'

@Controller('admin/management')
@UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
export class AdminManagementController {
  constructor(
    private readonly adminAuthService: AdminAuthService,
    @InjectModel(AdminUser.name) private adminUserModel: Model<AdminUserDocument>,
  ) {}

  @Get('admins')
  @AdminPermissions(AdminPermission.MANAGE_ADMINS)
  async getAllAdmins(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('role') role?: AdminRole,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    const query: any = {}
    
    if (role) query.role = role
    if (isActive !== undefined) query.isActive = isActive === 'true'
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
      ]
    }

    const skip = (page - 1) * limit

    const [admins, total] = await Promise.all([
      this.adminUserModel
        .find(query)
        .select('-passwordHash -twoFactorSecret -twoFactorBackupCodes')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.adminUserModel.countDocuments(query),
    ])

    return {
      success: true,
      data: {
        admins,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      message: 'Admins retrieved successfully',
    }
  }

  @Get('admins/:adminId')
  @AdminPermissions(AdminPermission.MANAGE_ADMINS)
  async getAdminById(@Param('adminId') adminId: string) {
    const admin = await this.adminUserModel
      .findById(adminId)
      .select('-passwordHash -twoFactorSecret -twoFactorBackupCodes')
      .exec()

    if (!admin) {
      return {
        success: false,
        message: 'Admin not found',
      }
    }

    return {
      success: true,
      data: admin,
      message: 'Admin details retrieved successfully',
    }
  }

  @Put('admins/:adminId')
  @AdminPermissions(AdminPermission.MANAGE_ADMINS)
  async updateAdmin(
    @Param('adminId') adminId: string,
    @Body() updateData: {
      firstName?: string
      lastName?: string
      department?: string
      phoneNumber?: string
      role?: AdminRole
      permissions?: AdminPermission[]
      isActive?: boolean
    },
    @Request() req,
  ) {
    const targetAdmin = await this.adminUserModel.findById(adminId)
    if (!targetAdmin) {
      return {
        success: false,
        message: 'Admin not found',
      }
    }

    // Prevent self-deactivation
    if (adminId === req.admin.sub && updateData.isActive === false) {
      return {
        success: false,
        message: 'Cannot deactivate your own account',
      }
    }

    // Prevent non-super-admins from changing super-admin accounts
    if (
      targetAdmin.role === AdminRole.SUPER_ADMIN &&
      req.admin.role !== AdminRole.SUPER_ADMIN
    ) {
      return {
        success: false,
        message: 'Only super admins can modify super admin accounts',
      }
    }

    const oldValues = {
      firstName: targetAdmin.firstName,
      lastName: targetAdmin.lastName,
      department: targetAdmin.department,
      phoneNumber: targetAdmin.phoneNumber,
      role: targetAdmin.role,
      permissions: [...targetAdmin.permissions],
      isActive: targetAdmin.isActive,
    }

    await targetAdmin.updateOne({
      ...updateData,
      lastModifiedBy: req.admin.sub,
      updatedAt: new Date(),
    })

    await this.adminAuthService.logActivity({
      adminId: req.admin.sub,
      adminEmail: req.admin.email,
      adminName: req.admin.fullName,
      activityType: AdminActivityType.ADMIN_UPDATE,
      description: `Updated admin: ${targetAdmin.email}`,
      details: {
        targetId: adminId,
        targetType: 'admin',
        targetName: targetAdmin.fullName,
        oldValues,
        newValues: updateData,
      },
      ipAddress: req.ip || req.connection.remoteAddress,
    })

    return {
      success: true,
      message: 'Admin updated successfully',
    }
  }

  @Delete('admins/:adminId')
  @AdminRoles(AdminRole.SUPER_ADMIN)
  @AdminPermissions(AdminPermission.MANAGE_ADMINS)
  async deleteAdmin(@Param('adminId') adminId: string, @Request() req) {
    const targetAdmin = await this.adminUserModel.findById(adminId)
    if (!targetAdmin) {
      return {
        success: false,
        message: 'Admin not found',
      }
    }

    // Prevent self-deletion
    if (adminId === req.admin.sub) {
      return {
        success: false,
        message: 'Cannot delete your own account',
      }
    }

    await this.adminUserModel.findByIdAndDelete(adminId)

    await this.adminAuthService.logActivity({
      adminId: req.admin.sub,
      adminEmail: req.admin.email,
      adminName: req.admin.fullName,
      activityType: AdminActivityType.ADMIN_DELETE,
      description: `Deleted admin: ${targetAdmin.email}`,
      details: {
        targetId: adminId,
        targetType: 'admin',
        targetName: targetAdmin.fullName,
      },
      ipAddress: req.ip || req.connection.remoteAddress,
    })

    return {
      success: true,
      message: 'Admin deleted successfully',
    }
  }

  @Get('roles')
  async getAvailableRoles() {
    return {
      success: true,
      data: Object.values(AdminRole),
      message: 'Available roles retrieved successfully',
    }
  }

  @Get('permissions')
  async getAvailablePermissions() {
    return {
      success: true,
      data: Object.values(AdminPermission),
      message: 'Available permissions retrieved successfully',
    }
  }

  @Get('permissions/by-role/:role')
  async getPermissionsByRole(@Param('role') role: AdminRole) {
    const { getDefaultPermissionsByRole } = await import('../../database/schemas/admin-user.schema')
    const permissions = getDefaultPermissionsByRole(role)
    
    return {
      success: true,
      data: permissions,
      message: `Default permissions for ${role} retrieved successfully`,
    }
  }

  @Get('stats')
  @AdminPermissions(AdminPermission.VIEW_AUDIT_LOGS)
  async getAdminStats() {
    const [
      totalAdmins,
      activeAdmins,
      adminsByRole,
      recentActivity,
    ] = await Promise.all([
      this.adminUserModel.countDocuments(),
      this.adminUserModel.countDocuments({ isActive: true }),
      this.adminUserModel.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
      this.adminAuthService.getActivityLogs({
        limit: 10,
        page: 1,
      }),
    ])

    return {
      success: true,
      data: {
        totalAdmins,
        activeAdmins,
        inactiveAdmins: totalAdmins - activeAdmins,
        adminsByRole,
        recentActivity: recentActivity.logs,
      },
      message: 'Admin statistics retrieved successfully',
    }
  }

  @Post('bulk-actions')
  @AdminRoles(AdminRole.SUPER_ADMIN)
  @AdminPermissions(AdminPermission.MANAGE_ADMINS)
  async bulkActions(
    @Body() bulkData: {
      action: 'activate' | 'deactivate' | 'delete'
      adminIds: string[]
      reason?: string
    },
    @Request() req,
  ) {
    const { action, adminIds, reason } = bulkData

    if (adminIds.includes(req.admin.sub)) {
      return {
        success: false,
        message: 'Cannot perform bulk action on your own account',
      }
    }

    const results = []

    for (const adminId of adminIds) {
      try {
        const targetAdmin = await this.adminUserModel.findById(adminId)
        if (!targetAdmin) {
          results.push({ adminId, success: false, message: 'Admin not found' })
          continue
        }

        switch (action) {
          case 'activate':
            await targetAdmin.updateOne({ isActive: true })
            break
          case 'deactivate':
            await targetAdmin.updateOne({ isActive: false })
            break
          case 'delete':
            await this.adminUserModel.findByIdAndDelete(adminId)
            break
        }

        await this.adminAuthService.logActivity({
          adminId: req.admin.sub,
          adminEmail: req.admin.email,
          adminName: req.admin.fullName,
          activityType: 
            action === 'delete' ? AdminActivityType.ADMIN_DELETE : AdminActivityType.ADMIN_UPDATE,
          description: `Bulk ${action}: ${targetAdmin.email}`,
          details: {
            targetId: adminId,
            targetType: 'admin',
            targetName: targetAdmin.fullName,
            reason,
          },
          ipAddress: req.ip || req.connection.remoteAddress,
        })

        results.push({ adminId, success: true, message: `${action} successful` })
      } catch (error) {
        results.push({ 
          adminId, 
          success: false, 
          message: error.message || 'Unknown error' 
        })
      }
    }

    return {
      success: true,
      data: results,
      message: 'Bulk action completed',
    }
  }
}
