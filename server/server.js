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

// Bot configuration
const MAX_BOTS = 20;

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

function createBot(id) {
  const bot = {
    id: id,
    socketId: null, // Bots don't have socket connections
    x: Math.random() * gameState.worldWidth,
    y: Math.random() * gameState.worldHeight,
    points: [],
    angle: Math.random() * Math.PI * 2,
    radius: 4,
    speed: 1.0, // Slightly slower than human players
    color: getRandomColor(),
    score: 0,
    alive: true,
    isBot: true
  };

  // Initialize bot with starting points
  for (let i = 0; i < 20; i++) {
    bot.points.push({
      x: bot.x - i * 2,
      y: bot.y,
      radius: bot.radius,
      color: getRandomColor()
    });
  }

  return bot;
}

function spawnBots(count = 5) {
  // Count current bots
  const currentBots = Array.from(gameState.players.values()).filter(p => p.isBot).length;
  const availableSlots = MAX_BOTS - currentBots;
  const botsToSpawn = Math.min(count, availableSlots);
  
  if (botsToSpawn <= 0) {
    console.log(`Bot limit reached (${MAX_BOTS}). Cannot spawn more bots.`);
    return;
  }
  
  for (let i = 0; i < botsToSpawn; i++) {
    const botId = `bot-${generatePlayerId()}`;
    const bot = createBot(botId);
    gameState.players.set(botId, bot); // Only add to players map
  }
  console.log(`Spawned ${botsToSpawn} bots (${currentBots + botsToSpawn}/${MAX_BOTS} total)`);
}

// Helper function for collision detection (same logic as client-side)
function isCollided(circle1, circle2) {
  const distance = Math.hypot(circle1.x - circle2.x, circle1.y - circle2.y);
  return distance < circle1.radius + circle2.radius;
}

// Handle bot death - convert body to dead points and remove from game
function handleBotDeath(bot) {
  if (!bot.alive) return;
  
  bot.alive = false;
  
  // Convert bot's body points to dead points
  const deadPoints = bot.points.map(point => ({
    x: point.x,
    y: point.y,
    radius: point.radius,
    color: point.color
  }));
  
  // Add dead points to game state
  gameState.deadPoints.push(...deadPoints);
  
  // Remove bot from game state
  gameState.players.delete(bot.id);
  
  console.log(`Bot ${bot.id} died and was removed from arena`);
  
  // Broadcast bot death and dead points
  io.emit('playerDied', {
    playerId: bot.id,
    deadPoints: deadPoints
  });
  
  // Broadcast bot removal
  io.emit('playerDisconnected', bot.id);
  
  // Update leaderboard after bot removal
  const leaderboard = generateLeaderboard();
  io.emit('leaderboardUpdate', {
    leaderboard: leaderboard
  });
}

