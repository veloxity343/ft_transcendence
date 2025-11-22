import { PrismaClient } from '@prisma/client';
import { GameService } from './game.service';
import { UserService } from './user.service';
import { ConnectionManager } from '../websocket/connection.manager';
import { PaddleDirection } from '../game/types/game.types';

interface DifficultyConfig {
  updateRate: number;        // How often AI makes decisions (ms)
  reactionTime: number;       // Delay before reacting (ms)
  predictionAccuracy: number; // 0-1, how accurate predictions are
  trackingSpeed: number;      // How fast AI centers on ball (0-1)
  anticipationDistance: number; // How far ahead AI looks
  errorMargin: number;        // Random error added to predictions
  aggressiveness: number;     // How much AI pushes forward (0-1)
}

export class AIOpponentService {
  private aiInstances = new Map<number, NodeJS.Timeout>();
  private lastDecisionTime = new Map<number, number>();
  private targetPosition = new Map<number, number>();
  
  private readonly PADDLE_HEIGHT = 10; // percentage of screen
  
  private readonly DIFFICULTIES: Record<string, DifficultyConfig> = {
    easy: {
      updateRate: 100,          // Update 10x per second
      reactionTime: 300,        // 300ms reaction delay
      predictionAccuracy: 0.5,  // 50% accurate predictions
      trackingSpeed: 0.3,       // Slow tracking
      anticipationDistance: 20, // Look 20% ahead
      errorMargin: 15,          // Large random errors
      aggressiveness: 0.3,      // Stay back
    },
    medium: {
      updateRate: 50,           // Update 20x per second
      reactionTime: 150,        // 150ms reaction delay
      predictionAccuracy: 0.75, // 75% accurate
      trackingSpeed: 0.6,       // Good tracking
      anticipationDistance: 40, // Look 40% ahead
      errorMargin: 8,           // Medium errors
      aggressiveness: 0.5,      // Balanced
    },
    hard: {
      updateRate: 30,           // Update 33x per second
      reactionTime: 50,         // 50ms reaction delay
      predictionAccuracy: 0.92, // 92% accurate
      trackingSpeed: 0.85,      // Fast tracking
      anticipationDistance: 60, // Look 60% ahead
      errorMargin: 3,           // Small errors
      aggressiveness: 0.7,      // Aggressive positioning
    },
  };
  
  constructor(
    private prisma: PrismaClient,
    private gameService: GameService,
    private userService: UserService,
    private connectionManager: ConnectionManager,
  ) {}

  async createAIGame(userId: number, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): Promise<{
    gameId: number;
    playerNumber: 1 | 2;
    aiPlayerNumber: 1 | 2;
  }> {
    const aiUser = await this.getOrCreateAIUser();
    const playerIsPlayer1 = Math.random() > 0.5;
    
    const player1Id = playerIsPlayer1 ? userId : aiUser.id;
    const player2Id = playerIsPlayer1 ? aiUser.id : userId;
    
    const user = await this.userService.getUser(userId);
    const gameId = await (this.gameService as any).generateGameId();
    
    const gameRoom: any = {
      id: gameId,
      player1Id: player1Id,
      player1Name: playerIsPlayer1 ? user.username : `AI (${difficulty})`,
      player1Avatar: playerIsPlayer1 ? user.avatar : aiUser.avatar,
      player1Score: 0,
      player1Disconnected: false,
      paddleLeft: 45,
      paddleLeftDirection: PaddleDirection.NONE,

      player2Id: player2Id,
      player2Name: playerIsPlayer1 ? `AI (${difficulty})` : user.username,
      player2Avatar: playerIsPlayer1 ? aiUser.avatar : user.avatar,
      player2Score: 0,
      player2Disconnected: false,
      paddleRight: 45,
      paddleRightDirection: PaddleDirection.NONE,

      ballX: 50,
      ballY: 50,
      ballSpeedX: 0,
      ballSpeedY: 0,
      ballSpeed: 0.25,

      status: 'starting',
      isPrivate: false,
      lastUpdateTime: new Date(),
    };

    (this.gameService as any).rooms.set(gameId, gameRoom);
    (this.gameService as any).userToRoom.set(userId, gameId);
    (this.gameService as any).userToRoom.set(aiUser.id, gameId);

    this.connectionManager.setStatus(userId, 'in_game' as any);

    this.connectionManager.emitToUser(userId, 'game-starting', {
      gameId,
      player1: {
        id: player1Id,
        name: gameRoom.player1Name,
        avatar: gameRoom.player1Avatar,
      },
      player2: {
        id: player2Id,
        name: gameRoom.player2Name,
        avatar: gameRoom.player2Avatar,
      },
      vsAI: true,
    });

    setTimeout(() => {
      (this.gameService as any).startGame(gameId);
      this.startAIController(gameId, aiUser.id, difficulty);
    }, 3000);

    return {
      gameId,
      playerNumber: playerIsPlayer1 ? 1 : 2,
      aiPlayerNumber: playerIsPlayer1 ? 2 : 1,
    };
  }

