import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useCognitive } from '../contexts/CognitiveProvider';
import StorageService from '../services/storage/StorageService';
import {
  MenuItem,
  UserPermissions,
  UserBehavior,
  MenuGenerationConfig
} from '../types/navigation';

// Base menu items configuration - static definitions
const BASE_MENU_ITEMS = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: '🧠',
    screen: 'dashboard',
    description: 'Cognitive Load & Learning Analytics',
    requiredPermission: null as string | null,
    defaultUsageFrequency: 5,
    cognitiveLoadMultiplier: 0.1,
  },
  {
    id: 'focus',
    title: 'Focus Timer',
    icon: '⏱️',
    screen: 'focus',
    description: 'Scientific Pomodoro & Deep Work Sessions',
    requiredPermission: null,
    defaultUsageFrequency: 4,
    cognitiveLoadMultiplier: 0.3,
  },
  {
    id: 'flashcards',
    title: 'Flashcards',
    icon: '🎴',
    screen: 'flashcards',
    description: 'FSRS Spaced Repetition System',
    requiredPermission: null,
    defaultUsageFrequency: 4,
    cognitiveLoadMultiplier: 0.6,
  },
  {
    id: 'tasks',
    title: 'Task Manager',
    icon: '✓',
    screen: 'tasks',
    description: 'GTD-Based Productivity System',
    requiredPermission: null,
    defaultUsageFrequency: 3,
    cognitiveLoadMultiplier: 0.3,
  },
  {
    id: 'notion-dashboard',
    title: 'Notion Integration',
    icon: '📝',
    screen: 'notion-dashboard',
    description: 'Knowledge Bridge & Sync Dashboard',
    requiredPermission: 'hasIntegrations',
    defaultUsageFrequency: 3,
    cognitiveLoadMultiplier: 0.4,
  },
  {
    id: 'speed-reading',
    title: 'Speed Reading',
    icon: '⚡',
    screen: 'speed-reading',
    description: 'RSVP & Comprehension Training',
    requiredPermission: 'hasAdvancedTools',
    defaultUsageFrequency: 2,
    cognitiveLoadMultiplier: 0.7,
  },
  {
    id: 'memory-palace',
    title: 'Memory Palace',
    icon: '🏰',
    screen: 'memory-palace',
    description: 'Method of Loci Implementation',
    requiredPermission: 'hasAdvancedTools',
    defaultUsageFrequency: 2,
    cognitiveLoadMultiplier: 0.8,
  },
  {
    id: 'progress',
    title: 'Analytics',
    icon: '📊',
    screen: 'holistic-analytics',
    description: 'Learning Performance Metrics',
    requiredPermission: 'hasAnalytics',
    defaultUsageFrequency: 3,
    cognitiveLoadMultiplier: 0.3,
  },
  {
    id: 'synapse-builder',
    title: 'Synapse Builder',
    icon: '🧬',
    screen: 'synapse-builder',
    description: 'Neural Plasticity & Connection Building',
    requiredPermission: 'hasAdvancedTools',
    defaultUsageFrequency: 2,
    cognitiveLoadMultiplier: 0.8,
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: '⚙️',
    screen: 'settings',
    description: 'Configuration & API Integration',
    requiredPermission: null,
    defaultUsageFrequency: 1,
    cognitiveLoadMultiplier: 0.1,
  },
  {
    id: 'neural-mind-map',
    title: 'Neural Mind Map',
    icon: '🧠',
    screen: 'neural-mind-map',
    description: 'AI-Powered Knowledge Visualization',
    requiredPermission: null,
    defaultUsageFrequency: 3,
    cognitiveLoadMultiplier: 0.6,
  },
  {
    id: 'logic-trainer',
    title: 'Logic Trainer',
    icon: '🧩',
    screen: 'logic-trainer',
    description: 'Logical Reasoning & Problem Solving',
    requiredPermission: null,
    defaultUsageFrequency: 3,
    cognitiveLoadMultiplier: 0.7,
  },
  {
    id: 'ai-assistant',
    title: 'AI Assistant',
    icon: '🤖',
    screen: 'ai-assistant',
    description: 'AI-Powered Learning Assistant',
    requiredPermission: null,
    defaultUsageFrequency: 4,
    cognitiveLoadMultiplier: 0.4,
  },
  {
    id: 'patients',
    title: 'Patients',
    icon: '👥',
    screen: 'patients',
    description: 'Patient Management & Data',
    requiredPermission: null,
    defaultUsageFrequency: 2,
    cognitiveLoadMultiplier: 0.3,
  },
  {
    id: 'finance',
    title: 'Finance',
    icon: '💰',
    screen: 'finance',
    description: 'Financial Tracking & Analytics',
    requiredPermission: 'hasFinanceAccess',
    defaultUsageFrequency: 3,
    cognitiveLoadMultiplier: 0.4,
  },
  {
    id: 'wellness',
    title: 'Wellness',
    icon: '❤️',
    screen: 'wellness',
    description: 'Health & Wellness Tracking',
    requiredPermission: 'hasWellnessAccess',
    defaultUsageFrequency: 3,
    cognitiveLoadMultiplier: 0.3,
  },
];

