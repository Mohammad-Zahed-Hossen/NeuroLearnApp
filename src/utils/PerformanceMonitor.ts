/**
 * Simple Performance Monitor - Non-intrusive performance tracking
 */

export interface PerformanceMetrics {
  fps: number;
  loadTime?: number;
  memoryUsage?: {
    used: number;
    total: number;
    percentage: number;
  };
  // optional markers embedded for dashboard convenience
  markers?: Array<{ name?: string; event?: string; payload?: any; ts?: number; timestamp?: number }>;
  lastMarker?: { name?: string; event?: string; payload?: any; ts?: number; timestamp?: number } | null;
  timestamp: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private frameCount = 0;
  private lastFrameTime = 0;
  private currentFPS = 60;
  private loadStartTime?: number;
  private loadEndTime?: number;
  private metricsHistory: PerformanceMetrics[] = [];
  private markerListeners: Set<(marker: any) => void> = new Set();
  private lastFpsSamples: number[] = [];
  private lastFrameDrops = 0;
  // Simple CPU/battery placeholders (platform-specific hooks could replace these)
  private lastCpuUsage = 0;
  private lastBatteryLevel = 1;
  // Optional platform integrations (dynamically required if present)
  private platformBatteryModule: any = null;
  private platformBatteryListenerSubscription: any = null;
  private monitorIntervalId: any = null;
  private monitoringStarted = false;
  private expectedTickMs = 2000; // used for drift-based CPU estimate
  private lastTickTime = 0;
  private tickDriftSamples: number[] = [];

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private constructor() {
    this.startMonitoring();
    // Try to wire platform integrations (battery, device-info) without hard dependency
    // Fire-and-forget: any failure is non-fatal and we keep using placeholders
    this.initPlatformIntegrations();
  }

  // Attempt to dynamically wire native/expo modules to populate battery level and
  // to approximate CPU usage via a lightweight tick-drift sampler. This avoids
  // hard dependencies and will silently noop if modules are not present.
  private async initPlatformIntegrations(): Promise<void> {
    try {
      // Try expo-battery first (common in Expo apps)
      // Use dynamic require to avoid static dependency.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Battery = require('expo-battery');
      if (Battery) {
        this.platformBatteryModule = Battery;
        if (typeof Battery.getBatteryLevelAsync === 'function') {
          try {
            const level = await Battery.getBatteryLevelAsync();
            if (typeof level === 'number') this.lastBatteryLevel = level;
          } catch (e) {}
        }
        // add listener if available
        if (typeof Battery.addBatteryLevelListener === 'function') {
          try {
            this.platformBatteryListenerSubscription = Battery.addBatteryLevelListener((ev: any) => {
              if (ev && typeof ev.batteryLevel === 'number') {
                this.lastBatteryLevel = ev.batteryLevel;
              }
            });
          } catch (e) {}
        }
      }
    } catch (e) {
      // ignore - expo-battery not present
    }

    try {
      // Fallback: try react-native-device-info for battery polling
      // Only attempt to require the module if the native bridge exists. In
      // Expo-managed apps or misconfigured native projects the native module
      // can be null which causes the library's initialization to throw.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { NativeModules } = require('react-native');
      if (NativeModules && (NativeModules as any).RNDeviceInfo) {
        // Native bridge looks present — safely require the JS wrapper.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const DeviceInfo = require('react-native-device-info');
        if (DeviceInfo && typeof DeviceInfo.getBatteryLevel === 'function') {
          try {
            const level = await DeviceInfo.getBatteryLevel();
            if (typeof level === 'number') this.lastBatteryLevel = level;
          } catch (e) {}
        }
      }
    } catch (e) {
      // ignore - device-info not present
    }

    // Start a periodic sampler that measures tick drift. High drift suggests main-thread congestion;
    // we normalize the average drift over the expected tick to get a lightweight cpuUsage estimate in [0,1].
    try {
      this.lastTickTime = performance.now();
      this.monitorIntervalId = setInterval(() => {
        try {
          const now = performance.now();
          const expected = this.expectedTickMs;
          const drift = Math.max(0, now - this.lastTickTime - expected);
          this.tickDriftSamples.push(drift);
          if (this.tickDriftSamples.length > 30) this.tickDriftSamples.shift();
          const avgDrift = this.tickDriftSamples.reduce((s, a) => s + a, 0) / this.tickDriftSamples.length;
          // Normalize: if avgDrift equals expected tick, consider it busy (1.0). Otherwise scale down.
          this.lastCpuUsage = Math.min(1, avgDrift / expected);
          this.lastTickTime = now;

          // If no expo battery module is present, try to poll DeviceInfo battery occasionally
          if (!this.platformBatteryModule) {
            try {
              // Avoid requiring the module unless native bridge exists
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const { NativeModules } = require('react-native');
              if (NativeModules && (NativeModules as any).RNDeviceInfo) {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const DeviceInfo = require('react-native-device-info');
                if (DeviceInfo && typeof DeviceInfo.getBatteryLevel === 'function') {
                  DeviceInfo.getBatteryLevel()
                    .then((lvl: number) => {
                      if (typeof lvl === 'number') this.lastBatteryLevel = lvl;
                    })
                    .catch(() => {});
                }
              }
            } catch (e) {
              // ignore
            }
          }
        } catch (e) {
          // non-fatal
        }
      }, this.expectedTickMs);
    } catch (e) {
      // ignore interval setup errors
    }
  }

