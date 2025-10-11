/**
 * Cognitive Data Service - Advanced Signal Processing
 * Handles real-time cognitive sample processing with ML insights
 */

import EventSystem, { NeuroLearnEvent } from '../../core/EventSystem';
import { CognitiveSample } from '../storage/StorageService';
import { calculateAdvancedAttentionScore } from '../../core/utils/AttentionMath';
import { StorageService } from '../storage/StorageService';
import { ContextSensorService } from '../context/ContextSensorService';
import { ContextSnapshot } from '../ai/ContextSensorService';

interface CognitiveLog {
  userId: string;
  samples: CognitiveSample[];
  processedMetrics: ProcessedMetrics[];
  sessionStats: SessionStats;
}

export interface ProcessedMetrics {
  timestamp: number;
  rawAttention: number;
  filteredAttention: number;
  cognitiveLoad: number;
  stressIndicators: number[];
  qualityScore: number;
}

interface SessionStats {
  startTime: number;
  duration: number;
  averageAttention: number;
  peakAttention: number;
  lowAttention: number;
  stabilityScore: number;
  interruptions: number;
  lastSync: number | null;
  totalSessions: number;
}

export class CognitiveDataService {
  private static instance: CognitiveDataService;
  private eventSystem: EventSystem;
  private storage: StorageService;
  private contextSensor: ContextSensorService;

  // Data management
  private log: CognitiveLog = {
    userId: '',
    samples: [],
    processedMetrics: [],
    sessionStats: this.createEmptyStats()
  };

  // Signal processing
  private signalBuffer: number[] = [];
  private readonly BUFFER_SIZE = 50;
  private noiseThreshold = 0.05;

  private constructor() {
    this.eventSystem = EventSystem.getInstance();
    this.storage = StorageService.getInstance();
    this.contextSensor = ContextSensorService.getInstance();

    // Subscribe to cognitive samples
    this.eventSystem.subscribe('COGNITIVE_SAMPLE', (event: NeuroLearnEvent) => {
      const { userId, sample: eyeSample } = event.data;
      const converted = this.convertSample(eyeSample);
      this.handleCognitiveSample({ userId, sample: converted });
    });
  }

  private convertSample(eyeSample: any): CognitiveSample {
    return {
      timestamp: eyeSample.timestamp,
      gazeStability: eyeSample.eyeMetrics.gazeStability,
      headStillness: this.calculateHeadStillness(eyeSample.eyeMetrics.headPosition),
      blinkRate: eyeSample.eyeMetrics.blinkRate,
      confidence: 0.8,
      environmentalContext: {
        timeIntelligence: eyeSample.contextSnapshot.timeIntelligence,
        locationContext: eyeSample.contextSnapshot.locationContext,
        digitalBodyLanguage: eyeSample.contextSnapshot.digitalBodyLanguage,
        batteryLevel: eyeSample.contextSnapshot.batteryLevel,
        isCharging: eyeSample.contextSnapshot.isCharging,
        networkQuality: eyeSample.contextSnapshot.networkQuality,
      }
    };
  }

  private calculateHeadStillness(headPosition: { x: number; y: number; z: number }): number {
    const distance = Math.sqrt(headPosition.x ** 2 + headPosition.y ** 2 + (headPosition.z - 1) ** 2);
    return Math.max(0, Math.min(1, 1 - distance * 2));
  }

  public static getInstance(): CognitiveDataService {
    if (!CognitiveDataService.instance) {
      CognitiveDataService.instance = new CognitiveDataService();
    }
    return CognitiveDataService.instance;
  }

  // Process incoming cognitive samples
  private async handleCognitiveSample(data: { userId: string, sample: CognitiveSample }): Promise<void> {
    const { userId, sample } = data;

    // Initialize log for new user
    if (this.log.userId !== userId) {
      await this.initializeUserSession(userId);
    }

    // Store raw sample
    this.log.samples.push(sample);

    // Maintain rolling window
    if (this.log.samples.length > 1000) {
      this.log.samples = this.log.samples.slice(-500);
    }

    // Process sample
    const processedMetrics = await this.processSample(sample);
    this.log.processedMetrics.push(processedMetrics);

    // Update session stats
    this.updateSessionStats(processedMetrics);

    // Emit processed metrics
    this.eventSystem.publish('COGNITIVE_METRICS_UPDATED', 'CognitiveDataService', { userId, metrics: processedMetrics, sessionStats: this.log.sessionStats }, 'medium');

    // Check for attention state changes
    await this.analyzeAttentionState(processedMetrics);
  }

