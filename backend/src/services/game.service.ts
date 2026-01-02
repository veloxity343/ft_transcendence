/**
 * Game Service
 * Core game engine for the Pong game
 * Manages game rooms, physics simulation, matchmaking, and AI opponents
 * 
 * Game Loop:
 * - Runs at REFRESH_RATE (10ms) for smooth 100 FPS physics
 * - Updates ball position, checks collisions, handles scoring
 * - Broadcasts game state to players and spectators
 * 
 * Physics:
 * - Ball accelerates on paddle hits for increasing difficulty
 * - Paddle momentum affects ball trajectory (moving paddle = faster ball)
 * - Spin influence allows players to angle shots
 * - Speed decay prevents infinite acceleration
 * 
 * Reconnection:
 * - Players can disconnect and reconnect within RECONNECT_TIMEOUT
 * - Game pauses during reconnection period
 * - Forfeit if reconnection timeout expires
 */
import { PrismaClient } from '@prisma/client';
import { GameRoom, GameState, PlayerInfo } from '../game/interfaces/game-room.interface';
import { GameStatus, PaddleDirection } from '../game/types/game.types';
import { UserService } from './user.service';
import { ConnectionManager, UserStatus } from '../websocket/connection.manager';
import { parseJsonArray, stringifyJsonArray } from '../utils/array-helpers';

export class GameService {
  // In-memory game state
  private rooms = new Map<number, GameRoom>();  // gameId -> GameRoom
  private userToRoom = new Map<number, number>();  // userId -> gameId
  private aiUserId: number | null = null;  // Cached AI user ID

  // ==================== Game Physics Constants ====================
  private readonly REFRESH_RATE = 10; // ms (100 FPS game loop)
  private readonly PADDLE_SPEED = 1;  // % per frame
  private readonly INITIAL_BALL_SPEED = 0.35;  // % per frame
  private readonly MAX_BALL_SPEED = 1.2;  // Speed cap
  private readonly WIN_SCORE = 11;  // First to 11 wins
  private readonly PADDLE_HEIGHT = 10;  // %
  private readonly BALL_RADIUS = 1;  // %
  private readonly GAME_ASPECT_RATIO = 16 / 9;
  
  // Paddle collision zones (x positions in %)
  private readonly LEFT_PADDLE_X = 3;
  private readonly RIGHT_PADDLE_X = 97;
  private readonly PADDLE_WIDTH = 1;
  
  // Physics modifiers
  private readonly BALL_ACCELERATION = 1.08;  // Speed increase per paddle hit
  private readonly PADDLE_MOMENTUM_MULTIPLIER = 0.4;  // How much paddle movement affects ball
  private readonly SPIN_INFLUENCE = 0.8;  // How much hitting off-center affects angle
  private readonly BALL_SPEED_DECAY = 0.9995;  // Innate air resistance (multiplier per frame)

  // Reconnection timeout (30 seconds)
  private readonly RECONNECT_TIMEOUT = 30000;

  constructor(
    private prisma: PrismaClient,
    private userService: UserService,
    private connectionManager: ConnectionManager,
  ) {}

  // ==================== FORFEIT ====================

  /**
   * Forfeit the current game - opponent wins immediately.
   * This is permanent and cannot be undone.
   */
  async forfeitGame(userId: number): Promise<{ success: boolean; error?: string }> {
    const gameId = this.userToRoom.get(userId);
    
    if (!gameId) {
      return { success: false, error: 'Not in a game' };
    }

    const room = this.rooms.get(gameId);
    
    if (!room) {
      this.userToRoom.delete(userId);
      return { success: false, error: 'Game not found' };
    }

    if (room.status !== GameStatus.IN_PROGRESS) {
      return { success: false, error: 'Game is not in progress' };
    }

    // For local games, just end the game
    if (room.isLocal) {
      return await this.endLocalGameForfeit(gameId, userId);
    }

    // Determine winner (opponent of forfeiting player)
    const isPlayer1 = room.player1Id === userId;
    const winnerId = isPlayer1 ? room.player2Id : room.player1Id;
    const loserId = userId;

    if (!winnerId) {
      return { success: false, error: 'No opponent to forfeit to' };
    }

    // Stop game loop immediately
    if (room.intervalId) {
      clearInterval(room.intervalId);
      room.intervalId = undefined;
    }

    room.status = GameStatus.FINISHED;

    // Set final scores - winner gets WIN_SCORE, loser keeps current score
    if (isPlayer1) {
      room.player2Score = this.WIN_SCORE;
    } else {
      room.player1Score = this.WIN_SCORE;
    }

    const duration = room.startTime ? Date.now() - room.startTime.getTime() : 0;

    // Get tournament info before emitting
    const gameInfo = await this.prisma.game.findUnique({
      where: { id: gameId },
      select: { 
        tournamentId: true,
        tournamentRound: true,
        tournamentMatch: true,
      },
    });

    // Emit game ended to both players (include tournament info)
    this.emitToRoom(gameId, 'game-ended', {
      gameId,
      winnerId,
      finalScore: {
        player1: room.player1Score,
        player2: room.player2Score,
      },
      forfeit: true,
      forfeitedBy: userId,
      isLocal: false,
      isLocalTournament: room.isLocalTournament || false,
      tournamentId: gameInfo?.tournamentId || null,
      tournamentRound: gameInfo?.tournamentRound || null,
      tournamentMatch: gameInfo?.tournamentMatch || null,
    });

    // Handle tournament game
    if (gameInfo?.tournamentId) {
      this.connectionManager.broadcast('tournament:game-ended', {
        gameId,
        tournamentId: gameInfo.tournamentId,
        winnerId,
        loserId,
        player1Id: room.player1Id,
        player2Id: room.player2Id,
        score1: room.player1Score,
        score2: room.player2Score,
      });
    }

    // Determine game type
    let gameType: 'quickplay' | 'private' | 'ai' | 'local' | 'tournament' = 'quickplay';
    if (gameInfo?.tournamentId) {
      gameType = 'tournament';
    } else if (room.vsAI) {
      gameType = 'ai';
    } else if (room.isLocal) {
      gameType = 'local';
    } else if (room.isPrivate) {
      gameType = 'private';
    }

    // Save game and update stats
    this.saveGame(
      gameId,
      room.player1Id,
      room.player2Id!,
      room.player1Score,
      room.player2Score,
      room.startTime || new Date(),
      new Date(),
      duration,
      gameType,
      gameInfo?.tournamentId || undefined,
      gameInfo?.tournamentRound || undefined,
      gameInfo?.tournamentMatch || undefined,
      room.isLocal,
      room.vsAI,
      room.isPrivate,
    ).catch(err => console.error('Failed to save forfeit game:', err));

    this.updateGameStats(winnerId, loserId, gameId, duration)
      .catch(err => console.error('Failed to update forfeit stats:', err));

    // Handle tournament game
    this.handleTournamentGameEnd(gameId, winnerId, loserId, room);

    // Cleanup
    this.cleanupAfterGameEnd(gameId, room);

    return { success: true };
  }

  private emitSound(gameId: number, soundType: 'paddleHit' | 'wallHit' | 'score' | 'gameStart') {
    this.emitToRoom(gameId, 'game-sound', { type: soundType });
  }

