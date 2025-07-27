import { IsOptional, IsString, IsEnum, IsBoolean, IsDateString, IsNumber, Min } from 'class-validator'
import { Transform, Type } from 'class-transformer'

export class NotificationFiltersDto {
  @IsOptional()
  @IsEnum([
    'bet_placed', 'bet_won', 'bet_lost', 'bet_void', 'bet_cashout',
    'deposit_success', 'deposit_failed', 'withdrawal_success', 'withdrawal_failed',
    'kyc_approved', 'kyc_rejected', 'kyc_pending',
    'security_alert', 'login_alert', 'password_changed',
    'limit_warning', 'session_timeout', 'self_exclusion',
    'promotion', 'bonus_awarded', 'system_maintenance',
    'account_suspended', 'account_verified'
  ])
  type?: string

  @IsOptional()
  @IsEnum(['email', 'push', 'sms', 'in_app'])
  channel?: string

  @IsOptional()
  @IsEnum(['pending', 'sent', 'delivered', 'failed', 'read'])
  status?: string

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority?: string

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isRead?: boolean

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isArchived?: boolean

  @IsOptional()
  @IsDateString()
  dateFrom?: string

  @IsOptional()
  @IsDateString()
  dateTo?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number
}