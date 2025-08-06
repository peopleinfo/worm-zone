import { create } from 'zustand';
import type { GameState, Snake, Food, Controls, Point } from '../types/game';

interface GameStore extends GameState {
  // Game Objects
  mySnake: Snake | null;
  otherSnakes: Snake[];
  foods: Food[];
  deadPoints: Point[];
  
  // Controls
  controls: Controls;
  
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
}

const initialState = {
  isPlaying: false,
  isPaused: false,
  isGameOver: false,
  score: 0,
  rank: 0,
  playerCount: 0,
  mode: 'single' as const,
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
};

export const useGameStore = create<GameStore>((set, get) => ({
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
    return state;
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
}));