/**
 * Simple Performance Monitor - Non-intrusive performance tracking
 */

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private frameCount = 0;
  private lastFrameTime = 0;
  private currentFPS = 60;

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private constructor() {
    this.startMonitoring();
  }

  private startMonitoring(): void {
    const monitor = () => {
      const now = performance.now();
      if (this.lastFrameTime > 0) {
        const delta = now - this.lastFrameTime;
        this.currentFPS = 1000 / Math.max(delta, 1);
      }
      this.lastFrameTime = now;
      this.frameCount++;
      
      requestAnimationFrame(monitor);
    };
    requestAnimationFrame(monitor);
  }

  public getFPS(): number {
    return Math.round(this.currentFPS);
  }

  public isPerformanceGood(): boolean {
    return this.currentFPS > 45;
  }
}

export default PerformanceMonitor;