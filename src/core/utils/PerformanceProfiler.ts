/**
 * Enhanced PerformanceProfiler - Production-Ready Performance Monitoring
 *
 * Comprehensive performance monitoring with metrics collection,
 * bottleneck detection, and optimization recommendations.
 */

import { Logger } from './Logger';

// Augment global Performance interface to include memory for environments that provide it
declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
    };
  }

}


export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  context: string;
  tags?: Record<string, string>;
}

export interface PerformanceBenchmark {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryStart?: number;
  memoryEnd?: number;
  memoryDelta?: number;
  context: string;
  metadata?: any;
}

export interface PerformanceReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalOperations: number;
    averageResponseTime: number;
    memoryUsage: {
      average: number;
      peak: number;
      current: number;
    };
    bottlenecks: BottleneckReport[];
    recommendations: string[];
  };
  metrics: PerformanceMetric[];
}

export interface BottleneckReport {
  component: string;
  operation: string;
  averageDuration: number;
  frequency: number;
  impact: 'low' | 'medium' | 'high';
  recommendation: string;
}

/**
 * Enhanced Performance Profiler
 *
 * Provides comprehensive performance monitoring with real-time metrics,
 * bottleneck detection, and optimization recommendations.
 */
export class PerformanceProfiler {
  private static instance: PerformanceProfiler;
  private logger: Logger;

  // Simple metrics object from merge
  private basicMetrics = {
    fps: 60,
    jsThreadTime: 16,
    memoryUsage: 0,
    cpuUsage: 0,
    networkLatency: 0,
  };

  // Performance Data
  private metrics: PerformanceMetric[] = [];
  private activeBenchmarks: Map<string, PerformanceBenchmark> = new Map();
  private completedBenchmarks: PerformanceBenchmark[] = [];

  // Configuration
  private maxMetrics = 10000;
  private maxBenchmarks = 1000;
  private isEnabled = true;
  private enabled: boolean = true; // From simple code

  // Performance Thresholds
  private thresholds = {
    slowOperation: 1000, // ms
    memoryLeak: 50, // MB increase
    highFrequency: 100, // operations per minute
    criticalMemory: 100 // MB
  };

  private constructor() {
    this.logger = new Logger('PerformanceProfiler');
    this.enabled = true; // Default enabled
  }

  /**
   * Backwards-compatible API: startOperation (from simple code)
   */
  public startOperation(id: string, name: string): void {
    if (!this.enabled) return;
    this.activeBenchmarks.set(id, { 
      name, 
      startTime: performance.now(), 
      context: 'operation',
      memoryStart: this.getCurrentMemoryUsage()
    } as PerformanceBenchmark);
  }

  /**
   * Backwards-compatible API: completeOperation (from simple code)
   */
  public completeOperation(id: string): number {
    if (!this.enabled) return 0;
    const benchmark = this.activeBenchmarks.get(id);
    if (!benchmark) return 0;
    
    const duration = performance.now() - benchmark.startTime;
    benchmark.endTime = performance.now();
    benchmark.duration = duration;
    benchmark.memoryEnd = this.getCurrentMemoryUsage();
    benchmark.memoryDelta = benchmark.memoryEnd - (benchmark.memoryStart || 0);
    
    this.activeBenchmarks.delete(id);
    this.completedBenchmarks.push(benchmark);
    
    this.recordMetric('operation_duration', duration, 'ms', 'operation', { operation: benchmark.name });
    
    return duration;
  }

  /**
   * Backwards-compatible API: getMemoryUsage (from simple code)
   */
  public getMemoryUsage(): number {
    return this.getCurrentMemoryUsage();
  }

  public getFPS(): number {
    return this.basicMetrics.fps;
  }

  public getJSThreadTime(): number {
    return this.basicMetrics.jsThreadTime;
  }

  public getCPUUsage(): number {
    return this.basicMetrics.cpuUsage;
  }

  public getNetworkLatency(): number {
    return this.basicMetrics.networkLatency;
  }

