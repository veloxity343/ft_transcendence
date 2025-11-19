import { PrismaClient } from '@prisma/client';
import { UserService } from './user.service';
import { GameService } from './game.service';
import { ConnectionManager } from '../websocket/connection.manager';
import {
  Tournament,
  TournamentStatus,
  BracketType,
  TournamentPlayer,
  TournamentMatch,
  TournamentBracket,
  TournamentRound,
  TournamentStats,
} from '../game/types/tournament.types';

export class TournamentService {
  private tournaments = new Map<number, Tournament>();
  private activeTournamentGames = new Map<number, number>(); // gameId -> tournamentId

  constructor(
    private prisma: PrismaClient,
    private userService: UserService,
    private gameService: GameService,
    private connectionManager: ConnectionManager,
  ) {
    // Listen for game endings to progress tournaments
    this.setupGameEndListener();
  }

  // ==================== TOURNAMENT CREATION ====================

  async createTournament(
    creatorId: number,
    name: string,
    maxPlayers: number,
    bracketType: BracketType = BracketType.SINGLE_ELIMINATION,
  ): Promise<Tournament> {
    // Validate max players is power of 2 for single elimination
    if (bracketType === BracketType.SINGLE_ELIMINATION) {
      if (!this.isPowerOfTwo(maxPlayers)) {
        throw new Error('Max players must be a power of 2 (4, 8, 16, 32)');
      }
    }

    const tournamentId = await this.generateTournamentId();
    const totalRounds = Math.log2(maxPlayers);

    const tournament: Tournament = {
      id: tournamentId,
      name,
      creatorId,
      maxPlayers,
      currentPlayers: 0,
      players: [],
      matches: [],
      currentRound: 0,
      totalRounds,
      bracketType,
      status: TournamentStatus.REGISTRATION,
      createdAt: new Date(),
    };

    this.tournaments.set(tournamentId, tournament);

    // Broadcast tournament created
    this.connectionManager.broadcast('tournament:created', {
      tournamentId,
      name,
      maxPlayers,
      creatorId,
    });

    return tournament;
  }

  // ==================== PLAYER MANAGEMENT ====================

  async joinTournament(userId: number, tournamentId: number): Promise<void> {
    const tournament = this.tournaments.get(tournamentId);

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== TournamentStatus.REGISTRATION) {
      throw new Error('Tournament is not open for registration');
    }

    if (tournament.currentPlayers >= tournament.maxPlayers) {
      throw new Error('Tournament is full');
    }

    if (tournament.players.some(p => p.userId === userId)) {
      throw new Error('Already registered for this tournament');
    }

    // Get user info
    const user = await this.userService.getUser(userId);

    const player: TournamentPlayer = {
      userId,
      username: user.username,
      avatar: user.avatar,
    };

    tournament.players.push(player);
    tournament.currentPlayers++;

    // Broadcast player joined
    this.broadcastToTournament(tournamentId, 'tournament:player-joined', {
      tournamentId,
      player,
      currentPlayers: tournament.currentPlayers,
    });

