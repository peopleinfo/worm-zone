import { io, Socket } from 'socket.io-client';
import { Snake } from '../game/Snake';
import { Food } from '../game/Food';
import { Point } from '../game/Point';
import { useGameStore } from '../stores/gameStore';
import { useAuthStore } from '../stores/authStore';

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

  connect(serverUrl: string = import.meta.env.VITE_SOCKET_SERVER_URL): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      // Get current auth state for socket handshake
      const authState = useAuthStore.getState();
      const { token, openId, userInfo, isLoggedIn } = authState;
      
      console.log('🔌 Connecting to socket with auth:', {
        hasToken: !!token,
        isLoggedIn,
        hasUserInfo: !!userInfo,
        serverUrl: serverUrl
      });

      try {
        this.socket = io(serverUrl, {
          auth: {
            token: token || null,
            userData: {
              openId,
              userInfo,
              isLoggedIn
            }
          },
          transports: ['websocket', 'polling'],
          timeout: 5000,
          upgrade: false,
          rememberUpgrade: false
        });

        this.socket.on('connect', () => {
          console.log('✅ Connected to server with socket ID:', this.socket?.id);
          this.isConnected = true;
          this.setupEventListeners();
          this.initializeGame();
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ Connection error:', error);
          this.isConnected = false;
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('🔌 Disconnected from server:', reason);
          this.isConnected = false;
        });

        // Handle authentication errors
        this.socket.on('auth_error', (error) => {
          console.error('🔐 Authentication error:', error);
          // Could trigger a re-login flow here if needed
          // For now, we'll continue as guest user
        });

        // Handle authentication success
        this.socket.on('auth_success', (data) => {
          console.log('🔐 Authentication successful:', data);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  // Initialize game with user data
  private initializeGame(): void {
    if (!this.socket || !this.isConnected) return;
    
    // Get user data from auth store
    const authState = useAuthStore.getState();
    const userData = {
      userInfo: authState.userInfo,
      openId: authState.openId,
      isLoggedIn: authState.isLoggedIn
    };
    
    console.log('Sending game init with user data:', userData);
    this.socket.emit('gameInit', userData);
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Remove all existing listeners to prevent duplicates
    this.socket.removeAllListeners();

    // Game initialization
    this.socket.on('gameInit', (data: GameInitData) => {
      console.log('Game initialized:', data);
      this.playerId = data.playerId;
      
      const store = useGameStore.getState();
      
      // Set current player ID
      store.setCurrentPlayerId(data.playerId);
      
      // Find current player in server data and create their snake
      const currentPlayerData = data.gameState.players.find(p => p.id === this.playerId);
      if (currentPlayerData) {
        console.log('🐍 Creating current player snake from server data:', currentPlayerData);
        const currentPlayerSnake = this.convertServerPlayerToSnake(currentPlayerData);
        currentPlayerSnake.ai = false; // Mark as human player
        store.updateMySnake(currentPlayerSnake);
        console.log('✅ Current player snake created at position:', currentPlayerData.x, currentPlayerData.y);
      }
      
      // Convert other server players to client snakes
      const otherSnakes = data.gameState.players
        .filter(p => p.id !== this.playerId)
        .map(p => this.convertServerPlayerToSnake(p));
      
      // Convert server foods to client foods
      const foods = data.gameState.foods.map(f => {
        const food = new Food(f.id, f.x, f.y, f.radius, f.color);
        return food;
      });
      
      store.updateOtherSnakes(otherSnakes);
      store.updateFoods(foods);
      // Convert server deadPoints to client Point instances
      const deadPoints = data.gameState.deadPoints.map((p: any) => Point.create(p.x, p.y, p.radius, p.color));
      store.addDeadPoints(deadPoints);
      store.setGameState({ 
        mode: 'multiplayer',
        playerCount: data.gameState.players.length 
      });
    });

    // Player joined
    this.socket.on('playerJoined', (player: ServerPlayer) => {
      // console.log('Player joined:', player);
      const store = useGameStore.getState();
      const newSnake = this.convertServerPlayerToSnake(player);
      store.updateOtherSnakes([...store.otherSnakes, newSnake]);
      store.setGameState({ playerCount: store.playerCount + 1 });
    });

    // Player moved
    this.socket.on('playerMoved', (data: any) => {
      const store = useGameStore.getState();
      
      // Don't process player movements if the game is over
      if (store.isGameOver) {
        console.log('🚫 Ignoring playerMoved - game is over');
        return;
      }
      
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
      
      // Don't process food regeneration if the game is over
      if (store.isGameOver) {
        console.log('🚫 Ignoring foodRegenerated - game is over');
        return;
      }
      
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
      // console.log('🎯 scoreUpdate received:', data);
      if (data.playerId === this.playerId) {
        const store = useGameStore.getState();
        
        // Don't process score updates if the game is over
        if (store.isGameOver) {
          console.log('🚫 Ignoring scoreUpdate - game is over');
          return;
        }
        
        console.log('🎯 Current player scoreUpdate - before:', store.score, 'after:', data.score);
        store.setGameState({ score: data.score });
        console.log('🎯 Score updated in store:', store.score);
      }
    });

    // Player died
    this.socket.on('playerDied', (data: { playerId: string; deadPoints: Point[] }) => {
      const store = useGameStore.getState();
      
      if (data.playerId === this.playerId) {
        // Find the current player in the leaderboard
        const currentPlayer = store.leaderboard.find(p => p.isCurrentPlayer);
        // Use the leaderboard score if available, otherwise fallback to store.score
        const finalScore = currentPlayer ? currentPlayer.score : store.score;
        
        console.log('💀 Current player died - store score:', store.score, 'leaderboard score:', currentPlayer?.score, 'final score:', finalScore);
        
        // Find current player's rank from leaderboard
        const currentRank = store.leaderboard.find(p => p.isCurrentPlayer)?.rank || store.rank;
        console.log('💀 Calling endGame with score:', finalScore, 'rank:', currentRank);
        store.endGame(finalScore, currentRank);
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
        // Current player respawned - prepare snake but don't auto-start
        const newSnake = this.convertServerPlayerToSnake(player);
        newSnake.ai = false;
        store.updateMySnake(newSnake);
        // Remove automatic game start - let user manually restart via GameOverModal
        // store.startGame();
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
    this.socket.on('gameStats', (data) => {
      const store = useGameStore.getState();
      
      // Don't process game stats if the game is over
      if (store.isGameOver) {
        console.log('🚫 Ignoring gameStats - game is over');
        return;
      }
      
      store.setGameState({ playerCount: data.playerCount });
      
      // Update leaderboard if provided
      if (data.leaderboard) {
        const leaderboard = data.leaderboard.map((player: any) => ({
          ...player,
          isCurrentPlayer: player.id === store.currentPlayerId
        }));
        store.updateLeaderboard(leaderboard);
      }
    });
    
    // Leaderboard updates
    this.socket.on('leaderboardUpdate', (data: any) => {
      const store = useGameStore.getState();
      
      // Don't process leaderboard updates if the game is over
      if (store.isGameOver) {
        // console.log('🚫 Ignoring leaderboard update - game is over');
        return;
      }
      
      const leaderboard = data.leaderboard.map((player: any) => ({
        ...player,
        isCurrentPlayer: player.id === store.currentPlayerId
      }));
      
      // Check if current player is in the top 10 leaderboard
      let currentPlayer = leaderboard.find((p: any) => p.isCurrentPlayer);
      
      // If current player is not in top 10, find them in the full leaderboard
      if (!currentPlayer && data.fullLeaderboard) {
        const fullLeaderboardPlayer = data.fullLeaderboard.find((player: any) => player.id === store.currentPlayerId);
        if (fullLeaderboardPlayer) {
          currentPlayer = {
            ...fullLeaderboardPlayer,
            isCurrentPlayer: true
          };
        }
      }
      
      // Store both leaderboards for the Leaderboard component to use
      store.updateLeaderboard(leaderboard);
      if (data.fullLeaderboard) {
        store.updateFullLeaderboard(data.fullLeaderboard);
      }
      
      // Update current player's rank and score
      if (currentPlayer) {
        // console.log('📊 leaderboardUpdate - current player score:', currentPlayer.score, 'rank:', currentPlayer.rank);
        store.setGameState({ 
          rank: currentPlayer.rank,
          score: currentPlayer.score
        });
        // console.log('📊 Updated store score from leaderboard:', store.score);
      }
    });

    // Dead points removed (server broadcast)
    this.socket.on('deadPointsRemoved', (data: { deadPoints: Point[] }) => {
      const store = useGameStore.getState();
      
      // Don't process dead points removal if the game is over
      if (store.isGameOver) {
        console.log('🚫 Ignoring deadPointsRemoved - game is over');
        return;
      }
      
      // Remove dead points from local state to maintain synchronization
      store.removeDeadPoints(data.deadPoints);
    });
  }

  private convertServerPlayerToSnake(player: ServerPlayer): Snake {
    const snake = new Snake(player.x, player.y, player.points.length, player.color, player.id);
    snake.points = player.points.map(p => Point.create(p.x, p.y, p.radius, p.color));
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
    
    try {
      const head = snake.getHead();
      if (!head) {
        console.warn('Cannot send player move: snake head is null');
        return;
      }
      
      this.socket.emit('playerMove', {
        playerId: this.playerId,
        x: head.x,
        y: head.y,
        angle: snake.angle,
        points: snake.points.map(p => ({ x: p.x, y: p.y, radius: p.radius, color: p.color }))
      });
    } catch (error) {
      console.error('Error sending player movement:', error);
      // Attempt to reconnect if socket is disconnected
      if (!this.socket?.connected) {
        this.isConnected = false;
      }
    }
  }

  // Send food eaten event
  sendFoodEaten(foodId: string): void {
    if (!this.socket || !this.isConnected || !this.playerId) return;
    
    try {
      this.socket.emit('foodEaten', {
        playerId: this.playerId,
        foodId: foodId
      });
    } catch (error) {
      console.error('Error sending food eaten event:', error);
      if (!this.socket?.connected) {
        this.isConnected = false;
      }
    }
  }

  // Send player death event
  sendPlayerDied(deadPoints: Point[]): void {
    if (!this.socket || !this.isConnected || !this.playerId) return;
    
    try {
      this.socket.emit('playerDied', {
        playerId: this.playerId,
        deadPoints: deadPoints.map(p => ({ x: p.x, y: p.y, radius: p.radius, color: p.color }))
      });
    } catch (error) {
      console.error('Error sending player death event:', error);
      if (!this.socket?.connected) {
        this.isConnected = false;
      }
    }
  }

  // Send dead point eaten event
  sendDeadPointEaten(deadPoints: Point[]): void {
    if (!this.socket || !this.isConnected || !this.playerId) return;
    
    try {
      this.socket.emit('deadPointEaten', {
        playerId: this.playerId,
        deadPoints: deadPoints.map(p => ({ x: p.x, y: p.y, radius: p.radius, color: p.color }))
      });
    } catch (error) {
      console.error('Error sending dead point eaten event:', error);
      if (!this.socket?.connected) {
        this.isConnected = false;
      }
    }
  }

  // Leave the current game room
  leaveRoom(): void {
    if (!this.socket || !this.isConnected || !this.playerId) {
      console.warn('Cannot leave room: socket not connected or no player ID');
      return;
    }
    
    try {
      // console.log('🚪 Leaving game room for player:', this.playerId);
      this.socket.emit('leaveRoom', {
        playerId: this.playerId
      });
      // console.log('✅ Successfully sent leaveRoom event');
      
      // Disconnect socket completely after a short delay
      setTimeout(() => {
        // console.log('🔌 Disconnecting socket completely');
        this.disconnect();
      }, 100);
    } catch (error) {
      console.error('❌ Error leaving room:', error);
      // Disconnect even on error to ensure clean state
      this.disconnect();
    }
  }

  disconnect(): void {
    if (this.socket) {
      // Remove all event listeners before disconnecting
      this.socket.removeAllListeners();
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

  // Request minimum players (server should add bots if needed)
  requestMinimumPlayers(minPlayers: number): void {
    if (!this.socket || !this.isConnected) return;
    
    this.socket.emit('requestMinimumPlayers', {
      minPlayers: minPlayers
    });
  }
}

// Export singleton instance
export const socketClient = new SocketClient();
export default socketClient;