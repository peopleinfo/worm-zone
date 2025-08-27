import { getRandomColor, getRandX, getRandY, lerp } from '../utils/gameUtils';
import { Point } from './Point';

type Type = 'pizza' | 'apple' | 'cherry' | 'donut' | 'burger';
  
export class Food extends Point {
  static i: number = 0;
  static imageCache: Map<string, HTMLCanvasElement> = new Map();
  id: string;
  type: Type;
  private imageReady: boolean = false;

  constructor(id: string, x: number, y: number, radius: number, color: string, type?: Type) {
    super(x, y, radius, color);
    this.id = id;
    this.type = type || this.getRandomFood();
    this.createFoodImage();
  }

  private getRandomFood(): Type {
    const types: Type[] = ['pizza', 'cherry', 'donut', 'burger'];   
    return types[Math.floor(Math.random() * types.length)];
  }

  private createFoodImage(): void {
    const cacheKey = `${this.type}_${this.radius}`;
    
    if (Food.imageCache.has(cacheKey)) {
      this.imageReady = true;
      return;
    }

    const canvas = document.createElement('canvas');
    const size = this.radius * 2.5;
    
    // High-DPI support for crisp rendering
    const devicePixelRatio = window.devicePixelRatio || 1;
    const scaledSize = size * devicePixelRatio;
    
    canvas.width = scaledSize;
    canvas.height = scaledSize;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      this.imageReady = false;
      return;
    }

    // Scale context for high-DPI
    ctx.scale(devicePixelRatio, devicePixelRatio);
    
    // Enable anti-aliasing and smooth rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    const centerX = size / 2;
    const centerY = size / 2;
    const drawRadius = this.radius;

    // Draw different food types
    switch (this.type) {
      case 'apple':
        this.drawApple(ctx, centerX, centerY, drawRadius);
        break;
      case 'cherry':
        this.drawCherry(ctx, centerX, centerY, drawRadius);
        break;
      case 'burger':
        this.drawBurger(ctx, centerX, centerY, drawRadius);
        break;
      case 'pizza':
        this.drawPizza(ctx, centerX, centerY, drawRadius, size);
        break;
    }

