import React, { useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';

interface GameOverModalProps {
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = React.memo(({ onRestart }) => {
  // Use selective subscriptions to minimize re-renders
  const isGameOver = useGameStore((state) => state.isGameOver);
  const score = useGameStore((state) => state.score);
  const rank = useGameStore((state) => state.rank);
  const highestScore = useGameStore((state) => state.highestScore);
  
  // Add keyboard support for restarting with spacebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver && e.code === 'Space') {
        e.preventDefault();
        onRestart();
      }
    };

    if (isGameOver) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isGameOver, onRestart]);
  
  if (!isGameOver) return null;
  
  return (
    <div className="game-over-modal">
      <div className="modal-content">
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
            <div className="new-record">
              🎉 You got new highest score! 🎉
            </div>
          )}
        </div>
        <button 
          className="restart-button"
          onClick={onRestart}
        >
          Play Again
        </button>
      </div>
    </div>
  );
});

GameOverModal.displayName = 'GameOverModal';