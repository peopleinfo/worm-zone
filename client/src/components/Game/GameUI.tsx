import React from 'react';
import { useGameStore } from '../../stores/gameStore';
import { Leaderboard } from './Leaderboard';

// Memoized component to prevent unnecessary re-renders
export const GameUI: React.FC = React.memo(() => {
  // Use selective subscriptions to minimize re-renders
  const score = useGameStore((state) => state.score);
  const rank = useGameStore((state) => state.rank);
  const playerCount = useGameStore((state) => state.playerCount);
  const status = useGameStore((state) => state.status);
  const isPlaying = useGameStore((state) => state.isPlaying);
  
  return (
    <div className="game-ui">
      <Leaderboard />
      
      <div className="meta-info">
        <div className="score">Score: {score}</div>
        <div className="rank">Rank: {rank}</div>
        <div className="players">Players: {playerCount}</div>
        <div className="status">Status: {status}</div>
      </div>
      
      {!isPlaying && (
        <div className="start-message">
          <h2>Worm Zone Clone</h2>
          <p>Click to start playing!</p>
        </div>
      )}
    </div>
  );
});

GameUI.displayName = 'GameUI';