/**
 * Cognitive State Service - Intelligent State Determination
 * Uses ML-driven state classification with context awareness
 */

import EventSystem, { NeuroLearnEvent } from '../../core/EventSystem';
import { ProcessedMetrics } from './CognitiveDataService';
import { AuraContext } from './CognitiveAuraService';
import { applyContextualEMA } from '../../core/utils/AttentionMath';

interface CognitiveState {
  context: AuraContext;
  attention: number;
  cognitiveLoad: number;
  stability: number;
  confidence: number;
  timestamp: number;
  duration: number; // How long in this state
  predictions: StatePrediction[];
}

interface StatePrediction {
  nextState: AuraContext;
  probability: number;
  timeframe: number; // minutes
  triggers: string[];
}

interface StateTransition {
  from: AuraContext;
  to: AuraContext;
  timestamp: number;
  trigger: string;
  confidence: number;
}

export class CognitiveStateService {
  private static instance: CognitiveStateService;
  private eventSystem: EventSystem;

  // State management
  private currentState: CognitiveState;
  private stateHistory: CognitiveState[] = [];
  private transitionHistory: StateTransition[] = [];

  // ML Model for state classification
  private stateClassifier: StateClassificationModel;

  // Smoothing and filtering
  private smoothedAttention = 0.6;
  private readonly EMA_ALPHA = 0.3;

  // State thresholds (adaptive)
  private thresholds = {
    deepFocus: { min: 0.75, optimal: 0.85 },
    creativeFlow: { min: 0.65, optimal: 0.8, creativityBonus: 0.1 },
    fragmentedAttention: { max: 0.45, recoveryThreshold: 0.3 },
    cognitiveOverload: { max: 0.25, immediateActionRequired: 0.15 }
  };

  private constructor() {
    this.eventSystem = EventSystem.getInstance();
    this.stateClassifier = new StateClassificationModel();

    this.currentState = this.createDefaultState();

    // Subscribe to cognitive metrics
    this.eventSystem.subscribe('COGNITIVE_METRICS_UPDATED', this.handleMetricsUpdate.bind(this));
  }

  public static getInstance(): CognitiveStateService {
    if (!CognitiveStateService.instance) {
      CognitiveStateService.instance = new CognitiveStateService();
    }
    return CognitiveStateService.instance;
  }

  // Handle incoming metrics and determine state
  private async handleMetricsUpdate(event: NeuroLearnEvent): Promise<void> {
    const { userId, metrics } = event.data;

    // Apply contextual smoothing
    this.smoothedAttention = applyContextualEMA(
      metrics.filteredAttention,
      this.smoothedAttention,
      this.currentState.context,
      this.EMA_ALPHA
    );

    // Classify cognitive state
    const newContext = await this.classifyCognitiveState(metrics);

    // Check for state transition
    const stateChanged = newContext !== this.currentState.context;
    const now = Date.now();

    if (stateChanged) {
      // Record transition
      this.recordStateTransition(this.currentState.context, newContext, now, 'metrics-driven');

      // Reset duration for new state
      this.currentState.duration = 0;
    } else {
      // Update duration in current state
      this.currentState.duration = now - this.currentState.timestamp;
    }

    // Generate state predictions
    const predictions = await this.generateStatePredictions(metrics);

    // Update current state
    const updatedState: CognitiveState = {
      context: newContext,
      attention: this.smoothedAttention,
      cognitiveLoad: metrics.cognitiveLoad,
      stability: this.calculateStability(),
      confidence: this.calculateStateConfidence(metrics),
      timestamp: stateChanged ? now : this.currentState.timestamp,
      duration: this.currentState.duration,
      predictions
    };

    // Update state
    this.currentState = updatedState;
    this.stateHistory.push({ ...updatedState });

    // Maintain history size
    if (this.stateHistory.length > 100) {
      this.stateHistory = this.stateHistory.slice(-50);
    }

    // Emit state change events
    this.eventSystem.publish('COGNITIVE_STATE_CHANGED', 'CognitiveStateService', this.currentState, 'medium');

    if (stateChanged) {
      this.eventSystem.publish('COGNITIVE_STATE_TRANSITION', 'CognitiveStateService', {
        from: this.transitionHistory[this.transitionHistory.length - 1]?.from,
        to: newContext,
        attention: this.smoothedAttention,
        confidence: updatedState.confidence
      }, 'medium');
    }

    // Adaptive threshold learning
    if (stateChanged) {
      this.updateAdaptiveThresholds(newContext, metrics);
    }
  }

