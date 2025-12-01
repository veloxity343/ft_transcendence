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
  // In-memory cache for active tournaments (for real-time updates)
  private activeCache = new Map<number, Tournament>();
  private activeTournamentGames = new Map<number, number>(); // gameId -> tournamentId

  constructor(
    private prisma: PrismaClient,
    private userService: UserService,
    private gameService: GameService,
    private connectionManager: ConnectionManager,
  ) {
    this.setupGameEndListener();
    this.loadActiveTournaments();
  }

  // ==================== INITIALIZATION ====================

  private async loadActiveTournaments() {
    // Load active tournaments from database into cache on startup
    const activeTournaments = await this.prisma.tournament.findMany({
      where: {
        status: {
          in: ['registration', 'starting', 'in_progress'],
        },
      },
      include: {
        players: true,
        matches: true,
      },
    });

    for (const dbTournament of activeTournaments) {
      const tournament = this.dbToTournament(dbTournament);
      this.activeCache.set(tournament.id, tournament);
    }

    console.log(`Loaded ${activeTournaments.length} active tournaments from database`);
  }

  // ==================== DATABASE CONVERSION ====================

  private dbToTournament(dbTournament: any): Tournament {
    const players: TournamentPlayer[] = dbTournament.players?.map((p: any) => ({
      userId: p.userId,
      username: p.username,
      avatar: p.avatar,
      seed: p.seed,
      eliminatedInRound: p.eliminatedInRound,
    })) || [];

    const matches: TournamentMatch[] = dbTournament.matches?.map((m: any) => ({
      matchId: m.matchId,
      round: m.round,
      matchNumber: m.matchNumber,
      player1Id: m.player1Id,
      player1Name: m.player1Name,
      player2Id: m.player2Id,
      player2Name: m.player2Name,
      winnerId: m.winnerId,
      gameId: m.gameId,
      status: m.status as 'pending' | 'ready' | 'in_progress' | 'completed',
      scheduledTime: m.scheduledTime,
    })) || [];

    return {
      id: dbTournament.id,
      name: dbTournament.name,
      creatorId: dbTournament.creatorId,
      maxPlayers: dbTournament.maxPlayers,
      currentPlayers: dbTournament.currentPlayers,
      players,
      matches,
      currentRound: dbTournament.currentRound,
      totalRounds: dbTournament.totalRounds,
      bracketType: dbTournament.bracketType as BracketType,
      status: dbTournament.status as TournamentStatus,
      winnerId: dbTournament.winnerId || undefined,
      winnerName: dbTournament.winnerName || undefined,
      createdAt: dbTournament.createdAt,
      startedAt: dbTournament.startedAt || undefined,
      finishedAt: dbTournament.finishedAt || undefined,
    };
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

    const totalRounds = Math.log2(maxPlayers);

    // Create in database
    const dbTournament = await this.prisma.tournament.create({
      data: {
        name,
        creatorId,
        maxPlayers,
        bracketType,
        totalRounds,
        status: 'registration',
        currentPlayers: 0,
        currentRound: 0,
      },
      include: {
        players: true,
        matches: true,
      },
    });

    const tournament = this.dbToTournament(dbTournament);
    
    // Add to cache
    this.activeCache.set(tournament.id, tournament);

    // Broadcast tournament created
    this.connectionManager.broadcast('tournament:created', {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        maxPlayers: tournament.maxPlayers,
        currentPlayers: tournament.currentPlayers,
        status: tournament.status,
        creatorId: tournament.creatorId,
      }
    });

    return tournament;
  }

  // ==================== PLAYER MANAGEMENT ====================

  async joinTournament(userId: number, tournamentId: number): Promise<void> {
    const tournament = await this.getTournamentFromCacheOrDb(tournamentId);

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

    // Add player to database
    await this.prisma.tournamentPlayer.create({
      data: {
        tournamentId,
        userId,
        username: user.username,
        avatar: user.avatar,
      },
    });

    // Update tournament in database
    await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        currentPlayers: { increment: 1 },
      },
    });

    // Update cache
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
    const tournament = await this.getTournamentFromCacheOrDb(tournamentId);

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

    // Remove from database
    await this.prisma.tournamentPlayer.deleteMany({
      where: {
        tournamentId,
        userId,
      },
    });

    // Update tournament in database
    await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        currentPlayers: { decrement: 1 },
      },
    });

    // Update cache
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
    const tournament = await this.getTournamentFromCacheOrDb(tournamentId);

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

    // Update status in database
    await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: 'starting',
        startedAt: new Date(),
        maxPlayers: tournament.maxPlayers,
        totalRounds: tournament.totalRounds,
      },
    });

    tournament.status = TournamentStatus.STARTING;
    tournament.startedAt = new Date();

    // Seed players
    this.seedPlayers(tournament);

    // Update player seeds in database
    for (const player of tournament.players) {
      await this.prisma.tournamentPlayer.updateMany({
        where: {
          tournamentId,
          userId: player.userId,
        },
        data: {
          seed: player.seed,
        },
      });
    }

    // Generate bracket
    await this.generateBracket(tournament);

    // Update status to in_progress
    await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: 'in_progress',
        currentRound: 1,
      },
    });

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
    // Shuffle players for random seeding
    const shuffled = [...tournament.players].sort(() => Math.random() - 0.5);

    shuffled.forEach((player, index) => {
      player.seed = index + 1;
    });

    tournament.players = shuffled;
  }

  private async generateBracket(tournament: Tournament): Promise<void> {
    const matches: TournamentMatch[] = [];

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

        matches.push(match);

        // Save match to database
        await this.prisma.tournamentMatch.create({
          data: {
            tournamentId: tournament.id,
            matchId: match.matchId,
            round: match.round,
            matchNumber: match.matchNumber,
            player1Id: match.player1Id,
            player1Name: match.player1Name,
            player2Id: match.player2Id,
            player2Name: match.player2Name,
            winnerId: match.winnerId,
            status: match.status,
          },
        });
      }
    }

    tournament.matches = matches;
  }

  // ==================== MATCH MANAGEMENT ====================

  private async startRoundMatches(tournamentId: number, round: number): Promise<void> {
    const tournament = await this.getTournamentFromCacheOrDb(tournamentId);
    if (!tournament) return;

    const roundMatches = tournament.matches.filter(
      m => m.round === round && m.status === 'ready'
    );

    if (roundMatches.length === 0) {
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

  async recordMatchResult(
    tournamentId: number,
    gameId: number,
    winnerId: number,
  ): Promise<void> {
    const tournament = await this.getTournamentFromCacheOrDb(tournamentId);

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

    // Update match in database
    await this.prisma.tournamentMatch.updateMany({
      where: {
        tournamentId,
        matchId: match.matchId,
      },
      data: {
        winnerId,
        status: 'completed',
      },
    });

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
    const tournament = await this.getTournamentFromCacheOrDb(tournamentId);
    if (!tournament) return;

    const roundMatches = tournament.matches.filter(m => m.round === round);
    const allCompleted = roundMatches.every(m => m.status === 'completed');

    if (!allCompleted) return;

    // Round is complete
    if (round < tournament.totalRounds) {
      await this.advanceWinners(tournament, round);
      
      // Update current round in database
      await this.prisma.tournament.update({
        where: { id: tournamentId },
        data: {
          currentRound: round + 1,
        },
      });

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

  private async advanceWinners(tournament: Tournament, completedRound: number): Promise<void> {
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
        nextMatch.player1Id = match1.winnerId || null;
        nextMatch.player1Name = tournament.players.find(
          p => p.userId === match1.winnerId
        )?.username;

        if (match2) {
          nextMatch.player2Id = match2.winnerId || null;
          nextMatch.player2Name = tournament.players.find(
            p => p.userId === match2.winnerId
          )?.username;
        }

        if (nextMatch.player1Id && nextMatch.player2Id) {
          nextMatch.status = 'ready';
        } else if (nextMatch.player1Id && !nextMatch.player2Id) {
          nextMatch.winnerId = nextMatch.player1Id;
          nextMatch.status = 'completed';
        }

        // Update in database
        await this.prisma.tournamentMatch.updateMany({
          where: {
            tournamentId: tournament.id,
            matchId: nextMatch.matchId,
          },
          data: {
            player1Id: nextMatch.player1Id,
            player1Name: nextMatch.player1Name,
            player2Id: nextMatch.player2Id,
            player2Name: nextMatch.player2Name,
            winnerId: nextMatch.winnerId,
            status: nextMatch.status,
          },
        });
      }
    }
  }

  private async completeTournament(tournamentId: number): Promise<void> {
    const tournament = await this.getTournamentFromCacheOrDb(tournamentId);
    if (!tournament) return;

    const finalMatch = tournament.matches.find(
      m => m.round === tournament.totalRounds
    );

    if (finalMatch && finalMatch.winnerId) {
      tournament.winnerId = finalMatch.winnerId;
      tournament.winnerName = tournament.players.find(
        p => p.userId === finalMatch.winnerId
      )?.username;
    }

    tournament.status = TournamentStatus.FINISHED;
    tournament.finishedAt = new Date();

    // Update in database
    await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: 'finished',
        winnerId: tournament.winnerId,
        winnerName: tournament.winnerName,
        finishedAt: tournament.finishedAt,
      },
    });

    this.broadcastToTournament(tournamentId, 'tournament:completed', {
      tournamentId,
      winnerId: tournament.winnerId,
      winnerName: tournament.winnerName,
    });

    // Remove from active cache after 1 hour
    setTimeout(() => {
      this.activeCache.delete(tournamentId);
    }, 3600000);
  }

  // ==================== QUERIES ====================

  async getTournamentFromCacheOrDb(tournamentId: number): Promise<Tournament | null> {
    // Check cache first
    const cached = this.activeCache.get(tournamentId);
    if (cached) return cached;

    // Load from database
    const dbTournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        players: true,
        matches: true,
      },
    });

    if (!dbTournament) return null;

    const tournament = this.dbToTournament(dbTournament);
    
    // Cache if active
    if (['registration', 'starting', 'in_progress'].includes(tournament.status)) {
      this.activeCache.set(tournamentId, tournament);
    }

    return tournament;
  }

  getTournament(tournamentId: number): Tournament | undefined {
    return this.activeCache.get(tournamentId);
  }

  async getAllTournamentsFromDb(limit: number = 100): Promise<Tournament[]> {
    const dbTournaments = await this.prisma.tournament.findMany({
      include: {
        players: true,
        matches: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return dbTournaments.map(t => this.dbToTournament(t));
  }

  getAllTournaments(): Tournament[] {
    return Array.from(this.activeCache.values());
  }

  getActiveTournaments(): Tournament[] {
    return Array.from(this.activeCache.values()).filter(
      t => t.status === TournamentStatus.REGISTRATION || 
           t.status === TournamentStatus.IN_PROGRESS
    );
  }

  getUserTournaments(userId: number): Tournament[] {
    return Array.from(this.activeCache.values()).filter(t =>
      t.players.some(p => p.userId === userId)
    );
  }

  getTournamentBracket(tournamentId: number): TournamentBracket | null {
    const tournament = this.activeCache.get(tournamentId);
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
    const tournament = this.activeCache.get(tournamentId);
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

  private broadcastToTournament(tournamentId: number, event: string, data: any): void {
    const tournament = this.activeCache.get(tournamentId);
    if (!tournament) return;

    tournament.players.forEach(player => {
      this.connectionManager.emitToUser(player.userId, event, data);
    });
  }

  // ==================== ADMIN/CLEANUP ====================

  async cancelTournament(tournamentId: number, adminId: number): Promise<void> {
    const tournament = await this.getTournamentFromCacheOrDb(tournamentId);

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

    // Update in database
    await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: 'cancelled',
      },
    });

    this.broadcastToTournament(tournamentId, 'tournament:cancelled', {
      tournamentId,
    });

    // Remove from cache after 5 minutes
    setTimeout(() => {
      this.activeCache.delete(tournamentId);
    }, 300000);
  }
}
