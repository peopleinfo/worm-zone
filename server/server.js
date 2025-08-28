const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket"],
  // transports: ["websocket", "polling"],
  allowEIO3: true,
});

// Token validation utility
function validateToken(token) {
  if (!token) {
    return { valid: false, reason: "No token provided" };
  }

  // Basic token format validation
  if (typeof token !== "string" || token.length < 10) {
    return { valid: false, reason: "Invalid token format" };
  }

  // For now, we'll accept any properly formatted token
  // In production, you would validate against your auth service
  return { valid: true, token };
}

// Socket authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const userData = socket.handshake.auth.userData;

  console.log("🔐 Socket authentication attempt:", {
    socketId: socket.id,
    hasToken: !!token,
    hasUserData: !!userData,
    isLoggedIn: userData?.isLoggedIn,
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
      console.log("✅ Socket authenticated successfully:", socket.id);

      // Emit authentication success after connection
      socket.on("connect", () => {
        socket.emit("auth_success", {
          authenticated: true,
          openId: userData?.openId,
          userInfo: userData?.userInfo,
        });
      });
    } else {
      console.log("❌ Token validation failed:", validation.reason);
      // Allow connection but mark as unauthenticated
      socket.data.isAuthenticated = false;

      // Emit authentication error after connection
      socket.on("connect", () => {
        socket.emit("auth_error", {
          error: "Token validation failed",
          reason: validation.reason,
        });
      });
    }
  } else {
    // Allow Player connections
    socket.data.isAuthenticated = false;
    console.log("👤 Player connection allowed:", socket.id);
  }

  next(); // Always allow connection, but track auth status
});

// Check with client config too avoid not sync

// Bot configuration
const MAX_BOTS = 4;
const POINT = 1; // Points awarded for eating food or dead points

// Bot management throttling
let lastBotSpawnAttempt = 0;
let lastBotLimitLog = 0;
const BOT_SPAWN_COOLDOWN = 2000; // 2 seconds between spawn attempts
const BOT_LOG_THROTTLE = 5000; // 5 seconds between limit logs

// ===== SERVER PERFORMANCE OPTIMIZATION CONFIGURATION =====

// Server State Management
const SERVER_STATES = {
  ACTIVE: "active",
  PAUSED: "paused",
  RESUMING: "resuming",
};

let serverState = SERVER_STATES.ACTIVE;
let pauseTimeout = null;
let gameLoopIntervals = [];

// Performance Configuration
const PERFORMANCE_CONFIG = {
  // Server state management
  PAUSE_DELAY: 30000, // 30 seconds of no players before pausing
  RESUME_TIMEOUT: 1000, // 1 second to fully resume

  // Dead point cleanup
  MAX_DEAD_POINTS: 2000,
  CLEANUP_THRESHOLD: 1500,
  CLEANUP_BATCH_SIZE: 500,
  CLEANUP_INTERVAL: 30000, // 30 seconds

  // Bot management optimization
  IDLE_BOT_UPDATE_INTERVAL: 1000, // 1 second when no players
  ACTIVE_BOT_UPDATE_INTERVAL: 100, // 100ms when players present
  MIN_BOTS_IDLE: 2,
  MAX_BOTS_IDLE: 3,
  MIN_BOTS_ACTIVE: 3,
  MAX_BOTS_ACTIVE: 5,

  // Memory monitoring
  MEMORY_CHECK_INTERVAL: 5000, // 5 seconds
  MEMORY_WARNING_THRESHOLD: 150 * 1024 * 1024, // 150MB
  MEMORY_CRITICAL_THRESHOLD: 200 * 1024 * 1024, // 200MB

  // Performance metrics
  METRICS_LOG_INTERVAL: 30000, // 30 seconds
};

// Performance Metrics
const performanceMetrics = {
  serverStartTime: Date.now(),
  totalPlayers: 0,
  totalBots: 0,
  deadPointsCreated: 0,
  deadPointsCleanedUp: 0,
  memoryUsage: { rss: 0, heapUsed: 0, heapTotal: 0 },
  cpuUsage: 0,
  stateTransitions: 0,
  lastMetricsLog: Date.now(),

  // Enhanced performance tracking
  botUpdates: 0,
  botMaintenanceCycles: 0,
  playerConnections: 0,
  playerDisconnections: 0,
  foodEaten: 0,
  deadPointsEaten: 0,
  memoryCleanups: 0,
  aggressiveCleanups: 0,
  serverPauses: 0,
  serverResumes: 0,

  // Performance timing
  avgResponseTime: 0,
  maxResponseTime: 0,
  totalRequests: 0,

  // Game state metrics
  peakPlayerCount: 0,
  peakDeadPointCount: 0,
  totalGameTime: 0,
};

// Memory monitoring state
let memoryMonitorInterval = null;
let lastMemoryCleanup = Date.now();

// Performance metrics interval
let performanceMetricsInterval = null;

// ===== MEMORY MONITORING SYSTEM =====

// Start memory monitoring with automatic cleanup triggers
function startMemoryMonitoring() {
  if (memoryMonitorInterval) clearInterval(memoryMonitorInterval);

  memoryMonitorInterval = setInterval(() => {
    const memUsage = process.memoryUsage();
    performanceMetrics.memoryUsage = memUsage;

    // Check memory thresholds and trigger cleanup if needed
    if (memUsage.heapUsed > PERFORMANCE_CONFIG.MEMORY_CRITICAL_THRESHOLD) {
      console.log(
        `🚨 MEMORY CRITICAL: ${(memUsage.heapUsed / 1024 / 1024).toFixed(
          1
        )}MB - Forcing aggressive cleanup`
      );
      performAggressiveCleanup();
    } else if (
      memUsage.heapUsed > PERFORMANCE_CONFIG.MEMORY_WARNING_THRESHOLD
    ) {
      console.log(
        `⚠️ MEMORY WARNING: ${(memUsage.heapUsed / 1024 / 1024).toFixed(
          1
        )}MB - Performing cleanup`
      );
      performMemoryCleanup();
    }

    // Log memory stats every 5 minutes
    if (Date.now() - performanceMetrics.lastMetricsLog > 300000) {
      logMemoryStats();
      performanceMetrics.lastMetricsLog = Date.now();
    }
  }, 10000); // Check every 10 seconds
}

// Perform standard memory cleanup
function performMemoryCleanup() {
  const currentTime = Date.now();
  if (currentTime - lastMemoryCleanup < 30000) return; // Throttle cleanup to every 30 seconds

  lastMemoryCleanup = currentTime;
  console.log("🧹 MEMORY: Starting standard cleanup");

  // Force dead point cleanup
  performSmartDeadPointCleanup(true);

  // Remove old disconnected players
  cleanupDisconnectedPlayers();

  // Trigger garbage collection if available
  if (global.gc) {
    global.gc();
    console.log("🗑️ MEMORY: Garbage collection triggered");
  }

  // Track cleanup metrics
  performanceMetrics.memoryCleanups++;
}

// Perform aggressive cleanup for critical memory situations
function performAggressiveCleanup() {
  console.log("🚨 MEMORY: Starting aggressive cleanup");

  // Remove 50% of dead points immediately
  const deadPointsToRemove = Math.floor(gameState.deadPoints.length * 0.5);
  if (deadPointsToRemove > 0) {
    gameState.deadPoints.splice(0, deadPointsToRemove);
    performanceMetrics.deadPointsCleanedUp += deadPointsToRemove;
    console.log(
      `🧹 MEMORY: Removed ${deadPointsToRemove} dead points aggressively`
    );
  }

  // Remove excess bots if any
  const bots = Array.from(gameState.players.values()).filter((p) => p.isBot);
  const botsToRemove = Math.max(0, bots.length - 3); // Keep minimum 3 bots
  for (let i = 0; i < botsToRemove; i++) {
    gameState.players.delete(bots[i].id);
  }

  // Force garbage collection multiple times
  if (global.gc) {
    for (let i = 0; i < 3; i++) {
      global.gc();
    }
    console.log("🗑️ MEMORY: Aggressive garbage collection completed");
  }

  // Track aggressive cleanup metrics
  performanceMetrics.aggressiveCleanups++;

  lastMemoryCleanup = Date.now();
}