  // Advanced state classification using ML model
  private async classifyCognitiveState(metrics: ProcessedMetrics): Promise<AuraContext> {
    // Feature vector for ML classification
    const features = {
      attention: metrics.filteredAttention,
      cognitiveLoad: metrics.cognitiveLoad,
      stability: this.calculateStability(),
      stressLevel: metrics.stressIndicators.length > 0 ? Math.max(...metrics.stressIndicators) : 0,
      qualityScore: metrics.qualityScore,
      timeInCurrentState: this.currentState.duration,
      recentTrend: this.calculateRecentTrend()
    };

    // Use ML model for classification
    const classification = this.stateClassifier.classify(features);

    // Apply rule-based validation
    return this.validateClassification(classification, features);
  }

  // Validate ML classification with rule-based logic
  private validateClassification(mlClassification: AuraContext, features: any): AuraContext {
    const { attention, cognitiveLoad, stressLevel } = features;

    // Override rules for safety
    if (stressLevel > 0.8 || cognitiveLoad > 0.9) {
      return 'CognitiveOverload';
    }

    if (attention < this.thresholds.fragmentedAttention.max) {
      return 'FragmentedAttention';
    }

    if (attention > this.thresholds.deepFocus.min && cognitiveLoad < 0.6) {
      return 'DeepFocus';
    }

    // Check for creative flow indicators
    if (this.hasCreativeFlowIndicators(features)) {
      return 'CreativeFlow';
    }

    // Default to ML classification
    return mlClassification;
  }

  // Detect creative flow state indicators
  private hasCreativeFlowIndicators(features: any): boolean {
  const indicators: string[] = [];

    // Moderate attention with low cognitive load
    if (features.attention > 0.6 && features.attention < 0.85 && features.cognitiveLoad < 0.5) {
      indicators.push('moderate-attention-low-load');
    }

    // Stable attention over time
    if (features.stability > 0.7) {
      indicators.push('stable-attention');
    }

    // Low stress with engagement
    if (features.stressLevel < 0.3 && features.attention > 0.6) {
      indicators.push('low-stress-engaged');
    }

    return indicators.length >= 2;
  }

  // Generate predictions for future state changes
  private async generateStatePredictions(metrics: ProcessedMetrics): Promise<StatePrediction[]> {
    const predictions: StatePrediction[] = [];

    const currentContext = this.currentState.context;
    const trend = this.calculateRecentTrend();
    const timeInState = this.currentState.duration / (1000 * 60); // minutes

    // Predict based on current trends and typical patterns
    switch (currentContext) {
      case 'DeepFocus':
        if (timeInState > 25 || trend < -0.1) {
          predictions.push({
            nextState: 'FragmentedAttention',
            probability: 0.7,
            timeframe: 5,
            triggers: ['fatigue', 'attention-decline']
          });
        }
        break;

      case 'FragmentedAttention':
        if (trend > 0.05) {
          predictions.push({
            nextState: 'DeepFocus',
            probability: 0.6,
            timeframe: 3,
            triggers: ['recovery', 'attention-increase']
          });
        }
        if (metrics.stressIndicators.length > 2) {
          predictions.push({
            nextState: 'CognitiveOverload',
            probability: 0.4,
            timeframe: 2,
            triggers: ['stress-accumulation']
          });
        }
        break;

      case 'CognitiveOverload':
        predictions.push({
          nextState: 'FragmentedAttention',
          probability: 0.8,
          timeframe: 1,
          triggers: ['rest', 'intervention']
        });
        break;

      case 'CreativeFlow':
        if (timeInState > 45) {
          predictions.push({
            nextState: 'FragmentedAttention',
            probability: 0.5,
            timeframe: 10,
            triggers: ['creative-exhaustion']
          });
        }
        break;
    }

    return predictions;
  }

  // Calculate stability score
  private calculateStability(): number {
    if (this.stateHistory.length < 5) return 0.5;

    const recentAttention = this.stateHistory.slice(-10).map(s => s.attention);
    const mean = recentAttention.reduce((sum, val) => sum + val, 0) / recentAttention.length;
    const variance = recentAttention.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentAttention.length;

    return Math.max(0, 1 - Math.sqrt(variance));
  }

  // Calculate recent attention trend
  private calculateRecentTrend(): number {
    if (this.stateHistory.length < 5) return 0;

    const recent = this.stateHistory.slice(-5).map(s => s.attention);
    const first = recent.slice(0, 2).reduce((sum, val) => sum + val, 0) / 2;
    const last = recent.slice(-2).reduce((sum, val) => sum + val, 0) / 2;

    return (last - first) / 5; // Trend per sample
  }

