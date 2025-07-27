import { 
  IsEmail, 
  IsString, 
  MinLength, 
  MaxLength, 
  IsDateString,
  IsOptional,
  IsISO31661Alpha2,
  Matches,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator'

@ValidatorConstraint({ name: 'phoneNumber', async: false })
export class PhoneNumberValidator implements ValidatorConstraintInterface {
  validate(phoneNumber: string): boolean {
    // Basic phone number validation - allows various formats
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,15}$/
    return phoneRegex.test(phoneNumber)
  }

  defaultMessage(): string {
    return 'Please provide a valid phone number'
  }
}

export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string

  @IsString({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    { message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' }
  )
  password: string

  @IsOptional()
  @IsString()
  confirmPassword?: string

  @IsString({ message: 'First name is required' })
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  firstName: string

  @IsString({ message: 'Last name is required' })
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  lastName: string

  @IsDateString({}, { message: 'Please provide a valid date of birth' })
  dateOfBirth: string

  @IsString({ message: 'Phone number is required' })
  @Validate(PhoneNumberValidator)
  phoneNumber: string

  @IsISO31661Alpha2({ message: 'Please provide a valid country code' })
  country: string
}