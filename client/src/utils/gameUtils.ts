import { Point } from '../game/Point';

export const isCollided = (circle1: Point, circle2: Point): boolean => {
  const distance = Math.hypot(circle1.x - circle2.x, circle1.y - circle2.y);
  return distance < circle1.radius + circle2.radius;
};

export const getRandomColor = (): string => {
  const colors = ['red', 'green', 'blue', 'white', 'yellow', 'orange', 'purple', 'lightgreen', 'grey'];
  return colors[Math.floor(Math.random() * colors.length)];
};

export const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * t;
};

export const getRandX = (canvasWidth: number): number => Math.random() * canvasWidth;
export const getRandY = (canvasHeight: number): number => Math.random() * canvasHeight;

// Constants from original game
export const INFINITY = 0;
export const coeffD2R = Math.PI / 180;
export const coeffR2D = 180 / Math.PI;
export const defRad = 5;