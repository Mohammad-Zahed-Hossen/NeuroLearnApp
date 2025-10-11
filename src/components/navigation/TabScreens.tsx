// src/components/TabScreens.tsx
// Hub screens for the modern navigation system

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ListRenderItem,
  SectionListRenderItem,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';

import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  ThemeType,
} from '../../theme/colors';
import { GlassCard, Button, ScreenContainer } from '../GlassComponents';
import { useCognitive } from '../../contexts/CognitiveProvider';
import {
  HubCard,
  NavigationParams,
  learnCards,
  focusCards,
  integrationCards,
  profileCards,
  sortCardsBySpacingEffect,
  getNextDueSession,
  updateCardUsage,
} from '../../config/hubConfig';

interface AnimatedHubCardProps {
  card: HubCard;
  theme: ThemeType;
  onNavigate: (screen: string, params?: any) => void;
}

const AnimatedHubCard: React.FC<AnimatedHubCardProps> = ({
  card,
  theme,
  onNavigate,
}) => {
  const themeColors = colors[theme];
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  // Fade in animation on mount
  React.useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
  }, []);

  // Press animation
  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    runOnJS(onNavigate)(card.screen, card.params);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // Create gradient colors based on card color and theme - enhanced visibility
  const gradientColors = React.useMemo(() => {
    const alpha = theme === 'dark' ? '25' : '20';
    const secondaryAlpha = theme === 'dark' ? '08' : '05';
    return [
      (card?.color || themeColors.primary) + alpha,
      (card?.color || themeColors.primary) + secondaryAlpha,
      themeColors.surface,
    ] as const;
  }, [card.color, theme, themeColors.surface]);

  // Determine if card has high cognitive load for special styling
  const isHighLoad = card.cognitiveLoad && card.cognitiveLoad > 0.6;

  return (
    <Animated.View style={[animatedStyle, styles.cardContainer]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.hubCard,
          isHighLoad ? styles.highLoadCard : {},
          {
            borderColor: (card?.color || themeColors.primary) + '50',
            borderWidth: 2,
            shadowColor: card.color,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.cardTouchable}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          {/* Icon with enhanced styling */}
          <LinearGradient
            colors={[
              (card?.color || themeColors.primary) + '30',
              (card?.color || themeColors.primary) + '15',
            ]}
            style={[
              styles.cardIcon,
              {
                borderColor: (card?.color || themeColors.primary) + '60',
                borderWidth: 2,
              },
            ]}
          >
            <Text
              style={[
                styles.cardIconText,
                { color: card.color, fontSize: 28, fontWeight: '700' },
              ]}
            >
              {card.icon}
            </Text>
            {/* Enhanced glow effect for high load cards */}
            {isHighLoad && (
              <View
                style={[
                  styles.iconGlow,
                  {
                    backgroundColor:
                      (card?.color || themeColors.primary) + '30',
                  },
                ]}
              />
            )}
          </LinearGradient>

          {/* Content area */}
          <View style={styles.cardContent}>
            <Text
              style={[
                styles.cardTitle,
                { color: themeColors.text, fontSize: 18, fontWeight: '700' },
              ]}
            >
              {card.title}
            </Text>
            <Text
              style={[
                styles.cardDescription,
                {
                  color: themeColors.textSecondary,
                  fontSize: 14,
                  lineHeight: 18,
                },
              ]}
            >
              {card.description}
            </Text>
          </View>

          {/* Cognitive load badge with enhanced styling */}
          {card.cognitiveLoad && card.cognitiveLoad > 0.6 && (
            <View
              style={[
                styles.loadBadge,
                { backgroundColor: themeColors.warning },
              ]}
            >
              <Text style={styles.loadBadgeText}>
                {Math.round(card.cognitiveLoad * 100)}%
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
};

interface HubScreenProps {
  theme: ThemeType;
  onNavigate: (
    screen: string,
    params?: NavigationParams[keyof NavigationParams],
  ) => void;
}

// Learn Hub Screen
import { useEffect } from 'react';
import { ScrollView } from 'react-native';

export const LearnHubScreen: React.FC<HubScreenProps> = ({
  theme,
  onNavigate,
}) => {
  const themeColors = colors[theme];
  const cognitive = useCognitive();
  const [cards, setCards] = useState(learnCards);

  // Neuroscience: Sort cards by spacing effect
  const sortedCards = useMemo(
    () => sortCardsBySpacingEffect(cards, cognitive.cognitiveLoad),
    [cards, cognitive.cognitiveLoad],
  );

  const filteredCards = useMemo(
    () =>
      cognitive.uiMode === 'simple'
        ? sortedCards.filter((card) => (card.cognitiveLoad || 0) <= 0.5)
        : sortedCards,
    [sortedCards, cognitive.uiMode],
  );

  // Performance: Memoized navigation callback
  const handleNavigate = useCallback(
    (screen: string, params?: NavigationParams[keyof NavigationParams]) => {
      // Learning Intelligence: Log tap for analytics
      setCards((prev) => updateCardUsage(prev, screen));
      onNavigate(screen, params);
    },
    [onNavigate],
  );

  // Micro-interactions: Animated press feedback using reusable component
  const renderCard: ListRenderItem<HubCard> = useCallback(
    ({ item: card }) => (
      <AnimatedHubCard card={card} theme={theme} onNavigate={handleNavigate} />
    ),
    [theme, handleNavigate],
  );

  // Empty state for filtering
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyStateIcon, { color: themeColors.textMuted }]}>
        📚
      </Text>
      <Text style={[styles.emptyStateTitle, { color: themeColors.text }]}>
        No learning activities available
      </Text>
      <Text
        style={[styles.emptyStateText, { color: themeColors.textSecondary }]}
      >
        All high-focus activities are filtered in Simple Mode. Try switching to
        Normal or Advanced mode.
      </Text>
    </View>
  );

  // Engagement: Next due session recommendation
  const nextDueSession = getNextDueSession(cards);

  return (
    <ScreenContainer theme={theme}>
      <FlatList
        data={filteredCards}
        renderItem={renderCard}
        keyExtractor={(card) => card.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: themeColors.text }]}>
              📚 Learn Hub
            </Text>
            <Text
              style={[styles.subtitle, { color: themeColors.textSecondary }]}
            >
              Cognitive training and skill development
            </Text>
            {/* Engagement: Next due session */}
            {nextDueSession && (
              <View style={styles.nextDueContainer}>
                <Text
                  style={[styles.nextDueText, { color: themeColors.accent }]}
                >
                  Next: {nextDueSession.card.title} due in{' '}
                  {nextDueSession.dueIn}
                </Text>
              </View>
            )}
          </View>
        }
        ListFooterComponent={
          <GlassCard theme={theme} style={styles.quickActionsCard}>
            <Text
              style={[styles.quickActionsTitle, { color: themeColors.text }]}
            >
              ⚡ Quick Actions
            </Text>
            <View style={styles.quickActionsGrid}>
              <Button
                title="Review Cards"
                onPress={() => handleNavigate('flashcards', { mode: 'review' })}
                variant="primary"
                theme={theme}
                style={styles.quickActionButton}
              />
              <Button
                title="Speed Read"
                onPress={() => handleNavigate('speed-reading')}
                variant="secondary"
                theme={theme}
                style={styles.quickActionButton}
              />
            </View>
          </GlassCard>
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={4}
        maxToRenderPerBatch={6}
        windowSize={5}
      />
    </ScreenContainer>
  );
};

