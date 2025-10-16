/**
 * Engine Diagnostics Web Worker
 * Handles heavy engine health computations off the main thread
 */

// Type definitions (duplicated from MonitoringScreen for worker isolation)
interface EngineHealthStatus {
  overallStatus: '🟢' | '🟡' | '🔴';
  caeQuality: string;
  activeCacheKeys: number;
  workerStatus: 'active' | 'idle' | 'error';
  syncQueueLength: number;
  cognitiveLoad: number;
  lastUpdate: Date;
}

// Worker message types
interface WorkerMessage {
  type: 'COMPUTE_ENGINE_HEALTH';
  data: {
    engineStatus: any;
    cacheStatus: any;
    workerStatus: any;
  };
}

interface WorkerResponse {
  type: 'ENGINE_HEALTH_RESULT';
  data: EngineHealthStatus;
}

// Helper function to determine overall status
function determineOverallStatus(
  status: any,
  caeResult: any,
  workerStatus: any,
): '🟢' | '🟡' | '🔴' {
  if (!status.isInitialized || workerStatus?.data?.status === 'error')
    return '🔴';
  if (status.activeOperations > 20 || !status.isOnline) return '🟡';
  return '🟢';
}

// Worker message handler
self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, data } = e.data;

  if (type === 'COMPUTE_ENGINE_HEALTH') {
    try {
      const { engineStatus, cacheStatus, workerStatus } = data;

      // Calculate overall status based on multiple factors
      const overallStatus = determineOverallStatus(
        engineStatus,
        null, // CAE result would be computed here if needed
        workerStatus,
      );

      const result: EngineHealthStatus = {
        overallStatus,
        caeQuality: 'computed', // Would be calculated from CAE result
        activeCacheKeys: cacheStatus?.data?.keyCount || 0,
        workerStatus: workerStatus?.data?.status || 'idle',
        syncQueueLength: engineStatus.activeOperations || 0,
        cognitiveLoad: 0.5, // Would be calculated from cognitive services
        lastUpdate: new Date(),
      };

      // Send result back to main thread
      const response: WorkerResponse = {
        type: 'ENGINE_HEALTH_RESULT',
        data: result,
      };

      self.postMessage(response);
    } catch (error) {
      console.error('Worker computation error:', error);
      // Send error result
      const errorResult: EngineHealthStatus = {
        overallStatus: '🔴',
        caeQuality: 'error',
        activeCacheKeys: 0,
        workerStatus: 'error',
        syncQueueLength: 0,
        cognitiveLoad: 0,
        lastUpdate: new Date(),
      };

      const response: WorkerResponse = {
        type: 'ENGINE_HEALTH_RESULT',
        data: errorResult,
      };

      self.postMessage(response);
    }
  }
};

// Export for TypeScript
export {};
