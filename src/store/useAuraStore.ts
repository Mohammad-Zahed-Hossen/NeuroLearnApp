/**
 * Cognitive Aura Store - Global State Management for CAE
 *
 * This Zustand store manages the global state of the Cognitive Aura Engine,
 * providing centralized access to aura states, performance metrics, and
 * real-time updates across the entire application.
 *
 * Key Features:
 * - Global aura state management
 * - Real-time performance tracking
 * - Automatic refresh mechanisms
 * - Cross-component synchronization
 * - Persistent state with local storage
 * - Performance analytics and insights
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupabaseService } from '../services/storage/SupabaseService';
import {
  CognitiveAuraService,
  AuraState,
  AuraContext,
  cognitiveAuraService
} from '../services/ai/CognitiveAuraService';
import {
  cognitiveSoundscapeEngine
} from '../services/learning/CognitiveSoundscapeEngine';
import { MindMapGenerator, NeuralGraph } from '../services/learning/MindMapGeneratorService';
import StorageService from '../services/storage/StorageService';

// ==================== INTERFACES ====================

/**
 * Performance analytics for the aura engine
 */
export interface AuraAnalytics {
  totalSessions: number;
  averageAccuracy: number;
  averageCompletionRate: number;
  averageUserSatisfaction: number;
  contextDistribution: Record<AuraContext, number>;
  mostEffectiveContext: AuraContext | null;
  adaptationTrends: Array<{
    timestamp: Date;
    context: AuraContext;
    accuracy: number;
  }>;
  performanceImprovement: number; // Percentage improvement over time
  confidenceTrend: number[]; // Last 10 confidence scores
}

/**
 * Real-time metrics for the current session
 */
export interface SessionMetrics {
  startTime: Date | null;
  duration: number; // Minutes
  contextSwitches: number;
  tasksCompleted: number;
  tasksSkipped: number;
  averageTaskTime: number; // Seconds
  currentStreak: number; // Consecutive completions
  focusEfficiency: number; // 0-1 score
}

/**
 * Auto-refresh configuration
 */
export interface AutoRefreshConfig {
  enabled: boolean;
  interval: number; // Seconds
  onScreenChange: boolean;
  onDataChange: boolean;
  onPerformanceUpdate: boolean;
}

/**
 * Store state interface
 */
interface AuraStoreState {
  // Core aura state
  currentAuraState: AuraState | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  // Historical data
  previousStates: AuraState[];
  stateHistory: Map<string, AuraState>; // sessionId -> state

  // Performance tracking
  analytics: AuraAnalytics;
  sessionMetrics: SessionMetrics;
  performanceHistory: Array<{
    accuracy: number;
    completion: number;
    satisfaction: number;
    timestamp: Date;
  }>;

  // Configuration
  autoRefreshConfig: AutoRefreshConfig;

  // Meta information
  lastRefreshTime: Date | null;
  refreshCount: number;
  version: string;
}

/**
 * Store actions interface
 */
interface AuraStoreActions {
  // Core actions
  refreshAura: (graph?: NeuralGraph, cards?: any[]) => Promise<void>;
  updateAuraState: (state: AuraState) => void;
  clearError: () => void;
  resetStore: () => void;

  // Performance tracking
  recordPerformance: (accuracy: number, completion: number, satisfaction?: number) => Promise<void>;
  updateSessionMetrics: (update: Partial<SessionMetrics>) => void;
  startSession: () => void;
  endSession: () => void;

  // Configuration
  updateAutoRefreshConfig: (config: Partial<AutoRefreshConfig>) => void;
  setAutoRefresh: (enabled: boolean) => void;

  // Analytics
  calculateAnalytics: () => void;
  getContextInsights: () => Array<{
    context: AuraContext;
    frequency: number;
    avgAccuracy: number;
    recommendation: string;
  }>;

  // Utility
  exportData: () => Promise<string>;
  importData: (data: string) => Promise<void>;
  getHealthScore: () => number;
}

// ==================== INITIAL STATE ====================

