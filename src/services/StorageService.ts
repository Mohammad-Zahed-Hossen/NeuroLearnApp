import AsyncStorage from '@react-native-async-storage/async-storage';
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
}

/**
 * Complete Storage Service with FSRS, Logic Training, and ALL existing methods
 * Fixes all missing method errors while maintaining FSRS integration
 */
export class StorageService {
  private static instance: StorageService;

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
  };

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private constructor() {}

  // ==================== FLASHCARD OPERATIONS ====================

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
      },
    ];
  }

  // ==================== STUDY SESSIONS ====================

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
    try {
      // Save to both locations for compatibility
      await Promise.all([
        AsyncStorage.setItem(
          StorageService.KEYS.SETTINGS,
          JSON.stringify(settings),
        ),
        AsyncStorage.setItem(
          StorageService.KEYS.LEGACY_SETTINGS,
          JSON.stringify(settings),
        ),
      ]);
    } catch (error: any) {
      console.error('Error saving Settings:', error);
      if ((error as Error).message) {
        throw new Error(`Failed to save Settings: ${(error as Error).message}`);
      }
    }
  }

  async getSettings(): Promise<Settings> {
    try {
      // Try new location first, then legacy
      let data = await AsyncStorage.getItem(StorageService.KEYS.SETTINGS);
      if (!data) {
        data = await AsyncStorage.getItem(StorageService.KEYS.LEGACY_SETTINGS);
      }

      if (!data) {
        return this.getDefaultSettings();
      }

      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading settings:', error);
      return this.getDefaultSettings();
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
        lastStudied: palace.lastStudied.toISOString(),
      }));

      // Save to both locations for compatibility
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
      console.error('Error saving Memory Palace:', error);
      if ((error as Error).message) {
        throw new Error(
          `Failed to save Memory Palace: ${(error as Error).message}`,
        );
      }
    }
  }

  async getMemoryPalaces(): Promise<MemoryPalace[]> {
    try {
      // Try new location first, then legacy
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
        lastStudied: new Date(palace.lastStudied),
      }));
    } catch (error) {
      console.error('Error loading memory palaces:', error);
      return [];
    }
  }

  // ==================== LOGIC TRAINING (NEW FSRS Feature) ====================

  async saveLogicNodes(logicNodes: LogicNode[]): Promise<void> {
    try {
      const serializedNodes = logicNodes.map((node) => ({
        ...node,
        nextReviewDate: node.nextReviewDate.toISOString(),
        lastAccessed: node.lastAccessed.toISOString(),
        created: node.created.toISOString(),
        modified: node.modified.toISOString(),
        lastReview: node.lastReview ? node.lastReview.toISOString() : undefined,
      }));

      await AsyncStorage.setItem(
        StorageService.KEYS.LOGIC_NODES,
        JSON.stringify(serializedNodes),
      );

      console.log(`💾 Saved ${logicNodes.length} logic training nodes`);
    } catch (error: any) {
      console.error('Error saving Logic Node:', error);
      if ((error as Error).message) {
        throw new Error(
          `Failed to save Logic Node: ${(error as Error).message}`,
        );
      }
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
        created: new Date(node.created),
        modified: new Date(node.modified),
        lastReview: node.lastReview ? new Date(node.lastReview) : undefined,
      }));
    } catch (error) {
      console.error('Error loading logic nodes:', error);
      return [];
    }
  }

  async addLogicNode(logicData: {
    question: string;
    premise1: string;
    premise2: string;
    conclusion: string;
    type: 'deductive' | 'inductive' | 'abductive';
    domain: 'programming' | 'math' | 'english' | 'general';
    difficulty: 1 | 2 | 3 | 4 | 5;
  }): Promise<LogicNode> {
    try {
      const existingNodes = await this.getLogicNodes();
      const currentDate = new Date();

      const newNode: LogicNode = {
        id: `logic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...logicData,

        // FSRS initialization
        easeFactor: 2.5,
        interval: 1,
        repetitions: 0,
        nextReviewDate: currentDate,
        lastAccessed: currentDate,

        // Performance tracking
        totalAttempts: 0,
        correctAttempts: 0,
        accessCount: 0,

        // FSRS-specific
        stability: undefined,
        fsrsDifficulty: undefined,
        lastReview: undefined,
        state: 0,

        created: currentDate,
        modified: currentDate,
      };

      const updatedNodes = [...existingNodes, newNode];
      await this.saveLogicNodes(updatedNodes);

      console.log(
        `✅ Created new logic node: ${newNode.question.substring(0, 50)}...`,
      );
      return newNode;
    } catch (error: any) {
      console.error('Error Adding Logic Node:', error);
      throw new Error(
        `Failed to Add Logic Node: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  async updateLogicNode(
    nodeId: string,
    updates: Partial<LogicNode>,
  ): Promise<void> {
    try {
      const existingNodes = await this.getLogicNodes();
      const nodeIndex = existingNodes.findIndex((node) => node.id === nodeId);

      if (nodeIndex === -1) {
        throw new Error(`Logic node not found: ${nodeId}`);
      }

      existingNodes[nodeIndex] = {
        ...existingNodes[nodeIndex],
        ...updates,
        modified: new Date(),
      };

      await this.saveLogicNodes(existingNodes);
      console.log(`📝 Updated logic node: ${nodeId}`);
    } catch (error: any) {
      console.error('Error Updating Logic Node:', error);
      if ((error as Error).message) {
        throw new Error(
          `Failed to Update Logic Node: ${(error as Error).message}`,
        );
      }
    }
  }

  // ==================== FSRS-SPECIFIC OPERATIONS ====================

  async saveFSRSCards(fsrsCards: FSRSCard[]): Promise<void> {
    try {
      const serializedCards = fsrsCards.map((card) => ({
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
      console.error('Error saving FSRS Card:', error);
      if ((error as Error).message) {
        throw new Error(
          `Failed to save FSRS Card: ${(error as Error).message}`,
        );
      }
    }
  }

  async getFSRSCards(): Promise<FSRSCard[]> {
    try {
      const data = await AsyncStorage.getItem(StorageService.KEYS.FSRS_CARDS);
      if (!data) return [];

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

  async saveFSRSReviewLogs(reviewLogs: FSRSReviewLog[]): Promise<void> {
    try {
      const existingLogs = await this.getFSRSReviewLogs();
      const allLogs = [...existingLogs, ...reviewLogs];
      const recentLogs = allLogs.slice(-10000); // Keep last 10k logs

      const serializedLogs = recentLogs.map((log) => ({
        ...log,
        review: log.review.toISOString(),
      }));

      await AsyncStorage.setItem(
        StorageService.KEYS.FSRS_REVIEW_LOGS,
        JSON.stringify(serializedLogs),
      );
    } catch (error: any) {
      console.error('Error saving FSRS Review Log:', error);
      if ((error as Error).message) {
        throw new Error(
          `Failed to save FSRS Review Log: ${(error as Error).message}`,
        );
      }
    }
  }

  async getFSRSReviewLogs(): Promise<FSRSReviewLog[]> {
    try {
      const data = await AsyncStorage.getItem(
        StorageService.KEYS.FSRS_REVIEW_LOGS,
      );
      if (!data) return [];

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

  // ==================== UTILITY METHODS ====================

  async clearAllData(): Promise<void> {
    try {
      const keys = Object.values(StorageService.KEYS);
      await AsyncStorage.multiRemove(keys);
      console.log('🗑️ All data cleared');
    } catch (error: any) {
      console.error('Error Clearing Data:', error);
      if ((error as Error).message) {
        throw new Error(`Failed to Clear Data: ${(error as Error).message}`);
      }
    }
  }

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
      ] = await Promise.all([
        this.getFlashcards(),
        this.getStudySessions(),
        this.getProgressData(),
        this.getTasks(),
        this.getSettings(),
        this.getMemoryPalaces(),
        this.getLogicNodes(),
      ]);

      const exportData = {
        flashcards,
        sessions,
        progress,
        tasks,
        settings,
        palaces,
        logicNodes,
        exportDate: new Date().toISOString(),
        version: '2.0.0',
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error: any) {
      console.error('Error Exporting Data:', error);
      // Fix: Always throw in catch block
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
}

