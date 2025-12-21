// Tournament types and enums

export enum TournamentStatus {
  REGISTRATION = 'registration',
  STARTING = 'starting',
  IN_PROGRESS = 'in_progress',
  FINISHED = 'finished',
  CANCELLED = 'cancelled',
}

export enum BracketType {
  SINGLE_ELIMINATION = 'single_elimination',
  DOUBLE_ELIMINATION = 'double_elimination',
}

export interface TournamentPlayer {
  userId: number;
  username: string;
  avatar: string;
  seed?: number;
  eliminatedInRound?: number;
  isVirtual?: boolean;
}

export interface TournamentMatch {
  matchId: string;
  round: number;
  matchNumber: number;
  player1Id: number | null;
  player2Id: number | null;
  player1Name?: string;
  player2Name?: string;
  player1Ready?: boolean;
  player2Ready?: boolean;
  winnerId?: number;
  gameId?: number;
  status: 'pending' | 'ready' | 'in_progress' | 'completed';
  scheduledTime?: Date;
}

export interface Tournament {
  id: number;
  name: string;
  creatorId: number;
  maxPlayers: number;
  currentPlayers: number;
  players: TournamentPlayer[];
  matches: TournamentMatch[];
  currentRound: number;
  totalRounds: number;
  bracketType: BracketType;
  status: TournamentStatus;
  winnerId?: number;
  winnerName?: string;
  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  isLocal: boolean;
  localPlayerNames?: string[];
}

export interface TournamentBracket {
  tournament: Tournament;
  rounds: TournamentRound[];
}

export interface TournamentRound {
  roundNumber: number;
  matches: TournamentMatch[];
  completed: boolean;
}

export interface TournamentStats {
  tournamentId: number;
  totalGames: number;
  completedGames: number;
  currentRound: number;
  totalRounds: number;
  playersRemaining: number;
  estimatedTimeRemaining?: number;
}
