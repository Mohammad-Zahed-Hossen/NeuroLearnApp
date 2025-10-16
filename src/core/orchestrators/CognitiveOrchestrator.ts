/**
 * Cognitive Orchestrator - Central Cognitive Intelligence Coordinator
 * Integrates with NeuroLearn Orchestration Engine for seamless cognitive adaptation
 */

import { CognitiveStateService } from '../../services/ai/CognitiveStateService';
import { CognitiveDataService } from '../../services/ai/CognitiveDataService';
import { EyeTrackingService } from '../../services/learning/EyeTrackingService';
import { AICoachingService } from '../../services/learning/AICoachingService';
import { EventSystem } from '../EventSystem';
import { AuraContext } from '../../services/ai/CognitiveAuraService';

interface CognitiveMetrics {
  attention: number;
  cognitiveLoad: number;
  context: AuraContext;
  stability: number;
  confidence: number;
  predictions: any[];
}

export class CognitiveOrchestrator {
  private cognitiveStateService: CognitiveStateService;
  private cognitiveDataService: CognitiveDataService;
  private eyeTrackingService: EyeTrackingService;
  private aiCoachingService: AICoachingService;

  constructor(private eventSystem: EventSystem) {
    this.cognitiveStateService = CognitiveStateService.getInstance();
    this.cognitiveDataService = CognitiveDataService.getInstance();
    this.eyeTrackingService = EyeTrackingService.getInstance();
    this.aiCoachingService = AICoachingService.getInstance();
  }

