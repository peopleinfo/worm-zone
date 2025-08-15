import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authService } from "../services/authService";
import { useSettingsStore } from "./settingsStore";
import { sleep } from "../utils";

interface UserInfo {
  firstName: string;
  lastName: string;
  headPortrait: string;
  descriptor: string;
  authorized: number;
}

interface ContactInfo {
  authorized: number;
  dialCode: string;
  phone: string;
  email: string | null;
}

interface AuthState {
  // Auth data
  token: string | null;
  openId: string | null;
  userInfo: UserInfo | null;
  contactInfo: ContactInfo | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  isLoadingInit: boolean;

  // Actions
  login: () => Promise<void>;
  logout: () => void;
  setUserInfo: (userInfo: UserInfo) => void;
  setContactInfo: (contactInfo: ContactInfo) => void;
  initializeAuth: () => Promise<void>;
  // getUserProfile: () => Promise<void>;
  getRank: () => Promise<void>;
}

const defaultAuthState = {
  token: null,
  openId: null,
  userInfo: null,
  contactInfo: null,
  isLoggedIn: false,
  isLoading: false,
  isLoadingInit: true,
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

      logout: () => {
        set(defaultAuthState);
      },

      setUserInfo: (userInfo) => {
        set({ userInfo });
      },

      setContactInfo: (contactInfo) => {
        set({ contactInfo });
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
                authResult: userInfo?.authorized,
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
      // getUserProfile: async () => {
      //   try {
      //     const userProfile = await authService.getUserProfile();
      //     console.log("userProfile", userProfile);
      //   } catch (error) {
      //     console.error("Get user profile failed:", error);
      //     throw error;
      //   }
      // },
      getRank: async () => {
        try {
          const userProfile = await authService.getRank();
          console.log("userProfile", userProfile);
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
        contactInfo: state.contactInfo,
        isLoggedIn: state.isLoggedIn,
      }),
    }
  )
);
