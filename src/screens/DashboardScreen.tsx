/**
 * @file DashboardScreen.tsx
 * @description This file defines the main dashboard screen for the NeuroLearn app.
 * It provides a central hub for users to view their learning progress, cognitive health,
 * and performance metrics. The screen features a dynamic and interactive UI with
 * glass morphism effects, AI-driven recommendations, and quick access to key features.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { AppHeader, HamburgerMenu } from '../components/navigation/Navigation';
import {
  GlassCard,
  Button,
  ScreenContainer,
} from '../components/GlassComponents';
import { colors, spacing, typography } from '../theme/colors';
import { ThemeType } from '../theme/colors';
import StorageService from '../services/storage/StorageService';
import SpacedRepetitionService from '../services/learning/SpacedRepetitionService';
import { FocusTimerService } from '../services/learning/FocusTimerService';
import { Flashcard, StudySession, ProgressData, Task } from '../types';
import AICheckinCard from '../components/ai/AICheckinCard';

import {
  useAuraContext,
  useCognitiveLoad,
  useDashboardData,
} from '../hooks/useOptimizedSelectors';

import PerformanceMonitor from '../utils/PerformanceMonitor';
import { perf } from '../utils/perfMarks';
import EngineIntegrationTest from '../utils/EngineIntegrationTest';
import { createDashboardStyles } from './DashboardStyles';

/**
 * @interface DashboardScreenProps
 * @description Props for the DashboardScreen component.
 */
interface DashboardScreenProps {
  /** The current theme of the application (e.g., 'light' or 'dark'). */
  theme: ThemeType;
  /** Function to handle navigation to other screens. */
  onNavigate: (screen: string) => void;
  /** Optional flag to indicate if this is the main hub screen. */
  isHubScreen?: boolean;
}

/**
 * @interface DashboardStats
 * @description Defines the structure for all statistical data displayed on the dashboard.
 */
interface DashboardStats {
  /** Number of flashcards due for review. */
  dueCards: number;
  /** Number of logic nodes due for review. */
  logicNodesDue: number;
  /** Count of critical logic nodes that need attention. */
  criticalLogicCount: number;
  /** Number of cards at risk of being forgotten. */
  atRiskCards: number;
  /** Number of currently active tasks. */
  activeTasks: number;
  /** Current daily study streak. */
  studyStreak: number;
  /** Total focus time for the day in minutes. */
  todayFocusTime: number;
  /** Calculated cognitive load index. */
  cognitiveLoad: number;
  /** Overall retention rate percentage. */
  retentionRate: number;
  /** Progress towards weekly goals as a percentage. */
  weeklyProgress: number;
  /** AI-recommended optimal session size. */
  optimalSessionSize: number;
  /** Current focus session streak. */
  focusStreak: number;
  /** Average user rating for focus sessions. */
  averageFocusRating: number;
  /** Average number of distractions per focus session. */
  distractionsPerSession: number;
}

/**
 * @interface Metric
 * @description Represents a single metric item to be displayed within a group.
 */
interface Metric {
  /** Icon representing the metric. */
  icon: string;
  /** The value of the metric. */
  value: string | number;
  /** The label describing the metric. */
  label: string;
  /** Optional color for the metric value. */
  color?: string;
}

/**
 * @interface MetricGroup
 * @description Defines a group of related metrics, like "Learning Progress".
 */
interface MetricGroup {
  /** Unique identifier for the group. */
  id: string;
  /** The title of the metric group. */
  title: string;
  /** Icon representing the group. */
  icon: string;
  /** A short subtitle summarizing the group's status. */
  subtitle: string;
  /** An array of individual metrics in this group. */
  metrics: Metric[];
}

// Helper functions for metric groups

/**
 * Generates the metric group for "Learning Progress".
 * @param {DashboardStats} stats - The dashboard's statistical data.
 * @returns {MetricGroup} The learning progress metric group object.
 */