// Clean up old disconnected players
function cleanupDisconnectedPlayers() {
  const currentTime = Date.now();
  let cleanedCount = 0;

  for (const [playerId, player] of gameState.players.entries()) {
    // Remove players that have been disconnected for more than 5 minutes
    if (
      !player.alive &&
      !player.isBot &&
      player.lastActivity &&
      currentTime - player.lastActivity > 300000
    ) {
      gameState.players.delete(playerId);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.log(
      `🧹 MEMORY: Cleaned up ${cleanedCount} old disconnected players`
    );
  }
}

// Log detailed memory statistics
function logMemoryStats() {
  const memUsage = process.memoryUsage();
  const uptime = Date.now() - performanceMetrics.serverStartTime;

  console.log("📊 MEMORY STATS:");
  console.log(`  RSS: ${(memUsage.rss / 1024 / 1024).toFixed(1)}MB`);
  console.log(`  Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`);
  console.log(
    `  Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(1)}MB`
  );
  console.log(`  External: ${(memUsage.external / 1024 / 1024).toFixed(1)}MB`);
  console.log(
    `  Players: ${gameState.players.size} (${
      Array.from(gameState.players.values()).filter((p) => !p.isBot).length
    } human, ${
      Array.from(gameState.players.values()).filter((p) => p.isBot).length
    } bots)`
  );
  console.log(`  Dead Points: ${gameState.deadPoints.length}`);
  console.log(`  Uptime: ${Math.floor(uptime / 60000)} minutes`);
  console.log(`  Server State: ${serverState}`);
}

// Comprehensive performance metrics logging
function logPerformanceMetrics() {
  const currentTime = Date.now();
  const uptime = currentTime - performanceMetrics.serverStartTime;
  const uptimeMinutes = Math.floor(uptime / 60000);
  const memUsage = process.memoryUsage();

  console.log("\n🚀 ===== PERFORMANCE METRICS REPORT =====");
  console.log(`⏱️  Server Uptime: ${uptimeMinutes} minutes`);
  console.log(`🌐 Server State: ${serverState}`);

  // Player metrics
  const humanPlayers = Array.from(gameState.players.values()).filter(
    (p) => !p.isBot
  ).length;
  const botPlayers = Array.from(gameState.players.values()).filter(
    (p) => p.isBot
  ).length;
  console.log(`\n👥 PLAYER METRICS:`);
  console.log(
    `  Current Players: ${gameState.players.size} (${humanPlayers} human, ${botPlayers} bots)`
  );
  console.log(`  Peak Players: ${performanceMetrics.peakPlayerCount}`);
  console.log(`  Total Connections: ${performanceMetrics.playerConnections}`);
  console.log(
    `  Total Disconnections: ${performanceMetrics.playerDisconnections}`
  );

  // Game activity metrics
  console.log(`\n🎮 GAME ACTIVITY:`);
  console.log(`  Food Eaten: ${performanceMetrics.foodEaten}`);
  console.log(`  Dead Points Eaten: ${performanceMetrics.deadPointsEaten}`);
  console.log(`  Dead Points Created: ${performanceMetrics.deadPointsCreated}`);
  console.log(
    `  Dead Points Cleaned: ${performanceMetrics.deadPointsCleanedUp}`
  );
  console.log(`  Current Dead Points: ${gameState.deadPoints.length}`);
  console.log(`  Peak Dead Points: ${performanceMetrics.peakDeadPointCount}`);

  // Bot performance metrics
  console.log(`\n🤖 BOT PERFORMANCE:`);
  console.log(`  Bot Updates: ${performanceMetrics.botUpdates}`);
  console.log(
    `  Bot Maintenance Cycles: ${performanceMetrics.botMaintenanceCycles}`
  );
  console.log(
    `  Updates per Minute: ${
      uptimeMinutes > 0
        ? Math.round(performanceMetrics.botUpdates / uptimeMinutes)
        : 0
    }`
  );

  // Memory and cleanup metrics
  console.log(`\n🧹 CLEANUP & MEMORY:`);
  console.log(`  Memory Cleanups: ${performanceMetrics.memoryCleanups}`);
  console.log(
    `  Aggressive Cleanups: ${performanceMetrics.aggressiveCleanups}`
  );
  console.log(
    `  Current Memory: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`
  );
  console.log(
    `  Memory Efficiency: ${
      gameState.deadPoints.length > 0
        ? Math.round(
            gameState.deadPoints.length / (memUsage.heapUsed / 1024 / 1024)
          )
        : "N/A"
    } points/MB`
  );

  // Server state metrics
  console.log(`\n⚡ SERVER STATE:`);
  console.log(`  State Transitions: ${performanceMetrics.stateTransitions}`);
  console.log(`  Server Pauses: ${performanceMetrics.serverPauses}`);
  console.log(`  Server Resumes: ${performanceMetrics.serverResumes}`);

  // Performance timing (if available)
  if (performanceMetrics.totalRequests > 0) {
    console.log(`\n📈 RESPONSE TIMES:`);
    console.log(
      `  Average Response: ${performanceMetrics.avgResponseTime.toFixed(2)}ms`
    );
    console.log(
      `  Max Response: ${performanceMetrics.maxResponseTime.toFixed(2)}ms`
    );
    console.log(`  Total Requests: ${performanceMetrics.totalRequests}`);
  }

  console.log("========================================\n");

  // Update last metrics log time
  performanceMetrics.lastMetricsLog = currentTime;
}

// Update peak metrics tracking
function updatePeakMetrics() {
  const currentPlayers = gameState.players.size;
  const currentDeadPoints = gameState.deadPoints.length;

  if (currentPlayers > performanceMetrics.peakPlayerCount) {
    performanceMetrics.peakPlayerCount = currentPlayers;
  }

  if (currentDeadPoints > performanceMetrics.peakDeadPointCount) {
    performanceMetrics.peakDeadPointCount = currentDeadPoints;
  }
}

// Start performance metrics logging interval
function startPerformanceMetricsLogging() {
  if (performanceMetricsInterval) clearInterval(performanceMetricsInterval);

  performanceMetricsInterval = setInterval(() => {
    logPerformanceMetrics();
    updatePeakMetrics();
  }, PERFORMANCE_CONFIG.METRICS_LOG_INTERVAL);

  console.log(
    `📊 Performance metrics logging started (${
      PERFORMANCE_CONFIG.METRICS_LOG_INTERVAL / 1000
    }s intervals)`
  );
}

// Game state
const gameState = {
  players: new Map(),
  foods: [],
  deadPoints: [],
  maxFoods: 300,
  worldWidth: 1200,
  worldHeight: 800,
};

// Initialize food
function initializeFoods() {
  gameState.foods = [];
  console.log(
    `🍎 Initializing ${gameState.maxFoods} food items in ${gameState.worldWidth}x${gameState.worldHeight} world...`
  );

  for (let i = 0; i < gameState.maxFoods; i++) {
    const type = getRandomFood();
    const food = {
      id: i,
      x: Math.random() * gameState.worldWidth,
      y: Math.random() * gameState.worldHeight,
      radius: 5,
      color: getFoodColorByType(type),
      type: type,
    };
    gameState.foods.push(food);

    if (i < 5) {
      // Log first 5 food positions for debugging
      console.log(
        `🍎 Food ${i}: position (${food.x.toFixed(2)}, ${food.y.toFixed(
          2
        )}) color: ${food.color}`
      );
    }
  }

  console.log(
    `🍎 Food initialization complete: ${gameState.foods.length} foods spawned`
  );
}

function getRandomColor() {
  const colors = [
    "red",
    "green",
    "white",
    "yellow",
    "orange",
    "lightgreen",
    "grey",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Get random food type matching client-side Food.ts types
function getRandomFood() {
  const types = ['pizza', 'apple', 'cherry', 'burger', 'pizza'];
  return types[Math.floor(Math.random() * types.length)];
}

// Get color based on food type
function getFoodColorByType(type) {
  switch (type) {
    case 'apple': return 'red';
    case 'cherry': return 'darkred';
    case 'pizza': return 'orange';
    case 'donut': return 'yellow';
    case 'burger': return 'brown';
    default: return 'orange';
  }
}

// Get point value based on food type
function getPointValueByType(type) {
  switch (type) {
    case 'pizza': return 1;
    case 'apple': return 2;
    case 'cherry': return 3;
    case 'burger': return 4;
    default: return POINT;
  }
}

// Generate random player ID (for Players/fallback)
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
  const availableWidth = gameState.worldWidth - 2 * margin;
  const availableHeight = gameState.worldHeight - 2 * margin;

  // Calculate spacing between zone centers
  const colSpacing = availableWidth / (cols - 1);
  const rowSpacing = availableHeight / (rows - 1);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Proper distribution calculation
      const x = margin + col * colSpacing;
      const y = margin + row * rowSpacing;

      // Add some randomization to prevent perfect grid alignment
      const randomOffsetX = (Math.random() - 0.5) * 40; // ±20px random offset
      const randomOffsetY = (Math.random() - 0.5) * 40; // ±20px random offset

      const finalX = Math.max(
        margin,
        Math.min(gameState.worldWidth - margin, x + randomOffsetX)
      );
      const finalY = Math.max(
        margin,
        Math.min(gameState.worldHeight - margin, y + randomOffsetY)
      );

      zones.push({ x: finalX, y: finalY, size: zoneSize });
    }
  }

  // Validate zone distribution
  const minX = Math.min(...zones.map((z) => z.x));
  const maxX = Math.max(...zones.map((z) => z.x));
  const minY = Math.min(...zones.map((z) => z.y));
  const maxY = Math.max(...zones.map((z) => z.y));

  console.log(
    `🎯 DEBUG: Generated ${zones.length} spawn zones with proper distribution:`
  );
  console.log(
    `🎯 DEBUG: X range: ${minX.toFixed(0)} - ${maxX.toFixed(0)} (spread: ${(
      maxX - minX
    ).toFixed(0)}px)`
  );
  console.log(
    `🎯 DEBUG: Y range: ${minY.toFixed(0)} - ${maxY.toFixed(0)} (spread: ${(
      maxY - minY
    ).toFixed(0)}px)`
  );
  console.log(
    `🎯 DEBUG: Zone positions:`,
    zones
      .map((z, i) => `Zone${i}: (${z.x.toFixed(0)}, ${z.y.toFixed(0)})`)
      .join(", ")
  );

  return zones;
}

// Check if position is safe (no collision with existing worms) - enhanced safety checks
function isPositionSafe(x, y, radius, minDistance = 200) {
  const alivePlayers = Array.from(gameState.players.values()).filter(
    (p) => p.alive
  );
  console.log(
    `🔍 DEBUG: Checking position safety at (${x.toFixed(2)}, ${y.toFixed(
      2
    )}) with ${
      alivePlayers.length
    } alive players, minDistance: ${minDistance}px`
  );

  // Check boundaries with increased buffer for better safety
  const boundaryBuffer = 80;
  if (
    x < boundaryBuffer ||
    x > gameState.worldWidth - boundaryBuffer ||
    y < boundaryBuffer ||
    y > gameState.worldHeight - boundaryBuffer
  ) {
    console.log(`❌ DEBUG: Position unsafe - too close to boundaries`);
    return false;
  }

  for (const [playerId, player] of gameState.players.entries()) {
    if (!player.alive) continue;

    // Check distance from player head with increased safety margin
    const distance = Math.hypot(x - player.x, y - player.y);
    const requiredDistance = minDistance + radius + player.radius;
    if (distance < requiredDistance) {
      console.log(
        `❌ DEBUG: Position unsafe - too close to player ${playerId} head (distance: ${distance.toFixed(
          2
        )}, required: ${requiredDistance.toFixed(2)})`
      );
      return false;
    }

    // Check distance from player body points with enhanced safety
    for (const point of player.points) {
      const pointDistance = Math.hypot(x - point.x, y - point.y);
      const requiredPointDistance = minDistance + radius + point.radius;
      if (pointDistance < requiredPointDistance) {
        console.log(
          `❌ DEBUG: Position unsafe - too close to player ${playerId} body (distance: ${pointDistance.toFixed(
            2
          )}, required: ${requiredPointDistance.toFixed(2)})`
        );
        return false;
      }
    }
  }

  // Check distance from dead points to avoid spawning on food
  for (const deadPoint of gameState.deadPoints) {
    const deadDistance = Math.hypot(x - deadPoint.x, y - deadPoint.y);
    if (deadDistance < 40 + radius) {
      console.log(
        `❌ DEBUG: Position unsafe - too close to dead point (distance: ${deadDistance.toFixed(
          2
        )})`
      );
      return false;
    }
  }

  // Check distance from food to avoid spawning in food clusters
  let nearbyFoodCount = 0;
  for (const food of gameState.foods) {
    const foodDistance = Math.hypot(x - food.x, y - food.y);
    if (foodDistance < 60) {
      nearbyFoodCount++;
      if (nearbyFoodCount >= 3) {
        console.log(
          `❌ DEBUG: Position unsafe - too many nearby foods (${nearbyFoodCount})`
        );
        return false;
      }
    }
  }

  // Additional safety check: ensure spawn direction is clear
  const testAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
  let clearDirections = 0;
  for (const angle of testAngles) {
    const testDistance = 100;
    const testX = x + Math.cos(angle) * testDistance;
    const testY = y + Math.sin(angle) * testDistance;

    if (
      testX >= boundaryBuffer &&
      testX <= gameState.worldWidth - boundaryBuffer &&
      testY >= boundaryBuffer &&
      testY <= gameState.worldHeight - boundaryBuffer
    ) {
      let directionClear = true;
      for (const [playerId, player] of gameState.players.entries()) {
        if (!player.alive) continue;
        const distToPlayer = Math.hypot(testX - player.x, testY - player.y);
        if (distToPlayer < minDistance * 0.7) {
          directionClear = false;
          break;
        }
      }
      if (directionClear) clearDirections++;
    }
  }

  if (clearDirections < 2) {
    console.log(
      `❌ DEBUG: Position unsafe - insufficient clear directions (${clearDirections}/4)`
    );
    return false;
  }

  console.log(
    `✅ DEBUG: Position is safe at (${x.toFixed(2)}, ${y.toFixed(
      2
    )}) with ${clearDirections} clear directions`
  );
  return true;
}

