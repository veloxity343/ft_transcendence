import { GAME_CONFIG } from './constants';
import { GAME_THEMES, DEFAULT_THEME, type GameTheme } from './themes';
import type { GameState } from '../types';

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private theme: GameTheme;
  private scanlineCanvas: HTMLCanvasElement | null = null;

  constructor(canvas: HTMLCanvasElement, themeName: string = DEFAULT_THEME) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = GAME_CONFIG.WIDTH;
    this.height = GAME_CONFIG.HEIGHT;
    this.theme = GAME_THEMES[themeName] || GAME_THEMES[DEFAULT_THEME];
    
    // Set canvas dimensions
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    
    // Disable smoothing for crisp retro pixels
    this.ctx.imageSmoothingEnabled = false;
    
    // Pre-render scanlines if needed
    if (this.theme.scanlines) {
      this.createScanlineOverlay();
    }
  }

  setTheme(themeName: string): void {
    this.theme = GAME_THEMES[themeName] || GAME_THEMES[DEFAULT_THEME];
    if (this.theme.scanlines) {
      this.createScanlineOverlay();
    } else {
      this.scanlineCanvas = null;
    }
  }

  private createScanlineOverlay(): void {
    this.scanlineCanvas = document.createElement('canvas');
    this.scanlineCanvas.width = this.width;
    this.scanlineCanvas.height = this.height;
    const scanCtx = this.scanlineCanvas.getContext('2d')!;
    
    // Create horizontal scanlines
    scanCtx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    for (let y = 0; y < this.height; y += 3) {
      scanCtx.fillRect(0, y, this.width, 1);
    }
  }

  clear(): void {
    this.ctx.fillStyle = this.theme.background;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private applyScanlines(): void {
    if (this.scanlineCanvas && this.theme.scanlines) {
      this.ctx.drawImage(this.scanlineCanvas, 0, 0);
    }
  }

  drawNet(): void {
    const netX = Math.floor(this.width / 2);
    const segmentHeight = 15;
    const gap = 10;
    
    this.ctx.fillStyle = this.theme.net;
    
    // Classic Pong uses a dashed center line
    for (let y = 0; y < this.height; y += segmentHeight + gap) {
      this.ctx.fillRect(netX - 2, y, 4, segmentHeight);
    }
  }

  drawPaddle(x: number, y: number, width: number, height: number, isPlayer: boolean = false): void {
    const paddleColor = this.theme.paddle;
    
    // Glow effect
    if (this.theme.glowEffects && this.theme.ballGlow) {
      this.ctx.shadowBlur = isPlayer ? 20 : 15;
      this.ctx.shadowColor = this.theme.ballGlow;
    }
    
    // Draw paddle as simple rectangle (classic Pong style)
    this.ctx.fillStyle = paddleColor;
    this.ctx.fillRect(Math.floor(x), Math.floor(y), width, height);
    
    // Reset shadow
    this.ctx.shadowBlur = 0;
    
    // Add highlight for non-Atari themes
    if (this.theme.paddleHighlight) {
      this.ctx.fillStyle = this.theme.paddleHighlight;
      const highlightWidth = isPlayer ? 3 : 2;
      this.ctx.fillRect(Math.floor(x), Math.floor(y), highlightWidth, height);
    }
  }

  drawBall(x: number, y: number, radius: number): void {
    const ballColor = this.theme.ball;
    
    // Optional glow effect
    if (this.theme.glowEffects && this.theme.ballGlow) {
      this.ctx.shadowBlur = 20;
      this.ctx.shadowColor = this.theme.ballGlow;
    }
    
    // Classic Atari Pong used a square ball
    if (this.theme.name === 'Atari Classic') {
      // Square ball for authentic look
      const size = radius * 2;
      this.ctx.fillStyle = ballColor;
      this.ctx.fillRect(Math.floor(x - radius), Math.floor(y - radius), size, size);
    } else {
      // Round ball for modern themes
      this.ctx.fillStyle = ballColor;
      this.ctx.beginPath();
      this.ctx.arc(Math.floor(x), Math.floor(y), radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    // Reset shadow
    this.ctx.shadowBlur = 0;
  }

  drawScore(score1: number, score2: number): void {
    this.ctx.fillStyle = this.theme.score;
    this.ctx.font = 'bold 64px "VT323", "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    
    // Optional glow for score
    if (this.theme.glowEffects && this.theme.ballGlow) {
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = this.theme.ballGlow;
    }
    
    // Player 1 score (left)
    this.ctx.fillText(
      score1.toString(),
      this.width / 4,
      30
    );
    
    // Player 2 score (right)
    this.ctx.fillText(
      score2.toString(),
      (this.width * 3) / 4,
      30
    );
    
    this.ctx.shadowBlur = 0;
  }

  drawCountdown(value: number): void {
    this.ctx.fillStyle = this.theme.text;
    this.ctx.font = 'bold 120px "VT323", "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    if (this.theme.glowEffects && this.theme.ballGlow) {
      this.ctx.shadowBlur = 30;
      this.ctx.shadowColor = this.theme.ballGlow;
    }
    
    this.ctx.fillText(value.toString(), this.width / 2, this.height / 2);
    this.ctx.shadowBlur = 0;
  }

  drawMessage(message: string, fontSize: number = 36): void {
    this.ctx.fillStyle = this.theme.text;
    this.ctx.font = `bold ${fontSize}px "VT323", "Courier New", monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    if (this.theme.glowEffects && this.theme.ballGlow) {
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = this.theme.ballGlow;
    }
    
    this.ctx.fillText(message, this.width / 2, this.height / 2);
    this.ctx.shadowBlur = 0;
  }

  drawGameState(state: GameState, playerNumber: 1 | 2 | null = null): void {
    this.clear();
    this.drawNet();
    
    // Draw paddles - convert percentage positions to canvas coordinates
    const paddleWidth = 10;
    const paddleHeight = this.height * 0.15; // 15% of canvas height
    
    // Left paddle (Player 1) - x is percentage from left edge
    const leftX = this.width * 0.03;
    const leftY = (state.paddle1.y / 100) * this.height;
    this.drawPaddle(leftX, leftY, paddleWidth, paddleHeight, playerNumber === 1);
    
    // Right paddle (Player 2)
    const rightX = this.width * 0.97 - paddleWidth;
    const rightY = (state.paddle2.y / 100) * this.height;
    this.drawPaddle(rightX, rightY, paddleWidth, paddleHeight, playerNumber === 2);
    
    // Draw ball - convert percentage to canvas coordinates
    const ballX = (state.ball.x / 100) * this.width;
    const ballY = (state.ball.y / 100) * this.height;
    this.drawBall(ballX, ballY, 8);
    
    // Draw score
    this.drawScore(state.score1, state.score2);
    
    // Draw countdown if active
    if (state.status === 'countdown' && state.countdownValue !== undefined) {
      this.drawCountdown(state.countdownValue);
    }
    
    // Draw status messages
    if (state.status === 'waiting') {
      this.drawMessage('WAITING FOR PLAYER...', 32);
    } else if (state.status === 'paused') {
      this.drawMessage('PAUSED', 48);
    } else if (state.status === 'finished') {
      const winner = state.score1 > state.score2 ? 'PLAYER 1' : 'PLAYER 2';
      this.drawMessage(`${winner} WINS!`, 48);
    }
    
    // Apply scanline overlay last
    this.applyScanlines();
  }

  // Draw from raw backend data format
  drawFromBackendState(data: {
    paddleLeft: number;
    paddleRight: number;
    ballX: number;
    ballY: number;
    player1Score: number;
    player2Score: number;
    status: string;
    countdownValue?: number;
  }, playerNumber: 1 | 2 | null = null): void {
    this.clear();
    this.drawNet();
    
    const paddleWidth = 10;
    const paddleHeight = this.height * 0.15;
    
    // Left paddle
    const leftX = this.width * 0.03;
    const leftY = (data.paddleLeft / 100) * this.height;
    this.drawPaddle(leftX, leftY, paddleWidth, paddleHeight, playerNumber === 1);
    
    // Right paddle
    const rightX = this.width * 0.97 - paddleWidth;
    const rightY = (data.paddleRight / 100) * this.height;
    this.drawPaddle(rightX, rightY, paddleWidth, paddleHeight, playerNumber === 2);
    
    // Ball
    const ballX = (data.ballX / 100) * this.width;
    const ballY = (data.ballY / 100) * this.height;
    this.drawBall(ballX, ballY, 8);
    
    // Score
    this.drawScore(data.player1Score, data.player2Score);
    
    // Status messages
    if (data.status === 'countdown' && data.countdownValue !== undefined) {
      this.drawCountdown(data.countdownValue);
    } else if (data.status === 'waiting') {
      this.drawMessage('WAITING FOR PLAYER...', 32);
    } else if (data.status === 'paused') {
      this.drawMessage('PAUSED', 48);
    } else if (data.status === 'finished') {
      const winner = data.player1Score > data.player2Score ? 'PLAYER 1' : 'PLAYER 2';
      this.drawMessage(`${winner} WINS!`, 48);
    }
    
    this.applyScanlines();
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.width = width;
    this.height = height;
    
    // Recreate scanlines for new size
    if (this.theme.scanlines) {
      this.createScanlineOverlay();
    }
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getTheme(): GameTheme {
    return this.theme;
  }

  getThemeName(): string {
    return this.theme.name;
  }

  // Draw an idle/attract screen
  drawIdleScreen(): void {
    this.clear();
    this.drawNet();
    
    // Draw static paddles in center
    const paddleWidth = 10;
    const paddleHeight = this.height * 0.15;
    const centerY = (this.height - paddleHeight) / 2;
    
    this.drawPaddle(this.width * 0.03, centerY, paddleWidth, paddleHeight, false);
    this.drawPaddle(this.width * 0.97 - paddleWidth, centerY, paddleWidth, paddleHeight, false);
    
    // Draw ball in center
    this.drawBall(this.width / 2, this.height / 2, 8);
    
    // Draw score as 0-0
    this.drawScore(0, 0);
    
    this.applyScanlines();
  }
}
