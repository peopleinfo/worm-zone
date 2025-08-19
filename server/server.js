const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Token validation utility
function validateToken(token) {
  if (!token) {
    return { valid: false, reason: 'No token provided' };
  }
  
  // Basic token format validation
  if (typeof token !== 'string' || token.length < 10) {
    return { valid: false, reason: 'Invalid token format' };
  }
  
  // For now, we'll accept any properly formatted token
  // In production, you would validate against your auth service
  return { valid: true, token };
}

// Socket authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const userData = socket.handshake.auth.userData;
  
  console.log('🔐 Socket authentication attempt:', {
    socketId: socket.id,
    hasToken: !!token,
    hasUserData: !!userData,
    isLoggedIn: userData?.isLoggedIn
  });
  
  if (token) {
    const validation = validateToken(token);
    if (validation.valid) {
      // Store authenticated user info in socket data
      socket.data.isAuthenticated = true;
      socket.data.token = token;
      socket.data.userData = userData;
      socket.data.openId = userData?.openId;
      socket.data.userInfo = userData?.userInfo;
      console.log('✅ Socket authenticated successfully:', socket.id);
      
      // Emit authentication success after connection
      socket.on('connect', () => {
        socket.emit('auth_success', {
          authenticated: true,
          openId: userData?.openId,
          userInfo: userData?.userInfo
        });
      });
    } else {
      console.log('❌ Token validation failed:', validation.reason);
      // Allow connection but mark as unauthenticated
      socket.data.isAuthenticated = false;
      
      // Emit authentication error after connection
      socket.on('connect', () => {
        socket.emit('auth_error', {
          error: 'Token validation failed',
          reason: validation.reason
        });
      });
    }
  } else {
    // Allow guest connections
    socket.data.isAuthenticated = false;
    console.log('👤 Guest connection allowed:', socket.id);
  }
  
  next(); // Always allow connection, but track auth status
});

// Bot configuration
const MAX_BOTS = 20;

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
  console.log(`🍎 Initializing ${gameState.maxFoods} food items in ${gameState.worldWidth}x${gameState.worldHeight} world...`);
  
  for (let i = 0; i < gameState.maxFoods; i++) {
    const food = {
      id: i,
      x: Math.random() * gameState.worldWidth,
      y: Math.random() * gameState.worldHeight,
      radius: 5,
      color: getRandomColor()
    };
    gameState.foods.push(food);
    
    if (i < 5) { // Log first 5 food positions for debugging
      console.log(`🍎 Food ${i}: position (${food.x.toFixed(2)}, ${food.y.toFixed(2)}) color: ${food.color}`);
    }
  }
  
  console.log(`🍎 Food initialization complete: ${gameState.foods.length} foods spawned`);
}

function getRandomColor() {
  const colors = ['red', 'green', 'blue', 'white', 'yellow', 'orange', 'purple', 'lightgreen', 'grey'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Generate random player ID (for guests/fallback)
function generatePlayerId() {
  return Math.random().toString(36).substr(2, 9);
}

// Get real user ID from openId
function getRealUserId(openId) {
  return openId || null;
}

// Safe spawn zones across the map - completely redesigned for proper distribution
function getSpawnZones() {
  const margin = 120; // Increased minimum distance from edges
  const zoneSize = 180; // Increased size of each spawn zone
  const zones = [];
  
  // Create 16 spawn zones distributed across the map in a 4x4 grid
  const cols = 4;
  const rows = 4;
  
  // Calculate available space for zones
  const availableWidth = gameState.worldWidth - (2 * margin);
  const availableHeight = gameState.worldHeight - (2 * margin);
  
  // Calculate spacing between zone centers
  const colSpacing = availableWidth / (cols - 1);
  const rowSpacing = availableHeight / (rows - 1);
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Proper distribution calculation
      const x = margin + (col * colSpacing);
      const y = margin + (row * rowSpacing);
      
      // Add some randomization to prevent perfect grid alignment
      const randomOffsetX = (Math.random() - 0.5) * 40; // ±20px random offset
      const randomOffsetY = (Math.random() - 0.5) * 40; // ±20px random offset
      
      const finalX = Math.max(margin, Math.min(gameState.worldWidth - margin, x + randomOffsetX));
      const finalY = Math.max(margin, Math.min(gameState.worldHeight - margin, y + randomOffsetY));
      
      zones.push({ x: finalX, y: finalY, size: zoneSize });
    }
  }
  
  // Validate zone distribution
  const minX = Math.min(...zones.map(z => z.x));
  const maxX = Math.max(...zones.map(z => z.x));
  const minY = Math.min(...zones.map(z => z.y));
  const maxY = Math.max(...zones.map(z => z.y));
  
  console.log(`🎯 DEBUG: Generated ${zones.length} spawn zones with proper distribution:`);
  console.log(`🎯 DEBUG: X range: ${minX.toFixed(0)} - ${maxX.toFixed(0)} (spread: ${(maxX - minX).toFixed(0)}px)`);
  console.log(`🎯 DEBUG: Y range: ${minY.toFixed(0)} - ${maxY.toFixed(0)} (spread: ${(maxY - minY).toFixed(0)}px)`);
  console.log(`🎯 DEBUG: Zone positions:`, zones.map((z, i) => `Zone${i}: (${z.x.toFixed(0)}, ${z.y.toFixed(0)})`).join(', '));
  
  return zones;
}