// Find safe spawn position - enhanced with better distribution and emergency fallback
function findSafeSpawnPosition(radius) {
  console.log(`🎯 DEBUG: Finding safe spawn position for radius ${radius}`);
  const spawnZones = getSpawnZones();
  const maxZoneAttempts = 50; // Increased per-zone attempts for better success rate
  const maxFallbackAttempts = 150; // Further increased fallback attempts
  const maxRetries = 3; // Multiple retry attempts with different strategies

  // Prioritize zones with fewer nearby players for better distribution
  const zonesWithPlayerCount = spawnZones.map((zone) => {
    const nearbyPlayers = Array.from(gameState.players.values())
      .filter((p) => p.alive)
      .filter((p) => Math.hypot(p.x - zone.x, p.y - zone.y) < 300).length;
    return { zone, nearbyPlayers, index: spawnZones.indexOf(zone) };
  });

  // Sort zones by player count (fewer players = higher priority)
  zonesWithPlayerCount.sort((a, b) => a.nearbyPlayers - b.nearbyPlayers);

  console.log(
    `🎯 DEBUG: Zone priority order:`,
    zonesWithPlayerCount
      .map(
        (z) =>
          `Zone${z.index}(${z.zone.x.toFixed(0)},${z.zone.y.toFixed(0)}):${
            z.nearbyPlayers
          }players`
      )
      .join(", ")
  );

  // Try each zone in priority order
  for (const zoneData of zonesWithPlayerCount) {
    const { zone, index } = zoneData;
    console.log(
      `🎯 DEBUG: Trying spawn zone ${index} at center (${zone.x.toFixed(
        0
      )}, ${zone.y.toFixed(0)}) with ${zoneData.nearbyPlayers} nearby players`
    );

    for (let attempt = 0; attempt < maxZoneAttempts; attempt++) {
      // Random position within the zone with better distribution
      const offsetX = (Math.random() - 0.5) * zone.size * 0.8; // Use 80% of zone size
      const offsetY = (Math.random() - 0.5) * zone.size * 0.8;
      const x = zone.x + offsetX;
      const y = zone.y + offsetY;

      // Ensure position is within world bounds with proper margins
      const margin = 60;
      const clampedX = Math.max(
        margin,
        Math.min(gameState.worldWidth - margin, x)
      );
      const clampedY = Math.max(
        margin,
        Math.min(gameState.worldHeight - margin, y)
      );

      if (isPositionSafe(clampedX, clampedY, radius)) {
        console.log(
          `✅ DEBUG: Found safe position in zone ${index} at (${clampedX.toFixed(
            2
          )}, ${clampedY.toFixed(2)}) after ${attempt + 1} attempts`
        );
        return { x: clampedX, y: clampedY };
      }
    }
    console.log(
      `❌ DEBUG: Zone ${index} failed after ${maxZoneAttempts} attempts`
    );
  }

  console.log(`⚠️ DEBUG: All zones failed, trying enhanced fallback positions`);
  // Enhanced fallback: try scattered positions across the entire map
  for (let attempt = 0; attempt < maxFallbackAttempts; attempt++) {
    const margin = 80;
    const x = margin + Math.random() * (gameState.worldWidth - 2 * margin);
    const y = margin + Math.random() * (gameState.worldHeight - 2 * margin);

    if (isPositionSafe(x, y, radius, 100)) {
      // Reduced safety distance for fallback
      console.log(
        `✅ DEBUG: Found safe fallback position at (${x.toFixed(
          2
        )}, ${y.toFixed(2)}) after ${attempt + 1} attempts`
      );
      return { x, y };
    }
  }

  console.log(
    `🚨 DEBUG: Enhanced fallback failed, trying emergency strategies`
  );

  // Strategy 1: Emergency scatter spawn with relaxed safety requirements
  for (let retry = 0; retry < maxRetries; retry++) {
    console.log(`🔄 DEBUG: Emergency retry ${retry + 1}/${maxRetries}`);
    let bestPosition = null;
    let maxMinDistance = 0;
    const relaxedMinDistance = Math.max(50, 150 - retry * 30); // Gradually relax requirements

    for (let attempt = 0; attempt < 75; attempt++) {
      const margin = 120 - retry * 20; // Gradually reduce margin
      const x = margin + Math.random() * (gameState.worldWidth - 2 * margin);
      const y = margin + Math.random() * (gameState.worldHeight - 2 * margin);

      // Find minimum distance to any existing player
      let minDistance = Infinity;
      for (const player of gameState.players.values()) {
        if (!player.alive) continue;
        const distance = Math.hypot(x - player.x, y - player.y);
        minDistance = Math.min(minDistance, distance);
      }

      if (minDistance > maxMinDistance && minDistance >= relaxedMinDistance) {
        maxMinDistance = minDistance;
        bestPosition = { x, y };
      }
    }

    if (
      bestPosition &&
      isPositionSafe(bestPosition.x, bestPosition.y, radius, relaxedMinDistance)
    ) {
      console.log(
        `🚨 DEBUG: Found emergency position at (${bestPosition.x.toFixed(
          2
        )}, ${bestPosition.y.toFixed(
          2
        )}) with min distance ${maxMinDistance.toFixed(2)} on retry ${
          retry + 1
        }`
      );
      return bestPosition;
    }
  }

  // Strategy 2: Grid-based systematic search
  console.log(`🔍 DEBUG: Trying systematic grid search`);
  const gridSize = 8;
  const stepX = (gameState.worldWidth - 200) / gridSize;
  const stepY = (gameState.worldHeight - 200) / gridSize;

  for (let gx = 0; gx < gridSize; gx++) {
    for (let gy = 0; gy < gridSize; gy++) {
      const x = 100 + gx * stepX + Math.random() * stepX * 0.5;
      const y = 100 + gy * stepY + Math.random() * stepY * 0.5;

      if (isPositionSafe(x, y, radius, 80)) {
        console.log(
          `🔍 DEBUG: Found grid position at (${x.toFixed(2)}, ${y.toFixed(2)})`
        );
        return { x, y };
      }
    }
  }

  console.log(`🚨 DEBUG: All methods failed, using safe edge position`);
  // Absolute last resort: safe edge position
  const edge = Math.floor(Math.random() * 4);
  const safeMargin = 100;
  const edgePosition = {
    0: {
      x: safeMargin,
      y: safeMargin + Math.random() * (gameState.worldHeight - 2 * safeMargin),
    },
    1: {
      x: gameState.worldWidth - safeMargin,
      y: safeMargin + Math.random() * (gameState.worldHeight - 2 * safeMargin),
    },
    2: {
      x: safeMargin + Math.random() * (gameState.worldWidth - 2 * safeMargin),
      y: safeMargin,
    },
    3: {
      x: safeMargin + Math.random() * (gameState.worldWidth - 2 * safeMargin),
      y: gameState.worldHeight - safeMargin,
    },
  }[edge];
  console.log(
    `🚨 DEBUG: Using safe edge ${edge} position at (${edgePosition.x.toFixed(
      2
    )}, ${edgePosition.y.toFixed(2)})`
  );
  return edgePosition;
}

