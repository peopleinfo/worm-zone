import { Snake } from './Snake';
import { Food } from './Food';
import { Point } from './Point';
import { useGameStore } from '../stores/gameStore';
import { socketClient } from '../services/socketClient';
import { CLEANUP_INTERVAL, MAP_ZOOM_LEVEL, WORLD_HEIGHT, WORLD_WIDTH, TARGET_FPS, FORCE_FPS_LIMIT } from '../config/gameConfig';
import { performanceManager } from '../utils/performanceUtils';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private mySnake: Snake | null = null;
  private lastSocketUpdate: number = 0;
  private lastFrameTime: number = 0;
  private lastRenderTime: number = 0;
  private aiSnakes: Snake[] = [];
  private foods: Food[] = [];
  private lastCleanupTime: number = 0;
  private readonly CLEANUP_INTERVAL = CLEANUP_INTERVAL; // Clean up every 
  private zoom: number = MAP_ZOOM_LEVEL;
  private isTabVisible: boolean = true;
  
  // Dynamic frame rate limiting based on device performance
  private frameStartTime: number = 0;
  
  // World coordinate system - consistent boundaries for collision and rendering
  private readonly WORLD_WIDTH: number = WORLD_WIDTH;
  private readonly WORLD_HEIGHT: number = WORLD_HEIGHT;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.setupCanvas();
    this.initializeGame();
    this.setupVisibilityHandler();
  }

  private setupCanvas(): void {
    const devicePerf = performanceManager.getDevicePerformance();
    
    // Use rotated dimensions for landscape mode with performance scaling
    const baseWidth = window.innerHeight * devicePerf.canvasScale;
    const baseHeight = window.innerWidth * devicePerf.canvasScale;
    
    this.canvas.width = baseWidth;
    this.canvas.height = baseHeight;
    
    // Scale canvas display size back to full screen
    this.canvas.style.width = window.innerHeight + 'px';
    this.canvas.style.height = window.innerWidth + 'px';
    
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
    
    // Performance optimizations for mobile devices
    this.ctx.imageSmoothingEnabled = parseInt(devicePerf.tier.toString()) >= 2; // Only enable on higher-end devices
    
    // Enhanced hardware acceleration hints
    this.canvas.style.willChange = 'transform';
    this.canvas.style.transform = 'translateZ(0)';
    this.canvas.style.backfaceVisibility = 'hidden';
    this.canvas.style.perspective = '1000px';
    
    // Additional canvas optimizations for mobile
    if (devicePerf.isMobile) {
      // Disable anti-aliasing on mobile for better performance
      this.ctx.imageSmoothingEnabled = false;
      // Use faster composite operations
      this.ctx.globalCompositeOperation = 'source-over';
    }
    
    // Set canvas attributes for hardware acceleration
    this.canvas.setAttribute('willReadFrequently', 'false');
  }

  // Handle canvas resize for orientation changes
  resize(): void {
    const oldWidth = this.canvas.width;
    const oldHeight = this.canvas.height;
    const devicePerf = performanceManager.getDevicePerformance();
    
    // Update canvas dimensions for rotated view with performance scaling
    this.canvas.width = window.innerHeight * devicePerf.canvasScale;
    this.canvas.height = window.innerWidth * devicePerf.canvasScale;
    
    // Scale canvas display size back to full screen
    this.canvas.style.width = window.innerHeight + 'px';
    this.canvas.style.height = window.innerWidth + 'px';
    
    // Restore canvas context properties with performance optimizations
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
    this.ctx.imageSmoothingEnabled = parseInt(devicePerf.tier.toString()) >= 2 && !devicePerf.isMobile;
    
    // Restore mobile-specific optimizations
    if (devicePerf.isMobile) {
      this.ctx.globalCompositeOperation = 'source-over';
    }
    
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

  private setupVisibilityHandler(): void {
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      // Page is hidden - only stop rendering to save resources
      this.isTabVisible = false;
      console.log('[GAME ENGINE] Tab hidden - continuing game logic but skipping rendering');
    } else {
      // Page is visible - resume rendering
      this.isTabVisible = true;
      // Reset timing variables to prevent time jumps
      this.lastFrameTime = 0;
      this.lastRenderTime = 0;
      this.frameStartTime = 0;
      console.log('[GAME ENGINE] Tab visible - resuming rendering');
    }
  };

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
    this.frameStartTime = now;
    
    // Calculate target frame interval based on config
    const targetFrameInterval = 1000 / TARGET_FPS;
    const timeSinceLastRender = now - this.lastRenderTime;
    
    // Apply FPS limiting if enabled
    if (FORCE_FPS_LIMIT && timeSinceLastRender < targetFrameInterval) {
      // Skip this frame to maintain target FPS
      this.animationId = requestAnimationFrame(this.gameLoop);
      return;
    }
    
    // Update last render time when we actually render
    this.lastRenderTime = now;
    
    // Always update game logic to maintain multiplayer sync
    this.update();
    
    // Only render if tab is visible and performance allows
    const shouldSkipFrame = FORCE_FPS_LIMIT ? false : performanceManager.shouldSkipFrame(now);
    if (this.isTabVisible && !shouldSkipFrame) {
      this.render();
      
      // Track frame time for adaptive performance
      const frameTime = performance.now() - this.frameStartTime;
      performanceManager.updateFrameTime(frameTime);
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
    
    // Periodic cleanup for memory management
    if (now - this.lastCleanupTime > this.CLEANUP_INTERVAL) {
      this.performCleanup();
      this.lastCleanupTime = now;
    }
    
    // Throttle socket updates based on device performance
    const devicePerf = performanceManager.getDevicePerformance();
    const socketInterval = devicePerf.isMobile ? 66 : 50; // 15 FPS mobile, 20 FPS desktop
    const shouldSendUpdate = now - this.lastSocketUpdate > socketInterval;

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
          break; // Exit loop after eating one food
        }
      }

      // Dead point collisions
      const consumedPoints: Point[] = [];
      for (let i = 0; i < store.deadPoints.length; i++) {
        const point = store.deadPoints[i];
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

      // Collision detection with other snakes (reduced frequency on mobile)
      const collisionCheckInterval = devicePerf.isMobile ? 2 : 1;
      if (Math.floor(now / 16) % collisionCheckInterval === 0) {
        const otherSnakes = store.otherSnakes;
        for (let i = 0; i < otherSnakes.length; i++) {
          const snake = otherSnakes[i];
          if (snake.isAlive) {
            const collision = this.mySnake.checkCollisionsWithOtherSnakes(snake);
            if (collision.collided) {
              // Award points to the snake that caused the collision
              if (collision.collidedWith && collision.points) {
                collision.collidedWith.eatSnake(collision.points, this.mySnake);
              }
              break; // Stop checking once collision detected
            }
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

    // Calculate viewport bounds for culling
    let viewX = 0, viewY = 0;
    const viewWidth = this.canvas.width / this.zoom;
    const viewHeight = this.canvas.height / this.zoom;

    if (this.mySnake && this.mySnake.isAlive) {
      const head = this.mySnake.getHead();
      const zoomFactorX = this.canvas.width / 2 / this.zoom;
      const zoomFactorY = this.canvas.height / 2 / this.zoom;
      
      viewX = head.x - zoomFactorX;
      viewY = head.y - zoomFactorY;
      
      this.ctx.translate(
        zoomFactorX - head.x,
        zoomFactorY - head.y
      );
    }

    this.drawBoundary();

    // Render foods with viewport culling
    for (let i = 0; i < store.foods.length; i++) {
      const food = store.foods[i];
      if (food.isInViewport(viewX, viewY, viewWidth, viewHeight)) {
        food.draw(this.ctx);
      }
    }

    // Render dead points with viewport culling
    for (let i = 0; i < store.deadPoints.length; i++) {
      const point = store.deadPoints[i];
      if (point.isInViewport(viewX, viewY, viewWidth, viewHeight)) {
        point.draw(this.ctx);
      }
    }

    // Draw player snake
    if (this.mySnake && this.mySnake.isAlive) {
      this.mySnake.draw(this.ctx);
    }

    // Draw other snakes with basic culling
    for (let i = 0; i < store.otherSnakes.length; i++) {
      const snake = store.otherSnakes[i];
      if (snake.isAlive) {
        if (snake.points.length > 0) {
          const head = snake.getHead();
          // Simple distance-based culling for snakes
          const distanceFromView = Math.sqrt(
            Math.pow(head.x - (viewX + viewWidth / 2), 2) +
            Math.pow(head.y - (viewY + viewHeight / 2), 2)
          );
          
          // Only draw snakes within reasonable distance
          if (distanceFromView < Math.max(viewWidth, viewHeight)) {
            snake.draw(this.ctx);
          }
        } else {
          snake.draw(this.ctx);
        }
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
    
    // Reinitialize game
    this.initializeGame();
  }

  private performCleanup(): void {
    const devicePerf = performanceManager.getDevicePerformance();
    const store = useGameStore.getState();
    
    // Clean up excess dead points
    if (store.deadPoints.length > devicePerf.maxDeadPoints * 0.8) {
      const targetSize = Math.floor(devicePerf.maxDeadPoints * 0.6);
      const excessPoints = store.deadPoints.length - targetSize;
      if (excessPoints > 0) {
        const removedPoints = store.deadPoints.slice(0, excessPoints);
        store.removeDeadPoints(removedPoints);
        removedPoints.forEach(point => Point.release && Point.release(point));
        console.log(`🧹 Cleaned up ${excessPoints} dead points for performance`);
      }
    }
    
    // Force garbage collection hint (if available)
    if ((window as any).gc) {
      (window as any).gc();
    }
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
    this.lastCleanupTime = 0;
    
    // Disconnect socket if connected
    if (socketClient.isSocketConnected()) {
      socketClient.disconnect();
    }
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}