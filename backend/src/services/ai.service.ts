/**
 * AI Opponent Service
 * Provides bot opponents with configurable difficulty levels
 * 
 * How It Works:
 * - Makes decisions at configurable intervals (updateRate)
 * - Predicts ball trajectory based on current velocity
 * - Adds randomness/errors based on difficulty
 * - Tracks ball position with configurable speed
 * - Adjusts aggressiveness and positioning strategy
 * 
 * Difficulty Levels:
 * - Easy: Slow reactions, inaccurate predictions, defensive
 * - Medium: Balanced speed and accuracy, good for most players
 * - Hard: Fast reactions, accurate predictions, aggressive positioning
 * 
 * The bot is not perfect on purpose - it's designed to be beatable
 */
import { PrismaClient } from '@prisma/client';
import { GameService } from './game.service';
import { UserService } from './user.service';
import { ConnectionManager } from '../websocket/connection.manager';
import { PaddleDirection } from '../game/types/game.types';

/** Var configs for bot difficulty level */
interface DifficultyConfig {
  updateRate: number;        // How often bot makes decisions (ms)
  reactionTime: number;       // Delay before reacting (ms)
  predictionAccuracy: number; // 0-1, how accurate predictions are
  trackingSpeed: number;      // How fast bot centers on ball (0-1)
  anticipationDistance: number; // How far ahead bot looks
  errorMargin: number;        // Random error added to predictions
  aggressiveness: number;     // How much bot pushes forward (0-1)
}

export class AIOpponentService {
  // Active bot instances and their state
  private aiInstances = new Map<number, NodeJS.Timeout>();  // gameId -> update timer
  private lastDecisionTime = new Map<number, number>();  // gameId -> last decision timestamp
  private targetPosition = new Map<number, number>();  // gameId -> target Y position
  
  private readonly PADDLE_HEIGHT = 10; // percentage of screen
  