// Calculate safe spawn direction that avoids borders and obstacles
function calculateSafeSpawnDirection(x, y, radius) {
  const borderBuffer = 250; // Increased distance to avoid from borders
  const playerAvoidanceRadius = 180; // Distance to avoid other players
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
  if (
    !tooCloseToLeft &&
    !tooCloseToRight &&
    !tooCloseToTop &&
    !tooCloseToBottom
  ) {
    const angleToCenter = Math.atan2(mapCenterY - y, mapCenterX - x);
    // Add some randomness around center direction (±60 degrees)
    const randomOffset = (Math.random() - 0.5) * (Math.PI / 3);
    return angleToCenter + randomOffset;
  }

  // Generate safe angle ranges avoiding problematic borders and players
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 12) {
    // More precise angle testing
    const testDistance = 200; // Increased distance to test in this direction
    const testX = x + Math.cos(angle) * testDistance;
    const testY = y + Math.sin(angle) * testDistance;

    // Check if this direction leads to safe territory (borders)
    const wouldHitBorder =
      testX < borderBuffer ||
      testX > gameState.worldWidth - borderBuffer ||
      testY < borderBuffer ||
      testY > gameState.worldHeight - borderBuffer;

    // Check if this direction would lead too close to other players
    let tooCloseToPlayer = false;
    for (const player of gameState.players.values()) {
      if (!player.alive) continue;
      const playerDistance = Math.hypot(testX - player.x, testY - player.y);
      if (playerDistance < playerAvoidanceRadius) {
        tooCloseToPlayer = true;
        break;
      }
    }

    if (!wouldHitBorder && !tooCloseToPlayer) {
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
  if (
    distToLeft > distToRight &&
    distToLeft > distToTop &&
    distToLeft > distToBottom
  ) {
    openDirections.push(Math.PI); // Left
  }
  if (
    distToRight > distToLeft &&
    distToRight > distToTop &&
    distToRight > distToBottom
  ) {
    openDirections.push(0); // Right
  }
  if (
    distToTop > distToLeft &&
    distToTop > distToRight &&
    distToTop > distToBottom
  ) {
    openDirections.push(Math.PI * 1.5); // Up
  }
  if (
    distToBottom > distToLeft &&
    distToBottom > distToRight &&
    distToBottom > distToTop
  ) {
    openDirections.push(Math.PI * 0.5); // Down
  }

  if (openDirections.length > 0) {
    const baseDirection =
      openDirections[Math.floor(Math.random() * openDirections.length)];
    const variation = (Math.random() - 0.5) * (Math.PI / 4); // ±45 degrees
    return baseDirection + variation;
  }

  // Last resort: random angle (should rarely happen with improved spawn zones)
  console.log(
    `⚠️ DEBUG: Using fallback random angle for position (${x.toFixed(
      2
    )}, ${y.toFixed(2)})`
  );
  return Math.random() * Math.PI * 2;
}

function createBot(id) {
  const botRadius = 4;
  const safePosition = findSafeSpawnPosition(botRadius);
  const safeAngle = calculateSafeSpawnDirection(
    safePosition.x,
    safePosition.y,
    botRadius
  );

  console.log(
    `🤖 DEBUG: Creating bot ${id} at position (${safePosition.x.toFixed(
      2
    )}, ${safePosition.y.toFixed(2)}) with safe angle ${safeAngle.toFixed(
      3
    )} radians (${((safeAngle * 180) / Math.PI).toFixed(1)}°)`
  );

  // Bot personality types for diverse behavior
  const personalityTypes = ["explorer", "hunter", "wanderer"];
  const personality =
    personalityTypes[Math.floor(Math.random() * personalityTypes.length)];

  const bot = {
    id: id,
    socketId: null, // Bots don't have socket connections
    x: safePosition.x,
    y: safePosition.y,
    points: [],
    angle: safeAngle,
    radius: botRadius,
    speed: 1.5,
    color: getRandomColor(),
    score: POINT,
    alive: true,
    isBot: true,
    spawnProtection: true,
    spawnTime: Date.now(),
    lastDirectionChange: Date.now(), // Timer for straight movement preference
    straightMovementDuration: 4000 + Math.random() * 4000, // 4-8 seconds of straight movement

    // Enhanced bot properties for improved movement
    personality: personality,
    explorationRadius: 120 + Math.random() * 30, // 120-150 pixels
    currentSector: null,
    visitedSectors: new Set(),
    lastSectorChange: Date.now(),
    movementPattern: "straight",
    patternStartTime: Date.now(),
    patternDuration: 3000 + Math.random() * 2000,
    momentum: { x: 0, y: 0 },
    wanderTarget: null,
    lastWanderTime: Date.now(),
  };

  console.log(
    `🛡️ DEBUG: Bot ${id} spawn protection enabled until ${new Date(
      bot.spawnTime + 3000
    ).toLocaleTimeString()}`
  );

  // Initialize bot with starting points using bot's main color
  for (let i = 0; i < 20; i++) {
    bot.points.push({
      x: bot.x - i * 2,
      y: bot.y,
      radius: bot.radius,
      color: bot.color, // Use bot's main color for consistency
      type: getRandomFood(), // Add random food type for variety when bot dies
    });
  }

  console.log(
    `✅ DEBUG: Bot ${id} created successfully with ${bot.points.length} body points`
  );
  return bot;
}

function spawnBots(count = MAX_BOTS) {
  const currentTime = Date.now();

  // Throttle spawn attempts to prevent spam
  if (currentTime - lastBotSpawnAttempt < BOT_SPAWN_COOLDOWN) {
    return;
  }

  // Count current bots (both alive and dead)
  const currentBots = Array.from(gameState.players.values()).filter(
    (p) => p.isBot
  ).length;
  const availableSlots = MAX_BOTS - currentBots;
  const botsToSpawn = Math.min(count, availableSlots);

  if (botsToSpawn <= 0) {
    // Throttled logging to prevent spam
    if (currentTime - lastBotLimitLog > BOT_LOG_THROTTLE) {
      console.log(
        `Bot limit reached (${MAX_BOTS}). Current bots: ${currentBots}`
      );
      lastBotLimitLog = currentTime;
    }
    return;
  }

  lastBotSpawnAttempt = currentTime;

  for (let i = 0; i < botsToSpawn; i++) {
    const botId = `bot-${generatePlayerId()}`;
    const bot = createBot(botId);
    gameState.players.set(botId, bot);
    console.log(
      `Bot spawned: ${botId} at position (${bot.x.toFixed(2)}, ${bot.y.toFixed(
        2
      )})`
    );

    // Broadcast new bot to all players
    io.emit("playerJoined", bot);
  }

  const totalBots = currentBots + botsToSpawn;
  const aliveBots = Array.from(gameState.players.values()).filter(
    (p) => p.isBot && p.alive
  ).length;
  console.log(
    `Bot spawning complete: ${botsToSpawn} spawned, ${totalBots}/${MAX_BOTS} total, ${aliveBots} alive`
  );
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

  // Convert bot's body points to food items with strict limit enforcement
  const newFoodItems = [];
  const currentFoodCount = gameState.foods.length;
  const availableSlots = Math.max(0, gameState.maxFoods - currentFoodCount);
  
  // Only convert segments up to the available food slots
  const segmentsToConvert = Math.min(bot.points.length, availableSlots);
  
  for (let i = 0; i < segmentsToConvert; i++) {
    const point = bot.points[i];
    // Use food type from point if available, otherwise default to pizza
    const type = point.type || "pizza";
    const foodId = `${type}_bot_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    
    // Determine color based on food type using existing function
    const foodColor = getFoodColorByType(type);
    
    const foodItem = {
      id: foodId,
      x: point.x,
      y: point.y,
      radius: point.radius * 1.1,
      color: foodColor,
      type: type,
      createdAt: Date.now(),
    };

    gameState.foods.push(foodItem);
    newFoodItems.push(foodItem);
  }

  if (segmentsToConvert < bot.points.length) {
    console.log(
      `🍕 Bot death: Created ${newFoodItems.length}/${bot.points.length} food items from bot ${bot.id} segments (limited by maxFoods: ${gameState.maxFoods})`
    );
  } else {
    console.log(
      `🍕 Bot death: Created ${newFoodItems.length} food items from bot ${bot.id} segments (types: ${newFoodItems.map(f => f.type).join(', ')})`
    );
  }

  // Remove bot from game state
  gameState.players.delete(bot.id);

  // Enhanced logging for bot death debugging
  // const remainingBots = Array.from(gameState.players.values()).filter(p => p.isBot && p.alive).length;
  // const totalPlayers = gameState.players.size;
  // console.log(`🤖 Bot Death: ${bot.id} died at (${bot.x.toFixed(2)}, ${bot.y.toFixed(2)}) | Score: ${bot.score.toFixed(1)} | Remaining bots: ${remainingBots} | Total players: ${totalPlayers}`);

  // Broadcast bot death and new food items
  io.emit("playerDied", {
    playerId: bot.id,
    deadPoints: [], // No dead points anymore
    newFoods: newFoodItems, // Send new pizza food items
  });

  // Also broadcast food update to sync all clients
  io.emit("foodsUpdated", newFoodItems);
  
  // Perform food cleanup if we're approaching the limit
  if (gameState.foods.length > gameState.maxFoods * 0.8) {
    performFoodCleanup();
  }

  // Broadcast bot removal
  io.emit("playerDisconnected", bot.id);

  // Update leaderboard after bot removal
  const leaderboard = generateLeaderboard();
  const fullLeaderboard = generateFullLeaderboard();
  io.emit("leaderboardUpdate", {
    leaderboard: leaderboard,
    fullLeaderboard: fullLeaderboard,
  });
}

// ===== SERVER STATE MANAGEMENT FUNCTIONS =====

// Check if server should be paused (no human players)
function shouldPauseServer() {
  const humanPlayers = Array.from(gameState.players.values()).filter(
    (p) => !p.isBot && p.alive
  );
  return humanPlayers.length === 0;
}

// Pause server operations
function pauseServer() {
  if (serverState === SERVER_STATES.PAUSED) return;

  console.log("🔄 SERVER: Pausing server operations (no active players)");
  serverState = SERVER_STATES.PAUSED;
  performanceMetrics.stateTransitions++;
  performanceMetrics.serverPauses++;

  // Clear all game loop intervals
  gameLoopIntervals.forEach((interval) => clearInterval(interval));
  gameLoopIntervals = [];

  // Keep minimal bot count during pause
  const currentBots = Array.from(gameState.players.values()).filter(
    (p) => p.isBot
  );
  const botsToRemove = currentBots.length - PERFORMANCE_CONFIG.MIN_BOTS_IDLE;

  if (botsToRemove > 0) {
    // Remove excess bots (keep lowest scoring ones)
    const sortedBots = currentBots.sort((a, b) => a.score - b.score);
    for (let i = 0; i < botsToRemove; i++) {
      const bot = sortedBots[i];
      gameState.players.delete(bot.id);
      io.emit("playerDisconnected", bot.id);
    }
    console.log(
      `🤖 SERVER: Removed ${botsToRemove} bots during pause (keeping ${PERFORMANCE_CONFIG.MIN_BOTS_IDLE})`
    );
  }

  // Start idle game loop with reduced frequency
  startIdleGameLoop();

  // Restart intervals with idle configuration
  startBotIntervals();
  startCleanupInterval();
}

// Resume server operations
function resumeServer() {
  if (serverState === SERVER_STATES.ACTIVE) return;

  console.log("🔄 SERVER: Resuming server operations");
  serverState = SERVER_STATES.RESUMING;
  performanceMetrics.stateTransitions++;
  performanceMetrics.serverResumes++;

  // Clear pause timeout if exists
  if (pauseTimeout) {
    clearTimeout(pauseTimeout);
    pauseTimeout = null;
  }

  // Ensure minimum active bots
  const currentBots = Array.from(gameState.players.values()).filter(
    (p) => p.isBot
  );
  const botsNeeded = PERFORMANCE_CONFIG.MIN_BOTS_ACTIVE - currentBots.length;

  if (botsNeeded > 0) {
    spawnBots(botsNeeded);
    console.log(
      `🤖 SERVER: Spawned ${botsNeeded} additional bots for active state`
    );
  }

  // Start active game loop
  setTimeout(() => {
    serverState = SERVER_STATES.ACTIVE;
    startActiveGameLoop();

    // Restart intervals with active configuration
    startBotIntervals();
    startCleanupInterval();

    console.log("✅ SERVER: Server fully resumed and active");
  }, PERFORMANCE_CONFIG.RESUME_TIMEOUT);
}

// Update player activity tracking
function updatePlayerActivity() {
  lastPlayerActivity = Date.now();

  // Cancel pause timeout if server should resume
  if (serverState === SERVER_STATES.PAUSED && !shouldPauseServer()) {
    resumeServer();
  } else if (serverState === SERVER_STATES.ACTIVE && shouldPauseServer()) {
    // Schedule pause if no activity
    if (pauseTimeout) clearTimeout(pauseTimeout);
    pauseTimeout = setTimeout(() => {
      if (shouldPauseServer()) {
        pauseServer();
      }
    }, PERFORMANCE_CONFIG.PAUSE_DELAY);
  }
}

// ===== FOOD CLEANUP FUNCTIONS =====

// Clean up excess food items when approaching maxFoods limit
function performFoodCleanup(targetReduction = 50) {
  const currentCount = gameState.foods.length;
  
  if (currentCount <= gameState.maxFoods * 0.8) {
    return; // Only cleanup when we're at 80% of max capacity
  }
  
  console.log(`🧹 FOOD CLEANUP: Starting cleanup - current: ${currentCount}, max: ${gameState.maxFoods}`);
  
  // Get current player positions for distance calculations
  const playerPositions = Array.from(gameState.players.values())
    .filter((p) => p.alive)
    .map((p) => ({ x: p.x, y: p.y }));
  
  // Add timestamps to food items if missing and calculate cleanup priority
  const currentTime = Date.now();
  const foodsWithPriority = gameState.foods.map((food) => {
    if (!food.createdAt) food.createdAt = currentTime - Math.random() * 30000;
    
    let priority = 0;
    const age = currentTime - food.createdAt;
    
    // Age factor (older food gets higher priority for removal)
    priority += Math.min(age / 30000, 5); // Max 5 points for age (30s = max age score)
    
    // Distance from players (farther = higher priority for removal)
    let minPlayerDistance = Infinity;
    for (const pos of playerPositions) {
      const distance = Math.hypot(food.x - pos.x, food.y - pos.y);
      minPlayerDistance = Math.min(minPlayerDistance, distance);
    }
    
    if (minPlayerDistance > 400) priority += 3; // Far from players
    else if (minPlayerDistance > 200) priority += 1; // Moderately far
    else if (minPlayerDistance < 100) priority -= 2; // Close to players (keep)
    
    return { food, priority };
  });
  
  // Sort by priority (highest first) and remove excess food
  foodsWithPriority.sort((a, b) => b.priority - a.priority);
  const foodsToRemove = Math.min(targetReduction, currentCount - gameState.maxFoods + 20);
  
  if (foodsToRemove > 0) {
    const removedFoods = [];
    for (let i = 0; i < foodsToRemove; i++) {
      removedFoods.push(foodsWithPriority[i].food);
    }
    
    // Remove from gameState
    gameState.foods = gameState.foods.filter(food => !removedFoods.includes(food));
    
    // Broadcast removal to clients
    io.emit("foodsRemoved", removedFoods.map(f => f.id));
    
    console.log(`🧹 FOOD CLEANUP: Removed ${foodsToRemove} food items (${gameState.foods.length} remaining)`);
  }
}

// ===== SMART DEAD SNAKE CLEANUP FUNCTIONS =====

// Calculate priority score for dead point cleanup (higher = more likely to be removed)
function calculateCleanupPriority(deadPoint, humanPlayerPositions, botPlayerPositions, spawnZones) {
  let priority = 0;
  const currentTime = Date.now();

  // Protection mechanism: Don't clean up points that haven't existed for CLEANUP_INTERVAL
  const age = currentTime - (deadPoint.createdAt || currentTime);
  const CLEANUP_PROTECTION_TIME = PERFORMANCE_CONFIG.CLEANUP_INTERVAL; // 30 seconds
  
  // If the dead point is too new, give it very low priority (protect it)
  if (age < CLEANUP_PROTECTION_TIME) {
    return -1000; // Very low priority, should not be cleaned up
  }

  // Age factor (older points get higher priority for removal)
  priority += Math.min(age / 60000, 8); // Max 8 points for age (1 minute = max age score)

  // Enhanced distance-based scoring with player type awareness
  let minHumanDistance = Infinity;
  let minBotDistance = Infinity;

  // Calculate distances to human players (highest priority for preservation)
  for (const pos of humanPlayerPositions) {
    const distance = Math.hypot(deadPoint.x - pos.x, deadPoint.y - pos.y);
    minHumanDistance = Math.min(minHumanDistance, distance);
  }

  // Calculate distances to bot players (medium priority for preservation)
  for (const pos of botPlayerPositions) {
    const distance = Math.hypot(deadPoint.x - pos.x, deadPoint.y - pos.y);
    minBotDistance = Math.min(minBotDistance, distance);
  }

  // Priority system: Far from humans > Near bots but far from humans > Near humans
  if (minHumanDistance !== Infinity) {
    if (minHumanDistance > 400) {
      priority += 15; // Very far from human players - highest cleanup priority
    } else if (minHumanDistance > 250) {
      priority += 10; // Far from human players - high cleanup priority
    } else if (minHumanDistance > 150) {
      priority += 5; // Moderately far from human players
    } else if (minHumanDistance > 80) {
      priority += 1; // Close to human players - low cleanup priority
    } else {
      priority -= 10; // Very close to human players - protect strongly
    }
  }

  // Bot distance consideration (lower weight than human distance)
  if (minBotDistance !== Infinity) {
    if (minBotDistance > 300) {
      priority += 3; // Far from bots - moderate cleanup priority
    } else if (minBotDistance > 150) {
      priority += 1; // Moderately far from bots
    } else if (minBotDistance < 60) {
      priority -= 2; // Close to bots - slight protection
    }
  }

  // If no human players, use bot distances with higher weight
  if (humanPlayerPositions.length === 0 && minBotDistance !== Infinity) {
    if (minBotDistance > 300) priority += 8;
    else if (minBotDistance > 150) priority += 4;
    else if (minBotDistance < 80) priority -= 5;
  }

  // Distance from spawn zones (closer to spawn = lower priority for removal)
  let minSpawnDistance = Infinity;
  for (const zone of spawnZones) {
    const distance = Math.hypot(deadPoint.x - zone.x, deadPoint.y - zone.y);
    minSpawnDistance = Math.min(minSpawnDistance, distance);
  }

  if (minSpawnDistance < 100) priority -= 6; // Very close to spawn (protect more)
  else if (minSpawnDistance < 200) priority -= 2; // Close to spawn

  return priority;
}

// Smart dead point cleanup with priority-based removal
function performSmartDeadPointCleanup(forceCleanup = false) {
  const currentCount = gameState.deadPoints.length;

  // Check if cleanup is needed
  if (!forceCleanup && currentCount < PERFORMANCE_CONFIG.CLEANUP_THRESHOLD) {
    return;
  }

  const targetCount = PERFORMANCE_CONFIG.MAX_DEAD_POINTS;
  let pointsToRemove = Math.max(0, currentCount - targetCount);

  if (pointsToRemove === 0) return;

  // Implement gradual cleanup - don't remove everything at once
  const maxRemovalPerCleanup = Math.min(pointsToRemove, Math.max(50, Math.floor(currentCount * 0.15)));
  pointsToRemove = Math.min(pointsToRemove, maxRemovalPerCleanup);

  console.log(
    `🧹 CLEANUP: Starting smart cleanup - removing ${pointsToRemove} of ${currentCount} dead points`
  );

  // Separate human and bot players for enhanced priority calculation
  const alivePlayers = Array.from(gameState.players.values()).filter((p) => p.alive);
  const humanPlayerPositions = alivePlayers
    .filter((p) => !p.isBot)
    .map((p) => ({ x: p.x, y: p.y }));
  const botPlayerPositions = alivePlayers
    .filter((p) => p.isBot)
    .map((p) => ({ x: p.x, y: p.y }));

  // Get spawn zones
  const spawnZones = getSpawnZones();

  // Add timestamps to dead points if missing
  const currentTime = Date.now();
  gameState.deadPoints.forEach((dp) => {
    if (!dp.createdAt) dp.createdAt = currentTime - Math.random() * 30000; // Random age up to 30s
  });

  // Calculate cluster density for each point
  gameState.deadPoints.forEach((point) => {
    let nearbyCount = 0;
    for (const other of gameState.deadPoints) {
      if (other !== point) {
        const distance = Math.hypot(point.x - other.x, point.y - other.y);
        if (distance < 50) nearbyCount++;
      }
    }
    point.clusterDensity = nearbyCount;
  });

  // Calculate priority scores with enhanced player type awareness
  const pointsWithPriority = gameState.deadPoints.map((point) => {
    let priority = calculateCleanupPriority(point, humanPlayerPositions, botPlayerPositions, spawnZones);

    // Add cluster density bonus (remove from dense areas)
    if (point.clusterDensity > 5) priority += 4;
    else if (point.clusterDensity > 3) priority += 2;
    else if (point.clusterDensity > 1) priority += 1;

    // Add small randomization to make cleanup less predictable
    priority += (Math.random() - 0.5) * 2;

    return { point, priority };
  });

  // Sort by priority (highest first) and remove top candidates
  pointsWithPriority.sort((a, b) => b.priority - a.priority);
  
  // Filter out points that are too new (additional safety check)
  const eligiblePoints = pointsWithPriority.filter(item => {
    const age = currentTime - (item.point.createdAt || currentTime);
    return age >= PERFORMANCE_CONFIG.CLEANUP_INTERVAL;
  });

  const actualPointsToRemove = Math.min(pointsToRemove, eligiblePoints.length);
  const pointsToRemoveList = eligiblePoints
    .slice(0, actualPointsToRemove)
    .map((item) => item.point);

  // Remove selected points
  gameState.deadPoints = gameState.deadPoints.filter(
    (point) => !pointsToRemoveList.includes(point)
  );

  // Update metrics
  performanceMetrics.deadPointsCleanedUp += actualPointsToRemove;

  console.log(
    `✅ CLEANUP: Removed ${actualPointsToRemove} dead points, ${gameState.deadPoints.length} remaining (${humanPlayerPositions.length} humans, ${botPlayerPositions.length} bots)`
  );

  // Broadcast cleanup to clients if significant (with reduced threshold)
  if (actualPointsToRemove > 500) {
    io.emit("deadPointsCleanup", {
      removedCount: actualPointsToRemove,
      remainingCount: gameState.deadPoints.length,
    });
  }
}

// Enhanced dead point creation with timestamp
function createDeadPoint(x, y, radius, color) {
  const deadPoint = {
    x,
    y,
    radius,
    color,
    createdAt: Date.now(),
  };

  gameState.deadPoints.push(deadPoint);
  performanceMetrics.deadPointsCreated++;
  updatePeakMetrics();

  return deadPoint;
}

function updateBots() {
  // Check if there are any human players in the room
  const humanPlayers = Array.from(gameState.players.values()).filter(
    (p) => !p.isBot && p.alive
  );

  // If no human players, don't update bots at all
  if (humanPlayers.length === 0) {
    return;
  }

  // Iterate over all players and filter for bots
  gameState.players.forEach((player) => {
    if (!player.isBot || !player.alive) return;

    // Initialize bot movement tracking if not exists
    if (!player.movementHistory) {
      player.movementHistory = [];
      player.lastExploreTime = 0;
      player.stuckCounter = 0;
    }

    // Track bot position for stuck detection
    const currentPos = { x: player.x, y: player.y, time: Date.now() };
    player.movementHistory.push(currentPos);
    if (player.movementHistory.length > 10) {
      player.movementHistory.shift(); // Keep only last 10 positions
    }

    // Check if bot is stuck in small area
    let isStuck = false;
    if (player.movementHistory.length >= 8) {
      const positions = player.movementHistory.slice(-8);
      const avgX =
        positions.reduce((sum, pos) => sum + pos.x, 0) / positions.length;
      const avgY =
        positions.reduce((sum, pos) => sum + pos.y, 0) / positions.length;
      const maxDistance = Math.max(
        ...positions.map((pos) => Math.hypot(pos.x - avgX, pos.y - avgY))
      );
      isStuck = maxDistance < player.radius * 4; // If moving in very small area
    }

    // Enhanced boundary avoidance with more randomness
    const boundaryBuffer = player.radius * 4; // Increased buffer
    const lookAheadDistance = player.speed * 15; // Look further ahead
    const nextX = player.x + Math.cos(player.angle) * lookAheadDistance;
    const nextY = player.y + Math.sin(player.angle) * lookAheadDistance;

    // Intelligent boundary avoidance - turn toward center instead of reflecting
    const centerX = gameState.worldWidth / 2;
    const centerY = gameState.worldHeight / 2;
    let boundaryAvoidanceApplied = false;

    // Check if approaching any boundary
    const approachingLeft = nextX < boundaryBuffer;
    const approachingRight = nextX > gameState.worldWidth - boundaryBuffer;
    const approachingTop = nextY < boundaryBuffer;
    const approachingBottom = nextY > gameState.worldHeight - boundaryBuffer;

    if (
      approachingLeft ||
      approachingRight ||
      approachingTop ||
      approachingBottom
    ) {
      // Calculate angle toward center with strong randomization
      let escapeAngle = Math.atan2(centerY - player.y, centerX - player.x);

      // Add strong randomization to prevent predictable patterns
      const randomOffset = (Math.random() - 0.5) * Math.PI * 0.8;
      escapeAngle += randomOffset;

      // Special handling for corners - add extra randomization
      const isInCorner =
        (approachingLeft || approachingRight) &&
        (approachingTop || approachingBottom);
      if (isInCorner) {
        // Force a more dramatic escape from corners
        const cornerEscapeBoost = (Math.random() - 0.5) * Math.PI * 0.6;
        escapeAngle += cornerEscapeBoost;

        // Ensure we're moving away from the corner
        if (approachingLeft && approachingTop) {
          escapeAngle = Math.PI * 0.25 + (Math.random() - 0.5) * Math.PI * 0.3; // Southeast-ish
        } else if (approachingRight && approachingTop) {
          escapeAngle = Math.PI * 0.75 + (Math.random() - 0.5) * Math.PI * 0.3; // Southwest-ish
        } else if (approachingLeft && approachingBottom) {
          escapeAngle = -Math.PI * 0.25 + (Math.random() - 0.5) * Math.PI * 0.3; // Northeast-ish
        } else if (approachingRight && approachingBottom) {
          escapeAngle = -Math.PI * 0.75 + (Math.random() - 0.5) * Math.PI * 0.3; // Northwest-ish
        }
      }

      // Apply the escape angle with some smoothing to prevent jerky movement
      let angleDiff = escapeAngle - player.angle;
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

      // Use a stronger turn rate for boundary avoidance
      const boundaryTurnRate = 0.3 + Math.random() * 0.2;
      if (Math.abs(angleDiff) > boundaryTurnRate) {
        player.angle += Math.sign(angleDiff) * boundaryTurnRate;
      } else {
        player.angle = escapeAngle;
      }

      boundaryAvoidanceApplied = true;

      // Mark as exploring to prevent getting stuck
      player.lastExploreTime = Date.now();
      player.stuckCounter = 0;
    }

    // Enhanced AI movement with personality-based behavior
    let targetFound = false;
    let targetAngle = player.angle;
    const seekRadius = player.explorationRadius; // Use bot's individual exploration radius (120-150)

    // Update current sector for sector-based exploration
    const sectorsPerRow = 4;
    const sectorWidth = gameState.worldWidth / sectorsPerRow;
    const sectorHeight = gameState.worldHeight / sectorsPerRow;
    const currentSectorX = Math.floor(player.x / sectorWidth);
    const currentSectorY = Math.floor(player.y / sectorHeight);
    const currentSector = `${currentSectorX}-${currentSectorY}`;

    if (player.currentSector !== currentSector) {
      player.currentSector = currentSector;
      player.visitedSectors.add(currentSector);
      player.lastSectorChange = Date.now();
    }

    // Personality-based target seeking
    let nearestDeadPoint = null;
    let nearestDeadDistance = Infinity;
    let nearestFood = null;
    let nearestFoodDistance = Infinity;

    // Reduce food-seeking frequency based on personality
    const seekingChance =
      player.personality === "hunter"
        ? 0.8
        : player.personality === "explorer"
        ? 0.3
        : 0.5;

    if (Math.random() < seekingChance) {
      // Find nearest dead point within seek radius
      for (const deadPoint of gameState.deadPoints) {
        const distance = Math.hypot(
          deadPoint.x - player.x,
          deadPoint.y - player.y
        );
        if (distance < seekRadius && distance < nearestDeadDistance) {
          nearestDeadPoint = deadPoint;
          nearestDeadDistance = distance;
        }
      }

      // Find nearest food within seek radius
      for (const food of gameState.foods) {
        const distance = Math.hypot(food.x - player.x, food.y - player.y);
        if (distance < seekRadius && distance < nearestFoodDistance) {
          nearestFood = food;
          nearestFoodDistance = distance;
        }
      }
    }

    // Personality-based target prioritization
    const deadPointThreshold = player.personality === "hunter" ? 80 : 50;
    const foodThreshold = player.personality === "hunter" ? 60 : 40;

    if (nearestDeadPoint && nearestDeadDistance < deadPointThreshold) {
      targetAngle = Math.atan2(
        nearestDeadPoint.y - player.y,
        nearestDeadPoint.x - player.x
      );
      targetFound = true;
    } else if (nearestFood && nearestFoodDistance < foodThreshold) {
      targetAngle = Math.atan2(
        nearestFood.y - player.y,
        nearestFood.x - player.x
      );
      targetFound = true;
    }

    if (targetFound) {
      // More direct angle adjustment towards target
      let angleDiff = targetAngle - player.angle;
      // Normalize angle difference to [-π, π]
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

      // Reduced turn rate for smoother, more human-like movement
      const maxTurnRate = 0.08 + Math.random() * 0.02; // 0.08-0.10 radians per update (reduced from 0.15-0.20)
      if (Math.abs(angleDiff) > maxTurnRate) {
        player.angle += Math.sign(angleDiff) * maxTurnRate;
      } else {
        player.angle = targetAngle;
      }
    } else if (!boundaryAvoidanceApplied) {
      // Enhanced movement patterns with personality-based behavior
      const currentTime = Date.now();

      // Update movement pattern based on duration
      if (currentTime - player.patternStartTime > player.patternDuration) {
        const patterns = ["straight", "spiral", "zigzag", "wander"];
        const personalityWeights = {
          explorer: [0.3, 0.2, 0.2, 0.3],
          hunter: [0.5, 0.1, 0.2, 0.2],
          wanderer: [0.2, 0.3, 0.2, 0.3],
        };

        const weights = personalityWeights[player.personality] || [
          0.25, 0.25, 0.25, 0.25,
        ];
        const rand = Math.random();
        let cumulative = 0;

        for (let i = 0; i < patterns.length; i++) {
          cumulative += weights[i];
          if (rand < cumulative) {
            player.movementPattern = patterns[i];
            break;
          }
        }

        player.patternStartTime = currentTime;
        player.patternDuration = 3000 + Math.random() * 4000; // 3-7 seconds
      }

      // Long-distance wandering for explorers
      if (
        player.personality === "explorer" &&
        (!player.wanderTarget ||
          Math.hypot(
            player.x - player.wanderTarget.x,
            player.y - player.wanderTarget.y
          ) < 50)
      ) {
        // Set new wander target in unexplored or less visited sectors
        const unvisitedSectors = [];
        for (let x = 0; x < 4; x++) {
          for (let y = 0; y < 4; y++) {
            const sector = `${x}-${y}`;
            if (!player.visitedSectors.has(sector)) {
              unvisitedSectors.push({
                x: x * sectorWidth + sectorWidth / 2,
                y: y * sectorHeight + sectorHeight / 2,
              });
            }
          }
        }

        if (unvisitedSectors.length > 0) {
          player.wanderTarget =
            unvisitedSectors[
              Math.floor(Math.random() * unvisitedSectors.length)
            ];
        } else {
          // All sectors visited, pick random distant point
          player.wanderTarget = {
            x: Math.random() * gameState.worldWidth,
            y: Math.random() * gameState.worldHeight,
          };
        }
      }

      // Apply movement pattern
      switch (player.movementPattern) {
        case "spiral":
          const spiralTime = (currentTime - player.patternStartTime) / 1000;
          player.angle += 0.1 + Math.sin(spiralTime) * 0.05;
          break;

        case "zigzag":
          if (currentTime - player.lastDirectionChange > 1000) {
            player.angle += (Math.random() - 0.5) * Math.PI * 0.5;
            player.lastDirectionChange = currentTime;
          }
          break;

        case "wander":
          if (player.wanderTarget) {
            const wanderAngle = Math.atan2(
              player.wanderTarget.y - player.y,
              player.wanderTarget.x - player.x
            );
            let angleDiff = wanderAngle - player.angle;
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

            player.angle +=
              Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 0.05);
          }
          break;

        default: // straight
          // Force exploration if stuck or haven't explored for long
          if (isStuck || currentTime - player.lastExploreTime > 15000) {
            const maxAngleChange = Math.PI * 0.8;
            player.angle += (Math.random() - 0.5) * maxAngleChange;
            player.lastExploreTime = currentTime;
            player.stuckCounter = 0;
            player.lastDirectionChange = currentTime;
            player.straightMovementDuration = 6000 + Math.random() * 4000; // 6-10 seconds
          } else {
            // Infrequent small adjustments for natural movement
            if (Math.random() < 0.002) {
              player.angle += (Math.random() - 0.5) * 0.2;
              player.lastDirectionChange = currentTime;
              player.straightMovementDuration = 6000 + Math.random() * 4000;
            }
          }
      }
    }

    // Minimal random direction changes when following targets to maintain straighter paths
    const timeSinceLastChange =
      Date.now() - (player.lastDirectionChange || Date.now());
    const shouldMovestraight =
      timeSinceLastChange < (player.straightMovementDuration || 5000);

    if (
      targetFound &&
      !boundaryAvoidanceApplied &&
      !shouldMovestraight &&
      Math.random() < 0.003
    ) {
      player.angle += (Math.random() - 0.5) * 0.03; // Very small deviation from target path (reduced from 0.1)

      // Set longer straight movement duration after direction change
      player.lastDirectionChange = Date.now();
      player.straightMovementDuration = 5000 + Math.random() * 3000; // 5-8 seconds (increased from 2-3)
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
      console.log(
        `Bot ${player.id} died at boundary: position (${newX.toFixed(
          2
        )}, ${newY.toFixed(2)}), bounds: x[${minX}-${maxX}], y[${minY}-${maxY}]`
      );
      handleBotDeath(player);
      return;
    }

    player.x = newX;
    player.y = newY;

    // Check spawn protection (5 seconds)
    const currentTime = Date.now();
    const spawnProtectionDuration = 5000; // 5 seconds
    const hasSpawnProtection =
      player.spawnProtection &&
      currentTime - player.spawnTime < spawnProtectionDuration;

    // Remove spawn protection after duration
    if (
      player.spawnProtection &&
      currentTime - player.spawnTime >= spawnProtectionDuration
    ) {
      player.spawnProtection = false;
      console.log(
        `🛡️ DEBUG: Spawn protection removed for bot ${player.id} during update`
      );
    }

    // Check collision with other players/bots before updating position
    const botHead = { x: player.x, y: player.y, radius: player.radius };
    let collisionDetected = false;

    if (!hasSpawnProtection) {
      // Only check collisions if not protected
      // Check collision with all other players (both human and bot)
      gameState.players.forEach((otherPlayer) => {
        if (
          otherPlayer.id === player.id ||
          !otherPlayer.alive ||
          collisionDetected
        )
          return;

        // Skip collision with other protected players
        const otherHasProtection =
          otherPlayer.spawnProtection &&
          currentTime - otherPlayer.spawnTime < spawnProtectionDuration;
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
        // Extract the food type that was eaten
        const eatentype = food.type || 'pizza';
        
        // Get point value based on food type
        const pointValue = getPointValueByType(eatentype);
        
        // Bot eats food - same logic as human players
        player.score += pointValue;

        // Add new point to bot's body using bot's main color
        if (player.points.length > 0) {
          const tail = player.points[player.points.length - 1];
          player.points.push({
            x: tail.x,
            y: tail.y,
            radius: player.radius,
            color: player.color, // Use bot's main color instead of food color
            type: eatentype, // Store food type for when bot dies
          });
        }

        // Regenerate food with logging
        const oldPos = { x: food.x, y: food.y };
        const newtype = getRandomFood();
        food.x = Math.random() * gameState.worldWidth;
        food.y = Math.random() * gameState.worldHeight;
        food.color = getFoodColorByType(newtype);
        food.type = newtype;

        // console.log(`🍎 Bot ${player.id} ate food ${food.id}: regenerated from (${oldPos.x.toFixed(2)}, ${oldPos.y.toFixed(2)}) to (${food.x.toFixed(2)}, ${food.y.toFixed(2)})`);

        // Broadcast food regeneration to all players
        io.emit("foodRegenerated", food);

        // Broadcast score update
        io.emit("scoreUpdate", {
          playerId: player.id,
          score: Math.round(player.score * 10) / 10,
        });

        // Broadcast updated leaderboard
        const leaderboard = generateLeaderboard();
        const fullLeaderboard = generateFullLeaderboard();
        io.emit("leaderboardUpdate", {
          leaderboard: leaderboard,
          fullLeaderboard: fullLeaderboard,
        });

        break; // Only eat one food per update cycle
      }
    }

    // Bot collision detection with dead points
    for (let i = gameState.deadPoints.length - 1; i >= 0; i--) {
      const deadPoint = gameState.deadPoints[i];
      if (isCollided(botHead, deadPoint)) {
        // Check if dead point is old enough to be consumed (age-based protection)
        const currentTime = Date.now();
        const age = currentTime - (deadPoint.createdAt || 0);
        
        // Only allow consumption if dead point is older than CLEANUP_INTERVAL (30 seconds)
        if (age >= CLEANUP_INTERVAL) {
          // Get point value based on dead point food type
          const deadPointType = deadPoint.type || 'pizza';
          const pointValue = getPointValueByType(deadPointType);
          
          // Bot eats dead point - award points based on food type
          player.score += pointValue;

          // Add new point to bot's body using bot's main color
          if (player.points.length > 0) {
            const tail = player.points[player.points.length - 1];
            player.points.push({
              x: tail.x,
              y: tail.y,
              radius: player.radius,
              color: player.color, // Use bot's main color for consistency
              type: deadPoint.type || 'pizza', // Preserve food type from consumed dead point
            });
          }

          // Store the consumed dead point for broadcast before removing it
          const consumedDeadPoint = { ...deadPoint };

          // Remove consumed dead point
          gameState.deadPoints.splice(i, 1);

          // Broadcast dead point removal to all clients (same as human players)
          io.emit("deadPointsRemoved", {
            deadPoints: [consumedDeadPoint],
          });

          // Broadcast score update
          io.emit("scoreUpdate", {
            playerId: player.id,
            score: Math.round(player.score * 10) / 10,
          });

          // Broadcast updated leaderboard
          const leaderboard = generateLeaderboard();
          const fullLeaderboard = generateFullLeaderboard();
          io.emit("leaderboardUpdate", {
            leaderboard: leaderboard,
            fullLeaderboard: fullLeaderboard,
          });

          break; // Only eat one dead point per update cycle
        } else {
          // Dead point is protected due to age
          console.log(`🛡️ Bot ${player.id} attempted to eat protected dead point (age: ${Math.round(age/1000)}s < ${CLEANUP_INTERVAL/1000}s)`);
        }
      }
    }
  });
}

// Initialize game
initializeFoods();
console.log(
  `🎮 Game initialized: ${gameState.foods.length} foods spawned in ${gameState.worldWidth}x${gameState.worldHeight} world`
);

// Spawn initial bots for testing
setTimeout(() => {
  console.log("🤖 Spawning initial bots for game testing...");
  spawnBots(5);
}, 1000);

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  // Handle game initialization with user data
  socket.on("gameInit", (userData) => {
    console.log("Game init with user data:", userData);

    // Use authenticated user data from socket.data if available
    const isAuthenticated = socket.data.isAuthenticated;
    const authenticatedUserData = socket.data.userData;
    const authenticatedOpenId = socket.data.openId;
    const authenticatedUserInfo = socket.data.userInfo;

    console.log("🎮 Game initialization:", {
      socketId: socket.id,
      isAuthenticated,
      hasAuthData: !!authenticatedUserData,
      fallbackData: !!userData,
    });

    // Prioritize authenticated data, fallback to provided userData
    const finalUserData = isAuthenticated ? authenticatedUserData : userData;
    const finalOpenId = isAuthenticated
      ? authenticatedOpenId
      : userData?.openId;
    const finalUserInfo = isAuthenticated
      ? authenticatedUserInfo
      : userData?.userInfo;

    // Extract real user ID and name
    const realUserId = getRealUserId(finalOpenId);
    const userName = finalUserInfo?.name || finalUserInfo?.firstName;
    const playerId = realUserId || generatePlayerId();

    const playerRadius = 4;
    const safePosition = findSafeSpawnPosition(playerRadius);
    const safeAngle = calculateSafeSpawnDirection(
      safePosition.x,
      safePosition.y,
      playerRadius
    );

    console.log(
      `👤 DEBUG: Creating player ${playerId} (${
        userName || "Anonymous"
      }) at position (${safePosition.x.toFixed(2)}, ${safePosition.y.toFixed(
        2
      )}) with safe angle ${safeAngle.toFixed(3)} radians (${(
        (safeAngle * 180) /
        Math.PI
      ).toFixed(1)}°)`
    );

    const newPlayer = {
      id: playerId,
      socketId: socket.id,
      x: safePosition.x,
      y: safePosition.y,
      points: [],
      angle: safeAngle,
      radius: playerRadius,
      speed: 0.9,
      color: getRandomColor(),
      score: 0,
      alive: true,
      realUserId: realUserId, // Store real user ID separately
      userName: userName, // Store user name for leaderboard
      spawnProtection: true,
      spawnTime: Date.now(),
    };

    console.log(
      `🛡️ DEBUG: Player ${playerId} spawn protection enabled until ${new Date(
        newPlayer.spawnTime + 3000
      ).toLocaleTimeString()}`
    );

    // Initialize player with starting points using player's main color
    for (let i = 0; i < 25; i++) {
      newPlayer.points.push({
        x: newPlayer.x - i * 2,
        y: newPlayer.y,
        radius: newPlayer.radius,
        color: newPlayer.color, // Use player's main color for consistency
      });
    }

    gameState.players.set(playerId, newPlayer);
    console.log(
      `✅ DEBUG: Player ${playerId} created successfully with ${newPlayer.points.length} body points`
    );

    // Track player connection metrics
    performanceMetrics.playerConnections++;
    updatePeakMetrics();

    // Update player activity for server state management
    updatePlayerActivity();

    // Automatically spawn 5 bots when a user connects (if not already present)
    const humanPlayers = Array.from(gameState.players.values()).filter(
      (p) => !p.isBot
    );
    if (humanPlayers.length === 1) {
      // First human player
      spawnBots(5);
    }

    // Send initial game state to new player
    socket.emit("gameInit", {
      playerId: playerId,
      gameState: {
        players: Array.from(gameState.players.values()),
        foods: gameState.foods,
        deadPoints: gameState.deadPoints,
        worldWidth: gameState.worldWidth,
        worldHeight: gameState.worldHeight,
      },
    });

    // Send initial leaderboard to new player
    const initialLeaderboard = generateLeaderboard();
    const initialFullLeaderboard = generateFullLeaderboard();
    socket.emit("leaderboardUpdate", {
      leaderboard: initialLeaderboard,
      fullLeaderboard: initialFullLeaderboard,
    });

    // Broadcast new player to all other players
    socket.broadcast.emit("playerJoined", newPlayer);

    // Broadcast updated leaderboard to all players
    const updatedLeaderboard = generateLeaderboard();
    const updatedFullLeaderboard = generateFullLeaderboard();
    io.emit("leaderboardUpdate", {
      leaderboard: updatedLeaderboard,
      fullLeaderboard: updatedFullLeaderboard,
    });
  });

  // Handle player movement
  socket.on("playerMove", (data) => {
    const player = gameState.players.get(data.playerId);
    if (player && player.alive) {
      // Update player activity for server state management
      if (!player.isBot) {
        updatePlayerActivity();
      }

      player.angle = data.angle;
      player.x = data.x;
      player.y = data.y;
      player.points = data.points;

      // Check and remove spawn protection after 5 seconds
      const currentTime = Date.now();
      const spawnProtectionDuration = 5000;
      if (
        player.spawnProtection &&
        currentTime - player.spawnTime >= spawnProtectionDuration
      ) {
        player.spawnProtection = false;
        console.log(
          `🛡️ DEBUG: Spawn protection removed for player ${data.playerId} during movement`
        );
      }

      // Broadcast movement to all other players with current spawn protection status
      const hasSpawnProtection =
        player.spawnProtection &&
        currentTime - player.spawnTime < spawnProtectionDuration;
      socket.broadcast.emit("playerMoved", {
        playerId: data.playerId,
        x: data.x,
        y: data.y,
        angle: data.angle,
        points: data.points,
        spawnProtection: hasSpawnProtection,
      });
    }
  });

  // Handle food consumption
  socket.on("foodEaten", (data) => {
    const { playerId, foodId } = data;
    const player = gameState.players.get(playerId);
    const food = gameState.foods.find((f) => f.id === foodId);

    if (player && food) {
      // Update player activity for server state management
      if (!player.isBot) {
        updatePlayerActivity();
      }
      // Extract the food type that was eaten
      const eatentype = food.type || 'pizza';
      
      // Get point value based on food type
      const pointValue = getPointValueByType(eatentype);
      
      // Regenerate food with logging
      const oldPos = { x: food.x, y: food.y };
      const newtype = getRandomFood();
      food.x = Math.random() * gameState.worldWidth;
      food.y = Math.random() * gameState.worldHeight;
      food.color = getFoodColorByType(newtype);
      food.type = newtype;

      player.score += pointValue;
      performanceMetrics.foodEaten++;

      console.log(
        `🍎 Player ${playerId} ate food ${foodId}: regenerated from (${oldPos.x.toFixed(
          2
        )}, ${oldPos.y.toFixed(2)}) to (${food.x.toFixed(2)}, ${food.y.toFixed(
          2
        )})`
      );

      // Score persistence now handled client-side

      // Broadcast food regeneration to all players
      io.emit("foodRegenerated", food);
      
      // Broadcast the eaten food type and point value to the client for snake segment storage and animations
      io.emit("typeEaten", { 
        playerId, 
        foodId, 
        eatentype,
        pointValue 
      });

      // Broadcast score update
      io.emit("scoreUpdate", {
        playerId: playerId,
        score: Math.round(player.score * 10) / 10,
      });

      // Broadcast updated leaderboard
      const leaderboard = generateLeaderboard();
      const fullLeaderboard = generateFullLeaderboard();
      io.emit("leaderboardUpdate", {
        leaderboard: leaderboard,
        fullLeaderboard: fullLeaderboard,
      });
    }
  });

  // Handle dead point consumption
  socket.on("deadPointEaten", (data) => {
    const { playerId, deadPoints } = data;
    const player = gameState.players.get(playerId);

    if (player && deadPoints && deadPoints.length > 0) {
      // Update player activity for server state management
      if (!player.isBot) {
        updatePlayerActivity();
      }
      
      const currentTime = Date.now();
      const validDeadPoints = [];
      const protectedDeadPoints = [];
      
      // Filter dead points based on age - only allow consumption of points older than CLEANUP_INTERVAL
      deadPoints.forEach((consumedPoint) => {
        const index = gameState.deadPoints.findIndex(
          (dp) =>
            Math.abs(dp.x - consumedPoint.x) < 1 &&
            Math.abs(dp.y - consumedPoint.y) < 1 &&
            dp.color === consumedPoint.color
        );
        
        if (index !== -1) {
          const deadPoint = gameState.deadPoints[index];
          const age = currentTime - (deadPoint.createdAt || 0);
          
          // Only allow consumption if dead point is older than CLEANUP_INTERVAL (30 seconds)
          if (age >= CLEANUP_INTERVAL) {
            validDeadPoints.push({ point: consumedPoint, index });
          } else {
            protectedDeadPoints.push(deadPoint);
            console.log(`🛡️ Dead point protected from consumption (age: ${Math.round(age/1000)}s < ${CLEANUP_INTERVAL/1000}s)`);
          }
        }
      });
      
      // Remove only the valid (aged) dead points from game state
      // Sort indices in descending order to avoid index shifting issues
      validDeadPoints.sort((a, b) => b.index - a.index);
      validDeadPoints.forEach(({ index }) => {
        gameState.deadPoints.splice(index, 1);
      });

      // Update player score - award points based on dead point food types
      const consumedCount = validDeadPoints.length;
      let totalPoints = 0;
      validDeadPoints.forEach(({ point }) => {
        const deadPointType = point.type || 'pizza';
        const pointValue = getPointValueByType(deadPointType);
        totalPoints += pointValue;
      });
      player.score += totalPoints;
      performanceMetrics.deadPointsEaten += consumedCount;

      // Only broadcast removal if there were valid dead points consumed
      if (consumedCount > 0) {
        const consumedDeadPoints = validDeadPoints.map(vdp => vdp.point);
        io.emit("deadPointsRemoved", {
          deadPoints: consumedDeadPoints,
        });
      }
      
      // Log protection activity
      if (protectedDeadPoints.length > 0) {
        console.log(`🛡️ Protected ${protectedDeadPoints.length} dead points from consumption (player: ${playerId})`);
      }

      // Only broadcast score and leaderboard updates if points were actually consumed
      if (consumedCount > 0) {
        // Broadcast score update
        io.emit("scoreUpdate", {
          playerId: playerId,
          score: player.score,
        });

        // Broadcast updated leaderboard
        const leaderboard = generateLeaderboard();
        const fullLeaderboard = generateFullLeaderboard();
        io.emit("leaderboardUpdate", {
          leaderboard: leaderboard,
          fullLeaderboard: fullLeaderboard,
        });
      }
    }
  });

  // Handle player death
  socket.on("playerDied", (data) => {
    const player = gameState.players.get(data.playerId);
    if (player) {
      // Score persistence now handled client-side

      player.alive = false;

      // Convert dead points to food items with strict limit enforcement
      const deadPoints = data.deadPoints;
      const newFoodItems = [];
      const currentFoodCount = gameState.foods.length;
      const availableSlots = Math.max(0, gameState.maxFoods - currentFoodCount);
      
      // Only convert segments up to the available food slots
      const segmentsToConvert = Math.min(deadPoints.length, availableSlots);

      for (let i = 0; i < segmentsToConvert; i++) {
        const dp = deadPoints[i];
        // Use the food type from the dead point, default to pizza if not specified
        const type = dp.type || "pizza";
        const foodId = `${type}_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        
        // Determine color based on food type using existing function
        const foodColor = getFoodColorByType(type);
        
        const foodItem = {
          id: foodId,
          x: dp.x,
          y: dp.y,
          radius: 5, // Slightly larger than regular food
          color: foodColor,
          type: type,
          createdAt: Date.now(),
        };

        gameState.foods.push(foodItem);
        newFoodItems.push(foodItem);
      }

      if (segmentsToConvert < deadPoints.length) {
        console.log(
          `🍕 Player death: Created ${newFoodItems.length}/${deadPoints.length} food items from snake segments (limited by maxFoods: ${gameState.maxFoods})`
        );
      } else {
        console.log(
          `🍕 Player death: Created ${newFoodItems.length} food items from snake segments (types: ${newFoodItems.map(f => f.type).join(', ')})`
        );
      }

      // Broadcast player death and new food items
      io.emit("playerDied", {
        playerId: data.playerId,
        deadPoints: [], // No dead points anymore
        newFoods: newFoodItems, // Send new pizza food items
      });

      // Also broadcast food update to sync all clients
      io.emit("foodsUpdated", newFoodItems);
      
      // Perform food cleanup if we're approaching the limit
      if (gameState.foods.length > gameState.maxFoods * 0.8) {
        performFoodCleanup();
      }

      // Only respawn human players, remove bots from arena
      if (player.isBot) {
        // Remove bot from game state completely
        gameState.players.delete(data.playerId);
        console.log(`Bot ${data.playerId} died and was removed from arena`);

        // Broadcast bot removal
        io.emit("playerDisconnected", data.playerId);

        // Update leaderboard after bot removal
        const leaderboard = generateLeaderboard();
        const fullLeaderboard = generateFullLeaderboard();
        io.emit("leaderboardUpdate", {
          leaderboard: leaderboard,
          fullLeaderboard: fullLeaderboard,
        });
      } else {
        // Respawn human player after 3 seconds
        setTimeout(() => {
          if (gameState.players.has(data.playerId)) {
            const safePosition = findSafeSpawnPosition(player.radius);
            const safeAngle = calculateSafeSpawnDirection(
              safePosition.x,
              safePosition.y,
              player.radius
            );
            const spawnTime = Date.now();

            console.log(
              `🔄 DEBUG: Respawning player ${
                data.playerId
              } at position (${safePosition.x.toFixed(
                2
              )}, ${safePosition.y.toFixed(2)})`
            );
            console.log(
              `🧭 DEBUG: Respawn angle: ${safeAngle.toFixed(4)} radians (${(
                (safeAngle * 180) /
                Math.PI
              ).toFixed(1)} degrees)`
            );
            console.log(
              `🛡️ DEBUG: Respawn protection enabled until ${new Date(
                spawnTime + 3000
              ).toLocaleTimeString()}`
            );

            const respawnedPlayer = {
              ...player,
              x: safePosition.x,
              y: safePosition.y,
              angle: safeAngle,
              points: [],
              alive: true,
              score: 0,
              spawnProtection: true,
              spawnTime: spawnTime,
            };

            // Initialize respawned player with starting points using player's main color
            for (let i = 0; i < 25; i++) {
              respawnedPlayer.points.push({
                x: respawnedPlayer.x - i * 2,
                y: respawnedPlayer.y,
                radius: respawnedPlayer.radius,
                color: respawnedPlayer.color, // Use player's main color for consistency
              });
            }

            gameState.players.set(data.playerId, respawnedPlayer);

            console.log(
              `✅ DEBUG: Player ${data.playerId} successfully respawned with ${respawnedPlayer.points.length} body points`
            );

            // Broadcast respawn
            io.emit("playerRespawned", respawnedPlayer);

            // Set up automatic spawn protection removal after 3 seconds
            setTimeout(() => {
              const currentPlayer = gameState.players.get(data.playerId);
              if (currentPlayer && currentPlayer.spawnProtection) {
                currentPlayer.spawnProtection = false;
                console.log(
                  `🛡️ DEBUG: Spawn protection removed for player ${data.playerId}`
                );
              }
            }, 3000);
          }
        }, 3000);
      }
    }
  });

  // Handle request for minimum players
  socket.on("requestMinimumPlayers", (data) => {
    const { minPlayers } = data;
    const currentPlayerCount = gameState.players.size;
    const currentBots = Array.from(gameState.players.values()).filter(
      (p) => p.isBot
    ).length;

    if (currentPlayerCount < minPlayers) {
      const botsNeeded = minPlayers - currentPlayerCount;
      const maxBotsAllowed = Math.min(botsNeeded, MAX_BOTS - currentBots);

      if (maxBotsAllowed > 0) {
        spawnBots(maxBotsAllowed);
      } else {
        // Throttled logging to prevent spam
        const currentTime = Date.now();
        if (currentTime - lastBotLimitLog > BOT_LOG_THROTTLE) {
          console.log(
            `Cannot add more bots. Current: ${currentBots}/${MAX_BOTS}`
          );
          lastBotLimitLog = currentTime;
        }
      }

      // Broadcast updated game state to all players
      io.emit("gameStats", {
        playerCount: gameState.players.size,
        foodCount: gameState.foods.length,
      });
    }
  });

  // Handle voluntary room leaving
  socket.on("leaveRoom", (data) => {
    console.log("Player leaving room:", data.playerId, "socket:", socket.id);

    // Find and remove player (only human players, keep bots)
    const player = gameState.players.get(data.playerId);
    if (player && player.socketId === socket.id && !player.isBot) {
      gameState.players.delete(data.playerId);
      io.emit("playerDisconnected", data.playerId);
      socket.broadcast.emit("playerLeft", {
        playerId: data.playerId,
      });

      // Broadcast updated leaderboard after player leaves
      const leaderboard = generateLeaderboard();
      const fullLeaderboard = generateFullLeaderboard();
      io.emit("leaderboardUpdate", {
        leaderboard: leaderboard,
        fullLeaderboard: fullLeaderboard,
      });

      console.log("Player", data.playerId, "successfully left the room");
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);

    // Find and remove player (only human players, keep bots)
    let disconnectedPlayerId = null;
    for (const [playerId, player] of gameState.players.entries()) {
      if (player.socketId === socket.id && !player.isBot) {
        disconnectedPlayerId = playerId;
      }
    }
    if (disconnectedPlayerId) {
      gameState.players.delete(disconnectedPlayerId);
      performanceMetrics.playerDisconnections++;
      updatePeakMetrics();
      io.emit("playerDisconnected", disconnectedPlayerId);
      socket.broadcast.emit("playerLeft", {
        playerId: disconnectedPlayerId,
      });

      // Broadcast updated leaderboard after player leaves
      const leaderboard = generateLeaderboard();
      const fullLeaderboard = generateFullLeaderboard();
      io.emit("leaderboardUpdate", {
        leaderboard: leaderboard,
        fullLeaderboard: fullLeaderboard,
      });
    }
  });
});

