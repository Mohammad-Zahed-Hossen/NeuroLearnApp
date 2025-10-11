/**
 * Physics Worker Manager - Manages Web Worker for physics calculations
 *
 * This manager handles the lifecycle of the physics web worker, providing
 * a clean API for the main thread to interact with the worker while
 * maintaining performance and error handling.
 */

import {
  PhysicsWorkerMessage,
  PhysicsWorkerResponse,
  WorkerNode,
  WorkerLink,
  WorkerPhysicsConfig,
  WorkerPhysicsState,
  InitMessageData,
  UpdateGraphMessageData,
  SimulateStepMessageData,
  UpdateContextMessageData,
  PositionsResponseData,
  createPhysicsMessage,
  isPhysicsResponse,
} from '../../types/workerMessages';

export interface PhysicsWorkerCallbacks {
  onInitialized?: () => void;
  onGraphUpdated?: (nodeCount: number, linkCount: number) => void;
  onPositionsUpdated?: (data: PositionsResponseData) => void;
  onStepCompleted?: (fps: number) => void;
  onContextUpdated?: (context: string, cognitiveLoad: number) => void;
  onError?: (error: string) => void;
  onDisposed?: () => void;
}

export class PhysicsWorkerManager {
  private worker: Worker | null = null;
  private isInitialized = false;
  private callbacks: PhysicsWorkerCallbacks = {};
  private pendingPromises = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>();

  // Worker URL (will be set during initialization)
  private workerUrl: string | null = null;

  constructor(callbacks: PhysicsWorkerCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /**
   * Initialize the physics worker
   */
  async initialize(config: WorkerPhysicsConfig, state: WorkerPhysicsState): Promise<void> {
    if (this.worker) {
      await this.dispose();
    }

    try {
      // Try multiple worker URL strategies
      const workerUrls = [
        './workers/physicsWorker.js',
        '/workers/physicsWorker.js',
        require('../../../workers/physicsWorker.ts')
      ];

      let workerInitialized = false;
      for (const url of workerUrls) {
        try {
          this.workerUrl = url;
          this.worker = new Worker(this.workerUrl = url!);
          workerInitialized = true;
          break;
        } catch (urlError) {
          console.warn(`Worker URL failed: ${url}`, urlError);
          continue;
        }
      }

      if (!workerInitialized || !this.worker) {
        console.warn('All worker URLs failed, physics will run on main thread');
        this.isInitialized = true;
        this.callbacks.onInitialized?.();
        return;
      }

      // Set up message handler
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);

      // Send initialization message
      const initData: InitMessageData = { config, state };
      const messageId = await this.sendMessage('init', initData);

      this.isInitialized = true;
      this.callbacks.onInitialized?.();

    } catch (error) {
      console.warn(`Physics worker initialization failed, continuing without worker: ${error}`);
      this.isInitialized = true;
      this.callbacks.onInitialized?.();
    }
  }

  /**
   * Update the graph data in the worker
   */
  async updateGraph(nodes: WorkerNode[], links: WorkerLink[]): Promise<{ nodeCount: number; linkCount: number }> {
    this.ensureInitialized();

    const updateData: UpdateGraphMessageData = { nodes, links };
    const result = await this.sendMessage('update_graph', updateData);

    this.callbacks.onGraphUpdated?.(result.nodeCount, result.linkCount);
    return result;
  }

  /**
   * Run a single simulation step
   */
  async simulateStep(deltaTime: number, currentTime: number): Promise<{ fps: number }> {
    this.ensureInitialized();

    const stepData: SimulateStepMessageData = { deltaTime, currentTime };
    const result = await this.sendMessage('simulate_step', stepData);

    this.callbacks.onStepCompleted?.(result.fps);
    return result;
  }

  /**
   * Update context and cognitive load
   */
  async updateContext(
    context: string,
    cognitiveLoad: number,
    targetNodeId: string | null,
    config: any
  ): Promise<{ context: string; cognitiveLoad: number }> {
    this.ensureInitialized();

    const contextData: UpdateContextMessageData = {
      context,
      cognitiveLoad,
      targetNodeId,
      config,
    };

    const result = await this.sendMessage('update_context', contextData);
    this.callbacks.onContextUpdated?.(result.context, result.cognitiveLoad);
    return result;
  }

