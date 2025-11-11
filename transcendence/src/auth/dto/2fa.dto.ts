import { IsNotEmpty, IsString } from 'class-validator';

export class TwoFactorDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  twoFAcode: string;
}

export class VerifyTwoFactorDto {
  @IsNotEmpty()
  @IsString()
  twoFAcode: string;
}
