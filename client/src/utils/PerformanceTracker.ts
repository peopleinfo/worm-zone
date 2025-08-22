export interface PerformanceStats {
  fps: number;
  memoryUsage: number;
  renderTime: number;
  objectCount: {
    foods: number;
    deadPoints: number;
    snakes: number;
  };
}

export class PerformanceTracker {
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 60;
  private renderStartTime = 0;
  private renderTime = 0;
  private fpsHistory: number[] = [];
  private readonly maxHistorySize = 60; // Keep 1 second of history at 60fps

  startFrame(): void {
    this.renderStartTime = performance.now();
  }

  endFrame(): void {
    const now = performance.now();
    this.renderTime = now - this.renderStartTime;
    this.frameCount++;

    // Calculate FPS every second
    if (now - this.lastTime >= 1000) {
      const currentFps = (this.frameCount * 1000) / (now - this.lastTime);
      this.fpsHistory.push(currentFps);
      
      // Keep history size manageable
      if (this.fpsHistory.length > this.maxHistorySize) {
        this.fpsHistory.shift();
      }
      
      // Calculate smoothed FPS
      this.fps = this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
      
      this.frameCount = 0;
      this.lastTime = now;
    }
  }

  getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
    }
    return 0;
  }

  getStats(objectCount: { foods: number; deadPoints: number; snakes: number }): PerformanceStats {
    return {
      fps: this.fps,
      memoryUsage: this.getMemoryUsage(),
      renderTime: this.renderTime,
      objectCount
    };
  }

  shouldThrottleFrame(): boolean {
    // Throttle if FPS is consistently low
    const recentFps = this.fpsHistory.slice(-10); // Last 10 samples
    if (recentFps.length >= 5) {
      const avgRecentFps = recentFps.reduce((sum, fps) => sum + fps, 0) / recentFps.length;
      return avgRecentFps < 20; // Throttle if below 20 FPS
    }
    return false;
  }

  isOverheating(): boolean {
    // Check if performance is degrading significantly
    const memoryUsage = this.getMemoryUsage();
    const lowFps = this.fps < 15;
    const highMemory = memoryUsage > 150; // 150MB threshold
    const slowRender = this.renderTime > 50; // 50ms render time
    
    return lowFps && (highMemory || slowRender);
  }

  reset(): void {
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fps = 60;
    this.fpsHistory = [];
  }
}