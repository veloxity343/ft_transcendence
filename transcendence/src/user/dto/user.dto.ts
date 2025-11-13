import { Exclude } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, IsEmail, MaxLength } from 'class-validator';

export class UserDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(65000)
  avatar: string;

  @IsNumber()
  @IsNotEmpty()
  gamesWon: number;

  @IsNumber()
  @IsNotEmpty()
  gamesLost: number;

  @IsNumber()
  @IsNotEmpty()
  gamesPlayed: number;

  @IsNumber()
  @IsNotEmpty()
  rank: number;

  @IsNumber()
  @IsNotEmpty()
  score: number;

  winRate: number;
  playTime: number;
  gameHistory: number[];

  friends: number[];
  adding: number[];  // pending sent invites
  added: number[];   // pending received invites
  blocks: number[];

  @Exclude()
  hash: string;

  @Exclude()
  hashedRtoken: string;

  @Exclude()
  twoFAsecret: string;
}
