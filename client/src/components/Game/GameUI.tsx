import React from "react";
import { useGameStore } from "../../stores/gameStore";
import { Leaderboard } from "./Leaderboard";
import { ToBattleButton } from "./ToBattleButton";
import { Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "../../stores/settingsStore";
import { SettingsModal } from "../Settings/SettingsModal";
import { GameOverModal } from "./GameOverModal";

export const GameUI: React.FC = React.memo(() => {
  const isPlaying = useGameStore((state) => state.isPlaying);
  const { t } = useTranslation();
  const { openSettingsModal, isSettingsModalOpen } = useSettingsStore();
    const isGameOver = useGameStore((state) => state.isGameOver);

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
      {/* Settings button positioned independently at top-right */}
      {!isPlaying && (
        <>
          <button
            className="settings-button"
            onClick={openSettingsModal}
            aria-label={t("common:navigation.settings")}
          >
            <Settings size={24} />
          </button>
          <SettingsModal />
        </>
      )}
    </>
  );
});

GameUI.displayName = "GameUI";
