import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SupportedLanguage } from "../i18n";

export type QualityLevel = "low" | "medium" | "hd";

export interface SoundSettings {
  master: number;
  music: number;
  effects: number;
  muted: boolean; // Legacy property for backward compatibility
  musicMuted: boolean;
  effectsMuted: boolean;
}



interface SettingsState {
  // UI State
  isSettingsModalOpen: boolean;
  isTopPlayersModalOpen: boolean;
  isProfileModalOpen: boolean;

  // Language
  language: SupportedLanguage;

  // Sound Settings
  sound: SoundSettings;

  // Graphics Settings
  quality: QualityLevel;

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
  setQuality: (quality: QualityLevel) => void;
  resetSettings: () => void;
}

const defaultSettings = {
  isSettingsModalOpen: false,
  isTopPlayersModalOpen: false,
  isProfileModalOpen: false,
  language: "en" as SupportedLanguage,
  sound: {
    master: 0.8,
    music: 0.6,
    effects: 0.8,
    muted: false, // Legacy property for backward compatibility
    musicMuted: false,
    effectsMuted: false,
  },
  quality: "hd" as QualityLevel,
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
        set((state) => {
          const newSound = { ...state.sound, ...settings };

          // Sync with audio service - use dynamic import to avoid circular dependency
          import("../services/audioService").then(({ audioService }) => {
            if (settings.music !== undefined) {
              audioService.setVolume(settings.music);
            }
            if (settings.effects !== undefined) {
              audioService.setEffectsVolume(settings.effects);
            }
            if (settings.musicMuted !== undefined) {
              audioService.setMusicMuted(settings.musicMuted);
            }
            if (settings.effectsMuted !== undefined) {
              audioService.setEffectsMuted(settings.effectsMuted);
            }
            // Legacy support for backward compatibility
            if (settings.muted !== undefined) {
              audioService.setMusicMuted(settings.muted);
              audioService.setEffectsMuted(settings.muted);
            }
          }).catch((error) => {
            console.error('Failed to sync with audio service:', error);
          });

          return { sound: newSound };
        }),

      setQuality: (quality) => {
        set({ quality });
      },

      resetSettings: () => set(defaultSettings),
    }),
    {
      name: "snake-zone-settings",
      partialize: (state) => ({
        language: state.language,
        sound: state.sound,
        quality: state.quality,
      }),
    }
  )
);
