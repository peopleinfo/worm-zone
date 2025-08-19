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
    const drawRadius = radius || this.radius;
    const drawColor = color || this.color;
    
    // Save current context state
    ctx.save();
    
    // Draw shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 1.5;
    ctx.shadowOffsetX = 1.5;
    ctx.shadowOffsetY = 1.5;
    
    // Draw main circle
    ctx.beginPath();
    ctx.fillStyle = drawColor;
    ctx.arc(this.x, this.y, drawRadius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Reset shadow for border
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Add subtle border for better definition
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.arc(this.x, this.y, drawRadius, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Restore context state
    ctx.restore();
  }
}