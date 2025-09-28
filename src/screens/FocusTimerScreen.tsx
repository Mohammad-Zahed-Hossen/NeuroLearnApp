import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import {
  GlassCard,
  Button,
  TimerDisplay,
  ScreenContainer,
} from '../components/GlassComponents';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { HamburgerMenu, AppHeader } from '../components/Navigation';
import { FocusMode, Timer } from '../types';
import { ThemeType } from '../theme/colors';

interface FocusTimerScreenProps {
  theme: ThemeType;
  onNavigate: (screen: string) => void;
}

const focusModes: FocusMode[] = [
  {
    id: 'pomodoro',
    name: 'Pomodoro',
    duration: 25,
    color: '#8B5CF6',
    icon: '🍅',
    description: 'Traditional 25-minute focused work session',
  },
  {
    id: 'deep-work',
    name: 'Deep Work',
    duration: 45,
    color: '#A855F7',
    icon: '🧠',
    description: 'Extended concentration for complex tasks',
  },
  {
    id: 'memory-palace',
    name: 'Memory Palace',
    duration: 20,
    color: '#6D28D9',
    icon: '🏰',
    description: 'Spatial memory training session',
  },
  {
    id: 'ultralearning',
    name: 'Ultralearning',
    duration: 15,
    color: '#7C3AED',
    icon: '⚡',
    description: 'Intense skill acquisition sprint',
  },
  {
    id: 'review',
    name: 'Review Session',
    duration: 10,
    color: '#9333EA',
    icon: '📚',
    description: 'Quick flashcard review',
  },
  {
    id: 'custom',
    name: 'Custom Timer',
    duration: 0,
    color: '#C084FC',
    icon: '⏰',
    description: 'Set your own duration',
  },
];

