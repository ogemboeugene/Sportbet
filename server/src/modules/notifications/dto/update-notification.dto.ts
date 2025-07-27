import { PartialType } from '@nestjs/mapped-types'
import { IsOptional, IsBoolean, IsDateString, IsString, IsEnum } from 'class-validator'
import { CreateNotificationDto } from './create-notification.dto'

export class UpdateNotificationDto extends PartialType(CreateNotificationDto) {
  @IsOptional()
  @IsEnum(['pending', 'sent', 'delivered', 'failed', 'read'])
  status?: string

  @IsOptional()
  @IsBoolean()
  isRead?: boolean

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean

  @IsOptional()
  @IsDateString()
  sentAt?: Date

  @IsOptional()
  @IsDateString()
  deliveredAt?: Date

  @IsOptional()
  @IsDateString()
  readAt?: Date

  @IsOptional()
  @IsString()
  failureReason?: string

  @IsOptional()
  retryCount?: number
}