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
  transports: ["websocket", "polling"],
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
    // Allow guest connections
    socket.data.isAuthenticated = false;
    console.log("👤 Guest connection allowed:", socket.id);
  }

  next(); // Always allow connection, but track auth status
});

// Bot configuration
const MAX_BOTS = 5;

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
let lastPlayerActivity = Date.now();
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
  CLEANUP_INTERVAL: 15000, // 15 seconds
  DEAD_POINT_MAX_AGE: 30000, // 30 seconds - auto cleanup old dead points

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
const MAX_FOODS = 600;

// Game state
const gameState = {
  players: new Map(),
  foods: [],
  deadPoints: [],
  maxFoods: MAX_FOODS,
  worldWidth: 1200,
  worldHeight: 800,
};

// Dynamic food limit calculation
function calculateOptimalFoodCount() {
  const allPlayers = Array.from(gameState.players.values());
  const activePlayers = allPlayers.filter((p) => !p.isBot && p.alive);
  const bots = allPlayers.filter((p) => p.isBot && p.alive);

  // Debug logging to see all players
  console.log(`🔢 DEBUG: Total players in gameState: ${allPlayers.length}`);
  allPlayers.forEach((p) => {
    console.log(
      `🔢 DEBUG: Player ${p.id}: isBot=${p.isBot}, alive=${p.alive}, socketId=${p.socketId}`
    );
  });

  const optimalFoods = activePlayers.length * 15 + bots.length * 10;
  const result = Math.min(optimalFoods, MAX_FOODS);

  console.log(
    `🔢 DEBUG: Food calculation - Active players: ${activePlayers.length}, Bots: ${bots.length}, Optimal: ${optimalFoods}, Final: ${result}`
  );
  return result;
}

