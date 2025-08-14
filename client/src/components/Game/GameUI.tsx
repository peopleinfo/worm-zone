import React from "react";
import { useGameStore } from "../../stores/gameStore";
import { Leaderboard } from "./Leaderboard";
import { ToBattleButton } from "./ToBattleButton";
import { MiniMap } from "./MiniMap";
import { Settings, Trophy, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "../../stores/settingsStore";
import { SettingsModal } from "../Settings/SettingsModal";
import { TopPlayersModal } from "./TopPlayersModal";
import { ProfileModal } from "../Profile/ProfileModal";
import { GameOverModal } from "./GameOverModal";
import { useAuthStore } from "../../stores/authStore";

export const GameUI: React.FC = React.memo(() => {
  const isPlaying = useGameStore((state) => state.isPlaying);
  const { t } = useTranslation();
  const {
    openSettingsModal,
    isSettingsModalOpen,
    openTopPlayersModal,
    openProfileModal,
  } = useSettingsStore();
  const isGameOver = useGameStore((state) => state.isGameOver);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  return (
    <>
      <GameOverModal />
      <TopPlayersModal />
      {isLoggedIn && <ProfileModal />}
      {!isSettingsModalOpen && !isGameOver && (
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
      {/* MiniMap positioned at top-right during gameplay */}
      {isPlaying && <MiniMap />}
      {/* Settings button positioned independently at top-right */}
      {!isPlaying && (
        <>
          <div className="top-right-buttons">
            {isLoggedIn && (
              <button
                className="settings-button"
                onClick={openProfileModal}
                aria-label={t("common:profile.title")}
              >
                <User size={24} />
              </button>
            )}
            <button
              className="settings-button"
              onClick={openTopPlayersModal}
              aria-label={t("game:leaderboard.topPlayers")}
            >
              <Trophy size={24} />
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