// Smart dead point cleanup with performance optimization
let cleanupInterval;

function startCleanupInterval() {
  if (cleanupInterval) clearInterval(cleanupInterval);

  const interval =
    serverState === SERVER_STATES.ACTIVE
      ? PERFORMANCE_CONFIG.CLEANUP_INTERVAL
      : PERFORMANCE_CONFIG.CLEANUP_INTERVAL * 0.5; // Less frequent when paused

  cleanupInterval = setInterval(() => {
    performSmartDeadPointCleanup();
    
    // Also perform food cleanup if approaching limit
    if (gameState.foods.length > gameState.maxFoods * 0.8) {
      performFoodCleanup();
    }
  }, interval);
}

// Start initial cleanup interval
startCleanupInterval();

// ===== OPTIMIZED BOT MANAGEMENT SYSTEM =====

// Bot update intervals based on server state
let botUpdateInterval;
let botMaintenanceInterval;
let botMaintenanceCounter = 0;

// Start optimized bot intervals
function startBotIntervals() {
  // Clear existing intervals
  if (botUpdateInterval) clearInterval(botUpdateInterval);
  if (botMaintenanceInterval) clearInterval(botMaintenanceInterval);

  // Set intervals based on server state
  const updateFreq =
    serverState === SERVER_STATES.ACTIVE
      ? PERFORMANCE_CONFIG.ACTIVE_BOT_UPDATE_INTERVAL
      : PERFORMANCE_CONFIG.IDLE_BOT_UPDATE_INTERVAL;

  const maintenanceFreq = serverState === SERVER_STATES.ACTIVE ? 5000 : 10000; // 5s active, 10s idle

  console.log(
    `🤖 BOT: Starting intervals - Update: ${updateFreq}ms, Maintenance: ${maintenanceFreq}ms (State: ${serverState})`
  );

  // Bot update interval (movement and AI)
  botUpdateInterval = setInterval(() => {
    if (serverState !== SERVER_STATES.PAUSED) {
      // Check if there are any human players before updating bots
      const humanPlayers = Array.from(gameState.players.values()).filter(
        (p) => !p.isBot && p.alive
      );

      // Only update bots if there are human players in the room
      if (humanPlayers.length > 0) {
        updateBots();

        // Broadcast bot movements to all players
        gameState.players.forEach((player) => {
          if (player.isBot && player.alive) {
            const currentTime = Date.now();
            const spawnProtectionDuration = 5000;
            const hasSpawnProtection =
              player.spawnProtection &&
              currentTime - player.spawnTime < spawnProtectionDuration;

            io.emit("playerMoved", {
              playerId: player.id,
              x: player.x,
              y: player.y,
              angle: player.angle,
              points: player.points,
              spawnProtection: hasSpawnProtection,
            });
          }
        });

        // Update performance metrics
        performanceMetrics.botUpdates++;
      }
    }
  }, updateFreq);

  // Bot maintenance interval (spawning, cleanup)
  botMaintenanceInterval = setInterval(() => {
    if (serverState !== SERVER_STATES.PAUSED) {
      // Check if there are any human players before maintaining bots
      const humanPlayers = Array.from(gameState.players.values()).filter(
        (p) => !p.isBot && p.alive
      );

      // Only maintain bots if there are human players in the room
      if (humanPlayers.length > 0) {
        maintainOptimizedBots();
        performanceMetrics.botMaintenanceCycles++;
      }
    }
  }, maintenanceFreq);
}

