/**
 *  StorageService with Cognitive Aura 2.0 Context Storage Support
 *
 * This  storage service adds support for the new CAE 2.0 context sensing
 * capabilities, including environmental snapshots, pattern learning data, and
 * predictive analytics storage.
 */

import HybridStorageService from './HybridStorageService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Flashcard,
  Task,
  StudySession,
  MemoryPalace,
  ProgressData,
  Settings,
} from '../../types';
import { LogicStructure } from '../learning/MindMapGeneratorService';
import { FSRSCard, FSRSReviewLog } from '../learning/SpacedRepetitionService';
import { ReadingSession, SourceLink } from '../learning/SpeedReadingService';
import { ContextSnapshot, TimeIntelligence, LocationContext, DigitalBodyLanguage } from '../ai/ContextSensorService';

// ==================== CAE 2.0: Context Storage Interfaces ====================

/**
 * Context snapshot storage format
 */
export interface StoredContextSnapshot {
  id: string;
  sessionId: string;
  timestamp: string; // ISO string
  timeIntelligence: TimeIntelligence;
  locationContext: LocationContext;
  digitalBodyLanguage: DigitalBodyLanguage;
  overallOptimality: number;
  contextQualityScore: number;
  deviceState: {
    batteryLevel: number;
    isCharging: boolean;
    networkQuality: string;
  };
  userId?: string;
}

/**
 * Learned pattern storage
 */