// Adjust food count based on current player/bot count with grid-based distribution
function adjustFoodCount() {
  const optimalCount = calculateOptimalFoodCount();
  const currentCount = gameState.foods.length;

  // Grid-based minimum calculation
  const cellSize = 200;
  const cols = Math.ceil(gameState.worldWidth / cellSize);
  const rows = Math.ceil(gameState.worldHeight / cellSize);
  const totalCells = cols * rows;
  const minFoodsPerCell = 12; // Match the grid creation minimum
  const gridBasedMinimum = totalCells * minFoodsPerCell;

  // Ensure we maintain grid-based minimum
  const targetCount = Math.max(optimalCount, gridBasedMinimum);

  console.log(
    `🍎 Food adjustment: optimal=${optimalCount}, grid minimum=${gridBasedMinimum}, target=${targetCount}, current=${currentCount}`
  );

  if (currentCount < targetCount) {
    // Add more food using grid-aware distribution
    const foodsToAdd = targetCount - currentCount;
    const newFoods = [];

    // Count foods per cell
    const cellFoodCounts = new Map();
    gameState.foods.forEach((food) => {
      if (food.gridCell) {
        const cellKey = `${food.gridCell.row}_${food.gridCell.col}`;
        cellFoodCounts.set(cellKey, (cellFoodCounts.get(cellKey) || 0) + 1);
      }
    });

    for (let i = 0; i < foodsToAdd; i++) {
      // Find cell with minimum food count
      let minFoodCount = Infinity;
      let targetCell = null;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cellKey = `${row}_${col}`;
          const foodCount = cellFoodCounts.get(cellKey) || 0;
          if (foodCount < minFoodCount) {
            minFoodCount = foodCount;
            targetCell = { row, col };
          }
        }
      }

      // Add food to the target cell
      if (targetCell) {
        const cellX = targetCell.col * cellSize;
        const cellY = targetCell.row * cellSize;
        const cellWidth = Math.min(cellSize, gameState.worldWidth - cellX);
        const cellHeight = Math.min(cellSize, gameState.worldHeight - cellY);

        const newFood = {
          id: `food_${Date.now()}_${targetCell.row}_${
            targetCell.col
          }_${i}_${Math.random()}`,
          x: cellX + Math.random() * cellWidth,
          y: cellY + Math.random() * cellHeight,
          radius: 5,
          color: getRandomColor(),
          gridCell: { row: targetCell.row, col: targetCell.col },
        };

        gameState.foods.push(newFood);
        newFoods.push(newFood);

        // Update cell count for next iteration
        const cellKey = `${targetCell.row}_${targetCell.col}`;
        cellFoodCounts.set(cellKey, (cellFoodCounts.get(cellKey) || 0) + 1);
      }
    }

    console.log(
      `🍎 Added ${newFoods.length} foods with grid distribution. Total: ${gameState.foods.length}/${targetCount}`
    );

    // Broadcast new foods to all clients
    if (newFoods.length > 0) {
      io.emit("foodsAdded", newFoods);
    }
  } else if (currentCount > targetCount) {
    // Remove excess food, prioritizing cells with too many foods
    const foodsToRemove = currentCount - targetCount;
    const cellFoodCounts = new Map();
    const cellFoods = new Map();

    // Group foods by cell
    gameState.foods.forEach((food) => {
      if (food.gridCell) {
        const cellKey = `${food.gridCell.row}_${food.gridCell.col}`;
        if (!cellFoods.has(cellKey)) {
          cellFoods.set(cellKey, []);
        }
        cellFoods.get(cellKey).push(food);
        cellFoodCounts.set(cellKey, (cellFoodCounts.get(cellKey) || 0) + 1);
      }
    });

    const removedFoods = [];
    let remainingToRemove = foodsToRemove;

    // Remove from cells with most foods first
    const sortedCells = Array.from(cellFoodCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    ); // Sort by food count descending

    for (const [cellKey, count] of sortedCells) {
      if (remainingToRemove <= 0) break;

      const cellFoodArray = cellFoods.get(cellKey) || [];
      const maxToRemoveFromCell = Math.max(0, count - minFoodsPerCell);
      const toRemoveFromCell = Math.min(remainingToRemove, maxToRemoveFromCell);

      for (let i = 0; i < toRemoveFromCell; i++) {
        if (cellFoodArray.length > 0) {
          const foodToRemove = cellFoodArray.pop();
          removedFoods.push(foodToRemove);
          remainingToRemove--;
        }
      }
    }

    // Remove foods from game state
    const removedIds = [];
    removedFoods.forEach((food) => {
      const index = gameState.foods.findIndex((f) => f.id === food.id);
      if (index !== -1) {
        gameState.foods.splice(index, 1);
        removedIds.push(food.id);
      }
    });

    console.log(
      `🍎 Removed ${removedIds.length} foods maintaining grid distribution. Total: ${gameState.foods.length}/${targetCount}`
    );

    // Broadcast removed foods to all clients
    if (removedIds.length > 0) {
      io.emit("foodsRemoved", removedIds);
    }
  }
}

// Grid-based food distribution system
function createFoodGrid() {
  const cellSize = 420; // Each cell is 200x200 pixels (viewport size)
  const minFoodsPerCell = 12; // Increased from 8 to 21 for ~500 total foods (24 cells × 21 = 504)
  const maxFoodsPerCell = 25; // Increased proportionally to avoid overcrowding

  const cols = Math.ceil(gameState.worldWidth / cellSize);
  const rows = Math.ceil(gameState.worldHeight / cellSize);

  console.log(
    `🍎 Creating food grid: ${cols}x${rows} cells (${cols * rows} total cells)`
  );

  const foods = [];
  let totalFoods = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cellX = col * cellSize;
      const cellY = row * cellSize;
      const cellWidth = Math.min(cellSize, gameState.worldWidth - cellX);
      const cellHeight = Math.min(cellSize, gameState.worldHeight - cellY);

      // Calculate foods for this cell based on cell size
      const cellArea = cellWidth * cellHeight;
      const fullCellArea = cellSize * cellSize;
      const areaRatio = cellArea / fullCellArea;
      const foodsInCell = Math.max(
        Math.floor(minFoodsPerCell * areaRatio),
        minFoodsPerCell * 0.5 // Minimum 4 foods even for partial cells
      );

      // Add foods to this cell
      for (let i = 0; i < foodsInCell; i++) {
        const food = {
          id: `food_${Date.now()}_${row}_${col}_${i}_${Math.random()}`,
          x: cellX + Math.random() * cellWidth,
          y: cellY + Math.random() * cellHeight,
          radius: 5,
          color: getRandomColor(),
          gridCell: { row, col }, // Track which cell this food belongs to
        };
        foods.push(food);
        totalFoods++;
      }
    }
  }

  console.log(
    `🍎 Grid-based food distribution complete: ${totalFoods} foods in ${cols}x${rows} grid`
  );
  console.log(
    `🍎 Average foods per cell: ${(totalFoods / (cols * rows)).toFixed(1)}`
  );

  return foods;
}

