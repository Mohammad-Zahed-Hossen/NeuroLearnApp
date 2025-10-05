/**
 * Phase 7: Neural Integration Service
 *
 * Seamlessly integrates Cognitive Soundscapes with existing NeuroLearn systems.
 * Provides intelligent coordination between soundscapes and neural activities.
 *
 * Integration Points:
 * - Focus Timer (Phase 5) coordination
 * - Speed Reading (Phase 6) enhancement
 * - Neural Mind Map synchronization
 * - Cognitive load monitoring
 * - Performance learning integration
 */

import { EventEmitter } from 'eventemitter3';
import { AppState } from 'react-native';
import {
  cognitiveSoundscapeEngine,
  SoundscapeType,
} from './CognitiveSoundscapeEngine';
import { FocusTimerService } from './FocusTimerService';
import HybridStorageService from '../storage/HybridStorageService';

// ==================== TYPES ====================

export interface NeuralIntegrationConfig {
  autoSwitchOnScreenChange: boolean;
  adaptToCognitiveLoad: boolean;
  learnFromPerformance: boolean;
  synchronizeWithFocusTimer: boolean;
  enhanceSpeedReading: boolean;
  integrateWithMindMap: boolean;
}

export interface ScreenSoundscapeMapping {
  screenName: string;
  defaultPreset: SoundscapeType;
  adaptivePresets: {
    lowLoad: SoundscapeType;
    highLoad: SoundscapeType;
    peak: SoundscapeType;
  };
  transitionDuration: number;
}

export interface NeuralSyncEvent {
  type:
    | 'focus_session_started'
    | 'focus_session_ended'
    | 'distraction_logged'
    | 'performance_recorded'
    | 'cognitive_load_changed';
  data: any;
  timestamp: Date;
  source: 'focus_timer' | 'speed_reading' | 'mind_map' | 'flashcards' | 'user';
}

// ==================== NEURAL INTEGRATION SERVICE ====================

export class NeuralIntegrationService extends EventEmitter {
  private static instance: NeuralIntegrationService;

  // Service dependencies
  private focusTimerService: FocusTimerService;
  private storageService: HybridStorageService;

  // Configuration
  private config: NeuralIntegrationConfig = {
    autoSwitchOnScreenChange: true,
    adaptToCognitiveLoad: true,
    learnFromPerformance: true,
    synchronizeWithFocusTimer: true,
    enhanceSpeedReading: true,
    integrateWithMindMap: true,
  };

  // Screen mappings with intelligent adaptation
  private screenMappings: ScreenSoundscapeMapping[] = [
    {
      screenName: 'dashboard',
      defaultPreset: 'calm_readiness',
      adaptivePresets: {
        lowLoad: 'calm_readiness',
        highLoad: 'deep_focus',
        peak: 'reasoning_boost',
      },
      transitionDuration: 2.0,
    },
    {
      screenName: 'focus',
      defaultPreset: 'deep_focus',
      adaptivePresets: {
        lowLoad: 'calm_readiness',
        highLoad: 'deep_focus',
        peak: 'reasoning_boost',
      },
      transitionDuration: 3.0,
    },
    {
      screenName: 'logic',
      defaultPreset: 'reasoning_boost',
      adaptivePresets: {
        lowLoad: 'deep_focus',
        highLoad: 'reasoning_boost',
        peak: 'reasoning_boost',
      },
      transitionDuration: 2.5,
    },
    {
      screenName: 'flashcards',
      defaultPreset: 'memory_flow',
      adaptivePresets: {
        lowLoad: 'calm_readiness',
        highLoad: 'memory_flow',
        peak: 'deep_focus',
      },
      transitionDuration: 1.5,
    },
    {
      screenName: 'speed_reading',
      defaultPreset: 'speed_integration',
      adaptivePresets: {
        lowLoad: 'deep_focus',
        highLoad: 'speed_integration',
        peak: 'speed_integration',
      },
      transitionDuration: 2.0,
    },
    {
      screenName: 'memory_palace',
      defaultPreset: 'visualization',
      adaptivePresets: {
        lowLoad: 'calm_readiness',
        highLoad: 'visualization',
        peak: 'visualization',
      },
      transitionDuration: 3.0,
    },
  ];

