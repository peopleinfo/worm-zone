export interface ScoreAnimationData {
  id: string;
  x: number;
  y: number;
  points: number;
  startTime: number;
  duration: number;
  opacity: number;
  offsetY: number;
}

export class ScoreAnimation {
  private animations: ScoreAnimationData[] = [];
  private readonly ANIMATION_DURATION = 1200; // 1.2s - Enhanced duration per PRD
  private readonly FLOAT_DISTANCE = 18; // pixels to float up
  private readonly FADE_START = 0.5; // Start fading at 50% of animation - Enhanced per PRD

  // Add a new score animation
  addAnimation(x: number, y: number, points: number): void {
    const animation: ScoreAnimationData = {
      id: `score_${Date.now()}_${Math.random()}`,
      x,
      y,
      points,
      startTime: Date.now(),
      duration: this.ANIMATION_DURATION,
      opacity: 1,
      offsetY: 0
    };
    
    this.animations.push(animation);
    
    // Limit the number of active animations for performance
    if (this.animations.length > 10) {
      this.animations.shift();
    }
  }

  // Update all active animations
  update(): void {
    const now = Date.now();
    
    // Update each animation
    for (let i = this.animations.length - 1; i >= 0; i--) {
      const animation = this.animations[i];
      const elapsed = now - animation.startTime;
      const progress = Math.min(elapsed / animation.duration, 1);
      
      // Enhanced cubic-bezier easing function (0.25, 0.46, 0.45, 0.94) per PRD
      const t = progress;
      const cubicBezier = 3 * (1 - t) * (1 - t) * t * 0.25 + 3 * (1 - t) * t * t * 0.46 + t * t * t * 0.94;
      animation.offsetY = -this.FLOAT_DISTANCE * cubicBezier;
      
      // Enhanced smoother opacity transition starting at 50% per PRD
      if (progress >= this.FADE_START) {
        const fadeProgress = (progress - this.FADE_START) / (1 - this.FADE_START);
        // Smoother fade-out with cubic easing
        animation.opacity = 1 - (fadeProgress * fadeProgress * (3 - 2 * fadeProgress));
      }
      
      // Remove completed animations
      if (progress >= 1) {
        this.animations.splice(i, 1);
      }
    }
  }

  // Render all active animations
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    
    for (const animation of this.animations) {
      ctx.globalAlpha = animation.opacity;
      
      // Enhanced text properties with better visibility
      ctx.font = 'bold 4px Baloo-Regular';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Enhanced text shadow with increased width for better visibility per PRD
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 1.5; // Increased stroke width
      ctx.strokeText(
        `+${animation.points}`,
        animation.x,
        animation.y + animation.offsetY
      );
      
      // Enhanced colors per PRD: bright yellow for +1, gold for +2
      if (animation.points === 1) {
        ctx.fillStyle = '#FFD60A'; // Bright yellow for 1 point per PRD
      } else {
        ctx.fillStyle = '#FF9F0A'; // Gold for 2+ points per PRD
      }
      
      ctx.fillText(
        `+${animation.points}`,
        animation.x,
        animation.y + animation.offsetY
      );
    }
    
    ctx.restore();
  }

  // Clear all animations
  clear(): void {
    this.animations = [];
  }

  // Get the number of active animations
  getActiveCount(): number {
    return this.animations.length;
  }
}