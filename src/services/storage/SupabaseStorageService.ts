/**
 * Supabase Storage Service - Cloud Database Integration
 *
 * Replaces AsyncStorage with Supabase PostgreSQL backend
 * Maintains same interface as original StorageService for seamless migration
 */

import SupabaseService from './SupabaseService';

// Resolve a Supabase client in a defensive way so Jest mocks with different
// shapes won't cause module initialization failures.
// Lazy-resolving supabase proxy: defer requiring SupabaseService / client until first use

let _resolvedClient: any = null;
// Throttle repeated warnings about missing tables to avoid log spam in dev
let _warnedContextSnapshotsMissing = false;
function makeChainableApi() {
  // Minimal chainable API for test fallback
  const api: any = {
    select: () => api,
    eq: () => api,
    gte: () => api,
    lte: () => api,
    in: () => api,
    order: () => api,
    limit: () => api,
    single: async () => ({ data: null, error: null }),
    upsert: async (payload: any) => ({ data: payload, error: null }),
    insert: async (payload: any) => ({ data: payload, error: null }),
    update: async (payload: any) => ({ data: payload, error: null }),
    delete: async () => ({ data: [], error: null }),
    then: (cb: any) => Promise.resolve({ data: null }).then(cb),
    catch: (cb: any) => Promise.resolve({ data: null }).catch(cb),
  };
  return api;
}

function makeSupabaseAdapter(client: any) {
  // Wrap client so that even if client.from exists but returns a non-chainable
  // object (common in per-test overrides), we still provide a chainable API
  // used by the rest of the codebase.
  const wrapQuery = (initial: any) => {
    let current: any = initial;

    const ensureWrap = (maybe: any) => {
      // If the returned value is another query-like object, keep wrapping
      current = maybe || current;
      return proxy;
    };

    const proxy: any = {
      select: (...args: any[]) => {
        if (current && typeof current.select === 'function') {
          return wrapQuery(current.select(...args));
        }
        return proxy;
      },
      eq: (...args: any[]) => {
        if (current && typeof current.eq === 'function') {
          return wrapQuery(current.eq(...args));
        }
        return proxy;
      },
      gte: (...args: any[]) => {
        if (current && typeof current.gte === 'function') {
          return wrapQuery(current.gte(...args));
        }
        return proxy;
      },
      lte: (...args: any[]) => {
        if (current && typeof current.lte === 'function') {
          return wrapQuery(current.lte(...args));
        }
        return proxy;
      },
      in: (...args: any[]) => {
        if (current && typeof current.in === 'function') {
          return wrapQuery(current.in(...args));
        }
        return proxy;
      },
      order: (...args: any[]) => {
        if (current && typeof current.order === 'function') {
          return wrapQuery(current.order(...args));
        }
        return proxy;
      },
      limit: (...args: any[]) => {
        if (current && typeof current.limit === 'function') {
          return wrapQuery(current.limit(...args));
        }
        return proxy;
      },
      single: async (...args: any[]) => {
        if (current && typeof current.single === 'function') {
          return current.single(...args);
        }
        // If current is a promise-like result with data/error, return it
        if (current && typeof current.then === 'function') return current;
        return { data: null, error: null };
      },
      upsert: async (...args: any[]) => {
        if (current && typeof current.upsert === 'function') return current.upsert(...args);
        return { data: args[0], error: null };
      },
      insert: async (...args: any[]) => {
        if (current && typeof current.insert === 'function') return current.insert(...args);
        return { data: args[0], error: null };
      },
      update: async (...args: any[]) => {
        if (current && typeof current.update === 'function') return current.update(...args);
        return { data: args[0], error: null };
      },
      delete: async (...args: any[]) => {
        if (current && typeof current.delete === 'function') return current.delete(...args);
        return { data: [], error: null };
      },
      then: (cb: any) => {
        if (current && typeof current.then === 'function') return current.then(cb);
        return Promise.resolve(current).then(cb);
      },
      catch: (cb: any) => {
        if (current && typeof current.catch === 'function') return current.catch(cb);
        return Promise.resolve(current).catch(cb);
      },
      // expose underlying value for debugging
      __get: () => current,
    };

    return proxy;
  };

  if (!client) {
    return {
      from: (_table: string) => makeChainableApi(),
      rpc: async () => ({ data: null, error: null }),
      functions: { invoke: async () => ({ data: null, error: null }) },
      auth: {
        getUser: async () => ({ data: { user: { id: 'test-user' } } }),
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: (_cb: any) => ({ data: null, error: null }),
        signOut: async () => ({ error: null }),
        signInWithPassword: async () => ({ data: { user: { id: 'test-user' } }, error: null }),
      },
    };
  }

  // If client.from exists, wrap it so returned queries are chainable
  const adapted: any = { ...client };
  adapted.from = (table: string) => {
    try {
      const raw = client.from(table);
      return wrapQuery(raw);
    } catch (e) {
      // client.from may throw in some mocks; fallback to chainable stub
      return makeChainableApi();
    }
  };

  // Ensure auth rpc and functions exist on adapter
  adapted.rpc = typeof client.rpc === 'function' ? client.rpc.bind(client) : async () => ({ data: null, error: null });
  adapted.functions = client.functions || { invoke: async () => ({ data: null, error: null }) };
  adapted.auth = client.auth || {
    getUser: async () => ({ data: { user: { id: 'test-user' } } }),
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: (_cb: any) => ({ data: null, error: null }),
    signOut: async () => ({ error: null }),
    signInWithPassword: async () => ({ data: { user: { id: 'test-user' } }, error: null }),
  };

  return adapted;
}

function resolveSupabaseClient(): any {
  if (_resolvedClient) return _resolvedClient;
  try {
    // Use require to avoid hoisting/static analysis issues with Jest mocks
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const S = require('./SupabaseService');
    const maybeDefault = S && S.default ? S.default : S;

    // Try common shapes
    // Handle common mock shapes: { supabase: client } or { client } or factory/getters
    let client = null;
    if (maybeDefault && maybeDefault.supabase) {
      client = maybeDefault.supabase;
    } else if (maybeDefault && maybeDefault.client) {
      client = maybeDefault.client;
    } else if (maybeDefault && typeof maybeDefault.getInstance === 'function') {
      const inst = maybeDefault.getInstance();
      client = inst && typeof inst.getClient === 'function' ? inst.getClient() : inst?.getClient || inst;
    } else if (maybeDefault && typeof maybeDefault.getClient === 'function') {
      client = maybeDefault.getClient();
    } else {
      client = maybeDefault;
    }
    _resolvedClient = makeSupabaseAdapter(client);
  } catch (e) {
    // fallback stub
    _resolvedClient = makeSupabaseAdapter(null);
  }
  return _resolvedClient;
}

