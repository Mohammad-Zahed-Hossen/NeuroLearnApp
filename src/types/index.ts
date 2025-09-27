import { ThemeType } from '../theme/colors';

export interface FocusMode {
  id: string;
  name: string;
  duration: number;
  color: string;
  icon: string;
  description: string;
}

export interface Timer {
  mode: FocusMode;
  timeLeft: number;
  totalTime: number;
  isRunning: boolean;
  isPaused: boolean;
  startTime?: Date;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  category: string;
  created: Date;
  nextReview: Date;
  interval: number;
  easeFactor: number;
  repetitions: number;
  difficulty?: 'again' | 'hard' | 'good' | 'easy' | 'perfect';
}

export interface Task {
  id: string;
  content: string;
  isCompleted: boolean;
  priority: 1 | 2 | 3 | 4;
  due?: {
    date: string;
    datetime?: string;
  };
  projectName: string;
  source: 'todoist' | 'local';
  created: Date;
  description?: string;
  labels?: string[];
}

export interface MemoryPalace {
  id: string;
  name: string;
  description: string;
  category: string;
  created: Date;
  locations: MemoryLocation[];
  totalItems: number;
  masteredItems: number;
  lastStudied: Date;
}

export interface MemoryLocation {
  id: string;
  name: string;
  description: string;
  order: number;
  items?: MemoryItem[];
}

export interface MemoryItem {
  id: string;
  content: string;
  association: string;
  visualization: string;
  created: Date;
  reviewCount: number;
  mastered: boolean;
}

export interface StudySession {
  id: string;
  type: 'focus' | 'flashcards' | 'reading' | 'memory-palace';
  startTime: Date;
  endTime?: Date;
  duration: number; // in minutes
  mode?: string;
  cardsStudied?: number;
  completed: boolean;
}

export interface ProgressData {
  studyStreak: number;
  totalFocusTime: number;
  todayFocusTime: number;
  lastStudyDate: string;
  retentionRate: number;
  masteredCards: number;
  completedSessions: number;
  weeklyData: {
    day: string;
    focusTime: number;
    cardsStudied: number;
  }[];
}

export interface Settings {
  theme: ThemeType;
  dailyGoal: number; // minutes
  defaultSession: string;
  todoistToken: string;
  notionToken: string;
  autoSync: boolean;
  notifications: {
    studyReminders: boolean;
    breakAlerts: boolean;
    reviewNotifications: boolean;
  };
}

export interface NotionPage {
  id: string;
  title: string;
  url: string;
  lastEdited: Date;
  properties: any;
}

export interface NotionDatabase {
  id: string;
  title: string;
  url: string;
  lastEdited: Date;
  properties: any;
}