// Check if position is safe (no collision with existing worms) - enhanced safety checks
function isPositionSafe(x, y, radius, minDistance = 150) {
  const alivePlayers = Array.from(gameState.players.values()).filter(p => p.alive);
  console.log(`🔍 DEBUG: Checking position safety at (${x.toFixed(2)}, ${y.toFixed(2)}) with ${alivePlayers.length} alive players, minDistance: ${minDistance}px`);
  
  // Check boundaries with extra buffer
  const boundaryBuffer = 50;
  if (x < boundaryBuffer || x > gameState.worldWidth - boundaryBuffer || 
      y < boundaryBuffer || y > gameState.worldHeight - boundaryBuffer) {
    console.log(`❌ DEBUG: Position unsafe - too close to boundaries`);
    return false;
  }
  
  for (const [playerId, player] of gameState.players.entries()) {
    if (!player.alive) continue;
    
    // Check distance from player head with increased safety margin
    const distance = Math.hypot(x - player.x, y - player.y);
    const requiredDistance = minDistance + radius + player.radius;
    if (distance < requiredDistance) {
      console.log(`❌ DEBUG: Position unsafe - too close to player ${playerId} head (distance: ${distance.toFixed(2)}, required: ${requiredDistance.toFixed(2)})`);
      return false;
    }
    
    // Check distance from player body points with enhanced safety
    for (const point of player.points) {
      const pointDistance = Math.hypot(x - point.x, y - point.y);
      const requiredPointDistance = minDistance + radius + point.radius;
      if (pointDistance < requiredPointDistance) {
        console.log(`❌ DEBUG: Position unsafe - too close to player ${playerId} body (distance: ${pointDistance.toFixed(2)}, required: ${requiredPointDistance.toFixed(2)})`);
        return false;
      }
    }
  }
  
  // Check distance from dead points to avoid spawning on food
  for (const deadPoint of gameState.deadPoints) {
    const deadDistance = Math.hypot(x - deadPoint.x, y - deadPoint.y);
    if (deadDistance < 30 + radius) {
      console.log(`❌ DEBUG: Position unsafe - too close to dead point (distance: ${deadDistance.toFixed(2)})`);
      return false;
    }
  }
  
  console.log(`✅ DEBUG: Position is safe at (${x.toFixed(2)}, ${y.toFixed(2)})`);
  return true;
}

