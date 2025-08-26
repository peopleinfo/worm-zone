// Performance utilities for mobile optimization
import { TARGET_FPS, FORCE_FPS_LIMIT, ENABLE_SHADOWS } from '../config/gameConfig';

export interface DevicePerformance {
  tier: 'low' | 'medium' | 'high';
  isMobile: boolean;
  targetFPS: number;
  canvasScale: number;
  enableShadows: boolean;
  maxDeadPoints: number;
  batteryLevel?: number;
  isCharging?: boolean;
  thermalState: 'normal' | 'warm' | 'hot' | 'critical';
}

export class PerformanceManager {
  private static instance: PerformanceManager;
  private devicePerformance: DevicePerformance;
  private frameTimeHistory: number[] = [];
  private lastFrameTime: number = 0;
  private thermalThrottleDetected: boolean = false;
  private batteryMonitorInterval?: number;
  private thermalCheckInterval?: number;

  private constructor() {
    this.devicePerformance = this.detectDevicePerformance();
    this.startBatteryMonitoring();
    this.startThermalMonitoring();
  }

  static getInstance(): PerformanceManager {
    if (!PerformanceManager.instance) {
      PerformanceManager.instance = new PerformanceManager();
    }
    return PerformanceManager.instance;
  }

  private detectDevicePerformance(): DevicePerformance {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);

    // Get device memory if available (Chrome only)
    const deviceMemory = (navigator as any).deviceMemory || 4;

    // Get hardware concurrency (number of CPU cores)
    const cores = navigator.hardwareConcurrency || 4;

    // Detect device tier based on available information
    let tier: 'low' | 'medium' | 'high' = 'medium';

    if (isMobile) {
      // Mobile device detection
      if (deviceMemory <= 2 || cores <= 4) {
        tier = 'low';
      } else if (deviceMemory <= 4 || cores <= 6) {
        tier = 'medium';
      } else {
        tier = 'high';
      }

      // iOS devices tend to have better performance optimization
      if (/iphone|ipad|ipod/.test(userAgent)) {
        if (tier === 'low') tier = 'medium';
      }
    } else {
      // Desktop - generally higher performance
      tier = 'high';
    }

