import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SupportedLanguage } from '../i18n';

export interface SoundSettings {
  master: number;
  music: number;
  effects: number;
  muted: boolean;
}

interface SettingsState {
  // UI State
  isSettingsModalOpen: boolean;
  
  // Language
  language: SupportedLanguage;
  
  // Sound Settings
  sound: SoundSettings;
  
  // Actions
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  toggleSettingsModal: () => void;
  setLanguage: (language: SupportedLanguage) => void;
  updateSoundSettings: (settings: Partial<SoundSettings>) => void;
  resetSettings: () => void;
}

const defaultSettings = {
  isSettingsModalOpen: false,
  language: 'en' as SupportedLanguage,
  sound: {
    master: 0.8,
    music: 0.6,
    effects: 0.8,
    muted: false,
  },
};

export const useSettingsStore = create<SettingsState>()(persist(
  (set) => ({
    ...defaultSettings,
    
    openSettingsModal: () => set({ isSettingsModalOpen: true }),
    closeSettingsModal: () => set({ isSettingsModalOpen: false }),
    toggleSettingsModal: () => set((state) => ({ 
      isSettingsModalOpen: !state.isSettingsModalOpen 
    })),
    
    setLanguage: (language) => {
      set({ language });
      // Update i18n language
      import('../i18n').then(({ default: i18n }) => {
        i18n.changeLanguage(language);
      });
    },
    
    updateSoundSettings: (settings) => set((state) => ({
      sound: { ...state.sound, ...settings }
    })),
    resetSettings: () => set(defaultSettings),
  }),
  {
    name: 'snake-zone-settings',
    partialize: (state) => ({
      language: state.language,
      sound: state.sound,
    }),
  }
));