    // Auto-start if full
    if (tournament.currentPlayers === tournament.maxPlayers) {
      setTimeout(() => {
        this.startTournament(tournamentId, tournament.creatorId).catch(err => {
          console.error('Auto-start tournament error:', err);
        });
      }, 3000);
    }
  }

  async leaveTournament(userId: number, tournamentId: number): Promise<void> {
    const tournament = this.tournaments.get(tournamentId);

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== TournamentStatus.REGISTRATION) {
      throw new Error('Cannot leave tournament after it has started');
    }

    const playerIndex = tournament.players.findIndex(p => p.userId === userId);

    if (playerIndex === -1) {
      throw new Error('Not registered for this tournament');
    }

    tournament.players.splice(playerIndex, 1);
    tournament.currentPlayers--;

    this.broadcastToTournament(tournamentId, 'tournament:player-left', {
      tournamentId,
      userId,
      currentPlayers: tournament.currentPlayers,
    });
  }

  // ==================== TOURNAMENT START ====================

  async startTournament(tournamentId: number, requesterId: number): Promise<void> {
    const tournament = this.tournaments.get(tournamentId);

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.creatorId !== requesterId) {
      throw new Error('Only tournament creator can start the tournament');
    }

    if (tournament.status !== TournamentStatus.REGISTRATION) {
      throw new Error('Tournament has already started');
    }

    if (tournament.currentPlayers < 2) {
      throw new Error('Need at least 2 players to start tournament');
    }

    // If not full, adjust bracket size
    if (tournament.currentPlayers < tournament.maxPlayers) {
      const nextPowerOfTwo = this.nextPowerOfTwo(tournament.currentPlayers);
      tournament.maxPlayers = nextPowerOfTwo;
      tournament.totalRounds = Math.log2(nextPowerOfTwo);
    }

    tournament.status = TournamentStatus.STARTING;
    tournament.startedAt = new Date();

    // Seed players (could be based on rank, for now random)
    this.seedPlayers(tournament);

    // Generate bracket
    this.generateBracket(tournament);

    tournament.status = TournamentStatus.IN_PROGRESS;
    tournament.currentRound = 1;

    this.broadcastToTournament(tournamentId, 'tournament:started', {
      tournamentId,
      bracket: this.getTournamentBracket(tournamentId),
    });

    // Start first round matches
    await this.startRoundMatches(tournamentId, 1);
  }

  // ==================== BRACKET GENERATION ====================

  private seedPlayers(tournament: Tournament): void {
    // Shuffle players for random seeding (could use ELO for better seeding)
    const shuffled = [...tournament.players].sort(() => Math.random() - 0.5);

    shuffled.forEach((player, index) => {
      player.seed = index + 1;
    });

    tournament.players = shuffled;
  }

  private generateBracket(tournament: Tournament): void {
    const totalMatches = tournament.maxPlayers - 1; // Total matches in single elimination
    let matchId = 0;

    // Generate all rounds
    for (let round = 1; round <= tournament.totalRounds; round++) {
      const matchesInRound = Math.pow(2, tournament.totalRounds - round);

      for (let matchNum = 0; matchNum < matchesInRound; matchNum++) {
        const match: TournamentMatch = {
          matchId: `T${tournament.id}-R${round}-M${matchNum}`,
          round,
          matchNumber: matchNum,
          player1Id: null,
          player2Id: null,
          status: 'pending',
        };

        // First round: assign players directly
        if (round === 1) {
          const player1Index = matchNum * 2;
          const player2Index = matchNum * 2 + 1;

          if (player1Index < tournament.players.length) {
            match.player1Id = tournament.players[player1Index].userId;
            match.player1Name = tournament.players[player1Index].username;
          }

          if (player2Index < tournament.players.length) {
            match.player2Id = tournament.players[player2Index].userId;
            match.player2Name = tournament.players[player2Index].username;
          }

          // If both players exist, match is ready
          if (match.player1Id && match.player2Id) {
            match.status = 'ready';
          } else if (match.player1Id && !match.player2Id) {
            // Bye - player1 advances automatically
            match.winnerId = match.player1Id;
            match.status = 'completed';
          }
        }

        tournament.matches.push(match);
        matchId++;
      }
    }
  }

  // ==================== MATCH MANAGEMENT ====================

  private async startRoundMatches(tournamentId: number, round: number): Promise<void> {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return;

    const roundMatches = tournament.matches.filter(
      m => m.round === round && m.status === 'ready'
    );

    if (roundMatches.length === 0) {
      // No matches ready, check if round is complete
      await this.checkRoundCompletion(tournamentId, round);
      return;
    }

    // Notify players of their matches
    for (const match of roundMatches) {
      if (match.player1Id && match.player2Id) {
        this.connectionManager.emitToUser(match.player1Id, 'tournament:match-ready', {
          tournamentId,
          matchId: match.matchId,
          opponent: {
            id: match.player2Id,
            name: match.player2Name,
          },
          round: match.round,
        });

        this.connectionManager.emitToUser(match.player2Id, 'tournament:match-ready', {
          tournamentId,
          matchId: match.matchId,
          opponent: {
            id: match.player1Id,
            name: match.player1Name,
          },
          round: match.round,
        });
      }
    }

    // Broadcast round started
    this.broadcastToTournament(tournamentId, 'tournament:round-started', {
      tournamentId,
      round,
      matches: roundMatches.map(m => ({
        matchId: m.matchId,
        player1Name: m.player1Name,
        player2Name: m.player2Name,
      })),
    });
  }

  async startTournamentMatch(
    tournamentId: number,
    matchId: string,
    player1Id: number,
    player2Id: number,
  ): Promise<number> {
    const tournament = this.tournaments.get(tournamentId);

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    const match = tournament.matches.find(m => m.matchId === matchId);

    if (!match) {
      throw new Error('Match not found');
    }

    if (match.status !== 'ready') {
      throw new Error('Match is not ready to start');
    }

    // Use game service to create the game
    // This assumes you have the game service available
    // The game will be handled by your existing game system

    match.status = 'in_progress';

    return 0; // Return game ID once integrated with game service
  }

  async recordMatchResult(
    tournamentId: number,
    gameId: number,
    winnerId: number,
  ): Promise<void> {
    const tournament = this.tournaments.get(tournamentId);

    if (!tournament) {
      console.error(`Tournament ${tournamentId} not found for game ${gameId}`);
      return;
    }

    // Find the match associated with this game
    const match = tournament.matches.find(m => m.gameId === gameId);

    if (!match) {
      console.error(`Match not found for game ${gameId} in tournament ${tournamentId}`);
      return;
    }

    match.winnerId = winnerId;
    match.status = 'completed';

    // Broadcast match completed
    this.broadcastToTournament(tournamentId, 'tournament:match-completed', {
      tournamentId,
      matchId: match.matchId,
      winnerId,
      round: match.round,
    });

    // Check if round is complete
    await this.checkRoundCompletion(tournamentId, match.round);
  }

  private async checkRoundCompletion(tournamentId: number, round: number): Promise<void> {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return;

    const roundMatches = tournament.matches.filter(m => m.round === round);
    const allCompleted = roundMatches.every(m => m.status === 'completed');

    if (!allCompleted) return;

    // Round is complete, advance winners to next round
    if (round < tournament.totalRounds) {
      this.advanceWinners(tournament, round);
      tournament.currentRound = round + 1;

      this.broadcastToTournament(tournamentId, 'tournament:round-completed', {
        tournamentId,
        round,
        nextRound: round + 1,
      });

      // Start next round after delay
      setTimeout(() => {
        this.startRoundMatches(tournamentId, round + 1);
      }, 5000);
    } else {
      // Tournament is complete
      await this.completeTournament(tournamentId);
    }
  }

  private advanceWinners(tournament: Tournament, completedRound: number): void {
    const nextRound = completedRound + 1;
    const completedMatches = tournament.matches.filter(
      m => m.round === completedRound && m.status === 'completed'
    );

    const nextRoundMatches = tournament.matches.filter(m => m.round === nextRound);

    // Each pair of matches from current round feeds into one match in next round
    for (let i = 0; i < completedMatches.length; i += 2) {
      const match1 = completedMatches[i];
      const match2 = completedMatches[i + 1];
      const nextMatch = nextRoundMatches[Math.floor(i / 2)];

      if (nextMatch) {
        // Winner of match1 becomes player1 of next match
        nextMatch.player1Id = match1.winnerId || null;
        nextMatch.player1Name = tournament.players.find(
          p => p.userId === match1.winnerId
        )?.username;

        // Winner of match2 becomes player2 of next match (if exists)
        if (match2) {
          nextMatch.player2Id = match2.winnerId || null;
          nextMatch.player2Name = tournament.players.find(
            p => p.userId === match2.winnerId
          )?.username;
        }

        // Mark match as ready if both players are set
        if (nextMatch.player1Id && nextMatch.player2Id) {
          nextMatch.status = 'ready';
        } else if (nextMatch.player1Id && !nextMatch.player2Id) {
          // Bye - player advances
          nextMatch.winnerId = nextMatch.player1Id;
          nextMatch.status = 'completed';
        }
      }
    }
  }

  private async completeTournament(tournamentId: number): Promise<void> {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return;

    tournament.status = TournamentStatus.FINISHED;
    tournament.finishedAt = new Date();

    // Final match determines winner
    const finalMatch = tournament.matches.find(
      m => m.round === tournament.totalRounds
    );

    if (finalMatch && finalMatch.winnerId) {
      tournament.winnerId = finalMatch.winnerId;
      tournament.winnerName = tournament.players.find(
        p => p.userId === finalMatch.winnerId
      )?.username;
    }

    this.broadcastToTournament(tournamentId, 'tournament:completed', {
      tournamentId,
      winnerId: tournament.winnerId,
      winnerName: tournament.winnerName,
    });

    // Save tournament to database
    await this.saveTournamentToDatabase(tournament);

    // Clean up after 1 hour
    setTimeout(() => {
      this.tournaments.delete(tournamentId);
    }, 3600000);
  }

  // ==================== QUERIES ====================

  getTournament(tournamentId: number): Tournament | undefined {
    return this.tournaments.get(tournamentId);
  }

  getAllTournaments(): Tournament[] {
    return Array.from(this.tournaments.values());
  }

  getActiveTournaments(): Tournament[] {
    return Array.from(this.tournaments.values()).filter(
      t => t.status === TournamentStatus.REGISTRATION || 
           t.status === TournamentStatus.IN_PROGRESS
    );
  }

  getUserTournaments(userId: number): Tournament[] {
    return Array.from(this.tournaments.values()).filter(t =>
      t.players.some(p => p.userId === userId)
    );
  }

  getTournamentBracket(tournamentId: number): TournamentBracket | null {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return null;

    const rounds: TournamentRound[] = [];

    for (let r = 1; r <= tournament.totalRounds; r++) {
      const roundMatches = tournament.matches.filter(m => m.round === r);
      const completed = roundMatches.every(m => m.status === 'completed');

      rounds.push({
        roundNumber: r,
        matches: roundMatches,
        completed,
      });
    }

    return {
      tournament,
      rounds,
    };
  }

  getTournamentStats(tournamentId: number): TournamentStats | null {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return null;

    const totalGames = tournament.matches.length;
    const completedGames = tournament.matches.filter(
      m => m.status === 'completed'
    ).length;

    const playersRemaining = new Set(
      tournament.matches
        .filter(m => m.status !== 'completed')
        .flatMap(m => [m.player1Id, m.player2Id])
        .filter(id => id !== null)
    ).size;

    return {
      tournamentId,
      totalGames,
      completedGames,
      currentRound: tournament.currentRound,
      totalRounds: tournament.totalRounds,
      playersRemaining,
    };
  }

  // ==================== UTILITIES ====================

  private setupGameEndListener(): void {
    // This will be called by game service when a tournament game ends
    // You'll need to integrate this with your game service
  }

  private isPowerOfTwo(n: number): boolean {
    return n > 0 && (n & (n - 1)) === 0;
  }

  private nextPowerOfTwo(n: number): number {
    let power = 1;
    while (power < n) {
      power *= 2;
    }
    return power;
  }

  private async generateTournamentId(): Promise<number> {
    const id = Math.floor(Math.random() * 1000000) + 1;

    const exists = this.tournaments.has(id);

    if (exists) {
      return this.generateTournamentId();
    }

    return id;
  }

  private broadcastToTournament(tournamentId: number, event: string, data: any): void {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return;

    tournament.players.forEach(player => {
      this.connectionManager.emitToUser(player.userId, event, data);
    });
  }

  private async saveTournamentToDatabase(tournament: Tournament): Promise<void> {
    try {
      // Save tournament results to database
      // This is a placeholder - adapt to your database schema
      console.log(`Tournament ${tournament.id} completed. Winner: ${tournament.winnerName}`);
    } catch (error) {
      console.error('Failed to save tournament to database:', error);
    }
  }

  // ==================== ADMIN/CLEANUP ====================

  async cancelTournament(tournamentId: number, adminId: number): Promise<void> {
    const tournament = this.tournaments.get(tournamentId);

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.creatorId !== adminId) {
      throw new Error('Only creator can cancel tournament');
    }

    if (tournament.status === TournamentStatus.FINISHED) {
      throw new Error('Cannot cancel finished tournament');
    }

    tournament.status = TournamentStatus.CANCELLED;

    this.broadcastToTournament(tournamentId, 'tournament:cancelled', {
      tournamentId,
    });

    // Clean up after 5 minutes
    setTimeout(() => {
      this.tournaments.delete(tournamentId);
    }, 300000);
  }
}
