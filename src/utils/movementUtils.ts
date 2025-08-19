/**
 * Consolidated movement utilities
 * Eliminates duplicate movement logic across client and server
 */

export interface MovementConfig {
  speed: number;
  angle: number;
  maxSpeed?: number;
  minSpeed?: number;
  acceleration?: number;
  deceleration?: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface MovingObject extends Position {
  angle: number;
  speed: number;
  radius?: number;
}

export interface BoundaryConstraints {
  width: number;
  height: number;
  buffer?: number;
}

/**
 * Core movement calculations
 */
export class MovementUtils {
  /**
   * Calculate next position based on current position, angle, and speed
   */
  static calculateNextPosition(
    current: Position,
    angle: number,
    speed: number,
    deltaTime: number = 1
  ): Position {
    return {
      x: current.x + Math.cos(angle) * speed * deltaTime,
      y: current.y + Math.sin(angle) * speed * deltaTime
    };
  }
  
  /**
   * Calculate distance between two positions
   */
  static calculateDistance(pos1: Position, pos2: Position): number {
    return Math.hypot(pos1.x - pos2.x, pos1.y - pos2.y);
  }
  
  /**
   * Calculate angle between two positions
   */
  static calculateAngle(from: Position, to: Position): number {
    return Math.atan2(to.y - from.y, to.x - from.x);
  }
  
  /**
   * Normalize angle to be between -PI and PI
   */
  static normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }
  
  /**
   * Calculate angle difference (shortest path)
   */
  static angleDifference(angle1: number, angle2: number): number {
    let diff = angle2 - angle1;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return diff;
  }
  
  /**
   * Interpolate between two angles (shortest path)
   */
  static lerpAngle(from: number, to: number, t: number): number {
    const diff = this.angleDifference(from, to);
    return this.normalizeAngle(from + diff * t);
  }
  
  /**
   * Clamp speed to min/max values
   */
  static clampSpeed(speed: number, min: number = 0, max: number = Infinity): number {
    return Math.max(min, Math.min(max, speed));
  }
}

/**
 * Snake-specific movement utilities
 */
export class SnakeMovementUtils {
  /**
   * Update snake body points following the head
   */
  static updateSnakeBody(
    points: Position[],
    headPosition: Position,
    segmentDistance: number = 8
  ): Position[] {
    if (points.length === 0) return [headPosition];
    
    const newPoints = [headPosition];
    
    for (let i = 1; i < points.length; i++) {
      const prevPoint = newPoints[i - 1];
      const currentPoint = points[i];
      
      const distance = MovementUtils.calculateDistance(prevPoint, currentPoint);
      
      if (distance > segmentDistance) {
        // Move current point towards previous point
        const angle = MovementUtils.calculateAngle(currentPoint, prevPoint);
        const newX = prevPoint.x - Math.cos(angle) * segmentDistance;
        const newY = prevPoint.y - Math.sin(angle) * segmentDistance;
        newPoints.push({ x: newX, y: newY });
      } else {
        newPoints.push(currentPoint);
      }
    }
    
    return newPoints;
  }
  
  /**
   * Calculate smooth snake movement with interpolation
   */
  static smoothSnakeMovement(
    currentPosition: Position,
    targetPosition: Position,
    smoothingFactor: number = 0.1
  ): Position {
    return {
      x: currentPosition.x + (targetPosition.x - currentPosition.x) * smoothingFactor,
      y: currentPosition.y + (targetPosition.y - currentPosition.y) * smoothingFactor
    };
  }
  
  /**
   * Calculate snake speed based on length (longer snakes move slower)
   */
  static calculateSnakeSpeed(
    baseSpeed: number,
    snakeLength: number,
    speedReduction: number = 0.001
  ): number {
    const reduction = Math.min(snakeLength * speedReduction, baseSpeed * 0.5);
    return Math.max(baseSpeed - reduction, baseSpeed * 0.5);
  }
}

/**
 * Platform-specific movement utilities for consistent cross-platform behavior
 */
