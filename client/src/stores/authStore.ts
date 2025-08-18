import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  authService,
  type Rank,
  type UserScore,
  type ScoreUpdateResponse,
} from "../services/authService";
import { useSettingsStore } from "./settingsStore";
import { sleep } from "../utils";

interface UserInfo {
  firstName: string;
  lastName: string;
  headPortrait: string;
  descriptor: string;
  authorized: number;
}

interface AuthState {
  // Auth data
  token: string | null;
  openId: string | null;
  userInfo: UserInfo | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  isLoadingInit: boolean;
  isUserInfoDenied: boolean;
  // Game data
  scores: UserScore;
  isLoadingScores: boolean;
  rank: Rank | null;
  isLoadingRank: boolean;

  // Connection state (from ToBattleButton)
  isConnecting: boolean;
  connectionError: string | null;

  // Score update state (from GameOverModal)
  scoreUpdateData: ScoreUpdateResponse | null;

  // Actions
  login: () => Promise<void>;
  logout: () => void;
  setUserInfo: (userInfo: UserInfo) => void;
  initializeAuth: () => Promise<void>;
  getRank: () => Promise<Rank>;
  getScores: () => Promise<UserScore>;

  // Connection actions
  setConnecting: (isConnecting: boolean) => void;
  setConnectionError: (error: string | null) => void;
  clearConnectionError: () => void;

  // Score update actions
  setScoreUpdateData: (data: ScoreUpdateResponse | null) => void;
  clearScoreUpdateData: () => void;
  updateScore: (score: number) => Promise<ScoreUpdateResponse | null>;
}

const defaultAuthState = {
  token: null,
  openId: null,
  userInfo: null,
  isLoggedIn: false,
  isLoading: false,
  isLoadingInit: true,
  scores: {} as any,
  isLoadingScores: false,
  rank: null,
  isLoadingRank: false,
  isUserInfoDenied: false,
  // Connection state
  isConnecting: false,
  connectionError: null,

  // Score update state
  scoreUpdateData: null,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...defaultAuthState,
      login: async () => {
        set({ isLoading: true });
        try {
          const { token, openId } = (await authService.login()) || {};
          set({
            token,
            openId,
            isLoggedIn: true,
            isLoading: false,
          });
        } catch (error) {
          console.error("Login failed:", error);
          set({ isLoading: false });
          throw error;
        }
      },
      getScores: async () => {
        set({ isLoadingScores: true });
        try {
          const scores = await authService.getScore();
          set({ scores, isLoadingScores: false });
          return scores;
        } catch (error) {
          console.error("Get score failed:", error);
          set({ isLoadingScores: false });
          throw error;
        }
      },

      logout: () => {
        set(defaultAuthState);
      },

      setUserInfo: (userInfo) => {
        set({ userInfo });
      },
      initializeAuth: async () => {
        const state = get();
        set({ isLoadingInit: true });
        try {
          const language = await authService.getLanguage();
          useSettingsStore.getState().setLanguage(language as any);
          try {
            await state.login();
            const userInfo = await authService.getUserInfo();
            set({
              userInfo,
            });
            console.log("userInfo", userInfo);
            if (!userInfo.authResult) {
              await authService.saveUserInfo({
                authResult: !!userInfo?.authorized,
                firstName: userInfo?.firstName,
                headPortrait: userInfo?.headPortrait,
                lastName: userInfo?.lastName,
              });
            }
            console.log("Auto login successful, token:", state.token);
          } catch (error: any) {
            console.log("Auto login failed:", error);
            set({ isUserInfoDenied: error.message === "user_info_denied" });
          }
        } finally {
          sleep(800).then(() => {
            set({ isLoadingInit: false });
          });
        }
      },
      getRank: async () => {
        set({ isLoadingRank: true });
        try {
          const rank = await authService.getRank();
          set({ rank, isLoadingRank: false });
          return rank;
        } catch (error) {
          console.error("Get rank failed:", error);
          set({ isLoadingRank: false });
          throw error;
        }
      },

      // Connection actions
      setConnecting: (isConnecting: boolean) => {
        set({ isConnecting });
      },

      setConnectionError: (error: string | null) => {
        set({ connectionError: error });
      },

      clearConnectionError: () => {
        set({ connectionError: null });
      },

      // Score update actions
      setScoreUpdateData: (data: ScoreUpdateResponse | null) => {
        set({ scoreUpdateData: data });
      },

      clearScoreUpdateData: () => {
        set({ scoreUpdateData: null });
      },

      updateScore: async (score: number) => {
        try {
          const updateResponse = await authService.updateScore(score);
          set({ scoreUpdateData: updateResponse });
          // Also refresh scores after update
          const scores = await authService.getScore();
          set({ scores });
          return updateResponse;
        } catch (error) {
          console.error("Update score failed:", error);
          return null;
        }
      },
    }),
    {
      name: "snake-zone-auth",
      partialize: (state) => ({
        token: state.token,
        openId: state.openId,
        userInfo: state.userInfo,
        isLoggedIn: state.isLoggedIn,
      }),
    }
  )
);
