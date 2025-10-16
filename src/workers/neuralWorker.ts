// Neural Worker for CAE 2.0 Calculations
// Offloads heavy computations to prevent main thread blocking

import {
  CognitiveAuraService,
  AuraState,
} from '../services/ai/CognitiveAuraService';
import {
  ContextSensorService,
  ContextSnapshot,
} from '../services/ai/ContextSensorService';

// Worker message types
export interface WorkerMessage {
  type: 'INIT_CAE' | 'GET_AURA_STATE' | 'GET_FORECAST' | 'UPDATE_CONTEXT' | 'STOP' | 'BATCH_PROCESS' | 'CANCEL_BATCH' | 'GET_BATCH_STATUS';
  payload?: any;
  requestId: string;
  batchId?: string; // For batched operations
  priority?: 'high' | 'medium' | 'low'; // For batch prioritization
}

export interface WorkerResponse {
  type: 'RESULT' | 'ERROR' | 'PROGRESS' | 'BATCH_STARTED' | 'BATCH_PROGRESS' | 'BATCH_COMPLETED' | 'BATCH_CANCELLED' | 'STATE_UPDATE';
  payload?: any;
  requestId: string;
  batchId?: string;
  error?: string;
  progress?: {
    completed: number;
    total: number;
    currentTask?: string;
    estimatedTimeRemaining?: number;
  };
}

// Global instances (simulated worker environment)
let caeInstance: CognitiveAuraService | null = null;
let contextSensorInstance: ContextSensorService | null = null;
let isInitialized = false;

// Batch processing queue
interface BatchJob {
  id: string;
  type: 'cognitive_load_analysis' | 'context_processing' | 'forecasting';
  priority: 'high' | 'medium' | 'low';
  payload: any;
  requestId: string;
  startTime?: number;
  progressCallback?: (progress: WorkerResponse['progress']) => void;
}

class BatchProcessor {
  private queue: BatchJob[] = [];
  private activeJobs = new Map<string, BatchJob>();
  private maxConcurrentJobs = 3;
  private processing = false;

  addJob(job: BatchJob): void {
    this.queue.push(job);
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    this.processQueue();
  }

