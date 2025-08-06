import { Point } from './Point';
import type { Snake as SnakeInterface, Controls } from '../types/game';
import { getRandomColor, isCollided, coeffD2R, INFINITY, defRad } from '../utils/gameUtils';

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
    this.speed = 1.3;
    this.turningSpeed = 7;
    this.points = [new Point(x, y, this.radius, getRandomColor())];
    this.velocity = { x: 1, y: 0 };
    this.overPos = { x: 0, y: 0 };
    this.color = getRandomColor();
    this.fatScaler = 0.001;
    this.angle = 0;
    this.ai = true;
    this.isAlive = true;

    for (let i = 1; i < length; i++) {
      this.points.push(new Point(INFINITY, INFINITY, this.radius, getRandomColor()));
    }
  }

  eat(color: string = 'red'): void {
    const newPoint = new Point(INFINITY, INFINITY, this.radius, color);
    this.points.push(newPoint);
    this.radius = Math.min(10, Math.max(4, this.points.length * this.fatScaler));
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
    return [0, 45, 90, 135, 180, 225, 270, 315, 360][Math.floor(Math.random() * 8)];
  }

  move(controls?: Controls): void {
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

    const headX = this.getHead().x + this.speed * this.velocity.x;
    const headY = this.getHead().y + this.speed * this.velocity.y;

    const head = new Point(headX, headY, this.getHead().radius, this.getHead().color);

    this.points.unshift(head);
    this.points.pop();
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

  checkCollisionsWithFood(point: Point): Point | undefined {
    const head = this.getHead();
    if (isCollided(head, point)) {
      this.eat(point.color);
      return point;
    }
    return undefined;
  }

  checkCollisionsWithOtherSnakes(snake: Snake): boolean {
    if (snake === this || !this.isAlive) return false;

    const head = this.getHead();
    const collided = snake.points.find(p => isCollided(head, p));
    
    if (collided) {
      this.over();
      return true;
    }
    return false;
  }

  checkCollisionsWithBoundary(canvasWidth: number, canvasHeight: number): boolean {
    if (!this.isAlive) return false;
    
    const head = this.getHead();

    if (
      head.x < 0 ||
      head.y < 0 ||
      head.x + head.radius > canvasWidth ||
      head.y + head.radius > canvasHeight
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
    
    const latestDeadPoints = this.points.map(p => new Point(p.x, p.y, defRad, getRandomColor()));
    Snake.deadPoints.push(...latestDeadPoints);

    const head = this.getHead();
    this.overPos.x = head.x;
    this.overPos.y = head.y;
    
    this.points.length = 0;
    
    this.finalScore = finalScore;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.isAlive || this.points.length === 0) return;

    for (let i = 0; i < this.points.length; i += Math.floor(this.radius)) {
      this.points[i].draw(ctx, '', this.radius);
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