  private startAIController(
    gameId: number,
    aiUserId: number,
    difficulty: 'easy' | 'medium' | 'hard'
  ): void {
    this.stopAIController(gameId);
    
    const config = this.DIFFICULTIES[difficulty];
    this.lastDecisionTime.set(gameId, Date.now());
    this.targetPosition.set(gameId, 50);

    const intervalId = setInterval(() => {
      this.makeAIDecision(gameId, aiUserId, difficulty, config);
    }, config.updateRate);

    this.aiInstances.set(gameId, intervalId);
  }

  stopAIController(gameId: number): void {
    const intervalId = this.aiInstances.get(gameId);
    if (intervalId) {
      clearInterval(intervalId);
      this.aiInstances.delete(gameId);
    }
    this.lastDecisionTime.delete(gameId);
    this.targetPosition.delete(gameId);
  }

  private makeAIDecision(
    gameId: number,
    aiUserId: number,
    difficulty: 'easy' | 'medium' | 'hard',
    config: DifficultyConfig
  ): void {
    const room = (this.gameService as any).rooms.get(gameId);
    
    if (!room || room.status !== 'in_progress') {
      this.stopAIController(gameId);
      return;
    }

    const now = Date.now();
    const lastDecision = this.lastDecisionTime.get(gameId) || 0;
    
    // Apply reaction time delay
    if (now - lastDecision < config.reactionTime) {
      return;
    }

    const isPlayer1 = room.player1Id === aiUserId;
    const aiPaddleY = isPlayer1 ? room.paddleLeft : room.paddleRight;
    const aiPaddleCenter = aiPaddleY + (this.PADDLE_HEIGHT / 2);

    // Get ball state
    const ballX = room.ballX;
    const ballY = room.ballY;
    const ballSpeedX = room.ballSpeedX;
    const ballSpeedY = room.ballSpeedY;

    // Check if ball is moving towards AI
    const movingTowardsAI = isPlayer1 ? ballSpeedX < 0 : ballSpeedX > 0;
    
    let targetY: number;
    
    if (movingTowardsAI) {
      // Ball is coming towards us - predict where it will be
      const prediction = this.predictBallImpact(
        ballX, ballY, ballSpeedX, ballSpeedY, isPlayer1, config
      );
      targetY = prediction.y;
    } else {
      // Ball is going away - position strategically
      targetY = this.getStrategicPosition(ballY, aiPaddleCenter, config);
    }

    // Add some randomness based on difficulty
    const error = (Math.random() - 0.5) * config.errorMargin;
    targetY = Math.max(5, Math.min(95 - this.PADDLE_HEIGHT, targetY + error));

    // Store target for smooth tracking
    this.targetPosition.set(gameId, targetY);

    // Calculate desired paddle center
    const desiredCenter = targetY + (this.PADDLE_HEIGHT / 2);
    const diff = desiredCenter - aiPaddleCenter;

    // Use tracking speed for smoother movement
    const threshold = 2 + (1 - config.trackingSpeed) * 5;

    let direction: PaddleDirection;
    if (Math.abs(diff) < threshold) {
      direction = PaddleDirection.NONE;
    } else if (diff > 0) {
      direction = PaddleDirection.DOWN;
    } else {
      direction = PaddleDirection.UP;
    }

    try {
      this.gameService.movePaddle(aiUserId, gameId, direction);
      this.lastDecisionTime.set(gameId, now);
    } catch (error) {
      this.stopAIController(gameId);
    }
  }