// Find safe spawn position - enhanced with better distribution and emergency fallback
function findSafeSpawnPosition(radius) {
  console.log(`🎯 DEBUG: Finding safe spawn position for radius ${radius}`);
  const spawnZones = getSpawnZones();
  const maxZoneAttempts = 30; // Reduced per-zone attempts
  const maxFallbackAttempts = 100; // Increased fallback attempts
  
  // Prioritize zones with fewer nearby players for better distribution
  const zonesWithPlayerCount = spawnZones.map(zone => {
    const nearbyPlayers = Array.from(gameState.players.values())
      .filter(p => p.alive)
      .filter(p => Math.hypot(p.x - zone.x, p.y - zone.y) < 300).length;
    return { zone, nearbyPlayers, index: spawnZones.indexOf(zone) };
  });
  
  // Sort zones by player count (fewer players = higher priority)
  zonesWithPlayerCount.sort((a, b) => a.nearbyPlayers - b.nearbyPlayers);
  
  console.log(`🎯 DEBUG: Zone priority order:`, zonesWithPlayerCount.map(z => 
    `Zone${z.index}(${z.zone.x.toFixed(0)},${z.zone.y.toFixed(0)}):${z.nearbyPlayers}players`
  ).join(', '));
  
  // Try each zone in priority order
  for (const zoneData of zonesWithPlayerCount) {
    const { zone, index } = zoneData;
    console.log(`🎯 DEBUG: Trying spawn zone ${index} at center (${zone.x.toFixed(0)}, ${zone.y.toFixed(0)}) with ${zoneData.nearbyPlayers} nearby players`);
    
    for (let attempt = 0; attempt < maxZoneAttempts; attempt++) {
      // Random position within the zone with better distribution
      const offsetX = (Math.random() - 0.5) * zone.size * 0.8; // Use 80% of zone size
      const offsetY = (Math.random() - 0.5) * zone.size * 0.8;
      const x = zone.x + offsetX;
      const y = zone.y + offsetY;
      
      // Ensure position is within world bounds with proper margins
      const margin = 60;
      const clampedX = Math.max(margin, Math.min(gameState.worldWidth - margin, x));
      const clampedY = Math.max(margin, Math.min(gameState.worldHeight - margin, y));
      
      if (isPositionSafe(clampedX, clampedY, radius)) {
        console.log(`✅ DEBUG: Found safe position in zone ${index} at (${clampedX.toFixed(2)}, ${clampedY.toFixed(2)}) after ${attempt + 1} attempts`);
        return { x: clampedX, y: clampedY };
      }
    }
    console.log(`❌ DEBUG: Zone ${index} failed after ${maxZoneAttempts} attempts`);
  }
  
  console.log(`⚠️ DEBUG: All zones failed, trying enhanced fallback positions`);
  // Enhanced fallback: try scattered positions across the entire map
  for (let attempt = 0; attempt < maxFallbackAttempts; attempt++) {
    const margin = 80;
    const x = margin + Math.random() * (gameState.worldWidth - 2 * margin);
    const y = margin + Math.random() * (gameState.worldHeight - 2 * margin);
    
    if (isPositionSafe(x, y, radius, 100)) { // Reduced safety distance for fallback
      console.log(`✅ DEBUG: Found safe fallback position at (${x.toFixed(2)}, ${y.toFixed(2)}) after ${attempt + 1} attempts`);
      return { x, y };
    }
  }
  
  console.log(`🚨 DEBUG: Enhanced fallback failed, using emergency scatter spawn`);
  // Emergency scatter spawn: find the most isolated position possible
  let bestPosition = null;
  let maxMinDistance = 0;
  
  for (let attempt = 0; attempt < 50; attempt++) {
    const margin = 100;
    const x = margin + Math.random() * (gameState.worldWidth - 2 * margin);
    const y = margin + Math.random() * (gameState.worldHeight - 2 * margin);
    
    // Find minimum distance to any existing player
    let minDistance = Infinity;
    for (const player of gameState.players.values()) {
      if (!player.alive) continue;
      const distance = Math.hypot(x - player.x, y - player.y);
      minDistance = Math.min(minDistance, distance);
    }
    
    if (minDistance > maxMinDistance) {
      maxMinDistance = minDistance;
      bestPosition = { x, y };
    }
  }
  
  if (bestPosition) {
    console.log(`🚨 DEBUG: Using emergency scatter position at (${bestPosition.x.toFixed(2)}, ${bestPosition.y.toFixed(2)}) with min distance ${maxMinDistance.toFixed(2)}`);
    return bestPosition;
  }
  
  console.log(`🚨 DEBUG: All methods failed, using safe edge position`);
  // Absolute last resort: safe edge position
  const edge = Math.floor(Math.random() * 4);
  const safeMargin = 100;
  const edgePosition = {
    0: { x: safeMargin, y: safeMargin + Math.random() * (gameState.worldHeight - 2 * safeMargin) },
    1: { x: gameState.worldWidth - safeMargin, y: safeMargin + Math.random() * (gameState.worldHeight - 2 * safeMargin) },
    2: { x: safeMargin + Math.random() * (gameState.worldWidth - 2 * safeMargin), y: safeMargin },
    3: { x: safeMargin + Math.random() * (gameState.worldWidth - 2 * safeMargin), y: gameState.worldHeight - safeMargin }
  }[edge];
  console.log(`🚨 DEBUG: Using safe edge ${edge} position at (${edgePosition.x.toFixed(2)}, ${edgePosition.y.toFixed(2)})`);
  return edgePosition;
}

