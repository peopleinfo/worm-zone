import { getRandomColor, getRandX, getRandY, lerp } from '../utils/gameUtils';
import { Point } from './Point';

export class Food extends Point {
  static i: number = 0;
  // Enhanced object pooling system for Food (separate from Point pool)
  private static foodPool: Food[] = [];
  private static foodPoolSize: number = 0;
  private static readonly MAX_FOOD_POOL_SIZE = 200;
  private static idCounter: number = 0;

  id: string;

  constructor(id: string, x: number, y: number, radius: number, color: string) {
    super(x, y, radius, color);
    this.id = id;
  }

  static create(x: number, y: number, radius: number = 5): Food {
    let food: Food;

    if (Food.foodPool.length > 0) {
      food = Food.foodPool.pop()!;
      Food.foodPoolSize--;
      // Reset the food properties
      food.x = x;
      food.y = y;
      food.radius = radius;
      food.color = getRandomColor();
    } else {
      const id = `food_${++Food.idCounter}`;
      food = new Food(id, x, y, radius, getRandomColor());
    }

    food.id = `food_${++Food.idCounter}`;
    return food;
  }

  static release(food: Food): void {
    if (Food.foodPoolSize < Food.MAX_FOOD_POOL_SIZE) {
      // Reset food state before returning to pool
      food.x = 0;
      food.y = 0;
      food.radius = 5;
      food.color = '#FF6B6B';

      Food.foodPool.push(food);
      Food.foodPoolSize++;
    }
  }

  static createBatch(count: number, worldWidth: number, worldHeight: number): Food[] {
    const foods: Food[] = [];
    for (let i = 0; i < count; i++) {
      const x = Math.random() * worldWidth;
      const y = Math.random() * worldHeight;
      foods.push(Food.create(x, y));
    }
    return foods;
  }

  static cleanPool(): void {
    // Keep pool size reasonable
    if (Food.foodPoolSize > Food.MAX_FOOD_POOL_SIZE * 0.8) {
      const targetSize = Math.floor(Food.MAX_FOOD_POOL_SIZE * 0.6);
      Food.foodPool.splice(targetSize);
      Food.foodPoolSize = targetSize;
    }
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

  draw(ctx: CanvasRenderingContext2D, color?: string): void {
    // Optimized rendering for mobile performance - no shadows or gradients
    const drawColor = color || this.color;

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

  // Removed unused color manipulation methods for performance
}