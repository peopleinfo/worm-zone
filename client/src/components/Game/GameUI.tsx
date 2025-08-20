import React from "react";
import { useGameStore } from "../../stores/gameStore";
import { Leaderboard } from "./Leaderboard";
import { ToBattleButton } from "./ToBattleButton";
import { MiniMap } from "./MiniMap";

import { useTranslation } from "react-i18next";
import { useSettingsStore } from "../../stores/settingsStore";
import { audioService } from "../../services/audioService";
import { SettingsModal } from "../Settings/SettingsModal";
import { TopPlayersModal } from "./TopPlayersModal";
import { ProfileModal } from "../Profile/ProfileModal";
import { GameOverModal } from "./GameOverModal";
import { useAuthStore } from "../../stores/authStore";
import { HowToPlayModal } from "./HowToPlayModal";
import { MuteToggleButton } from "./MuteToggleButton";

export const GameUI: React.FC = React.memo(() => {
  const isPlaying = useGameStore((state) => state.isPlaying);
  const isHowToPlayOpen = useGameStore((state) => state.isHowToPlayOpen);
  const toggleHowToPlay = useGameStore((state) => state.toggleHowToPlay);

  const { t } = useTranslation();

  const openSettingsModal = useSettingsStore(
    (state) => state.openSettingsModal
  );

  const isSettingsModalOpen = useSettingsStore(
    (state) => state.isSettingsModalOpen
  );

  const openTopPlayersModal = useSettingsStore(
    (state) => state.openTopPlayersModal
  );

  const openProfileModal = useSettingsStore((state) => state.openProfileModal);

  // Handle settings button click to initialize audio context
  const handleSettingsClick = () => {
    audioService.handleUserInteraction();
    openSettingsModal();
  };
  const isGameOver = useGameStore((state) => state.isGameOver);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  return (
    <>
      <HowToPlayModal isOpen={isHowToPlayOpen} onClose={toggleHowToPlay} />
      <GameOverModal />
      <TopPlayersModal />
      {isLoggedIn && <ProfileModal />}
      {!isSettingsModalOpen && !isGameOver && (
        <div className="game-ui">
          <Leaderboard />
          {!isPlaying && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 30,
              }}
            >
              <img
                src="/logo.png"
                alt="Snake Zone"
                style={{
                  width: 240,
                  marginBottom: "20px",
                }}
              />
              <div className="start-message">
                <ToBattleButton />
              </div>
            </div>
          )}
        </div>
      )}
      {/* MiniMap positioned at top-right during gameplay */}
      {isPlaying && <MiniMap />}
      {/* Settings button positioned independently at top-right */}
      {!isPlaying && (
        <>
          <MuteToggleButton />
          <div className="top-right-buttons">
            {isLoggedIn && (
              <button
                className="circle-button"
                onClick={openProfileModal}
                aria-label={t("common:profile.title")}
              >
                <img src="/icons/profile.png" alt="Profile" />
              </button>
            )}
            <button
              className="circle-button"
              onClick={openTopPlayersModal}
              aria-label={t("game:leaderboard.topPlayers")}
            >
              <img src="/icons/trophy.png" alt="Trophy" />
            </button>
            <button
              className="circle-button"
              onClick={handleSettingsClick}
              aria-label={t("common:navigation.settings")}
            >
              <img src="/icons/setting.png" alt="Settings" />
            </button>
          </div>
          <SettingsModal />
        </>
      )}
    </>
  );
});

GameUI.displayName = "GameUI";
