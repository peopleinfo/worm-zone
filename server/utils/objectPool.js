// Server-side Object Pooling System for Performance Optimization
// Reduces memory allocation/deallocation overhead and garbage collection pressure

// Pool configuration
const POOL_CONFIG = {
  MAX_FOOD_POOL_SIZE: 200,
  MAX_POINT_POOL_SIZE: 2000,
  MAX_PLAYER_POOL_SIZE: 50,
  CLEANUP_THRESHOLD: 0.8, // Clean when pool is 80% full
};

// Object pools
const pools = {
  foods: [],
  points: [],
  players: [],
};

// Pool statistics for monitoring
const poolStats = {
  foods: { created: 0, reused: 0, released: 0, maxSize: 0 },
  points: { created: 0, reused: 0, released: 0, maxSize: 0 },
  players: { created: 0, reused: 0, released: 0, maxSize: 0 },
};

// Food object pooling
function getPooledFood(id, x, y, radius = 5, color = 'red') {
  let food;
  
  if (pools.foods.length > 0) {
    food = pools.foods.pop();
    // Reset properties
    food.id = id;
    food.x = x;
    food.y = y;
    food.radius = radius;
    food.color = color;
    poolStats.foods.reused++;
  } else {
    // Create new food object
    food = {
      id,
      x,
      y,
      radius,
      color,
    };
    poolStats.foods.created++;
  }
  
  return food;
}

function releaseFood(food) {
  if (!food) return;
  
  // Clean up references
  food.id = null;
  food.x = 0;
  food.y = 0;
  food.radius = 5;
  food.color = null;
  
  // Return to pool if not full
  if (pools.foods.length < POOL_CONFIG.MAX_FOOD_POOL_SIZE) {
    pools.foods.push(food);
    poolStats.foods.released++;
    poolStats.foods.maxSize = Math.max(poolStats.foods.maxSize, pools.foods.length);
  }
}

// Point object pooling (for dead points and snake segments)
function getPooledPoint(x, y, radius, color) {
  let point;
  
  if (pools.points.length > 0) {
    point = pools.points.pop();
    // Reset properties
    point.x = x;
    point.y = y;
    point.radius = radius;
    point.color = color;
    poolStats.points.reused++;
  } else {
    // Create new point object
    point = {
      x,
      y,
      radius,
      color,
    };
    poolStats.points.created++;
  }
  
  return point;
}

function releasePoint(point) {
  if (!point) return;
  
  // Clean up references
  point.x = 0;
  point.y = 0;
  point.radius = 0;
  point.color = null;
  
  // Return to pool if not full
  if (pools.points.length < POOL_CONFIG.MAX_POINT_POOL_SIZE) {
    pools.points.push(point);
    poolStats.points.released++;
    poolStats.points.maxSize = Math.max(poolStats.points.maxSize, pools.points.length);
  }
}

// Player object pooling (for bot management)
function getPooledPlayer(id, x, y, angle, radius, color, isBot = false) {
  let player;
  
  if (pools.players.length > 0) {
    player = pools.players.pop();
    // Reset properties
    player.id = id;
    player.x = x;
    player.y = y;
    player.angle = angle;
    player.radius = radius;
    player.color = color;
    player.isBot = isBot;
    player.alive = true;
    player.score = 0;
    player.points = [];
    player.spawnProtection = false;
    player.spawnTime = Date.now();
    player.lastActivity = Date.now();
    poolStats.players.reused++;
  } else {
    // Create new player object
    player = {
      id,
      x,
      y,
      angle,
      radius,
      color,
      isBot,
      alive: true,
      score: 0,
      points: [],
      spawnProtection: false,
      spawnTime: Date.now(),
      lastActivity: Date.now(),
    };
    poolStats.players.created++;
  }
  
  return player;
}

