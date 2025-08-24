import { Point } from '../game/Point';
import { Snake } from '../game/Snake';
import { Food } from '../game/Food';

// Spatial partitioning system for optimized collision detection
export class SpatialGrid {
  private cellSize: number;
  private worldWidth: number;
  private worldHeight: number;
  private cols: number;
  private rows: number;
  private grid: { [key: string]: { foods: Food[], deadPoints: Point[], snakes: Snake[] } };

  constructor(worldWidth: number, worldHeight: number, cellSize: number = 100) {
    this.cellSize = cellSize;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.cols = Math.ceil(worldWidth / cellSize);
    this.rows = Math.ceil(worldHeight / cellSize);
    this.grid = {};
  }

  // Get cell key from coordinates
  private getCellKey(x: number, y: number): string {
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
    return `${col},${row}`;
  }

  // Get all cell keys that an object with radius occupies
  private getObjectCells(x: number, y: number, radius: number): string[] {
    const cells: string[] = [];
    const minX = Math.max(0, x - radius);
    const maxX = Math.min(this.worldWidth, x + radius);
    const minY = Math.max(0, y - radius);
    const maxY = Math.min(this.worldHeight, y + radius);

    const minCol = Math.floor(minX / this.cellSize);
    const maxCol = Math.floor(maxX / this.cellSize);
    const minRow = Math.floor(minY / this.cellSize);
    const maxRow = Math.floor(maxY / this.cellSize);

    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
          cells.push(`${col},${row}`);
        }
      }
    }
    return cells;
  }

  // Add food to spatial grid
  addFood(food: Food): void {
    const cellKey = this.getCellKey(food.x, food.y);
    if (!this.grid[cellKey]) {
      this.grid[cellKey] = { foods: [], deadPoints: [], snakes: [] };
    }
    this.grid[cellKey].foods.push(food);
  }

  // Add dead point to spatial grid
  addDeadPoint(point: Point): void {
    const cellKey = this.getCellKey(point.x, point.y);
    if (!this.grid[cellKey]) {
      this.grid[cellKey] = { foods: [], deadPoints: [], snakes: [] };
    }
    this.grid[cellKey].deadPoints.push(point);
  }

  // Add snake to spatial grid
  addSnake(snake: Snake): void {
    // Get the first point as head since Snake might not have getHead method
    const head = snake.points && snake.points.length > 0 ? snake.points[0] : null;
    if (head) {
      const cellKey = this.getCellKey(head.x, head.y);
      if (!this.grid[cellKey]) {
        this.grid[cellKey] = { foods: [], deadPoints: [], snakes: [] };
      }
      this.grid[cellKey].snakes.push(snake);
      
      // Also add snake segments to nearby cells for better collision detection
      snake.points.forEach((point, index) => {
        if (index > 0) { // Skip head as it's already added
          const segmentCellKey = this.getCellKey(point.x, point.y);
          if (!this.grid[segmentCellKey]) {
            this.grid[segmentCellKey] = { foods: [], deadPoints: [], snakes: [] };
          }
          
          // Only add if not already in this cell
          if (!this.grid[segmentCellKey].snakes.includes(snake)) {
            this.grid[segmentCellKey].snakes.push(snake);
          }
        }
      });
    }
  }

  // Get nearby foods for collision detection
  getNearbyFoods(x: number, y: number, radius: number): Food[] {
    const cells = this.getObjectCells(x, y, radius);
    const nearbyFoods: Food[] = [];
    const seenFoods = new Set<Food>();

    for (const cellKey of cells) {
      const cell = this.grid[cellKey];
      if (cell) {
        for (const food of cell.foods) {
          if (!seenFoods.has(food)) {
            nearbyFoods.push(food);
            seenFoods.add(food);
          }
        }
      }
    }

    return nearbyFoods;
  }

  // Get nearby dead points for collision detection
  getNearbyDeadPoints(x: number, y: number, radius: number): Point[] {
    const cells = this.getObjectCells(x, y, radius);
    const nearbyPoints: Point[] = [];
    const seenPoints = new Set<Point>();

    for (const cellKey of cells) {
      const cell = this.grid[cellKey];
      if (cell) {
        for (const point of cell.deadPoints) {
          if (!seenPoints.has(point)) {
            nearbyPoints.push(point);
            seenPoints.add(point);
          }
        }
      }
    }

    return nearbyPoints;
  }

  // Get nearby snakes for collision detection
  getNearbySnakes(x: number, y: number, radius: number): Snake[] {
    const cells = this.getObjectCells(x, y, radius);
    const nearbySnakes: Snake[] = [];
    const seenSnakes = new Set<Snake>();

    for (const cellKey of cells) {
      const cell = this.grid[cellKey];
      if (cell) {
        for (const snake of cell.snakes) {
          if (!seenSnakes.has(snake)) {
            nearbySnakes.push(snake);
            seenSnakes.add(snake);
          }
        }
      }
    }

    return nearbySnakes;
  }

  // Clear all objects from grid
  clear(): void {
    this.grid = {};
  }

  // Get grid statistics for debugging
  getStats(): { totalCells: number; occupiedCells: number; totalObjects: number } {
    const occupiedCells = Object.keys(this.grid).length;
    let totalObjects = 0;
    
    for (const cell of Object.values(this.grid)) {
      totalObjects += cell.foods.length + cell.deadPoints.length + cell.snakes.length;
    }
    
    return {
      totalCells: this.cols * this.rows,
      occupiedCells,
      totalObjects
    };
  }
}

// Optimized collision detection using spatial partitioning
export class CollisionDetector {
  private spatialGrid: SpatialGrid;
  private cellSize: number;

  constructor(worldWidth: number, worldHeight: number, cellSize: number = 100) {
    this.cellSize = cellSize;
    this.spatialGrid = new SpatialGrid(worldWidth, worldHeight, cellSize);
  }

  clear(): void {
    this.spatialGrid.clear();
  }

  addFood(food: Food): void {
    this.spatialGrid.addFood(food);
  }

  addDeadPoint(point: Point): void {
    this.spatialGrid.addDeadPoint(point);
  }

  addSnake(snake: Snake): void {
    this.spatialGrid.addSnake(snake);
  }

  getNearbyFoods(x: number, y: number, radius: number): Food[] {
    return this.spatialGrid.getNearbyFoods(x, y, radius);
  }

  getNearbyDeadPoints(x: number, y: number, radius: number): Point[] {
    return this.spatialGrid.getNearbyDeadPoints(x, y, radius);
  }

  getNearbySnakes(x: number, y: number, radius: number): Snake[] {
    return this.spatialGrid.getNearbySnakes(x, y, radius);
  }

  // Reset and reinitialize the spatial grid (useful for dynamic world changes)
  reset(worldWidth: number, worldHeight: number): void {
    this.spatialGrid = new SpatialGrid(worldWidth, worldHeight, this.cellSize);
  }

  // Resize grid if world dimensions change
  resize(worldWidth: number, worldHeight: number): void {
    this.spatialGrid = new SpatialGrid(worldWidth, worldHeight, this.cellSize);
  }

  // Get grid statistics for debugging
  getStats(): { totalCells: number; occupiedCells: number; totalObjects: number } {
    return this.spatialGrid.getStats();
  }
}