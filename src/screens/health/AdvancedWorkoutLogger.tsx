import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  Dimensions,
  Vibration
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BarChart, LineChart } from 'react-native-chart-kit';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { format, differenceInDays } from 'date-fns';

import { GlassCard } from '../../components/GlassComponents';
import { supabase } from '../../services/storage/SupabaseService';
import { colors } from '../../theme/colors';

interface AdvancedWorkoutLoggerProps {
  userId: string;
  theme: 'light' | 'dark';
  onNavigate?: (screen: string) => void;
}

interface Workout {
  id: string;
  user_id: string;
  workout_type: string;
  duration: number;
  intensity: number;
  calories_burned?: number;
  heart_rate_avg?: number;
  heart_rate_max?: number;
  recovery_score?: number;
  notes?: string;
  date: string;
  created_at: string;
}

interface BiometricData {
  heartRate: number;
  hrvScore: number;
  recoveryStatus: 'optimal' | 'good' | 'caution' | 'rest';
  stressLevel: number;
}

interface WeeklyProgress {
  totalWorkouts: number;
  totalDuration: number;
  avgIntensity: number;
  caloriesBurned: number;
}

const AdvancedWorkoutLogger: React.FC<AdvancedWorkoutLoggerProps> = ({
  userId,
  theme,
  onNavigate
}) => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [workoutType, setWorkoutType] = useState('');
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState(3);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Advanced metrics
  const [biometricData, setBiometricData] = useState<BiometricData | null>(null);
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress | null>(null);
  const [streakData, setStreakData] = useState({ current: 0, longest: 0 });
  const [isRecording, setIsRecording] = useState(false);

  const screenWidth = Dimensions.get('window').width;

  // Enhanced workout types with scientific categorization
  const workoutTypes = [
    {
      id: 'hiit',
      name: 'HIIT',
      icon: 'flash',
      color: '#EF4444',
      category: 'cardio',
      targetZone: '85-95%',
      calorieMultiplier: 1.4
    },
    {
      id: 'strength',
      name: 'Strength',
      icon: 'dumbbell',
      color: '#8B5CF6',
      category: 'anaerobic',
      targetZone: '70-85%',
      calorieMultiplier: 1.0
    },
    {
      id: 'cardio',
      name: 'Cardio',
      icon: 'run',
      color: '#10B981',
      category: 'aerobic',
      targetZone: '60-75%',
      calorieMultiplier: 1.2
    },
    {
      id: 'yoga',
      name: 'Yoga',
      icon: 'meditation',
      color: '#F59E0B',
      category: 'flexibility',
      targetZone: '40-60%',
      calorieMultiplier: 0.6
    },
    {
      id: 'pilates',
      name: 'Pilates',
      icon: 'yoga',
      color: '#EC4899',
      category: 'core',
      targetZone: '50-70%',
      calorieMultiplier: 0.8
    },
    {
      id: 'cycling',
      name: 'Cycling',
      icon: 'bike',
      color: '#06B6D4',
      category: 'cardio',
      targetZone: '65-80%',
      calorieMultiplier: 1.1
    }
  ];

  // Animations
  const heartRateAnimation = useSharedValue(0);
  const recoveryAnimation = useSharedValue(0);
  const pulseAnimation = useSharedValue(1);

  useEffect(() => {
    loadWorkoutData();
    loadBiometricData();
    calculateProgress();
    startHeartRateAnimation();
  }, [userId]);

  const startHeartRateAnimation = () => {
    heartRateAnimation.value = withTiming(1, { duration: 600 });
  };

  const loadWorkoutData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(30);

      if (error) throw error;
      setWorkouts(data || []);

      // Calculate streaks
      calculateStreaks(data || []);
    } catch (error) {
      console.error('Error loading workout data:', error);
    }
  };

  const loadBiometricData = async () => {
    try {
      // Simulate biometric data - would integrate with actual sensors/APIs
      const mockBiometrics: BiometricData = {
        heartRate: 72 + Math.floor(Math.random() * 20),
        hrvScore: 45 + Math.floor(Math.random() * 30),
        recoveryStatus: ['optimal', 'good', 'caution', 'rest'][Math.floor(Math.random() * 4)] as any,
        stressLevel: Math.floor(Math.random() * 100)
      };

      setBiometricData(mockBiometrics);

      // Animate recovery indicator
      recoveryAnimation.value = withTiming(
        mockBiometrics.recoveryStatus === 'optimal' ? 1 :
        mockBiometrics.recoveryStatus === 'good' ? 0.75 :
        mockBiometrics.recoveryStatus === 'caution' ? 0.5 : 0.25,
        { duration: 2000 }
      );
    } catch (error) {
      console.error('Error loading biometric data:', error);
    }
  };

  const calculateProgress = async () => {
    if (workouts.length === 0) return;

    const last7Days = workouts.filter(w =>
      differenceInDays(new Date(), new Date(w.date)) <= 7
    );

    const progressData = {
      totalWorkouts: last7Days.length,
      totalDuration: last7Days.reduce((sum, w) => sum + w.duration, 0),
      avgIntensity: last7Days.reduce((sum, w) => sum + w.intensity, 0) / last7Days.length,
      caloriesBurned: last7Days.reduce((sum, w) => sum + (w.calories_burned || 0), 0)
    };

    setWeeklyProgress(progressData);
  };

  const calculateStreaks = (workoutData: Workout[]) => {
    if (workoutData.length === 0) return;

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    const sortedWorkouts = workoutData.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Calculate current streak
    const today = new Date();
    for (let i = 0; i < sortedWorkouts.length; i++) {
      const workoutDate = new Date(sortedWorkouts[i].date);
      const daysDiff = differenceInDays(today, workoutDate);

      if (i === 0 && daysDiff <= 1) {
        currentStreak = 1;
      } else if (daysDiff === currentStreak + 1 || daysDiff === currentStreak) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate longest streak
    for (let i = 1; i < sortedWorkouts.length; i++) {
      const current = new Date(sortedWorkouts[i].date);
      const previous = new Date(sortedWorkouts[i-1].date);
      const daysDiff = differenceInDays(previous, current);

      if (daysDiff <= 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    setStreakData({ current: currentStreak, longest: longestStreak });
  };

  const estimateCalories = (type: string, duration: number, intensity: number): number => {
    const workoutType = workoutTypes.find(t => t.id === type);
    const baseCalories = 300; // Base calories per hour for average person
    const multiplier = workoutType?.calorieMultiplier || 1;
    const intensityFactor = intensity / 3; // Scale 1-5 to 0.33-1.67

    return Math.round((baseCalories * (duration / 60) * multiplier * intensityFactor));
  };

  const logWorkout = async () => {
    if (!workoutType || !duration) {
      Alert.alert('Error', 'Please select workout type and duration');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const calories = estimateCalories(workoutType, parseInt(duration), intensity);

      const workoutData = {
        user_id: user.id,
        workout_type: workoutType,
        duration: parseInt(duration),
        intensity,
        calories_burned: calories,
        heart_rate_avg: biometricData?.heartRate,
        recovery_score: biometricData?.hrvScore,
        notes,
        date: new Date().toISOString().split('T')[0],
      };

      const { error } = await supabase.from('workout_logs').insert(workoutData);

      if (error) throw error;

      // Success feedback with haptic
      Vibration.vibrate([100, 50, 100]);
      Alert.alert(
        'Workout Logged! 💪',
        `Great job! You burned ~${calories} calories and maintained ${intensity}/5 intensity.`,
        [{ text: 'Awesome!', style: 'default' }]
      );

      // Reset form
      setWorkoutType('');
      setDuration('');
      setIntensity(3);
      setNotes('');

      // Reload data
      loadWorkoutData();
      calculateProgress();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const startQuickWorkout = (type: string) => {
    setWorkoutType(type);
    setIsRecording(true);

    // Start animation
    pulseAnimation.value = withTiming(1.2, { duration: 300 });

    Alert.alert(
      '🏃‍♂️ Quick Workout Started!',
      `Timer started for ${workoutTypes.find(t => t.id === type)?.name}. The app will track your session.`,
      [
        { text: 'Stop & Log', onPress: () => setIsRecording(false) },
        { text: 'Continue', style: 'default' }
      ]
    );
  };

  // Animated styles
  const heartRateStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartRateAnimation.value }],
    opacity: heartRateAnimation.value
  }));

  const recoveryStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolate(
      recoveryAnimation.value,
      [0, 1],
      ['#EF4444', '#10B981'] as any
    )
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnimation.value }]
  }));

  const getIntensityColor = (level: number): string => {
    const colors = ['#10B981', '#22C55E', '#F59E0B', '#EF4444', '#DC2626'];
    return colors[level - 1] || '#6B7280';
  };

  const getIntensityText = (level: number): string => {
    const texts = ['Light', 'Easy', 'Moderate', 'Hard', 'Intense'];
    return texts[level - 1] || 'Unknown';
  };

  const getWorkoutTypeInfo = (id: string) => {
    return workoutTypes.find(type => type.id === id);
  };

  const renderBiometricPanel = () => (
    <GlassCard theme={theme} style={styles.biometricCard}>
      <Text style={styles.biometricTitle}>🏥 Real-time Biometrics</Text>

      <View style={styles.biometricGrid}>
        <View style={styles.biometricItem}>
          <Reanimated.View style={[styles.heartIcon, heartRateStyle]}>
            <Icon name="heart" size={24} color="#EF4444" />
          </Reanimated.View>
          <Text style={styles.biometricValue}>{biometricData?.heartRate || '--'}</Text>
          <Text style={styles.biometricLabel}>BPM</Text>
        </View>

        <View style={styles.biometricItem}>
          <Text style={styles.biometricValue}>{biometricData?.hrvScore || '--'}</Text>
          <Text style={styles.biometricLabel}>HRV Score</Text>
        </View>

        <View style={styles.biometricItem}>
          <Reanimated.View style={[styles.recoveryIndicator, recoveryStyle]}>
            <Text style={styles.recoveryText}>
              {biometricData?.recoveryStatus?.toUpperCase() || 'UNKNOWN'}
            </Text>
          </Reanimated.View>
          <Text style={styles.biometricLabel}>Recovery</Text>
        </View>

        <View style={styles.biometricItem}>
          <Text style={[
            styles.biometricValue,
            { color: (biometricData?.stressLevel || 0) > 70 ? '#EF4444' : '#10B981' }
          ]}>
            {biometricData?.stressLevel || '--'}%
          </Text>
          <Text style={styles.biometricLabel}>Stress</Text>
        </View>
      </View>

      {biometricData?.recoveryStatus === 'rest' && (
        <View style={styles.recoveryWarning}>
          <Icon name="alert" size={20} color="#EF4444" />
          <Text style={styles.recoveryWarningText}>
            Recovery needed. Consider light activity or rest day.
          </Text>
        </View>
      )}
    </GlassCard>
  );

  const renderQuickActions = () => (
    <GlassCard theme={theme} style={styles.quickActionsCard}>
      <Text style={styles.cardTitle}>⚡ Quick Start</Text>
      <Text style={styles.quickActionsSubtitle}>
        Start a workout with biometric monitoring
      </Text>

      <View style={styles.quickActionsGrid}>
        {workoutTypes.slice(0, 4).map((type) => (
          <Reanimated.View key={type.id} style={pulseStyle}>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: type.color + '20' }]}
              onPress={() => startQuickWorkout(type.id)}
            >
              <Icon name={type.icon} size={24} color={type.color} />
              <Text style={[styles.quickActionText, { color: type.color }]}>
                {type.name}
              </Text>
              <Text style={styles.quickActionZone}>{type.targetZone}</Text>
            </TouchableOpacity>
          </Reanimated.View>
        ))}
      </View>

      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Recording workout...</Text>
        </View>
      )}
    </GlassCard>
  );

  const renderProgressChart = () => {
    if (!weeklyProgress) return null;

    const chartData = {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        data: [45, 0, 60, 30, 90, 75, 45], // Mock weekly data
        color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
        strokeWidth: 3
      }]
    };

    return (
      <GlassCard theme={theme} style={styles.chartCard}>
        <Text style={styles.chartTitle}>📊 Weekly Progress</Text>

        <LineChart
          data={chartData}
          width={screenWidth - 64}
          height={180}
          chartConfig={{
            backgroundColor: 'transparent',
            backgroundGradientFrom: 'transparent',
            backgroundGradientTo: 'transparent',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
            style: { borderRadius: 16 },
          }}
          bezier
          style={styles.chart}
          withShadow={false}
        />

        <View style={styles.progressStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{weeklyProgress.totalWorkouts}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{weeklyProgress.totalDuration}min</Text>
            <Text style={styles.statLabel}>Total Time</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{weeklyProgress.caloriesBurned}</Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{streakData.current} 🔥</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
        </View>
      </GlassCard>
    );
  };

  const renderWorkoutForm = () => (
    <GlassCard theme={theme} style={styles.logCard}>
      <Text style={styles.cardTitle}>📝 Log Workout</Text>

      <Text style={styles.inputLabel}>Workout Type</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.workoutTypesScroll}
      >
        {workoutTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            onPress={() => setWorkoutType(type.id)}
            style={[
              styles.workoutTypeChip,
              {
                backgroundColor: workoutType === type.id ? type.color : type.color + '20',
                borderColor: type.color
              }
            ]}
          >
            <Icon
              name={type.icon}
              size={18}
              color={workoutType === type.id ? 'white' : type.color}
            />
            <Text style={[
              styles.workoutTypeChipText,
              { color: workoutType === type.id ? 'white' : type.color }
            ]}>
              {type.name}
            </Text>
            <Text style={[
              styles.workoutTypeZone,
              { color: workoutType === type.id ? 'rgba(255,255,255,0.8)' : type.color }
            ]}>
              {type.targetZone}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.inputLabel}>Duration (minutes)</Text>
      <TextInput
        style={styles.textInput}
        value={duration}
        onChangeText={setDuration}
        keyboardType="numeric"
        placeholder="e.g., 45"
        placeholderTextColor="#9CA3AF"
      />

      <Text style={styles.inputLabel}>Intensity Level</Text>
      <View style={styles.intensityLevels}>
        {[1, 2, 3, 4, 5].map((level) => (
          <TouchableOpacity
            key={level}
            onPress={() => setIntensity(level)}
            style={[
              styles.intensityButton,
              {
                backgroundColor: intensity >= level ? getIntensityColor(level) : '#F3F4F6',
                borderColor: getIntensityColor(level)
              }
            ]}
          >
            <Text style={[
              styles.intensityText,
              { color: intensity >= level ? 'white' : getIntensityColor(level) }
            ]}>
              {level}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.intensityLabel}>
        Current: {getIntensityText(intensity)}
      </Text>

      {workoutType && duration && (
        <View style={styles.estimationPanel}>
          <Text style={styles.estimationTitle}>💡 Estimation</Text>
          <Text style={styles.estimationText}>
            Calories: ~{estimateCalories(workoutType, parseInt(duration) || 0, intensity)}
          </Text>
          <Text style={styles.estimationText}>
            Target Zone: {getWorkoutTypeInfo(workoutType)?.targetZone}
          </Text>
        </View>
      )}

      <Text style={styles.inputLabel}>Notes (Optional)</Text>
      <TextInput
        style={[styles.textInput, styles.notesInput]}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        placeholder="How did you feel? Any observations?"
        placeholderTextColor="#9CA3AF"
      />

      <TouchableOpacity
        style={[
          styles.logButton,
          {
            backgroundColor: (!workoutType || !duration || loading) ? '#9CA3AF' : '#6366F1',
            opacity: (!workoutType || !duration || loading) ? 0.6 : 1
          }
        ]}
        onPress={logWorkout}
        disabled={!workoutType || !duration || loading}
      >
        <Text style={styles.logButtonText}>
          {loading ? 'Analyzing Workout...' : '💪 Log Workout'}
        </Text>
      </TouchableOpacity>
    </GlassCard>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors[theme].background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate?.('wellness')}>
          <Icon name="arrow-left" size={24} color={colors[theme].text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors[theme].text }]}>
          Smart Workout Logger
        </Text>
        <TouchableOpacity onPress={loadBiometricData}>
          <Icon name="refresh" size={24} color={colors[theme].text} />
        </TouchableOpacity>
      </View>

      {renderBiometricPanel()}
      {renderQuickActions()}
      {renderProgressChart()}
      {renderWorkoutForm()}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  biometricCard: {
    margin: 16,
    padding: 20,
  },
  biometricTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  biometricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  biometricItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  heartIcon: {
    marginBottom: 8,
  },
  biometricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  biometricLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  recoveryIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  recoveryText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  recoveryWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  recoveryWarningText: {
    fontSize: 14,
    color: '#991B1B',
    marginLeft: 8,
    flex: 1,
  },
  quickActionsCard: {
    margin: 16,
    padding: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  quickActionsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  quickActionZone: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 14,
    color: '#991B1B',
    fontWeight: '500',
  },
  chartCard: {
    margin: 16,
    padding: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  logCard: {
    margin: 16,
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  workoutTypesScroll: {
    marginBottom: 8,
  },
  workoutTypeChip: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    minWidth: 80,
  },
  workoutTypeChipText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  workoutTypeZone: {
    fontSize: 10,
    marginTop: 2,
  },
  textInput: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  intensityLevels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  intensityButton: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 2,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  intensityText: {
    fontSize: 16,
    fontWeight: '600',
  },
  intensityLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  estimationPanel: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  estimationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 8,
  },
  estimationText: {
    fontSize: 14,
    color: '#047857',
    marginBottom: 4,
  },
  logButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  logButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 100,
  },
});

export default AdvancedWorkoutLogger;
