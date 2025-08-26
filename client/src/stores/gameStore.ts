import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GameState, Controls } from "../types/game";
import type { Snake } from "../game/Snake";
import type { Food } from "../game/Food";
import type { Point } from "../game/Point";
import { useAuthStore } from "./authStore";

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
  fullLeaderboard: LeaderboardPlayer[];
  currentPlayerId: string | null;
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
  updateFullLeaderboard: (fullLeaderboard: LeaderboardPlayer[]) => void;
  setCurrentPlayerId: (playerId: string) => void;
  getRealUserId: () => string | null;
  resetGame: () => void;
  startGame: () => void;
  endGame: (finalScore: number, finalRank: number) => void;
  startCountdown: () => Promise<void>;
  stopCountdown: () => void;
  isHowToPlayOpen: boolean;
  setIsHowToPlayOpen: (isOpen: boolean) => void;
  toggleHowToPlay: () => void;
  setPaused: (paused: boolean) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  resetCompleteState: () => void;
  restartGame: () => void;
  cleanupGameSession: () => void;
  handleModalClose: (action: 'close' | 'restart') => void;
}

const initialState = {
  isPlaying: false,
  isPaused: false,
  isGameOver: false,
  score: 0,
  finalScore: 0, // Preserve final score for GameOverModal
  rank: 0,
  playerCount: 0,
  mode: "multiplayer" as const,
  status: "Ready",

  mySnake: null,
  otherSnakes: [],
  foods: [],
  deadPoints: [],

  leaderboard: [],
  fullLeaderboard: [],
  currentPlayerId: null,
  // Removed highestScore and userScores - now handled by authStore

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

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setGameState: (state) =>
        set((prev) => {
          if (state.score !== undefined && state.score !== prev.score) {
            console.log(
              "🎮 setGameState - score changed from",
              prev.score,
              "to",
              state.score
            );
          }
          return { ...prev, ...state };
        }),

      updateMySnake: (snake) => set({ mySnake: snake }),

      updateOtherSnakes: (snakes) => set({ otherSnakes: snakes }),

      updateFoods: (foods) => set({ foods }),

      removeFood: (foodId) =>
        set((state) => ({
          foods: state.foods.filter((food) => food.id !== foodId),
        })),

      addDeadPoints: (points) =>
        set((state) => ({
          deadPoints: [...state.deadPoints, ...points],
        })),

      removeDeadPoints: (points) =>
        set((state) => ({
          deadPoints: state.deadPoints.filter(
            (dp) => !points.some((p) => p.x === dp.x && p.y === dp.y)
          ),
        })),

      updateControls: (controls) =>
        set((state) => ({
          controls: { ...state.controls, ...controls },
        })),

      updateSnakeAngle: (angle) =>
        set((state) => {
          if (state.mySnake) {
            state.mySnake.angle = angle;
          }
          return {}; // Return empty object to trigger re-render
        }),

      updateLeaderboard: (leaderboard) => set({ leaderboard }),

      updateFullLeaderboard: (fullLeaderboard) => set({ fullLeaderboard }),

      setCurrentPlayerId: (playerId) => set({ currentPlayerId: playerId }),

      // Removed score-related methods - now handled by authStore

      getRealUserId: () => {
        const authState = useAuthStore.getState();
        const { openId } = authState;

        return openId || null;
      },

      setIsHowToPlayOpen: (isOpen) => set({ isHowToPlayOpen: isOpen }),
      toggleHowToPlay: () =>
        set((state) => ({ isHowToPlayOpen: !state.isHowToPlayOpen })),

      resetGame: () =>
        set((prev) => {
          // Resume background music when game resets - use dynamic import
          import("../services/audioService").then(({ audioService }) => {
            audioService.playBackgroundMusic();
          }).catch((error) => {
            console.error('Failed to play background music on reset:', error);
          });
          
          return {
            ...initialState,
            currentPlayerId: prev.currentPlayerId, // Preserve player ID
          };
        }),

      startGame: () =>
        set(() => {
          // Start background music when game starts - use dynamic import
          import("../services/audioService").then(({ audioService }) => {
            audioService.playBackgroundMusic();
          }).catch((error) => {
            console.error('Failed to play background music on start:', error);
          });
          
          return {
            isPlaying: true,
            isGameOver: false,
            isPaused: false,
            status: "Playing",
            score: 0,
            rank: 0,
          };
        }),

      endGame: (finalScore, finalRank) =>
        set(() => {
          // Leave the socket room after preserving the final game state
          try {
            // Import socketClient dynamically to avoid circular dependency
            import("../services/socketClient")
              .then(({ socketClient }) => {
                socketClient.leaveRoom();
              })
              .catch((error) => {
                console.error("❌ Failed to leave room:", error);
              });
          } catch (error) {
            console.error("❌ Error importing socketClient:", error);
          }

          // Stop background music when game ends - use dynamic import
          import("../services/audioService").then(({ audioService }) => {
            audioService.stopBackgroundMusic();
          }).catch((error) => {
            console.error('Failed to stop background music on end:', error);
          });

          return {
            isPlaying: false,
            isGameOver: true,
            score: finalScore,
            finalScore: finalScore, // Preserve final score for modal display
            rank: finalRank,
            status: "Game Over",
          };
        }),

      startCountdown: async () => {
        return new Promise<void>((resolve) => {
          set({
            isCountingDown: true,
            countdownValue: 3,
            status: "Starting...",
          });

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
                status: "Playing",
              });
              resolve();
            }
          }, 1000);
        });
      },

      stopCountdown: () =>
        set({
          isCountingDown: false,
          countdownValue: null,
          status: "Ready",
        }),

      setPaused: (paused) =>
        set({
          isPaused: paused,
          status: paused ? "Paused" : "Playing",
        }),

      pauseGame: () =>
        set({
          isPaused: true,
          status: "Paused",
        }),

      resumeGame: () =>
        set({
          isPaused: false,
          status: "Playing",
        }),

      // Complete state reset for modal close
      resetCompleteState: () => set(() => {
        // Import socketClient dynamically to avoid circular dependency
        import("../services/socketClient")
          .then(({ socketClient }) => {
            socketClient.leaveRoom();
            socketClient.disconnect();
          })
          .catch((error) => {
            console.error("❌ Failed to cleanup socket:", error);
          });

        // Stop background music
        import("../services/audioService").then(({ audioService }) => {
          audioService.stopBackgroundMusic();
        }).catch((error) => {
          console.error('Failed to stop background music on reset:', error);
        });

        return {
          ...initialState,
          // Preserve only persistent data
          currentPlayerId: null,
        };
      }),

      // Restart game without complete reset
      restartGame: () => set((state) => ({
        ...state,
        // Reset game-specific state only
        isPlaying: false,
        isGameOver: false,
        isPaused: false,
        score: 0,
        rank: 0,
        mySnake: null,
        otherSnakes: [],
        foods: [],
        deadPoints: [],
        status: 'Ready',
        isCountingDown: false,
        countdownValue: null,
      })),

      // Cleanup game session
      cleanupGameSession: () => {
        // Clear any running timers or intervals
        // Reset canvas context if needed
        // Cleanup socket listeners
        console.log('🧹 Cleaning up game session');
      },

      // Handle modal close with different actions
      handleModalClose: (action: 'close' | 'restart') => {
        if (action === 'close') {
          get().resetCompleteState();
          get().cleanupGameSession();
        } else if (action === 'restart') {
          get().restartGame();
          // Emit socket event to restart in same room
          import("../services/socketClient")
            .then(({ socketClient }) => {
              socketClient.requestRestart();
            })
            .catch((error) => {
              console.error("❌ Failed to request restart:", error);
            });
        }
      },
    }),
    {
      name: "snake-zone-game-store",
      partialize: () => ({}), // No persistent data needed - scores handled by authStore
    }
  )
);
