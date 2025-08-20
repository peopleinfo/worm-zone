import React from "react";
import { useTranslation } from "react-i18next";
import { X, Volume2, VolumeX, Globe } from "lucide-react";
import { useSettingsStore } from "../../stores/settingsStore";
import { audioService } from "../../services/audioService";
import { LanguageSelector } from "./LanguageSelector";
import { MuteToggleButton } from "../Game/MuteToggleButton";

export const SettingsModal: React.FC = () => {
  const { t } = useTranslation("common");
  const {
    isSettingsModalOpen,
    closeSettingsModal,
    sound,
    updateSoundSettings,
    activeSettingsTab,
    setActiveSettingsTab,
  } = useSettingsStore();

  const activeTab = activeSettingsTab;

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeSettingsModal();
    }
  };

  // Handle settings button click to initialize audio context
  const handleSettingsButtonClick = () => {
    audioService.handleUserInteraction();
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
          {/* Tab Navigation */}
          <div className="settings-tabs">
            <button
              className={`tab-button ${
                activeTab === "language" ? "active" : ""
              }`}
              onClick={() => {
                handleSettingsButtonClick();
                setActiveSettingsTab("language");
              }}
            >
              <Globe size={18} />
              {t("settings.language")}
            </button>
            <button
              className={`tab-button ${activeTab === "sound" ? "active" : ""}`}
              onClick={() => {
                handleSettingsButtonClick();
                setActiveSettingsTab("sound");
              }}
            >
              <Volume2 size={18} />
              {t("settings.sound")}
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === "language" && (
              <div className="tab-panel">
                <LanguageSelector />
              </div>
            )}

            {activeTab === "sound" && (
              <div className="tab-panel">
                <div className="settings-section">
                  <div className="setting-item">
                    <label>{t("settings.music")}</label>
                    <MuteToggleButton isAbsolute={false} />
                    <div className="slider-container">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={sound.music}
                        onChange={(e) => {
                          handleSettingsButtonClick();
                          updateSoundSettings({
                            music: parseFloat(e.target.value),
                          });
                        }}
                        className="volume-slider"
                      />
                      <span className="slider-value">
                        {Math.round(sound.music * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* <div className="setting-item">
                    <label>{t("settings.effects")}</label>
                    <div className="slider-container">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={sound.effects}
                        onChange={(e) => {
                          handleSettingsButtonClick();
                          updateSoundSettings({
                            effects: parseFloat(e.target.value),
                          });
                        }}
                        className="volume-slider"
                      />
                      <span className="slider-value">
                        {Math.round(sound.effects * 100)}%
                      </span>
                    </div>
                  </div> */}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
