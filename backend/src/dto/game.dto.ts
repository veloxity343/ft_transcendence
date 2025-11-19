import { IsEnum, IsNotEmpty, IsNumber } from 'class-validator';

export enum PaddleDirection {
  NONE = 0,
  UP = 1,
  DOWN = 2,
}

export class MovePaddleDto {
  @IsNumber()
  @IsNotEmpty()
  gameId: number;

  @IsEnum(PaddleDirection)
  @IsNotEmpty()
  direction: PaddleDirection;
}

export class JoinPrivateGameDto {
  @IsNumber()
  @IsNotEmpty()
  gameId: number;
}

export class GameInvitationDto {
  @IsNumber()
  @IsNotEmpty()
  targetUserId: number;
}
