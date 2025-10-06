/**
 * Supabase Storage Service - Cloud Database Integration
 *
 * Replaces AsyncStorage with Supabase PostgreSQL backend
 * Maintains same interface as original StorageService for seamless migration
 */

import { supabase } from './SupabaseService';
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

      return (data || []).map(card => ({
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

      return (data || []).map(node => ({
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
        .in('session_id', (sessions || []).map(s => s.id));

      if (distractionsError) throw distractionsError;

      return (sessions || []).map(session => ({
        id: session.id,
        taskId: 'task_' + session.id,
        nodeId: undefined,
        startTime: new Date(session.start_time),
        endTime: new Date(session.end_time),
        durationMinutes: session.duration_minutes,
        plannedDurationMinutes: session.duration_minutes,
        distractionCount: (distractions || []).filter(d => d.session_id === session.id).length,
        distractionEvents: (distractions || [])
          .filter(d => d.session_id === session.id)
          .map(d => ({
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

      return (data || []).map(event => ({
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

      return (data || []).map(session => ({
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

      return (data || []).map(log => ({
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

      return (data || []).map(link => ({
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
      const { data, error } = await supabase
        .from('cognitive_metrics')
        .select('*')
        .eq('user_id', userId)
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

      return (data || []).map(metric => ({
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
      const metricData = metrics.map(metric => ({
        id: metric.id || this.generateUUID(),
        user_id: userId,
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
      const { data, error } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      // Handle both "no rows found" and "table not found" errors
      if (error && error.code !== 'PGRST116' && error.code !== 'PGRST205') throw error;

      if (!data || error?.code === 'PGRST116' || error?.code === 'PGRST205') {
        return {
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
      };
    }
  }

  async saveHealthMetrics(userId: string, metrics: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('health_metrics')
        .upsert({
          user_id: userId,
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
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data, error } = await supabase
        .from('sleep_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('date', cutoffDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;

      return (data || []).map(entry => ({
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
      const entryData = entries.map(entry => ({
        id: entry.id || this.generateUUID(),
        user_id: userId,
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
      const { data, error } = await supabase
        .from('budget_analysis')
        .select('*')
        .eq('user_id', userId)
        .order('last_updated', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        return {
          userId,
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
        userId,
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
      const { error } = await supabase
        .from('budget_analysis')
        .upsert({
          user_id: userId,
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
      const userId = await this.getCurrentUserId();

      const { error } = await supabase
        .from('context_snapshots')
        .upsert({
          id: snapshot.id,
          user_id: userId,
          session_id: snapshot.sessionId,
          timestamp: snapshot.timestamp,
          time_intelligence: snapshot.timeIntelligence,
          location_context: snapshot.locationContext,
          digital_body_language: snapshot.digitalBodyLanguage,
          overall_optimality: snapshot.overallOptimality,
          context_quality_score: snapshot.contextQualityScore,
          device_state: snapshot.deviceState,
        });

      if (error) throw error;
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

      return (data || []).map(snapshot => ({
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

      return (data || []).map(pattern => ({
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

      return (data || []).map(window => ({
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

      return (data || []).map(location => ({
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
        .from('cognitive_forecasts')
        .upsert({
          id: forecast.id,
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

  async getCognitiveForecasts(): Promise<any[]> {
    try {
      const userId = await this.getCurrentUserId();

      const { data, error } = await supabase
        .from('cognitive_forecasts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(forecast => ({
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
}

export default SupabaseStorageService;
