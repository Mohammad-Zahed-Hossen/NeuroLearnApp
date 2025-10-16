/**
 * LearningOrchestrator - Learning Intelligence Coordinator
 *
 * Orchestrates all learning-related operations including spaced repetition,
 * neural mind mapping, focus sessions, memory palaces, and cross-domain
 * learning optimization with cognitive load management.
 */

import { EventSystem, NeuroLearnEvent, EVENT_TYPES } from '../EventSystem';
import { StorageOrchestrator } from './StorageOrchestrator';
import { CalculationEngine } from '../CalculationEngine';
import { Logger } from '../utils/Logger';
import { getErrorMessage } from '../utils/ErrorHandler';
import { CommandContext, CommandResult } from '../NeuroLearnEngine';

// Learning Services
import SpacedRepetitionCompat from '../../services/learning/SpacedRepetitionCompat';
import { MindMapGenerator } from '../../services/learning/MindMapGeneratorService';
import FocusTimerCompat from '../../services/learning/FocusTimerCompat';
import CognitiveAuraCompat from '../../services/integrations/cognitive/CognitiveAuraCompat';

export interface LearningConfig {
  maxCognitiveLoad: number;
  adaptiveDifficultyEnabled: boolean;
  crossDomainLearningEnabled: boolean;
  focusOptimizationEnabled: boolean;
  maxConcurrentSessions: number;
}

export interface LearningMetrics {
  totalStudyTime: number;
  retentionRate: number;
  cognitiveLoadAverage: number;
  focusEfficiency: number;
  knowledgeNodesCreated: number;
  sessionCompletionRate: number;
  optimalLearningHours: string[];
}

export interface LearningSession {
  id: string;
  type: 'flashcards' | 'mindmap' | 'focus' | 'memory-palace' | 'logic-training';
  startTime: Date;
  endTime?: Date;
  cognitiveLoad: number;
  performance: number;
  interruptions: number;
  contextFactors: any;
}

/**
 * Learning Orchestrator
 *
 * Central coordinator for all learning operations and cross-module intelligence.
 */
export class LearningOrchestrator {
  private eventSystem: EventSystem;
  private storageOrchestrator: StorageOrchestrator;
  private calculationEngine: CalculationEngine;
  private logger: Logger;

  // Learning Services
  private spacedRepetition: any;
  private mindMapGenerator!: MindMapGenerator;
  private focusTimer: any;
  private cognitiveAura: any;

  // Configuration
  private config: LearningConfig = {
    maxCognitiveLoad: 0.8,
    adaptiveDifficultyEnabled: true,
    crossDomainLearningEnabled: true,
    focusOptimizationEnabled: true,
    maxConcurrentSessions: 3
  };

  // State
  private isInitialized = false;
  private activeSessions: Map<string, LearningSession> = new Map();
  private isPaused = false;
  private metrics: LearningMetrics = {
    totalStudyTime: 0,
    retentionRate: 0,
    cognitiveLoadAverage: 0,
    focusEfficiency: 0,
    knowledgeNodesCreated: 0,
    sessionCompletionRate: 0,
    optimalLearningHours: []
  };