// Focus Hub Screen
export const FocusHubScreen: React.FC<HubScreenProps> = ({
  theme,
  onNavigate,
}) => {
  const themeColors = colors[theme];
  const cognitive = useCognitive();
  const [cards, setCards] = useState(focusCards);

  // Neuroscience: Sort cards by spacing effect
  const sortedCards = useMemo(
    () => sortCardsBySpacingEffect(cards, cognitive.cognitiveLoad),
    [cards, cognitive.cognitiveLoad],
  );

  const filteredCards = useMemo(
    () =>
      cognitive.uiMode === 'simple'
        ? sortedCards.filter((card) => (card.cognitiveLoad || 0) <= 0.5)
        : sortedCards,
    [sortedCards, cognitive.uiMode],
  );

  // Performance: Memoized navigation callback
  const handleNavigate = useCallback(
    (screen: string, params?: NavigationParams[keyof NavigationParams]) => {
      // Learning Intelligence: Log tap for analytics
      setCards((prev) => updateCardUsage(prev, screen));
      onNavigate(screen, params);
    },
    [onNavigate],
  );

  // Micro-interactions: Animated press feedback using reusable component
  const renderCard: ListRenderItem<HubCard> = useCallback(
    ({ item: card }) => (
      <AnimatedHubCard card={card} theme={theme} onNavigate={handleNavigate} />
    ),
    [theme, handleNavigate],
  );

  // Empty state for filtering
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyStateIcon, { color: themeColors.textMuted }]}>
        🎯
      </Text>
      <Text style={[styles.emptyStateTitle, { color: themeColors.text }]}>
        No activities available
      </Text>
      <Text
        style={[styles.emptyStateText, { color: themeColors.textSecondary }]}
      >
        All high-focus activities are filtered in Simple Mode. Try switching to
        Normal or Advanced mode.
      </Text>
    </View>
  );

  // Engagement: Context-aware nudging
  const getContextualNudge = () => {
    const hour = new Date().getHours();
    if (hour >= 9 && hour <= 11) {
      return '🌅 Perfect morning for deep focus work!';
    } else if (hour >= 14 && hour <= 16) {
      return '☀️ Afternoon productivity peak - time to focus!';
    } else if (cognitive.shouldSuggestBreak()) {
      return "🧘 You've been working hard. Consider a short break.";
    }
    return null;
  };

  const contextualNudge = getContextualNudge();

  return (
    <ScreenContainer theme={theme}>
      <FlatList
        data={filteredCards}
        renderItem={renderCard}
        keyExtractor={(card) => card.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: themeColors.text }]}>
              🎯 Focus Hub
            </Text>
            <Text
              style={[styles.subtitle, { color: themeColors.textSecondary }]}
            >
              Productivity and concentration tools
            </Text>
            {/* Engagement: Contextual nudging */}
            {contextualNudge && (
              <View style={styles.nextDueContainer}>
                <Text
                  style={[styles.nextDueText, { color: themeColors.accent }]}
                >
                  {contextualNudge}
                </Text>
              </View>
            )}
          </View>
        }
        ListFooterComponent={
          <GlassCard theme={theme} style={styles.quickActionsCard}>
            <Text
              style={[styles.quickActionsTitle, { color: themeColors.text }]}
            >
              ⚡ Quick Actions
            </Text>
            <View style={styles.quickActionsGrid}>
              <Button
                title="25min Focus"
                onPress={() =>
                  handleNavigate('focus', { duration: 25, autoStart: true })
                }
                variant="primary"
                theme={theme}
                style={styles.quickActionButton}
              />
              <Button
                title="Add Task"
                onPress={() => handleNavigate('tasks', { mode: 'add' })}
                variant="secondary"
                theme={theme}
                style={styles.quickActionButton}
              />
            </View>
          </GlassCard>
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={4}
        maxToRenderPerBatch={6}
        windowSize={5}
      />
    </ScreenContainer>
  );
};

