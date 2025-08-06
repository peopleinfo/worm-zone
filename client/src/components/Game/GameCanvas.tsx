import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { GameEngine } from '../../game/GameEngine';

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const { isPlaying, startGame } = useGameStore();
  
  useEffect(() => {
    if (canvasRef.current && !gameEngineRef.current) {
      gameEngineRef.current = new GameEngine(canvasRef.current);
    }
  }, []);
  
  useEffect(() => {
    if (gameEngineRef.current) {
      if (isPlaying) {
        gameEngineRef.current.start();
      } else {
        gameEngineRef.current.stop();
      }
    }
  }, [isPlaying]);

  const handleCanvasClick = () => {
    if (!isPlaying) {
      startGame();
    }
  };
  
  return (
    <canvas
      ref={canvasRef}
      id="gameCanvas"
      className="game-canvas"
      onClick={handleCanvasClick}
      style={{
        display: 'block',
        cursor: isPlaying ? 'none' : 'pointer',
        background: '#000'
      }}
    />
  );
};