  cancelBatch(batchId: string): boolean {
    const queueIndex = this.queue.findIndex(job => job.id === batchId);
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1);
      return true;
    }

    const activeJob = this.activeJobs.get(batchId);
    if (activeJob) {
      // Mark for cancellation - actual cancellation handled in processing
      activeJob.payload.cancelled = true;
      return true;
    }

    return false;
  }

  getBatchStatus(batchId: string): { status: string; progress?: WorkerResponse['progress'] } | null {
    const activeJob = this.activeJobs.get(batchId);
    if (activeJob) {
      return { status: 'processing', progress: activeJob.payload.progress };
    }

    const queuedJob = this.queue.find(job => job.id === batchId);
    if (queuedJob) {
      return { status: 'queued' };
    }

    return null;
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.activeJobs.size >= this.maxConcurrentJobs) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.activeJobs.size < this.maxConcurrentJobs) {
      const job = this.queue.shift()!;
      this.activeJobs.set(job.id, job);

      try {
        await this.processJob(job);
      } catch (error) {
        console.error(`Batch job ${job.id} failed:`, error);
      } finally {
        this.activeJobs.delete(job.id);
      }
    }

    this.processing = false;
  }

  private async processJob(job: BatchJob): Promise<void> {
    job.startTime = Date.now();

    switch (job.type) {
      case 'cognitive_load_analysis':
        await this.processCognitiveLoadBatch(job);
        break;
      case 'context_processing':
        await this.processContextBatch(job);
        break;
      case 'forecasting':
        await this.processForecastBatch(job);
        break;
    }
  }

  private async processCognitiveLoadBatch(job: BatchJob): Promise<void> {
    const { items, batchSize = 10 } = job.payload;
  const results: any[] = [];
    const total = items.length;

    for (let i = 0; i < items.length; i += batchSize) {
      if (job.payload.cancelled) {
        throw new Error('Batch cancelled');
      }

      const batch = items.slice(i, i + batchSize);
      const batchResults = await this.processCognitiveLoadItems(batch);

      results.push(...batchResults);

      const progress = {
        completed: Math.min(i + batchSize, total),
        total,
        currentTask: `Processing cognitive load batch ${Math.floor(i / batchSize) + 1}`,
        estimatedTimeRemaining: this.estimateTimeRemaining(job.startTime!, i, total)
      };

      job.payload.progress = progress;
      if (job.progressCallback) {
        job.progressCallback(progress);
      }

      // Allow other operations to proceed
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    job.payload.results = results;
  }

  private async processCognitiveLoadItems(items: any[]): Promise<any[]> {
  const results: any[] = [];

    for (const item of items) {
      try {
        // Simulate cognitive load analysis
        const result = await this.analyzeCognitiveLoad(item);
        results.push(result);
      } catch (error) {
        results.push({ error: (error as Error).message, item });
      }
    }

    return results;
  }

  private async analyzeCognitiveLoad(item: any): Promise<any> {
    // Simulate processing time based on complexity
    const processingTime = 50 + Math.random() * 100;
    await new Promise(resolve => setTimeout(resolve, processingTime));

    // Mock cognitive load analysis
    return {
      id: item.id,
      cognitiveLoad: 0.3 + Math.random() * 0.7,
      complexity: item.complexity || 0.5,
      attentionRequired: 0.2 + Math.random() * 0.8,
      processingTime,
      timestamp: new Date()
    };
  }

  private async processContextBatch(job: BatchJob): Promise<void> {
    const { contexts, batchSize = 5 } = job.payload;
  const results: any[] = [];
    const total = contexts.length;

    for (let i = 0; i < contexts.length; i += batchSize) {
      if (job.payload.cancelled) {
        throw new Error('Batch cancelled');
      }

      const batch = contexts.slice(i, i + batchSize);
      const batchResults = await this.processContextItems(batch);

      results.push(...batchResults);

      const progress = {
        completed: Math.min(i + batchSize, total),
        total,
        currentTask: `Processing context batch ${Math.floor(i / batchSize) + 1}`,
        estimatedTimeRemaining: this.estimateTimeRemaining(job.startTime!, i, total)
      };

      job.payload.progress = progress;
      if (job.progressCallback) {
        job.progressCallback(progress);
      }

      await new Promise(resolve => setTimeout(resolve, 10));
    }

    job.payload.results = results;
  }

  private async processContextItems(contexts: any[]): Promise<any[]> {
  const results: any[] = [];

    for (const context of contexts) {
      try {
        const result = await this.processContextItem(context);
        results.push(result);
      } catch (error) {
        results.push({ error: (error as Error).message, context });
      }
    }

    return results;
  }

  private async processContextItem(context: any): Promise<any> {
    // Simulate context processing
    await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 50));

    return {
      id: context.id,
      processedContext: {
        ...context,
        analysis: {
          optimality: 0.4 + Math.random() * 0.6,
          recommendations: ['focus_enhancement', 'environment_optimization'],
          confidence: 0.7 + Math.random() * 0.3
        }
      },
      timestamp: new Date()
    };
  }

  private async processForecastBatch(job: BatchJob): Promise<void> {
    const { scenarios, batchSize = 3 } = job.payload;
  const results: any[] = [];
    const total = scenarios.length;

    for (let i = 0; i < scenarios.length; i += batchSize) {
      if (job.payload.cancelled) {
        throw new Error('Batch cancelled');
      }

      const batch = scenarios.slice(i, i + batchSize);
      const batchResults = await this.processForecastItems(batch);

      results.push(...batchResults);

      const progress = {
        completed: Math.min(i + batchSize, total),
        total,
        currentTask: `Processing forecast batch ${Math.floor(i / batchSize) + 1}`,
        estimatedTimeRemaining: this.estimateTimeRemaining(job.startTime!, i, total)
      };

      job.payload.progress = progress;
      if (job.progressCallback) {
        job.progressCallback(progress);
      }

      await new Promise(resolve => setTimeout(resolve, 10));
    }

    job.payload.results = results;
  }

  private async processForecastItems(scenarios: any[]): Promise<any[]> {
  const results: any[] = [];

    for (const scenario of scenarios) {
      try {
        const result = await this.processForecastItem(scenario);
        results.push(result);
      } catch (error) {
        results.push({ error: (error as Error).message, scenario });
      }
    }

    return results;
  }

  private async processForecastItem(scenario: any): Promise<any> {
    // Simulate forecast processing
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    return {
      id: scenario.id,
      forecast: {
        predictedCapacity: 0.5 + Math.random() * 0.5,
        confidence: 0.6 + Math.random() * 0.4,
        timeHorizon: scenario.timeHorizon || 60,
        recommendations: ['adaptive_scheduling', 'context_optimization']
      },
      timestamp: new Date()
    };
  }

  private estimateTimeRemaining(startTime: number, completed: number, total: number): number {
    if (completed === 0) return 0;

    const elapsed = Date.now() - startTime;
    const avgTimePerItem = elapsed / completed;
    const remaining = total - completed;

    return Math.round(avgTimePerItem * remaining / 1000); // seconds
  }

  // Get active batch count
  getActiveBatchCount(): number {
    return this.activeJobs.size;
  }

  // Get queue length
  getQueueLength(): number {
    return this.queue.length;
  }
}

