import { Snake } from './Snake';
import { Food } from './Food';
import { Point } from './Point';
import { ScoreAnimation } from './ScoreAnimation';
import { useGameStore } from '../stores/gameStore';
import { socketClient } from '../services/socketClient';
import { CLEANUP_INTERVAL, MAP_ZOOM_LEVEL, WORLD_HEIGHT, WORLD_WIDTH, TARGET_FPS, FORCE_FPS_LIMIT } from '../config/gameConfig';
import { performanceManager } from '../utils/performanceUtils';
import { useSettingsStore } from '../stores/settingsStore';
import { applyQualityToContext } from '../utils/qualityUtils';

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
  private scoreAnimation: ScoreAnimation = new ScoreAnimation();
  
  // Dynamic frame rate limiting based on device performance
  private frameStartTime: number = 0;
  
  // Quality settings
  private quality: string = "hd";
  
  // World coordinate system - consistent boundaries for collision and rendering
  private readonly WORLD_WIDTH: number = WORLD_WIDTH;
  private readonly WORLD_HEIGHT: number = WORLD_HEIGHT;

  private updateQualitySettings(): void {
    // Get quality from settings store
    try {
      const settingsStore = useSettingsStore.getState();
      this.quality = settingsStore.quality;
      this.applyQualityToCanvas();
      
      // Subscribe to quality changes
      useSettingsStore.subscribe((state) => {
        if (state.quality !== this.quality) {
          this.quality = state.quality;
          this.applyQualityToCanvas();
        }
      });
    } catch (error) {
      console.warn('Failed to get quality settings:', error);
      this.quality = "hd"; // Default to HD
    }
  }

  private applyQualityToCanvas(): void {
    if (this.ctx) {
      applyQualityToContext(this.ctx, this.quality as "low" | "medium" | "hd");
    }
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.setupCanvas();
    this.initializeGame();
    this.setupVisibilityHandler();
    this.updateQualitySettings();
  }

  private setupCanvas(): void {
    const devicePerf = performanceManager.getDevicePerformance();
    const pixelRatio = window.devicePixelRatio || 1;
    
    // Use rotated dimensions for landscape mode with performance scaling
    const displayWidth = window.innerHeight;
    const displayHeight = window.innerWidth;
    const baseWidth = displayWidth * devicePerf.canvasScale;
    const baseHeight = displayHeight * devicePerf.canvasScale;
    
    // Set actual canvas size accounting for device pixel ratio for crisp rendering
    this.canvas.width = baseWidth * pixelRatio;
    this.canvas.height = baseHeight * pixelRatio;
    
    // Scale canvas display size back to full screen
    this.canvas.style.width = displayWidth + 'px';
    this.canvas.style.height = displayHeight + 'px';
    
    // Scale the drawing context to match device pixel ratio
    this.ctx.scale(pixelRatio, pixelRatio);
    
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
    
    // Apply quality settings to canvas context
    this.applyQualityToCanvas();
    
    // Enhanced hardware acceleration hints
    this.canvas.style.willChange = 'transform';
    this.canvas.style.transform = 'translateZ(0)';
    this.canvas.style.backfaceVisibility = 'hidden';
    this.canvas.style.perspective = '1000px';
    
    // Additional canvas optimizations for mobile
    if (devicePerf.isMobile) {
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
    const pixelRatio = window.devicePixelRatio || 1;
    
    // Update canvas dimensions for rotated view with performance scaling
    const displayWidth = window.innerHeight;
    const displayHeight = window.innerWidth;
    const baseWidth = displayWidth * devicePerf.canvasScale;
    const baseHeight = displayHeight * devicePerf.canvasScale;
    
    // Set actual canvas size accounting for device pixel ratio for crisp rendering
    this.canvas.width = baseWidth * pixelRatio;
    this.canvas.height = baseHeight * pixelRatio;
    
    // Scale canvas display size back to full screen
    this.canvas.style.width = displayWidth + 'px';
    this.canvas.style.height = displayHeight + 'px';
    
    // Scale the drawing context to match device pixel ratio
    this.ctx.scale(pixelRatio, pixelRatio);
    
    // Restore canvas context properties with performance optimizations
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
    
    // Apply quality settings after resize
    this.applyQualityToCanvas();
    
    // Restore mobile-specific optimizations
    if (devicePerf.isMobile) {
      this.ctx.globalCompositeOperation = 'source-over';
    }
    
    // Calculate scale factors for repositioning game elements
    // Account for pixel ratio in old dimensions when calculating scale
    const oldPixelRatio = oldWidth / (window.innerHeight * devicePerf.canvasScale) || 1;
    const oldBaseWidth = oldWidth / oldPixelRatio;
    const oldBaseHeight = oldHeight / oldPixelRatio;
    const scaleX = baseWidth / oldBaseWidth;
    const scaleY = baseHeight / oldBaseHeight;
    
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
    
    // Update score animations
    this.scoreAnimation.update();
    
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
      
      // Check boundary collisions and notify server if collision occurs
      // Capture points BEFORE collision check since over() method clears them
      const currentPoints = this.mySnake.points.map(p => ({
        x: p.x,
        y: p.y,
        radius: p.radius,
        color: p.color,
        type: p.type
      }));
      
      const boundaryCollision = this.mySnake.checkCollisionsWithBoundary(this.WORLD_WIDTH, this.WORLD_HEIGHT);
      if (boundaryCollision) {
        // Immediately notify server of player death from boundary collision
        try {
          const pointInstances = currentPoints.map(p => Point.create(p.x, p.y, p.radius, p.color, p.type));
          socketClient.sendPlayerDied(pointInstances);
          console.log(`🏁 Player boundary collision detected - notified server of death with ${currentPoints.length} points`);
        } catch (error) {
          console.warn('Failed to send boundary collision death event:', error);
        }
      }

      // Food collisions - multiplayer only
      const foodsToCheck = store.foods;
      for (let i = 0; i < foodsToCheck.length; i++) {
        const food = foodsToCheck[i];
        const collision = this.mySnake.checkCollisionsWithFood(food);
        if (collision) {
          // The checkCollisionsWithFood method already calls eat() internally with the food's color
          console.log(`[GAME ENGINE] Snake ate food at (${food.x.toFixed(1)}, ${food.y.toFixed(1)})`);
          
          // Get point value for this food type and trigger score animation near snake head
          const pointValue = food.getPointValue();
          const head = this.mySnake.getHead();
          // Position animation closer to snake head with small offset
          const animX = head.x + (this.mySnake.radius * 0.5) * this.mySnake.velocity.x;
          const animY = head.y + (this.mySnake.radius * 0.5) * this.mySnake.velocity.y;
          this.scoreAnimation.addAnimation(animX, animY, pointValue);
          
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
        if (collision && point.isOldEnoughToConsume()) {
          consumedPoints.push(point);
        }
      }
      
      if (consumedPoints.length > 0) {
        // Add score animations for consumed dead points
        consumedPoints.forEach(() => {
          // Dead points are worth 1 point each - position animation near snake head
          const head = this.mySnake?.getHead();
          if (head && this.mySnake?.radius && this.mySnake?.velocity) {
            const animX = head.x + (this.mySnake.radius * 0.5) * this.mySnake.velocity.x;
            const animY = head.y + (this.mySnake.radius * 0.5) * this.mySnake.velocity.y;
            this.scoreAnimation.addAnimation(animX, animY, 1);
          }
        });
        
        // Removed immediate local removal - let server handle dead point removal authority
        // Dead points will be removed when server confirms via 'deadPointsRemoved' event
        
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
            // Capture points BEFORE collision check since over() method clears them
            const snakePoints = this.mySnake.points.map(p => ({
              x: p.x,
              y: p.y,
              radius: p.radius,
              color: p.color,
              type: p.type
            }));
            
            const collision = this.mySnake.checkCollisionsWithOtherSnakes(snake);
            if (collision.collided) {
              // Immediately notify server of player death
              try {
                const pointInstances = snakePoints.map(p => Point.create(p.x, p.y, p.radius, p.color, p.type));
                socketClient.sendPlayerDied(pointInstances);
                console.log(`🐍 Player collision detected - notified server of death with ${snakePoints.length} points`);
              } catch (error) {
                console.warn('Failed to send immediate player death event:', error);
              }
              
              // Award points to the snake that caused the collision (client-side visual feedback only)
              if (collision.collidedWith && collision.points) {
                collision.collidedWith.eatSnake(collision.points);
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
      // Snake is dead - end game (death event already sent during collision)
      store.endGame(this.mySnake.finalScore || 0, this.mySnake.finalRank || 1);
    }

    // AI snakes are now handled by the server in multiplayer mode

    // Ranking is handled by the server in multiplayer mode
  }

  private render(): void {
    const store = useGameStore.getState();
    
    // Clear using display dimensions, not scaled canvas dimensions
    this.ctx.clearRect(0, 0, this.canvas.width / (window.devicePixelRatio || 1), this.canvas.height / (window.devicePixelRatio || 1));
    this.ctx.save();
    this.ctx.scale(this.zoom, this.zoom);

    // Calculate viewport bounds for culling using display dimensions
    let viewX = 0, viewY = 0;
    const pixelRatio = window.devicePixelRatio || 1;
    const displayWidth = this.canvas.width / pixelRatio;
    const displayHeight = this.canvas.height / pixelRatio;
    const viewWidth = displayWidth / this.zoom;
    const viewHeight = displayHeight / this.zoom;

    if (this.mySnake && this.mySnake.isAlive) {
      const head = this.mySnake.getHead();
      const zoomFactorX = displayWidth / 2 / this.zoom;
      const zoomFactorY = displayHeight / 2 / this.zoom;
      
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

    // Render score animations (after all game objects but before restoring context)
    this.scoreAnimation.render(this.ctx);

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
    
    // Clear score animations
    this.scoreAnimation.clear();
    
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
    
    // Clear score animations
    this.scoreAnimation.clear();
    
    // Reset timing variables
    this.lastSocketUpdate = 0;
    this.lastFrameTime = 0;
    this.lastCleanupTime = 0;
    
    // Disconnect socket if connected
    if (socketClient.isSocketConnected()) {
      socketClient.disconnect();
    }
    
    // Clear canvas using display dimensions
    const pixelRatio = window.devicePixelRatio || 1;
    this.ctx.clearRect(0, 0, this.canvas.width / pixelRatio, this.canvas.height / pixelRatio);
  }
}