  // State tracking
  private currentCognitiveLoad: number = 0.5;
  private currentScreen: string = 'dashboard';
  private performanceHistory: Array<{
    screen: string;
    preset: SoundscapeType;
    performance: number;
    timestamp: Date;
  }> = [];

  // Timers
  private adaptationTimer: NodeJS.Timeout | null = null;
  private syncTimer: NodeJS.Timeout | null = null;

  /**
   * Singleton pattern
   */
  public static getInstance(): NeuralIntegrationService {
    if (!NeuralIntegrationService.instance) {
      NeuralIntegrationService.instance = new NeuralIntegrationService();
    }
    return NeuralIntegrationService.instance;
  }

  private constructor() {
    super();
    this.focusTimerService = FocusTimerService.getInstance();
    this.storageService = HybridStorageService.getInstance();
    console.log('🧠 Neural Integration Service initialized');
  }

  /**
   * Initialize the neural integration system
   */
  public async initialize(): Promise<void> {
    try {
      console.log('🔗 Initializing Neural Integration System...');

      // Load configuration
      await this.loadConfiguration();

      // Setup service integrations
      this.setupFocusTimerIntegration();
      this.setupPerformanceLearning();
      this.setupCognitiveLoadMonitoring();

      // Start synchronization
      this.startSynchronization();

      console.log('✅ Neural Integration System ready');
    } catch (error) {
      console.error('❌ Failed to initialize neural integration:', error);
      throw error;
    }
  }

  // ==================== FOCUS TIMER INTEGRATION ====================

  /**
   * Setup integration with Focus Timer Service
   */
  private setupFocusTimerIntegration(): void {
    if (!this.config.synchronizeWithFocusTimer) return;

    // Listen for focus session events
    // Guard in case FocusTimerService has different API in this project
    if (typeof (this.focusTimerService as any).onSessionStart === 'function') {
      (this.focusTimerService as any).onSessionStart(async (session: any) => {
        console.log('🎯 Focus session started - optimizing soundscape');

        // Switch to optimal preset for focus work
        const optimalPreset = this.getOptimalPresetForFocus(session.taskType);

        if (cognitiveSoundscapeEngine.isActive()) {
          await cognitiveSoundscapeEngine.startSoundscape(optimalPreset, {
            cognitiveLoad: this.currentCognitiveLoad,
            adaptiveMode: true,
            fadeIn: true,
          });
        }

        this.emitNeuralSyncEvent('focus_session_started', session);
      });
    }

    if (typeof (this.focusTimerService as any).onSessionEnd === 'function') {
      (this.focusTimerService as any).onSessionEnd(async (session: any) => {
        console.log('🎯 Focus session ended - adapting soundscape');

        // Calculate session effectiveness and adapt
        const effectiveness = this.calculateSessionEffectiveness(session);

        // Record performance for learning
        await this.recordPerformanceData(this.currentScreen, effectiveness);

        // Transition to calm state
        if (cognitiveSoundscapeEngine.isActive()) {
          await cognitiveSoundscapeEngine.startSoundscape('calm_readiness', {
            fadeIn: true,
          });
        }

        this.emitNeuralSyncEvent('focus_session_ended', session);
      });
    }

    if (typeof (this.focusTimerService as any).onDistraction === 'function') {
      (this.focusTimerService as any).onDistraction(async (event: any) => {
        console.log('😵 Distraction detected - providing neural feedback');

        // Temporarily modulate soundscape for awareness
        await this.provideDistractionFeedback();

        this.emitNeuralSyncEvent('distraction_logged', event);
      });
    }

    // Fallback: subscribe to session change events if explicit start/end hooks are not available
    if (typeof (this.focusTimerService as any).onSessionChange === 'function') {
      let previousSessionId: string | null = null;
      (this.focusTimerService as any).onSessionChange(async (session: any) => {
        try {
          const sessionId = session ? session.id : null;
          // Session started
          if (!previousSessionId && sessionId) {
            console.log(
              '🎯 Detected focus session start via onSessionChange fallback',
            );
            const optimalPreset = this.getOptimalPresetForFocus(
              session?.taskType,
            );
            if (cognitiveSoundscapeEngine.isActive()) {
              await cognitiveSoundscapeEngine.startSoundscape(optimalPreset, {
                cognitiveLoad: this.currentCognitiveLoad,
                adaptiveMode: true,
                fadeIn: true,
              });
            }
            this.emitNeuralSyncEvent('focus_session_started', session);
          }

          // Session ended
          if (previousSessionId && !sessionId) {
            console.log(
              '🎯 Detected focus session end via onSessionChange fallback',
            );
            const effectiveness = this.calculateSessionEffectiveness(
              session || {},
            );
            await this.recordPerformanceData(this.currentScreen, effectiveness);
            if (cognitiveSoundscapeEngine.isActive()) {
              await cognitiveSoundscapeEngine.startSoundscape(
                'calm_readiness',
                {
                  fadeIn: true,
                },
              );
            }
            this.emitNeuralSyncEvent('focus_session_ended', session);
          }

          previousSessionId = sessionId;
        } catch (error) {
          console.error('Error handling onSessionChange fallback:', error);
        }
      });
    }

    console.log('🔗 Focus Timer integration activated');
  }

