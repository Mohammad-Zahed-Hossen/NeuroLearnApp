/**
 * ApiBatcher - Utility for batching API requests to reduce network overhead
 *
 * Supports configurable batch sizes, timeouts, and error handling
 * Designed for services that need to perform multiple similar operations
 */

export interface BatchConfig {
  maxBatchSize: number;
  maxWaitTime: number; // milliseconds
  retryAttempts: number;
  retryDelay: number; // milliseconds
}

export interface BatchItem<T = any> {
  id: string;
  data: T;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
}

export class ApiBatcher<TInput = any, TOutput = any> {
  private queue: BatchItem<TInput>[] = [];
  private processing = false;
  private batchTimer: NodeJS.Timeout | undefined;

  constructor(
    private config: BatchConfig,
    private batchProcessor: (items: TInput[]) => Promise<TOutput[]>,
    private itemIdExtractor?: (item: TInput) => string
  ) {}

  /**
   * Add an item to the batch queue
   */
  async add(item: TInput): Promise<TOutput> {
    return new Promise<TOutput>((resolve, reject) => {
      const batchItem: BatchItem<TInput> = {
        id: this.itemIdExtractor ? this.itemIdExtractor(item) : Math.random().toString(36),
        data: item,
        resolve,
        reject,
        timestamp: Date.now()
      };

      this.queue.push(batchItem);

      // Start processing if we hit batch size or this is the first item
      if (this.queue.length >= this.config.maxBatchSize) {
        this.processBatch();
      } else if (this.queue.length === 1) {
        this.scheduleBatch();
      }
    });
  }

  /**
   * Force immediate processing of current batch
   */
  async flush(): Promise<void> {
    if (this.queue.length > 0) {
      await this.processBatch();
    }
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Check if batcher is currently processing
   */
  isProcessing(): boolean {
    return this.processing;
  }

  private scheduleBatch(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.processBatch();
    }, this.config.maxWaitTime);
  }

  private async processBatch(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    // Clear any pending timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    // Extract current batch
    const batch = this.queue.splice(0, this.config.maxBatchSize);
    const batchData = batch.map(item => item.data);

    try {
      // Process the batch
      const results = await this.batchProcessor(batchData);

      // Resolve individual promises
      batch.forEach((item, index) => {
        if (index < results.length) {
          item.resolve(results[index]);
        } else {
          item.reject(new Error('Batch processing returned insufficient results'));
        }
      });

    } catch (error) {
      // Reject all items in the batch
      batch.forEach(item => {
        item.reject(error);
      });
    } finally {
      this.processing = false;

      // Process remaining items if any
      if (this.queue.length > 0) {
        this.scheduleBatch();
      }
    }
  }
}

/**
 * Specialized batcher for Todoist task operations
 */
export class TodoistTaskBatcher extends ApiBatcher<any, any> {
  constructor(
    private apiToken: string,
    private baseURL: string,
    config?: Partial<BatchConfig>
  ) {
    const defaultConfig: BatchConfig = {
      maxBatchSize: 10,
      maxWaitTime: 1000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };

    super(
      defaultConfig,
      (items) => this.processTaskBatch(items),
      (item) => item.id || Math.random().toString(36)
    );
  }

  private async processTaskBatch(items: any[]): Promise<any[]> {
    // Group operations by type
    const operations = {
      create: items.filter(item => item.operation === 'create'),
      update: items.filter(item => item.operation === 'update'),
      complete: items.filter(item => item.operation === 'complete'),
      delete: items.filter(item => item.operation === 'delete')
    };

    const results: any[] = [];

    // Process each operation type
    for (const [opType, opItems] of Object.entries(operations)) {
      if (opItems.length === 0) continue;

      try {
        const opResults = await this.executeBatchOperation(opType, opItems);
        results.push(...opResults);
      } catch (error) {
        // On batch failure, reject all items in this operation
        opItems.forEach(() => results.push({ error }));
      }
    }

    return results;
  }

  private async executeBatchOperation(operation: string, items: any[]): Promise<any[]> {
    const headers = {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };

    switch (operation) {
      case 'create':
        const createPromises = items.map(item =>
          fetch(`${this.baseURL}/tasks`, {
            method: 'POST',
            headers,
            body: JSON.stringify(item.data)
          }).then(res => res.json())
        );
        return Promise.all(createPromises);

      case 'update':
        const updatePromises = items.map(item =>
          fetch(`${this.baseURL}/tasks/${item.taskId}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(item.data)
          }).then(res => res.json())
        );
        return Promise.all(updatePromises);

      case 'complete':
        const completePromises = items.map(item =>
          fetch(`${this.baseURL}/tasks/${item.taskId}/close`, {
            method: 'POST',
            headers
          }).then(res => res.ok ? { success: true } : { error: 'Failed to complete' })
        );
        return Promise.all(completePromises);

      case 'delete':
        const deletePromises = items.map(item =>
          fetch(`${this.baseURL}/tasks/${item.taskId}`, {
            method: 'DELETE',
            headers
          }).then(res => res.ok ? { success: true } : { error: 'Failed to delete' })
        );
        return Promise.all(deletePromises);

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }
}
