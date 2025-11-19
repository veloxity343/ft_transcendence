import { IsString, IsEmail, IsNotEmpty, IsNumber, MaxLength, MinLength } from 'class-validator';

export class UpdateUsernameDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  username: string;
}

export class UpdateEmailDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(50)
  email: string;
}

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

export class UserRelationshipDto {
  @IsNumber()
  @IsNotEmpty()
  targetUserId: number;
}