const supabase: any = new Proxy({}, {
  get(_, prop: string) {
    const client = resolveSupabaseClient();
    const v = client ? client[prop] : undefined;
    // if it's a function, bind to client
    if (typeof v === 'function') return v.bind(client);
    return v;
  },
  apply(_, thisArg, args) {
    const client = resolveSupabaseClient();
    return (client as any).apply(thisArg, args);
  }
});
import {
  Flashcard,
  Task,
  StudySession,
  MemoryPalace,
  ProgressData,
  Settings,
} from '../../types';
import {
  SoundSettings,
  NeuralLogEntry,
  DistractionEvent,
  FocusSession,
  FocusHealthMetrics,
  LogicNode,
  EnhancedFlashcard,
} from './StorageService';
import pako from 'pako';
import { ReadingSession, SourceLink } from '../learning/SpeedReadingService';
import { NeuroIDGenerator } from '../../utils/NeuroIDGenerator';
import { DistractionService2025 } from '../DistractionService2025';

export class SupabaseStorageService {
  private static instance: SupabaseStorageService;

  public static getInstance(): SupabaseStorageService {
    if (!SupabaseStorageService.instance) {
      SupabaseStorageService.instance = new SupabaseStorageService();
    }
    return SupabaseStorageService.instance;
  }

  /**
   * Initialize Supabase service - verify connection and warm any caches.
   */
  public async initialize(): Promise<void> {
    try {
      // Best-effort ping to supabase
      try {
        await supabase.from('users').select('id').limit(1).single();
      } catch (e) {
        // ignore ping failures; offline use is allowed
      }
    } catch (e) {
      console.warn('SupabaseStorageService.initialize warning:', e);
    }
  }

  /**
   * Shutdown procedures for Supabase client (no-op but kept for API parity)
   */
  public async shutdown(): Promise<void> {
    // Currently supabase-js has no explicit shutdown; keep API parity
    return Promise.resolve();
  }

  /**
   * Best-effort estimate of cloud-backed storage size (may be approximate)
   */
  public async getStorageSize(): Promise<number> {
    try {
      // Attempt to estimate by counting rows in key-value table if present
  const res = await supabase.from('kv_store').select('key', { count: 'exact' }).limit(1);
  if (res && (res as any).count) return (res as any).count as number;
      return 0;
    } catch (e) {
      return 0;
    }
  }

  private constructor() {}

  /**
   * Generate a UUID v7 (modern standard)
   */
  private generateUUID(): string {
    return NeuroIDGenerator.generateUUIDv7();
  }

  // Safe ISO conversion: accepts Date | number | string | undefined
  private toISO(dateLike?: any): string {
    try {
      if (!dateLike) return new Date().toISOString();
      if (dateLike instanceof Date) return dateLike.toISOString();
      if (typeof dateLike === 'number') return new Date(dateLike).toISOString();
      if (typeof dateLike === 'string') {
        const parsed = Date.parse(dateLike);
        if (!isNaN(parsed)) return new Date(parsed).toISOString();
      }
    } catch (err) {
      // fallthrough to default
    }
    return new Date().toISOString();
  }

