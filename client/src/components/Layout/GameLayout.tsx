import React, { useEffect } from "react";
import { GameCanvas } from "../Game/GameCanvas";
import { GameUI } from "../Game/GameUI";
import { GameOverModal } from "../Game/GameOverModal";
import { Joypad } from "../Game/Joypad";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";
import { useGameStore } from "../../stores/gameStore";
import { authService } from "../../services/authService";

export const GameLayout: React.FC = () => {
  const { resetGame, startGame, isPlaying } = useGameStore();

  // Initialize keyboard controls
  useKeyboardControls();

  // Auto login on component mount
  useEffect(() => {
    const autoLogin = async () => {
      // Attempt automatic login if MOS SDK is available
      if (typeof window.mos !== "undefined") {
        try {
          await authService.login();
          authService.getUserInfo();
          authService.getUserContactInfo();
          console.log("Auto login successful, token:", authService.getToken());
        } catch (error) {
          console.log("Auto login failed, continuing as guest:", error);
          throw error;
        }
      }
    };

    // Delay to ensure MOS SDK is loaded
    const timer = setTimeout(autoLogin, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Force fullscreen with landscape mode when game starts playing
  useEffect(() => {
    const enterFullscreenLandscape = async () => {
      if (!isPlaying) return;

      try {
        // Request fullscreen
        const element = document.documentElement;
        if (element.requestFullscreen) {
          await element.requestFullscreen();
        } else if ((element as any).webkitRequestFullscreen) {
          await (element as any).webkitRequestFullscreen();
        } else if ((element as any).msRequestFullscreen) {
          await (element as any).msRequestFullscreen();
        }

        // Lock orientation to landscape
            // @ts-ignore
        if (screen.orientation && screen.orientation.lock) {
          try {
            // @ts-ignore
            await screen.orientation.lock("landscape");
          } catch (orientationError) {
            console.log("Orientation lock failed:", orientationError);
            // Fallback: try to lock to landscape-primary
            try {
              // @ts-ignore
              await screen.orientation.lock("landscape-primary");
            } catch (fallbackError) {
              console.log("Fallback orientation lock failed:", fallbackError);
            }
          }
        }
      } catch (error) {
        console.log("Fullscreen request failed:", error);
      }
    };

    enterFullscreenLandscape();
  }, [isPlaying]);

  const handleRestart = () => {
    resetGame();
    startGame();
  };

  return (
    <div className="game-layout">
      <GameCanvas />
      <GameUI />
      <GameOverModal onRestart={handleRestart} />
      <Joypad />
    </div>
  );
};