  private async endLocalGameForfeit(gameId: number, userId: number): Promise<{ success: boolean; error?: string }> {
    const room = this.rooms.get(gameId);
    if (!room) return { success: false, error: 'Game not found' };

    if (room.intervalId) {
      clearInterval(room.intervalId);
      room.intervalId = undefined;
    }

    room.status = GameStatus.FINISHED;

    // Determine winner based on current scores
    let winnerPlayerNumber: 1 | 2;
    
    if (room.player1Score > room.player2Score) {
      winnerPlayerNumber = 1;
    } else if (room.player2Score > room.player1Score) {
      winnerPlayerNumber = 2;
    } else {
      // Scores are tied, randomly pick a winner
      winnerPlayerNumber = Math.random() < 0.5 ? 1 : 2;
    }

    // Set winner's score to WIN_SCORE
    if (winnerPlayerNumber === 1) {
      room.player1Score = this.WIN_SCORE;
    } else {
      room.player2Score = this.WIN_SCORE;
    }

    // Query tournament info for local tournament games
    let gameInfo = null;
    if (room.isLocalTournament) {
      gameInfo = await this.prisma.game.findUnique({
        where: { id: gameId },
        select: { 
          tournamentId: true,
          tournamentRound: true,
          tournamentMatch: true,
        },
      });
    }

    this.connectionManager.emitToUser(userId, 'game-ended', {
      gameId,
      finalScore: {
        player1: room.player1Score,
        player2: room.player2Score,
      },
      forfeit: true,
      isLocal: true,
      isLocalTournament: room.isLocalTournament || false,
      tournamentId: gameInfo?.tournamentId || null,
      tournamentRound: gameInfo?.tournamentRound || null,
      tournamentMatch: gameInfo?.tournamentMatch || null,
    });

    // Handle tournament game end if this is a tournament match
    if (room.isLocalTournament && gameInfo?.tournamentId) {
      this.connectionManager.broadcast('tournament:game-ended', {
        gameId,
        tournamentId: gameInfo.tournamentId,
        winnerId: 0,
        winnerPlayerNumber,
        loserId: 0,
        player1Id: room.player1Id,
        player2Id: room.player2Id,
        score1: room.player1Score,
        score2: room.player2Score,
        isLocalTournament: true,
      });
    }

    // Cleanup
    this.userToRoom.delete(userId);
    this.connectionManager.setStatus(userId, UserStatus.ONLINE);
    this.rooms.delete(gameId);

    return { success: true };
  }

  // ==================== LEAVE (with reconnection) ====================

  /**
   * Leave the current game temporarily. For in-progress games, 
   * allows reconnection within RECONNECT_TIMEOUT.
   * For waiting/starting games, cancels the game.
   */
  leaveGame(userId: number): boolean {
    const gameId = this.userToRoom.get(userId);
    
    if (!gameId) {
      return false;
    }

    const room = this.rooms.get(gameId);

    if (!room) {
      this.userToRoom.delete(userId);
      this.connectionManager.setStatus(userId, UserStatus.ONLINE);
      return true;
    }

    // For local games, leaving means ending the game
    if (room.isLocal) {
      return this.immediateLeaveCleanup(userId, gameId, room);
    }

    // For AI games, leaving means ending the game
    if (room.vsAI) {
      return this.leaveWithReconnection(userId, gameId, room);
    }

    // For games not in progress, do immediate cleanup (cancel)
    if (room.status === GameStatus.WAITING || room.status === GameStatus.STARTING) {
      return this.immediateLeaveCleanup(userId, gameId, room);
    }

    // For in-progress games, allow reconnection
    if (room.status === GameStatus.IN_PROGRESS) {
      return this.leaveWithReconnection(userId, gameId, room);
    }

    // Game is finished, just cleanup
    return this.immediateLeaveCleanup(userId, gameId, room);
  }

  /**
   * Leave an in-progress game with reconnection capability
   */
  private leaveWithReconnection(userId: number, gameId: number, room: GameRoom): boolean {
    const isPlayer1 = room.player1Id === userId;
    const now = new Date();

    // Mark player as disconnected with timestamp
    if (isPlayer1) {
      room.player1Disconnected = true;
      room.player1DisconnectedAt = now;
    } else if (room.player2Id === userId) {
      room.player2Disconnected = true;
      room.player2DisconnectedAt = now;
    } else {
      return false;
    }

    // Remove from userToRoom mapping
    this.userToRoom.delete(userId);
    this.connectionManager.setStatus(userId, UserStatus.ONLINE);

    // Notify the user they left and can rejoin
    const reconnectDeadline = new Date(now.getTime() + this.RECONNECT_TIMEOUT);
    this.connectionManager.emitToUser(userId, 'game:left-with-reconnect', {
      gameId,
      reconnectDeadline,
      reconnectTimeoutMs: this.RECONNECT_TIMEOUT,
    });

    // Notify opponent that player disconnected
    const opponentId = isPlayer1 ? room.player2Id : room.player1Id;
    if (opponentId && this.userToRoom.get(opponentId) === gameId) {
      this.connectionManager.emitToUser(opponentId, 'game:opponent-disconnected', {
        gameId,
        reconnectDeadline,
        reconnectTimeoutMs: this.RECONNECT_TIMEOUT,
      });
    }

    return true;
  }

  /**
   * Immediate leave/cancel without reconnection option
   */
  private immediateLeaveCleanup(userId: number, gameId: number, room: GameRoom): boolean {
    // Remove user immediately
    this.userToRoom.delete(userId);
    this.connectionManager.setStatus(userId, UserStatus.ONLINE);

    // Mark that this user left
    if (room.player1Id === userId) {
      (room as any).player1Left = true;
    }
    if (room.player2Id === userId) {
      (room as any).player2Left = true;
    }

    // Stop game loop
    if (room.intervalId) {
      clearInterval(room.intervalId);
      room.intervalId = undefined;
    }

    // Schedule cleanup
    this.scheduleGameCleanup(gameId, userId);

    return true;
  }

  // ==================== REJOIN ====================

