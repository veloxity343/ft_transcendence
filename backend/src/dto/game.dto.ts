/**
 * Game Data Transfer Objects
 * Validation rules for game-related WebSocket and HTTP endpoints
 */
import { IsEnum, IsNotEmpty, IsNumber } from 'class-validator';

/** Paddle movement directions */
export enum PaddleDirection {
  NONE = 0,
  UP = 1,
  DOWN = 2,
}

/** DTO for paddle movement input */
export class MovePaddleDto {
  @IsNumber()
  @IsNotEmpty()
  gameId: number;

  @IsEnum(PaddleDirection)
  @IsNotEmpty()
  direction: PaddleDirection;
}

/** DTO for joining a private game */
export class JoinPrivateGameDto {
  @IsNumber()
  @IsNotEmpty()
  gameId: number;
}

/** DTO for sending a game invitation */
export class GameInvitationDto {
  @IsNumber()
  @IsNotEmpty()
  targetUserId: number;
}
