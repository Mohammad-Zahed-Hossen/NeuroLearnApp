/**
 * Performance monitoring hook for tracking component performance
 */

import { useEffect, useRef, useCallback } from 'react';
import { MemoryManager } from '../utils/MemoryManager';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  reRenderCount: number;
  lastUpdate: Date;
}

export function usePerformanceMonitor(componentName: string) {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());
  const memoryManager = MemoryManager.getInstance();

  const logPerformance = useCallback((operation: string, duration: number) => {
    if (__DEV__) {
      console.log(`[${componentName}] ${operation}: ${duration}ms`);
    }
  }, [componentName]);

  const measureRender = useCallback(() => {
    const now = Date.now();
    const renderTime = now - lastRenderTimeRef.current;
    renderCountRef.current += 1;
    
    if (renderTime > 16) { // More than one frame
      logPerformance('Slow render', renderTime);
    }
    
    lastRenderTimeRef.current = now;
    return renderTime;
  }, [logPerformance]);

  const measureAsync = useCallback(async <T>(
    operation: string,
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    const start = Date.now();
    try {
      const result = await asyncFn();
      logPerformance(operation, Date.now() - start);
      return result;
    } catch (error) {
      logPerformance(`${operation} (failed)`, Date.now() - start);
      throw error;
    }
  }, [logPerformance]);

  useEffect(() => {
    measureRender();
  });

  useEffect(() => {
    const cleanupId = `perf-monitor-${componentName}`;
    memoryManager.registerCleanup(cleanupId, () => {
      if (__DEV__) {
        console.log(`[${componentName}] Total renders: ${renderCountRef.current}`);
      }
    });

    return () => memoryManager.cleanup(cleanupId);
  }, [componentName, memoryManager]);

  return {
    measureAsync,
    getRenderCount: () => renderCountRef.current,
    getMetrics: (): PerformanceMetrics => ({
      renderTime: Date.now() - lastRenderTimeRef.current,
      memoryUsage: 0, // Would integrate with actual memory monitoring
      reRenderCount: renderCountRef.current,
      lastUpdate: new Date(),
    }),
  };
}