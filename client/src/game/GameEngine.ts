import { Snake } from './Snake';
import { Food } from './Food';
import { useGameStore } from '../stores/gameStore';
import { socketClient } from '../services/socketClient';
import type { Point } from './Point';

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

    // Update player snake
    if (this.mySnake.isAlive) {
      this.mySnake.move(store.controls);
      this.mySnake.checkCollisionsWithBoundary(this.canvas.width, this.canvas.height);

      // Check food collisions
      const foodsToCheck = isMultiplayer ? store.foods : this.foods;
      foodsToCheck.forEach(food => {
        const collision = this.mySnake!.checkCollisionsWithFood(food as unknown as Point);
        if (collision) {
          if (isMultiplayer) {
            // Send food eaten event to server
            socketClient.sendFoodEaten(food.id);
          } else {
            // Single player mode - regenerate food locally
            food.x = Math.random() * this.canvas.width;
            food.y = Math.random() * this.canvas.height;
          }
        }
      });

      // Check dead points collisions
      const deadPointsToCheck = isMultiplayer ? store.deadPoints : Snake.deadPoints;
      if (isMultiplayer) {
        store.addDeadPoints(deadPointsToCheck.filter(p => {
          const collision = this.mySnake!.checkCollisionsWithFood(p);
          return !collision;
        }));
      } else {
        Snake.deadPoints = Snake.deadPoints.filter(p => {
          const collision = this.mySnake!.checkCollisionsWithFood(p);
          return !collision;
        });
      }

      // Check collisions with other snakes
      const otherSnakes = isMultiplayer ? store.otherSnakes : this.aiSnakes;
      otherSnakes.forEach(snake => {
        this.mySnake!.checkCollisionsWithOtherSnakes(snake);
      });

      // Send player movement to server in multiplayer mode
      if (isMultiplayer) {
        socketClient.sendPlayerMove(this.mySnake);
      }

      // Update store with current snake state
      store.updateMySnake(this.mySnake);
      if (!isMultiplayer) {
        store.setGameState({ score: this.mySnake.points.length });
      }
    } else {
      // Snake is dead
      if (isMultiplayer) {
        // Send death event to server
        socketClient.sendPlayerDied(Snake.deadPoints);
      }
      store.endGame(this.mySnake.finalScore || 0, this.mySnake.finalRank || 1);
    }

    // Update AI snakes (only in single player mode)
    if (!isMultiplayer) {
      this.aiSnakes.forEach(snake => {
        if (snake.isAlive) {
          snake.move();
          snake.checkCollisionsWithBoundary(this.canvas.width, this.canvas.height);

          // AI snake food collisions
          this.foods.forEach(food => {
            const collision = snake.checkCollisionsWithFood(food);
            if (collision) {
              food.regenerate(this.canvas.width, this.canvas.height);
            }
          });

          // AI snake dead points collisions
          Snake.deadPoints = Snake.deadPoints.filter(p => {
            const collision = snake.checkCollisionsWithFood(p);
            return !collision;
          });

          // AI snake collisions with other snakes
          this.aiSnakes.forEach(otherSnake => {
            if (otherSnake !== snake) {
              snake.checkCollisionsWithOtherSnakes(otherSnake);
            }
          });

          // AI snake collision with player
          if (this.mySnake && this.mySnake.isAlive) {
            snake.checkCollisionsWithOtherSnakes(this.mySnake);
          }
        }
      });

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
    // Clear existing game state
    this.aiSnakes = [];
    Snake.deadPoints = [];
    
    // Reinitialize game
    this.initializeGame();
    
    // Reset store
    const store = useGameStore.getState();
    store.resetGame();
  }
}