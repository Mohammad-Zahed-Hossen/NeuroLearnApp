// src/navigation/NavigationTypes.ts
export type TabName = 'dashboard' | 'learn' | 'integrations' | 'finance' | 'wellness' | 'profile';

export type FeatureScreen =
  | 'dashboard'
  | 'flashcards'
  | 'speed-reading'
  | 'logic-trainer'
  | 'memory-palace'
  | 'focus'
  | 'tasks'
  | 'neural-mind-map'
  | 'progress'
  | 'settings'
  | 'cognitive-privacy'
  | 'WorkoutLogger'
  | 'SleepTracker'
  | 'WellnessDashboard'
  | 'integrations'
  | 'finance'
  | 'wellness'
  | 'profile';

export interface NavigationParams {
  [key: string]: any;
}

export interface TabItem {
  id: TabName;
  icon: string;
  label: string;
  screen: string;
  color: string;
  badge?: number;
}

// Performance-related type definitions
export type CognitiveLoad = number; // 0.0 to 1.0
export type UIMode = 'simple' | 'normal' | 'advanced';

export interface NavigationPerformance {
  cognitiveLoad: CognitiveLoad;
  uiMode: UIMode;
}