    return {
      tier,
      isMobile,
      targetFPS: this.getTargetFPS(tier, isMobile),
      canvasScale: this.getCanvasScale(tier),
      enableShadows: ENABLE_SHADOWS,
      maxDeadPoints: this.getMaxDeadPoints(tier),
      batteryLevel: undefined,
      isCharging: undefined,
      thermalState: 'normal'
    };
  }

  private getTargetFPS(tier: 'low' | 'medium' | 'high', isMobile: boolean): number {
    // Use forced FPS if enabled in config
    if (FORCE_FPS_LIMIT) {
      return TARGET_FPS;
    }
    
    if (isMobile) {
      switch (tier) {
        case 'low': return 25;
        case 'medium': return 28;
        case 'high': return 30;
      }
    }
    console.log("tier", tier);

    return 30; // Desktop
  }

  private getCanvasScale(tier: 'low' | 'medium' | 'high'): number {
    switch (tier) {
      case 'low': return 0.75;
      case 'medium': return 0.85;
      case 'high': return 1.0;
    }
  }

  private getMaxDeadPoints(tier: 'low' | 'medium' | 'high'): number {
    switch (tier) {
      case 'low': return 200;
      case 'medium': return 300;
      case 'high': return 350;
    }
  }

  getDevicePerformance(): DevicePerformance {
    return this.devicePerformance;
  }

  getFrameInterval(): number {
    return 1000 / this.devicePerformance.targetFPS;
  }

  // Adaptive frame rate based on performance
  updateFrameTime(frameTime: number): void {
    this.frameTimeHistory.push(frameTime);

    // Keep only last 60 frame times (3-4 seconds at 15-20 FPS)
    if (this.frameTimeHistory.length > 60) {
      this.frameTimeHistory.shift();
    }

    // Check for thermal throttling
    if (this.frameTimeHistory.length >= 30) {
      const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
      const targetFrameTime = this.getFrameInterval();

      // If average frame time is significantly higher than target, reduce FPS
      // Only apply thermal throttling if FPS is not forced
      if (avgFrameTime > targetFrameTime * 1.5 && !this.thermalThrottleDetected && !FORCE_FPS_LIMIT) {
        console.log('🔥 Thermal throttling detected, reducing performance');
        this.thermalThrottleDetected = true;
        this.devicePerformance.targetFPS = Math.max(10, this.devicePerformance.targetFPS - 2);
        this.devicePerformance.enableShadows = ENABLE_SHADOWS;
        this.devicePerformance.canvasScale = Math.max(0.5, this.devicePerformance.canvasScale - 0.1);
      }
    }
  }

  // Reset performance settings
  resetPerformance(): void {
    this.thermalThrottleDetected = false;
    this.frameTimeHistory = [];
    this.devicePerformance = this.detectDevicePerformance();
  }

  // Check if we should skip this frame for performance
  shouldSkipFrame(currentTime: number): boolean {
    const frameInterval = this.getFrameInterval();
    const elapsed = currentTime - this.lastFrameTime;

    if (elapsed >= frameInterval) {
      this.lastFrameTime = currentTime - (elapsed % frameInterval);
      return false;
    }
    return true;
  }

  // Start battery monitoring for mobile devices
  private startBatteryMonitoring(): void {
    if (!this.devicePerformance.isMobile) return;

    // Check if Battery API is available
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        this.updateBatteryInfo(battery);

        // Listen for battery events
        battery.addEventListener('levelchange', () => this.updateBatteryInfo(battery));
        battery.addEventListener('chargingchange', () => this.updateBatteryInfo(battery));
      }).catch(() => {
        console.log('Battery API not supported');
      });
    }
  }

  // Update battery information and adjust performance accordingly
  private updateBatteryInfo(battery: any): void {
    this.devicePerformance.batteryLevel = Math.round(battery.level * 100);
    this.devicePerformance.isCharging = battery.charging;

    // Reduce performance when battery is low and not charging
    // Only reduce FPS if it's not forced
    if (this.devicePerformance.batteryLevel! < 20 && !this.devicePerformance.isCharging) {
      console.log('🔋 Low battery detected, reducing performance');
      if (!FORCE_FPS_LIMIT) {
        this.devicePerformance.targetFPS = Math.max(10, this.devicePerformance.targetFPS - 2);
      }
      this.devicePerformance.canvasScale = Math.max(0.6, this.devicePerformance.canvasScale - 0.1);
    }
  }

  // Start thermal monitoring
  private startThermalMonitoring(): void {
    if (!this.devicePerformance.isMobile) return;

    this.thermalCheckInterval = window.setInterval(() => {
      this.checkThermalState();
    }, 5000); // Check every 5 seconds
  }

  // Enhanced thermal state detection
  private checkThermalState(): void {
    if (this.frameTimeHistory.length < 10) return;

    const recentFrameTimes = this.frameTimeHistory.slice(-10);
    const avgRecentFrameTime = recentFrameTimes.reduce((a, b) => a + b, 0) / recentFrameTimes.length;
    const targetFrameTime = this.getFrameInterval();

    // Determine thermal state based on frame performance
    if (avgRecentFrameTime > targetFrameTime * 2.5) {
      this.devicePerformance.thermalState = 'critical';
      this.applyThermalThrottling('critical');
    } else if (avgRecentFrameTime > targetFrameTime * 2.0) {
      this.devicePerformance.thermalState = 'hot';
      this.applyThermalThrottling('hot');
    } else if (avgRecentFrameTime > targetFrameTime * 1.5) {
      this.devicePerformance.thermalState = 'warm';
      this.applyThermalThrottling('warm');
    } else {
      this.devicePerformance.thermalState = 'normal';
    }
  }

  // Apply thermal throttling based on thermal state
  private applyThermalThrottling(state: 'warm' | 'hot' | 'critical'): void {
    // Don't modify FPS if it's forced, but still apply other optimizations
    switch (state) {
      case 'warm':
        if (!this.thermalThrottleDetected) {
          console.log('🌡️ Device warming up, applying light throttling');
          if (!FORCE_FPS_LIMIT) {
            this.devicePerformance.targetFPS = Math.max(12, this.devicePerformance.targetFPS - 1);
          }
          this.thermalThrottleDetected = true;
        }
        break;
      case 'hot':
        console.log('🔥 Device getting hot, applying moderate throttling');
        if (!FORCE_FPS_LIMIT) {
          this.devicePerformance.targetFPS = Math.max(10, this.devicePerformance.targetFPS - 2);
        }
        this.devicePerformance.canvasScale = Math.max(0.6, this.devicePerformance.canvasScale - 0.1);
        this.devicePerformance.enableShadows = ENABLE_SHADOWS;
        break;
      case 'critical':
        console.log('🚨 Critical thermal state, applying aggressive throttling');
        if (!FORCE_FPS_LIMIT) {
          this.devicePerformance.targetFPS = 8;
        }
        this.devicePerformance.canvasScale = 0.5;
        this.devicePerformance.enableShadows = ENABLE_SHADOWS;
        this.devicePerformance.maxDeadPoints = Math.min(50, this.devicePerformance.maxDeadPoints);
        break;
    }
  }

  // Clean up intervals
  destroy(): void {
    if (this.batteryMonitorInterval) {
      clearInterval(this.batteryMonitorInterval);
    }
    if (this.thermalCheckInterval) {
      clearInterval(this.thermalCheckInterval);
    }
  }
}

// Export singleton instance
export const performanceManager = PerformanceManager.getInstance();