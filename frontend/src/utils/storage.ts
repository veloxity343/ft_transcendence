import { STORAGE_KEYS } from '../constants';
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
  // Auth Token
  setAuthToken(token: string): void {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  }

  getAuthToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
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

  removeAuthToken(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  // User Data
  setUserData(user: User): void {
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  }

  getUserData(): User | null {
    const data = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
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

  // Check if user is authenticated (token exists AND is not expired)
  isAuthenticated(): boolean {
    return this.getValidAuthToken() !== null;
  }
}

export const storage = new Storage();