// Global batch processor instance
const batchProcessor = new BatchProcessor();

// Worker message handler
export const handleWorkerMessage = async (
  message: WorkerMessage,
  postMessage: (response: WorkerResponse) => void
): Promise<void> => {
  try {
    switch (message.type) {
      case 'INIT_CAE':
        await initializeCAE(postMessage, message.requestId);
        break;

      case 'GET_AURA_STATE':
        await getAuraState(message.payload, postMessage, message.requestId);
        break;

      case 'GET_FORECAST':
        await getCapacityForecast(message.payload, postMessage, message.requestId);
        break;

      case 'UPDATE_CONTEXT':
        await updateContext(message.payload, postMessage, message.requestId);
        break;

      case 'BATCH_PROCESS':
        await handleBatchProcess(message, postMessage);
        break;

      case 'CANCEL_BATCH':
        await handleCancelBatch(message, postMessage);
        break;

      case 'GET_BATCH_STATUS':
        await handleGetBatchStatus(message, postMessage);
        break;

      case 'STOP':
        cleanup();
        postMessage({
          type: 'RESULT',
          payload: { success: true },
          requestId: message.requestId,
        });
        break;

      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }
  } catch (error) {
    postMessage({
      type: 'ERROR',
      error: (error as Error).message,
      requestId: message.requestId,
    });
  }
};

