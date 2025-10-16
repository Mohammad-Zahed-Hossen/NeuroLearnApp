/**
 * EngineService - Minimal wrapper to initialize and manage NeuroLearnEngine
 * This service provides a simple interface to initialize the orchestration engine
 */

import { NeuroLearnEngine, EngineConfig } from '../core/NeuroLearnEngine';

export class EngineService {
  private static instance: EngineService;
  private engine: NeuroLearnEngine | null = null;
  private isInitialized = false;
  private initializePromise: Promise<void> | null = null;
  private pendingTelemetrySinks: Array<(event: string, payload?: any) => void> = [];

  public static getInstance(): EngineService {
    if (!EngineService.instance) {
      EngineService.instance = new EngineService();
    }
    return EngineService.instance;
  }

  private constructor() {}

  /**
   * Initialize the NeuroLearn Engine with user configuration
   */
  public async initialize(userId: string): Promise<void> {
    // Serialize concurrent initialize calls
    if (this.isInitialized && this.engine) {
      return;
    }
    if (this.initializePromise) return this.initializePromise;

    try {
      console.log('🔧 Starting NeuroLearn Engine initialization...');

      const config: EngineConfig = {
        userId,
        enableDebugMode: __DEV__,
        enablePerformanceMonitoring: true,
        autoSyncInterval: 15, // 15 minutes
        maxRetryAttempts: 3,
        offlineMode: false,
      };

      console.log('🔧 Creating engine instance...');
      this.engine = NeuroLearnEngine.getInstance(config);

      // Register any pending telemetry sinks
      if (this.engine && this.pendingTelemetrySinks.length > 0) {
        for (const s of this.pendingTelemetrySinks) {
          try { this.engine.registerTelemetrySink(s); } catch (e) { /* ignore */ }
        }
        this.pendingTelemetrySinks = [];
      }

      console.log('🔧 Initializing engine...');
      // Enforce a caller-side timeout for initialization to avoid hanging callers
      this.initializePromise = (async () => {
        const initTimeout = 60_000; // 60s caller-level timeout
        let timer: NodeJS.Timeout | null = null;
        try {
          return await Promise.race([
            this.engine!.initialize(),
            new Promise<void>((_, rej) => {
              timer = setTimeout(() => rej(new Error('Engine initialization timed out')), initTimeout);
            })
          ]);
        } finally {
          if (timer) clearTimeout(timer);
        }
      })();

      await this.initializePromise;

      this.isInitialized = true;
      console.log('✅ NeuroLearn Engine initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize NeuroLearn Engine:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
    finally {
      this.initializePromise = null;
    }
  }

  /**
   * Get the engine instance (only after initialization)
   */
  public getEngine(): NeuroLearnEngine | null {
    return this.engine;
  }

  /**
   * Register telemetry sink; if engine not yet created store for later
   */
  public registerTelemetrySink(cb: (event: string, payload?: any) => void): () => void {
    if (this.engine) {
      this.engine.registerTelemetrySink(cb);
      return () => { try { this.engine && this.engine.unregisterTelemetrySink(cb); } catch (e) {} };
    }
    this.pendingTelemetrySinks.push(cb);
    return () => { this.pendingTelemetrySinks = this.pendingTelemetrySinks.filter(s => s !== cb); };
  }

  public unregisterTelemetrySink(cb: (event: string, payload?: any) => void): void {
    if (this.engine) {
      try { this.engine.unregisterTelemetrySink(cb); } catch (e) { /* ignore */ }
      return;
    }
    try { this.pendingTelemetrySinks = this.pendingTelemetrySinks.filter(s => s !== cb); } catch (e) { /* ignore */ }
  }

  /**
   * Execute a command through the engine
   */
  public async execute(command: string, params: any = {}): Promise<any> {
    if (!this.engine) {
      throw new Error('Engine not initialized. Call initialize() first.');
    }

    const result = await this.engine.execute(command, params);
    if (!result.success) {
      throw new Error(result.error || 'Command execution failed');
    }

    return result.data;
  }

  /**
   * Get engine status
   */
  public getStatus() {
    try {
      if (!this.engine) {
        return {
          isInitialized: false,
          isOnline: false,
          activeOperations: 0,
          lastSyncTime: null,
          overallHealth: 'critical' as const,
          moduleStatus: {}
        };
      }

      return this.engine.getStatus();
    } catch (error) {
      console.error('Failed to get engine status:', error);
      return {
        isInitialized: false,
        isOnline: false,
        activeOperations: 0,
        lastSyncTime: null,
        overallHealth: 'critical' as const,
        moduleStatus: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Force sync all modules
   */
  public async forceSync(): Promise<void> {
    if (!this.engine) {
      throw new Error('Engine not initialized');
    }
    await this.engine.forceSync();
  }

  /**
   * Shutdown the engine
   */
  public async shutdown(): Promise<void> {
    if (this.engine) {
      await this.engine.shutdown();
      this.engine = null;
      this.isInitialized = false;
    }
  }

  /**
   * Check if engine is initialized
   */
  public isEngineInitialized(): boolean {
    return this.isInitialized && this.engine !== null;
  }
}

export default EngineService;