  /**
   * Rejoin an in-progress game after disconnecting
   */
  async rejoinGame(userId: number, gameId: number): Promise<PlayerInfo | null> {
    // Check if user is already in a game
    const currentGameId = this.userToRoom.get(userId);
    if (currentGameId) {
      if (currentGameId === gameId) {
        const room = this.rooms.get(gameId);
        if (room) {
          const isPlayer1 = room.player1Id === userId;
          const user = await this.userService.getUser(userId);
          return {
            playerId: userId,
            playerName: user.username,
            playerAvatar: user.avatar,
            playerNumber: isPlayer1 ? 1 : 2,
            gameId,
          };
        }
      }
      return null;
    }

    const room = this.rooms.get(gameId);
    if (!room) {
      return null;
    }

    if (room.status !== GameStatus.IN_PROGRESS) {
      return null;
    }

    // Verify user was a player in this game
    const isPlayer1 = room.player1Id === userId;
    const isPlayer2 = room.player2Id === userId;

    if (!isPlayer1 && !isPlayer2) {
      return null;
    }

    // Check if within reconnection window
    const disconnectedAt = isPlayer1 ? room.player1DisconnectedAt : room.player2DisconnectedAt;
    const wasDisconnected = isPlayer1 ? room.player1Disconnected : room.player2Disconnected;

    if (!wasDisconnected) {
      return null;
    }

    if (disconnectedAt) {
      const elapsed = Date.now() - disconnectedAt.getTime();
      if (elapsed > this.RECONNECT_TIMEOUT) {
        return null;
      }
    }

    // Mark as reconnected
    if (isPlayer1) {
      room.player1Disconnected = false;
      room.player1DisconnectedAt = undefined;
    } else {
      room.player2Disconnected = false;
      room.player2DisconnectedAt = undefined;
    }

    // Re-add to userToRoom mapping
    this.userToRoom.set(userId, gameId);
    this.connectionManager.setStatus(userId, UserStatus.IN_GAME);

    // Notify opponent
    const opponentId = isPlayer1 ? room.player2Id : room.player1Id;
    if (opponentId && this.userToRoom.get(opponentId) === gameId) {
      this.connectionManager.emitToUser(opponentId, 'game:opponent-reconnected', { gameId });
    }

    const user = await this.userService.getUser(userId);
    return {
      playerId: userId,
      playerName: user.username,
      playerAvatar: user.avatar,
      playerNumber: isPlayer1 ? 1 : 2,
      gameId,
    };
  }

  /**
   * Get reconnectable games for a user
   */
  getReconnectableGame(userId: number): { gameId: number; timeRemainingMs: number } | null {
    for (const [gameId, room] of this.rooms.entries()) {
      if (room.status !== GameStatus.IN_PROGRESS) continue;

      const isPlayer1 = room.player1Id === userId;
      const isPlayer2 = room.player2Id === userId;

      if (!isPlayer1 && !isPlayer2) continue;

      const disconnected = isPlayer1 ? room.player1Disconnected : room.player2Disconnected;
      const disconnectedAt = isPlayer1 ? room.player1DisconnectedAt : room.player2DisconnectedAt;

      if (disconnected && disconnectedAt) {
        const elapsed = Date.now() - disconnectedAt.getTime();
        const remaining = this.RECONNECT_TIMEOUT - elapsed;
        
        if (remaining > 0) {
          return { gameId, timeRemainingMs: remaining };
        }
      }
    }

    return null;
  }

  // ==================== HELPER METHODS ====================

  private async handleTournamentGameEnd(
    gameId: number, 
    winnerId: number, 
    loserId: number, 
    room: GameRoom
  ): Promise<void> {
    try {
      // Use tournament info from room first, fall back to DB query
      let tournamentId = room.tournamentId;
      
      if (!tournamentId) {
        const gameInfo = await this.prisma.game.findUnique({
          where: { id: gameId },
          select: { tournamentId: true },
        });
        tournamentId = gameInfo?.tournamentId || undefined;
      }

      if (!tournamentId) {
        return; // Not a tournament game
      }

      // Determine game type and handle appropriately
      if (room.isLocalTournament) {
        const winnerPlayerNumber = room.player1Score > room.player2Score ? 1 : 2;
        this.connectionManager.broadcast('tournament:game-ended', {
          gameId,
          tournamentId,
          winnerId: 0,
          winnerPlayerNumber,
          loserId: 0,
          player1Id: room.player1Id,
          player2Id: room.player2Id,
          score1: room.player1Score,
          score2: room.player2Score,
          isLocalTournament: true,
        });
      } else {
        console.log(`Tournament game ${gameId} ended, notifying tournament service`);
        this.connectionManager.broadcast('tournament:game-ended', {
          gameId,
          tournamentId,
          winnerId,
          loserId,
          player1Id: room.player1Id,
          player2Id: room.player2Id,
          score1: room.player1Score,
          score2: room.player2Score,
        });
      }
    } catch (err) {
      console.error('Error handling tournament game end:', err);
    }
  }

  private cleanupAfterGameEnd(gameId: number, room: GameRoom): void {
    if (room.player1Id) {
      this.userToRoom.delete(room.player1Id);
      this.connectionManager.setStatus(room.player1Id, UserStatus.ONLINE);
    }
    if (room.player2Id && room.player2Id !== room.player1Id) {
      this.userToRoom.delete(room.player2Id);
      this.connectionManager.setStatus(room.player2Id, UserStatus.ONLINE);
    }
    this.rooms.delete(gameId);
  }

  /**
   * Schedule cleanup to run asynchronously
   */
  private scheduleGameCleanup(gameId: number, leavingUserId: number) {
    setTimeout(() => {
      const room = this.rooms.get(gameId);
      if (!room) return;

      if (room.status === GameStatus.WAITING || room.status === GameStatus.STARTING) {
        this.cleanupCancelledGame(gameId, leavingUserId);
      } else if (room.status === GameStatus.IN_PROGRESS) {
        this.cleanupForfeitedGame(gameId, leavingUserId);
      } else {
        this.finalizeRoomCleanup(gameId);
      }
    }, 0);
  }

  private cleanupCancelledGame(gameId: number, leavingUserId: number) {
    const room = this.rooms.get(gameId);
    if (!room) return;

    const otherPlayerId = room.player1Id === leavingUserId ? room.player2Id : room.player1Id;
    
    if (otherPlayerId && this.userToRoom.get(otherPlayerId) === gameId) {
      this.connectionManager.emitToUser(otherPlayerId, 'game-cancelled', { gameId });
      this.userToRoom.delete(otherPlayerId);
      this.connectionManager.setStatus(otherPlayerId, UserStatus.ONLINE);
    }

    this.finalizeRoomCleanup(gameId);
  }

  private cleanupForfeitedGame(gameId: number, forfeitingUserId: number) {
    const room = this.rooms.get(gameId);
    if (!room) return;

    room.status = GameStatus.FINISHED;

    if (room.isLocal) {
      this.finalizeRoomCleanup(gameId);
      return;
    }

    if (!room.player2Id) {
      this.finalizeRoomCleanup(gameId);
      return;
    }

    const winnerId = room.player1Id === forfeitingUserId ? room.player2Id : room.player1Id;
    const loserId = forfeitingUserId;

    if (room.player1Id === winnerId) {
      room.player1Score = this.WIN_SCORE;
    } else {
      room.player2Score = this.WIN_SCORE;
    }

    if (this.userToRoom.get(winnerId) === gameId) {
      this.connectionManager.emitToUser(winnerId, 'game-ended', {
        gameId,
        winnerId,
        finalScore: {
          player1: room.player1Score,
          player2: room.player2Score,
        },
        isLocal: false,
        forfeit: true,
      });

      this.userToRoom.delete(winnerId);
      this.connectionManager.setStatus(winnerId, UserStatus.ONLINE);
    }

    const duration = room.startTime ? Date.now() - room.startTime.getTime() : 0;
    
    this.saveGame(
      gameId, room.player1Id, room.player2Id,
      room.player1Score, room.player2Score,
      room.startTime || new Date(), new Date(), duration
    ).catch(err => console.error('Failed to save forfeit game:', err));

    this.updateGameStats(winnerId, loserId, gameId, duration)
      .catch(err => console.error('Failed to update forfeit stats:', err));

    this.finalizeRoomCleanup(gameId);
  }