// Enhanced bot maintenance with state-aware scaling
function maintainOptimizedBots() {
  const humanPlayers = Array.from(gameState.players.values()).filter(
    (p) => !p.isBot && p.alive
  ).length;
  const aliveBots = Array.from(gameState.players.values()).filter(
    (p) => p.isBot && p.alive
  );
  const allBots = Array.from(gameState.players.values()).filter((p) => p.isBot);

  // If no human players, remove all bots to completely pause bot activity
  if (humanPlayers === 0) {
    if (allBots.length > 0) {
      console.log(
        `🤖 CLEANUP: Removing all ${allBots.length} bots - no human players in room`
      );
      allBots.forEach((bot) => {
        if (bot.alive) {
          handleBotDeath(bot);
        } else {
          gameState.players.delete(bot.id);
          io.emit("playerDisconnected", bot.id);
        }
      });

      // Update leaderboard after removing all bots
      const leaderboard = generateLeaderboard();
      const fullLeaderboard = generateFullLeaderboard();
      io.emit("leaderboardUpdate", {
        leaderboard: leaderboard,
        fullLeaderboard: fullLeaderboard,
      });
    }
    return; // Exit early - no need to spawn bots
  }

  // Dynamic bot scaling based on server state and player count
  let minBots, maxBots;

  if (serverState === SERVER_STATES.PAUSED) {
    minBots = PERFORMANCE_CONFIG.MIN_BOTS_IDLE;
    maxBots = PERFORMANCE_CONFIG.MIN_BOTS_IDLE;
  } else {
    minBots = Math.max(
      PERFORMANCE_CONFIG.MIN_BOTS_ACTIVE,
      Math.min(5, 5 - humanPlayers)
    );
    maxBots = PERFORMANCE_CONFIG.MAX_BOTS_ACTIVE;
  }

  // Remove excess bots if over limit
  if (allBots.length > maxBots) {
    const sortedBots = allBots.sort((a, b) => b.score - a.score);
    const botsToRemove = sortedBots.slice(maxBots);

    botsToRemove.forEach((bot) => {
      console.log(
        `🤖 REMOVE: Bot ${bot.id} (score: ${bot.score.toFixed(
          1
        )}) - maintaining max ${maxBots} bots`
      );
      if (bot.alive) {
        handleBotDeath(bot);
      } else {
        gameState.players.delete(bot.id);
        io.emit("playerDisconnected", bot.id);
      }
    });

    // Update leaderboard after bot removal
    const leaderboard = generateLeaderboard();
    const fullLeaderboard = generateFullLeaderboard();
    io.emit("leaderboardUpdate", {
      leaderboard: leaderboard,
      fullLeaderboard: fullLeaderboard,
    });
  }

  // Spawn bots if needed
  const currentAliveBots = aliveBots.length;
  if (currentAliveBots < minBots && allBots.length < maxBots) {
    const botsNeeded = Math.min(
      minBots - currentAliveBots,
      maxBots - allBots.length
    );
    if (botsNeeded > 0) {
      console.log(
        `🤖 SPAWN: Adding ${botsNeeded} bots (${currentAliveBots}/${minBots} alive, state: ${serverState})`
      );
      spawnBots(botsNeeded);
    }
  }
}