function releasePlayer(player) {
  if (!player) return;
  
  // Clean up references and arrays
  player.id = null;
  player.x = 0;
  player.y = 0;
  player.angle = 0;
  player.radius = 0;
  player.color = null;
  player.isBot = false;
  player.alive = false;
  player.score = 0;
  player.points = [];
  player.spawnProtection = false;
  player.spawnTime = 0;
  player.lastActivity = 0;
  
  // Return to pool if not full
  if (pools.players.length < POOL_CONFIG.MAX_PLAYER_POOL_SIZE) {
    pools.players.push(player);
    poolStats.players.released++;
    poolStats.players.maxSize = Math.max(poolStats.players.maxSize, pools.players.length);
  }
}

// Pool management and optimization
function optimizePools() {
  // Clean up excess objects from pools when they get too large
  Object.keys(pools).forEach(poolName => {
    const pool = pools[poolName];
    const maxSize = POOL_CONFIG[`MAX_${poolName.toUpperCase()}_POOL_SIZE`];
    const threshold = Math.floor(maxSize * POOL_CONFIG.CLEANUP_THRESHOLD);
    
    if (pool.length > threshold) {
      const excess = pool.length - threshold;
      pool.splice(0, excess);
      console.log(`🧹 POOL: Cleaned ${excess} excess objects from ${poolName} pool`);
    }
  });
}

// Get comprehensive pool statistics
function getPoolStats() {
  const currentSizes = {
    foods: pools.foods.length,
    points: pools.points.length,
    players: pools.players.length,
  };
  
  return {
    current: currentSizes,
    stats: { ...poolStats },
    efficiency: {
      foods: poolStats.foods.reused / (poolStats.foods.created + poolStats.foods.reused) || 0,
      points: poolStats.points.reused / (poolStats.points.created + poolStats.points.reused) || 0,
      players: poolStats.players.reused / (poolStats.players.created + poolStats.players.reused) || 0,
    },
  };
}

// Clear all pools (for cleanup)
function clearPools() {
  pools.foods.length = 0;
  pools.points.length = 0;
  pools.players.length = 0;
  
  // Reset statistics
  Object.keys(poolStats).forEach(key => {
    poolStats[key] = { created: 0, reused: 0, released: 0, maxSize: 0 };
  });
  
  console.log('🧹 POOL: All object pools cleared');
}

// Log pool performance metrics
function logPoolMetrics() {
  const stats = getPoolStats();
  console.log('\n🏊 ===== OBJECT POOL METRICS =====');
  console.log(`📊 Current Pool Sizes:`);
  console.log(`  Foods: ${stats.current.foods}/${POOL_CONFIG.MAX_FOOD_POOL_SIZE}`);
  console.log(`  Points: ${stats.current.points}/${POOL_CONFIG.MAX_POINT_POOL_SIZE}`);
  console.log(`  Players: ${stats.current.players}/${POOL_CONFIG.MAX_PLAYER_POOL_SIZE}`);
  
  console.log(`\n♻️ Pool Efficiency:`);
  console.log(`  Foods: ${(stats.efficiency.foods * 100).toFixed(1)}% reuse rate`);
  console.log(`  Points: ${(stats.efficiency.points * 100).toFixed(1)}% reuse rate`);
  console.log(`  Players: ${(stats.efficiency.players * 100).toFixed(1)}% reuse rate`);
  
  console.log(`\n📈 Lifetime Stats:`);
  Object.keys(stats.stats).forEach(poolName => {
    const stat = stats.stats[poolName];
    console.log(`  ${poolName}: Created: ${stat.created}, Reused: ${stat.reused}, Released: ${stat.released}, Max: ${stat.maxSize}`);
  });
}

module.exports = {
  // Food pooling
  getPooledFood,
  releaseFood,
  
  // Point pooling
  getPooledPoint,
  releasePoint,
  
  // Player pooling
  getPooledPlayer,
  releasePlayer,
  
  // Pool management
  optimizePools,
  getPoolStats,
  clearPools,
  logPoolMetrics,
  
  // Configuration
  POOL_CONFIG,
};