  private finalizeRoomCleanup(gameId: number) {
    const room = this.rooms.get(gameId);
    if (!room) return;

    if (room.player1Id && this.userToRoom.get(room.player1Id) === gameId) {
      this.userToRoom.delete(room.player1Id);
      this.connectionManager.setStatus(room.player1Id, UserStatus.ONLINE);
    }
    if (room.player2Id && room.player2Id !== room.player1Id && 
        this.userToRoom.get(room.player2Id) === gameId) {
      this.userToRoom.delete(room.player2Id);
      this.connectionManager.setStatus(room.player2Id, UserStatus.ONLINE);
    }

    this.rooms.delete(gameId);
  }

  isUserInGame(userId: number): boolean {
    return this.userToRoom.has(userId);
  }

  getUserGameId(userId: number): number | undefined {
    return this.userToRoom.get(userId);
  }

  handleDisconnect(userId: number) {
    this.leaveGame(userId);
  }

  // ==================== MATCHMAKING ====================

  async joinMatchmaking(userId: number): Promise<PlayerInfo> {
    if (this.userToRoom.has(userId)) {
      this.leaveGame(userId);
    }

    const user = await this.userService.getUser(userId);

    const waitingRoom = Array.from(this.rooms.values()).find(
      room => room.status === GameStatus.WAITING && 
              !room.isPrivate && 
              !room.player2Id
    );

    if (waitingRoom) {
      waitingRoom.player2Id = userId;
      waitingRoom.player2Name = user.username;
      waitingRoom.player2Avatar = user.avatar;
      waitingRoom.status = GameStatus.STARTING;

      this.userToRoom.set(userId, waitingRoom.id);

      this.connectionManager.setStatus(waitingRoom.player1Id, UserStatus.IN_GAME);
      this.connectionManager.setStatus(userId, UserStatus.IN_GAME);

      this.emitToRoom(waitingRoom.id, 'game-starting', {
        gameId: waitingRoom.id,
        player1: {
          id: waitingRoom.player1Id,
          name: waitingRoom.player1Name,
          avatar: waitingRoom.player1Avatar,
        },
        player2: {
          id: userId,
          name: user.username,
          avatar: user.avatar,
        },
      });

      setTimeout(() => {
        this.startGame(waitingRoom.id);
      }, 3000);

      return {
        playerId: userId,
        playerName: user.username,
        playerAvatar: user.avatar,
        playerNumber: 2,
        gameId: waitingRoom.id,
      };
    } else {
      const gameId = await this.generateGameId();
      const newRoom: GameRoom = {
        id: gameId,
        player1Id: userId,
        player1Name: user.username,
        player1Avatar: user.avatar,
        player1Score: 0,
        player1Disconnected: false,
        paddleLeft: 45,
        paddleLeftDirection: PaddleDirection.NONE,

        player2Score: 0,
        player2Disconnected: false,
        paddleRight: 45,
        paddleRightDirection: PaddleDirection.NONE,

        ballX: 50,
        ballY: 50,
        ballSpeedX: 0,
        ballSpeedY: 0,
        ballSpeed: this.INITIAL_BALL_SPEED,

        status: GameStatus.WAITING,
        isPrivate: false,
        lastUpdateTime: new Date(),
      };

      this.rooms.set(gameId, newRoom);
      this.userToRoom.set(userId, gameId);

      this.connectionManager.setStatus(userId, UserStatus.IN_GAME);

      return {
        playerId: userId,
        playerName: user.username,
        playerAvatar: user.avatar,
        playerNumber: 1,
        gameId,
      };
    }
  }

  // ==================== PRIVATE GAMES ====================

  async createPrivateGame(userId: number): Promise<PlayerInfo> {
    if (this.userToRoom.has(userId)) {
      this.leaveGame(userId);
    }

    const user = await this.userService.getUser(userId);
    const gameId = await this.generateGameId();

    const newRoom: GameRoom = {
      id: gameId,
      player1Id: userId,
      player1Name: user.username,
      player1Avatar: user.avatar,
      player1Score: 0,
      player1Disconnected: false,
      paddleLeft: 45,
      paddleLeftDirection: PaddleDirection.NONE,

      player2Score: 0,
      player2Disconnected: false,
      paddleRight: 45,
      paddleRightDirection: PaddleDirection.NONE,

      ballX: 50,
      ballY: 50,
      ballSpeedX: 0,
      ballSpeedY: 0,
      ballSpeed: this.INITIAL_BALL_SPEED,

      status: GameStatus.WAITING,
      isPrivate: true,
      lastUpdateTime: new Date(),
    };

    this.rooms.set(gameId, newRoom);
    this.userToRoom.set(userId, gameId);

    this.connectionManager.setStatus(userId, UserStatus.IN_GAME);

    return {
      playerId: userId,
      playerName: user.username,
      playerAvatar: user.avatar,
      playerNumber: 1,
      gameId,
    };
  }

  async joinPrivateGame(userId: number, gameId: number): Promise<PlayerInfo> {
    const room = this.rooms.get(gameId);

    if (!room) {
      throw new Error('Game not found');
    }

    if (!room.isPrivate) {
      throw new Error('Game is not private');
    }

    if (room.player2Id) {
      throw new Error('Game is full');
    }

    if (room.player1Id === userId) {
      throw new Error('Cannot join your own game');
    }

    if (room.status === GameStatus.FINISHED) {
      throw new Error('Game is no longer available');
    }

    if (this.userToRoom.has(userId)) {
      this.leaveGame(userId);
    }

    const user = await this.userService.getUser(userId);

    room.player2Id = userId;
    room.player2Name = user.username;
    room.player2Avatar = user.avatar;
    room.status = GameStatus.STARTING;

    this.userToRoom.set(userId, gameId);

    this.connectionManager.setStatus(userId, UserStatus.IN_GAME);
    this.connectionManager.setStatus(room.player1Id, UserStatus.IN_GAME);

    this.emitToRoom(gameId, 'game-starting', {
      gameId,
      player1: {
        id: room.player1Id,
        name: room.player1Name,
        avatar: room.player1Avatar,
      },
      player2: {
        id: userId,
        name: user.username,
        avatar: user.avatar,
      },
    });

    setTimeout(() => {
      this.startGame(gameId);
    }, 3000);

    return {
      playerId: userId,
      playerName: user.username,
      playerAvatar: user.avatar,
      playerNumber: 2,
      gameId,
    };
  }

