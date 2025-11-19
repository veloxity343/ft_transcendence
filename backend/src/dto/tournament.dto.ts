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

export class JoinTournamentDto {
  @IsNumber()
  @IsNotEmpty()
  tournamentId: number;
}

export class LeaveTournamentDto {
  @IsNumber()
  @IsNotEmpty()
  tournamentId: number;
}

export class StartTournamentDto {
  @IsNumber()
  @IsNotEmpty()
  tournamentId: number;
}

export class TournamentActionDto {
  @IsNumber()
  @IsNotEmpty()
  tournamentId: number;
}