  /**
   * Get optimal preset for focus session
   */
  private getOptimalPresetForFocus(taskType?: string): SoundscapeType {
    switch (taskType) {
      case 'logic':
      case 'problem_solving':
        return 'reasoning_boost';

      case 'reading':
      case 'study':
        return 'deep_focus';

      case 'creative':
      case 'brainstorming':
        return 'visualization';

      case 'memory':
      case 'recall':
        return 'memory_flow';

      default:
        return this.adaptPresetToCognitiveLoad('deep_focus');
    }
  }

  /**
   * Provide subtle audio feedback for distraction
   */
  private async provideDistractionFeedback(): Promise<void> {
    // Brief frequency modulation to increase awareness without being disruptive
    const currentState = cognitiveSoundscapeEngine.getState();

    if (currentState.isActive) {
      // Temporary frequency boost for 3 seconds
      cognitiveSoundscapeEngine.updateCognitiveLoad(
        Math.min(1.0, this.currentCognitiveLoad + 0.2),
      );

      setTimeout(() => {
        cognitiveSoundscapeEngine.updateCognitiveLoad(
          this.currentCognitiveLoad,
        );
      }, 3000);
    }
  }

  // ==================== SCREEN COORDINATION ====================

  /**
   * Handle screen transitions with intelligent soundscape switching
   */
  public async onScreenChange(
    screenName: string,
    context?: any,
  ): Promise<void> {
    if (!this.config.autoSwitchOnScreenChange) return;

    console.log(`📱 Screen changed to: ${screenName}`);

    const previousScreen = this.currentScreen;
    this.currentScreen = screenName;

    // Find screen mapping
    const mapping = this.screenMappings.find(
      (m) => m.screenName === screenName,
    );
    if (!mapping) {
      console.warn(`⚠️ No soundscape mapping found for screen: ${screenName}`);
      return;
    }

    // Determine optimal preset
    const optimalPreset = this.getOptimalPresetForScreen(mapping);

    // Only switch if different from current and soundscape is active
    const currentState = cognitiveSoundscapeEngine.getState();
    if (currentState.isActive && currentState.currentPreset !== optimalPreset) {
      console.log(
        `🔄 Switching soundscape: ${currentState.currentPreset} → ${optimalPreset}`,
      );

      await cognitiveSoundscapeEngine.startSoundscape(optimalPreset, {
        cognitiveLoad: this.currentCognitiveLoad,
        adaptiveMode: true,
        fadeIn: true,
      });
    }
  }

  /**
   * Get optimal preset for screen based on current conditions
   */
  private getOptimalPresetForScreen(
    mapping: ScreenSoundscapeMapping,
  ): SoundscapeType {
    // Check if we have performance history for this screen
    const screenPerformance = this.getScreenPerformanceHistory(
      mapping.screenName,
    );

    if (screenPerformance.length > 0) {
      // Use machine learning to determine best preset
      const bestPreset = this.getBestPresetFromHistory(screenPerformance);
      if (bestPreset) {
        console.log(`📊 Using learned optimal preset: ${bestPreset}`);
        return bestPreset;
      }
    }

    // Fallback to adaptive preset based on cognitive load
    return this.adaptPresetToCognitiveLoad(
      mapping.defaultPreset,
      mapping.adaptivePresets,
    );
  }

