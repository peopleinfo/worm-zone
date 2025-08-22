import React, { useState, useEffect } from "react";
import { GameCanvas } from "../Game/GameCanvas";
import { GameUI } from "../Game/GameUI";
import { Joypad } from "../Game/Joypad";
import { PerformanceMonitor } from "../PerformanceMonitor";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";
import { useGameStore } from "../../stores/gameStore";
import { type PerformanceStats } from "../../utils/PerformanceTracker";

export const GameLayout: React.FC = () => {
  // Initialize keyboard controls
  useKeyboardControls();
  const isPlaying = useGameStore((state) => state.isPlaying);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);

  // Get performance stats from GameEngine
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      // Get GameEngine instance from global window object if available
      const gameEngine = (window as any).gameEngine;
      if (gameEngine && typeof gameEngine.getPerformanceStats === 'function') {
        const stats = gameEngine.getPerformanceStats();
        setPerformanceStats(stats);
      }
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Toggle performance monitor with keyboard shortcut (P key)
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'p' || event.key === 'P') {
        setShowPerformanceMonitor(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="game-layout">
      {isPlaying && <GameCanvas />}
      <GameUI />
      {isPlaying && <Joypad />}
      {isPlaying && performanceStats && (
        <PerformanceMonitor 
          stats={performanceStats} 
          visible={showPerformanceMonitor} 
        />
      )}
    </div>
  );
};