export class PlatformMovementUtils {
  private static readonly TARGET_FPS = 60;
  private static readonly FRAME_TIME = 1000 / PlatformMovementUtils.TARGET_FPS;
  
  /**
   * Normalize movement for consistent speed across different frame rates
   */
  static normalizeMovementForFrameRate(
    speed: number,
    deltaTime: number
  ): number {
    // Normalize to 60 FPS equivalent
    const frameRatio = deltaTime / this.FRAME_TIME;
    return speed * frameRatio;
  }
  
  /**
   * Get platform-specific speed multiplier
   */
  static getPlatformSpeedMultiplier(): number {
    // Detect platform and return appropriate multiplier
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    
    if (/iPad|iPhone|iPod/.test(userAgent)) {
      return 1.0; // iOS baseline
    } else if (/Android/.test(userAgent)) {
      return 1.0; // Android same as iOS
    } else {
      return 1.0; // Desktop baseline
    }
  }
  
  /**
   * Calculate consistent movement speed across platforms
   */
  static calculateConsistentSpeed(
    baseSpeed: number,
    deltaTime: number
  ): number {
    const normalizedSpeed = this.normalizeMovementForFrameRate(baseSpeed, deltaTime);
    const platformMultiplier = this.getPlatformSpeedMultiplier();
    return normalizedSpeed * platformMultiplier;
  }
}

/**
 * AI movement utilities for bot behavior
 */
export class AIMovementUtils {
  /**
   * Calculate avoidance angle from obstacles
   */
  static calculateAvoidanceAngle(
    position: Position,
    obstacles: Position[],
    currentAngle: number,
    avoidanceRadius: number = 100
  ): number {
    let avoidanceX = 0;
    let avoidanceY = 0;
    let obstacleCount = 0;
    
    for (const obstacle of obstacles) {
      const distance = MovementUtils.calculateDistance(position, obstacle);
      
      if (distance < avoidanceRadius && distance > 0) {
        // Calculate repulsion vector
        const repulsionStrength = (avoidanceRadius - distance) / avoidanceRadius;
        const angle = MovementUtils.calculateAngle(obstacle, position);
        
        avoidanceX += Math.cos(angle) * repulsionStrength;
        avoidanceY += Math.sin(angle) * repulsionStrength;
        obstacleCount++;
      }
    }
    
    if (obstacleCount === 0) {
      return currentAngle;
    }
    
    // Average the avoidance vectors
    avoidanceX /= obstacleCount;
    avoidanceY /= obstacleCount;
    
    // Calculate avoidance angle
    const avoidanceAngle = Math.atan2(avoidanceY, avoidanceX);
    
    // Blend with current angle
    const blendFactor = 0.3;
    return MovementUtils.lerpAngle(currentAngle, avoidanceAngle, blendFactor);
  }
  
  /**
   * Calculate wandering behavior (random walk with momentum)
   */
  static calculateWanderAngle(
    currentAngle: number,
    wanderStrength: number = 0.1,
    maxTurnRate: number = 0.2
  ): number {
    const randomTurn = (Math.random() - 0.5) * wanderStrength;
    const clampedTurn = Math.max(-maxTurnRate, Math.min(maxTurnRate, randomTurn));
    return MovementUtils.normalizeAngle(currentAngle + clampedTurn);
  }
  
  /**
   * Calculate seeking behavior towards target
   */
  static calculateSeekAngle(
    position: Position,
    target: Position,
    currentAngle: number,
    seekStrength: number = 0.1
  ): number {
    const targetAngle = MovementUtils.calculateAngle(position, target);
    return MovementUtils.lerpAngle(currentAngle, targetAngle, seekStrength);
  }
  
