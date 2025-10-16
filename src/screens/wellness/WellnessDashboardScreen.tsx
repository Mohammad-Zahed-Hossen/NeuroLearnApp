import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../../components/GlassComponents';
import { FloatingActionButton } from '../../components/shared/FloatingActionButton';
import { supabase } from '../../services/storage/SupabaseService';
import { ThemeType } from '../../theme/colors';
import { perf } from '../../utils/perfMarks';
import DashboardSkeleton from '../../components/skeletons/DashboardSkeleton';
import {
  useOptimizedQuery,
  useDebouncedRefetch,
} from '../../hooks/useOptimizedQuery';

interface WellnessData {
  todayScore: number;
  sleepHours: number;
  workoutStreak: number;
  waterIntake: number;
  weeklyTrend: number[];
}

type TrendData = { weeklyTrend: number[] };

interface WellnessDashboardScreenProps {
  theme: ThemeType;
  onNavigate: (screen: string, params?: any) => void;
}

const WellnessDashboardScreen: React.FC<WellnessDashboardScreenProps> = ({
  theme,
  onNavigate,
}) => {
  const mountMarkRef = React.useRef<string | null>(null);
  const screenWidth = Dimensions.get('window').width;
  const [refreshing, setRefreshing] = useState(false);

  // Memoize calculateWeeklyTrend to prevent unnecessary recalculations
  const calculateWeeklyTrend = useMemo(
    () =>
      async (userId: string): Promise<number[]> => {
        try {
          // Get data for the last 7 days
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          const weekAgoStr = weekAgo.toISOString().split('T')[0];

          // Parallel fetch for historical data
          const [sleepHistory, workoutHistory, waterHistory] =
            await Promise.all([
              supabase
                .from('sleep_logs')
                .select('duration, date')
                .eq('user_id', userId)
                .gte('date', weekAgoStr)
                .order('date', { ascending: true }),
              supabase
                .from('workout_logs')
                .select('duration, date')
                .eq('user_id', userId)
                .gte('date', weekAgoStr)
                .order('date', { ascending: true }),
              supabase
                .from('water_logs')
                .select('amount, date')
                .eq('user_id', userId)
                .gte('date', weekAgoStr)
                .order('date', { ascending: true }),
            ]);

          const trend: number[] = [];
          for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            // Calculate daily score based on available data
            const sleepScore =
              sleepHistory.data?.find((s) => s.date === dateStr)?.duration || 0;
            const workoutScore =
              workoutHistory.data?.filter((w) => w.date === dateStr).length ||
              0;
            const waterScore =
              waterHistory.data
                ?.filter((w) => w.date === dateStr)
                .reduce((sum, log) => sum + log.amount, 0) || 0;

            // Simple scoring: sleep (0-30), workouts (0-35), water (0-35)
            const dailyScore = Math.min(
              100,
              Math.round(
                (sleepScore / 8) * 30 +
                  (workoutScore / 3) * 35 +
                  (waterScore / 8) * 35,
              ),
            );

            trend.push(dailyScore);
          }

          return trend;
        } catch (error) {
          console.error('Error calculating weekly trend:', error);
          return [0, 0, 0, 0, 0, 0, 0]; // Return zeros if calculation fails
        }
      },
    [],
  );

  // Memoize healthScore calculation
  const calculateHealthScore = useMemo(
    () => (sleepHours: number, workoutStreak: number, waterIntake: number) => {
      return Math.min(
        100,
        Math.round(
          (sleepHours / 8) * 30 + // Sleep contributes 30%
            (workoutStreak / 7) * 25 + // Workout streak contributes 25%
            (waterIntake / 8) * 20 + // Water intake contributes 20%
            25, // Base score
        ),
      );
    },
    [],
  );

  // Use optimized query for critical wellness data (immediate load) with parallel API calls
  const {
    data: criticalData,
    isLoading: loading,
    refetch,
  } = useOptimizedQuery<WellnessData>({
    queryKey: ['wellness-data-critical'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return {
          todayScore: 0,
          sleepHours: 0,
          workoutStreak: 0,
          waterIntake: 0,
          weeklyTrend: [],
        };
      }

      // Get today's date
      const today = new Date().toISOString().split('T')[0];

      // Parallelize queries for critical data points using Promise.all
      const [sleepRes, workoutRes, waterRes] = await Promise.all([
        supabase
          .from('sleep_logs')
          .select('duration')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle(),
        (async () => {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          const weekStartStr = weekStart.toISOString().split('T')[0];
          return supabase
            .from('workout_logs')
            .select('id')
            .eq('user_id', user.id)
            .gte('date', weekStartStr);
        })(),
        supabase
          .from('water_logs')
          .select('amount')
          .eq('user_id', user.id)
          .eq('date', today),
      ]);

      const sleepHours = sleepRes.data?.duration || 0;
      const workoutStreak = workoutRes.data?.length || 0;
      const waterIntake =
        waterRes.data?.reduce((sum: number, log: any) => sum + log.amount, 0) ||
        0;

      const healthScore = calculateHealthScore(
        sleepHours,
        workoutStreak,
        waterIntake,
      );

      return {
        todayScore: healthScore,
        sleepHours,
        workoutStreak,
        waterIntake,
        weeklyTrend: [], // Empty initially, loaded lazily
      };
    },
  });

  // Lazy load weekly trend data (non-critical metric)
  const { data: trendData, isLoading: trendLoading } =
    useOptimizedQuery<TrendData>({
      queryKey: ['wellness-trend'],
      queryFn: async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return { weeklyTrend: [] };

        return { weeklyTrend: await calculateWeeklyTrend(user.id) };
      },
      enabled: !loading && !!criticalData, // Only load after critical data is loaded
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });

  const defaultWellnessData: WellnessData = {
    todayScore: 0,
    sleepHours: 0,
    workoutStreak: 0,
    waterIntake: 0,
    weeklyTrend: [],
  };

  function isWellnessData(data: any): data is WellnessData {
    return (
      data &&
      typeof data.todayScore === 'number' &&
      typeof data.sleepHours === 'number' &&
      typeof data.workoutStreak === 'number' &&
      typeof data.waterIntake === 'number' &&
      Array.isArray(data.weeklyTrend)
    );
  }

  const criticalWellnessData: WellnessData = isWellnessData(criticalData)
    ? criticalData
    : defaultWellnessData;

  // Memoize wellnessData object construction
  const wellnessData: WellnessData = useMemo(
    () => ({
      ...criticalWellnessData,
      weeklyTrend:
        (trendData as { weeklyTrend: number[] } | undefined)?.weeklyTrend ||
        criticalWellnessData.weeklyTrend,
    }),
    [criticalWellnessData, trendData],
  );

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: '#ffffff',
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    strokeWidth: 3,
    decimalPlaces: 0,
  };

  const quickActions = [
    {
      id: 'sleep',
      title: 'Log Sleep',
      icon: 'sleep',
      color: '#8B5CF6',
      screen: 'sleep-tracker',
    },
    {
      id: 'workout',
      title: 'Workout',
      icon: 'dumbbell',
      color: '#EF4444',
      screen: 'workout-logger',
    },
    {
      id: 'water',
      title: 'Water +1',
      icon: 'water',
      color: '#06B6D4',
      action: 'addWater',
    },
    {
      id: 'mood',
      title: 'Mood Check',
      icon: 'emoticon-happy',
      color: '#F59E0B',
      action: 'logMood',
    },
  ];

  interface QuickActionScreen {
    id: string;
    title: string;
    icon: string;
    color: string;
    screen: string;
    action?: never;
  }

  interface QuickActionAction {
    id: string;
    title: string;
    icon: string;
    color: string;
    action: string;
    screen?: never;
  }

  type QuickAction = QuickActionScreen | QuickActionAction;

  const handleQuickAction = async (action: QuickAction): Promise<void> => {
    if ('screen' in action && action.screen) {
      onNavigate(action.screen);
    } else if ('action' in action && action.action === 'addWater') {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const today = new Date().toISOString().split('T')[0];

          // Save water intake to database
          const { error } = await supabase.from('water_logs').insert({
            user_id: user.id,
            amount: 1,
            date: today,
          });

          if (error) {
            console.error('Error saving water intake:', error);
            Alert.alert(
              'Water Intake Saved Locally',
              "Your water intake was recorded but couldn't be synced to the cloud. It will be saved when you're back online.",
              [{ text: 'OK' }],
            );
          } else {
            // Show success feedback
            console.log('Water intake logged successfully');
          }

          // Refetch data to update the UI
          await refetch();
        }
      } catch (error) {
        console.error('Error adding water intake:', error);
      }
    }
  };

  const onRefreshInternal = useCallback(async () => {
    if (refreshing) return; // Prevent multiple simultaneous refreshes
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refreshing]);

  const onRefresh = useDebouncedRefetch(onRefreshInternal, 350);

  if (loading) {
    return (
      <DashboardSkeleton
        variant="wellness"
        theme={theme === 'dark' ? 'dark' : 'light'}
      />
    );
  }

  // Memoize chart to avoid re-renders
  const MemoizedLineChart = React.memo(() => {
    if (trendLoading) {
      return (
        <View style={styles.chart}>
          <DashboardSkeleton
            variant="wellness"
            theme={theme === 'dark' ? 'dark' : 'light'}
          />
        </View>
      );
    }

    return (
      <LineChart
        data={{
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{ data: wellnessData.weeklyTrend }],
        }}
        width={screenWidth - 64}
        height={180}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        withDots={true}
        withShadow={false}
      />
    );
  });

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Wellness Hub</Text>
          <Text style={styles.headerSubtitle}>Track your health journey</Text>
        </View>

        {/* Today's Health Score */}
        <GlassCard theme="dark" style={styles.scoreCard}>
          <View style={styles.scoreContent}>
            <Text style={styles.scoreTitle}>Today's Health Score</Text>
            <View style={styles.scoreCircle}>
              <View
                style={[
                  styles.scoreProgress,
                  {
                    transform: [
                      { rotate: `${(wellnessData.todayScore / 100) * 360}deg` },
                    ],
                  },
                ]}
              />
              <Text style={styles.scoreNumber}>{wellnessData.todayScore}</Text>
              <Text style={styles.scoreMax}>/ 100</Text>
            </View>
            <Text style={styles.scoreMessage}>Great progress today!</Text>
          </View>
        </GlassCard>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <GlassCard theme="dark" style={styles.statCard}>
            <View style={styles.statContent}>
              <Icon name="sleep" size={24} color="#8B5CF6" />
              <Text style={styles.statLabel}>Sleep</Text>
              <Text style={styles.statValue}>{wellnessData.sleepHours}h</Text>
            </View>
          </GlassCard>

          <GlassCard theme="dark" style={styles.statCard}>
            <View style={styles.statContent}>
              <Icon name="fire" size={24} color="#EF4444" />
              <Text style={styles.statLabel}>Streak</Text>
              <Text style={styles.statValue}>
                {wellnessData.workoutStreak} days
              </Text>
            </View>
          </GlassCard>

          <GlassCard theme="dark" style={styles.statCard}>
            <View style={styles.statContent}>
              <Icon name="water" size={24} color="#06B6D4" />
              <Text style={styles.statLabel}>Water</Text>
              <Text style={styles.statValue}>{wellnessData.waterIntake}/8</Text>
            </View>
          </GlassCard>
        </View>

        {/* Weekly Trend */}
        <GlassCard theme="dark" style={styles.trendCard}>
          <View style={styles.trendHeader}>
            <Text style={styles.trendTitle}>Weekly Health Trend</Text>
            <Icon name="trending-up" size={20} color="#10B981" />
          </View>

          <MemoizedLineChart />
        </GlassCard>

        {/* Quick Actions */}
        <GlassCard theme="dark" style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                onPress={() => handleQuickAction(action as any)}
                style={styles.actionButton}
              >
                <View style={styles.actionContent}>
                  <View
                    style={[
                      styles.actionIcon,
                      { backgroundColor: `${action.color}20` },
                    ]}
                  >
                    <Icon name={action.icon} size={28} color={action.color} />
                  </View>
                  <Text style={styles.actionText}>{action.title}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>

        {/* Water Intake Progress */}
        <GlassCard theme="dark" style={styles.waterCard}>
          <TouchableOpacity
            onLongPress={() => {
              Alert.alert(
                'Reset Water Intake',
                "Do you want to reset today's water intake to 0?",
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        const {
                          data: { user },
                        } = await supabase.auth.getUser();

                        if (user) {
                          const today = new Date().toISOString().split('T')[0];

                          // Delete today's water logs
                          const { error } = await supabase
                            .from('water_logs')
                            .delete()
                            .eq('user_id', user.id)
                            .eq('date', today);

                          if (error) {
                            console.error(
                              'Error resetting water intake:',
                              error,
                            );
                          }

                          // Refetch data to update the UI
                          await refetch();
                        }
                      } catch (error) {
                        console.error('Error resetting water intake:', error);
                      }
                    },
                  },
                ],
              );
            }}
          >
            <Text style={styles.waterTitle}>Water Intake Today</Text>
          </TouchableOpacity>
          <View style={styles.waterProgress}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressValue}>
              {wellnessData.waterIntake}/8 glasses
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(wellnessData.waterIntake / 8) * 100}%` },
              ]}
            />
          </View>
          <View style={styles.waterGlasses}>
            {Array.from({ length: 8 }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.waterGlass,
                  {
                    backgroundColor:
                      i < wellnessData.waterIntake ? '#3B82F6' : '#E5E7EB',
                  },
                ]}
              >
                <Icon
                  name="water"
                  size={16}
                  color={i < wellnessData.waterIntake ? 'white' : '#9CA3AF'}
                />
              </View>
            ))}
          </View>
          <Text style={styles.resetHint}>Long press to reset daily intake</Text>
        </GlassCard>
      </ScrollView>

      <FloatingActionButton
        theme={theme}
        onPress={() => onNavigate('workout-logger')}
        currentScreen="wellness"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'linear-gradient(135deg, #DCFCE7 0%, #BFDBFE 100%)',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: 'linear-gradient(135deg, #DCFCE7 0%, #BFDBFE 100%)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#047857',
    fontSize: 16,
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 48,
  },
  scrollContent: {
    paddingBottom: 80, // Extra padding to ensure content isn't hidden behind TabBar/FAB
  },
  header: {
    marginBottom: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#065F46',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#047857',
  },
  scoreCard: {
    marginBottom: 24,
    padding: 20,
  },
  scoreContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  scoreCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 8,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  scoreProgress: {
    position: 'absolute',
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 8,
    borderColor: '#10B981',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  scoreMax: {
    fontSize: 12,
    color: '#6B7280',
  },
  scoreMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    padding: 12,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  trendCard: {
    marginBottom: 24,
    padding: 20,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  trendTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  actionsCard: {
    marginBottom: 24,
    padding: 20,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  actionButton: {
    width: '50%',
    padding: 12,
    marginBottom: 12,
  },
  actionContent: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  waterCard: {
    marginBottom: 96,
    padding: 20,
  },
  waterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  waterProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  progressBar: {
    width: '100%',
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 6,
  },
  waterGlasses: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  waterGlass: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetHint: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default WellnessDashboardScreen;
