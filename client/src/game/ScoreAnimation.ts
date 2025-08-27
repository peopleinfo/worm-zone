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
  private readonly ANIMATION_DURATION = 800; // 0.8s
  private readonly FLOAT_DISTANCE = 18; // pixels to float up
  private readonly FADE_START = 0.6; // Start fading at 70% of animation

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
      
      // Easing function for smooth upward movement
      const easeOut = 1 - Math.pow(1 - progress, 3);
      animation.offsetY = -this.FLOAT_DISTANCE * easeOut;
      
      // Fade out in the last 30% of the animation
      if (progress >= this.FADE_START) {
        const fadeProgress = (progress - this.FADE_START) / (1 - this.FADE_START);
        animation.opacity = 1 - fadeProgress;
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
      
      // Set text properties
      ctx.font = 'bold 4px Baloo-Regular';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Draw text shadow for better visibility
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillText(
        `+${animation.points}`,
        animation.x + 1.3,
        animation.y + animation.offsetY + 1.3
      );
      
      // Draw main text with color based on points
      if (animation.points === 1) {
        ctx.fillStyle = '#ffffff'; // white for 1 point
      } else {
        ctx.fillStyle = '#FF9800'; // Orange for 2 points
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