const initialState: AuraStoreState = {
  // Core aura state
  currentAuraState: null,
  isLoading: false,
  isRefreshing: false,
  error: null,

  // Historical data
  previousStates: [],
  stateHistory: new Map(),

  // Performance tracking
  analytics: {
    totalSessions: 0,
    averageAccuracy: 0,
    averageCompletionRate: 0,
    averageUserSatisfaction: 3.0,
    contextDistribution: { DeepFocus: 0, FragmentedAttention: 0, CognitiveOverload: 0, CreativeFlow: 0 },
    mostEffectiveContext: null,
    adaptationTrends: [],
    performanceImprovement: 0,
    confidenceTrend: [],
  },
  sessionMetrics: {
    startTime: null,
    duration: 0,
    contextSwitches: 0,
    tasksCompleted: 0,
    tasksSkipped: 0,
    averageTaskTime: 0,
    currentStreak: 0,
    focusEfficiency: 0.5,
  },
  performanceHistory: [],

  // Configuration
  autoRefreshConfig: {
    enabled: true,
    interval: 60, // 60 seconds
    onScreenChange: true,
    onDataChange: true,
    onPerformanceUpdate: true,
  },

  // Meta information
  lastRefreshTime: null,
  refreshCount: 0,
  version: '1.0.0',
};

// ==================== ZUSTAND STORE ====================