  constructor(
    eventSystem: EventSystem,
    storageOrchestrator: StorageOrchestrator,
    calculationEngine: CalculationEngine,
    logger: Logger,
    config?: Partial<LearningConfig>
  ) {
    this.eventSystem = eventSystem;
    this.storageOrchestrator = storageOrchestrator;
    this.calculationEngine = calculationEngine;
    this.logger = logger;

    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Initialize the learning orchestrator
   */
  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Learning Orchestrator...');

      // Initialize learning services
  this.spacedRepetition = SpacedRepetitionCompat.getInstance();
  this.mindMapGenerator = MindMapGenerator.getInstance();
  this.focusTimer = FocusTimerCompat.getInstance();
  // Use compat shim for CognitiveAura to avoid API drift
  this.cognitiveAura = CognitiveAuraCompat;

      // Setup event listeners
      this.setupEventListeners();

      // Load historical metrics
      await this.loadMetrics();

      this.isInitialized = true;
      this.logger.info('Learning Orchestrator initialized successfully');

      this.eventSystem.emitEvent(
        'learning:orchestrator:initialized',
        'LearningOrchestrator',
        { metrics: this.metrics },
        'medium'
      );

    } catch (error) {
      this.logger.error('Failed to initialize Learning Orchestrator', error);
      throw error;
    }
  }

  // Backwards-compat: reinitialize alias
  public async reinitialize(): Promise<void> {
    return this.initialize();
  }

  /**
   * Execute learning commands
   */
  public async execute(
    action: string,
    params: any,
    context: CommandContext
  ): Promise<CommandResult> {
    if (!this.isInitialized) {
      throw new Error('LearningOrchestrator not initialized');
    }

    try {
      switch (action) {
        case 'start-session':
          return await this.handleStartSession(params, context);

        case 'end-session':
          return await this.handleEndSession(params, context);

        case 'review-flashcards':
          return await this.handleReviewFlashcards(params, context);

        case 'generate-mindmap':
          return await this.handleGenerateMindmap(params, context);

        case 'start-focus':
          return await this.handleStartFocus(params, context);

        case 'analyze-performance':
          return await this.handleAnalyzePerformance(params, context);

        case 'optimize-schedule':
          return await this.handleOptimizeSchedule(params, context);

        case 'get-recommendations':
          return await this.handleGetRecommendations(params, context);

        case 'pause-intensive':
          return await this.handlePauseIntensive(params, context);

        case 'resume-operations':
          return await this.handleResumeOperations(params, context);

        case 'metrics':
          await this.updateMetrics();
          return { success: true, data: this.metrics };

        default:
          throw new Error(`Unknown learning action: ${action}`);
      }
    } catch (error) {
      this.logger.error(`Learning operation failed: ${action}`, error);
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Pause intensive tasks (called during high cognitive load)
   */
  public async pauseIntensiveTasks(): Promise<void> {
    if (this.isPaused) return;

    this.logger.info('Pausing intensive learning tasks due to high cognitive load');
    this.isPaused = true;

    // Pause active focus sessions
    for (const session of this.activeSessions.values()) {
      if (session.type === 'focus' && !session.endTime) {
        await this.pauseSession(session.id);
      }
    }

    // Reduce spaced repetition difficulty
    await this.spacedRepetition.reduceDifficulty();

    this.eventSystem.emitEvent(
      EVENT_TYPES.LEARNING_SESSION_COMPLETED,
      'LearningOrchestrator',
      { action: 'paused_intensive', reason: 'high_cognitive_load' },
      'medium'
    );
  }

  /**
   * Simplify operations for performance optimization
   */
  public async simplifyOperations(): Promise<void> {
    this.logger.info('Simplifying learning operations for performance');

    // Reduce mind map complexity
    await this.mindMapGenerator.setSimplifiedMode(true);

    // Pause background calculations
    await this.cognitiveAura.pauseBackgroundAnalysis();

    // Limit concurrent sessions
    const currentSessions = Array.from(this.activeSessions.values())
      .filter(s => !s.endTime);

    if (currentSessions.length > 1) {
      // Keep only the most important session
      const primarySession = currentSessions.reduce((prev, curr) =>
        prev.performance > curr.performance ? prev : curr
      );

      for (const session of currentSessions) {
        if (session.id !== primarySession.id) {
          await this.endSession(session.id, 'performance_optimization');
        }
      }
    }
  }

  /**
   * Get current learning status
   */
  public getStatus(): 'active' | 'idle' | 'error' | 'disabled' {
    if (!this.isInitialized) return 'disabled';
    if (this.isPaused) return 'idle';

    const activeSessions = Array.from(this.activeSessions.values())
      .filter(s => !s.endTime);

    if (activeSessions.length > 0) return 'active';
    return 'idle';
  }

  /**
   * Get learning metrics
   */
  public getMetrics(): LearningMetrics {
    return { ...this.metrics };
  }

  /**
   * Shutdown the orchestrator
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down Learning Orchestrator...');

    try {
      // End all active sessions
      for (const session of this.activeSessions.values()) {
        if (!session.endTime) {
          await this.endSession(session.id, 'shutdown');
        }
      }

      // Save final metrics
      await this.saveMetrics();

      this.isInitialized = false;
      this.logger.info('Learning Orchestrator shutdown completed');

    } catch (error) {
      this.logger.error('Learning Orchestrator shutdown error', error);
    }
  }

  // Private Methods

  private setupEventListeners(): void {
    // Listen for cognitive load changes
    this.eventSystem.subscribe(EVENT_TYPES.COGNITIVE_LOAD_HIGH, async (event) => {
      await this.handleHighCognitiveLoad(event);
    });

    this.eventSystem.subscribe(EVENT_TYPES.COGNITIVE_LOAD_NORMAL, async () => {
      await this.handleNormalCognitiveLoad();
    });

    // Listen for focus events
    this.eventSystem.subscribe(EVENT_TYPES.FOCUS_INTERRUPTION, async (event) => {
      await this.handleFocusInterruption(event);
    });

    // Listen for wellness correlations
    this.eventSystem.subscribe('wellness:correlation:update', async (event) => {
      await this.updateLearningCorrelations(event.data);
    });
  }

  // Command Handlers

  private async handleStartSession(params: any, context: CommandContext): Promise<CommandResult> {
    const { type, config, duration } = params;

    try {
      // Check if we can start a new session
      if (this.activeSessions.size >= this.config.maxConcurrentSessions) {
        throw new Error('Maximum concurrent sessions reached');
      }

      if (this.isPaused && type !== 'focus') {
        throw new Error('Learning operations are paused due to high cognitive load');
      }

      // Create new session
      const session: LearningSession = {
        id: this.generateSessionId(),
        type,
        startTime: new Date(),
        cognitiveLoad: await this.getCurrentCognitiveLoad(),
        performance: 0,
        interruptions: 0,
        contextFactors: await this.getContextFactors()
      };

      this.activeSessions.set(session.id, session);

      // Initialize session based on type
      let result;
      switch (type) {
        case 'flashcards':
          result = await this.startFlashcardSession(session, config);
          break;
        case 'mindmap':
          result = await this.startMindmapSession(session, config);
          break;
        case 'focus':
          result = await this.startFocusSession(session, duration);
          break;
        default:
          throw new Error(`Unknown session type: ${type}`);
      }

      this.eventSystem.emitEvent(
        EVENT_TYPES.LEARNING_SESSION_STARTED,
        'LearningOrchestrator',
        { sessionId: session.id, type, context: session.contextFactors },
        'medium'
      );

      return { success: true, data: { sessionId: session.id, ...result } };

    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  private async handleEndSession(params: any, context: CommandContext): Promise<CommandResult> {
    const { sessionId, reason = 'completed' } = params;

    try {
      const result = await this.endSession(sessionId, reason);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  private async handleReviewFlashcards(params: any, context: CommandContext): Promise<CommandResult> {
    const { deckId, batchSize = 10, difficulty = 'adaptive' } = params;

    try {
      const currentLoad = await this.getCurrentCognitiveLoad();

      // Adjust batch size based on cognitive load
      let adjustedBatchSize = batchSize;
      if (currentLoad > 0.7) {
        adjustedBatchSize = Math.max(1, Math.floor(batchSize * 0.5));
      }

      const result = await this.spacedRepetition.reviewBatch(
        deckId,
        adjustedBatchSize,
        difficulty === 'adaptive' ? this.calculateAdaptiveDifficulty() : difficulty
      );

      // Track performance
      await this.updateSessionPerformance(result);

      return { success: true, data: result };

    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  private async handleGenerateMindmap(params: any, context: CommandContext): Promise<CommandResult> {
    const { topic, depth = 3, includeConnections = true } = params;

    try {
      const cognitiveLoad = await this.getCurrentCognitiveLoad();

      // Adjust complexity based on cognitive load
      const adjustedDepth = cognitiveLoad > 0.7 ? Math.max(1, depth - 1) : depth;

      const mindmap = await this.mindMapGenerator.generateMindMap({
        topic,
        depth: adjustedDepth,
        includeConnections,
        optimizeForCognition: true
      });

      // Update knowledge nodes metric
      this.metrics.knowledgeNodesCreated += mindmap.nodes.length;

      return { success: true, data: mindmap };

    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  private async handleStartFocus(params: any, context: CommandContext): Promise<CommandResult> {
    const { duration, type = 'deep-work', soundscape } = params;

    try {
      const focusSession = await this.focusTimer.startSession({
        duration,
        type,
        soundscape,
        adaptiveCognition: this.config.focusOptimizationEnabled
      });

      return { success: true, data: focusSession };

    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  private async handleAnalyzePerformance(params: any, context: CommandContext): Promise<CommandResult> {
    const { timeframe = '7d', includeCorrelations = true } = params;

    try {
      const analysis = await this.analyzePerformance(timeframe, includeCorrelations);
      return { success: true, data: analysis };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  private async handleOptimizeSchedule(params: any, context: CommandContext): Promise<CommandResult> {
    const { preferences = {}, constraints = {} } = params;

    try {
      const optimizedSchedule = await this.optimizeLearningSchedule(preferences, constraints);
      return { success: true, data: optimizedSchedule };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  private async handleGetRecommendations(params: any, context: CommandContext): Promise<CommandResult> {
    try {
      const recommendations = await this.generatePersonalizedRecommendations(context.userId);
      return { success: true, data: recommendations };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  private async handlePauseIntensive(params: any, context: CommandContext): Promise<CommandResult> {
    try {
      await this.pauseIntensiveTasks();
      return { success: true, data: { paused: true } };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  private async handleResumeOperations(params: any, context: CommandContext): Promise<CommandResult> {
    try {
      await this.resumeOperations();
      return { success: true, data: { resumed: true } };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  // Learning Session Management

  private async startFlashcardSession(session: LearningSession, config: any): Promise<any> {
    const sessionConfig = {
      adaptiveDifficulty: this.config.adaptiveDifficultyEnabled,
      cognitiveLoad: session.cognitiveLoad,
      ...config
    };

    return await this.spacedRepetition.startReviewSession(session.id, sessionConfig);
  }

  private async startMindmapSession(session: LearningSession, config: any): Promise<any> {
    const sessionConfig = {
      optimizeForCognition: true,
      currentLoad: session.cognitiveLoad,
      ...config
    };

    return await this.mindMapGenerator.startSession(session.id, sessionConfig);
  }

  private async startFocusSession(session: LearningSession, duration: number): Promise<any> {
    return await this.focusTimer.startSession({
      id: session.id,
      duration,
      adaptiveCognition: true,
      cognitiveLoad: session.cognitiveLoad
    });
  }

  private async endSession(sessionId: string, reason: string): Promise<any> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.endTime = new Date();

    // Calculate session metrics
    const duration = session.endTime.getTime() - session.startTime.getTime();
    const sessionData = {
      sessionId,
      type: session.type,
      duration,
      performance: session.performance,
      cognitiveLoad: session.cognitiveLoad,
      interruptions: session.interruptions,
      reason
    };

    // Update global metrics
    this.metrics.totalStudyTime += duration;
    await this.updateMetrics();

    // Store session data
    await this.storageOrchestrator.execute('set', {
      key: `learning_session_${sessionId}`,
      value: sessionData
    }, { userId: 'current', sessionId: 'current', timestamp: new Date(), priority: 'medium', source: 'LearningOrchestrator' });

    // Emit completion event
    this.eventSystem.emitEvent(
      EVENT_TYPES.LEARNING_SESSION_COMPLETED,
      'LearningOrchestrator',
      sessionData,
      'medium'
    );

    this.activeSessions.delete(sessionId);

    return sessionData;
  }

  private async pauseSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // Pause session based on type
    switch (session.type) {
      case 'focus':
        await this.focusTimer.pauseSession(sessionId);
        break;
      case 'flashcards':
        await this.spacedRepetition.pauseSession(sessionId);
        break;
      case 'mindmap':
        await this.mindMapGenerator.pauseSession(sessionId);
        break;
    }
  }

  // Utility Methods

  private async getCurrentCognitiveLoad(): Promise<number> {
    return await this.cognitiveAura.getCurrentCognitiveLoad();
  }

  private async getContextFactors(): Promise<any> {
    return {
      time: new Date().toISOString(),
      cognitiveState: await this.cognitiveAura.getCurrentState(),
      environmentalFactors: await this.cognitiveAura.getEnvironmentalContext()
    };
  }

  private calculateAdaptiveDifficulty(): string {
    const currentLoad = this.metrics.cognitiveLoadAverage;

    if (currentLoad < 0.3) return 'hard';
    if (currentLoad < 0.7) return 'medium';
    return 'easy';
  }

  private async updateSessionPerformance(result: any): Promise<void> {
    // Update session performance metrics based on review results
    if (result.accuracy) {
      // Update retention rate
      this.metrics.retentionRate = (this.metrics.retentionRate + result.accuracy) / 2;
    }
  }

  private async analyzePerformance(timeframe: string, includeCorrelations: boolean): Promise<any> {
    // Analyze learning performance over time
    const sessions = await this.getSessionHistory(timeframe);

    const analysis: any = {
      totalSessions: sessions.length,
      averagePerformance: sessions.reduce((sum, s) => sum + s.performance, 0) / sessions.length,
      cognitiveLoadTrend: this.analyzeCognitiveLoadTrend(sessions),
      optimalLearningWindows: this.identifyOptimalWindows(sessions),
      recommendations: []
    };

    if (includeCorrelations) {
      analysis.correlations = await this.calculateCrossModuleCorrelations(sessions);
    }

    return analysis;
  }

  private async optimizeLearningSchedule(preferences: any, constraints: any): Promise<any> {
    // Use AI to optimize learning schedule
    const historicalData = await this.getSessionHistory('30d');
    const cognitivePatterns = await this.cognitiveAura.getPatterns();

    return await this.calculationEngine.calculate('optimize_schedule', {
      historicalData,
      cognitivePatterns,
      preferences,
      constraints
    });
  }

  private async generatePersonalizedRecommendations(userId: string): Promise<any> {
    const recentPerformance = await this.analyzePerformance('7d', false);
    const cognitiveState = await this.cognitiveAura.getCurrentState();

  const recommendations: any[] = [];

    // Add cognitive load recommendations
    if (this.metrics.cognitiveLoadAverage > 0.8) {
      recommendations.push({
        type: 'cognitive_load',
        priority: 'high',
        message: 'Consider shorter, more frequent study sessions to reduce cognitive overload',
        action: 'reduce_session_duration'
      });
    }

    // Add performance recommendations
    if (this.metrics.retentionRate < 0.7) {
      recommendations.push({
        type: 'retention',
        priority: 'medium',
        message: 'Increase spaced repetition frequency to improve retention',
        action: 'increase_review_frequency'
      });
    }

    return recommendations;
  }

  // Event Handlers

  private async handleHighCognitiveLoad(event: NeuroLearnEvent): Promise<void> {
    this.logger.info('High cognitive load detected - adjusting learning parameters');
    await this.pauseIntensiveTasks();
  }

  private async handleNormalCognitiveLoad(): Promise<void> {
    if (this.isPaused) {
      this.logger.info('Cognitive load normalized - resuming learning operations');
      await this.resumeOperations();
    }
  }

  private async handleFocusInterruption(event: NeuroLearnEvent): Promise<void> {
    const { sessionId } = event.data;
    const session = this.activeSessions.get(sessionId);

    if (session) {
      session.interruptions++;

      // Adjust session parameters based on interruptions
      if (session.interruptions > 3) {
        await this.pauseSession(sessionId);
      }
    }
  }

  public async updateLearningCorrelations(correlationData: any): Promise<void> {
    // Update learning parameters based on wellness correlations
    this.logger.info('Updating learning correlations', correlationData);

    // Adjust optimal learning hours based on sleep patterns
    if (correlationData.sleepCorrelation) {
      this.metrics.optimalLearningHours = correlationData.optimalHours;
    }

    // Adjust cognitive load thresholds based on stress levels
    if (correlationData.stressCorrelation) {
      this.config.maxCognitiveLoad = Math.max(0.5, this.config.maxCognitiveLoad - correlationData.stressImpact);
    }
  }

  private async resumeOperations(): Promise<void> {
    this.isPaused = false;
    this.logger.info('Resuming learning operations');

    // Re-enable adaptive difficulty
    await this.spacedRepetition.enableAdaptiveDifficulty();

    // Resume background analysis
    await this.cognitiveAura.resumeBackgroundAnalysis();

    // Restore mind map complexity
    await this.mindMapGenerator.setSimplifiedMode(false);
  }

  // Data Management

  private async loadMetrics(): Promise<void> {
    try {
      const storedMetrics = await this.storageOrchestrator.execute('get', {
        key: 'learning_metrics'
      }, { userId: 'current', sessionId: 'current', timestamp: new Date(), priority: 'medium', source: 'LearningOrchestrator' });

      if (storedMetrics.success && storedMetrics.data.value) {
        this.metrics = { ...this.metrics, ...storedMetrics.data.value };
      }
    } catch (error) {
      this.logger.warn('Failed to load learning metrics', error);
    }
  }

  private async saveMetrics(): Promise<void> {
    try {
      await this.storageOrchestrator.execute('set', {
        key: 'learning_metrics',
        value: this.metrics
      }, { userId: 'current', sessionId: 'current', timestamp: new Date(), priority: 'medium', source: 'LearningOrchestrator' });
    } catch (error) {
      this.logger.warn('Failed to save learning metrics', error);
    }
  }

  private async updateMetrics(): Promise<void> {
    // Calculate updated metrics
    const sessions = await this.getSessionHistory('7d');

    if (sessions.length > 0) {
      this.metrics.cognitiveLoadAverage = sessions.reduce((sum, s) => sum + s.cognitiveLoad, 0) / sessions.length;
      this.metrics.sessionCompletionRate = sessions.filter(s => s.endTime).length / sessions.length;
      this.metrics.focusEfficiency = this.calculateFocusEfficiency(sessions);
    }

    await this.saveMetrics();
  }

  private async getSessionHistory(timeframe: string): Promise<LearningSession[]> {
    // Get session history from storage
    // Implementation depends on your storage structure
    return [];
  }

  private analyzeCognitiveLoadTrend(sessions: LearningSession[]): string {
    if (sessions.length < 2) return 'insufficient_data';

    const recent = sessions.slice(-5);
    const older = sessions.slice(-10, -5);

    const recentAvg = recent.reduce((sum, s) => sum + s.cognitiveLoad, 0) / recent.length;
    const olderAvg = older.reduce((sum, s) => sum + s.cognitiveLoad, 0) / older.length;

    if (recentAvg > olderAvg * 1.1) return 'increasing';
    if (recentAvg < olderAvg * 0.9) return 'decreasing';
    return 'stable';
  }

  private identifyOptimalWindows(sessions: LearningSession[]): string[] {
    // Identify optimal learning time windows based on performance
    const hourPerformance: Record<number, number[]> = {};

    sessions.forEach(session => {
      const hour = session.startTime.getHours();
      if (!hourPerformance[hour]) hourPerformance[hour] = [];
      hourPerformance[hour].push(session.performance);
    });

    const hourAverages = Object.entries(hourPerformance)
      .map(([hour, performances]) => ({
        hour: parseInt(hour),
        avgPerformance: performances.reduce((sum, p) => sum + p, 0) / performances.length
      }))
      .sort((a, b) => b.avgPerformance - a.avgPerformance)
      .slice(0, 3)
      .map(item => `${item.hour}:00-${item.hour + 1}:00`);

    return hourAverages;
  }

  private async calculateCrossModuleCorrelations(sessions: LearningSession[]): Promise<any> {
    // Calculate correlations with other modules (wellness, finance, etc.)
    return await this.calculationEngine.calculate('cross_module_correlations', {
      learningSessions: sessions,
      includeModules: ['wellness', 'finance', 'context']
    });
  }

  private calculateFocusEfficiency(sessions: LearningSession[]): number {
    const focusSessions = sessions.filter(s => s.type === 'focus');
    if (focusSessions.length === 0) return 0;

    const totalTime = focusSessions.reduce((sum, s) => {
      if (s.endTime) {
        return sum + (s.endTime.getTime() - s.startTime.getTime());
      }
      return sum;
    }, 0);

    const totalInterruptions = focusSessions.reduce((sum, s) => sum + s.interruptions, 0);

    // Efficiency decreases with interruptions
    return Math.max(0, 1 - (totalInterruptions / (totalTime / 60000))); // interruptions per minute
  }

  private generateSessionId(): string {
    return `learning_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
}

export default LearningOrchestrator;