  private predictBallImpact(
    ballX: number,
    ballY: number,
    ballSpeedX: number,
    ballSpeedY: number,
    isPlayer1: boolean,
    config: DifficultyConfig
  ): { x: number; y: number } {
    const targetX = isPlayer1 ? 3 : 97;
    const anticipationX = isPlayer1 
      ? targetX + config.anticipationDistance 
      : targetX - config.anticipationDistance;

    let simX = ballX;
    let simY = ballY;
    let simSpeedX = ballSpeedX;
    let simSpeedY = ballSpeedY;
    
    const maxSteps = 2000;
    let steps = 0;
    let bounces = 0;

    while (steps < maxSteps) {
      simX += simSpeedX;
      simY += simSpeedY;

      // Wall bounces
      if (simY <= 1) {
        simY = 1;
        simSpeedY = Math.abs(simSpeedY);
        bounces++;
      } else if (simY >= 99) {
        simY = 99;
        simSpeedY = -Math.abs(simSpeedY);
        bounces++;
      }

      // Check if we've reached the anticipation point
      const reachedTarget = isPlayer1 
        ? simX <= anticipationX 
        : simX >= anticipationX;

      if (reachedTarget) {
        // Apply accuracy - sometimes the AI "miscalculates"
        if (Math.random() > config.predictionAccuracy) {
          // Add a significant error for failed predictions
          const bigError = (Math.random() - 0.5) * 30;
          simY += bigError;
        }
        
        // Account for multiple bounces making prediction harder
        if (bounces > 2) {
          const bounceError = (bounces - 2) * 5 * (1 - config.predictionAccuracy);
          simY += (Math.random() - 0.5) * bounceError;
        }

        return {
          x: anticipationX,
          y: Math.max(5, Math.min(95, simY))
        };
      }

      // Ball changed direction - return to center
      const nowMovingAway = isPlayer1 ? simSpeedX > 0 : simSpeedX < 0;
      if (nowMovingAway) {
        return { x: targetX, y: 50 };
      }

      steps++;
    }

    // Couldn't predict - default to center
    return { x: targetX, y: 50 };
  }

  private getStrategicPosition(
    ballY: number,
    currentY: number,
    config: DifficultyConfig
  ): number {
    // When ball is going away, move toward center with some weighting toward ball
    const centerWeight = 0.5;
    const ballWeight = 0.3 * config.aggressiveness;
    const stayWeight = 0.2;

    const targetY = 
      (50 * centerWeight) + 
      (ballY * ballWeight) + 
      (currentY * stayWeight);

    return Math.max(5, Math.min(95 - this.PADDLE_HEIGHT, targetY));
  }

  private async getOrCreateAIUser(): Promise<any> {
    const AI_EMAIL = 'ai@transcendence.local';
    const AI_USERNAME = 'AI Opponent';
    
    let aiUser = await this.prisma.user.findUnique({
      where: { email: AI_EMAIL },
    });

    if (!aiUser) {
      const bcrypt = await import('argon2');
      const hash = await bcrypt.hash('ai-opponent-secure-password');
      
      aiUser = await this.prisma.user.create({
        data: {
          email: AI_EMAIL,
          username: AI_USERNAME,
          hash,
          avatar: 'ai-avatar.png',
          score: 1500,
        },
      });
    }

    return aiUser;
  }
  
  handleGameEnd(gameId: number): void {
    this.stopAIController(gameId);
  }

  cleanup(): void {
    this.aiInstances.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.aiInstances.clear();
    this.lastDecisionTime.clear();
    this.targetPosition.clear();
  }
}
