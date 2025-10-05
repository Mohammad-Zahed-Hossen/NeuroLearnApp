import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Dimensions,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LineChart } from 'react-native-chart-kit';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { format, differenceInHours } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';

import { GlassCard } from '../../components/GlassComponents';
import { supabase } from '../../services/storage/SupabaseService';
import HybridStorageService from '../../services/storage/HybridStorageService';
import CircadianIntelligenceService from '../../services/health/CircadianIntelligenceService';
import { colors } from '../../theme/colors';

interface SmartSleepTrackerProps {
  userId: string;
  theme: 'light' | 'dark';
  onNavigate?: (screen: string) => void;
}

const SmartSleepTracker: React.FC<SmartSleepTrackerProps> = ({
  userId,
  theme,
  onNavigate
}) => {
  const [sleepLogs, setSleepLogs] = useState<any[]>([]);
  const [bedtime, setBedtime] = useState('');
  const [wakeTime, setWakeTime] = useState('');
  const [sleepQuality, setSleepQuality] = useState(3);

  // Dynamic configuration based on user data
  const [userConfig, setUserConfig] = useState({
    optimalBedtime: '22:30',
    optimalWakeTime: '07:00',
    sleepTarget: 8,
    crdiThresholds: { excellent: 80, good: 60 },
    qualityLabels: ['Poor', 'Fair', 'Good', 'Great', 'Excellent'],
    crdiLabels: { excellent: 'Excellent', good: 'Good', needsWork: 'Needs Work' }
  });
  const [loading, setLoading] = useState(false);

  // Advanced metrics
  const [circadianHealth, setCircadianHealth] = useState<number | null>(null);
  const [sleepPressure, setSleepPressure] = useState<any>(null);
  const [optimalWindow, setOptimalWindow] = useState<any>(null);

  const screenWidth = Dimensions.get('window').width;
  const circadianService = CircadianIntelligenceService.getInstance();

  // Enhanced Animations
  const crdiAnimation = useSharedValue(0);
  const pressureAnimation = useSharedValue(0);
  const pulseAnimation = useSharedValue(1);
  const starAnimations = [
    useSharedValue(1),
    useSharedValue(1),
    useSharedValue(1),
    useSharedValue(1),
    useSharedValue(1)
  ];
  const cardEntranceAnimation = useSharedValue(0);
  const chartAnimation = useSharedValue(0);

  useEffect(() => {
    loadSleepData();
    loadAdvancedMetrics();
    startAnimations();
  }, [userId]);

  const startAnimations = () => {
    // Continuous pulse for quick log button
    pulseAnimation.value = withRepeat(
      withTiming(1.05, { duration: 3000 }),
      -1,
      true
    );

    // Stagger card entrance
    cardEntranceAnimation.value = withTiming(1, { duration: 800 });
    chartAnimation.value = withTiming(1, { duration: 1000 });
  };

  const loadSleepData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const data = await HybridStorageService.getInstance().getSleepEntries(user.id, 14);
      setSleepLogs(data || []);
    } catch (error) {
      console.error('Error loading sleep logs:', error);
    }
  };

  const loadAdvancedMetrics = async () => {
    try {
      const [crdi, pressure, window] = await Promise.all([
        circadianService.calculateCRDI(userId),
        circadianService.calculateSleepPressure(userId),
        circadianService.predictOptimalSleepWindow(userId)
      ]);

      setCircadianHealth(crdi);
      setSleepPressure(pressure);
      setOptimalWindow(window);

      // Update dynamic configuration based on user's optimal window
      if (window) {
        setUserConfig(prev => ({
          ...prev,
          optimalBedtime: format(new Date(window.bedtime), 'HH:mm'),
          optimalWakeTime: format(new Date(window.wakeTime), 'HH:mm'),
          sleepTarget: Math.round(differenceInHours(new Date(window.wakeTime), new Date(window.bedtime)))
        }));
      }

      // Animate the metrics
      crdiAnimation.value = withSpring(crdi / 100, { damping: 15 });
      pressureAnimation.value = withSpring(pressure.currentPressure / 100, { damping: 12 });
    } catch (error) {
      console.error('Error loading advanced metrics:', error);
    }
  };

  const logSleep = async () => {
    if (!bedtime || !wakeTime) {
      Alert.alert('Error', 'Please set both bedtime and wake time');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const duration = calculateSleepDuration({ bedtime, wakeTime });
      const sleepScore = calculateSleepScore(duration, sleepQuality);

      const sleepEntry = {
        id: `sleep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user.id,
        bedtime,
        wakeTime: wakeTime,
        duration,
        quality: sleepQuality,
        sleepScore,
        sleepDebt: 0, // Will be calculated by circadian service
        date: new Date().toISOString().split('T')[0],
      };

      await HybridStorageService.getInstance().saveSleepEntries(user.id, [sleepEntry]);

      Alert.alert('Success', `Sleep logged successfully! Score: ${sleepScore}/100`);
      setBedtime('');
      setWakeTime('');
      setSleepQuality(3);

      // Reload data
      loadSleepData();
      loadAdvancedMetrics();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const quickWakeLog = async () => {
    const now = new Date();
    const estimatedBedtime = new Date(now.getTime() - 8 * 60 * 60 * 1000);

    setBedtime(format(estimatedBedtime, 'HH:mm'));
    setWakeTime(format(now, 'HH:mm'));

    // Animate success
    pulseAnimation.value = withTiming(1.2, { duration: 200 });
  };

  const handleQualitySelect = (rating: number) => {
    setSleepQuality(rating);

    // Animate selected star and all previous stars
    for (let i = 0; i < rating; i++) {
      starAnimations[i].value = withTiming(1.3, { duration: 150 });
    }
  };

  const calculateSleepDuration = ({ bedtime, wakeTime }: { bedtime: string; wakeTime: string }): number => {
    const bed = new Date(`2024-01-01 ${bedtime}`);
    let wake = new Date(`2024-01-01 ${wakeTime}`);

    if (wake < bed) {
      wake = new Date(`2024-01-02 ${wakeTime}`);
    }

    return differenceInHours(wake, bed) + (wake.getMinutes() - bed.getMinutes()) / 60;
  };

  const calculateSleepScore = (duration: number, quality: number): number => {
    let score = 0;

    // Duration score (0-70 points)
    if (duration >= 7 && duration <= 9) score += 70;
    else if (duration >= 6.5 && duration <= 9.5) score += 60;
    else if (duration >= 6 && duration <= 10) score += 45;
    else score += 25;

    // Quality score (0-30 points)
    score += quality * 6;

    return Math.min(100, score);
  };

  const chartData = useMemo(() => {
    if (sleepLogs.length === 0) return null;

    const last7Days = sleepLogs.slice(0, 7).reverse();
    return {
      labels: last7Days.map(log => format(new Date(log.date), 'EEE')),
      datasets: [{
        data: last7Days.map(log => log.duration || 0),
        color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
        strokeWidth: 3
      }]
    };
  }, [sleepLogs]);

  // Animated styles
  const crdiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(0.95 + crdiAnimation.value * 0.15) }],
  }));

  const pressureStyle = useAnimatedStyle(() => ({
    transform: [{
      rotate: `${pressureAnimation.value * 180}deg`
    }]
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnimation.value }]
  }));

  const cardEntranceStyle = useAnimatedStyle(() => ({
    opacity: cardEntranceAnimation.value,
    transform: [
      { translateY: (1 - cardEntranceAnimation.value) * 20 }
    ]
  }));

  const chartEntranceStyle = useAnimatedStyle(() => ({
    opacity: chartAnimation.value,
    transform: [
      { scale: 0.95 + chartAnimation.value * 0.05 }
    ]
  }));

  const getCRDIColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const getCRDILabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Needs Work';
  };

  const renderAdvancedMetrics = () => (
    <Reanimated.View style={[styles.metricsContainer, cardEntranceStyle]}>
      <View style={styles.sectionHeader}>
        <Icon name="brain" size={24} color="#6366F1" />
        <Text style={styles.sectionTitle}>Circadian Intelligence</Text>
      </View>

      <View style={styles.metricsGrid}>
        {/* CRDI Score Card with Circular Progress */}
        <Reanimated.View style={[styles.metricCard, crdiStyle]}>
          <LinearGradient
            colors={['rgba(99, 102, 241, 0.1)', 'rgba(139, 92, 246, 0.05)']}
            style={styles.metricGradient}
          >
            <Text style={styles.metricLabel}>CRDI SCORE</Text>

            <View style={styles.circularProgress}>
              <View style={[styles.circularProgressInner, {
                borderColor: getCRDIColor(circadianHealth || 0)
              }]}>
                <Text style={[styles.metricValue, {
                  color: getCRDIColor(circadianHealth || 0)
                }]}>
                  {circadianHealth || '--'}
                </Text>
              </View>
            </View>

            <View style={[styles.statusBadge, {
              backgroundColor: getCRDIColor(circadianHealth || 0) + '20'
            }]}>
              <Text style={[styles.statusText, {
                color: getCRDIColor(circadianHealth || 0)
              }]}>
                {getCRDILabel(circadianHealth || 0)}
              </Text>
            </View>

            <Text style={styles.metricSubtext}>Sleep Consistency</Text>
          </LinearGradient>
        </Reanimated.View>

        {/* Sleep Pressure Card with Gauge */}
        <View style={styles.metricCard}>
          <LinearGradient
            colors={['rgba(245, 158, 11, 0.1)', 'rgba(251, 191, 36, 0.05)']}
            style={styles.metricGradient}
          >
            <Text style={styles.metricLabel}>SLEEP PRESSURE</Text>

            <Reanimated.View style={[styles.pressureGauge, pressureStyle]}>
              <View style={styles.gaugeOuter}>
                <View style={styles.gaugeInner}>
                  <Text style={[styles.metricValue, { fontSize: 20 }]}>
                    {sleepPressure?.currentPressure || '--'}%
                  </Text>
                </View>
              </View>
            </Reanimated.View>

            <View style={styles.alertnessContainer}>
              <Icon
                name={sleepPressure?.alertnessScore > 70 ? 'lightning-bolt' : 'sleep'}
                size={14}
                color="#F59E0B"
              />
              <Text style={styles.alertnessText}>
                Alertness: {sleepPressure?.alertnessScore || '--'}
              </Text>
            </View>
          </LinearGradient>
        </View>
      </View>

      {/* Optimal Sleep Window - Enhanced */}
      {optimalWindow && (
        <GlassCard theme={theme} style={styles.optimalCard}>
          <LinearGradient
            colors={['rgba(16, 185, 129, 0.1)', 'rgba(5, 150, 105, 0.05)']}
            style={styles.optimalGradient}
          >
            <View style={styles.optimalHeader}>
              <Icon name="target" size={20} color="#10B981" />
              <Text style={styles.optimalTitle}>Optimal Sleep Window</Text>
            </View>

            <View style={styles.optimalTimes}>
              <View style={styles.timeBlock}>
                <Icon name="weather-night" size={24} color="#6366F1" />
                <Text style={styles.timeLabel}>Bedtime</Text>
                <Text style={styles.timeValue}>
                  {format(new Date(optimalWindow.bedtime), 'h:mm a')}
                </Text>
              </View>

              <View style={styles.timeDivider}>
                <Icon name="arrow-right" size={20} color="#D1D5DB" />
              </View>

              <View style={styles.timeBlock}>
                <Icon name="white-balance-sunny" size={24} color="#F59E0B" />
                <Text style={styles.timeLabel}>Wake Time</Text>
                <Text style={styles.timeValue}>
                  {format(new Date(optimalWindow.wakeTime), 'h:mm a')}
                </Text>
              </View>
            </View>

            <View style={styles.confidenceRow}>
              <View style={styles.confidenceBar}>
                <View style={[styles.confidenceBarFill, {
                  width: `${(optimalWindow.confidence || 0) * 100}%`
                }]} />
              </View>
              <Text style={styles.confidenceText}>
                {Math.round((optimalWindow.confidence || 0) * 100)}% confidence
              </Text>
            </View>

            <Text style={styles.cognitiveText}>
              {optimalWindow.cognitiveImpact}
            </Text>
          </LinearGradient>
        </GlassCard>
      )}
    </Reanimated.View>
  );

  const renderSleepChart = () => {
    if (!chartData) return null;

    return (
      <Reanimated.View style={chartEntranceStyle}>
        <GlassCard theme={theme} style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Icon name="chart-line" size={20} color="#6366F1" />
            <Text style={styles.chartTitle}>7-Day Sleep Pattern</Text>
          </View>

          <LineChart
            data={chartData}
            width={screenWidth - 64}
            height={200}
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFrom: 'transparent',
              backgroundGradientTo: 'transparent',
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(31, 41, 55, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: {
                r: "5",
                strokeWidth: "2",
                stroke: "#6366F1",
                fill: "#FFFFFF"
              }
            }}
            bezier
            style={styles.chart}
            withShadow={false}
            withInnerLines={true}
            withOuterLines={false}
          />

          {/* Enhanced Target Line */}
          <View style={styles.targetLineContainer}>
            <View style={styles.targetLine}>
              <Icon name="flag-checkered" size={12} color="white" />
              <Text style={styles.targetText}>8h target</Text>
            </View>
          </View>

          {/* Average Sleep Display */}
          <View style={styles.chartFooter}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Avg Sleep</Text>
              <Text style={styles.statValue}>
                {(chartData.datasets[0].data.reduce((a, b) => a + b, 0) / chartData.datasets[0].data.length).toFixed(1)}h
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Best Night</Text>
              <Text style={styles.statValue}>
                {Math.max(...chartData.datasets[0].data).toFixed(1)}h
              </Text>
            </View>
          </View>
        </GlassCard>
      </Reanimated.View>
    );
  };

  const renderQuickLog = () => (
    <GlassCard theme={theme} style={styles.quickLogCard}>
      <LinearGradient
        colors={['rgba(99, 102, 241, 0.05)', 'rgba(139, 92, 246, 0.02)']}
        style={styles.quickLogGradient}
      >
        <View style={styles.quickLogHeader}>
          <Icon name="lightning-bolt" size={20} color="#F59E0B" />
          <Text style={styles.cardTitle}>Quick Sleep Log</Text>
        </View>
        <Text style={styles.quickLogSubtitle}>Just woke up? Log your sleep instantly</Text>

        <Reanimated.View style={pulseStyle}>
          <TouchableOpacity
            style={styles.quickLogButton}
            onPress={quickWakeLog}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.quickLogButtonGradient}
            >
              <Icon name="sleep" size={28} color="#FFFFFF" />
              <Text style={styles.quickLogButtonText}>I Just Woke Up</Text>
              <View style={styles.timeChip}>
                <Icon name="clock-outline" size={14} color="#FFFFFF" />
                <Text style={styles.quickLogTime}>
                  {format(new Date(), 'h:mm a')}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Reanimated.View>
      </LinearGradient>
    </GlassCard>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors[theme].background }]}>
      {/* Enhanced Header with Gradient */}
      <LinearGradient
        colors={theme === 'dark' ? ['#1F2937', '#111827'] : ['#EEF2FF', '#F5F3FF']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => onNavigate?.('wellness')}
            style={styles.backButton}
          >
            <Icon name="arrow-left" size={24} color={colors[theme].text} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, { color: colors[theme].text }]}>
              Smart Sleep Tracker
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors[theme].textSecondary }]}>
              Track, analyze & optimize your sleep
            </Text>
          </View>
        </View>
      </LinearGradient>

      {renderQuickLog()}
      {renderAdvancedMetrics()}
      {renderSleepChart()}

      {/* Enhanced Sleep Logging Form */}
      <GlassCard theme={theme} style={styles.logCard}>
        <View style={styles.logHeader}>
          <Icon name="moon-waning-crescent" size={20} color="#6366F1" />
          <Text style={styles.cardTitle}>Log Last Night's Sleep</Text>
        </View>

        <View style={styles.timeInputs}>
          <View style={styles.timeInputWrapper}>
            <Text style={styles.inputLabel}>
              <Icon name="weather-night" size={14} color="#6B7280" /> Bedtime
            </Text>
            <TouchableOpacity
              style={[styles.timeButton, bedtime && styles.timeButtonFilled]}
              onPress={() => setBedtime(userConfig.optimalBedtime)}
            >
              <Icon
                name="clock-time-eight-outline"
                size={20}
                color={bedtime ? '#6366F1' : '#9CA3AF'}
              />
              <Text style={[styles.timeText, bedtime && styles.timeTextFilled]}>
                {bedtime || userConfig.optimalBedtime}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.timeInputWrapper}>
            <Text style={styles.inputLabel}>
              <Icon name="white-balance-sunny" size={14} color="#6B7280" /> Wake Time
            </Text>
            <TouchableOpacity
              style={[styles.timeButton, wakeTime && styles.timeButtonFilled]}
              onPress={() => setWakeTime(userConfig.optimalWakeTime)}
            >
              <Icon
                name="clock-time-seven-outline"
                size={20}
                color={wakeTime ? '#F59E0B' : '#9CA3AF'}
              />
              <Text style={[styles.timeText, wakeTime && styles.timeTextFilled]}>
                {wakeTime || userConfig.optimalWakeTime}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Enhanced Quality Selector */}
        <View style={styles.qualitySection}>
          <Text style={styles.inputLabel}>
            <Icon name="star" size={14} color="#6B7280" /> Sleep Quality
          </Text>
          <View style={styles.qualityButtons}>
            {[1, 2, 3, 4, 5].map((rating) => {
              const starAnim = useAnimatedStyle(() => ({
                transform: [{ scale: starAnimations[rating - 1].value }]
              }));

              return (
                <Reanimated.View key={rating} style={starAnim}>
                  <TouchableOpacity
                    onPress={() => handleQualitySelect(rating)}
                    style={[
                      styles.qualityButton,
                      {
                        backgroundColor: sleepQuality >= rating ? '#F59E0B' : '#F3F4F6',
                        borderColor: sleepQuality >= rating ? '#F59E0B' : '#E5E7EB',
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Icon
                      name={sleepQuality >= rating ? 'star' : 'star-outline'}
                      size={24}
                      color={sleepQuality >= rating ? 'white' : '#9CA3AF'}
                    />
                  </TouchableOpacity>
                </Reanimated.View>
              );
            })}
          </View>
          <Text style={styles.qualityLabel}>
            {['Poor', 'Fair', 'Good', 'Great', 'Excellent'][sleepQuality - 1]}
          </Text>
        </View>

        {/* Enhanced Log Button */}
        <TouchableOpacity
          style={[styles.logButton]}
          onPress={logSleep}
          disabled={loading || !bedtime || !wakeTime}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              loading || !bedtime || !wakeTime
                ? ['#D1D5DB', '#9CA3AF']
                : ['#6366F1', '#8B5CF6']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logButtonGradient}
          >
            {loading ? (
              <Icon name="loading" size={20} color="white" />
            ) : (
              <Icon name="check-circle" size={20} color="white" />
            )}
            <Text style={styles.logButtonText}>
              {loading ? 'Analyzing Sleep...' : 'Log Sleep'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </GlassCard>

      {/* Enhanced Sleep History */}
      <GlassCard theme={theme} style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <Icon name="history" size={20} color="#6366F1" />
          <Text style={styles.sectionTitle}>Sleep History & Insights</Text>
        </View>

        {sleepLogs.map((log, index) => {
          const scoreColor =
            log.sleep_score >= 80 ? '#10B981' :
            log.sleep_score >= 60 ? '#F59E0B' : '#EF4444';

          return (
            <View key={index} style={styles.historyItem}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0.2)']}
                style={styles.historyGradient}
              >
                <View style={styles.historyRow}>
                  <View style={styles.historyLeft}>
                    <View style={styles.historyDateRow}>
                      <Icon name="calendar" size={16} color="#6B7280" />
                      <Text style={styles.historyDate}>
                        {format(new Date(log.date), 'MMM d, yyyy')}
                      </Text>
                    </View>

                    <View style={styles.historyTimeRow}>
                      <Icon name="clock-outline" size={14} color="#9CA3AF" />
                      <Text style={styles.historyTime}>
                        {log.bedtime} → {log.wake_time}
                      </Text>
                    </View>

                    <View style={styles.historyQualityRow}>
                      <View style={styles.qualityStars}>
                        {[...Array(5)].map((_, i) => (
                          <Icon
                            key={i}
                            name={i < log.quality ? 'star' : 'star-outline'}
                            size={12}
                            color={i < log.quality ? '#F59E0B' : '#D1D5DB'}
                          />
                        ))}
                      </View>
                      <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '20' }]}>
                        <Text style={[styles.scoreText, { color: scoreColor }]}>
                          {log.sleep_score || '--'}/100
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.historyRight}>
                    <View style={[styles.durationCircle, {
                      borderColor: scoreColor
                    }]}>
                      <Text style={[styles.durationText, { color: scoreColor }]}>
                        {log.duration?.toFixed(1) || '--'}
                      </Text>
                      <Text style={styles.durationLabel}>hours</Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </View>
          );
        })}

        {sleepLogs.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Icon name="sleep" size={64} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>No Sleep Data Yet</Text>
            <Text style={styles.emptyText}>
              Start logging your sleep to unlock personalized insights and recommendations
            </Text>
            <TouchableOpacity style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>Log Your First Sleep</Text>
            </TouchableOpacity>
          </View>
        )}
      </GlassCard>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const getQualityText = (quality: number): string => {
  const texts = ['Poor', 'Fair', 'Good', 'Great', 'Excellent'];
  return texts[quality - 1] || 'Unknown';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 48,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  metricsContainer: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    width: '48%',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  metricGradient: {
    padding: 20,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  circularProgress: {
    marginVertical: 12,
  },
  circularProgressInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginVertical: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricSubtext: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  pressureGauge: {
    marginVertical: 12,
  },
  gaugeOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertnessContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  alertnessText: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  optimalCard: {
    marginTop: 4,
  },
  optimalGradient: {
    padding: 20,
    borderRadius: 16,
  },
  optimalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  optimalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 8,
  },
  optimalTimes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeBlock: {
    alignItems: 'center',
    flex: 1,
  },
  timeDivider: {
    marginHorizontal: 12,
  },
  timeLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 4,
    fontWeight: '500',
  },
  timeValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  confidenceRow: {
    marginBottom: 12,
  },
  confidenceBar: {
    height: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  confidenceBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  confidenceText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
    textAlign: 'center',
  },
  cognitiveText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  chartCard: {
    margin: 16,
    padding: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 8,
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  targetLineContainer: {
    position: 'absolute',
    top: 60,
    right: 24,
  },
  targetLine: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  targetText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
  },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(229, 231, 235, 0.5)',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(229, 231, 235, 0.5)',
  },
  quickLogCard: {
    margin: 16,
    overflow: 'hidden',
  },
  quickLogGradient: {
    padding: 24,
    alignItems: 'center',
    borderRadius: 16,
  },
  quickLogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 8,
  },
  quickLogSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  quickLogButton: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  quickLogButtonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 32,
    alignItems: 'center',
    minWidth: 220,
  },
  quickLogButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 12,
  },
  quickLogTime: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  logCard: {
    margin: 16,
    padding: 24,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  timeInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  timeInputWrapper: {
    flex: 1,
    marginHorizontal: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(243, 244, 246, 0.8)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  timeButtonFilled: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: '#6366F1',
  },
  timeText: {
    color: '#9CA3AF',
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '500',
  },
  timeTextFilled: {
    color: '#1F2937',
    fontWeight: '600',
  },
  qualitySection: {
    marginBottom: 24,
  },
  qualityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 12,
  },
  qualityButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  qualityLabel: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  logButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  logButtonGradient: {
    flexDirection: 'row',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  historyCard: {
    margin: 16,
    padding: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  historyItem: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  historyGradient: {
    padding: 16,
    borderRadius: 16,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyLeft: {
    flex: 1,
  },
  historyDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 6,
  },
  historyTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyTime: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
    fontWeight: '500',
  },
  historyQualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qualityStars: {
    flexDirection: 'row',
    marginRight: 12,
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
  },
  historyRight: {
    marginLeft: 16,
  },
  durationCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  durationText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  durationLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  emptyButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 100,
  },
});

export default SmartSleepTracker;