// Handle batch processing requests
const handleBatchProcess = async (
  message: WorkerMessage,
  postMessage: (response: WorkerResponse) => void
): Promise<void> => {
  const { type, items, batchSize, priority = 'medium' } = message.payload;
  const batchId = message.batchId || `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const job: BatchJob = {
      id: batchId,
      type,
      priority,
      payload: { ...message.payload, progress: { completed: 0, total: items.length } },
      requestId: message.requestId,
      progressCallback: (progress) => {
        const response: WorkerResponse = {
          type: 'BATCH_PROGRESS',
          batchId,
          requestId: message.requestId,
          ...(progress && { progress })
        };
        postMessage(response);
      }
    };

    batchProcessor.addJob(job);

    postMessage({
      type: 'BATCH_STARTED',
      batchId,
      requestId: message.requestId,
      payload: { batchId, totalItems: items.length }
    });

    // Wait for completion (in real implementation, this would be async)
    // For now, we'll poll for completion
    const checkCompletion = () => {
      const status = batchProcessor.getBatchStatus(batchId);
      if (!status || status.status !== 'processing') {
        // Batch completed or not found
        postMessage({
          type: 'BATCH_COMPLETED',
          batchId,
          requestId: message.requestId,
          payload: job.payload.results || []
        });
      } else {
        setTimeout(checkCompletion, 100);
      }
    };

    setTimeout(checkCompletion, 100);

  } catch (error) {
    postMessage({
      type: 'ERROR',
      error: (error as Error).message,
      requestId: message.requestId,
      batchId
    });
  }
};

// Handle batch cancellation
const handleCancelBatch = async (
  message: WorkerMessage,
  postMessage: (response: WorkerResponse) => void
): Promise<void> => {
  const { batchId } = message.payload;

  try {
    const cancelled = batchProcessor.cancelBatch(batchId);

    postMessage({
      type: 'BATCH_CANCELLED',
      batchId,
      requestId: message.requestId,
      payload: { cancelled }
    });
  } catch (error) {
    postMessage({
      type: 'ERROR',
      error: (error as Error).message,
      requestId: message.requestId,
      batchId
    });
  }
};

// Handle batch status requests
const handleGetBatchStatus = async (
  message: WorkerMessage,
  postMessage: (response: WorkerResponse) => void
): Promise<void> => {
  const { batchId } = message.payload;

  try {
    const status = batchProcessor.getBatchStatus(batchId);

    postMessage({
      type: 'RESULT',
      requestId: message.requestId,
      batchId,
      payload: { status }
    });
  } catch (error) {
    postMessage({
      type: 'ERROR',
      error: (error as Error).message,
      requestId: message.requestId,
      batchId
    });
  }
};

// Initialize CAE in worker
const initializeCAE = async (
  postMessage: (response: WorkerResponse) => void,
  requestId: string
): Promise<void> => {
  try {
    console.log('🔮 Initializing CAE 2.0 in worker...');

    // Initialize services
    caeInstance = CognitiveAuraService.getInstance();
    contextSensorInstance = ContextSensorService.getInstance();

    // Start context sensing in background
    await contextSensorInstance.startMonitoring(2); // Less frequent for background

    isInitialized = true;

    postMessage({
      type: 'RESULT',
      payload: { initialized: true },
      requestId,
    });

    console.log('✅ CAE 2.0 initialized in worker');
  } catch (error) {
    throw new Error(`CAE initialization failed: ${(error as Error).message}`);
  }
};

// Get aura state asynchronously
const getAuraState = async (
  payload: { forceRefresh?: boolean },
  postMessage: (response: WorkerResponse) => void,
  requestId: string
): Promise<void> => {
  if (!caeInstance || !isInitialized) {
    throw new Error('CAE not initialized');
  }

  try {
    console.log('🧠 Computing aura state in worker...');

    // Send progress update
    postMessage({
      type: 'PROGRESS',
      payload: { stage: 'Computing aura state', progress: 0 },
      requestId,
    });

    const auraState = await caeInstance.getAuraState(payload.forceRefresh);

    postMessage({
      type: 'PROGRESS',
      payload: { stage: 'Aura state computed', progress: 100 },
      requestId,
    });

    postMessage({
      type: 'RESULT',
      payload: { auraState },
      requestId,
    });

    console.log('✅ Aura state computed in worker');
  } catch (error) {
    throw new Error(`Aura state computation failed: ${(error as Error).message}`);
  }
};

// Get capacity forecast with progressive updates
const getCapacityForecast = async (
  payload: { timeframe: 'short' | 'medium' | 'long' },
  postMessage: (response: WorkerResponse) => void,
  requestId: string
): Promise<void> => {
  if (!caeInstance || !isInitialized) {
    throw new Error('CAE not initialized');
  }

  try {
    console.log(`🔮 Computing ${payload.timeframe}-term forecast in worker...`);

    // Send progress updates
    postMessage({
      type: 'PROGRESS',
      payload: { stage: `Starting ${payload.timeframe} forecast`, progress: 0 },
      requestId,
    });

    // Use actual CAE method if available, otherwise simulate
    const forecast = caeInstance.getCapacityForecast
      ? await caeInstance.getCapacityForecast(payload.timeframe)
      : await simulateCapacityForecast(payload.timeframe);

    postMessage({
      type: 'PROGRESS',
      payload: { stage: `${payload.timeframe} forecast complete`, progress: 100 },
      requestId,
    });

    postMessage({
      type: 'RESULT',
      payload: { forecast, timeframe: payload.timeframe },
      requestId,
    });

    console.log(`✅ ${payload.timeframe}-term forecast computed in worker`);
  } catch (error) {
    throw new Error(`Forecast computation failed: ${(error as Error).message}`);
  }
};

// Simulate capacity forecast since method doesn't exist in CognitiveAuraService
const simulateCapacityForecast = async (timeframe: 'short' | 'medium' | 'long') => {
  // Simulate computation time
  await new Promise(resolve => setTimeout(resolve, 100));

  const baseForecast = {
    mentalClarityScore: 0.7 + Math.random() * 0.3,
    anticipatedCapacityChange: (Math.random() - 0.5) * 0.4,
    optimalWindowRemaining: Math.floor(Math.random() * 120),
    nextOptimalWindow: new Date(Date.now() + Math.random() * 24 * 60 * 60 * 1000),
  };

  // Adjust based on timeframe
  switch (timeframe) {
    case 'short':
      return {
        ...baseForecast,
        optimalWindowRemaining: Math.min(baseForecast.optimalWindowRemaining, 30),
      };
    case 'medium':
      return {
        ...baseForecast,
        optimalWindowRemaining: Math.min(baseForecast.optimalWindowRemaining, 120),
      };
    case 'long':
      return {
        ...baseForecast,
        optimalWindowRemaining: Math.min(baseForecast.optimalWindowRemaining, 480),
      };
  }
};

// Update context in background
const updateContext = async (
  payload: { snapshot: ContextSnapshot },
  postMessage: (response: WorkerResponse) => void,
  requestId: string
): Promise<void> => {
  if (!contextSensorInstance || !isInitialized) {
    throw new Error('Context sensor not initialized');
  }

  try {
    console.log('🌍 Updating context in worker...');

    // Simulate context update processing since method doesn't exist
    await simulateContextUpdate(payload.snapshot);

    postMessage({
      type: 'RESULT',
      payload: { updated: true },
      requestId,
    });

    console.log('✅ Context updated in worker');
  } catch (error) {
    throw new Error(`Context update failed: ${(error as Error).message}`);
  }
};

// Simulate context update processing since method doesn't exist in ContextSensorService
const simulateContextUpdate = async (snapshot: ContextSnapshot): Promise<void> => {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 50));

  // Log context update for debugging
  console.log(`📊 Context update processed: ${snapshot.timeIntelligence.timeOfDay}, ${snapshot.locationContext.environment}, ${snapshot.digitalBodyLanguage.state}`);

  // In a real implementation, this would update internal state and trigger learning
};

// Cleanup worker resources
const cleanup = (): void => {
  if (contextSensorInstance) {
    contextSensorInstance.stopMonitoring();
  }
  caeInstance = null;
  contextSensorInstance = null;
  isInitialized = false;
  console.log('🧹 Worker cleanup complete');
};

// Enhanced NeuralWorker class with batch processing support
export class NeuralWorker {
  private postMessageCallback: ((response: WorkerResponse) => void) | null = null;
  private requestCounter = 0;
  private stateSyncEnabled = false;
  private stateSyncInterval: NodeJS.Timeout | null = null;

  setPostMessageCallback(callback: (response: WorkerResponse) => void): void {
    this.postMessageCallback = callback;
  }

  async postMessage(message: WorkerMessage): Promise<void> {
    if (!this.postMessageCallback) {
      throw new Error('Post message callback not set');
    }

    await handleWorkerMessage(message, this.postMessageCallback);
  }

  generateRequestId(): string {
    return `req_${++this.requestCounter}_${Date.now()}`;
  }

  // Enable real-time state synchronization
  enableStateSync(intervalMs: number = 1000): void {
    this.stateSyncEnabled = true;
    this.stateSyncInterval = setInterval(() => {
      this.sendStateUpdate();
    }, intervalMs);
  }

  // Disable state synchronization
  disableStateSync(): void {
    this.stateSyncEnabled = false;
    if (this.stateSyncInterval) {
      clearInterval(this.stateSyncInterval);
      this.stateSyncInterval = null;
    }
  }

  // Send state update to main thread
  private sendStateUpdate(): void {
    if (!this.postMessageCallback || !this.stateSyncEnabled) return;

    const stateUpdate = {
      timestamp: new Date(),
      isInitialized,
      activeBatches: batchProcessor.getActiveBatchCount(),
      queueLength: batchProcessor.getQueueLength(),
      memoryUsage: this.getMemoryUsage(),
      performanceMetrics: this.getPerformanceMetrics()
    };

    this.postMessageCallback({
      type: 'STATE_UPDATE',
      requestId: this.generateRequestId(),
      payload: stateUpdate
    });
  }

  // Get active batch count
  getActiveBatchCount(): number {
    return batchProcessor.getActiveBatchCount();
  }

  // Get queue length
  getQueueLength(): number {
    return batchProcessor.getQueueLength();
  }

  // Get memory usage estimate
  private getMemoryUsage(): { used: number; total: number; percentage: number } {
    // In a real worker, this would use performance.memory
    // For now, return mock data
    return {
      used: Math.floor(Math.random() * 50) + 10, // MB
      total: 100, // MB
      percentage: Math.floor(Math.random() * 50) + 10
    };
  }

  // Get performance metrics
  private getPerformanceMetrics(): { avgResponseTime: number; throughput: number; errorRate: number } {
    return {
      avgResponseTime: Math.floor(Math.random() * 100) + 50, // ms
      throughput: Math.floor(Math.random() * 10) + 5, // requests/sec
      errorRate: Math.random() * 0.05 // 5% max
    };
  }

  // Batch processing convenience methods
  async processBatch(
    type: 'cognitive_load_analysis' | 'context_processing' | 'forecasting',
    items: any[],
    options: {
      batchSize?: number;
      priority?: 'high' | 'medium' | 'low';
      onProgress?: (progress: WorkerResponse['progress']) => void;
    } = {}
  ): Promise<string> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const message: WorkerMessage = {
      type: 'BATCH_PROCESS',
      payload: {
        type,
        items,
        batchSize: options.batchSize,
        priority: options.priority
      },
      requestId: this.generateRequestId(),
      batchId
    };

    // Set up progress callback if provided
    if (options.onProgress) {
      // This would need to be handled in the message handler
    }

    await this.postMessage(message);
    return batchId;
  }

  async cancelBatch(batchId: string): Promise<boolean> {
    const message: WorkerMessage = {
      type: 'CANCEL_BATCH',
      payload: { batchId },
      requestId: this.generateRequestId()
    };

    await this.postMessage(message);
    return true; // Would be resolved by response
  }

  async getBatchStatus(batchId: string): Promise<{ status: string; progress?: WorkerResponse['progress'] } | null> {
    const message: WorkerMessage = {
      type: 'GET_BATCH_STATUS',
      payload: { batchId },
      requestId: this.generateRequestId()
    };

    await this.postMessage(message);
    return null; // Would be resolved by response
  }
}

// Singleton instance
let workerInstance: NeuralWorker | null = null;

export const getNeuralWorker = (): NeuralWorker => {
  if (!workerInstance) {
    workerInstance = new NeuralWorker();
  }
  return workerInstance;
};
