/**
 * Optimized Store Selectors - Prevents unnecessary re-renders
 * These are ADDITIONS to your existing store, not replacements
 * Integrated with useAuraStore for optimized state management
 */

import { useMemo } from 'react';
import { useAuraStore } from '../store/useAuraStore';
// Simple selectors that prevent re-renders
export const useAuraContext = () =>
  useAuraStore(state => state.currentAuraState?.context || null);

export const useCognitiveLoad = () =>
  useAuraStore(state => state.currentAuraState?.cognitiveLoad || 0.5);

export const useAuraConfidence = () =>
  useAuraStore(state => state.currentAuraState?.confidence || 0.5);

export const useIsLoading = () =>
  useAuraStore(state => state.isLoading);

export const useIsRefreshing = () =>
  useAuraStore(state => state.isRefreshing);

// Actions only (never cause re-renders)
export const useAuraActions = () =>
  useAuraStore(
    (state) => ({
      refreshAura: state.refreshAura,
      recordPerformance: state.recordPerformance,
      clearError: state.clearError,
      updateAuraState: state.updateAuraState,
      startSession: state.startSession,
      endSession: state.endSession,
    })
  );

// Performance-optimized selectors for neural canvas
export const useNeuralCanvasData = () =>
  useMemo(() =>
    useAuraStore((state) => ({
      cognitiveLoad: state.currentAuraState?.cognitiveLoad || 0.5,
      context: state.currentAuraState?.context || null,
      isRefreshing: state.isRefreshing,
    })), []
  );

// Additional optimized selectors for aura analytics and metrics
export const useAuraAnalyticsOptimized = () =>
  useMemo(() =>
    useAuraStore((state) => ({
      averageAccuracy: state.analytics.averageAccuracy,
      averageCompletionRate: state.analytics.averageCompletionRate,
      mostEffectiveContext: state.analytics.mostEffectiveContext,
      performanceImprovement: state.analytics.performanceImprovement,
    })), []
  );

export const useSessionMetricsOptimized = () =>
  useMemo(() =>
    useAuraStore((state) => ({
      focusEfficiency: state.sessionMetrics.focusEfficiency,
      currentStreak: state.sessionMetrics.currentStreak,
      tasksCompleted: state.sessionMetrics.tasksCompleted,
      duration: state.sessionMetrics.duration,
    })), []
  );

// Dashboard-specific data - optimized with state management
import { useState, useEffect } from 'react';
import StorageService from '../services/storage/StorageService';
import SpacedRepetitionService from '../services/learning/SpacedRepetitionService';

export const useDashboardData = () => {
  const [data, setData] = useState({
    dueCards: 0,
    logicNodesDue: 0,
    criticalLogicCount: 0,
    atRiskCards: 0,
    activeTasks: 0,
    studyStreak: 0,
    todayFocusTime: 0,
    retentionRate: 0,
    weeklyProgress: 0,
    optimalSessionSize: 10,
    focusStreak: 0,
    averageFocusRating: 3,
    distractionsPerSession: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      const storage = StorageService.getInstance();
      const srs = SpacedRepetitionService.getInstance();

      try {
        const [flashcards, sessions, progress, tasks] = await Promise.all([
          storage.getFlashcards(),
          storage.getStudySessions(),
          storage.getProgressData(),
          storage.getTasks(),
        ]);

        const dueData = await storage.getCardsDueToday();
        const focusHealthData = await storage.getFocusHealthMetrics();
        const studyStreak = await storage.calculateCurrentStudyStreak();

        setData({
          dueCards: dueData.flashcards.length,
          logicNodesDue: dueData.logicNodes.length,
          criticalLogicCount: dueData.criticalLogicCount,
          atRiskCards: srs.getAtRiskCards(flashcards, 0.3).length,
          activeTasks: tasks.filter((task) => !task.isCompleted).length,
          studyStreak,
          todayFocusTime: progress.todayFocusTime,
          retentionRate: Math.round(calculateRetentionRate(sessions, flashcards)),
          weeklyProgress: Math.round(calculateWeeklyProgress(progress)),
          optimalSessionSize: srs.getOptimalSessionSize(
            srs.calculateCognitiveLoad(sessions.slice(-10)),
            dueData.flashcards.length + dueData.logicNodes.length,
          ),
          focusStreak: focusHealthData?.streakCount ?? 0,
          averageFocusRating: focusHealthData?.averageFocusRating ?? 3,
          distractionsPerSession: focusHealthData?.distractionsPerSession ?? 0,
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };

    loadData();
  }, []);

  return data;
};

// Helper functions
const calculateRetentionRate = (sessions: any[], flashcards: any[]): number => {
  const recentSessions = sessions
    .filter((s) => s.type === 'flashcards' && s.completed)
    .slice(-5);

  if (recentSessions.length === 0) return 0;

  const successfulCards = recentSessions.reduce((acc, session) => {
    return acc + (session.cardsStudied || 0);
  }, 0);

  const totalReviewed = recentSessions.length * 10;

  return Math.min(95, Math.max(0, (successfulCards / Math.max(1, totalReviewed)) * 100));
};

const calculateWeeklyProgress = (progress: any): number => {
  const weeklyGoal = 2520; // 7 days * 360 minutes
  const weeklyFocusTime = progress.weeklyData.reduce(
    (acc: number, day: any) => acc + day.focusTime,
    0,
  );
  return Math.min(100, (weeklyFocusTime / weeklyGoal) * 100);
};

// Focus screen data
export const useFocusScreenData = () =>
  useMemo(() =>
    useAuraStore((state) => ({
      cognitiveLoad: state.currentAuraState?.cognitiveLoad || 0.5,
      focusEfficiency: state.sessionMetrics.focusEfficiency,
      currentStreak: state.sessionMetrics.currentStreak,
    })), []
  );

export default {
  useAuraContext,
  useCognitiveLoad,
  useAuraConfidence,
  useIsLoading,
  useIsRefreshing,
  useAuraActions,
  useNeuralCanvasData,
  useAuraAnalyticsOptimized,
  useSessionMetricsOptimized,
  useDashboardData,
  useFocusScreenData,
};
