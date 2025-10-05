import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  RefreshControl,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LineChart, ProgressChart } from 'react-native-chart-kit';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { format, differenceInDays } from 'date-fns';

import { GlassCard } from '../../components/GlassComponents';
import FloatingChatBubble from '../../components/ai/FloatingChatBubble';
import { supabase } from '../../services/storage/SupabaseService';
import { CircadianIntelligenceService } from '../../services/health/CircadianIntelligenceService';
import { ChromotherapyService } from '../../services/health/ChromotherapyService';
import BudgetService from '../../services/finance/BudgetService';
import GeminiInsightsService from '../../services/ai/GeminiInsightsService';
import GamificationService from '../../services/health/GamificationService';
import CrossModuleBridgeService from '../../services/integrations/CrossModuleBridgeService';
import { colors } from '../../theme/colors';

interface HolisticDashboardProps {
  userId: string;
  theme: 'light' | 'dark';
  onNavigate?: (screen: string) => void;
}

interface DashboardData {
  healthScore: number;
  financialHealth: number;
  cognitiveLoad: number;
  crdiScore: number;
  sleepPressure: number;
  budgetAdherence: number;
  achievements: any[];
  correlations: any[];
  recommendations: string[];
  adaptiveColors: any;
}

/**
 * Holistic Dashboard showcasing all integrated NeuroLearn features
 * Demonstrates cross-module intelligence and adaptive UI
 */
