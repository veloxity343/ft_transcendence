/**
 * Match History Service
 * Manages game and tournament history, player statistics, and ELO tracking
 * Records match results and calculates comprehensive player stats
 */
import { PrismaClient } from '@prisma/client';
import { EloService } from './elo.service';

/** Individual match history entry with full details */
export interface MatchHistoryEntry {
  id: number;
  date: string;
  type: 'quickplay' | 'private' | 'ai' | 'tournament';
  
  // Players
  player1Id: number;
  player1Name: string;
  player1Avatar: string;
  player2Id: number | null;  // null for AI games
  player2Name: string;
  player2Avatar: string;
  
  // Result
  player1Score: number;
  player2Score: number;
  winnerId: number | null;
  
  // Stats
  duration: number;  // in seconds
  
  // ELO changes
  player1EloBefore: number;
  player1EloAfter: number;
  player1EloChange: number;
  player2EloBefore: number;
  player2EloAfter: number;
  player2EloChange: number;
  
  // Tournament info (if applicable)
  tournamentId?: number;
  tournamentName?: string;
  tournamentRound?: number;
  tournamentMatchId?: string;
}

export interface TournamentHistoryEntry {
  id: number;
  name: string;
  date: string;
  status: string;
  
  // Player's result
  placement: number;  // 1 = winner, 2 = finalist, etc.
  matchesPlayed: number;
  matchesWon: number;
  
  // Tournament info
  totalPlayers: number;
  totalRounds: number;
  winnerId: number | null;
  winnerName: string | null;
  
  // ELO impact
  totalEloChange: number;
  
  // Bracket data for visualization
  bracket: TournamentBracket;
}

export interface TournamentBracket {
  rounds: TournamentRound[];
}

export interface TournamentRound {
  roundNumber: number;
  roundName: string;  // "Round 1", "Quarterfinals", etc.
  matches: TournamentMatchInfo[];
}

export interface TournamentMatchInfo {
  matchId: string;
  player1Id: number | null;
  player1Name: string;
  player1Score: number | null;
  player2Id: number | null;
  player2Name: string;
  player2Score: number | null;
  winnerId: number | null;
  status: string;
}

export interface PlayerStats {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  currentElo: number;
  highestElo: number;
  rankTitle: string;
  leaderboardRank: number;
  totalPlayTime: number;
  averageGameDuration: number;
  longestWinStreak: number;
  currentWinStreak: number;
  tournamentsPlayed: number;
  tournamentsWon: number;
}

export class MatchHistoryService {
  // Cache AI user ID to avoid repeated database queries
  private aiUserId: number | null = null;

  constructor(private prisma: PrismaClient) {}

  /**
   * Get AI user ID (cached for performance)
   * AI user is identified by special email address
   */
  private async getAIUserId(): Promise<number | null> {
    if (this.aiUserId !== null) return this.aiUserId;
    
    const aiUser = await this.prisma.user.findUnique({
      where: { email: 'ai@transcendence.local' },
      select: { id: true },
    });
    
    this.aiUserId = aiUser?.id ?? null;
    return this.aiUserId;
  }

