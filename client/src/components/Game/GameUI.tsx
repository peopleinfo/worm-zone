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
import { QuitModal } from "../QuitModal";
import { socketClient } from "../../services/socketClient";

export const GameUI: React.FC = React.memo(() => {
  const isPlaying = useGameStore((state) => state.isPlaying);
  const isHowToPlayOpen = useGameStore((state) => state.isHowToPlayOpen);
  const toggleHowToPlay = useGameStore((state) => state.toggleHowToPlay);
  const resetGame = useGameStore((state) => state.resetGame);

  const [isQuitModalOpen, setIsQuitModalOpen] = React.useState(false);

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

  // Handle quit button click
  const handleQuitClick = () => {
    audioService.handleUserInteraction();
    setIsQuitModalOpen(true);
  };

  // Handle quit confirmation
  const handleQuitConfirm = () => {
    // Disconnect from socket room first
    socketClient.leaveRoom();
    // Then reset the game state
    resetGame();
    setIsQuitModalOpen(false);
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
      {/* Quit button positioned at top-right during gameplay */}
      {isPlaying && (
        <div className="top-right-buttons" style={{ right: 150, zIndex: 9000 }}>
          <svg
            onClick={handleQuitClick}
            style={{ color: "white" }}
            aria-label={t("game:quit.button", "Quit Game")}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </div>
      )}
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
      <QuitModal
        isOpen={isQuitModalOpen}
        onClose={() => setIsQuitModalOpen(false)}
        onConfirm={handleQuitConfirm}
      />
    </>
  );
});

GameUI.displayName = "GameUI";
