/**
 * NeuroLearnEngine - The Central Orchestration Brain
 *
 * This is the main orchestration engine that implements the Service Layer Pattern
 * combined with Event-Driven Architecture and Domain-Driven Design. It serves as
 * the central brain coordinating all NeuroLearn modules and cross-domain operations.
 *
 * Architecture Pattern: Service Layer / Orchestration Engine
 *
 * Features:
 * - Central command router for all operations
 * - Event-driven communication between modules
 * - Cross-domain intelligence coordination
 * - Adaptive resource allocation
 * - Performance monitoring and optimization
 * - Graceful error handling and recovery
 *
 * @version 2.0.0
 * @author NeuroLearn Team
 */

import { EventEmitter } from 'eventemitter3';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { StorageOrchestrator } from './orchestrators/StorageOrchestrator';
import { LearningOrchestrator } from './orchestrators/LearningOrchestrator';
import { FinanceOrchestrator } from './orchestrators/FinanceOrchestrator';
import { WellnessOrchestrator } from './orchestrators/WellnessOrchestrator';
import { AIOrchestrator } from './orchestrators/AIOrchestrator';
import { CognitiveOrchestrator } from './orchestrators/CognitiveOrchestrator';

// Event System
import { EventSystem, NeuroLearnEvent } from './EventSystem';

// Data Flow Manager
import { DataFlowManager } from './DataFlowManager';

// Global State Manager
import { GlobalStateManager } from './GlobalStateManager';

// Calculation Engine
import { CalculationEngine } from './CalculationEngine';

// Engine Worker Types (simplified)
interface EngineWorkerMessage {
  id: string;
  type: string;
  data: any;
}

interface EngineWorkerResponse {
  id: string;
  type: string;
  data?: any;
  error?: string;
}

const createEngineMessage = (type: string, data: any, id: string): EngineWorkerMessage => ({ id, type, data });

// Utilities
import { PerformanceProfiler } from './utils/PerformanceProfiler';
import { ErrorHandler, getErrorMessage } from './utils/ErrorHandler';
import { z } from 'zod';
import { Logger } from './utils/Logger';
import ErrorReporterService from '../services/monitoring/ErrorReporterService';
import { MemoryManager } from '../utils/MemoryManager';

// Types
export interface EngineConfig {
  userId: string;
  enableDebugMode: boolean;
  enablePerformanceMonitoring: boolean;
  autoSyncInterval: number; // in minutes
  maxRetryAttempts: number;
  /** Optional per-step initialization timeout in milliseconds (defaults to 15000) */
  initTimeoutMs?: number;
  offlineMode: boolean;
}

export interface CommandContext {
  userId: string;
  sessionId: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  metadata?: Record<string, any>;
}

export interface CommandResult {
  success: boolean;
  data?: any;
  error?: string;
  performance?: {
    executionTime: number;
    memoryUsage: number;
  };
  events?: NeuroLearnEvent[];
}

export interface EngineStatus {
  isInitialized: boolean;
  isOnline: boolean;
  activeOperations: number;
  lastSyncTime: Date | null;
  overallHealth: 'excellent' | 'good' | 'warning' | 'critical';
  moduleStatus: Record<string, 'active' | 'idle' | 'error' | 'disabled'>;
}

/**
 * Main NeuroLearn Orchestration Engine
 *
 * This class serves as the central brain that coordinates all operations
 * across the NeuroLearn ecosystem. It implements the Service Layer pattern
 * with Event-Driven Architecture to provide a unified API for all modules.
 */
export class NeuroLearnEngine extends EventEmitter {
  private static instance: NeuroLearnEngine;

  // Configuration
  private config: EngineConfig;

  // Orchestrators
  private storageOrchestrator!: StorageOrchestrator;
  private learningOrchestrator!: LearningOrchestrator;
  private financeOrchestrator!: FinanceOrchestrator;
  private wellnessOrchestrator!: WellnessOrchestrator;
  private aiOrchestrator!: AIOrchestrator;
  private cognitive!: CognitiveOrchestrator;

  // Core Systems
  private eventSystem!: EventSystem;
  private dataFlowManager!: DataFlowManager;
  private globalStateManager!: GlobalStateManager;
  private calculationEngine!: CalculationEngine;

  // Utilities
  private performanceProfiler: PerformanceProfiler;
  private errorHandler: ErrorHandler;
  private logger: Logger;

  // State
  private isInitialized = false;
  private initializePromise: Promise<void> | null = null;
  private coreServicesInitialized = false;
  private orchestratorsInitialized = false;
  private isOnline = true;
  private activeOperations = 0;
  private lastSyncTime: Date | null = new Date(); // Initialize to current time to avoid null warnings
  private sessionId: string;
  private autoSyncTimer: NodeJS.Timeout | null = null;

  // Telemetry sinks: callbacks that receive (event, payload)
  private telemetrySinks: Array<(event: string, payload?: any) => void> = [];