// Profile Hub Screen
export const ProfileHubScreen: React.FC<HubScreenProps> = ({
  theme,
  onNavigate,
}) => {
  const themeColors = colors[theme];
  const cognitive = useCognitive();
  const [cards, setCards] = useState(profileCards);

  // Neuroscience: Sort cards by spacing effect
  const sortedCards = useMemo(
    () => sortCardsBySpacingEffect(cards, cognitive.cognitiveLoad),
    [cards, cognitive.cognitiveLoad],
  );

  const filteredCards = useMemo(
    () =>
      cognitive.uiMode === 'simple'
        ? sortedCards.filter((card) => (card.cognitiveLoad || 0) <= 0.5)
        : sortedCards,
    [sortedCards, cognitive.uiMode],
  );

  // Performance: Memoized navigation callback
  const handleNavigate = useCallback(
    (screen: string, params?: NavigationParams[keyof NavigationParams]) => {
      // Learning Intelligence: Log tap for analytics
      setCards((prev) => updateCardUsage(prev, screen));
      // Fix: Redirect to HolisticAnalyticsScreen when clicking the analytics card
      if (screen === 'dashboard' && params && 'tab' in params && params.tab === 'analytics') {
        onNavigate('holistic-analytics', params);
      } else {
        onNavigate(screen, params);
      }
    },
    [onNavigate],
  );

  // Micro-interactions: Animated press feedback using reusable component
  const renderCard: ListRenderItem<HubCard> = useCallback(
    ({ item: card }) => (
      <AnimatedHubCard card={card} theme={theme} onNavigate={handleNavigate} />
    ),
    [theme, handleNavigate],
  );

  // Empty state for filtering
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyStateIcon, { color: themeColors.textMuted }]}>
        🎯
      </Text>
      <Text style={[styles.emptyStateTitle, { color: themeColors.text }]}>
        No activities available
      </Text>
      <Text
        style={[styles.emptyStateText, { color: themeColors.textSecondary }]}
      >
        All high-focus activities are filtered in Simple Mode. Try switching to
        Normal or Advanced mode.
      </Text>
    </View>
  );

  // Engagement: Progress rings for analytics
  const getProgressRing = (value: number, max: number, color: string) => {
    const percentage = Math.min((value / max) * 100, 100);
    return {
      percentage,
      color,
    };
  };

  const weeklyProgress = getProgressRing(
    cognitive.sessionCount,
    20,
    themeColors.primary,
  );
  const cognitiveHealth = getProgressRing(
    1 - cognitive.cognitiveLoad,
    1,
    themeColors.success,
  );

  return (
    <ScreenContainer theme={theme}>
      <FlatList
        data={filteredCards}
        renderItem={renderCard}
        keyExtractor={(card) => card.id}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={[styles.title, { color: themeColors.text }]}>
                👤 Profile Hub
              </Text>
              <Text
                style={[styles.subtitle, { color: themeColors.textSecondary }]}
              >
                Your learning journey and preferences
              </Text>
            </View>

            <GlassCard theme={theme} style={styles.cognitiveStatusCard}>
              <Text
                style={[
                  styles.cognitiveStatusTitle,
                  { color: themeColors.text },
                ]}
              >
                🧠 Cognitive Status
              </Text>
              <View style={styles.cognitiveMetrics}>
                <View style={styles.metric}>
                  <Text
                    style={[styles.metricValue, { color: themeColors.primary }]}
                  >
                    {Math.round(cognitive.cognitiveLoad * 100)}%
                  </Text>
                  <Text
                    style={[
                      styles.metricLabel,
                      { color: themeColors.textSecondary },
                    ]}
                  >
                    Load
                  </Text>
                </View>
                <View style={styles.metric}>
                  <Text
                    style={[styles.metricValue, { color: themeColors.success }]}
                  >
                    {cognitive.uiMode}
                  </Text>
                  <Text
                    style={[
                      styles.metricLabel,
                      { color: themeColors.textSecondary },
                    ]}
                  >
                    Mode
                  </Text>
                </View>
                <View style={styles.metric}>
                  <Text
                    style={[styles.metricValue, { color: themeColors.warning }]}
                  >
                    {cognitive.sessionCount}
                  </Text>
                  <Text
                    style={[
                      styles.metricLabel,
                      { color: themeColors.textSecondary },
                    ]}
                  >
                    Sessions
                  </Text>
                </View>
              </View>
              {/* Engagement: Progress rings */}
              <View style={styles.progressRings}>
                <View style={styles.progressRing}>
                  <View
                    style={[
                      styles.progressCircle,
                      { borderColor: weeklyProgress.color },
                    ]}
                  >
                    <Text
                      style={[
                        styles.progressText,
                        { color: weeklyProgress.color },
                      ]}
                    >
                      {Math.round(weeklyProgress.percentage)}%
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.progressLabel,
                      { color: themeColors.textSecondary },
                    ]}
                  >
                    Weekly Goal
                  </Text>
                </View>
                <View style={styles.progressRing}>
                  <View
                    style={[
                      styles.progressCircle,
                      { borderColor: cognitiveHealth.color },
                    ]}
                  >
                    <Text
                      style={[
                        styles.progressText,
                        { color: cognitiveHealth.color },
                      ]}
                    >
                      {Math.round(cognitiveHealth.percentage)}%
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.progressLabel,
                      { color: themeColors.textSecondary },
                    ]}
                  >
                    Cognitive Health
                  </Text>
                </View>
              </View>
            </GlassCard>
          </View>
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={4}
        maxToRenderPerBatch={6}
        windowSize={5}
      />
    </ScreenContainer>
  );
};