  async createLocalGame(
    userId: number,
    player1Name: string,
    player2Name: string
  ): Promise<PlayerInfo> {
    if (this.userToRoom.has(userId)) {
      this.leaveGame(userId);
    }

    const user = await this.userService.getUser(userId);
    const gameId = await this.generateGameId();

    const newRoom: GameRoom = {
      id: gameId,
      player1Id: userId,
      player1Name: player1Name,
      player1Avatar: user.avatar,
      player1Score: 0,
      player1Disconnected: false,
      paddleLeft: 45,
      paddleLeftDirection: PaddleDirection.NONE,

      player2Id: userId,
      player2Name: player2Name,
      player2Avatar: user.avatar,
      player2Score: 0,
      player2Disconnected: false,
      paddleRight: 45,
      paddleRightDirection: PaddleDirection.NONE,

      ballX: 50,
      ballY: 50,
      ballSpeedX: 0,
      ballSpeedY: 0,
      ballSpeed: this.INITIAL_BALL_SPEED,

      status: GameStatus.STARTING,
      isPrivate: false,
      isLocal: true,
      lastUpdateTime: new Date(),
    };

    this.rooms.set(gameId, newRoom);
    this.userToRoom.set(userId, gameId);

    this.connectionManager.setStatus(userId, UserStatus.IN_GAME);

    this.connectionManager.emitToUser(userId, 'game-starting', {
      gameId,
      player1: {
        id: userId,
        name: player1Name,
        avatar: user.avatar,
      },
      player2: {
        id: userId,
        name: player2Name,
        avatar: user.avatar,
      },
      isLocal: true,
    });

    setTimeout(() => {
      this.startGame(gameId);
    }, 3000);

    return {
      playerId: userId,
      playerName: player1Name,
      playerAvatar: user.avatar,
      playerNumber: 1,
      gameId,
      isLocal: true,
    };
  }

  // ==================== TOURNAMENT ====================

  async createTournamentGame(
    player1Id: number,
    player2Id: number,
    tournamentId: number,
    round: number,
    matchId: string
  ): Promise<number> {
    const gameId = await this.generateGameId();
    
    const [player1, player2] = await Promise.all([
      this.userService.getUser(player1Id),
      this.userService.getUser(player2Id),
    ]);

    const gameRoom: GameRoom = {
      id: gameId,
      player1Id,
      player1Name: player1.username,
      player1Avatar: player1.avatar,
      player1Score: 0,
      player1Disconnected: false,
      paddleLeft: 45,
      paddleLeftDirection: PaddleDirection.NONE,

      player2Id,
      player2Name: player2.username,
      player2Avatar: player2.avatar,
      player2Score: 0,
      player2Disconnected: false,
      paddleRight: 45,
      paddleRightDirection: PaddleDirection.NONE,

      ballX: 50,
      ballY: 50,
      ballSpeedX: 0,
      ballSpeedY: 0,
      ballSpeed: this.INITIAL_BALL_SPEED,

      status: GameStatus.STARTING,
      isPrivate: false,
      lastUpdateTime: new Date(),

      tournamentId: tournamentId,
      tournamentRound: round,
      tournamentMatch: matchId,
    };

    this.rooms.set(gameId, gameRoom);
    this.userToRoom.set(player1Id, gameId);
    this.userToRoom.set(player2Id, gameId);

    this.connectionManager.setStatus(player1Id, UserStatus.IN_GAME);
    this.connectionManager.setStatus(player2Id, UserStatus.IN_GAME);

    await this.prisma.game.create({
      data: {
        id: gameId,
        player1: player1Id,
        player2: player2Id,
        score1: 0,
        score2: 0,
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        tournamentId,
        tournamentRound: round,
        tournamentMatch: matchId,
      },
    });

    const gameStartingPayload = {
      gameId,
      player1: {
        id: player1Id,
        name: player1.username,
        avatar: player1.avatar,
      },
      player2: {
        id: player2Id,
        name: player2.username,
        avatar: player2.avatar,
      },
      tournamentId,
      round,
      matchId,
    };

    this.connectionManager.emitToUser(player1Id, 'game-starting', gameStartingPayload);
    this.connectionManager.emitToUser(player2Id, 'game-starting', gameStartingPayload);

    setTimeout(() => {
      this.startGame(gameId);
    }, 3000);

    return gameId;
  }

  async createLocalTournamentGame(
    creatorId: number,
    player1Name: string,
    player2Name: string,
    tournamentId: number,
    round: number,
    matchId: string
  ): Promise<number> {
    // Leave any existing game
    if (this.userToRoom.has(creatorId)) {
      this.leaveGame(creatorId);
    }

    const user = await this.userService.getUser(creatorId);
    const gameId = await this.generateGameId();

    const newRoom: GameRoom = {
      id: gameId,
      player1Id: creatorId,
      player1Name: player1Name,
      player1Avatar: user.avatar,
      player1Score: 0,
      player1Disconnected: false,
      paddleLeft: 45,
      paddleLeftDirection: PaddleDirection.NONE,

      player2Id: creatorId,  // Same user controls both
      player2Name: player2Name,
      player2Avatar: user.avatar,
      player2Score: 0,
      player2Disconnected: false,
      paddleRight: 45,
      paddleRightDirection: PaddleDirection.NONE,

      ballX: 50,
      ballY: 50,
      ballSpeedX: 0,
      ballSpeedY: 0,
      ballSpeed: this.INITIAL_BALL_SPEED,

      status: GameStatus.STARTING,
      isPrivate: false,
      isLocal: true,
      isLocalTournament: true,  // New flag
      lastUpdateTime: new Date(),

      tournamentId: tournamentId,
      tournamentRound: round,
      tournamentMatch: matchId,
    };

    this.rooms.set(gameId, newRoom);
    this.userToRoom.set(creatorId, gameId);

    this.connectionManager.setStatus(creatorId, UserStatus.IN_GAME);

    // Create DB record for tournament tracking
    await this.prisma.game.create({
      data: {
        id: gameId,
        player1: creatorId,
        player2: creatorId,
        score1: 0,
        score2: 0,
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        gameType: 'tournament',
        tournamentId,
        tournamentRound: round,
        tournamentMatch: matchId,
      },
    });

    // Emit game starting
    this.connectionManager.emitToUser(creatorId, 'game-starting', {
      gameId,
      player1: { id: creatorId, name: player1Name, avatar: user.avatar },
      player2: { id: creatorId, name: player2Name, avatar: user.avatar },
      isLocal: true,
      isLocalTournament: true,
      tournamentId,
      round,
      matchId,
    });

    setTimeout(() => {
      this.startGame(gameId);
    }, 3000);

    return gameId;
  }

  // ==================== GAME LOOP ====================

  private startGame(gameId: number) {
    const room = this.rooms.get(gameId);

    if (!room || !room.player2Id) {
      return;
    }

    if (room.status === GameStatus.FINISHED) {
      return;
    }

    const player1StillHere = this.userToRoom.get(room.player1Id) === gameId;
    const player2StillHere = this.userToRoom.get(room.player2Id) === gameId;

    if (!player1StillHere || !player2StillHere) {
      this.finalizeRoomCleanup(gameId);
      return;
    }

    room.status = GameStatus.IN_PROGRESS;
    room.startTime = new Date();
    this.initializeBall(room);

    this.emitSound(gameId, 'gameStart');

    const intervalId = setInterval(() => {
      this.gameLoop(gameId);
    }, this.REFRESH_RATE);

    room.intervalId = intervalId;
  }