// Calculate safe spawn direction that avoids borders and obstacles
function calculateSafeSpawnDirection(x, y, radius) {
  const borderBuffer = 200; // Distance to avoid from borders
  const mapCenterX = gameState.worldWidth / 2;
  const mapCenterY = gameState.worldHeight / 2;
  
  // Calculate distances to each border
  const distToLeft = x;
  const distToRight = gameState.worldWidth - x;
  const distToTop = y;
  const distToBottom = gameState.worldHeight - y;
  
  // Find which borders are too close
  const tooCloseToLeft = distToLeft < borderBuffer;
  const tooCloseToRight = distToRight < borderBuffer;
  const tooCloseToTop = distToTop < borderBuffer;
  const tooCloseToBottom = distToBottom < borderBuffer;
  
  let safeAngles = [];
  
  // If not near any borders, prefer direction toward center with some randomness
  if (!tooCloseToLeft && !tooCloseToRight && !tooCloseToTop && !tooCloseToBottom) {
    const angleToCenter = Math.atan2(mapCenterY - y, mapCenterX - x);
    // Add some randomness around center direction (±60 degrees)
    const randomOffset = (Math.random() - 0.5) * (Math.PI / 3);
    return angleToCenter + randomOffset;
  }
  
  // Generate safe angle ranges avoiding problematic borders
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
    const testDistance = 150; // Distance to test in this direction
    const testX = x + Math.cos(angle) * testDistance;
    const testY = y + Math.sin(angle) * testDistance;
    
    // Check if this direction leads to safe territory
    const wouldHitBorder = testX < borderBuffer || testX > gameState.worldWidth - borderBuffer ||
                          testY < borderBuffer || testY > gameState.worldHeight - borderBuffer;
    
    if (!wouldHitBorder) {
      safeAngles.push(angle);
    }
  }
  
  // If we have safe angles, pick one randomly
  if (safeAngles.length > 0) {
    const baseAngle = safeAngles[Math.floor(Math.random() * safeAngles.length)];
    // Add small random variation (±15 degrees)
    const variation = (Math.random() - 0.5) * (Math.PI / 6);
    return baseAngle + variation;
  }
  
  // Fallback: point toward the most open direction
  const openDirections = [];
  if (distToLeft > distToRight && distToLeft > distToTop && distToLeft > distToBottom) {
    openDirections.push(Math.PI); // Left
  }
  if (distToRight > distToLeft && distToRight > distToTop && distToRight > distToBottom) {
    openDirections.push(0); // Right
  }
  if (distToTop > distToLeft && distToTop > distToRight && distToTop > distToBottom) {
    openDirections.push(Math.PI * 1.5); // Up
  }
  if (distToBottom > distToLeft && distToBottom > distToRight && distToBottom > distToTop) {
    openDirections.push(Math.PI * 0.5); // Down
  }
  
  if (openDirections.length > 0) {
    const baseDirection = openDirections[Math.floor(Math.random() * openDirections.length)];
    const variation = (Math.random() - 0.5) * (Math.PI / 4); // ±45 degrees
    return baseDirection + variation;
  }
  
  // Last resort: random angle (should rarely happen with improved spawn zones)
  console.log(`⚠️ DEBUG: Using fallback random angle for position (${x.toFixed(2)}, ${y.toFixed(2)})`);
  return Math.random() * Math.PI * 2;
}

function createBot(id) {
  const botRadius = 4;
  const safePosition = findSafeSpawnPosition(botRadius);
  const safeAngle = calculateSafeSpawnDirection(safePosition.x, safePosition.y, botRadius);
  
  console.log(`🤖 DEBUG: Creating bot ${id} at position (${safePosition.x.toFixed(2)}, ${safePosition.y.toFixed(2)}) with safe angle ${safeAngle.toFixed(3)} radians (${(safeAngle * 180 / Math.PI).toFixed(1)}°)`);
  
  const bot = {
    id: id,
    socketId: null, // Bots don't have socket connections
    x: safePosition.x,
    y: safePosition.y,
    points: [],
    angle: safeAngle,
    radius: botRadius,
    speed: 1.1, // Slightly faster than human players for competitive gameplay
    color: getRandomColor(),
    score: 1.0,
    alive: true,
    isBot: true,
    spawnProtection: true,
    spawnTime: Date.now()
  };
  
  console.log(`🛡️ DEBUG: Bot ${id} spawn protection enabled until ${new Date(bot.spawnTime + 3000).toLocaleTimeString()}`);

  // Initialize bot with starting points
  for (let i = 0; i < 20; i++) {
    bot.points.push({
      x: bot.x - i * 2,
      y: bot.y,
      radius: bot.radius,
      color: getRandomColor()
    });
  }

  console.log(`✅ DEBUG: Bot ${id} created successfully with ${bot.points.length} body points`);
  return bot;
}

