/**
 * Simple Performance Monitor - Track Phase 1 improvements
 */

export class SimplePerformanceMonitor {
  private static instance: SimplePerformanceMonitor;
  private frameCount = 0;
  private lastFrameTime = 0;
  private currentFPS = 60;
  private renderTimes: number[] = [];

  public static getInstance(): SimplePerformanceMonitor {
    if (!SimplePerformanceMonitor.instance) {
      SimplePerformanceMonitor.instance = new SimplePerformanceMonitor();
    }
    return SimplePerformanceMonitor.instance;
  }

  private constructor() {
    this.startMonitoring();
  }

  private startMonitoring(): void {
    const monitor = () => {
      const now = performance.now();
      if (this.lastFrameTime > 0) {
        const delta = now - this.lastFrameTime;
        this.currentFPS = Math.round(1000 / Math.max(delta, 1));
      }
      this.lastFrameTime = now;
      this.frameCount++;
      
      requestAnimationFrame(monitor);
    };
    requestAnimationFrame(monitor);
  }

  public getFPS(): number {
    return this.currentFPS;
  }

  public recordRenderTime(renderTime: number): void {
    this.renderTimes.push(renderTime);
    if (this.renderTimes.length > 100) {
      this.renderTimes.shift();
    }
  }

  public getAverageRenderTime(): number {
    if (this.renderTimes.length === 0) return 0;
    return this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;
  }

  public getPerformanceReport(): {
    fps: number;
    avgRenderTime: number;
    isPerformanceGood: boolean;
  } {
    return {
      fps: this.getFPS(),
      avgRenderTime: this.getAverageRenderTime(),
      isPerformanceGood: this.currentFPS > 45 && this.getAverageRenderTime() < 16,
    };
  }
}

export default SimplePerformanceMonitor;