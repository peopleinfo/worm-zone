import React, { useEffect } from "react";
import { X } from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import { useAuthStore } from "../../stores/authStore";

export const GameOverModal = React.memo(
  () => {
    // Use selective subscriptions to minimize re-renders
    const isGameOver = useGameStore((state) => state.isGameOver);
    const score = useGameStore((state) => state.finalScore);
    const rank = useGameStore((state) => state.rank);
    const setGameOver = useGameStore((state) => state.setGameState);
    
    // Auth store for scores and score update data
    const scores = useAuthStore((state) => state.scores);
    const isLoadingScores = useAuthStore((state) => state.isLoadingScores);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const scoreUpdateData = useAuthStore((state) => state.scoreUpdateData);
    const updateScore = useAuthStore((state) => state.updateScore);

    // Update score and refresh scores when game ends
    useEffect(() => {
      if (isGameOver && score > 0 && isLoggedIn) {
        updateScore(score);
      }
    }, [isGameOver, score, isLoggedIn, updateScore]);

    // Get user-specific highest score from auth store or score update data
    const userHighestScore = scoreUpdateData ? scoreUpdateData.newScore : (scores?.score || 0);
    
    // Check if this is a new record based on score update data
    const isNewRecord = scoreUpdateData ? scoreUpdateData.scoreChange > 0 : false;

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
              <span className="stat-value highlight">
                {isLoadingScores ? "Loading..." : userHighestScore}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Current Rank:</span>
              <span className="stat-value">#{rank}</span>
            </div>
            {isNewRecord && (
              <div className="new-record">
                🎉 New Record! +{scoreUpdateData?.scoreChange} points! 🎉
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

GameOverModal.displayName = "GameOverModal";