  private gameLoop(gameId: number) {
    const room = this.rooms.get(gameId);

    if (!room) {
      return;
    }

    if (room.status === GameStatus.FINISHED) {
      if (room.intervalId) {
        clearInterval(room.intervalId);
        room.intervalId = undefined;
      }
      return;
    }

    const now = Date.now();

    // Check reconnection timeouts
    if (room.player1Disconnected && room.player1DisconnectedAt) {
      const elapsed = now - room.player1DisconnectedAt.getTime();
      if (elapsed > this.RECONNECT_TIMEOUT) {
        console.log(`Player 1 reconnect timeout - auto-forfeiting game ${gameId}`);
        room.player2Score = this.WIN_SCORE;
      }
    }
    
    if (room.player2Disconnected && room.player2DisconnectedAt) {
      const elapsed = now - room.player2DisconnectedAt.getTime();
      if (elapsed > this.RECONNECT_TIMEOUT) {
        console.log(`Player 2 reconnect timeout - auto-forfeiting game ${gameId}`);
        room.player1Score = this.WIN_SCORE;
      }
    }

    // Check if players are still here (including disconnected within window)
    const player1StillHere = room.player1Id && (
      this.userToRoom.get(room.player1Id) === gameId || 
      (room.player1Disconnected && room.player1DisconnectedAt && 
       (now - room.player1DisconnectedAt.getTime()) <= this.RECONNECT_TIMEOUT)
    );
    const player2StillHere = room.player2Id && (
      this.userToRoom.get(room.player2Id) === gameId ||
      (room.player2Disconnected && room.player2DisconnectedAt &&
       (now - room.player2DisconnectedAt.getTime()) <= this.RECONNECT_TIMEOUT)
    );

    if (!player1StillHere && !player2StillHere) {
      if (room.intervalId) {
        clearInterval(room.intervalId);
        room.intervalId = undefined;
      }
      room.status = GameStatus.FINISHED;
      this.finalizeRoomCleanup(gameId);
      return;
    }

    // Update paddles (only for connected players)
    if (!room.player1Disconnected) {
      if (room.paddleLeftDirection === PaddleDirection.UP) {
        room.paddleLeft = Math.max(0, room.paddleLeft - this.PADDLE_SPEED);
      } else if (room.paddleLeftDirection === PaddleDirection.DOWN) {
        room.paddleLeft = Math.min(90, room.paddleLeft + this.PADDLE_SPEED);
      }
    }
    
    if (!room.player2Disconnected) {
      if (room.paddleRightDirection === PaddleDirection.UP) {
        room.paddleRight = Math.max(0, room.paddleRight - this.PADDLE_SPEED);
      } else if (room.paddleRightDirection === PaddleDirection.DOWN) {
        room.paddleRight = Math.min(90, room.paddleRight + this.PADDLE_SPEED);
      }
    }

    // Store paddle velocities for momentum
    (room as any).paddleLeftVelocity = room.paddleLeftDirection === PaddleDirection.UP ? -this.PADDLE_SPEED : 
                                        room.paddleLeftDirection === PaddleDirection.DOWN ? this.PADDLE_SPEED : 0;
    (room as any).paddleRightVelocity = room.paddleRightDirection === PaddleDirection.UP ? -this.PADDLE_SPEED : 
                                         room.paddleRightDirection === PaddleDirection.DOWN ? this.PADDLE_SPEED : 0;

    this.updateBall(room);

    const state: GameState = {
      gameId: room.id,
      player1Score: room.player1Score,
      player2Score: room.player2Score,
      paddleLeft: room.paddleLeft,
      paddleRight: room.paddleRight,
      ballX: room.ballX,
      ballY: room.ballY,
      status: room.status,
    };

    this.emitToRoom(gameId, 'game-update', state);

    if (room.player1Score >= this.WIN_SCORE || room.player2Score >= this.WIN_SCORE) {
      this.endGame(gameId);
    }
  }

  private initializeBall(room: GameRoom) {
    room.ballX = 50;
    room.ballY = 50;
    room.ballSpeed = this.INITIAL_BALL_SPEED;

    const angle = (Math.random() - 0.5) * Math.PI / 3;
    const direction = Math.random() > 0.5 ? 1 : -1;
    
    room.ballSpeedX = direction * this.INITIAL_BALL_SPEED * Math.cos(angle);
    room.ballSpeedY = this.INITIAL_BALL_SPEED * Math.sin(angle);
    
    (room as any).prevBallX = room.ballX;
    (room as any).prevBallY = room.ballY;
  }

  private updateBall(room: GameRoom) {
    const prevBallX = room.ballX;
    const prevBallY = room.ballY;
    
    room.ballSpeedX *= this.BALL_SPEED_DECAY;
    room.ballSpeedY *= this.BALL_SPEED_DECAY;
    room.ballSpeed *= this.BALL_SPEED_DECAY;

    let newBallX = room.ballX + room.ballSpeedX;
    let newBallY = room.ballY + room.ballSpeedY;
    
    const currentSpeed = Math.sqrt(
      room.ballSpeedX * room.ballSpeedX + 
      room.ballSpeedY * room.ballSpeedY
    );
    if (currentSpeed < 0.1) {
      this.initializeBall(room);
      return;
    }

    if (newBallY <= this.BALL_RADIUS) {
      newBallY = this.BALL_RADIUS;
      room.ballSpeedY *= -1;
      this.emitSound(room.id, 'wallHit');
    } else if (newBallY >= 100 - this.BALL_RADIUS) {
      newBallY = 100 - this.BALL_RADIUS;
      room.ballSpeedY *= -1;
      this.emitSound(room.id, 'wallHit');
    }

    const ballRadius = this.BALL_RADIUS / this.GAME_ASPECT_RATIO;
    
    const leftPaddleX = this.LEFT_PADDLE_X + this.PADDLE_WIDTH;
    const rightPaddleX = this.RIGHT_PADDLE_X - this.PADDLE_WIDTH;
    
    const COLLISION_TOLERANCE = 3;
    
    if (room.ballSpeedX < 0) {
      const ballLeftEdgeNow = newBallX - ballRadius;
      const ballLeftEdgePrev = prevBallX - ballRadius;
      
      if (ballLeftEdgeNow <= leftPaddleX && ballLeftEdgePrev > ballLeftEdgeNow) {
        let collisionY: number;
        if (ballLeftEdgePrev !== ballLeftEdgeNow) {
          const t = Math.max(0, Math.min(1, (leftPaddleX - ballLeftEdgePrev) / (ballLeftEdgeNow - ballLeftEdgePrev)));
          collisionY = prevBallY + t * (newBallY - prevBallY);
        } else {
          collisionY = newBallY;
        }
        
        const paddleTop = room.paddleLeft - COLLISION_TOLERANCE;
        const paddleBottom = room.paddleLeft + this.PADDLE_HEIGHT + COLLISION_TOLERANCE;
        
        if (collisionY >= paddleTop && collisionY <= paddleBottom) {
          this.handlePaddleCollision(room, true, collisionY);
          newBallX = leftPaddleX + ballRadius + 0.5;
        }
      }
    }
    
    if (room.ballSpeedX > 0) {
      const ballRightEdgeNow = newBallX + ballRadius;
      const ballRightEdgePrev = prevBallX + ballRadius;
      
      if (ballRightEdgeNow >= rightPaddleX && ballRightEdgePrev < ballRightEdgeNow) {
        let collisionY: number;
        if (ballRightEdgePrev !== ballRightEdgeNow) {
          const t = Math.max(0, Math.min(1, (rightPaddleX - ballRightEdgePrev) / (ballRightEdgeNow - ballRightEdgePrev)));
          collisionY = prevBallY + t * (newBallY - prevBallY);
        } else {
          collisionY = newBallY;
        }
        
        const paddleTop = room.paddleRight - COLLISION_TOLERANCE;
        const paddleBottom = room.paddleRight + this.PADDLE_HEIGHT + COLLISION_TOLERANCE;
        
        if (collisionY >= paddleTop && collisionY <= paddleBottom) {
          this.handlePaddleCollision(room, false, collisionY);
          newBallX = rightPaddleX - ballRadius - 0.5;
        }
      }
    }

    room.ballX = newBallX;
    room.ballY = newBallY;

    if (room.ballX <= -ballRadius) {
      room.player2Score++;
      this.emitSound(room.id, 'score');
      this.initializeBall(room);
    } else if (room.ballX >= 100 + ballRadius) {
      room.player1Score++;
      this.emitSound(room.id, 'score');
      this.initializeBall(room);
    }
  }

