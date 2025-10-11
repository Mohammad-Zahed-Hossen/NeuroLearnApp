import { useQuery } from '@tanstack/react-query';
import { NeuroLearnEngine } from '../../core/NeuroLearnEngine';
import { ErrorReporterService } from '../../services/monitoring/ErrorReporterService';

export interface EngineHealthData {
  overallStatus: '🟢' | '🟡' | '🔴';
  caeQualityScore: number;
  activeCacheKeys: number;
  workerStatus: 'active' | 'idle' | 'error' | 'unknown';
  syncQueueLength: number;
  cognitiveLoad: number;
  memoryUsage: number;
  performanceScore: number;
  lastUpdate: Date;
  uptime: number; // in milliseconds
  errorCount: number;
  warningCount: number;
}

export const useEngineMonitor = () => {
  const engine = NeuroLearnEngine.getInstance();
  const errorReporter = ErrorReporterService.getInstance();

  return useQuery<EngineHealthData, Error>({
    queryKey: ['engine-health'],
    queryFn: async (): Promise<EngineHealthData> => {
      try {
        // Get engine status
        const engineStatus = engine.getStatus();

        // Execute engine diagnostics
        const [caeResult, cacheStatus, workerStatus, cognitiveStatus] = await Promise.allSettled([
          engine.execute('system:status'),
          engine.execute('storage:get-cache-status'),
          engine.execute('system:get-worker-status'),
          engine.execute('ai:get-cognitive-load'),
        ]);

        // Calculate CAE quality score
        let caeQualityScore = 0;
        if (caeResult.status === 'fulfilled' && caeResult.value?.success) {
          const qualityData = caeResult.value.data;
          caeQualityScore = qualityData?.overallHealth === 'excellent' ? 100 :
                           qualityData?.overallHealth === 'good' ? 80 :
                           qualityData?.overallHealth === 'warning' ? 60 : 30;
        }

        // Get cache metrics
        const activeCacheKeys = cacheStatus.status === 'fulfilled' && cacheStatus.value?.success ?
          cacheStatus.value.data?.keyCount || 0 : 0;

        // Determine worker status
        const workerStatusValue = workerStatus.status === 'fulfilled' && workerStatus.value?.success ?
          workerStatus.value.data?.status || 'unknown' : 'error';

        // Get cognitive load
        const cognitiveLoad = cognitiveStatus.status === 'fulfilled' && cognitiveStatus.value?.success ?
          cognitiveStatus.value.data?.load || 0.5 : 0.5;

        // Get error counts from last hour
        const recentLogs = errorReporter.getRecentLogs(100);
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        const recentErrors = recentLogs.filter(log =>
          new Date(log.timestamp).getTime() > oneHourAgo
        );
        const errorCount = recentErrors.filter(log => log.level === 'ERROR').length;
        const warningCount = recentErrors.filter(log => log.level === 'WARN').length;

        // Calculate memory usage (rough estimate)
        const memoryUsage = (performance as any)?.memory?.usedJSHeapSize / 1024 / 1024 || 0;

        // Calculate performance score based on multiple factors
        const performanceScore = calculatePerformanceScore({
          isOnline: engineStatus.isOnline,
          activeOperations: engineStatus.activeOperations,
          caeQuality: caeQualityScore,
          workerStatus: workerStatusValue,
          cognitiveLoad,
          errorCount,
          memoryUsage,
        });

        // Determine overall status
        const overallStatus = determineOverallStatus({
          isInitialized: engineStatus.isInitialized,
          isOnline: engineStatus.isOnline,
          performanceScore,
          errorCount,
          workerStatus: workerStatusValue,
          cognitiveLoad,
        });

        return {
          overallStatus,
          caeQualityScore,
          activeCacheKeys,
          workerStatus: workerStatusValue,
          syncQueueLength: engineStatus.activeOperations,
          cognitiveLoad,
          memoryUsage,
          performanceScore,
          lastUpdate: new Date(),
          uptime: Date.now() - (engineStatus.lastSyncTime?.getTime() || Date.now()),
          errorCount,
          warningCount,
        };

      } catch (error) {
        errorReporter.logError('EngineMonitor', `Health check failed: ${error}`, 'ERROR');

        return {
          overallStatus: '🔴',
          caeQualityScore: 0,
          activeCacheKeys: 0,
          workerStatus: 'error',
          syncQueueLength: 0,
          cognitiveLoad: 0,
          memoryUsage: 0,
          performanceScore: 0,
          lastUpdate: new Date(),
          uptime: 0,
          errorCount: 1,
          warningCount: 0,
        };
      }
    },
    refetchInterval: 30000, // 30 seconds
    staleTime: 15000, // 15 seconds
    gcTime: 60000, // 1 minute (renamed from cacheTime in newer versions)
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

function calculatePerformanceScore(factors: {
  isOnline: boolean;
  activeOperations: number;
  caeQuality: number;
  workerStatus: string;
  cognitiveLoad: number;
  errorCount: number;
  memoryUsage: number;
}): number {
  let score = 100;

  // Deduct for offline status
  if (!factors.isOnline) score -= 30;

  // Deduct for high operation load
  if (factors.activeOperations > 20) score -= 20;
  else if (factors.activeOperations > 10) score -= 10;

  // Add CAE quality contribution
  score += (factors.caeQuality - 50) * 0.3;

  // Deduct for worker issues
  if (factors.workerStatus === 'error') score -= 25;
  else if (factors.workerStatus === 'unknown') score -= 10;

  // Deduct for high cognitive load
  if (factors.cognitiveLoad > 0.8) score -= 15;
  else if (factors.cognitiveLoad > 0.6) score -= 8;

  // Deduct for errors
  score -= factors.errorCount * 5;

  // Deduct for high memory usage
  if (factors.memoryUsage > 200) score -= 20;
  else if (factors.memoryUsage > 100) score -= 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function determineOverallStatus(factors: {
  isInitialized: boolean;
  isOnline: boolean;
  performanceScore: number;
  errorCount: number;
  workerStatus: string;
  cognitiveLoad: number;
}): '🟢' | '🟡' | '🔴' {
  // Critical issues (red)
  if (!factors.isInitialized ||
      factors.workerStatus === 'error' ||
      factors.performanceScore < 30 ||
      factors.errorCount > 10) {
    return '🔴';
  }

  // Warning issues (yellow)
  if (!factors.isOnline ||
      factors.performanceScore < 60 ||
      factors.errorCount > 3 ||
      factors.cognitiveLoad > 0.8 ||
      factors.workerStatus === 'unknown') {
    return '🟡';
  }

  // All good (green)
  return '🟢';
}
