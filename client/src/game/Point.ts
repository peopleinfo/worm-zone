// Removed unused import

import { CLEANUP_INTERVAL } from "../config/gameConfig";

export class Point {
  x: number;
  y: number;
  radius: number;
  color: string;
  type?: any; // Optional food type for snake segments
  createdAt?: number; // Timestamp for age tracking (dead points only)
  private static pool: Point[] = [];
  private static poolSize = 0;
  private static readonly MAX_POOL_SIZE = 300;
  private static readonly CLEANUP_PROTECTION_TIME = CLEANUP_INTERVAL; // 30 seconds to match server

  constructor(x: number = 0, y: number = 0, radius: number = 0, color: string = '', type?: any, createdAt?: number) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.type = type;
    this.createdAt = createdAt;
  }

  // Object pooling for better memory management
  static create(x: number, y: number, radius: number, color: string, type?: string, createdAt?: number): Point {
    let point: Point;
    
    if (Point.poolSize > 0) {
      point = Point.pool[--Point.poolSize];
      point.x = x;
      point.y = y;
      point.radius = radius;
      point.color = color;
      point.type = type;
      point.createdAt = createdAt;
    } else {
      point = new Point(x, y, radius, color, type, createdAt);
    }
    
    return point;
  }

  static release(point: Point): void {
    if (Point.poolSize < Point.MAX_POOL_SIZE) {
      Point.pool[Point.poolSize++] = point;
    }
  }

  // Optimized draw method with optional shadow support
  draw(ctx: CanvasRenderingContext2D, enableShadow: boolean = false, shadowColor: string = 'rgba(0, 0, 0, 0.3)', shadowBlur: number = 3, shadowOffsetX: number = 1, shadowOffsetY: number = 1): void {
    // Apply shadow if enabled and supported
    if (enableShadow) {
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = shadowBlur;
      ctx.shadowOffsetX = shadowOffsetX;
      ctx.shadowOffsetY = shadowOffsetY;
    }

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Reset shadow settings to prevent affecting other drawings
    if (enableShadow) {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
  }

  // Check if dead point is old enough to be consumed (matches server's 30-second protection)
  isOldEnoughToConsume(): boolean {
    if (!this.createdAt) return true; // If no timestamp, allow consumption (regular food)
    const age = Date.now() - this.createdAt;
    return age >= Point.CLEANUP_PROTECTION_TIME;
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