/**
 * Performance Manager for adaptive quality and heat management
 * Monitors device performance and adjusts game settings accordingly
 */

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage?: number;
  renderTime: number;
  updateTime: number;
}

export interface PerformanceSettings {
  renderDistance: number;
  maxVisibleSnakes: number;
  maxVisibleFoods: number;
  maxVisibleDeadPoints: number;
  updateFrequency: number;
  enableSmoothRendering: boolean;
  enableParticleEffects: boolean;
  qualityLevel: 'low' | 'medium' | 'high';
}

export class PerformanceManager {
  private frameCount = 0;
  private lastFrameTime = 0;
  private frameTimeHistory: number[] = [];
  private renderTimeHistory: number[] = [];
  private updateTimeHistory: number[] = [];
  private currentFPS = 60;
  private targetFPS = 60;
  private performanceLevel: 'low' | 'medium' | 'high' = 'medium';
  private isThrottling = false;
  private throttleStartTime = 0;
  private settings: PerformanceSettings;
  
  constructor(targetFPS: number = 60) {
    this.targetFPS = targetFPS;
    this.settings = this.getDefaultSettings();
    this.detectDeviceCapabilities();
  }
  
  private getDefaultSettings(): PerformanceSettings {
    return {
      renderDistance: 200,
      maxVisibleSnakes: 50,
      maxVisibleFoods: 200,
      maxVisibleDeadPoints: 500,
      updateFrequency: 60,
      enableSmoothRendering: true,
      enableParticleEffects: true,
      qualityLevel: 'medium'
    };
  }
  
  private detectDeviceCapabilities(): void {
    // Detect device type and capabilities
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isLowEndDevice = this.isLowEndDevice();
    
    if (isMobile || isLowEndDevice) {
      this.performanceLevel = 'low';
      this.settings = {
        ...this.settings,
        renderDistance: 150,
        maxVisibleSnakes: 30,
        maxVisibleFoods: 100,
        maxVisibleDeadPoints: 200,
        updateFrequency: 30,
        enableSmoothRendering: false,
        enableParticleEffects: false,
        qualityLevel: 'low'
      };
    } else if (this.isHighEndDevice()) {
      this.performanceLevel = 'high';
      this.settings = {
        ...this.settings,
        renderDistance: 300,
        maxVisibleSnakes: 100,
        maxVisibleFoods: 500,
        maxVisibleDeadPoints: 1000,
        updateFrequency: 60,
        enableSmoothRendering: true,
        enableParticleEffects: true,
        qualityLevel: 'high'
      };
    }
    
    console.log(`🎮 Performance Manager: Detected ${this.performanceLevel} performance device`);
  }
  
  private isLowEndDevice(): boolean {
    // Check for low-end device indicators
    const memory = (navigator as any).deviceMemory;
    const cores = navigator.hardwareConcurrency;
    
    return (
      (memory && memory < 4) || // Less than 4GB RAM
      (cores && cores < 4) || // Less than 4 CPU cores
      /Android.*Chrome\/[1-6][0-9]/.test(navigator.userAgent) // Old Chrome on Android
    );
  }
  
  private isHighEndDevice(): boolean {
    const memory = (navigator as any).deviceMemory;
    const cores = navigator.hardwareConcurrency;
    
    return (
      (memory && memory >= 8) || // 8GB+ RAM
      (cores && cores >= 8) // 8+ CPU cores
    );
  }
  
  /**
   * Update performance metrics
   */
  updateMetrics(renderTime: number, updateTime: number): void {
    const now = performance.now();
    
    if (this.lastFrameTime > 0) {
      const frameTime = now - this.lastFrameTime;
      this.frameTimeHistory.push(frameTime);
      
      // Keep only last 60 frames for rolling average
      if (this.frameTimeHistory.length > 60) {
        this.frameTimeHistory.shift();
      }
      
      // Calculate current FPS
      const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
      this.currentFPS = 1000 / avgFrameTime;
    }
    
    this.lastFrameTime = now;
    this.frameCount++;
    
    // Track render and update times
    this.renderTimeHistory.push(renderTime);
    this.updateTimeHistory.push(updateTime);
    
    if (this.renderTimeHistory.length > 30) {
      this.renderTimeHistory.shift();
    }
    if (this.updateTimeHistory.length > 30) {
      this.updateTimeHistory.shift();
    }
    
    // Check if we need to adjust performance
    this.checkPerformanceThrottling();
  }
  
  private checkPerformanceThrottling(): void {
    const fpsThreshold = this.targetFPS * 0.8; // 80% of target FPS
    const avgRenderTime = this.renderTimeHistory.reduce((a, b) => a + b, 0) / this.renderTimeHistory.length;
    
    // Start throttling if FPS drops below threshold or render time is too high
    if (this.currentFPS < fpsThreshold || avgRenderTime > 16.67) { // 16.67ms = 60fps
      if (!this.isThrottling) {
        this.startPerformanceThrottling();
      }
    } else if (this.isThrottling) {
      // Check if we can restore performance after 5 seconds of good performance
      if (now - this.throttleStartTime > 5000) {
        this.stopPerformanceThrottling();
      }
    }
  }
  
