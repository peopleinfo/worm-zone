import { Snake } from './Snake';
import { Food } from './Food';
import { Point } from './Point';
import { useGameStore } from '../stores/gameStore';
import { socketClient } from '../services/socketClient';
import { MAP_ZOOM_LEVEL, WORLD_HEIGHT, WORLD_WIDTH } from '../config/gameConfig';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private mySnake: Snake | null = null;
  private lastSocketUpdate: number = 0;
  private lastFrameTime: number = 0;
  private aiSnakes: Snake[] = [];
  private foods: Food[] = [];
  private zoom: number = MAP_ZOOM_LEVEL;
  
  // Frame rate limiting
  private readonly FRAME_INTERVAL = 1000 / 20; // 50ms per frame
  private lastRenderTime: number = 0;
  
  // World coordinate system - consistent boundaries for collision and rendering
  private readonly WORLD_WIDTH: number = WORLD_WIDTH;
  private readonly WORLD_HEIGHT: number = WORLD_HEIGHT;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.setupCanvas();
    this.initializeGame();
  }

  private setupCanvas(): void {
    // Use rotated dimensions for landscape mode
    this.canvas.width = window.innerHeight;
    this.canvas.height = window.innerWidth;
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
    // Optimize canvas for better performance
    this.ctx.imageSmoothingEnabled = false;
  }

  // Handle canvas resize for orientation changes
  resize(): void {
    const oldWidth = this.canvas.width;
    const oldHeight = this.canvas.height;
    
    // Update canvas dimensions for rotated view
    this.canvas.width = window.innerHeight;
    this.canvas.height = window.innerWidth;
    
    // Restore canvas context properties
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
    
    // Calculate scale factors for repositioning game elements
    const scaleX = this.canvas.width / oldWidth;
    const scaleY = this.canvas.height / oldHeight;
    
    // Reposition player snake if it exists
    if (this.mySnake && this.mySnake.isAlive) {
      this.mySnake.points.forEach(point => {
        point.x *= scaleX;
        point.y *= scaleY;
      });
    }
    
    // Reposition AI snakes
    this.aiSnakes.forEach(snake => {
      if (snake.isAlive) {
        snake.points.forEach(point => {
          point.x *= scaleX;
          point.y *= scaleY;
        });
      }
    });
    
    // Reposition foods
    this.foods.forEach(food => {
      food.x *= scaleX;
      food.y *= scaleY;
      // Ensure foods stay within world bounds
      food.x = Math.max(food.radius, Math.min(this.WORLD_WIDTH - food.radius, food.x));
      food.y = Math.max(food.radius, Math.min(this.WORLD_HEIGHT - food.radius, food.y));
    });
    
    // Reposition dead points
    Snake.deadPoints.forEach(point => {
      point.x *= scaleX;
      point.y *= scaleY;
      // Ensure dead points stay within world bounds
      point.x = Math.max(point.radius, Math.min(this.WORLD_WIDTH - point.radius, point.x));
      point.y = Math.max(point.radius, Math.min(this.WORLD_HEIGHT - point.radius, point.y));
    });
    
    // Update store with resized elements
    const store = useGameStore.getState();
    if (this.mySnake) {
      store.updateMySnake(this.mySnake);
    }
    store.updateFoods(this.foods);
    store.updateOtherSnakes(this.aiSnakes);
  }

  private initializeGame(): void {
    const store = useGameStore.getState();
    
    // Check if snake already exists from server data
    if (store.mySnake) {
      console.log('🐍 Using existing snake from server data at position:', store.mySnake.getHead()?.x, store.mySnake.getHead()?.y);
      this.mySnake = store.mySnake;
    } else {
      // Fallback: Initialize player snake at world center (for offline mode or initial state)
      console.log('🐍 Creating fallback snake at world center');
      const centerX = this.WORLD_WIDTH / 2;
      const centerY = this.WORLD_HEIGHT / 2;
      this.mySnake = new Snake(centerX, centerY, 25, 'green', 'player');
      this.mySnake.ai = false;
      // Update store with the new snake
      store.updateMySnake(this.mySnake);
    }
  }

  start(): void {
    if (!this.animationId) {
      this.gameLoop();
    }
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private gameLoop = (): void => {
    const now = performance.now();
    const elapsed = now - this.lastRenderTime;
    
    // Only update and render if enough time has passed (20 FPS limiting)
    if (elapsed >= this.FRAME_INTERVAL) {
      this.update();
      this.render();
      this.lastRenderTime = now - (elapsed % this.FRAME_INTERVAL);
    }
    
    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private update(): void {
    const store = useGameStore.getState();
    
    // Sync with store's mySnake if it has been updated from socket events
    if (store.mySnake && this.mySnake !== store.mySnake) {
      console.log('🔄 Syncing GameEngine snake with store snake');
      this.mySnake = store.mySnake;
    }
    
    if (!store.isPlaying || !this.mySnake) return;

    // Calculate deltaTime for frame-rate independent movement
    const now = Date.now();
    const deltaTime = this.lastFrameTime ? now - this.lastFrameTime : 50; // Default to 20 FPS
    this.lastFrameTime = now;
    
    // Throttle socket updates to reduce network overhead
    const shouldSendUpdate = now - this.lastSocketUpdate > 50; // 20 FPS for network updates

    // Update player snake
    if (this.mySnake.isAlive) {
      this.mySnake.move(store.controls, deltaTime);
      this.mySnake.checkCollisionsWithBoundary(this.WORLD_WIDTH, this.WORLD_HEIGHT);

      // Food collisions - multiplayer only
      const foodsToCheck = store.foods;
      for (let i = 0; i < foodsToCheck.length; i++) {
        const food = foodsToCheck[i];
        const collision = this.mySnake.checkCollisionsWithFood(food);
        if (collision) {
          // The checkCollisionsWithFood method already calls eat() internally with the food's color
          console.log(`[GAME ENGINE] Snake ate food at (${food.x.toFixed(1)}, ${food.y.toFixed(1)})`);
          
          // Remove the food from local store immediately
          store.removeFood(food.id);
          
          // Notify server about food consumption
          try {
            console.log(`[GAME ENGINE] Sending food eaten event to server for food ID: ${food.id}`);
            socketClient.sendFoodEaten(food.id);
          } catch (error) {
            console.warn('Failed to send food eaten event:', error);
          }
          break; // Only consume one food per frame for better performance
        }
      }

      // Dead points collisions - multiplayer only
      const deadPointsToCheck = [...store.deadPoints]; // Create a copy to avoid mutation during iteration
      const consumedPoints: Point[] = [];
      
      for (let i = 0; i < deadPointsToCheck.length; i++) {
        const point = deadPointsToCheck[i];
        const collision = this.mySnake.checkCollisionsWithFood(point);
        if (collision) {
          consumedPoints.push(point);
        }
      }
      if (consumedPoints.length > 0) {
        store.removeDeadPoints(consumedPoints);
        // Notify server about consumed dead points
        try {
          socketClient.sendDeadPointEaten(consumedPoints);
        } catch (error) {
          console.warn('Failed to send dead point eaten event:', error);
        }
      }

      // Collision detection with other snakes
      const otherSnakes = store.otherSnakes;
      for (let i = 0; i < otherSnakes.length; i++) {
        const snake = otherSnakes[i];
        if (snake.isAlive) {
          const collision = this.mySnake.checkCollisionsWithOtherSnakes(snake);
          if (collision.collided) {
            // Award points to the snake that caused the collision
            if (collision.collidedWith && collision.points) {
              collision.collidedWith.eatSnake(collision.points);
            }
            break; // Stop checking once collision detected
          }
        }
      }

      // Send player movement to server (throttled with error handling)
      if (shouldSendUpdate) {
        try {
          socketClient.sendPlayerMove(this.mySnake);
          this.lastSocketUpdate = now;
        } catch (error) {
          console.warn('Failed to send player movement:', error);
        }
      }

      // Update store with current snake state
      store.updateMySnake(this.mySnake);
    } else {
      // Snake is dead - send death event to server
      try {
        socketClient.sendPlayerDied(Snake.deadPoints);
      } catch (error) {
        console.warn('Failed to send player death event:', error);
      }
      store.endGame(this.mySnake.finalScore || 0, this.mySnake.finalRank || 1);
    }

    // AI snakes are now handled by the server in multiplayer mode

    // Ranking is handled by the server in multiplayer mode
  }

  private render(): void {
    const store = useGameStore.getState();
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.save();
    this.ctx.scale(this.zoom, this.zoom);

    if (this.mySnake && this.mySnake.isAlive) {
      const head = this.mySnake.getHead();
      const zoomFactorX = this.canvas.width / 2 / this.zoom;
      const zoomFactorY = this.canvas.height / 2 / this.zoom;
      
      this.ctx.translate(
        zoomFactorX - head.x,
        zoomFactorY - head.y
      );
    }

    this.drawBoundary();

    // Render foods
    for (let i = 0; i < store.foods.length; i++) {
      const food = store.foods[i];
      food.draw(this.ctx);
    }

    // Render dead points
    for (let i = 0; i < store.deadPoints.length; i++) {
      const point = store.deadPoints[i];
      point.draw(this.ctx);
    }

    // Draw player snake
    if (this.mySnake && this.mySnake.isAlive) {
      this.mySnake.draw(this.ctx);
    }

    // Draw other snakes
    for (let i = 0; i < store.otherSnakes.length; i++) {
      const snake = store.otherSnakes[i];
      if (snake.isAlive) {
        snake.draw(this.ctx);
      }
    }

    this.ctx.restore();
  }

  private drawBoundary(lineWidth: number = 10): void {
    this.ctx.beginPath();
    this.ctx.strokeStyle = 'red';
    this.ctx.lineWidth = lineWidth;
    // Use world coordinates for boundary instead of canvas dimensions
    this.ctx.rect(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT);
    this.ctx.stroke();
  }

  // AI snakes and mode switching removed - now handled by server

  resetGame(): void {
    console.log('[GAME ENGINE] Resetting game');
    
    // Reset timing
    this.lastSocketUpdate = 0;
    this.lastFrameTime = 0;
    this.lastRenderTime = 0;
    
    // Reinitialize game
    this.initializeGame();
  }

  // Cleanup method for proper resource management
  cleanup(): void {
    // Stop animation loop
    this.stop();
    
    // Clear game objects
    this.mySnake = null;
    
    // Reset timing variables
    this.lastSocketUpdate = 0;
    this.lastFrameTime = 0;
    
    // Disconnect socket if connected
    if (socketClient.isSocketConnected()) {
      socketClient.disconnect();
    }
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}