import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import { supportedLanguages, type SupportedLanguage } from '../../i18n';

export const LanguageSelector: React.FC = () => {
  const { t } = useTranslation('common');
  const { language, setLanguage } = useSettingsStore();

  const handleLanguageChange = (langCode: SupportedLanguage) => {
    setLanguage(langCode);
  };

  return (
    <div className="language-selector">
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
            
            <div className="language-info">
              <span className="language-name">{lang.name}</span>
              <span className="language-code">{lang.code.toUpperCase()}</span>
            </div>
            
            {language === lang.code && (
              <div className="language-check">
                <Check size={20} />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};