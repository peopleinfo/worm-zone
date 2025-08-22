/**
 * Object Pool utility for managing frequently created game objects
 * Reduces garbage collection pressure by reusing objects
 */

export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;

  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    initialSize: number = 10,
    maxSize: number = 100
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
    
    // Pre-populate pool with initial objects
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }

  /**
   * Get an object from the pool or create a new one if pool is empty
   */
  acquire(): T {
    if (this.pool.length > 0) {
      const obj = this.pool.pop()!;
      return obj;
    }
    return this.createFn();
  }

  /**
   * Return an object to the pool for reuse
   */
  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj);
      this.pool.push(obj);
    }
    // If pool is full, let the object be garbage collected
  }

  /**
   * Get current pool size for debugging
   */
  getPoolSize(): number {
    return this.pool.length;
  }

  /**
   * Clear the pool
   */
  clear(): void {
    this.pool.length = 0;
  }
}

// Singleton pools for common game objects
import { Point } from '../game/Point';
import { Food } from '../game/Food';

// Point pool for snake segments and dead points
export const pointPool = new ObjectPool<Point>(
  () => new Point(0, 0, 5, 'blue'),
  (point) => {
    point.x = 0;
    point.y = 0;
    point.radius = 5;
    point.color = 'blue';
  },
  20, // Initial size
  200 // Max size
);

// Food pool for game foods
export const foodPool = new ObjectPool<Food>(
  () => new Food(5, 800, 600),
  (food) => {
    food.x = 0;
    food.y = 0;
    food.radius = 5;
    food.color = 'red';
    food.id = '';
  },
  15, // Initial size
  150 // Max size
);

/**
 * Helper functions for creating pooled objects
 */
export const PooledObjects = {
  /**
   * Create a pooled Point object
   */
  createPoint(x: number, y: number, radius: number, color: string): Point {
    const point = pointPool.acquire();
    point.x = x;
    point.y = y;
    point.radius = radius;
    point.color = color;
    return point;
  },

  /**
   * Release a Point object back to the pool
   */
  releasePoint(point: Point): void {
    pointPool.release(point);
  },

  /**
   * Create a pooled Food object
   */
  createFood(radius: number, canvasWidth: number, canvasHeight: number): Food {
    const food = foodPool.acquire();
    food.radius = radius;
    food.regenerate(canvasWidth, canvasHeight);
    return food;
  },

  /**
   * Release a Food object back to the pool
   */
  releaseFood(food: Food): void {
    foodPool.release(food);
  },

  /**
   * Get pool statistics for debugging
   */
  getPoolStats(): { pointPool: number; foodPool: number } {
    return {
      pointPool: pointPool.getPoolSize(),
      foodPool: foodPool.getPoolSize()
    };
  }
};