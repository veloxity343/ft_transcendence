import { IsEnum, IsNotEmpty, IsNumber, Min, Max } from 'class-validator';
import { PaddleDirection } from '../types/game.types';

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