function spawnBots(count = 5) {
  // Count current bots (both alive and dead)
  const currentBots = Array.from(gameState.players.values()).filter(p => p.isBot).length;
  const availableSlots = MAX_BOTS - currentBots;
  const botsToSpawn = Math.min(count, availableSlots);
  
  if (botsToSpawn <= 0) {
    // console.log(`Bot limit reached (${MAX_BOTS}). Cannot spawn more bots. Current bots: ${currentBots}`);
    return;
  }
  
  // console.log(`Spawning ${botsToSpawn} bots...`);
  for (let i = 0; i < botsToSpawn; i++) {
    const botId = `bot-${generatePlayerId()}`;
    const bot = createBot(botId);
    gameState.players.set(botId, bot);
    console.log(`Bot spawned: ${botId} at position (${bot.x.toFixed(2)}, ${bot.y.toFixed(2)})`);
    
    // Broadcast new bot to all players
    io.emit('playerJoined', bot);
  }
  
  const totalBots = currentBots + botsToSpawn;
  const aliveBots = Array.from(gameState.players.values()).filter(p => p.isBot && p.alive).length;
  // console.log(`Bot spawning complete: ${botsToSpawn} spawned, ${totalBots}/${MAX_BOTS} total, ${aliveBots} alive`);
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
  
  // Enhanced logging for bot death debugging
  // const remainingBots = Array.from(gameState.players.values()).filter(p => p.isBot && p.alive).length;
  // const totalPlayers = gameState.players.size;
  // console.log(`🤖 Bot Death: ${bot.id} died at (${bot.x.toFixed(2)}, ${bot.y.toFixed(2)}) | Score: ${bot.score.toFixed(1)} | Remaining bots: ${remainingBots} | Total players: ${totalPlayers}`);
  
  // Broadcast bot death and dead points
  io.emit('playerDied', {
    playerId: bot.id,
    deadPoints: deadPoints
  });
  
  // Broadcast bot removal
  io.emit('playerDisconnected', bot.id);
  
  // Update leaderboard after bot removal
  const leaderboard = generateLeaderboard();
  const fullLeaderboard = generateFullLeaderboard();
  io.emit('leaderboardUpdate', {
    leaderboard: leaderboard,
    fullLeaderboard: fullLeaderboard
  });
}

function updateBots() {
  // Iterate over all players and filter for bots
  gameState.players.forEach((player) => {
    if (!player.isBot || !player.alive) return;

    // Boundary avoidance AI - check if bot is approaching boundaries
    const boundaryBuffer = player.radius * 3; // Safety buffer distance from boundaries
    const nextX = player.x + Math.cos(player.angle) * player.speed * 10; // Look ahead
    const nextY = player.y + Math.sin(player.angle) * player.speed * 10; // Look ahead
    
    // Check if bot will hit boundaries soon and turn away
    if (nextX < boundaryBuffer || nextX > gameState.worldWidth - boundaryBuffer) {
      // Turn away from left/right boundaries
      player.angle = Math.PI - player.angle + (Math.random() - 0.5) * 0.3;
    }
    if (nextY < boundaryBuffer || nextY > gameState.worldHeight - boundaryBuffer) {
      // Turn away from top/bottom boundaries
      player.angle = -player.angle + (Math.random() - 0.5) * 0.3;
    }

    // Simple AI movement - change direction occasionally (reduced frequency due to boundary avoidance)
    if (Math.random() < 0.01) {
      player.angle += (Math.random() - 0.5) * 0.3;
    }

    // Move bot
    const newX = player.x + Math.cos(player.angle) * player.speed;
    const newY = player.y + Math.sin(player.angle) * player.speed;

    // Improved boundary collision detection - strict enforcement with edge case handling
    const minX = player.radius;
    const maxX = gameState.worldWidth - player.radius;
    const minY = player.radius;
    const maxY = gameState.worldHeight - player.radius;
    
    // Relaxed boundary collision detection - give bots small buffer to prevent excessive deaths
    if (newX < minX || newX > maxX || newY < minY || newY > maxY) {
      // Bot dies from boundary collision - relaxed enforcement with buffer
      console.log(`Bot ${player.id} died at boundary: position (${newX.toFixed(2)}, ${newY.toFixed(2)}), bounds: x[${minX}-${maxX}], y[${minY}-${maxY}]`);
      handleBotDeath(player);
      return;
    }

    player.x = newX;
    player.y = newY;

    // Check spawn protection (3 seconds)
    const currentTime = Date.now();
    const spawnProtectionDuration = 3000; // 3 seconds
    const hasSpawnProtection = player.spawnProtection && (currentTime - player.spawnTime) < spawnProtectionDuration;
    
    // Remove spawn protection after duration
    if (player.spawnProtection && (currentTime - player.spawnTime) >= spawnProtectionDuration) {
      player.spawnProtection = false;
      console.log(`🛡️ DEBUG: Spawn protection removed for bot ${player.id} during update`);
    }
    
    // Check collision with other players/bots before updating position
    const botHead = { x: player.x, y: player.y, radius: player.radius };
    let collisionDetected = false;
    
    if (!hasSpawnProtection) { // Only check collisions if not protected
      // Check collision with all other players (both human and bot)
      gameState.players.forEach((otherPlayer) => {
        if (otherPlayer.id === player.id || !otherPlayer.alive || collisionDetected) return;
        
        // Skip collision with other protected players
        const otherHasProtection = otherPlayer.spawnProtection && (currentTime - otherPlayer.spawnTime) < spawnProtectionDuration;
        if (otherHasProtection) return;
        
        // Check collision with other player's body points
        for (const point of otherPlayer.points) {
          if (isCollided(botHead, point)) {
            handleBotDeath(player);
            collisionDetected = true;
            return;
          }
        }
      });
    }
    
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
        
        // Regenerate food with logging
        const oldPos = { x: food.x, y: food.y };
        food.x = Math.random() * gameState.worldWidth;
        food.y = Math.random() * gameState.worldHeight;
        food.color = getRandomColor();
        
        // console.log(`🍎 Bot ${player.id} ate food ${food.id}: regenerated from (${oldPos.x.toFixed(2)}, ${oldPos.y.toFixed(2)}) to (${food.x.toFixed(2)}, ${food.y.toFixed(2)})`);
        
        // Broadcast food regeneration to all players
        io.emit('foodRegenerated', food);
        
        // Broadcast score update
        io.emit('scoreUpdate', {
          playerId: player.id,
          score: Math.round(player.score * 10) / 10
        });
        
        // Broadcast updated leaderboard
        const leaderboard = generateLeaderboard();
        const fullLeaderboard = generateFullLeaderboard();
        io.emit('leaderboardUpdate', {
          leaderboard: leaderboard,
          fullLeaderboard: fullLeaderboard
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
        const fullLeaderboard = generateFullLeaderboard();
        io.emit('leaderboardUpdate', {
          leaderboard: leaderboard,
          fullLeaderboard: fullLeaderboard
        });
        
        break; // Only eat one dead point per update cycle
      }
    }
  });
}