  /**
   * Adapt preset based on current cognitive load
   */
  private adaptPresetToCognitiveLoad(
    defaultPreset: SoundscapeType,
    adaptivePresets?: {
      lowLoad: SoundscapeType;
      highLoad: SoundscapeType;
      peak: SoundscapeType;
    },
  ): SoundscapeType {
    if (!this.config.adaptToCognitiveLoad || !adaptivePresets) {
      return defaultPreset;
    }

    const load = this.currentCognitiveLoad;

    if (load > 0.8) {
      return adaptivePresets.peak;
    } else if (load > 0.6) {
      return adaptivePresets.highLoad;
    } else if (load < 0.3) {
      return adaptivePresets.lowLoad;
    }

    return defaultPreset;
  }

  // ==================== PERFORMANCE LEARNING ====================

  /**
   * Setup performance-based learning system
   */
  private setupPerformanceLearning(): void {
    if (!this.config.learnFromPerformance) return;

    // Performance learning runs every 5 minutes
    this.adaptationTimer = setInterval(() => {
      this.analyzePerformancePatterns();
    }, 5 * 60 * 1000);

    console.log('🧠 Performance learning system activated');
  }

  /**
   * Record performance data for machine learning
   */
  public async recordPerformanceData(
    screen: string,
    performance: number,
  ): Promise<void> {
    if (!this.config.learnFromPerformance) return;

    const currentState = cognitiveSoundscapeEngine.getState();

    this.performanceHistory.push({
      screen,
      preset: currentState.currentPreset,
      performance,
      timestamp: new Date(),
    });

    // Limit history size
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory = this.performanceHistory.slice(-1000);
    }

    // Record in engine for real-time adaptation (await persistence)
    try {
      await (cognitiveSoundscapeEngine as any).recordPerformance(performance);
    } catch (e) {
      // Non-fatal
      console.warn('Engine recordPerformance failed', e);
    }

    // Persist to storage
    this.persistPerformanceData();

    this.emitNeuralSyncEvent('performance_recorded', { screen, performance });

