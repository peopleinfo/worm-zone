export class Drawing {
  private lines: Array<{ x: number; y: number; color: string }[]> = [];

  constructor() {
    this.lines = [];
  }

  delete(): void {
    this.lines.length = 0;
  }

  pushLine(line: Array<{ x: number; y: number; color: string }>): void {
    this.lines.push(line);
  }

  drawLine(
    ctx: CanvasRenderingContext2D,
    points: Array<{ x: number; y: number; color: string }>,
    color: string = 'white'
  ): void {
    if (points.length < 2) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    
    ctx.stroke();
  }

  redraw(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    for (const line of this.lines) {
      if (line.length > 0) {
        const color = line[0].color || 'white';
        this.drawLine(ctx, line, color);
      }
    }
  }
}