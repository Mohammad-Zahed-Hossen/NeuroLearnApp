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
import NetInfo from '@react-native-community/netinfo';

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

// Utilities
import { PerformanceProfiler } from './utils/PerformanceProfiler';
import { ErrorHandler, getErrorMessage } from './utils/ErrorHandler';
import { Logger } from './utils/Logger';

// Types
export interface EngineConfig {
  userId: string;
  enableDebugMode: boolean;
  enablePerformanceMonitoring: boolean;
  autoSyncInterval: number; // in minutes
  maxRetryAttempts: number;
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
  private isOnline = true;
  private activeOperations = 0;
  private lastSyncTime: Date | null = null;
  private sessionId: string;
  private autoSyncTimer: NodeJS.Timeout | null = null;

  private constructor(config: EngineConfig) {
    super();
    this.config = config;
    this.sessionId = this.generateSessionId();

  // Initialize utilities first
  this.logger = new Logger('NeuroLearnEngine');
  this.errorHandler = ErrorHandler.getInstance();
  this.performanceProfiler = PerformanceProfiler.getInstance();

    this.logger.info('NeuroLearn Engine initializing...', { sessionId: this.sessionId });
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
    const startTime = Date.now();

    try {
      this.logger.info('Starting engine initialization...');

      // Initialize core systems
      await this.initializeCoreServices();

      // Initialize orchestrators
      await this.initializeOrchestrators();

      // Setup event listeners
      this.setupEventListeners();

      // Setup network monitoring
      this.setupNetworkMonitoring();

      // Start background processes
      this.startBackgroundProcesses();

      this.isInitialized = true;
      const initTime = Date.now() - startTime;

      this.logger.info('NeuroLearn Engine initialized successfully', {
        initializationTime: `${initTime}ms`,
        sessionId: this.sessionId
      });

      // Emit initialization complete event
      this.emit('engine:initialized', {
        sessionId: this.sessionId,
        initializationTime: initTime,
        timestamp: new Date()
      });

    } catch (error) {
      this.errorHandler.handleError(error, { source: 'NeuroLearnEngine', operation: 'initialize' });
      throw error;
    }
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

      // Route command to appropriate orchestrator
      const result = await this.routeCommand(command, params, fullContext);

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
        cognitive: this.cognitive?.getStatus?.() || 'disabled'
      }
    };
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
  }

  private async initializeOrchestrators(): Promise<void> {
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
    // Monitor network connectivity
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected || false;

      if (wasOnline && !this.isOnline) {
        this.eventSystem.emit('network:offline', { timestamp: new Date() });
        this.logger.warn('Network went offline');
      } else if (!wasOnline && this.isOnline) {
        this.eventSystem.emit('network:online', { timestamp: new Date() });
        this.logger.info('Network came online');

        // Trigger sync when back online
        setTimeout(() => this.forceSync(), 1000);
      }
    });
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

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private calculateOverallHealth(): 'excellent' | 'good' | 'warning' | 'critical' {
    const status = this.getStatus();

    if (!status.isInitialized || status.activeOperations > 50) {
      return 'critical';
    }

    const errorModules = Object.values(status.moduleStatus).filter(s => s === 'error').length;

    if (errorModules > 2) return 'critical';
    if (errorModules > 0) return 'warning';
    if (status.activeOperations > 20) return 'warning';
    if (status.isOnline && status.lastSyncTime &&
        Date.now() - status.lastSyncTime.getTime() > 24 * 60 * 60 * 1000) {
      return 'warning';
    }

    return 'excellent';
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
}

export default NeuroLearnEngine;
