import { PrismaClient } from '@prisma/client';
import { GameRoom, GameState, PlayerInfo } from '../game/interfaces/game-room.interface';
import { GameStatus, PaddleDirection } from '../game/types/game.types';
import { UserService } from './user.service';
import { ConnectionManager, UserStatus } from '../websocket/connection.manager';
import { parseJsonArray, stringifyJsonArray } from '../utils/array-helpers';

export class GameService {
  private rooms = new Map<number, GameRoom>();
  private userToRoom = new Map<number, number>();

  // Game constants
  private readonly REFRESH_RATE = 10; // ms
  private readonly PADDLE_SPEED = 1;
  private readonly INITIAL_BALL_SPEED = 0.35;
  private readonly MAX_BALL_SPEED = 1.2; // Maximum ball speed cap
  private readonly WIN_SCORE = 11;
  private readonly PADDLE_HEIGHT = 10; // percentage
  private readonly BALL_RADIUS = 1; // vh units
  private readonly GAME_ASPECT_RATIO = 16 / 9;
  
  // Paddle collision zones (x positions in %)
  private readonly LEFT_PADDLE_X = 3;
  private readonly RIGHT_PADDLE_X = 97;
  private readonly PADDLE_WIDTH = 1;
  
  // New physics constants
  private readonly BALL_ACCELERATION = 1.08; // 8% increase per hit
  private readonly PADDLE_MOMENTUM_MULTIPLIER = 0.4; // How much paddle motion affects ball
  private readonly SPIN_INFLUENCE = 0.8; // How much hit position affects angle
  private readonly BALL_SPEED_DECAY = 0.9995; // Natural speed decay

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

