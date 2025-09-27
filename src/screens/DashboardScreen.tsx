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
import { AppHeader, HamburgerMenu } from '../components/Navigation';
import {
  GlassCard,
  Button,
  ScreenContainer,
} from '../components/GlassComponents';
import { colors, spacing, typography } from '../theme/colors';
import { ThemeType } from '../theme/colors';
import { StorageService } from '../services/StorageService';
import { SpacedRepetitionService } from '../services/SpacedRepetitionService';
import { Flashcard, StudySession, ProgressData, Task } from '../types';

interface DashboardScreenProps {
  theme: ThemeType;
  onNavigate: (screen: string) => void;
}

interface DashboardStats {
  dueCards: number;
  atRiskCards: number;
  activeTasks: number;
  studyStreak: number;
  todayFocusTime: number;
  cognitiveLoad: number;
  retentionRate: number;
  weeklyProgress: number;
  optimalSessionSize: number;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  theme,
  onNavigate,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    dueCards: 0,
    atRiskCards: 0,
    activeTasks: 0,
    studyStreak: 0,
    todayFocusTime: 0,
    cognitiveLoad: 1.0,
    retentionRate: 0,
    weeklyProgress: 0,
    optimalSessionSize: 10,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const themeColors = colors[theme];
  const storage = StorageService.getInstance();
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
      const calculatedStats = calculateCognitiveStats(
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

  const calculateCognitiveStats = (
    flashcards: Flashcard[],
    sessions: StudySession[],
    progress: ProgressData,
    tasks: Task[],
  ): DashboardStats => {
    // Due cards using FSRS algorithm
    const dueCards = srs.getDueCards(flashcards).length;

    // Cards at risk of being forgotten (predictive)
    const atRiskCards = srs.getAtRiskCards(flashcards, 0.3).length;

    // Active tasks
    const activeTasks = tasks.filter((task) => !task.isCompleted).length;

    // Cognitive load based on recent performance
    const cognitiveLoad = srs.calculateCognitiveLoad(sessions.slice(-10));

    // Optimal session size based on cognitive load
    const optimalSessionSize = srs.getOptimalSessionSize(
      cognitiveLoad,
      dueCards,
    );

    // Retention rate from actual study data
    const retentionRate = calculateRetentionRate(sessions, flashcards);

    // Weekly progress calculation
    const weeklyGoal = 420; // 7 days * 60 minutes
    const weeklyFocusTime = progress.weeklyData.reduce(
      (acc, day) => acc + day.focusTime,
      0,
    );
    const weeklyProgress = Math.min(100, (weeklyFocusTime / weeklyGoal) * 100);

    return {
      dueCards,
      atRiskCards,
      activeTasks,
      studyStreak: progress.studyStreak,
      todayFocusTime: progress.todayFocusTime,
      cognitiveLoad,
      retentionRate: Math.round(retentionRate),
      weeklyProgress: Math.round(weeklyProgress),
      optimalSessionSize,
    };
  };

  const calculateRetentionRate = (
    sessions: StudySession[],
    flashcards: Flashcard[],
  ): number => {
    const recentSessions = sessions
      .filter((s) => s.type === 'flashcards' && s.completed)
      .slice(-5);

    if (recentSessions.length === 0) return 75; // Default baseline

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

  // Enhanced Settings Functionality
  const handleSettingChange = (setting: string, value: any) => {
    Alert.alert('Setting Updated', `${setting} changed to ${value}`);
  };

  const quickSettings = [
    {
      icon: '🌙',
      label: 'Dark Mode',
      action: () => handleSettingChange('theme', 'dark'),
    },
    {
      icon: '🔔',
      label: 'Notifications',
      action: () => handleSettingChange('notifications', 'toggle'),
    },
    {
      icon: '🎯',
      label: 'Daily Goal',
      action: () => handleSettingChange('dailyGoal', '60min'),
    },
    { icon: '📊', label: 'Analytics', action: () => onNavigate('progress') },
    {
      icon: '🔄',
      label: 'Sync Data',
      action: () => handleSettingChange('sync', 'now'),
    },
    { icon: '🛠️', label: 'Advanced', action: () => onNavigate('settings') },
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
      >
        {/* Cognitive Load Status */}
        <GlassCard theme={theme} style={styles.cognitiveCard}>
          <View style={styles.cognitiveHeader}>
            <View>
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

        {/* Core Metrics */}
        <View style={styles.metricsGrid}>
          <GlassCard theme={theme} style={styles.metricCard}>
            <Text style={styles.metricIcon}>📚</Text>
            <Text style={[styles.metricValue, { color: themeColors.primary }]}>
              {stats.dueCards}
            </Text>
            <Text style={[styles.metricLabel, { color: themeColors.text }]}>
              Due Cards
            </Text>
          </GlassCard>

          <GlassCard theme={theme} style={styles.metricCard}>
            <Text style={styles.metricIcon}>⚠️</Text>
            <Text style={[styles.metricValue, { color: themeColors.warning }]}>
              {stats.atRiskCards}
            </Text>
            <Text style={[styles.metricLabel, { color: themeColors.text }]}>
              At Risk
            </Text>
          </GlassCard>

          <GlassCard theme={theme} style={styles.metricCard}>
            <Text style={styles.metricIcon}>🔥</Text>
            <Text style={[styles.metricValue, { color: themeColors.success }]}>
              {stats.studyStreak}
            </Text>
            <Text style={[styles.metricLabel, { color: themeColors.text }]}>
              Day Streak
            </Text>
          </GlassCard>

          <GlassCard theme={theme} style={styles.metricCard}>
            <Text style={styles.metricIcon}>📊</Text>
            <Text style={[styles.metricValue, { color: themeColors.primary }]}>
              {stats.retentionRate}%
            </Text>
            <Text style={[styles.metricLabel, { color: themeColors.text }]}>
              Retention
            </Text>
          </GlassCard>
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
              <Text style={[styles.performanceValue, { color: themeColors.success }]}>
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
    paddingTop: 100, // Space for floating nav bar
  },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 3,
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
});

