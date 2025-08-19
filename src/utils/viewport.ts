/**
 * Viewport utility for virtual rendering optimization
 * Only renders objects that are visible in the current viewport
 */

export interface ViewportBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
  radius?: number;
}

export interface GameObject extends Point {
  id?: string;
  color?: string;
}

/**
 * Calculate viewport bounds based on camera position and canvas size
 */
export function calculateViewportBounds(
  cameraX: number,
  cameraY: number,
  canvasWidth: number,
  canvasHeight: number,
  zoom: number = 1
): ViewportBounds {
  const halfWidth = (canvasWidth / zoom) / 2;
  const halfHeight = (canvasHeight / zoom) / 2;
  
  return {
    left: cameraX - halfWidth,
    right: cameraX + halfWidth,
    top: cameraY - halfHeight,
    bottom: cameraY + halfHeight,
    width: canvasWidth / zoom,
    height: canvasHeight / zoom
  };
}

/**
 * Check if a point is within the viewport bounds with optional buffer
 */
export function isPointInViewport(
  point: Point,
  viewport: ViewportBounds,
  buffer: number = 50
): boolean {
  const radius = point.radius || 0;
  const effectiveBuffer = buffer + radius;
  
  return (
    point.x + effectiveBuffer >= viewport.left &&
    point.x - effectiveBuffer <= viewport.right &&
    point.y + effectiveBuffer >= viewport.top &&
    point.y - effectiveBuffer <= viewport.bottom
  );
}

/**
 * Filter array of game objects to only include those in viewport
 */
export function filterObjectsInViewport<T extends GameObject>(
  objects: T[],
  viewport: ViewportBounds,
  buffer: number = 50
): T[] {
  return objects.filter(obj => isPointInViewport(obj, viewport, buffer));
}

/**
 * Filter snake points to only include those in viewport
 * Optimized for large snake arrays
 */
export function filterSnakePointsInViewport(
  points: Point[],
  viewport: ViewportBounds,
  buffer: number = 50
): Point[] {
  if (points.length === 0) return [];
  
  // For performance, we can skip points that are far from viewport
  // This is especially important for very long snakes
  const visiblePoints: Point[] = [];
  
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    
    if (isPointInViewport(point, viewport, buffer)) {
      visiblePoints.push(point);
    }
    
    // Optimization: if we haven't seen a visible point in a while,
    // we can skip ahead more aggressively
    if (visiblePoints.length === 0 && i > 100) {
      i += Math.floor(points.length / 50); // Skip ahead
    }
  }
  
  return visiblePoints;
}

/**
 * Calculate optimal render distance based on zoom level and performance
 */
export function calculateOptimalRenderDistance(
  zoom: number,
  performanceLevel: 'high' | 'medium' | 'low' = 'medium'
): number {
  const baseDistance = {
    high: 200,
    medium: 150,
    low: 100
  }[performanceLevel];
  
  // Adjust render distance based on zoom
  // Higher zoom = closer view = can render more detail
  // Lower zoom = farther view = should render less detail
  return baseDistance * Math.max(0.5, Math.min(2, zoom));
}

/**
 * Spatial partitioning for efficient collision detection
 */
export class SpatialGrid {
  private cellSize: number;
  private grid: Map<string, GameObject[]>;
  private worldWidth: number;
  private worldHeight: number;
  
  constructor(cellSize: number = 100, worldWidth: number = 2000, worldHeight: number = 2000) {
    this.cellSize = cellSize;
    this.grid = new Map();
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
  }
  
  private getCellKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }
  
  clear(): void {
    this.grid.clear();
  }
  
  addObject(obj: GameObject): void {
    const key = this.getCellKey(obj.x, obj.y);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key)!.push(obj);
  }
  
  getObjectsInRadius(x: number, y: number, radius: number): GameObject[] {
    const objects: GameObject[] = [];
    const cellRadius = Math.ceil(radius / this.cellSize);
    const centerCellX = Math.floor(x / this.cellSize);
    const centerCellY = Math.floor(y / this.cellSize);
    
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const key = `${centerCellX + dx},${centerCellY + dy}`;
        const cellObjects = this.grid.get(key);
        if (cellObjects) {
          objects.push(...cellObjects);
        }
      }
    }
    
    return objects;
  }
  
  getObjectsInViewport(viewport: ViewportBounds): GameObject[] {
    const objects: GameObject[] = [];
    const startCellX = Math.floor(viewport.left / this.cellSize);
    const endCellX = Math.floor(viewport.right / this.cellSize);
    const startCellY = Math.floor(viewport.top / this.cellSize);
    const endCellY = Math.floor(viewport.bottom / this.cellSize);
    
    for (let x = startCellX; x <= endCellX; x++) {
      for (let y = startCellY; y <= endCellY; y++) {
        const key = `${x},${y}`;
        const cellObjects = this.grid.get(key);
        if (cellObjects) {
          objects.push(...cellObjects);
        }
      }
    }
    
    return objects;
  }
}