    const waitingRoom = Array.from(this.rooms.values()).find(
      room => room.status === GameStatus.WAITING && !room.isPrivate && !room.player2Id
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

  async createLocalGame(
    userId: number,
    player1Name: string,
    player2Name: string
  ): Promise<PlayerInfo> {
    if (this.userToRoom.has(userId)) {
      throw new Error('Already in a game');
    }

    const user = await this.userService.getUser(userId);
    const gameId = await this.generateGameId();

    const newRoom: GameRoom = {
      id: gameId,
      // Both players have the same user ID since it's local
      player1Id: userId,
      player1Name: player1Name,
      player1Avatar: user.avatar,
      player1Score: 0,
      player1Disconnected: false,
      paddleLeft: 45,
      paddleLeftDirection: PaddleDirection.NONE,

      player2Id: userId, // Same user controls both paddles
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
      isLocal: true, // Mark as local game
      lastUpdateTime: new Date(),
    };

    this.rooms.set(gameId, newRoom);
    this.userToRoom.set(userId, gameId);

    this.connectionManager.setStatus(userId, UserStatus.IN_GAME);

    // Emit game starting event
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

    // Start game after countdown
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

    if (room.player1Disconnected) {
      room.player2Score = this.WIN_SCORE;
    } else if (room.player2Disconnected) {
      room.player1Score = this.WIN_SCORE;
    } else {
      this.updatePaddles(room);
      this.updateBall(room);
    }

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

    // Random initial direction with some angle
    const angle = (Math.random() - 0.5) * Math.PI / 3; // ±30 degrees
    const direction = Math.random() > 0.5 ? 1 : -1;
    
    room.ballSpeedX = direction * this.INITIAL_BALL_SPEED * Math.cos(angle);
    room.ballSpeedY = this.INITIAL_BALL_SPEED * Math.sin(angle);
    
    // Store previous position for collision detection
    (room as any).prevBallX = room.ballX;
    (room as any).prevBallY = room.ballY;
  }

  private updatePaddles(room: GameRoom) {
    // Store previous paddle positions for momentum calculation
    const prevPaddleLeft = room.paddleLeft;
    const prevPaddleRight = room.paddleRight;

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

    // Store paddle velocities for momentum transfer
    (room as any).paddleLeftVelocity = room.paddleLeft - prevPaddleLeft;
    (room as any).paddleRightVelocity = room.paddleRight - prevPaddleRight;
  }

  private updateBall(room: GameRoom) {
    // Store previous position BEFORE any updates
    const prevBallX = room.ballX;
    const prevBallY = room.ballY;
    
    // Apply speed decay
    room.ballSpeedX *= this.BALL_SPEED_DECAY;
    room.ballSpeedY *= this.BALL_SPEED_DECAY;
    room.ballSpeed *= this.BALL_SPEED_DECAY;

    // Calculate new position
    let newBallX = room.ballX + room.ballSpeedX;
    let newBallY = room.ballY + room.ballSpeedY;
    
    // Safety check: if ball is stuck (too slow), reinitialize
    const currentSpeed = Math.sqrt(
      room.ballSpeedX * room.ballSpeedX + 
      room.ballSpeedY * room.ballSpeedY
    );
    if (currentSpeed < 0.1) {
      console.log('Ball stuck, reinitializing...');
      this.initializeBall(room);
      return;
    }

    // Ball collision with top/bottom walls
    if (newBallY <= this.BALL_RADIUS) {
      newBallY = this.BALL_RADIUS;
      room.ballSpeedY *= -1;
    } else if (newBallY >= 100 - this.BALL_RADIUS) {
      newBallY = 100 - this.BALL_RADIUS;
      room.ballSpeedY *= -1;
    }

    // ==================== SWEPT PADDLE COLLISION ====================
    // This detects if the ball CROSSED the paddle line, not just where it ended up
    
    const ballRadius = this.BALL_RADIUS / this.GAME_ASPECT_RATIO;
    
    // Paddle collision boundaries (where ball edge would hit)
    const leftPaddleX = this.LEFT_PADDLE_X + this.PADDLE_WIDTH;  // Right edge of left paddle
    const rightPaddleX = this.RIGHT_PADDLE_X - this.PADDLE_WIDTH; // Left edge of right paddle
    
    // Generous collision tolerance to account for network latency
    const COLLISION_TOLERANCE = 3; // Extra vertical tolerance in %
    
    // Left paddle collision - ball moving left
    if (room.ballSpeedX < 0) {
      const ballLeftEdgeNow = newBallX - ballRadius;
      const ballLeftEdgePrev = prevBallX - ballRadius;
      
      // Check if ball crossed or reached the paddle line this frame
      if (ballLeftEdgeNow <= leftPaddleX && ballLeftEdgePrev > ballLeftEdgeNow) {
        // Interpolate to find Y position at moment of crossing
        let collisionY: number;
        if (ballLeftEdgePrev !== ballLeftEdgeNow) {
          const t = Math.max(0, Math.min(1, (leftPaddleX - ballLeftEdgePrev) / (ballLeftEdgeNow - ballLeftEdgePrev)));
          collisionY = prevBallY + t * (newBallY - prevBallY);
        } else {
          collisionY = newBallY;
        }
        
        // Check paddle coverage with tolerance
        const paddleTop = room.paddleLeft - COLLISION_TOLERANCE;
        const paddleBottom = room.paddleLeft + this.PADDLE_HEIGHT + COLLISION_TOLERANCE;
        
        if (collisionY >= paddleTop && collisionY <= paddleBottom) {
          this.handlePaddleCollision(room, true, collisionY);
          newBallX = leftPaddleX + ballRadius + 0.5;
        }
      }
    }
    
    // Right paddle collision - ball moving right  
    if (room.ballSpeedX > 0) {
      const ballRightEdgeNow = newBallX + ballRadius;
      const ballRightEdgePrev = prevBallX + ballRadius;
      
      // Check if ball crossed or reached the paddle line this frame
      if (ballRightEdgeNow >= rightPaddleX && ballRightEdgePrev < ballRightEdgeNow) {
        // Interpolate to find Y position at moment of crossing
        let collisionY: number;
        if (ballRightEdgePrev !== ballRightEdgeNow) {
          const t = Math.max(0, Math.min(1, (rightPaddleX - ballRightEdgePrev) / (ballRightEdgeNow - ballRightEdgePrev)));
          collisionY = prevBallY + t * (newBallY - prevBallY);
        } else {
          collisionY = newBallY;
        }
        
        // Check paddle coverage with tolerance
        const paddleTop = room.paddleRight - COLLISION_TOLERANCE;
        const paddleBottom = room.paddleRight + this.PADDLE_HEIGHT + COLLISION_TOLERANCE;
        
        if (collisionY >= paddleTop && collisionY <= paddleBottom) {
          this.handlePaddleCollision(room, false, collisionY);
          newBallX = rightPaddleX - ballRadius - 0.5;
        }
      }
    }

    // Update ball position
    room.ballX = newBallX;
    room.ballY = newBallY;

    // Score points - ball must be clearly past the goal line
    if (room.ballX <= -ballRadius) {
      room.player2Score++;
      this.initializeBall(room);
    } else if (room.ballX >= 100 + ballRadius) {
      room.player1Score++;
      this.initializeBall(room);
    }
  }

  private handlePaddleCollision(room: GameRoom, isLeftPaddle: boolean, collisionY?: number) {
    const ballRadius = this.BALL_RADIUS / this.GAME_ASPECT_RATIO;
    
    // Position ball at paddle edge to prevent sticking
    if (isLeftPaddle) {
      room.ballX = this.LEFT_PADDLE_X + this.PADDLE_WIDTH + ballRadius + 0.5;
    } else {
      room.ballX = this.RIGHT_PADDLE_X - this.PADDLE_WIDTH - ballRadius - 0.5;
    }

    // Calculate where on paddle the ball hit (0 = top, 1 = bottom)
    const paddleY = isLeftPaddle ? room.paddleLeft : room.paddleRight;
    const hitY = collisionY !== undefined ? collisionY : room.ballY;
    const hitPosition = (hitY - paddleY) / this.PADDLE_HEIGHT;
    const normalizedHit = Math.max(-1, Math.min(1, (hitPosition - 0.5) * 2)); // Clamp -1 to 1

    // Get paddle velocity for momentum transfer
    const paddleVelocity = isLeftPaddle 
      ? (room as any).paddleLeftVelocity || 0
      : (room as any).paddleRightVelocity || 0;

    // Calculate base speed increase
    const currentSpeed = Math.sqrt(
      room.ballSpeedX * room.ballSpeedX + 
      room.ballSpeedY * room.ballSpeedY
    );
    
    // Increase ball speed with each hit (but cap it)
    let newSpeed = Math.min(
      currentSpeed * this.BALL_ACCELERATION,
      this.MAX_BALL_SPEED
    );

    // Add bonus speed from paddle momentum
    const momentumBonus = Math.abs(paddleVelocity) * this.PADDLE_MOMENTUM_MULTIPLIER;
    newSpeed += momentumBonus;
    
    // Ensure minimum speed to prevent getting stuck
    newSpeed = Math.max(newSpeed, this.INITIAL_BALL_SPEED);
    
    // Cap at maximum speed
    newSpeed = Math.min(newSpeed, this.MAX_BALL_SPEED);

    // Calculate new ball direction
    // Reverse horizontal direction
    const horizontalDirection = isLeftPaddle ? 1 : -1;
    
    // Calculate angle based on hit position and spin influence
    const baseAngle = normalizedHit * (Math.PI / 3); // Max ±60 degrees
    const spinAngle = baseAngle * this.SPIN_INFLUENCE;
    
    // Add paddle momentum to vertical component
    const paddleMomentumY = paddleVelocity * this.PADDLE_MOMENTUM_MULTIPLIER * 0.5;
    
    // Set new velocities
    room.ballSpeedX = horizontalDirection * newSpeed * Math.cos(spinAngle);
    room.ballSpeedY = newSpeed * Math.sin(spinAngle) + paddleMomentumY;

    // Update ball speed tracker
    room.ballSpeed = newSpeed;

    // Add slight randomness to prevent perfectly predictable trajectories
    const randomness = (Math.random() - 0.5) * 0.02;
    room.ballSpeedY += randomness;
    
    // Final safety check - ensure ball is actually moving away from paddle
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

    if (room.intervalId) {
      clearInterval(room.intervalId);
    }

    room.status = GameStatus.FINISHED;

    const winnerId = room.player1Score > room.player2Score ? room.player1Id : room.player2Id;
    const loserId = room.player1Score > room.player2Score ? room.player2Id : room.player1Id;

    this.emitToRoom(gameId, 'game-ended', {
      gameId,
      winnerId,
      finalScore: {
        player1: room.player1Score,
        player2: room.player2Score,
      },
      isLocal: room.isLocal || false,
    });

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

    // Only update stats for non-local games (remote multiplayer)
    // Local games are for practice and shouldn't affect rankings
    if (!room.isLocal) {
      await this.updateGameStats(winnerId, loserId, gameId, duration);
    } else {
      // For local games, just add to game history without updating ELO
      const user = await this.prisma.user.findUnique({
        where: { id: room.player1Id },
      });

      if (user) {
        const history = parseJsonArray(user.gameHistory);
        history.push(gameId);
        
        await this.prisma.user.update({
          where: { id: room.player1Id },
          data: {
            gameHistory: stringifyJsonArray(history),
          },
        });
      }
    }

    this.connectionManager.setStatus(room.player1Id, UserStatus.ONLINE);
    if (!room.isLocal && room.player2Id !== room.player1Id) {
      this.connectionManager.setStatus(room.player2Id, UserStatus.ONLINE);
    }

    this.userToRoom.delete(room.player1Id);
    if (!room.isLocal && room.player2Id !== room.player1Id) {
      this.userToRoom.delete(room.player2Id);
    }

    setTimeout(() => {
      this.rooms.delete(gameId);
    }, 30000);
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

    // Handle local games
    if (room.isLocal) {
      // For local games, playerNumber is required to know which paddle to move
      if (!playerNumber) {
        throw new Error('Player number required for local games');
      }

      // Verify the user owns this local game
      if (room.player1Id !== userId) {
        throw new Error('Not authorized for this game');
      }

      // Move the appropriate paddle
      if (playerNumber === 1) {
        room.paddleLeftDirection = direction;
      } else if (playerNumber === 2) {
        room.paddleRightDirection = direction;
      } else {
        throw new Error('Invalid player number');
      }
    } else {
      // Handle remote games (existing logic)
      if (room.player1Id === userId) {
        room.paddleLeftDirection = direction;
      } else if (room.player2Id === userId) {
        room.paddleRightDirection = direction;
      } else {
        throw new Error('Not a player in this game');
      }
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