  public getCurrentMemoryUsage(): number {
    try {
      if (typeof performance !== 'undefined' && performance.memory) {
        return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024); // MB
      }
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Backwards-compatible API: startMonitoring (enhanced with simple code features)
   */
  public startMonitoring(): void {
    if (!this.enabled) return;

    // Existing monitoring
    this.startMemoryMonitoring();
    this.setupPerformanceObserver();

    // FPS monitoring from simple code
    let lastFrameTime = Date.now();
    let frameCount = 0;
    
    const measureFPS = () => {
      const now = Date.now();
      frameCount++;
      
      if (now - lastFrameTime >= 1000) {
        this.basicMetrics.fps = Math.round((frameCount * 1000) / (now - lastFrameTime));
        frameCount = 0;
        lastFrameTime = now;

        // Record as metric
        this.recordMetric('fps', this.basicMetrics.fps, 'fps', 'rendering');
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(measureFPS);
    }

    // Periodic monitoring for memory, JS thread time, etc. from simple code
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        this.basicMetrics.memoryUsage = this.getCurrentMemoryUsage();
        this.basicMetrics.jsThreadTime = this.measureJSThreadTime();

        // Record metrics
        this.recordMetric('memory_usage', this.basicMetrics.memoryUsage, 'MB', 'system');
        this.recordMetric('js_thread_time', this.basicMetrics.jsThreadTime, 'ms', 'system');
      }, 1000);
    }
  }

  private measureJSThreadTime(): number {
    const start = performance.now();
    // Simulate some work to measure JS thread responsiveness
    for (let i = 0; i < 1000; i++) {
      Math.random();
    }
    return performance.now() - start;
  }

  /**
   * Backwards-compatible API: stopMonitoring
   */
  public stopMonitoring(): void {
    // No-op for now; intervals will continue in this simplified compatibility layer
    this.setEnabled(false);
  }

  public static getInstance(): PerformanceProfiler {
    if (!PerformanceProfiler.instance) {
      PerformanceProfiler.instance = new PerformanceProfiler();
    }
    return PerformanceProfiler.instance;
  }

  /**
   * Initialize the performance profiler (from simple code, async)
   */
  public async initialize(): Promise<void> {
    // From simple code: Initialize performance monitoring
    if (this.enabled) {
      this.startMonitoring();
    }

    try {
      this.logger.info('Initializing Performance Profiler...');

      // Setup performance monitoring
      this.setupPerformanceObserver();

      // Start memory monitoring
      this.startMemoryMonitoring();

      // Setup periodic cleanup
      this.setupCleanup();

      this.logger.info('Performance Profiler initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize Performance Profiler', error);
      throw error;
    }
  }

  /**
   * Start performance benchmark
   */
  public startBenchmark(
    name: string,
    context: string = 'general',
    metadata?: any
  ): string {
    if (!this.isEnabled) return '';

    const benchmarkId = this.generateBenchmarkId(name);

    const benchmark: PerformanceBenchmark = {
      name,
      startTime: performance.now(),
      memoryStart: this.getCurrentMemoryUsage(),
      context,
      metadata
    };

    this.activeBenchmarks.set(benchmarkId, benchmark);

    this.logger.debug(`Benchmark started: ${name}`, { benchmarkId, context });

    return benchmarkId;
  }

  /**
   * End performance benchmark
   */
  public endBenchmark(benchmarkId: string): PerformanceBenchmark | null {
    if (!this.isEnabled || !benchmarkId) return null;

    const benchmark = this.activeBenchmarks.get(benchmarkId);
    if (!benchmark) {
      this.logger.warn(`Benchmark not found: ${benchmarkId}`);
      return null;
    }

    // Complete benchmark
    benchmark.endTime = performance.now();
    benchmark.duration = benchmark.endTime - benchmark.startTime;
    benchmark.memoryEnd = this.getCurrentMemoryUsage();
    benchmark.memoryDelta = (benchmark.memoryEnd || 0) - (benchmark.memoryStart || 0);

    // Move to completed benchmarks
    this.activeBenchmarks.delete(benchmarkId);
    this.completedBenchmarks.push(benchmark);

    // Record as metric
    this.recordMetric('operation_duration', benchmark.duration, 'ms', benchmark.context, {
      operation: benchmark.name,
      benchmarkId
    });

    if (benchmark.memoryDelta && Math.abs(benchmark.memoryDelta) > 0) {
      this.recordMetric('memory_delta', benchmark.memoryDelta, 'MB', benchmark.context, {
        operation: benchmark.name,
        benchmarkId
      });
    }

    // Check for performance issues
    this.checkPerformanceThresholds(benchmark);

    // Cleanup old benchmarks
    this.cleanupBenchmarks();

    this.logger.debug(`Benchmark completed: ${benchmark.name}`, {
      duration: `${benchmark.duration?.toFixed(2)}ms`,
      memoryDelta: `${benchmark.memoryDelta?.toFixed(2)}MB`
    });

    return benchmark;
  }

  /**
   * Record custom performance metric
   */
  public recordMetric(
    name: string,
    value: number,
    unit: string = '',
    context: string = 'general',
    tags?: Record<string, string>
  ): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      context,
      tags
    };

    this.metrics.push(metric);

    // Cleanup old metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics * 0.8); // Keep 80%
    }

    this.logger.debug(`Metric recorded: ${name}`, { value, unit, context });
  }

  /**
   * Measure function execution performance
   */
  public async measureAsync<T>(
    name: string,
    operation: () => Promise<T>,
    context: string = 'general'
  ): Promise<T> {
    const benchmarkId = this.startBenchmark(name, context);

    try {
      const result = await operation();
      return result;
    } finally {
      this.endBenchmark(benchmarkId);
    }
  }

  /**
   * Measure sync function execution performance
   */
  public measureSync<T>(
    name: string,
    operation: () => T,
    context: string = 'general'
  ): T {
    const benchmarkId = this.startBenchmark(name, context);

    try {
      return operation();
    } finally {
      this.endBenchmark(benchmarkId);
    }
  }

  /**
   * Get performance report
   */
  public getPerformanceReport(
    periodMinutes: number = 60
  ): PerformanceReport {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - periodMinutes * 60 * 1000);

    const periodMetrics = this.metrics.filter(
      m => m.timestamp >= startTime && m.timestamp <= endTime
    );

    const periodBenchmarks = this.completedBenchmarks.filter(
      b => b.endTime && b.endTime >= startTime.getTime()
    );

    const summary = this.generateSummary(periodBenchmarks, periodMetrics);

    return {
      period: { start: startTime, end: endTime },
      summary,
      metrics: periodMetrics
    };
  }



  /**
   * Get system performance info
   */
  public getSystemPerformance(): {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    timing: {
      domContentLoaded?: number;
      loadComplete?: number;
      navigationStart?: number;
    };
  } {
    const memory = {
      used: this.getCurrentMemoryUsage(),
      total: 0,
      percentage: 0
    };

    try {
      if (typeof performance !== 'undefined' && performance.memory) {
        memory.total = Math.round(performance.memory.totalJSHeapSize / 1024 / 1024);
        memory.percentage = memory.total > 0 ? (memory.used / memory.total) * 100 : 0;
      }
    } catch {
      // Ignore errors
    }

    const timing: any = {};

    try {
      if (typeof performance !== 'undefined' && performance.timing) {
        const t = performance.timing;
        timing.navigationStart = t.navigationStart;
        timing.domContentLoaded = t.domContentLoadedEventEnd - t.navigationStart;
        timing.loadComplete = t.loadEventEnd - t.navigationStart;
      }
    } catch {
      // Ignore errors
    }

    return { memory, timing };
  }

  /**
   * Detect performance bottlenecks
   */
  public detectBottlenecks(
    periodMinutes: number = 60
  ): BottleneckReport[] {
    const endTime = Date.now();
    const startTime = endTime - periodMinutes * 60 * 1000;

    const recentBenchmarks = this.completedBenchmarks.filter(
      b => b.endTime && b.endTime >= startTime
    );

    // Group by operation
    const operationGroups = new Map<string, PerformanceBenchmark[]>();

    recentBenchmarks.forEach(benchmark => {
      const key = `${benchmark.context}:${benchmark.name}`;
      if (!operationGroups.has(key)) {
        operationGroups.set(key, []);
      }
      operationGroups.get(key)!.push(benchmark);
    });

    const bottlenecks: BottleneckReport[] = [];

    for (const [key, benchmarks] of operationGroups) {
      const [context, operation] = key.split(':');
      const durations = benchmarks.map(b => b.duration || 0);
      const averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const frequency = benchmarks.length;

      // Determine if this is a bottleneck
      let impact: 'low' | 'medium' | 'high' = 'low';
      let recommendation = '';

      if (averageDuration > this.thresholds.slowOperation) {
        impact = frequency > this.thresholds.highFrequency ? 'high' : 'medium';
        recommendation = `Operation '${operation}' is slow (avg: ${averageDuration.toFixed(2)}ms). Consider optimization.`;
      } else if (frequency > this.thresholds.highFrequency) {
        impact = 'medium';
        recommendation = `Operation '${operation}' is called frequently (${frequency} times). Consider caching or batching.`;
      }

      if (recommendation) {
        bottlenecks.push({
          component: context,
          operation,
          averageDuration,
          frequency,
          impact,
          recommendation
        });
      }
    }

    return bottlenecks.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    });
  }

  /**
   * Get optimization recommendations
   */
  public getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const bottlenecks = this.detectBottlenecks();
    const systemPerf = this.getSystemPerformance();

    // Memory recommendations
    if (systemPerf.memory.used > this.thresholds.criticalMemory) {
      recommendations.push('High memory usage detected. Consider implementing memory cleanup or reducing cache size.');
    }

    if (systemPerf.memory.percentage > 80) {
      recommendations.push('Memory usage is above 80%. Monitor for potential memory leaks.');
    }

    // Performance bottleneck recommendations
    bottlenecks.slice(0, 5).forEach(bottleneck => {
      recommendations.push(bottleneck.recommendation);
    });

    // General recommendations
    if (this.completedBenchmarks.length > this.maxBenchmarks * 0.8) {
      recommendations.push('Consider increasing cleanup frequency to prevent memory buildup from performance data.');
    }

    return recommendations;
  }

  /**
   * Export performance data
   */
  public exportData(): {
    metrics: PerformanceMetric[];
    benchmarks: PerformanceBenchmark[];
    systemInfo: any;
    exportTimestamp: string;
  } {
    return {
      metrics: [...this.metrics],
      benchmarks: [...this.completedBenchmarks],
      systemInfo: this.getSystemPerformance(),
      exportTimestamp: new Date().toISOString()
    };
  }

  /**
   * Clear all performance data
   */
  public clearData(): void {
    this.metrics = [];
    this.completedBenchmarks = [];
    this.activeBenchmarks.clear();
    this.logger.info('Performance data cleared');
  }

  /**
   * Enable/disable profiling
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.logger.info(`Performance profiling ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Private Methods

  private setupPerformanceObserver(): void {
    try {
      if (typeof PerformanceObserver !== 'undefined') {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            this.recordMetric(
              entry.name,
              entry.duration,
              'ms',
              'browser',
              { entryType: entry.entryType }
            );
          });
        });

        observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
      }
    } catch (error) {
      this.logger.warn('Performance Observer not available', error);
    }
  }

  private startMemoryMonitoring(): void {
    if (this.isEnabled && typeof setInterval !== 'undefined') {
      setInterval(() => {
        this.recordMetric(
          'memory_usage',
          this.getCurrentMemoryUsage(),
          'MB',
          'system'
        );
      }, 30000); // Every 30 seconds
    }
  }

  private setupCleanup(): void {
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        this.performCleanup();
      }, 300000); // Every 5 minutes
    }
  }

  private performCleanup(): void {
    // Clean old metrics
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoffTime);

    // Clean old benchmarks
    const cutoffTimeMs = Date.now() - 24 * 60 * 60 * 1000;
    this.completedBenchmarks = this.completedBenchmarks.filter(
      b => !b.endTime || b.endTime >= cutoffTimeMs
    );

    this.logger.debug('Performance data cleanup completed');
  }

  private cleanupBenchmarks(): void {
    if (this.completedBenchmarks.length > this.maxBenchmarks) {
      this.completedBenchmarks = this.completedBenchmarks.slice(-this.maxBenchmarks * 0.8);
    }
  }

  private checkPerformanceThresholds(benchmark: PerformanceBenchmark): void {
    if (!benchmark.duration) return;

    if (benchmark.duration > this.thresholds.slowOperation) {
      this.logger.warn(`Slow operation detected: ${benchmark.name}`, {
        duration: `${benchmark.duration.toFixed(2)}ms`,
        threshold: `${this.thresholds.slowOperation}ms`,
        context: benchmark.context
      });
    }

    if (benchmark.memoryDelta && benchmark.memoryDelta > this.thresholds.memoryLeak) {
      this.logger.warn(`Potential memory leak detected: ${benchmark.name}`, {
        memoryDelta: `${benchmark.memoryDelta.toFixed(2)}MB`,
        threshold: `${this.thresholds.memoryLeak}MB`,
        context: benchmark.context
      });
    }
  }

  private generateSummary(
    benchmarks: PerformanceBenchmark[],
    metrics: PerformanceMetric[]
  ): any {
    const durations = benchmarks.map(b => b.duration || 0);
    const memoryMetrics = metrics.filter(m => m.name === 'memory_usage');

    const averageResponseTime = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    const memoryValues = memoryMetrics.map(m => m.value);
    const memoryUsage = {
      average: memoryValues.length > 0 ? memoryValues.reduce((sum, v) => sum + v, 0) / memoryValues.length : 0,
      peak: memoryValues.length > 0 ? Math.max(...memoryValues) : 0,
      current: this.getCurrentMemoryUsage()
    };

    return {
      totalOperations: benchmarks.length,
      averageResponseTime,
      memoryUsage,
      bottlenecks: this.detectBottlenecks(),
      recommendations: this.getOptimizationRecommendations()
    };
  }

  private generateBenchmarkId(name: string): string {
    return `bench_${Date.now()}_${name}_${Math.random().toString(36).substr(2, 4)}`;
  }
}

// Global performance utilities
export const startBenchmark = (name: string, context?: string) => {
  return PerformanceProfiler.getInstance().startBenchmark(name, context);
};

export const endBenchmark = (benchmarkId: string) => {
  return PerformanceProfiler.getInstance().endBenchmark(benchmarkId);
};

export const measureAsync = <T>(name: string, operation: () => Promise<T>, context?: string) => {
  return PerformanceProfiler.getInstance().measureAsync(name, operation, context);
};

export const measureSync = <T>(name: string, operation: () => T, context?: string) => {
  return PerformanceProfiler.getInstance().measureSync(name, operation, context);
};

export const recordMetric = (name: string, value: number, unit?: string, context?: string) => {
  PerformanceProfiler.getInstance().recordMetric(name, value, unit, context);
};

export default PerformanceProfiler;
