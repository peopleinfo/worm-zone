import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authService, type Rank, type UserScore } from "../services/authService";
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

  // Actions
  login: () => Promise<void>;
  logout: () => void;
  setUserInfo: (userInfo: UserInfo) => void;
  initializeAuth: () => Promise<void>;
  getRank: () => Promise<Rank>;
  getScores: () => Promise<UserScore>;
  scores: UserScore;
  isLoadingScores: boolean;
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
            if (!userInfo.authResult) {
              await authService.saveUserInfo({
                authResult: !!userInfo?.authorized,
                firstName: userInfo?.firstName,
                headPortrait: userInfo?.headPortrait,
                lastName: userInfo?.lastName,
              });
            }
            console.log("Auto login successful, token:", state.token);
          } catch (error) {
            console.log("Auto login failed, continuing as guest:", error);
          }
        } finally {
          sleep(800).then(() => {
            set({ isLoadingInit: false });
          });
        }
      },
      getRank: async () => {
        try {
          const userProfile = await authService.getRank();
          console.log("userProfile", userProfile);
          return userProfile;
        } catch (error) {
          console.error("Get user profile failed:", error);
          throw error;
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
