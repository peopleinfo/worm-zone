import React from "react";
import { GameCanvas } from "../Game/GameCanvas";
import { GameUI } from "../Game/GameUI";
import { Joypad } from "../Game/Joypad";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";
import { useGameStore } from "../../stores/gameStore";

export const GameLayout: React.FC = () => {
  // Initialize keyboard controls
  useKeyboardControls();
  const { isPlaying } = useGameStore();

  return (
    <div className="game-layout">
      {isPlaying && <GameCanvas />}
      <GameUI />
      {isPlaying && <Joypad />}
    </div>
  );
};