// Initialize food with grid-based distribution
function initializeFoods() {
  gameState.foods = [];

  console.log(
    `🍎 Initializing grid-based food distribution in ${gameState.worldWidth}x${gameState.worldHeight} world...`
  );

  // Use grid-based distribution for even food density
  gameState.foods = createFoodGrid();

  // Log sample food positions for debugging
  const sampleFoods = gameState.foods.slice(0, 5);
  sampleFoods.forEach((food, i) => {
    console.log(
      `🍎 Sample Food ${i}: position (${food.x.toFixed(2)}, ${food.y.toFixed(
        2
      )}) cell(${food.gridCell.row},${food.gridCell.col}) color: ${food.color}`
    );
  });

  console.log(
    `🍎 Food initialization complete: ${gameState.foods.length} foods spawned with grid distribution`
  );
}

function getRandomColor() {
  const colors = [
    "red",
    "green",
    "blue",
    "white",
    "yellow",
    "orange",
    "purple",
    "lightgreen",
    "grey",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Helper function for grid-based food regeneration
function regenerateFoodWithGrid(food) {
  const cellSize = 200; // Viewport size
  const cellsX = Math.ceil(gameState.worldWidth / cellSize);
  const cellsY = Math.ceil(gameState.worldHeight / cellSize);

  // Count foods in each cell
  const cellFoodCounts = new Map();
  gameState.foods.forEach((f) => {
    if (f.gridCell) {
      const count = cellFoodCounts.get(f.gridCell) || 0;
      cellFoodCounts.set(f.gridCell, count + 1);
    }
  });

  // Find cells with fewer foods (prioritize under-filled cells)
  const cellCandidates = [];
  for (let cellY = 0; cellY < cellsY; cellY++) {
    for (let cellX = 0; cellX < cellsX; cellX++) {
      const cellKey = `${cellX},${cellY}`;
      const currentCount = cellFoodCounts.get(cellKey) || 0;
      const minFoodsPerCell = 21; // Match the grid creation minimum

      if (currentCount < minFoodsPerCell) {
        // Prioritize cells with fewer foods
        const priority = minFoodsPerCell - currentCount;
        for (let i = 0; i < priority; i++) {
          cellCandidates.push({ cellX, cellY, cellKey });
        }
      } else {
        // Still allow regeneration in full cells, but with lower priority
        cellCandidates.push({ cellX, cellY, cellKey });
      }
    }
  }

  // Select a random cell (weighted towards under-filled cells)
  const selectedCell =
    cellCandidates[Math.floor(Math.random() * cellCandidates.length)];

  // Generate position within the selected cell
  const cellStartX = selectedCell.cellX * cellSize;
  const cellStartY = selectedCell.cellY * cellSize;
  const cellEndX = Math.min(cellStartX + cellSize, gameState.worldWidth);
  const cellEndY = Math.min(cellStartY + cellSize, gameState.worldHeight);

  // Add some margin to avoid edge placement
  const margin = 10;
  const newX =
    cellStartX + margin + Math.random() * (cellEndX - cellStartX - 2 * margin);
  const newY =
    cellStartY + margin + Math.random() * (cellEndY - cellStartY - 2 * margin);

  // Update food position and grid cell
  const oldPos = { x: food.x, y: food.y, gridCell: food.gridCell };
  food.x = newX;
  food.y = newY;
  food.color = getRandomColor();
  food.gridCell = selectedCell.cellKey;

  console.log(
    `🍎 Food ${food.id} regenerated: (${oldPos.x?.toFixed(
      2
    )}, ${oldPos.y?.toFixed(2)}) cell ${oldPos.gridCell} → (${food.x.toFixed(
      2
    )}, ${food.y.toFixed(2)}) cell ${food.gridCell}`
  );

  return food;
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
function isPositionSafe(x, y, radius, minDistance = 150) {
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

  // Check boundaries with extra buffer
  const boundaryBuffer = 50;
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
    if (deadDistance < 30 + radius) {
      console.log(
        `❌ DEBUG: Position unsafe - too close to dead point (distance: ${deadDistance.toFixed(
          2
        )})`
      );
      return false;
    }
  }

  console.log(
    `✅ DEBUG: Position is safe at (${x.toFixed(2)}, ${y.toFixed(2)})`
  );
  return true;
}

// Find safe spawn position - enhanced with better distribution and emergency fallback
function findSafeSpawnPosition(radius) {
  console.log(`🎯 DEBUG: Finding safe spawn position for radius ${radius}`);
  const spawnZones = getSpawnZones();
  const maxZoneAttempts = 30; // Reduced per-zone attempts
  const maxFallbackAttempts = 100; // Increased fallback attempts

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
    `🚨 DEBUG: Enhanced fallback failed, using emergency scatter spawn`
  );
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
    console.log(
      `🚨 DEBUG: Using emergency scatter position at (${bestPosition.x.toFixed(
        2
      )}, ${bestPosition.y.toFixed(
        2
      )}) with min distance ${maxMinDistance.toFixed(2)}`
    );
    return bestPosition;
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

  // Generate safe angle ranges avoiding problematic borders
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
    const testDistance = 150; // Distance to test in this direction
    const testX = x + Math.cos(angle) * testDistance;
    const testY = y + Math.sin(angle) * testDistance;

    // Check if this direction leads to safe territory
    const wouldHitBorder =
      testX < borderBuffer ||
      testX > gameState.worldWidth - borderBuffer ||
      testY < borderBuffer ||
      testY > gameState.worldHeight - borderBuffer;

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

  const bot = {
    id: id,
    socketId: null, // Bots don't have socket connections
    x: safePosition.x,
    y: safePosition.y,
    points: [],
    angle: safeAngle,
    radius: botRadius,
    speed: 2.0,
    color: getRandomColor(),
    score: 1.0,
    alive: true,
    isBot: true,
    spawnProtection: true,
    spawnTime: Date.now(),
  };

  console.log(
    `🛡️ DEBUG: Bot ${id} spawn protection enabled until ${new Date(
      bot.spawnTime + 3000
    ).toLocaleTimeString()}`
  );

  // Initialize bot with starting points (same as user snakes - 25 points)
  for (let i = 0; i < 25; i++) {
    bot.points.push({
      x: bot.x - i * 2,
      y: bot.y,
      radius: bot.radius,
      color: bot.color, // Use bot's main color for consistency like user snakes
    });
  }

  console.log(
    `✅ DEBUG: Bot ${id} created successfully with ${bot.points.length} body points`
  );
  return bot;
}

function spawnBots(count = 5) {
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

  // Adjust food count based on new bot count
  adjustFoodCount();
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

  // Convert bot's body points to dead points with random colors
  const deadPoints = bot.points.map((point) => ({
    x: point.x,
    y: point.y,
    radius: point.radius,
    color: getRandomColor(), // Use random colors for colorful food appearance
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
  io.emit("playerDied", {
    playerId: bot.id,
    deadPoints: deadPoints,
  });

  // Broadcast bot removal
  io.emit("playerDisconnected", bot.id);

  // Update leaderboard after bot removal
  const leaderboard = generateLeaderboard();
  const fullLeaderboard = generateFullLeaderboard();
  io.emit("leaderboardUpdate", {
    leaderboard: leaderboard,
    fullLeaderboard: fullLeaderboard,
  });

  // Adjust food count based on reduced bot count
  adjustFoodCount();
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

// ===== SMART DEAD SNAKE CLEANUP FUNCTIONS =====

// Calculate priority score for dead point cleanup (higher = more likely to be removed)
function calculateCleanupPriority(deadPoint, playerPositions, spawnZones) {
  let priority = 0;
  const currentTime = Date.now();

  // Age factor (older points get higher priority for removal)
  const age = currentTime - (deadPoint.createdAt || currentTime);
  priority += Math.min(age / 60000, 10); // Max 10 points for age (1 minute = max age score)

  // Distance from players (farther = higher priority for removal)
  let minPlayerDistance = Infinity;
  for (const pos of playerPositions) {
    const distance = Math.hypot(deadPoint.x - pos.x, deadPoint.y - pos.y);
    minPlayerDistance = Math.min(minPlayerDistance, distance);
  }

  if (minPlayerDistance > 300) priority += 5; // Far from players
  else if (minPlayerDistance > 150) priority += 2; // Moderately far
  else if (minPlayerDistance < 50) priority -= 3; // Very close to players (keep)

  // Distance from spawn zones (closer to spawn = lower priority for removal)
  let minSpawnDistance = Infinity;
  for (const zone of spawnZones) {
    const distance = Math.hypot(deadPoint.x - zone.x, deadPoint.y - zone.y);
    minSpawnDistance = Math.min(minSpawnDistance, distance);
  }

  if (minSpawnDistance < 100) priority -= 4; // Very close to spawn (keep)
  else if (minSpawnDistance < 200) priority -= 1; // Close to spawn

  // Cluster density (remove from dense areas)
  // This will be calculated in the main cleanup function

  return priority;
}

// Smart dead point cleanup with priority-based removal
function performSmartDeadPointCleanup(forceCleanup = false) {
  const currentTime = Date.now();
  const initialCount = gameState.deadPoints.length;

  // First, remove dead points older than 30 seconds (automatic age-based cleanup)
  const ageCleanupBefore = gameState.deadPoints.length;
  gameState.deadPoints = gameState.deadPoints.filter((deadPoint) => {
    const age = currentTime - (deadPoint.createdAt || currentTime);
    return age < PERFORMANCE_CONFIG.DEAD_POINT_MAX_AGE;
  });
  const ageCleanupCount = ageCleanupBefore - gameState.deadPoints.length;

  if (ageCleanupCount > 0) {
    console.log(
      `⏰ AGE CLEANUP: Removed ${ageCleanupCount} dead points older than 30 seconds`
    );
    performanceMetrics.deadPointsCleanedUp += ageCleanupCount;
  }

  const currentCount = gameState.deadPoints.length;

  // Check if additional cleanup is needed
  if (!forceCleanup && currentCount < PERFORMANCE_CONFIG.CLEANUP_THRESHOLD) {
    return;
  }

  const targetCount = PERFORMANCE_CONFIG.MAX_DEAD_POINTS;
  const pointsToRemove = Math.max(0, currentCount - targetCount);

  if (pointsToRemove === 0) return;

  console.log(
    `🧹 CLEANUP: Starting smart cleanup - removing ${pointsToRemove} of ${currentCount} dead points`
  );

  // Get current player positions
  const playerPositions = Array.from(gameState.players.values())
    .filter((p) => p.alive)
    .map((p) => ({ x: p.x, y: p.y }));

  // Get spawn zones
  const spawnZones = getSpawnZones();

  // Add timestamps to dead points if missing
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

  // Calculate priority scores
  const pointsWithPriority = gameState.deadPoints.map((point) => {
    let priority = calculateCleanupPriority(point, playerPositions, spawnZones);

    // Add cluster density bonus (remove from dense areas)
    if (point.clusterDensity > 5) priority += 3;
    else if (point.clusterDensity > 2) priority += 1;

    return { point, priority };
  });

  // Sort by priority (highest first) and remove top candidates
  pointsWithPriority.sort((a, b) => b.priority - a.priority);
  const pointsToRemoveList = pointsWithPriority
    .slice(0, pointsToRemove)
    .map((item) => item.point);

  // Remove selected points
  gameState.deadPoints = gameState.deadPoints.filter(
    (point) => !pointsToRemoveList.includes(point)
  );

  // Update metrics
  performanceMetrics.deadPointsCleanedUp += pointsToRemove;

  console.log(
    `✅ CLEANUP: Removed ${pointsToRemove} dead points, ${gameState.deadPoints.length} remaining`
  );

  // Broadcast cleanup to clients if significant
  if (pointsToRemove > 100) {
    io.emit("deadPointsCleanup", {
      removedCount: pointsToRemove,
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
  // Iterate over all players and filter for bots
  gameState.players.forEach((player) => {
    if (!player.isBot || !player.alive) return;

    // Boundary avoidance AI - check if bot is approaching boundaries
    const boundaryBuffer = player.radius * 3; // Safety buffer distance from boundaries
    const nextX = player.x + Math.cos(player.angle) * player.speed * 10; // Look ahead
    const nextY = player.y + Math.sin(player.angle) * player.speed * 10; // Look ahead

    // Check if bot will hit boundaries soon and turn away
    if (
      nextX < boundaryBuffer ||
      nextX > gameState.worldWidth - boundaryBuffer
    ) {
      // Turn away from left/right boundaries
      player.angle = Math.PI - player.angle + (Math.random() - 0.5) * 0.3;
    }
    if (
      nextY < boundaryBuffer ||
      nextY > gameState.worldHeight - boundaryBuffer
    ) {
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

    // Check spawn protection (3 seconds)
    const currentTime = Date.now();
    const spawnProtectionDuration = 3000; // 3 seconds
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
        // Bot eats food - same logic as human players
        player.score++;

        // Add new point to bot's body
        if (player.points.length > 0) {
          const tail = player.points[player.points.length - 1];
          player.points.push({
            x: tail.x,
            y: tail.y,
            radius: player.radius,
            color: player.color, // Use bot's main color for consistency
          });
        }

        // Regenerate food using grid-based distribution
        regenerateFoodWithGrid(food);

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
        // Bot eats dead point - award 1 point per dead snake
        player.score += 1;

        // Add new point to bot's body
        if (player.points.length > 0) {
          const tail = player.points[player.points.length - 1];
          player.points.push({
            x: tail.x,
            y: tail.y,
            radius: player.radius,
            color: player.color, // Use bot's main color for consistency
          });
        }

        // Remove consumed dead point
        gameState.deadPoints.splice(i, 1);

        // Broadcast dead point removal to all clients
        io.emit('deadPointsRemoved', { deadPoints: [deadPoint] });

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
      }
    }
  });
}

// Initialize game
initializeFoods();

// Adjust food count after initialization (will add more food based on any existing players/bots)
adjustFoodCount();

console.log(
  `🎮 Game initialized: ${gameState.foods.length} foods spawned in ${gameState.worldWidth}x${gameState.worldHeight} world`
);

// Spawn initial bots for testing
setTimeout(() => {
  console.log("🤖 Spawning initial bots for game testing...");
  spawnBots(5);
  // Adjust food count again after bots are spawned
  setTimeout(() => {
    adjustFoodCount();
  }, 500);
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
      speed: 1.0,
      color: getRandomColor(),
      score: 0,
      alive: true,
      isBot: false, // Explicitly mark as human player
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

    // Initialize player with starting points
    for (let i = 0; i < 25; i++) {
      newPlayer.points.push({
        x: newPlayer.x - i * 2,
        y: newPlayer.y,
        radius: newPlayer.radius,
        color: getRandomColor(),
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

    // Adjust food count based on new player count
    adjustFoodCount();

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

      // Check and remove spawn protection after 3 seconds
      const currentTime = Date.now();
      const spawnProtectionDuration = 3000;
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
      // Regenerate food using grid-based distribution
      regenerateFoodWithGrid(food);

      player.score++;
      performanceMetrics.foodEaten++;

      // Score persistence now handled client-side

      // Broadcast food regeneration to all players
      io.emit("foodRegenerated", food);

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
      // Remove consumed dead points from game state
      deadPoints.forEach((consumedPoint) => {
        const index = gameState.deadPoints.findIndex(
          (dp) =>
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
      performanceMetrics.deadPointsEaten += deadPoints.length;

      // Broadcast dead point removal to all clients
      io.emit("deadPointsRemoved", {
        deadPoints: deadPoints,
      });

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
  });

  // Handle player death
  socket.on("playerDied", (data) => {
    const player = gameState.players.get(data.playerId);
    if (player) {
      // Score persistence now handled client-side

      player.alive = false;

      // Add dead points to game state
      const deadPoints = data.deadPoints;
      deadPoints.forEach((dp) => {
        createDeadPoint(dp.x, dp.y, dp.radius, dp.color);
      });

      // Broadcast player death and dead points
      io.emit("playerDied", {
        playerId: data.playerId,
        deadPoints: deadPoints,
      });

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

            // Initialize respawned player with starting points
            for (let i = 0; i < 25; i++) {
              respawnedPlayer.points.push({
                x: respawnedPlayer.x - i * 2,
                y: respawnedPlayer.y,
                radius: respawnedPlayer.radius,
                color: getRandomColor(),
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

      // Adjust food count based on reduced player count
      adjustFoodCount();

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
      : PERFORMANCE_CONFIG.CLEANUP_INTERVAL * 2; // Less frequent when paused

  cleanupInterval = setInterval(() => {
    performSmartDeadPointCleanup();
  }, interval);
}

// Start initial cleanup interval
startCleanupInterval();

// Automatic bot respawning function
function maintainMinimumBots() {
  const humanPlayers = Array.from(gameState.players.values()).filter(
    (p) => !p.isBot && p.alive
  ).length;
  const aliveBots = Array.from(gameState.players.values()).filter(
    (p) => p.isBot && p.alive
  );
  const allBots = Array.from(gameState.players.values()).filter((p) => p.isBot);

  // Maintain 3-5 bots minimum, adjusting based on human player count
  const minBots = Math.max(3, Math.min(5, 5 - humanPlayers));
  const maxBots = 5;

  // If we have too many bots, remove lowest-scoring ones (high rank priority)
  if (allBots.length > maxBots) {
    // Sort bots by score (descending) to keep highest-scoring ones
    const sortedBots = allBots.sort((a, b) => b.score - a.score);
    const botsToRemove = sortedBots.slice(maxBots); // Remove excess bots (lowest scores)

    botsToRemove.forEach((bot) => {
      console.log(
        `Removing low-rank bot ${bot.id} (score: ${bot.score.toFixed(
          1
        )}) to maintain max ${maxBots} bots`
      );
      if (bot.alive) {
        handleBotDeath(bot);
      } else {
        // Remove dead bot from game state
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

  // Only attempt to spawn bots if we actually need them and haven't tried recently
  const currentAliveBots = aliveBots.length;
  if (currentAliveBots < minBots && allBots.length < maxBots) {
    const botsNeeded = Math.min(
      minBots - currentAliveBots,
      maxBots - allBots.length
    );
    if (botsNeeded > 0) {
      spawnBots(botsNeeded);
    }
  }
}

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
      updateBots();

      // Broadcast bot movements to all players
      gameState.players.forEach((player) => {
        if (player.isBot && player.alive) {
          const currentTime = Date.now();
          const spawnProtectionDuration = 3000;
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
  }, updateFreq);

  // Bot maintenance interval (spawning, cleanup)
  botMaintenanceInterval = setInterval(() => {
    if (serverState !== SERVER_STATES.PAUSED) {
      maintainOptimizedBots();
      performanceMetrics.botMaintenanceCycles++;
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
        ? `Guest ${player.id.replace("bot-", "")}`
        : `Guest ${player.id}`),
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
        ? `Guest ${player.id.replace("bot-", "")}`
        : `Guest ${player.id}`),
    score: player.score,
    rank: index + 1,
    isBot: player.isBot || false,
    realUserId: player.realUserId || null,
  }));
}

// Score persistence removed from server - now handled client-side with Zustand

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
