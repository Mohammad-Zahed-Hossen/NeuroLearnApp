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
import { ReadingSession } from './SpeedReadingService';

export class SupabaseStorageService {
  private static instance: SupabaseStorageService;

  public static getInstance(): SupabaseStorageService {
    if (!SupabaseStorageService.instance) {
      SupabaseStorageService.instance = new SupabaseStorageService();
    }
    return SupabaseStorageService.instance;
  }

  private constructor() {}

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
        next_review_date: card.nextReview.toISOString(),
        stability: (card as EnhancedFlashcard).stability,
        focus_strength: (card as EnhancedFlashcard).focusSessionStrength || 0,
        created_at: card.created.toISOString(),
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
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(node => ({
        id: node.id,
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

      const nodeData = nodes.map(node => ({
        id: node.id,
        user_id: userId,
        question: node.question,
        type: node.type,
        next_review_date: node.nextReviewDate.toISOString(),
        total_attempts: node.totalAttempts,
        created_at: node.created.toISOString(),
      }));

      const { error } = await supabase
        .from('logic_nodes')
        .upsert(nodeData);

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
      const { error } = await supabase
        .from('distraction_events')
        .upsert({
          id: event.id,
          session_id: event.sessionId,
          timestamp: event.timestamp.toISOString(),
          trigger_type: event.triggerType || 'unknown',
        });

      if (error) throw error;
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
        wpm: session.wpm,
        comprehensionScore: session.comprehension_score,
        sessionText: session.session_text,
        concepts: session.concepts || {},
        startTime: new Date(session.created_at),
        endTime: new Date(session.created_at),
      }));
    } catch (error) {
      console.error('Error loading reading sessions:', error);
      return [];
    }
  }

  async saveReadingSession(session: ReadingSession): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();

      const { error } = await supabase
        .from('reading_sessions')
        .upsert({
          id: session.id,
          user_id: userId,
          wpm: session.wpm,
          comprehension_score: session.comprehensionScore,
          session_text: session.sessionText,
          concepts: session.concepts || {},
          created_at: session.startTime.toISOString(),
        });

      if (error) throw error;
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
      distractionPerSession: 0,
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
  async pruneOldFocusData(olderThanDays: number = 90): Promise<void> {}
  async saveFocusSessions(sessions: FocusSession[]): Promise<void> {}
  async getFocusSession(sessionId: string): Promise<FocusSession | null> { return null; }
  async saveReadingSessions(sessions: ReadingSession[]): Promise<void> {}
}

export default SupabaseStorageService;