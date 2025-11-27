import { httpClient } from './client';
import type { ApiResponse, GameSettings, MatchHistory } from '../types';

export interface CreateGameRequest {
  mode: 'quick_play' | 'private' | 'ai';
  settings?: Partial<GameSettings>;
  opponentId?: string;
  aiDifficulty?: 'easy' | 'medium' | 'hard';
}

export interface JoinGameRequest {
  gameId: string;
}

export interface Game {
  id: string;
  mode: string;
  status: string;
  player1Id: string;
  player2Id?: string;
  settings: GameSettings;
  createdAt: string;
}

export const gameApi = {
  async createGame(data: CreateGameRequest): Promise<ApiResponse<Game>> {
    return httpClient.post<Game>('/game/create', data);
  },

  async joinGame(gameId: string): Promise<ApiResponse<Game>> {
    return httpClient.post<Game>(`/game/${gameId}/join`);
  },

  async getGame(gameId: string): Promise<ApiResponse<Game>> {
    return httpClient.get<Game>(`/game/${gameId}`);
  },

  async leaveGame(gameId: string): Promise<ApiResponse<void>> {
    return httpClient.post<void>(`/game/${gameId}/leave`);
  },

  async getActiveGames(): Promise<ApiResponse<Game[]>> {
    return httpClient.get<Game[]>('/game/active');
  },

  async getMatchHistory(userId?: string): Promise<ApiResponse<MatchHistory[]>> {
    const endpoint = userId ? `/game/history/${userId}` : '/game/history';
    return httpClient.get<MatchHistory[]>(endpoint);
  },
};