  // Advanced sample processing with ML insights
  private async processSample(sample: CognitiveSample): Promise<ProcessedMetrics> {
    // Create full context snapshot from partial environmental context
    const contextSnapshot: ContextSnapshot = {
      timestamp: new Date(sample.timestamp),
      sessionId: 'cognitive_session',
      timeIntelligence: sample.environmentalContext.timeIntelligence,
      locationContext: sample.environmentalContext.locationContext,
      digitalBodyLanguage: sample.environmentalContext.digitalBodyLanguage,
      batteryLevel: sample.environmentalContext.batteryLevel,
      isCharging: sample.environmentalContext.isCharging,
      networkQuality: sample.environmentalContext.networkQuality as 'excellent' | 'good' | 'fair' | 'poor' | 'offline',
      deviceTemperature: null,
      overallOptimality: 0.5,
      recommendedAction: 'proceed',
      contextQualityScore: 0.8,
      anticipatedChanges: [],
    };

    // Calculate raw attention score
    const rawAttention = calculateAdvancedAttentionScore(
      sample.gazeStability,
      sample.headStillness,
      this.normalizeBlinkRate(sample.blinkRate),
      contextSnapshot,
      sample.environmentalContext.digitalBodyLanguage.cognitiveLoadIndicator
    );

    // Apply signal filtering
    const filteredAttention = this.applySignalFiltering(rawAttention);

    // Calculate cognitive load
    const cognitiveLoad = this.calculateCognitiveLoad(sample);

    // Detect stress indicators
    const stressIndicators = this.detectStressIndicators(sample);

    // Calculate quality score
    const qualityScore = this.calculateQualityScore(sample);

    return {
      timestamp: sample.timestamp,
      rawAttention,
      filteredAttention,
      cognitiveLoad,
      stressIndicators,
      qualityScore
    };
  }

  // Signal filtering for noise reduction
  private applySignalFiltering(rawValue: number): number {
    this.signalBuffer.push(rawValue);

    if (this.signalBuffer.length > this.BUFFER_SIZE) {
      this.signalBuffer.shift();
    }

    // Apply median filter to remove outliers
    const sorted = [...this.signalBuffer].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    // Apply moving average
    const average = this.signalBuffer.reduce((sum, val) => sum + val, 0) / this.signalBuffer.length;

    // Combine median and average for robust filtering
    return 0.6 * median + 0.4 * average;
  }

  // Cognitive load calculation
  private calculateCognitiveLoad(sample: CognitiveSample): number {
    let load = 0;

    // Eye strain indicators
    if (sample.blinkRate > 20) load += 0.3; // High blink rate
    if (sample.gazeStability < 0.5) load += 0.4; // Unstable gaze

    // Environmental stress
    const envContext = sample.environmentalContext;
    load += envContext.digitalBodyLanguage.cognitiveLoadIndicator * 0.3;

    // Distraction factors
    if (envContext.locationContext.distractionRisk === 'high') load += 0.2;

    return Math.max(0, Math.min(1, load));
  }

  // Stress indicator detection
  private detectStressIndicators(sample: CognitiveSample): number[] {
    const indicators: number[] = [];

    // Physiological stress markers
    if (sample.blinkRate > 22) indicators.push(0.8); // Excessive blinking
    if (sample.gazeStability < 0.3) indicators.push(0.7); // Gaze instability
    if (sample.headStillness < 0.4) indicators.push(0.6); // Head movement

    // Environmental stress
    const envStress = sample.environmentalContext.digitalBodyLanguage.stressIndicators;
    indicators.push(envStress);

    return indicators;
  }

  // Data quality assessment
  private calculateQualityScore(sample: CognitiveSample): number {
    let quality = 1.0;

    // Confidence in measurement
    quality *= sample.confidence || 0.8;

    // Environmental quality
    const env = sample.environmentalContext;
    if (env.locationContext.distractionRisk === 'high') quality *= 0.7;
    if (env.batteryLevel < 0.2) quality *= 0.8;
    if (env.networkQuality === 'poor') quality *= 0.9;

    return Math.max(0.1, Math.min(1.0, quality));
  }

  // Normalize blink rate to 0-1 scale
  private normalizeBlinkRate(blinkRate: number): number {
    // Normal range: 15-20 bpm, excessive: >25 bpm
    return Math.max(0, Math.min(1, (blinkRate - 15) / 15));
  }