function updateBots() {
  // Iterate over all players and filter for bots
  gameState.players.forEach((player) => {
    if (!player.isBot || !player.alive) return;

    // Simple AI movement - change direction occasionally
    if (Math.random() < 0.02) {
      player.angle += (Math.random() - 0.5) * 0.5;
    }

    // Move bot
    const newX = player.x + Math.cos(player.angle) * player.speed;
    const newY = player.y + Math.sin(player.angle) * player.speed;

    // Check boundary collision - bot dies if touching boundaries
    if (newX < player.radius || newX > gameState.worldWidth - player.radius ||
        newY < player.radius || newY > gameState.worldHeight - player.radius) {
      // Bot dies from boundary collision
      handleBotDeath(player);
      return;
    }

    player.x = newX;
    player.y = newY;

    // Check collision with other players/bots before updating position
    const botHead = { x: player.x, y: player.y, radius: player.radius };
    let collisionDetected = false;
    
    // Check collision with all other players (both human and bot)
    gameState.players.forEach((otherPlayer) => {
      if (otherPlayer.id === player.id || !otherPlayer.alive || collisionDetected) return;
      
      // Check collision with other player's body points
      for (const point of otherPlayer.points) {
        if (isCollided(botHead, point)) {
          handleBotDeath(player);
          collisionDetected = true;
          return;
        }
      }
    });
    
    if (collisionDetected) return;

    // Update bot points (simple snake movement)
    if (player.points.length > 0) {
      // Move each point to the position of the point in front of it
      for (let i = player.points.length - 1; i > 0; i--) {
        player.points[i].x = player.points[i - 1].x;
        player.points[i].y = player.points[i - 1].y;
      }
      // Update head position
      player.points[0].x = player.x;
      player.points[0].y = player.y;
    }

    // Bot collision detection with food (reuse botHead from collision detection above)
    for (let i = 0; i < gameState.foods.length; i++) {
      const food = gameState.foods[i];
      if (isCollided(botHead, food)) {
        // Bot eats food - same logic as human players
        player.score++;
        
        // Add new point to bot's body
        if (player.points.length > 0) {
          const tail = player.points[player.points.length - 1];
          player.points.push({
            x: tail.x,
            y: tail.y,
            radius: player.radius,
            color: food.color
          });
        }
        
        // Regenerate food
        food.x = Math.random() * gameState.worldWidth;
        food.y = Math.random() * gameState.worldHeight;
        food.color = getRandomColor();
        
        // Broadcast food regeneration to all players
        io.emit('foodRegenerated', food);
        
        // Broadcast score update
        io.emit('scoreUpdate', {
          playerId: player.id,
          score: Math.round(player.score * 10) / 10
        });
        
        // Broadcast updated leaderboard
        const leaderboard = generateLeaderboard();
        io.emit('leaderboardUpdate', {
          leaderboard: leaderboard
        });
        
        break; // Only eat one food per update cycle
      }
    }

    // Bot collision detection with dead points
    for (let i = gameState.deadPoints.length - 1; i >= 0; i--) {
      const deadPoint = gameState.deadPoints[i];
      if (isCollided(botHead, deadPoint)) {
        // Bot eats dead point - award 1 point per dead snake
        player.score += 1;
        
        // Add new point to bot's body
        if (player.points.length > 0) {
          const tail = player.points[player.points.length - 1];
          player.points.push({
            x: tail.x,
            y: tail.y,
            radius: player.radius,
            color: deadPoint.color
          });
        }
        
        // Remove consumed dead point
        gameState.deadPoints.splice(i, 1);
        
        // Broadcast score update
        io.emit('scoreUpdate', {
          playerId: player.id,
          score: Math.round(player.score * 10) / 10
        });
        
        // Broadcast updated leaderboard
        const leaderboard = generateLeaderboard();
        io.emit('leaderboardUpdate', {
          leaderboard: leaderboard
        });
        
        break; // Only eat one dead point per update cycle
      }
    }
  });
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

  // Automatically spawn 5 bots when a user connects (if not already present)
  const humanPlayers = Array.from(gameState.players.values()).filter(p => !p.isBot);
  if (humanPlayers.length === 1) { // First human player
    spawnBots(5);
  }

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

  // Send initial leaderboard to new player
  const initialLeaderboard = generateLeaderboard();
  socket.emit('leaderboardUpdate', {
    leaderboard: initialLeaderboard
  });

  // Broadcast new player to all other players
  socket.broadcast.emit('playerJoined', newPlayer);
  
  // Broadcast updated leaderboard to all players
  const updatedLeaderboard = generateLeaderboard();
  io.emit('leaderboardUpdate', {
    leaderboard: updatedLeaderboard
  });

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
        score: Math.round(player.score * 10) / 10
      });
      
      // Broadcast updated leaderboard
      const leaderboard = generateLeaderboard();
      io.emit('leaderboardUpdate', {
        leaderboard: leaderboard
      });
    }
  });

  // Handle dead point consumption
  socket.on('deadPointEaten', (data) => {
    const { playerId, deadPoints } = data;
    const player = gameState.players.get(playerId);
    
    if (player && deadPoints && deadPoints.length > 0) {
      // Remove consumed dead points from game state
      deadPoints.forEach(consumedPoint => {
        const index = gameState.deadPoints.findIndex(dp => 
          Math.abs(dp.x - consumedPoint.x) < 1 && 
          Math.abs(dp.y - consumedPoint.y) < 1 &&
          dp.color === consumedPoint.color
        );
        if (index !== -1) {
          gameState.deadPoints.splice(index, 1);
        }
      });
      
      // Update player score - award 1 point per dead snake consumed
      player.score += 1;
      
      // Broadcast dead point removal to all clients
      io.emit('deadPointsRemoved', {
        deadPoints: deadPoints
      });
      
      // Broadcast score update
      io.emit('scoreUpdate', {
        playerId: playerId,
        score: player.score
      });
      
      // Broadcast updated leaderboard
      const leaderboard = generateLeaderboard();
      io.emit('leaderboardUpdate', {
        leaderboard: leaderboard
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
      
      // Only respawn human players, remove bots from arena
      if (player.isBot) {
        // Remove bot from game state completely
        gameState.players.delete(data.playerId);
        console.log(`Bot ${data.playerId} died and was removed from arena`);
        
        // Broadcast bot removal
        io.emit('playerDisconnected', data.playerId);
        
        // Update leaderboard after bot removal
        const leaderboard = generateLeaderboard();
        io.emit('leaderboardUpdate', {
          leaderboard: leaderboard
        });
      } else {
        // Respawn human player after 3 seconds
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
    }
  });

  // Handle request for minimum players
  socket.on('requestMinimumPlayers', (data) => {
    const { minPlayers } = data;
    const currentPlayerCount = gameState.players.size;
    const currentBots = Array.from(gameState.players.values()).filter(p => p.isBot).length;
    
    if (currentPlayerCount < minPlayers) {
      const botsNeeded = minPlayers - currentPlayerCount;
      const maxBotsAllowed = Math.min(botsNeeded, MAX_BOTS - currentBots);
      
      if (maxBotsAllowed > 0) {
        spawnBots(maxBotsAllowed);
      } else {
        console.log(`Cannot add more bots. Current: ${currentBots}/${MAX_BOTS}`);
      }
      
      // Broadcast updated game state to all players
      io.emit('gameStats', {
        playerCount: gameState.players.size,
        foodCount: gameState.foods.length
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    
    // Find and remove player (only human players, keep bots)
    let disconnectedPlayerId = null;
    for (const [playerId, player] of gameState.players.entries()) {
      if (player.socketId === socket.id && !player.isBot) {
        disconnectedPlayerId = playerId;
      }
    }
    if (disconnectedPlayerId) {
      gameState.players.delete(disconnectedPlayerId);
      io.emit('playerDisconnected', disconnectedPlayerId);
      socket.broadcast.emit('playerLeft', {
        playerId: disconnectedPlayerId
      });
      
      // Broadcast updated leaderboard after player leaves
      const leaderboard = generateLeaderboard();
      io.emit('leaderboardUpdate', {
        leaderboard: leaderboard
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

// Update bots continuously
setInterval(() => {
  updateBots();
  
  // Broadcast bot movements to all players
  gameState.players.forEach((player) => {
    if (player.isBot && player.alive) {
      io.emit('playerMoved', {
        playerId: player.id,
        x: player.x,
        y: player.y,
        angle: player.angle,
        points: player.points
      });
    }
  });
}, 100); // Update bots every 100ms

// Generate leaderboard data
function generateLeaderboard() {
  const players = Array.from(gameState.players.values())
    .filter(player => player.alive)
    .sort((a, b) => b.score - a.score)
    .map((player, index) => ({
      id: player.id,
      name: player.isBot ? `Guest ${player.id.replace('bot-', '')}` : player.id,
      score: Math.round(player.score * 10) / 10, // Round to 1 decimal place
      rank: index + 1,
      isBot: player.isBot || false,
      isCurrentPlayer: false // Will be set on client side
    }));
  
  return players;
}

// Send periodic game state updates
setInterval(() => {
  const playerCount = gameState.players.size;
  const leaderboard = generateLeaderboard();
  
  io.emit('gameStats', {
    playerCount: playerCount,
    foodCount: gameState.foods.length,
    leaderboard: leaderboard
  });
}, 5000);

// Send leaderboard updates more frequently
setInterval(() => {
  const leaderboard = generateLeaderboard();
  io.emit('leaderboardUpdate', {
    leaderboard: leaderboard
  });
}, 1000);

const PORT = process.env.PORT || 9000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Game available at http://localhost:${PORT}`);
});