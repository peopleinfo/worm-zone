/**
 * Consolidated collision detection utilities
 * Eliminates duplicate collision logic across client and server
 */

export interface CollisionObject {
  x: number;
  y: number;
  radius: number;
}

export interface BoundaryConfig {
  width: number;
  height: number;
  buffer?: number;
}

export interface CollisionResult {
  collided: boolean;
  distance?: number;
  penetration?: number;
}

export interface SnakeCollisionResult extends CollisionResult {
  collidedWith?: any;
  points?: number;
}

/**
 * Basic circle-to-circle collision detection
 * Used by both client and server
 */
export function isCollided(obj1: CollisionObject, obj2: CollisionObject): boolean {
  const distance = Math.hypot(obj1.x - obj2.x, obj1.y - obj2.y);
  return distance < obj1.radius + obj2.radius;
}

/**
 * Enhanced collision detection with tolerance and detailed result
 */
export function checkCollisionDetailed(
  obj1: CollisionObject, 
  obj2: CollisionObject, 
  tolerance: number = 0
): CollisionResult {
  const distance = Math.hypot(obj1.x - obj2.x, obj1.y - obj2.y);
  const requiredDistance = obj1.radius + obj2.radius + tolerance;
  const collided = distance <= requiredDistance;
  
  return {
    collided,
    distance,
    penetration: collided ? requiredDistance - distance : 0
  };
}

/**
 * Check collision with world boundaries
 */
export function checkBoundaryCollision(
  obj: CollisionObject, 
  boundary: BoundaryConfig
): CollisionResult {
  const buffer = boundary.buffer || 0;
  const minX = obj.radius + buffer;
  const maxX = boundary.width - obj.radius - buffer;
  const minY = obj.radius + buffer;
  const maxY = boundary.height - obj.radius - buffer;
  
  const collided = obj.x < minX || obj.x > maxX || obj.y < minY || obj.y > maxY;
  
  let distance = 0;
  if (collided) {
    // Calculate distance to nearest boundary
    const distToLeft = obj.x - minX;
    const distToRight = maxX - obj.x;
    const distToTop = obj.y - minY;
    const distToBottom = maxY - obj.y;
    
    distance = Math.min(
      Math.abs(distToLeft),
      Math.abs(distToRight),
      Math.abs(distToTop),
      Math.abs(distToBottom)
    );
  }
  
  return { collided, distance };
}

/**
 * Clamp object position to world boundaries
 */
export function clampToBoundary(
  obj: CollisionObject, 
  boundary: BoundaryConfig
): { x: number; y: number } {
  const buffer = boundary.buffer || 0;
  const minX = obj.radius + buffer;
  const maxX = boundary.width - obj.radius - buffer;
  const minY = obj.radius + buffer;
  const maxY = boundary.height - obj.radius - buffer;
  
  return {
    x: Math.max(minX, Math.min(maxX, obj.x)),
    y: Math.max(minY, Math.min(maxY, obj.y))
  };
}

/**
 * Check if object is approaching boundary (for AI avoidance)
 */
export function isApproachingBoundary(
  obj: CollisionObject & { angle: number; speed: number },
  boundary: BoundaryConfig,
  lookAheadDistance: number = 50
): { approaching: boolean; direction: 'left' | 'right' | 'top' | 'bottom' | null } {
  const nextX = obj.x + Math.cos(obj.angle) * lookAheadDistance;
  const nextY = obj.y + Math.sin(obj.angle) * lookAheadDistance;
  
  const buffer = boundary.buffer || obj.radius * 3;
  
  if (nextX < buffer) return { approaching: true, direction: 'left' };
  if (nextX > boundary.width - buffer) return { approaching: true, direction: 'right' };
  if (nextY < buffer) return { approaching: true, direction: 'top' };
  if (nextY > boundary.height - buffer) return { approaching: true, direction: 'bottom' };
  
  return { approaching: false, direction: null };
}

/**
 * Calculate safe direction away from boundaries
 */
export function calculateSafeBoundaryDirection(
  obj: CollisionObject,
  boundary: BoundaryConfig,
  currentAngle: number
): number {
  const centerX = boundary.width / 2;
  const centerY = boundary.height / 2;
  
  // Calculate angle towards center
  const angleToCenter = Math.atan2(centerY - obj.y, centerX - obj.x);
  
  // Add some randomness to avoid predictable movement
  const randomOffset = (Math.random() - 0.5) * Math.PI * 0.3;
  
  return angleToCenter + randomOffset;
}

/**
 * Batch collision detection for multiple objects
 */
export function checkMultipleCollisions<T extends CollisionObject>(
  source: CollisionObject,
  targets: T[],
  tolerance: number = 0
): { target: T; result: CollisionResult }[] {
  const collisions: { target: T; result: CollisionResult }[] = [];
  
  for (const target of targets) {
    const result = checkCollisionDetailed(source, target, tolerance);
    if (result.collided) {
      collisions.push({ target, result });
    }
  }
  
  return collisions;
}

/**
 * Find nearest collision from multiple potential collisions
 */