  private startMonitoring(): void {
    if (this.monitoringStarted) return;
    this.monitoringStarted = true;
    const monitor = () => {
      const now = performance.now();
      if (this.lastFrameTime > 0) {
        const delta = now - this.lastFrameTime;
        this.currentFPS = 1000 / Math.max(delta, 1);
        // track recent FPS samples for frame-drop estimation
        this.lastFpsSamples.push(this.currentFPS);
        if (this.lastFpsSamples.length > 30) this.lastFpsSamples.shift();
        // estimate frame drops as count of frames below 50fps in recent window
        this.lastFrameDrops = this.lastFpsSamples.filter((f) => f < 50).length;
      }
      this.lastFrameTime = now;
      this.frameCount++;

      requestAnimationFrame(monitor);
    };
    requestAnimationFrame(monitor);
  }

  // Stop any background polling/listeners started by this instance to avoid
  // leaks during HMR, tests, or app shutdown.
  public stopMonitoring(): void {
    try {
      if (this.monitorIntervalId) {
        clearInterval(this.monitorIntervalId);
        this.monitorIntervalId = null;
      }
    } catch (e) {}

    // remove battery listener if available
    try {
      if (this.platformBatteryModule && this.platformBatteryListenerSubscription) {
        if (typeof this.platformBatteryModule.removeBatteryLevelListener === 'function') {
          try {
            this.platformBatteryModule.removeBatteryLevelListener(this.platformBatteryListenerSubscription);
          } catch (e) {}
        }
        // Clear reference
        this.platformBatteryListenerSubscription = null;
      }
    } catch (e) {}

    // Allow restart if needed
    this.monitoringStarted = false;
  }

  // Screen load time tracking
  public startLoadTracking(): void {
    this.loadStartTime = performance.now();
  }

  public endLoadTracking(): void {
    if (this.loadStartTime) {
      this.loadEndTime = performance.now();
    }
  }

  public getLoadTime(): number | undefined {
    if (this.loadStartTime && this.loadEndTime) {
      return this.loadEndTime - this.loadStartTime;
    }
    return undefined;
  }

