import { Snake } from './Snake';
import { Food } from './Food';
import { Point } from './Point';
import { useGameStore } from '../stores/gameStore';
import { socketClient } from '../services/socketClient';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private foods: Food[] = [];
  private aiSnakes: Snake[] = [];
  private mySnake: Snake | null = null;
  private zoom = 6;
  private maxFoods = 1000;
  private maxSnakes = 25;
  private lastSpawnTime = 0;
  private spawnInterval = 1200; // milliseconds
  private lastSocketUpdate = 0; // Track last socket update time

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.setupCanvas();
    this.initializeGame();
  }

  private setupCanvas(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
  }

  private initializeGame(): void {
    // Initialize foods
    for (let i = 0; i < this.maxFoods; i++) {
      this.foods.push(new Food(5, this.canvas.width, this.canvas.height));
    }

    // Initialize player snake
    this.mySnake = new Snake(
      this.canvas.width / 2,
      this.canvas.height / 2,
      25,
      'red',
      'player'
    );
    this.mySnake.ai = false;

    // Update store with initial snake
    const store = useGameStore.getState();
    store.updateMySnake(this.mySnake);
    store.updateFoods(this.foods);
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
    this.update();
    this.render();
    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private update(): void {
    const store = useGameStore.getState();
    
    if (!store.isPlaying || !this.mySnake) return;

    const isMultiplayer = store.mode === 'multiplayer' && socketClient.isSocketConnected();
    
    // Throttle socket updates to reduce network overhead
    const now = Date.now();
    const shouldSendUpdate = !this.lastSocketUpdate || (now - this.lastSocketUpdate) > 50; // Reduced frequency to 20fps for better performance

    // Update player snake
    if (this.mySnake.isAlive) {
      this.mySnake.move(store.controls);
      this.mySnake.checkCollisionsWithBoundary(this.canvas.width, this.canvas.height);

      // Check food collisions - optimized to break early
      const foodsToCheck = isMultiplayer ? store.foods : this.foods;
      for (let i = 0; i < foodsToCheck.length; i++) {
        const food = foodsToCheck[i];
        const collision = this.mySnake!.checkCollisionsWithFood(food as unknown as Point);
        if (collision) {
          if (isMultiplayer) {
            try {
              // Send food eaten event to server with error handling
              socketClient.sendFoodEaten(food.id);
            } catch (error) {
              console.warn('Failed to send food eaten event:', error);
            }
          } else {
            // Single player mode - regenerate food locally
            food.x = Math.random() * this.canvas.width;
            food.y = Math.random() * this.canvas.height;
          }
          break; // Only one food can be eaten per frame
        }
      }

      // Optimized dead points collision checking - avoid array recreation
      const deadPointsToCheck = isMultiplayer ? store.deadPoints : Snake.deadPoints;
      if (isMultiplayer) {
        // Process dead points in-place to avoid array recreation
        const consumedPoints: Point[] = [];
        for (let i = deadPointsToCheck.length - 1; i >= 0; i--) {
          const point = deadPointsToCheck[i];
          const collision = this.mySnake!.checkCollisionsWithFood(point);
          if (collision) {
            consumedPoints.push(point);
            deadPointsToCheck.splice(i, 1);
          }
        }
        if (consumedPoints.length > 0) {
          store.removeDeadPoints(consumedPoints);
        }
      } else {
        // Single player mode - process in-place
        for (let i = Snake.deadPoints.length - 1; i >= 0; i--) {
          const point = Snake.deadPoints[i];
          const collision = this.mySnake!.checkCollisionsWithFood(point);
          if (collision) {
            Snake.deadPoints.splice(i, 1);
          }
        }
      }

      // Optimized collision detection with other snakes - break early on collision
      const otherSnakes = isMultiplayer ? store.otherSnakes : this.aiSnakes;
      for (let i = 0; i < otherSnakes.length; i++) {
        const snake = otherSnakes[i];
        if (snake.isAlive) {
          const collided = this.mySnake!.checkCollisionsWithOtherSnakes(snake);
          if (collided) break; // Stop checking once collision detected
        }
      }

      // Send player movement to server in multiplayer mode (throttled with error handling)
      if (isMultiplayer && shouldSendUpdate) {
        try {
          socketClient.sendPlayerMove(this.mySnake);
          this.lastSocketUpdate = now;
        } catch (error) {
          console.warn('Failed to send player movement:', error);
        }
      }

      // Update store with current snake state
      store.updateMySnake(this.mySnake);
      if (!isMultiplayer) {
        store.setGameState({ score: this.mySnake.points.length });
      }
    } else {
      // Snake is dead
      if (isMultiplayer) {
        try {
          // Send death event to server with error handling
          socketClient.sendPlayerDied(Snake.deadPoints);
        } catch (error) {
          console.warn('Failed to send player death event:', error);
        }
      }
      store.endGame(this.mySnake.finalScore || 0, this.mySnake.finalRank || 1);
    }

    // Update AI snakes (only in single player mode) - optimized
    if (!isMultiplayer) {
      const aliveAiSnakes = this.aiSnakes.filter(snake => snake.isAlive);
      
      for (let i = 0; i < aliveAiSnakes.length; i++) {
        const snake = aliveAiSnakes[i];
        snake.move();
        snake.checkCollisionsWithBoundary(this.canvas.width, this.canvas.height);

        // AI snake food collisions - break early on first collision
        let foodCollisionFound = false;
        for (let j = 0; j < this.foods.length && !foodCollisionFound; j++) {
          const food = this.foods[j];
          const collision = snake.checkCollisionsWithFood(food);
          if (collision) {
            food.regenerate(this.canvas.width, this.canvas.height);
            foodCollisionFound = true;
          }
        }

        // AI snake dead points collisions - optimized in-place processing
        for (let j = Snake.deadPoints.length - 1; j >= 0; j--) {
          const point = Snake.deadPoints[j];
          const collision = snake.checkCollisionsWithFood(point);
          if (collision) {
            Snake.deadPoints.splice(j, 1);
          }
        }

        // AI snake collisions with other AI snakes - avoid duplicate checks
        let snakeCollisionFound = false;
        for (let j = i + 1; j < aliveAiSnakes.length && !snakeCollisionFound; j++) {
          const otherSnake = aliveAiSnakes[j];
          const collided = snake.checkCollisionsWithOtherSnakes(otherSnake);
          if (collided) {
            snakeCollisionFound = true;
          }
        }

        // AI snake collision with player - only if no other collision found
        if (!snakeCollisionFound && this.mySnake && this.mySnake.isAlive) {
          snake.checkCollisionsWithOtherSnakes(this.mySnake);
        }
      }

      // Spawn new AI snakes periodically
      const currentTime = Date.now();
      if (currentTime - this.lastSpawnTime > this.spawnInterval) {
        this.spawnAISnake();
        this.lastSpawnTime = currentTime;
      }

      // Remove dead AI snakes
      this.aiSnakes = this.aiSnakes.filter(snake => snake.isAlive);

      // Update store with AI snakes
      store.updateOtherSnakes(this.aiSnakes);
      store.setGameState({ 
        playerCount: this.aiSnakes.length + (this.mySnake?.isAlive ? 1 : 0)
      });
    }

    // Calculate rank
    if (this.mySnake && this.mySnake.isAlive) {
      const allSnakes = [this.mySnake, ...this.aiSnakes].filter(s => s.isAlive);
      allSnakes.sort((a, b) => b.points.length - a.points.length);
      const rank = allSnakes.findIndex(snake => snake === this.mySnake) + 1;
      store.setGameState({ rank });
    }
  }

  private render(): void {
    const store = useGameStore.getState();
    const isMultiplayer = store.mode === 'multiplayer' && socketClient.isSocketConnected();
    
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

    // Draw foods
    const foodsToDraw = isMultiplayer ? store.foods : this.foods;
    foodsToDraw.forEach(food => {
      food.draw(this.ctx);
    });

    // Draw dead points
    if (isMultiplayer) {
      store.deadPoints.forEach(point => {
        point.draw(this.ctx);
      });
    } else {
      Snake.drawDeadpoints(this.ctx);
    }

    // Draw player snake
    if (this.mySnake && this.mySnake.isAlive) {
      this.mySnake.draw(this.ctx);
    }

    // Draw other snakes (AI snakes in single player, other players in multiplayer)
    const otherSnakes = isMultiplayer ? store.otherSnakes : this.aiSnakes;
    otherSnakes.forEach(snake => {
      if (snake.isAlive) {
        snake.draw(this.ctx);
      }
    });

    this.ctx.restore();
  }

  private drawBoundary(lineWidth: number = 10): void {
    this.ctx.beginPath();
    this.ctx.strokeStyle = 'red';
    this.ctx.lineWidth = lineWidth;
    this.ctx.rect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.stroke();
  }

  private spawnAISnake(): void {
    if (this.aiSnakes.length >= this.maxSnakes) return;
    
    const randX = Math.random() * (this.canvas.width - 100) + 50;
    const randY = Math.random() * (this.canvas.height - 100) + 50;
    
    const aiSnake = new Snake(randX, randY, 25, 'blue', `ai-${Date.now()}`);
    aiSnake.ai = true;
    
    this.aiSnakes.push(aiSnake);
  }

  resetGame(): void {
    // Stop any running animation loop
    this.stop();
    
    // Clear existing game state
    this.aiSnakes = [];
    Snake.deadPoints = [];
    
    // Reset timing variables
    this.lastSpawnTime = 0;
    this.lastSocketUpdate = 0;
    
    // Reinitialize game
    this.initializeGame();
    
    // Reset store
    const store = useGameStore.getState();
    store.resetGame();
  }

  // Cleanup method for proper resource management
  cleanup(): void {
    // Stop animation loop
    this.stop();
    
    // Clear all game objects
    this.aiSnakes = [];
    this.foods = [];
    this.mySnake = null;
    Snake.deadPoints = [];
    
    // Reset timing variables
    this.lastSpawnTime = 0;
    this.lastSocketUpdate = 0;
    
    // Disconnect socket if connected
    if (socketClient.isSocketConnected()) {
      socketClient.disconnect();
    }
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // Method to switch between single and multiplayer modes safely
  switchMode(newMode: 'single' | 'multiplayer'): void {
    const store = useGameStore.getState();
    const currentMode = store.mode;
    
    if (currentMode === newMode) return;
    
    // Stop current game
    this.stop();
    
    // Clean up mode-specific resources
    if (currentMode === 'multiplayer') {
      // Cleanup multiplayer resources
      if (socketClient.isSocketConnected()) {
        socketClient.disconnect();
      }
      store.updateOtherSnakes([]);
      store.addDeadPoints([]);
    } else {
      // Cleanup single player resources
      this.aiSnakes = [];
      Snake.deadPoints = [];
    }
    
    // Reset game state
    store.setGameState({ 
      mode: newMode,
      isPlaying: false,
      isGameOver: false,
      score: 0,
      rank: 0,
      playerCount: 0
    });
    
    // Reinitialize for new mode
    this.initializeGame();
  }
}