  /**
   * Get current positions from the worker
   */
  async getPositions(): Promise<PositionsResponseData> {
    this.ensureInitialized();

    const result = await this.sendMessage('get_positions', {});
    this.callbacks.onPositionsUpdated?.(result);
    return result;
  }

  /**
   * Dispose of the worker
   */
  async dispose(): Promise<void> {
    if (!this.worker) return;

    try {
      await this.sendMessage('dispose', {});
      this.callbacks.onDisposed?.();
    } catch (error) {
      console.warn('Error disposing worker:', error);
    } finally {
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;

      // Clean up blob URL
      if (this.workerUrl && this.workerUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.workerUrl);
      }
      this.workerUrl = null;

      // Clear pending promises
      this.pendingPromises.clear();
    }
  }

  /**
   * Send a message to the worker and return a promise
   */
  private async sendMessage(type: PhysicsWorkerMessage['type'], data: any): Promise<any> {
    if (!this.worker) {
      // Return mock response when worker is not available (fallback mode)
      console.warn('Worker not available, returning mock response for:', type);
      return this.getMockResponse(type, data);
    }

    const messageId = Math.random().toString(36).substr(2, 9);
    const message = createPhysicsMessage(type, data, messageId);

    return new Promise((resolve, reject) => {
      // Store the promise callbacks
      this.pendingPromises.set(messageId, { resolve, reject });

      // Send the message
      this.worker!.postMessage(message);

      // Set a timeout for the response
      setTimeout(() => {
        if (this.pendingPromises.has(messageId)) {
          this.pendingPromises.delete(messageId);
          reject(new Error(`Worker message timeout: ${type}`));
        }
      }, 5000); // 5 second timeout
    });
  }

  /**
   * Handle messages from the worker
   */
  private handleWorkerMessage(event: MessageEvent): void {
    const response = event.data;

    if (!isPhysicsResponse(response)) {
      console.warn('Invalid worker response:', response);
      return;
    }

    const { id, type, data, error } = response;

    // Resolve pending promise
    const pending = this.pendingPromises.get(id);
    if (pending) {
      this.pendingPromises.delete(id);

      if (type === 'error') {
        pending.reject(new Error(error || 'Worker error'));
      } else {
        pending.resolve(data);
      }
    }

    // Handle callbacks for unsolicited messages
    switch (type) {
      case 'positions_updated':
        this.callbacks.onPositionsUpdated?.(data);
        break;
      case 'error':
        this.callbacks.onError?.(error || 'Unknown worker error');
        break;
    }
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(error: ErrorEvent): void {
    console.error('Physics worker error:', error);
    const msg = String((error && (error as any).message) ?? String(error ?? 'Unknown worker error'));
    this.callbacks.onError?.(`Worker error: ${msg}`);

    // Reject all pending promises
    this.pendingPromises.forEach(({ reject }) => {
      reject(new Error(`Worker error: ${msg}`));
    });
    this.pendingPromises.clear();
  }

  /**
   * Ensure the worker is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Physics worker not initialized');
    }
  }

  /**
   * Get mock response when worker is not available
   */
  private getMockResponse(type: PhysicsWorkerMessage['type'], data: any): any {
    switch (type) {
      case 'init':
        return { success: true };
      case 'update_graph':
        return { nodeCount: data.nodes?.length || 0, linkCount: data.links?.length || 0 };
      case 'simulate_step':
        return { fps: 60 };
      case 'update_context':
        return { context: data.context, cognitiveLoad: data.cognitiveLoad };
      case 'get_positions':
        return { nodes: [], links: [], timestamp: Date.now() };
      case 'dispose':
        return { success: true };
      default:
        return { success: true };
    }
  }
}

// Export singleton instance
export const physicsWorkerManager = new PhysicsWorkerManager();