export const useDynamicMenuItems = () => {
  const { analytics, sessionMetrics } = useAppStore();
  const cognitive = useCognitive();

  const generateMenuItems = useMemo(() => async (): Promise<MenuItem[]> => {
    try {
      // Get user permissions from storage
      const storage = StorageService.getInstance();
      const userProfile = await storage.getUserProfile();
      const permissions: UserPermissions = {
        hasFinanceAccess: false,
        hasWellnessAccess: false,
        hasAdvancedTools: false,
        hasIntegrations: false,
        hasAnalytics: true,
      };

      // Get user behavior data from analytics
      const behavior: UserBehavior = {
        frequentlyUsed: analytics?.mostEffectiveContext ? [analytics.mostEffectiveContext] : [],
        lastUsed: {}, // Would need to be stored separately
        totalUsage: {}, // Would need to be calculated from usage logs
        preferences: {
          menuOrder: [],
          hiddenItems: [],
        },
      };

      const config: MenuGenerationConfig = {
        permissions,
        behavior,
        cognitiveLoad: cognitive?.cognitiveLoad || 0.5,
        uiMode: cognitive?.uiMode || 'normal',
      };

      return generateMenuItemsFromConfig(config);
    } catch (error) {
      console.warn('Failed to generate dynamic menu items, using defaults:', error);
      // Fallback to basic menu items
      return BASE_MENU_ITEMS
        .filter(item => !item.requiredPermission)
        .map(item => ({
          id: item.id,
          title: item.title,
          icon: item.icon,
          screen: item.screen,
          description: item.description,
          cognitiveLoad: item.cognitiveLoadMultiplier,
          usageFrequency: item.defaultUsageFrequency,
        }));
    }
  }, [analytics, sessionMetrics, cognitive]);

  return { generateMenuItems };
};

// Helper function to generate menu items from configuration
function generateMenuItemsFromConfig(config: MenuGenerationConfig): MenuItem[] {
  const { permissions, behavior, cognitiveLoad, uiMode } = config;

  // Filter items based on permissions
  let filteredItems = BASE_MENU_ITEMS.filter(item => {
    if (!item.requiredPermission) return true;
    return permissions[item.requiredPermission as keyof UserPermissions];
  });

  // Remove hidden items
  filteredItems = filteredItems.filter(item =>
    !behavior.preferences.hiddenItems.includes(item.id)
  );

  // In simple mode, reduce to essential items only
  if (uiMode === 'simple') {
    filteredItems = filteredItems.filter(item =>
      item.defaultUsageFrequency >= 4 || item.id === 'dashboard'
    );
  }

  // Calculate dynamic usage frequency based on actual behavior
  const itemsWithDynamicFrequency = filteredItems.map(item => {
    let usageFrequency = item.defaultUsageFrequency;

    // Boost frequency for frequently used items
    if (behavior.frequentlyUsed.includes(item.id)) {
      usageFrequency = Math.min(5, usageFrequency + 1);
    }

    // Adjust based on total usage data (if available)
    const totalUsage = behavior.totalUsage[item.id];
    if (totalUsage) {
      // Normalize usage count to 1-5 scale
      usageFrequency = Math.min(5, Math.max(1, Math.floor(totalUsage / 10) + 1));
    }

    return {
      ...item,
      usageFrequency,
    };
  });

  // Calculate dynamic cognitive load
  const itemsWithDynamicLoad = itemsWithDynamicFrequency.map(item => {
    let adjustedLoad = item.cognitiveLoadMultiplier;

    // Increase cognitive load in high cognitive load states
    if (cognitiveLoad > 0.7) {
      adjustedLoad = Math.min(1, adjustedLoad * 1.2);
    } else if (cognitiveLoad < 0.3) {
      // Decrease for low cognitive load states
      adjustedLoad = Math.max(0.1, adjustedLoad * 0.8);
    }

    return {
      id: item.id,
      title: item.title,
      icon: item.icon,
      screen: item.screen,
      description: item.description,
      cognitiveLoad: adjustedLoad,
      usageFrequency: item.usageFrequency,
    };
  });

  // Sort by personalized order or usage frequency
  const sortedItems = itemsWithDynamicLoad.sort((a, b) => {
    // Check custom order first
    const aIndex = behavior.preferences.menuOrder.indexOf(a.id);
    const bIndex = behavior.preferences.menuOrder.indexOf(b.id);

    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;

    // Default: sort by usage frequency (descending)
    return b.usageFrequency - a.usageFrequency;
  });

  return sortedItems;
}
