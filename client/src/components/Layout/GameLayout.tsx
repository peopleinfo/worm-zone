import React, { useRef, useState, useEffect } from "react";
import { GameCanvas } from "../Game/GameCanvas";
import { GameUI } from "../Game/GameUI";
import { GameOverModal } from "../Game/GameOverModal";
import { MultiplayerConnection } from "../Game/MultiplayerConnection";
import { Joypad } from "../Game/Joypad";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";
import { useGameStore } from "../../stores/gameStore";
import { GameEngine } from "../../game/GameEngine";
import { authService } from "../../services/authService";

export const GameLayout: React.FC = () => {
  const gameEngineRef = useRef<GameEngine | null>(null);
  const [gameMode, setGameMode] = useState<"single" | "multiplayer">("single");
  const { resetGame, startGame } = useGameStore();

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

  const handleRestart = () => {
    resetGame();
    startGame();

    // Reset the game engine if it exists
    if (gameEngineRef.current) {
      gameEngineRef.current.resetGame();
    }
  };

  const handleModeChange = (mode: "single" | "multiplayer") => {
    setGameMode(mode);
    // Reset game when switching modes
    resetGame();
  };

  return (
    <div className="game-layout">
      <div className="game-header">
        <MultiplayerConnection onModeChange={handleModeChange} />
      </div>
      <GameCanvas />
      <GameUI />
      <GameOverModal onRestart={handleRestart} />
      <Joypad />
    </div>
  );
};
