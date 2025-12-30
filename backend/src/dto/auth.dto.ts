/**
 * Authentication Data Transfer Objects
 * Defines validation rules for authentication endpoints
 * Uses class-validator decorators for declarative validation
 */
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

/** DTO for user registration */
export class SignUpDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(50)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(32)
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  username: string;
}

/** DTO for user login */
export class SignInDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

/** DTO for completing 2FA challenge during login */
export class TwoFactorDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  twoFAcode: string;
}

/** DTO for verifying 2FA code when enabling/disabling */
export class VerifyTwoFactorDto {
  @IsNotEmpty()
  @IsString()
  twoFAcode: string;
}
