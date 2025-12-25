import { httpClient } from './client';
import type { ApiResponse, User, UserStats } from '../types';

export interface LeaderboardEntry extends User {
  rank: number;
  stats: UserStats;
}

export const userApi = {
  async getUser(userId: string): Promise<ApiResponse<User>> {
    return httpClient.get<User>(`/users/${userId}`);
  },

  async getUserStats(userId: string): Promise<ApiResponse<UserStats>> {
    return httpClient.get<UserStats>(`/users/${userId}/stats`);
  },

  async searchUsers(query: string): Promise<ApiResponse<User[]>> {
    return httpClient.get<User[]>(`/users/search?q=${encodeURIComponent(query)}`);
  },

  async getLeaderboard(limit: number = 100): Promise<ApiResponse<LeaderboardEntry[]>> {
    return httpClient.get<LeaderboardEntry[]>(`/users/leaderboard?limit=${limit}`);
  },

  async getFriends(): Promise<ApiResponse<User[]>> {
    return httpClient.get<User[]>('/users/friends');
  },

  async addFriend(userId: string): Promise<ApiResponse<void>> {
    return httpClient.post<void>(`/users/${userId}/friend`, {});
  },

  async removeFriend(userId: string): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`/users/${userId}/friend`);
  },

  async blockUser(userId: string): Promise<ApiResponse<void>> {
    return httpClient.post<void>(`/users/${userId}/block`, {});
  },

  async unblockUser(userId: string): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`/users/${userId}/block`);
  },
};
