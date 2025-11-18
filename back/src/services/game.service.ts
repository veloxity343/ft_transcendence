import { PrismaClient } from '@prisma/client';
import { WebSocket } from '@fastify/websocket';
import { GameRoom, GameState, PlayerInfo } from '../game/interfaces/game-room.interface';
import { GameStatus, PaddleDirection } from '../game/types/game.types';
import { UserService } from './user.service';
import { ConnectionManager, UserStatus } from '../websocket/connection.manager';
import { parseJsonArray, stringifyJsonArray, addToJsonArray } from '../utils/array-helpers';

export class GameService {
  private rooms = new Map<number, GameRoom>();
  private userToRoom = new Map<number, number>();

  // Game constants
  private readonly REFRESH_RATE = 10; // ms
  private readonly PADDLE_SPEED = 1;
  private readonly INITIAL_BALL_SPEED = 0.25;
  private readonly WIN_SCORE = 11;
  private readonly PADDLE_HEIGHT = 10; // percentage
  private readonly BALL_RADIUS = 1; // vh units
  private readonly GAME_ASPECT_RATIO = 16 / 9;

  constructor(
    private prisma: PrismaClient,
    private userService: UserService,
    private connectionManager: ConnectionManager,
  ) {}

  // ==================== MATCHMAKING ====================

