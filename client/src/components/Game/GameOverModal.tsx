import React, { useEffect } from "react";
import { X } from "lucide-react";
import { useGameStore } from "../../stores/gameStore";

interface GameOverModalProps {
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = React.memo(
  ({ onRestart }) => {
    // Use selective subscriptions to minimize re-renders
    const isGameOver = useGameStore((state) => state.isGameOver);
    const score = useGameStore((state) => state.score);
    const rank = useGameStore((state) => state.rank);
    const highestScore = useGameStore((state) => state.highestScore);
    const setGameOver = useGameStore((state) => state.setGameState);

    // Add keyboard support for restarting with spacebar and closing with Escape
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (isGameOver) {
          if (e.code === "Space") {
            e.preventDefault();
            onRestart();
          } else if (e.key === "Escape") {
            e.preventDefault();
            setGameOver({ isGameOver: false });
          }
        }
      };

      if (isGameOver) {
        window.addEventListener("keydown", handleKeyDown);
      }

      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    }, [isGameOver, onRestart, setGameOver]);

    const handleClose = () => {
      setGameOver({ isGameOver: false });
    };

    if (!isGameOver) return null;

    return (
      <div className="game-over-modal">
        <div className="modal-content" style={{ minHeight: 340 }}>
          <button
            className="close-button"
            onClick={handleClose}
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
          <h2>Game Over!</h2>
          <div className="final-stats">
            <div className="stat-item">
              <span className="stat-label">Current Score:</span>
              <span className="stat-value">{score}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Highest Score:</span>
              <span className="stat-value highlight">{highestScore}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Current Rank:</span>
              <span className="stat-value">#{rank}</span>
            </div>
            {score === highestScore && score > 0 && (
              <div className="new-record">🎉 You got new highest score! 🎉</div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

GameOverModal.displayName = "GameOverModal";
