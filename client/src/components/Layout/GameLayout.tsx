import React, { useEffect } from "react";
import { GameCanvas } from "../Game/GameCanvas";
import { GameUI } from "../Game/GameUI";
import { Joypad } from "../Game/Joypad";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";
import { authService } from "../../services/authService";
import { useGameStore } from "../../stores/gameStore";

export const GameLayout: React.FC = () => {
  // Initialize keyboard controls
  useKeyboardControls();
  const { isPlaying } = useGameStore();

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

  return (
    <div className="game-layout">
      {isPlaying && <GameCanvas />}
      <GameUI />
      {isPlaying && <Joypad />}
    </div>
  );
};
