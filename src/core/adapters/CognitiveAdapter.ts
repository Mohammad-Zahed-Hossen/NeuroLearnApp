/**
 * CognitiveAdapter - Cognitive State Integration Adapter
 *
 * Adapter for integrating with CognitiveAuraService and other cognitive
 * monitoring services to provide unified cognitive state information
 * to the orchestration engine.
 */

import { Logger } from '../utils/Logger';
import CognitiveAuraService from '../../services/cognitive/CognitiveAuraCompat';
import ContextSensorService from '../../services/context/ContextSensorCompat';

export interface CognitiveState {
  cognitiveLoad: number;
  focusLevel: number;
  fatigueLevel: number;
  stressLevel: number;
  flowState: number;
  attentionSpan: number;
  mentalClarity: number;
  timestamp: Date;
  contextFactors: any;
}

export interface CognitiveAdapterConfig {
  enableRealTimeMonitoring: boolean;
  updateInterval: number; // milliseconds
  enableContextSensors: boolean;
  enablePredictiveAnalysis: boolean;
}

/**
 * Cognitive Adapter
 *
 * Provides unified access to cognitive monitoring services.
 */
export class CognitiveAdapter {
  private logger: Logger;
  private cognitiveAuraService: any;
  private contextSensorService: any;
  private config: CognitiveAdapterConfig;

  private isInitialized = false;
  private currentState: CognitiveState | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<CognitiveAdapterConfig>) {
    this.logger = new Logger('CognitiveAdapter');
    this.config = {
      enableRealTimeMonitoring: true,
      updateInterval: 5000, // 5 seconds
      enableContextSensors: true,
      enablePredictiveAnalysis: true,
      ...config
    };
  }

  /**
   * Initialize the cognitive adapter
   */
  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Cognitive Adapter...');

      // Initialize services
      this.cognitiveAuraService = CognitiveAuraService.getInstance();
      this.contextSensorService = ContextSensorService;

      await Promise.all([
        this.cognitiveAuraService.initialize(),
        this.contextSensorService.initialize()
      ]);

      // Start real-time monitoring if enabled
      if (this.config.enableRealTimeMonitoring) {
        this.startRealTimeMonitoring();
      }

      this.isInitialized = true;
      this.logger.info('Cognitive Adapter initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize Cognitive Adapter', error);
      throw error;
    }
  }

  /**
   * Get current cognitive state
   */
  public async getCurrentState(): Promise<CognitiveState> {
    if (!this.isInitialized) {
      throw new Error('CognitiveAdapter not initialized');
    }

    try {
      const cognitiveData = await this.cognitiveAuraService.getCurrentState();
      const contextData = this.config.enableContextSensors
        ? await this.contextSensorService.getCurrentContext()
        : {};

      const state: CognitiveState = {
        cognitiveLoad: cognitiveData.cognitiveLoad || 0,
        focusLevel: cognitiveData.focusLevel || 0,
        fatigueLevel: cognitiveData.fatigueLevel || 0,
        stressLevel: cognitiveData.stressLevel || 0,
        flowState: cognitiveData.flowState || 0,
        attentionSpan: cognitiveData.attentionSpan || 0,
        mentalClarity: cognitiveData.mentalClarity || 0,
        timestamp: new Date(),
        contextFactors: contextData
      };

      this.currentState = state;
      return state;

    } catch (error) {
      this.logger.error('Failed to get current cognitive state', error);
      throw error;
    }
  }

  /**
   * Get cognitive load specifically
   */
  public async getCognitiveLoad(): Promise<number> {
    const state = await this.getCurrentState();
    return state.cognitiveLoad;
  }

  /**
   * Get environmental context for cognitive optimization
   */
  public async getEnvironmentalContext(): Promise<any> {
    if (!this.config.enableContextSensors) {
      return {};
    }

    try {
      return await this.contextSensorService.getEnvironmentalContext();
    } catch (error) {
      this.logger.warn('Failed to get environmental context', error);
      return {};
    }
  }

  /**
   * Get cognitive patterns over time
   */
  public async getPatterns(timeframe: string = '24h'): Promise<any> {
    try {
      return await this.cognitiveAuraService.getPatterns(timeframe);
    } catch (error) {
      this.logger.error('Failed to get cognitive patterns', error);
      throw error;
    }
  }

  /**
   * Predict cognitive state changes
   */
  public async predictStateChanges(horizon: number = 3600): Promise<any> {
    if (!this.config.enablePredictiveAnalysis) {
      return null;
    }

    try {
      return await this.cognitiveAuraService.predictCognitiveChanges({
        horizon,
        includeContext: this.config.enableContextSensors
      });
    } catch (error) {
      this.logger.warn('Failed to predict cognitive state changes', error);
      return null;
    }
  }

  /**
   * Optimize cognitive state for specific task
   */
  public async optimizeForTask(taskType: string, duration: number): Promise<any> {
    try {
      const currentState = await this.getCurrentState();

      return await this.cognitiveAuraService.optimizeForTask({
        taskType,
        duration,
        currentState,
        environmentalFactors: await this.getEnvironmentalContext()
      });
    } catch (error) {
      this.logger.error('Failed to optimize for task', error);
      throw error;
    }
  }

  /**
   * Enable high-frequency monitoring
   */
  public enableHighFrequencyMonitoring(duration: number = 30 * 60 * 1000): Promise<void> {
    return new Promise((resolve) => {
      const originalInterval = this.config.updateInterval;
      this.config.updateInterval = 1000; // 1 second

      this.restartMonitoring();

      setTimeout(() => {
        this.config.updateInterval = originalInterval;
        this.restartMonitoring();
        resolve();
      }, duration);
    });
  }

  /**
   * Shutdown the adapter
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down Cognitive Adapter...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isInitialized = false;
    this.logger.info('Cognitive Adapter shutdown completed');
  }

  // Private Methods

  private startRealTimeMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.getCurrentState();
      } catch (error) {
        this.logger.warn('Real-time monitoring update failed', error);
      }
    }, this.config.updateInterval);
  }

  private restartMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    if (this.config.enableRealTimeMonitoring) {
      this.startRealTimeMonitoring();
    }
  }
}

export default CognitiveAdapter;
