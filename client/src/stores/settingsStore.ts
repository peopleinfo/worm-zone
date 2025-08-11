import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SupportedLanguage } from '../i18n';

export interface SoundSettings {
  master: number;
  music: number;
  effects: number;
  muted: boolean;
}

export interface GraphicsSettings {
  quality: 'low' | 'medium' | 'high';
  particles: boolean;
  shadows: boolean;
}

export interface ControlSettings {
  sensitivity: number;
  vibration: boolean;
  joystickSize: 'small' | 'medium' | 'large';
}

export interface UserProfile {
  username: string;
  avatar: string;
}

interface SettingsState {
  // UI State
  isSettingsModalOpen: boolean;
  
  // Language
  language: SupportedLanguage;
  
  // Sound Settings
  sound: SoundSettings;
  
  // Graphics Settings
  graphics: GraphicsSettings;
  
  // Control Settings
  controls: ControlSettings;
  
  // User Profile
  profile: UserProfile;
  
  // Actions
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  toggleSettingsModal: () => void;
  
  setLanguage: (language: SupportedLanguage) => void;
  
  updateSoundSettings: (settings: Partial<SoundSettings>) => void;
  updateGraphicsSettings: (settings: Partial<GraphicsSettings>) => void;
  updateControlSettings: (settings: Partial<ControlSettings>) => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  
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
  graphics: {
    quality: 'medium' as const,
    particles: true,
    shadows: true,
  },
  controls: {
    sensitivity: 0.7,
    vibration: true,
    joystickSize: 'medium' as const,
  },
  profile: {
    username: 'Player',
    avatar: 'default',
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
    
    updateGraphicsSettings: (settings) => set((state) => ({
      graphics: { ...state.graphics, ...settings }
    })),
    
    updateControlSettings: (settings) => set((state) => ({
      controls: { ...state.controls, ...settings }
    })),
    
    updateUserProfile: (profile) => set((state) => ({
      profile: { ...state.profile, ...profile }
    })),
    
    resetSettings: () => set(defaultSettings),
  }),
  {
    name: 'snake-zone-settings',
    partialize: (state) => ({
      language: state.language,
      sound: state.sound,
      graphics: state.graphics,
      controls: state.controls,
      profile: state.profile,
    }),
  }
));