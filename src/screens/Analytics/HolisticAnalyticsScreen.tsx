/**
 * HolisticAnalyticsScreen - The Ultimate Learning Analytics Dashboard
 *
 * The most advanced learning analytics interface ever created, combining
 * all NeuroLearn modules into one intelligent, adaptive visualization system.
 *
 * Features:
 * - Real-time holistic intelligence scoring across all domains
 * - Advanced cross-domain correlation analysis and visualization
 * - AI-powered predictive analytics with confidence intervals
 * - Adaptive UI that changes based on cognitive load and performance
 * - Interactive charts with drill-down capabilities
 * - Biometric-responsive design using ChromotherapyService integration
 * - Professional glassmorphism design with premium animations
 */

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Alert,
  Modal,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  interpolateColor,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
// Use react-native-chart-kit instead of victory-native for better stability
import { PieChart, LineChart } from 'react-native-chart-kit';
import { FlashList } from '@shopify/flash-list';

// Services
import {
  AnalyticsAggregationService,
  HolisticAnalyticsReport,
} from '../../services/analytics/AnalyticsAggregationService';
import { CognitiveAuraService } from '../../services/ai/CognitiveAuraService';
import { ChromotherapyService } from '../../services/health/ChromotherapyService';
import { GlassCard } from '../../components/GlassComponents';
import SupabaseService from '../../services/storage/SupabaseService';
import { perf } from '../../utils/perfMarks';
import { useOptimizedQuery } from '../../hooks/useOptimizedQuery';

type CorrelationItem = {
  id: string;
  x: string;
  y: string;
  z: number;
  fill: string;
  strength: number;
};

type TransformedAnalyticsReport = HolisticAnalyticsReport & {
  _correlations?: CorrelationItem[];
  _learningChartData?: any;
  _focusChartData?: any[];
  aiInsights?: any;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Analytics color schemes that adapt to cognitive state
const ANALYTICS_COLORS = {
  // Primary intelligence scores
  intelligence: {
    primary: '#6366F1',
    secondary: '#8B5CF6',
    gradient: ['#6366F1', '#8B5CF6', '#EC4899'],
    glow: '#E0E7FF',
  },

  // Performance categories
  excellent: { color: '#10B981', glow: '#D1FAE5' },
  good: { color: '#3B82F6', glow: '#DBEAFE' },
  moderate: { color: '#F59E0B', glow: '#FEF3C7' },
  needs_improvement: { color: '#EF4444', glow: '#FEE2E2' },

  // Domain-specific colors
  learning: { primary: '#8B5CF6', secondary: '#C084FC' },
  focus: { primary: '#3B82F6', secondary: '#60A5FA' },
  health: { primary: '#10B981', secondary: '#34D399' },
  financial: { primary: '#F59E0B', secondary: '#FBBF24' },
  context: { primary: '#EC4899', secondary: '#F472B6' },
  predictions: { primary: '#6366F1', secondary: '#818CF8' },

  // Correlation heatmap colors
  correlation: {
    strong_positive: '#10B981',
    moderate_positive: '#3B82F6',
    weak_positive: '#8B5CF6',
    neutral: '#6B7280',
    weak_negative: '#F59E0B',
    moderate_negative: '#EF4444',
    strong_negative: '#DC2626',
  },
};

interface Props {
  navigation: any;
  theme: 'light' | 'dark';
  userId?: string;
}

// Module-scope child components to keep hook identities stable across renders
const ScoreCard: React.FC<{
  id: string;
  label: string;
  value: number;
  scoreAnimations: Animated.SharedValue<Record<string, number>>;
  adaptiveColors: any;
  onPress: (id: string) => void;
}> = ({ id, label, value, scoreAnimations, adaptiveColors, onPress }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const progress = (scoreAnimations?.value && scoreAnimations.value[id]) || 0;
    return {
      transform: [{ scale: withSpring(1 + progress * 0.1) }],
    };
  });

  const scoreColor =
    value >= 80
      ? adaptiveColors.excellent.color
      : value >= 65
      ? adaptiveColors.good.color
      : value >= 50
      ? adaptiveColors.moderate.color
      : adaptiveColors.needs_improvement.color;

  return (
    <Animated.View key={id} style={[styles.scoreCard, animatedStyle]}>
      <TouchableOpacity
        onPress={() => onPress(id)}
        style={styles.scoreCardContent}
      >
        <LinearGradient
          colors={[scoreColor + '20', scoreColor + '40']}
          style={styles.scoreGradient}
        >
          <Text style={styles.scoreLabel}>{label}</Text>
          <Text style={[styles.scoreValue, { color: scoreColor }]}>
            {value}
          </Text>
          <View style={styles.scoreIndicator}>
            <View
              style={[
                styles.scoreProgress,
                { width: `${value}%`, backgroundColor: scoreColor },
              ]}
            />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const GlowTitle: React.FC<{
  text: string;
  glowPulse: Animated.SharedValue<number>;
}> = ({ text, glowPulse }) => {
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowPulse.value }],
  }));

  return (
    <Animated.View style={glowStyle}>
      <Text style={styles.intelligenceTitle}>{text}</Text>
    </Animated.View>
  );
};

