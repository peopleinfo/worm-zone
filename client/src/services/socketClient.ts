import { io, Socket } from 'socket.io-client';
import { Snake } from '../game/Snake';
import { Food } from '../game/Food';
import { Point } from '../game/Point';
import { useGameStore } from '../stores/gameStore';

interface ServerPlayer {
  id: string;
  socketId: string;
  x: number;
  y: number;
  points: Point[];
  angle: number;
  radius: number;
  speed: number;
  color: string;
  score: number;
  alive: boolean;
}

interface GameInitData {
  playerId: string;
  gameState: {
    players: ServerPlayer[];
    foods: any[];
    deadPoints: Point[];
    worldWidth: number;
    worldHeight: number;
  };
}

class SocketClient {
  private socket: Socket | null = null;
  private playerId: string | null = null;
  private isConnected = false;

  connect(serverUrl: string = 'http://localhost:3000'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(serverUrl, {
          transports: ['websocket', 'polling'],
          timeout: 5000,
        });

        this.socket.on('connect', () => {
          console.log('Connected to server');
          this.isConnected = true;
          this.setupEventListeners();
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          this.isConnected = false;
          reject(error);
        });

        this.socket.on('disconnect', () => {
          console.log('Disconnected from server');
          this.isConnected = false;
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Game initialization
    this.socket.on('gameInit', (data: GameInitData) => {
      console.log('Game initialized:', data);
      this.playerId = data.playerId;
      
      const store = useGameStore.getState();
      
      // Convert server players to client snakes
      const otherSnakes = data.gameState.players
        .filter(p => p.id !== this.playerId)
        .map(p => this.convertServerPlayerToSnake(p));
      
      // Convert server foods to client foods
      const foods = data.gameState.foods.map(f => new Food(f.radius, data.gameState.worldWidth, data.gameState.worldHeight, f.id));
      
      store.updateOtherSnakes(otherSnakes);
      store.updateFoods(foods);
      // Convert server deadPoints to client Point instances
      const deadPoints = data.gameState.deadPoints.map((p: any) => new Point(p.x, p.y, p.radius, p.color));
      store.addDeadPoints(deadPoints);
      store.setGameState({ 
        mode: 'multiplayer',
        playerCount: data.gameState.players.length 
      });
    });

    // Player joined
    this.socket.on('playerJoined', (player: ServerPlayer) => {
      console.log('Player joined:', player);
      const store = useGameStore.getState();
      const newSnake = this.convertServerPlayerToSnake(player);
      store.updateOtherSnakes([...store.otherSnakes, newSnake]);
      store.setGameState({ playerCount: store.playerCount + 1 });
    });

    // Player moved
    this.socket.on('playerMoved', (data: any) => {
      const store = useGameStore.getState();
      const updatedSnakes = store.otherSnakes.map(snake => {
        if (snake.id === data.playerId) {
          snake.points = data.points.map((p: any) => new Point(p.x, p.y, p.radius, p.color));
          snake.angle = data.angle;
          return snake;
        }
        return snake;
      });
      store.updateOtherSnakes(updatedSnakes);
    });

    // Food regenerated
    this.socket.on('foodRegenerated', (food: any) => {
      const store = useGameStore.getState();
      const updatedFoods = store.foods.map(f => {
        if (f.id === food.id) {
          f.x = food.x;
          f.y = food.y;
          f.color = food.color;
        }
        return f;
      });
      store.updateFoods(updatedFoods);
    });

    // Score update
    this.socket.on('scoreUpdate', (data: { playerId: string; score: number }) => {
      if (data.playerId === this.playerId) {
        const store = useGameStore.getState();
        store.setGameState({ score: data.score });
      }
    });

    // Player died
    this.socket.on('playerDied', (data: { playerId: string; deadPoints: Point[] }) => {
      const store = useGameStore.getState();
      
      if (data.playerId === this.playerId) {
        // Current player died
        store.endGame(store.score, store.rank);
      } else {
        // Other player died
        const updatedSnakes = store.otherSnakes.filter(snake => snake.id !== data.playerId);
        store.updateOtherSnakes(updatedSnakes);
      }
      
      // Convert server deadPoints to client Point instances
      const deadPoints = data.deadPoints.map((p: any) => new Point(p.x, p.y, p.radius, p.color));
      store.addDeadPoints(deadPoints);
      store.setGameState({ playerCount: store.playerCount - 1 });
    });

    // Player respawned
    this.socket.on('playerRespawned', (player: ServerPlayer) => {
      const store = useGameStore.getState();
      
      if (player.id === this.playerId) {
        // Current player respawned
        const newSnake = this.convertServerPlayerToSnake(player);
        newSnake.ai = false;
        store.updateMySnake(newSnake);
        store.startGame();
      } else {
        // Other player respawned
        const newSnake = this.convertServerPlayerToSnake(player);
        store.updateOtherSnakes([...store.otherSnakes, newSnake]);
      }
      
      store.setGameState({ playerCount: store.playerCount + 1 });
    });

    // Player disconnected
    this.socket.on('playerDisconnected', (playerId: string) => {
      const store = useGameStore.getState();
      const updatedSnakes = store.otherSnakes.filter(snake => snake.id !== playerId);
      store.updateOtherSnakes(updatedSnakes);
      store.setGameState({ playerCount: store.playerCount - 1 });
    });

    // Game stats
    this.socket.on('gameStats', (data: { playerCount: number; foodCount: number }) => {
      const store = useGameStore.getState();
      store.setGameState({ playerCount: data.playerCount });
    });
  }

  private convertServerPlayerToSnake(player: ServerPlayer): Snake {
    const snake = new Snake(player.x, player.y, player.points.length, player.color, player.id);
    snake.points = player.points.map(p => new Point(p.x, p.y, p.radius, p.color));
    snake.angle = player.angle;
    snake.radius = player.radius;
    snake.speed = player.speed;
    snake.color = player.color;
    snake.isAlive = player.alive;
    snake.ai = true;
    return snake;
  }

  // Send player movement to server
  sendPlayerMove(snake: Snake): void {
    if (!this.socket || !this.isConnected || !this.playerId) return;
    
    const head = snake.getHead();
    this.socket.emit('playerMove', {
      playerId: this.playerId,
      x: head.x,
      y: head.y,
      angle: snake.angle,
      points: snake.points.map(p => ({ x: p.x, y: p.y, radius: p.radius, color: p.color }))
    });
  }

  // Send food eaten event
  sendFoodEaten(foodId: string): void {
    if (!this.socket || !this.isConnected || !this.playerId) return;
    
    this.socket.emit('foodEaten', {
      playerId: this.playerId,
      foodId: foodId
    });
  }

  // Send player death event
  sendPlayerDied(deadPoints: Point[]): void {
    if (!this.socket || !this.isConnected || !this.playerId) return;
    
    this.socket.emit('playerDied', {
      playerId: this.playerId,
      deadPoints: deadPoints.map(p => ({ x: p.x, y: p.y, radius: p.radius, color: p.color }))
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.playerId = null;
      this.isConnected = false;
    }
  }

  getPlayerId(): string | null {
    return this.playerId;
  }

  isSocketConnected(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
export const socketClient = new SocketClient();
export default socketClient;