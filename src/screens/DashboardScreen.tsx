import React, { useState, useEffect } from 'react';
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
import HybridStorageService from '../services/storage/HybridStorageService';
import SpacedRepetitionService from '../services/learning/SpacedRepetitionService';
import { FocusTimerService } from '../services/learning/FocusTimerService';
import { Flashcard, StudySession, ProgressData, Task } from '../types';
import FloatingChatBubble from '../components/ai/FloatingChatBubble';
import AICheckinCard from '../components/ai/AICheckinCard';

interface DashboardScreenProps {
  theme: ThemeType;
  onNavigate: (screen: string) => void;
  isHubScreen?: boolean;
}

interface DashboardStats {
  dueCards: number;
  logicNodesDue: number;
  criticalLogicCount: number;
  atRiskCards: number;
  activeTasks: number;
  studyStreak: number;
  todayFocusTime: number;
  cognitiveLoad: number;
  retentionRate: number;
  weeklyProgress: number;
  optimalSessionSize: number;
  focusStreak: number;
  averageFocusRating: number;
  distractionsPerSession: number;
}

interface Metric {
  icon: string;
  value: string | number;
  label: string;
  color?: string;
}

interface MetricGroup {
  id: string;
  title: string;
  icon: string;
  subtitle: string;
  metrics: Metric[];
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  theme,
  onNavigate,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    dueCards: 0,
    logicNodesDue: 0,
    criticalLogicCount: 0,
    atRiskCards: 0,
    activeTasks: 0,
    studyStreak: 0,
    todayFocusTime: 0,
    cognitiveLoad: 1.0,
    retentionRate: 0,
    weeklyProgress: 0,
    optimalSessionSize: 10,
    focusStreak: 0,
    averageFocusRating: 0,
    distractionsPerSession: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const themeColors = colors[theme];
  const storage = HybridStorageService.getInstance();
  const srs = SpacedRepetitionService.getInstance();