const getLearningProgressGroup = (stats: DashboardStats): MetricGroup => {
  const hasData =
    stats.dueCards > 0 ||
    stats.logicNodesDue > 0 ||
    stats.atRiskCards > 0 ||
    stats.retentionRate > 0;
  return {
    id: 'learning',
    title: 'Learning Progress',
    icon: '📚',
    subtitle: hasData
      ? `${stats.dueCards + stats.logicNodesDue} items due`
      : 'No learning data yet',
    metrics: hasData
      ? [
          { icon: '📚', value: stats.dueCards, label: 'Due Cards' },
          { icon: '🧠', value: stats.logicNodesDue, label: 'Logic Nodes' },
          { icon: '⚠️', value: stats.atRiskCards, label: 'At Risk' },
          {
            icon: '📊',
            value: `${stats.retentionRate}%`,
            label: 'Retention',
          },
        ]
      : [
          { icon: '📚', value: '-', label: 'Due Cards' },
          { icon: '🧠', value: '-', label: 'Logic Nodes' },
          { icon: '⚠️', value: '-', label: 'At Risk' },
          { icon: '📊', value: '-', label: 'Retention' },
        ],
  };
};

/**
 * Generates the metric group for "Cognitive Health".
 * @param {DashboardStats} stats - The dashboard's statistical data.
 * @returns {MetricGroup} The cognitive health metric group object.
 */
const getCognitiveHealthGroup = (stats: DashboardStats): MetricGroup => {
  const hasData =
    stats.focusStreak > 0 ||
    stats.averageFocusRating > 0 ||
    stats.distractionsPerSession > 0 ||
    stats.cognitiveLoad > 0;
  return {
    id: 'cognitive',
    title: 'Cognitive Health',
    icon: '🧠',
    subtitle: hasData ? 'Focus & mental state' : 'No focus data yet',
    metrics: hasData
      ? [
          { icon: '🔥', value: stats.focusStreak, label: 'Focus Streak' },
          {
            icon: '⭐',
            value: stats.averageFocusRating.toFixed(1),
            label: 'Focus Rating',
          },
          {
            icon: '😬',
            value: stats.distractionsPerSession.toFixed(1),
            label: 'Distractions/Session',
          },
          {
            icon: '🧠',
            value: stats.cognitiveLoad.toFixed(1),
            label: 'Cognitive Load',
          },
        ]
      : [
          { icon: '🔥', value: '-', label: 'Focus Streak' },
          { icon: '⭐', value: '-', label: 'Focus Rating' },
          { icon: '😬', value: '-', label: 'Distractions/Session' },
          { icon: '🧠', value: '-', label: 'Cognitive Load' },
        ],
  };
};

/**
 * Generates the metric group for "Performance".
 * @param {DashboardStats} stats - The dashboard's statistical data.
 * @returns {MetricGroup} The performance metric group object.
 */
const getPerformanceGroup = (stats: DashboardStats): MetricGroup => {
  const hasData =
    stats.studyStreak > 0 ||
    stats.criticalLogicCount > 0 ||
    stats.weeklyProgress > 0 ||
    stats.todayFocusTime > 0;
  return {
    id: 'performance',
    title: 'Performance',
    icon: '📈',
    subtitle: hasData ? 'Streaks & achievements' : 'No performance data yet',
    metrics: hasData
      ? [
          { icon: '🔥', value: stats.studyStreak, label: 'Day Streak' },
          {
            icon: '🎯',
            value: stats.criticalLogicCount,
            label: 'Critical Logic',
          },
          {
            icon: '📈',
            value: `${stats.weeklyProgress}%`,
            label: 'Weekly Progress',
          },
          {
            icon: '⏱️',
            value: stats.todayFocusTime,
            label: 'Today Focus (min)',
          },
        ]
      : [
          { icon: '🔥', value: '-', label: 'Day Streak' },
          { icon: '🎯', value: '-', label: 'Critical Logic' },
          { icon: '📈', value: '-', label: 'Weekly Progress' },
          { icon: '⏱️', value: '-', label: 'Today Focus (min)' },
        ],
  };
};

/**
 * The main dashboard screen component.
 * Displays key metrics, AI recommendations, and quick actions.
 * @param {DashboardScreenProps} props - The component props.
 * @returns {React.ReactElement} The rendered dashboard screen.
 */
