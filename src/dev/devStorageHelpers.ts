import HybridStorageService from '../services/storage/HybridStorageService';
import syncQueue from '../services/storage/syncQueue';

// Performance Benchmarking Tools
export class PerformanceBenchmarker {
  private static instance: PerformanceBenchmarker;
  private benchmarks: Map<string, { start: number; end?: number; duration?: number }> = new Map();

  static getInstance(): PerformanceBenchmarker {
    if (!PerformanceBenchmarker.instance) {
      PerformanceBenchmarker.instance = new PerformanceBenchmarker();
    }
    return PerformanceBenchmarker.instance;
  }

  startBenchmark(name: string): void {
    this.benchmarks.set(name, { start: performance.now() });
    console.log(`[Benchmark] Started: ${name}`);
  }

  endBenchmark(name: string): number | null {
    const benchmark = this.benchmarks.get(name);
    if (!benchmark) {
      console.warn(`[Benchmark] No start time found for: ${name}`);
      return null;
    }
    benchmark.end = performance.now();
    benchmark.duration = benchmark.end - benchmark.start;
    console.log(`[Benchmark] Ended: ${name} - Duration: ${benchmark.duration.toFixed(2)}ms`);
    return benchmark.duration;
  }

  getBenchmarkResults(): Record<string, number> {
    const results: Record<string, number> = {};
    this.benchmarks.forEach((bench, name) => {
      if (bench.duration !== undefined) {
        results[name] = bench.duration;
      }
    });
    return results;
  }

  clearBenchmarks(): void {
    this.benchmarks.clear();
  }
}

// Memory Leak Detection
export class MemoryLeakDetector {
  private static instance: MemoryLeakDetector;
  private trackedObjects: Map<string, WeakRef<object>> = new Map();
  private finalizationRegistry: FinalizationRegistry<string>;

  private constructor() {
    this.finalizationRegistry = new FinalizationRegistry((heldValue: string) => {
      console.warn(`[MemoryLeak] Object potentially leaked: ${heldValue}`);
    });
  }

  static getInstance(): MemoryLeakDetector {
    if (!MemoryLeakDetector.instance) {
      MemoryLeakDetector.instance = new MemoryLeakDetector();
    }
    return MemoryLeakDetector.instance;
  }

  trackObject(id: string, obj: object): void {
    const weakRef = new WeakRef(obj);
    this.trackedObjects.set(id, weakRef);
    this.finalizationRegistry.register(obj, id, obj);
    console.log(`[MemoryLeak] Tracking object: ${id}`);
  }

  untrackObject(id: string): void {
    const weakRef = this.trackedObjects.get(id);
    if (weakRef) {
      const obj = weakRef.deref();
      if (obj) {
        this.finalizationRegistry.unregister(obj);
      }
      this.trackedObjects.delete(id);
      console.log(`[MemoryLeak] Untracked object: ${id}`);
    }
  }

  checkTrackedObjects(): void {
    const alive: string[] = [];
    const dead: string[] = [];

    this.trackedObjects.forEach((weakRef, id) => {
      if (weakRef.deref()) {
        alive.push(id);
      } else {
        dead.push(id);
      }
    });

    console.log(`[MemoryLeak] Check - Alive: ${alive.length}, Dead: ${dead.length}`);
    if (alive.length > 0) {
      console.log(`[MemoryLeak] Alive objects: ${alive.join(', ')}`);
    }
  }
}

// Performance Profiling Utilities
export class PerformanceProfiler {
  private static instance: PerformanceProfiler;
  private metrics: Map<string, { count: number; totalTime: number; avgTime: number; maxTime: number; minTime: number }> = new Map();
  private memorySnapshots: Array<{ timestamp: number; usedJSHeapSize?: number; totalJSHeapSize?: number }> = [];

  private constructor() {
    this.startPeriodicMemoryCheck();
  }

  static getInstance(): PerformanceProfiler {
    if (!PerformanceProfiler.instance) {
      PerformanceProfiler.instance = new PerformanceProfiler();
    }
    return PerformanceProfiler.instance;
  }

  profileFunction<T extends (...args: any[]) => any>(name: string, fn: T): T {
    const wrapped = (...args: Parameters<T>): ReturnType<T> => {
      const start = performance.now();
      try {
        const result = fn(...args);
        const end = performance.now();
        this.recordMetric(name, end - start);
        return result;
      } catch (error) {
        const end = performance.now();
        this.recordMetric(name, end - start);
        throw error;
      }
    };
    return wrapped as T;
  }

  private recordMetric(name: string, duration: number): void {
    const existing = this.metrics.get(name);
    if (existing) {
      existing.count++;
      existing.totalTime += duration;
      existing.avgTime = existing.totalTime / existing.count;
      existing.maxTime = Math.max(existing.maxTime, duration);
      existing.minTime = Math.min(existing.minTime, duration);
    } else {
      this.metrics.set(name, {
        count: 1,
        totalTime: duration,
        avgTime: duration,
        maxTime: duration,
        minTime: duration,
      });
    }
  }

  takeMemorySnapshot(): void {
    const memInfo = (performance as any).memory;
    if (memInfo) {
      this.memorySnapshots.push({
        timestamp: Date.now(),
        usedJSHeapSize: memInfo.usedJSHeapSize,
        totalJSHeapSize: memInfo.totalJSHeapSize,
      });
      console.log(`[Profiler] Memory snapshot taken - Used: ${(memInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
    } else {
      console.warn('[Profiler] Memory info not available');
    }
  }

  private startPeriodicMemoryCheck(): void {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      setInterval(() => {
        this.takeMemorySnapshot();
      }, 30000); // Every 30 seconds
    }
  }

  getMetricsReport(): Record<string, any> {
    const report: Record<string, any> = {};
    this.metrics.forEach((metric, name) => {
      report[name] = { ...metric };
    });
    report.memorySnapshots = this.memorySnapshots.slice(-10); // Last 10 snapshots
    return report;
  }

  clearMetrics(): void {
    this.metrics.clear();
    this.memorySnapshots = [];
  }
}

export async function performCleanup() {
  try {
    const hs: any = HybridStorageService;
    return await hs.performStorageCleanup();
  } catch (e) {
    console.error('performCleanup failed', e);
    throw e;
  }
}

export async function clearLegacyQueue() {
  try {
    await syncQueue.clearLegacyQueue();
  } catch (e) {
    console.error('clearLegacyQueue failed', e);
    throw e;
  }
}

if (typeof __DEV__ !== 'undefined' && __DEV__) {
  // expose for debug console in dev
  try {
    (global as any).performStorageCleanup = performCleanup;
    (global as any).clearLegacyQueue = clearLegacyQueue;

    // Expose new performance utilities
    (global as any).PerformanceBenchmarker = PerformanceBenchmarker.getInstance();
    (global as any).MemoryLeakDetector = MemoryLeakDetector.getInstance();
    (global as any).PerformanceProfiler = PerformanceProfiler.getInstance();
  } catch (e) {}
}
