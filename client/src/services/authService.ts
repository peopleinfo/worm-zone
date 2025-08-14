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
  private token: string | null = null;
  private appKey: string = import.meta.env.VITE_MOS_APP_KEY;
  // private backendUrl: string = import.meta.env.VITE_MOS_API_URL;

  constructor() {
    // Restore token from localStorage
    this.token = localStorage.getItem("token");
  }

  /**
   * Logs in using the MOS SDK
   */
  async login(): Promise<string> {
    console.log("service login");
    try {
      // Check if MOS SDK is available
      if (typeof window.mos === "undefined") {
        throw new Error("MOS SDK not loaded");
      }

      // Call MOS SDK to get login credentials
      const mosResponse: LoginResponse = await window.mos.login(this.appKey);
      const code = mosResponse?.code;
      console.log("mosResponse", mosResponse);

      if (!code) {
        throw new Error("Failed to get login credentials");
      }

      // Send login request to backend
      // const response = await fetch(`${this.backendUrl}/login/miniAppLogin`, {

      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ code }),
      // });

      // if (!response.ok) {
      //   throw new Error(`Login request failed: ${response.status}`);
      // }

      // const backendResponse = await response.json();
      // const token = backendResponse.data;

      // if (!token) {
      //   throw new Error('Backend returned empty token');
      // }
      // todo: update to API
      const token = "123456";

      // Save token to memory and localStorage
      return token;
    } catch (error) {
      console.error("Login failed:", error);
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
    localStorage.removeItem("token");
  }

  /**
   * Sets the app key
   */
  setAppKey(appKey: string): void {
    this.appKey = appKey;
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
