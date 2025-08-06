import React from 'react';
import { useGameStore } from '../../stores/gameStore';

export const GameUI: React.FC = () => {
  const { score, rank, playerCount, status, isPlaying } = useGameStore();
  
  return (
    <div className="game-ui">
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
          <p>Use arrow keys to control your worm</p>
        </div>
      )}
    </div>
  );
};