import { useAuthStore } from '../stores/authStore';

// Request configuration interface
interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  requiresAuth?: boolean;
}

// API Response interface
interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  status?: number;
}

// Custom error class for API errors
export class ApiError extends Error {
  status: number;
  response: Response | undefined;

  constructor(
    message: string,
    status: number,
    response: Response | undefined
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
  }
}

class RequestUtil {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_MOS_API_URL || '';
  }

  /**
   * Get authentication token from store
   */
  private getToken(): string | null {
    return useAuthStore.getState().token;
  }

  /**
   * Build request headers with authentication if required
   */
  private buildHeaders(config: RequestConfig): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    if (config.requiresAuth !== false) {
      const token = this.getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Handle API response and errors
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      throw new ApiError(
        `Request failed: ${response.status}`,
        response.status,
        response
      );
    }

    const data: ApiResponse<T> = await response.json();
    return data.data || ({} as T);
  }

  /**
   * Make HTTP request
   */
  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers = this.buildHeaders(config);

      const requestInit: RequestInit = {
        method: config.method || 'GET',
        headers,
      };

      if (config.body && config.method !== 'GET') {
        requestInit.body = JSON.stringify(config.body);
      }

      const response = await fetch(url, requestInit);
      return await this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Request failed:', error);
      throw new ApiError('Network request failed', 0, undefined);
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    body?: any,
    config: Omit<RequestConfig, 'method' | 'body'> = {}
  ): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    body?: any,
    config: Omit<RequestConfig, 'method' | 'body'> = {}
  ): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }
}

// Create and export singleton instance
export const request = new RequestUtil();

// Export types for use in other files
export type { RequestConfig, ApiResponse };