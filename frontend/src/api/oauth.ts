import { httpClient } from './client';
import { storage } from '../utils/storage';
import { API_BASE_URL } from '../constants';
import type { ApiResponse } from '../types';

interface OAuthStatus {
  google: {
    enabled: boolean;
  };
}

interface OAuthUrlResponse {
  url: string;
}

export const oauthApi = {
  /**
   * Get OAuth provider status (which providers are enabled)
   */
  async getStatus(): Promise<ApiResponse<OAuthStatus>> {
    return httpClient.get<OAuthStatus>('/oauth/status');
  },

  /**
   * Get Google OAuth URL for redirect
   */
  async getGoogleAuthUrl(): Promise<ApiResponse<OAuthUrlResponse>> {
    return httpClient.get<OAuthUrlResponse>('/oauth/google/url');
  },

  /**
   * Initiate Google OAuth flow (redirect method)
   */
  redirectToGoogle(): void {
    window.location.href = `${API_BASE_URL}/oauth/google`;
  },

  /**
   * Handle OAuth callback - extract tokens from URL and store them
   */
  handleCallback(): { success: boolean; isNewUser: boolean; error?: string } {
    // Check sessionStorage first (params captured before router stripped them)
    let searchString = window.location.search || sessionStorage.getItem('oauth_params') || '';
    
    // Clear the stored params
    sessionStorage.removeItem('oauth_params');
    
    console.log('handleCallback searchString:', searchString);
    
    const urlParams = new URLSearchParams(searchString);
    
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    const isNewUser = urlParams.get('is_new_user') === 'true';
    const error = urlParams.get('error');

    console.log('Parsed tokens:', { accessToken: !!accessToken, refreshToken: !!refreshToken, error });

    if (error) {
        return { success: false, isNewUser: false, error };
    }

    if (accessToken && refreshToken) {
        storage.setAuthToken(accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        return { success: true, isNewUser };
    }

    return { success: false, isNewUser: false, error: 'No tokens received' };
    }
};
