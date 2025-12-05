import { API_BASE_URL, ERROR_MESSAGES } from '../constants';
import { storage } from '../utils/storage';
import { errorOverlay } from '../components/error-overlay';
import type { ApiResponse } from '../types';

class HttpClient {
  private baseURL: string;
  private consecutiveNetworkErrors = 0;
  private maxConsecutiveErrors = 3;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry: boolean = false
  ): Promise<ApiResponse<T>> {
    // Get valid token, or try to refresh if expired
    let token = storage.getValidAuthToken();
    
    if (!token && !isRetry) {
      // Token expired, try to refresh before making the request
      token = await storage.refreshAccessToken();
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
      });

      // Reset consecutive errors on successful connection
      this.consecutiveNetworkErrors = 0;

      // Handle auth errors - try refresh once
      if (response.status === 401 && !isRetry) {
        const newToken = await storage.refreshAccessToken();
        
        if (newToken) {
          // Retry the request with the new token
          return this.request<T>(endpoint, options, true);
        } else {
          // Refresh failed - now log out
          this.handleAuthError();
          return {
            success: false,
            error: 'Session expired. Please log in again.',
          };
        }
      }

      // Auth error on retry - give up
      if (response.status === 401 && isRetry) {
        this.handleAuthError();
        return {
          success: false,
          error: 'Session expired. Please log in again.',
        };
      }

      // Handle server errors
      if (response.status >= 500) {
        this.handleServerError(response.status);
        return {
          success: false,
          error: 'Server error. Please try again later.',
        };
      }

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || 'Request failed',
        };
      }

      return {
        success: true,
        data: data.data || data,
      };
    } catch (error) {
      console.error('HTTP request error:', error);
      
      // Track consecutive network errors
      this.consecutiveNetworkErrors++;
      
      // Show overlay after multiple consecutive failures
      if (this.consecutiveNetworkErrors >= this.maxConsecutiveErrors) {
        this.showNetworkError();
      }
      
      return {
        success: false,
        error: ERROR_MESSAGES.NETWORK_ERROR,
      };
    }
  }

  private handleAuthError(): void {
    // Check if already showing auth error
    if (errorOverlay.getCurrentType() === 'auth') return;
    
    storage.clearAuth();
    
    errorOverlay.show({
      type: 'auth',
      canRetry: false,
    });
    
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }

  private handleServerError(status: number): void {
    console.error(`Server error: ${status}`);
  }

  private showNetworkError(): void {
    if (errorOverlay.isShowing()) return;
    
    errorOverlay.show({
      type: 'network',
      canRetry: true,
      onRetry: async () => {
        try {
          const response = await fetch(`${this.baseURL}/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          
          if (response.ok) {
            this.consecutiveNetworkErrors = 0;
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },
      onDismiss: () => {
        this.consecutiveNetworkErrors = 0;
      },
    });
  }

  resetErrorTracking(): void {
    this.consecutiveNetworkErrors = 0;
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }
}

export const httpClient = new HttpClient(API_BASE_URL);
