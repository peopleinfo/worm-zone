import React, { useEffect } from "react";
import { GameCanvas } from "../Game/GameCanvas";
import { GameUI } from "../Game/GameUI";
import { Joypad } from "../Game/Joypad";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";
import { useAuthStore } from "../../stores/authStore";
import { useGameStore } from "../../stores/gameStore";

export const GameLayout: React.FC = () => {
  // Initialize keyboard controls
  useKeyboardControls();
  const { isPlaying } = useGameStore();
  const { initializeAuth } = useAuthStore();

  // Auto login on component mount using auth store
  useEffect(() => {
    const autoLogin = async () => {
      try {
        await initializeAuth();
      } catch (error) {
        console.log("Auto login failed, continuing as guest:", error);
      }
    };

    // Delay to ensure MOS SDK is loaded
    const timer = setTimeout(autoLogin, 1000);

    return () => clearTimeout(timer);
  }, [initializeAuth]);

  return (
    <div className="game-layout">
      {isPlaying && <GameCanvas />}
      <GameUI />
      {isPlaying && <Joypad />}
    </div>
  );
};