const HolisticDashboardScreen: React.FC<HolisticDashboardProps> = ({
  userId,
  theme,
  onNavigate
}) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'day' | 'week' | 'month'>('week');

  const screenWidth = Dimensions.get('window').width;

  // Services
  const circadianService = CircadianIntelligenceService.getInstance();
  const chromotherapyService = ChromotherapyService.getInstance();
  const budgetService = BudgetService.getInstance();
  const geminiService = GeminiInsightsService.getInstance();
  const gamificationService = GamificationService.getInstance();
  const bridgeService = CrossModuleBridgeService.getInstance();

  // Animations
  const healthScoreAnimation = useSharedValue(0);
  const financialScoreAnimation = useSharedValue(0);
  const cognitiveLoadAnimation = useSharedValue(0);
  const cardEntranceAnimation = useSharedValue(0);

  useEffect(() => {
    loadDashboardData();
  }, [userId, selectedTimeframe]);

  useEffect(() => {
    if (dashboardData) {
      startAnimations();
    }
  }, [dashboardData]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [
        holisticInsights,
        healthMetrics,
        budgetAnalysis,
        achievements,
        biometricColors
      ] = await Promise.all([
        geminiService.generateHolisticInsights(userId),
        bridgeService.getHealthMetrics(userId),
        budgetService.getBudgetAnalysis(userId),
        gamificationService.checkAchievements(userId),
        chromotherapyService.adaptColorsToPhysiology(75, 30, 'optimal')
      ]);

      const correlations = await bridgeService.getHolisticInsights(userId);

      setDashboardData({
        healthScore: holisticInsights.dailyCheckIn.healthScore,
        financialHealth: holisticInsights.dailyCheckIn.financialHealth,
        cognitiveLoad: holisticInsights.dailyCheckIn.cognitiveLoad,
        crdiScore: healthMetrics.crdiScore * 100,
        sleepPressure: (await circadianService.calculateSleepPressure(userId)).currentPressure,
        budgetAdherence: budgetAnalysis.analysis.overBudgetCategories.length === 0 ? 100 : 
          Math.max(0, 100 - (budgetAnalysis.analysis.overBudgetCategories.length * 25)),
        achievements: achievements.newAchievements,
        correlations: holisticInsights.crossModuleCorrelations,
        recommendations: holisticInsights.dailyCheckIn.recommendations,
        adaptiveColors: biometricColors.recommendedPalette
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const startAnimations = () => {
    if (!dashboardData) return;

    // Animate scores
    healthScoreAnimation.value = withSpring(dashboardData.healthScore / 100);
    financialScoreAnimation.value = withSpring(dashboardData.financialHealth / 100);
    cognitiveLoadAnimation.value = withSpring(dashboardData.cognitiveLoad / 100);

    // Stagger card entrance
    cardEntranceAnimation.value = withTiming(1, { duration: 800 });
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  // Animated styles
  const healthScoreStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      healthScoreAnimation.value,
      [0, 0.5, 1],
      ['#EF4444', '#F59E0B', '#10B981']
    ),
    transform: [{ scale: withSpring(0.9 + healthScoreAnimation.value * 0.1) }]
  }));

  const financialScoreStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      financialScoreAnimation.value,
      [0, 0.5, 1],
      ['#EF4444', '#F59E0B', '#10B981']
    )
  }));

  const cognitiveLoadStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      cognitiveLoadAnimation.value,
      [0, 0.5, 1],
      ['#10B981', '#F59E0B', '#EF4444']
    )
  }));

  const cardEntranceStyle = useAnimatedStyle(() => ({
    opacity: cardEntranceAnimation.value,
    transform: [{ translateY: (1 - cardEntranceAnimation.value) * 20 }]
  }));

  const renderWellnessScores = () => {
    if (!dashboardData) return null;

    const progressData = {
      labels: ['Health', 'Finance', 'Cognitive'],
      data: [
        dashboardData.healthScore / 100,
        dashboardData.financialHealth / 100,
        1 - (dashboardData.cognitiveLoad / 100) // Invert cognitive load
      ]
    };

    return (
      <Reanimated.View style={cardEntranceStyle}>
        <GlassCard theme={theme} style={styles.scoresCard}>
          <LinearGradient
            colors={[dashboardData.adaptiveColors.primary + '20', dashboardData.adaptiveColors.accent + '10']}
            style={styles.scoresGradient}
          >
            <View style={styles.scoresHeader}>
              <Icon name="chart-donut" size={24} color={dashboardData.adaptiveColors.primary} />
              <Text style={styles.scoresTitle}>Holistic Wellness Score</Text>
            </View>

            <View style={styles.scoresContainer}>
              <ProgressChart
                data={progressData}
                width={screenWidth - 80}
                height={200}
                strokeWidth={16}
                radius={32}
                chartConfig={{
                  backgroundColor: 'transparent',
                  backgroundGradientFrom: 'transparent',
                  backgroundGradientTo: 'transparent',
                  color: (opacity = 1, index = 0) => {
                    const colors = [dashboardData.adaptiveColors.primary, dashboardData.adaptiveColors.accent, dashboardData.adaptiveColors.success];
                    return colors[index] || dashboardData.adaptiveColors.primary;
                  }
                }}
                hideLegend={false}
              />

              <View style={styles.scoresLegend}>
                <View style={styles.legendItem}>
                  <Reanimated.View style={[styles.legendDot, healthScoreStyle]} />
                  <Text style={styles.legendText}>Health: {dashboardData.healthScore}/100</Text>
                </View>
                <View style={styles.legendItem}>
                  <Reanimated.View style={[styles.legendDot, financialScoreStyle]} />
                  <Text style={styles.legendText}>Finance: {dashboardData.financialHealth}/100</Text>
                </View>
                <View style={styles.legendItem}>
                  <Reanimated.View style={[styles.legendDot, cognitiveLoadStyle]} />
                  <Text style={styles.legendText}>Focus: {100 - dashboardData.cognitiveLoad}/100</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </GlassCard>
      </Reanimated.View>
    );
  };

  const renderAdvancedMetrics = () => {
    if (!dashboardData) return null;

    return (
      <Reanimated.View style={cardEntranceStyle}>
        <GlassCard theme={theme} style={styles.metricsCard}>
          <Text style={styles.metricsTitle}>🧬 Advanced Biometrics</Text>
          
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <View style={[styles.metricCircle, { borderColor: dashboardData.adaptiveColors.primary }]}>
                <Text style={[styles.metricValue, { color: dashboardData.adaptiveColors.primary }]}>
                  {dashboardData.crdiScore}
                </Text>
              </View>
              <Text style={styles.metricLabel}>CRDI Score</Text>
              <Text style={styles.metricSubtext}>Circadian Health</Text>
            </View>

            <View style={styles.metricItem}>
              <View style={[styles.metricCircle, { borderColor: dashboardData.adaptiveColors.accent }]}>
                <Text style={[styles.metricValue, { color: dashboardData.adaptiveColors.accent }]}>
                  {dashboardData.sleepPressure}
                </Text>
              </View>
              <Text style={styles.metricLabel}>Sleep Pressure</Text>
              <Text style={styles.metricSubtext}>Two-Process Model</Text>
            </View>

            <View style={styles.metricItem}>
              <View style={[styles.metricCircle, { borderColor: dashboardData.adaptiveColors.success }]}>
                <Text style={[styles.metricValue, { color: dashboardData.adaptiveColors.success }]}>
                  {dashboardData.budgetAdherence}%
                </Text>
              </View>
              <Text style={styles.metricLabel}>Budget Adherence</Text>
              <Text style={styles.metricSubtext}>ETS Forecast</Text>
            </View>
          </View>
        </GlassCard>
      </Reanimated.View>
    );
  };

  const renderCrossModuleInsights = () => {
    if (!dashboardData || dashboardData.correlations.length === 0) return null;

    return (
      <Reanimated.View style={cardEntranceStyle}>
        <GlassCard theme={theme} style={styles.insightsCard}>
          <View style={styles.insightsHeader}>
            <Icon name="connection" size={20} color="#6366F1" />
            <Text style={styles.insightsTitle}>Cross-Module Intelligence</Text>
          </View>

          {dashboardData.correlations.map((correlation, index) => (
            <View key={index} style={styles.correlationItem}>
              <View style={styles.correlationHeader}>
                <View style={styles.modulesBadge}>
                  <Text style={styles.modulesText}>
                    {correlation.modules.join(' ↔ ')}
                  </Text>
                </View>
                <View style={[
                  styles.correlationStrength,
                  { backgroundColor: Math.abs(correlation.correlation) > 0.7 ? '#10B981' : '#F59E0B' }
                ]}>
                  <Text style={styles.correlationValue}>
                    {(correlation.correlation * 100).toFixed(0)}%
                  </Text>
                </View>
              </View>
              <Text style={styles.correlationInsight}>{correlation.insight}</Text>
            </View>
          ))}
        </GlassCard>
      </Reanimated.View>
    );
  };

  const renderAchievements = () => {
    if (!dashboardData || dashboardData.achievements.length === 0) return null;

    return (
      <Reanimated.View style={cardEntranceStyle}>
        <GlassCard theme={theme} style={styles.achievementsCard}>
          <View style={styles.achievementsHeader}>
            <Icon name="trophy" size={20} color="#F59E0B" />
            <Text style={styles.achievementsTitle}>Recent Achievements</Text>
          </View>

          {dashboardData.achievements.slice(0, 3).map((achievement, index) => (
            <View key={achievement.id} style={styles.achievementItem}>
              <LinearGradient
                colors={achievement.rarity === 'legendary' ? ['#FFD700', '#FFA500'] :
                        achievement.rarity === 'epic' ? ['#8B5CF6', '#6366F1'] :
                        achievement.rarity === 'rare' ? ['#10B981', '#059669'] :
                        ['#6B7280', '#4B5563']}
                style={styles.achievementGradient}
              >
                <Icon name={achievement.icon} size={24} color="#FFFFFF" />
                <View style={styles.achievementContent}>
                  <Text style={styles.achievementTitle}>{achievement.title}</Text>
                  <Text style={styles.achievementDescription}>{achievement.description}</Text>
                  <Text style={styles.achievementPoints}>+{achievement.rewards.points} points</Text>
                </View>
              </LinearGradient>
            </View>
          ))}
        </GlassCard>
      </Reanimated.View>
    );
  };

  const renderRecommendations = () => {
    if (!dashboardData || dashboardData.recommendations.length === 0) return null;

    return (
      <Reanimated.View style={cardEntranceStyle}>
        <GlassCard theme={theme} style={styles.recommendationsCard}>
          <View style={styles.recommendationsHeader}>
            <Icon name="lightbulb" size={20} color="#10B981" />
            <Text style={styles.recommendationsTitle}>AI Recommendations</Text>
          </View>

          {dashboardData.recommendations.map((recommendation, index) => (
            <TouchableOpacity key={index} style={styles.recommendationItem}>
              <View style={styles.recommendationIcon}>
                <Icon name="arrow-right" size={16} color="#6366F1" />
              </View>
              <Text style={styles.recommendationText}>{recommendation}</Text>
            </TouchableOpacity>
          ))}
        </GlassCard>
      </Reanimated.View>
    );
  };

  const renderTimeframeSelector = () => (
    <View style={styles.timeframeContainer}>
      {(['day', 'week', 'month'] as const).map((timeframe) => (
        <TouchableOpacity
          key={timeframe}
          style={[
            styles.timeframeButton,
            selectedTimeframe === timeframe && styles.timeframeButtonActive
          ]}
          onPress={() => setSelectedTimeframe(timeframe)}
        >
          <Text style={[
            styles.timeframeText,
            selectedTimeframe === timeframe && styles.timeframeTextActive
          ]}>
            {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading && !dashboardData) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Icon name="loading" size={48} color="#6366F1" />
        <Text style={styles.loadingText}>Loading holistic insights...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors[theme].background }]}>
      {/* Adaptive Background */}
      <LinearGradient
        colors={dashboardData ? [
          dashboardData.adaptiveColors.background,
          colors[theme].background
        ] : [colors[theme].background, colors[theme].background]}
        style={styles.backgroundGradient}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors[theme].text }]}>
              Holistic Dashboard
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors[theme].textSecondary }]}>
              Cross-module intelligence powered by AI
            </Text>
          </View>
          {renderTimeframeSelector()}
        </View>

        {/* Dashboard Content */}
        {renderWellnessScores()}
        {renderAdvancedMetrics()}
        {renderCrossModuleInsights()}
        {renderAchievements()}
        {renderRecommendations()}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Floating AI Chat */}
      <FloatingChatBubble
        userId={userId}
        theme={theme}
        onInsightGenerated={(insight) => {
          console.log('New insight generated:', insight);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingTop: 48,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  timeframeContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 4,
  },
  timeframeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timeframeButtonActive: {
    backgroundColor: '#6366F1',
  },
  timeframeText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  timeframeTextActive: {
    color: '#FFFFFF',
  },
  scoresCard: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  scoresGradient: {
    padding: 20,
    borderRadius: 16,
  },
  scoresHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  scoresTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 8,
  },
  scoresContainer: {
    alignItems: 'center',
  },
  scoresLegend: {
    marginTop: 16,
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  metricsCard: {
    marginBottom: 16,
    padding: 20,
  },
  metricsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  metricSubtext: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
  },
  insightsCard: {
    marginBottom: 16,
    padding: 20,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 8,
  },
  correlationItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  correlationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modulesBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modulesText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '600',
  },
  correlationStrength: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  correlationValue: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  correlationInsight: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  achievementsCard: {
    marginBottom: 16,
    padding: 20,
  },
  achievementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  achievementsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 8,
  },
  achievementItem: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  achievementGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  achievementContent: {
    flex: 1,
    marginLeft: 12,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  achievementDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  achievementPoints: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    fontWeight: '600',
  },
  recommendationsCard: {
    marginBottom: 16,
    padding: 20,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 8,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    padding: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  recommendationIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  bottomPadding: {
    height: 100,
  },
});

export default HolisticDashboardScreen;