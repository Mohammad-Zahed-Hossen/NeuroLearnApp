import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { GlassCard } from '../../components/GlassComponents';
import { supabase } from '../../services/storage/SupabaseService';
import { ThemeType, colors } from '../../theme/colors';

interface Workout {
  id: string;
  user_id: string;
  workout_type: string;
  duration: number;
  intensity: number;
  notes?: string;
  date: string;
  calories_burned?: number;
}

interface WorkoutLoggerScreenProps {
  onBack?: () => void;
  theme: ThemeType;
}

const WorkoutLoggerScreen: React.FC<WorkoutLoggerScreenProps> = ({
  onBack,
  theme,
}) => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [workoutType, setWorkoutType] = useState('');
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState(3);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState({
    totalWorkouts: 0,
    totalMinutes: 0,
    streak: 0,
    progress: 0,
  });
  const [calories, setCalories] = useState(0);
  const [stats, setStats] = useState({
    avgTime: 0,
    favorite: '',
    totalCalories: 0,
  });

  const workoutTypes = [
    { id: 'cardio', name: 'Cardio', icon: 'run', color: '#EF4444' },
    { id: 'strength', name: 'Strength', icon: 'dumbbell', color: '#8B5CF6' },
    { id: 'yoga', name: 'Yoga', icon: 'meditation', color: '#10B981' },
    { id: 'sports', name: 'Sports', icon: 'basketball', color: '#F59E0B' },
    { id: 'walking', name: 'Walking', icon: 'walk', color: '#06B6D4' },
    { id: 'cycling', name: 'Cycling', icon: 'bike', color: '#EC4899' },
  ];

  const animatedScales = useMemo(() => {
    return workoutTypes.reduce((acc, type) => {
      acc[type.id] = new Animated.Value(1);
      return acc;
    }, {} as Record<string, Animated.Value>);
  }, [workoutTypes]);

  // Create properly typed animated values for transform
  const getAnimatedScale = (typeId: string) => {
    return animatedScales[typeId] || new Animated.Value(1);
  };

  const workoutCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    workouts.forEach(
      (w) => (counts[w.workout_type] = (counts[w.workout_type] || 0) + 1),
    );
    return counts;
  }, [workouts]);

  useEffect(() => {
    loadWorkouts();
  }, []);

  useEffect(() => {
    calculateWeeklySummary();
  }, [workouts]);

  const loadWorkouts = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('workout_logs')
        .select(
          'id, user_id, workout_type, duration, intensity, notes, date, calories_burned, created_at',
        )
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setWorkouts((data || []) as Workout[]);
    } catch (error) {
      console.error('Error loading workouts:', error);
    }
  };

  const calculateWeeklySummary = () => {
    if (workouts.length === 0) {
      setWeeklySummary({
        totalWorkouts: 0,
        totalMinutes: 0,
        streak: 0,
        progress: 0,
      });
      setCalories(0);
      setStats({
        avgTime: 0,
        favorite: '',
        totalCalories: 0,
      });
      return;
    }

    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday start

    let totalWorkouts = 0;
    let totalMinutes = 0;
    let daysWorkedOut = new Set<string>();

    workouts.forEach((w) => {
      const workoutDate = new Date(w.date);
      if (workoutDate >= startOfWeek && workoutDate <= today) {
        totalWorkouts++;
        totalMinutes += w.duration;
        const dateKey = workoutDate.toISOString().split('T')[0] || '';
        if (dateKey) daysWorkedOut.add(dateKey);
      }
    });

    // Calculate streak (consecutive days)
    let streak = 0;
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      if (dateStr && daysWorkedOut.has(dateStr)) {
        streak++;
      } else {
        break;
      }
    }

    const progress = (streak / 7) * 100;

    // Simple calorie estimate: duration * intensity * 5 (cal/min)
    const calEstimate = workouts.reduce(
      (acc, w) => acc + w.duration * w.intensity * 5,
      0,
    );

    // Calculate stats
    const avgTime =
      workouts.length > 0 ? Math.round(totalMinutes / workouts.length) : 0;

    // Find favorite workout type
    const typeCounts = workouts.reduce((acc: Record<string, number>, w) => {
      const key = String(w.workout_type || '');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const keys = Object.keys(typeCounts);
    const favorite =
      keys.length > 0
        ? keys.reduce((a: string, b: string) => {
            const aCount = typeCounts[a] || 0;
            const bCount = typeCounts[b] || 0;
            return aCount > bCount ? a : b;
          }, keys[0])
        : '';

    const totalCalories = Math.round(calEstimate);

    setWeeklySummary({ totalWorkouts, totalMinutes, streak, progress });
    setCalories(calEstimate);
    setStats({
      avgTime,
      favorite: getWorkoutName(String(favorite)),
      totalCalories,
    });
  };

  const logWorkout = async () => {
    if (!workoutType || !duration) {
      Alert.alert('Error', 'Please select workout type and duration');
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('workout_logs').insert({
        user_id: user.id,
        workout_type: workoutType,
        duration: parseInt(duration ?? '0'),
        intensity,
        notes,
        date: new Date().toISOString().split('T')[0],
      });

      if (error) throw error;

      Alert.alert('Success', 'Workout logged successfully');
      setWorkoutType('');
      setDuration('');
      setIntensity(3);
      setNotes('');
      loadWorkouts();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getIntensityColor = (level: number): string => {
    if (level >= 4) return '#EF4444';
    if (level >= 3) return '#F59E0B';
    return '#10B981';
  };

  const getIntensityText = (level: number): string => {
    const texts = ['Light', 'Easy', 'Moderate', 'Hard', 'Intense'];
    return texts[level - 1] || 'Unknown';
  };

  const getWorkoutName = (id: string): string => {
    return workoutTypes.find((type) => type.id === id)?.name || id;
  };

  return (
    <LinearGradient
      colors={
        theme === 'dark'
          ? ['#111827', '#1E293B', '#334155']
          : ['#FFEDD5', '#FEEBC3', '#FDE68A']
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        <View
          style={[
            styles.header,
            {
              backgroundColor:
                theme === 'dark'
                  ? 'rgba(31, 41, 55, 0.8)'
                  : 'rgba(255, 255, 255, 0.8)',
              borderRadius: 16,
              padding: 12,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => onBack?.()}
            style={styles.backButton}
          >
            <Icon
              name="arrow-left"
              size={24}
              color={theme === 'dark' ? '#FFFFFF' : '#374151'}
            />
          </TouchableOpacity>
          <Text
            style={[
              styles.headerTitle,
              { color: theme === 'dark' ? '#FFFFFF' : '#1F2937' },
            ]}
          >
            Workout Logger
          </Text>
        </View>

        {/* Weekly Activity Summary */}
        <GlassCard theme={theme} style={styles.summaryCard}>
          <Text
            style={[
              styles.summaryTitle,
              { color: theme === 'dark' ? '#FFFFFF' : '#111827' },
            ]}
          >
            This Week's Activity
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${weeklySummary.progress}%` },
              ]}
            />
          </View>
          <Text
            style={[
              styles.summaryText,
              { color: theme === 'dark' ? '#FFFFFF' : '#111827' },
            ]}
          >
            {weeklySummary.totalMinutes} mins • {weeklySummary.totalWorkouts}{' '}
            workouts
          </Text>
          <Text
            style={[
              styles.streakText,
              { color: theme === 'dark' ? '#FFFFFF' : '#111827' },
            ]}
          >
            🔥 {weeklySummary.streak} day streak
          </Text>
        </GlassCard>

        {/* Log New Workout */}
        <GlassCard theme={theme} style={styles.logCard}>
          <Text
            style={[
              styles.cardTitle,
              { color: theme === 'dark' ? '#FFFFFF' : '#111827' },
            ]}
          >
            Log Today's Workout
          </Text>

          <Text
            style={[
              styles.inputLabel,
              { color: theme === 'dark' ? '#FFFFFF' : '#111827' },
            ]}
          >
            Workout Type
          </Text>
          <View style={styles.workoutTypes}>
            {workoutTypes.map((type) => (
              <Animated.View
                key={type.id}
                style={[
                  styles.workoutTypeButton,
                  { transform: [{ scale: getAnimatedScale(type.id) }] },
                ]}
              >
                <LinearGradient
                  colors={[type.color + '20', type.color + '60']}
                  style={styles.workoutTypeGradient}
                >
                  <TouchableOpacity
                    onPress={() => {
                      setWorkoutType(type.id);
                      Animated.sequence([
                        Animated.timing(getAnimatedScale(type.id), {
                          toValue: 0.95,
                          duration: 100,
                          useNativeDriver: true,
                        }),
                        Animated.timing(getAnimatedScale(type.id), {
                          toValue: 1,
                          duration: 100,
                          useNativeDriver: true,
                        }),
                      ]).start();
                    }}
                    style={[
                      styles.workoutTypeTouchable,
                      workoutType === type.id
                        ? styles.workoutTypeSelected
                        : styles.workoutTypeUnselected,
                    ]}
                  >
                    <View style={styles.workoutTypeContent}>
                      <Icon
                        name={type.icon}
                        size={36}
                        color={
                          workoutType === type.id
                            ? '#FFFFFF'
                            : theme === 'dark'
                            ? '#E5E7EB'
                            : type.color
                        }
                      />
                      <Text
                        style={[
                          styles.workoutTypeText,
                          {
                            color:
                              workoutType === type.id
                                ? '#FFFFFF'
                                : theme === 'dark'
                                ? '#FFFFFF'
                                : '#111827',
                          },
                        ]}
                      >
                        {type.name}
                      </Text>
                      <Text
                        style={[
                          styles.workoutTypeBadge,
                          {
                            color:
                              workoutType === type.id
                                ? '#FFFFFF'
                                : theme === 'dark'
                                ? '#FFFFFF'
                                : '#111827',
                          },
                        ]}
                      >
                        {workoutCounts[type.id] || 0} times
                      </Text>
                    </View>
                  </TouchableOpacity>
                </LinearGradient>
              </Animated.View>
            ))}
          </View>

          <Text
            style={[
              styles.inputLabel,
              { color: theme === 'dark' ? '#FFFFFF' : '#111827' },
            ]}
          >
            Duration (minutes)
          </Text>
          <View style={styles.quickDurationContainer}>
            {[15, 30, 45, 60].map((dur) => (
              <TouchableOpacity
                key={dur}
                onPress={() => setDuration(dur.toString())}
                style={styles.quickDurationButton}
              >
                <Text
                  style={[
                    styles.quickDurationText,
                    { color: theme === 'dark' ? '#FFFFFF' : '#111827' },
                  ]}
                >
                  {dur}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            value={duration}
            onChangeText={setDuration}
            placeholder="30"
            keyboardType="numeric"
            style={styles.textInput}
          />
          {duration && (
            <Text
              style={[
                styles.calorieText,
                { color: theme === 'dark' ? '#FFFFFF' : '#111827' },
              ]}
            >
              ~{Math.round(parseInt(duration) * intensity * 5)} calories
            </Text>
          )}

          <Text
            style={[
              styles.inputLabel,
              { color: theme === 'dark' ? '#FFFFFF' : '#111827' },
            ]}
          >
            Intensity Level
          </Text>
          <View style={styles.intensityLevels}>
            {[1, 2, 3, 4, 5].map((level) => (
              <TouchableOpacity
                key={level}
                onPress={() => setIntensity(level)}
                style={[
                  styles.intensityButton,
                  intensity >= level
                    ? styles.intensitySelected
                    : styles.intensityUnselected,
                ]}
              >
                <Text style={styles.intensityText}>{level}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.intensityLabel}>
            {getIntensityText(intensity)}
          </Text>

          <Text
            style={[
              styles.inputLabel,
              { color: theme === 'dark' ? '#FFFFFF' : '#111827' },
            ]}
          >
            Notes (Optional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="How did it feel?"
            multiline
            numberOfLines={2}
            style={styles.textInput}
          />

          <TouchableOpacity
            onPress={logWorkout}
            disabled={loading}
            style={[
              styles.logButton,
              loading ? styles.logButtonDisabled : styles.logButtonEnabled,
            ]}
          >
            <Text style={styles.logButtonText}>
              {loading ? 'Logging...' : 'Log Workout'}
            </Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <GlassCard theme={theme} style={styles.statsCard}>
            <Text
              style={[
                styles.statsLabel,
                { color: theme === 'dark' ? '#FFFFFF' : '#111827' },
              ]}
            >
              Avg Time
            </Text>
            <Text
              style={[
                styles.statsValue,
                { color: theme === 'dark' ? '#FFFFFF' : '#111827' },
              ]}
            >
              {stats.avgTime} mins
            </Text>
          </GlassCard>
          <GlassCard theme={theme} style={styles.statsCard}>
            <Text
              style={[
                styles.statsLabel,
                { color: theme === 'dark' ? '#FFFFFF' : '#111827' },
              ]}
            >
              Favorite
            </Text>
            <Text
              style={[
                styles.statsValue,
                { color: theme === 'dark' ? '#FFFFFF' : '#111827' },
              ]}
            >
              {stats.favorite || 'None'}
            </Text>
          </GlassCard>
          <GlassCard theme={theme} style={styles.statsCard}>
            <Text
              style={[
                styles.statsLabel,
                { color: theme === 'dark' ? '#FFFFFF' : '#111827' },
              ]}
            >
              Calories
            </Text>
            <Text
              style={[
                styles.statsValue,
                { color: theme === 'dark' ? '#FFFFFF' : '#111827' },
              ]}
            >
              ~{stats.totalCalories}
            </Text>
          </GlassCard>
        </View>

        {/* Workout History */}
        <Text
          style={[
            styles.sectionTitle,
            { color: theme === 'dark' ? '#FFFFFF' : '#111827' },
          ]}
        >
          Recent Workouts
        </Text>

        {workouts.map((workout) => (
          <GlassCard key={workout.id} theme={theme} style={styles.historyCard}>
            <View style={styles.historyRow}>
              <View style={styles.historyDetails}>
                <Text
                  style={[
                    styles.historyType,
                    { color: theme === 'dark' ? '#FFFFFF' : '#111827' },
                  ]}
                >
                  {getWorkoutName(workout.workout_type)}
                </Text>
                <Text style={styles.historyDate}>
                  {new Date(workout.date).toLocaleDateString()}
                </Text>
                <View style={styles.intensityRow}>
                  <Icon
                    name="fire"
                    size={16}
                    color={getIntensityColor(workout.intensity)}
                  />
                  <Text
                    style={[
                      styles.intensityTextSmall,
                      { color: getIntensityColor(workout.intensity) },
                    ]}
                  >
                    {getIntensityText(workout.intensity)}
                  </Text>
                </View>
                {workout.notes && (
                  <Text style={styles.historyNotes}>"{workout.notes}"</Text>
                )}
              </View>
              <View style={styles.durationContainer}>
                <Text style={styles.durationText}>{workout.duration}</Text>
                <Text style={styles.durationLabel}>minutes</Text>
              </View>
            </View>
          </GlassCard>
        ))}

        {workouts.length === 0 && (
          <GlassCard theme={theme} style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <Icon
                name="run"
                size={64}
                color={theme === 'dark' ? '#6B7280' : '#9CA3AF'}
              />
              <Text
                style={[
                  styles.emptyText,
                  { color: theme === 'dark' ? '#D1D5DB' : '#6B7280' },
                ]}
              >
                No workouts logged yet.{'\n'}Start your fitness journey today!
                {'\n'}Every step counts towards a healthier you.
              </Text>
            </View>
          </GlassCard>
        )}
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFEDD5',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  logCard: {
    marginBottom: 24,
    padding: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  workoutTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  workoutTypeButton: {
    width: '48%',
    height: 100,
    marginBottom: 16,
    borderRadius: 12,
  },
  workoutTypeGradient: {
    borderRadius: 12,
    flex: 1,
  },
  workoutTypeTouchable: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    minHeight: 80,
  },
  workoutTypeSelected: {
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  workoutTypeUnselected: {
    borderColor: 'transparent',
  },
  workoutTypeContent: {
    alignItems: 'center',
  },
  workoutTypeText: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  workoutTypeBadge: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  intensityLevels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  intensityButton: {
    flex: 1,
    paddingVertical: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 2,
    minHeight: 44,
  },
  intensitySelected: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  intensityUnselected: {
    borderColor: '#E5E7EB',
  },
  intensityText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  intensityLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  logButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logButtonEnabled: {
    backgroundColor: '#EF4444',
  },
  logButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  logButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  historyCard: {
    marginBottom: 12,
    padding: 16,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDetails: {
    flex: 1,
  },
  historyType: {
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  intensityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  intensityTextSmall: {
    fontSize: 14,
    marginLeft: 4,
  },
  historyNotes: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    fontStyle: 'italic',
    fontWeight: '300',
  },
  durationContainer: {
    alignItems: 'flex-end',
  },
  durationText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  durationLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyCard: {
    marginBottom: 32,
    padding: 32,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  summaryCard: {
    marginBottom: 16,
    padding: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    marginVertical: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#EF4444',
    borderRadius: 4,
  },
  summaryText: {
    fontSize: 14,
    marginBottom: 4,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '500',
  },
  quickDurationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  quickDurationButton: {
    flex: 1,
    paddingVertical: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    minHeight: 44,
  },
  quickDurationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  calorieText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statsCard: {
    flex: 1,
    marginHorizontal: 4,
    padding: 16,
    borderRadius: 12,
  },
  statsLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: '700',
  },
});

export default WorkoutLoggerScreen;
