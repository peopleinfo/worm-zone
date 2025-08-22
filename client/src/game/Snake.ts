import { Point } from './Point';
import type { Snake as SnakeInterface, Controls } from '../types/game';
import { getRandomColor, isCollided, coeffD2R, INFINITY, defRad } from '../utils/gameUtils';
import { PooledObjects } from '../utils/ObjectPool';
import { GAME_FPS } from '../config/gameConfig';

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
    color: string = 'red',
    id: string = Math.random().toString(36).substr(2, 9)
  ) {
    this.id = id;
    this.radius = 4;
    this.speed = 0.9;
    this.turningSpeed = 7;
    this.baseSpeed = 0.8; // Base speed for platform consistency (increased for better gameplay feel)
    this.points = [PooledObjects.createPoint(x, y, this.radius, color)];
    this.velocity = { x: 1, y: 0 };
    this.overPos = { x: 0, y: 0 };
    this.color = color;
    this.fatScaler = 0.001;
    this.angle = 0;
    this.ai = true;
    this.isAlive = true;

    for (let i = 1; i < length; i++) {
      this.points.push(PooledObjects.createPoint(INFINITY, INFINITY, this.radius, getRandomColor()));
    }
  }

  eat(color: string = 'red'): void {
    const newPoint = PooledObjects.createPoint(INFINITY, INFINITY, this.radius, color);
    this.points.push(newPoint);
    this.radius = Math.min(10, Math.max(4, this.points.length * this.fatScaler));
  }

  eatSnake(points: number): void {
    // Award points equal to the length of the eaten snake
    for (let i = 0; i < points; i++) {
      const tail = this.points[this.points.length - 1];
      const newPoint = PooledObjects.createPoint(tail.x, tail.y, tail.radius, this.color);
      this.points.push(newPoint);
    }
  }

  getHead(): Point {
    return this.points[0] ?? PooledObjects.createPoint(this.overPos.x, this.overPos.y, this.radius, this.color);
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
    return [0, 45, 90, 135, 180, 225, 270, 315, 360][Math.floor(Math.random() * 8)];
  }

  move(controls?: Controls, deltaTime: number = 16.67): void {
    if (!this.isAlive || this.points.length === 0) return;

    // For non-AI snakes, only update angle if using keyboard controls
    // Joypad controls set angle directly via updateSnakeAngle
    if (this.ai) {
      const targetAngle = this.calculateTargetAngleRandomly();
      this.updateAngle(targetAngle);
    } else if (controls && (controls.up || controls.down || controls.left || controls.right)) {
      const targetAngle = this.calculateTargetAngleWithControls(controls);
      this.updateAngle(targetAngle);
    }
    // If no keyboard controls are active, keep current angle (for joypad control)

    this.velocity = {
      x: Math.cos(this.angle * coeffD2R),
      y: Math.sin(this.angle * -coeffD2R)
    };

    // Platform-consistent movement with frame rate normalization
    const normalizedDeltaTime = deltaTime / (1000 / GAME_FPS); // Normalize to configurable FPS baseline
    const platformMultiplier = this.getPlatformSpeedMultiplier();
    const effectiveSpeed = this.baseSpeed * normalizedDeltaTime * platformMultiplier;

    const headX = this.getHead().x + effectiveSpeed * this.velocity.x;
    const headY = this.getHead().y + effectiveSpeed * this.velocity.y;

    const head = PooledObjects.createPoint(headX, headY, this.getHead().radius, this.getHead().color);

    this.points.unshift(head);
    const removedPoint = this.points.pop();
    if (removedPoint) {
      PooledObjects.releasePoint(removedPoint);
    }
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
      this.angle = (this.angle - Math.min(this.turningSpeed, -deltaAngle)) % 360;
    }

    if (this.angle < 0) this.angle += 360;
  }

  checkCollisionsWithFood(target: Point | { x: number; y: number; radius: number; color: string }): Point | { x: number; y: number; radius: number; color: string } | undefined {
    const head = this.getHead();
    // Create a temporary Point object for collision detection if target is not a Point
    const targetPoint = target instanceof Point ? target : PooledObjects.createPoint(target.x, target.y, target.radius, target.color);
    
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
      this.eat(target.color);
      return target;
    }
    return undefined;
  }

  checkCollisionsWithOtherSnakes(snake: Snake): { collided: boolean; collidedWith?: Snake; points?: number } {
    if (snake === this || !this.isAlive) return { collided: false };

    const head = this.getHead();
    const collided = snake.points.find(p => isCollided(head, p));
    
    if (collided) {
      const points = this.points.length; // Points to award to the other snake
      this.over();
      return { collided: true, collidedWith: snake, points };
    }
    return { collided: false };
  }

  checkCollisionsWithBoundary(worldWidth: number, worldHeight: number): boolean {
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
    
    // Use smaller radius (3) for dead points to match regular food size visually
    const latestDeadPoints = this.points.map(p => PooledObjects.createPoint(p.x, p.y, 3, getRandomColor()));
    Snake.deadPoints.push(...latestDeadPoints);
    
    // Release the snake's points back to the pool
    this.points.forEach(point => PooledObjects.releasePoint(point));

    const head = this.getHead();
    this.overPos.x = head.x;
    this.overPos.y = head.y;
    
    this.points.length = 0;
    
    this.finalScore = finalScore;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.isAlive || this.points.length === 0) return;

    // Draw body segments with overlap to create continuous appearance
    // Use larger increment to make snake body less compact and wider
    const segmentSpacing = Math.max(1, Math.floor(this.radius * 0.65)); // 65% of radius for even wider, less compact segments
    
    for (let i = 0; i < this.points.length; i += segmentSpacing) {
      this.points[i].draw(ctx, '', this.radius);
    }
    
    // Always draw the last segment to ensure tail is visible
    if (this.points.length > 1) {
      const lastIndex = this.points.length - 1;
      if (lastIndex % segmentSpacing !== 0) {
        this.points[lastIndex].draw(ctx, '', this.radius);
      }
    }

    this.drawEye(ctx);
    this.drawEar(ctx);
    this.drawMouth(ctx);
  }

  private drawEye(ctx: CanvasRenderingContext2D): void {
    const head = this.getHead();
    const eyeGapCoeff = 2;

    const eyeRight = new Point(
      head.x - this.radius / eyeGapCoeff * this.velocity.y,
      head.y + this.radius / eyeGapCoeff * this.velocity.x,
      this.radius / 4
    );

    const eyeLeft = new Point(
      head.x + this.radius / eyeGapCoeff * this.velocity.y,
      head.y - this.radius / eyeGapCoeff * this.velocity.x,
      this.radius / 4
    );

    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(eyeRight.x, eyeRight.y, eyeRight.radius, 0, 2 * Math.PI);
    ctx.arc(eyeLeft.x, eyeLeft.y, eyeLeft.radius, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = 'black';
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
      head.x + this.radius / 2 * this.velocity.x,
      head.y + this.radius / 2 * this.velocity.y,
      this.radius / 8
    );

    ctx.fillStyle = 'red';
    ctx.beginPath();
    const max = this.radius / 2;
    const min = this.radius / 8;
    ctx.ellipse(mouth.x, mouth.y, min, max, -this.angle * Math.PI / 180, 0, Math.PI * 2);
    ctx.fill();
  }
}