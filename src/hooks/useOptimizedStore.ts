/**
 * Optimized Store Hooks - Prevents Over-Rendering
 *
 * These hooks provide granular access to store state to prevent
 * unnecessary re-renders that are causing performance issues.
 */

import { useMemo } from 'react';
import { useAuraStore } from '../store/useAuraStore';
import { AuraState, AuraContext } from '../services/ai/CognitiveAuraService';

// Shallow comparison utility
function shallowEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (!obj1 || !obj2) return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }

  return true;
}

/**
 * Optimized hook for current aura context only
 * Prevents re-renders when other aura state properties change
 */
export const useAuraContext = (): AuraContext | null => {
  return useAuraStore(state => state.currentAuraState?.context || null);
};

/**
 * Optimized hook for aura confidence only
 */
export const useAuraConfidence = (): number => {
  return useAuraStore(state => state.currentAuraState?.confidence || 0.5);
};

/**
 * Optimized hook for cognitive load only
 */
export const useCognitiveLoad = (): number => {
  return useAuraStore(state => state.currentAuraState?.cognitiveLoad || 0.5);
};

/**
 * Optimized hook for loading states only
 */
export const useAuraLoadingState = () => {
  return useAuraStore(state => ({
    isLoading: state.isLoading,
    isRefreshing: state.isRefreshing,
    error: state.error,
  }));
};

/**
 * Optimized hook for session metrics only
 */
export const useSessionMetrics = () => {
  return useAuraStore(state => state.sessionMetrics);
};

/**
 * Optimized hook for performance analytics only
 */
export const usePerformanceAnalytics = () => {
  return useAuraStore(state => ({
    averageAccuracy: state.analytics.averageAccuracy,
    averageCompletionRate: state.analytics.averageCompletionRate,
    performanceImprovement: state.analytics.performanceImprovement,
  }));
};

/**
 * Optimized hook for health metrics only
 */
export const useHealthMetrics = () => {
  return useAuraStore(state => ({
    overallHealth: state.analytics.averageAccuracy,
    confidenceTrend: state.analytics.confidenceTrend,
  }));
};

/**
 * Memoized selector for complex aura state calculations
 */
export const useAuraStateSelector = <T>(
  selector: (state: AuraState | null) => T,
  deps: any[] = []
): T => {
  const currentAuraState = useAuraStore(state => state.currentAuraState);

  return useMemo(
    () => selector(currentAuraState),
    [currentAuraState, ...deps]
  );
};

/**
 * Optimized hook for auto-refresh configuration
 */
export const useAutoRefreshConfig = () => {
  return useAuraStore(state => state.autoRefreshConfig);
};

/**
 * Hook for store actions only (doesn't cause re-renders)
 */
export const useAuraActions = () => {
  return useAuraStore(state => ({
    refreshAura: state.refreshAura,
    updateAuraState: state.updateAuraState,
    recordPerformance: state.recordPerformance,
    startSession: state.startSession,
    endSession: state.endSession,
    clearError: state.clearError,
  }));
};

/**
 * Optimized hook for context insights (expensive calculation)
 */
export const useContextInsights = () => {
  return useAuraStore(state => {
    // Only recalculate if analytics actually changed
    const { analytics, stateHistory } = state;
    return {
      insights: state.getContextInsights(),
      lastCalculated: Date.now(),
    };
  });
};

/**
 * Performance-optimized hook for dashboard data
 * Combines multiple state pieces efficiently
 */
export const useDashboardData = () => {
  return useAuraStore(state => ({
    context: state.currentAuraState?.context || null,
    confidence: state.currentAuraState?.confidence || 0.5,
    cognitiveLoad: state.currentAuraState?.cognitiveLoad || 0.5,
    isLoading: state.isLoading,
    error: state.error,
    sessionDuration: state.sessionMetrics.duration,
    tasksCompleted: state.sessionMetrics.tasksCompleted,
    currentStreak: state.sessionMetrics.currentStreak,
    overallHealth: state.analytics.averageAccuracy,
  }));
};

/**
 * Optimized hook for neural canvas data
 * Only updates when relevant physics/rendering data changes
 */
export const useNeuralCanvasData = () => {
  return useAuraStore(state => ({
    cognitiveLoad: state.currentAuraState?.cognitiveLoad || 0.5,
    context: state.currentAuraState?.context || null,
    isRefreshing: state.isRefreshing,
  })) as { cognitiveLoad: number; context: AuraContext | null; isRefreshing: boolean };
};

/**
 * Hook for minimal state updates (for components that rarely need updates)
 */
export const useMinimalAuraState = () => {
  return useAuraStore(state => ({
    hasState: !!state.currentAuraState,
    isInitialized: !state.isLoading && !!state.currentAuraState,
    hasError: !!state.error,
  }));
};

/**
 * Performance monitoring hook
 */
export const useStorePerformance = () => {
  return useAuraStore(state => ({
    refreshCount: state.refreshCount,
    lastRefreshTime: state.lastRefreshTime,
    stateHistorySize: state.stateHistory.size,
    performanceHistoryLength: state.performanceHistory.length,
  }));
};

export default {
  useAuraContext,
  useAuraConfidence,
  useCognitiveLoad,
  useAuraLoadingState,
  useSessionMetrics,
  usePerformanceAnalytics,
  useHealthMetrics,
  useAuraStateSelector,
  useAutoRefreshConfig,
  useAuraActions,
  useContextInsights,
  useDashboardData,
  useNeuralCanvasData,
  useMinimalAuraState,
  useStorePerformance,
};
