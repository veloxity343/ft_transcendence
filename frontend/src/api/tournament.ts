import { httpClient } from './client';
import type { ApiResponse, Tournament, TournamentMatch } from '../types';

export interface CreateTournamentRequest {
  name: string;
  maxPlayers: number;
  startTime?: string;
}

export const tournamentApi = {
  async createTournament(data: CreateTournamentRequest): Promise<ApiResponse<Tournament>> {
    return httpClient.post<Tournament>('/tournaments/create', data);
  },

  async getTournament(tournamentId: string): Promise<ApiResponse<Tournament>> {
    return httpClient.get<Tournament>(`/tournaments/${tournamentId}`);
  },

  async joinTournament(tournamentId: string): Promise<ApiResponse<Tournament>> {
    return httpClient.post<Tournament>(`/tournaments/${tournamentId}/join`);
  },

  async leaveTournament(tournamentId: string): Promise<ApiResponse<void>> {
    return httpClient.post<void>(`/tournaments/${tournamentId}/leave`);
  },

  async getActiveTournaments(): Promise<ApiResponse<Tournament[]>> {
    return httpClient.get<Tournament[]>('/tournaments/active');
  },

  async getUpcomingTournaments(): Promise<ApiResponse<Tournament[]>> {
    return httpClient.get<Tournament[]>('/tournaments/upcoming');
  },

  async getCompletedTournaments(): Promise<ApiResponse<Tournament[]>> {
    return httpClient.get<Tournament[]>('/tournaments/completed');
  },

  async getTournamentMatches(tournamentId: string): Promise<ApiResponse<TournamentMatch[]>> {
    return httpClient.get<TournamentMatch[]>(`/tournaments/${tournamentId}/matches`);
  },

  async startTournament(tournamentId: string): Promise<ApiResponse<Tournament>> {
    return httpClient.post<Tournament>(`/tournaments/${tournamentId}/start`);
  },
};
