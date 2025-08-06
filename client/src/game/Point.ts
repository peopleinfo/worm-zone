export class Point {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public radius: number = 5,
    public color: string = 'blue'
  ) {}

  draw(ctx: CanvasRenderingContext2D, color?: string, radius?: number): void {
    ctx.beginPath();
    ctx.fillStyle = color || this.color;
    ctx.arc(this.x, this.y, radius || this.radius, 0, 2 * Math.PI);
    ctx.fill();
  }
}