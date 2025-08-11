import React from "react";
import { useTranslation } from "react-i18next";
import { Settings } from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { ToBattleButton } from "../Game/ToBattleButton";

export const LandingHome: React.FC = () => {
  const { t } = useTranslation(["common", "game"]);
  const { startGame } = useGameStore();
  const { openSettingsModal } = useSettingsStore();

  const handlePlayNow = () => {
    startGame();
  };

  return (
    <div className="landing-home">
      {/* Settings Icon - Top Right */}
      <button
        className="settings-button"
        onClick={openSettingsModal}
        aria-label={t("common:navigation.settings")}
      >
        <Settings size={24} />
      </button>

      {/* Main Content */}
      <div className="landing-content">
        {/* Game Logo/Title */}
        <div className="game-branding">
          <h1 className="game-title">{t("common:app.title")}</h1>
          <p className="game-subtitle">{t("common:app.subtitle")}</p>
        </div>

        {/* Game Preview/Animation Area */}
        <div className="game-preview">
          <div className="preview-worm">
            <div className="worm-segment head"></div>
            <div className="worm-segment"></div>
            <div className="worm-segment"></div>
            <div className="worm-segment"></div>
            <div className="worm-segment tail"></div>
          </div>
          <div className="preview-food"></div>
        </div>

        {/* Play Button */}
        <ToBattleButton />
        {/* Game Instructions */}
        <div className="game-instructions">
          <p>{t("game:controls.mobile")}</p>
        </div>
      </div>
    </div>
  );
};

// CSS styles will be added to App.css
