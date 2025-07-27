import { IsOptional, IsString, IsDateString, IsPhoneNumber, Length, IsEmail } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(2, 50)
  lastName?: string;

  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @Length(5, 200)
  address?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  city?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  country?: string;

  @IsOptional()
  @IsString()
  @Length(3, 20)
  postalCode?: string;
}
