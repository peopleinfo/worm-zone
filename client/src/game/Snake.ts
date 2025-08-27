import { Point } from "./Point";
import type { Snake as SnakeInterface, Controls } from "../types/game";
import {
  getRandomColor,
  isCollided,
  coeffD2R,
  INFINITY,
  defRad,
} from "../utils/gameUtils";
import { performanceManager } from "../utils/performanceUtils";
import {
  SHADOW_COLOR,
  SHADOW_BLUR,
  SHADOW_OFFSET_X,
  SHADOW_OFFSET_Y,
  BODY_SEGMENT_SPACING,
} from "../config/gameConfig";

export class Snake implements SnakeInterface {
  static deadPoints: Point[] = [];

  static drawDeadpoints(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < Snake.deadPoints.length; i += 2) {
      Snake.deadPoints[i].draw(ctx);
    }
  }

  id: string;
  points: Point[];
  velocity: { x: number; y: number };
  angle: number;
  radius: number;
  speed: number;
  baseSpeed: number;
  turningSpeed: number;
  color: string;
  ai: boolean;
  isAlive: boolean;
  private fatScaler: number;
  private overPos: { x: number; y: number };
  finalScore?: number;
  finalRank?: number;

  constructor(
    x: number = 0,
    y: number = 0,
    length: number = 25,
    color: string = "red",
    id: string = Math.random().toString(36).substr(2, 9)
  ) {
    this.id = id;
    this.radius = 4;
    this.speed = 0.6;
    this.turningSpeed = 6;
    this.baseSpeed = 0.5; // Base speed for platform consistency
    this.points = [new Point(x, y, this.radius, color)];
    this.velocity = { x: 1, y: 0 };
    this.overPos = { x: 0, y: 0 };
    this.color = color;
    this.fatScaler = 0.002;
    this.angle = 0;
    this.ai = true;
    this.isAlive = true;

    for (let i = 1; i < length; i++) {
      this.points.push(new Point(INFINITY, INFINITY, this.radius, color));
    }
  }

  eat(color: string = "red", type?: string): void {
    const newPoint = new Point(INFINITY, INFINITY, this.radius, color, type);
    this.points.push(newPoint);
    this.radius = Math.min(
      10,
      Math.max(4, this.points.length * this.fatScaler)
    );
  }

  eatSnake(points: number, eatenSnake?: Snake): void {
    // Award points equal to the length of the eaten snake
    for (let i = 0; i < points; i++) {
      const tail = this.points[this.points.length - 1];
      // Preserve food type from eaten snake if available, otherwise use default
      const type = eatenSnake && eatenSnake.points[i] ? eatenSnake.points[i].type : undefined;
      const newPoint = new Point(tail.x, tail.y, tail.radius, this.color, type);
      this.points.push(newPoint);
    }
  }

  getHead(): Point {
    return this.points[0] ?? new Point(this.overPos.x, this.overPos.y);
  }

  calculateTargetAngleWithControls(controls: Controls): number {
    let targetAngle = this.angle;

    if (controls.up && controls.right) targetAngle = 45;
    else if (controls.up && controls.left) targetAngle = 90 + 45;
    else if (controls.down && controls.right) targetAngle = 270 + 45;
    else if (controls.down && controls.left) targetAngle = 270 - 45;
    else if (controls.up) targetAngle = 90;
    else if (controls.down) targetAngle = 270;
    else if (controls.left) targetAngle = 180;
    else if (controls.right) targetAngle = 0;

    return targetAngle;
  }

  calculateTargetAngleRandomly(): number {
    return [0, 45, 90, 135, 180, 225, 270, 315, 360][
      Math.floor(Math.random() * 8)
    ];
  }

  move(controls?: Controls, deltaTime: number = 16.67): void {
    if (!this.isAlive || this.points.length === 0) return;

    // For non-AI snakes, only update angle if using keyboard controls
    // Joypad controls set angle directly via updateSnakeAngle
    if (this.ai) {
      const targetAngle = this.calculateTargetAngleRandomly();
      this.updateAngle(targetAngle);
    } else if (
      controls &&
      (controls.up || controls.down || controls.left || controls.right)
    ) {
      const targetAngle = this.calculateTargetAngleWithControls(controls);
      this.updateAngle(targetAngle);
    }
    // If no keyboard controls are active, keep current angle (for joypad control)

    this.velocity = {
      x: Math.cos(this.angle * coeffD2R),
      y: Math.sin(this.angle * -coeffD2R),
    };

    // Platform-consistent movement with frame rate normalization
    const normalizedDeltaTime = deltaTime / 16.67; // Normalize to 60 FPS baseline
    const platformMultiplier = this.getPlatformSpeedMultiplier();
    const effectiveSpeed =
      this.baseSpeed * normalizedDeltaTime * platformMultiplier;

    const headX = this.getHead().x + effectiveSpeed * this.velocity.x;
    const headY = this.getHead().y + effectiveSpeed * this.velocity.y;

    // Preserve type from current head when creating new head
    const currentHead = this.getHead();
    const head = new Point(
      headX,
      headY,
      currentHead.radius,
      currentHead.color,
      currentHead.type
    );

    this.points.unshift(head);
    this.points.pop();
  }

  private getPlatformSpeedMultiplier(): number {
    // Detect platform and apply consistent speed multipliers
    const userAgent = navigator.userAgent.toLowerCase();

    if (/iphone|ipad|ipod/.test(userAgent)) {
      return 1.0; // iOS baseline
    } else if (/android/.test(userAgent)) {
      return 1.0; // Android same as iOS
    } else {
      return 1.0; // Desktop same speed
    }
  }

  updateAngle(targetAngle: number): void {
    let deltaAngle = (targetAngle - this.angle) % 360;
    if (deltaAngle > 180) deltaAngle -= 360;
    if (deltaAngle < -180) deltaAngle += 360;

    if (deltaAngle > 0) {
      this.angle = (this.angle + Math.min(this.turningSpeed, deltaAngle)) % 360;
    } else if (deltaAngle < 0) {
      this.angle =
        (this.angle - Math.min(this.turningSpeed, -deltaAngle)) % 360;
    }

    if (this.angle < 0) this.angle += 360;
  }

  checkCollisionsWithFood(
    target:
      | Point
      | { x: number; y: number; radius: number; color: string; type?: string }
  ):
    | Point
    | { x: number; y: number; radius: number; color: string; type?: string }
    | undefined {
    const head = this.getHead();
    // Create a temporary Point object for collision detection if target is not a Point
    const targetPoint =
      target instanceof Point
        ? target
        : new Point(target.x, target.y, target.radius, target.color);

    // Calculate distance for debugging
    const distance = Math.hypot(head.x - targetPoint.x, head.y - targetPoint.y);
    const requiredDistance = head.radius + targetPoint.radius;

    // Enhanced collision detection with tolerance for better reliability
    const collisionTolerance = 2; // Add 2 pixels tolerance for better collision detection
    const enhancedRequiredDistance = requiredDistance + collisionTolerance;
    const collisionDetected = distance <= enhancedRequiredDistance;

    // Debug logging for collision detection
    // if (distance < requiredDistance + 8) { // Log near-misses too
    //   console.log(`[COLLISION DEBUG] Snake ${this.id.substring(0,6)} - Distance: ${distance.toFixed(2)}, Required: ${requiredDistance.toFixed(2)}, Enhanced: ${enhancedRequiredDistance.toFixed(2)}, Collision: ${collisionDetected}`);
    //   console.log(`[COLLISION DEBUG] Head: (${head.x.toFixed(1)}, ${head.y.toFixed(1)}, r:${head.radius}) Food: (${targetPoint.x.toFixed(1)}, ${targetPoint.y.toFixed(1)}, r:${targetPoint.radius})`);
    // }

    if (collisionDetected) {
      // console.log(`[FOOD EATEN] Snake ${this.id.substring(0,6)} ate food at (${targetPoint.x.toFixed(1)}, ${targetPoint.y.toFixed(1)}) - Distance: ${distance.toFixed(2)}`);
      // Pass the food type if available (for Food objects) or default to 'pizza'
      const type = "type" in target ? target.type : "pizza";
      this.eat(target.color, type);
      
      // Play eat sound effect for player snake only
      if (!this.ai) {
        import("../services/audioService").then(({ audioService }) => {
          audioService.playEatSound();
        }).catch((error) => {
          console.warn('Failed to play eat sound:', error);
        });
      }
      
      return target;
    }
    return undefined;
  }

  checkCollisionsWithOtherSnakes(snake: Snake): {
    collided: boolean;
    collidedWith?: Snake;
    points?: number;
  } {
    if (snake === this || !this.isAlive) return { collided: false };

    const head = this.getHead();
    const collided = snake.points.find((p) => isCollided(head, p));

    if (collided) {
      const points = this.points.length; // Points to award to the other snake
      this.over();
      return { collided: true, collidedWith: snake, points };
    }
    return { collided: false };
  }

  checkCollisionsWithBoundary(
    worldWidth: number,
    worldHeight: number
  ): boolean {
    if (!this.isAlive) return false;

    const head = this.getHead();

    if (
      head.x - head.radius < 0 ||
      head.y - head.radius < 0 ||
      head.x + head.radius > worldWidth ||
      head.y + head.radius > worldHeight
    ) {
      this.over();
      return true;
    }
    return false;
  }

  over(): void {
    if (this.points.length === 0 || !this.isAlive) return;

    this.isAlive = false;
    const finalScore = this.points.length;

    // Import Food class and game store dynamically to avoid circular dependencies
    import("../game/Food")
      .then(({ Food }) => {
        import("../stores/gameStore")
          .then(({ useGameStore }) => {
            const store = useGameStore.getState();

            // Convert snake segments to food items preserving their original types
            // Add wider spacing by applying random offsets to positions
            const newFoodItems = this.points.map((p, index) => {
              // Use the stored food type from the segment, or default to 'pizza' if not available
              const type = p.type || "pizza";

              // Add random offset for wider spacing (within reasonable bounds)
              const offsetRange = this.radius * 2; // Spacing range based on snake radius
              const offsetX = (Math.random() - 0.5) * offsetRange;
              const offsetY = (Math.random() - 0.5) * offsetRange;

              const newX = p.x + offsetX;
              const newY = p.y + offsetY;

              const food = new Food(
                `${this.id}_segment_${index}_${Date.now()}`,
                newX,
                newY,
                p.radius,
                p.color,
                type
              );
              return food;
            });

            // Add new food items to the game store
            const currentFoods = store.foods;
            store.updateFoods([...currentFoods, ...newFoodItems]);

            // Debug logging to show actual food types being created
            const typeCounts = newFoodItems.reduce((acc, food) => {
              acc[food.type] = (acc[food.type] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);
            const typesSummary = Object.entries(typeCounts)
              .map(([type, count]) => `${count}x ${type}`)
              .join(", ");
            console.log(
              `🍕 Snake death: Created ${newFoodItems.length} food items: ${typesSummary}`
            );
          })
          .catch((error) => {
            console.error("Failed to import gameStore:", error);
            // Fallback to original dead points behavior
            const latestDeadPoints = this.points.map(
              (p) => new Point(p.x, p.y, defRad, getRandomColor())
            );
            Snake.deadPoints.push(...latestDeadPoints);
          });
      })
      .catch((error) => {
        console.error("Failed to import Food class:", error);
        // Fallback to original dead points behavior
        const latestDeadPoints = this.points.map(
          (p) => new Point(p.x, p.y, defRad, getRandomColor())
        );
        Snake.deadPoints.push(...latestDeadPoints);
      });

    const head = this.getHead();
    this.overPos.x = head.x;
    this.overPos.y = head.y;

    this.points.length = 0;

    this.finalScore = finalScore;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.isAlive || this.points.length === 0) return;

    // Check if shadows should be enabled based on device performance
    const devicePerf = performanceManager.getDevicePerformance();
    const enableShadows = devicePerf.enableShadows;

    // Draw body segments with overlap to create continuous appearance
    // Use smaller increment to ensure segments overlap and connect seamlessly
    const segmentSpacing = Math.max(
      1,
      Math.floor(this.radius * BODY_SEGMENT_SPACING)
    );

    // FIXED: Draw tail FIRST (at the bottom layer) with enhanced appearance
    if (this.points.length > 1) {
      const lastIndex = this.points.length - 1;
      if (lastIndex % segmentSpacing !== 0 && lastIndex > 0) {
        // Draw tail with slightly smaller radius for tapered effect
        const tailPoint = this.points[lastIndex];
        const tailRadius = tailPoint.radius * 0.8; // Make tail slightly smaller

        ctx.save();
        if (enableShadows) {
          ctx.shadowColor = SHADOW_COLOR;
          ctx.shadowBlur = SHADOW_BLUR;
          ctx.shadowOffsetX = SHADOW_OFFSET_X;
          ctx.shadowOffsetY = SHADOW_OFFSET_Y;
        }

        ctx.fillStyle = tailPoint.color;
        ctx.beginPath();
        ctx.arc(tailPoint.x, tailPoint.y, tailRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      }
    }

    // Draw body segments (excluding head - index 0) from tail to head
    // This ensures newer segments appear on top when snake overlaps itself
    for (let i = this.points.length - 1; i >= 1; i -= segmentSpacing) {
      this.points[i].draw(
        ctx,
        enableShadows,
        SHADOW_COLOR,
        SHADOW_BLUR,
        SHADOW_OFFSET_X,
        SHADOW_OFFSET_Y
      );
    }

    // Draw head on top of all body segments
    if (this.points.length > 0) {
      this.points[0].draw(
        ctx,
        enableShadows,
        SHADOW_COLOR,
        SHADOW_BLUR,
        SHADOW_OFFSET_X,
        SHADOW_OFFSET_Y
      );
    }

    // Draw facial features on top of head
    this.drawEye(ctx);
    this.drawEar(ctx);
    this.drawMouth(ctx);
  }

  private drawEye(ctx: CanvasRenderingContext2D): void {
    const head = this.getHead();
    const eyeGapCoeff = 2;

    const eyeRight = new Point(
      head.x - (this.radius / eyeGapCoeff) * this.velocity.y,
      head.y + (this.radius / eyeGapCoeff) * this.velocity.x,
      this.radius / 4
    );

    const eyeLeft = new Point(
      head.x + (this.radius / eyeGapCoeff) * this.velocity.y,
      head.y - (this.radius / eyeGapCoeff) * this.velocity.x,
      this.radius / 4
    );

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(eyeRight.x, eyeRight.y, eyeRight.radius, 0, 2 * Math.PI);
    ctx.arc(eyeLeft.x, eyeLeft.y, eyeLeft.radius, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(eyeRight.x, eyeRight.y, eyeRight.radius / 2, 0, 2 * Math.PI);
    ctx.arc(eyeLeft.x, eyeLeft.y, eyeLeft.radius / 2, 0, 2 * Math.PI);
    ctx.fill();
  }

  private drawEar(ctx: CanvasRenderingContext2D): void {
    const head = this.getHead();

    const earRight = new Point(
      head.x - this.radius * this.velocity.y,
      head.y + this.radius * this.velocity.x,
      this.radius / 3.5
    );

    const earLeft = new Point(
      head.x + this.radius * this.velocity.y,
      head.y - this.radius * this.velocity.x,
      this.radius / 3.5
    );

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(earLeft.x, earLeft.y, earLeft.radius, 0, 2 * Math.PI);
    ctx.arc(earRight.x, earRight.y, earRight.radius, 0, 2 * Math.PI);
    ctx.fill();
  }

  private drawMouth(ctx: CanvasRenderingContext2D): void {
    const head = this.getHead();

    const mouth = new Point(
      head.x + (this.radius / 2) * this.velocity.x,
      head.y + (this.radius / 2) * this.velocity.y,
      this.radius / 8
    );

    ctx.fillStyle = "red";
    ctx.beginPath();
    const max = this.radius / 2;
    const min = this.radius / 8;
    ctx.ellipse(
      mouth.x,
      mouth.y,
      min,
      max,
      (-this.angle * Math.PI) / 180,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}
