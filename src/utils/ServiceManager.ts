/**
 * ServiceManager - Unified service management with connection pooling
 */

interface ServiceConnection {
  id: string;
  service: any;
  lastUsed: number;
  requestCount: number;
  isActive: boolean;
}

interface QueuedRequest {
  id: string;
  serviceId: string;
  method: string;
  args: any[];
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  priority: number;
  timestamp: number;
}

export class ServiceManager {
  private static instance: ServiceManager;
  private connections = new Map<string, ServiceConnection>();
  private requestQueue: QueuedRequest[] = [];
  private processing = false;
  private maxConcurrentRequests = 3;
  private activeRequests = 0;

  private constructor() {}

  public static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  public registerService(id: string, service: any): void {
    this.connections.set(id, {
      id,
      service,
      lastUsed: Date.now(),
      requestCount: 0,
      isActive: true,
    });
  }

  public async executeRequest<T>(
    serviceId: string,
    method: string,
    args: any[] = [],
    priority: number = 1
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: `${serviceId}_${method}_${Date.now()}`,
        serviceId,
        method,
        args,
        resolve,
        reject,
        priority,
        timestamp: Date.now(),
      };

      this.requestQueue.push(request);
      this.requestQueue.sort((a, b) => b.priority - a.priority);

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.requestQueue.length === 0) return;
    if (this.activeRequests >= this.maxConcurrentRequests) return;

    this.processing = true;

    while (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrentRequests) {
      const request = this.requestQueue.shift()!;
      this.executeQueuedRequest(request);
    }

    this.processing = false;
  }

  private async executeQueuedRequest(request: QueuedRequest): Promise<void> {
    this.activeRequests++;

    try {
      const connection = this.connections.get(request.serviceId);
      
      if (!connection || !connection.isActive) {
        throw new Error(`Service ${request.serviceId} not available`);
      }

      const service = connection.service;
      const method = service[request.method];

      if (typeof method !== 'function') {
        throw new Error(`Method ${request.method} not found on service ${request.serviceId}`);
      }

      const result = await method.apply(service, request.args);
      
      // Update connection stats
      connection.lastUsed = Date.now();
      connection.requestCount++;

      request.resolve(result);
    } catch (error) {
      request.reject(error as Error);
    } finally {
      this.activeRequests--;
      
      // Process next requests
      if (this.requestQueue.length > 0) {
        setTimeout(() => this.processQueue(), 10);
      }
    }
  }

  public getServiceStats(serviceId: string) {
    const connection = this.connections.get(serviceId);
    return connection ? {
      requestCount: connection.requestCount,
      lastUsed: connection.lastUsed,
      isActive: connection.isActive,
    } : null;
  }

  public getQueueStats() {
    return {
      queueLength: this.requestQueue.length,
      activeRequests: this.activeRequests,
      maxConcurrent: this.maxConcurrentRequests,
    };
  }

  public cleanup(): void {
    // Clear queue
    this.requestQueue.forEach(request => {
      request.reject(new Error('Service manager cleanup'));
    });
    this.requestQueue = [];

    // Deactivate connections
    this.connections.forEach(connection => {
      connection.isActive = false;
    });

    this.processing = false;
    this.activeRequests = 0;
  }
}