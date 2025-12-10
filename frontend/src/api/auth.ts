import { httpClient } from './client';
import { storage } from '../utils/storage';
import type { LoginRequest, RegisterRequest, ApiResponse, User } from '../types';

interface BackendAuthResponse {
  access_token?: string;
  refresh_token?: string;
  requires2FA?: boolean;
  username?: string;
}

export const authApi = {
  async login(credentials: LoginRequest): Promise<ApiResponse<any>> {
    const response = await httpClient.post<BackendAuthResponse>('/auth/signin', {
      username: credentials.username,
      password: credentials.password,
    });
    
    if (response.success && response.data) {
      // Check if 2FA is required - don't store tokens yet
      if (response.data.requires2FA) {
        return response;
      }
      
      // Only store tokens if we actually received them
      if (response.data.access_token && response.data.refresh_token) {
        storage.setAuthToken(response.data.access_token);
        storage.setRefreshToken(response.data.refresh_token);
        
        const userResponse = await this.getCurrentUser();
        if (userResponse.success && userResponse.data) {
          storage.setUserData(userResponse.data);
        }
        window.dispatchEvent(new CustomEvent('auth:login'));
      }
    }
    
    return response;
  },

  async register(data: RegisterRequest): Promise<ApiResponse<any>> {
    const response = await httpClient.post<BackendAuthResponse>('/auth/signup', data);
    
    if (response.success && response.data) {
      // Only store tokens if we actually received them
      if (response.data.access_token && response.data.refresh_token) {
        storage.setAuthToken(response.data.access_token);
        storage.setRefreshToken(response.data.refresh_token);
        
        const userResponse = await this.getCurrentUser();
        if (userResponse.success && userResponse.data) {
          storage.setUserData(userResponse.data);
        }
        window.dispatchEvent(new CustomEvent('auth:login'));
      }
    }
    
    return response;
  },

  async logout(): Promise<void> {
    try {
      await httpClient.post('/auth/signout', {});
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      storage.clearAll();
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
  },

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return httpClient.get<User>('/auth/me');
  },

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    return httpClient.put<User>('/auth/profile', data);
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    return httpClient.post<void>('/users/update-password', {
      currentPassword: oldPassword,
      newPassword,
    });
  },

  isAuthenticated(): boolean {
    return storage.isAuthenticated();
  },
};