  // Calculate confidence in state classification
  private calculateStateConfidence(metrics: ProcessedMetrics): number {
    let confidence = metrics.qualityScore;

    // Reduce confidence for borderline cases
    const attention = metrics.filteredAttention;
    const thresholdDistances = [
      Math.abs(attention - this.thresholds.deepFocus.min),
      Math.abs(attention - this.thresholds.fragmentedAttention.max),
      Math.abs(attention - this.thresholds.cognitiveOverload.max)
    ];

    const minDistance = Math.min(...thresholdDistances);
    if (minDistance < 0.1) confidence *= 0.7;

    // Increase confidence for consistent patterns
    const recentStates = this.stateHistory.slice(-3).map(s => s.context);
    const consistency = recentStates.filter(s => s === this.currentState.context).length / recentStates.length;
    confidence *= (0.5 + 0.5 * consistency);

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  // Record state transitions
  private recordStateTransition(from: AuraContext, to: AuraContext, timestamp: number, trigger: string): void {
    this.transitionHistory.push({
      from,
      to,
      timestamp,
      trigger,
      confidence: this.currentState.confidence
    });

    // Maintain history size
    if (this.transitionHistory.length > 50) {
      this.transitionHistory = this.transitionHistory.slice(-25);
    }
  }

  // Update adaptive thresholds based on user patterns
  private updateAdaptiveThresholds(newContext: AuraContext, metrics: ProcessedMetrics): void {
    const learningRate = 0.05;
    const attention = metrics.filteredAttention;

    // Adjust thresholds based on observed transitions
    switch (newContext) {
      case 'DeepFocus':
        this.thresholds.deepFocus.min = this.thresholds.deepFocus.min * (1 - learningRate) + attention * learningRate;
        break;
      case 'FragmentedAttention':
        this.thresholds.fragmentedAttention.max = this.thresholds.fragmentedAttention.max * (1 - learningRate) + attention * learningRate;
        break;
      case 'CognitiveOverload':
        this.thresholds.cognitiveOverload.max = this.thresholds.cognitiveOverload.max * (1 - learningRate) + attention * learningRate;
        break;
    }
  }

  // Create default state
  private createDefaultState(): CognitiveState {
    return {
      context: 'FragmentedAttention',
      attention: 0.5,
      cognitiveLoad: 0.5,
      stability: 0.5,
      confidence: 0.5,
      timestamp: Date.now(),
      duration: 0,
      predictions: []
    };
  }

  // Public API
  public getState(): CognitiveState {
    return { ...this.currentState };
  }

  public getStateHistory(): CognitiveState[] {
    return [...this.stateHistory];
  }

  public getTransitionHistory(): StateTransition[] {
    return [...this.transitionHistory];
  }

  public subscribe(callback: (state: CognitiveState) => void): () => void {
    const handler = (event: NeuroLearnEvent) => callback(event.data as CognitiveState);
    const subscriptionId = this.eventSystem.subscribe('COGNITIVE_STATE_CHANGED', handler);
    return () => this.eventSystem.unsubscribe(subscriptionId);
  }

  /**
   * Configure AI features
   */
  public async configureAI(params: { enablePersonalization: boolean; enablePredictiveInsights: boolean; enableCoaching: boolean }): Promise<void> {
    console.log('Configuring AI features:', params);
    // Store configuration (in a real implementation, this would persist settings)
    // For now, just log the configuration
    this.eventSystem.publish('AI_FEATURES_CONFIGURED', 'CognitiveStateService', params, 'medium');
  }
}

// ML Model for state classification (simplified implementation)
class StateClassificationModel {
  private weights = {
    deepFocus: { attention: 2.0, cognitiveLoad: -1.5, stability: 1.0 },
    creativeFlow: { attention: 1.2, cognitiveLoad: -0.8, stability: 0.8 },
    fragmentedAttention: { attention: -0.5, cognitiveLoad: 0.3, stability: -1.0 },
    cognitiveOverload: { attention: -1.5, cognitiveLoad: 2.0, stability: -0.5 }
  };

  classify(features: any): AuraContext {
    const scores = {
      DeepFocus: this.calculateScore(features, this.weights.deepFocus),
      CreativeFlow: this.calculateScore(features, this.weights.creativeFlow),
      FragmentedAttention: this.calculateScore(features, this.weights.fragmentedAttention),
      CognitiveOverload: this.calculateScore(features, this.weights.cognitiveOverload)
    };

    return Object.keys(scores).reduce((a, b) =>
      scores[a as keyof typeof scores] > scores[b as keyof typeof scores] ? a : b
    ) as AuraContext;
  }

  private calculateScore(features: any, weights: any): number {
    return features.attention * weights.attention +
           features.cognitiveLoad * weights.cognitiveLoad +
           features.stability * weights.stability;
  }
}