  // Memory usage monitoring
  public getMemoryUsage(): { used: number; total: number; percentage: number } | undefined {
    // For React Native, memory monitoring is limited
    // This is a basic implementation using JS heap if available
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const mem = (performance as any).memory;
      const used = mem.usedJSHeapSize;
      const total = mem.totalJSHeapSize;
      const percentage = (used / total) * 100;
      return { used, total, percentage };
    }
    return undefined;
  }

  public getFPS(): number {
    return Math.round(this.currentFPS);
  }

  public isPerformanceGood(): boolean {
    // Consider performance good if FPS > 45 and battery above 15%
    return this.currentFPS > 45 && this.lastBatteryLevel > 0.15;
  }

  // Performance metrics dashboard integration
  public collectMetrics(): PerformanceMetrics {
    const loadTime = this.getLoadTime();
    const memoryUsage = this.getMemoryUsage();

    const metrics: PerformanceMetrics = {
      fps: this.getFPS(),
      ...(loadTime !== undefined ? { loadTime } : {}),
      ...(memoryUsage !== undefined ? { memoryUsage } : {}),
      timestamp: Date.now(),
    };

    // Keep last 100 metrics for dashboard
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > 100) {
      this.metricsHistory.shift();
    }

    return metrics;
  }

  public getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metricsHistory];
  }

  public addMarkerListener(cb: (marker: any) => void) {
    this.markerListeners.add(cb);
    return () => this.markerListeners.delete(cb);
  }

  public getAverageMetrics(): {
    avgFps: number;
    avgLoadTime?: number;
    avgMemoryPercentage?: number;
  } {
    if (this.metricsHistory.length === 0) {
      return { avgFps: 0 };
    }

    const totalFps = this.metricsHistory.reduce((sum, m) => sum + m.fps, 0);
    const avgFps = totalFps / this.metricsHistory.length;

    const loadTimes = this.metricsHistory
      .map(m => m.loadTime)
      .filter((lt): lt is number => lt !== undefined);
    const avgLoadTime = loadTimes.length > 0
      ? loadTimes.reduce((sum, lt) => sum + lt, 0) / loadTimes.length
      : undefined;

    const memoryPercentages = this.metricsHistory
      .map(m => m.memoryUsage?.percentage)
      .filter((mp): mp is number => mp !== undefined);
    const avgMemoryPercentage = memoryPercentages.length > 0
      ? memoryPercentages.reduce((sum, mp) => sum + mp, 0) / memoryPercentages.length
      : undefined;

  const result: { avgFps: number; avgLoadTime?: number; avgMemoryPercentage?: number } = { avgFps };
  if (avgLoadTime !== undefined) result.avgLoadTime = avgLoadTime;
  if (avgMemoryPercentage !== undefined) result.avgMemoryPercentage = avgMemoryPercentage;
  return result;
  }

  // Lightweight marker recording for custom events (e.g., morph_start)
  public recordMarker(name: string, payload?: any): void {
    try {
      const metricsSnapshot = {
        fps: this.getFPS(),
        frameDrops: this.lastFrameDrops,
        cpuUsage: this.lastCpuUsage,
        batteryLevel: this.lastBatteryLevel,
        ts: Date.now(),
      };

      const entry = {
        event: name,
        name,
        payload: { ...(payload || {}), metrics: metricsSnapshot },
        timestamp: Date.now(),
      };
      // store small event in metricsHistory as an extra field
      // We keep metricsHistory for dashboard; embed marker into last metrics if present
      if (this.metricsHistory.length > 0) {
        const last = this.metricsHistory[this.metricsHistory.length - 1] as any;
        last.lastMarker = entry;
        last.markers = last.markers || [];
        last.markers.push(entry);
      } else {
        // no metrics yet — create a minimal metrics entry
        this.metricsHistory.push({ fps: this.getFPS(), timestamp: Date.now(), markers: [entry], lastMarker: entry, ...(payload ? { payload } : {}) });
      }
      // notify listeners (non-blocking)
      try {
        this.markerListeners.forEach((l) => {
          try {
            l(entry);
          } catch (e) {}
        });
      } catch (e) {}
    } catch (e) {
      // swallow errors — non-critical
    }
  }
}
export default PerformanceMonitor;