  // Configs per difficulty level
  private readonly DIFFICULTIES: Record<string, DifficultyConfig> = {
    easy: {
      updateRate: 100,          // Update 10x per second
      reactionTime: 300,        // 300ms reaction delay
      predictionAccuracy: 0.5,  // 50% accurate predictions
      trackingSpeed: 0.3,       // Slow tracking
      anticipationDistance: 20, // Look 20% ahead
      errorMargin: 15,          // Large random errors
      aggressiveness: 0.3,      // Defensive positioning
    },
    medium: {
      updateRate: 50,           // Update 20x per second
      reactionTime: 150,        // 150ms reaction delay
      predictionAccuracy: 0.75, // 75% accurate
      trackingSpeed: 0.6,       // Moderate tracking
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

  /**
   * Create a new game against bot opponent
   * Player side (left/right) randomized
   * Bot user is created if it doesn't exist
   * @returns Game ID and player numbers
   */
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
      vsAI: true,
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
    // Clean up any existing controller for this game
    this.stopAIController(gameId);
    
    const config = this.DIFFICULTIES[difficulty];
    this.lastDecisionTime.set(gameId, Date.now());
    this.targetPosition.set(gameId, 50); // Start at center

    // Game loop: runs at config.updateRate
    // separate from the main game physics loop (10ms)
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
    // Fetch current game state
    const room = (this.gameService as any).rooms.get(gameId);
    
    // Game ended or paused - stop the loop
    if (!room || room.status !== 'in_progress') {
      this.stopAIController(gameId);
      return;
    }

    const now = Date.now();
    const lastDecision = this.lastDecisionTime.get(gameId) || 0;
    
    // Reaction time delay
    if (now - lastDecision < config.reactionTime) {
      return;
    }

    // Determine which side bot is on (left paddle = player1, right paddle = player2)
    const isPlayer1 = room.player1Id === aiUserId;
    const aiPaddleY = isPlayer1 ? room.paddleLeft : room.paddleRight;
    const aiPaddleCenter = aiPaddleY + (this.PADDLE_HEIGHT / 2);

    // Snapshot current ball state for prediction
    const ballX = room.ballX;
    const ballY = room.ballY;
    const ballSpeedX = room.ballSpeedX;
    const ballSpeedY = room.ballSpeedY;

    // Check if ball is heading toward bot's side or away
    // left checks for negative X velocity, right for positive
    const movingTowardsAI = isPlayer1 ? ballSpeedX < 0 : ballSpeedX > 0;
    
    let targetY: number;
    
    if (movingTowardsAI) {
      // offensive: ball coming toward bot
      // Run physics sim to predict ball position at paddle
      // account for wall bounces and trajectory
      const prediction = this.predictBallImpact(
        ballX, ballY, ballSpeedX, ballSpeedY, isPlayer1, config
      );
      targetY = prediction.y;
    } else {
      // defensive: ball going away
      // Position strategically between center and ball position
      targetY = this.getStrategicPosition(ballY, aiPaddleCenter, config);
    }

    // Add random error for human feel
    const error = (Math.random() - 0.5) * config.errorMargin;
    targetY = Math.max(5, Math.min(95 - this.PADDLE_HEIGHT, targetY + error));

    // Store target for next decision cycle
    this.targetPosition.set(gameId, targetY);

    // Calculate how far paddle needs to move
    const desiredCenter = targetY + (this.PADDLE_HEIGHT / 2);
    const diff = desiredCenter - aiPaddleCenter;

    // Dynamic threshold based on tracking speed
    // Slower tracking = larger dead zone = less twitchy movement
    const threshold = 2 + (1 - config.trackingSpeed) * 5;

    // Convert position difference into paddle movement direction
    let direction: PaddleDirection;
    if (Math.abs(diff) < threshold) {
      // Close enough - stop moving (also avoids robo jitter lol)
      direction = PaddleDirection.NONE;
    } else if (diff > 0) {
      // Target is below current position - move down
      direction = PaddleDirection.DOWN;
    } else {
      // Target is above current position - move up
      direction = PaddleDirection.UP;
    }

    try {
      // Send paddle input to game service (same as human player input)
      this.gameService.movePaddle(aiUserId, gameId, direction);
      this.lastDecisionTime.set(gameId, now);
    } catch (error) {
      // Game ended or error occurred - stop controller
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
    // Define paddle X position (left=3%, right=97%)
    const targetX = isPlayer1 ? 3 : 97;
    
    // Anticipation point: where bot starts moving (before ball arrives)
    // More anticipation = more aggressive positioning
    const anticipationX = isPlayer1 
      ? targetX + config.anticipationDistance 
      : targetX - config.anticipationDistance;

    // Sim vars: create "ghost" ball to predict trajectory
    let simX = ballX;
    let simY = ballY;
    let simSpeedX = ballSpeedX;
    let simSpeedY = ballSpeedY;
    
    // Safety limit: prevent infinite loops
    // (shouldn't need more than 2000 steps but can test later for better ux)
    const maxSteps = 2000;
    let steps = 0;
    let bounces = 0; // Track wall bounces for accuracy degradation

    // Physics sim loop: step ball forward frame by frame
    while (steps < maxSteps) {
      // Move ball by velocity (same as real game physics)
      simX += simSpeedX;
      simY += simSpeedY;

      // Simulate wall bounces (top/bottom)
      // Ball reflects off walls at same angle
      if (simY <= 1) {
        simY = 1;
        simSpeedY = Math.abs(simSpeedY); // Bounce down
        bounces++;
      } else if (simY >= 99) {
        simY = 99;
        simSpeedY = -Math.abs(simSpeedY); // Bounce up
        bounces++;
      }

      // Check if ball reached anticipation point
      const reachedTarget = isPlayer1 
        ? simX <= anticipationX   // Left side: check if X decreased to target
        : simX >= anticipationX;  // Right side: check if X increased to target

      if (reachedTarget) {
        // Apply prediction accuracy - harder difficulties are more accurate
        // If random roll fails accuracy check, add significant error
        if (Math.random() > config.predictionAccuracy) {
          // Failed prediction: add large random error (±30%)
          const bigError = (Math.random() - 0.5) * 30;
          simY += bigError;
        }
        
        // Multiple bounces degrade prediction accuracy
        // Each bounce adds uncertainty
        if (bounces > 2) {
          const bounceError = (bounces - 2) * 5 * (1 - config.predictionAccuracy);
          simY += (Math.random() - 0.5) * bounceError;
        }

        // Return predicted Y position (clamped to valid range)
        return {
          x: anticipationX,
          y: Math.max(5, Math.min(95, simY))
        };
      }

      // Safety check: ball reversed direction (paddle hit)
      // This shouldn't happen in normal prediction, so return center
      const nowMovingAway = isPlayer1 ? simSpeedX > 0 : simSpeedX < 0;
      if (nowMovingAway) {
        return { x: targetX, y: 50 };
      }

      steps++;
    }

    // Sim timeout - return safe default (center)
    return { x: targetX, y: 50 };
  }

  private getStrategicPosition(
    ballY: number,
    currentY: number,
    config: DifficultyConfig
  ): number {
    // Weighted positioning formula when ball is on opponent's side
    // Balances 3 factors: returning to center, tracking ball, staying put
    
    // Center weight (50%): Always pull toward middle for coverage
    const centerWeight = 0.5;
    
    // Ball weight (30% * aggressiveness): Follow ball's Y position
    // Aggressive bots (hard) track ball more, defensive bots (easy) less
    const ballWeight = 0.3 * config.aggressiveness;
    
    // Stay weight (20%): don't move unnecessarily
    // Prevents excessive movement
    const stayWeight = 0.2;

    // Weighted average of three positions
    const targetY = 
      (50 * centerWeight) +           // Center court (Y=50)
      (ballY * ballWeight) +          // Ball's current Y
      (currentY * stayWeight);        // Current paddle Y

    // Clamp to valid paddle range
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
