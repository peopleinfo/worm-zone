import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SupportedLanguage } from "../i18n";

export interface SoundSettings {
  master: number;
  music: number;
  effects: number;
  muted: boolean;
}

export type SettingsTab = "language" | "sound";

interface SettingsState {
  // UI State
  isSettingsModalOpen: boolean;
  isTopPlayersModalOpen: boolean;
  isProfileModalOpen: boolean;
  activeSettingsTab: SettingsTab;

  // Language
  language: SupportedLanguage;

  // Sound Settings
  sound: SoundSettings;

  // Actions
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  toggleSettingsModal: () => void;
  openTopPlayersModal: () => void;
  closeTopPlayersModal: () => void;
  toggleTopPlayersModal: () => void;
  openProfileModal: () => void;
  closeProfileModal: () => void;
  toggleProfileModal: () => void;
  setLanguage: (language: SupportedLanguage) => void;
  updateSoundSettings: (settings: Partial<SoundSettings>) => void;
  setActiveSettingsTab: (tab: SettingsTab) => void;
  resetSettings: () => void;
}

const defaultSettings = {
  isSettingsModalOpen: false,
  isTopPlayersModalOpen: false,
  isProfileModalOpen: false,
  activeSettingsTab: "language" as SettingsTab,
  language: "en" as SupportedLanguage,
  sound: {
    master: 0.8,
    music: 0.6,
    effects: 0.8,
    muted: false,
  },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      openSettingsModal: () => set({ isSettingsModalOpen: true }),
      closeSettingsModal: () => set({ isSettingsModalOpen: false }),
      toggleSettingsModal: () =>
        set((state) => ({
          isSettingsModalOpen: !state.isSettingsModalOpen,
        })),

      openTopPlayersModal: () => set({ isTopPlayersModalOpen: true }),
      closeTopPlayersModal: () => set({ isTopPlayersModalOpen: false }),
      toggleTopPlayersModal: () =>
        set((state) => ({
          isTopPlayersModalOpen: !state.isTopPlayersModalOpen,
        })),

      openProfileModal: () => set({ isProfileModalOpen: true }),
      closeProfileModal: () => set({ isProfileModalOpen: false }),
      toggleProfileModal: () =>
        set((state) => ({
          isProfileModalOpen: !state.isProfileModalOpen,
        })),

      setLanguage: (lang) => {
        const normalizeLang = lang.slice(0, 2) as SupportedLanguage;
        const language = normalizeLang.startsWith("zh") ? "cn" : normalizeLang;
        set({ language });
        // Update i18n language
        import("../i18n").then(({ default: i18n }) => {
          i18n.changeLanguage(language);
        });
      },

      updateSoundSettings: (settings) =>
        set((state) => ({
          sound: { ...state.sound, ...settings },
        })),
      
      setActiveSettingsTab: (tab) => {
        set({ activeSettingsTab: tab });
      },
      
      resetSettings: () => set(defaultSettings),
    }),
    {
      name: "snake-zone-settings",
      partialize: (state) => ({
        language: state.language,
        sound: state.sound,
      }),
    }
  )
);