  private handlePaddleCollision(room: GameRoom, isLeftPaddle: boolean, collisionY?: number) {
    this.emitSound(room.id, 'paddleHit');
    const ballRadius = this.BALL_RADIUS / this.GAME_ASPECT_RATIO;
    
    if (isLeftPaddle) {
      room.ballX = this.LEFT_PADDLE_X + this.PADDLE_WIDTH + ballRadius + 0.5;
    } else {
      room.ballX = this.RIGHT_PADDLE_X - this.PADDLE_WIDTH - ballRadius - 0.5;
    }

    const paddleY = isLeftPaddle ? room.paddleLeft : room.paddleRight;
    const hitY = collisionY !== undefined ? collisionY : room.ballY;
    const hitPosition = (hitY - paddleY) / this.PADDLE_HEIGHT;
    const normalizedHit = Math.max(-1, Math.min(1, (hitPosition - 0.5) * 2));

    const paddleVelocity = isLeftPaddle 
      ? (room as any).paddleLeftVelocity || 0
      : (room as any).paddleRightVelocity || 0;

    const currentSpeed = Math.sqrt(
      room.ballSpeedX * room.ballSpeedX + 
      room.ballSpeedY * room.ballSpeedY
    );
    
    let newSpeed = Math.min(
      currentSpeed * this.BALL_ACCELERATION,
      this.MAX_BALL_SPEED
    );

    const momentumBonus = Math.abs(paddleVelocity) * this.PADDLE_MOMENTUM_MULTIPLIER;
    newSpeed += momentumBonus;
    
    newSpeed = Math.max(newSpeed, this.INITIAL_BALL_SPEED);
    newSpeed = Math.min(newSpeed, this.MAX_BALL_SPEED);

    const horizontalDirection = isLeftPaddle ? 1 : -1;
    
    const baseAngle = normalizedHit * (Math.PI / 3);
    const spinAngle = baseAngle * this.SPIN_INFLUENCE;
    
    const paddleMomentumY = paddleVelocity * this.PADDLE_MOMENTUM_MULTIPLIER * 0.5;
    
    room.ballSpeedX = horizontalDirection * newSpeed * Math.cos(spinAngle);
    room.ballSpeedY = newSpeed * Math.sin(spinAngle) + paddleMomentumY;

    room.ballSpeed = newSpeed;

    const randomness = (Math.random() - 0.5) * 0.02;
    room.ballSpeedY += randomness;
    
    if (isLeftPaddle && room.ballSpeedX < 0.1) {
      room.ballSpeedX = this.INITIAL_BALL_SPEED;
    } else if (!isLeftPaddle && room.ballSpeedX > -0.1) {
      room.ballSpeedX = -this.INITIAL_BALL_SPEED;
    }
  }

  private async endGame(gameId: number) {
    const room = this.rooms.get(gameId);

    if (!room || !room.player2Id) {
      return;
    }

    if (room.status === GameStatus.FINISHED) {
      return;
    }

    if (room.intervalId) {
      clearInterval(room.intervalId);
      room.intervalId = undefined;
    }

    room.status = GameStatus.FINISHED;

    const winnerId = room.player1Score > room.player2Score ? room.player1Id : room.player2Id;
    const loserId = room.player1Score > room.player2Score ? room.player2Id : room.player1Id;
    const duration = room.startTime ? Date.now() - room.startTime.getTime() : 0;
    
    // Query tournament info BEFORE emitting game-ended
    const gameInfo = await this.prisma.game.findUnique({
      where: { id: gameId },
      select: { 
        tournamentId: true,
        tournamentRound: true,
        tournamentMatch: true,
      },
    });

    // Emit game ended WITH tournament info
    this.emitToRoom(gameId, 'game-ended', {
      gameId,
      winnerId,
      finalScore: {
        player1: room.player1Score,
        player2: room.player2Score,
      },
      isLocal: room.isLocal || false,
      isLocalTournament: room.isLocalTournament || false,
      tournamentId: gameInfo?.tournamentId || null,
      tournamentRound: gameInfo?.tournamentRound || null,
      tournamentMatch: gameInfo?.tournamentMatch || null,
    });

    let gameType: 'quickplay' | 'private' | 'ai' | 'local' | 'tournament' = 'quickplay';
    if (gameInfo?.tournamentId) {
      gameType = 'tournament';
    } else if (room.vsAI) {
      gameType = 'ai';
    } else if (room.isLocal) {
      gameType = 'local';
    } else if (room.isPrivate) {
      gameType = 'private';
    }

    await this.saveGame(
      gameId,
      room.player1Id,
      room.player2Id,
      room.player1Score,
      room.player2Score,
      room.startTime!,
      new Date(),
      duration,
      gameType,
      gameInfo?.tournamentId || undefined,
      gameInfo?.tournamentRound || undefined,
      gameInfo?.tournamentMatch || undefined,
      room.isLocal,
      room.vsAI,
      room.isPrivate,
    );

    // Only update ELO for quickplay and tournament games
    const isTournament = !!gameInfo?.tournamentId;
    const shouldUpdateElo = (!room.isLocal && !room.vsAI && !room.isPrivate) || isTournament;

    if (shouldUpdateElo) {
      await this.updateGameStats(winnerId, loserId, gameId, duration);
    } else {
      // For non-ELO games, just add to game history without updating stats
      const realUserId = room.vsAI 
        ? (room.player1Id !== await this.getAIUserId() ? room.player1Id : room.player2Id)
        : room.player1Id;
      
      const user = await this.prisma.user.findUnique({
        where: { id: realUserId },
      });

      if (user) {
        const history = parseJsonArray(user.gameHistory);
        history.push(gameId);
        
        await this.prisma.user.update({
          where: { id: realUserId },
          data: {
            gameHistory: stringifyJsonArray(history),
          },
        });
      }
    }

    if (gameInfo?.tournamentId) {
      await this.handleTournamentGameEnd(gameId, winnerId, loserId, room);
    }

    this.cleanupAfterGameEnd(gameId, room);
  }

  // ==================== PLAYER ACTIONS ====================