export const FocusTimerScreen: React.FC<FocusTimerScreenProps> = ({
  theme,
  onNavigate,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [selectedMode, setSelectedMode] = useState<FocusMode | null>(null);
  const [timer, setTimer] = useState<Timer | null>(null);
  const [customDuration, setCustomDuration] = useState<string>('');
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const themeColors = colors[theme];

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (timer && timer.isRunning && !timer.isPaused) {
      intervalRef.current = setInterval(() => {
        setTimer((prevTimer) => {
          if (!prevTimer || prevTimer.timeLeft <= 0) {
            handleTimerComplete();
            return prevTimer;
          }

          return {
            ...prevTimer,
            timeLeft: prevTimer.timeLeft - 1,
          };
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timer?.isRunning, timer?.isPaused]);

  const handleModeSelect = (mode: FocusMode) => {
    if (mode.id === 'custom') {
      setSelectedMode(mode);
      setShowCustomModal(true);
      return;
    }

    setSelectedMode(mode);
    const totalSeconds = mode.duration * 60;
    setTimer({
      mode,
      timeLeft: totalSeconds,
      totalTime: totalSeconds,
      isRunning: false,
      isPaused: false,
      startTime: new Date(),
    });
  };

  const handleCustomTimer = () => {
    const duration = parseInt(customDuration);
    if (isNaN(duration) || duration < 1 || duration > 180) {
      Alert.alert(
        'Invalid Duration',
        'Please enter a duration between 1 and 180 minutes.',
      );
      return;
    }

    const customMode: FocusMode = {
      ...focusModes.find((m) => m.id === 'custom')!,
      duration,
      name: `Custom ${duration}min`,
    };

    const totalSeconds = duration * 60;
    setTimer({
      mode: customMode,
      timeLeft: totalSeconds,
      totalTime: totalSeconds,
      isRunning: false,
      isPaused: false,
      startTime: new Date(),
    });

    setShowCustomModal(false);
    setCustomDuration('');
  };

  const handleStartPause = () => {
    if (!timer) return;

    setTimer((prev) => ({
      ...prev!,
      isRunning: !prev!.isRunning,
      isPaused: prev!.isRunning,
    }));
  };

  const handleStop = () => {
    Alert.alert(
      'Stop Timer',
      'Are you sure you want to stop the current session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: () => {
            setTimer(null);
            setSelectedMode(null);
          },
        },
      ],
    );
  };

  const handleTimerComplete = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    Alert.alert(
      'Session Complete! 🎉',
      `Great job! You completed your ${timer?.mode.name} session.`,
      [
        {
          text: 'New Session',
          onPress: () => {
            setTimer(null);
            setSelectedMode(null);
          },
        },
      ],
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  if (timer) {
    return (
      <ScreenContainer theme={theme}>
        {/* Floating App Header */}
        <AppHeader
          title={timer.mode.name}
          theme={theme}
          onMenuPress={() => setMenuVisible(true)}
          rightComponent={
            <TouchableOpacity
              onPress={() => setSettingsVisible(true)}
              style={{ padding: 8 }}
              hitSlop={8}
            >
              <Text style={{ fontSize: 20, color: colors[theme].text }}>
                ⚙️
              </Text>
            </TouchableOpacity>
          }
        />

        <ScrollView
          contentContainerStyle={[styles.container, styles.timerContainer]}
        >
          {/* Timer Display */}
          <View style={styles.timerSection}>
            <GlassCard theme={theme} style={styles.timerCard}>
              <TimerDisplay
                timeLeft={timer.timeLeft}
                totalTime={timer.totalTime}
                theme={theme}
                size={250}
              />
              <Text
                style={[
                  styles.timerStatus,
                  { color: themeColors.textSecondary },
                ]}
              >
                {timer.isPaused
                  ? 'Paused'
                  : timer.isRunning
                  ? 'Focus Time'
                  : 'Ready to Start'}
              </Text>
            </GlassCard>
          </View>

          {/* Timer Controls */}
          <View style={styles.controls}>
            <Button
              title={timer.isRunning && !timer.isPaused ? 'Pause' : 'Start'}
              onPress={handleStartPause}
              variant="primary"
              size="large"
              theme={theme}
              style={styles.controlButton}
            />
            <Button
              title="Stop"
              onPress={handleStop}
              variant="outline"
              size="large"
              theme={theme}
              style={styles.controlButton}
            />
          </View>

          {/* Session Info */}
          <GlassCard theme={theme} style={styles.infoCard}>
            <Text style={[styles.infoTitle, { color: themeColors.text }]}>
              Session Progress
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: themeColors.primary,
                    width: `${
                      ((timer.totalTime - timer.timeLeft) / timer.totalTime) *
                      100
                    }%`,
                  },
                ]}
              />
            </View>
            <Text
              style={[styles.infoText, { color: themeColors.textSecondary }]}
            >
              {formatTime(timer.totalTime - timer.timeLeft)} /{' '}
              {formatTime(timer.totalTime)}
            </Text>
          </GlassCard>
        </ScrollView>

        <HamburgerMenu
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          onNavigate={onNavigate}
          currentScreen="focus"
          theme={theme}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer theme={theme}>
      {/* Floating App Header */}
      <AppHeader
        title="Focus Timer"
        theme={theme}
        onMenuPress={() => setMenuVisible(true)}
        rightComponent={
          <TouchableOpacity
            onPress={() => onNavigate('adaptive-focus')}
            style={{ padding: 8 }}
            hitSlop={8}
          >
            <Text style={{ fontSize: 20, color: colors[theme].text }}>🧠</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeColors.text }]}>
            Focus Timer
          </Text>
          <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
            Choose your focus mode and start your learning session
          </Text>
        </View>

        {/* Focus Mode Selection */}
        <View style={styles.modesContainer}>
          {focusModes.map((mode) => (
            <GlassCard
              key={mode.id}
              theme={theme}
              onPress={() => handleModeSelect(mode)}
              style={[
                styles.modeCard,
                selectedMode?.id === mode.id && {
                  borderColor: themeColors.primary,
                  borderWidth: 2,
                },
              ]}
            >
              <Text style={styles.modeIcon}>{mode.icon}</Text>
              <Text style={[styles.modeName, { color: themeColors.text }]}>
                {mode.name}
              </Text>
              <Text
                style={[styles.modeDuration, { color: themeColors.primary }]}
              >
                {mode.id === 'custom' ? 'Custom' : `${mode.duration} min`}
              </Text>
              <Text
                style={[
                  styles.modeDescription,
                  { color: themeColors.textSecondary },
                ]}
              >
                {mode.description}
              </Text>
            </GlassCard>
          ))}
        </View>

        {/* Custom Timer Modal */}
        <Modal
          visible={showCustomModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCustomModal(false)}
        >
          <View style={styles.modalOverlay}>
            <GlassCard theme={theme} style={styles.modalContent}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                Custom Timer Duration
              </Text>
              <Text
                style={[
                  styles.modalSubtitle,
                  { color: themeColors.textSecondary },
                ]}
              >
                Enter duration in minutes (1-180)
              </Text>

              <TextInput
                style={[
                  styles.customInput,
                  {
                    borderColor: themeColors.border,
                    color: themeColors.text,
                  },
                ]}
                placeholder="Enter minutes..."
                placeholderTextColor={themeColors.textMuted}
                value={customDuration}
                onChangeText={setCustomDuration}
                keyboardType="numeric"
                autoFocus
              />

              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  onPress={() => setShowCustomModal(false)}
                  variant="ghost"
                  theme={theme}
                  style={styles.modalButton}
                />
                <Button
                  title="Start Timer"
                  onPress={handleCustomTimer}
                  variant="primary"
                  theme={theme}
                  style={styles.modalButton}
                />
              </View>
            </GlassCard>
          </View>
        </Modal>

        <HamburgerMenu
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          onNavigate={onNavigate}
          currentScreen="focus"
          theme={theme}
        />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
    paddingTop: 100, // Space for floating nav bar
  },
  timerContainer: {
    paddingTop: 120, // Extra space for timer view
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.md,
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  modeCard: {
    width: '48%',
    alignItems: 'center',
    marginBottom: spacing.lg,
    minHeight: 150,
  },
  modeIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  modeName: {
    ...typography.h4,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modeDuration: {
    ...typography.bodySmall,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  modeDescription: {
    ...typography.caption,
    textAlign: 'center',
    lineHeight: 16,
  },
  timerSection: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  timerCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  timerStatus: {
    ...typography.body,
    marginTop: spacing.lg,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.xl,
  },
  controlButton: {
    flex: 0.48,
  },
  infoCard: {
    marginTop: spacing.lg,
  },
  infoTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  infoText: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  customInput: {
    borderWidth: 2,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 0.48,
  },
});

export default FocusTimerScreen;
