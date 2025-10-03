import HybridStorageService from './HybridStorageService';
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
 * StorageService - Simple wrapper that delegates to HybridStorageService
 * Maintains backward compatibility while using cloud-first architecture
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

  // ==================== SETTINGS ====================
  async saveSettings(settings: Settings): Promise<void> {
    return this.getHybridService().saveSettings(settings);
  }

  async getSettings(): Promise<Settings> {
    return this.getHybridService().getSettings();
  }

  // ==================== FLASHCARDS ====================
  async saveFlashcards(flashcards: (Flashcard | EnhancedFlashcard)[]): Promise<void> {
    return this.getHybridService().saveFlashcards(flashcards);
  }

  async getFlashcards(): Promise<EnhancedFlashcard[]> {
    return this.getHybridService().getFlashcards() as Promise<EnhancedFlashcard[]>;
  }

  // ==================== LOGIC NODES ====================
  async saveLogicNodes(nodes: LogicNode[]): Promise<void> {
    return this.getHybridService().saveLogicNodes(nodes);
  }

  async getLogicNodes(): Promise<LogicNode[]> {
    return this.getHybridService().getLogicNodes();
  }

  async addLogicNode(nodeData: Partial<LogicNode>): Promise<LogicNode> {
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

  async getFocusHealthMetrics(): Promise<FocusHealthMetrics> {
    return this.getHybridService().getFocusHealthMetrics();
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

  async getSoundSettings(): Promise<SoundSettings> {
    return this.getHybridService().getSoundSettings();
  }

  async appendNeuralLog(entry: NeuralLogEntry): Promise<void> {
    return this.getHybridService().appendNeuralLog(entry);
  }

  async getNeuralLogs(): Promise<NeuralLogEntry[]> {
    return this.getHybridService().getNeuralLogs();
  }

  // ==================== LEGACY COMPATIBILITY STUBS ====================
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

  async clearAllData(): Promise<void> {
    return this.getHybridService().clearAllData();
  }

  async exportAllData(): Promise<string> {
    return JSON.stringify({
      flashcards: await this.getFlashcards(),
      logicNodes: await this.getLogicNodes(),
      focusSessions: await this.getFocusSessions(),
      readingSessions: await this.getReadingSessions(),
      settings: await this.getSettings(),
      exportDate: new Date().toISOString(),
      version: '2.1.0',
    }, null, 2);
  }

  async getStorageInfo(): Promise<{ keys: string[]; estimatedSize: number; }> {
    const info = await this.getHybridService().getStorageInfo();
    return {
      keys: ['hybrid-storage'],
      estimatedSize: info.cacheSize,
    };
  }
}

export default StorageService;
