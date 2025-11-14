import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, IsNumber, IsOptional } from 'class-validator';

export class SignUpDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(50)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(32)
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}

export class SignInDto {
  @IsString()
  @IsNotEmpty()
  username: string; // can be email or username

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class AuthTokensDto {
  @IsString()
  @IsNotEmpty()
  access_token: string;

  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}

export class Auth42Dto {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsOptional()
  avatar?: string;
}
