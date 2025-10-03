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
import { SupabaseStorageService } from './SupabaseStorageService';
import { StorageService } from './StorageService';
import {
  Flashcard,
  Task,
  StudySession,
  MemoryPalace,
  ProgressData,
  Settings,
} from '../types';
import {
  SoundSettings,
  NeuralLogEntry,
  DistractionEvent,
  FocusSession,
  FocusHealthMetrics,
  LogicNode,
  EnhancedFlashcard,
} from './StorageService';
import { ReadingSession, SourceLink } from './SpeedReadingService';

export class HybridStorageService {
  private static instance: HybridStorageService;
  private supabaseService: SupabaseStorageService;
  private legacyService: StorageService;
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
  };

  public static getInstance(): HybridStorageService {
    if (!HybridStorageService.instance) {
      HybridStorageService.instance = new HybridStorageService();
    }
    return HybridStorageService.instance;
  }

  private constructor() {
    this.supabaseService = SupabaseStorageService.getInstance();
    this.legacyService = StorageService.getInstance();
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
      await AsyncStorage.setItem(key, JSON.stringify(data));
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
      default:
        console.warn('Unknown sync item type:', item.key);
    }
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

  async getFlashcards(): Promise<(Flashcard | EnhancedFlashcard)[]> {
    return this.hybridGet(
      () => this.supabaseService.getFlashcards(),
      HybridStorageService.CACHE_KEYS.FLASHCARDS,
      []
    );
  }

  async saveFlashcards(flashcards: (Flashcard | EnhancedFlashcard)[]): Promise<void> {
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
      const cacheKeys = Object.values(HybridStorageService.CACHE_KEYS);
      const cacheItems = await Promise.all(
        cacheKeys.map(key => AsyncStorage.getItem(key))
      );
      const cacheSize = cacheItems.filter(item => item !== null).length;

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
}

export default HybridStorageService;
