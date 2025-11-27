import { httpClient } from './client';
import { storage } from '../utils/storage';
import type { LoginRequest, RegisterRequest, ApiResponse, User } from '../types';

// Backend response format
interface BackendAuthResponse {
  access_token: string;
  refresh_token: string;
}

export const authApi = {
  async login(credentials: LoginRequest): Promise<ApiResponse<any>> {
    // Backend uses /auth/signin (not /auth/login)
    const response = await httpClient.post<BackendAuthResponse>('/auth/signin', {
      username: credentials.username,
      password: credentials.password,
    });
    
    if (response.success && response.data) {
      // Store the access_token
      storage.setAuthToken(response.data.access_token);
      
      // Get user data from /auth/me
      const userResponse = await this.getCurrentUser();
      if (userResponse.success && userResponse.data) {
        storage.setUserData(userResponse.data);
      }
    }
    
    return response;
  },

  async register(data: RegisterRequest): Promise<ApiResponse<any>> {
    // Backend uses /auth/signup (not /auth/register)
    const response = await httpClient.post<BackendAuthResponse>('/auth/signup', data);
    
    if (response.success && response.data) {
      // Store the access_token
      storage.setAuthToken(response.data.access_token);
      
      // Get user data from /auth/me
      const userResponse = await this.getCurrentUser();
      if (userResponse.success && userResponse.data) {
        storage.setUserData(userResponse.data);
      }
    }
    
    return response;
  },

  async logout(): Promise<void> {
    try {
      await httpClient.post('/auth/signout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      storage.clearAll();
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
