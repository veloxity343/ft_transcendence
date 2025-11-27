// User types
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  createdAt: string;
  stats?: UserStats;
}

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  winRate: number;
  totalScore: number;
  averageScore: number;
  highestScore: number;
  longestWinStreak: number;
  currentWinStreak: number;
  rank: number;
  elo: number;
}

export interface MatchHistory {
  id: string;
  player1: User;
  player2: User;
  player1Score: number;
  player2Score: number;
  winner: User;
  duration: number;
  playedAt: string;
  gameMode: 'normal' | 'tournament' | 'ai';
}

// Game types
export interface GameState {
  ball: Ball;
  paddle1: Paddle;
  paddle2: Paddle;
  score1: number;
  score2: number;
  status: 'waiting' | 'countdown' | 'playing' | 'paused' | 'finished';
  countdownValue?: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
}

export interface GameSettings {
  ballSpeed: number;
  paddleSpeed: number;
  paddleSize: 'small' | 'medium' | 'large';
  ballColor: string;
  paddleColor: string;
  backgroundColor: string;
  winScore: number;
  aiDifficulty?: 'easy' | 'medium' | 'hard';
}

// Tournament types
export interface Tournament {
  id: string;
  name: string;
  status: 'upcoming' | 'in_progress' | 'completed';
  maxPlayers: number;
  currentPlayers: number;
  participants: User[];
  matches: TournamentMatch[];
  winner?: User;
  createdBy: User;
  startTime: string;
  endTime?: string;
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  round: number;
  player1: User;
  player2: User;
  winner?: User;
  score1?: number;
  score2?: number;
  status: 'pending' | 'in_progress' | 'completed';
}

// Chat types
export interface ChatMessage {
  id: string;
  sender: User;
  content: string;
  timestamp: string;
  type: 'text' | 'system';
}

export interface ChatRoom {
  id: string;
  name: string;
  participants: User[];
  messages: ChatMessage[];
  type: 'global' | 'game' | 'tournament' | 'private';
}

// WebSocket types
export interface WSMessage {
  type: string;
  payload: any;
}

export interface GameUpdateMessage extends WSMessage {
  type: 'game:update';
  payload: GameState;
}

export interface ChatMessageWS extends WSMessage {
  type: 'chat:message';
  payload: ChatMessage;
}

export interface TournamentUpdateMessage extends WSMessage {
  type: 'tournament:update';
  payload: Tournament;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Navigation types
export type Route = 
  | '/' 
  | '/login' 
  | '/register' 
  | '/game' 
  | '/tournament' 
  | '/profile' 
  | '/leaderboard' 
  | '/stats'
  | '/settings';

export interface RouteConfig {
  path: Route;
  title: string;
  component: () => HTMLElement;
  requiresAuth?: boolean;
}
