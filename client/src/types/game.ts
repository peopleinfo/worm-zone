// src/types/game.ts
export interface Point {
  x: number;
  y: number;
  radius: number;
  color: string;
}

export interface Snake {
  id: string;
  points: Point[];
  velocity: { x: number; y: number };
  angle: number;
  radius: number;
  speed: number;
  turningSpeed: number;
  color: string;
  ai: boolean;
  isAlive: boolean;
}

export interface Food {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
}

export interface GameState {
  isPlaying: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  score: number;
  rank: number;
  playerCount: number;
  mode: 'single' | 'multiplayer';
  status: string;
}

export interface Controls {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}