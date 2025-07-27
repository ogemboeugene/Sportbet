import { IsString, Length } from 'class-validator'

export class Setup2FADto {
  @IsString({ message: 'Token is required' })
  @Length(6, 6, { message: 'Token must be exactly 6 digits' })
  token: string
}

export class Verify2FADto {
  @IsString({ message: 'Token is required' })
  @Length(6, 6, { message: 'Token must be exactly 6 digits' })
  token: string
}

export class Disable2FADto {
  @IsString({ message: 'Token is required' })
  @Length(6, 6, { message: 'Token must be exactly 6 digits' })
  token: string
}