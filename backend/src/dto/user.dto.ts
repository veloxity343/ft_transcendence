/**
 * User Data Transfer Objects
 * Validation rules for user profile and relationship management endpoints
 */
import { IsString, IsEmail, IsNotEmpty, IsNumber, MaxLength, MinLength } from 'class-validator';

/** DTO for updating username */
export class UpdateUsernameDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  username: string;
}

/** DTO for updating email address */
export class UpdateEmailDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(50)
  email: string;
}

/** DTO for changing password (requires current password for security) */
export class UpdatePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(32)
  newPassword: string;
}

/** DTO for user relationship actions (add friend, block, etc.) */
export class UserRelationshipDto {
  @IsNumber()
  @IsNotEmpty()
  targetUserId: number;
}
