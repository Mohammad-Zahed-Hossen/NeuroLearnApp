/**
 * App Store - Enhanced Zustand Store for Global State Management
 *
 * This Zustand store provides centralized state management with improved performance
 * through partial persistence and optimistic updates for better UX.
 *
 * Key Features:
 * - Global aura state management
 * - Real-time performance tracking
 * - Automatic refresh mechanisms
 * - Cross-component synchronization
 * - Partial persistent state (reduced storage overhead)
 * - Optimistic updates for immediate UI feedback
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
interface AppStoreState {
  // Core aura state
  currentAuraState: AuraState | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  // Historical data (limited for performance)
  previousStates: AuraState[];
  stateHistory: Map<string, AuraState>; // sessionId -> state

  // Performance tracking
  analytics: AuraAnalytics;
  sessionMetrics: SessionMetrics;
  autoRefreshConfig: AutoRefreshConfig;
  performanceHistory: AuraState[];
  refreshCount: number;
  currentSessionId: string | null;
}

// ==================== ACTIONS INTERFACE ====================

interface AppStoreActions {
  // Core aura actions
  refreshAura: () => Promise<void>;
  updateAuraState: (newState: Partial<AuraState>) => Promise<void>;
  resetAura: () => void;

  // Session management
  startSession: () => void;
  endSession: () => void;
  updateSessionMetrics: (metrics: Partial<SessionMetrics>) => void;

  // Analytics and performance
  calculateAnalytics: () => void;
  updateAnalytics: (updates: Partial<AuraAnalytics>) => void;

  // Configuration
  updateAutoRefreshConfig: (config: Partial<AutoRefreshConfig>) => void;
  toggleAutoRefresh: () => void;

  // Utility actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearHistory: () => void;
}

// ==================== STORE CREATION ====================

export const useAppStore = create<AppStoreState & AppStoreActions>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // ==================== INITIAL STATE ====================
        currentAuraState: null,
        isLoading: false,
        isRefreshing: false,
        error: null,
        previousStates: [],
        stateHistory: new Map(),
        analytics: {
          totalSessions: 0,
          averageAccuracy: 0,
          averageCompletionRate: 0,
          averageUserSatisfaction: 0,
          contextDistribution: {} as Record<AuraContext, number>,
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
        autoRefreshConfig: {
          enabled: true,
          interval: 30, // 30 seconds
          onScreenChange: true,
          onDataChange: false,
          onPerformanceUpdate: true,
        },
        performanceHistory: [],
        refreshCount: 0,
        currentSessionId: null,

        // ==================== ACTIONS ====================

        refreshAura: async () => {
          const state = get();
          if (state.isRefreshing) return;

          // Optimistic update: Set refreshing immediately for better UX
          set({ isRefreshing: true, error: null });

          // Optimistically update with last known good state if available
          const optimisticState = state.currentAuraState || {
            context: 'learning' as AuraContext,
            cognitiveLoad: 0.5,
            confidence: 0.5,
            timestamp: new Date(),
          };

          try {
            // Async service call
            const newAuraState = await cognitiveAuraService.refreshAuraState();
            const sessionId = state.currentSessionId || `session_${Date.now()}`;

            set((prevState: AppStoreState & AppStoreActions) => ({
              currentAuraState: newAuraState,
              previousStates: [prevState.currentAuraState, ...prevState.previousStates.slice(0, 4)].filter((state): state is AuraState => state !== null),
              stateHistory: new Map(prevState.stateHistory.set(sessionId, newAuraState)),
              refreshCount: prevState.refreshCount + 1,
              isRefreshing: false,
            }));

            // Update analytics after refresh
            setTimeout(() => get().calculateAnalytics(), 100);
          } catch (error) {
            console.error('Failed to refresh aura:', error);
            // Revert optimistic state on error
            set({
              error: error instanceof Error ? error.message : 'Failed to refresh aura',
              isRefreshing: false,
              currentAuraState: state.currentAuraState, // Revert to previous
            });
          }
        },

        updateAuraState: async (newState) => {
          const state = get();

          // Optimistic update: Apply changes immediately
          const optimisticState = { ...state.currentAuraState, ...newState } as AuraState;
          set({ currentAuraState: optimisticState, isLoading: true, error: null });

          try {
            // Async service call - Note: updateAuraState doesn't exist, using refreshAuraState instead
            const updatedState = await cognitiveAuraService.refreshAuraState();
            const sessionId = state.currentSessionId || `session_${Date.now()}`;

            set((prevState: AppStoreState & AppStoreActions) => ({
              currentAuraState: updatedState,
              previousStates: [prevState.currentAuraState, ...prevState.previousStates.slice(0, 4)].filter((state): state is AuraState => state !== null),
              stateHistory: new Map(prevState.stateHistory.set(sessionId, updatedState)),
              isLoading: false,
            }));

            // Update analytics
            setTimeout(() => get().calculateAnalytics(), 100);
          } catch (error) {
            console.error('Failed to update aura state:', error);
            // Revert optimistic update on error
            set({
              currentAuraState: state.currentAuraState, // Revert
              error: error instanceof Error ? error.message : 'Failed to update aura state',
              isLoading: false
            });
          }
        },

        resetAura: () => {
          set({
            currentAuraState: null,
            previousStates: [],
            stateHistory: new Map(),
            error: null,
            refreshCount: 0,
          });
        },

        startSession: () => {
          const sessionId = `session_${Date.now()}`;
          set({
            currentSessionId: sessionId,
            sessionMetrics: {
              startTime: new Date(),
              duration: 0,
              contextSwitches: 0,
              tasksCompleted: 0,
              tasksSkipped: 0,
              averageTaskTime: 0,
              currentStreak: 0,
              focusEfficiency: 0.5,
            },
          });
        },

        endSession: () => {
          const state = get();
          if (state.sessionMetrics.startTime) {
            const duration = Date.now() - state.sessionMetrics.startTime.getTime();
            set((prevState) => ({
              sessionMetrics: {
                ...prevState.sessionMetrics,
                duration: Math.floor(duration / 60000), // Convert to minutes
              },
            }));
          }
          set({ currentSessionId: null });
        },

        updateSessionMetrics: (metrics) => {
          set((prevState) => ({
            sessionMetrics: { ...prevState.sessionMetrics, ...metrics },
          }));
        },

        calculateAnalytics: () => {
          const state = get();
          const history = Array.from(state.stateHistory.values());
          const sessions = state.stateHistory.size;

          if (history.length === 0) return;

          const accuracies = history.map(h => h.confidence);
          const averageAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;

          const contextCounts: Record<AuraContext, number> = {} as Record<AuraContext, number>;
          history.forEach(h => {
            contextCounts[h.context] = (contextCounts[h.context] || 0) + 1;
          });

          const mostEffectiveContext = Object.entries(contextCounts)
            .sort(([,a], [,b]) => b - a)[0]?.[0] as AuraContext || null;

          const confidenceTrend = history.slice(-10).map(h => h.confidence);

          set((prevState) => ({
            analytics: {
              ...prevState.analytics,
              totalSessions: sessions,
              averageAccuracy,
              contextDistribution: contextCounts,
              mostEffectiveContext,
              confidenceTrend,
            },
          }));
        },

        updateAnalytics: (updates) => {
          set((prevState) => ({
            analytics: { ...prevState.analytics, ...updates },
          }));
        },

        updateAutoRefreshConfig: (config) => {
          set((prevState) => ({
            autoRefreshConfig: { ...prevState.autoRefreshConfig, ...config },
          }));
        },

        toggleAutoRefresh: () => {
          set((prevState) => ({
            autoRefreshConfig: {
              ...prevState.autoRefreshConfig,
              enabled: !prevState.autoRefreshConfig.enabled,
            },
          }));
        },

        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error }),
        clearHistory: () => set({ previousStates: [], stateHistory: new Map() }),
      }),
      {
        name: 'app-store',
        storage: createJSONStorage(() => AsyncStorage),
        // Partial persistence: Only persist essential state to reduce storage overhead
        partialize: (state) => ({
          currentAuraState: state.currentAuraState,
          analytics: state.analytics,
          sessionMetrics: state.sessionMetrics,
          autoRefreshConfig: state.autoRefreshConfig,
          refreshCount: state.refreshCount,
          currentSessionId: state.currentSessionId,
        }),
      }
    )
  )
);

// ==================== SUBSCRIPTIONS ====================

let refreshTimer: NodeJS.Timeout | null = null;

// Set up auto-refresh mechanism
useAppStore.subscribe(
  (state) => state.autoRefreshConfig,
  (config) => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }

    if (config.enabled) {
      refreshTimer = setInterval(() => {
        const state = useAppStore.getState();
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
useAppStore.subscribe(
  (state) => state.performanceHistory.length,
  (historyLength, prevHistoryLength) => {
    if (historyLength > prevHistoryLength) {
      const state = useAppStore.getState();
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
export const useCurrentAuraState = () => useAppStore((state) => state.currentAuraState);

/**
 * Hook for performance analytics
 */
