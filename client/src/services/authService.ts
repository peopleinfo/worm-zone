// MOS SDK Authentication Service
interface LoginResponse {
  data: {
    code: string;
  };
}

interface BackendLoginResponse {
  data: string; // token
}

interface UserInfo {
  id: string;
  username: string;
  score: number;
  rank: number;
}

interface GetUserInfoResponse {
  data: UserInfo[];
}

class AuthService {
  private token: string | null = null;
  private appKey: string = import.meta.env.VITE_MOS_APP_KEY;
  private backendUrl: string = import.meta.env.VITE_MOS_API_URL;

  constructor() {
    // Restore token from localStorage
    this.token = localStorage.getItem('token');
  }

  /**
   * Logs in using the MOS SDK
   */
  async login(): Promise<string> {
    try {
      // Check if MOS SDK is available
      if (typeof window.mos === 'undefined') {
        throw new Error('MOS SDK not loaded');
      }

      // Call MOS SDK to get login credentials
      const mosResponse: LoginResponse = await window.mos.login(this.appKey);
      const code = mosResponse.data?.code;

      if (!code) {
        throw new Error('Failed to get login credentials');
      }

      // Send login request to backend
      const response = await fetch(this.backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error(`Login request failed: ${response.status}`);
      }

      const backendResponse: BackendLoginResponse = await response.json();
      const token = backendResponse.data;

      if (!token) {
        throw new Error('Backend returned empty token');
      }

      // Save token to memory and localStorage
      this.token = token;
      localStorage.setItem('token', token);

      return token;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Gets the current token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Checks if the user is logged in
   */
  isLoggedIn(): boolean {
    return !!this.token;
  }

  /**
   * Logs out the user
   */
  logout(): void {
    this.token = null;
    localStorage.removeItem('token');
  }

  /**
   * Sets the app key
   */
  setAppKey(appKey: string): void {
    this.appKey = appKey;
  }

  /**
   * Sets the backend login URL
   */
  setBackendUrl(url: string): void {
    this.backendUrl = url;
  }

  /**
   * Gets user information from the backend
   */
  async getUserInfo(): Promise<UserInfo[]> {
    try {
      if (!this.token) {
        throw new Error('No token available. Please login first.');
      }

      const response = await fetch(`${this.backendUrl}/getUserInfo`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Get user info failed: ${response.status}`);
      }

      const userInfoResponse: GetUserInfoResponse = await response.json();
      return userInfoResponse.data || [];
    } catch (error) {
      console.error('Get user info failed:', error);
      throw error;
    }
  }
}

// Create a singleton instance
export const authService = new AuthService();

// Add type declarations for MOS SDK
declare global {
  interface Window {
    mos: {
      login: (appKey: string) => Promise<LoginResponse>;
      // Other MOS SDK methods can be added as needed
    };
  }
}