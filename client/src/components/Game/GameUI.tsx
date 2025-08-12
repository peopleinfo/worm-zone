import React, { useState } from "react";
import { useGameStore } from "../../stores/gameStore";
import { Leaderboard } from "./Leaderboard";
import { ToBattleButton } from "./ToBattleButton";
import { Settings, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "../../stores/settingsStore";
import { SettingsModal } from "../Settings/SettingsModal";
import { GameOverModal } from "./GameOverModal";

export const GameUI: React.FC = React.memo(() => {
  const isPlaying = useGameStore((state) => state.isPlaying);
  const { t } = useTranslation();
  const { openSettingsModal, isSettingsModalOpen } = useSettingsStore();
  const isGameOver = useGameStore((state) => state.isGameOver);
  const [isRotating, setIsRotating] = useState(false);

  const handleRotationToggle = async () => {
    if (!screen.orientation) {
      console.warn('Screen Orientation API not supported');
      return;
    }

    setIsRotating(true);
    try {
      const currentOrientation = screen.orientation.type;
      const isPortrait = currentOrientation.includes('portrait');
      
      if (isPortrait) {
        await screen.orientation.lock('landscape');
      } else {
        await screen.orientation.lock('portrait');
      }
    } catch (error) {
      console.warn('Failed to lock screen orientation:', error);
    } finally {
      setTimeout(() => setIsRotating(false), 500);
    }
  };

  return (
    <>
      <GameOverModal />
      {(!isSettingsModalOpen && !isGameOver) && (
        <div className="game-ui">
        <Leaderboard />
        {!isPlaying && (
          <>
            <div className="start-message">
              <h2>Snake Zone</h2>
              <ToBattleButton />
            </div>
          </>
        )}
      </div>
      )}
      {/* Settings and rotation buttons positioned independently at top-right */}
      {!isPlaying && (
        <>
          <div className="top-right-buttons">
            <button
              className="rotation-button"
              onClick={handleRotationToggle}
              disabled={isRotating}
              aria-label="Toggle screen rotation"
            >
              <RotateCcw size={24} className={isRotating ? 'rotating' : ''} />
            </button>
            <button
              className="settings-button"
              onClick={openSettingsModal}
              aria-label={t("common:navigation.settings")}
            >
              <Settings size={24} />
            </button>
          </div>
          <SettingsModal />
        </>
      )}
    </>
  );
});

GameUI.displayName = "GameUI";
