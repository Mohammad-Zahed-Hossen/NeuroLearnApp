import { ThemeType } from '../theme/colors';

// src/types/index.ts
// Missing type definitions that HybridStorageService needs

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  // core scheduling fields (align with current screens expectations)
  difficulty?: number;
  lastReviewed?: Date; // legacy name
  // some code uses nextReview (Date) directly — keep as string|Date to be flexible
  nextReview: string | Date;
  nextReviewDate?: Date;
  repetitions?: number;
  easeFactor?: number;
  interval?: number;
  created: Date;
  modified?: Date;
  tags?: string[];
  category?: string;
  stability?: number;
  fsrsDifficulty?: number;
  state?: number;
  lapses?: number;
  isAiGenerated?: boolean;
}

export interface Task {
  id: string;
  // Align with UI code expectations (content/isCompleted/priority numeric)
  title?: string;
  content: string;
  description?: string | undefined;
  completed?: boolean;
  // UI code uses isCompleted frequently
  isCompleted: boolean;
  // Use numeric priority across screens (1..4 or similar)
  priority: number;
  // keep optional due object (string date) used by integrations
  due?: { date: string; timezone?: string } | null | undefined;
  dueDate?: Date;
  category?: string;
  tags?: string[];
  labels?: string[];
  created: Date;
  modified?: Date;
  todoistId?: string;
  source?: string; // e.g. 'todoist'
  projectName?: string;
  focusTime?: number;
  estimatedMinutes?: number;
}

export interface StudySession {
  id?: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  // added aliases and optional fields used by different modules
  type?: 'flashcards' | 'reading' | 'focus' | 'logic' | string;
  cardsReviewed?: number;
  cardsStudied?: number; // alias
  itemsStudied?: number; // for service compatibility
  correctAnswers?: number;
  totalAnswers?: number;
  focusRating?: number;
  notes?: string;
  cognitiveLoad?: number;
  completed?: boolean;
  // some screens write custom properties
  mode?: string;
}

export interface MemoryLocation {
  id: string;
  name: string;
  items?: MemoryItem[];
  position?: number;
  imageUrl?: string;
  description?: string;
  order: number;
}

export interface MemoryPalace {
  id?: string;
  name?: string;
  description?: string;
  rooms?: MemoryRoom[];
  // legacy code uses `locations` as the primary collection
  locations?: MemoryLocation[];
  created?: Date;
  modified?: Date;
  isActive?: boolean;
  totalItems?: number;
  category?: string;
  masteredItems?: number;
  lastStudied?: Date;
  isAiGenerated?: boolean;
}

export interface MemoryRoom {
  id?: string;
  name?: string;
  items?: MemoryItem[];
  position?: number;
  imageUrl?: string;
  description?: string;
}

export interface MemoryItem {
  id?: string;
  content?: string;
  position?: number;
  association?: string;
  imageUrl?: string;
  recalled?: boolean;
  lastRecalled?: Date;
  visualization?: string;
  created?: Date;
  reviewCount?: number;
  mastered?: boolean;
}

export interface ProgressData {
  studyStreak: number;
  totalFocusTime: number;
  todayFocusTime: number;
  lastStudyDate: string;
  retentionRate: number;
  masteredCards: number;
  completedSessions: number;
  weeklyData: WeeklyData[];
}

export interface WeeklyData {
  week: string;
  focusTime: number;
  cardsReviewed: number;
  sessions: number;
  averageRating: number;
}

export interface Settings {
  theme: 'dark' | 'light';
  dailyGoal: number;
  defaultSession: string;
  todoistToken: string;
  notionToken: string;
  autoSync: boolean;
  notifications: {
    studyReminders: boolean;
    breakAlerts: boolean;
    reviewNotifications: boolean;
  };
  soundscapeSettings?: {
    volume: number;
    adaptiveMode: boolean;
    learningEnabled: boolean;
    screenPresets: Record<string, string>;
  };
  cognitiveSettings?: {
    adaptiveComplexity: boolean;
    autoSimpleMode: boolean;
    cognitiveLoadThreshold: number;
    breakSuggestionEnabled: boolean;
  };
}

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


