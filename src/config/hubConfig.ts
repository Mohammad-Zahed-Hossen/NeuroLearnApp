// src/config/hubConfig.ts
// Centralized hub card configurations for DRY principle

export interface HubCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  screen: string;
  color: string;
  cognitiveLoad?: number;
  params?: any;
  usageFrequency?: number; // For analytics
  streakCount?: number; // For gamification
  lastUsed?: Date;
  nextDue?: Date; // For spaced repetition
}

export interface NavigationParams {
  flashcards?: {
    deckId?: string;
    mode?: 'review' | 'create' | 'practice';
  };
  focus?: {
    duration?: number;
    autoStart?: boolean;
    technique?: 'pomodoro' | 'deep-work' | 'adaptive';
  };
  tasks?: {
    mode?: 'add' | 'list' | 'review';
    filter?: 'today' | 'overdue' | 'completed';
  };
  'neural-mind-map'?: {
    topic?: string;
    mode?: 'create' | 'explore' | 'review';
  };
  'speed-reading'?: {
    textId?: string;
    wpm?: number;
  };
  'logic-trainer'?: {
    difficulty?: 'easy' | 'medium' | 'hard';
    category?: string;
  };
  'memory-palace'?: {
    palaceId?: string;
    mode?: 'create' | 'review';
  };
  'synapse-builder'?: {
    mode?: 'create' | 'analyze' | 'explore';
    topic?: string;
  };
  dashboard?: {
    tab?: 'overview' | 'analytics' | 'insights';
  };
  settings?: {
    section?: 'general' | 'cognitive' | 'audio' | 'privacy';
  };
}

export const learnCards: HubCard[] = [
  {
    id: 'flashcards',
    title: 'Flashcards',
    description: 'FSRS spaced repetition system',
    icon: '🎴',
    screen: 'flashcards',
    color: '#8B5CF6',
    cognitiveLoad: 0.7,
    usageFrequency: 4,
    streakCount: 0,
  },
  {
    id: 'speed-reading',
    title: 'Speed Reading',
    description: 'RSVP and comprehension training',
    icon: '⚡',
    screen: 'speed-reading',
    color: '#06B6D4',
    cognitiveLoad: 0.8,
    usageFrequency: 2,
    streakCount: 0,
  },
  {
    id: 'logic-trainer',
    title: 'Logic Trainer',
    description: 'Reasoning and problem solving',
    icon: '🧩',
    screen: 'logic-trainer',
    color: '#F59E0B',
    cognitiveLoad: 0.9,
    usageFrequency: 3,
    streakCount: 0,
  },
  {
    id: 'memory-palace',
    title: 'Memory Palace',
    description: 'Method of loci visualization',
    icon: '🏰',
    screen: 'memory-palace',
    color: '#10B981',
    cognitiveLoad: 0.6,
    usageFrequency: 2,
    streakCount: 0,
  },
  {
    id: 'synapse-builder',
    title: 'Synapse Builder',
    description: 'AI-powered knowledge synthesis and analysis',
    icon: '🧬',
    screen: 'synapse-builder',
    color: '#EC4899',
    cognitiveLoad: 0.8,
    usageFrequency: 1,
    streakCount: 0,
  },
];

export const focusCards: HubCard[] = [
  {
    id: 'focus-timer',
    title: 'Focus Timer',
    description: 'Pomodoro technique sessions',
    icon: '⏱️',
    screen: 'focus',
    color: '#EF4444',
    cognitiveLoad: 0.3,
    usageFrequency: 4,
    streakCount: 0,
  },
  {
    id: 'tasks',
    title: 'Task Manager',
    description: 'GTD productivity system',
    icon: '✅',
    screen: 'tasks',
    color: '#10B981',
    cognitiveLoad: 0.4,
    usageFrequency: 3,
    streakCount: 0,
  },
  {
    id: 'neural-map',
    title: 'Neural Mind Map',
    description: 'Knowledge visualization',
    icon: '🧠',
    screen: 'neural-mind-map',
    color: '#8B5CF6',
    cognitiveLoad: 0.5,
    usageFrequency: 3,
    streakCount: 0,
  },
];

