import AsyncStorage from '@react-native-async-storage/async-storage';
import SupabaseService from './SupabaseService';
import { HybridStorageService } from './HybridStorageService';

import {
  Flashcard,
  Task,
  StudySession,
  MemoryPalace,
  ProgressData,
  Settings,
} from '../types';
import { LogicStructure } from './MindMapGeneratorService';
import { FSRSCard, FSRSReviewLog } from './SpacedRepetitionService';
import { ReadingSession, SourceLink } from './SpeedReadingService';

// ==================== Phase 7: Soundscape storage interfaces ====================
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

/**
 * Phase 5.5: Focus Reinforcement Types
 *
 * Anti-distraction tracking and focus session analytics
 */

export interface DistractionEvent {
  id: string;
  sessionId: string;
  timestamp: Date;
  reason?: string;
  contextSwitch?: boolean; // True if user switched apps/screens
  duration?: number; // How long the distraction lasted
  triggerType?: 'internal' | 'external' | 'notification' | 'unknown';
  severity?: 1 | 2 | 3 | 4 | 5; // User-reported distraction severity
}

export interface FocusSession {
  id: string;
  taskId: string;
  nodeId?: string; // Neural node being focused on (from Phase 5)
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  plannedDurationMinutes: number; // Original plan vs actual
  distractionCount: number;
  distractionEvents: DistractionEvent[];
  selfReportFocus: 1 | 2 | 3 | 4 | 5; // Micro-reflection rating
  distractionReason?: string; // Main reason for distractions
  completionRate: number; // How much of the planned work was done

  // Neural health impact
  cognitiveLoadStart: number; // Mental state when session started
  cognitiveLoadEnd?: number; // Mental state when session ended
  focusLockUsed: boolean; // Was neural focus lock active?

  // Task convergence
  todoistTaskCompleted?: boolean; // Was the linked Todoist task completed?
  neuralNodeStrengthened?: boolean; // Did this session strengthen neural connections?

  created: Date;
  modified: Date;
}

/**
 * Phase 5.5: Focus Health Metrics
 */
export interface FocusHealthMetrics {
  streakCount: number; // Days with successful focused sessions
  averageFocusRating: number; // Average selfReportFocus across recent sessions
  distractionsPerSession: number; // Average distractions per session
  focusEfficiency: number; // Actual time / planned time ratio
  neuralReinforcement: number; // How much focus sessions strengthen neural paths

  // Time-based analysis
  dailyFocusTime: number; // Minutes of successful focus today
  weeklyFocusTime: number; // Minutes of successful focus this week
  bestFocusTimeOfDay: string; // When user is most focused

  // Distraction patterns
  commonDistractionTriggers: string[];
  mostDistractiveDays: string[]; // Which days are hardest to focus
  focusImprovement: number; // Trend: improving (+) or declining (-)
}

/**
 * Enhanced Logic Training Node for structured critical thinking
 */
export interface LogicNode {
  id: string;
  question: string;
  premise1: string;
  premise2: string;
  conclusion: string;
  type: 'deductive' | 'inductive' | 'abductive';
  domain: 'programming' | 'math' | 'english' | 'general';
  difficulty: 1 | 2 | 3 | 4 | 5;

  // FSRS integration
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: Date;
  lastAccessed: Date;

  // Performance tracking
  totalAttempts: number;
  correctAttempts: number;
  accessCount: number;

  // FSRS-specific metrics
  stability?: number;
  fsrsDifficulty?: number;
  lastReview?: Date;
  state?: number; // CardState enum value

  // Phase 5.5: Focus impact
  focusSessionStrength?: number; // How much focus sessions have strengthened this node
  distractionPenalty?: number; // Accumulated penalty from distracted sessions

  created: Date;
  modified: Date;
}

/**
 * Enhanced Flashcard interface with complete FSRS support
 */
export interface EnhancedFlashcard extends Flashcard {
  // FSRS metrics - ensuring all data is saved
  stability?: number;
  fsrsDifficulty?: number;
  lastReview?: Date;
  state?: number; // CardState enum
  lapses?: number;
  elapsed_days?: number;
  scheduled_days?: number;

  // Phase 5.5: Focus impact
  focusSessionStrength?: number; // How much focus sessions have strengthened this card
  distractionWeakening?: number; // How much distractions have weakened this card
}

/**
 * Complete Storage Service with FSRS, Logic Training, Focus Tracking, and ALL existing methods
 * Phase 5.5: Anti-Distraction Layer with session lifecycle management
 */
export class StorageService {
  private static instance: StorageService;
  private hybridService: HybridStorageService;

  // Storage keys (both new and legacy)
  private static readonly KEYS = {
    // FSRS Enhanced keys
    FLASHCARDS: '@neurolearn/flashcards',
    TASKS: '@neurolearn/tasks',
    STUDY_SESSIONS: '@neurolearn/study_sessions',
    MEMORY_PALACES: '@neurolearn/memory_palaces',
    LOGIC_NODES: '@neurolearn/logic_nodes',
    FSRS_CARDS: '@neurolearn/fsrs_cards',
    FSRS_REVIEW_LOGS: '@neurolearn/fsrs_review_logs',

    // Phase 5.5: Focus reinforcement keys
    FOCUS_SESSIONS: '@neurolearn/focus_sessions',
    DISTRACTION_EVENTS: '@neurolearn/distraction_events',
    FOCUS_HEALTH_METRICS: '@neurolearn/focus_health_metrics',

    // Legacy keys (for backward compatibility)
    LEGACY_FLASHCARDS: 'neurolearn_flashcards',
    LEGACY_SESSIONS: 'neurolearn_sessions',
    LEGACY_PROGRESS: 'neurolearn_progress',
    LEGACY_TASKS: 'neurolearn_tasks',
    LEGACY_SETTINGS: 'neurolearn_settings',
    LEGACY_PALACES: 'neurolearn_palaces',

    // New keys
    USER_PREFERENCES: '@neurolearn/user_preferences',
    APP_SETTINGS: '@neurolearn/app_settings',
    PROGRESS_DATA: '@neurolearn/progress_data',
    SETTINGS: '@neurolearn/settings',

    // Phase 6: Speed Reading keys
    READING_SESSIONS: '@neurolearn/reading_sessions',
    READING_SOURCE_LINKS: '@neurolearn/reading_source_links',
    // Phase 7: Soundscape keys
    SOUND_SETTINGS: '@neurolearn/sound_settings',
    NEURAL_LOGS: '@neurolearn/neural_performance_logs',
  };

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private constructor() {
    this.hybridService = HybridStorageService.getInstance();
  }

  private async shouldUseSupabase(): Promise<boolean> {
    try {
      const supabaseService = SupabaseService.getInstance();
      return await supabaseService.isAuthenticated();
    } catch (error) {
      return false;
    }
  }

  private async getSupabaseService(): Promise<SupabaseService> {
    return SupabaseService.getInstance();
  }

  // ==================== PHASE 5.5: FOCUS SESSION OPERATIONS ====================

