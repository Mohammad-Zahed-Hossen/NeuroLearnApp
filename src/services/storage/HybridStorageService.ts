/**
 * HybridStorageService - Supabase-First with AsyncStorage Cache
 *
 * This service prioritizes Supabase as the primary data source while using AsyncStorage
 * as a silent, background cache for offline-first functionality.
 *
 * Key principles:
 * - Reads: Try Supabase first → fallback to AsyncStorage if offline
 * - Writes: Save to Supabase → then update AsyncStorage cache silently
 * - No migration layer - users start fresh if no Supabase data exists
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import MMKVStorageService from './MMKVStorageService';
import { SupabaseStorageService } from './SupabaseStorageService';
import SpacedRepetitionService from '../learning/SpacedRepetitionService';
import {
  Task,
  StudySession,
  MemoryPalace,
  ProgressData,
  Settings,
  Flashcard,
} from '../../types';
import {
  SoundSettings,
  NeuralLogEntry,
  DistractionEvent,
  FocusSession,
  FocusHealthMetrics,
  LogicNode,
} from './StorageService';
import { ReadingSession, SourceLink } from '../learning/SpeedReadingService';

export class HybridStorageService {
  private static instance: HybridStorageService;
  private supabaseService: SupabaseStorageService;
  private isOnline: boolean = true;

  // Cache keys for AsyncStorage
  private static readonly CACHE_KEYS = {
    FLASHCARDS: '@neurolearn/cache_flashcards',
    LOGIC_NODES: '@neurolearn/cache_logic_nodes',
    FOCUS_SESSIONS: '@neurolearn/cache_focus_sessions',
    READING_SESSIONS: '@neurolearn/cache_reading_sessions',
    SETTINGS: '@neurolearn/cache_settings',
    NEURAL_LOGS: '@neurolearn/cache_neural_logs',
    SOUND_SETTINGS: '@neurolearn/cache_sound_settings',
    FOCUS_HEALTH_METRICS: '@neurolearn/cache_focus_health_metrics',
    DISTRACTION_EVENTS: '@neurolearn/cache_distraction_events',
    SOURCE_LINKS: '@neurolearn/cache_source_links',
    COGNITIVE_METRICS: '@neurolearn/cache_cognitive_metrics',
    HEALTH_METRICS: '@neurolearn/cache_health_metrics',
    SLEEP_ENTRIES: '@neurolearn/cache_sleep_entries',
    BUDGET_ANALYSIS: '@neurolearn/cache_budget_analysis',
  };

  // Keys we keep in hot cache (MMKV) for ultra-fast access
  private static readonly HOT_KEYS = {
    CONTEXT_SNAPSHOT_PREFIX: 'ctx:',
    CONTEXT_CACHE: '@neurolearn/cache_context_snapshots',
  };

  public static getInstance(): HybridStorageService {
    if (!HybridStorageService.instance) {
      HybridStorageService.instance = new HybridStorageService();
    }
    return HybridStorageService.instance;
  }

  private constructor() {
    this.supabaseService = SupabaseStorageService.getInstance();
    this.checkConnectivity();
  }

  private async checkConnectivity(): Promise<void> {
    try {
      // Simple connectivity check by trying to fetch user settings from Supabase
      await this.supabaseService.getSettings();
      this.isOnline = true;
    } catch (error) {
      console.log('🔄 Operating in offline mode');
      this.isOnline = false;
    }
  }

  // ==================== GENERIC HYBRID METHODS ====================

  private async hybridGet<T>(
    supabaseMethod: () => Promise<T>,
    cacheKey: string,
    defaultValue: T
  ): Promise<T> {
    try {
      // Primary: Try Supabase first
      const supabaseData = await supabaseMethod();

      // Success: Cache the result silently and return
      this.silentCache(cacheKey, supabaseData);
      this.isOnline = true;
      return supabaseData;
    } catch (error) {
      console.warn(`📱 Supabase unavailable, using cache for ${cacheKey}:`, error);
      this.isOnline = false;

      // Fallback: Try AsyncStorage cache
      try {
        const cachedData = await AsyncStorage.getItem(cacheKey);
        if (cachedData) {
          return JSON.parse(cachedData);
        }
      } catch (cacheError) {
        console.error('Cache read failed:', cacheError);
      }

      return defaultValue;
    }
  }

  private async hybridSet<T>(
    supabaseMethod: (data: T) => Promise<void>,
    cacheKey: string,
    data: T
  ): Promise<void> {
    try {
      // Primary: Save to Supabase
      await supabaseMethod(data);
      this.isOnline = true;

      // Success: Update cache silently
      await this.silentCache(cacheKey, data);
    } catch (error) {
      console.warn(`🔄 Supabase save failed, caching locally for ${cacheKey}:`, error);
      this.isOnline = false;

      // Fallback: Save to cache only
      await this.silentCache(cacheKey, data);

      // Queue for background sync when online
      await this.queueForSync(cacheKey, data);
    }
  }

  private async silentCache<T>(key: string, data: T): Promise<void> {
    try {
      // Use MMKV for hot cache when available for fast writes
      if (MMKVStorageService.isAvailable() && key.startsWith(HybridStorageService.HOT_KEYS.CONTEXT_CACHE)) {
        await MMKVStorageService.setItem(key, JSON.stringify(data));
      } else {
        await AsyncStorage.setItem(key, JSON.stringify(data));
      }
    } catch (error) {
      console.error('Silent cache failed:', error);
      // Don't throw - caching is optional
    }
  }

  private async queueForSync<T>(key: string, data: T): Promise<void> {
    try {
      const syncQueue = await AsyncStorage.getItem('@neurolearn/sync_queue');
      const queue = syncQueue ? JSON.parse(syncQueue) : [];

      queue.push({
        key,
        data,
        timestamp: Date.now(),
        attempts: 0,
      });

      await AsyncStorage.setItem('@neurolearn/sync_queue', JSON.stringify(queue));

      // Try immediate background sync
      this.backgroundSync().catch(() => {
        // Silent failure - will retry later
      });
    } catch (error) {
      console.error('Failed to queue sync:', error);
    }
  }

  public async backgroundSync(): Promise<{ synced: number; failed: number }> {
    if (!this.isOnline) {
      await this.checkConnectivity();
      if (!this.isOnline) return { synced: 0, failed: 0 };
    }

    try {
      const syncQueue = await AsyncStorage.getItem('@neurolearn/sync_queue');
      if (!syncQueue) return { synced: 0, failed: 0 };

      const queue = JSON.parse(syncQueue);
      let synced = 0;
      let failed = 0;
      const remainingQueue = [];

      for (const item of queue) {
        try {
          // Map cache keys to Supabase save methods
          await this.syncItemToSupabase(item);
          synced++;
        } catch (error) {
          console.warn('Sync item failed:', item.key, error);
          item.attempts = (item.attempts || 0) + 1;

          // Keep in queue if attempts < 3, otherwise drop
          if (item.attempts < 3) {
            remainingQueue.push(item);
          }
          failed++;
        }
      }

      // Update sync queue
      await AsyncStorage.setItem('@neurolearn/sync_queue', JSON.stringify(remainingQueue));

      if (synced > 0) {
        console.log(`✅ Background sync completed: ${synced} synced, ${failed} failed`);
      }

      return { synced, failed };
    } catch (error) {
      console.error('Background sync error:', error);
      return { synced: 0, failed: 0 };
    }
  }

  private async syncItemToSupabase(item: any): Promise<void> {
    switch (item.key) {
      case HybridStorageService.CACHE_KEYS.FLASHCARDS:
        await this.supabaseService.saveFlashcards(item.data);
        break;
      case HybridStorageService.CACHE_KEYS.LOGIC_NODES:
        await this.supabaseService.saveLogicNodes(item.data);
        break;
      case HybridStorageService.CACHE_KEYS.FOCUS_SESSIONS:
        await this.supabaseService.saveFocusSessions(item.data);
        break;
      case HybridStorageService.CACHE_KEYS.READING_SESSIONS:
        await this.supabaseService.saveReadingSessions(item.data);
        break;
      case HybridStorageService.CACHE_KEYS.SETTINGS:
        await this.supabaseService.saveSettings(item.data);
        break;
      case HybridStorageService.CACHE_KEYS.SOURCE_LINKS:
        await this.supabaseService.saveSourceLinks(item.data);
        break;
      case HybridStorageService.CACHE_KEYS.COGNITIVE_METRICS:
        await this.supabaseService.saveCognitiveMetrics(item.data.userId, item.data);
        break;
      case HybridStorageService.CACHE_KEYS.HEALTH_METRICS:
        await this.supabaseService.saveHealthMetrics(item.data.userId, item.data);
        break;
      case HybridStorageService.CACHE_KEYS.SLEEP_ENTRIES:
        await this.supabaseService.saveSleepEntries(item.data.userId, item.data);
        break;
      case HybridStorageService.CACHE_KEYS.BUDGET_ANALYSIS:
        await this.supabaseService.saveBudgetAnalysis(item.data.userId, item.data);
        break;
      default:
        console.warn('Unknown sync item type:', item.key);
    }
  }

  async getCognitiveMetrics(userId: string): Promise<any[]> {
    return this.hybridGet(
      () => this.supabaseService.getCognitiveMetrics(userId),
      HybridStorageService.CACHE_KEYS.COGNITIVE_METRICS,
      []
    );
  }

  async saveCognitiveMetrics(userId: string, metrics: any[]): Promise<void> {
    return this.hybridSet(
      (data) => this.supabaseService.saveCognitiveMetrics(userId, data),
      HybridStorageService.CACHE_KEYS.COGNITIVE_METRICS,
      metrics
    );
  }

  async getHealthMetrics(userId: string): Promise<any> {
    return this.hybridGet(
      () => this.supabaseService.getHealthMetrics(userId),
      HybridStorageService.CACHE_KEYS.HEALTH_METRICS,
      {
        userId,
        date: new Date().toISOString().split('T')[0],
        sleepHours: 8,
        sleepQuality: 7,
        workoutIntensity: 5,
        stressLevel: 3,
        heartRateAvg: 70,
        steps: 8000,
        caloriesBurned: 2000,
        recoveryScore: 8,
      }
    );
  }

  async saveHealthMetrics(userId: string, metrics: any): Promise<void> {
    return this.hybridSet(
      (data) => this.supabaseService.saveHealthMetrics(userId, data),
      HybridStorageService.CACHE_KEYS.HEALTH_METRICS,
      metrics
    );
  }

  // ==================== SETTINGS ====================

  async getSettings(): Promise<Settings> {
    return this.hybridGet(
      () => this.supabaseService.getSettings(),
      HybridStorageService.CACHE_KEYS.SETTINGS,
      {
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
      } as Settings
    );
  }

  async saveSettings(settings: Settings): Promise<void> {
    return this.hybridSet(
      (data) => this.supabaseService.saveSettings(data),
      HybridStorageService.CACHE_KEYS.SETTINGS,
      settings
    );
  }

  // ==================== FLASHCARDS ====================

  async getFlashcards(): Promise<(Flashcard | Flashcard)[]> {
    return this.hybridGet(
      () => this.supabaseService.getFlashcards(),
      HybridStorageService.CACHE_KEYS.FLASHCARDS,
      []
    );
  }

  async saveFlashcards(flashcards: (Flashcard | Flashcard)[]): Promise<void> {
    return this.hybridSet(
      (data) => this.supabaseService.saveFlashcards(data),
      HybridStorageService.CACHE_KEYS.FLASHCARDS,
      flashcards
    );
  }

  // ==================== LOGIC NODES ====================

  async getLogicNodes(): Promise<LogicNode[]> {
    return this.hybridGet(
      () => this.supabaseService.getLogicNodes(),
      HybridStorageService.CACHE_KEYS.LOGIC_NODES,
      []
    );
  }

  async saveLogicNodes(nodes: LogicNode[]): Promise<void> {
    return this.hybridSet(
      (data) => this.supabaseService.saveLogicNodes(data),
      HybridStorageService.CACHE_KEYS.LOGIC_NODES,
      nodes
    );
  }

  async addLogicNode(nodeData: Partial<LogicNode>): Promise<LogicNode> {
    try {
      // Try Supabase first
      const newNode = await this.supabaseService.addLogicNode(nodeData);

      // Update cache
      const currentNodes = await this.getLogicNodes();
      await this.silentCache(HybridStorageService.CACHE_KEYS.LOGIC_NODES, [...currentNodes, newNode]);

      return newNode;
    } catch (error) {
      console.warn('🔄 Creating logic node offline');

      // Fallback: Create locally and queue for sync
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
        easeFactor: 2.5,
        interval: 1,
        repetitions: 0,
        nextReviewDate: now,
        lastAccessed: now,
        totalAttempts: 0,
        correctAttempts: 0,
        accessCount: 0,
        focusSessionStrength: 0,
        distractionPenalty: 0,
        created: now,
        modified: now,
      };

      const currentNodes = await this.getLogicNodes();
      const updatedNodes = [...currentNodes, newNode];
      await this.saveLogicNodes(updatedNodes);

      return newNode;
    }
  }

  async updateLogicNode(nodeId: string, updates: Partial<LogicNode>): Promise<LogicNode | null> {
    try {
      // Try Supabase first
      const updatedNode = await this.supabaseService.updateLogicNode(nodeId, updates);

      // Update cache
      const currentNodes = await this.getLogicNodes();
      const nodeIndex = currentNodes.findIndex(node => node.id === nodeId);
      if (nodeIndex !== -1 && updatedNode) {
        currentNodes[nodeIndex] = updatedNode;
        await this.silentCache(HybridStorageService.CACHE_KEYS.LOGIC_NODES, currentNodes);
      }

      return updatedNode;
    } catch (error) {
      console.warn('🔄 Updating logic node offline');

      // Fallback: Update locally and queue for sync
      const currentNodes = await this.getLogicNodes();
      const nodeIndex = currentNodes.findIndex(node => node.id === nodeId);

      if (nodeIndex !== -1) {
        const updatedNode = { ...currentNodes[nodeIndex], ...updates, modified: new Date() };
        currentNodes[nodeIndex] = updatedNode;
        await this.saveLogicNodes(currentNodes);
        return updatedNode;
      }

      return null;
    }
  }

  // ==================== FOCUS SESSIONS ====================

  async getFocusSessions(): Promise<FocusSession[]> {
    return this.hybridGet(
      () => this.supabaseService.getFocusSessions(),
      HybridStorageService.CACHE_KEYS.FOCUS_SESSIONS,
      []
    );
  }

  async saveFocusSession(session: FocusSession): Promise<void> {
    try {
      await this.supabaseService.saveFocusSession(session);

      // Update cache
      const currentSessions = await this.getFocusSessions();
      await this.silentCache(HybridStorageService.CACHE_KEYS.FOCUS_SESSIONS, [...currentSessions, session]);
    } catch (error) {
      console.warn('🔄 Saving focus session offline');

      // Fallback: Save locally and queue for sync
      await this.queueForSync(HybridStorageService.CACHE_KEYS.FOCUS_SESSIONS, session);
    }
  }

  async saveFocusSessions(sessions: FocusSession[]): Promise<void> {
    return this.hybridSet(
      (data) => this.supabaseService.saveFocusSessions(data),
      HybridStorageService.CACHE_KEYS.FOCUS_SESSIONS,
      sessions
    );
  }

  async getFocusSession(sessionId: string): Promise<FocusSession | null> {
    const sessions = await this.getFocusSessions();
    return sessions.find(session => session.id === sessionId) || null;
  }

  // ==================== READING SESSIONS ====================

  async getReadingSessions(): Promise<ReadingSession[]> {
    return this.hybridGet(
      () => this.supabaseService.getReadingSessions(),
      HybridStorageService.CACHE_KEYS.READING_SESSIONS,
      []
    );
  }

  async saveReadingSession(session: ReadingSession): Promise<void> {
    return this.hybridSet(
      (data) => this.supabaseService.saveReadingSession(data),
      HybridStorageService.CACHE_KEYS.READING_SESSIONS,
      session
    );
  }

  async saveReadingSessions(sessions: ReadingSession[]): Promise<void> {
    return this.hybridSet(
      (data) => this.supabaseService.saveReadingSessions(data),
      HybridStorageService.CACHE_KEYS.READING_SESSIONS,
      sessions
    );
  }

  // ==================== SOUND SETTINGS ====================

  async getSoundSettings(): Promise<SoundSettings> {
    return this.hybridGet(
      () => this.supabaseService.getSoundSettings(),
      HybridStorageService.CACHE_KEYS.SOUND_SETTINGS,
      { volume: 0.7 }
    );
  }

  async saveSoundSettings(settings: SoundSettings): Promise<void> {
    return this.hybridSet(
      (data) => this.supabaseService.saveSoundSettings(data),
      HybridStorageService.CACHE_KEYS.SOUND_SETTINGS,
      settings
    );
  }

  // ==================== NEURAL LOGS ====================

  async getNeuralLogs(): Promise<NeuralLogEntry[]> {
    return this.hybridGet(
      () => this.supabaseService.getNeuralLogs(),
      HybridStorageService.CACHE_KEYS.NEURAL_LOGS,
      []
    );
  }

  async appendNeuralLog(entry: NeuralLogEntry): Promise<void> {
    try {
      await this.supabaseService.appendNeuralLog(entry);

      // Update cache
      const currentLogs = await this.getNeuralLogs();
      await this.silentCache(HybridStorageService.CACHE_KEYS.NEURAL_LOGS, [...currentLogs, entry]);
    } catch (error) {
      console.warn('🔄 Appending neural log offline');

      // Fallback: Save locally and queue for sync
      await this.queueForSync(HybridStorageService.CACHE_KEYS.NEURAL_LOGS, entry);
    }
  }

  // ==================== FOCUS HEALTH METRICS ====================

  async getFocusHealthMetrics(): Promise<FocusHealthMetrics> {
    return this.hybridGet(
      () => this.supabaseService.getFocusHealthMetrics(),
      HybridStorageService.CACHE_KEYS.FOCUS_HEALTH_METRICS,
      {
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
      }
    );
  }

  async saveFocusHealthMetrics(metrics: FocusHealthMetrics): Promise<void> {
    return this.hybridSet(
      (data) => this.supabaseService.saveFocusHealthMetrics(data),
      HybridStorageService.CACHE_KEYS.FOCUS_HEALTH_METRICS,
      metrics
    );
  }

  // ==================== DISTRACTION EVENTS ====================

  async getDistractionEvents(sessionId?: string): Promise<DistractionEvent[]> {
    const allEvents = await this.hybridGet(
      () => this.supabaseService.getDistractionEvents(),
      HybridStorageService.CACHE_KEYS.DISTRACTION_EVENTS,
      []
    );

    if (sessionId) {
      return allEvents.filter(event => event.sessionId === sessionId);
    }

    return allEvents;
  }

  async saveDistractionEvent(event: DistractionEvent): Promise<void> {
    try {
      await this.supabaseService.saveDistractionEvent(event);

      // Update cache
      const currentEvents = await this.getDistractionEvents();
      await this.silentCache(HybridStorageService.CACHE_KEYS.DISTRACTION_EVENTS, [...currentEvents, event]);
    } catch (error) {
      console.warn('🔄 Saving distraction event offline');

      // Fallback: Save locally and queue for sync
      await this.queueForSync(HybridStorageService.CACHE_KEYS.DISTRACTION_EVENTS, event);
    }
  }

  // ==================== SOURCE LINKS ====================

  async getSourceLinks(): Promise<SourceLink[]> {
    return this.hybridGet(
      () => this.supabaseService.getSourceLinks(),
      HybridStorageService.CACHE_KEYS.SOURCE_LINKS,
      []
    );
  }

  async saveSourceLinks(links: SourceLink[]): Promise<void> {
    return this.hybridSet(
      (data) => this.supabaseService.saveSourceLinks(data),
      HybridStorageService.CACHE_KEYS.SOURCE_LINKS,
      links
    );
  }

  // ==================== DASHBOARD METHODS ====================

  async getCardsDueToday(): Promise<{
    flashcards: (Flashcard | Flashcard)[];
    logicNodes: LogicNode[];
    criticalLogicCount: number;
  }> {
    try {
      // Get all flashcards and logic nodes
      const [flashcards, logicNodes] = await Promise.all([
        this.getFlashcards(),
        this.getLogicNodes(),
      ]);

      // Use SpacedRepetitionService to filter due items
      const srs = SpacedRepetitionService.getInstance();

      // Convert flashcards to FSRS format and get due ones
      const fsrsCards = flashcards.map(card => srs.convertLegacyCard(card));
      const dueFlashcards = srs.getCardsDueToday(fsrsCards);

      // Convert back to original format for compatibility
      const dueFlashcardIds = new Set(dueFlashcards.map(card => card.id));
      const dueFlashcardsOriginal = flashcards.filter(card => dueFlashcardIds.has(card.id));

      // Get due logic nodes
      const currentDate = new Date();
      const dueLogicNodes = logicNodes.filter(node => node.nextReviewDate <= currentDate);

      // Count critical logic nodes (high difficulty or overdue)
      const criticalLogicCount = logicNodes.filter(node =>
        node.difficulty >= 8 || (node.nextReviewDate <= currentDate && node.difficulty >= 6)
      ).length;

      return {
        flashcards: dueFlashcardsOriginal,
        logicNodes: dueLogicNodes,
        criticalLogicCount,
      };
    } catch (error) {
      console.warn('Failed to get cards due today:', error);
      return {
        flashcards: [],
        logicNodes: [],
        criticalLogicCount: 0,
      };
    }
  }

  // ==================== DASHBOARD METHODS ====================

  async calculateCurrentStudyStreak(): Promise<number> {
    try {
      // Get focus sessions to calculate streak
      const sessions = await this.getFocusSessions();

      if (sessions.length === 0) return 0;

      // Sort sessions by date (most recent first)
      const sortedSessions = sessions
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

      let streak = 0;
      let currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0); // Start of today

      // Check if there's a session today or yesterday
      const todaySession = sortedSessions.find(session => {
        const sessionDate = new Date(session.startTime);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === currentDate.getTime();
      });

      if (!todaySession) {
        // Check yesterday
        const yesterday = new Date(currentDate);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdaySession = sortedSessions.find(session => {
          const sessionDate = new Date(session.startTime);
          sessionDate.setHours(0, 0, 0, 0);
          return sessionDate.getTime() === yesterday.getTime();
        });

        if (!yesterdaySession) {
          return 0; // No recent sessions
        }
        currentDate = yesterday;
      }

      // Count consecutive days with sessions
      while (true) {
        const daySession = sortedSessions.find(session => {
          const sessionDate = new Date(session.startTime);
          sessionDate.setHours(0, 0, 0, 0);
          return sessionDate.getTime() === currentDate.getTime();
        });

        if (!daySession) break;

        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      }

      return streak;
    } catch (error) {
      console.warn('Failed to calculate study streak:', error);
      return 0;
    }
  }

  // ==================== UTILITY METHODS ====================

  async clearAllData(): Promise<void> {
    try {
      // Clear Supabase data
      await this.supabaseService.clearAllData();
    } catch (error) {
      console.warn('Failed to clear Supabase data:', error);
    }

    // Clear all cache
    const cacheKeys = Object.values(HybridStorageService.CACHE_KEYS);
    await Promise.all(cacheKeys.map(key => AsyncStorage.removeItem(key)));

    // Clear sync queue
    await AsyncStorage.removeItem('@neurolearn/sync_queue');

    console.log('🗑️ All data cleared (Supabase + Cache)');
  }

  async getStorageInfo(): Promise<{
    isOnline: boolean;
    cacheSize: number;
    queueSize: number;
  }> {
    try {
      const syncQueue = await AsyncStorage.getItem('@neurolearn/sync_queue');
      const queueSize = syncQueue ? JSON.parse(syncQueue).length : 0;

      // Estimate cache size
      // Prefer MMKV for hot keys
      const hotPrefix = HybridStorageService.HOT_KEYS.CONTEXT_CACHE;
      let cacheSize = 0;
      if (MMKVStorageService.isAvailable()) {
        const hotKeys = await MMKVStorageService.getKeysWithPrefix(hotPrefix);
        cacheSize += hotKeys.length;
      }

      const cacheKeys = Object.values(HybridStorageService.CACHE_KEYS);
      const cacheItems = await Promise.all(
        cacheKeys.map(key => AsyncStorage.getItem(key))
      );
      cacheSize += cacheItems.filter(item => item !== null).length;

      return {
        isOnline: this.isOnline,
        cacheSize,
        queueSize,
      };
    } catch (error) {
      return {
        isOnline: this.isOnline,
        cacheSize: 0,
        queueSize: 0,
      };
    }
  }

  // ==================== LEGACY COMPATIBILITY STUBS ====================
  // These methods maintain compatibility with existing code while redirecting to Supabase

  async getStudySessions(): Promise<StudySession[]> { return []; }
  async saveStudySession(session: StudySession): Promise<void> {}
  async saveStudySessions(sessions: StudySession[]): Promise<void> {}

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

  async getTasks(): Promise<Task[]> { return []; }
  async saveTasks(tasks: Task[]): Promise<void> {}

  async getMemoryPalaces(): Promise<MemoryPalace[]> { return []; }
  async saveMemoryPalaces(palaces: MemoryPalace[]): Promise<void> {}

  /**
   * Prune old focus data both in Supabase (if online) and local cache.
   * Best-effort: non-blocking and defensive.
   */
  async pruneOldFocusData(olderThanDays: number = 90): Promise<void> {
    try {
      // Try Supabase prune first
      await this.supabaseService.pruneOldFocusData(olderThanDays);
    } catch (error) {
      console.warn('Supabase pruneOldFocusData failed or unavailable:', error);
    }

    try {
      // Clean local AsyncStorage cache entries to avoid stale large caches
      await AsyncStorage.removeItem(HybridStorageService.CACHE_KEYS.FOCUS_SESSIONS);
    } catch (error) {
      console.warn('Failed to prune local focus cache:', error);
    }
  }



  // ==================== SLEEP ENTRIES ====================

  async getSleepEntries(userId: string, days: number = 30): Promise<any[]> {
    return this.hybridGet(
      () => this.supabaseService.getSleepEntries(userId, days),
      HybridStorageService.CACHE_KEYS.SLEEP_ENTRIES,
      []
    );
  }

  async saveSleepEntries(userId: string, entries: any[]): Promise<void> {
    return this.hybridSet(
      (data) => this.supabaseService.saveSleepEntries(userId, data),
      HybridStorageService.CACHE_KEYS.SLEEP_ENTRIES,
      entries
    );
  }

  // ==================== HEALTH DATA METHODS ====================

  async getLastSleepEntry(userId: string): Promise<any> {
    const entries = await this.getSleepEntries(userId, 7);
    return entries.length > 0 ? entries[0] : null;
  }

  async getUserHealthProfile(userId: string): Promise<any> {
    const healthMetrics = await this.getHealthMetrics(userId);
    const sleepEntries = await this.getSleepEntries(userId, 30);

    if (sleepEntries.length === 0) {
      return {
        avgSleepCycleLength: 90,
        sleepDebt: 0,
        avgSleepQuality: healthMetrics.sleepQuality || 7,
        avgSleepDuration: healthMetrics.sleepHours || 8,
      };
    }

    const avgSleepDuration = sleepEntries.reduce((sum, entry) => sum + entry.duration, 0) / sleepEntries.length;
    const avgSleepQuality = sleepEntries.reduce((sum, entry) => sum + entry.quality, 0) / sleepEntries.length;
    const sleepDebt = Math.max(0, (8 - avgSleepDuration) * 60); // Sleep debt in minutes

    return {
      avgSleepCycleLength: 90, // Default circadian rhythm
      sleepDebt,
      avgSleepQuality: Math.round(avgSleepQuality),
      avgSleepDuration: Math.round(avgSleepDuration * 10) / 10,
    };
  }

  async getMovementData(userId: string, days: number): Promise<any[]> {
    // Stub implementation - return empty array for now
    // Could be extended to integrate with fitness trackers
    return [];
  }

  // ==================== HABIT FORMATION METHODS ====================

  async getHabit(userId: string, habitId: string): Promise<any> {
    // Stub implementation - return default habit
    return {
      id: habitId,
      userId,
      habitType: 'exercise',
      targetBehavior: 'Daily walk',
      frequency: 'daily',
      difficulty: 3,
      currentStreak: 5,
      longestStreak: 10,
      completionRate: 0.7,
      triggers: ['Morning alarm'],
      rewards: ['Healthy snack'],
      createdAt: new Date()
    };
  }

  async getHabitCompletionHistory(userId: string, habitId: string, days: number): Promise<any[]> {
    // Stub implementation - return mock history
    const history = [];
    for (let i = 0; i < days; i++) {
      history.push({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        completed: Math.random() > 0.3,
        triggerUsed: Math.random() > 0.5
      });
    }
    return history;
  }

  async getUserHabits(userId: string): Promise<any[]> {
    // Stub implementation - return mock habits
    return [
      {
        id: '1',
        userId,
        habitType: 'exercise',
        targetBehavior: 'Daily walk',
        frequency: 'daily',
        difficulty: 3,
        currentStreak: 5,
        longestStreak: 10,
        completionRate: 0.7,
        triggers: ['Morning alarm'],
        rewards: ['Healthy snack'],
        createdAt: new Date()
      }
    ];
  }

  async getRewardHistory(userId: string, days: number): Promise<any[]> {
    // Stub implementation - return mock reward history
    const history = [];
    for (let i = 0; i < days; i++) {
      history.push({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: Math.floor(Math.random() * 10),
        type: 'completion'
      });
    }
    return history;
  }

  // ==================== BUDGET ANALYSIS ====================

  async getBudgetAnalysis(userId: string): Promise<any> {
    return this.hybridGet(
      () => this.supabaseService.getBudgetAnalysis(userId),
      HybridStorageService.CACHE_KEYS.BUDGET_ANALYSIS,
      {
        userId,
        categories: [],
        savingsRate: 0,
        totalIncome: 0,
        totalExpenses: 0,
        budgetUtilization: 0,
        lastUpdated: new Date().toISOString(),
      }
    );
  }

  async saveBudgetAnalysis(userId: string, analysis: any): Promise<void> {
    return this.hybridSet(
      (data) => this.supabaseService.saveBudgetAnalysis(userId, data),
      HybridStorageService.CACHE_KEYS.BUDGET_ANALYSIS,
      analysis
    );
  }

  // ==================== GENERIC ITEM METHODS ====================

  async getItem(key: string): Promise<any> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Error getting item from storage:', error);
      return null;
    }
  }

  async setItem(key: string, value: any): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error setting item in storage:', error);
    }
  }

  // ==================== CAE 2.0: CONTEXT STORAGE METHODS ====================

  async saveContextSnapshot(snapshot: any): Promise<void> {
    return this.hybridSet(
      (data) => this.supabaseService.saveContextSnapshot(data),
      '@neurolearn/cache_context_snapshots',
      snapshot
    );
  }

  async getContextSnapshots(startDate?: Date, endDate?: Date, limit?: number): Promise<any[]> {
    return this.hybridGet(
      () => this.supabaseService.getContextSnapshots(startDate, endDate, limit),
      '@neurolearn/cache_context_snapshots',
      []
    );
  }

  async saveLearnedPattern(pattern: any): Promise<void> {
    return this.hybridSet(
      (data) => this.supabaseService.saveLearnedPattern(data),
      '@neurolearn/cache_learned_patterns',
      pattern
    );
  }

  async getLearnedPatterns(): Promise<any[]> {
    return this.hybridGet(
      () => this.supabaseService.getLearnedPatterns(),
      '@neurolearn/cache_learned_patterns',
      []
    );
  }

  async saveOptimalLearningWindow(window: any): Promise<void> {
    return this.hybridSet(
      (data) => this.supabaseService.saveOptimalLearningWindow(data),
      '@neurolearn/cache_optimal_learning_windows',
      window
    );
  }

  async getOptimalLearningWindows(): Promise<any[]> {
    return this.hybridGet(
      () => this.supabaseService.getOptimalLearningWindows(),
      '@neurolearn/cache_optimal_learning_windows',
      []
    );
  }

  async saveKnownLocation(location: any): Promise<void> {
    return this.hybridSet(
      (data) => this.supabaseService.saveKnownLocation(data),
      '@neurolearn/cache_known_locations',
      location
    );
  }

  async getKnownLocations(): Promise<any[]> {
    return this.hybridGet(
      () => this.supabaseService.getKnownLocations(),
      '@neurolearn/cache_known_locations',
      []
    );
  }

  async saveCognitiveForecast(forecast: any): Promise<void> {
    return this.hybridSet(
      (data) => this.supabaseService.saveCognitiveForecast(data),
      '@neurolearn/cache_cognitive_forecasts',
      forecast
    );
  }

  async getCognitiveForecasts(): Promise<any[]> {
    return this.hybridGet(
      () => this.supabaseService.getCognitiveForecasts(),
      '@neurolearn/cache_cognitive_forecasts',
      []
    );
  }

  // ==================== ADDITIONAL UTILITIES (implemented) ====================

  /**
   * Reset sound optimal profiles both in Supabase and local cache.
   */
  async resetOptimalProfiles(): Promise<void> {
    try {
      // Try server-side reset first
      await this.supabaseService.resetOptimalProfiles();
      // Clear local sound settings cache
      await AsyncStorage.removeItem(HybridStorageService.CACHE_KEYS.SOUND_SETTINGS);
      console.log('✅ Optimal sound profiles reset (Supabase + local cache)');
    } catch (error) {
      console.warn('Failed to reset optimal profiles on Supabase, clearing local cache only:', error);
      // Fallback: clear local cache so the app uses defaults
      try {
        await AsyncStorage.removeItem(HybridStorageService.CACHE_KEYS.SOUND_SETTINGS);
      } catch (e) {
        console.error('Failed to clear local sound settings cache:', e);
      }
    }
  }

  /**
   * Export all user data as a JSON string. Best-effort: uses Supabase when online,
   * otherwise composes from local AsyncStorage caches.
   */
  async exportAllData(): Promise<string> {
    try {
      // If online, try to gather from Supabase-backed methods
      if (this.isOnline) {
        const [flashcards, logicNodes, focusSessions, readingSessions, settings, sourceLinks, neuralLogs, soundSettings] = await Promise.all([
          this.getFlashcards(),
          this.getLogicNodes(),
          this.getFocusSessions(),
          this.getReadingSessions(),
          this.getSettings(),
          this.getSourceLinks(),
          this.getNeuralLogs(),
          this.getSoundSettings(),
        ]);

        const payload = {
          flashcards,
          logicNodes,
          focusSessions,
          readingSessions,
          settings,
          sourceLinks,
          neuralLogs,
          soundSettings,
          exportDate: new Date().toISOString(),
          version: '2.1.0',
        };

        return JSON.stringify(payload, null, 2);
      }
    } catch (error) {
      console.warn('Export via Supabase failed, will attempt local cache export:', error);
    }

    // Fallback: assemble from local AsyncStorage caches
    try {
      const keys = Object.values(HybridStorageService.CACHE_KEYS);
      const entries = await Promise.all(keys.map(async (k) => {
        try {
          const v = await AsyncStorage.getItem(k);
          return [k, v ? JSON.parse(v) : null] as const;
        } catch (e) {
          return [k, null] as const;
        }
      }));

      const payload: any = {};
      for (const [k, v] of entries) {
        // Map cache keys to friendly names
        switch (k) {
          case HybridStorageService.CACHE_KEYS.FLASHCARDS:
            payload.flashcards = v || [];
            break;
          case HybridStorageService.CACHE_KEYS.LOGIC_NODES:
            payload.logicNodes = v || [];
            break;
          case HybridStorageService.CACHE_KEYS.FOCUS_SESSIONS:
            payload.focusSessions = v || [];
            break;
          case HybridStorageService.CACHE_KEYS.READING_SESSIONS:
            payload.readingSessions = v || [];
            break;
          case HybridStorageService.CACHE_KEYS.SETTINGS:
            payload.settings = v || {};
            break;
          case HybridStorageService.CACHE_KEYS.SOURCE_LINKS:
            payload.sourceLinks = v || [];
            break;
          case HybridStorageService.CACHE_KEYS.NEURAL_LOGS:
            payload.neuralLogs = v || [];
            break;
          case HybridStorageService.CACHE_KEYS.SOUND_SETTINGS:
            payload.soundSettings = v || {};
            break;
          default:
            // ignore
        }
      }

      payload.exportDate = new Date().toISOString();
      payload.version = '2.1.0';

      return JSON.stringify(payload, null, 2);
    } catch (err) {
      console.error('Failed to export local caches:', err);
      // As a last resort return an empty JSON wrapper
      return JSON.stringify({ exportDate: new Date().toISOString(), version: '2.1.0' });
    }
  }

}

export default HybridStorageService;