// Start initial bot intervals
startBotIntervals();

// Start memory monitoring system
startMemoryMonitoring();

// Start performance metrics logging
startPerformanceMetricsLogging();

// Generate leaderboard data
function generateLeaderboard() {
  // Get all alive players sorted by score
  const allAlivePlayers = Array.from(gameState.players.values())
    .filter((player) => player.alive)
    .sort((a, b) => b.score - a.score);

  // Assign correct ranks to ALL players
  const playersWithRanks = allAlivePlayers.map((player, index) => ({
    id: player.id,
    name:
      player.userName ||
      (player.isBot
        ? `Player ${player.id.replace("bot-", "")}`
        : `Player ${player.id}`),
    score: player.score,
    rank: index + 1, // This is the actual rank in the full leaderboard
    isBot: player.isBot || false,
    realUserId: player.realUserId || null,
  }));

  // Return top 10 players for the leaderboard display
  // The client will handle showing current player if they're not in top 10
  return playersWithRanks.slice(0, 10);
}

// Generate full leaderboard data (for finding current player's rank)
function generateFullLeaderboard() {
  const allAlivePlayers = Array.from(gameState.players.values())
    .filter((player) => player.alive)
    .sort((a, b) => b.score - a.score);

  return allAlivePlayers.map((player, index) => ({
    id: player.id,
    name:
      player.userName ||
      (player.isBot
        ? `Player ${player.id.replace("bot-", "")}`
        : `Player ${player.id}`),
    score: player.score,
    rank: index + 1,
    isBot: player.isBot || false,
    realUserId: player.realUserId || null,
  }));
}

// Send periodic game state updates
setInterval(() => {
  const playerCount = gameState.players.size;
  const leaderboard = generateLeaderboard();

  io.emit("gameStats", {
    playerCount: playerCount,
    foodCount: gameState.foods.length,
    leaderboard: leaderboard,
  });
}, 5000);

// Send leaderboard updates more frequently
setInterval(() => {
  const leaderboard = generateLeaderboard();
  const fullLeaderboard = generateFullLeaderboard();
  io.emit("leaderboardUpdate", {
    leaderboard: leaderboard,
    fullLeaderboard: fullLeaderboard,
  });
}, 1000);

const PORT = process.env.PORT || 9000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Game available at http://localhost:${PORT}`);
});
