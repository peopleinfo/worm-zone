import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../stores/settingsStore';
import { supportedLanguages, type SupportedLanguage } from '../../i18n';

export const LanguageSelector: React.FC = () => {
  const { t } = useTranslation();
  const { language, setLanguage } = useSettingsStore();

  const handleLanguageChange = (langCode: SupportedLanguage) => {
    setLanguage(langCode);
  };

  return (
    <div className="language-selector">
      <div className="language-label">{t('common:settings.language')}</div>
      <div className="language-options">
        {supportedLanguages.map((lang) => (
          <button
            key={lang.code}
            className={`language-option ${
              language === lang.code ? 'active' : ''
            }`}
            onClick={() => handleLanguageChange(lang.code)}
          >
            <div className="language-flag">
              <span className="flag-emoji">{lang.flag}</span>
            </div>
            <span className="language-code">{lang.code.toUpperCase()}</span>
          </button>
        ))}
      </div>
    </div>
  );
};