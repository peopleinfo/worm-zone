import { getRandomColor, getRandX, getRandY, lerp } from '../utils/gameUtils';
import { Point } from './Point';

export class Food extends Point {
  static i: number = 0;
  id: string;

  constructor(id: string, x: number, y: number, radius: number, color: string) {
    super(x, y, radius, color);
    this.id = id;
  }

  // Override isInViewport to include food-specific logic if needed
  isInViewport(viewX: number, viewY: number, viewWidth: number, viewHeight: number): boolean {
    const margin = this.radius * 2; // Add some margin for smooth transitions
    return (
      this.x + margin >= viewX &&
      this.x - margin <= viewX + viewWidth &&
      this.y + margin >= viewY &&
      this.y - margin <= viewY + viewHeight
    );
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

  draw(ctx: CanvasRenderingContext2D): void {
    // Optimized rendering for mobile performance - no shadows or gradients
    const drawColor = this.color;
    
    // Simple solid circle for better performance
    ctx.fillStyle = drawColor;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Optional simple border for visibility
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}