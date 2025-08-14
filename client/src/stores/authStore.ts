import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authService } from "../services/authService";
import { useSettingsStore } from "./settingsStore";

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
  userInfo: UserInfo | null;
  contactInfo: ContactInfo | null;
  isLoggedIn: boolean;
  isLoading: boolean;

  // Actions
  login: () => Promise<void>;
  logout: () => void;
  setUserInfo: (userInfo: UserInfo) => void;
  setContactInfo: (contactInfo: ContactInfo) => void;
  initializeAuth: () => Promise<void>;
}

const defaultAuthState = {
  token: null,
  userInfo: null,
  contactInfo: null,
  isLoggedIn: false,
  isLoading: false,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...defaultAuthState,
      login: async () => {
        set({ isLoading: true });
        try {
          const token = await authService.login();
          set({
            token,
            isLoggedIn: true,
            isLoading: false,
          });

          // Get user info and contact info concurrently after successful login
          const [userInfo, contactInfo] = await Promise.all([
            authService.getUserInfo(),
            authService.getUserContactInfo(),
          ]);
          set({
            userInfo,
            contactInfo,
          });
        } catch (error) {
          console.error("Login failed:", error);
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        authService.logout();
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

        const language = await authService.getLanguage();
        useSettingsStore.getState().setLanguage(language as any);

        // If already logged in with persisted data, don't call service again
        if (state.isLoggedIn && state.token) {
          console.log("Auth data already persisted, skipping service calls");
          return;
        }

        try {
          await state.login();
          console.log("Auto login successful, token:", state.token);
        } catch (error) {
          console.log("Auto login failed, continuing as guest:", error);
        }
      },
    }),
    {
      name: "snake-zone-auth",
      partialize: (state) => ({
        token: state.token,
        userInfo: state.userInfo,
        contactInfo: state.contactInfo,
        isLoggedIn: state.isLoggedIn,
      }),
    }
  )
);