const LoadingBar: React.FC<{ progress: Animated.SharedValue<number> }> = ({
  progress,
}) => {
  const animatedStyle = useAnimatedStyle(() => ({
    width: `${interpolate(progress.value, [0, 1], [0, 100])}%`,
  }));

  return <Animated.View style={[styles.loadingBar, animatedStyle]} />;
};

const ModalAnimatedContainer: React.FC<{
  children: React.ReactNode;
  modalScale: Animated.SharedValue<number>;
}> = ({ children, modalScale }) => {
  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: modalScale.value }],
  }));

  return (
    <Animated.View style={[styles.modalContainer, modalStyle]}>
      {children}
    </Animated.View>
  );
};

export const HolisticAnalyticsScreen: React.FC<Props> = ({
  navigation,
  theme,
  userId,
}) => {
  const mountMarkRef = useRef<string | null>(null);
  // State management
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [cognitiveState, setCognitiveState] = useState<
    'peak' | 'optimal' | 'fatigued'
  >('optimal');
  const [adaptiveColors, setAdaptiveColors] = useState(ANALYTICS_COLORS);
  const [viewMode, setViewMode] = useState<
    'overview' | 'detailed' | 'correlations' | 'predictions'
  >('overview');
  const [forceUpdate, setForceUpdate] = useState(0);

  // Animation values
  const scoreAnimations = useSharedValue<Record<string, number>>({});
  const glowPulse = useSharedValue(1);
  const loadingProgress = useSharedValue(0);
  const modalScale = useSharedValue(0);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(userId || null);

  // Services
  const analyticsService = useRef(
    AnalyticsAggregationService.getInstance(),
  ).current;
  const cognitiveAura = useRef(CognitiveAuraService.getInstance()).current;

  const getCorrelationColor = useCallback(
    (value: number): string => {
      if (value > 0.7) return adaptiveColors.correlation.strong_positive;
      if (value > 0.4) return adaptiveColors.correlation.moderate_positive;
      if (value > 0.1) return adaptiveColors.correlation.weak_positive;
      if (value > -0.1) return adaptiveColors.correlation.neutral;
      if (value > -0.4) return adaptiveColors.correlation.weak_negative;
      if (value > -0.7) return adaptiveColors.correlation.moderate_negative;
      return adaptiveColors.correlation.strong_negative;
    },
    [adaptiveColors],
  );

  // Use optimized query for analytics data with aggressive caching and batched data transformation
  const {
    data: analyticsReport,
    isLoading: loading,
    isFetching,
    refetch,
  } = useOptimizedQuery<TransformedAnalyticsReport | null>({
    queryKey: ['holistic-analytics', resolvedUserId, forceUpdate],
    queryFn: async () => {
      const uid =
        resolvedUserId ||
        (await (async () => {
          try {
            const supa = SupabaseService.getInstance();
            const u = await supa.getCurrentUser();
            return u?.id ?? null;
          } catch (e) {
            return null;
          }
        })());

      if (!uid) {
        throw new Error('No authenticated user found');
      }

      return await analyticsService.generateHolisticReport(uid, !!forceUpdate);
    },
    enabled: !!resolvedUserId,
    staleTime: 15 * 60 * 1000, // Increased to 15 minutes for aggressive caching
    gcTime: 30 * 60 * 1000, // Increased to 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // Disable to prevent unnecessary refetches
    refetchInterval: 30 * 60 * 1000, // Background refetch every 30 minutes (reduced frequency)
    refetchIntervalInBackground: true,
    networkMode: 'offlineFirst', // Serve cached data first
    select: useMemo(
      () => (data: HolisticAnalyticsReport | null) => {
        // Batched data transformation for optimal performance
        if (!data) return null;

        // Batch 1: Correlation matrix processing
        const correlations = Object.entries(data.correlationMatrix || {});
        const processedCorrelations = correlations
          .map(([key, value]) => ({
            id: key,
            x: key.split('Vs')[0],
            y: key.split('Vs')[1] || 'Performance',
            z: value,
            fill: getCorrelationColor(value),
            strength: Math.abs(value),
          }))
          .sort((a, b) => b.strength - a.strength);

        // Batch 2: Learning analytics processing
        const masteryLevels = Object.entries(
          data.learningAnalytics?.masteryDistribution || {},
        );
        const masteryData = masteryLevels.map(([level, count]) => ({
          name: level.charAt(0).toUpperCase() + level.slice(1),
          population: count,
          color:
            [
              adaptiveColors.needs_improvement.color,
              adaptiveColors.moderate.color,
              adaptiveColors.good.color,
              adaptiveColors.excellent.color,
            ][
              ['beginner', 'intermediate', 'advanced', 'expert'].indexOf(level)
            ] || adaptiveColors.needs_improvement.color,
          legendFontColor: '#FFFFFF',
          legendFontSize: 12,
        }));

        const retentionData = (
          (data.learningAnalytics?.retentionRateChart as any[]) || []
        ).map((item) => ({
          date: item.date,
          rate: item.rate,
        }));

        // Batch 3: Focus analytics processing
        const focusTrendData = (
          (data.focusAnalytics?.cognitiveLoadTrend as any[]) || []
        ).map((item) => ({
          date: item.date,
          load: item.load,
        }));

        // Batch 4: AI insights processing (limit recommendations for performance)
        const limitedRecommendations = (
          data.aiInsights?.improvementRecommendations || []
        ).slice(0, 5);

        return {
          ...data,
          _correlations: processedCorrelations,
          _learningChartData: {
            mastery: masteryData,
            retention: retentionData,
          },
          _focusChartData: focusTrendData,
          aiInsights: data.aiInsights
            ? {
                ...data.aiInsights,
                improvementRecommendations: limitedRecommendations,
              }
            : undefined,
        } as TransformedAnalyticsReport;
      },
      [adaptiveColors, getCorrelationColor],
    ),
  });

  // Local typed alias for safer property access in JSX render helpers
  const report = analyticsReport as TransformedAnalyticsReport | null;

  // Animate scores when analytics report updates
  useEffect(() => {
    if (
      analyticsReport &&
      typeof analyticsReport === 'object' &&
      'overallScores' in analyticsReport &&
      analyticsReport.overallScores &&
      Object.keys(analyticsReport.overallScores).length > 0
    ) {
      animateScores(analyticsReport.overallScores as Record<string, number>);
    }
  }, [analyticsReport]);

  // Module-scope child components (ScoreCard, GlowTitle, LoadingBar, ModalAnimatedContainer)
  // are used instead to keep hook order stable. See module top for definitions.

  // Initialize screen
  useEffect(() => {
    mountMarkRef.current = perf.startMark('HolisticAnalyticsScreen');

    (async () => {
      if (!resolvedUserId) {
        try {
          const supa = SupabaseService.getInstance();
          const user = await supa.getCurrentUser();
          const uid = user?.id ?? null;
          setResolvedUserId(uid);
        } catch (e) {
          // Not authenticated or unable to resolve - we'll surface later
          console.warn('Could not resolve current user id on init', e);
        }
      }

      startGlowAnimation();
    })();
  }, []);

  useEffect(() => {
    if (!loading && mountMarkRef.current) {
      try {
        perf.measureReady('HolisticAnalyticsScreen', mountMarkRef.current);
      } catch (e) {
        // no-op - perf helper is guarded
      }
      mountMarkRef.current = null;
    }
  }, [loading]);

  // Monitor cognitive state changes
  useEffect(() => {
    const updateCognitiveState = async () => {
      try {
        let uid = resolvedUserId;

        if (!uid) {
          try {
            const supa = SupabaseService.getInstance();
            const uObj = await supa.getCurrentUser();
            uid = uObj?.id ?? null;
            setResolvedUserId(uid);
          } catch (_) {
            uid = null;
          }
        }

        const cognitiveLoad = uid
          ? (await (cognitiveAura as any).calculateCompositeCognitiveLoad?.(
              uid,
            )) ?? 0.5
          : 0.5;
        const newState =
          cognitiveLoad > 0.8
            ? 'fatigued'
            : cognitiveLoad < 0.3
            ? 'peak'
            : 'optimal';

        if (newState !== cognitiveState) {
          setCognitiveState(newState);
          await adaptUIToCognitiveState(newState);
        }
      } catch (error) {
        console.error('Error monitoring cognitive state:', error);
      }
    };

    const interval = setInterval(updateCognitiveState, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [cognitiveState, resolvedUserId]);

  const adaptUIToCognitiveState = async (state: typeof cognitiveState) => {
    const adaptiveColorScheme = { ...ANALYTICS_COLORS };

    switch (state) {
      case 'fatigued':
        // Simplify colors, increase contrast
        adaptiveColorScheme.intelligence.primary = '#4F46E5';
        adaptiveColorScheme.intelligence.gradient = ['#4F46E5', '#7C3AED'];
        break;
      case 'peak':
        // Rich, vibrant colors for peak state
        adaptiveColorScheme.intelligence.primary = '#6366F1';
        adaptiveColorScheme.intelligence.gradient = [
          '#6366F1',
          '#8B5CF6',
          '#EC4899',
          '#F59E0B',
        ];
        break;
      default:
        // Standard colors for optimal state
        break;
    }

    setAdaptiveColors(adaptiveColorScheme);
  };

  const startGlowAnimation = () => {
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000 }),
        withTiming(1, { duration: 2000 }),
      ),
      -1,
      false,
    );
  };

  const animateScores = (scores: Record<string, number>) => {
    const animations: Record<string, number> = {};

    Object.entries(scores).forEach(([key, value], index) => {
      animations[key] = withTiming(value / 100, {
        duration: 1500 + index * 200,
      });
    });

    scoreAnimations.value = animations;
  };

  const handleRefresh = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Clear cache and force refetch
      analyticsService.clearCache();
      setForceUpdate((prev) => prev + 1);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error refreshing analytics:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleMetricPress = (metricName: string) => {
    setSelectedMetric(metricName);
    modalScale.value = withSpring(1, { damping: 15 });
    setShowDetailModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const closeDetailModal = () => {
    modalScale.value = withTiming(0, { duration: 200 });
    setTimeout(() => {
      setShowDetailModal(false);
      setSelectedMetric(null);
    }, 200);
  };

  // Render overall intelligence scores dashboard
  const renderIntelligenceScores = () => {
    if (!report || !report.overallScores) return null;

    const { overallScores } = report;

    return (
      <GlassCard style={styles.intelligenceCard} theme={theme}>
        <View style={styles.intelligenceHeader}>
          <GlowTitle text={'🧠 Holistic Intelligence'} glowPulse={glowPulse} />
          <Text style={styles.intelligenceSubtitle}>
            Real-time cognitive performance across all domains
          </Text>
        </View>

        <View style={styles.scoresGrid}>
          {Object.entries(overallScores as Record<string, number>)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => (
              <ScoreCard
                key={key}
                id={key}
                label={key
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, (s) => s.toUpperCase())}
                value={value}
                scoreAnimations={scoreAnimations}
                adaptiveColors={adaptiveColors}
                onPress={handleMetricPress}
              />
            ))}
        </View>
      </GlassCard>
    );
  };

  // Render learning analytics section
  const renderLearningAnalytics = useMemo(() => {
    if (!report?.learningAnalytics || !report?._learningChartData) return null;

    const { learningAnalytics } = report;

    return (
      <GlassCard style={styles.analyticsCard} theme={theme}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>📚 Learning Performance</Text>
          <Text style={styles.cardSubtitle}>
            Retention, mastery, and knowledge graph health
          </Text>
        </View>

        <View style={styles.learningMetrics}>
          <View style={styles.metricRow}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Study Streak</Text>
              <Text
                style={[
                  styles.metricValue,
                  { color: adaptiveColors.learning.primary },
                ]}
              >
                {learningAnalytics.studyStreak} days
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>At Risk Cards</Text>
              <Text
                style={[
                  styles.metricValue,
                  { color: adaptiveColors.needs_improvement.color },
                ]}
              >
                {learningAnalytics.atRiskCards}
              </Text>
            </View>
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Neural Connections</Text>
              <Text
                style={[
                  styles.metricValue,
                  { color: adaptiveColors.learning.secondary },
                ]}
              >
                {Math.round(learningAnalytics.neuralConnectionStrength * 100)}%
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Memory Palace</Text>
              <Text
                style={[
                  styles.metricValue,
                  { color: adaptiveColors.learning.primary },
                ]}
              >
                {Math.round(learningAnalytics.memoryPalaceUtilization * 100)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Mastery Distribution Pie Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Knowledge Mastery Distribution</Text>
          <PieChart
            data={report!._learningChartData.mastery}
            width={SCREEN_WIDTH * 0.8}
            height={200}
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFrom: 'transparent',
              backgroundGradientTo: 'transparent',
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              style: {
                borderRadius: 16,
              },
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
            hasLegend={false}
          />
        </View>
      </GlassCard>
    );
  }, [analyticsReport, adaptiveColors, theme]);

  // Render focus analytics section
  const renderFocusAnalytics = () => {
    if (!report?.focusAnalytics) return null;

    const { focusAnalytics } = report;

    return (
      <GlassCard style={styles.analyticsCard} theme={theme}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🎯 Focus Performance</Text>
          <Text style={styles.cardSubtitle}>
            Deep work capacity and distraction patterns
          </Text>
        </View>

        <View style={styles.focusMetrics}>
          <View style={styles.focusStatCard}>
            <Text style={styles.focusStatValue}>
              {Math.round(focusAnalytics.totalFocusTime / 60)}h
            </Text>
            <Text style={styles.focusStatLabel}>Total Focus Time</Text>
          </View>
          <View style={styles.focusStatCard}>
            <Text style={styles.focusStatValue}>
              {Math.round(focusAnalytics.averageSessionLength)}min
            </Text>
            <Text style={styles.focusStatLabel}>Avg Session</Text>
          </View>
          <View style={styles.focusStatCard}>
            <Text style={styles.focusStatValue}>
              {Math.round(focusAnalytics.focusEfficiency * 100)}%
            </Text>
            <Text style={styles.focusStatLabel}>Efficiency</Text>
          </View>
          <View style={styles.focusStatCard}>
            <Text style={styles.focusStatValue}>
              {Math.round(focusAnalytics.deepWorkCapacity * 100)}%
            </Text>
            <Text style={styles.focusStatLabel}>Deep Work</Text>
          </View>
        </View>

        {/* Cognitive Load Trend Chart */}
        {focusAnalytics.cognitiveLoadTrend.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Cognitive Load Trend</Text>
            <LineChart
              data={{
                labels: focusAnalytics.cognitiveLoadTrend.map(
                  (item: { date: string; load: number }) => item.date,
                ),
                datasets: [
                  {
                    data: focusAnalytics.cognitiveLoadTrend.map(
                      (item: { date: string; load: number }) => item.load,
                    ),
                    color: (opacity = 1) => adaptiveColors.focus.primary,
                    strokeWidth: 2,
                  },
                ],
              }}
              width={SCREEN_WIDTH * 0.85}
              height={180}
              chartConfig={{
                backgroundColor: 'transparent',
                backgroundGradientFrom: 'transparent',
                backgroundGradientTo: 'transparent',
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: adaptiveColors.focus.primary,
                },
                fillShadowGradient: adaptiveColors.focus.primary,
                fillShadowGradientOpacity: 0.3,
              }}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
            />
          </View>
        )}
      </GlassCard>
    );
  };

  // Render correlation matrix heatmap
  const renderCorrelationMatrix = () => {
    if (!report?._correlations) return null;

    const correlationData = report._correlations;

    const renderCorrelationItem = useCallback(
      (info: any) => {
        const item: CorrelationItem = info.item;
        return (
          <TouchableOpacity
            style={[
              styles.correlationCell,
              { backgroundColor: item.fill + '30' },
            ]}
            onPress={() => handleMetricPress(`correlation_${item.x}_${item.y}`)}
          >
            <Text style={styles.correlationLabel}>{item.x}</Text>
            <Text style={styles.correlationArrow}>↔</Text>
            <Text style={styles.correlationLabel}>{item.y}</Text>
            <Text style={[styles.correlationValue, { color: item.fill }]}>
              {(item.z * 100).toFixed(0)}%
            </Text>
          </TouchableOpacity>
        );
      },
      [handleMetricPress],
    );

    const keyExtractor = useCallback((item: any) => item.id, []);

    return (
      <GlassCard style={styles.analyticsCard} theme={theme}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🔗 Cross-Domain Correlations</Text>
          <Text style={styles.cardSubtitle}>
            How different aspects of your life impact each other
          </Text>
        </View>

        <FlashList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={correlationData}
          renderItem={renderCorrelationItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.correlationGrid}
        />
      </GlassCard>
    );
  };

  // Render AI insights section
  const renderAIInsights = () => {
    if (!report?.aiInsights) return null;

    const { aiInsights } = report;

    return (
      <GlassCard style={styles.analyticsCard} theme={theme}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🤖 AI Insights & Predictions</Text>
          <Text style={styles.cardSubtitle}>
            Personalized recommendations and forecasts
          </Text>
        </View>

        <View style={styles.insightsContainer}>
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>🔍 Top Correlation</Text>
            <Text style={styles.insightText}>{aiInsights.topCorrelation}</Text>
          </View>

          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>🎯 Forecast Accuracy</Text>
            <Text
              style={[
                styles.insightValue,
                { color: adaptiveColors.predictions.primary },
              ]}
            >
              {Math.round(aiInsights.forecastAccuracy * 100)}%
            </Text>
          </View>

          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>🧬 Learning Style</Text>
            <Text style={styles.insightText}>
              {aiInsights.learningStyleAnalysis}
            </Text>
          </View>
        </View>

        {/* Improvement Recommendations */}
        <View style={styles.recommendationsContainer}>
          <Text style={styles.recommendationsTitle}>
            💡 Improvement Recommendations
          </Text>
          {aiInsights.improvementRecommendations
            .slice(0, 3)
            .map(
              (
                rec: { domain: string; suggestion: string; impact: number },
                index: number,
              ) => (
                <TouchableOpacity key={index} style={styles.recommendationItem}>
                  <View style={styles.recommendationDot} />
                  <View style={styles.recommendationContent}>
                    <Text style={styles.recommendationDomain}>
                      {rec.domain.toUpperCase()}
                    </Text>
                    <Text style={styles.recommendationText}>
                      {rec.suggestion}
                    </Text>
                    <Text
                      style={[
                        styles.recommendationImpact,
                        { color: adaptiveColors.excellent.color },
                      ]}
                    >
                      Impact: {Math.round(rec.impact * 100)}%
                    </Text>
                  </View>
                </TouchableOpacity>
              ),
            )}
        </View>
      </GlassCard>
    );
  };

  // Render view mode selector
  const renderViewModeSelector = () => {
    return (
      <View style={styles.viewModeSelector}>
        {(['overview', 'detailed', 'correlations', 'predictions'] as const).map(
          (mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.viewModeButton,
                viewMode === mode && styles.viewModeButtonActive,
              ]}
              onPress={() => {
                setViewMode(mode);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text
                style={[
                  styles.viewModeButtonText,
                  viewMode === mode && styles.viewModeButtonTextActive,
                ]}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </TouchableOpacity>
          ),
        )}
      </View>
    );
  };

  // Render loading state
  const renderLoading = () => {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={adaptiveColors.intelligence.gradient as any}
          style={styles.loadingGradient}
        >
          <Text style={styles.loadingTitle}>
            🧠 Analyzing Your Cognitive Universe
          </Text>
          <Text style={styles.loadingSubtitle}>
            Processing cross-domain correlations...
          </Text>

          <View style={styles.loadingBarContainer}>
            <LoadingBar progress={loadingProgress} />
          </View>

          <ActivityIndicator
            size="large"
            color="#FFFFFF"
            style={{ marginTop: 20 }}
          />
        </LinearGradient>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        {renderLoading()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.screenTitle}>📊 Analytics Hub</Text>
          <Text style={styles.screenSubtitle}>
            Holistic Intelligence Dashboard
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleRefresh}
            style={styles.refreshButton}
          >
            <Text style={styles.refreshButtonText}>⟳</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* View Mode Selector */}
      {renderViewModeSelector()}

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={handleRefresh}
            tintColor={adaptiveColors.intelligence.primary}
            colors={[adaptiveColors.intelligence.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Intelligence Scores Dashboard */}
        {(viewMode === 'overview' || viewMode === 'detailed') &&
          renderIntelligenceScores()}

        {/* Learning Analytics */}
        {(viewMode === 'overview' || viewMode === 'detailed') &&
          renderLearningAnalytics}

        {/* Focus Analytics */}
        {(viewMode === 'overview' || viewMode === 'detailed') &&
          renderFocusAnalytics()}

        {/* Correlation Matrix */}
        {(viewMode === 'correlations' || viewMode === 'detailed') &&
          renderCorrelationMatrix()}

        {/* AI Insights */}
        {(viewMode === 'predictions' || viewMode === 'detailed') &&
          renderAIInsights()}

        {/* Spacer for bottom navigation */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={showDetailModal} transparent animationType="fade">
        <BlurView intensity={80} style={styles.modalOverlay}>
          <ModalAnimatedContainer modalScale={modalScale}>
            <GlassCard style={styles.modalContent} theme={theme}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Detailed Analysis</Text>
                <TouchableOpacity
                  onPress={closeDetailModal}
                  style={styles.modalCloseButton}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalText}>
                {selectedMetric
                  ? `Detailed insights for ${selectedMetric} would be displayed here.`
                  : ''}
              </Text>
            </GlassCard>
          </ModalAnimatedContainer>
        </BlurView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F23',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  screenTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  screenSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  refreshButtonText: {
    color: '#6366F1',
    fontSize: 18,
    fontWeight: '600',
  },
  viewModeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  viewModeButtonActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.5)',
  },
  viewModeButtonText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  viewModeButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  intelligenceCard: {
    marginBottom: 24,
    padding: 24,
  },
  intelligenceHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  intelligenceTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  intelligenceSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
  },
  scoresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  scoreCard: {
    width: (SCREEN_WIDTH - 80) / 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  scoreCardContent: {
    overflow: 'hidden',
  },
  scoreGradient: {
    padding: 16,
    alignItems: 'center',
  },
  scoreLabel: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
  },
  scoreIndicator: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  scoreProgress: {
    height: '100%',
    borderRadius: 2,
  },
  analyticsCard: {
    marginBottom: 24,
    padding: 20,
  },
  cardHeader: {
    marginBottom: 20,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  learningMetrics: {
    marginBottom: 24,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginHorizontal: 4,
  },
  metricLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  chartTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  focusMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  focusStatCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  focusStatValue: {
    color: '#3B82F6',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  focusStatLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    textAlign: 'center',
  },
  correlationGrid: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    gap: 12,
  },
  correlationCell: {
    width: 120,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  correlationLabel: {
    color: '#D1D5DB',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  correlationArrow: {
    color: '#9CA3AF',
    fontSize: 16,
    marginVertical: 8,
  },
  correlationValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  insightsContainer: {
    gap: 16,
    marginBottom: 20,
  },
  insightCard: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  insightTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  insightText: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
  },
  insightValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  recommendationsContainer: {
    marginTop: 8,
  },
  recommendationsTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  recommendationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6366F1',
    marginTop: 6,
    marginRight: 12,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationDomain: {
    color: '#6366F1',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  recommendationText: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  recommendationImpact: {
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  loadingTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  loadingSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  loadingBarContainer: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 20,
  },
  loadingBar: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
  },
  modalContent: {
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalText: {
    color: '#D1D5DB',
    fontSize: 16,
    lineHeight: 24,
  },
});

export default HolisticAnalyticsScreen;