  /**
   * Save a completed focus session with all distraction tracking
   */
  async saveFocusSession(session: FocusSession): Promise<void> {
    try {
      const sessions = await this.getFocusSessions();
      sessions.push(session);
      await this.saveFocusSessions(sessions);

      // Update focus health metrics
      await this.updateFocusHealthMetrics(session);

      console.log(
        `💾 Saved focus session: ${session.id} (${session.distractionCount} distractions)`,
      );
    } catch (error: any) {
      console.error('Error saving focus session:', error);
      throw new Error(`Failed to save focus session: ${error.message}`);
    }
  }

  /**
   * Save multiple focus sessions
   */
  async saveFocusSessions(sessions: FocusSession[]): Promise<void> {
    try {
      const serializedSessions = sessions.map((session) => ({
        ...session,
        startTime: session.startTime.toISOString(),
        endTime: session.endTime.toISOString(),
        distractionEvents: session.distractionEvents.map((event) => ({
          ...event,
          timestamp: event.timestamp.toISOString(),
        })),
        created: session.created.toISOString(),
        modified: session.modified.toISOString(),
      }));

      await AsyncStorage.setItem(
        StorageService.KEYS.FOCUS_SESSIONS,
        JSON.stringify(serializedSessions),
      );
    } catch (error: any) {
      console.error('Error saving focus sessions:', error);
      throw new Error(`Failed to save focus sessions: ${error.message}`);
    }
  }

  /**
   * Load all focus sessions with distraction tracking
   */
  async getFocusSessions(): Promise<FocusSession[]> {
    try {
      const data = await AsyncStorage.getItem(
        StorageService.KEYS.FOCUS_SESSIONS,
      );

      if (!data) {
        return [];
      }

      const sessions = JSON.parse(data);
      return sessions.map((session: any) => ({
        ...session,
        startTime: new Date(session.startTime),
        endTime: new Date(session.endTime),
        distractionEvents: session.distractionEvents.map((event: any) => ({
          ...event,
          timestamp: new Date(event.timestamp),
        })),
        created: new Date(session.created),
        modified: new Date(session.modified),
      }));
    } catch (error) {
      console.error('Error loading focus sessions:', error);
      return [];
    }
  }

  /**
   * Get focus sessions for a specific session ID
   */
  async getFocusSession(sessionId: string): Promise<FocusSession | null> {
    try {
      const sessions = await this.getFocusSessions();
      return sessions.find((session) => session.id === sessionId) || null;
    } catch (error) {
      console.error('Error getting focus session:', error);
      return null;
    }
  }

  /**
   * Phase 5.5: Save a distraction event during an active focus session
   */
  async saveDistractionEvent(event: DistractionEvent): Promise<void> {
    try {
      const events = await this.getDistractionEvents();
      events.push(event);

      const serializedEvents = events.map((e) => ({
        ...e,
        timestamp: e.timestamp.toISOString(),
      }));

      await AsyncStorage.setItem(
        StorageService.KEYS.DISTRACTION_EVENTS,
        JSON.stringify(serializedEvents),
      );

      console.log(`😬 Distraction logged: ${event.reason || 'Unknown reason'}`);
    } catch (error: any) {
      console.error('Error saving distraction event:', error);
      throw new Error(`Failed to save distraction event: ${error.message}`);
    }
  }

  /**
   * Get all distraction events (or for a specific session)
   */
  async getDistractionEvents(sessionId?: string): Promise<DistractionEvent[]> {
    try {
      const data = await AsyncStorage.getItem(
        StorageService.KEYS.DISTRACTION_EVENTS,
      );

      if (!data) {
        return [];
      }

      const events = JSON.parse(data);
      const deserializedEvents = events.map((event: any) => ({
        ...event,
        timestamp: new Date(event.timestamp),
      }));

      if (sessionId) {
        return deserializedEvents.filter(
          (event: DistractionEvent) => event.sessionId === sessionId,
        );
      }

      return deserializedEvents;
    } catch (error) {
      console.error('Error loading distraction events:', error);
      return [];
    }
  }

