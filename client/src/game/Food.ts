import type { Food as FoodInterface } from '../types/game';
import { getRandomColor, getRandX, getRandY, defRad, lerp } from '../utils/gameUtils';

export class Food implements FoodInterface {
  static i = 0;
  
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;

  constructor(radius: number = defRad, canvasWidth: number = 800, canvasHeight: number = 600) {
    this.x = getRandX(canvasWidth);
    this.y = getRandY(canvasHeight);
    this.radius = radius;
    this.color = getRandomColor();
    this.id = Math.random().toString(36).substr(2, 9);
  }

  regenerate(canvasWidth: number = 800, canvasHeight: number = 600): void {
    this.x = getRandX(canvasWidth);
    this.y = getRandY(canvasHeight);
    this.color = getRandomColor();
  }

  animate(): void {
    this.radius = lerp(this.radius * 0.8, this.radius, ++Food.i / this.radius);
    Food.i %= 17;
  }

  draw(ctx: CanvasRenderingContext2D, color?: string): void {
    // this.animate(); // Uncomment if animation is desired
    const drawColor = color || this.color;
    
    // Save current context state
    ctx.save();
    
    // Draw shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 1;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    
    // Create radial gradient for food
    const gradient = ctx.createRadialGradient(
      this.x - this.radius * 0.2, 
      this.y - this.radius * 0.2, 
      0,
      this.x, 
      this.y, 
      this.radius
    );
    
    // Add gradient stops for a more appealing look
    gradient.addColorStop(0, this.lightenColor(drawColor, 0.4));
    gradient.addColorStop(0.7, drawColor);
    gradient.addColorStop(1, this.darkenColor(drawColor, 0.3));
    
    // Draw main food circle with gradient
    ctx.beginPath();
    ctx.fillStyle = gradient;
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Reset shadow for border
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Add glowing border
    ctx.beginPath();
    ctx.strokeStyle = this.lightenColor(drawColor, 0.3);
    ctx.lineWidth = 1;
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Add inner highlight
    ctx.beginPath();
    ctx.fillStyle = `rgba(255, 255, 255, 0.3)`;
    ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Restore context state
    ctx.restore();
  }
  
  private lightenColor(color: string, amount: number): string {
    // Handle different color formats
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + Math.floor(255 * amount));
      const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + Math.floor(255 * amount));
      const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + Math.floor(255 * amount));
      return `rgb(${r}, ${g}, ${b})`;
    }
    // For named colors or other formats, return a lighter version
    return `rgba(255, 255, 255, ${0.3 + amount})`;
  }
  
  private darkenColor(color: string, amount: number): string {
    // Handle different color formats
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - Math.floor(255 * amount));
      const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - Math.floor(255 * amount));
      const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - Math.floor(255 * amount));
      return `rgb(${r}, ${g}, ${b})`;
    }
    // For named colors or other formats, return a darker version
    return `rgba(0, 0, 0, ${0.2 + amount})`;
  }
}