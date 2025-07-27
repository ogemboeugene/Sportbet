import { IsString, IsEnum, IsOptional, IsObject, IsDateString, IsNumber, Min, Max } from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { Types } from 'mongoose'

export class CreateNotificationDto {
  @Transform(({ value }) => new Types.ObjectId(value))
  userId: Types.ObjectId

  @IsString()
  title: string

  @IsString()
  message: string

  @IsEnum([
    'bet_placed', 'bet_won', 'bet_lost', 'bet_void', 'bet_cashout',
    'deposit_success', 'deposit_failed', 'withdrawal_success', 'withdrawal_failed',
    'kyc_approved', 'kyc_rejected', 'kyc_pending',
    'security_alert', 'login_alert', 'password_changed',
    'limit_warning', 'session_timeout', 'self_exclusion',
    'promotion', 'bonus_awarded', 'system_maintenance',
    'account_suspended', 'account_verified'
  ])
  type: string

  @IsEnum(['email', 'push', 'sms', 'in_app'])
  channel: string

  @IsOptional()
  @IsEnum(['pending', 'sent', 'delivered', 'failed', 'read'])
  status?: string

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority?: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>

  @IsOptional()
  @IsObject()
  templateData?: Record<string, any>

  @IsOptional()
  @IsString()
  templateId?: string

  @IsOptional()
  @IsDateString()
  scheduledFor?: Date

  @IsOptional()
  @IsString()
  externalId?: string

  @IsOptional()
  @IsDateString()
  expiresAt?: Date

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxRetries?: number
}