// Integration Hub Screen
export const IntegrationHubScreen: React.FC<HubScreenProps> = ({
  theme,
  onNavigate,
}) => {
  const themeColors = colors[theme];
  const cognitive = useCognitive();
  const [cards, setCards] = useState(integrationCards);

  // Neuroscience: Sort cards by spacing effect
  const sortedCards = useMemo(
    () => sortCardsBySpacingEffect(cards, cognitive.cognitiveLoad),
    [cards, cognitive.cognitiveLoad],
  );

  const filteredCards = useMemo(
    () =>
      cognitive.uiMode === 'simple'
        ? sortedCards.filter((card) => (card.cognitiveLoad || 0) <= 0.5)
        : sortedCards,
    [sortedCards, cognitive.uiMode],
  );

  // Performance: Memoized navigation callback
  const handleNavigate = useCallback(
    (screen: string, params?: NavigationParams[keyof NavigationParams]) => {
      // Learning Intelligence: Log tap for analytics
      setCards((prev) => updateCardUsage(prev, screen));
      onNavigate(screen, params);
    },
    [onNavigate],
  );

  // Micro-interactions: Animated press feedback using reusable component
  const renderCard: ListRenderItem<HubCard> = useCallback(
    ({ item: card }) => (
      <AnimatedHubCard card={card} theme={theme} onNavigate={handleNavigate} />
    ),
    [theme, handleNavigate],
  );

  // Empty state for filtering
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyStateIcon, { color: themeColors.textMuted }]}>
        🔗
      </Text>
      <Text style={[styles.emptyStateTitle, { color: themeColors.text }]}>
        No integrations available
      </Text>
      <Text
        style={[styles.emptyStateText, { color: themeColors.textSecondary }]}
      >
        All integration activities are filtered in Simple Mode. Try switching to
        Normal or Advanced mode.
      </Text>
    </View>
  );

  return (
    <ScreenContainer theme={theme}>
      <FlatList
        data={filteredCards}
        renderItem={renderCard}
        keyExtractor={(card) => card.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: themeColors.text }]}>
              🔗 Integration Hub
            </Text>
            <Text
              style={[styles.subtitle, { color: themeColors.textSecondary }]}
            >
              Connect and sync with external tools
            </Text>
          </View>
        }
        ListFooterComponent={
          <GlassCard theme={theme} style={styles.quickActionsCard}>
            <Text
              style={[styles.quickActionsTitle, { color: themeColors.text }]}
            >
              ⚡ Quick Actions
            </Text>
            <View style={styles.quickActionsGrid}>
              <Button
                title="Add Task"
                onPress={() => handleNavigate('tasks', { mode: 'add' })}
                variant="primary"
                theme={theme}
                style={styles.quickActionButton}
              />
              <Button
                title="Notion Sync"
                onPress={() => handleNavigate('notion-dashboard')}
                variant="secondary"
                theme={theme}
                style={styles.quickActionButton}
              />
            </View>
          </GlassCard>
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={4}
        maxToRenderPerBatch={6}
        windowSize={5}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    // Hub screens don't have floating headers, so minimal top padding
    paddingTop: spacing.lg, // Just the ScreenContainer padding
    paddingBottom: 80, // Bottom tab bar (64) + margin (16)
    paddingHorizontal: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    ...typography.h2,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
    textAlign: 'center',
  },
  nextDueContainer: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: borderRadius.sm,
  },
  nextDueText: {
    ...typography.caption,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyStateTitle: {
    ...typography.h4,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyStateText: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 20,
  },
  streakBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  streakText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  cardsList: {
    marginBottom: spacing.lg,
  },
  cardContainer: {
    marginBottom: spacing.md,
  },
  hubCard: {
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardIconText: {
    fontSize: 24,
  },
  cardTitle: {
    ...typography.h4,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  cardDescription: {
    ...typography.caption,
    lineHeight: 16,
  },
  loadBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 8,
  },
  loadBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '600',
  },
  recommendationCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  recommendationTitle: {
    ...typography.h4,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  recommendationText: {
    ...typography.body,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  quickActionsCard: {
    padding: spacing.lg,
  },
  quickActionsTitle: {
    ...typography.h4,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickActionButton: {
    flex: 1,
  },
  cognitiveStatusCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cognitiveStatusTitle: {
    ...typography.h4,
    fontWeight: '600',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  cognitiveMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    ...typography.h3,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  metricLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
  },
  progressRings: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.lg,
  },
  progressRing: {
    alignItems: 'center',
  },
  progressCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  progressText: {
    ...typography.h4,
    fontWeight: '700',
  },
  progressLabel: {
    ...typography.caption,
    textAlign: 'center',
  },
  sectionHeader: {
    ...typography.h4,
    fontWeight: '600',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    textAlign: 'left',
  },
  highLoadCard: {
    borderWidth: 2,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardTouchable: {
    flex: 1,
  },
  iconGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 26,
    opacity: 0.6,
  },
});
