import type { Food as FoodInterface } from '../types/game';
import { getRandomColor, getRandX, getRandY, defRad, lerp } from '../utils/gameUtils';

export class Food implements FoodInterface {
  static i = 0;
  
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;

  constructor(radius: number = defRad, canvasWidth: number = 800, canvasHeight: number = 600) {
    this.x = getRandX(canvasWidth);
    this.y = getRandY(canvasHeight);
    this.radius = radius;
    this.color = getRandomColor();
    this.id = Math.random().toString(36).substr(2, 9);
  }

  regenerate(canvasWidth: number = 800, canvasHeight: number = 600): void {
    this.x = getRandX(canvasWidth);
    this.y = getRandY(canvasHeight);
    this.color = getRandomColor();
  }

  animate(): void {
    this.radius = lerp(this.radius * 0.8, this.radius, ++Food.i / this.radius);
    Food.i %= 17;
  }

  draw(ctx: CanvasRenderingContext2D, color?: string): void {
    // this.animate(); // Uncomment if animation is desired
    ctx.beginPath();
    ctx.fillStyle = color || this.color;
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}