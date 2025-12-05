import { httpClient } from './client';
import { storage } from '../utils/storage';
import type { ApiResponse } from '../types';

interface TwoFactorQRResponse {
  qrCode: string;  // Base64 encoded QR code image
}

interface AuthTokensResponse {
  access_token: string;
  refresh_token: string;
}

interface TwoFactorStatusResponse {
  enabled: boolean;
}

export const twoFactorApi = {
  /**
   * Generate a new 2FA secret and QR code
   * User must be authenticated
   */
  async generateSecret(): Promise<ApiResponse<TwoFactorQRResponse>> {
    return httpClient.get<TwoFactorQRResponse>('/auth/2fa/generate');
  },

  /**
   * Enable 2FA for the authenticated user
   * Requires verification with a valid TOTP code
   */
  async enable(code: string): Promise<ApiResponse<AuthTokensResponse>> {
    const response = await httpClient.post<AuthTokensResponse>('/auth/2fa/turn-on', {
      twoFAcode: code,
    });

    if (response.success && response.data) {
      // Update stored token with new one that has is2FA: true
      storage.setAuthToken(response.data.access_token);
    }

    return response;
  },

  /**
   * Disable 2FA for the authenticated user
   */
  async disable(): Promise<ApiResponse<AuthTokensResponse>> {
    const response = await httpClient.post<AuthTokensResponse>('/auth/2fa/turn-off', {});

    if (response.success && response.data) {
      // Update stored token with new one that has is2FA: false
      storage.setAuthToken(response.data.access_token);
    }

    return response;
  },

  /**
   * Authenticate with 2FA code during login
   * Called when user's account has 2FA enabled
   */
  async authenticate(username: string, code: string): Promise<ApiResponse<AuthTokensResponse>> {
    const response = await httpClient.post<AuthTokensResponse>('/auth/2fa/authenticate', {
      username,
      twoFAcode: code,
    });

    if (response.success && response.data) {
      storage.setAuthToken(response.data.access_token);
      
      // Fetch and store user data
      const userResponse = await httpClient.get('/auth/me');
      if (userResponse.success && userResponse.data) {
        storage.setUserData(userResponse.data as any);
      }
      
      // Dispatch auth:login event so WebSocket connects
      window.dispatchEvent(new CustomEvent('auth:login'));
    }

    return response;
  },

  /**
   * Check if the current user has 2FA enabled
   */
  async getStatus(): Promise<ApiResponse<TwoFactorStatusResponse>> {
    const response = await httpClient.get<any>('/auth/me');
    
    if (response.success && response.data) {
      return {
        success: true,
        data: { enabled: response.data.twoFA || false },
      };
    }

    return {
      success: false,
      error: response.error,
    };
  },
};