  // Analyze attention state changes
  private async analyzeAttentionState(metrics: ProcessedMetrics): Promise<void> {
    const recentMetrics = this.log.processedMetrics.slice(-10);

    if (recentMetrics.length < 5) return;

    const averageAttention = recentMetrics.reduce((sum, m) => sum + m.filteredAttention, 0) / recentMetrics.length;
    const trend = this.calculateTrend(recentMetrics.map(m => m.filteredAttention));

    // Detect significant changes
    if (trend.slope < -0.1 && averageAttention < 0.4) {
      this.eventSystem.publish('ATTENTION_DECLINING', 'CognitiveDataService', { severity: 'high', trend: trend.slope, current: metrics.filteredAttention }, 'high');
    } else if (trend.slope > 0.1 && averageAttention > 0.7) {
      this.eventSystem.publish('ATTENTION_PEAK', 'CognitiveDataService', { level: averageAttention, trend: trend.slope }, 'medium');
    }
  }

  // Calculate trend from data points
  private calculateTrend(values: number[]): { slope: number, confidence: number } {
    if (values.length < 3) return { slope: 0, confidence: 0 };

    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * values[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const confidence = Math.abs(slope) * Math.min(1, n / 10);

    return { slope, confidence };
  }

  // Initialize session for new user
  private async initializeUserSession(userId: string): Promise<void> {
    this.log.userId = userId;
    this.log.samples = [];
    this.log.processedMetrics = [];
    this.log.sessionStats = this.createEmptyStats();
  }

  // Update session statistics
  private updateSessionStats(metrics: ProcessedMetrics): void {
    const stats = this.log.sessionStats;

    if (stats.startTime === 0) {
      stats.startTime = metrics.timestamp;
    }

    stats.duration = metrics.timestamp - stats.startTime;

    // Update attention metrics
    const allAttention = this.log.processedMetrics.map(m => m.filteredAttention);
    stats.averageAttention = allAttention.reduce((sum, val) => sum + val, 0) / allAttention.length;
    stats.peakAttention = Math.max(...allAttention);
    stats.lowAttention = Math.min(...allAttention);

    // Calculate stability
    const variance = allAttention.reduce((sum, val) => sum + Math.pow(val - stats.averageAttention, 2), 0) / allAttention.length;
    stats.stabilityScore = 1 - Math.sqrt(variance);
  }

  // Create empty session stats
  private createEmptyStats(): SessionStats {
    return {
      startTime: 0,
      duration: 0,
      averageAttention: 0,
      peakAttention: 0,
      lowAttention: 1,
      stabilityScore: 0,
      interruptions: 0,
      lastSync: null,
      totalSessions: 0
    };
  }

  // Public API methods
  public getLogs(): CognitiveLog {
    return { ...this.log };
  }

  public getSessionStats(): SessionStats {
    return { ...this.log.sessionStats };
  }

  public async saveSessionData(sessionId: string): Promise<void> {
    try {
      await this.storage.saveCognitiveSession(sessionId, this.log);
      console.log(`Cognitive session ${sessionId} saved successfully`);
    } catch (error) {
      console.error('Failed to save cognitive session:', error);
    }
  }

  public clearLogs(): void {
    this.log = {
      userId: '',
      samples: [],
      processedMetrics: [],
      sessionStats: this.createEmptyStats()
    };
    this.signalBuffer = [];
  }

  /**
   * Configure data retention settings
   */
  public async configureRetention(params: { retentionDays: number; saveRawData: boolean; enableCloudSync: boolean }): Promise<void> {
    console.log('Configuring data retention:', params);
    // Store configuration (in a real implementation, this would persist settings)
    // For now, just log the configuration
    this.eventSystem.publish('DATA_RETENTION_CONFIGURED', 'CognitiveDataService', params, 'medium');
  }

  /**
   * Clear processed data
   */
  public async clearProcessedData(): Promise<void> {
    console.log('Clearing processed cognitive data');
    this.log.processedMetrics = [];
    this.eventSystem.publish('PROCESSED_DATA_CLEARED', 'CognitiveDataService', {}, 'medium');
  }

  /**
   * Clear all data
   */
  public async clearAllData(): Promise<void> {
    console.log('Clearing all cognitive data');
    this.log = {
      userId: '',
      samples: [],
      processedMetrics: [],
      sessionStats: this.createEmptyStats()
    };
    this.signalBuffer = [];
    this.eventSystem.publish('ALL_DATA_CLEARED', 'CognitiveDataService', {}, 'medium');
  }

  /**
   * Clear cache
   */
  public async clearCache(): Promise<void> {
    console.log('Clearing cognitive data cache');
    this.signalBuffer = [];
    this.eventSystem.publish('CACHE_CLEARED', 'CognitiveDataService', {}, 'medium');
  }
}
