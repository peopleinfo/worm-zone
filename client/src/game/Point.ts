// Enhanced object pooling for performance
const pointPool: Point[] = [];
const foodPool: any[] = []; // Will store Food instances
const segmentPool: Point[] = []; // For snake segments
const MAX_POOL_SIZE = 500;
const MAX_FOOD_POOL_SIZE = 100;
const MAX_SEGMENT_POOL_SIZE = 1000;

export class Point {
  x: number;
  y: number;
  radius: number;
  color: string;

  constructor(x: number = 0, y: number = 0, radius: number = 0, color: string = '') {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
  }

  // Object pooling for better memory management
  static create(x: number, y: number, radius: number, color: string): Point {
    return getPooledPoint(x, y, radius, color);
  }

  static release(point: Point): void {
    releasePoint(point);
  }

  // Optimized draw method without shadows for better mobile performance
  draw(ctx: CanvasRenderingContext2D): void {
    // Simplified rendering - no shadows to prevent device overheating
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Check if point is within viewport (for culling)
  isInViewport(viewX: number, viewY: number, viewWidth: number, viewHeight: number): boolean {
    const margin = this.radius * 2; // Add some margin for smooth transitions
    return (
      this.x + margin >= viewX &&
      this.x - margin <= viewX + viewWidth &&
      this.y + margin >= viewY &&
      this.y - margin <= viewY + viewHeight
    );
  }
}

// Point pooling
export function getPooledPoint(x: number, y: number, radius: number, color: string): Point {
  if (pointPool.length > 0) {
    const point = pointPool.pop()!;
    point.x = x;
    point.y = y;
    point.radius = radius;
    point.color = color;
    return point;
  }
  return new Point(x, y, radius, color);
}

export function releasePoint(point: Point): void {
  if (pointPool.length < MAX_POOL_SIZE) {
    pointPool.push(point);
  }
}

// Food pooling
export async function getPooledFood(id: string, x: number, y: number, radius: number, color: string): Promise<any> {
  if (foodPool.length > 0) {
    const food = foodPool.pop()!;
    food.id = id;
    food.x = x;
    food.y = y;
    food.radius = radius;
    food.color = color;
    return food;
  }
  // Import Food class dynamically to avoid circular dependencies
  const Food = (await import('./Food')).Food;
  return new Food(id, x, y, radius, color);
}

export function releaseFood(food: any): void {
  if (foodPool.length < MAX_FOOD_POOL_SIZE) {
    // Reset food properties to default state
    food.id = '';
    food.x = 0;
    food.y = 0;
    food.radius = 5;
    food.color = '#ffffff';
    foodPool.push(food);
  }
}

// Snake segment pooling
export function getPooledSegment(x: number, y: number, radius: number, color: string): Point {
  if (segmentPool.length > 0) {
    const segment = segmentPool.pop()!;
    segment.x = x;
    segment.y = y;
    segment.radius = radius;
    segment.color = color;
    return segment;
  }
  return new Point(x, y, radius, color);
}

export function releaseSegment(segment: Point): void {
  if (segmentPool.length < MAX_SEGMENT_POOL_SIZE) {
    segmentPool.push(segment);
  }
}

// Pool management and cleanup
export function getPoolStats(): { points: number; foods: number; segments: number } {
  return {
    points: pointPool.length,
    foods: foodPool.length,
    segments: segmentPool.length
  };
}

export function clearPools(): void {
  pointPool.length = 0;
  foodPool.length = 0;
  segmentPool.length = 0;
}

// Periodic pool optimization
export function optimizePools(): void {
  // Trim pools if they're too large
  if (pointPool.length > MAX_POOL_SIZE * 0.8) {
    pointPool.splice(MAX_POOL_SIZE * 0.6, pointPool.length - MAX_POOL_SIZE * 0.6);
  }
  if (foodPool.length > MAX_FOOD_POOL_SIZE * 0.8) {
    foodPool.splice(MAX_FOOD_POOL_SIZE * 0.6, foodPool.length - MAX_FOOD_POOL_SIZE * 0.6);
  }
  if (segmentPool.length > MAX_SEGMENT_POOL_SIZE * 0.8) {
    segmentPool.splice(MAX_SEGMENT_POOL_SIZE * 0.6, segmentPool.length - MAX_SEGMENT_POOL_SIZE * 0.6);
  }
}

// Cleanup segment pools specifically
export function cleanupSegmentPools(): void {
  // More aggressive cleanup for segment pools during high memory usage
  if (segmentPool.length > MAX_SEGMENT_POOL_SIZE * 0.5) {
    const targetSize = Math.floor(MAX_SEGMENT_POOL_SIZE * 0.3);
    segmentPool.splice(targetSize, segmentPool.length - targetSize);
  }
}

// Get segment pool size for monitoring
export function getSegmentPoolSize(): number {
  return segmentPool.length;
}

// Expose functions globally for GameEngine integration
if (typeof window !== 'undefined') {
  (window as any).releaseSegment = releaseSegment;
  (window as any).cleanupSegmentPools = cleanupSegmentPools;
  (window as any).getSegmentPoolSize = getSegmentPoolSize;
}