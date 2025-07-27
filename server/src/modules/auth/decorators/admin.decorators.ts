import { SetMetadata } from '@nestjs/common'
import { AdminRole, AdminPermission } from '../../../database/schemas/admin-user.schema'
import { ADMIN_ROLES_KEY, ADMIN_PERMISSIONS_KEY } from '../guards/admin-role.guard'

export const AdminRoles = (...roles: AdminRole[]) => SetMetadata(ADMIN_ROLES_KEY, roles)
export const AdminPermissions = (...permissions: AdminPermission[]) => SetMetadata(ADMIN_PERMISSIONS_KEY, permissions)
