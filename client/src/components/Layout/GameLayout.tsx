import React, { useRef, useState } from 'react';
import { GameCanvas } from '../Game/GameCanvas';
import { GameUI } from '../Game/GameUI';
import { GameOverModal } from '../Game/GameOverModal';
import { MultiplayerConnection } from '../Game/MultiplayerConnection';
import { Joypad } from '../Game/Joypad';
import { useKeyboardControls } from '../../hooks/useKeyboardControls';
import { useGameStore } from '../../stores/gameStore';
import { GameEngine } from '../../game/GameEngine';

export const GameLayout: React.FC = () => {
  const gameEngineRef = useRef<GameEngine | null>(null);
  const [gameMode, setGameMode] = useState<'single' | 'multiplayer'>('single');
  const { resetGame, startGame } = useGameStore();
  
  // Initialize keyboard controls
  useKeyboardControls();
  
  const handleRestart = () => {
    resetGame();
    startGame();
    
    // Reset the game engine if it exists
    if (gameEngineRef.current) {
      gameEngineRef.current.resetGame();
    }
  };

  const handleModeChange = (mode: 'single' | 'multiplayer') => {
    setGameMode(mode);
    // Reset game when switching modes
    resetGame();
  };
  
  return (
    <div className="game-layout">
      <div className="game-header">
        <MultiplayerConnection onModeChange={handleModeChange} />
      </div>
      <GameCanvas />
      <GameUI />
      <GameOverModal onRestart={handleRestart} />
      <Joypad />
    </div>
  );
};