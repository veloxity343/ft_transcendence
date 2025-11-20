import { PrismaClient } from '@prisma/client';
import { GameService } from './game.service';
import { UserService } from './user.service';
import { ConnectionManager } from '../websocket/connection.manager';
import { PaddleDirection } from '../game/types/game.types';

export class AIOpponentService {
  private readonly AI_REFRESH_RATE = 1000; // 1000ms
  
  // AI behaviour
  private readonly REACTION_DELAY = 100;
  private readonly PREDICTION_ACCURACY = 0.85;
  private readonly MAX_PREDICTION_TIME = 2000;
  
  // Active AI instance
  private aiInstances = new Map<number, NodeJS.Timeout>();
  
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
    // Get or create AI user
    const aiUser = await this.getOrCreateAIUser();

    const playerIsPlayer1 = Math.random() > 0.5;
    
    const player1Id = playerIsPlayer1 ? userId : aiUser.id;
    const player2Id = playerIsPlayer1 ? aiUser.id : userId;
    
    const user = await this.userService.getUser(userId);
    const gameId = await (this.gameService as any).generateGameId();
    
    const gameRoom: any = {
      id: gameId,
      player1Id: player1Id,
      player1Name: playerIsPlayer1 ? user.username : 'AI Opponent',
      player1Avatar: playerIsPlayer1 ? user.avatar : aiUser.avatar,
      player1Score: 0,
      player1Disconnected: false,
      paddleLeft: 45,
      paddleLeftDirection: PaddleDirection.NONE,

      player2Id: player2Id,
      player2Name: playerIsPlayer1 ? 'AI Opponent' : user.username,
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

    const intervalId = setInterval(() => {
      this.makeAIDecision(gameId, aiUserId, difficulty);
    }, this.AI_REFRESH_RATE);

    this.aiInstances.set(gameId, intervalId);
  }

  stopAIController(gameId: number): void {
    const intervalId = this.aiInstances.get(gameId);
    if (intervalId) {
      clearInterval(intervalId);
      this.aiInstances.delete(gameId);
    }
  }

  private makeAIDecision(
    gameId: number,
    aiUserId: number,
    difficulty: 'easy' | 'medium' | 'hard'
  ): void {
    const room = (this.gameService as any).rooms.get(gameId);
    
    if (!room || room.status !== 'in_progress') {
      this.stopAIController(gameId);
      return;
    }

    const isPlayer1 = room.player1Id === aiUserId;
    const aiPaddleY = isPlayer1 ? room.paddleLeft : room.paddleRight;

    const ballX = room.ballX;
    const ballY = room.ballY;
    const ballSpeedX = room.ballSpeedX;
    const ballSpeedY = room.ballSpeedY;

    const prediction = this.predictBallPosition(
      ballX,
      ballY,
      ballSpeedX,
      ballSpeedY,
      isPlayer1,
      difficulty
    );

    const targetY = prediction.y;
    
    const adjustedTarget = this.applyDifficultyAdjustment(
      targetY,
      aiPaddleY,
      difficulty
    );

    const direction = this.calculatePaddleDirection(
      aiPaddleY,
      adjustedTarget,
      difficulty
    );

    try {
      this.gameService.movePaddle(aiUserId, gameId, direction);
    } catch (error) {
      this.stopAIController(gameId);
    }
  }

  private predictBallPosition(
    ballX: number,
    ballY: number,
    ballSpeedX: number,
    ballSpeedY: number,
    isPlayer1: boolean,
    difficulty: 'easy' | 'medium' | 'hard'
  ): { x: number; y: number } {
    // Target X position
    const targetX = isPlayer1 ? 3 : 97;
    
    // Simulate ball movement
    let simX = ballX;
    let simY = ballY;
    let simSpeedX = ballSpeedX;
    let simSpeedY = ballSpeedY;
    
    const maxSteps = 1000;
    let steps = 0;
    
    // Check if ball is moving towards AI
    const movingTowardsAI = isPlayer1 ? simSpeedX < 0 : simSpeedX > 0;
    
    if (!movingTowardsAI) {
      return { x: targetX, y: 50 };
    }

    while (steps < maxSteps) {
      simX += simSpeedX;
      simY += simSpeedY;
      
      if (simY <= 1) {
        simY = 1;
        simSpeedY = Math.abs(simSpeedY);
      } else if (simY >= 99) {
        simY = 99;
        simSpeedY = -Math.abs(simSpeedY);
      }
      
      if (isPlayer1 && simX <= targetX) {
        break;
      } else if (!isPlayer1 && simX >= targetX) {
        break;
      }
      
      const nowMovingAway = isPlayer1 ? simSpeedX > 0 : simSpeedX < 0;
      if (nowMovingAway) {
        return { x: targetX, y: 50 };
      }
      
      steps++;
    }
    
    // Add prediction error based on difficulty
    const accuracy = this.getDifficultyAccuracy(difficulty);
    const error = (Math.random() - 0.5) * (1 - accuracy) * 30;
    
    return {
      x: targetX,
      y: Math.max(5, Math.min(95, simY + error)),
    };
  }

  private applyDifficultyAdjustment(
    targetY: number,
    currentY: number,
    difficulty: 'easy' | 'medium' | 'hard'
  ): number {
    switch (difficulty) {
      case 'easy':
        const easyError = (Math.random() - 0.5) * 20;
        return targetY + easyError;
        
      case 'medium':
        const mediumError = (Math.random() - 0.5) * 10;
        return targetY + mediumError;
        
      case 'hard':
        const hardError = (Math.random() - 0.5) * 5;
        return targetY + hardError;
        
      default:
        return targetY;
    }
  }

  private calculatePaddleDirection(
    currentY: number,
    targetY: number,
    difficulty: 'easy' | 'medium' | 'hard'
  ): PaddleDirection {
    const diff = targetY - currentY;
    const threshold = this.getDifficultyThreshold(difficulty);
    
    if (Math.abs(diff) < threshold) {
      return PaddleDirection.NONE;
    }
    
    return diff > 0 ? PaddleDirection.DOWN : PaddleDirection.UP;
  }

  private getDifficultyAccuracy(difficulty: 'easy' | 'medium' | 'hard'): number {
    switch (difficulty) {
      case 'easy': return 0.65;
      case 'medium': return 0.85;
      case 'hard': return 0.95;
      default: return 0.85;
    }
  }

  private getDifficultyThreshold(difficulty: 'easy' | 'medium' | 'hard'): number {
    switch (difficulty) {
      case 'easy': return 8;
      case 'medium': return 4;
      case 'hard': return 2;
      default: return 4;
    }
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
  
  // Clean up AI controller when game ends
  handleGameEnd(gameId: number): void {
    this.stopAIController(gameId);
  }

  cleanup(): void {
    this.aiInstances.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.aiInstances.clear();
  }
}