export const useAuraStore = create<AuraStoreState & AuraStoreActions>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,

        // ==================== CORE ACTIONS ====================

        /**
         * Main refresh method - Updates aura state from CAE
         */
        refreshAura: async (graph?: NeuralGraph, cards?: any[]) => {
          const state = get();

          try {
            set({ isRefreshing: true, error: null });

            console.log('🔄 Refreshing aura state from store...');

            // Get fresh aura state from service
            const newAuraState = await cognitiveAuraService.getAuraState(true);

            // Update state
            set(state => ({
              currentAuraState: newAuraState,
              previousStates: [
                ...(state.currentAuraState ? [state.currentAuraState] : []),
                ...state.previousStates.slice(0, 9) // Keep last 10 states
              ],
              lastRefreshTime: new Date(),
              refreshCount: state.refreshCount + 1,
              isRefreshing: false,
            }));

            // Update state history
            const stateHistory = new Map(state.stateHistory);
            stateHistory.set(newAuraState.sessionId, newAuraState);

            // Keep only recent history (last 50 states)
            if (stateHistory.size > 50) {
              const entries = Array.from(stateHistory.entries());
              const recent = entries.slice(-50);
              set({ stateHistory: new Map(recent) });
            } else {
              set({ stateHistory });
            }

            // Apply aura state to soundscape engine
            await cognitiveSoundscapeEngine.applyAuraState(newAuraState);

            // Update analytics
            get().calculateAnalytics();

            console.log('✅ Aura state refreshed successfully');

          } catch (error) {
            console.error('❌ Failed to refresh aura state:', error);
            set({
              error: (error as Error)?.message || 'Failed to refresh aura state',
              isRefreshing: false,
            });
          }
        },

        /**
         * Update current aura state (for external updates)
         */
        updateAuraState: (newState: AuraState) => {
          const state = get();

          set({
            currentAuraState: newState,
            previousStates: [
              ...(state.currentAuraState ? [state.currentAuraState] : []),
              ...state.previousStates.slice(0, 9)
            ],
            lastRefreshTime: new Date(),
          });

          // Update state history
          const stateHistory = new Map(state.stateHistory);
          stateHistory.set(newState.sessionId, newState);
          set({ stateHistory });

          // Recalculate analytics
          get().calculateAnalytics();

          console.log('🔄 Aura state updated externally');
        },

        /**
         * Clear current error
         */
        clearError: () => {
          set({ error: null });
        },

        /**
         * Reset entire store to initial state
         */
        resetStore: () => {
          set(initialState);
          console.log('🧹 Aura store reset to initial state');
        },

        // ==================== PERFORMANCE TRACKING ====================

        /**
         * Record performance metrics
         */
        recordPerformance: async (accuracy: number, completion: number, satisfaction: number = 3.0) => {
          try {
            const state = get();
            const timestamp = new Date();

            const newPerformanceEntry = {
              accuracy,
              completion,
              satisfaction,
              timestamp,
            };

            set(state => ({
              performanceHistory: [
                ...state.performanceHistory,
                newPerformanceEntry
              ].slice(-100), // Keep last 100 entries
            }));

            // Update session metrics
            const sessionUpdate: Partial<SessionMetrics> = {
              tasksCompleted: completion > 0.5 ? state.sessionMetrics.tasksCompleted + 1 : state.sessionMetrics.tasksCompleted,
              tasksSkipped: completion <= 0.5 ? state.sessionMetrics.tasksSkipped + 1 : state.sessionMetrics.tasksSkipped,
              currentStreak: completion > 0.5 ? state.sessionMetrics.currentStreak + 1 : 0,
              focusEfficiency: (state.sessionMetrics.focusEfficiency + accuracy) / 2,
            };

            get().updateSessionMetrics(sessionUpdate);

            // Record in CAE service
            await cognitiveAuraService.recordPerformance({
              accuracy,
              taskCompletion: completion,
              timeToComplete: 0, // Would be calculated from actual timing
              userSatisfaction: satisfaction,
              contextRelevance: 0.8, // Default assumption
            });

            // Recalculate analytics
            get().calculateAnalytics();

            console.log('📊 Performance recorded:', { accuracy, completion, satisfaction });
          } catch (error) {
            console.error('❌ Failed to record performance:', error);
            // Optionally set error state
            set({ error: (error as Error)?.message || 'Failed to record performance' });
          }
        },

        /**
         * Update session metrics
         */
        updateSessionMetrics: (update: Partial<SessionMetrics>) => {
          set(state => ({
            sessionMetrics: {
              ...state.sessionMetrics,
              ...update,
            },
          }));
        },

        /**
         * Start a new session
         */
        startSession: () => {
          set(state => ({
            sessionMetrics: {
              ...initialState.sessionMetrics,
              startTime: new Date(),
            },
            analytics: {
              ...state.analytics,
              totalSessions: state.analytics.totalSessions + 1,
            },
          }));

          console.log('🚀 New aura session started');
        },

        /**
         * End current session
         */
        endSession: () => {
          const state = get();
          const { sessionMetrics } = state;

          if (sessionMetrics.startTime) {
            const duration = (Date.now() - sessionMetrics.startTime.getTime()) / (60 * 1000); // minutes

            set(state => ({
              sessionMetrics: {
                ...state.sessionMetrics,
                duration,
                startTime: null,
              },
            }));

            console.log(`⏹️ Aura session ended after ${duration.toFixed(1)} minutes`);
          }
        },

        // ==================== CONFIGURATION ====================

        /**
         * Update auto-refresh configuration
         */
        updateAutoRefreshConfig: (configUpdate: Partial<AutoRefreshConfig>) => {
          set(state => ({
            autoRefreshConfig: {
              ...state.autoRefreshConfig,
              ...configUpdate,
            },
          }));

          console.log('⚙️ Auto-refresh config updated:', configUpdate);
        },

        /**
         * Enable/disable auto-refresh
         */
        setAutoRefresh: (enabled: boolean) => {
          set(state => ({
            autoRefreshConfig: {
              ...state.autoRefreshConfig,
              enabled,
            },
          }));

          console.log(`🔄 Auto-refresh ${enabled ? 'enabled' : 'disabled'}`);
        },

        // ==================== ANALYTICS ====================

        /**
         * Calculate comprehensive analytics
         */
        calculateAnalytics: () => {
          const state = get();
          const { performanceHistory, stateHistory, currentAuraState } = state;

          if (performanceHistory.length === 0) return;

          // Calculate averages
          const totalEntries = performanceHistory.length;
          const averageAccuracy = performanceHistory.reduce((sum, p) => sum + p.accuracy, 0) / totalEntries;
          const averageCompletionRate = performanceHistory.reduce((sum, p) => sum + p.completion, 0) / totalEntries;
          const averageUserSatisfaction = performanceHistory.reduce((sum, p) => sum + p.satisfaction, 0) / totalEntries;

          // Calculate context distribution
          const contextDistribution: Record<AuraContext, number> = { DeepFocus: 0, FragmentedAttention: 0, CognitiveOverload: 0, CreativeFlow: 0 };
          const contextPerformance = new Map<AuraContext, { total: number; count: number }>();

          Array.from(stateHistory.values()).forEach(auraState => {
            contextDistribution[auraState.context]++;

            // Find corresponding performance entry
            const perfEntry = performanceHistory.find(p =>
              Math.abs(p.timestamp.getTime() - auraState.timestamp.getTime()) < 60000 // Within 1 minute
            );

            if (perfEntry) {
              const current = contextPerformance.get(auraState.context) || { total: 0, count: 0 };
              current.total += perfEntry.completion;
              current.count++;
              contextPerformance.set(auraState.context, current);
            }
          });

          // Find most effective context
          let mostEffectiveContext: AuraContext | null = null;
          let bestPerformance = 0;
          contextPerformance.forEach((data, context) => {
            const avgPerformance = data.count > 0 ? data.total / data.count : 0;
            if (avgPerformance > bestPerformance) {
              bestPerformance = avgPerformance;
              mostEffectiveContext = context;
            }
          });

          // Calculate adaptation trends (last 10 entries)
          const recentHistory = performanceHistory.slice(-10);
          const adaptationTrends = recentHistory.map((entry, index) => ({
            timestamp: entry.timestamp,
            context: Array.from(stateHistory.values()).find(s =>
              Math.abs(s.timestamp.getTime() - entry.timestamp.getTime()) < 60000
            )?.context || 'DeepFocus',
            accuracy: entry.accuracy,
          }));

          // Calculate performance improvement (comparing first half vs second half)
          let performanceImprovement = 0;
          if (performanceHistory.length >= 10) {
            const firstHalf = performanceHistory.slice(0, Math.floor(performanceHistory.length / 2));
            const secondHalf = performanceHistory.slice(Math.floor(performanceHistory.length / 2));

            const firstHalfAvg = firstHalf.reduce((sum, p) => sum + p.completion, 0) / firstHalf.length;
            const secondHalfAvg = secondHalf.reduce((sum, p) => sum + p.completion, 0) / secondHalf.length;

            performanceImprovement = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
          }

          // Extract confidence trend
          const confidenceTrend = Array.from(stateHistory.values())
            .slice(-10)
            .map(state => state.confidence);

          // Update analytics
          set(state => ({
            analytics: {
              totalSessions: state.analytics.totalSessions,
              averageAccuracy,
              averageCompletionRate,
              averageUserSatisfaction,
              contextDistribution,
              mostEffectiveContext,
              adaptationTrends,
              performanceImprovement,
              confidenceTrend,
            },
          }));

          console.log('📈 Analytics calculated:', {
            avgAccuracy: (averageAccuracy * 100).toFixed(1) + '%',
            avgCompletion: (averageCompletionRate * 100).toFixed(1) + '%',
            mostEffective: mostEffectiveContext,
            improvement: performanceImprovement.toFixed(1) + '%',
          });
        },

        /**
         * Get context-specific insights
         */
        getContextInsights: () => {
          const state = get();
          const { analytics, performanceHistory, stateHistory } = state;

          const insights: Array<{
            context: AuraContext;
            frequency: number;
            avgAccuracy: number;
            recommendation: string;
          }> = [];

          (['DeepFocus', 'FragmentedAttention', 'CognitiveOverload', 'CreativeFlow'] as AuraContext[]).forEach(context => {
            const contextStates = Array.from(stateHistory.values()).filter(s => s.context === context);
            const frequency = contextStates.length / Math.max(1, stateHistory.size);

            const contextPerformance = performanceHistory.filter(p => {
              return contextStates.some(s =>
                Math.abs(p.timestamp.getTime() - s.timestamp.getTime()) < 60000
              );
            });

            const avgAccuracy = contextPerformance.length > 0 ?
              contextPerformance.reduce((sum, p) => sum + p.accuracy, 0) / contextPerformance.length :
              0.5;

            let recommendation = '';
            if (frequency > 0.5) {
              recommendation = `${context} mode is very common - consider adjusting your learning schedule`;
            } else if (avgAccuracy < 0.4) {
              recommendation = `Performance in ${context} mode needs improvement - try different strategies`;
            } else if (avgAccuracy > 0.8) {
              recommendation = `Excellent performance in ${context} mode - keep up the great work!`;
            } else {
              recommendation = `${context} mode performance is average - room for optimization`;
            }

            insights.push({
              context,
              frequency,
              avgAccuracy,
              recommendation,
            });
          });

          return insights;
        },

        // ==================== UTILITY ====================

        /**
         * Export store data as JSON string
         */
        exportData: async (): Promise<string> => {
          const state = get();

          const exportData = {
            version: state.version,
            timestamp: new Date().toISOString(),
            currentAuraState: state.currentAuraState,
            performanceHistory: state.performanceHistory.slice(-50), // Last 50 entries
            analytics: state.analytics,
            sessionMetrics: state.sessionMetrics,
            autoRefreshConfig: state.autoRefreshConfig,
            stateHistory: Array.from(state.stateHistory.entries()).slice(-20), // Last 20 states
          };

          console.log('📤 Exporting aura store data');
          return JSON.stringify(exportData, null, 2);
        },

        /**
         * Import store data from JSON string
         */
        importData: async (jsonData: string): Promise<void> => {
          try {
            const importedData = JSON.parse(jsonData);

            // Validate data structure
            if (!importedData.version || !importedData.timestamp) {
              throw new Error('Invalid data format');
            }

            // Reconstruct state history map
            const stateHistory = new Map();
            if (importedData.stateHistory && Array.isArray(importedData.stateHistory)) {
              importedData.stateHistory.forEach(([key, value]: [string, any]) => {
                stateHistory.set(key, {
                  ...value,
                  timestamp: new Date(value.timestamp),
                });
              });
            }

            // Reconstruct performance history with proper dates
            const performanceHistory = importedData.performanceHistory?.map((entry: any) => ({
              ...entry,
              timestamp: new Date(entry.timestamp),
            })) || [];

            // Update store
            set({
              currentAuraState: importedData.currentAuraState ? {
                ...importedData.currentAuraState,
                timestamp: new Date(importedData.currentAuraState.timestamp),
              } : null,
              performanceHistory,
              analytics: importedData.analytics || initialState.analytics,
              sessionMetrics: importedData.sessionMetrics || initialState.sessionMetrics,
              autoRefreshConfig: {
                ...initialState.autoRefreshConfig,
                ...importedData.autoRefreshConfig,
              },
              stateHistory,
            });

            // Recalculate analytics
            get().calculateAnalytics();

            console.log('📥 Aura store data imported successfully');

          } catch (error) {
            console.error('❌ Failed to import data:', error);
            throw new Error('Failed to import data: Invalid format');
          }
        },

        /**
         * Calculate overall health score based on current metrics
         */
        getHealthScore: (): number => {
          const state = get();
          const { analytics, sessionMetrics, currentAuraState } = state;

          let healthScore = 0.5; // Base score

          // Factor 1: Average accuracy (30% weight)
          healthScore += (analytics.averageAccuracy - 0.5) * 0.3;

          // Factor 2: Completion rate (25% weight)
          healthScore += (analytics.averageCompletionRate - 0.5) * 0.25;

          // Factor 3: User satisfaction (20% weight)
          healthScore += ((analytics.averageUserSatisfaction - 3) / 2) * 0.2;

          // Factor 4: Performance improvement (15% weight)
          healthScore += (analytics.performanceImprovement / 100) * 0.15;

          // Factor 5: Current aura confidence (10% weight)
          if (currentAuraState) {
            healthScore += (currentAuraState.confidence - 0.5) * 0.1;
          }

          // Clamp to 0-1 range
          return Math.max(0, Math.min(1, healthScore));
        },
      }),

      // Persistence configuration
      {
        name: 'cognitive-aura-store',
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          // Only persist essential data with optimized limits for large objects
          currentAuraState: state.currentAuraState,
          previousStates: state.previousStates.slice(0, 5), // Limit to last 5 for persistence
          performanceHistory: state.performanceHistory.slice(-50), // Limit to last 50 for persistence (reduced from 100)
          analytics: {
            ...state.analytics,
            adaptationTrends: state.analytics.adaptationTrends.slice(-10), // Limit trends
            confidenceTrend: state.analytics.confidenceTrend.slice(-10), // Limit confidence trend
          },
          autoRefreshConfig: state.autoRefreshConfig,
          version: state.version,
          // Note: stateHistory is not persisted to reduce storage size; can be reconstructed from performanceHistory
        }),
        version: 1,
        migrate: (persistedState: any, version: number) => {
          // Handle migration between versions if needed
          if (version === 0) {
            // Migrate from version 0 to 1
            return {
              ...persistedState,
              version: '1.0.0',
            };
          }
          return persistedState;
        },
      }
    )
  )
);