  /**
   * Combined AI behavior (avoidance + wandering + seeking)
   */
  static calculateAIMovement(
    position: Position,
    currentAngle: number,
    obstacles: Position[],
    targets: Position[] = [],
    config: {
      avoidanceRadius?: number;
      avoidanceWeight?: number;
      wanderWeight?: number;
      seekWeight?: number;
      maxTurnRate?: number;
    } = {}
  ): number {
    const {
      avoidanceRadius = 100,
      avoidanceWeight = 0.7,
      wanderWeight = 0.2,
      seekWeight = 0.1,
      maxTurnRate = 0.2
    } = config;
    
    let finalAngle = currentAngle;
    
    // Apply avoidance
    if (obstacles.length > 0) {
      const avoidanceAngle = this.calculateAvoidanceAngle(
        position,
        obstacles,
        currentAngle,
        avoidanceRadius
      );
      finalAngle = MovementUtils.lerpAngle(finalAngle, avoidanceAngle, avoidanceWeight);
    }
    
    // Apply wandering
    const wanderAngle = this.calculateWanderAngle(finalAngle, wanderWeight, maxTurnRate);
    finalAngle = MovementUtils.lerpAngle(finalAngle, wanderAngle, wanderWeight);
    
    // Apply seeking (if targets available)
    if (targets.length > 0 && seekWeight > 0) {
      // Find nearest target
      let nearestTarget = targets[0];
      let nearestDistance = MovementUtils.calculateDistance(position, nearestTarget);
      
      for (const target of targets) {
        const distance = MovementUtils.calculateDistance(position, target);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestTarget = target;
        }
      }
      
      const seekAngle = this.calculateSeekAngle(position, nearestTarget, finalAngle, seekWeight);
      finalAngle = MovementUtils.lerpAngle(finalAngle, seekAngle, seekWeight);
    }
    
    return MovementUtils.normalizeAngle(finalAngle);
  }
}

/**
 * Boundary interaction utilities
 */
export class BoundaryMovementUtils {
  /**
   * Calculate bounce angle off boundary
   */
  static calculateBounceAngle(
    currentAngle: number,
    boundaryNormal: number
  ): number {
    // Reflect angle across boundary normal
    const reflectedAngle = 2 * boundaryNormal - currentAngle;
    return MovementUtils.normalizeAngle(reflectedAngle);
  }
  
  /**
   * Calculate wrap-around position for objects that can teleport across boundaries
   */
  static wrapPosition(
    position: Position,
    boundaries: BoundaryConstraints
  ): Position {
    let { x, y } = position;
    
    if (x < 0) x = boundaries.width;
    if (x > boundaries.width) x = 0;
    if (y < 0) y = boundaries.height;
    if (y > boundaries.height) y = 0;
    
    return { x, y };
  }
  
  /**
   * Calculate soft boundary repulsion (gradual turn away from boundaries)
   */
  static calculateBoundaryRepulsion(
    position: Position,
    currentAngle: number,
    boundaries: BoundaryConstraints,
    repulsionDistance: number = 100
  ): number {
    const { width, height } = boundaries;
    let repulsionX = 0;
    let repulsionY = 0;
    
    // Calculate repulsion from each boundary
    const distToLeft = position.x;
    const distToRight = width - position.x;
    const distToTop = position.y;
    const distToBottom = height - position.y;
    
    if (distToLeft < repulsionDistance) {
      repulsionX += (repulsionDistance - distToLeft) / repulsionDistance;
    }
    if (distToRight < repulsionDistance) {
      repulsionX -= (repulsionDistance - distToRight) / repulsionDistance;
    }
    if (distToTop < repulsionDistance) {
      repulsionY += (repulsionDistance - distToTop) / repulsionDistance;
    }
    if (distToBottom < repulsionDistance) {
      repulsionY -= (repulsionDistance - distToBottom) / repulsionDistance;
    }
    
    if (repulsionX === 0 && repulsionY === 0) {
      return currentAngle;
    }
    
    const repulsionAngle = Math.atan2(repulsionY, repulsionX);
    return MovementUtils.lerpAngle(currentAngle, repulsionAngle, 0.1);
  }
}

// Export consolidated movement utilities
export const Movement = {
  Utils: MovementUtils,
  Snake: SnakeMovementUtils,
  Platform: PlatformMovementUtils,
  AI: AIMovementUtils,
  Boundary: BoundaryMovementUtils
};