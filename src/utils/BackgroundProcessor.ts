/**
 * Background Processor - Handles heavy operations without blocking UI
 */

interface ProcessingTask<T, R> {
  id: string;
  type: string;
  data: T;
  priority: 'low' | 'medium' | 'high';
  resolve: (result: R) => void;
  reject: (error: Error) => void;
}

export class BackgroundProcessor {
  private static instance: BackgroundProcessor;
  private worker: Worker | null = null;
  private taskQueue: ProcessingTask<any, any>[] = [];
  private processing = false;

  private constructor() {
    this.initWorker();
  }

  public static getInstance(): BackgroundProcessor {
    if (!BackgroundProcessor.instance) {
      BackgroundProcessor.instance = new BackgroundProcessor();
    }
    return BackgroundProcessor.instance;
  }

  private initWorker() {
    try {
      // Create worker from inline code for React Native compatibility
      const workerCode = `
        self.onmessage = function(e) {
          const { type, data } = e.data;

          switch (type) {
            case 'PROCESS_ANALYTICS':
              // Simulate heavy analytics processing
              const result = processAnalytics(data);
              self.postMessage({ type: 'ANALYTICS_COMPLETE', result });
              break;
            case 'GENERATE_INSIGHTS':
              const insights = generateInsights(data);
              self.postMessage({ type: 'INSIGHTS_COMPLETE', result: insights });
              break;
          }
        };

        function processAnalytics(data) {
          // Heavy computation simulation
          const processed = data.map(item => ({
            ...item,
            processed: true,
            timestamp: Date.now()
          }));
          return processed;
        }

        function generateInsights(data) {
          return {
            insights: ['Insight 1', 'Insight 2'],
            confidence: 0.85,
            timestamp: Date.now()
          };
        }
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));

      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);
    } catch (error) {
      console.warn('Worker not available, falling back to main thread');
    }
  }

  private handleWorkerMessage(event: MessageEvent) {
    const { type, result } = event.data;

    // Find and resolve the corresponding task
    const matchType = (type || '').replace('_COMPLETE', '').toLowerCase();
    const taskIndex = this.taskQueue.findIndex((task) => task && task.type === matchType);

    if (taskIndex !== -1) {
      const task = this.taskQueue[taskIndex];
      if (task && typeof task.resolve === 'function') {
        task.resolve(result);
      }
      this.taskQueue.splice(taskIndex, 1);
    }

    this.processNextTask();
  }

  private handleWorkerError(error: ErrorEvent) {
    console.error('Worker error:', error);

    // Reject current task and process next
    if (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      task?.reject(new Error('Worker processing failed'));
    }

    this.processNextTask();
  }

  private processNextTask() {
    if (this.taskQueue.length === 0) {
      this.processing = false;
      return;
    }

    if (!this.worker) {
      // Fallback to main thread processing
      this.processOnMainThread();
      return;
    }

    const task = this.taskQueue[0];
    if (!task) return;
    try {
      this.worker.postMessage({
        type: task.type.toUpperCase(),
        data: task.data,
      });
    } catch (e) {
      // If posting fails, reject and remove the task to avoid stalling the queue
      const t = this.taskQueue.shift();
      t?.reject(new Error('Failed to post message to worker'));
      this.processNextTask();
    }
  }

  private async processOnMainThread() {
    if (this.taskQueue.length === 0) return;

    const task = this.taskQueue.shift()!;

    try {
      // Simple main thread processing
      let result;

      switch (task.type) {
        case 'process_analytics':
          result = task.data.map((item: any) => ({
            ...item,
            processed: true,
            timestamp: Date.now(),
          }));
          break;
        case 'generate_insights':
          result = {
            insights: ['Main thread insight'],
            confidence: 0.75,
            timestamp: Date.now(),
          };
          break;
        default:
          result = task.data;
      }

      task.resolve(result);
    } catch (error) {
      task.reject(error as Error);
    }

    // Process next task after a small delay to prevent blocking
    setTimeout(() => this.processNextTask(), 10);
  }

  public async processAnalytics<T>(data: T[]): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const task: ProcessingTask<T[], T[]> = {
        id: `analytics_${Date.now()}`,
        type: 'process_analytics',
        data,
        priority: 'medium',
        resolve,
        reject,
      };

      this.taskQueue.push(task);

      if (!this.processing) {
        this.processing = true;
        this.processNextTask();
      }
    });
  }

  public async generateInsights(data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const task: ProcessingTask<any, any> = {
        id: `insights_${Date.now()}`,
        type: 'generate_insights',
        data,
        priority: 'low',
        resolve,
        reject,
      };

      this.taskQueue.push(task);

      if (!this.processing) {
        this.processing = true;
        this.processNextTask();
      }
    });
  }

  public getQueueStatus() {
    return {
      queueLength: this.taskQueue.length,
      processing: this.processing,
      workerAvailable: !!this.worker,
    };
  }

  public cleanup() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // Reject all pending tasks
    this.taskQueue.forEach(task => {
      task.reject(new Error('Background processor cleanup'));
    });

    this.taskQueue = [];
    this.processing = false;
  }
}