// ==================== STORE SUBSCRIPTIONS & AUTO-REFRESH ====================

let refreshTimer: NodeJS.Timeout | null = null;

// Set up auto-refresh mechanism
useAuraStore.subscribe(
  (state) => state.autoRefreshConfig,
  (config) => {
    // Clear existing timer
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }

    // Set up new timer if enabled
    if (config.enabled && config.interval > 0) {
      refreshTimer = setInterval(() => {
        const state = useAuraStore.getState();
        if (!state.isRefreshing) {
          state.refreshAura();
        }
      }, config.interval * 1000);

      console.log(`🔄 Auto-refresh timer set for ${config.interval} seconds`);
    }
  },
  { fireImmediately: true }
);

// Set up performance tracking subscription
useAuraStore.subscribe(
  (state) => state.performanceHistory.length,
  (historyLength, prevHistoryLength) => {
    if (historyLength > prevHistoryLength) {
      const state = useAuraStore.getState();
      if (state.autoRefreshConfig.onPerformanceUpdate) {
        // Trigger analytics recalculation
        setTimeout(() => {
          state.calculateAnalytics();
        }, 1000);
      }
    }
  }
);

// ==================== STORE UTILITIES ====================

/**
 * Hook for reactive aura state access
 */
export const useCurrentAuraState = () => useAuraStore((state) => state.currentAuraState);