export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  theme,
  onNavigate,
}) => {
  // Ref for performance measurement start mark
  const mountMarkRef = React.useRef<string | null>(null);

  // State for controlling UI visibility
  const [menuVisible, setMenuVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // Use optimized selectors for reactive dashboard data
  const dashboardData = useDashboardData();
  const auraContext = useAuraContext(); // Currently unused, but available for context-aware features
  const cognitiveLoad = useCognitiveLoad();

  // Singleton instance for performance monitoring
  const performanceMonitor = PerformanceMonitor.getInstance();

  // Local state for loading and pull-to-refresh
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animated value for fade-in animation
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Memoized theme-dependent styles and colors
  const themeColors = colors[theme];
  const styles = useMemo(() => createDashboardStyles(theme), [theme]);

  // Effect for initial data load and animation
  useEffect(() => {
    mountMarkRef.current = perf.startMark('DashboardScreen');
    setLoading(false); // Data is assumed to be reactively loaded by hooks
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Effect to measure component ready time
  useEffect(() => {
    if (!loading && mountMarkRef.current) {
      try {
        perf.measureReady('DashboardScreen', mountMarkRef.current);
      } catch (e) {
        console.error("Performance measurement failed", e);
      }
      mountMarkRef.current = null;
    }
  }, [loading]);

  /**
   * Handles the pull-to-refresh action.
   * This can be extended to trigger a manual data refresh if needed.
   */
  const onRefresh = async () => {
    setRefreshing(true);
    // In a real scenario, you might trigger a data refetch here
    // e.g., await dashboardData.refetch();
    setRefreshing(false);
  };

  // Memoized composition of stats from various data hooks
  const stats: DashboardStats = useMemo(() => ({
    dueCards: dashboardData.dueCards || 0,
    logicNodesDue: dashboardData.logicNodesDue || 0,
    criticalLogicCount: dashboardData.criticalLogicCount || 0,
    atRiskCards: dashboardData.atRiskCards || 0,
    activeTasks: dashboardData.activeTasks || 0,
    studyStreak: dashboardData.studyStreak || 0,
    todayFocusTime: dashboardData.todayFocusTime || 0,
    cognitiveLoad: cognitiveLoad || 0.5,
    retentionRate: dashboardData.retentionRate || 0,
    weeklyProgress: dashboardData.weeklyProgress || 0,
    optimalSessionSize: dashboardData.optimalSessionSize || 10,
    focusStreak: dashboardData.focusStreak || 0,
    averageFocusRating: dashboardData.averageFocusRating || 3,
    distractionsPerSession: dashboardData.distractionsPerSession || 0,
  }), [dashboardData, cognitiveLoad]);

  // Configuration for the quick settings modal
  const quickSettings = [
    {
      icon: '🌙',
      label: 'Dark Mode',
      action: () => {
        setSettingsVisible(false);
        onNavigate('settings');
      },
    },
    {
      icon: '🔔',
      label: 'Notifications',
      action: () => {
        setSettingsVisible(false);
        onNavigate('settings');
      },
    },
    {
      icon: '🎯',
      label: 'Daily Goal',
      action: () => {
        setSettingsVisible(false);
        onNavigate('settings');
      },
    },
    {
      icon: '📊',
      label: 'Analytics',
      action: () => {
        setSettingsVisible(false);
        onNavigate('tasks');
      },
    },
    {
      icon: '🔄',
      label: 'Sync Data',
      action: () => {
        setSettingsVisible(false);
        onNavigate('settings');
      },
    },
    {
      icon: '🛠️',
      label: 'Advanced',
      action: () => {
        setSettingsVisible(false);
        onNavigate('settings');
      },
    },
  ];

  /**
   * Determines the color for the cognitive load indicator based on its value.
   * @param {number} load - The cognitive load value.
   * @returns {string} A color string from the theme.
   */
  const getCognitiveLoadColor = (load: number): string => {
    if (load > 1.5) return themeColors.error;
    if (load > 1.2) return themeColors.warning;
    if (load < 0.8) return themeColors.success;
    return themeColors.primary;
  };

  /**
   * Provides user-friendly advice based on the cognitive load value.
   * @param {number} load - The cognitive load value.
   * @returns {string} A string containing actionable advice.
   */
  const getCognitiveLoadAdvice = (load: number): string => {
    if (load > 1.5)
      return 'High mental fatigue detected. Take a 15-minute break.';
    if (load > 1.2) return 'Moderate load. Consider 5-card mini-sessions.';
    if (load < 0.8) return 'Optimal state for challenging material.';
    return 'Perfect cognitive state for focused learning.';
  };

  /**
   * Generates a smart recommendation based on the user's current stats.
   * @returns {string} A prioritized, actionable recommendation.
   */
  const getSmartRecommendation = (): string => {
    if (stats.dueCards > 20) {
      return `High card backlog. Focus on ${stats.optimalSessionSize} cards per session to avoid overload.`;
    }
    if (stats.atRiskCards > 5) {
      return `${stats.atRiskCards} cards need urgent review to prevent forgetting.`;
    }
    if (stats.cognitiveLoad > 1.5) {
      return 'Mental fatigue high. Switch to passive review or take a break.';
    }
    if (stats.retentionRate < 60) {
      return 'Review effectiveness low. Reduce session size and increase frequency.';
    }
    return 'System optimized. Continue with current learning schedule.';
  };

  // Memoized array of metric groups to display on the dashboard
  const metricGroups: MetricGroup[] = useMemo(() => [
    getLearningProgressGroup(stats),
    getCognitiveHealthGroup(stats),
    getPerformanceGroup(stats),
  ], [stats]);

  // Display a loading state while initial data is being prepared
  if (loading) {
    return (
      <ScreenContainer theme={theme}>
        <AppHeader
          title="Loading..."
          theme={theme}
          onMenuPress={() => setMenuVisible(true)}
        />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: themeColors.text }]}>
            Analyzing cognitive state...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // Main component render
  return (
    <ScreenContainer theme={theme}>
      <AppHeader
        title="NeuroLearn"
        theme={theme}
        onMenuPress={() => setMenuVisible(true)}
        rightComponent={
          <TouchableOpacity onPress={() => setSettingsVisible(true)}>
            <Text style={{ color: themeColors.text, fontSize: 20 }}>⚙️</Text>
          </TouchableOpacity>
        }
      />

      <View style={{ paddingTop: spacing.xl }} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Cognitive Load Status Card */}
        <GlassCard theme={theme} style={styles.cognitiveCard}>
          <View style={styles.cognitiveHeader}>
            <View style={styles.cognitiveTextContainer}>
              <Text style={[styles.cardTitle, { color: themeColors.text }]}>
                🧠 Cognitive Load Analysis
              </Text>
              <Text
                style={[
                  styles.cognitiveAdvice,
                  { color: themeColors.textSecondary },
                ]}
              >
                {getCognitiveLoadAdvice(stats.cognitiveLoad)}
              </Text>
            </View>
            <View style={styles.loadIndicator}>
              <Text
                style={[
                  styles.loadValue,
                  { color: getCognitiveLoadColor(stats.cognitiveLoad) },
                ]}
              >
                {stats.cognitiveLoad.toFixed(1)}
              </Text>
              <View
                style={[
                  styles.loadDot,
                  {
                    backgroundColor: getCognitiveLoadColor(stats.cognitiveLoad),
                  },
                ]}
              />
            </View>
          </View>
        </GlassCard>

        {/* AI Check-in Card */}
        <AICheckinCard theme={theme} />

        {/* Metric Group Cards Grid */}
        <View style={styles.groupGrid}>
          {metricGroups.map((group) => (
            <TouchableOpacity
              key={group.id}
              onPress={() => setSelectedGroup(group.id)}
              activeOpacity={0.8}
              style={styles.groupCardTouchable}
            >
              <GlassCard theme={theme} style={styles.groupCard}>
                <Text style={styles.groupIcon}>{group.icon}</Text>
                <Text style={[styles.groupTitle, { color: themeColors.text }]}>
                  {group.title}
                </Text>
                <Text
                  style={[
                    styles.groupSubtitle,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  {group.subtitle}
                </Text>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>

        {/* Smart Recommendations Card */}
        <GlassCard theme={theme} style={styles.recommendationCard}>
          <Text style={[styles.cardTitle, { color: themeColors.text }]}>
            🎯 AI Learning Coach
          </Text>
          <Text
            style={[
              styles.recommendationText,
              { color: themeColors.textSecondary },
            ]}
          >
            {getSmartRecommendation()}
          </Text>
          <View style={styles.sessionInfo}>
            <Text
              style={[styles.sessionInfoText, { color: themeColors.textMuted }]}
            >
              Optimal session size: {stats.optimalSessionSize} cards
            </Text>
            <Text
              style={[styles.sessionInfoText, { color: themeColors.textMuted }]}
            >
              Today's focus: {stats.todayFocusTime} minutes
            </Text>
          </View>
        </GlassCard>

        {/* Quick Actions Card */}
        <GlassCard theme={theme} style={styles.actionsCard}>
          <Text style={[styles.cardTitle, { color: themeColors.text }]}>
            ⚡ Quick Start
          </Text>

          <View style={styles.actionsGrid}>
            <Button
              title={`Review ${Math.min(
                stats.optimalSessionSize,
                stats.dueCards,
              )} Cards`}
              onPress={() => onNavigate('flashcards')}
              variant="primary"
              size="medium"
              theme={theme}
              style={styles.actionButton}
              disabled={stats.dueCards === 0}
            />

            <Button
              title="25min Focus"
              onPress={() => onNavigate('focus')}
              variant="secondary"
              size="medium"
              theme={theme}
              style={styles.actionButton}
            />

            <Button
              title="Speed Read"
              onPress={() => onNavigate('speed-reading')}
              variant="outline"
              size="medium"
              theme={theme}
              style={styles.actionButton}
            />
            <Button
              title="View Tasks"
              onPress={() => onNavigate('tasks')}
              variant="ghost"
              size="medium"
              theme={theme}
              style={styles.actionButton}
            />
          </View>

          {/* Engine Test Button (For Development Builds Only) */}
          {__DEV__ && (
            <View style={styles.testSection}>
              <Button
                title="🔧 Test Engine"
                onPress={async () => {
                  try {
                    const result = await EngineIntegrationTest.runBasicTest();
                    Alert.alert(
                      'Engine Test Results',
                      `Success: ${result.success}\n\nResults:\n${result.results.join('\n')}\n\nErrors:\n${result.errors.join('\n')}`,
                      [{ text: 'OK' }]
                    );
                  } catch (error) {
                    Alert.alert('Test Failed', `Error: ${error}`);
                  }
                }}
                variant="outline"
                size="small"
                theme={theme}
                style={styles.testButton}
              />
            </View>
          )}
        </GlassCard>

        {/* Weekly Performance Summary Card */}
        <GlassCard theme={theme} style={styles.performanceCard}>
          <Text style={[styles.cardTitle, { color: themeColors.text }]}>
            📈 Weekly Performance
          </Text>

          <View style={styles.performanceRow}>
            <View style={styles.performanceItem}>
              <Text
                style={[
                  styles.performanceValue,
                  { color: themeColors.primary },
                ]}
              >
                {stats.weeklyProgress}%
              </Text>
              <Text
                style={[
                  styles.performanceLabel,
                  { color: themeColors.textSecondary },
                ]}
              >
                Goal Progress
              </Text>
            </View>

            <View style={styles.performanceItem}>
              <Text
                style={[
                  styles.performanceValue,
                  { color: themeColors.success },
                ]}
              >
                {stats.activeTasks}
              </Text>
              <Text
                style={[
                  styles.performanceLabel,
                  { color: themeColors.textSecondary },
                ]}
              >
                Active Tasks
              </Text>
            </View>
          </View>

          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${stats.weeklyProgress}%`,
                  backgroundColor: themeColors.primary,
                },
              ]}
            />
          </View>
        </GlassCard>
      </ScrollView>

      {/* Settings Modal */}
      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        theme={theme}
        quickSettings={quickSettings}
      />

      {/* Metrics Modal */}
      <MetricsModal
        visible={selectedGroup !== null}
        onClose={() => setSelectedGroup(null)}
        theme={theme}
        selectedGroup={selectedGroup}
        stats={stats}
      />

      <HamburgerMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={onNavigate}
        currentScreen="dashboard"
        theme={theme}
      />
    </ScreenContainer>
  );
};

/**
 * @interface SettingsModalProps
 * @description Props for the SettingsModal component.
 */
interface SettingsModalProps {
  /** Controls the visibility of the modal. */
  visible: boolean;
  /** Function to call when the modal is closed. */
  onClose: () => void;
  /** The current theme. */
  theme: ThemeType;
  /** Array of quick setting actions to display. */
  quickSettings: Array<{ icon: string; label: string; action: () => void }>;
}

/**
 * A memoized component for displaying a quick settings modal.
 * @param {SettingsModalProps} props - The component props.
 * @returns {React.ReactElement} The rendered settings modal.
 */
const SettingsModal: React.FC<SettingsModalProps> = React.memo(({
  visible,
  onClose,
  theme,
  quickSettings,
}) => {
  const themeColors = colors[theme];
  const styles = createDashboardStyles(theme);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.settingsOverlay}>
        <TouchableOpacity
          style={styles.settingsBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <GlassCard theme={theme} style={styles.settingsCard}>
          <View style={styles.settingsHeader}>
            <Text style={[styles.settingsTitle, { color: themeColors.text }]}>
              Quick Settings
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeSettings}>
              <Text style={[styles.closeIcon, { color: themeColors.text }]}>
                ×
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.settingsGrid}>
            {quickSettings.map((setting, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.settingItem,
                  { borderColor: themeColors.border },
                ]}
                onPress={setting.action}
                activeOpacity={0.7}
              >
                <Text style={styles.settingIcon}>{setting.icon}</Text>
                <Text
                  style={[styles.settingLabel, { color: themeColors.text }]}
                >
                  {setting.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>
      </View>
    </Modal>
  );
});

/**
 * @interface MetricsModalProps
 * @description Props for the MetricsModal component.
 */
interface MetricsModalProps {
  /** Controls the visibility of the modal. */
  visible: boolean;
  /** Function to call when the modal is closed. */
  onClose: () => void;
  /** The current theme. */
  theme: ThemeType;
  /** The ID of the currently selected metric group to display. */
  selectedGroup: string | null;
  /** The dashboard's statistical data. */
  stats: DashboardStats;
}

/**
 * A memoized component for displaying a detailed view of a metric group in a modal.
 * @param {MetricsModalProps} props - The component props.
 * @returns {React.ReactElement | null} The rendered metrics modal or null.
 */
const MetricsModal: React.FC<MetricsModalProps> = React.memo(({
  visible,
  onClose,
  theme,
  selectedGroup,
  stats,
}) => {
  const themeColors = colors[theme];
  const styles = createDashboardStyles(theme);

  // Dynamic metric groups configuration (same as in main component)
  const metricGroups: MetricGroup[] = [
    {
      id: 'learning',
      title: 'Learning Progress',
      icon: '📚',
      subtitle: `${stats.dueCards + stats.logicNodesDue} items due`,
      metrics: [
        { icon: '📚', value: stats.dueCards, label: 'Due Cards' },
        { icon: '🧠', value: stats.logicNodesDue, label: 'Logic Nodes' },
        { icon: '⚠️', value: stats.atRiskCards, label: 'At Risk' },
        { icon: '📊', value: `${stats.retentionRate}%`, label: 'Retention' },
      ],
    },
    {
      id: 'cognitive',
      title: 'Cognitive Health',
      icon: '🧠',
      subtitle: 'Focus & mental state',
      metrics: [
        { icon: '🔥', value: stats.focusStreak, label: 'Focus Streak' },
        {
          icon: '⭐',
          value: stats.averageFocusRating.toFixed(1),
          label: 'Focus Rating',
        },
        {
          icon: '😬',
          value: stats.distractionsPerSession.toFixed(1),
          label: 'Distractions/Session',
        },
        {
          icon: '🧠',
          value: stats.cognitiveLoad.toFixed(1),
          label: 'Cognitive Load',
        },
      ],
    },
    {
      id: 'performance',
      title: 'Performance',
      icon: '📈',
      subtitle: 'Streaks & achievements',
      metrics: [
        { icon: '🔥', value: stats.studyStreak, label: 'Day Streak' },
        {
          icon: '🎯',
          value: stats.criticalLogicCount,
          label: 'Critical Logic',
        },
        {
          icon: '📈',
          value: `${stats.weeklyProgress}%`,
          label: 'Weekly Progress',
        },
        { icon: '⏱️', value: stats.todayFocusTime, label: 'Today Focus (min)' },
      ],
    },
  ];

  const selectedGroupData = metricGroups.find(
    (group) => group.id === selectedGroup,
  );

  if (!selectedGroupData) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <GlassCard theme={theme} style={styles.modalCard} variant="modal">
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              {selectedGroupData.title}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeModal}>
              <Text style={[styles.closeIcon, { color: themeColors.text }]}>
                ×
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalMetricsGrid}>
            {selectedGroupData.metrics.map((metric, index) => (
              <View key={index} style={styles.modalMetricCard}>
                <Text style={styles.modalMetricIcon}>{metric.icon}</Text>
                <Text
                  style={[
                    styles.modalMetricValue,
                    { color: themeColors.primary },
                  ]}
                >
                  {metric.value}
                </Text>
                <Text
                  style={[styles.modalMetricLabel, { color: themeColors.text }]}
                >
                  {metric.label}
                </Text>
              </View>
            ))}
          </View>
        </GlassCard>
      </View>
    </Modal>
  );
});