export interface LearnedPattern {
  id: string;
  type: 'optimal_time' | 'productive_location' | 'context_sequence' | 'performance_correlation';
  pattern: {
    triggers: Record<string, any>;
    outcomes: Record<string, any>;
    frequency: number;
    confidence: number;
  };
  lastSeen: string; // ISO string
  effectiveness: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Optimal learning window data
 */
export interface OptimalLearningWindow {
  id: string;
  circadianHour: number; // 0-24
  dayOfWeek: number; // 0-6
  performanceScore: number; // 0-1
  frequency: number; // How often this window occurs
  lastPerformance: number;
  lastSeen: string; // ISO string
  createdAt: string;
  updatedAt: string;
}

/**
 * Known location data
 */
export interface KnownLocation {
  id: string;
  name: string;
  coordinates: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  environment: LocationContext['environment'];
  performanceHistory: number[];
  averagePerformance: number;
  visitCount: number;
  lastVisit: string; // ISO string
  createdAt: string;
  updatedAt: string;
}

/**
 * Cognitive forecasting model data
 */
export interface CognitiveForecasting {
  id: string;
  modelVersion: string;
  predictedContext: string;
  predictedOptimality: number;
  predictionHorizon: number; // Minutes ahead
  actualContext?: string;
  actualOptimality?: number;
  predictionAccuracy?: number;
  createdAt: string;
  evaluatedAt?: string;
}

/**
 * Cognitive sample data
 */
export interface CognitiveSample {
  timestamp: number;
  gazeStability: number;
  headStillness: number;
  blinkRate: number;
  confidence?: number;
  environmentalContext: {
    timeIntelligence: TimeIntelligence;
    locationContext: LocationContext;
    digitalBodyLanguage: DigitalBodyLanguage;
    batteryLevel: number;
    isCharging: boolean;
    networkQuality: string;
  };
}

/**
 * Processed cognitive metrics
 */
export interface ProcessedMetrics {
  timestamp: number;
  rawAttention: number;
  filteredAttention: number;
  cognitiveLoad: number;
  stressIndicators: number[];
  qualityScore: number;
}

/**
 * Session statistics
 */
export interface SessionStats {
  startTime: number;
  duration: number;
  averageAttention: number;
  peakAttention: number;
  lowAttention: number;
  stabilityScore: number;
  interruptions: number;
}

/**
 * Cognitive log data
 */
export interface CognitiveLog {
  userId: string;
  samples: CognitiveSample[];
  processedMetrics: ProcessedMetrics[];
  sessionStats: SessionStats;
}

// ==================== Existing Interfaces ====================

export interface SoundSettings {
  volume: number;
  lastPreset?: string;
  optimalProfile?: Record<string, any>;
  personalizationEnabled?: boolean;
  updatedAt?: string;
}

export interface NeuralLogEntry {
  id: string;
  sessionId?: string;
  preset?: string;
  timestamp: string; // ISO
  metrics?: { cognitiveLoad?: number; entrainmentScore?: number };
  notes?: string;
}

export interface DistractionEvent {
  id: string;
  sessionId: string;
  timestamp: Date;
  reason?: string;
  contextSwitch?: boolean;
  duration?: number;
  triggerType?: 'internal' | 'external' | 'notification' | 'unknown';
  severity?: 1 | 2 | 3 | 4 | 5;
}

export interface FocusSession {
  id: string;
  taskId: string;
  nodeId?: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  plannedDurationMinutes: number;
  distractionCount: number;
  distractionEvents: DistractionEvent[];
  selfReportFocus: 1 | 2 | 3 | 4 | 5;
  distractionReason?: string;
  completionRate: number;
  cognitiveLoadStart: number;
  cognitiveLoadEnd?: number;
  focusLockUsed: boolean;
  todoistTaskCompleted?: boolean;
  neuralNodeStrengthened?: boolean;
  created: Date;
  modified: Date;
}

export interface FocusHealthMetrics {
  streakCount: number;
  averageFocusRating: number;
  distractionsPerSession: number;
  focusEfficiency: number;
  neuralReinforcement: number;
  dailyFocusTime: number;
  weeklyFocusTime: number;
  bestFocusTimeOfDay: string;
  commonDistractionTriggers: string[];
  mostDistractiveDays: string[];
  focusImprovement: number;
}

export interface LogicNode {
  id: string;
  customId?: string; // legacy ID support
  question: string;
  premise1: string;
  premise2: string;
  conclusion: string;
  type: 'deductive' | 'inductive' | 'abductive';
  domain: 'programming' | 'math' | 'english' | 'general';
  difficulty: 1 | 2 | 3 | 4 | 5;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: Date;
  lastAccessed: Date;
  totalAttempts: number;
  correctAttempts: number;
  accessCount: number;
  stability?: number;
  fsrsDifficulty?: number;
  lastReview?: Date;
  state?: number;
  focusSessionStrength?: number;
  distractionPenalty?: number;
  created: Date;
  modified: Date;
}

export interface EnhancedFlashcard extends Flashcard {
  stability?: number;
  fsrsDifficulty?: number;
  lastReview?: Date;
  state?: number;
  lapses?: number;
  elapsed_days?: number;
  scheduled_days?: number;
  focusSessionStrength?: number;
  distractionWeakening?: number;
}

/**
 * Neuroplasticity session data for tracking synapse strengthening sessions
 */
export interface NeuroplasticitySession {
  id: string;
  sessionType: 'synapse_strengthening' | 'pathway_building' | 'cluster_integration';
  targetEdgeIds: string[];
  startTime: Date;
  endTime?: Date;
  completedTasks: number;
  successRate: number;
  cognitiveStrain: number;
  plasticityGains: Array<{ edgeId: string; strengthDelta: number }>;
  adaptationsTriggered: string[];
  nextSessionRecommendations: string[];
}

/**
 * Synapse data for storing neural connection information
 */
export interface SynapseData {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  strength: number; // 0-1 normalized
  lastPracticeDate: Date;
  practiceCount: number;
  retentionRate: number;
  plasticityScore: number;
  urgencyLevel: 'critical' | 'moderate' | 'stable';
  connectionType: 'association' | 'prerequisite' | 'similarity' | 'logical' | 'temporal';
  microTasksGenerated: number;
  strengthHistory: Array<{ date: Date; strength: number }>;
  neuralPathways: string[];
  cognitiveLoad: number;
  lastReviewResult: 'success' | 'partial' | 'failed' | null;
}

/**
 *  StorageService with CAE 2.0 Support
 * Maintains backward compatibility while adding anticipatory learning capabilities
 */
export class StorageService {
  private static instance: StorageService;
  private hybridService: HybridStorageService | null = null;

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private constructor() {
    // Lazy initialization to avoid circular dependency
  }

