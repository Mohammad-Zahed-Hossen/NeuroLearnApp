// src/navigation/NavigationTypes.ts
export type TabName = 'home' | 'learn' | 'focus' | 'profile';

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
  | 'WorkoutLogger'
  | 'SleepTracker'
  | 'WellnessDashboard';

export interface NavigationParams {
  [key: string]: any;
}

export interface Tab {
  id: TabName;
  icon: string;
  label: string;
  badge?: number;
}
