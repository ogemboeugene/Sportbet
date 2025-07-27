import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UssdRequestDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  serviceCode: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsOptional()
  text?: string;

  @IsString()
  @IsOptional()
  networkCode?: string;
}