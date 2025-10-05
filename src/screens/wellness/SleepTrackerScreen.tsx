import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { GlassCard } from '../../components/GlassComponents';
import { supabase } from '../../services/storage/SupabaseService';

interface SleepTrackerScreenProps {
  onBack?: () => void;
}

const SleepTrackerScreen: React.FC<SleepTrackerScreenProps> = ({ onBack }) => {
  const [sleepLogs, setSleepLogs] = useState<any[]>([]);
  const [bedtime, setBedtime] = useState('');
  const [wakeTime, setWakeTime] = useState('');
  const [sleepQuality, setSleepQuality] = useState(3);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSleepLogs();
  }, []);

  const loadSleepLogs = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('sleep_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(7);

      if (error) throw error;
      setSleepLogs(data || []);
    } catch (error) {
      console.error('Error loading sleep logs:', error);
    }
  };

  interface SleepDurationParams {
    bedtime: string;
    wakeTime: string;
  }

  const calculateSleepDuration = ({
    bedtime,
    wakeTime,
  }: SleepDurationParams): number => {
    const bed = new Date(`2025-10-01 ${bedtime}`);
    let wake = new Date(`2025-10-01 ${wakeTime}`);

    if (wake < bed) {
      wake = new Date(`2024-01-02 ${wakeTime}`);
    }

    const diff = wake.getTime() - bed.getTime();
    return diff / (1000 * 60 * 60);
  };

  const logSleep = async () => {
    if (!bedtime || !wakeTime) {
      Alert.alert('Error', 'Please set both bedtime and wake time');
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const duration = calculateSleepDuration({ bedtime, wakeTime });

      const { error } = await supabase.from('sleep_logs').insert({
        user_id: user.id,
        bedtime,
        wake_time: wakeTime,
        duration,
        quality: sleepQuality,
        date: new Date().toISOString().split('T')[0],
      });

      if (error) throw error;

      Alert.alert('Success', 'Sleep logged successfully');
      setBedtime('');
      setWakeTime('');
      setSleepQuality(3);
      loadSleepLogs();
    } catch (error) {
      const errorMessage =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: any }).message)
          : String(error);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  interface QualityColorParams {
    quality: number;
  }

  const getQualityColor = (quality: number): string => {
    if (quality >= 4) return '#10B981';
    if (quality >= 3) return '#F59E0B';
    return '#EF4444';
  };

  interface QualityTextParams {
    quality: number;
  }

  const getQualityText = (quality: number): string => {
    const texts: string[] = ['Poor', 'Fair', 'Good', 'Great', 'Excellent'];
    return texts[quality - 1] || 'Unknown';
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => onBack?.()}
            style={styles.backButton}
          >
            <Icon name="arrow-left" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sleep Tracker</Text>
        </View>

        {/* Log New Sleep */}
        <GlassCard theme="dark" style={styles.logCard}>
          <Text style={styles.cardTitle}>Log Last Night's Sleep</Text>

          <View style={styles.timeInputs}>
            <View style={styles.timeInput}>
              <Text style={styles.inputLabel}>Bedtime</Text>
              <TouchableOpacity
                onPress={() => {
                  // In a real app, you'd use a time picker
                  setBedtime('22:30');
                }}
                style={styles.timeButton}
              >
                <Text style={styles.timeText}>{bedtime || 'Set bedtime'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.timeInput}>
              <Text style={styles.inputLabel}>Wake Time</Text>
              <TouchableOpacity
                onPress={() => {
                  // In a real app, you'd use a time picker
                  setWakeTime('07:00');
                }}
                style={styles.timeButton}
              >
                <Text style={styles.timeText}>
                  {wakeTime || 'Set wake time'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.inputLabel}>Sleep Quality</Text>
          <View style={styles.qualityButtons}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <TouchableOpacity
                key={rating}
                onPress={() => setSleepQuality(rating)}
                style={[
                  styles.qualityButton,
                  {
                    backgroundColor:
                      sleepQuality >= rating ? '#F59E0B' : '#E5E7EB',
                  },
                ]}
              >
                <Icon
                  name="star"
                  size={20}
                  color={sleepQuality >= rating ? 'white' : '#9CA3AF'}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={logSleep}
            disabled={loading}
            style={[
              styles.logButton,
              { backgroundColor: loading ? '#D1D5DB' : '#8B5CF6' },
            ]}
          >
            <Text style={styles.logButtonText}>
              {loading ? 'Logging...' : 'Log Sleep'}
            </Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Sleep History */}
        <Text style={styles.sectionTitle}>Recent Sleep History</Text>

        {sleepLogs.map((log, index) => (
          <GlassCard key={log.id} theme="dark" style={styles.historyCard}>
            <View style={styles.historyRow}>
              <View style={styles.historyDetails}>
                <Text style={styles.historyDate}>
                  {new Date(log.date).toLocaleDateString()}
                </Text>
                <Text style={styles.historyTime}>
                  {log.bedtime} → {log.wake_time}
                </Text>
                <View style={styles.qualityRow}>
                  <Icon
                    name="star"
                    size={16}
                    color={getQualityColor(log.quality)}
                  />
                  <Text
                    style={[
                      styles.qualityText,
                      { color: getQualityColor(log.quality) },
                    ]}
                  >
                    {getQualityText(log.quality)}
                  </Text>
                </View>
              </View>
              <View style={styles.durationContainer}>
                <Text style={styles.durationText}>
                  {log.duration.toFixed(1)}h
                </Text>
                <Text style={styles.durationLabel}>Duration</Text>
              </View>
            </View>
          </GlassCard>
        ))}

        {sleepLogs.length === 0 && (
          <GlassCard theme="dark" style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <Icon name="sleep" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>
                No sleep data yet. Start logging your sleep to track patterns.
              </Text>
            </View>
          </GlassCard>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'linear-gradient(135deg, #E9D5FF 0%, #BFDBFE 100%)',
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
  },
  logCard: {
    marginBottom: 24,
    padding: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  timeInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeInput: {
    flex: 1,
    marginRight: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  timeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 12,
    padding: 16,
  },
  timeText: {
    color: '#111827',
    fontSize: 16,
  },
  qualityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  qualityButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
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
  historyDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  qualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qualityText: {
    fontSize: 14,
    marginLeft: 4,
  },
  durationContainer: {
    alignItems: 'flex-end',
  },
  durationText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  durationLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyCard: {
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
});

export default SleepTrackerScreen;