  /**
   * Record a completed game and update player stats/ELO
   * This is called at the end of every game to persist results
   * Updates both players' stats, calculates ELO changes, and stores match history
   * AI games don't affect ELO for either player
   * @returns Complete match history entry with all calculated values
   */
  async recordGameResult(
    gameId: number,
    player1Id: number,
    player2Id: number | null,  // null for AI
    player1Score: number,
    player2Score: number,
    duration: number,
    gameType: 'quickplay' | 'private' | 'ai' | 'tournament',
    tournamentId?: number,
    tournamentRound?: number
  ): Promise<MatchHistoryEntry> {
    const player1Won = player1Score > player2Score;
    const winnerId = player1Won ? player1Id : player2Id;

    // Get player data
    const player1 = await this.prisma.user.findUnique({
      where: { id: player1Id },
      select: {
        id: true,
        username: true,
        avatar: true,
        score: true,
        gamesPlayed: true,
        gamesWon: true,
        gamesLost: true,
        playTime: true,
        gameHistory: true,
      },
    });

    if (!player1) throw new Error('Player 1 not found');

    let player2: typeof player1 | null = null;
    let player2EloBefore = 1200;
    let player2EloAfter = 1200;
    let player2EloChange = 0;

    // Calculate ELO changes
    const player1EloBefore = player1.score;
    let player1EloAfter = player1.score;
    let player1EloChange = 0;

    if (player2Id) {
      player2 = await this.prisma.user.findUnique({
        where: { id: player2Id },
        select: {
          id: true,
          username: true,
          avatar: true,
          score: true,
          gamesPlayed: true,
          gamesWon: true,
          gamesLost: true,
          playTime: true,
          gameHistory: true,
        },
      });

      if (player2) {
        player2EloBefore = player2.score;

        // Calculate ELO
        let eloResult;
        if (tournamentId && tournamentRound) {
          // Get total rounds for tournament multiplier
          const tournament = await this.prisma.tournament.findUnique({
            where: { id: tournamentId },
            select: { totalRounds: true },
          });
          
          eloResult = EloService.calculateTournamentMatchResult(
            player1EloBefore,
            player2EloBefore,
            player1Won,
            player1.gamesPlayed,
            player2.gamesPlayed,
            tournamentRound,
            tournament?.totalRounds || 3
          );
        } else {
          eloResult = EloService.calculateMatchResult(
            player1EloBefore,
            player2EloBefore,
            player1Won,
            player1.gamesPlayed,
            player2.gamesPlayed
          );
        }

        player1EloAfter = eloResult.player1NewElo;
        player1EloChange = eloResult.player1Change;
        player2EloAfter = eloResult.player2NewElo;
        player2EloChange = eloResult.player2Change;
      }
    }

    // Create match history entry
    const historyEntry: MatchHistoryEntry = {
      id: gameId,
      date: new Date().toISOString(),
      type: gameType,
      player1Id,
      player1Name: player1.username,
      player1Avatar: player1.avatar,
      player2Id: player2?.id || null,
      player2Name: player2?.username || 'AI',
      player2Avatar: player2?.avatar || 'ai-avatar.png',
      player1Score,
      player2Score,
      winnerId,
      duration,
      player1EloBefore,
      player1EloAfter,
      player1EloChange,
      player2EloBefore,
      player2EloAfter,
      player2EloChange,
      tournamentId,
      tournamentRound,
    };

    // Update player 1 stats
    const player1History = this.parseGameHistory(player1.gameHistory);
    player1History.push(historyEntry);
    
    // Keep last 100 games
    if (player1History.length > 100) {
      player1History.shift();
    }

    await this.prisma.user.update({
      where: { id: player1Id },
      data: {
        score: player1EloAfter,
        gamesPlayed: player1.gamesPlayed + 1,
        gamesWon: player1Won ? player1.gamesWon + 1 : player1.gamesWon,
        gamesLost: player1Won ? player1.gamesLost : player1.gamesLost + 1,
        winRate: this.calculateWinRate(
          player1Won ? player1.gamesWon + 1 : player1.gamesWon,
          player1.gamesPlayed + 1
        ),
        playTime: player1.playTime + duration,
        gameHistory: JSON.stringify(player1History),
      },
    });

    // Update player 2 stats (if human)
    if (player2) {
      const player2History = this.parseGameHistory(player2.gameHistory);
      
      // Create player 2's perspective of the match
      const player2HistoryEntry: MatchHistoryEntry = {
        ...historyEntry,
        player1Id: player2.id,
        player1Name: player2.username,
        player1Avatar: player2.avatar,
        player2Id: player1Id,
        player2Name: player1.username,
        player2Avatar: player1.avatar,
        player1Score: player2Score,
        player2Score: player1Score,
        player1EloBefore: player2EloBefore,
        player1EloAfter: player2EloAfter,
        player1EloChange: player2EloChange,
        player2EloBefore: player1EloBefore,
        player2EloAfter: player1EloAfter,
        player2EloChange: player1EloChange,
      };
      
      player2History.push(player2HistoryEntry);
      
      if (player2History.length > 100) {
        player2History.shift();
      }

      await this.prisma.user.update({
        where: { id: player2.id },
        data: {
          score: player2EloAfter,
          gamesPlayed: player2.gamesPlayed + 1,
          gamesWon: !player1Won ? player2.gamesWon + 1 : player2.gamesWon,
          gamesLost: !player1Won ? player2.gamesLost : player2.gamesLost + 1,
          winRate: this.calculateWinRate(
            !player1Won ? player2.gamesWon + 1 : player2.gamesWon,
            player2.gamesPlayed + 1
          ),
          playTime: player2.playTime + duration,
          gameHistory: JSON.stringify(player2History),
        },
      });
    }

    // Update leaderboard ranks
    await this.updateLeaderboardRanks();

    return historyEntry;
  }