  // Web Worker Integration
  private engineWorker: Worker | null = null;
  private workerPromises: Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }> = new Map();
  private workerSupportedTypes = new Set([
    'cross_domain_correlation',
    'optimize_schedule',
    'optimize_learning_path',
    'predict_performance',
    'analyze_patterns'
  ]);

  // Batched Processing
  private batchQueue: Array<{
    command: string;
    params: any;
    context: CommandContext;
    resolve: Function;
    reject: Function;
  }> = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private batchSize = 5;
  private batchDelay = 100; // ms

  // Memoization Cache
  private commandCache: Map<string, {
    result: CommandResult;
    timestamp: number;
    ttl: number;
    hits: number;
    lastAccessed: number;
  }> = new Map();
  private cacheStats = { hits: 0, misses: 0, totalRequests: 0 };
  private defaultCacheTtl = 300000; // 5 minutes

  private constructor(config: EngineConfig) {
    super();
    this.config = config;
    this.sessionId = this.generateSessionId();

  // Initialize utilities first
  this.logger = new Logger('NeuroLearnEngine');
  this.errorHandler = ErrorHandler.getInstance();
  this.performanceProfiler = PerformanceProfiler.getInstance();

    this.logger.info('NeuroLearn Engine initializing...', { sessionId: this.sessionId });
    try {
      // Register engine caches with MemoryManager for soft resets
      MemoryManager.getInstance().registerCache('engine:commandCache', () => { this.commandCache.clear(); });
    } catch (e) { /* ignore */ }
  }

  /**
   * Get singleton instance of NeuroLearnEngine
   */
  public static getInstance(config?: EngineConfig): NeuroLearnEngine {
    if (!NeuroLearnEngine.instance) {
      if (!config) {
        throw new Error('NeuroLearnEngine requires configuration on first initialization');
      }
      NeuroLearnEngine.instance = new NeuroLearnEngine(config);
    }
    return NeuroLearnEngine.instance;
  }

  /**
   * Initialize the entire NeuroLearn ecosystem
   */
  public async initialize(): Promise<void> {
    // Idempotent initialize: return existing promise if initialization already in progress
    if (this.isInitialized) return;
    if (this.initializePromise) return this.initializePromise;

    const startTime = Date.now();

    this.initializePromise = (async () => {
      try {
  this.logger.info('Starting engine initialization (with retries)...');
  this.emit('engine:init:start', { sessionId: this.sessionId, timestamp: new Date() });
  this.emitTelemetry('engine.init.start', { sessionId: this.sessionId, timestamp: new Date() });

  await this.initializeWithRetries();
  this.emit('engine:init:attempt:success', { sessionId: this.sessionId, timestamp: new Date() });
  this.emitTelemetry('engine.init.success', { sessionId: this.sessionId, timestamp: new Date() });

        // Setup event listeners and monitoring after core systems are up
        this.setupEventListeners();
        this.setupNetworkMonitoring();

        // Initialize Web Worker for heavy computations (best-effort)
        this.initializeEngineWorker();

        // Start background processes (auto-sync, perf monitoring)
        this.startBackgroundProcesses();

        this.isInitialized = true;
        const initTime = Date.now() - startTime;

        this.logger.info('NeuroLearn Engine initialized successfully', {
          initializationTime: `${initTime}ms`,
          sessionId: this.sessionId
        });

        this.emit('engine:initialized', {
          sessionId: this.sessionId,
          initializationTime: initTime,
          timestamp: new Date()
        });

      } catch (error) {
        this.emit('engine:init:attempt:failure', { sessionId: this.sessionId, error: getErrorMessage(error), timestamp: new Date() });
        // Record to error reporter and telemetry sinks
        try {
          ErrorReporterService.getInstance().logError('NeuroLearnEngine', `Initialization attempt failed: ${getErrorMessage(error)}`, 'WARN', { sessionId: this.sessionId }, error as Error);
        } catch (e) { /* ignore telemetry errors */ }
        this.emitTelemetry('engine.init.attempt.failure', { sessionId: this.sessionId, error: getErrorMessage(error), timestamp: new Date() });
        // Top-level handler: attempt degraded mode next and emit telemetry
        this.errorHandler.handleError(error, { source: 'NeuroLearnEngine', operation: 'initialize' });
        this.logger.error('Engine initialization failed after retries, attempting degraded mode', error);

        try {
          await this.enterDegradedMode(error);
          this.logger.warn('Engine started in degraded mode');
          this.emit('engine:initialized:degraded', { sessionId: this.sessionId, timestamp: new Date() });
          this.emitTelemetry('engine.init.degraded', { sessionId: this.sessionId, timestamp: new Date() });
        } catch (dmErr) {
          this.logger.error('Degraded mode initialization failed', dmErr);
          try {
            ErrorReporterService.getInstance().logError('NeuroLearnEngine', `Degraded mode initialization failed: ${getErrorMessage(dmErr)}`, 'ERROR', { sessionId: this.sessionId }, dmErr as Error);
          } catch (e) { /* ignore */ }
          this.emit('engine:init:degraded:failure', { sessionId: this.sessionId, error: getErrorMessage(dmErr), timestamp: new Date() });
          this.emitTelemetry('engine.init.degraded.failure', { sessionId: this.sessionId, error: getErrorMessage(dmErr), timestamp: new Date() });
          throw error; // rethrow original error to surface for CI/monitoring
        }
      } finally {
        // clear the initializePromise so future attempts can re-run if needed
        this.initializePromise = null;
      }
    })();

    return this.initializePromise;
  }

  /**
   * Quick readiness probe
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Wait until engine is ready or timeout
   */
  public async waitUntilReady(timeoutMs = 30000): Promise<void> {
    if (this.isInitialized) return;
    const start = Date.now();
    while (!this.isInitialized && Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if (!this.isInitialized) throw new Error('waitUntilReady: timeout waiting for engine to initialize');
  }

  /**
   * Attempt to initialize core services and orchestrators with retries and exponential backoff.
   */
  private async initializeWithRetries(): Promise<void> {
    const maxAttempts = Math.max(1, (this.config && this.config.maxRetryAttempts) || 3);
    let attempt = 0;
    let lastErr: any = null;

    while (attempt < maxAttempts) {
      attempt++;
      try {
  this.logger.debug(`Initialization attempt ${attempt}/${maxAttempts}`);
  this.emit('engine:init:attempt', { sessionId: this.sessionId, attempt, maxAttempts, timestamp: new Date() });
  this.emitTelemetry('engine.init.attempt', { sessionId: this.sessionId, attempt, maxAttempts, timestamp: new Date() });
        // Initialize core services (with per-step timeout)
        await this.runWithTimeout(() => this.initializeCoreServices(), (this.config?.initTimeoutMs) || 15000, `initializeCoreServices:attempt${attempt}`);

        // Initialize orchestrators (with per-step timeout)
        await this.runWithTimeout(() => this.initializeOrchestrators(), (this.config?.initTimeoutMs) || 15000, `initializeOrchestrators:attempt${attempt}`);

        // Success
        return;
      } catch (e) {
        lastErr = e;
        this.logger.warn(`Initialization attempt ${attempt} failed`, e);
        // Exponential backoff with jitter
        const base = 500; // ms
        const backoff = Math.min(10000, base * Math.pow(2, attempt));
        const jitter = Math.floor(Math.random() * 300);
        await new Promise(r => setTimeout(r, backoff + jitter));
      }
    }

    // If we reach here, all attempts failed
    this.emit('engine:init:exhausted', { sessionId: this.sessionId, error: getErrorMessage(lastErr), timestamp: new Date() });
    try {
      ErrorReporterService.getInstance().logError('NeuroLearnEngine', `Initialization exhausted: ${getErrorMessage(lastErr)}`, 'ERROR', { sessionId: this.sessionId }, lastErr as Error);
    } catch (e) { /* ignore */ }
    this.emitTelemetry('engine.init.exhausted', { sessionId: this.sessionId, error: getErrorMessage(lastErr), timestamp: new Date() });
    throw lastErr || new Error('Initialization failed after retries');
  }

  /**
   * Register a telemetry sink callback (event, payload) => void. Returns unregister function.
   */
  public registerTelemetrySink(cb: (event: string, payload?: any) => void): () => void {
    if (typeof cb === 'function') this.telemetrySinks.push(cb);
    return () => { this.telemetrySinks = this.telemetrySinks.filter(s => s !== cb); };
  }

  public unregisterTelemetrySink(cb: (event: string, payload?: any) => void): void {
    try { this.telemetrySinks = this.telemetrySinks.filter(s => s !== cb); } catch (e) { /* ignore */ }
  }

  private emitTelemetry(event: string, payload?: any) {
    try { this.telemetrySinks.forEach(s => { try { s(event, payload); } catch (e) {} }); } catch (e) {}
  }

  /**
   * Enter a best-effort degraded mode: only initialize essential core services
   * and disable non-critical orchestrators so the app can still provide
   * limited functionality and surface diagnostics to users.
   */
  private async enterDegradedMode(origError: any): Promise<void> {
    this.logger.warn('Entering degraded mode', { reason: getErrorMessage(origError) });

    // Try to initialize minimal core services
    try {
      await this.initializeCoreServices();
    } catch (e) {
      this.logger.error('Minimal core services failed during degraded mode init', e);
      throw e;
    }

    // Try to initialize storage orchestrator only (most essential)
    try {
      this.storageOrchestrator = new StorageOrchestrator(this.eventSystem, this.dataFlowManager, this.logger);
      await this.storageOrchestrator.initialize();
      this.logger.info('Storage orchestrator initialized in degraded mode');
    } catch (e) {
      this.logger.error('Storage orchestrator failed in degraded mode', e);
      throw e;
    }

    // Mark other orchestrators as disabled to avoid crashes
    this.learningOrchestrator = ({} as any);
    this.financeOrchestrator = ({} as any);
    this.wellnessOrchestrator = ({} as any);
    this.aiOrchestrator = ({} as any);

    // Set initialized flag so engine APIs that can operate in read-only mode work
    this.isInitialized = true;
  }

  /**
   * Execute a command through the orchestration engine
   *
   * This is the main entry point for all operations in the NeuroLearn ecosystem.
   * Commands are routed to appropriate orchestrators based on the command type.
   */
  public async execute<T = any>(
    command: string,
    params: any = {},
    context: Partial<CommandContext> = {}
  ): Promise<CommandResult> {
    if (!this.isInitialized) {
      throw new Error('NeuroLearn Engine not initialized. Call initialize() first.');
    }

    const fullContext: CommandContext = {
      userId: this.config.userId,
      sessionId: this.sessionId,
      timestamp: new Date(),
      priority: 'medium',
      source: 'unknown',
      ...context
    };

    const operationId = this.generateOperationId();
    this.activeOperations++;

    const startTime = Date.now();

    try {
      this.logger.debug(`Executing command: ${command}`, {
        operationId,
        params,
        context: fullContext
      });

      // Start performance profiling
      this.performanceProfiler.startOperation(operationId, command);

      // Check cache first for memoization
      const cacheKey = this.generateCacheKey(command, params, fullContext);
      let result: CommandResult = this.checkCache(cacheKey) || { success: false };

      if (!this.checkCache(cacheKey)) {
        this.cacheStats.totalRequests++;

        // Check if operation should be batched
        if (fullContext.priority === 'low' && this.batchQueue.length < this.batchSize) {
          // Add to batch queue
          result = await new Promise<CommandResult>((resolve, reject) => {
            this.addToBatch(command, params, fullContext, resolve, reject);
          });
        } else {
          // Route command to appropriate orchestrator or worker
          result = await this.routeToWorker(command, params, fullContext);
        }

        // Cache the result if successful
        if (result.success) {
          this.storeInCache(cacheKey, result);
        }
      }

      // Calculate performance metrics
      const executionTime = Date.now() - startTime;
      const memoryUsage = this.performanceProfiler.getMemoryUsage();

      // Complete performance profiling
      this.performanceProfiler.completeOperation(operationId);

      // Emit command completion event
      this.eventSystem.emit('command:completed', {
        command,
        operationId,
        executionTime,
        success: result.success,
        context: fullContext
      });

      const finalResult: CommandResult = {
        ...result,
        performance: {
          executionTime,
          memoryUsage
        }
      };

      this.logger.debug(`Command completed: ${command}`, {
        operationId,
        executionTime: `${executionTime}ms`,
        success: result.success
      });

      return finalResult;

    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.errorHandler.handleError(error, { source: 'NeuroLearnEngine', operation: `execute:${command}`, metadata: { operationId, command, params, context: fullContext } });

      // Emit command error event
      this.eventSystem.emit('command:error', {
        command,
        operationId,
        error: getErrorMessage(error),
        executionTime,
        context: fullContext
      });

      return {
        success: false,
        error: getErrorMessage(error),
        performance: {
          executionTime,
          memoryUsage: this.performanceProfiler.getCurrentMemoryUsage()
        }
      };

    } finally {
      this.activeOperations--;
      this.performanceProfiler.completeOperation(operationId);
    }
  }

  /**
   * Get current engine status
   */
  public getStatus(): EngineStatus {
    try {
      return {
        isInitialized: this.isInitialized,
        isOnline: this.isOnline,
        activeOperations: this.activeOperations,
        lastSyncTime: this.lastSyncTime,
        overallHealth: this.calculateOverallHealth(),
        moduleStatus: {
          storage: this.storageOrchestrator?.getStatus() || 'disabled',
          learning: this.learningOrchestrator?.getStatus() || 'disabled',
          finance: this.financeOrchestrator?.getStatus() || 'disabled',
          wellness: this.wellnessOrchestrator?.getStatus() || 'disabled',
          ai: this.aiOrchestrator?.getStatus() || 'disabled',
          cognitive: this.isInitialized ? 'active' : 'disabled'
        }
      };
    } catch (error) {
      console.error('Error getting engine status:', error);
      return {
        isInitialized: false,
        isOnline: false,
        activeOperations: 0,
        lastSyncTime: null,
        overallHealth: 'critical',
        moduleStatus: {}
      };
    }
  }

  /**
   * Force synchronization across all modules
   */
  public async forceSync(): Promise<void> {
    this.logger.info('Force synchronization initiated');

    try {
      await Promise.all([
        this.storageOrchestrator.sync(),
        this.dataFlowManager.forceSyncAll(),
        // syncState may be added as a compatibility method; call if present
        (this.globalStateManager as any).syncState ? (this.globalStateManager as any).syncState() : Promise.resolve()
      ]);

      this.lastSyncTime = new Date();

      this.eventSystem.emit('sync:completed', {
        timestamp: this.lastSyncTime,
        forced: true
      });

      this.logger.info('Force synchronization completed');

    } catch (error) {
      await ErrorHandler.getInstance().handleError(error, { source: 'NeuroLearnEngine', operation: 'forceSync' });
      throw error;
    }
  }

  /**
   * Shutdown the engine gracefully
   */
  public async shutdown(): Promise<void> {
    this.logger.info('NeuroLearn Engine shutting down...');

    try {
      // Stop background processes
      if (this.autoSyncTimer) {
        clearInterval(this.autoSyncTimer);
        this.autoSyncTimer = null;
      }

      // Complete any pending operations
      await this.waitForOperationsComplete();

      // Shutdown orchestrators
      await Promise.all([
        this.storageOrchestrator?.shutdown(),
        this.learningOrchestrator?.shutdown(),
        this.financeOrchestrator?.shutdown(),
        this.wellnessOrchestrator?.shutdown(),
        this.aiOrchestrator?.shutdown(),
        this.cognitive?.shutdown?.()
      ]);

      // Final sync
      await this.forceSync();

      // Clear state
      this.isInitialized = false;
      this.removeAllListeners();

      this.logger.info('NeuroLearn Engine shutdown completed');

    } catch (error) {
      await ErrorHandler.getInstance().handleError(error, { source: 'NeuroLearnEngine', operation: 'shutdown' });
    }
  }

  // Private Methods

  private async initializeCoreServices(): Promise<void> {
    if (this.coreServicesInitialized) {
      this.logger.debug('Core services already initialized - skipping');
      return;
    }

    this.logger.debug('Initializing core services...');

    // Initialize event system
    this.eventSystem = EventSystem.getInstance();

    // Initialize data flow manager (singleton)
    this.dataFlowManager = DataFlowManager.getInstance();

    // Initialize global state manager (singleton)
    this.globalStateManager = GlobalStateManager.getInstance();

    // Initialize calculation engine
    this.calculationEngine = new CalculationEngine();

    await Promise.all([
      this.dataFlowManager.initialize(this.eventSystem),
      this.globalStateManager.initialize(this.eventSystem),
      this.calculationEngine.initialize()
    ]);

    this.logger.debug('Core services initialized');
    this.coreServicesInitialized = true;
  }

  private async initializeOrchestrators(): Promise<void> {
    if (this.orchestratorsInitialized) {
      this.logger.debug('Orchestrators already initialized - skipping');
      return;
    }

    this.logger.debug('Initializing orchestrators...');

    // Initialize storage orchestrator first (others depend on it)
    this.storageOrchestrator = new StorageOrchestrator(
      this.eventSystem,
      this.dataFlowManager,
      this.logger
    );
    await this.storageOrchestrator.initialize();

    // Initialize other orchestrators in parallel
    const [learning, finance, wellness, ai, cognitive] = await Promise.all([
      new LearningOrchestrator(this.eventSystem, this.storageOrchestrator, this.calculationEngine, this.logger),
      new FinanceOrchestrator(this.eventSystem, this.storageOrchestrator, this.calculationEngine, this.logger),
      new WellnessOrchestrator(this.eventSystem, this.storageOrchestrator, this.calculationEngine, this.logger),
      new AIOrchestrator(this.eventSystem, this.storageOrchestrator, this.calculationEngine, this.logger),
      new CognitiveOrchestrator(this.eventSystem)
    ]);

    // Initialize orchestrators
    await Promise.all([
      learning.initialize(),
      finance.initialize(),
      wellness.initialize(),
      ai.initialize(),
      cognitive.initialize(this.config.userId)
    ]);

    this.learningOrchestrator = learning;
    this.financeOrchestrator = finance;
    this.wellnessOrchestrator = wellness;
    this.aiOrchestrator = ai;
    this.cognitive = cognitive;

    this.logger.info('🚀 NeuroLearn Engine with Cognitive Intelligence ready!');

    this.logger.debug('Orchestrators initialized');
    this.orchestratorsInitialized = true;
  }

  /**
   * Run a function and enforce a timeout. If fn does not resolve within timeoutMs, reject.
   */
  private async runWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number, label?: string): Promise<T> {
    let timer: NodeJS.Timeout | null = null;
    try {
      return await Promise.race([
        fn(),
        new Promise<T>((_, rej) => {
          timer = setTimeout(() => rej(new Error(`Timeout: ${label ?? 'operation'} exceeded ${timeoutMs}ms`)), timeoutMs);
        })
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private setupEventListeners(): void {
    this.logger.debug('Setting up event listeners...');

    // Listen for cross-module events
    this.eventSystem.on('cognitive:load:high', this.handleHighCognitiveLoad.bind(this));
    this.eventSystem.on('learning:session:complete', this.handleLearningComplete.bind(this));
    this.eventSystem.on('storage:sync:needed', this.handleSyncNeeded.bind(this));
    this.eventSystem.on('error:critical', this.handleCriticalError.bind(this));

    // Listen for performance events
    this.eventSystem.on('performance:warning', this.handlePerformanceWarning.bind(this));
    this.eventSystem.on('performance:critical', this.handlePerformanceCritical.bind(this));

    this.logger.debug('Event listeners set up');
  }

  private setupNetworkMonitoring(): void {
    // Simplified network monitoring for React Native compatibility
    this.logger.debug('Network monitoring simplified for React Native');

    // Assume online by default
    this.isOnline = true;

    // Could be enhanced with proper React Native network detection later
  }

  private initializeEngineWorker(): void {
    // Skip Web Worker initialization in React Native environments
    if (Platform.OS !== 'web') {
      this.logger.info('Web Workers not supported in React Native, skipping worker initialization');
      return;
    }

    try {
      // Initialize Web Worker for heavy computations
      if (typeof Worker !== 'undefined') {
        this.engineWorker = new Worker('./workers/engineWorker.js');

        this.engineWorker.onmessage = (event: MessageEvent<EngineWorkerResponse>) => {
          const { id, type, data, error } = event.data;
          const promise = this.workerPromises.get(id);

          if (promise) {
            this.workerPromises.delete(id);
            clearTimeout(promise.timeout);

            if (type === 'operation_complete') {
              promise.resolve(data);
            } else {
              promise.reject(new Error(error || 'Worker operation failed'));
            }
          }
        };

        this.engineWorker.onerror = (error) => {
          this.logger.error('Engine worker error', error);
          // Terminate failed worker
          if (this.engineWorker) {
            this.engineWorker.terminate();
            this.engineWorker = null;
          }
        };

        this.logger.info('Engine worker initialized successfully');
      } else {
        this.logger.warn('Web Workers not supported in this environment');
      }
    } catch (error) {
      this.logger.error('Failed to initialize engine worker', error);
    }
  }

  private startBackgroundProcesses(): void {
    // Auto-sync timer
    if (this.config.autoSyncInterval > 0) {
      this.autoSyncTimer = setInterval(async () => {
        try {
          await this.forceSync();
        } catch (error) {
          this.logger.warn('Auto-sync failed', error);
        }
      }, this.config.autoSyncInterval * 60 * 1000);
    }

    // Performance monitoring
    if (this.config.enablePerformanceMonitoring) {
      this.performanceProfiler.startMonitoring();
    }
  }

  private async routeCommand(
    command: string,
    params: any,
    context: CommandContext
  ): Promise<CommandResult> {
    const [domain, ...actionParts] = command.split(':');
    const action = actionParts.join(':');

    switch (domain) {
      case 'storage':
        return await this.storageOrchestrator.execute(action, params, context);

      case 'learning':
        return await this.learningOrchestrator.execute(action, params, context);

      case 'finance':
        return await this.financeOrchestrator.execute(action, params, context);

      case 'wellness':
        return await this.wellnessOrchestrator.execute(action, params, context);

      case 'ai':
        return await this.aiOrchestrator.execute(action, params, context);

      case 'cognitive':
        return await this.handleCognitiveCommand(action, params, context);

      case 'system':
        return await this.executeSystemCommand(action, params, context);

      default:
        throw new Error(`Unknown command domain: ${domain}`);
    }
  }

  private async handleCognitiveCommand(
    action: string,
    params: any,
    context: CommandContext
  ): Promise<CommandResult> {
    switch (action) {
      case 'get-state':
        return {
          success: true,
          data: this.cognitive.getCurrentMetrics()
        };

      case 'get-analytics':
        return {
          success: true,
          data: this.cognitive.getRecentData()
        };

      case 'refresh-state':
        await this.cognitive.refreshState();
        return {
          success: true,
          data: { message: 'Cognitive state refreshed' }
        };

      case 'get-health':
        return {
          success: true,
          data: this.cognitive.getSystemHealth()
        };

      default:
        return {
          success: false,
          error: `Unknown cognitive action: ${action}`
        };
    }
  }

  private async executeSystemCommand(
    action: string,
    params: any,
    context: CommandContext
  ): Promise<CommandResult> {
    switch (action) {
      case 'status':
        return { success: true, data: this.getStatus() };

      case 'sync':
        await this.forceSync();
        return { success: true, data: { message: 'Sync completed' } };

      case 'calculate':
        const result = await this.calculationEngine.calculate(params.type, params.data);
        return { success: true, data: result };

      case 'optimize':
        await this.optimizePerformance();
        return { success: true, data: { message: 'Performance optimization completed' } };

      case 'get-cache-status':
        return this.getCacheStatus(context);

      case 'get-worker-status':
        return this.getWorkerStatus(context);

      case 'health-check':
        return this.performHealthCheck();

      default:
        throw new Error(`Unknown system action: ${action}`);
    }
  }

  // Event Handlers

  private async handleHighCognitiveLoad(event: NeuroLearnEvent): Promise<void> {
    this.logger.warn('High cognitive load detected', event.data);

    // Pause intensive tasks
    await this.learningOrchestrator.pauseIntensiveTasks();

    // Reduce soundscape intensity
    await this.wellnessOrchestrator.adjustSoundscape('reduce');

    // Save session progress immediately
    await this.storageOrchestrator.saveSessionProgress();

    // Log pattern for AI analysis
    await this.aiOrchestrator.logCognitivePattern(event.data);
  }

  private async handleLearningComplete(event: NeuroLearnEvent): Promise<void> {
    this.logger.info('Learning session completed', event.data);

    // Update progress metrics
    await this.calculationEngine.updateLearningMetrics(event.data);

    // Trigger AI analysis
    await this.aiOrchestrator.analyzeLearningSession(event.data);

    // Update wellness correlations
    await this.wellnessOrchestrator.updateLearningCorrelations(event.data);
  }

  private async handleSyncNeeded(event: NeuroLearnEvent): Promise<void> {
    if (this.isOnline) {
      try {
        await this.forceSync();
      } catch (error) {
        this.logger.warn('Sync failed during sync needed event', error);
      }
    }
  }

  private async handleCriticalError(event: NeuroLearnEvent): Promise<void> {
    this.logger.error('Critical error occurred', event.data);

    // Attempt recovery
    try {
      await this.attemptRecovery(event.data.error);
    } catch (recoveryError) {
      this.logger.error('Recovery failed', recoveryError);
    }
  }

  private async handlePerformanceWarning(event: NeuroLearnEvent): Promise<void> {
    this.logger.warn('Performance warning', event.data);
    await this.optimizePerformance();
  }

  private async handlePerformanceCritical(event: NeuroLearnEvent): Promise<void> {
    this.logger.error('Critical performance issue', event.data);

    // Aggressive optimization
    await this.optimizePerformance();

    // Consider reducing functionality
    await this.reduceFunctionality();
  }

  // Utility Methods

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate worker payloads to ensure cross-domain operations receive well-formed data.
   * Uses zod schemas for strict validation and throws a descriptive error on failure.
   */
  private validateWorkerPayload(operationType: string, data: any): void {
    // Simple schema map for critical worker types
    const crossDomainSchema = z.object({
      sourceDomain: z.string().min(1),
      targetDomain: z.string().min(1),
      correlationWindowMs: z.number().int().positive().optional(),
      sampleSize: z.number().int().positive().optional(),
      payloadHash: z.string().optional(),
      items: z.array(z.any()).optional()
    });

    const predictableSchema = z.object({
      userId: z.string().min(1),
      timestamp: z.number().optional(),
      data: z.any().optional()
    });

    try {
      if (operationType === 'cross_domain_correlation' || operationType.endsWith('cross_domain_correlation')) {
        crossDomainSchema.parse(data);
        return;
      }

      // Small validation for other worker types
      if (operationType.includes('predict') || operationType.includes('analyze') || operationType.includes('optimize')) {
        predictableSchema.parse(data || {});
        return;
      }

      // Default: no strict validation
    } catch (e) {
      // Wrap zod error into a friendly error
      const message = e?.message || 'Worker payload validation failed';
      const err = new Error(`Invalid worker payload for ${operationType}: ${message}`);
      // Attach original error for telemetry
      (err as any)._original = e;
      throw err;
    }
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private calculateOverallHealth(): 'excellent' | 'good' | 'warning' | 'critical' {
    try {
      if (!this.isInitialized || this.activeOperations > 50) {
        return 'critical';
      }

      // Check module status without calling getStatus() to avoid circular reference
      const moduleErrors = [
        this.storageOrchestrator?.getStatus() === 'error',
        this.learningOrchestrator?.getStatus() === 'error',
        this.financeOrchestrator?.getStatus() === 'error',
        this.wellnessOrchestrator?.getStatus() === 'error',
        this.aiOrchestrator?.getStatus() === 'error'
      ].filter(Boolean).length;

      if (moduleErrors > 2) return 'critical';
      if (moduleErrors > 0) return 'warning';
      if (this.activeOperations > 20) return 'warning';
      if (this.isOnline && this.lastSyncTime &&
          Date.now() - this.lastSyncTime.getTime() > 24 * 60 * 60 * 1000) {
        return 'warning';
      }

      return 'excellent';
    } catch (error) {
      console.error('Error calculating health:', error);
      return 'critical';
    }
  }

  private async waitForOperationsComplete(timeout = 30000): Promise<void> {
    const startTime = Date.now();

    while (this.activeOperations > 0 && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (this.activeOperations > 0) {
      this.logger.warn(`${this.activeOperations} operations still active after timeout`);
    }
  }

  private async optimizePerformance(): Promise<void> {
    this.logger.info('Optimizing performance...');

    // Clear caches
    await this.storageOrchestrator.clearCaches();

    // Optimize calculation engine
    await this.calculationEngine.optimize();

    // Garbage collect
    if (global.gc) {
      global.gc();
    }
  }

  private async reduceFunctionality(): Promise<void> {
    this.logger.warn('Reducing functionality due to performance issues');

    // Disable non-essential features
    await Promise.all([
      this.aiOrchestrator.reduceProcessing(),
      this.learningOrchestrator.simplifyOperations(),
      this.wellnessOrchestrator.pauseNonEssential()
    ]);
  }

  private async attemptRecovery(error: any): Promise<void> {
    this.logger.info('Attempting recovery from critical error', error);

    // Try to reinitialize failed components
    try {
      if (error.module === 'storage') {
        await this.storageOrchestrator.reinitialize();
      } else if (error.module === 'learning') {
        await this.learningOrchestrator.reinitialize();
      }
      // Add more recovery strategies as needed

    } catch (recoveryError) {
      this.logger.error('Recovery attempt failed', recoveryError);
      throw recoveryError;
    }
  }

  private async getCacheStatus(context: CommandContext): Promise<CommandResult> {
    try {
      // Get cache information from StorageOrchestrator
      const cacheInfo = await this.storageOrchestrator.execute('get-cache-info', {}, context);

      return {
        success: true,
        data: {
          keyCount: cacheInfo?.data?.keyCount || 0,
          totalSize: cacheInfo?.data?.totalSize || 0,
          hitRate: cacheInfo?.data?.hitRate || 0,
          lastAccess: cacheInfo?.data?.lastAccess || null,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Cache status failed: ${error}`,
      };
    }
  }

  private async getWorkerStatus(context: CommandContext): Promise<CommandResult> {
    try {
      // Check if physics worker is responsive
      const workerStatus = await this.checkPhysicsWorkerStatus();

      return {
        success: true,
        data: {
          status: workerStatus.isResponsive ? 'active' : 'error',
          lastPing: workerStatus.lastPing,
          tasksInQueue: workerStatus.queueSize || 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Worker status check failed: ${error}`,
        data: { status: 'error' },
      };
    }
  }

  private async performHealthCheck(): Promise<CommandResult> {
    const health = {
      engine: this.isInitialized,
      orchestrators: {
        storage: this.storageOrchestrator?.getStatus() !== 'disabled',
        learning: this.learningOrchestrator?.getStatus() !== 'disabled',
        finance: this.financeOrchestrator?.getStatus() !== 'disabled',
        wellness: this.wellnessOrchestrator?.getStatus() !== 'disabled',
        ai: this.aiOrchestrator?.getStatus() !== 'disabled',
      },
      network: this.isOnline,
      performance: {
        activeOperations: this.activeOperations,
        memoryUsage: this.performanceProfiler.getMemoryUsage(),
      },
    };

    const overallHealth = this.calculateOverallHealth();

    return {
      success: true,
      data: {
        ...health,
        overallHealth,
        timestamp: new Date(),
      },
    };
  }

  private async checkPhysicsWorkerStatus(): Promise<{
    isResponsive: boolean;
    lastPing: Date | null;
    queueSize: number;
  }> {
    // Implementation would ping the physics worker
    // For now, return mock data
    return {
      isResponsive: true,
      lastPing: new Date(),
      queueSize: 0,
    };
  }

  // Batched Processing Methods

  /**
   * Add operation to batch queue
   */
  private addToBatch(
    command: string,
    params: any,
    context: CommandContext,
    resolve: Function,
    reject: Function
  ): void {
    this.batchQueue.push({ command, params, context, resolve, reject });

    // Start batch timer if not already running
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.processBatch(), this.batchDelay);
    }

    // Process immediately if batch is full
    if (this.batchQueue.length >= this.batchSize) {
      this.processBatch();
    }
  }

  /**
   * Process batched operations
   */
  private async processBatch(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.batchQueue.length === 0) return;

    const batch = this.batchQueue.splice(0);
    this.logger.debug(`Processing batch of ${batch.length} operations`);

    // Process operations in parallel
    const promises = batch.map(async (operation) => {
      try {
        const result = await this.routeCommand(operation.command, operation.params, operation.context);
        operation.resolve(result);
      } catch (error) {
        operation.reject(error);
      }
    });

    await Promise.allSettled(promises);
  }

  // Memoization Methods

  /**
   * Generate cache key for command
   */
  private generateCacheKey(command: string, params: any, context: CommandContext): string {
    const keyData = {
      command,
      params: JSON.stringify(params),
      userId: context.userId,
      priority: context.priority,
    };
    // Use cross-platform base64 helper to avoid runtime issues in React Native
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { base64Encode } = require('../utils/base64');
    return base64Encode(JSON.stringify(keyData));
  }

  /**
   * Check cache for command result
   */
  private checkCache(cacheKey: string): CommandResult | null {
    const cached = this.commandCache.get(cacheKey);
    if (!cached) {
      this.cacheStats.misses++;
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.commandCache.delete(cacheKey);
      this.cacheStats.misses++;
      return null;
    }

    cached.hits++;
    cached.lastAccessed = now;
    this.cacheStats.hits++;

    this.logger.debug(`Cache hit for key: ${cacheKey.substring(0, 16)}...`);
    return cached.result;
  }

  /**
   * Store result in cache
   */
  private storeInCache(cacheKey: string, result: CommandResult, ttl?: number): void {
    const cacheEntry = {
      result,
      timestamp: Date.now(),
      ttl: ttl || this.defaultCacheTtl,
      hits: 0,
      lastAccessed: Date.now()
    };

    this.commandCache.set(cacheKey, cacheEntry);

    // Clean up expired entries periodically
    if (this.commandCache.size > 100) {
      this.cleanupExpiredCache();
    }
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.commandCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.commandCache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  private getCacheStats(): { hits: number; misses: number; totalRequests: number; hitRate: number; size: number } {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    return {
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      totalRequests: total,
      hitRate: total > 0 ? this.cacheStats.hits / total : 0,
      size: this.commandCache.size
    };
  }

  // Web Worker Methods

  /**
   * Execute operation in Web Worker
   */
  private async executeInWorker(operationType: string, data: any): Promise<any> {
    if (!this.engineWorker) {
      throw new Error('Engine worker not initialized');
    }
    // Validate certain worker operation payloads to prevent cross-domain data corruption
    try {
      this.validateWorkerPayload(operationType, data);
    } catch (validationError) {
      this.logger.warn('Worker payload validation failed', { operationType, error: validationError });
      throw validationError;
    }

    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substr(2, 9);
      const timeout = setTimeout(() => {
        this.workerPromises.delete(id);
        reject(new Error(`Worker operation timeout: ${operationType}`));
      }, 30000); // 30 second timeout

      this.workerPromises.set(id, { resolve, reject, timeout });

      const message = createEngineMessage(operationType as any, data, id);
      this.engineWorker!.postMessage(message);
    });
  }

  /**
   * Route heavy operations to Web Worker
   */
  private async routeToWorker(command: string, params: any, context: CommandContext): Promise<CommandResult> {
    const [domain, action] = command.split(':');
    const workerType = `${domain}_${action}`;

    if (this.workerSupportedTypes.has(workerType)) {
      try {
        // Validate payload for cross-domain operations prior to delegating to worker
        this.validateWorkerPayload(workerType, params);
        const result = await this.executeInWorker(workerType, params);
        return { success: true, data: result };
      } catch (error) {
        this.logger.warn(`Worker operation failed for ${workerType}, falling back to main thread`, error);
        // Fall back to normal routing
      }
    }

    // Fall back to normal routing
    return await this.routeCommand(command, params, context);
  }
}

export default NeuroLearnEngine;

// Safe accessor: returns the existing instance or null if engine was not initialized
export function getExistingNeuroLearnEngine(): NeuroLearnEngine | null {
  // Access the private static via the class (TypeScript allows access here)
  // Return null if not yet created to avoid throwing in callers that only
  // want to probe whether an instance exists.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyClass = NeuroLearnEngine as any;
  return anyClass.instance ?? null;
}