  async joinMatchmaking(userId: number): Promise<PlayerInfo> {
    if (this.userToRoom.has(userId)) {
      throw new Error('Already in a game');
    }

    const user = await this.userService.getUser(userId);

    // Look for waiting room
    const waitingRoom = Array.from(this.rooms.values()).find(
      room => room.status === GameStatus.WAITING && !room.isPrivate && !room.player2Id
    );

    if (waitingRoom) {
      // Join existing room as player 2
      waitingRoom.player2Id = userId;
      waitingRoom.player2Name = user.username;
      waitingRoom.player2Avatar = user.avatar;
      waitingRoom.status = GameStatus.STARTING;

      this.userToRoom.set(userId, waitingRoom.id);

      // Set both players as in-game
      this.connectionManager.setStatus(waitingRoom.player1Id, UserStatus.IN_GAME);
      this.connectionManager.setStatus(userId, UserStatus.IN_GAME);

      // Notify both players
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

      // Start game after 3 seconds
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
      // Create new room as player 1
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
      throw new Error('Already in a game');
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

  // ==================== GAME LOOP ====================

  private startGame(gameId: number) {
    const room = this.rooms.get(gameId);

    if (!room || !room.player2Id) {
      return;
    }

    room.status = GameStatus.IN_PROGRESS;
    room.startTime = new Date();
    this.initializeBall(room);

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

    // Check for disconnections
    if (room.player1Disconnected) {
      room.player2Score = this.WIN_SCORE;
    } else if (room.player2Disconnected) {
      room.player1Score = this.WIN_SCORE;
    } else {
      // Update game state
      this.updatePaddles(room);
      this.updateBall(room);
    }

    // Send state to clients
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

    // Check for game end
    if (room.player1Score >= this.WIN_SCORE || room.player2Score >= this.WIN_SCORE) {
      this.endGame(gameId);
    }
  }

  private initializeBall(room: GameRoom) {
    room.ballX = 50;
    room.ballY = 50;
    room.ballSpeed = this.INITIAL_BALL_SPEED;

    // Random initial direction
    room.ballSpeedX = Math.random() > 0.5 ? this.INITIAL_BALL_SPEED : -this.INITIAL_BALL_SPEED;
    room.ballSpeedY = (Math.random() - 0.5) * this.INITIAL_BALL_SPEED;
  }

  private updatePaddles(room: GameRoom) {
    // Update left paddle (player 1)
    if (room.paddleLeftDirection === PaddleDirection.UP) {
      room.paddleLeft = Math.max(0, room.paddleLeft - this.PADDLE_SPEED);
    } else if (room.paddleLeftDirection === PaddleDirection.DOWN) {
      room.paddleLeft = Math.min(90, room.paddleLeft + this.PADDLE_SPEED);
    }

    // Update right paddle (player 2)
    if (room.paddleRightDirection === PaddleDirection.UP) {
      room.paddleRight = Math.max(0, room.paddleRight - this.PADDLE_SPEED);
    } else if (room.paddleRightDirection === PaddleDirection.DOWN) {
      room.paddleRight = Math.min(90, room.paddleRight + this.PADDLE_SPEED);
    }
  }

  private updateBall(room: GameRoom) {
    // Update ball position
    room.ballX += room.ballSpeedX;
    room.ballY += room.ballSpeedY;

    // Ball collision with top/bottom walls
    if (room.ballY <= this.BALL_RADIUS) {
      room.ballY = this.BALL_RADIUS;
      room.ballSpeedY *= -1;
    } else if (room.ballY >= 100 - this.BALL_RADIUS) {
      room.ballY = 100 - this.BALL_RADIUS;
      room.ballSpeedY *= -1;
    }

    // Ball collision with left paddle
    if (
      room.ballX <= 3 + this.BALL_RADIUS / this.GAME_ASPECT_RATIO &&
      room.ballY >= room.paddleLeft - 1 &&
      room.ballY <= room.paddleLeft + this.PADDLE_HEIGHT + 1
    ) {
      room.ballX = 3 + this.BALL_RADIUS / this.GAME_ASPECT_RATIO;
      room.ballSpeed *= 1.05;
      room.ballSpeedX = Math.abs(room.ballSpeedX) * 1.05;
      
      const hitPosition = (room.ballY - room.paddleLeft - this.PADDLE_HEIGHT / 2) / (this.PADDLE_HEIGHT / 2);
      room.ballSpeedY = hitPosition * room.ballSpeed * 0.8;
    }

    // Ball collision with right paddle
    if (
      room.ballX >= 97 - this.BALL_RADIUS / this.GAME_ASPECT_RATIO &&
      room.ballY >= room.paddleRight - 1 &&
      room.ballY <= room.paddleRight + this.PADDLE_HEIGHT + 1
    ) {
      room.ballX = 97 - this.BALL_RADIUS / this.GAME_ASPECT_RATIO;
      room.ballSpeed *= 1.05;
      room.ballSpeedX = -Math.abs(room.ballSpeedX) * 1.05;
      
      const hitPosition = (room.ballY - room.paddleRight - this.PADDLE_HEIGHT / 2) / (this.PADDLE_HEIGHT / 2);
      room.ballSpeedY = hitPosition * room.ballSpeed * 0.8;
    }

    // Score points
    if (room.ballX <= 0 - this.BALL_RADIUS / this.GAME_ASPECT_RATIO) {
      room.player2Score++;
      this.initializeBall(room);
    } else if (room.ballX >= 100 + this.BALL_RADIUS / this.GAME_ASPECT_RATIO) {
      room.player1Score++;
      this.initializeBall(room);
    }
  }

  private async endGame(gameId: number) {
    const room = this.rooms.get(gameId);

    if (!room || !room.player2Id) {
      return;
    }

    // Clear interval
    if (room.intervalId) {
      clearInterval(room.intervalId);
    }

    room.status = GameStatus.FINISHED;

    const winnerId = room.player1Score > room.player2Score ? room.player1Id : room.player2Id;
    const loserId = room.player1Score > room.player2Score ? room.player2Id : room.player1Id;

    // Emit game end
    this.emitToRoom(gameId, 'game-ended', {
      gameId,
      winnerId,
      finalScore: {
        player1: room.player1Score,
        player2: room.player2Score,
      },
    });

    // Save game to database
    const duration = room.startTime ? Date.now() - room.startTime.getTime() : 0;
    
    await this.saveGame(
      gameId,
      room.player1Id,
      room.player2Id,
      room.player1Score,
      room.player2Score,
      room.startTime!,
      new Date(),
      duration,
    );

    // Update user stats
    await this.updateGameStats(winnerId, loserId, gameId, duration);

    // Set users back to online
    this.connectionManager.setStatus(room.player1Id, UserStatus.ONLINE);
    this.connectionManager.setStatus(room.player2Id, UserStatus.ONLINE);

    // Remove users from room tracking
    this.userToRoom.delete(room.player1Id);
    this.userToRoom.delete(room.player2Id);

    // Clean up room after 30 seconds
    setTimeout(() => {
      this.rooms.delete(gameId);
    }, 30000);
  }

  // ==================== PLAYER ACTIONS ====================

  movePaddle(userId: number, gameId: number, direction: PaddleDirection) {
    const room = this.rooms.get(gameId);

    if (!room) {
      throw new Error('Game not found');
    }

    if (room.player1Id === userId) {
      room.paddleLeftDirection = direction;
    } else if (room.player2Id === userId) {
      room.paddleRightDirection = direction;
    } else {
      throw new Error('Not a player in this game');
    }
  }

  handleDisconnect(userId: number) {
    const gameId = this.userToRoom.get(userId);

    if (gameId) {
      const room = this.rooms.get(gameId);

      if (room) {
        if (room.player1Id === userId) {
          room.player1Disconnected = true;
        } else if (room.player2Id === userId) {
          room.player2Disconnected = true;
        }

        if (room.status === GameStatus.WAITING) {
          this.cancelGame(gameId);
        }
      }

      this.userToRoom.delete(userId);
    }
  }

  private cancelGame(gameId: number) {
    const room = this.rooms.get(gameId);

    if (!room) {
      return;
    }

    if (room.intervalId) {
      clearInterval(room.intervalId);
    }

    this.emitToRoom(gameId, 'game-cancelled', { gameId });

    if (room.player1Id) {
      this.connectionManager.setStatus(room.player1Id, UserStatus.ONLINE);
      this.userToRoom.delete(room.player1Id);
    }

    if (room.player2Id) {
      this.connectionManager.setStatus(room.player2Id, UserStatus.ONLINE);
      this.userToRoom.delete(room.player2Id);
    }

    this.rooms.delete(gameId);
  }

  // ==================== UTILITY ====================

  private emitToRoom(gameId: number, event: string, data: any) {
    const room = this.rooms.get(gameId);
    if (!room) return;

    if (room.player1Id) {
      this.connectionManager.emitToUser(room.player1Id, event, data);
    }

    if (room.player2Id) {
      this.connectionManager.emitToUser(room.player2Id, event, data);
    }
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
    gameId: number,
    player1Id: number,
    player2Id: number,
    score1: number,
    score2: number,
    startTime: Date,
    endTime: Date,
    duration: number,
  ) {
    try {
      await this.prisma.game.create({
        data: {
          id: gameId,
          player1: player1Id,
          player2: player2Id,
          score1,
          score2,
          startTime,
          endTime,
          duration,
        },
      });
    } catch (error: any) {
      console.error(`Failed to save game ${gameId}:`, error);
    }
  }

  private async updateGameStats(winnerId: number, loserId: number, gameId: number, duration: number) {
    const [winner, loser] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: winnerId } }),
      this.prisma.user.findUnique({ where: { id: loserId } }),
    ]);

    if (!winner || !loser) return;

    // Calculate new ELO scores
    const [newWinnerScore, newLoserScore] = this.calculateEloScores(winner.score, loser.score);

    // Update winner
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

    // Update loser
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

    // Update ranks
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
}
