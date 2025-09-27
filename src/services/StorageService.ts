import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Flashcard,
  StudySession,
  ProgressData,
  Task,
  Settings,
  MemoryPalace,
} from '../types';

export class StorageService {
  private static instance: StorageService;

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  // Flashcards Storage
  async saveFlashcards(flashcards: Flashcard[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        'neurolearn_flashcards',
        JSON.stringify(flashcards),
      );
    } catch (error) {
      console.error('Error saving flashcards:', error);
      throw error;
    }
  }

  async getFlashcards(): Promise<Flashcard[]> {
    try {
      const data = await AsyncStorage.getItem('neurolearn_flashcards');
      if (!data) return this.getDefaultFlashcards();

      return JSON.parse(data).map((card: any) => ({
        ...card,
        created: new Date(card.created),
        nextReview: new Date(card.nextReview),
      }));
    } catch (error) {
      console.error('Error loading flashcards:', error);
      return this.getDefaultFlashcards();
    }
  }

  private getDefaultFlashcards(): Flashcard[] {
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
      },
    ];
  }

  // Study Sessions Storage
  async saveStudySession(session: StudySession): Promise<void> {
    try {
      const sessions = await this.getStudySessions();
      sessions.push(session);
      await AsyncStorage.setItem(
        'neurolearn_sessions',
        JSON.stringify(sessions),
      );
    } catch (error) {
      console.error('Error saving study session:', error);
      throw error;
    }
  }

  async getStudySessions(): Promise<StudySession[]> {
    try {
      const data = await AsyncStorage.getItem('neurolearn_sessions');
      if (!data) return [];

      return JSON.parse(data).map((session: any) => ({
        ...session,
        startTime: new Date(session.startTime),
        endTime: session.endTime ? new Date(session.endTime) : undefined,
      }));
    } catch (error) {
      console.error('Error loading study sessions:', error);
      return [];
    }
  }

  // Progress Data Storage
  async saveProgressData(progress: ProgressData): Promise<void> {
    try {
      await AsyncStorage.setItem(
        'neurolearn_progress',
        JSON.stringify(progress),
      );
    } catch (error) {
      console.error('Error saving progress data:', error);
      throw error;
    }
  }

  async getProgressData(): Promise<ProgressData> {
    try {
      const data = await AsyncStorage.getItem('neurolearn_progress');
      if (!data) return this.getDefaultProgressData();

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

  // Tasks Storage
  async saveTasks(tasks: Task[]): Promise<void> {
    try {
      await AsyncStorage.setItem('neurolearn_tasks', JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving tasks:', error);
      throw error;
    }
  }

  async getTasks(): Promise<Task[]> {
    try {
      const data = await AsyncStorage.getItem('neurolearn_tasks');
      if (!data) return [];

      return JSON.parse(data).map((task: any) => ({
        ...task,
        created: new Date(task.created),
      }));
    } catch (error) {
      console.error('Error loading tasks:', error);
      return [];
    }
  }

  // Settings Storage
  async saveSettings(settings: Settings): Promise<void> {
    try {
      await AsyncStorage.setItem(
        'neurolearn_settings',
        JSON.stringify(settings),
      );
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  async getSettings(): Promise<Settings> {
    try {
      const data = await AsyncStorage.getItem('neurolearn_settings');
      if (!data) return this.getDefaultSettings();

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

  // Memory Palaces Storage
  async saveMemoryPalaces(palaces: MemoryPalace[]): Promise<void> {
    try {
      await AsyncStorage.setItem('neurolearn_palaces', JSON.stringify(palaces));
    } catch (error) {
      console.error('Error saving memory palaces:', error);
      throw error;
    }
  }

  async getMemoryPalaces(): Promise<MemoryPalace[]> {
    try {
      const data = await AsyncStorage.getItem('neurolearn_palaces');
      if (!data) return [];

      return JSON.parse(data).map((palace: any) => ({
        ...palace,
        created: new Date(palace.created),
      }));
    } catch (error) {
      console.error('Error loading memory palaces:', error);
      return [];
    }
  }

  // Utility Methods
  async clearAllData(): Promise<void> {
    try {
      const keys = [
        'neurolearn_flashcards',
        'neurolearn_sessions',
        'neurolearn_progress',
        'neurolearn_tasks',
        'neurolearn_settings',
        'neurolearn_palaces',
      ];
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }

  async exportAllData(): Promise<string> {
    try {
      const [flashcards, sessions, progress, tasks, settings, palaces] =
        await Promise.all([
          this.getFlashcards(),
          this.getStudySessions(),
          this.getProgressData(),
          this.getTasks(),
          this.getSettings(),
          this.getMemoryPalaces(),
        ]);

      const exportData = {
        flashcards,
        sessions,
        progress,
        tasks,
        settings,
        palaces,
        exportDate: new Date().toISOString(),
        version: '1.0.0',
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }
}