  /**
   * Get match history for a user
   */
  async getMatchHistory(
    userId: number,
    limit: number = 20,
    offset: number = 0,
    type?: 'all' | 'quickplay' | 'tournament' | 'ai'
  ): Promise<{ matches: MatchHistoryEntry[]; total: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { gameHistory: true, username: true },
    });

    if (!user) throw new Error('User not found');

    // Parse game history - could be array of IDs (old format) or array of objects (new format)
    let gameIds: number[] = [];
    let historyData = this.parseGameHistory(user.gameHistory);
    
    // Check if it's old format (array of numbers) or new format (array of objects)
    if (historyData.length > 0 && typeof historyData[0] === 'number') {
      // Old format: array of game IDs
      gameIds = historyData as unknown as number[];
    } else if (historyData.length > 0 && typeof historyData[0] === 'object') {
      // New format: already have full match objects
      let matches = historyData as MatchHistoryEntry[];
      
      if (type && type !== 'all') {
        matches = matches.filter(match => match.type === type);
      }
      
      matches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      return {
        matches: matches.slice(offset, offset + limit),
        total: matches.length,
      };
    }

    // Old format: fetch game details from database
    if (gameIds.length === 0) {
      return { matches: [], total: 0 };
    }

    // Reverse to get newest first
    gameIds = gameIds.reverse();

    // Fetch actual game records
    const games = await this.prisma.game.findMany({
      where: {
        id: { in: gameIds },
      },
      include: {
        tournament: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Build match entries from game records
    const matches: MatchHistoryEntry[] = [];

    for (const game of games) {
      // Determine game type
      const gameType = (game.gameType || 'quickplay') as 'quickplay' | 'private' | 'ai' | 'tournament';

      // Filter by type if specified
      if (type && type !== 'all' && gameType !== type) {
        continue;
      }

      // Get player info
      const player1 = await this.prisma.user.findUnique({
        where: { id: game.player1 },
        select: { username: true, avatar: true },
      });

      let player2Name = 'AI';
      let player2Avatar = 'ai-avatar.png';
      
      if (game.player2 && game.player2 > 0) {
        const player2 = await this.prisma.user.findUnique({
          where: { id: game.player2 },
          select: { username: true, avatar: true },
        });
        if (player2) {
          player2Name = player2.username;
          player2Avatar = player2.avatar;
        }
      }

      // Determine if current user won
      const isPlayer1 = game.player1 === userId;
      const player1Won = game.score1 > game.score2;
      const userWon = isPlayer1 ? player1Won : !player1Won;

      // Build entry from user's perspective
      matches.push({
        id: game.id,
        date: game.createdAt.toISOString(),
        type: gameType,
        player1Id: userId,
        player1Name: isPlayer1 ? (player1?.username || 'Unknown') : player2Name,
        player1Avatar: isPlayer1 ? (player1?.avatar || 'default-avatar.png') : player2Avatar,
        player2Id: isPlayer1 ? game.player2 : game.player1,
        player2Name: isPlayer1 ? player2Name : (player1?.username || 'Unknown'),
        player2Avatar: isPlayer1 ? player2Avatar : (player1?.avatar || 'default-avatar.png'),
        player1Score: isPlayer1 ? game.score1 : game.score2,
        player2Score: isPlayer1 ? game.score2 : game.score1,
        winnerId: userWon ? userId : (isPlayer1 ? game.player2 : game.player1),
        duration: game.duration || 0,
        player1EloBefore: 0,  // Not tracked in old format
        player1EloAfter: 0,
        player1EloChange: 0,
        player2EloBefore: 0,
        player2EloAfter: 0,
        player2EloChange: 0,
        tournamentId: game.tournamentId || undefined,
        tournamentName: game.tournament?.name,
        tournamentRound: game.tournamentRound || undefined,
      });
    }

    return {
      matches: matches.slice(offset, offset + limit),
      total: matches.length,
    };
  }

  /**
   * Get a single match details
   */
  async getMatchDetails(gameId: number): Promise<MatchHistoryEntry | null> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: {
        tournament: true,
      },
    });

    if (!game) return null;

    // Get player info
    const player1 = await this.prisma.user.findUnique({
      where: { id: game.player1 },
      select: { username: true, avatar: true },
    });

    const player2 = game.player2 ? await this.prisma.user.findUnique({
      where: { id: game.player2 },
      select: { username: true, avatar: true },
    }) : null;

    return {
      id: game.id,
      date: game.createdAt.toISOString(),
      type: (game.gameType || (game.tournamentId ? 'tournament' : 'quickplay')) as 'quickplay' | 'private' | 'ai' | 'tournament',
      player1Id: game.player1,
      player1Name: player1?.username || 'Unknown',
      player1Avatar: player1?.avatar || 'default-avatar.png',
      player2Id: game.player2,
      player2Name: player2?.username || 'AI',
      player2Avatar: player2?.avatar || 'ai-avatar.png',
      player1Score: game.score1,
      player2Score: game.score2,
      winnerId: game.score1 > game.score2 ? game.player1 : game.player2,
      duration: game.duration,
      player1EloBefore: 0,  // Would need to store this in Game model
      player1EloAfter: 0,
      player1EloChange: 0,
      player2EloBefore: 0,
      player2EloAfter: 0,
      player2EloChange: 0,
      tournamentId: game.tournamentId || undefined,
      tournamentName: game.tournament?.name,
      tournamentRound: game.tournamentRound || undefined,
    };
  }

  /**
   * Get tournament history for a user
   */
  async getTournamentHistory(userId: number): Promise<TournamentHistoryEntry[]> {
    // Get all tournaments where user participated
    const participations = await this.prisma.tournamentPlayer.findMany({
      where: { userId },
      include: {
        tournament: {
          include: {
            players: true,
            matches: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const history: TournamentHistoryEntry[] = [];

    for (const participation of participations) {
      const tournament = participation.tournament;
      
      // Calculate user's stats in this tournament
      const userMatches = tournament.matches.filter(
        m => m.player1Id === userId || m.player2Id === userId
      );
      
      const matchesWon = userMatches.filter(m => m.winnerId === userId).length;
      
      // Determine placement
      let placement = tournament.players.length;
      if (tournament.winnerId === userId) {
        placement = 1;
      } else if (participation.eliminatedInRound) {
        // Calculate based on elimination round
        const roundsFromEnd = tournament.totalRounds - participation.eliminatedInRound;
        placement = Math.pow(2, roundsFromEnd) + 1;
      }

      // Build bracket
      const bracket = this.buildTournamentBracket(tournament.matches, tournament.totalRounds);

      // Calculate total ELO change from tournament
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { gameHistory: true },
      });
      
      const userHistory = this.parseGameHistory(user?.gameHistory || '[]');
      const tournamentGames = userHistory.filter(g => g.tournamentId === tournament.id);
      const totalEloChange = tournamentGames.reduce((sum, g) => sum + g.player1EloChange, 0);

      history.push({
        id: tournament.id,
        name: tournament.name,
        date: tournament.createdAt.toISOString(),
        status: tournament.status,
        placement,
        matchesPlayed: userMatches.length,
        matchesWon,
        totalPlayers: tournament.players.length,
        totalRounds: tournament.totalRounds,
        winnerId: tournament.winnerId,
        winnerName: tournament.winnerName,
        totalEloChange,
        bracket,
      });
    }

    return history;
  }

  /**
   * Get detailed tournament info including bracket
   */
  async getTournamentDetails(tournamentId: number): Promise<TournamentHistoryEntry | null> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        players: true,
        matches: true,
        creator: {
          select: { username: true },
        },
      },
    });

    if (!tournament) return null;

    const bracket = this.buildTournamentBracket(tournament.matches, tournament.totalRounds);

    return {
      id: tournament.id,
      name: tournament.name,
      date: tournament.createdAt.toISOString(),
      status: tournament.status,
      placement: 0,  // N/A for general view
      matchesPlayed: tournament.matches.filter(m => m.status === 'completed').length,
      matchesWon: 0,  // N/A for general view
      totalPlayers: tournament.players.length,
      totalRounds: tournament.totalRounds,
      winnerId: tournament.winnerId,
      winnerName: tournament.winnerName,
      totalEloChange: 0,  // N/A for general view
      bracket,
    };
  }

  /**
   * Get player stats
   */
  async getPlayerStats(userId: number): Promise<PlayerStats> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        score: true,
        rank: true,
        gamesPlayed: true,
        gamesWon: true,
        gamesLost: true,
        winRate: true,
        playTime: true,
        gameHistory: true,
      },
    });

    if (!user) throw new Error('User not found');

    const history = this.parseGameHistory(user.gameHistory);
    
    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    for (const match of history) {
      if (match.winnerId === userId) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }
    
    // Current streak (from most recent games)
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].winnerId === userId) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate highest ELO
    let highestElo = user.score;
    for (const match of history) {
      if (match.player1EloAfter > highestElo) {
        highestElo = match.player1EloAfter;
      }
    }

    // Count tournaments
    const tournamentIds = new Set(
      history.filter(m => m.tournamentId).map(m => m.tournamentId)
    );
    const tournamentsPlayed = tournamentIds.size;
    
    // Count tournament wins
    const tournamentWins = await this.prisma.tournament.count({
      where: {
        winnerId: userId,
        status: 'completed',
      },
    });

    return {
      totalGames: user.gamesPlayed,
      wins: user.gamesWon,
      losses: user.gamesLost,
      winRate: user.winRate,
      currentElo: user.score,
      highestElo,
      rankTitle: EloService.getRankTitle(user.score),
      leaderboardRank: user.rank,
      totalPlayTime: user.playTime,
      averageGameDuration: user.gamesPlayed > 0 
        ? Math.round(user.playTime / user.gamesPlayed) 
        : 0,
      longestWinStreak: longestStreak,
      currentWinStreak: currentStreak,
      tournamentsPlayed,
      tournamentsWon: tournamentWins,
    };
  }

  /**
   * Update leaderboard ranks for all players
   */
  async updateLeaderboardRanks(): Promise<void> {
    // Get all users sorted by ELO
    const users = await this.prisma.user.findMany({
      where: {
        gamesPlayed: { gt: 0 },  // Only rank players who have played
        email: { not: 'ai@transcendence.local' },
      },
      orderBy: {
        score: 'desc',
      },
      select: {
        id: true,
      },
    });

    // Update ranks
    for (let i = 0; i < users.length; i++) {
      await this.prisma.user.update({
        where: { id: users[i].id },
        data: { rank: i + 1 },
      });
    }
  }

  /**
   * Helper: Parse game history JSON
   */
  private parseGameHistory(historyJson: string | null): MatchHistoryEntry[] {
    if (!historyJson) return [];
    try {
      return JSON.parse(historyJson);
    } catch {
      return [];
    }
  }

  /**
   * Helper: Calculate win rate
   */
  private calculateWinRate(wins: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((wins / total) * 100 * 100) / 100;  // 2 decimal places
  }

  /**
   * Helper: Build tournament bracket structure
   */
  private buildTournamentBracket(
    matches: any[],
    totalRounds: number
  ): TournamentBracket {
    const rounds: TournamentRound[] = [];

    for (let round = 1; round <= totalRounds; round++) {
      const roundMatches = matches
        .filter(m => m.round === round)
        .sort((a, b) => a.matchNumber - b.matchNumber);

      const roundName = this.getRoundName(round, totalRounds);

      rounds.push({
        roundNumber: round,
        roundName,
        matches: roundMatches.map(m => ({
          matchId: m.matchId,
          player1Id: m.player1Id,
          player1Name: m.player1Name || 'TBD',
          player1Score: m.winnerId ? (m.winnerId === m.player1Id ? 11 : m.gameId ? null : 0) : null,
          player2Id: m.player2Id,
          player2Name: m.player2Name || 'TBD',
          player2Score: m.winnerId ? (m.winnerId === m.player2Id ? 11 : m.gameId ? null : 0) : null,
          winnerId: m.winnerId,
          status: m.status,
        })),
      });
    }

    return { rounds };
  }

  /**
   * Helper: Get round name
   */
  private getRoundName(round: number, totalRounds: number): string {
    const roundsFromEnd = totalRounds - round;
    
    switch (roundsFromEnd) {
      case 0: return 'Finals';
      case 1: return 'Semi-Finals';
      case 2: return 'Quarter-Finals';
      default: return `Round ${round}`;
    }
  }
}
