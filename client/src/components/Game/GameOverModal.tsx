import React from "react";
import { X, RotateCcw } from "lucide-react";
import { useGameStore } from "../../stores/gameStore";

export const GameOverModal = React.memo(
  () => {
    // Use selective subscriptions to minimize re-renders
    const isGameOver = useGameStore((state) => state.isGameOver);
    const score = useGameStore((state) => state.finalScore);
    const rank = useGameStore((state) => state.rank);
    const getCurrentUserHighestScore = useGameStore((state) => state.getCurrentUserHighestScore);
    const setGameOver = useGameStore((state) => state.setGameState);

    const resetGame = useGameStore((state) => state.resetGame);

    // Get user-specific highest score
    const userHighestScore = getCurrentUserHighestScore();

    const handleClose = () => {
      setGameOver({ isGameOver: false });
    };

    const handleRestart = () => {
      setGameOver({ isGameOver: false });
      resetGame();
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
              <span className="stat-value highlight">{userHighestScore}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Current Rank:</span>
              <span className="stat-value">#{rank}</span>
            </div>
            {score > userHighestScore && score > 0 && (
              <div className="new-record">🎉 You got new highest score! 🎉</div>
            )}
          </div>
          {/* <div className="modal-actions">
            <button
              className="restart-button"
              onClick={handleRestart}
              aria-label="Restart game"
            >
              <RotateCcw size={20} />
              Restart Game
            </button>
          </div> */}
        </div>
      </div>
    );
  }
);

GameOverModal.displayName = "GameOverModal";