  private getHybridService(): HybridStorageService {
    if (!this.hybridService) {
      this.hybridService = HybridStorageService.getInstance();
    }
    return this.hybridService;
  }

  // ==================== CAE 2.0: CONTEXT STORAGE METHODS ====================

  /**
   * Store context snapshot for pattern learning and analytics
  *
  * IMPORTANT: All producers of environmental/context snapshots (CAE 2.0)
  * must call `StorageService.getInstance().saveContextSnapshot(snapshot)`
  * so the snapshot flows through the HybridStorageService hot→warm→cold
  * pipeline. Direct writes to the warm DB or AsyncStorage will bypass
  * merge/conflict resolution, queueing for cold sync, telemetry, and
  * retention/cleanup policies — please use the facade to ensure
  * consistent behavior across the CAE stack.
   */
  async saveContextSnapshot(snapshot: ContextSnapshot): Promise<void> {
    const storedSnapshot: StoredContextSnapshot = {
      id: `context_${snapshot.timestamp.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: snapshot.sessionId,
      timestamp: snapshot.timestamp.toISOString(),
      timeIntelligence: snapshot.timeIntelligence,
      locationContext: {
        ...snapshot.locationContext,
        coordinates: snapshot.locationContext.coordinates || { latitude: 0, longitude: 0 },
      },
      digitalBodyLanguage: snapshot.digitalBodyLanguage,
      overallOptimality: snapshot.overallOptimality,
      contextQualityScore: snapshot.contextQualityScore,
      deviceState: {
        batteryLevel: snapshot.batteryLevel,
        isCharging: snapshot.isCharging,
        networkQuality: snapshot.networkQuality,
      },
    };

    return this.getHybridService().saveContextSnapshot(storedSnapshot);
  }

  /**
   * Get context snapshots for analysis
   */
  async getContextSnapshots(
    startDate?: Date,
    endDate?: Date,
    limit?: number
  ): Promise<StoredContextSnapshot[]> {
    return this.getHybridService().getContextSnapshots?.(startDate, endDate, limit) || [];
  }

  /**
   * Get context analytics for a specific time period
   */
  async getContextAnalytics(days: number = 30): Promise<{
    totalSnapshots: number;
    averageOptimality: number;
    optimalTimePatterns: Array<{
      hour: number;
      dayOfWeek: number;
      frequency: number;
      averageOptimality: number;
    }>;
    locationEffectiveness: Array<{
      environment: string;
      averageOptimality: number;
      frequency: number;
    }>;
    dblPatterns: Array<{
      state: string;
      frequency: number;
      averageOptimality: number;
    }>;
  }> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

    const snapshots = await this.getContextSnapshots(startDate, endDate);

    if (snapshots.length === 0) {
      return {
        totalSnapshots: 0,
        averageOptimality: 0,
        optimalTimePatterns: [],
        locationEffectiveness: [],
        dblPatterns: [],
      };
    }

    const totalOptimality = snapshots.reduce((sum, s) => sum + s.overallOptimality, 0);
    const averageOptimality = totalOptimality / snapshots.length;

    // Analyze time patterns
    const timePatterns = new Map<string, { optimality: number; count: number }>();
    const locationPatterns = new Map<string, { optimality: number; count: number }>();
    const dblPatterns = new Map<string, { optimality: number; count: number }>();

    snapshots.forEach(snapshot => {
      // Time patterns
      const timeKey = `${snapshot.timeIntelligence.circadianHour.toFixed(0)}_${snapshot.timeIntelligence.dayOfWeek}`;
      const existing = timePatterns.get(timeKey) || { optimality: 0, count: 0 };
      timePatterns.set(timeKey, {
        optimality: existing.optimality + snapshot.overallOptimality,
        count: existing.count + 1,
      });

      // Location patterns
      const locExisting = locationPatterns.get(snapshot.locationContext.environment) || { optimality: 0, count: 0 };
      locationPatterns.set(snapshot.locationContext.environment, {
        optimality: locExisting.optimality + snapshot.overallOptimality,
        count: locExisting.count + 1,
      });

      // DBL patterns
      const dblExisting = dblPatterns.get(snapshot.digitalBodyLanguage.state) || { optimality: 0, count: 0 };
      dblPatterns.set(snapshot.digitalBodyLanguage.state, {
        optimality: dblExisting.optimality + snapshot.overallOptimality,
        count: dblExisting.count + 1,
      });
    });

    return {
      totalSnapshots: snapshots.length,
      averageOptimality,
      optimalTimePatterns: Array.from(timePatterns.entries()).map(([key, data]) => {
        const [hourStr, dayOfWeek] = key.split('_');
        return {
          hour: parseInt(hourStr),
          dayOfWeek: parseInt(dayOfWeek),
          frequency: data.count,
          averageOptimality: data.optimality / data.count,
        };
      }),
      locationEffectiveness: Array.from(locationPatterns.entries()).map(([environment, data]) => ({
        environment,
        averageOptimality: data.optimality / data.count,
        frequency: data.count,
      })),
      dblPatterns: Array.from(dblPatterns.entries()).map(([state, data]) => ({
        state,
        frequency: data.count,
        averageOptimality: data.optimality / data.count,
      })),
    };
  }

  /**
   * Save learned pattern
   */
  async saveLearnedPattern(pattern: Omit<LearnedPattern, 'id' | 'createdAt' | 'updatedAt'>): Promise<LearnedPattern> {
    const now = new Date().toISOString();
    const savedPattern: LearnedPattern = {
      ...pattern,
      id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    await this.getHybridService().saveLearnedPattern?.(savedPattern);
    return savedPattern;
  }

  // ==================== GENERIC ITEM PASS-THROUGH ====================
  // Expose a minimal getItem/setItem pair so existing modules that
  // rely on ad-hoc AsyncStorage keys can use the StorageService facade
  // instead of reaching into HybridStorageService directly.
  async getItem(key: string): Promise<any> {
    return this.getHybridService().getItem(key);
  }

  async setItem(key: string, value: any): Promise<void> {
    return this.getHybridService().setItem(key, value);
  }

  /**
   * Remove an item from storage. Use HybridService if available; fall back to AsyncStorage.
   */
  async removeItem(key: string): Promise<void> {
    try {
      const svc: any = this.getHybridService();
      if (svc && typeof svc.removeItem === 'function') return svc.removeItem(key);
    } catch (e) {
      // continue to fallback
    }
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      // swallow
    }
  }

  // ==================== USER PROGRESS FACADE ====================
  async getUserProgress(userId: string): Promise<any | null> {
    return this.getHybridService().getUserProgress?.(userId) ?? null;
  }

  async saveUserProgress(userId: string, progress: any): Promise<void> {
    return this.getHybridService().saveUserProgress?.(userId, progress);
  }

  /**
   * Get learned patterns
   */
  async getLearnedPatterns(type?: LearnedPattern['type']): Promise<LearnedPattern[]> {
    const patterns = await this.getHybridService().getLearnedPatterns?.() || [];
    return type ? patterns.filter(p => p.type === type) : patterns;
  }

  /**
   * Save optimal learning window
   */
  async saveOptimalLearningWindow(window: Omit<OptimalLearningWindow, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const now = new Date().toISOString();
    const savedWindow: OptimalLearningWindow = {
      ...window,
      id: `window_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    return this.getHybridService().saveOptimalLearningWindow?.(savedWindow);
  }

  /**
   * Get optimal learning windows
   */
  async getOptimalLearningWindows(): Promise<OptimalLearningWindow[]> {
    return this.getHybridService().getOptimalLearningWindows?.() || [];
  }

  /**
   * Save known location
   */
  async saveKnownLocation(location: Omit<KnownLocation, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const now = new Date().toISOString();
    const savedLocation: KnownLocation = {
      ...location,
      id: `location_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    return this.getHybridService().saveKnownLocation?.(savedLocation);
  }

  /**
   * Get known locations
   */
  async getKnownLocations(): Promise<KnownLocation[]> {
    return this.getHybridService().getKnownLocations?.() || [];
  }

  /**
   * Save cognitive forecasting result
   */
  async saveCognitiveForecast(forecast: Omit<CognitiveForecasting, 'id' | 'createdAt'>): Promise<void> {
    const savedForecast: CognitiveForecasting = {
      ...forecast,
      id: `forecast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    return this.getHybridService().saveCognitiveForecast?.(savedForecast);
  }

  /**
   * Get cognitive forecasting accuracy metrics
   */
  async getForecastingMetrics(days: number = 7): Promise<{
    totalForecasts: number;
    averageAccuracy: number;
    accuracyByHorizon: Record<number, number>;
    modelPerformance: Record<string, number>;
  }> {
    const forecasts = await this.getHybridService().getCognitiveForecasts?.() || [];
    const recentForecasts = forecasts.filter(f =>
      f.evaluatedAt &&
      new Date(f.evaluatedAt) > new Date(Date.now() - (days * 24 * 60 * 60 * 1000))
    );

    if (recentForecasts.length === 0) {
      return {
        totalForecasts: 0,
        averageAccuracy: 0,
        accuracyByHorizon: {},
        modelPerformance: {},
      };
    }

    const totalAccuracy = recentForecasts.reduce((sum, f) => sum + (f.predictionAccuracy || 0), 0);
    const averageAccuracy = totalAccuracy / recentForecasts.length;

    // Group by prediction horizon
    const horizonGroups = new Map<number, number[]>();
    const modelGroups = new Map<string, number[]>();

    recentForecasts.forEach(forecast => {
      if (forecast.predictionAccuracy !== undefined) {
        // By horizon
        const existing = horizonGroups.get(forecast.predictionHorizon) || [];
        existing.push(forecast.predictionAccuracy);
        horizonGroups.set(forecast.predictionHorizon, existing);

        // By model version
        const modelExisting = modelGroups.get(forecast.modelVersion) || [];
        modelExisting.push(forecast.predictionAccuracy);
        modelGroups.set(forecast.modelVersion, modelExisting);
      }
    });

    const accuracyByHorizon: Record<number, number> = {};
    horizonGroups.forEach((accuracies, horizon) => {
      accuracyByHorizon[horizon] = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
    });

    const modelPerformance: Record<string, number> = {};
    modelGroups.forEach((accuracies, model) => {
      modelPerformance[model] = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
    });

    return {
      totalForecasts: recentForecasts.length,
      averageAccuracy,
      accuracyByHorizon,
      modelPerformance,
    };
  }

  // ==================== EXISTING METHODS (Maintained for backward compatibility) ====================

  async saveSettings(settings: Settings): Promise<void> {
    return this.getHybridService().saveSettings(settings);
  }

  async getSettings(): Promise<Settings> {
    return this.getHybridService().getSettings();
  }

  // ==================== FLASHCARDS ====================
  async saveFlashcards(flashcards: (Flashcard | Flashcard)[]): Promise<void> {
    return this.getHybridService().saveFlashcards(flashcards);
  }

  async getFlashcards(): Promise<(Flashcard | Flashcard)[]> {
    return this.getHybridService().getFlashcards() as Promise<(Flashcard | Flashcard)[]>;
  }

  // ==================== LOGIC NODES ====================
  async saveLogicNodes(nodes: LogicNode[]): Promise<void> {
    return this.getHybridService().saveLogicNodes(nodes);
  }

  async getLogicNodes(): Promise<LogicNode[]> {
    return this.getHybridService().getLogicNodes();
  }

  async addLogicNode(nodeData: Partial<LogicNode>): Promise<LogicNode | null> {
    return this.getHybridService().addLogicNode(nodeData);
  }

  async updateLogicNode(nodeId: string, updates: Partial<LogicNode>): Promise<LogicNode | null> {
    return this.getHybridService().updateLogicNode(nodeId, updates);
  }

  // ==================== FOCUS SESSIONS ====================
  async saveFocusSession(session: FocusSession): Promise<void> {
    return this.getHybridService().saveFocusSession(session);
  }

  async getFocusSessions(): Promise<FocusSession[]> {
    return this.getHybridService().getFocusSessions();
  }

  async getSleepEntries(userId: string, days: number = 30): Promise<any[]> {
    return this.getHybridService().getSleepEntries?.(userId, days) || [];
  }

  async saveSleepEntries(userId: string, entries: any[]): Promise<void> {
    return this.getHybridService().saveSleepEntries?.(userId, entries);
  }

  async getCognitiveMetrics(userId: string): Promise<any[]> {
    return this.getHybridService().getCognitiveMetrics?.(userId) || [];
  }

  async saveCognitiveMetrics(userId: string, metrics: any[]): Promise<void> {
    return this.getHybridService().saveCognitiveMetrics?.(userId, metrics);
  }

  async saveCognitiveSession(sessionId: string, log: CognitiveLog): Promise<void> {
    return this.getHybridService().saveCognitiveSession?.(sessionId, log);
  }

  async getHealthMetrics(userId: string): Promise<any | null> {
    return this.getHybridService().getHealthMetrics?.(userId) || null;
  }

  async saveHealthMetrics(userId: string, metrics: any): Promise<void> {
    return this.getHybridService().saveHealthMetrics?.(userId, metrics);
  }

  async getFocusSession(sessionId: string): Promise<FocusSession | null> {
    return this.getHybridService().getFocusSession(sessionId);
  }

  async saveDistractionEvent(event: DistractionEvent): Promise<void> {
    return this.getHybridService().saveDistractionEvent(event);
  }

  async getDistractionEvents(sessionId?: string): Promise<DistractionEvent[]> {
    return this.getHybridService().getDistractionEvents(sessionId);
  }

  async saveFocusHealthMetrics(metrics: FocusHealthMetrics): Promise<void> {
    return this.getHybridService().saveFocusHealthMetrics(metrics);
  }

  async getFocusHealthMetrics(): Promise<FocusHealthMetrics | null> {
    // HybridStorageService returns a non-null FocusHealthMetrics by design
    // Promote to non-nullable here to match existing callers which expect values
    return this.getHybridService().getFocusHealthMetrics();
  }

  // ==================== DASHBOARD / UTILITIES PROXIES ====================
  async getCardsDueToday(): Promise<{
    flashcards: (Flashcard | Flashcard)[];
    logicNodes: LogicNode[];
    criticalLogicCount: number;
  }> {
    return this.getHybridService().getCardsDueToday?.() || { flashcards: [], logicNodes: [], criticalLogicCount: 0 };
  }

  async calculateCurrentStudyStreak(): Promise<number> {
    return this.getHybridService().calculateCurrentStudyStreak?.() ?? 0;
  }

  async pruneOldFocusData(olderThanDays: number = 90): Promise<void> {
    return this.getHybridService().pruneOldFocusData?.(olderThanDays);
  }

  // ==================== READING SESSIONS ====================
  async saveReadingSession(session: ReadingSession): Promise<void> {
    return this.getHybridService().saveReadingSession(session);
  }

  async getReadingSessions(): Promise<ReadingSession[]> {
    return this.getHybridService().getReadingSessions();
  }

  async saveSourceLinks(links: SourceLink[]): Promise<void> {
    return this.getHybridService().saveSourceLinks(links);
  }

  async getSourceLinks(): Promise<SourceLink[]> {
    return this.getHybridService().getSourceLinks();
  }

  // ==================== SOUND SETTINGS ====================
  async saveSoundSettings(settings: SoundSettings): Promise<void> {
    return this.getHybridService().saveSoundSettings(settings);
  }

  async getSoundSettings(): Promise<SoundSettings | null> {
    return this.getHybridService().getSoundSettings();
  }

  async appendNeuralLog(entry: NeuralLogEntry): Promise<void> {
    return this.getHybridService().appendNeuralLog(entry);
  }

  async getNeuralLogs(): Promise<NeuralLogEntry[]> {
    return this.getHybridService().getNeuralLogs();
  }

  // ==================== LEGACY COMPATIBILITY STUBS ====================
  async getStudySessions(): Promise<StudySession[]> {
    return this.getHybridService().getStudySessions?.() || [];
  }

  async saveStudySession(session: StudySession): Promise<void> {
    return this.getHybridService().saveStudySession?.(session);
  }

  async saveStudySessions(sessions: StudySession[]): Promise<void> {
    return this.getHybridService().saveStudySessions?.(sessions);
  }
  async getProgressData(): Promise<ProgressData> {
    return {
      studyStreak: 1,
      totalFocusTime: 0,
      todayFocusTime: 0,
      lastStudyDate: new Date().toDateString(),
      retentionRate: 0,
      masteredCards: 0,
      completedSessions: 0,
      weeklyData: [],
    };
  }
  async saveProgressData(progress: ProgressData): Promise<void> {}
  async getTasks(): Promise<Task[]> {
    return this.getHybridService().getTasks?.() || [];
  }

  async saveTasks(tasks: Task[]): Promise<void> {
    return this.getHybridService().saveTasks?.(tasks);
  }
  async getMemoryPalaces(): Promise<MemoryPalace[]> {
    return this.getHybridService().getMemoryPalaces?.() || [];
  }

  async saveMemoryPalaces(palaces: MemoryPalace[]): Promise<void> {
    return this.getHybridService().saveMemoryPalaces?.(palaces);
  }

  async clearAllData(): Promise<void> {
    return this.getHybridService().clearAllData();
  }

  async exportAllData(): Promise<string> {
    const data = {
      // Existing data
      flashcards: await this.getFlashcards(),
      logicNodes: await this.getLogicNodes(),
      focusSessions: await this.getFocusSessions(),
      readingSessions: await this.getReadingSessions(),
      settings: await this.getSettings(),

      // CAE 2.0 data
      contextSnapshots: await this.getContextSnapshots(),
      learnedPatterns: await this.getLearnedPatterns(),
      optimalLearningWindows: await this.getOptimalLearningWindows(),
      knownLocations: await this.getKnownLocations(),

      exportDate: new Date().toISOString(),
      version: '2.2.0',
      caeVersion: '2.0',
    };

    return JSON.stringify(data, null, 2);
  }

  async getStorageInfo(): Promise<{ keys: string[]; estimatedSize: number; }> {
    const info = await this.getHybridService().getStorageInfo();
    return {
      keys: ['hybrid-storage', 'context-snapshots', 'learned-patterns'],
      estimatedSize: info.cacheSize,
    };
  }

  /**
   * Reset sound optimal profiles (proxy to hybrid service)
   */
  async resetOptimalProfiles(): Promise<void> {
    return this.getHybridService().resetOptimalProfiles?.();
  }

  // Health-related methods for AdvancedSleepService and HabitFormationService
  async getLastSleepEntry(userId: string): Promise<any> {
    // Return mock data for now - implement actual storage later
    return null;
  }

  async getUserHealthProfile(userId: string): Promise<any> {
    // Return mock data for now - implement actual storage later
    return {
      userId,
      sleepGoal: 8,
      stressLevel: 0.5,
      energyLevel: 0.7,
      lastUpdated: new Date()
    };
  }

  async getMovementData(userId: string, days: number): Promise<any[]> {
    // Return mock data for now - implement actual storage later
    return [];
  }

  async getHabit(userId: string, habitId: string): Promise<any> {
    // Return mock data for now - implement actual storage later
    return null;
  }

  async getHabitCompletionHistory(userId: string, habitId: string, days: number): Promise<any[]> {
    // Return mock data for now - implement actual storage later
    return [];
  }

  async getUserHabits(userId: string): Promise<any[]> {
    // Return mock data for now - implement actual storage later
    return [];
  }

  async getRewardHistory(userId: string, days: number): Promise<any[]> {
    // Return mock data for now - implement actual storage later
    return [];
  }
}

// Maintain backward compatibility
// Remove the duplicate class declaration to fix duplicate identifier error

export default StorageService;