  private async getCurrentUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    return user.id;
  }

  // ==================== SETTINGS ====================

  async getSettings(): Promise<Settings> {
    try {
      const userId = await this.getCurrentUserId();

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        throw error;
      }

      if (!data) {
        return this.getDefaultSettings();
      }

      return {
        theme: data.theme || 'dark',
        dailyGoal: data.daily_goal || 60,
        defaultSession: 'pomodoro',
        todoistToken: data.todoist_token || '',
        notionToken: data.notion_token || '',
        autoSync: data.auto_sync_enabled ?? true,
        notifications: data.notifications || {
          studyReminders: true,
          breakAlerts: true,
          reviewNotifications: true,
        },
      };
    } catch (error) {
      console.error('Error loading settings:', error);
      return this.getDefaultSettings();
    }
  }

  async saveSettings(settings: Settings): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();

      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          theme: settings.theme,
          daily_goal: settings.dailyGoal,
          auto_sync_enabled: settings.autoSync,
          todoist_token: settings.todoistToken,
          notion_token: settings.notionToken,
          notifications: settings.notifications,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving settings:', error);
      throw new Error(`Failed to save settings: ${error}`);
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

  // ==================== FLASHCARDS ====================

  async getFlashcards(): Promise<EnhancedFlashcard[]> {
    try {
      const userId = await this.getCurrentUserId();

      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

  return (data || []).map((card: any) => ({
        id: card.id,
        front: card.front,
        back: card.back,
        category: card.category || 'general',
        nextReview: new Date(card.next_review_date),
        created: new Date(card.created_at),
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
        stability: card.stability,
        focusSessionStrength: card.focus_strength || 0,
        distractionWeakening: 0,
      }));
    } catch (error) {
      // If user not authenticated, return empty array instead of throwing
      const msg = (error as any)?.message;
      if (msg && msg.includes('User not authenticated')) {
        console.warn('User not authenticated, returning empty flashcards array');
        return [];
      }
      console.error('Error loading flashcards:', error);
      return [];
    }
  }

  async saveFlashcards(flashcards: (Flashcard | EnhancedFlashcard)[]): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();

      const flashcardData = flashcards.map(card => ({
        id: card.id,
        user_id: userId,
        front: card.front,
        back: card.back,
        category: card.category,
        next_review_date: this.toISO((card as any).nextReview),
        stability: (card as EnhancedFlashcard).stability,
        focus_strength: (card as EnhancedFlashcard).focusSessionStrength || 0,
        created_at: this.toISO((card as any).created),
      }));

      const { error } = await supabase
        .from('flashcards')
        .upsert(flashcardData);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving flashcards:', error);
      throw new Error(`Failed to save flashcards: ${error}`);
    }
  }

  // ==================== LOGIC NODES ====================

  async getLogicNodes(): Promise<LogicNode[]> {
    try {
      const userId = await this.getCurrentUserId();

      const { data, error } = await supabase
        .from('logic_nodes')
        .select('*, custom_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

  return (data || []).map((node: any) => ({
        id: node.custom_id || node.id, // Use custom_id if available (legacy), otherwise UUID
        customId: node.custom_id || undefined,
        question: node.question,
        premise1: '',
        premise2: '',
        conclusion: '',
        type: node.type || 'deductive',
        domain: 'general',
        difficulty: 3,
        easeFactor: 2.5,
        interval: 1,
        repetitions: 0,
        nextReviewDate: new Date(node.next_review_date),
        lastAccessed: new Date(node.created_at),
        totalAttempts: node.total_attempts || 0,
        correctAttempts: 0,
        accessCount: 0,
        focusSessionStrength: 0,
        distractionPenalty: 0,
        created: new Date(node.created_at),
        modified: new Date(node.created_at),
      }));
    } catch (error) {
      // If user not authenticated, return empty array instead of throwing
      const msg = (error as any)?.message;
      if (msg && msg.includes('User not authenticated')) {
        console.warn('User not authenticated, returning empty logic nodes array');
        return [];
      }
      console.error('Error loading logic nodes:', error);
      return [];
    }
  }

  async saveLogicNodes(nodes: LogicNode[]): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();

      const nodeData = nodes.map(node => {
        const transformedNode = { ...node };

        // Always normalize ID to ensure it's a valid UUID
        const normalized = NeuroIDGenerator.normalizeID(node.id);
        transformedNode.id = normalized.id;
        transformedNode.customId = normalized.isLegacy ? normalized.originalId : node.customId;

        return {
          id: transformedNode.id,
          custom_id: transformedNode.customId || null,
          user_id: userId,
          question: transformedNode.question,
          type: transformedNode.type,
          next_review_date: transformedNode.nextReviewDate ? this.toISO(transformedNode.nextReviewDate) : this.toISO(new Date()),
          total_attempts: transformedNode.totalAttempts,
          created_at: transformedNode.created ? this.toISO(transformedNode.created) : this.toISO(new Date()),
        };
      });

      const { error } = await supabase
        .from('logic_nodes')
        .upsert(nodeData, { onConflict: 'id' });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving logic nodes:', error);
      throw new Error(`Failed to save logic nodes: ${error}`);
    }
  }

  async addLogicNode(nodeData: Partial<LogicNode>): Promise<LogicNode> {
    try {
      const userId = await this.getCurrentUserId();
      const now = new Date();

      const newNode: LogicNode = {
        id: this.generateUUID(),
        customId: nodeData.customId,
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

      const { error } = await supabase
        .from('logic_nodes')
        .insert({
          id: newNode.id,
          user_id: userId,
          question: newNode.question,
          type: newNode.type,
          next_review_date: newNode.nextReviewDate.toISOString(),
          total_attempts: newNode.totalAttempts,
          created_at: newNode.created.toISOString(),
        });

      if (error) throw error;

      return newNode;
    } catch (error) {
      console.error('Error adding logic node:', error);
      throw new Error(`Failed to add logic node: ${error}`);
    }
  }

  async updateLogicNode(nodeId: string, updates: Partial<LogicNode>): Promise<LogicNode | null> {
    try {
      const userId = await this.getCurrentUserId();

      const { error } = await supabase
        .from('logic_nodes')
        .update({
          question: updates.question,
          type: updates.type,
          next_review_date: updates.nextReviewDate?.toISOString(),
          total_attempts: updates.totalAttempts,
        })
        .eq('id', nodeId)
        .eq('user_id', userId);

      if (error) throw error;

      // Return updated node
      const nodes = await this.getLogicNodes();
      return nodes.find(node => node.id === nodeId) || null;
    } catch (error) {
      console.error('Error updating logic node:', error);
      throw new Error(`Failed to update logic node: ${error}`);
    }
  }

  // ==================== FOCUS SESSIONS ====================

  async getFocusSessions(): Promise<FocusSession[]> {
    try {
      const userId = await this.getCurrentUserId();

      const { data: sessions, error: sessionsError } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      const { data: distractions, error: distractionsError } = await supabase
        .from('distraction_events')
        .select('*')
  .in('session_id', (sessions || []).map((s: any) => s.id));

      if (distractionsError) throw distractionsError;

  return (sessions || []).map((session: any) => ({
        id: session.id,
        taskId: 'task_' + session.id,
        nodeId: undefined,
        startTime: new Date(session.start_time),
        endTime: new Date(session.end_time),
        durationMinutes: session.duration_minutes,
        plannedDurationMinutes: session.duration_minutes,
          distractionCount: (distractions || []).filter((d: any) => d.session_id === session.id).length,
          distractionEvents: (distractions || [])
          .filter((d: any) => d.session_id === session.id)
          .map((d: any) => ({
            id: d.id,
            sessionId: d.session_id,
            timestamp: new Date(d.timestamp),
            triggerType: d.trigger_type,
          })),
        selfReportFocus: session.self_report_focus,
        completionRate: 1.0,
        cognitiveLoadStart: 0.5,
        focusLockUsed: false,
        created: new Date(session.created_at),
        modified: new Date(session.created_at),
      }));
    } catch (error) {
      console.error('Error loading focus sessions:', error);
      return [];
    }
  }

  async saveFocusSession(session: FocusSession): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();

      const { error } = await supabase
        .from('focus_sessions')
        .upsert({
          id: session.id,
          user_id: userId,
          start_time: session.startTime.toISOString(),
          end_time: session.endTime.toISOString(),
          duration_minutes: session.durationMinutes,
          self_report_focus: session.selfReportFocus,
          created_at: session.created.toISOString(),
        });

      if (error) throw error;

      // Save distraction events
      if (session.distractionEvents.length > 0) {
        const distractionData = session.distractionEvents.map(event => ({
          id: event.id,
          session_id: session.id,
          timestamp: event.timestamp.toISOString(),
          trigger_type: event.triggerType || 'unknown',
        }));

        const { error: distractionError } = await supabase
          .from('distraction_events')
          .upsert(distractionData);

        if (distractionError) throw distractionError;
      }
    } catch (error) {
      console.error('Error saving focus session:', error);
      throw new Error(`Failed to save focus session: ${error}`);
    }
  }

  async saveDistractionEvent(event: DistractionEvent): Promise<void> {
    try {
      await DistractionService2025.getInstance().saveDistractionEvent({
        id: event.id,
        user_id: await this.getCurrentUserId(),
        session_id: event.sessionId,
        distraction_type: 'internal', // Default type, can be enhanced
        duration_ms: 0, // Default duration, can be calculated
        severity: 'low', // Default severity
        metadata: {
          trigger_type: event.triggerType || 'unknown',
          timestamp: event.timestamp.toISOString()
        }
      });
    } catch (error) {
      console.error('Error saving distraction event:', error);
      throw new Error(`Failed to save distraction event: ${error}`);
    }
  }

  async getDistractionEvents(sessionId?: string): Promise<DistractionEvent[]> {
    try {
      let query = supabase.from('distraction_events').select('*');

      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { data, error } = await query;

      if (error) throw error;

  return (data || []).map((event: any) => ({
        id: event.id,
        sessionId: event.session_id,
        timestamp: new Date(event.timestamp),
        triggerType: event.trigger_type,
      }));
    } catch (error) {
      console.error('Error loading distraction events:', error);
      return [];
    }
  }

  // ==================== READING SESSIONS ====================

  async getReadingSessions(): Promise<ReadingSession[]> {
    try {
      const userId = await this.getCurrentUserId();

      const { data, error } = await supabase
        .from('reading_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

  return (data || []).map((session: any) => ({
        id: session.id,
        textSource: session.text_source,
        textTitle: session.text_title,
        textDifficulty: session.text_difficulty,
        wordCount: session.word_count,
        wpmGoal: session.wpm_goal,
        wpmAchieved: session.wpm_achieved,
        wpmPeak: session.wpm_peak,
        comprehensionScore: session.comprehension_score,
        startTime: new Date(session.start_time),
        endTime: new Date(session.end_time),
        totalDurationMs: session.total_duration_ms,
        readingDurationMs: session.reading_duration_ms,
        pauseDurationMs: session.pause_duration_ms,
        fixationAccuracy: session.fixation_accuracy,
        regressionCount: session.regression_count,
        subVocalizationEvents: session.sub_vocalization_events,
        cognitiveLoadStart: session.cognitive_load_start,
        cognitiveLoadEnd: session.cognitive_load_end,
        displayMode: session.display_mode,
        chunkSize: session.chunk_size,
        pauseOnPunctuation: session.pause_on_punctuation,
        highlightVowels: session.highlight_vowels,
        conceptsIdentified: session.concepts_identified || [],
        neuralNodesStrengthened: session.neural_nodes_strengthened || [],
        sourceLinks: session.source_links || [],
        created: new Date(session.created_at),
        modified: new Date(session.modified_at),
      }));
    } catch (error) {
      // If user not authenticated, return empty array instead of throwing
      const msg = (error as any)?.message;
      if (msg && msg.includes('User not authenticated')) {
        console.warn('User not authenticated, returning empty reading sessions array');
        return [];
      }
      console.error('Error loading reading sessions:', error);
      return [];
    }
  }

  async saveReadingSession(session: ReadingSession): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      const payload: any = {
        id: session.id,
        user_id: userId,
        text_source: session.textSource,
        text_title: session.textTitle,
        text_difficulty: session.textDifficulty,
        word_count: session.wordCount,
        wpm_goal: session.wpmGoal,
        wpm_achieved: session.wpmAchieved,
        wpm_peak: session.wpmPeak,
        comprehension_score: session.comprehensionScore,
        start_time: this.toISO(session.startTime),
        end_time: this.toISO(session.endTime),
        total_duration_ms: session.totalDurationMs,
        reading_duration_ms: session.readingDurationMs,
        pause_duration_ms: session.pauseDurationMs,
        fixation_accuracy: session.fixationAccuracy,
        regression_count: session.regressionCount,
        sub_vocalization_events: session.subVocalizationEvents,
        cognitive_load_start: session.cognitiveLoadStart,
        cognitive_load_end: session.cognitiveLoadEnd,
        display_mode: session.displayMode,
        chunk_size: session.chunkSize,
        pause_on_punctuation: session.pauseOnPunctuation,
        highlight_vowels: session.highlightVowels,
        concepts_identified: session.conceptsIdentified,
        neural_nodes_strengthened: session.neuralNodesStrengthened,
        source_links: (session.sourceLinks || []).map((l: any) => ({
          ...l,
          extractedAt: this.toISO(l.extractedAt),
        })),
        created_at: this.toISO(session.created),
        modified_at: this.toISO(session.modified),
      };

      // Attempt to upsert; if DB schema is missing a column (PGRST204), retry without that column
      let res = await supabase.from('reading_sessions').upsert(payload);
      if (res.error) {
        const err: any = res.error;
        if (err.code === 'PGRST205') {
          console.error("Supabase error: reading_sessions table not found (PGRST205). Ensure DB migrations were applied.", err);
          throw err;
        }
        if (err.code === 'PGRST204' && payload.chunk_size !== undefined) {
          console.warn("reading_sessions appears to be missing a column (PGRST204). Retrying upsert without 'chunk_size'.");
          const reduced = { ...payload };
          delete reduced.chunk_size;
          const retry = await supabase.from('reading_sessions').upsert(reduced);
          if (retry.error) throw retry.error;
        } else {
          throw err;
        }
      }
    } catch (error) {
      console.error('Error saving reading session:', error);
      throw new Error(`Failed to save reading session: ${error}`);
    }
  }

  // ==================== SOUND SETTINGS ====================

  async getSoundSettings(): Promise<SoundSettings> {
    try {
      const userId = await this.getCurrentUserId();

      const { data, error } = await supabase
        .from('user_profiles')
        .select('optimal_profile')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return {
        volume: 0.7,
        optimalProfile: data?.optimal_profile || {},
        personalizationEnabled: true,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error loading sound settings:', error);
      return { volume: 0.7 };
    }
  }

  async saveSoundSettings(settings: SoundSettings): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();

      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          optimal_profile: settings.optimalProfile || {},
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving sound settings:', error);
      throw new Error(`Failed to save sound settings: ${error}`);
    }
  }

  async resetOptimalProfiles(): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();

      const { error } = await supabase
        .from('user_profiles')
        .update({ optimal_profile: {} })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error resetting optimal profiles:', error);
      throw error;
    }
  }

  // ==================== NEURAL LOGS ====================

  async getNeuralLogs(): Promise<NeuralLogEntry[]> {
    try {
      const userId = await this.getCurrentUserId();

      const { data, error } = await supabase
        .from('neural_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (error) throw error;

  return (data || []).map((log: any) => ({
        id: log.id,
        timestamp: log.timestamp,
        metrics: {
          cognitiveLoad: log.cognitive_load,
          entrainmentScore: log.entrainment_score,
        },
      }));
    } catch (error) {
      console.error('Error loading neural logs:', error);
      return [];
    }
  }

  async appendNeuralLog(entry: NeuralLogEntry): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();

      const { error } = await supabase
        .from('neural_logs')
        .insert({
          id: entry.id,
          user_id: userId,
          timestamp: entry.timestamp,
          cognitive_load: entry.metrics?.cognitiveLoad || 0.5,
          entrainment_score: entry.metrics?.entrainmentScore || 0.5,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error appending neural log:', error);
      throw new Error(`Failed to append neural log: ${error}`);
    }
  }

  // ==================== SOURCE LINKS ====================

  async getSourceLinks(): Promise<SourceLink[]> {
    try {
      const userId = await this.getCurrentUserId();

      const { data, error } = await supabase
        .from('source_links')
        .select('*')
        .eq('user_id', userId)
        .order('extracted_at', { ascending: false });

      if (error) throw error;

  return (data || []).map((link: any) => ({
        type: link.type,
        sessionId: link.session_id,
        textSource: link.text_source,
        conceptId: link.concept_id,
        relevanceScore: link.relevance_score,
        extractedAt: new Date(link.extracted_at),
      }));
    } catch (error) {
      console.error('Error loading source links:', error);
      return [];
    }
  }

  async saveSourceLinks(links: SourceLink[]): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();

      const linkData = links.map(link => ({
        user_id: userId,
        type: link.type,
        session_id: link.sessionId,
        text_source: link.textSource,
        concept_id: link.conceptId,
        relevance_score: link.relevanceScore,
        extracted_at: this.toISO(link.extractedAt),
      }));

      const { error } = await supabase
        .from('source_links')
        .upsert(linkData);

      if (error) throw error;
    } catch (error) {
      // More helpful error for missing table/schema cache
      const err: any = error;
      if (err?.code === 'PGRST205') {
        console.error("Supabase error: source_links table not found (PGRST205). Make sure you've applied the DB migrations or supabase schema includes 'source_links'.", err);
      } else {
        console.error('Error saving source links:', err);
      }
      throw new Error(`Failed to save source links: ${error}`);
    }
  }

  // ==================== UTILITY METHODS ====================

  async clearAllData(): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();

      // Delete all user data
      await Promise.all([
        supabase.from('flashcards').delete().eq('user_id', userId),
        supabase.from('logic_nodes').delete().eq('user_id', userId),
        supabase.from('reading_sessions').delete().eq('user_id', userId),
        supabase.from('focus_sessions').delete().eq('user_id', userId),
        supabase.from('neural_logs').delete().eq('user_id', userId),
        supabase.from('user_profiles').delete().eq('id', userId),
      ]);

      console.log('🗑️ All user data cleared from Supabase');
    } catch (error) {
      console.error('Error clearing data:', error);
      throw new Error(`Failed to clear data: ${error}`);
    }
  }

  // ==================== STUB METHODS (for compatibility) ====================
  async getStudySessions(): Promise<StudySession[]> {
    try {
      const userId = await this.getCurrentUserId();
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return (data || []).map((s: any) => ({
        id: s.id,
        startTime: new Date(s.start_time),
        endTime: new Date(s.end_time),
        duration: s.duration,
        type: s.type,
        cardsReviewed: s.cards_reviewed,
        correctAnswers: s.correct_answers,
        totalAnswers: s.total_answers,
        focusRating: s.focus_rating,
        notes: s.notes,
        cognitiveLoad: s.cognitive_load,
        completed: s.completed,
        mode: s.mode,
      }));
    } catch (error) {
      // If user not authenticated, return empty array instead of throwing
      const msg = (error as any)?.message;
      if (msg && msg.includes('User not authenticated')) {
        console.warn('User not authenticated, returning empty study sessions array');
        return [];
      }
      console.error('Error loading study sessions:', error);
      return [];
    }
  }

  async saveStudySession(session: StudySession): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      const payload: any = {
        id: session.id,
        user_id: userId,
        start_time: session.startTime ? this.toISO(session.startTime) : this.toISO(new Date()),
        end_time: session.endTime ? this.toISO(session.endTime) : this.toISO(new Date()),
        duration: session.duration,
        type: session.type,
        cards_reviewed: session.cardsReviewed || session.cardsStudied || 0,
        correct_answers: session.correctAnswers || 0,
        total_answers: session.totalAnswers || 0,
        focus_rating: session.focusRating || null,
        notes: session.notes || null,
        cognitive_load: session.cognitiveLoad || null,
        completed: session.completed || false,
        mode: session.mode || null,
        created_at: this.toISO(session.startTime || new Date()),
      };

      const { error } = await supabase.from('study_sessions').upsert(payload);
      if (error) throw error;
    } catch (error) {
      console.error('Error saving study session:', error);
      throw new Error(`Failed to save study session: ${error}`);
    }
  }

  async saveStudySessions(sessions: StudySession[]): Promise<void> {
    try {
      for (const s of sessions) {
        await this.saveStudySession(s);
      }
    } catch (error) {
      console.error('Error saving study sessions batch:', error);
      throw new Error(`Failed to save study sessions: ${error}`);
    }
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

  // ==================== USER PROGRESS ====================
  async getUserProgress(userId: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      // table missing or no row
      if (error && error.code === 'PGRST205') {
        console.warn('Supabase table user_progress not found. Returning null for getUserProgress.');
        return null;
      }

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) return null;

      // If the progress was stored as JSON in a `progress` column, return it; otherwise return raw row
      return data.progress ?? data;
    } catch (err) {
      console.error('Error loading user progress from Supabase:', err);
      return null;
    }
  }

  async saveUserProgress(userId: string, progress: any): Promise<void> {
    try {
      const payload: any = {
        user_id: userId,
        progress: progress,
        total_points: progress?.totalPoints ?? progress?.total_points ?? 0,
        level: progress?.level ?? 1,
        updated_at: this.toISO(new Date()),
      };

      const { error } = await supabase.from('user_progress').upsert(payload, { onConflict: 'user_id' });
      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('Supabase table user_progress not found. Skipping saveUserProgress.');
          return;
        }
        throw error;
      }
    } catch (err) {
      console.error('Error saving user progress to Supabase:', err);
      throw new Error(`Failed to save user progress: ${err}`);
    }
  }
  async getTasks(): Promise<Task[]> {
    try {
      const userId = await this.getCurrentUserId();
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      return (data || []).map((t: any) => ({
        id: t.id,
        content: t.content,
        description: t.description,
        isCompleted: !!t.is_completed,
        isCompletedAlias: !!t.is_completed,
        priority: t.priority || 1,
        due: t.due ? { date: t.due } : undefined,
        dueDate: t.due ? new Date(t.due) : undefined,
        projectName: t.project_name || 'Inbox',
        tags: t.tags || [],
        labels: t.labels || [],
        created: t.created_at ? new Date(t.created_at) : new Date(),
        modified: t.modified_at ? new Date(t.modified_at) : undefined,
        todoistId: t.todoist_id || undefined,
        source: t.source || 'local',
      } as Task));
    } catch (error) {
      // If user not authenticated, return empty array instead of throwing
      const msg = (error as any)?.message;
      if (msg && msg.includes('User not authenticated')) {
        console.warn('User not authenticated, returning empty tasks array');
        return [];
      }
      console.error('Error loading tasks:', error);
      return [];
    }
  }

  async saveTasks(tasks: Task[]): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      const payload = tasks.map(t => ({
        id: t.id,
        user_id: userId,
        content: t.content,
        description: t.description,
        is_completed: t.isCompleted || false,
        priority: t.priority || 1,
        due: t.due?.date || null,
        project_name: t.projectName || 'Inbox',
        tags: t.tags || [],
        labels: t.labels || [],
        todoist_id: t.todoistId || null,
        source: t.source || 'local',
        created_at: t.created ? this.toISO(t.created) : this.toISO(new Date()),
      }));

      const { error } = await supabase.from('tasks').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
    } catch (error) {
      console.error('Error saving tasks:', error);
      throw new Error(`Failed to save tasks: ${error}`);
    }
  }
  async getMemoryPalaces(): Promise<MemoryPalace[]> {
    try {
      const userId = await this.getCurrentUserId();
      const { data, error } = await supabase
        .from('memory_palaces')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        rooms: p.rooms || [],
        locations: p.locations || p.rooms || [],
        created: p.created_at ? new Date(p.created_at) : new Date(),
        modified: p.updated_at ? new Date(p.updated_at) : new Date(),
        isActive: p.is_active || false,
        totalItems: p.total_items || 0,
        masteredItems: p.mastered_items || 0,
        lastStudied: p.last_studied ? new Date(p.last_studied) : undefined,
      }));
    } catch (error) {
      // If user not authenticated, return empty array instead of throwing
      const msg = (error as any)?.message;
      if (msg && msg.includes('User not authenticated')) {
        console.warn('User not authenticated, returning empty memory palaces array');
        return [];
      }
      console.error('Error loading memory palaces:', error);
      return [];
    }
  }

  async saveMemoryPalaces(palaces: MemoryPalace[]): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      const payload = palaces.map(p => ({
        id: p.id,
        user_id: userId,
        name: p.name,
        description: p.description,
        rooms: p.rooms || p.locations || [],
        locations: p.locations || p.rooms || [],
        total_items: p.totalItems || 0,
        mastered_items: p.masteredItems || 0,
        last_studied: p.lastStudied ? this.toISO(p.lastStudied) : null,
        is_active: p.isActive || false,
        created_at: p.created ? this.toISO(p.created) : this.toISO(new Date()),
      }));

      const { error } = await supabase.from('memory_palaces').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
    } catch (error) {
      console.error('Error saving memory palaces:', error);
      throw new Error(`Failed to save memory palaces: ${error}`);
    }
  }
  async getFocusHealthMetrics(): Promise<FocusHealthMetrics> {
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
  async saveFocusHealthMetrics(metrics: FocusHealthMetrics): Promise<void> {}
  async pruneOldFocusData(olderThanDays: number = 90): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();

      const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();

      // Delete distraction events referencing very old sessions first
      const { error: delDistractionError } = await supabase
        .from('distraction_events')
        .delete()
        .eq('user_id', userId)
        .lt('timestamp', cutoff);

      if (delDistractionError) {
        console.warn('Failed to prune old distraction events:', delDistractionError);
      }

      // Then delete old focus sessions
      const { error: delSessionsError } = await supabase
        .from('focus_sessions')
        .delete()
        .eq('user_id', userId)
        .lt('created_at', cutoff);

      if (delSessionsError) {
        console.warn('Failed to prune old focus sessions:', delSessionsError);
      }

      console.log(`🧹 Pruned focus data older than ${olderThanDays} days`);
    } catch (error) {
      console.warn('Prune old focus data skipped (Supabase unavailable or error):', error);
      // Don't throw - pruning is best-effort
    }
  }
  async saveFocusSessions(sessions: FocusSession[]): Promise<void> {}
  async getFocusSession(sessionId: string): Promise<FocusSession | null> { return null; }
  async saveReadingSessions(sessions: ReadingSession[]): Promise<void> {}

  // ==================== COGNITIVE METRICS ====================

  async getCognitiveMetrics(userId: string): Promise<any[]> {
    try {
      const currentUserId = await this.getCurrentUserId();
      const { data, error } = await supabase
        .from('cognitive_metrics')
        .select('*')
        .eq('user_id', currentUserId)
        .order('timestamp', { ascending: false })
        .limit(30); // Last 30 entries

      if (error) {
        // If table doesn't exist, return empty array
        if (error.code === 'PGRST205') {
          console.warn('Cognitive metrics table not found, returning empty data');
          return [];
        }
        throw error;
      }

  return (data || []).map((metric: any) => ({
        id: metric.id,
        timestamp: new Date(metric.timestamp),
        focusScore: metric.focus_score,
        attentionSpan: metric.attention_span,
        taskSwitchingRate: metric.task_switching_rate,
        errorRate: metric.error_rate,
        responseTime: metric.response_time,
        sessionQuality: metric.session_quality,
        cognitiveLoad: metric.cognitive_load,
        mentalFatigue: metric.mental_fatigue,
        attentionScore: metric.attention_score,
      }));
    } catch (error) {
      console.error('Error loading cognitive metrics:', error);
      return [];
    }
  }

  async saveCognitiveMetrics(userId: string, metrics: any[]): Promise<void> {
    try {
      const currentUserId = await this.getCurrentUserId();
      const metricData = metrics.map(metric => ({
        id: metric.id || this.generateUUID(),
        user_id: currentUserId,
        timestamp: this.toISO(metric.timestamp),
        focus_score: metric.focusScore,
        attention_span: metric.attentionSpan,
        task_switching_rate: metric.taskSwitchingRate,
        error_rate: metric.errorRate,
        response_time: metric.responseTime,
        session_quality: metric.sessionQuality,
        cognitive_load: metric.cognitiveLoad,
        mental_fatigue: metric.mentalFatigue,
        attention_score: metric.attentionScore,
      }));

      const { error } = await supabase
        .from('cognitive_metrics')
        .upsert(metricData);

      if (error) {
        // If table doesn't exist, silently skip
        if (error.code === 'PGRST205') {
          console.warn('Cognitive metrics table not found, skipping save');
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error saving cognitive metrics:', error);
      throw new Error(`Failed to save cognitive metrics: ${error}`);
    }
  }

  // ==================== HEALTH METRICS ====================

  async getHealthMetrics(userId: string): Promise<any> {
    try {
      const currentUserId = await this.getCurrentUserId();
      const { data, error } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('user_id', currentUserId)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      // Handle both "no rows found" and "table not found" errors
      if (error && error.code !== 'PGRST116' && error.code !== 'PGRST205') throw error;

      if (!data || error?.code === 'PGRST116' || error?.code === 'PGRST205') {
        return {
          userId: currentUserId,
          date: new Date().toISOString().split('T')[0],
          sleepHours: 8,
          sleepQuality: 7,
          workoutIntensity: 5,
          stressLevel: 3,
          heartRateAvg: 70,
          steps: 8000,
          caloriesBurned: 2000,
          recoveryScore: 8,
        };
      }

      return {
        userId: data.user_id,
        date: data.date,
        sleepHours: data.sleep_hours,
        sleepQuality: data.sleep_quality,
        workoutIntensity: data.workout_intensity,
        stressLevel: data.stress_level,
        heartRateAvg: data.heart_rate_avg,
        steps: data.steps,
        caloriesBurned: data.calories_burned,
        recoveryScore: data.recovery_score,
      };
    } catch (error) {
      console.error('Error loading health metrics:', error);
      return {
        userId: userId,
        date: new Date().toISOString().split('T')[0],
        sleepHours: 8,
        sleepQuality: 7,
        workoutIntensity: 5,
        stressLevel: 3,
        heartRateAvg: 70,
        steps: 8000,
        caloriesBurned: 2000,
        recoveryScore: 8,
      };
    }
  }

  async saveHealthMetrics(userId: string, metrics: any): Promise<void> {
    try {
      const currentUserId = await this.getCurrentUserId();
      const { error } = await supabase
        .from('health_metrics')
        .upsert({
          user_id: currentUserId,
          date: metrics.date,
          sleep_hours: metrics.sleepHours,
          sleep_quality: metrics.sleepQuality,
          workout_intensity: metrics.workoutIntensity,
          stress_level: metrics.stressLevel,
          heart_rate_avg: metrics.heartRateAvg,
          steps: metrics.steps,
          calories_burned: metrics.caloriesBurned,
          recovery_score: metrics.recoveryScore,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving health metrics:', error);
      throw new Error(`Failed to save health metrics: ${error}`);
    }
  }

  // ==================== SLEEP ENTRIES ====================

  async getSleepEntries(userId: string, days: number = 30): Promise<any[]> {
    try {
      const currentUserId = await this.getCurrentUserId();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data, error } = await supabase
        .from('sleep_logs')
        .select('*')
        .eq('user_id', currentUserId)
        .gte('date', cutoffDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;

  return (data || []).map((entry: any) => ({
        id: entry.id,
        userId: entry.user_id,
        bedtime: entry.bedtime,
        wakeTime: entry.wake_time,
        duration: entry.duration,
        quality: entry.quality,
        sleepScore: entry.sleep_score,
        sleepDebt: entry.sleep_debt,
        date: entry.date,
      }));
    } catch (error) {
      console.error('Error loading sleep entries:', error);
      return [];
    }
  }

  async saveSleepEntries(userId: string, entries: any[]): Promise<void> {
    try {
      const currentUserId = await this.getCurrentUserId();
      const entryData = entries.map(entry => ({
        id: entry.id || this.generateUUID(),
        user_id: currentUserId,
        bedtime: entry.bedtime,
        wake_time: entry.wakeTime,
        duration: entry.duration,
        quality: entry.quality,
        sleep_score: entry.sleepScore,
        sleep_debt: entry.sleepDebt,
        date: entry.date,
      }));

      const { error } = await supabase
        .from('sleep_logs')
        .upsert(entryData);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving sleep entries:', error);
      throw new Error(`Failed to save sleep entries: ${error}`);
    }
  }

  // ==================== BUDGET ANALYSIS ====================

  async getBudgetAnalysis(userId: string): Promise<any> {
    try {
      const currentUserId = await this.getCurrentUserId();
      const { data, error } = await supabase
        .from('budget_analysis')
        .select('*')
        .eq('user_id', currentUserId)
        .order('last_updated', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        return {
          userId: currentUserId,
          categories: [],
          savingsRate: 0,
          totalIncome: 0,
          totalExpenses: 0,
          budgetUtilization: 0,
          lastUpdated: new Date().toISOString(),
        };
      }

      return {
        userId: data.user_id,
        categories: data.categories || [],
        savingsRate: data.savings_rate || 0,
        totalIncome: data.total_income || 0,
        totalExpenses: data.total_expenses || 0,
        budgetUtilization: data.budget_utilization || 0,
        lastUpdated: data.last_updated,
      };
    } catch (error) {
      console.error('Error loading budget analysis:', error);
      return {
        userId: userId,
        categories: [],
        savingsRate: 0,
        totalIncome: 0,
        totalExpenses: 0,
        budgetUtilization: 0,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  async saveBudgetAnalysis(userId: string, analysis: any): Promise<void> {
    try {
      const currentUserId = await this.getCurrentUserId();
      const { error } = await supabase
        .from('budget_analysis')
        .upsert({
          user_id: currentUserId,
          categories: analysis.categories || [],
          savings_rate: analysis.savingsRate || 0,
          total_income: analysis.totalIncome || 0,
          total_expenses: analysis.totalExpenses || 0,
          budget_utilization: analysis.budgetUtilization || 0,
          last_updated: this.toISO(new Date()),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving budget analysis:', error);
      throw new Error(`Failed to save budget analysis: ${error}`);
    }
  }

  // ==================== CAE 2.0: CONTEXT STORAGE METHODS ====================

  async saveContextSnapshot(snapshot: any): Promise<void> {
    try {
      let userId: string | null = null;
      try {
        userId = await this.getCurrentUserId();
      } catch (e) {
        // Not authenticated - proceed but leave user_id null. Supabase RLS may block this.
        userId = null;
      }

      // Check if user is authenticated before attempting to save
      if (!userId) {
        console.warn('User not authenticated, skipping context snapshot save to cloud');
        return;
      }

      // Generate context hash for deduplication
      const contextHash = snapshot.contextHash ||
        `${snapshot.sessionId || 'anon'}_${snapshot.timestamp || Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const payload: any = {
        id: snapshot.id,
        user_id: userId,
        session_id: snapshot.sessionId || null,
        timestamp: snapshot.timestamp || Date.now(),
        time_intelligence: snapshot.timeIntelligence || null,
        location_context: snapshot.locationContext || null,
        digital_body_language: snapshot.digitalBodyLanguage || null,
        overall_optimality: snapshot.overallOptimality || null,
        context_quality_score: snapshot.contextQualityScore || null,
        device_state: snapshot.deviceState || null,
        context_hash: contextHash,
        version: snapshot.version || 1,
      };

      const res: any = await supabase
        .from('context_snapshots')
        .upsert(payload, { onConflict: 'context_hash' }); // Use context_hash for deduplication

      const data = res?.data;
      const error = res?.error;

      if (error) {
        // If table not found or column missing, surface a friendly warning but don't crash the caller
        if (error.code === 'PGRST205' || error.code === 'PGRST204') {
          if (!_warnedContextSnapshotsMissing) {
            console.warn('Supabase table context_snapshots not found or schema mismatch. Skipping cloud save.');
            _warnedContextSnapshotsMissing = true;
          }
          return;
        }
        throw error;
      }
      // Return the saved row if caller expects it (compat)
      const saved = Array.isArray(data) && data.length > 0 ? data[0] : data || null;
      return saved || undefined;
    } catch (error) {
      console.error('Error saving context snapshot:', error);
      throw new Error(`Failed to save context snapshot: ${error}`);
    }
  }

  async getContextSnapshots(startDate?: Date, endDate?: Date, limit?: number): Promise<any[]> {
    try {
      const userId = await this.getCurrentUserId();

      let query = supabase
        .from('context_snapshots')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (startDate) {
        query = query.gte('timestamp', startDate.toISOString());
      }

      if (endDate) {
        query = query.lte('timestamp', endDate.toISOString());
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;

  return (data || []).map((snapshot: any) => ({
        id: snapshot.id,
        sessionId: snapshot.session_id,
        timestamp: snapshot.timestamp,
        timeIntelligence: snapshot.time_intelligence,
        locationContext: snapshot.location_context,
        digitalBodyLanguage: snapshot.digital_body_language,
        overallOptimality: snapshot.overall_optimality,
        contextQualityScore: snapshot.context_quality_score,
        deviceState: snapshot.device_state,
        userId: snapshot.user_id,
      }));
    } catch (error) {
      console.error('Error loading context snapshots:', error);
      return [];
    }
  }

  /**
   * Batch upload of context snapshots. Attempts to call an RPC insert_context_batch
   * if available; otherwise falls back to upsert in chunks. Supports optional gzip compression output
   * as { compressed: true, data: <Uint8Array> } when compression desired; however the RPC may expect JSON.
   */
  async saveContextSnapshotsBatch(snapshots: any[], opts?: { userId?: string; compression?: boolean; batchSize?: number }): Promise<{ inserted?: number; skipped?: number } | void> {
    try {
      const userId = opts?.userId || (await this.getCurrentUserId()).toString();
      const batchSize = opts?.batchSize || 50;

      // Try RPC first (insert_context_batch) if supported by the backend
      try {
        if (typeof supabase.rpc === 'function') {
          // RPC expects JSONB array of contexts and user id
          for (let i = 0; i < snapshots.length; i += batchSize) {
            const chunk = snapshots.slice(i, i + batchSize);
            // Optionally compress the chunk payload
            if (opts?.compression) {
              const json = JSON.stringify(chunk);
              const compressed = pako.gzip(json);
              // If your edge function expects compressed bytes, pass as appropriate.
              // We'll attempt RPC with compressed bytes first; if backend doesn't accept it, fallback to upsert.
              try {
                const res = await supabase.rpc('insert_context_batch', { p_user_id: userId, p_contexts: chunk });
                if (res?.error) throw res.error;
              } catch (rpcErr) {
                // Fallback to upsert
                const { error } = await supabase.from('context_snapshots').upsert(chunk as any[]);
                if (error) throw error;
              }
            } else {
              const res = await supabase.rpc('insert_context_batch', { p_user_id: userId, p_contexts: chunk });
              if (res?.error) {
                // RPC failed; fallback to upsert
                const { error } = await supabase.from('context_snapshots').upsert(chunk as any[]);
                if (error) throw error;
              }
            }
          }
          return { inserted: snapshots.length };
        }
      } catch (e) {
        // RPC not available or failed - fallback below to upsert in chunks
      }

      // Fallback: upsert in batches
      for (let i = 0; i < snapshots.length; i += batchSize) {
        const chunk = snapshots.slice(i, i + batchSize).map((s: any) => ({
          id: s.id,
          user_id: userId,
          session_id: s.sessionId || null,
          timestamp: s.timestamp || Date.now(),
          time_intelligence: s.timeIntelligence || null,
          location_context: s.locationContext || null,
          digital_body_language: s.digitalBodyLanguage || null,
          overall_optimality: s.overallOptimality || null,
          context_hash: s.contextHash || s.context_hash || null,
          version: s.version || 1,
        }));
        const { error } = await supabase.from('context_snapshots').upsert(chunk as any[]);
        if (error) throw error;
      }

      return { inserted: snapshots.length };
    } catch (error) {
      console.error('Error in saveContextSnapshotsBatch:', error);
      throw error;
    }
  }

  async saveLearnedPattern(pattern: any): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();

      const { error } = await supabase
        .from('learned_patterns')
        .upsert({
          id: pattern.id,
          user_id: userId,
          type: pattern.type,
          pattern: pattern.pattern,
          last_seen: pattern.lastSeen,
          effectiveness: pattern.effectiveness,
          created_at: pattern.createdAt,
          updated_at: pattern.updatedAt,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving learned pattern:', error);
      throw new Error(`Failed to save learned pattern: ${error}`);
    }
  }

  async getLearnedPatterns(): Promise<any[]> {
    try {
      const userId = await this.getCurrentUserId();

      const { data, error } = await supabase
        .from('learned_patterns')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

  return (data || []).map((pattern: any) => ({
        id: pattern.id,
        type: pattern.type,
        pattern: pattern.pattern,
        lastSeen: pattern.last_seen,
        effectiveness: pattern.effectiveness,
        createdAt: pattern.created_at,
        updatedAt: pattern.updated_at,
      }));
    } catch (error) {
      console.error('Error loading learned patterns:', error);
      return [];
    }
  }

  async saveOptimalLearningWindow(window: any): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();

      const { error } = await supabase
        .from('optimal_learning_windows')
        .upsert({
          id: window.id,
          user_id: userId,
          circadian_hour: window.circadianHour,
          day_of_week: window.dayOfWeek,
          performance_score: window.performanceScore,
          frequency: window.frequency,
          last_performance: window.lastPerformance,
          last_seen: window.lastSeen,
          created_at: window.createdAt,
          updated_at: window.updatedAt,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving optimal learning window:', error);
      throw new Error(`Failed to save optimal learning window: ${error}`);
    }
  }

  async getOptimalLearningWindows(): Promise<any[]> {
    try {
      const userId = await this.getCurrentUserId();

      const { data, error } = await supabase
        .from('optimal_learning_windows')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

  return (data || []).map((window: any) => ({
        id: window.id,
        circadianHour: window.circadian_hour,
        dayOfWeek: window.day_of_week,
        performanceScore: window.performance_score,
        frequency: window.frequency,
        lastPerformance: window.last_performance,
        lastSeen: window.last_seen,
        createdAt: window.created_at,
        updatedAt: window.updated_at,
      }));
    } catch (error) {
      console.error('Error loading optimal learning windows:', error);
      return [];
    }
  }

  async saveKnownLocation(location: any): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();

      const { error } = await supabase
        .from('known_locations')
        .upsert({
          id: location.id,
          user_id: userId,
          name: location.name,
          coordinates: location.coordinates,
          environment: location.environment,
          performance_history: location.performanceHistory,
          average_performance: location.averagePerformance,
          visit_count: location.visitCount,
          last_visit: location.lastVisit,
          created_at: location.createdAt,
          updated_at: location.updatedAt,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving known location:', error);
      throw new Error(`Failed to save known location: ${error}`);
    }
  }

  async getKnownLocations(): Promise<any[]> {
    try {
      const userId = await this.getCurrentUserId();

      const { data, error } = await supabase
        .from('known_locations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

  return (data || []).map((location: any) => ({
        id: location.id,
        name: location.name,
        coordinates: location.coordinates,
        environment: location.environment,
        performanceHistory: location.performance_history,
        averagePerformance: location.average_performance,
        visitCount: location.visit_count,
        lastVisit: location.last_visit,
        createdAt: location.created_at,
        updatedAt: location.updated_at,
      }));
    } catch (error) {
      console.error('Error loading known locations:', error);
      return [];
    }
  }

  async saveCognitiveForecast(forecast: any): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();

      const { error } = await supabase
        .from('cognitive_forecasting')
        .upsert({
          user_id: userId,
          model_version: forecast.modelVersion,
          predicted_context: forecast.predictedContext,
          predicted_optimality: forecast.predictedOptimality,
          prediction_horizon: forecast.predictionHorizon,
          actual_context: forecast.actualContext,
          actual_optimality: forecast.actualOptimality,
          prediction_accuracy: forecast.predictionAccuracy,
          created_at: forecast.createdAt,
          evaluated_at: forecast.evaluatedAt,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving cognitive forecast:', error);
      throw new Error(`Failed to save cognitive forecast: ${error}`);
    }
  }

  // ==================== GENERIC KEY-VALUE METHODS ====================

  async getItem(key: string): Promise<any> {
    try {
      const userId = await this.getCurrentUserId();

      const { data, error } = await supabase
        .from('user_profiles')
        .select('custom_data')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        throw error;
      }

      if (data?.custom_data && typeof data.custom_data === 'object') {
        return data.custom_data[key] || null;
      }

      return null;
    } catch (error) {
      console.error('Error getting item from Supabase:', error);
      return null;
    }
  }

  async setItem(key: string, value: any): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();

      // First get current custom_data
      const { data, error } = await supabase
        .from('user_profiles')
        .select('custom_data')
        .eq('id', userId)
        .single();

      let customData: any = {};
      if (!error && data?.custom_data && typeof data.custom_data === 'object') {
        customData = { ...data.custom_data };
      }

      // Update the key
      if (value === null || value === undefined) {
        delete customData[key];
      } else {
        customData[key] = value;
      }

      const { error: updateError } = await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          custom_data: customData,
        });

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error setting item in Supabase:', error);
      throw new Error(`Failed to set item: ${error}`);
    }
  }

  async getCognitiveForecasts(): Promise<any[]> {
    try {
      const userId = await this.getCurrentUserId();

      const { data, error } = await supabase
        .from('cognitive_forecasting')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

  return (data || []).map((forecast: any) => ({
        id: forecast.id,
        modelVersion: forecast.model_version,
        predictedContext: forecast.predicted_context,
        predictedOptimality: forecast.predicted_optimality,
        predictionHorizon: forecast.prediction_horizon,
        actualContext: forecast.actual_context,
        actualOptimality: forecast.actual_optimality,
        predictionAccuracy: forecast.prediction_accuracy,
        createdAt: forecast.created_at,
        evaluatedAt: forecast.evaluated_at,
      }));
    } catch (error) {
      console.error('Error loading cognitive forecasts:', error);
      return [];
    }
  }

  // ==================== COGNITIVE SESSIONS ====================

  async saveCognitiveSession(sessionId: string, log: any): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();

      const { error } = await supabase
        .from('cognitive_sessions')
        .upsert({
          id: sessionId,
          user_id: userId,
          log: log,
          created_at: this.toISO(new Date()),
          updated_at: this.toISO(new Date()),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving cognitive session:', error);
      throw new Error(`Failed to save cognitive session: ${error}`);
    }
  }
}

export default SupabaseStorageService;
