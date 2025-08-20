import React, { useEffect, useState } from "react";
import { GameCanvas } from "../Game/GameCanvas";
import { GameUI } from "../Game/GameUI";
import { Joypad } from "../Game/Joypad";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";
import { useGameStore } from "../../stores/gameStore";
import { authService } from "../../services/authService";

export const GameLayout: React.FC = () => {
  // Initialize keyboard controls
  useKeyboardControls();
  const isPlaying = useGameStore((state) => state.isPlaying);
  const [marginTop, setMarginTop] = useState({ statusBarHeight: 0 });

  useEffect(() => {
    authService.getWindowInfo().then((margin) => {
      setMarginTop(margin);
    });
  }, []);
  return (
    <div
      className="game-layout"
      style={{ marginLeft: marginTop?.statusBarHeight }}
    >
      {isPlaying && <GameCanvas />}
      <GameUI />
      {isPlaying && <Joypad />}
    </div>
  );
};
