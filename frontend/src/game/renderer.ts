import { GAME_CONFIG } from './constants';
import type { GameState } from '../types';

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = GAME_CONFIG.WIDTH;
    this.height = GAME_CONFIG.HEIGHT;
    
    // Set canvas dimensions
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    
    // Enable image smoothing for better rendering
    this.ctx.imageSmoothingEnabled = true;
  }

  clear(): void {
    this.ctx.fillStyle = GAME_CONFIG.COLORS.BACKGROUND;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawNet(): void {
    const netX = this.width / 2 - GAME_CONFIG.NET.WIDTH / 2;
    const segmentHeight = GAME_CONFIG.NET.SEGMENT_HEIGHT;
    const gap = GAME_CONFIG.NET.GAP;
    
    this.ctx.fillStyle = GAME_CONFIG.COLORS.NET;
    
    for (let y = 0; y < this.height; y += segmentHeight + gap) {
      this.ctx.fillRect(netX, y, GAME_CONFIG.NET.WIDTH, segmentHeight);
    }
  }

  drawPaddle(x: number, y: number, width: number, height: number, color?: string): void {
    this.ctx.fillStyle = color || GAME_CONFIG.COLORS.PADDLE;
    this.ctx.fillRect(x, y, width, height);
    
    // Add glow effect
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = color || GAME_CONFIG.COLORS.PADDLE;
    this.ctx.fillRect(x, y, width, height);
    this.ctx.shadowBlur = 0;
  }

  drawBall(x: number, y: number, radius: number, color?: string): void {
    this.ctx.fillStyle = color || GAME_CONFIG.COLORS.BALL;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Add glow effect
    this.ctx.shadowBlur = 20;
    this.ctx.shadowColor = color || GAME_CONFIG.COLORS.BALL;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
  }

  drawScore(score1: number, score2: number): void {
    this.ctx.fillStyle = GAME_CONFIG.COLORS.SCORE;
    this.ctx.font = `${GAME_CONFIG.SCORE.FONT_SIZE}px 'Orbitron', monospace`;
    this.ctx.textAlign = 'center';
    
    // Player 1 score (left)
    this.ctx.fillText(
      score1.toString(),
      this.width / 4,
      GAME_CONFIG.SCORE.POSITION_Y
    );
    
    // Player 2 score (right)
    this.ctx.fillText(
      score2.toString(),
      (this.width * 3) / 4,
      GAME_CONFIG.SCORE.POSITION_Y
    );
  }

  drawCountdown(value: number): void {
    this.ctx.fillStyle = GAME_CONFIG.COLORS.TEXT;
    this.ctx.font = '72px "Orbitron", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    this.ctx.shadowBlur = 30;
    this.ctx.shadowColor = GAME_CONFIG.COLORS.PADDLE;
    this.ctx.fillText(value.toString(), this.width / 2, this.height / 2);
    this.ctx.shadowBlur = 0;
  }

  drawMessage(message: string, fontSize: number = 36): void {
    this.ctx.fillStyle = GAME_CONFIG.COLORS.TEXT;
    this.ctx.font = `${fontSize}px "Orbitron", monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    this.ctx.fillText(message, this.width / 2, this.height / 2);
  }

  drawGameState(state: GameState, customColors?: {
    ball?: string;
    paddle1?: string;
    paddle2?: string;
  }): void {
    this.clear();
    this.drawNet();
    
    // Draw paddles
    this.drawPaddle(
      state.paddle1.x,
      state.paddle1.y,
      state.paddle1.width,
      state.paddle1.height,
      customColors?.paddle1
    );
    
    this.drawPaddle(
      state.paddle2.x,
      state.paddle2.y,
      state.paddle2.width,
      state.paddle2.height,
      customColors?.paddle2
    );
    
    // Draw ball
    this.drawBall(state.ball.x, state.ball.y, state.ball.radius, customColors?.ball);
    
    // Draw score
    this.drawScore(state.score1, state.score2);
    
    // Draw countdown if active
    if (state.status === 'countdown' && state.countdownValue !== undefined) {
      this.drawCountdown(state.countdownValue);
    }
    
    // Draw status messages
    if (state.status === 'waiting') {
      this.drawMessage('Waiting for opponent...');
    } else if (state.status === 'paused') {
      this.drawMessage('PAUSED');
    } else if (state.status === 'finished') {
      const winner = state.score1 > state.score2 ? 'Player 1' : 'Player 2';
      this.drawMessage(`${winner} Wins!`, 48);
    }
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.width = width;
    this.height = height;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