  /**
   * Initialize the complete cognitive intelligence system
   */
  public async initialize(userId: string): Promise<void> {
    console.log('🧠 Initializing Cognitive Intelligence Layer...');

    try {
      // Initialize eye tracking (camera or simulation)
      await this.eyeTrackingService.initialize();

      // Start cognitive monitoring
      this.eyeTrackingService.startTracking();

      // Subscribe to cognitive state changes
      this.subscribeToStateChanges();

      // Subscribe to attention events
      this.subscribeToAttentionEvents();

      // Initialize adaptive services
      this.initializeAdaptiveServices();

      console.log('✅ Cognitive Intelligence Layer initialized successfully');

      // Emit initialization complete
      this.eventSystem.publish('COGNITIVE_SYSTEM_READY', 'CognitiveOrchestrator', {
        userId,
        timestamp: Date.now(),
        services: ['eye-tracking', 'state-management', 'ai-coaching']
      }, 'medium');

    } catch (error) {
      console.error('❌ Failed to initialize Cognitive Intelligence Layer:', error);
      throw new Error(`Cognitive initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Subscribe to cognitive state changes and relay to global event system
   */
  private subscribeToStateChanges(): void {
    this.cognitiveStateService.subscribe((state) => {
      // Emit to global event system for other orchestrators
      this.eventSystem.publish('COGNITIVE_STATE_CHANGED', 'CognitiveOrchestrator', {
        context: state.context,
        attention: state.attention,
        cognitiveLoad: state.cognitiveLoad,
        stability: state.stability,
        confidence: state.confidence,
        timestamp: state.timestamp,
        predictions: state.predictions
      }, 'medium');

      // Trigger adaptive responses
      this.handleStateChange(state.context, state);
    });
  }

  /**
   * Subscribe to attention-specific events
   */
  private subscribeToAttentionEvents(): void {
    // Handle attention decline
    this.eventSystem.subscribe('ATTENTION_DECLINING', (event) => {
      const data = event.data;
      console.log('⚠️ Attention declining detected:', data);

      // Trigger interventions
      this.eventSystem.publish('TRIGGER_MICRO_BREAK', 'CognitiveOrchestrator', {
        reason: 'attention-decline',
        severity: data.severity,
        duration: data.severity === 'high' ? 300 : 120 // 5 or 2 minutes
      }, 'high');

      // Adjust learning parameters
      this.eventSystem.publish('ADJUST_LEARNING_DIFFICULTY', 'CognitiveOrchestrator', {
        adjustment: 'decrease',
        factor: 0.8
      }, 'medium');
    });

    // Handle attention peaks
    this.eventSystem.subscribe('ATTENTION_PEAK', (event) => {
      const data = event.data;
      console.log('🚀 Attention peak detected:', data);

      // Optimize for high performance
      this.eventSystem.publish('EXTEND_SESSION_OPPORTUNITY', 'CognitiveOrchestrator', {
        reason: 'attention-peak',
        level: data.level,
        recommended_extension: 300 // 5 minutes
      }, 'medium');
    });
  }

  /**
   * Initialize services that adapt to cognitive state
   */
  private initializeAdaptiveServices(): void {
    // Focus Timer Service adaptation
    this.eventSystem.subscribe('COGNITIVE_STATE_CHANGED', (event) => {
      const state = event.data;
      this.eventSystem.publish('FOCUS_TIMER_ADAPT', 'CognitiveOrchestrator', {
        context: state.context,
        attention: state.attention,
        cognitiveLoad: state.cognitiveLoad
      }, 'medium');
    });

    // Soundscape Service adaptation
    this.eventSystem.subscribe('COGNITIVE_STATE_CHANGED', (event) => {
      const state = event.data;
      this.eventSystem.publish('SOUNDSCAPE_ADAPT', 'CognitiveOrchestrator', {
        context: state.context,
        intensity: this.calculateSoundscapeIntensity(state.context, state.cognitiveLoad)
      }, 'medium');
    });

    // Neural Physics adaptation
    this.eventSystem.subscribe('COGNITIVE_STATE_CHANGED', (event) => {
      const state = event.data;
      this.eventSystem.publish('NEURAL_PHYSICS_ADAPT', 'CognitiveOrchestrator', {
        mode: this.getPhysicsMode(state.context),
        complexity: state.cognitiveLoad > 0.7 ? 'simple' : 'complex'
      }, 'medium');
    });
  }

  /**
   * Handle cognitive state changes with adaptive responses
   */
  private async handleStateChange(newContext: AuraContext, state: any): Promise<void> {
    console.log(`🧠 Cognitive state changed to: ${newContext} (Attention: ${(state.attention * 100).toFixed(1)}%)`);

    switch (newContext) {
      case 'DeepFocus':
        await this.handleDeepFocusState(state);
        break;

      case 'CreativeFlow':
        await this.handleCreativeFlowState(state);
        break;

      case 'FragmentedAttention':
        await this.handleFragmentedAttentionState(state);
        break;

      case 'CognitiveOverload':
        await this.handleCognitiveOverloadState(state);
        break;
    }
  }

  /**
   * Handle Deep Focus state
   */
  private async handleDeepFocusState(state: any): Promise<void> {
    // Optimize environment for deep work
    this.eventSystem.publish('OPTIMIZE_FOR_DEEP_FOCUS', 'CognitiveOrchestrator', {
      soundscape: 'deep-focus',
      physics: 'minimal',
      ui_complexity: 'reduced',
      notifications: 'disabled'
    }, 'medium');

    // Extend session if beneficial
    if (state.attention > 0.8 && state.stability > 0.7) {
      this.eventSystem.publish('SUGGEST_SESSION_EXTENSION', 'CognitiveOrchestrator', {
        reason: 'optimal-focus-state',
        recommended_duration: 900 // 15 minutes
      }, 'low');
    }
  }

  /**
   * Handle Creative Flow state
   */
  private async handleCreativeFlowState(state: any): Promise<void> {
    // Optimize for creativity
    this.eventSystem.publish('OPTIMIZE_FOR_CREATIVITY', 'CognitiveOrchestrator', {
      soundscape: 'creative-ambient',
      physics: 'organic',
      ui_complexity: 'enhanced',
      exploration_mode: 'enabled'
    }, 'medium');

    // Suggest creative exercises
    this.eventSystem.publish('SUGGEST_CREATIVE_ACTIVITY', 'CognitiveOrchestrator', {
      type: 'mind-mapping',
      duration: 600 // 10 minutes
    }, 'low');
  }

  /**
   * Handle Fragmented Attention state
   */
  private async handleFragmentedAttentionState(state: any): Promise<void> {
    // Simplify interface and tasks
    this.eventSystem.publish('SIMPLIFY_INTERFACE', 'CognitiveOrchestrator', {
      reduction_level: state.attention < 0.3 ? 'high' : 'moderate',
      task_chunking: 'enabled',
      progress_indicators: 'enhanced'
    }, 'medium');

    // Suggest micro-learning
    if (state.attention > 0.2) {
      this.eventSystem.publish('SUGGEST_MICRO_LEARNING', 'CognitiveOrchestrator', {
        duration: 180, // 3 minutes
        type: 'review'
      }, 'low');
    }
  }

  /**
   * Handle Cognitive Overload state
   */
  private async handleCognitiveOverloadState(state: any): Promise<void> {
    // Immediate intervention
    this.eventSystem.publish('TRIGGER_IMMEDIATE_BREAK', 'CognitiveOrchestrator', {
      type: 'restorative',
      duration: 600, // 10 minutes
      activities: ['breathing', 'stretching', 'meditation']
    }, 'high');

    // Reduce cognitive load
    this.eventSystem.publish('REDUCE_COGNITIVE_LOAD', 'CognitiveOrchestrator', {
      pause_background_processing: true,
      simplify_ui: true,
      disable_animations: true
    }, 'high');

    // Generate recovery recommendations
    const recommendations = this.generateRecoveryRecommendations(state);
    this.eventSystem.publish('DISPLAY_RECOVERY_RECOMMENDATIONS', 'CognitiveOrchestrator', recommendations, 'high');
  }

  /**
   * Calculate soundscape intensity based on cognitive state
   */
  private calculateSoundscapeIntensity(context: AuraContext, cognitiveLoad: number): number {
    switch (context) {
      case 'DeepFocus':
        return 0.4; // Minimal ambient sound
      case 'CreativeFlow':
        return 0.6; // Moderate inspiring sounds
      case 'FragmentedAttention':
        return 0.3; // Very low stimulation
      case 'CognitiveOverload':
        return 0.1; // Almost silent
      default:
        return 0.5;
    }
  }

  /**
   * Get neural physics mode based on cognitive context
   */
  private getPhysicsMode(context: AuraContext): string {
    switch (context) {
      case 'DeepFocus':
        return 'focused';
      case 'CreativeFlow':
        return 'creative';
      case 'FragmentedAttention':
        return 'calm';
      case 'CognitiveOverload':
        return 'minimal';
      default:
        return 'balanced';
    }
  }

  /**
   * Get current cognitive metrics for external services
   */
  public getCurrentMetrics(): CognitiveMetrics {
    const state = this.cognitiveStateService.getState();
    return {
      attention: state.attention,
      cognitiveLoad: state.cognitiveLoad,
      context: state.context,
      stability: state.stability,
      confidence: state.confidence,
      predictions: state.predictions
    };
  }

  /**
   * Get recent cognitive data for analytics
   */
  public getRecentData() {
    return {
      logs: this.cognitiveDataService.getLogs(),
      sessionStats: this.cognitiveDataService.getSessionStats(),
      stateHistory: this.cognitiveStateService.getStateHistory(),
      transitionHistory: this.cognitiveStateService.getTransitionHistory()
    };
  }

  /**
   * Force cognitive state refresh
   */
  public async refreshState(): Promise<void> {
    // This would trigger a fresh cognitive assessment
    this.eventSystem.publish('FORCE_COGNITIVE_REFRESH', 'CognitiveOrchestrator', {
      timestamp: Date.now(),
      reason: 'manual-refresh'
    }, 'medium');
  }

  /**
   * Stop cognitive monitoring
   */
  public async stopEngine(): Promise<void> {
    try {
      this.eyeTrackingService.stopTracking();

      // Save session data
      const sessionId = `session_${Date.now()}`;
      await this.cognitiveDataService.saveSessionData(sessionId);

      console.log('🧠 Cognitive Intelligence Layer stopped');

      this.eventSystem.publish('COGNITIVE_SYSTEM_STOPPED', 'CognitiveOrchestrator', {
        sessionId,
        timestamp: Date.now()
      }, 'medium');

    } catch (error) {
      console.error('Error stopping cognitive engine:', error);
    }
  }

  /**
   * Get system health status
   */
  public getSystemHealth() {
    const eyeMetrics = this.eyeTrackingService.getMetrics();
    return {
      eyeTracking: {
        isActive: eyeMetrics.isUserPresent,
        lastUpdate: Date.now(),
        attentionScore: eyeMetrics.attentionScore
      },
      cognitiveState: {
        isActive: true,
        lastUpdate: this.cognitiveStateService.getState().timestamp,
        confidence: this.cognitiveStateService.getState().confidence
      },
      dataProcessing: {
        samplesProcessed: this.cognitiveDataService.getLogs().samples.length,
        sessionDuration: this.cognitiveDataService.getSessionStats().duration
      }
    };
  }

  /**
   * Get orchestrator status
   */
  public getStatus(): 'active' | 'idle' | 'error' | 'disabled' {
    try {
      const health = this.getSystemHealth();
      if (health.eyeTracking.isActive && health.cognitiveState.isActive) {
        return 'active';
      }
      return 'idle';
    } catch (error) {
      return 'error';
    }
  }

  /**
   * Generate recovery recommendations for cognitive overload
   */
  private generateRecoveryRecommendations(state: any): any {
    return {
      type: 'cognitive-recovery',
      recommendations: [
        {
          activity: 'breathing-exercise',
          duration: 300, // 5 minutes
          description: 'Deep breathing to reduce stress and restore focus'
        },
        {
          activity: 'short-walk',
          duration: 600, // 10 minutes
          description: 'Light physical activity to clear mental fog'
        },
        {
          activity: 'hydration-break',
          duration: 60, // 1 minute
          description: 'Drink water and take a moment to hydrate'
        },
        {
          activity: 'meditation',
          duration: 300, // 5 minutes
          description: 'Guided meditation to reset cognitive state'
        }
      ],
      priority: 'high',
      timestamp: Date.now()
    };
  }

  /**
   * Shutdown the cognitive orchestrator
   */
  public async shutdown(): Promise<void> {
    await this.stopEngine();
  }

  /**
   * Enable cognitive monitoring with specified features
   */
  public async enableMonitoring(params: { eyeTracking: boolean; aiCoaching: boolean }): Promise<void> {
    console.log('Enabling cognitive monitoring:', params);

    if (params.eyeTracking) {
      await this.eyeTrackingService.initialize();
      this.eyeTrackingService.startTracking();
    }

    if (params.aiCoaching) {
      await this.aiCoachingService.initialize();
    }

    this.eventSystem.publish('COGNITIVE_MONITORING_ENABLED', 'CognitiveOrchestrator', {
      eyeTracking: params.eyeTracking,
      aiCoaching: params.aiCoaching,
      timestamp: Date.now()
    }, 'medium');
  }

  /**
   * Disable cognitive monitoring
   */
  public async disableMonitoring(): Promise<void> {
    console.log('Disabling cognitive monitoring');

    this.eyeTrackingService.stopTracking();
    await this.aiCoachingService.pause();

    this.eventSystem.publish('COGNITIVE_MONITORING_DISABLED', 'CognitiveOrchestrator', {
      timestamp: Date.now()
    }, 'medium');
  }

  /**
   * Configure data retention settings
   */
  public async configureRetention(params: { retentionDays: number; saveRawData: boolean; enableCloudSync: boolean }): Promise<void> {
    console.log('Configuring data retention:', params);

    // Configure data service retention
    await this.cognitiveDataService.configureRetention({
      retentionDays: params.retentionDays,
      saveRawData: params.saveRawData,
      enableCloudSync: params.enableCloudSync
    });

    this.eventSystem.publish('COGNITIVE_RETENTION_CONFIGURED', 'CognitiveOrchestrator', {
      ...params,
      timestamp: Date.now()
    }, 'medium');
  }

  /**
   * Configure AI features
   */
  public async configureAI(params: { enablePersonalization: boolean; enablePredictiveInsights: boolean; enableCoaching: boolean }): Promise<void> {
    console.log('Configuring AI features:', params);

    if (params.enableCoaching) {
      await this.aiCoachingService.initialize();
    } else {
      await this.aiCoachingService.pause();
    }

    // Configure personalization and insights
    await this.cognitiveStateService.configureAI({
      enablePersonalization: params.enablePersonalization,
      enablePredictiveInsights: params.enablePredictiveInsights,
      enableCoaching: params.enableCoaching
    });

    this.eventSystem.publish('COGNITIVE_AI_CONFIGURED', 'CognitiveOrchestrator', {
      ...params,
      timestamp: Date.now()
    }, 'medium');
  }

  /**
   * Get data usage statistics
   */
  public getDataUsage(): any {
    const logs = this.cognitiveDataService.getLogs();
    const sessionStats = this.cognitiveDataService.getSessionStats();

    return {
      totalSamples: logs.samples?.length || 0,
      storageUsedMB: (logs.samples?.length || 0) * 0.001, // Rough estimate
      lastDataSync: sessionStats.lastSync || null,
      dataRetentionDays: 30, // Default, should be configurable
      sessionsRecorded: sessionStats.totalSessions || 0
    };
  }

  /**
   * Delete cognitive data
   */
  public async deleteData(params: { type: 'processed' | 'all' | 'cache'; confirmDeletion: boolean }): Promise<void> {
    if (!params.confirmDeletion) {
      throw new Error('Deletion must be confirmed');
    }

    console.log('Deleting cognitive data:', params.type);

    switch (params.type) {
      case 'processed':
        await this.cognitiveDataService.clearProcessedData();
        break;
      case 'all':
        await this.cognitiveDataService.clearAllData();
        break;
      case 'cache':
        await this.cognitiveDataService.clearCache();
        break;
    }

    this.eventSystem.publish('COGNITIVE_DATA_DELETED', 'CognitiveOrchestrator', {
      type: params.type,
      timestamp: Date.now()
    }, 'medium');
  }
}
