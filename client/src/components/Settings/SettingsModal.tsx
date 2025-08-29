import React from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useSettingsStore } from "../../stores/settingsStore";
import { MusicMuteButton } from "../Game/MusicMuteButton";
import { EffectsMuteButton } from "../Game/EffectsMuteButton";
import { LanguageSelector } from "./LanguageSelector";
import { QualitySelector } from "./QualitySelector";

export const SettingsModal: React.FC = () => {
  const { t } = useTranslation("common");
  const isSettingsModalOpen = useSettingsStore(
    (state) => state.isSettingsModalOpen
  );
  const closeSettingsModal = useSettingsStore(
    (state) => state.closeSettingsModal
  );

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeSettingsModal();
    }
  };


  if (!isSettingsModalOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={handleBackdropClick}>
      <div className="settings-modal">
        {/* Modal Header */}
        <div className="modal-header">
          <h2 className="modal-title">{t("settings.title")}</h2>
          <button
            className="close-button"
            onClick={closeSettingsModal}
            aria-label={t("navigation.close")}
          >
            <X size={24} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="modal-content">
          <div className="settings-section">
            {/* Language Settings */}
            <LanguageSelector />
            
            {/* Sound Settings */}
            <div className="setting-item">
              <label>{t("settings.music")}</label>
              <MusicMuteButton isAbsolute={false} />
            </div>
            <div className="setting-item">
              <label>{t("settings.effects")}</label>
              <EffectsMuteButton isAbsolute={false} />
            </div>
            
            {/* Graphics Settings */}
            <QualitySelector />
          </div>
        </div>
      </div>
    </div>
  );
};
