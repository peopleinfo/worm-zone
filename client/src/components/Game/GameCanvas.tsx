import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { GameEngine } from '../../game/GameEngine';

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const isPlaying = useGameStore(state => state.isPlaying);
  
  useEffect(() => {
    if (canvasRef.current && !gameEngineRef.current) {
      gameEngineRef.current = new GameEngine(canvasRef.current);
    }
    
    // Handle window resize and orientation changes
    const handleResize = () => {
      if (gameEngineRef.current) {
        gameEngineRef.current.resize();
      }
    };
    
    // Add resize event listener
    window.addEventListener('resize', handleResize);
    // Add orientation change event listener for mobile devices
    window.addEventListener('orientationchange', handleResize);
    
    // Cleanup function to prevent memory leaks
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (gameEngineRef.current) {
        gameEngineRef.current.stop();
      }
    };
  }, []);
  
  useEffect(() => {
    if (gameEngineRef.current) {
      if (isPlaying) {
        // Ensure we stop any existing loop before starting a new one
        gameEngineRef.current.stop();
        gameEngineRef.current.start();
      } else {
        gameEngineRef.current.stop();
      }
    }
  }, [isPlaying]);
  
  // const handleCanvasClick = () => {
  //   if (!isPlaying) {
  //     startGame();
  //   }
  // };
  
  return (
    <canvas
      ref={canvasRef}
      id="gameCanvas"
      className="game-canvas"
      // onClick={handleCanvasClick}
      style={{
        display: 'block',
        cursor: isPlaying ? 'none' : 'pointer',
        background: 'transparent'
      }}
    />
  );
};