// Initialize game
initializeFoods();
console.log(`🎮 Game initialized: ${gameState.foods.length} foods spawned in ${gameState.worldWidth}x${gameState.worldHeight} world`);

// Spawn initial bots for testing
setTimeout(() => {
  console.log('🤖 Spawning initial bots for game testing...');
  spawnBots(5);
}, 1000);

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Handle game initialization with user data
  socket.on('gameInit', (userData) => {
    console.log('Game init with user data:', userData);
    
    // Use authenticated user data from socket.data if available
    const isAuthenticated = socket.data.isAuthenticated;
    const authenticatedUserData = socket.data.userData;
    const authenticatedOpenId = socket.data.openId;
    const authenticatedUserInfo = socket.data.userInfo;
    
    console.log('🎮 Game initialization:', {
      socketId: socket.id,
      isAuthenticated,
      hasAuthData: !!authenticatedUserData,
      fallbackData: !!userData
    });
    
    // Prioritize authenticated data, fallback to provided userData
    const finalUserData = isAuthenticated ? authenticatedUserData : userData;
    const finalOpenId = isAuthenticated ? authenticatedOpenId : userData?.openId;
    const finalUserInfo = isAuthenticated ? authenticatedUserInfo : userData?.userInfo;
    
    // Extract real user ID and name
    const realUserId = getRealUserId(finalOpenId);
    const userName = finalUserInfo?.name || finalUserInfo?.firstName;
    const playerId = realUserId || generatePlayerId();
    
    const playerRadius = 4;
    const safePosition = findSafeSpawnPosition(playerRadius);
    const safeAngle = calculateSafeSpawnDirection(safePosition.x, safePosition.y, playerRadius);
    
    console.log(`👤 DEBUG: Creating player ${playerId} (${userName || 'Anonymous'}) at position (${safePosition.x.toFixed(2)}, ${safePosition.y.toFixed(2)}) with safe angle ${safeAngle.toFixed(3)} radians (${(safeAngle * 180 / Math.PI).toFixed(1)}°)`);
    
    const newPlayer = {
      id: playerId,
      socketId: socket.id,
      x: safePosition.x,
      y: safePosition.y,
      points: [],
      angle: safeAngle,
      radius: playerRadius,
      speed: 1,
      color: getRandomColor(),
      score: 0,
      alive: true,
      realUserId: realUserId, // Store real user ID separately
      userName: userName, // Store user name for leaderboard
      spawnProtection: true,
      spawnTime: Date.now()
    };
    
    console.log(`🛡️ DEBUG: Player ${playerId} spawn protection enabled until ${new Date(newPlayer.spawnTime + 3000).toLocaleTimeString()}`);

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
    console.log(`✅ DEBUG: Player ${playerId} created successfully with ${newPlayer.points.length} body points`);

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
    const initialFullLeaderboard = generateFullLeaderboard();
    socket.emit('leaderboardUpdate', {
      leaderboard: initialLeaderboard,
      fullLeaderboard: initialFullLeaderboard
    });

    // Broadcast new player to all other players
    socket.broadcast.emit('playerJoined', newPlayer);
    
    // Broadcast updated leaderboard to all players
    const updatedLeaderboard = generateLeaderboard();
    const updatedFullLeaderboard = generateFullLeaderboard();
    io.emit('leaderboardUpdate', {
      leaderboard: updatedLeaderboard,
      fullLeaderboard: updatedFullLeaderboard
    });
  });

  // Handle player movement
  socket.on('playerMove', (data) => {
    const player = gameState.players.get(data.playerId);
    if (player && player.alive) {
      player.angle = data.angle;
      player.x = data.x;
      player.y = data.y;
      player.points = data.points;
      
      // Check and remove spawn protection after 3 seconds
      const currentTime = Date.now();
      const spawnProtectionDuration = 3000;
      if (player.spawnProtection && (currentTime - player.spawnTime) >= spawnProtectionDuration) {
        player.spawnProtection = false;
        console.log(`🛡️ DEBUG: Spawn protection removed for player ${data.playerId} during movement`);
      }
      
      // Broadcast movement to all other players with current spawn protection status
      const hasSpawnProtection = player.spawnProtection && (currentTime - player.spawnTime) < spawnProtectionDuration;
      socket.broadcast.emit('playerMoved', {
        playerId: data.playerId,
        x: data.x,
        y: data.y,
        angle: data.angle,
        points: data.points,
        spawnProtection: hasSpawnProtection
      });
    }
  });

  // Handle food consumption
  socket.on('foodEaten', (data) => {
    const { playerId, foodId } = data;
    const player = gameState.players.get(playerId);
    const food = gameState.foods.find(f => f.id === foodId);
    
    if (player && food) {
      // Regenerate food with logging
      const oldPos = { x: food.x, y: food.y };
      food.x = Math.random() * gameState.worldWidth;
      food.y = Math.random() * gameState.worldHeight;
      food.color = getRandomColor();
      
      player.score++;
      
      console.log(`🍎 Player ${playerId} ate food ${foodId}: regenerated from (${oldPos.x.toFixed(2)}, ${oldPos.y.toFixed(2)}) to (${food.x.toFixed(2)}, ${food.y.toFixed(2)})`);
      
      // Score persistence now handled client-side
      
      // Broadcast food regeneration to all players
      io.emit('foodRegenerated', food);
      
      // Broadcast score update
      io.emit('scoreUpdate', {
        playerId: playerId,
        score: Math.round(player.score * 10) / 10
      });
      
      // Broadcast updated leaderboard
      const leaderboard = generateLeaderboard();
      const fullLeaderboard = generateFullLeaderboard();
      io.emit('leaderboardUpdate', {
        leaderboard: leaderboard,
        fullLeaderboard: fullLeaderboard
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
      const fullLeaderboard = generateFullLeaderboard();
      io.emit('leaderboardUpdate', {
        leaderboard: leaderboard,
        fullLeaderboard: fullLeaderboard
      });
    }
  });

  // Handle player death
  socket.on('playerDied', (data) => {
    const player = gameState.players.get(data.playerId);
    if (player) {
      // Score persistence now handled client-side
      
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
        const fullLeaderboard = generateFullLeaderboard();
        io.emit('leaderboardUpdate', {
          leaderboard: leaderboard,
          fullLeaderboard: fullLeaderboard
        });
      } else {
        // Respawn human player after 3 seconds
        setTimeout(() => {
          if (gameState.players.has(data.playerId)) {
            const safePosition = findSafeSpawnPosition(player.radius);
            const safeAngle = calculateSafeSpawnDirection(safePosition.x, safePosition.y, player.radius);
            const spawnTime = Date.now();
            
            console.log(`🔄 DEBUG: Respawning player ${data.playerId} at position (${safePosition.x.toFixed(2)}, ${safePosition.y.toFixed(2)})`);
            console.log(`🧭 DEBUG: Respawn angle: ${safeAngle.toFixed(4)} radians (${(safeAngle * 180 / Math.PI).toFixed(1)} degrees)`);
            console.log(`🛡️ DEBUG: Respawn protection enabled until ${new Date(spawnTime + 3000).toLocaleTimeString()}`);
            
            const respawnedPlayer = {
              ...player,
              x: safePosition.x,
              y: safePosition.y,
              angle: safeAngle,
              points: [],
              alive: true,
              score: 0,
              spawnProtection: true,
              spawnTime: spawnTime
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
            
            console.log(`✅ DEBUG: Player ${data.playerId} successfully respawned with ${respawnedPlayer.points.length} body points`);
            
            // Broadcast respawn
            io.emit('playerRespawned', respawnedPlayer);
            
            // Set up automatic spawn protection removal after 3 seconds
            setTimeout(() => {
              const currentPlayer = gameState.players.get(data.playerId);
              if (currentPlayer && currentPlayer.spawnProtection) {
                currentPlayer.spawnProtection = false;
                console.log(`🛡️ DEBUG: Spawn protection removed for player ${data.playerId}`);
              }
            }, 3000);
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

  // Handle voluntary room leaving
  socket.on('leaveRoom', (data) => {
    console.log('Player leaving room:', data.playerId, 'socket:', socket.id);
    
    // Find and remove player (only human players, keep bots)
    const player = gameState.players.get(data.playerId);
    if (player && player.socketId === socket.id && !player.isBot) {
      gameState.players.delete(data.playerId);
      io.emit('playerDisconnected', data.playerId);
      socket.broadcast.emit('playerLeft', {
        playerId: data.playerId
      });
      
      // Broadcast updated leaderboard after player leaves
      const leaderboard = generateLeaderboard();
      const fullLeaderboard = generateFullLeaderboard();
      io.emit('leaderboardUpdate', {
        leaderboard: leaderboard,
        fullLeaderboard: fullLeaderboard
      });
      
      console.log('Player', data.playerId, 'successfully left the room');
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
      const fullLeaderboard = generateFullLeaderboard();
      io.emit('leaderboardUpdate', {
        leaderboard: leaderboard,
        fullLeaderboard: fullLeaderboard
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

// Automatic bot respawning function
function maintainMinimumBots() {
  const currentBots = Array.from(gameState.players.values()).filter(p => p.isBot && p.alive).length;
  const humanPlayers = Array.from(gameState.players.values()).filter(p => !p.isBot).length;
  const minBots = Math.max(3, Math.min(5, 8 - humanPlayers)); // 3-5 bots minimum, adjust based on human players
  
  if (currentBots < minBots) {
    const botsToSpawn = minBots - currentBots;
    console.log(`Maintaining minimum bots: spawning ${botsToSpawn} bots (current: ${currentBots}, target: ${minBots})`);
    spawnBots(botsToSpawn);
  }
}

// Update bots continuously
setInterval(() => {
  updateBots();
  
  // Maintain minimum bot count
  maintainMinimumBots();
  
  // Broadcast bot movements to all players
  gameState.players.forEach((player) => {
    if (player.isBot && player.alive) {
      const currentTime = Date.now();
      const spawnProtectionDuration = 3000;
      const hasSpawnProtection = player.spawnProtection && (currentTime - player.spawnTime) < spawnProtectionDuration;
      
      io.emit('playerMoved', {
        playerId: player.id,
        x: player.x,
        y: player.y,
        angle: player.angle,
        points: player.points,
        spawnProtection: hasSpawnProtection
      });
    }
  });
}, 100); // Update bots every 100ms

// Generate leaderboard data
function generateLeaderboard() {
  // Get all alive players sorted by score
  const allAlivePlayers = Array.from(gameState.players.values())
    .filter(player => player.alive)
    .sort((a, b) => b.score - a.score);

  // Assign correct ranks to ALL players
  const playersWithRanks = allAlivePlayers.map((player, index) => ({
    id: player.id,
    name: player.userName || (player.isBot ? `Guest ${player.id.replace('bot-', '')}` : `Guest ${player.id}`),
    score: player.score,
    rank: index + 1, // This is the actual rank in the full leaderboard
    isBot: player.isBot || false,
    realUserId: player.realUserId || null
  }));

  // Return top 10 players for the leaderboard display
  // The client will handle showing current player if they're not in top 10
  return playersWithRanks.slice(0, 10);
}

// Generate full leaderboard data (for finding current player's rank)
function generateFullLeaderboard() {
  const allAlivePlayers = Array.from(gameState.players.values())
    .filter(player => player.alive)
    .sort((a, b) => b.score - a.score);

  return allAlivePlayers.map((player, index) => ({
    id: player.id,
    name: player.userName || (player.isBot ? `Guest ${player.id.replace('bot-', '')}` : `Guest ${player.id}`),
    score: player.score,
    rank: index + 1,
    isBot: player.isBot || false,
    realUserId: player.realUserId || null
  }));
}

// Score persistence removed from server - now handled client-side with Zustand

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
  const fullLeaderboard = generateFullLeaderboard();
  io.emit('leaderboardUpdate', {
    leaderboard: leaderboard,
    fullLeaderboard: fullLeaderboard
  });
}, 1000);

const PORT = process.env.PORT || 9000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Game available at http://localhost:${PORT}`);
});