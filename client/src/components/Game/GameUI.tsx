import React from "react";
import { useGameStore } from "../../stores/gameStore";
import { Leaderboard } from "./Leaderboard";
import { ToBattleButton } from "./ToBattleButton";

export const GameUI: React.FC = React.memo(() => {
  const isPlaying = useGameStore((state) => state.isPlaying);
  const { resetGame } = useGameStore();

  const handleModeChange = () => {
    // Reset game when switching modes
    resetGame();
  };

  return (
    <div className="game-ui">
      <Leaderboard />

      {!isPlaying && (
        <div className="start-message">
          <h2>Snake Zone</h2>
          <ToBattleButton onModeChange={handleModeChange} />
        </div>
      )}
    </div>
  );
});

GameUI.displayName = "GameUI";
