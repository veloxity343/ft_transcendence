/**
 * Tournament Data Transfer Objects
 * Validation rules for tournament creation and management endpoints
 */
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  MinLength,
  MaxLength,
  Min,
  Max,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { BracketType } from '../game/types/tournament.types';

/**
 * DTO for creating a new tournament
 * Supports both online and local tournaments
 * Local tournaments require player names and can have any number of players (rounds to power of 2)
 */
export class CreateTournamentDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  name: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(2)
  @Max(32)
  maxPlayers: number;

  @IsEnum(BracketType)
  @IsOptional()
  bracketType?: BracketType;

  @IsBoolean()
  @IsOptional()
  isLocal?: boolean;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(2)
  @ArrayMaxSize(32)
  @IsOptional()
  localPlayerNames?: string[];
}

/**
 * Generic DTO for tournament actions that only need tournament ID
 * Used for join, leave, start, cancel actions
 */
export class TournamentIdDto {
  @IsNumber()
  @IsNotEmpty()
  tournamentId: number;
}

/**
 * DTO for marking player as ready for their match
 * Requires both tournament and specific match identification
 */
export class ReadyForMatchDto {
  @IsNumber()
  @IsNotEmpty()
  tournamentId: number;

  @IsString()
  @IsNotEmpty()
  matchId: string;
}

// Type aliases for semantic clarity - all use TournamentIdDto validation
export const JoinTournamentDto = TournamentIdDto;
export const LeaveTournamentDto = TournamentIdDto;
export const StartTournamentDto = TournamentIdDto;
export const CancelTournamentDto = TournamentIdDto;
export const TournamentActionDto = TournamentIdDto;

// Type exports for TypeScript
export type JoinTournamentDto = TournamentIdDto;
export type LeaveTournamentDto = TournamentIdDto;
export type StartTournamentDto = TournamentIdDto;
export type CancelTournamentDto = TournamentIdDto;
export type TournamentActionDto = TournamentIdDto;