/**
 * Hook for performance analytics
 */
export const useAuraAnalytics = () => useAuraStore((state) => state.analytics);

/**
 * Hook for session metrics
 */
export const useSessionMetrics = () => useAuraStore((state) => state.sessionMetrics);

/**
 * Hook for store loading state
 */
export const useAuraLoadingState = () => useAuraStore((state) => ({
  isLoading: state.isLoading,
  isRefreshing: state.isRefreshing,
  error: state.error,
}));

/**
 * Initialize store on app start
 */
export const initializeAuraStore = async (): Promise<void> => {
  try {
    console.log('🚀 Initializing Cognitive Aura Store...');

    // Check if user is authenticated before initializing aura
    const supabaseService = SupabaseService.getInstance();
    const currentUser = await supabaseService.getCurrentUser();

    if (!currentUser) {
      console.warn('⚠️ User not authenticated, skipping aura initialization');
      return;
    }

    const state = useAuraStore.getState();

    // Start initial session
    state.startSession();

    // Load initial aura state
    await state.refreshAura();

    console.log('✅ Cognitive Aura Store initialized successfully');

  } catch (error) {
    console.error('❌ Failed to initialize Cognitive Aura Store:', error);
    // Don't throw error to prevent blocking app startup
    console.warn('⚠️ Continuing app startup without aura features');
  }
};

/**
 * Cleanup store resources
 */
export const disposeAuraStore = (): void => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }

  const state = useAuraStore.getState();
  state.endSession();

  console.log('🧹 Cognitive Aura Store disposed');
};

export default useAuraStore;