  /**
   * Phase 5.5: Prune old focus sessions and distractions to prevent storage bloat
   */
  async pruneOldFocusData(olderThanDays: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date(
        Date.now() - olderThanDays * 24 * 60 * 60 * 1000,
      );

      // Prune old focus sessions
      const allSessions = await this.getFocusSessions();
      const recentSessions = allSessions.filter(
        (session) => session.endTime > cutoffDate,
      );
      if (recentSessions.length !== allSessions.length) {
        await this.saveFocusSessions(recentSessions);
        console.log(
          `🗑️ Pruned ${
            allSessions.length - recentSessions.length
          } old focus sessions`,
        );
      }

      // Prune old distraction events
      const allDistractions = await this.getDistractionEvents();
      const recentDistractions = allDistractions.filter(
        (event) => event.timestamp > cutoffDate,
      );
      if (recentDistractions.length !== allDistractions.length) {
        const serializedEvents = recentDistractions.map((e) => ({
          ...e,
          timestamp: e.timestamp.toISOString(),
        }));
        await AsyncStorage.setItem(
          StorageService.KEYS.DISTRACTION_EVENTS,
          JSON.stringify(serializedEvents),
        );
        console.log(
          `🗑️ Pruned ${
            allDistractions.length - recentDistractions.length
          } old distraction events`,
        );
      }
    } catch (error) {
      console.error('Error pruning old focus data:', error);
    }
  }

  /**
   * Phase 5.5: Update focus health metrics based on completed session
   */
  private async updateFocusHealthMetrics(session: FocusSession): Promise<void> {
    try {
      let metrics = await this.getFocusHealthMetrics();

      const allSessions = await this.getFocusSessions();
      const recentSessions = allSessions
        .filter(
          (s) => s.endTime > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        ) // Last 30 days
        .sort((a, b) => b.endTime.getTime() - a.endTime.getTime());

      // Update streak
      const today = new Date().toDateString();
      const lastSessionToday = recentSessions.find(
        (s) => s.endTime.toDateString() === today && s.selfReportFocus >= 3,
      );

      if (lastSessionToday) {
        metrics.streakCount = this.calculateFocusStreak(recentSessions);
      } else if (session.selfReportFocus < 3) {
        metrics.streakCount = 0; // Reset streak on poor focus
      }

      // Update averages
      if (recentSessions.length > 0) {
        metrics.averageFocusRating =
          recentSessions.reduce((sum, s) => sum + s.selfReportFocus, 0) /
          recentSessions.length;
        metrics.distractionsPerSession =
          recentSessions.reduce((sum, s) => sum + s.distractionCount, 0) /
          recentSessions.length;
        metrics.focusEfficiency =
          recentSessions.reduce(
            (sum, s) => sum + s.durationMinutes / s.plannedDurationMinutes,
            0,
          ) / recentSessions.length;
      }

      // Calculate daily/weekly focus time
      const todaySessions = recentSessions.filter(
        (s) => s.endTime.toDateString() === today,
      );
      const weekSessions = recentSessions.filter(
        (s) => s.endTime > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      );

      metrics.dailyFocusTime = todaySessions.reduce(
        (sum, s) => sum + s.durationMinutes,
        0,
      );
      metrics.weeklyFocusTime = weekSessions.reduce(
        (sum, s) => sum + s.durationMinutes,
        0,
      );

      // Analyze distraction patterns
      const allDistractionEvents = recentSessions.flatMap(
        (s) => s.distractionEvents,
      );
      const reasonCounts = new Map<string, number>();

      allDistractionEvents.forEach((event) => {
        if (event.reason) {
          reasonCounts.set(
            event.reason,
            (reasonCounts.get(event.reason) || 0) + 1,
          );
        }
      });

      metrics.commonDistractionTriggers = Array.from(reasonCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([reason]) => reason);

      // Calculate neural reinforcement (positive impact of good sessions)
      const reinforcingSessions = recentSessions.filter(
        (s) => s.selfReportFocus >= 4 && s.distractionCount <= 2,
      );
      metrics.neuralReinforcement =
        reinforcingSessions.length / Math.max(1, recentSessions.length);

      await this.saveFocusHealthMetrics(metrics);
    } catch (error) {
      console.error('Error updating focus health metrics:', error);
    }
  }

  /**
   * Calculate current focus streak
   */
  private calculateFocusStreak(sessions: FocusSession[]): number {
    if (sessions.length === 0) return 0;

    let streak = 0;
    const today = new Date();

    // Check each day backwards from today
    for (let i = 0; i < 30; i++) {
      // Max 30 days
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateString = checkDate.toDateString();

      const daySession = sessions.find(
        (s) =>
          s.endTime.toDateString() === dateString && s.selfReportFocus >= 3,
      );

      if (daySession) {
        streak++;
      } else {
        break; // Streak broken
      }
    }

    return streak;
  }

  /**
   * Save focus health metrics
   */
  async saveFocusHealthMetrics(metrics: FocusHealthMetrics): Promise<void> {
    try {
      await AsyncStorage.setItem(
        StorageService.KEYS.FOCUS_HEALTH_METRICS,
        JSON.stringify(metrics),
      );
    } catch (error: any) {
      console.error('Error saving focus health metrics:', error);
      throw new Error(`Failed to save focus health metrics: ${error.message}`);
    }
  }

  /**
   * Load focus health metrics
   */
  async getFocusHealthMetrics(): Promise<FocusHealthMetrics> {
    try {
      const data = await AsyncStorage.getItem(
        StorageService.KEYS.FOCUS_HEALTH_METRICS,
      );

      if (!data) {
        return this.getDefaultFocusHealthMetrics();
      }

      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading focus health metrics:', error);
      return this.getDefaultFocusHealthMetrics();
    }
  }

  /**
   * Default focus health metrics
   */
  private getDefaultFocusHealthMetrics(): FocusHealthMetrics {
    return {
      streakCount: 0,
      averageFocusRating: 3,
      distractionsPerSession: 0,
      focusEfficiency: 1.0,
      neuralReinforcement: 0,
      dailyFocusTime: 0,
      weeklyFocusTime: 0,
      bestFocusTimeOfDay: 'morning',
      commonDistractionTriggers: [],
      mostDistractiveDays: [],
      focusImprovement: 0,
    };
  }

  // ==================== EXISTING METHODS (keeping all functionality) ====================

  /**
   * Save flashcards with complete FSRS metrics support
   */
  async saveFlashcards(
    flashcards: (Flashcard | EnhancedFlashcard)[],
  ): Promise<void> {
    try {
      const serializedCards = flashcards.map((card) => ({
        ...card,
        // Ensure nextReview is a proper Date before calling toISOString
        nextReview:
          card.nextReview instanceof Date
            ? card.nextReview.toISOString()
            : new Date(card.nextReview || Date.now()).toISOString(),
        created:
          card.created instanceof Date
            ? card.created.toISOString()
            : new Date(card.created || Date.now()).toISOString(),
        lastReview:
          (card as EnhancedFlashcard).lastReview instanceof Date
            ? (card as EnhancedFlashcard).lastReview!.toISOString()
            : (card as EnhancedFlashcard).lastReview
            ? new Date((card as EnhancedFlashcard).lastReview!).toISOString()
            : undefined,
        // Preserve all FSRS metrics if they exist
        stability: (card as EnhancedFlashcard).stability,
        fsrsDifficulty: (card as EnhancedFlashcard).fsrsDifficulty,
        state: (card as EnhancedFlashcard).state,
        lapses: (card as EnhancedFlashcard).lapses || 0,
        elapsed_days: (card as EnhancedFlashcard).elapsed_days || 0,
        scheduled_days: (card as EnhancedFlashcard).scheduled_days || 1,
        // Phase 5.5: Focus impact metrics
        focusSessionStrength:
          (card as EnhancedFlashcard).focusSessionStrength || 0,
        distractionWeakening:
          (card as EnhancedFlashcard).distractionWeakening || 0,
      }));

      // Save to both new and legacy locations for compatibility
      await Promise.all([
        AsyncStorage.setItem(
          StorageService.KEYS.FLASHCARDS,
          JSON.stringify(serializedCards),
        ),
        AsyncStorage.setItem(
          StorageService.KEYS.LEGACY_FLASHCARDS,
          JSON.stringify(serializedCards),
        ),
      ]);

      console.log(`💾 Saved ${flashcards.length} flashcards with FSRS data`);
    } catch (error: any) {
      console.error('Error saving flashcards:', error);
      throw new Error(`Failed to save flashcards: ${error.message}`);
    }
  }

  /**
   * Load flashcards with complete FSRS metrics support
   */
  async getFlashcards(): Promise<EnhancedFlashcard[]> {
    try {
      // Try new location first, then legacy
      let data = await AsyncStorage.getItem(StorageService.KEYS.FLASHCARDS);
      if (!data) {
        data = await AsyncStorage.getItem(
          StorageService.KEYS.LEGACY_FLASHCARDS,
        );
      }

      if (!data) {
        return this.getDefaultFlashcards();
      }

      const cards = JSON.parse(data);
      // Deserialize dates and ensure FSRS compatibility
      return cards.map((card: any) => ({
        ...card,
        nextReview: new Date(card.nextReview),
        created: new Date(card.created),
        lastReview: card.lastReview ? new Date(card.lastReview) : undefined,
        // Ensure all FSRS fields are present with defaults
        easeFactor: card.easeFactor || 2.5,
        interval: card.interval || 1,
        repetitions: card.repetitions || 0,
        stability: card.stability,
        fsrsDifficulty: card.fsrsDifficulty,
        state: card.state,
        lapses: card.lapses || 0,
        elapsed_days: card.elapsed_days || 0,
        scheduled_days: card.scheduled_days || 1,
        // Phase 5.5: Focus impact metrics
        focusSessionStrength: card.focusSessionStrength || 0,
        distractionWeakening: card.distractionWeakening || 0,
      }));
    } catch (error) {
      console.error('Error loading flashcards:', error);
      return this.getDefaultFlashcards();
    }
  }

  private getDefaultFlashcards(): EnhancedFlashcard[] {
    const now = new Date();
    return [
      {
        id: '1',
        front: 'F.A.S.T. Learning Framework',
        back: "Forget (clear preconceptions), Active (engage fully), State (manage emotional/physical state), Teach (learn with teaching intention) - Jim Kwik's methodology for optimal learning",
        category: 'meta-learning',
        created: now,
        nextReview: now,
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
        // FSRS defaults
        stability: undefined,
        fsrsDifficulty: undefined,
        lastReview: undefined,
        state: 0, // CardState.New
        lapses: 0,
        elapsed_days: 0,
        scheduled_days: 1,
        // Phase 5.5: Focus defaults
        focusSessionStrength: 0,
        distractionWeakening: 0,
      },
      {
        id: '2',
        front: 'Spaced Repetition System (SRS)',
        back: 'A learning technique that incorporates increasing intervals of time between subsequent review sessions to exploit the psychological spacing effect',
        category: 'concept',
        created: now,
        nextReview: now,
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
        // FSRS defaults
        stability: undefined,
        fsrsDifficulty: undefined,
        lastReview: undefined,
        state: 0,
        lapses: 0,
        elapsed_days: 0,
        scheduled_days: 1,
        // Phase 5.5: Focus defaults
        focusSessionStrength: 0,
        distractionWeakening: 0,
      },
      {
        id: '3',
        front: 'Memory Palace (Method of Loci)',
        back: 'Ancient Greek mnemonic technique where you associate information with specific locations in a familiar spatial environment',
        category: 'memory-technique',
        created: now,
        nextReview: now,
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
        // FSRS defaults
        stability: undefined,
        fsrsDifficulty: undefined,
        lastReview: undefined,
        state: 0,
        lapses: 0,
        elapsed_days: 0,
        scheduled_days: 1,
        // Phase 5.5: Focus defaults
        focusSessionStrength: 0,
        distractionWeakening: 0,
      },
    ];
  }

  // ==================== LOGIC NODES (Phase 4 + 5.5 Enhancement) ====================

  async saveLogicNodes(nodes: LogicNode[]): Promise<void> {
    try {
      const serializedNodes = nodes.map((node) => ({
        ...node,
        nextReviewDate: node.nextReviewDate.toISOString(),
        lastAccessed: node.lastAccessed.toISOString(),
        lastReview: node.lastReview ? node.lastReview.toISOString() : undefined,
        created: node.created.toISOString(),
        modified: node.modified.toISOString(),
      }));

      await AsyncStorage.setItem(
        StorageService.KEYS.LOGIC_NODES,
        JSON.stringify(serializedNodes),
      );

      console.log(`💾 Saved ${nodes.length} logic nodes`);
    } catch (error: any) {
      console.error('Error saving logic nodes:', error);
      throw new Error(`Failed to save logic nodes: ${error.message}`);
    }
  }

  async getLogicNodes(): Promise<LogicNode[]> {
    try {
      const data = await AsyncStorage.getItem(StorageService.KEYS.LOGIC_NODES);

      if (!data) {
        return [];
      }

      const nodes = JSON.parse(data);
      return nodes.map((node: any) => ({
        ...node,
        nextReviewDate: new Date(node.nextReviewDate),
        lastAccessed: new Date(node.lastAccessed),
        lastReview: node.lastReview ? new Date(node.lastReview) : undefined,
        created: new Date(node.created),
        modified: new Date(node.modified),
        // Ensure Phase 5.5 fields have defaults
        focusSessionStrength: node.focusSessionStrength || 0,
        distractionPenalty: node.distractionPenalty || 0,
      }));
    } catch (error) {
      console.error('Error loading logic nodes:', error);
      return [];
    }
  }

  async addLogicNode(nodeData: Partial<LogicNode>): Promise<LogicNode> {
    try {
      const now = new Date();
      const newNode: LogicNode = {
        id: `logic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        question: nodeData.question || '',
        premise1: nodeData.premise1 || '',
        premise2: nodeData.premise2 || '',
        conclusion: nodeData.conclusion || '',
        type: nodeData.type || 'deductive',
        domain: nodeData.domain || 'general',
        difficulty: nodeData.difficulty || 3,

        // FSRS defaults
        easeFactor: 2.5,
        interval: 1,
        repetitions: 0,
        nextReviewDate: now,
        lastAccessed: now,

        // Performance tracking
        totalAttempts: 0,
        correctAttempts: 0,
        accessCount: 0,

        // FSRS-specific metrics
        stability: undefined,
        fsrsDifficulty: undefined,
        lastReview: undefined,
        state: 0, // CardState.New

        // Phase 5.5: Focus impact
        focusSessionStrength: 0,
        distractionPenalty: 0,

        created: now,
        modified: now,
      };

      const existingNodes = await this.getLogicNodes();
      existingNodes.push(newNode);
      await this.saveLogicNodes(existingNodes);

      return newNode;
    } catch (error: any) {
      console.error('Error adding logic node:', error);
      throw new Error(`Failed to add logic node: ${error.message}`);
    }
  }

  async updateLogicNode(
    nodeId: string,
    updates: Partial<LogicNode>,
  ): Promise<LogicNode | null> {
    try {
      const nodes = await this.getLogicNodes();
      const nodeIndex = nodes.findIndex((node) => node.id === nodeId);

      if (nodeIndex === -1) {
        return null;
      }

      nodes[nodeIndex] = {
        ...nodes[nodeIndex],
        ...updates,
        modified: new Date(),
      };

      await this.saveLogicNodes(nodes);
      return nodes[nodeIndex];
    } catch (error: any) {
      console.error('Error updating logic node:', error);
      throw new Error(`Failed to update logic node: ${error.message}`);
    }
  }

  // ==================== ALL OTHER EXISTING METHODS (unchanged) ====================

  async saveStudySession(session: StudySession): Promise<void> {
    try {
      const sessions = await this.getStudySessions();
      sessions.push(session);
      await this.saveStudySessions(sessions);
    } catch (error: any) {
      console.error('Error saving Study Session:', error);
      if ((error as Error).message) {
        throw new Error(
          `Failed to save Study Session: ${(error as Error).message}`,
        );
      }
    }
  }

  async saveStudySessions(sessions: StudySession[]): Promise<void> {
    try {
      const serializedSessions = sessions.map((session) => ({
        ...session,
        startTime: session.startTime.toISOString(),
        endTime: session.endTime ? session.endTime.toISOString() : null,
      }));

      // Save to both locations for compatibility
      await Promise.all([
        AsyncStorage.setItem(
          StorageService.KEYS.STUDY_SESSIONS,
          JSON.stringify(serializedSessions),
        ),
        AsyncStorage.setItem(
          StorageService.KEYS.LEGACY_SESSIONS,
          JSON.stringify(serializedSessions),
        ),
      ]);
    } catch (error: any) {
      console.error('Error saving Study Session:', error);
      if ((error as Error).message) {
        throw new Error(
          `Failed to save Study Session: ${(error as Error).message}`,
        );
      }
    }
  }

  async getStudySessions(): Promise<StudySession[]> {
    try {
      // Try new location first, then legacy
      let data = await AsyncStorage.getItem(StorageService.KEYS.STUDY_SESSIONS);
      if (!data) {
        data = await AsyncStorage.getItem(StorageService.KEYS.LEGACY_SESSIONS);
      }

      if (!data) {
        return [];
      }

      const sessions = JSON.parse(data);
      return sessions.map((session: any) => ({
        ...session,
        startTime: new Date(session.startTime),
        endTime: session.endTime ? new Date(session.endTime) : null,
      }));
    } catch (error) {
      console.error('Error loading study sessions:', error);
      return [];
    }
  }

  // ==================== PROGRESS DATA (Dashboard needs this) ====================

  async saveProgressData(progress: ProgressData): Promise<void> {
    try {
      // Save to both locations for compatibility
      await Promise.all([
        AsyncStorage.setItem(
          StorageService.KEYS.PROGRESS_DATA,
          JSON.stringify(progress),
        ),
        AsyncStorage.setItem(
          StorageService.KEYS.LEGACY_PROGRESS,
          JSON.stringify(progress),
        ),
      ]);
    } catch (error: any) {
      console.error('Error saving Progress Data:', error);
      if ((error as Error).message) {
        throw new Error(
          `Failed to save Progress Data: ${(error as Error).message}`,
        );
      }
    }
  }

  async getProgressData(): Promise<ProgressData> {
    try {
      // Try new location first, then legacy
      let data = await AsyncStorage.getItem(StorageService.KEYS.PROGRESS_DATA);
      if (!data) {
        data = await AsyncStorage.getItem(StorageService.KEYS.LEGACY_PROGRESS);
      }

      if (!data) {
        return this.getDefaultProgressData();
      }

      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading progress data:', error);
      return this.getDefaultProgressData();
    }
  }

  private getDefaultProgressData(): ProgressData {
    const today = new Date().toDateString();
    return {
      studyStreak: 1,
      totalFocusTime: 0,
      todayFocusTime: 0,
      lastStudyDate: today,
      retentionRate: 0,
      masteredCards: 0,
      completedSessions: 0,
      weeklyData: [
        { day: 'Mon', focusTime: 0, cardsStudied: 0 },
        { day: 'Tue', focusTime: 0, cardsStudied: 0 },
        { day: 'Wed', focusTime: 0, cardsStudied: 0 },
        { day: 'Thu', focusTime: 0, cardsStudied: 0 },
        { day: 'Fri', focusTime: 0, cardsStudied: 0 },
        { day: 'Sat', focusTime: 0, cardsStudied: 0 },
        { day: 'Sun', focusTime: 0, cardsStudied: 0 },
      ],
    };
  }

  // ==================== TASKS (with Todoist integration) ====================

  async saveTasks(tasks: Task[]): Promise<void> {
    try {
      const serializedTasks = tasks.map((task) => ({
        ...task,
        created: task.created.toISOString(),
        due: task.due
          ? {
              ...task.due,
              date: task.due.date,
              datetime: task.due.datetime,
            }
          : undefined,
      }));

      // Save to both locations for compatibility
      await Promise.all([
        AsyncStorage.setItem(
          StorageService.KEYS.TASKS,
          JSON.stringify(serializedTasks),
        ),
        AsyncStorage.setItem(
          StorageService.KEYS.LEGACY_TASKS,
          JSON.stringify(serializedTasks),
        ),
      ]);
    } catch (error: any) {
      console.error('Error saving Tasks:', error);
      if ((error as Error).message) {
        throw new Error(`Failed to save Tasks: ${(error as Error).message}`);
      }
    }
  }

  async getTasks(): Promise<Task[]> {
    try {
      // Try new location first, then legacy
      let data = await AsyncStorage.getItem(StorageService.KEYS.TASKS);
      if (!data) {
        data = await AsyncStorage.getItem(StorageService.KEYS.LEGACY_TASKS);
      }

      if (!data) {
        return [];
      }

      const tasks = JSON.parse(data);
      return tasks.map((task: any) => ({
        ...task,
        created: new Date(task.created),
      }));
    } catch (error) {
      console.error('Error loading tasks:', error);
      return [];
    }
  }

  // ==================== SETTINGS (All screens need this) ====================

  async saveSettings(settings: Settings): Promise<void> {
    return this.hybridService.saveSettings(settings);
  }

  async getSettings(): Promise<Settings> {
    return this.hybridService.getSettings();
  }

  // ==================== SOUNDSCAPE STORAGE HELPERS (Phase 7) ====================

  /**
   * Save sound settings (typed)
   */
  async saveSoundSettings(settings: SoundSettings): Promise<void> {
    try {
      const toSave = { ...settings, updatedAt: new Date().toISOString() };
      await AsyncStorage.setItem(
        StorageService.KEYS.SOUND_SETTINGS,
        JSON.stringify(toSave),
      );
      console.log('💾 Saved sound settings');
    } catch (error: any) {
      console.error('Error saving sound settings:', error);
      throw new Error(
        `Failed to save sound settings: ${error?.message || String(error)}`,
      );
    }
  }

  /**
   * Load sound settings (typed). Returns defaults if not present.
   */
  async getSoundSettings(): Promise<SoundSettings> {
    try {
      const data = await AsyncStorage.getItem(
        StorageService.KEYS.SOUND_SETTINGS,
      );
      if (!data) return { volume: 0.7 };
      return JSON.parse(data) as SoundSettings;
    } catch (error) {
      console.error('Error loading sound settings:', error);
      return { volume: 0.7 };
    }
  }

  /**
   * Append a neural performance log
   */
  async appendNeuralLog(entry: NeuralLogEntry): Promise<void> {
    try {
      const logs = await this.getNeuralLogs();
      logs.push(entry);
      await AsyncStorage.setItem(
        StorageService.KEYS.NEURAL_LOGS,
        JSON.stringify(logs),
      );
      console.log(`💾 Appended neural log: ${entry.id}`);
    } catch (error: any) {
      console.error('Error appending neural log:', error);
      throw new Error(
        `Failed to append neural log: ${error?.message || String(error)}`,
      );
    }
  }

  /**
   * Reset optimal profiles (used by tests and by user 'Reset Sound Learning')
   */
  async resetOptimalProfiles(): Promise<void> {
    try {
      const settings = await this.getSoundSettings();
      settings.optimalProfile = {};
      await this.saveSoundSettings(settings);
      console.log('🔁 Optimal profiles reset');
    } catch (error) {
      console.error('Error resetting optimal profiles:', error);
      throw error;
    }
  }

  /**
   * Get neural performance logs
   */
  async getNeuralLogs(): Promise<NeuralLogEntry[]> {
    try {
      const raw = await AsyncStorage.getItem(StorageService.KEYS.NEURAL_LOGS);
      if (!raw) return [];
      return JSON.parse(raw) as NeuralLogEntry[];
    } catch (error) {
      console.error('Error loading neural logs:', error);
      return [];
    }
  }

  private getDefaultSettings(): Settings {
    return {
      theme: 'dark',
      dailyGoal: 60,
      defaultSession: 'pomodoro',
      todoistToken: '',
      notionToken: '',
      autoSync: true,
      notifications: {
        studyReminders: true,
        breakAlerts: true,
        reviewNotifications: true,
      },
    };
  }

  // ==================== MEMORY PALACES ====================

  async saveMemoryPalaces(palaces: MemoryPalace[]): Promise<void> {
    try {
      const serializedPalaces = palaces.map((palace) => ({
        ...palace,
        created: palace.created.toISOString(),
      }));

      await Promise.all([
        AsyncStorage.setItem(
          StorageService.KEYS.MEMORY_PALACES,
          JSON.stringify(serializedPalaces),
        ),
        AsyncStorage.setItem(
          StorageService.KEYS.LEGACY_PALACES,
          JSON.stringify(serializedPalaces),
        ),
      ]);
    } catch (error: any) {
      console.error('Error saving memory palaces:', error);
      throw new Error(`Failed to save memory palaces: ${error.message}`);
    }
  }

  async getMemoryPalaces(): Promise<MemoryPalace[]> {
    try {
      let data = await AsyncStorage.getItem(StorageService.KEYS.MEMORY_PALACES);
      if (!data) {
        data = await AsyncStorage.getItem(StorageService.KEYS.LEGACY_PALACES);
      }

      if (!data) {
        return [];
      }

      const palaces = JSON.parse(data);
      return palaces.map((palace: any) => ({
        ...palace,
        created: new Date(palace.created),
      }));
    } catch (error) {
      console.error('Error loading memory palaces:', error);
      return [];
    }
  }

  // ==================== UTILITY METHODS ====================

  async clearAllData(): Promise<void> {
    try {
      if (await this.shouldUseSupabase()) {
        const supabaseService = await this.getSupabaseService();
        await supabaseService.clearAllData();
      }

      // Also clear AsyncStorage
      const keys = Object.values(StorageService.KEYS);
      await Promise.all(keys.map(key => AsyncStorage.removeItem(key)));
      
      console.log('🗑️ All data cleared');
    } catch (error) {
      console.error('Error clearing data:', error);
      throw new Error(`Failed to clear data: ${error}`);
    }
  }

  // ==================== PHASE 6: SPEED READING OPERATIONS ====================

  /**
   * Save a reading session with neural map integration
   */
  async saveReadingSession(session: ReadingSession): Promise<void> {
    try {
      const sessions = await this.getReadingSessions();
      sessions.push(session);
      await this.saveReadingSessions(sessions);
      console.log(`💾 Saved reading session: ${session.id}`);
    } catch (error: any) {
      console.error('Error saving reading session:', error);
      throw new Error(`Failed to save reading session: ${error.message}`);
    }
  }

  /**
   * Save multiple reading sessions
   */
  async saveReadingSessions(sessions: ReadingSession[]): Promise<void> {
    try {
      const serializedSessions = sessions.map((session) => ({
        ...session,
        startTime: session.startTime.toISOString(),
        endTime: session.endTime.toISOString(),
        nextReviewDate: session.nextReviewDate?.toISOString(),
        lastAccessed: session.lastAccessed?.toISOString(),
        created: session.created.toISOString(),
        modified: session.modified.toISOString(),
        sourceLinks: session.sourceLinks?.map(link => ({
          ...link,
          extractedAt: link.extractedAt.toISOString(),
        })) || [],
      }));

      await AsyncStorage.setItem(
        StorageService.KEYS.READING_SESSIONS,
        JSON.stringify(serializedSessions),
      );
    } catch (error: any) {
      console.error('Error saving reading sessions:', error);
      throw new Error(`Failed to save reading sessions: ${error.message}`);
    }
  }

  /**
   * Load all reading sessions
   */
  async getReadingSessions(): Promise<ReadingSession[]> {
    try {
      const data = await AsyncStorage.getItem(StorageService.KEYS.READING_SESSIONS);
      if (!data) return [];

      const sessions = JSON.parse(data);
      return sessions.map((session: any) => ({
        ...session,
        startTime: new Date(session.startTime),
        endTime: new Date(session.endTime),
        nextReviewDate: session.nextReviewDate ? new Date(session.nextReviewDate) : undefined,
        lastAccessed: session.lastAccessed ? new Date(session.lastAccessed) : undefined,
        created: new Date(session.created),
        modified: new Date(session.modified),
        sourceLinks: session.sourceLinks?.map((link: any) => ({
          ...link,
          extractedAt: new Date(link.extractedAt),
        })) || [],
      }));
    } catch (error) {
      console.error('Error loading reading sessions:', error);
      return [];
    }
  }

  /**
   * Save source links for neural map integration
   */
  async saveSourceLinks(links: SourceLink[]): Promise<void> {
    try {
      const existingLinks = await this.getSourceLinks();
      const allLinks = [...existingLinks, ...links];
      
      const serializedLinks = allLinks.map(link => ({
        ...link,
        extractedAt: link.extractedAt.toISOString(),
      }));

      await AsyncStorage.setItem(
        StorageService.KEYS.READING_SOURCE_LINKS,
        JSON.stringify(serializedLinks),
      );
      console.log(`💾 Saved ${links.length} source links`);
    } catch (error: any) {
      console.error('Error saving source links:', error);
      throw new Error(`Failed to save source links: ${error.message}`);
    }
  }

  /**
   * Load source links
   */
  async getSourceLinks(): Promise<SourceLink[]> {
    try {
      const data = await AsyncStorage.getItem(StorageService.KEYS.READING_SOURCE_LINKS);
      if (!data) return [];

      const links = JSON.parse(data);
      return links.map((link: any) => ({
        ...link,
        extractedAt: new Date(link.extractedAt),
      }));
    } catch (error) {
      console.error('Error loading source links:', error);
      return [];
    }
  }

  /**
   * Get reading analytics for dashboard
   */
  async getReadingAnalytics(): Promise<{
    averageWPM: number;
    averageComprehension: number;
    readingStreak: number;
    totalSessions: number;
    totalWordsRead: number;
    performanceByDifficulty: Record<string, { wpm: number; comprehension: number; sessions: number }>;
    bestReadingHour: number;
    conceptsExtracted: number;
  }> {
    try {
      const sessions = await this.getReadingSessions();
      
      if (sessions.length === 0) {
        return {
          averageWPM: 0,
          averageComprehension: 0,
          readingStreak: 0,
          totalSessions: 0,
          totalWordsRead: 0,
          performanceByDifficulty: {},
          bestReadingHour: 9,
          conceptsExtracted: 0,
        };
      }

      const totalSessions = sessions.length;
      const averageWPM = sessions.reduce((sum, s) => sum + s.wpmAchieved, 0) / totalSessions;
      const averageComprehension = sessions.reduce((sum, s) => sum + s.comprehensionScore, 0) / totalSessions;
      const totalWordsRead = sessions.reduce((sum, s) => sum + s.wordCount, 0);
      const conceptsExtracted = sessions.reduce((sum, s) => sum + s.conceptsIdentified.length, 0);
      
      // Calculate reading streak
      const today = new Date();
      let streak = 0;
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const hasSessionOnDate = sessions.some(s => 
          s.endTime.toDateString() === checkDate.toDateString()
        );
        if (hasSessionOnDate) {
          streak++;
        } else {
          break;
        }
      }
      
      // Performance by difficulty
      const performanceByDifficulty: Record<string, { wpm: number; comprehension: number; sessions: number }> = {};
      ['easy', 'medium', 'hard', 'technical'].forEach(difficulty => {
        const diffSessions = sessions.filter(s => s.textDifficulty === difficulty);
        if (diffSessions.length > 0) {
          performanceByDifficulty[difficulty] = {
            wpm: diffSessions.reduce((sum, s) => sum + s.wpmAchieved, 0) / diffSessions.length,
            comprehension: diffSessions.reduce((sum, s) => sum + s.comprehensionScore, 0) / diffSessions.length,
            sessions: diffSessions.length,
          };
        }
      });
      
      // Best reading hour
      const hourCounts = new Array(24).fill(0);
      sessions.forEach(s => {
        const hour = s.startTime.getHours();
        hourCounts[hour]++;
      });
      const bestReadingHour = hourCounts.indexOf(Math.max(...hourCounts));
      
      return {
        averageWPM,
        averageComprehension,
        readingStreak: streak,
        totalSessions,
        totalWordsRead,
        performanceByDifficulty,
        bestReadingHour,
        conceptsExtracted,
      };
    } catch (error) {
      console.error('Error calculating reading analytics:', error);
      return {
        averageWPM: 0,
        averageComprehension: 0,
        readingStreak: 0,
        totalSessions: 0,
        totalWordsRead: 0,
        performanceByDifficulty: {},
        bestReadingHour: 9,
        conceptsExtracted: 0,
      };
    }
  }

  // ==================== EXPORT/IMPORT OPERATIONS ====================

  async exportAllData(): Promise<string> {
    try {
      const [
        flashcards,
        sessions,
        progress,
        tasks,
        settings,
        palaces,
        logicNodes,
        focusSessions,
        distractionEvents,
        focusHealthMetrics,
        readingSessions,
        sourceLinks,
      ] = await Promise.all([
        this.getFlashcards(),
        this.getStudySessions(),
        this.getProgressData(),
        this.getTasks(),
        this.getSettings(),
        this.getMemoryPalaces(),
        this.getLogicNodes(),
        this.getFocusSessions(),
        this.getDistractionEvents(),
        this.getFocusHealthMetrics(),
        this.getReadingSessions(),
        this.getSourceLinks(),
      ]);

      const exportData = {
        flashcards,
        sessions,
        progress,
        tasks,
        settings,
        palaces,
        logicNodes,
        // Phase 5.5: Focus reinforcement data
        focusSessions,
        // Phase 6: Speed reading data
        readingSessions,
        sourceLinks,
        distractionEvents,
        focusHealthMetrics,
        exportDate: new Date().toISOString(),
        version: '2.1.0', // Updated version for Phase 5.5
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error: any) {
      console.error('Error Exporting Data:', error);
      throw new Error(
        `Failed to Export Data: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  async getStorageInfo(): Promise<{
    keys: string[];
    estimatedSize: number;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const neuroLearnKeys = keys.filter(
        (key) =>
          key.startsWith('@neurolearn/') || key.startsWith('neurolearn_'),
      );

      let estimatedSize = 0;
      for (const key of neuroLearnKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          estimatedSize += data.length;
        }
      }

      return {
        keys: neuroLearnKeys,
        estimatedSize,
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { keys: [], estimatedSize: 0 };
    }
  }

  // ==================== FSRS INTEGRATION SUPPORT ====================

  async saveFSRSCards(cards: FSRSCard[]): Promise<void> {
    try {
      const serializedCards = cards.map((card) => ({
        ...card,
        due: card.due.toISOString(),
        last_review: card.last_review
          ? card.last_review.toISOString()
          : undefined,
      }));

      await AsyncStorage.setItem(
        StorageService.KEYS.FSRS_CARDS,
        JSON.stringify(serializedCards),
      );
    } catch (error: any) {
      console.error('Error saving FSRS cards:', error);
      throw new Error(`Failed to save FSRS cards: ${error.message}`);
    }
  }

  async getFSRSCards(): Promise<FSRSCard[]> {
    try {
      const data = await AsyncStorage.getItem(StorageService.KEYS.FSRS_CARDS);

      if (!data) {
        return [];
      }

      const cards = JSON.parse(data);
      return cards.map((card: any) => ({
        ...card,
        due: new Date(card.due),
        last_review: card.last_review ? new Date(card.last_review) : undefined,
      }));
    } catch (error) {
      console.error('Error loading FSRS cards:', error);
      return [];
    }
  }

  async saveFSRSReviewLogs(logs: FSRSReviewLog[]): Promise<void> {
    try {
      const serializedLogs = logs.map((log) => ({
        ...log,
        review: log.review.toISOString(),
      }));

      await AsyncStorage.setItem(
        StorageService.KEYS.FSRS_REVIEW_LOGS,
        JSON.stringify(serializedLogs),
      );
    } catch (error: any) {
      console.error('Error saving FSRS review logs:', error);
      throw new Error(`Failed to save FSRS review logs: ${error.message}`);
    }
  }

  async getFSRSReviewLogs(): Promise<FSRSReviewLog[]> {
    try {
      const data = await AsyncStorage.getItem(
        StorageService.KEYS.FSRS_REVIEW_LOGS,
      );

      if (!data) {
        return [];
      }

      const logs = JSON.parse(data);
      return logs.map((log: any) => ({
        ...log,
        review: new Date(log.review),
      }));
    } catch (error) {
      console.error('Error loading FSRS review logs:', error);
      return [];
    }
  }

  // ==================== DASHBOARD SUPPORT METHODS ====================

  async getCardsDueToday(): Promise<{
    flashcards: EnhancedFlashcard[];
    logicNodes: LogicNode[];
    totalDue: number;
    criticalLogicCount: number;
  }> {
    try {
      const [flashcards, logicNodes] = await Promise.all([
        this.getFlashcards(),
        this.getLogicNodes(),
      ]);

      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const dueFlashcards = flashcards.filter(
        (card) => new Date(card.nextReview) <= today,
      );

      const dueLogicNodes = logicNodes.filter(
        (node) => new Date(node.nextReviewDate) <= today,
      );

      const criticalLogicCount = dueLogicNodes.filter(
        (node) =>
          node.difficulty >= 4 ||
          node.correctAttempts / Math.max(1, node.totalAttempts) < 0.5,
      ).length;

      return {
        flashcards: dueFlashcards,
        logicNodes: dueLogicNodes,
        totalDue: dueFlashcards.length + dueLogicNodes.length,
        criticalLogicCount,
      };
    } catch (error) {
      console.error('Error getting cards due today:', error);
      return {
        flashcards: [],
        logicNodes: [],
        totalDue: 0,
        criticalLogicCount: 0,
      };
    }
  }

  async getLearningAnalytics(): Promise<{
    totalCards: number;
    masteredCards: number;
    weakCards: number;
    averageRetention: number;
    logicTrainingProgress: number;
    streakDays: number;
  }> {
    try {
      const [flashcards, logicNodes, reviewLogs] = await Promise.all([
        this.getFlashcards(),
        this.getLogicNodes(),
        this.getFSRSReviewLogs(),
      ]);

      const totalCards = flashcards.length + logicNodes.length;

      const masteredCards = [
        ...flashcards.filter(
          (card) => card.easeFactor > 3.0 && card.interval > 30,
        ),
        ...logicNodes.filter(
          (node) =>
            node.easeFactor > 3.0 &&
            node.correctAttempts / Math.max(1, node.totalAttempts) > 0.85,
        ),
      ].length;

      const weakCards = [
        ...flashcards.filter((card) => card.easeFactor < 2.0),
        ...logicNodes.filter(
          (node) =>
            node.easeFactor < 2.0 ||
            node.correctAttempts / Math.max(1, node.totalAttempts) < 0.5,
        ),
      ].length;

      const recentLogs = reviewLogs.slice(-100);
      const successfulReviews = recentLogs.filter(
        (log) => log.rating >= 3,
      ).length;
      const averageRetention =
        recentLogs.length > 0 ? successfulReviews / recentLogs.length : 0;

      const logicProgress =
        logicNodes.length > 0
          ? logicNodes.reduce(
              (sum, node) =>
                sum + node.correctAttempts / Math.max(1, node.totalAttempts),
              0,
            ) / logicNodes.length
          : 0;

      const streakDays = this.calculateStreakDays(reviewLogs);

      return {
        totalCards,
        masteredCards,
        weakCards,
        averageRetention,
        logicTrainingProgress: logicProgress,
        streakDays,
      };
    } catch (error) {
      console.error('Error getting learning analytics:', error);
      return {
        totalCards: 0,
        masteredCards: 0,
        weakCards: 0,
        averageRetention: 0,
        logicTrainingProgress: 0,
        streakDays: 0,
      };
    }
  }

  private calculateStreakDays(reviewLogs: FSRSReviewLog[]): number {
    if (reviewLogs.length === 0) return 0;

    const sortedLogs = reviewLogs.sort(
      (a, b) => b.review.getTime() - a.review.getTime(),
    );

    let streakDays = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(currentDate);
      checkDate.setDate(checkDate.getDate() - i);

      const hasReviewOnDate = sortedLogs.some((log) => {
        const logDate = new Date(log.review);
        logDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === checkDate.getTime();
      });

      if (hasReviewOnDate) {
        streakDays++;
      } else if (i > 0) {
        break;
      }
    }

    return streakDays;
  }

  // ==================== PHASE 6: SPEED READING PERSISTENCE ====================
  async saveReadingSession(session: ReadingSession): Promise<void> {
    try {
      const sessions = await this.getReadingSessions();
      const serialized = {
        ...session,
        startTime: session.startTime.toISOString(),
        endTime: session.endTime.toISOString(),
        created: session.created.toISOString(),
        modified: session.modified.toISOString(),
        sourceLinks: session.sourceLinks.map((l) => ({
          ...l,
          extractedAt: l.extractedAt.toISOString(),
        })),
      } as any;
      sessions.push(session); // push hydrated; we'll serialize whole array below

      const serializedSessions = sessions.map((s) => ({
        ...s,
        startTime: s.startTime.toISOString(),
        endTime: s.endTime.toISOString(),
        created: s.created.toISOString(),
        modified: s.modified.toISOString(),
        sourceLinks: (s.sourceLinks || []).map((l) => ({
          ...l,
          extractedAt: l.extractedAt.toISOString(),
        })),
      }));

      await AsyncStorage.setItem(
        StorageService.KEYS.READING_SESSIONS,
        JSON.stringify(serializedSessions),
      );
      console.log(`💾 Saved reading session: ${session.id}`);
    } catch (error: any) {
      console.error('Error saving reading session:', error);
      throw new Error(
        `Failed to save reading session: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  async getReadingSessions(): Promise<ReadingSession[]> {
    try {
      const raw = await AsyncStorage.getItem(
        StorageService.KEYS.READING_SESSIONS,
      );
      if (!raw) return [];
      const arr = JSON.parse(raw) as any[];
      return arr.map(
        (s) =>
          ({
            ...s,
            startTime: new Date(s.startTime),
            endTime: new Date(s.endTime),
            created: new Date(s.created),
            modified: new Date(s.modified),
            sourceLinks: (s.sourceLinks || []).map((l: any) => ({
              ...l,
              extractedAt: new Date(l.extractedAt),
            })),
          } as ReadingSession),
      );
    } catch (error) {
      console.error('Error getting reading sessions:', error);
      return [];
    }
  }

  async saveSourceLinks(links: SourceLink[]): Promise<void> {
    try {
      const existing = await this.getSourceLinks();
      const merged = [...existing, ...links];
      const serialized = merged.map((l) => ({
        ...l,
        extractedAt: l.extractedAt.toISOString(),
      }));
      await AsyncStorage.setItem(
        StorageService.KEYS.READING_SOURCE_LINKS,
        JSON.stringify(serialized),
      );
    } catch (error: any) {
      console.error('Error saving source links:', error);
      throw new Error(
        `Failed to save source links: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  async getSourceLinks(): Promise<SourceLink[]> {
    try {
      const raw = await AsyncStorage.getItem(
        StorageService.KEYS.READING_SOURCE_LINKS,
      );
      if (!raw) return [];
      const arr = JSON.parse(raw) as any[];
      return arr.map((l) => ({ ...l, extractedAt: new Date(l.extractedAt) }));
    } catch (error) {
      console.error('Error getting source links:', error);
      return [];
    }
  }

  async clearAllData(): Promise<void> {
    try {
      const keys = Object.values(StorageService.KEYS);
      await AsyncStorage.multiRemove(keys);
      console.log('🗑️ All data cleared');
    } catch (error: any) {
      console.error('Error Clearing Data:', error);
      throw new Error(
        `Failed to Clear Data: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  async calculateCurrentStudyStreak(): Promise<number> {
    try {
      const sessions = await this.getStudySessions();
      if (sessions.length === 0) return 0;

      const sortedSessions = sessions.sort(
        (a, b) => b.startTime.getTime() - a.startTime.getTime(),
      );

      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check each day backwards from today
      for (let i = 0; i < 365; i++) {
        // Max 365 days
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateString = checkDate.toDateString();

        const daySession = sortedSessions.find(
          (s) => s.startTime.toDateString() === dateString && s.completed,
        );

        if (daySession) {
          streak++;
        } else {
          break; // Streak broken
        }
      }

      return streak;
    } catch (error) {
      console.error('Error calculating study streak:', error);
      return 0;
    }
  }
}

export default StorageService;

// Phase 6: Speed Reading persistence additions
// Methods appended at end to avoid disrupting existing API

// Extend StorageService class with Phase 6 methods