  useEffect(() => {
    loadDashboardData();
    // Animate header in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [flashcardsData, sessionsData, progressData, tasksData] =
        await Promise.all([
          storage.getFlashcards(),
          storage.getStudySessions(),
          storage.getProgressData(),
          storage.getTasks(),
        ]);

      // Calculate science-based statistics
      const calculatedStats = await calculateCognitiveStats(
        flashcardsData,
        sessionsData,
        progressData,
        tasksData,
      );

      setStats(calculatedStats);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCognitiveStats = async (
    flashcards: Flashcard[],
    sessions: StudySession[],
    progress: ProgressData,
    tasks: Task[],
  ): Promise<DashboardStats> => {
    // Get due cards and logic nodes using StorageService
    const dueData = await storage.getCardsDueToday();

    // Due cards using FSRS algorithm
    const dueCards = dueData.flashcards.length;

    // Logic nodes due today
    const logicNodesDue = dueData.logicNodes.length;

    // Critical logic nodes count
    const criticalLogicCount = dueData.criticalLogicCount;

    // Cards at risk of being forgotten (predictive)
    const atRiskCards = srs.getAtRiskCards(flashcards, 0.3).length;

    // Active tasks
    const activeTasks = tasks.filter((task) => !task.isCompleted).length;

    // Cognitive load based on recent performance
    const cognitiveLoad = srs.calculateCognitiveLoad(sessions.slice(-10));

    // Optimal session size based on cognitive load (include logic nodes)
    const optimalSessionSize = srs.getOptimalSessionSize(
      cognitiveLoad,
      dueCards + logicNodesDue,
    );

    // Retention rate from actual study data
    const retentionRate = calculateRetentionRate(sessions, flashcards);

    // Calculate current study streak based on actual study sessions
    const studyStreak = await storage.calculateCurrentStudyStreak();

    // Weekly progress calculation
    const weeklyGoal = 2520; // 7 days * 360 minutes
    const weeklyFocusTime = progress.weeklyData.reduce(
      (acc, day) => acc + day.focusTime,
      0,
    );
    const weeklyProgress = Math.min(100, (weeklyFocusTime / weeklyGoal) * 100);

    // Get focus health metrics from StorageService (correct source)
    const focusHealthData = await storage.getFocusHealthMetrics();

    return {
      dueCards,
      logicNodesDue,
      criticalLogicCount,
      atRiskCards,
      activeTasks,
      studyStreak,
      todayFocusTime: progress.todayFocusTime,
      cognitiveLoad,
      retentionRate: Math.round(retentionRate),
      weeklyProgress: Math.round(weeklyProgress),
      optimalSessionSize,
      focusStreak: focusHealthData.streakCount,
      averageFocusRating: focusHealthData.averageFocusRating,
      distractionsPerSession: focusHealthData.distractionsPerSession,
    };
  };

  const calculateRetentionRate = (
    sessions: StudySession[],
    flashcards: Flashcard[],
  ): number => {
    const recentSessions = sessions
      .filter((s) => s.type === 'flashcards' && s.completed)
      .slice(-5);

    if (recentSessions.length === 0) return 0; // No data available

    // Calculate based on cards that were successfully recalled
    const successfulCards = recentSessions.reduce((acc, session) => {
      return acc + (session.cardsStudied || 0);
    }, 0);

    const totalReviewed = recentSessions.length * 10; // Assume 10 cards per session

    return Math.min(
      95,
      Math.max(0, (successfulCards / Math.max(1, totalReviewed)) * 100),
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

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

  const getCognitiveLoadColor = (load: number): string => {
    if (load > 1.5) return themeColors.error;
    if (load > 1.2) return themeColors.warning;
    if (load < 0.8) return themeColors.success;
    return themeColors.primary;
  };

  const getCognitiveLoadAdvice = (load: number): string => {
    if (load > 1.5)
      return 'High mental fatigue detected. Take a 15-minute break.';
    if (load > 1.2) return 'Moderate load. Consider 5-card mini-sessions.';
    if (load < 0.8) return 'Optimal state for challenging material.';
    return 'Perfect cognitive state for focused learning.';
  };

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

  // Dynamic metric groups configuration - always show all groups but with conditional content
  const getLearningProgressGroup = (): MetricGroup => {
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

  const getCognitiveHealthGroup = (): MetricGroup => {
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

  const getPerformanceGroup = (): MetricGroup => {
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

  const metricGroups: MetricGroup[] = [
    getLearningProgressGroup(),
    getCognitiveHealthGroup(),
    getPerformanceGroup(),
  ];

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
        {/* Cognitive Load Status */}
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

        {/* Floating Chat Bubble */}
<FloatingChatBubble theme={theme} />

        {/* Metric Group Cards */}
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

        {/* Smart Recommendations */}
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

        {/* Quick Actions */}
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
        </GlassCard>

        {/* Performance Summary */}
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

// Settings Modal Component
interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  theme: ThemeType;
  quickSettings: Array<{ icon: string; label: string; action: () => void }>;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  theme,
  quickSettings,
}) => {
  const themeColors = colors[theme];

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
};

// Metrics Modal Component
interface MetricsModalProps {
  visible: boolean;
  onClose: () => void;
  theme: ThemeType;
  selectedGroup: string | null;
  stats: DashboardStats;
}

const MetricsModal: React.FC<MetricsModalProps> = ({
  visible,
  onClose,
  theme,
  selectedGroup,
  stats,
}) => {
  const themeColors = colors[theme];

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

        <GlassCard theme={theme} style={styles.modalCard}>
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
};

const styles = StyleSheet.create({
  // Settings Modal Styles
  settingsOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  settingsBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  settingsCard: {
    width: '85%',
    maxWidth: 480,
    margin: 20,
    // backgroundColor: themeColors.surface + 'EE',
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  settingsTitle: {
    ...typography.h3,
    fontWeight: '600',
  },
  closeSettings: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 24,
    fontWeight: '300',
  },
  settingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  settingItem: {
    width: '48%',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  settingIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  settingLabel: {
    ...typography.bodySmall,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Existing Dashboard Styles
  content: {
    flex: 1,
    paddingTop: 60, // Space for floating nav bar
  },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    ...typography.body,
  },
  cognitiveCard: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  cognitiveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cognitiveTextContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  cardTitle: {
    ...typography.h4,
    marginBottom: spacing.xs,
  },
  cognitiveAdvice: {
    ...typography.bodySmall,
  },
  loadIndicator: {
    alignItems: 'center',
  },
  loadValue: {
    ...typography.h3,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  loadDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  sectionHeader: {
    ...typography.h4,
    fontWeight: '600',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  metricCard: {
    width: '48%',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingVertical: spacing.lg,
  },
  metricIcon: {
    fontSize: 24,
    marginBottom: spacing.sm,
  },
  metricValue: {
    ...typography.h2,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  metricLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  recommendationCard: {
    marginBottom: spacing.lg,
  },
  recommendationText: {
    ...typography.body,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  sessionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  sessionInfoText: {
    ...typography.caption,
  },
  actionsCard: {
    marginBottom: spacing.lg,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    marginBottom: spacing.sm,
  },
  performanceCard: {
    marginBottom: spacing.lg,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  performanceItem: {
    alignItems: 'center',
  },
  performanceValue: {
    ...typography.h3,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  performanceLabel: {
    ...typography.caption,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Group Card Styles
  groupGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  groupCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  groupCardTouchable: {
    width: '31%',
    height: 160, // Fixed height for uniform cards
    marginBottom: spacing.md,
  },
  groupIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  groupTitle: {
    ...typography.body,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  groupSubtitle: {
    ...typography.caption,
    textAlign: 'center',
    opacity: 0.8,
  },

  // Metrics Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    width: '85%',
    maxWidth: 480,
    margin: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h3,
    fontWeight: '600',
  },
  closeModal: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  modalMetricCard: {
    width: '48%',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  modalMetricIcon: {
    fontSize: 24,
    marginBottom: spacing.sm,
  },
  modalMetricValue: {
    ...typography.h2,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  modalMetricLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    textAlign: 'center',
  },
});
