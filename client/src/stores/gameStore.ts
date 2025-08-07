import { create } from 'zustand';
import type { GameState, Controls } from '../types/game';
import type { Snake } from '../game/Snake';
import type { Food } from '../game/Food';
import type { Point } from '../game/Point';

interface GameStore extends GameState {
  // Game Objects
  mySnake: Snake | null;
  otherSnakes: Snake[];
  foods: Food[];
  deadPoints: Point[];
  
  // Controls
  controls: Controls;
  
  // Countdown state
  isCountingDown: boolean;
  countdownValue: number | null;
  
  // Actions
  setGameState: (state: Partial<GameState>) => void;
  updateMySnake: (snake: Snake) => void;
  updateOtherSnakes: (snakes: Snake[]) => void;
  updateFoods: (foods: Food[]) => void;
  addDeadPoints: (points: Point[]) => void;
  updateControls: (controls: Partial<Controls>) => void;
  updateSnakeAngle: (angle: number) => void;
  resetGame: () => void;
  startGame: () => void;
  endGame: (finalScore: number, finalRank: number) => void;
  startCountdown: () => Promise<void>;
  stopCountdown: () => void;
}

const initialState = {
  isPlaying: false,
  isPaused: false,
  isGameOver: false,
  score: 0,
  rank: 0,
  playerCount: 0,
  mode: 'multiplayer' as const,
  status: 'Ready',
  
  mySnake: null,
  otherSnakes: [],
  foods: [],
  deadPoints: [],
  
  controls: {
    up: false,
    down: false,
    left: false,
    right: false,
  },
  
  isCountingDown: false,
  countdownValue: null,
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,
  
  setGameState: (state) => set((prev) => ({ ...prev, ...state })),
  
  updateMySnake: (snake) => set({ mySnake: snake }),
  
  updateOtherSnakes: (snakes) => set({ otherSnakes: snakes }),
  
  updateFoods: (foods) => set({ foods }),
  
  addDeadPoints: (points) => set((state) => ({
    deadPoints: [...state.deadPoints, ...points]
  })),
  
  updateControls: (controls) => set((state) => ({
    controls: { ...state.controls, ...controls }
  })),

  updateSnakeAngle: (angle) => set((state) => {
    if (state.mySnake) {
      state.mySnake.angle = angle;
    }
    return {}; // Return empty object to trigger re-render
  }),
  
  resetGame: () => set(initialState),
  
  startGame: () => set({
    isPlaying: true,
    isGameOver: false,
    isPaused: false,
    status: 'Playing',
    score: 0,
    rank: 0
  }),
  
  endGame: (finalScore, finalRank) => set({
    isPlaying: false,
    isGameOver: true,
    score: finalScore,
    rank: finalRank,
    status: 'Game Over'
  }),
  
  startCountdown: async () => {
    return new Promise<void>((resolve) => {
      set({ isCountingDown: true, countdownValue: 3, status: 'Starting...' });
      
      let count = 3;
      const countdownInterval = setInterval(() => {
        if (count > 1) {
          count--;
          set({ countdownValue: count });
        } else {
          clearInterval(countdownInterval);
          set({ 
            isCountingDown: false, 
            countdownValue: null,
            isPlaying: true,
            status: 'Playing'
          });
          resolve();
        }
      }, 1000);
    });
  },
  
  stopCountdown: () => set({
    isCountingDown: false,
    countdownValue: null,
    status: 'Ready'
  }),
}));