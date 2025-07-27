import { IsEmail, IsString, MinLength, IsEnum, IsOptional, IsArray, IsBoolean } from 'class-validator'
import { AdminRole, AdminPermission } from '../../../database/schemas/admin-user.schema'

export class AdminLoginDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(6)
  password: string
}

export class AdminRegisterDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(8)
  password: string

  @IsString()
  firstName: string

  @IsString()
  lastName: string

  @IsEnum(AdminRole)
  role: AdminRole

  @IsArray()
  @IsOptional()
  permissions?: AdminPermission[]

  @IsString()
  @IsOptional()
  department?: string

  @IsString()
  @IsOptional()
  employeeId?: string

  @IsString()
  @IsOptional()
  phoneNumber?: string
}

export class AdminVerify2FADto {
  @IsString()
  tempToken: string

  @IsString()
  token: string
}

export class AdminSetup2FADto {
  @IsString()
  token: string
}

export class AdminDisable2FADto {
  @IsString()
  token: string
}

export class AdminUpdateProfileDto {
  @IsString()
  @IsOptional()
  firstName?: string

  @IsString()
  @IsOptional()
  lastName?: string

  @IsString()
  @IsOptional()
  department?: string

  @IsString()
  @IsOptional()
  phoneNumber?: string
}

export class AdminUpdatePermissionsDto {
  @IsArray()
  @IsEnum(AdminPermission, { each: true })
  permissions: AdminPermission[]
}

export class AdminUpdateStatusDto {
  @IsBoolean()
  isActive: boolean

  @IsString()
  @IsOptional()
  reason?: string
}

export class AdminChangePasswordDto {
  @IsString()
  currentPassword: string

  @IsString()
  @MinLength(8)
  newPassword: string
}