export const integrationCards: HubCard[] = [
  {
    id: 'tasks',
    title: 'Task Manager',
    description: 'GTD productivity system with external integrations',
    icon: '✅',
    screen: 'tasks',
    color: '#10B981',
    cognitiveLoad: 0.4,
    usageFrequency: 3,
    streakCount: 0,
  },
  {
    id: 'notion-dashboard',
    title: 'Notion Integration',
    description: 'Knowledge bridge and sync dashboard',
    icon: '📝',
    screen: 'notion-dashboard',
    color: '#F59E0B',
    cognitiveLoad: 0.4,
    usageFrequency: 2,
    streakCount: 0,
  },
];

export const profileCards: HubCard[] = [
  {
    id: 'user-profile',
    title: 'User Profile',
    description: 'Manage your profile and personal information',
    icon: '👤',
    screen: 'user-profile',
    color: '#8B5CF6',
    cognitiveLoad: 0.3,
    usageFrequency: 1,
    streakCount: 0,
  },
  {
    id: 'holistic-analytics',
    title: 'Holistic Analytics',
    description: 'Advanced cognitive performance dashboard',
    icon: '🧠',
    screen: 'holistic-analytics',
    color: '#06B6D4',
    cognitiveLoad: 0.6,
    usageFrequency: 2,
    streakCount: 0,
  },
  {
    id: 'monitoring',
    title: 'System Monitor',
    description: 'Real-time engine diagnostics and health monitoring',
    icon: '📊',
    screen: 'monitoring',
    color: '#10B981',
    cognitiveLoad: 0.4,
    usageFrequency: 1,
    streakCount: 0,
  },
  {
    id: 'smart-sleep-tracker',
    title: 'Smart Sleep',
    description: 'AI-powered sleep optimization',
    icon: '😴',
    screen: 'smart-sleep-tracker',
    color: '#6366F1',
    cognitiveLoad: 0.4,
    usageFrequency: 2,
    streakCount: 0,
  },
  {
    id: 'advanced-workout-logger',
    title: 'Workout Logger',
    description: 'Biometric workout tracking',
    icon: '💪',
    screen: 'advanced-workout-logger',
    color: '#EF4444',
    cognitiveLoad: 0.5,
    usageFrequency: 2,
    streakCount: 0,
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'App preferences and configuration',
    icon: '⚙️',
    screen: 'settings',
    color: '#6B7280',
    usageFrequency: 1,
    streakCount: 0,
  },
];

// Helper functions for neuroscience integration
export const sortCardsBySpacingEffect = (cards: HubCard[], cognitiveLoad: number): HubCard[] => {
  // Sort cards so lighter cognitive load comes first (spacing effect)
  return [...cards].sort((a, b) => {
    const aLoad = a.cognitiveLoad || 0.5;
    const bLoad = b.cognitiveLoad || 0.5;

    // If cognitive load is high, prioritize lighter tasks first
    if (cognitiveLoad > 0.7) {
      return aLoad - bLoad;
    }

    // Otherwise, sort by usage frequency and due dates
    const aDue = a.nextDue?.getTime() || Infinity;
    const bDue = b.nextDue?.getTime() || Infinity;

    if (aDue !== bDue) return aDue - bDue;

    return (b.usageFrequency || 0) - (a.usageFrequency || 0);
  });
};

export const getNextDueSession = (cards: HubCard[]): { card: HubCard; dueIn: string } | null => {
  const dueCards = cards.filter(card => card.nextDue);
  if (dueCards.length === 0) return null;

  const nextDue = dueCards.reduce((earliest, current) =>
    current.nextDue! < earliest.nextDue! ? current : earliest
  );

  const now = new Date();
  const diffMs = nextDue.nextDue!.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  let dueIn = '';
  if (diffDays > 0) {
    dueIn = `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    dueIn = `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  } else {
    dueIn = 'now';
  }

  return { card: nextDue, dueIn };
};

export const updateCardUsage = (cards: HubCard[], cardId: string): HubCard[] => {
  return cards.map(card => {
    if (card.id === cardId) {
      return {
        ...card,
        usageFrequency: (card.usageFrequency || 0) + 1,
        lastUsed: new Date(),
        streakCount: (card.streakCount || 0) + 1,
      };
    }
    return card;
  });
};
