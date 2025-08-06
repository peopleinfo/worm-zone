import React, { useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';

interface GameOverModalProps {
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ onRestart }) => {
  const { isGameOver, score, rank } = useGameStore();
  
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
          <p>Final Score: {score}</p>
          <p>Final Rank: #{rank}</p>
        </div>
        <button 
          className="restart-button"
          onClick={onRestart}
        >
          Play Again
        </button>
        <p className="restart-hint">Press SPACE to restart</p>
      </div>
    </div>
  );
};