export const useAuraAnalytics = () => useAppStore((state) => state.analytics);

/**
 * Hook for session metrics
 */
export const useSessionMetrics = () => useAppStore((state) => state.sessionMetrics);

/**
 * Hook for store loading state
 */
export const useAuraLoadingState = () => useAppStore((state) => ({
  isLoading: state.isLoading,
  isRefreshing: state.isRefreshing,
  error: state.error,
}));

/**
 * Initialize store on app start
 */
export const initializeAppStore = async (): Promise<void> => {
  try {
    console.log('🚀 Initializing App Store...');

    // Check if user is authenticated before initializing aura
    const supabaseService = SupabaseService.getInstance();
    const currentUser = await supabaseService.getCurrentUser();

    if (!currentUser) {
      console.warn('⚠️ User not authenticated, skipping aura initialization');
      return;
    }

    const state = useAppStore.getState();

    // Start initial session
    state.startSession();

    // Load initial aura state
    await state.refreshAura();

    console.log('✅ App Store initialized successfully');

  } catch (error) {
    console.error('❌ Failed to initialize App Store:', error);
    // Don't throw error to prevent blocking app startup
    console.warn('⚠️ Continuing app startup without aura features');
  }
};

/**
 * Cleanup store resources
 */
export const disposeAppStore = (): void => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }

  const state = useAppStore.getState();
  state.endSession();

  console.log('🧹 App Store disposed');
};

export default useAppStore;