    console.log(
      `📊 Performance recorded: ${screen} - ${(performance * 100).toFixed(0)}%`,
    );
  }

  /**
   * Analyze performance patterns for optimization
   */
  private analyzePerformancePatterns(): void {
    const recentHistory = this.getRecentPerformanceHistory();

    if (recentHistory.length < 10) return; // Need minimum data

    // Group by screen and preset
    const patterns = this.groupPerformanceByScreenAndPreset(recentHistory);

    // Find best performing combinations
    Object.entries(patterns).forEach(([key, data]) => {
      const [screen, preset] = key.split('|');
      const avgPerformance =
        data.reduce((sum, p) => sum + p.performance, 0) / data.length;

      console.log(
        `📈 Pattern analysis: ${screen}|${preset} = ${(
          avgPerformance * 100
        ).toFixed(0)}% avg`,
      );
    });

    // Update screen mappings based on findings
    this.updateScreenMappingsFromLearning(patterns);
  }

  /**
   * Get performance history for specific screen
   */
  private getScreenPerformanceHistory(screen: string): Array<{
    preset: SoundscapeType;
    performance: number;
    timestamp: Date;
  }> {
    return this.performanceHistory
      .filter((p) => p.screen === screen)
      .slice(-50); // Last 50 sessions for this screen
  }

  /**
   * Get best preset from historical performance
   */
  private getBestPresetFromHistory(
    history: Array<{
      preset: SoundscapeType;
      performance: number;
    }>,
  ): SoundscapeType | null {
    if (history.length < 5) return null;

    // Group by preset and calculate average performance
    const presetPerformance = history.reduce((acc, item) => {
      if (!acc[item.preset]) {
        acc[item.preset] = { total: 0, count: 0 };
      }
      acc[item.preset].total += item.performance;
      acc[item.preset].count += 1;
      return acc;
    }, {} as Record<SoundscapeType, { total: number; count: number }>);

    // Find preset with highest average performance
    let bestPreset: SoundscapeType | null = null;
    let bestAverage = 0;

    Object.entries(presetPerformance).forEach(([preset, data]) => {
      const average = data.total / data.count;
      if (average > bestAverage) {
        bestAverage = average;
        bestPreset = preset as SoundscapeType;
      }
    });

    return bestPreset;
  }

  // ==================== COGNITIVE LOAD MONITORING ====================

  /**
   * Setup cognitive load monitoring and adaptation
   */
  private setupCognitiveLoadMonitoring(): void {
    if (!this.config.adaptToCognitiveLoad) return;

    // Monitor cognitive load changes every minute
    this.syncTimer = setInterval(() => {
      this.updateCognitiveLoadMetrics();
    }, 60 * 1000);

    console.log('🧠 Cognitive load monitoring activated');
  }

  /**
   * Update cognitive load based on various metrics
   */
  private async updateCognitiveLoadMetrics(): Promise<void> {
    try {
      const metrics = await this.collectCognitiveLoadMetrics();
      const newLoad = this.calculateCognitiveLoad(metrics);

      if (Math.abs(newLoad - this.currentCognitiveLoad) > 0.1) {
        console.log(
          `🧠 Cognitive load updated: ${(
            this.currentCognitiveLoad * 100
          ).toFixed(0)}% → ${(newLoad * 100).toFixed(0)}%`,
        );

        this.currentCognitiveLoad = newLoad;
        cognitiveSoundscapeEngine.updateCognitiveLoad(newLoad);

        this.emitNeuralSyncEvent('cognitive_load_changed', {
          previousLoad: this.currentCognitiveLoad,
          newLoad,
          metrics,
        });
      }
    } catch (error) {
      console.error('❌ Failed to update cognitive load metrics:', error);
    }
  }

  /**
   * Collect various metrics for cognitive load calculation
   */
  private async collectCognitiveLoadMetrics(): Promise<{
    focusSessionMetrics: any;
    recentPerformance: number;
    timeOfDay: number;
    sessionDuration: number;
  }> {
    // Focus session metrics
    const focusMetrics =
      typeof (this.focusTimerService as any).getRecentMetrics === 'function'
        ? await (this.focusTimerService as any).getRecentMetrics()
        : null;

    // Recent performance average
    const recentPerf = this.getRecentPerformanceHistory();
    const avgPerformance =
      recentPerf.length > 0
        ? recentPerf.reduce((sum, p) => sum + p.performance, 0) /
          recentPerf.length
        : 0.5;

    // Time of day factor (higher cognitive load in afternoon/evening)
    const hour = new Date().getHours();
    const timeOfDayFactor = hour >= 14 && hour <= 18 ? 0.3 : 0;

    // Current session duration (longer sessions = higher load)
    const soundscapeState = cognitiveSoundscapeEngine.getState();
    const sessionDuration = soundscapeState.sessionDuration / 3600; // hours

    return {
      focusSessionMetrics: focusMetrics,
      recentPerformance: avgPerformance,
      timeOfDay: timeOfDayFactor,
      sessionDuration,
    };
  }

  /**
   * Calculate cognitive load from collected metrics
   */
  private calculateCognitiveLoad(metrics: any): number {
    let load = 0.5; // baseline

    // Focus session impact
    if (metrics.focusSessionMetrics) {
      const distractionRate =
        metrics.focusSessionMetrics.distractionsPerSession || 0;
      const focusRating = metrics.focusSessionMetrics.averageFocusRating || 3;

      load += distractionRate * 0.1; // More distractions = higher load
      load -= (focusRating - 3) * 0.1; // Better focus = lower load
    }

    // Performance impact
    if (metrics.recentPerformance < 0.6) {
      load += 0.2; // Poor performance = higher load
    } else if (metrics.recentPerformance > 0.8) {
      load -= 0.1; // Good performance = lower load
    }

    // Time of day impact
    load += metrics.timeOfDay;

    // Session duration impact
    if (metrics.sessionDuration > 2) {
      load += 0.2; // Long sessions = higher load
    }

    return Math.max(0, Math.min(1, load));
  }

  // ==================== SPEED READING ENHANCEMENT ====================

  /**
   * Enhance speed reading with dynamic soundscape adaptation
   */
  public async enhanceSpeedReading(
    currentWPM: number,
    comprehensionScore: number,
    difficulty: 'easy' | 'medium' | 'hard',
  ): Promise<void> {
    if (!this.config.enhanceSpeedReading) return;

    // Adapt soundscape frequency based on reading speed and comprehension
    let targetPreset: SoundscapeType = 'speed_integration';

    if (comprehensionScore < 0.6) {
      // Low comprehension - switch to focus mode
      targetPreset = 'deep_focus';
    } else if (currentWPM > 500 && comprehensionScore > 0.8) {
      // High speed with good comprehension - stay in speed mode
      targetPreset = 'speed_integration';
    } else if (difficulty === 'hard') {
      // Difficult text - use reasoning boost
      targetPreset = 'reasoning_boost';
    }

    const currentState = cognitiveSoundscapeEngine.getState();
    if (currentState.currentPreset !== targetPreset) {
      await cognitiveSoundscapeEngine.startSoundscape(targetPreset, {
        fadeIn: true,
        adaptiveMode: true,
      });

      console.log(`📚 Speed reading soundscape adapted to: ${targetPreset}`);
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Start background synchronization
   */
  private startSynchronization(): void {
    console.log('🔄 Neural synchronization started');
  }

  /**
   * Emit neural sync event
   */
  private emitNeuralSyncEvent(type: string, data: any): void {
    const event: NeuralSyncEvent = {
      type: type as any,
      data,
      timestamp: new Date(),
      source: 'focus_timer',
    };

    this.emit('neural_sync', event);
  }

  /**
   * Get recent performance history
   */
  private getRecentPerformanceHistory(): Array<{
    screen: string;
    preset: SoundscapeType;
    performance: number;
    timestamp: Date;
  }> {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    return this.performanceHistory.filter((p) => p.timestamp > oneDayAgo);
  }

  /**
   * Calculate session effectiveness
   */
  private calculateSessionEffectiveness(session: any): number {
    // Simplified effectiveness calculation
    const duration = session.actualDurationMinutes || 0;
    const planned = session.plannedDurationMinutes || 25;
    const distractions = session.distractionCount || 0;
    const rating = session.selfReportFocus || 3;

    let effectiveness = 0.5;

    // Duration completion factor
    effectiveness += Math.min(duration / planned, 1) * 0.3;

    // Distraction penalty
    effectiveness -= Math.min(distractions * 0.1, 0.3);

    // Self-reported focus rating
    effectiveness += ((rating - 3) / 2) * 0.2;

    return Math.max(0, Math.min(1, effectiveness));
  }

  /**
   * Group performance data by screen and preset
   */
  private groupPerformanceByScreenAndPreset(
    history: any[],
  ): Record<string, any[]> {
    return history.reduce((acc, item) => {
      const key = `${item.screen}|${item.preset}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }

  /**
   * Update screen mappings based on learning
   */
  private updateScreenMappingsFromLearning(
    patterns: Record<string, any[]>,
  ): void {
    // Implementation would update screen mappings based on learned patterns
    // This is a simplified version
    console.log('🧠 Updating screen mappings from performance learning');
  }

  /**
   * Load configuration from storage
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const settings: any =
        typeof (this.storageService as any).getSettings === 'function'
          ? await (this.storageService as any).getSettings()
          : null;
      if (settings?.neuralIntegrationConfig) {
        this.config = { ...this.config, ...settings.neuralIntegrationConfig };
      }
    } catch (error) {
      console.warn('⚠️ Failed to load neural integration config:', error);
    }
  }

  /**
   * Persist performance data to storage
   */
  private async persistPerformanceData(): Promise<void> {
    try {
      const recentData = this.performanceHistory.slice(-100);
      if (
        typeof (this.storageService as any).saveNeuralPerformanceData ===
        'function'
      ) {
        await (this.storageService as any).saveNeuralPerformanceData(
          recentData,
        );
      } else if (
        typeof (this.storageService as any).saveSettings === 'function'
      ) {
        // Fallback: persist under a generic key
        const existing = await (this.storageService as any).getSettings();
        await (this.storageService as any).saveSettings({
          ...existing,
          neuralPerformanceData: recentData,
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to persist performance data:', error);
    }
  }

  /**
   * Update configuration
   */
  public updateConfiguration(config: Partial<NeuralIntegrationConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('⚙️ Neural integration configuration updated');
  }

  /**
   * Get current configuration
   */
  public getConfiguration(): NeuralIntegrationConfig {
    return { ...this.config };
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    if (this.adaptationTimer) {
      clearInterval(this.adaptationTimer);
      this.adaptationTimer = null;
    }

    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    this.removeAllListeners();
    console.log('🧹 Neural Integration Service disposed');
  }
}

// Export singleton instance
export const neuralIntegrationService = NeuralIntegrationService.getInstance();
export default NeuralIntegrationService;
