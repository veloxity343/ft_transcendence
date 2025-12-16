import { WebSocket } from '@fastify/websocket';
import { GameStatus, PaddleDirection } from '../types/game.types';

export interface GameRoom {
  id: number;
  player1Id: number;
  player1Name: string;
  player1Avatar: string;
  player1Score: number;
  player1Disconnected: boolean;
  player1DisconnectedAt?: Date;
  paddleLeft: number;
  paddleLeftDirection: PaddleDirection;

  player2Id?: number;
  player2Name?: string;
  player2Avatar?: string;
  player2Score: number;
  player2Disconnected: boolean;
  player2DisconnectedAt?: Date;
  paddleRight: number;
  paddleRightDirection: PaddleDirection;

  ballX: number;
  ballY: number;
  ballSpeedX: number;
  ballSpeedY: number;
  ballSpeed: number;

  status: GameStatus;
  isPrivate: boolean;
  isLocal?: boolean;
  isLocalTournament?: boolean;
  vsAI?: boolean;
  startTime?: Date;
  lastUpdateTime: Date;

  intervalId?: NodeJS.Timeout;
}

export interface GameState {
  gameId: number;
  player1Score: number;
  player2Score: number;
  paddleLeft: number;
  paddleRight: number;
  ballX: number;
  ballY: number;
  status: GameStatus;
}

export interface PlayerInfo {
  playerId: number;
  playerName: string;
  playerAvatar: string;
  playerNumber: 1 | 2;
  gameId: number;
  isLocal?: boolean;
}
