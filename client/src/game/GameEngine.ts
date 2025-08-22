import { Snake } from './Snake';
// import { Food } from './Food';
import { Point } from './Point';
import { useGameStore } from '../stores/gameStore';
import { socketClient } from '../services/socketClient';
import { MAP_ZOOM_LEVEL, WORLD_HEIGHT, WORLD_WIDTH, GAME_FPS, FRAME_INTERVAL } from '../config/gameConfig';
import { PerformanceTracker, type PerformanceStats } from '../utils/PerformanceTracker';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private mySnake: Snake | null = null;
  private lastSocketUpdate: number = 0;
  private lastFrameTime: number = 0;
  // private aiSnakes: Snake[] = [];
  // private foods: Food[] = [];
  private zoom: number = MAP_ZOOM_LEVEL;
  
  // Frame rate limiting with adaptive throttling
  private readonly FRAME_INTERVAL = FRAME_INTERVAL; // Use configurable FPS
  private readonly THROTTLED_FRAME_INTERVAL = 1000 / (GAME_FPS / 2); // Half FPS when overheating
  private lastRenderTime: number = 0;
  
  // Performance monitoring
  private performanceTracker: PerformanceTracker = new PerformanceTracker();
  private performanceStats: PerformanceStats | null = null;
  
  // World coordinate system - get from server via gameStore
  private getWorldWidth(): number {
    const store = useGameStore.getState();
    return store.worldWidth || WORLD_WIDTH; // Fallback to config if not set
  }
  
  private getWorldHeight(): number {
    const store = useGameStore.getState();
    return store.worldHeight || WORLD_HEIGHT; // Fallback to config if not set
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.setupCanvas();
    this.initializeGame();
  }

  private setupCanvas(): void {
    // Set canvas dimensions for landscape mode (mobile rotated view)
    this.canvas.width = window.innerHeight;
    this.canvas.height = window.innerWidth;
    
    // Configure canvas context for optimal rendering
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
    this.ctx.imageSmoothingEnabled = false; // Better performance on mobile
    
    console.log(`🎮 [SETUP] Canvas initialized: ${this.canvas.width}x${this.canvas.height}, World: ${this.getWorldWidth()}x${this.getWorldHeight()}`);
  }

  // Handle canvas resize for orientation changes
  resize(): void {
    console.log('🔄 [RESIZE] Canvas resize triggered - maintaining world coordinates');
    
    // Update canvas dimensions for landscape mode (rotated view)
    this.canvas.width = window.innerHeight;
    this.canvas.height = window.innerWidth;
    
    // Restore canvas context properties after resize
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
    this.ctx.imageSmoothingEnabled = false;
    
    console.log(`🔄 [RESIZE] Canvas dimensions: ${this.canvas.width}x${this.canvas.height}, World: ${this.getWorldWidth()}x${this.getWorldHeight()}`);
    
    // CRITICAL FIX: Do NOT scale world coordinates!
    // World coordinates should remain immutable (0,0 to WORLD_WIDTH,WORLD_HEIGHT)
    // Only the canvas viewport changes, not the game world itself
    
    // Log current snake position for debugging
    if (this.mySnake && this.mySnake.isAlive) {
      const head = this.mySnake.getHead();
      console.log(`🐍 [RESIZE] Snake position unchanged: (${head.x.toFixed(1)}, ${head.y.toFixed(1)})`);
    }
    
    // No coordinate scaling needed - collision detection and rendering
    // will work correctly with consistent world coordinates
  }

  private initializeGame(): void {
    const store = useGameStore.getState();
    
    // Check if snake already exists from server data
    if (store.mySnake) {
      console.log('🐍 Using existing snake from server data at position:', store.mySnake.getHead()?.x, store.mySnake.getHead()?.y);
      this.mySnake = store.mySnake;
    } else {
      // Don't create fallback snake immediately - wait for server data
      console.log('🐍 No snake data from server yet - waiting for gameInit event');
      this.mySnake = null;
    }
  }

  start(): void {
    if (!this.animationId) {
      // Reset performance monitoring when starting
      this.performanceTracker.reset();
      this.performanceStats = null;
      
      this.gameLoop();
    }
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  // Public method to get current performance stats
  getPerformanceStats(): PerformanceStats | null {
    return this.performanceStats;
  }

  // Check if device is overheating based on performance
  isOverheating(): boolean {
    return this.performanceTracker.isOverheating();
  }

  private gameLoop = (): void => {
    const now = performance.now();
    const elapsed = now - this.lastRenderTime;
    
    // Start performance tracking for this frame
    this.performanceTracker.startFrame();
    
    // Use adaptive frame interval based on device performance
    const shouldThrottle = this.performanceTracker.shouldThrottleFrame();
    const targetInterval = shouldThrottle ? this.THROTTLED_FRAME_INTERVAL : this.FRAME_INTERVAL;
    
    // Only update and render if enough time has passed
    if (elapsed >= targetInterval) {
      this.update();
      this.render();
      this.lastRenderTime = now - (elapsed % targetInterval);
    }
    
    // End performance tracking and update stats
    this.performanceTracker.endFrame();
    this.updatePerformanceStats();
    
    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private updatePerformanceStats(): void {
    const store = useGameStore.getState();
    
    // Update performance stats with current object counts
    this.performanceStats = this.performanceTracker.getStats({
      foods: store.foods.length,
      deadPoints: store.deadPoints.length,
      snakes: store.otherSnakes.length + (this.mySnake ? 1 : 0)
    });
    
    // Log performance warnings if overheating
    if (this.performanceTracker.isOverheating()) {
      console.log(`🔥 Device overheating detected (FPS: ${this.performanceStats.fps.toFixed(1)}, Memory: ${this.performanceStats.memoryUsage.toFixed(1)}MB)`);
    }
  }

  private update(): void {
    const store = useGameStore.getState();
    
    // Sync with store's mySnake if it has been updated from socket events
    if (store.mySnake && this.mySnake !== store.mySnake) {
      console.log('🔄 Syncing GameEngine snake with store snake');
      this.mySnake = store.mySnake;
    }
    
    if (!store.isPlaying) return;
    
    // Wait for snake data from server before starting game loop
    if (!this.mySnake) {
      console.log('🐍 [DEBUG] Waiting for snake data from server...');
      return;
    }

    // Calculate deltaTime for frame-rate independent movement
    const now = Date.now();
    const deltaTime = this.lastFrameTime ? now - this.lastFrameTime : FRAME_INTERVAL; // Use configurable FPS
    this.lastFrameTime = now;
    
    // Throttle socket updates to reduce network overhead
    const shouldSendUpdate = now - this.lastSocketUpdate > FRAME_INTERVAL; // Use configurable FPS for network updates

    // Update player snake
    if (this.mySnake.isAlive) {
      this.mySnake.move(store.controls, deltaTime);
      
      // Comprehensive debug logging for world dimensions and boundary collision
      const head = this.mySnake.getHead();
      const clientWorldWidth = this.getWorldWidth();
      const clientWorldHeight = this.getWorldHeight();
      const storeWorldWidth = store.worldWidth;
      const storeWorldHeight = store.worldHeight;
      
      // Log world dimension validation
      console.log(`[GAMEENGINE] World dimensions - Client: ${clientWorldWidth}x${clientWorldHeight}, Store: ${storeWorldWidth}x${storeWorldHeight}`);
      
      // Validate server/client dimension synchronization
      if (storeWorldWidth && storeWorldHeight) {
        if (clientWorldWidth !== storeWorldWidth || clientWorldHeight !== storeWorldHeight) {
          console.warn(`[GAMEENGINE] WARNING: World dimension mismatch! Client: ${clientWorldWidth}x${clientWorldHeight}, Server: ${storeWorldWidth}x${storeWorldHeight}`);
        }
      } else {
        console.warn(`[GAMEENGINE] WARNING: Store world dimensions not set! Using fallback: ${clientWorldWidth}x${clientWorldHeight}`);
      }
      
      // Log snake position before boundary check
      console.log(`[GAMEENGINE] Snake ${this.mySnake.id.substring(0,6)} position before boundary check: (${head.x.toFixed(2)}, ${head.y.toFixed(2)}) radius: ${head.radius}`);
      
      const boundaryCollision = this.mySnake.checkCollisionsWithBoundary(clientWorldWidth, clientWorldHeight);
      
      // Log when snake gets close to boundaries
      const margin = 50;
      if (head.x < margin || head.y < margin || head.x > clientWorldWidth - margin || head.y > clientWorldHeight - margin) {
        console.log(`⚠️ [BOUNDARY WARNING] Snake near boundary at (${head.x.toFixed(1)}, ${head.y.toFixed(1)}) - World: ${clientWorldWidth}x${clientWorldHeight}`);
      }
      
      if (boundaryCollision) {
        console.log(`💀 [BOUNDARY DEATH] Snake died at boundary (${head.x.toFixed(1)}, ${head.y.toFixed(1)}) - World: ${clientWorldWidth}x${clientWorldHeight}`);
      }

      // Food collisions - multiplayer only
       const foodsToCheck = store.foods;
      
      // Debug logging for food collision detection
      if (foodsToCheck.length > 0 && Math.random() < 0.1) { // 10% chance to log for debugging
        console.log(`🍎 [COLLISION DEBUG] Snake head at (${head.x.toFixed(1)}, ${head.y.toFixed(1)}, r:${head.radius}) checking ${foodsToCheck.length} foods`);
      }
      
      for (let i = 0; i < foodsToCheck.length; i++) {
        const food = foodsToCheck[i];
        
        // Calculate distance for debugging
        const distance = Math.hypot(head.x - food.x, head.y - food.y);
        const requiredDistance = head.radius + (food.radius || 5);
        
        // Log near-misses for debugging
        if (distance < requiredDistance + 10) {
          console.log(`🍎 [NEAR MISS] Food at (${food.x.toFixed(1)}, ${food.y.toFixed(1)}, r:${food.radius || 5}) - Distance: ${distance.toFixed(2)}, Required: ${requiredDistance.toFixed(2)}`);
        }
        
        const collision = this.mySnake.checkCollisionsWithFood(food);
        if (collision) {
          // The checkCollisionsWithFood method already calls eat() internally with the food's color
          console.log(`✅ [FOOD EATEN] Snake ate food at (${food.x.toFixed(1)}, ${food.y.toFixed(1)}) - Distance: ${distance.toFixed(2)}`);
          
          // Remove the food from local store immediately
          store.removeFood(food.id);
          
          // Notify server about food consumption
          try {
            console.log(`📡 [NETWORK] Sending food eaten event to server for food ID: ${food.id}`);
            socketClient.sendFoodEaten(food.id);
          } catch (error) {
            console.warn('❌ Failed to send food eaten event:', error);
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

  private isInViewport(x: number, y: number, size: number = 10): boolean {
    // Always render everything if no player snake or snake is not alive
    if (!this.mySnake || !this.mySnake.isAlive) {
      return true;
    }
    
    const head = this.mySnake.getHead();
    const viewportWidth = this.canvas.width / this.zoom;
    const viewportHeight = this.canvas.height / this.zoom;
    const margin = size * 4; // Increased margin to ensure foods are visible
    
    const left = head.x - viewportWidth / 2 - margin;
    const right = head.x + viewportWidth / 2 + margin;
    const top = head.y - viewportHeight / 2 - margin;
    const bottom = head.y + viewportHeight / 2 + margin;
    
    const isVisible = x >= left && x <= right && y >= top && y <= bottom;
    
    // Debug viewport culling occasionally
    if (Math.random() < 0.005) { // 0.5% chance to log
      console.log(`🔍 [VIEWPORT] Object at (${x.toFixed(1)}, ${y.toFixed(1)}) - Head: (${head.x.toFixed(1)}, ${head.y.toFixed(1)}) - Viewport: ${viewportWidth.toFixed(1)}x${viewportHeight.toFixed(1)} - Visible: ${isVisible}`);
    }
    
    return isVisible;
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
      
      // Calculate viewport dimensions in world coordinates
      const viewportWidth = this.canvas.width / this.zoom;
      const viewportHeight = this.canvas.height / this.zoom;
      
      // Calculate desired camera position (centered on snake head)
      let cameraX = head.x;
      let cameraY = head.y;
      
      // Clamp camera position to ensure viewport stays within world boundaries
      const minCameraX = viewportWidth / 2;
      const maxCameraX = this.getWorldWidth() - viewportWidth / 2;
      const minCameraY = viewportHeight / 2;
      const maxCameraY = this.getWorldHeight() - viewportHeight / 2;
      
      // Only clamp if the world is larger than the viewport
      if (this.getWorldWidth() > viewportWidth) {
        cameraX = Math.max(minCameraX, Math.min(maxCameraX, cameraX));
      }
      if (this.getWorldHeight() > viewportHeight) {
        cameraY = Math.max(minCameraY, Math.min(maxCameraY, cameraY));
      }
      
      // Apply clamped camera translation
      this.ctx.translate(
        zoomFactorX - cameraX,
        zoomFactorY - cameraY
      );
      
      // Debug camera bounds occasionally
      if (Math.random() < 0.01) { // 1% chance to log
        console.log(`📷 [CAMERA] Head: (${head.x.toFixed(1)}, ${head.y.toFixed(1)}) Camera: (${cameraX.toFixed(1)}, ${cameraY.toFixed(1)}) Viewport: ${viewportWidth.toFixed(1)}x${viewportHeight.toFixed(1)}`);
      }
    }

    this.drawBoundary();

    // Render foods with viewport culling
    let renderedFoods = 0;
    // Only log when there are foods to avoid spam
    if (store.foods.length > 0) {
      console.log(`🍎 [CLIENT RENDER] Rendering ${store.foods.length} foods`);
    }
    
    for (let i = 0; i < store.foods.length; i++) {
      const food = store.foods[i];
      
      if (this.isInViewport(food.x, food.y, food.radius || 5)) {
        food.draw(this.ctx);
        renderedFoods++;
      }
    }
    
    // Always log food count for debugging
    if (store.foods.length > 0) {
      console.log(`🍎 [CLIENT RENDER] Total foods in store: ${store.foods.length}, Rendered: ${renderedFoods}`);
    }

    // Render dead points with viewport culling
    let renderedDeadPoints = 0;
    for (let i = 0; i < store.deadPoints.length; i++) {
      const point = store.deadPoints[i];
      if (this.isInViewport(point.x, point.y, point.radius || 3)) {
        point.draw(this.ctx);
        renderedDeadPoints++;
      }
    }

    // Draw player snake (always render)
    if (this.mySnake && this.mySnake.isAlive) {
      this.mySnake.draw(this.ctx);
    }

    // Draw other snakes with viewport culling
    let renderedSnakes = 0;
    for (let i = 0; i < store.otherSnakes.length; i++) {
      const snake = store.otherSnakes[i];
      if (snake.isAlive) {
        const head = snake.getHead();
        if (this.isInViewport(head.x, head.y, snake.radius || 10)) {
          snake.draw(this.ctx);
          renderedSnakes++;
        }
      }
    }

    // Log culling stats occasionally for debugging
    if (Math.random() < 0.01) { // 1% chance to log
      console.log(`[VIEWPORT CULLING] Rendered: ${renderedFoods}/${store.foods.length} foods, ${renderedDeadPoints}/${store.deadPoints.length} dead points, ${renderedSnakes}/${store.otherSnakes.length} snakes`);
    }

    this.ctx.restore();
  }

  private drawBoundary(lineWidth: number = 10): void {
    this.ctx.beginPath();
    this.ctx.strokeStyle = 'red';
    this.ctx.lineWidth = lineWidth;
    // Use world coordinates for boundary instead of canvas dimensions
    this.ctx.rect(0, 0, this.getWorldWidth(), this.getWorldHeight());
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