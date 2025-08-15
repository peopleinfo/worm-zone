import { useAuthStore } from "../stores/authStore";

// MOS SDK Authentication Service
interface LoginResponse {
  code: string;
}

interface UserInfo {
  firstName: string;
  lastName: string;
  headPortrait: string;
  descriptor: string;
  authorized: number;
}

interface ContactInfoResponse {
  authorized: number;
  dialCode: string;
  phone: string;
  email: string | null;
}

class AuthService {
  private appKey: string = import.meta.env.VITE_MOS_APP_KEY;
  private backendUrl: string = import.meta.env.VITE_MOS_API_URL;
  private getToken(): string | null {
    return useAuthStore.getState().token;
  }

  /**
   * Logs in using the MOS SDK
   */
  async login(): Promise<string> {
    try {
      // Check if MOS SDK is available
      if (typeof window.mos === "undefined") {
        throw new Error("MOS SDK not loaded");
      }
      // Call MOS SDK to get login credentials
      const mosResponse: LoginResponse = await window.mos.login(this.appKey);
      const code = mosResponse?.code;
      
      const response = await fetch(`${this.backendUrl}/login/snakeZone/miniAppLogin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error(`Login request failed: ${response.status}`);
      }

      const backendResponse = await response.json();
      const token = backendResponse.data?.token;
      if (!token) {
        throw new Error('Backend returned empty token');
      }
      // Save token to memory and localStorage
      return token;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }

  /**
   * Gets user information from the sdk
   */
  async getUserInfo(): Promise<UserInfo> {
    try {
      const userInfoResponse = await window.mos.getUserInfo("user_info");
      console.log("userInfoResponse", userInfoResponse);

      return userInfoResponse || {};
    } catch (error) {
      console.error("Get user info failed:", error);
      throw error;
    }
  }
  /**
   * Saves user information to the backend
   */
  async saveUserInfo(userInfo: Partial<any>): Promise<any> {
    try {
      const response = await fetch(`${this.backendUrl}/user/snakeZone/saveUserInfo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userInfo)
      });
      if (!response.ok) {
        throw new Error(`Save user info request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.data || {};
    } catch (error) {
      console.error("Save user info to backend failed:", error);
      throw error;
    }
  }
  /**
   * Posts game rank data to the backend
   */
  async getRank(): Promise<any> {
    try {
      const response = await fetch(`${this.backendUrl}/rank/snakeZone`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Post game rank request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.data || {};
    } catch (error) {
      console.error("Post game rank failed:", error);
      throw error;
    }
  }
  /**
   * Gets user information from the backend
   */
  async getUserProfile(): Promise<any> {
    try {
      const response = await fetch(`${this.backendUrl}/user/snakeZone/getUserInfo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Get user info request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.data || {};
    } catch (error) {
      console.error("Get user info from backend failed:", error);
      throw error;
    }
  }
  /**
   * Gets user contact information from the sdk
   */
  async getUserContactInfo() {
    try {
      const contactInfo = await window.mos.getUserContactInfo("contact_info");
      console.log("contactInfo", contactInfo);
      return contactInfo || {};
    } catch (error) {
      console.error("Get user contact info failed:", error);
      throw error;
    }
  }
  /**
   * Gets language
   */
  async getLanguage() {
    try {
      const res = await window.mos.getLanguage();
      console.log("res lang", res);	
      return res.lang;
    } catch (error) {
      console.error("Get language failed:", error);
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
      getLanguage: () => Promise<{ lang: string }>;
      getWindowInfo: any;
      login: (appKey: string) => Promise<LoginResponse>;
      getUserInfo: (scope: string) => Promise<UserInfo>;
      getUserContactInfo: (scope: string) => Promise<ContactInfoResponse>;
    };
  }
}
