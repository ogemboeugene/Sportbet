import { IsOptional, IsString, IsBoolean, IsIn } from 'class-validator'

export class UpdatePreferencesDto {
  @IsOptional()
  @IsIn(['light', 'dark'], { message: 'Theme must be either light or dark' })
  theme?: 'light' | 'dark'

  @IsOptional()
  @IsIn(['decimal', 'fractional', 'american'], { 
    message: 'Odds format must be decimal, fractional, or american' 
  })
  oddsFormat?: 'decimal' | 'fractional' | 'american'

  @IsOptional()
  @IsString({ message: 'Currency must be a string' })
  currency?: string

  @IsOptional()
  @IsString({ message: 'Language must be a string' })
  language?: string

  @IsOptional()
  notifications?: {
    email?: boolean
    push?: boolean
    sms?: boolean
  }
}