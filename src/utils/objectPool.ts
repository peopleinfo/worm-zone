/**
 * Object Pool utility for efficient memory management
 * Reduces garbage collection overhead by reusing objects
 */

export interface PoolableObject {
  reset?(): void;
  isActive?: boolean;
}

export interface SnakePoint {
  x: number;
  y: number;
  radius: number;
  color: string;
  isActive?: boolean;
}

export interface Food {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  isActive?: boolean;
}

export interface DeadPoint {
  x: number;
  y: number;
  radius: number;
  color: string;
  isActive?: boolean;
}

/**
 * Generic object pool class
 */
export class ObjectPool<T extends PoolableObject> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn?: (obj: T) => void;
  private maxSize: number;
  private activeCount = 0;
  
  constructor(
    createFn: () => T,
    resetFn?: (obj: T) => void,
    initialSize: number = 50,
    maxSize: number = 1000
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
    
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }
  
  /**
   * Get an object from the pool
   */
  acquire(): T {
    let obj: T;
    
    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else {
      obj = this.createFn();
    }
    
    if (this.resetFn) {
      this.resetFn(obj);
    } else if (obj.reset) {
      obj.reset();
    }
    
    obj.isActive = true;
    this.activeCount++;
    return obj;
  }
  
  /**
   * Return an object to the pool
   */
  release(obj: T): void {
    if (!obj.isActive) return; // Already released
    
    obj.isActive = false;
    this.activeCount--;
    
    // Only keep objects in pool if we haven't exceeded max size
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }
  }
  
  /**
   * Release multiple objects at once
   */
  releaseAll(objects: T[]): void {
    objects.forEach(obj => this.release(obj));
  }
  
  /**
   * Get pool statistics
   */
  getStats(): { poolSize: number; activeCount: number; totalCreated: number } {
    return {
      poolSize: this.pool.length,
      activeCount: this.activeCount,
      totalCreated: this.activeCount + this.pool.length
    };
  }
  
  /**
   * Clear the pool
   */
  clear(): void {
    this.pool.length = 0;
    this.activeCount = 0;
  }
}

/**
 * Snake Point Pool
 */
class SnakePointPool extends ObjectPool<SnakePoint> {
  constructor() {
    super(
      () => ({ x: 0, y: 0, radius: 4, color: '#ffffff', isActive: false }),
      (point) => {
        point.x = 0;
        point.y = 0;
        point.radius = 4;
        point.color = '#ffffff';
      },
      100, // Initial size
      2000 // Max size
    );
  }
  
  createPoint(x: number, y: number, radius: number, color: string): SnakePoint {
    const point = this.acquire();
    point.x = x;
    point.y = y;
    point.radius = radius;
    point.color = color;
    return point;
  }
}

/**
 * Food Pool
 */
class FoodPool extends ObjectPool<Food> {
  constructor() {
    super(
      () => ({ id: '', x: 0, y: 0, radius: 3, color: '#ffffff', isActive: false }),
      (food) => {
        food.id = '';
        food.x = 0;
        food.y = 0;
        food.radius = 3;
        food.color = '#ffffff';
      },
      200, // Initial size
      1000 // Max size
    );
  }
  
  createFood(id: string, x: number, y: number, radius: number, color: string): Food {
    const food = this.acquire();
    food.id = id;
    food.x = x;
    food.y = y;
    food.radius = radius;
    food.color = color;
    return food;
  }
}

/**
 * Dead Point Pool
 */
class DeadPointPool extends ObjectPool<DeadPoint> {
  constructor() {
    super(
      () => ({ x: 0, y: 0, radius: 4, color: '#ffffff', isActive: false }),
      (point) => {
        point.x = 0;
        point.y = 0;
        point.radius = 4;
        point.color = '#ffffff';
      },
      500, // Initial size
      5000 // Max size
    );
  }
  
  createDeadPoint(x: number, y: number, radius: number, color: string): DeadPoint {
    const point = this.acquire();
    point.x = x;
    point.y = y;
    point.radius = radius;
    point.color = color;
    return point;
  }
}

/**
 * Pool Manager - manages all object pools
 */
export class PoolManager {
  private snakePointPool: SnakePointPool;
  private foodPool: FoodPool;
  private deadPointPool: DeadPointPool;
  
  constructor() {
    this.snakePointPool = new SnakePointPool();
    this.foodPool = new FoodPool();
    this.deadPointPool = new DeadPointPool();
  }
  
  // Snake Point methods
  createSnakePoint(x: number, y: number, radius: number, color: string): SnakePoint {
    return this.snakePointPool.createPoint(x, y, radius, color);
  }
  
  releaseSnakePoint(point: SnakePoint): void {
    this.snakePointPool.release(point);
  }
  
  releaseSnakePoints(points: SnakePoint[]): void {
    this.snakePointPool.releaseAll(points);
  }
  
  // Food methods
  createFood(id: string, x: number, y: number, radius: number, color: string): Food {
    return this.foodPool.createFood(id, x, y, radius, color);
  }
  
  releaseFood(food: Food): void {
    this.foodPool.release(food);
  }
  
  releaseFoods(foods: Food[]): void {
    this.foodPool.releaseAll(foods);
  }
  
  // Dead Point methods
  createDeadPoint(x: number, y: number, radius: number, color: string): DeadPoint {
    return this.deadPointPool.createDeadPoint(x, y, radius, color);
  }
  
  releaseDeadPoint(point: DeadPoint): void {
    this.deadPointPool.release(point);
  }
  
  releaseDeadPoints(points: DeadPoint[]): void {
    this.deadPointPool.releaseAll(points);
  }
  
  /**
   * Get statistics for all pools
   */
  getAllStats(): {
    snakePoints: { poolSize: number; activeCount: number; totalCreated: number };
    foods: { poolSize: number; activeCount: number; totalCreated: number };
    deadPoints: { poolSize: number; activeCount: number; totalCreated: number };
  } {
    return {
      snakePoints: this.snakePointPool.getStats(),
      foods: this.foodPool.getStats(),
      deadPoints: this.deadPointPool.getStats()
    };
  }
  
  /**
   * Clear all pools
   */
  clearAll(): void {
    this.snakePointPool.clear();
    this.foodPool.clear();
    this.deadPointPool.clear();
  }
  
  /**
   * Log pool statistics
   */
  logStats(): void {
    const stats = this.getAllStats();
    console.log('🏊 Object Pool Statistics:', {
      'Snake Points': `${stats.snakePoints.activeCount} active, ${stats.snakePoints.poolSize} pooled`,
      'Foods': `${stats.foods.activeCount} active, ${stats.foods.poolSize} pooled`,
      'Dead Points': `${stats.deadPoints.activeCount} active, ${stats.deadPoints.poolSize} pooled`
    });
  }
}

// Global pool manager instance
export const poolManager = new PoolManager();

/**
 * Utility functions for easy pool usage
 */
export const createSnakePoint = (x: number, y: number, radius: number, color: string): SnakePoint => 
  poolManager.createSnakePoint(x, y, radius, color);

export const releaseSnakePoint = (point: SnakePoint): void => 
  poolManager.releaseSnakePoint(point);

export const createFood = (id: string, x: number, y: number, radius: number, color: string): Food => 
  poolManager.createFood(id, x, y, radius, color);

export const releaseFood = (food: Food): void => 
  poolManager.releaseFood(food);

export const createDeadPoint = (x: number, y: number, radius: number, color: string): DeadPoint => 
  poolManager.createDeadPoint(x, y, radius, color);

export const releaseDeadPoint = (point: DeadPoint): void => 
  poolManager.releaseDeadPoint(point);