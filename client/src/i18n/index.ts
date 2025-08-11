import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

// Import translation files
import enCommon from './locales/en/common.json';
import enGame from './locales/en/game.json';
import khCommon from './locales/kh/common.json';
import khGame from './locales/kh/game.json';
import cnCommon from './locales/cn/common.json';
import cnGame from './locales/cn/game.json';

const resources = {
  en: {
    common: enCommon,
    game: enGame,
  },
  kh: {
    common: khCommon,
    game: khGame,
  },
  cn: {
    common: cnCommon,
    game: cnGame,
  },
};

i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    // Language detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'snake-zone-language',
    },

    interpolation: {
      escapeValue: false, // React already does escaping
    },

    // Default namespace
    defaultNS: 'common',
    ns: ['common', 'game'],

    // Backend options for loading translations
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
  });

export default i18n;

// Export supported languages
export const supportedLanguages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'kh', name: 'ខ្មែរ', flag: '🇰🇭' },
  { code: 'cn', name: '中文', flag: '🇨🇳' },
] as const;

export type SupportedLanguage = typeof supportedLanguages[number]['code'];