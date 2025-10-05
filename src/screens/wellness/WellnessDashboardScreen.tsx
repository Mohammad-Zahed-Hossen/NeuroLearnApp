import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LineChart } from 'react-native-chart-kit';
import { GlassCard } from '../../components/GlassComponents';
import { FloatingActionButton } from '../../components/shared/FloatingActionButton';
import { supabase } from '../../services/storage/SupabaseService';
import { ThemeType } from '../../theme/colors';

interface WellnessDashboardScreenProps {
  theme: ThemeType;
  onNavigate: (screen: string, params?: any) => void;
}

const WellnessDashboardScreen: React.FC<WellnessDashboardScreenProps> = ({
  theme,
  onNavigate,
}) => {
  const screenWidth = Dimensions.get('window').width;
  const [wellnessData, setWellnessData] = useState({
    todayScore: 75,
    sleepHours: 7.5,
    workoutStreak: 3,
    waterIntake: 6,
    weeklyTrend: [65, 70, 68, 75, 80, 78, 75],
  });

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

  interface WellnessData {
    todayScore: number;
    sleepHours: number;
    workoutStreak: number;
    waterIntake: number;
    weeklyTrend: number[];
  }

  const handleQuickAction = (action: QuickAction): void => {
    if ('screen' in action && action.screen) {
      onNavigate(action.screen);
    } else if ('action' in action && action.action === 'addWater') {
      setWellnessData((prev: WellnessData) => ({
        ...prev,
        waterIntake: Math.min(prev.waterIntake + 1, 8),
      }));
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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

          <LineChart
            data={{
              labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              datasets: [
                {
                  data: wellnessData.weeklyTrend,
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                  strokeWidth: 3,
                },
              ],
            }}
            width={screenWidth - 64}
            height={180}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withDots={true}
            withShadow={false}
          />
        </GlassCard>

        {/* Quick Actions */}
        <GlassCard theme="dark" style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                onPress={() => handleQuickAction(action)}
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
          <Text style={styles.waterTitle}>Water Intake Today</Text>
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
});

export default WellnessDashboardScreen;