  movePaddle(
    userId: number,
    gameId: number,
    direction: PaddleDirection,
    playerNumber?: 1 | 2
  ) {
    const room = this.rooms.get(gameId);

    if (!room) {
      throw new Error('Game not found');
    }

    if (this.userToRoom.get(userId) !== gameId) {
      throw new Error('Not in this game');
    }

    if (room.isLocal) {
      if (!playerNumber) {
        throw new Error('Player number required for local games');
      }

      if (room.player1Id !== userId) {
        throw new Error('Not authorized for this game');
      }

      if (playerNumber === 1) {
        room.paddleLeftDirection = direction;
      } else if (playerNumber === 2) {
        room.paddleRightDirection = direction;
      } else {
        throw new Error('Invalid player number');
      }
    } else {
      if (room.player1Id === userId) {
        room.paddleLeftDirection = direction;
      } else if (room.player2Id === userId) {
        room.paddleRightDirection = direction;
      } else {
        throw new Error('Not a player in this game');
      }
    }
  }

  // ==================== SPECTATING ====================

  async spectateGame(gameId: number): Promise<GameState | null> {
    const room = this.rooms.get(gameId);

    if (!room || room.status !== GameStatus.IN_PROGRESS) {
      return null;
    }

    return {
      gameId: room.id,
      player1Score: room.player1Score,
      player2Score: room.player2Score,
      paddleLeft: room.paddleLeft,
      paddleRight: room.paddleRight,
      ballX: room.ballX,
      ballY: room.ballY,
      status: room.status,
    };
  }

  // ==================== UTILITY ====================

  private emitToRoom(gameId: number, event: string, data: any) {
    const room = this.rooms.get(gameId);
    if (!room) return;

    if (room.player1Id && this.userToRoom.get(room.player1Id) === gameId) {
      this.connectionManager.emitToUser(room.player1Id, event, data);
    }

    if (room.player2Id && room.player2Id !== room.player1Id && 
        this.userToRoom.get(room.player2Id) === gameId) {
      this.connectionManager.emitToUser(room.player2Id, event, data);
    }
  }

  private async getAIUserId(): Promise<number> {
    if (this.aiUserId) return this.aiUserId;
    
    const aiUser = await this.prisma.user.findUnique({
      where: { email: 'ai@transcendence.local' },
      select: { id: true },
    });
    
    this.aiUserId = aiUser?.id || 0;
    return this.aiUserId;
  }

  getActiveGames() {
    return Array.from(this.rooms.values())
      .filter(room => room.status === GameStatus.IN_PROGRESS && room.player2Id)
      .map(room => ({
        gameId: room.id,
        player1Name: room.player1Name,
        player2Name: room.player2Name,
        player1Score: room.player1Score,
        player2Score: room.player2Score,
        isPrivate: room.isPrivate,
      }));
  }

  // ==================== DATABASE ====================

  private async saveGame(
    roomId: number,
    player1Id: number,
    player2Id: number,
    score1: number,
    score2: number,
    startTime: Date,
    endTime: Date,
    duration: number,
    gameType: 'quickplay' | 'private' | 'ai' | 'local' | 'tournament' = 'quickplay',
    tournamentId?: number,
    tournamentRound?: number,
    tournamentMatch?: string,
    isLocal?: boolean,
    isAI?: boolean,
    isPrivate?: boolean,
  ): Promise<number | null> {
    try {
      // Check if game already exists (tournament games pre-create the record)
      const existing = await this.prisma.game.findUnique({
        where: { id: roomId },
      });

      if (existing) {
        // Update existing (tournament game)
        await this.prisma.game.update({
          where: { id: roomId },
          data: {
            score1,
            score2,
            endTime,
            duration,
            gameType,
          },
        });
        console.log(`Updated game ${roomId}`);
        return roomId;
      }

      // Create new game with the room ID as the database ID
      const game = await this.prisma.game.create({
        data: {
          id: roomId,  // ADD THIS LINE - use room ID as database ID
          player1: player1Id,
          player2: player2Id,
          score1,
          score2,
          startTime,
          endTime,
          duration,
          gameType,
          tournamentId,
          tournamentRound,
          tournamentMatch,
        },
      });
      console.log(`Saved game ${game.id} (room ${roomId})`);
      return game.id;
    } catch (error: any) {
      console.error(`Failed to save game for room ${roomId}:`, error);
      return null;
    }
  }

  private async updateGameStats(winnerId: number, loserId: number, gameId: number, duration: number) {
    const [winner, loser] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: winnerId } }),
      this.prisma.user.findUnique({ where: { id: loserId } }),
    ]);

    if (!winner || !loser) return;

    const [newWinnerScore, newLoserScore] = this.calculateEloScores(winner.score, loser.score);

    const winnerGamesPlayed = winner.gamesPlayed + 1;
    const winnerGamesWon = winner.gamesWon + 1;
    const winnerWinRate = winnerGamesWon / winnerGamesPlayed;
    const winnerHistory = parseJsonArray(winner.gameHistory);
    winnerHistory.push(gameId);

    await this.prisma.user.update({
      where: { id: winnerId },
      data: {
        gamesWon: winnerGamesWon,
        gamesPlayed: winnerGamesPlayed,
        winRate: winnerWinRate,
        playTime: winner.playTime + duration,
        score: Math.floor(newWinnerScore),
        gameHistory: stringifyJsonArray(winnerHistory),
      },
    });

    const loserGamesPlayed = loser.gamesPlayed + 1;
    const loserWinRate = loser.gamesWon / loserGamesPlayed;
    const loserHistory = parseJsonArray(loser.gameHistory);
    loserHistory.push(gameId);

    await this.prisma.user.update({
      where: { id: loserId },
      data: {
        gamesLost: loser.gamesLost + 1,
        gamesPlayed: loserGamesPlayed,
        winRate: loserWinRate,
        playTime: loser.playTime + duration,
        score: Math.floor(newLoserScore),
        gameHistory: stringifyJsonArray(loserHistory),
      },
    });

    await this.updateRanks();
  }

  private calculateEloScores(winnerRating: number, loserRating: number): [number, number] {
    const K = 32;
    const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));

    const newWinnerRating = winnerRating + K * (1 - expectedWinner);
    const newLoserRating = loserRating + K * (0 - expectedLoser);

    return [newWinnerRating, newLoserRating];
  }

  private async updateRanks() {
    const users = await this.prisma.user.findMany({
      where: {
        score: {
          not: 1200,
        },
        email: {
          not: 'ai@transcendence.local',
        },
      },
      orderBy: {
        score: 'desc',
      },
      select: {
        id: true,
      },
    });

    const updates = users.map((user: { id: number }, index: number) =>
      this.prisma.user.update({
        where: { id: user.id },
        data: { rank: index + 1 },
      }),
    );

    await Promise.all(updates);
  }

  private async generateGameId(): Promise<number> {
    const id = Math.floor(Math.random() * 1000000) + 1;
    
    const exists = await this.prisma.game.findUnique({
      where: { id },
    });

    if (exists || this.rooms.has(id)) {
      return this.generateGameId();
    }

    return id;
  }

  getGameInfo(gameId: number): { isLocal: boolean; player1Name: string; player2Name: string } | null {
    const room = this.rooms.get(gameId);
    if (!room) return null;

    return {
      isLocal: room.isLocal || false,
      player1Name: room.player1Name,
      player2Name: room.player2Name || 'Player 2',
    };
  }
}
