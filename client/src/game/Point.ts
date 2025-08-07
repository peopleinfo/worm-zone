export class Point {
  public x: number;
  public y: number;
  public radius: number;
  public color: string;

  constructor(
    x: number = 0,
    y: number = 0,
    radius: number = 5,
    color: string = 'blue'
  ) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
  }

  draw(ctx: CanvasRenderingContext2D, color?: string, radius?: number): void {
    ctx.beginPath();
    ctx.fillStyle = color || this.color;
    ctx.arc(this.x, this.y, radius || this.radius, 0, 2 * Math.PI);
    ctx.fill();
  }
}