  private startPerformanceThrottling(): void {
    console.log(`⚡ Performance Manager: Starting throttling (FPS: ${this.currentFPS.toFixed(1)})`);
    this.isThrottling = true;
    this.throttleStartTime = performance.now();
    
    // Reduce quality settings
    this.settings = {
      ...this.settings,
      renderDistance: Math.max(100, this.settings.renderDistance * 0.8),
      maxVisibleSnakes: Math.max(20, Math.floor(this.settings.maxVisibleSnakes * 0.7)),
      maxVisibleFoods: Math.max(50, Math.floor(this.settings.maxVisibleFoods * 0.7)),
      maxVisibleDeadPoints: Math.max(100, Math.floor(this.settings.maxVisibleDeadPoints * 0.5)),
      enableSmoothRendering: false,
      enableParticleEffects: false
    };
  }
  
  private stopPerformanceThrottling(): void {
    console.log(`✅ Performance Manager: Stopping throttling (FPS: ${this.currentFPS.toFixed(1)})`);
    this.isThrottling = false;
    
    // Gradually restore quality settings
    this.settings = {
      ...this.settings,
      renderDistance: Math.min(300, this.settings.renderDistance * 1.2),
      maxVisibleSnakes: Math.min(100, Math.floor(this.settings.maxVisibleSnakes * 1.3)),
      maxVisibleFoods: Math.min(500, Math.floor(this.settings.maxVisibleFoods * 1.3)),
      maxVisibleDeadPoints: Math.min(1000, Math.floor(this.settings.maxVisibleDeadPoints * 1.5)),
      enableSmoothRendering: this.performanceLevel !== 'low',
      enableParticleEffects: this.performanceLevel === 'high'
    };
  }
  
  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const avgRenderTime = this.renderTimeHistory.length > 0 
      ? this.renderTimeHistory.reduce((a, b) => a + b, 0) / this.renderTimeHistory.length 
      : 0;
    const avgUpdateTime = this.updateTimeHistory.length > 0
      ? this.updateTimeHistory.reduce((a, b) => a + b, 0) / this.updateTimeHistory.length
      : 0;
    const avgFrameTime = this.frameTimeHistory.length > 0
      ? this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length
      : 16.67;
    
    return {
      fps: this.currentFPS,
      frameTime: avgFrameTime,
      memoryUsage: (performance as any).memory?.usedJSHeapSize,
      renderTime: avgRenderTime,
      updateTime: avgUpdateTime
    };
  }
  
  /**
   * Get current performance settings
   */
  getSettings(): PerformanceSettings {
    return { ...this.settings };
  }
  
  /**
   * Manually adjust quality level
   */
  setQualityLevel(level: 'low' | 'medium' | 'high'): void {
    this.performanceLevel = level;
    
    const qualitySettings = {
      low: {
        renderDistance: 100,
        maxVisibleSnakes: 20,
        maxVisibleFoods: 50,
        maxVisibleDeadPoints: 100,
        updateFrequency: 30,
        enableSmoothRendering: false,
        enableParticleEffects: false
      },
      medium: {
        renderDistance: 200,
        maxVisibleSnakes: 50,
        maxVisibleFoods: 200,
        maxVisibleDeadPoints: 500,
        updateFrequency: 60,
        enableSmoothRendering: true,
        enableParticleEffects: false
      },
      high: {
        renderDistance: 300,
        maxVisibleSnakes: 100,
        maxVisibleFoods: 500,
        maxVisibleDeadPoints: 1000,
        updateFrequency: 60,
        enableSmoothRendering: true,
        enableParticleEffects: true
      }
    };
    
    this.settings = {
      ...this.settings,
      ...qualitySettings[level],
      qualityLevel: level
    };
    
    console.log(`🎮 Performance Manager: Quality set to ${level}`);
  }
  
  /**
   * Check if device is overheating (mobile-specific)
   */
  isDeviceOverheating(): boolean {
    // This is a simplified check - in a real app you might use device APIs
    return this.isThrottling && this.currentFPS < this.targetFPS * 0.5;
  }
  
  /**
   * Get performance status for UI display
   */
  getPerformanceStatus(): {
    level: string;
    fps: number;
    isThrottling: boolean;
    isOverheating: boolean;
  } {
    return {
      level: this.performanceLevel,
      fps: Math.round(this.currentFPS),
      isThrottling: this.isThrottling,
      isOverheating: this.isDeviceOverheating()
    };
  }
}

// Global performance manager instance
export const performanceManager = new PerformanceManager();