const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files
// app.use(express.static(path.join(__dirname)));

// Game state
const gameState = {
  players: new Map(),
  foods: [],
  deadPoints: [],
  maxFoods: 1000,
  worldWidth: 2000,
  worldHeight: 2000
};

// Initialize food
function initializeFoods() {
  gameState.foods = [];
  for (let i = 0; i < gameState.maxFoods; i++) {
    gameState.foods.push({
      id: i,
      x: Math.random() * gameState.worldWidth,
      y: Math.random() * gameState.worldHeight,
      radius: 5,
      color: getRandomColor()
    });
  }
}

function getRandomColor() {
  const colors = ['red', 'green', 'blue', 'white', 'yellow', 'orange', 'purple', 'lightgreen', 'grey'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function generatePlayerId() {
  return Math.random().toString(36).substr(2, 9);
}

// Initialize game
initializeFoods();

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Create new player
  const playerId = generatePlayerId();
  const newPlayer = {
    id: playerId,
    socketId: socket.id,
    x: Math.random() * gameState.worldWidth,
    y: Math.random() * gameState.worldHeight,
    points: [],
    angle: 0,
    radius: 4,
    speed: 1.3,
    color: getRandomColor(),
    score: 0,
    alive: true
  };

  // Initialize player with starting points
  for (let i = 0; i < 25; i++) {
    newPlayer.points.push({
      x: newPlayer.x - i * 2,
      y: newPlayer.y,
      radius: newPlayer.radius,
      color: getRandomColor()
    });
  }

  gameState.players.set(playerId, newPlayer);

  // Send initial game state to new player
  socket.emit('gameInit', {
    playerId: playerId,
    gameState: {
      players: Array.from(gameState.players.values()),
      foods: gameState.foods,
      deadPoints: gameState.deadPoints,
      worldWidth: gameState.worldWidth,
      worldHeight: gameState.worldHeight
    }
  });

  // Broadcast new player to all other players
  socket.broadcast.emit('playerJoined', newPlayer);

  // Handle player movement
  socket.on('playerMove', (data) => {
    const player = gameState.players.get(data.playerId);
    if (player && player.alive) {
      player.angle = data.angle;
      player.x = data.x;
      player.y = data.y;
      player.points = data.points;
      
      // Broadcast movement to all other players
      socket.broadcast.emit('playerMoved', {
        playerId: data.playerId,
        x: data.x,
        y: data.y,
        angle: data.angle,
        points: data.points
      });
    }
  });

  // Handle food consumption
  socket.on('foodEaten', (data) => {
    const { playerId, foodId } = data;
    const player = gameState.players.get(playerId);
    const food = gameState.foods.find(f => f.id === foodId);
    
    if (player && food) {
      // Regenerate food
      food.x = Math.random() * gameState.worldWidth;
      food.y = Math.random() * gameState.worldHeight;
      food.color = getRandomColor();
      
      player.score++;
      
      // Broadcast food regeneration to all players
      io.emit('foodRegenerated', food);
      
      // Broadcast score update
      io.emit('scoreUpdate', {
        playerId: playerId,
        score: player.score
      });
    }
  });

  // Handle player death
  socket.on('playerDied', (data) => {
    const player = gameState.players.get(data.playerId);
    if (player) {
      player.alive = false;
      
      // Add dead points to game state
      const deadPoints = data.deadPoints;
      gameState.deadPoints.push(...deadPoints);
      
      // Broadcast player death and dead points
      io.emit('playerDied', {
        playerId: data.playerId,
        deadPoints: deadPoints
      });
      
      // Respawn player after 3 seconds
      setTimeout(() => {
        if (gameState.players.has(data.playerId)) {
          const respawnedPlayer = {
            ...player,
            x: Math.random() * gameState.worldWidth,
            y: Math.random() * gameState.worldHeight,
            points: [],
            alive: true,
            score: 0
          };
          
          // Initialize respawned player with starting points
          for (let i = 0; i < 25; i++) {
            respawnedPlayer.points.push({
              x: respawnedPlayer.x - i * 2,
              y: respawnedPlayer.y,
              radius: respawnedPlayer.radius,
              color: getRandomColor()
            });
          }
          
          gameState.players.set(data.playerId, respawnedPlayer);
          
          // Broadcast respawn
          io.emit('playerRespawned', respawnedPlayer);
        }
      }, 3000);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    
    // Find and remove player
    let disconnectedPlayerId = null;
    for (const [playerId, player] of gameState.players.entries()) {
      if (player.socketId === socket.id) {
        disconnectedPlayerId = playerId;
      }
    }
    if (disconnectedPlayerId) {
      gameState.players.delete(disconnectedPlayerId);
      io.emit('playerDisconnected', disconnectedPlayerId);
      socket.broadcast.emit('playerLeft', {
        playerId: disconnectedPlayerId
      });
    }
  });
});


// Clean up dead points periodically
setInterval(() => {
  if (gameState.deadPoints.length > 5000) {
    gameState.deadPoints = gameState.deadPoints.slice(-2500);
  }
}, 30000);

// Send periodic game state updates
setInterval(() => {
  const playerCount = gameState.players.size;
  io.emit('gameStats', {
    playerCount: playerCount,
    foodCount: gameState.foods.length
  });
}, 5000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Game available at http://localhost:${PORT}`);
});