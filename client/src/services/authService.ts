import { request } from "../utils";

// MOS SDK Authentication Service
interface LoginResponse {
  code: string;
}

export interface UserInfo {
  firstName: string;
  lastName: string;
  headPortrait: string;
  descriptor: string;
  authorized: number;
  authResult?: boolean;
}

interface RankPlayer {
  id: string;
  name: string;
  avatarUrl: string;
  score: number;
  rank: number;
}

export interface Rank {
  topPlayers: RankPlayer[];
  currentUserRank: RankPlayer;
}

export interface UserScore {
  id: string;
  name: string;
  avatarUrl: string;
  score: number;
  rank: number;
}

export interface ScoreUpdateResponse {
  id: string;
  oldScore: number;
  newScore: number;
  scoreChange: number;
}

class AuthService {
  /**
   * Logs in using the MOS SDK
   */
  async login(): Promise<any> {
    try {
      // Check if MOS SDK is available
      if (typeof window.mos === "undefined") {
        throw new Error("MOS SDK not loaded");
      }
      // Call MOS SDK to get login credentials
      const mosResponse: LoginResponse = await window.mos.login(
        import.meta.env.VITE_MOS_APP_KEY
      );
      const code = mosResponse?.code;
      const res = await request.post<{ token: string }>(
        "/login/snakeZone/miniAppLogin",
        { code },
        { requiresAuth: false }
      );

      const token = res?.token;
      if (!token) {
        throw new Error("Backend returned empty token");
      }
      // Save token to memory and localStorage
      return res;
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
      const userProfile = await this.getUserProfile();
      if (userProfile?.authResult) return userProfile;
      const userInfoResponse = await window.mos.getUserInfo("user_info");
      if (userInfoResponse.authorized) {
      return userInfoResponse || {};
      }
      // required user info
      throw new Error("user_info_denied");
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
      return await request.post("/user/snakeZone/saveUserInfo", userInfo);
    } catch (error) {
      console.error("Save user info to backend failed:", error);
      throw error;
    }
  }
  /**
   * Gets player score from the backend
   */
  async getScore() {
    try {
      return await request.get<UserScore>("/progress/snakeZone/getScore");
    } catch (error) {
      console.error("Get score failed:", error);
      throw error;
    }
  }
  /**
   * Updates player progress and score to the backend
   */
  async updateScore(score: number): Promise<ScoreUpdateResponse> {
    try {
      return await request.put<ScoreUpdateResponse>("/progress/snakeZone/setScore", { score });
    } catch (error) {
      console.error("Update progress failed:", error);
      throw error;
    }
  }
  /**
   * game rank data
   */
  async getRank() {
    try {
      return await request.post<Rank>("/rank/snakeZone");
    } catch (error) {
      console.error("Post game rank failed:", error);
      throw error;
    }
  }
  /**
   * Gets user information from the backend
   */
  async getUserProfile() {
    try {
      return await request.post<UserInfo>("/user/snakeZone/getUserInfo");
    } catch (error) {
      console.error("Get user info from backend failed:", error);
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
    };
  }
}
