// src/hooks/monitoring/usePerformanceMetrics.ts

import { useQuery } from '@tanstack/react-query';
import { PerformanceProfiler } from '../../core/utils/PerformanceProfiler';

export interface PerformanceMetrics {
  fps: number;
  jsThreadTime: number;
  memoryUsage: number;
  cpuUsage: number;
  batteryLevel: number;
  networkLatency: number;
  timestamp: Date;

  // Additional metrics
  gcCollections: number;
  bundleSize: number;
  nativeHeapSize: number;
  renderTime: number;

  // Performance grades
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  fpsGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  memoryGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  responseGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export const usePerformanceMetrics = () => {
  const profiler = PerformanceProfiler.getInstance();

  return useQuery<PerformanceMetrics, Error>({
    queryKey: ['performance-metrics'],
    queryFn: async (): Promise<PerformanceMetrics> => {
      try {
        // Gather all performance metrics
        const fps = profiler.getFPS();
        const jsThreadTime = profiler.getJSThreadTime();
        const memoryUsage = profiler.getMemoryUsage();
        const cpuUsage = profiler.getCPUUsage();
        const networkLatency = profiler.getNetworkLatency();

        // Get additional metrics from performance API
        const performanceEntries = performance.getEntriesByType('measure');
        const gcCollections = (performance as any)?.memory?.totalJSHeapSize ?
          Math.floor((performance as any).memory.totalJSHeapSize / 1000000) : 0;

        const nativeHeapSize = (performance as any)?.memory?.usedJSHeapSize || 0;

        // Calculate render time (average of recent paint timings)
        const paintEntries = performance.getEntriesByType('paint');
        const renderTime = paintEntries.length > 0 ?
          paintEntries[paintEntries.length - 1]!.startTime : 0;

        // Get battery level (would require react-native-device-info)
        const batteryLevel = 0.85; // Placeholder - implement with actual battery API

        // Calculate bundle size (rough estimate)
        const bundleSize = (performance as any)?.memory?.totalJSHeapSize / 1024 / 1024 || 0;

        // Calculate performance grades
        const fpsGrade = calculateFpsGrade(fps);
        const memoryGrade = calculateMemoryGrade(memoryUsage);
        const responseGrade = calculateResponseGrade(jsThreadTime);
        const overallGrade = calculateOverallGrade(fpsGrade, memoryGrade, responseGrade);

        return {
          fps,
          jsThreadTime,
          memoryUsage,
          cpuUsage,
          batteryLevel,
          networkLatency,
          timestamp: new Date(),
          gcCollections,
          bundleSize,
          nativeHeapSize,
          renderTime,
          overallGrade,
          fpsGrade,
          memoryGrade,
          responseGrade,
        };

      } catch (error) {
        console.error('Performance metrics collection failed:', error);

        // Return default/fallback metrics
        return {
          fps: 0,
          jsThreadTime: 999,
          memoryUsage: 0,
          cpuUsage: 0,
          batteryLevel: 0,
          networkLatency: 0,
          timestamp: new Date(),
          gcCollections: 0,
          bundleSize: 0,
          nativeHeapSize: 0,
          renderTime: 0,
          overallGrade: 'F',
          fpsGrade: 'F',
          memoryGrade: 'F',
          responseGrade: 'F',
        };
      }
    },
    refetchInterval: 1000, // Real-time updates every second
    staleTime: 500, // Very fresh data needed
    gcTime: 30000, // 30 seconds cache
    retry: 1, // Quick retry for performance metrics
  });
};

function calculateFpsGrade(fps: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (fps >= 58) return 'A';
  if (fps >= 45) return 'B';
  if (fps >= 30) return 'C';
  if (fps >= 20) return 'D';
  return 'F';
}

function calculateMemoryGrade(memoryMB: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (memoryMB <= 50) return 'A';
  if (memoryMB <= 100) return 'B';
  if (memoryMB <= 200) return 'C';
  if (memoryMB <= 300) return 'D';
  return 'F';
}

function calculateResponseGrade(responseTime: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (responseTime <= 16) return 'A';  // 60 FPS target
  if (responseTime <= 33) return 'B';  // 30 FPS acceptable
  if (responseTime <= 50) return 'C';  // 20 FPS poor
  if (responseTime <= 100) return 'D'; // 10 FPS very poor
  return 'F';
}

function calculateOverallGrade(
  fps: 'A' | 'B' | 'C' | 'D' | 'F',
  memory: 'A' | 'B' | 'C' | 'D' | 'F',
  response: 'A' | 'B' | 'C' | 'D' | 'F'
): 'A' | 'B' | 'C' | 'D' | 'F' {
  const gradeValues = { A: 4, B: 3, C: 2, D: 1, F: 0 };
  const average = (gradeValues[fps] + gradeValues[memory] + gradeValues[response]) / 3;

  if (average >= 3.5) return 'A';
  if (average >= 2.5) return 'B';
  if (average >= 1.5) return 'C';
  if (average >= 0.5) return 'D';
  return 'F';
}
