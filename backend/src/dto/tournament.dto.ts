import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { BracketType } from '../game/types/tournament.types';

export class CreateTournamentDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  name: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(4)
  @Max(32)
  maxPlayers: number;

  @IsEnum(BracketType)
  @IsOptional()
  bracketType?: BracketType;
}

// Generic DTO for tournament actions that only need tournament ID
export class TournamentIdDto {
  @IsNumber()
  @IsNotEmpty()
  tournamentId: number;
}

// Aliases for semantic clarity (all use the same validation)
export const JoinTournamentDto = TournamentIdDto;
export const LeaveTournamentDto = TournamentIdDto;
export const StartTournamentDto = TournamentIdDto;
export const CancelTournamentDto = TournamentIdDto;

// Type exports for TypeScript
export type JoinTournamentDto = TournamentIdDto;
export type LeaveTournamentDto = TournamentIdDto;
export type StartTournamentDto = TournamentIdDto;
export type CancelTournamentDto = TournamentIdDto;