    Food.imageCache.set(cacheKey, canvas);
    this.imageReady = true;
  }

  private drawApple(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
    // Add shadow for depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Apple body with gradient
    const appleGradient = ctx.createRadialGradient(
      x - radius * 0.3, y - radius * 0.2, 0,
      x, y + radius * 0.1, radius * 0.9
    );
    appleGradient.addColorStop(0, '#FF6B6B');
    appleGradient.addColorStop(0.4, '#FF4444');
    appleGradient.addColorStop(0.8, '#DC143C');
    appleGradient.addColorStop(1, '#8B0000');
    
    ctx.fillStyle = appleGradient;
    ctx.beginPath();
    ctx.arc(x, y + radius * 0.1, radius * 0.9, 0, Math.PI * 2);
    ctx.fill();
    
    // Reset shadow for highlight
    ctx.shadowColor = 'transparent';
    
    // Apple highlight with gradient
    const highlightGradient = ctx.createRadialGradient(
      x - radius * 0.4, y - radius * 0.2, 0,
      x - radius * 0.3, y - radius * 0.1, radius * 0.3
    );
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    highlightGradient.addColorStop(0.5, 'rgba(255, 136, 136, 0.6)');
    highlightGradient.addColorStop(1, 'rgba(255, 68, 68, 0.2)');  
    
    ctx.fillStyle = highlightGradient;
    ctx.beginPath();
    ctx.arc(x - radius * 0.3, y - radius * 0.1, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Apple stem with gradient
    const stemGradient = ctx.createLinearGradient(x - 2, y - radius, x + 2, y - radius * 0.7);
    stemGradient.addColorStop(0, '#A0522D');
    stemGradient.addColorStop(1, '#8B4513');
    
    ctx.fillStyle = stemGradient;
    ctx.fillRect(x - 2, y - radius, 4, radius * 0.3);
    
    // Apple leaf with gradient
    const leafGradient = ctx.createLinearGradient(
      x + radius * 0.1, y - radius * 0.8,
      x + radius * 0.3, y - radius * 0.6
    );
    leafGradient.addColorStop(0, '#32CD32');
    leafGradient.addColorStop(0.5, '#228B22');
    leafGradient.addColorStop(1, '#006400');
    
    ctx.fillStyle = leafGradient;
    ctx.beginPath();
    ctx.ellipse(x + radius * 0.2, y - radius * 0.7, radius * 0.2, radius * 0.1, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawCherry(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
    // Add shadow for depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Cherry 1 with gradient
    const cherry1Gradient = ctx.createRadialGradient(
      x - radius * 0.4, y + radius * 0.1, 0,
      x - radius * 0.3, y + radius * 0.2, radius * 0.6
    );
    cherry1Gradient.addColorStop(0, '#FF6B6B');
    cherry1Gradient.addColorStop(0.3, '#FF4444');
    cherry1Gradient.addColorStop(0.7, '#DC143C');
    cherry1Gradient.addColorStop(1, '#8B0000');
    
    ctx.fillStyle = cherry1Gradient;
    ctx.beginPath();
    ctx.arc(x - radius * 0.3, y + radius * 0.2, radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    
    // Cherry 2 with gradient
    const cherry2Gradient = ctx.createRadialGradient(
      x + radius * 0.2, y + radius * 0.1, 0,
      x + radius * 0.3, y + radius * 0.2, radius * 0.6
    );
    cherry2Gradient.addColorStop(0, '#FF6B6B');
    cherry2Gradient.addColorStop(0.3, '#FF4444');
    cherry2Gradient.addColorStop(0.7, '#DC143C');
    cherry2Gradient.addColorStop(1, '#8B0000');
    
    ctx.fillStyle = cherry2Gradient;
    ctx.beginPath();
    ctx.arc(x + radius * 0.3, y + radius * 0.2, radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    
    // Add highlights to cherries
    ctx.shadowColor = 'transparent';
    
    // Cherry 1 highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(x - radius * 0.4, y + radius * 0.1, radius * 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Cherry 2 highlight
    ctx.beginPath();
    ctx.arc(x + radius * 0.2, y + radius * 0.1, radius * 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Stems with gradient
    const stemGradient = ctx.createLinearGradient(x, y - radius * 0.8, x, y - radius * 0.2);
    stemGradient.addColorStop(0, '#32CD32');
    stemGradient.addColorStop(0.5, '#228B22');
    stemGradient.addColorStop(1, '#006400');
    
    ctx.strokeStyle = stemGradient;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - radius * 0.3, y - radius * 0.2);
    ctx.lineTo(x - radius * 0.1, y - radius * 0.8);
    ctx.moveTo(x + radius * 0.3, y - radius * 0.2);
    ctx.lineTo(x + radius * 0.1, y - radius * 0.8);
    ctx.stroke();
  }
  private drawBurger(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
    // Add shadow for depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Bottom bun with gradient
    const bottomBunGradient = ctx.createRadialGradient(
      x - radius * 0.3, y + radius * 0.1, 0,
      x, y + radius * 0.3, radius * 0.8
    );
    bottomBunGradient.addColorStop(0, '#F5DEB3');
    bottomBunGradient.addColorStop(0.6, '#DEB887');
    bottomBunGradient.addColorStop(1, '#D2B48C');
    
    ctx.fillStyle = bottomBunGradient;
    ctx.beginPath();
    ctx.arc(x, y + radius * 0.3, radius * 0.8, 0, Math.PI);
    ctx.fill();
    
    // Reset shadow for layers
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 2;
    
    // Patty with gradient
    const pattyGradient = ctx.createLinearGradient(
      x - radius * 0.7, y - radius * 0.1,
      x + radius * 0.7, y + radius * 0.4
    );
    pattyGradient.addColorStop(0, '#A0522D');
    pattyGradient.addColorStop(0.5, '#8B4513');
    pattyGradient.addColorStop(1, '#654321');
    
    ctx.fillStyle = pattyGradient;
    ctx.fillRect(x - radius * 0.7, y, radius * 1.4, radius * 0.3);
    
    // Cheese with gradient and melted effect
    const cheeseGradient = ctx.createLinearGradient(
      x - radius * 0.6, y - radius * 0.2,
      x + radius * 0.6, y + radius * 0.1
    );
    cheeseGradient.addColorStop(0, '#FFED4E');
    cheeseGradient.addColorStop(0.5, '#FFD700');
    cheeseGradient.addColorStop(1, '#FFA500');
    
    ctx.fillStyle = cheeseGradient;
    // Create melted cheese effect with curved edges
    ctx.beginPath();
    ctx.moveTo(x - radius * 0.6, y - radius * 0.1);
    ctx.quadraticCurveTo(x - radius * 0.8, y + radius * 0.05, x - radius * 0.7, y + radius * 0.1);
    ctx.lineTo(x + radius * 0.7, y + radius * 0.1);
    ctx.quadraticCurveTo(x + radius * 0.8, y + radius * 0.05, x + radius * 0.6, y - radius * 0.1);
    ctx.closePath();
    ctx.fill();
    
    // Lettuce with wavy edges
    const lettuceGradient = ctx.createLinearGradient(
      x - radius * 0.8, y - radius * 0.4,
      x + radius * 0.8, y - radius * 0.15
    );
    lettuceGradient.addColorStop(0, '#32CD32');
    lettuceGradient.addColorStop(0.5, '#228B22');
    lettuceGradient.addColorStop(1, '#006400');
    
    ctx.fillStyle = lettuceGradient;
    // Create wavy lettuce effect
    ctx.beginPath();
    ctx.moveTo(x - radius * 0.8, y - radius * 0.3);
    for (let i = 0; i <= 8; i++) {
      const waveX = x - radius * 0.8 + (i * radius * 0.2);
      const waveY = y - radius * 0.3 + Math.sin(i) * radius * 0.05;
      ctx.lineTo(waveX, waveY);
    }
    ctx.lineTo(x + radius * 0.8, y - radius * 0.15);
    ctx.lineTo(x - radius * 0.8, y - radius * 0.15);
    ctx.closePath();
    ctx.fill();
    
    // Top bun with gradient
    const topBunGradient = ctx.createRadialGradient(
      x - radius * 0.3, y - radius * 0.6, 0,
      x, y - radius * 0.4, radius * 0.8
    );
    topBunGradient.addColorStop(0, '#F5DEB3');
    topBunGradient.addColorStop(0.6, '#DEB887');
    topBunGradient.addColorStop(1, '#D2B48C');
    
    ctx.fillStyle = topBunGradient;
    ctx.beginPath();
    ctx.arc(x, y - radius * 0.4, radius * 0.8, Math.PI, Math.PI * 2);
    ctx.fill();
    
    // Reset shadow for sesame seeds
    ctx.shadowColor = 'transparent';
    
    // Enhanced sesame seeds with better positioning and highlights
    const seedPositions = [
      { x: x - radius * 0.4, y: y - radius * 0.6 },
      { x: x - radius * 0.1, y: y - radius * 0.65 },
      { x: x + radius * 0.2, y: y - radius * 0.6 },
      { x: x + radius * 0.4, y: y - radius * 0.55 },
      { x: x - radius * 0.25, y: y - radius * 0.55 }
    ];
    
    seedPositions.forEach(seed => {
      // Seed shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.ellipse(seed.x + 0.5, seed.y + 0.5, 1.5, 1, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Seed body
      ctx.fillStyle = '#F5F5DC';
      ctx.beginPath();
      ctx.ellipse(seed.x, seed.y, 1.5, 1, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private drawPizza(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, size: number): void {
    // Load and draw the PNG image from icons folder
    const img = new Image();
    img.onload = () => {
      // Clear the canvas area first
      ctx.clearRect(0, 0, size, size);
      
      // Calculate the image size to fit within the food radius
      const imageSize = radius * 2;
      const imageX = x - imageSize / 2;
      const imageY = y - imageSize / 2;
      
      // Draw the PNG image with high quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      ctx.drawImage(img, imageX, imageY, imageSize, imageSize);
      
      // Update the cache with the new image
      const cacheKey = `${this.type}_${this.radius}`;
      const canvas = ctx.canvas;
      Food.imageCache.set(cacheKey, canvas);
    };
    
    img.onerror = () => {
      // Fallback to a simple circle if image fails to load
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    };
    
    // Set the image source to the PNG file
    img.src = '/icons/80x80.png';
  }

  // Override isInViewport to include food-specific logic if needed
  isInViewport(viewX: number, viewY: number, viewWidth: number, viewHeight: number): boolean {
    const margin = this.radius * 2; // Add some margin for smooth transitions
    return (
      this.x + margin >= viewX &&
      this.x - margin <= viewX + viewWidth &&
      this.y + margin >= viewY &&
      this.y - margin <= viewY + viewHeight
    );
  }

  regenerate(canvasWidth: number = 800, canvasHeight: number = 600): void {
    this.x = getRandX(canvasWidth);
    this.y = getRandY(canvasHeight);
    this.color = getRandomColor();
    // Generate new food type for variety
    this.type = this.getRandomFood();
    this.createFoodImage();
  }

  animate(): void {
    this.radius = lerp(this.radius * 0.8, this.radius, ++Food.i / this.radius);
    Food.i %= 17;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // Save current context state
    ctx.save();
    
    // Enable high-quality rendering for the main canvas
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Use cached food image if available, otherwise fallback to circle
    if (this.imageReady) {
      const cacheKey = `${this.type}_${this.radius}`;
      const foodImage = Food.imageCache.get(cacheKey);
      
      if (foodImage) {
        const size = this.radius * 2.5;
        
        // Apply high-quality image rendering
        ctx.drawImage(
          foodImage,
          this.x - size / 2,
          this.y - size / 2,
          size,
          size
        );
        
        // Restore context state
        ctx.restore();
        return;
      }
    }
    
    // Enhanced fallback rendering with gradients and anti-aliasing
    const drawColor = this.color;
    
    // Add subtle shadow for depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    
    // Create gradient for better visual appeal
    const gradient = ctx.createRadialGradient(
      this.x - this.radius * 0.3, this.y - this.radius * 0.3, 0,
      this.x, this.y, this.radius
    );
    
    // Parse color and create lighter/darker variants
    const baseColor = drawColor;
    const lighterColor = this.lightenColor(baseColor, 0.3);
    const darkerColor = this.darkenColor(baseColor, 0.2);
    
    gradient.addColorStop(0, lighterColor);
    gradient.addColorStop(0.7, baseColor);
    gradient.addColorStop(1, darkerColor);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Reset shadow for border
    ctx.shadowColor = 'transparent';
    
    // Enhanced border with gradient
    const borderGradient = ctx.createLinearGradient(
      this.x - this.radius, this.y - this.radius,
      this.x + this.radius, this.y + this.radius
    );
    borderGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    borderGradient.addColorStop(1, 'rgba(255, 255, 255, 0.3)');
    
    ctx.strokeStyle = borderGradient;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Restore context state
    ctx.restore();
  }
  
  private lightenColor(color: string, factor: number): string {
    // Simple color lightening - works with hex colors
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const num = parseInt(hex, 16);
      const r = Math.min(255, Math.floor((num >> 16) + (255 - (num >> 16)) * factor));
      const g = Math.min(255, Math.floor(((num >> 8) & 0x00FF) + (255 - ((num >> 8) & 0x00FF)) * factor));
      const b = Math.min(255, Math.floor((num & 0x0000FF) + (255 - (num & 0x0000FF)) * factor));
      return `rgb(${r}, ${g}, ${b})`;
    }
    return color;
  }
  
  private darkenColor(color: string, factor: number): string {
    // Simple color darkening - works with hex colors
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const num = parseInt(hex, 16);
      const r = Math.floor((num >> 16) * (1 - factor));
      const g = Math.floor(((num >> 8) & 0x00FF) * (1 - factor));
      const b = Math.floor((num & 0x0000FF) * (1 - factor));
      return `rgb(${r}, ${g}, ${b})`;
    }
    return color;
  }
}