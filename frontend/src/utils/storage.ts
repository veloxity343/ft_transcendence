import { STORAGE_KEYS, API_BASE_URL } from '../constants';
import type { User, GameSettings } from '../types';

// Decode JWT payload without verification (server handles verification)
function decodeJwtPayload(token: string): { exp?: number; iat?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

class Storage {
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  // Auth Token
  setAuthToken(token: string): void {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  }

  getAuthToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  // Refresh Token
  setRefreshToken(token: string): void {
    localStorage.setItem('refresh_token', token);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  // Get token only if it's not expired (with 30 second buffer)
  getValidAuthToken(): string | null {
    const token = this.getAuthToken();
    if (!token) return null;
    
    const payload = decodeJwtPayload(token);
    if (!payload?.exp) return token; // No expiration, assume valid
    
    const now = Math.floor(Date.now() / 1000);
    const bufferSeconds = 30; // Consider expired 30s before actual expiry
    
    if (payload.exp <= now + bufferSeconds) {
      console.warn('Auth token expired or expiring soon');
      return null;
    }
    
    return token;
  }

  isTokenExpired(): boolean {
    const token = this.getAuthToken();
    if (!token) return true;
    
    const payload = decodeJwtPayload(token);
    if (!payload?.exp) return false;
    
    const now = Math.floor(Date.now() / 1000);
    return payload.exp <= now;
  }

  // Refresh the access token using the refresh token
  async refreshAccessToken(): Promise<string | null> {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      console.warn('No refresh token available');
      return null;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.doRefresh(refreshToken);
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async doRefresh(refreshToken: string): Promise<string | null> {
    try {
      console.log('Attempting to refresh access token...');
      
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`,
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = await response.json();
        const newAccessToken = data.access_token || data.accessToken;
        const newRefreshToken = data.refresh_token || data.refreshToken;
        
        if (newAccessToken) {
          this.setAuthToken(newAccessToken);
          console.log('Access token refreshed successfully');
          
          if (newRefreshToken) {
            this.setRefreshToken(newRefreshToken);
          }
          
          return newAccessToken;
        }
      } else {
        const errorData = await response.text();
        console.warn('Token refresh failed:', response.status, errorData);
      }
    } catch (error) {
      console.error('Token refresh error:', error);
    }

    return null;
  }

  // Get valid token, refreshing if needed
  async getValidTokenOrRefresh(): Promise<string | null> {
    const validToken = this.getValidAuthToken();
    if (validToken) return validToken;

    // Token expired, try to refresh
    return this.refreshAccessToken();
  }

  removeAuthToken(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  // Clear auth data (logout)
  clearAuth(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem('refresh_token');
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
  }

  // User Data
  setUserData(user: User): void {
    // Normalize ID to always be a number for consistency
    const normalizedUser = {
      ...user,
      id: typeof user.id === 'string' ? parseInt(user.id, 10) : user.id,
    };
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(normalizedUser));
  }

  getUserData(): User | null {
    const data = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (!data) return null;
    
    const user = JSON.parse(data);
    // Ensure ID is always a number
    if (user && typeof user.id === 'string') {
      user.id = parseInt(user.id, 10);
    }
    return user;
  }

  removeUserData(): void {
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
  }

  // Game Settings
  setGameSettings(settings: Partial<GameSettings>): void {
    const current = this.getGameSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEYS.GAME_SETTINGS, JSON.stringify(updated));
  }

  getGameSettings(): Partial<GameSettings> {
    const data = localStorage.getItem(STORAGE_KEYS.GAME_SETTINGS);
    return data ? JSON.parse(data) : {};
  }

  // Theme
  setTheme(theme: string): void {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }

  getTheme(): string {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
  }

  // Clear all
  clearAll(): void {
    localStorage.clear();
  }

  // Check if user is authenticated
  // Returns true if we have a valid access token OR a refresh token we can try
  isAuthenticated(): boolean {
    // If access token is valid, we're authenticated
    if (this.getValidAuthToken()) {
      return true;
    }
    
    // If access token expired but refresh token exists, 
    // still consider authenticated (refresh will happen on API calls)
    if (this.getAuthToken() && this.getRefreshToken()) {
      return true;
    }
    
    return false;
  }
}

export const storage = new Storage();
