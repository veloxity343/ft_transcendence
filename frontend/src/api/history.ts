import { httpClient } from './client';
import type { ApiResponse } from '../types';

// ==================== TYPES ====================

export interface MatchHistoryEntry {
  id: number;
  date: string;
  type: 'quickplay' | 'private' | 'ai' | 'tournament';
  
  player1Id: number;
  player1Name: string;
  player1Avatar: string;
  player2Id: number | null;
  player2Name: string;
  player2Avatar: string;
  
  player1Score: number;
  player2Score: number;
  winnerId: number | null;
  
  duration: number;
  
  player1EloBefore: number;
  player1EloAfter: number;
  player1EloChange: number;
  player2EloBefore: number;
  player2EloAfter: number;
  player2EloChange: number;
  
  tournamentId?: number;
  tournamentName?: string;
  tournamentRound?: number;
  tournamentMatchId?: string;
}

export interface MatchHistoryResponse {
  matches: MatchHistoryEntry[];
  total: number;
}

export interface TournamentHistoryEntry {
  id: number;
  name: string;
  date: string;
  status: string;
  
  placement: number;
  matchesPlayed: number;
  matchesWon: number;
  
  totalPlayers: number;
  totalRounds: number;
  winnerId: number | null;
  winnerName: string | null;
  
  totalEloChange: number;
  
  bracket: TournamentBracket;
}

export interface TournamentBracket {
  rounds: TournamentRound[];
}

export interface TournamentRound {
  roundNumber: number;
  roundName: string;
  matches: TournamentMatchInfo[];
}

export interface TournamentMatchInfo {
  matchId: string;
  player1Id: number | null;
  player1Name: string;
  player1Score: number | null;
  player2Id: number | null;
  player2Name: string;
  player2Score: number | null;
  winnerId: number | null;
  status: string;
}

export interface PlayerStats {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  currentElo: number;
  highestElo: number;
  rankTitle: string;
  leaderboardRank: number;
  totalPlayTime: number;
  averageGameDuration: number;
  longestWinStreak: number;
  currentWinStreak: number;
  tournamentsPlayed: number;
  tournamentsWon: number;
}

// ==================== API FUNCTIONS ====================

export const historyApi = {
  /**
   * Get current user's match history
   */
  async getMyMatchHistory(
    limit: number = 20,
    offset: number = 0,
    type: 'all' | 'quickplay' | 'tournament' | 'ai' = 'all'
  ): Promise<ApiResponse<MatchHistoryResponse>> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      type,
    });
    
    return httpClient.get<MatchHistoryResponse>(`/history/matches?${params}`);
  },

  /**
   * Get match history for a specific user
   */
  async getUserMatchHistory(
    userId: number,
    limit: number = 20,
    offset: number = 0,
    type: 'all' | 'quickplay' | 'tournament' | 'ai' = 'all'
  ): Promise<ApiResponse<MatchHistoryResponse>> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      type,
    });
    
    return httpClient.get<MatchHistoryResponse>(`/history/matches/${userId}?${params}`);
  },

  /**
   * Get details for a specific match
   */
  async getMatchDetails(gameId: number): Promise<ApiResponse<MatchHistoryEntry>> {
    return httpClient.get<MatchHistoryEntry>(`/history/match/${gameId}`);
  },

  /**
   * Get current user's tournament history
   */
  async getMyTournamentHistory(): Promise<ApiResponse<TournamentHistoryEntry[]>> {
    return httpClient.get<TournamentHistoryEntry[]>('/history/tournaments');
  },

  /**
   * Get tournament history for a specific user
   */
  async getUserTournamentHistory(userId: number): Promise<ApiResponse<TournamentHistoryEntry[]>> {
    return httpClient.get<TournamentHistoryEntry[]>(`/history/tournaments/${userId}`);
  },

  /**
   * Get detailed tournament info including bracket
   */
  async getTournamentDetails(tournamentId: number): Promise<ApiResponse<TournamentHistoryEntry>> {
    return httpClient.get<TournamentHistoryEntry>(`/history/tournament/${tournamentId}`);
  },

  /**
   * Get current user's stats
   */
  async getMyStats(): Promise<ApiResponse<PlayerStats>> {
    return httpClient.get<PlayerStats>('/history/stats');
  },

  /**
   * Get stats for a specific user
   */
  async getUserStats(userId: number): Promise<ApiResponse<PlayerStats>> {
    return httpClient.get<PlayerStats>(`/history/stats/${userId}`);
  },
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Format duration in seconds to readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return remainingSeconds > 0 
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format date to readable string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // Less than 24 hours ago
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    if (hours === 0) {
      const minutes = Math.floor(diff / 60000);
      return minutes <= 1 ? 'Just now' : `${minutes} minutes ago`;
    }
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  
  // Less than 7 days ago
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return days === 1 ? 'Yesterday' : `${days} days ago`;
  }
  
  // Show full date
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get ELO change display with color
 */
export function getEloChangeDisplay(change: number): { text: string; color: string } {
  if (change > 0) {
    return { text: `+${change}`, color: 'text-green-500' };
  } else if (change < 0) {
    return { text: `${change}`, color: 'text-red-500' };
  }
  return { text: '0', color: 'text-gray-500' };
}

/**
 * Get match type display name
 */
export function getMatchTypeDisplay(type: string): string {
  switch (type) {
    case 'quickplay': return 'Quick Play';
    case 'private': return 'Private Match';
    case 'ai': return 'vs AI';
    case 'tournament': return 'Tournament';
    default: return type;
  }
}

/**
 * Get placement suffix (1st, 2nd, 3rd, etc.)
 */
export function getPlacementSuffix(placement: number): string {
  if (placement === 1) return '1st';
  if (placement === 2) return '2nd';
  if (placement === 3) return '3rd';
  return `${placement}th`;
}

const rankColorCache = new Map<number, string>();

export function getRankColor(elo: number): string {
  // Round to tier boundaries for cache efficiency
  const tier = Math.floor(elo / 200) * 200;
  
  if (rankColorCache.has(tier)) {
    return rankColorCache.get(tier)!;
  }
  
  let color: string;
  if (elo >= 2400) color = '#FFD700'; // Gold - Grandmaster
  else if (elo >= 2200) color = '#E5E4E2'; // Platinum - Master
  else if (elo >= 2000) color = '#C0C0C0'; // Silver - Expert
  else if (elo >= 1800) color = '#CD7F32'; // Bronze - Class A
  else if (elo >= 1600) color = '#4CAF50'; // Green - Class B
  else if (elo >= 1400) color = '#2196F3'; // Blue - Class C
  else if (elo >= 1200) color = '#9E9E9E'; // Gray - Class D
  else color = '#795548'; // Brown - Beginner
  
  rankColorCache.set(tier, color);
  return color;
}

/**
 * Get rank title based on ELO
 */
export function getRankTitle(elo: number): string {
  if (elo >= 2400) return 'Grandmaster';
  if (elo >= 2200) return 'Master';
  if (elo >= 2000) return 'Expert';
  if (elo >= 1800) return 'Class A';
  if (elo >= 1600) return 'Class B';
  if (elo >= 1400) return 'Class C';
  if (elo >= 1200) return 'Class D';
  return 'Beginner';
}