export function findNearestCollision<T extends CollisionObject>(
  source: CollisionObject,
  targets: T[],
  tolerance: number = 0
): { target: T; result: CollisionResult } | null {
  let nearest: { target: T; result: CollisionResult } | null = null;
  let minDistance = Infinity;
  
  for (const target of targets) {
    const result = checkCollisionDetailed(source, target, tolerance);
    if (result.collided && result.distance! < minDistance) {
      minDistance = result.distance!;
      nearest = { target, result };
    }
  }
  
  return nearest;
}

/**
 * Snake-specific collision utilities
 */
export class SnakeCollisionUtils {
  /**
   * Check collision between snake head and food
   */
  static checkFoodCollision(
    head: CollisionObject,
    food: CollisionObject,
    tolerance: number = 2
  ): CollisionResult {
    return checkCollisionDetailed(head, food, tolerance);
  }
  
  /**
   * Check collision between snake head and another snake's body
   */
  static checkSnakeBodyCollision(
    head: CollisionObject,
    bodyPoints: CollisionObject[]
  ): { collided: boolean; collidedPoint?: CollisionObject; index?: number } {
    for (let i = 0; i < bodyPoints.length; i++) {
      const point = bodyPoints[i];
      if (isCollided(head, point)) {
        return {
          collided: true,
          collidedPoint: point,
          index: i
        };
      }
    }
    return { collided: false };
  }
  
  /**
   * Check collision with dead points (optimized for large arrays)
   */
  static checkDeadPointsCollision(
    head: CollisionObject,
    deadPoints: CollisionObject[],
    maxChecks: number = 50
  ): CollisionObject[] {
    const collisions: CollisionObject[] = [];
    const checksToPerform = Math.min(deadPoints.length, maxChecks);
    
    for (let i = 0; i < checksToPerform; i++) {
      const point = deadPoints[i];
      if (isCollided(head, point)) {
        collisions.push(point);
      }
    }
    
    return collisions;
  }
}

/**
 * Position validation utilities
 */
export class PositionUtils {
  /**
   * Check if position is safe (no collisions with other objects)
   */
  static isSafePosition(
    position: CollisionObject,
    obstacles: CollisionObject[],
    boundary: BoundaryConfig,
    minDistance: number = 50
  ): boolean {
    // Check boundary collision
    const boundaryCheck = checkBoundaryCollision(position, boundary);
    if (boundaryCheck.collided) return false;
    
    // Check distance to obstacles
    for (const obstacle of obstacles) {
      const distance = Math.hypot(position.x - obstacle.x, position.y - obstacle.y);
      if (distance < minDistance) return false;
    }
    
    return true;
  }
  
  /**
   * Generate safe spawn position
   */
  static generateSafeSpawnPosition(
    boundary: BoundaryConfig,
    obstacles: CollisionObject[],
    radius: number,
    maxAttempts: number = 100
  ): { x: number; y: number } | null {
    const buffer = radius * 2;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = buffer + Math.random() * (boundary.width - buffer * 2);
      const y = buffer + Math.random() * (boundary.height - buffer * 2);
      
      const testPosition = { x, y, radius };
      
      if (this.isSafePosition(testPosition, obstacles, boundary, radius * 3)) {
        return { x, y };
      }
    }
    
    return null; // Failed to find safe position
  }
}

/**
 * Performance-optimized collision detection for large datasets
 */
export class OptimizedCollisionDetection {
  private static spatialGrid: Map<string, CollisionObject[]> = new Map();
  private static gridSize = 100;
  
  /**
   * Build spatial grid for faster collision detection
   */
  static buildSpatialGrid(objects: CollisionObject[], gridSize: number = 100): void {
    this.gridSize = gridSize;
    this.spatialGrid.clear();
    
    for (const obj of objects) {
      const gridX = Math.floor(obj.x / gridSize);
      const gridY = Math.floor(obj.y / gridSize);
      const key = `${gridX},${gridY}`;
      
      if (!this.spatialGrid.has(key)) {
        this.spatialGrid.set(key, []);
      }
      this.spatialGrid.get(key)!.push(obj);
    }
  }
  
  /**
   * Get nearby objects using spatial grid
   */
  static getNearbyObjects(position: CollisionObject): CollisionObject[] {
    const nearby: CollisionObject[] = [];
    const gridX = Math.floor(position.x / this.gridSize);
    const gridY = Math.floor(position.y / this.gridSize);
    
    // Check surrounding grid cells
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${gridX + dx},${gridY + dy}`;
        const objects = this.spatialGrid.get(key);
        if (objects) {
          nearby.push(...objects);
        }
      }
    }
    
    return nearby;
  }
  
  /**
   * Fast collision detection using spatial grid
   */
  static checkCollisionsOptimized(
    source: CollisionObject,
    tolerance: number = 0
  ): CollisionObject[] {
    const nearby = this.getNearbyObjects(source);
    const collisions: CollisionObject[] = [];
    
    for (const obj of nearby) {
      if (obj !== source) {
        const result = checkCollisionDetailed(source, obj, tolerance);
        if (result.collided) {
          collisions.push(obj);
        }
      }
    }
    
    return collisions;
  }
}

// Export commonly used functions for backward compatibility
export { isCollided as checkCollision };
export const CollisionDetection = {
  isCollided,
  checkCollisionDetailed,
  checkBoundaryCollision,
  clampToBoundary,
  isApproachingBoundary,
  calculateSafeBoundaryDirection,
  checkMultipleCollisions,
  findNearestCollision
};