import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameState, Controls } from '../types/game';
import type { Snake } from '../game/Snake';
import type { Food } from '../game/Food';
import type { Point } from '../game/Point';
import { useAuthStore } from './authStore';

// Leaderboard player interface
export interface LeaderboardPlayer {
  id: string;
  name: string;
  score: number;
  rank: number;
  isBot: boolean;
  isCurrentPlayer: boolean;
  realUserId?: string | null; // Real user ID for authenticated users
}

interface GameStore extends GameState {
  // Game Objects
  mySnake: Snake | null;
  otherSnakes: Snake[];
  foods: Food[];
  deadPoints: Point[];
  
  // Leaderboard
  leaderboard: LeaderboardPlayer[];
  currentPlayerId: string | null;
  
  // Persistent stats
  highestScore: number;
  userScores: Record<string, number>; // userId -> highest score
  
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
  removeFood: (foodId: string) => void;
  addDeadPoints: (points: Point[]) => void;
  removeDeadPoints: (points: Point[]) => void;
  updateControls: (controls: Partial<Controls>) => void;
  updateSnakeAngle: (angle: number) => void;
  updateLeaderboard: (leaderboard: LeaderboardPlayer[]) => void;
  setCurrentPlayerId: (playerId: string) => void;
  updateHighestScore: (score: number) => void;
  getUserHighestScore: (userId: string) => number;
  updateUserScore: (userId: string, score: number) => void;
  getCurrentUserHighestScore: () => number;
  getRealUserId: () => string | null;
  initializeUserScore: () => void;
  updateCurrentUserScore: (score: number) => void;
  resetGame: () => void;
  startGame: () => void;
  endGame: (finalScore: number, finalRank: number) => void;
  startCountdown: () => Promise<void>;
  stopCountdown: () => void;
  isHowToPlayOpen: boolean;
  setIsHowToPlayOpen: (isOpen: boolean) => void;
  toggleHowToPlay: () => void;
}

const initialState = {
  isPlaying: false,
  isPaused: false,
  isGameOver: false,
  score: 0,
  finalScore: 0, // Preserve final score for GameOverModal
  rank: 0,
  playerCount: 0,
  mode: 'multiplayer' as const,
  status: 'Ready',
  
  mySnake: null,
  otherSnakes: [],
  foods: [],
  deadPoints: [],
  
  leaderboard: [],
  currentPlayerId: null,
  highestScore: 0,
  userScores: {},
  
  controls: {
    up: false,
    down: false,
    left: false,
    right: false,
  },
  
  isCountingDown: false,
  countdownValue: null,
  isHowToPlayOpen: false,
};

export const useGameStore = create<GameStore>()(persist(
  (set, get) => ({
    ...initialState,
    
    setGameState: (state) => set((prev) => {
      if (state.score !== undefined && state.score !== prev.score) {
        console.log('🎮 setGameState - score changed from', prev.score, 'to', state.score);
      }
      return { ...prev, ...state };
    }),
    
    updateMySnake: (snake) => set({ mySnake: snake }),
    
    updateOtherSnakes: (snakes) => set({ otherSnakes: snakes }),
    
    updateFoods: (foods) => set({ foods }),
    
    removeFood: (foodId) => set((state) => ({
      foods: state.foods.filter(food => food.id !== foodId)
    })),
    
    addDeadPoints: (points) => set((state) => ({
      deadPoints: [...state.deadPoints, ...points]
    })),
    
    removeDeadPoints: (points) => set((state) => ({
      deadPoints: state.deadPoints.filter(dp => !points.some(p => p.x === dp.x && p.y === dp.y))
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
    
    updateLeaderboard: (leaderboard) => set({ leaderboard }),
    
    setCurrentPlayerId: (playerId) => set({ currentPlayerId: playerId }),
    
    updateHighestScore: (score) => set((state) => ({
      highestScore: Math.max(state.highestScore, score)
    })),
    
    getUserHighestScore: (userId) => {
      const state = get();
      return state.userScores[userId] || 0;
    },
    
    updateUserScore: (userId, score) => {
      const state = get();
      const currentHighest = state.userScores[userId] || 0;
      if (score > currentHighest) {
        set({
          userScores: {
            ...state.userScores,
            [userId]: score
          }
        });
      }
    },
    
    getCurrentUserHighestScore: () => {
      const state = get();
      if (state.currentPlayerId) {
        return state.userScores[state.currentPlayerId] || 0;
      }
      return 0;
    },
    
    getRealUserId: () => {
      const authState = useAuthStore.getState();
      const { contactInfo } = authState;
      
      if (!contactInfo) return null;
      
      // Use phone if available (dialCode + phone)
      if (contactInfo.phone && contactInfo.dialCode) {
        return contactInfo.dialCode + contactInfo.phone;
      }
      
      // Use email if available
      if (contactInfo.email) {
        return contactInfo.email;
      }
      
      return null;
    },
    
    setIsHowToPlayOpen: (isOpen) => set({ isHowToPlayOpen: isOpen }),
    toggleHowToPlay: () => set((state) => ({ isHowToPlayOpen: !state.isHowToPlayOpen })),

    initializeUserScore: () => {
      const state = get();
      const realUserId = state.getRealUserId();
      
      if (realUserId && state.currentPlayerId !== realUserId) {
        // Set the real user ID as current player ID
        set({ currentPlayerId: realUserId });
        
        // Initialize user score if not exists
        if (!(realUserId in state.userScores)) {
          set({
            userScores: {
              ...state.userScores,
              [realUserId]: 0
            }
          });
        }
      }
    },
    
    updateCurrentUserScore: (score) => {
      const state = get();
      const realUserId = state.getRealUserId();
      const userId = realUserId || state.currentPlayerId;
      
      if (userId) {
        state.updateUserScore(userId, score);
        
        // Also update global highest score
        state.updateHighestScore(score);
      }
    },
    
    resetGame: () => set((prev) => ({
      ...initialState,
      highestScore: prev.highestScore, // Preserve highest score
      userScores: prev.userScores, // Preserve user scores
      currentPlayerId: prev.currentPlayerId, // Preserve player ID
    })),
    
    startGame: () => set({
      isPlaying: true,
      isGameOver: false,
      isPaused: false,
      status: 'Playing',
      score: 0,
      rank: 0
    }),
    
    endGame: (finalScore, finalRank) => set(() => {
      console.log('🏁 endGame called with finalScore:', finalScore, 'finalRank:', finalRank);
      
      // Update user score using the new method
      if (finalScore > 0) {
        const gameState = get();
        console.log('🏁 Updating user score with finalScore:', finalScore);
        gameState.updateCurrentUserScore(finalScore);
      } else {
        console.log('🏁 finalScore is 0 or negative, not updating user score');
      }
      
      // Leave the socket room after preserving the final game state
      try {
        // Import socketClient dynamically to avoid circular dependency
        import('../services/socketClient').then(({ socketClient }) => {
          console.log('🚪 Leaving socket room after game end');
          socketClient.leaveRoom();
        }).catch(error => {
          console.error('❌ Failed to leave room:', error);
        });
      } catch (error) {
        console.error('❌ Error importing socketClient:', error);
      }
      
      console.log('🏁 Setting game state - score:', finalScore, 'rank:', finalRank);
      return {
        isPlaying: false,
        isGameOver: true,
        score: finalScore,
        finalScore: finalScore, // Preserve final score for modal display
        rank: finalRank,
        status: 'Game Over'
      };
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
  }),
  {
    name: 'snake-zone-game-store',
    partialize: (state) => ({ 
      highestScore: state.highestScore,
      userScores: state.userScores 
    }),
  }
));