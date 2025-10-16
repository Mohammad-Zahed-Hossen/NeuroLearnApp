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
} from '../../components/GlassComponents';
import { colors, spacing, borderRadius, typography } from '../../theme/colors';
import {
  HamburgerMenu,
  AppHeader,
} from '../../components/navigation/Navigation';
import { FocusMode, Timer } from '../../types';
import { ThemeType } from '../../theme/colors';
import { FocusTimerService } from '../../services/learning/FocusTimerService';
import { useSoundscape } from '../../contexts/SoundscapeContext';
import { neuralIntegrationService } from '../../services/learning/NeuralIntegrationService';
import { perf } from '../../utils/perfMarks';
import { DynamicFocusTimerService } from '../../services/learning/DynamicFocusTimerService';

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
  const mountMarkRef = React.useRef<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [selectedMode, setSelectedMode] = useState<FocusMode | null>(null);
  const [timer, setTimer] = useState<Timer | null>(null);
  const [customDuration, setCustomDuration] = useState<string>('');
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [showDistractionModal, setShowDistractionModal] =
    useState<boolean>(false);
  const [distractionReason, setDistractionReason] =
    useState<string>('Phone notification');
  const [distractionSeverity, setDistractionSeverity] = useState<
    1 | 2 | 3 | 4 | 5
  >(3);
  const [distractionTriggerType, setDistractionTriggerType] = useState<
    'internal' | 'external' | 'notification' | 'unknown'
  >('external');
  const [dataSource, setDataSource] = useState<'static' | 'dynamic' | 'hybrid'>('hybrid');
  const [dynamicModes, setDynamicModes] = useState<FocusMode[]>([]);

  // Additional picker modal states for distraction modal
  const [showReasonPicker, setShowReasonPicker] = useState<boolean>(false);
  const [showTriggerTypePicker, setShowTriggerTypePicker] =
    useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const themeColors = colors[theme];
  const soundscape = useSoundscape();
  const dynamicService = DynamicFocusTimerService.getInstance();

  // Notify neural integration of screen change and load dynamic content
  useEffect(() => {
    mountMarkRef.current = perf.startMark('FocusTimerScreen');
    neuralIntegrationService.onScreenChange('focus');
    
    // Load dynamic focus modes if enabled
    const loadDynamicContent = async () => {
      if (dataSource === 'dynamic' || dataSource === 'hybrid') {
        try {
          const generatedModes = await dynamicService.generatePersonalizedModes();
          setDynamicModes(generatedModes);
        } catch (error) {
          console.error('Error loading dynamic focus modes:', error);
        }
      }
    };
    
    loadDynamicContent();
    
    // measure readiness on next tick after initial integrations settle
    const t = setTimeout(() => {
      if (mountMarkRef.current) {
        try {
          perf.measureReady('FocusTimerScreen', mountMarkRef.current);
        } catch (e) {}
        mountMarkRef.current = null;
      }
    }, 0);
    return () => clearTimeout(t);
  }, [dataSource]);

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
        setTimer((prevTimer: Timer | null) => {
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
    const duration = parseInt(customDuration ?? '0');
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

  const handleStartPause = async () => {
    if (!timer) return;

    const wasRunning = timer.isRunning;

    setTimer((prev: Timer | null) => ({
      ...prev!,
      isRunning: !prev!.isRunning,
      isPaused: prev!.isRunning,
    }));

    // Start optimal soundscape when timer starts
    if (!wasRunning && soundscape.isInitialized) {
      const optimalPreset = getOptimalPresetForMode(timer.mode.id);
      await soundscape.startPreset(optimalPreset, {
        cognitiveLoad: 0.7,
        fadeIn: true,
      });
    }
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
          onPress: async () => {
            // Record performance if session was running
            if (timer && timer.isRunning) {
              const completionRate =
                (timer.totalTime - timer.timeLeft) / timer.totalTime;
              await soundscape.recordPerformance(completionRate);
            }

            // Transition to calm state
            if (soundscape.isActive) {
              await soundscape.startPreset('calm_readiness', { fadeIn: true });
            }

            setTimer(null);
            setSelectedMode(null);
          },
        },
      ],
    );
  };

  const handleTimerComplete = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Record successful completion
    await soundscape.recordPerformance(1.0); // Perfect completion

    // Transition to calm state
    if (soundscape.isActive) {
      await soundscape.startPreset('calm_readiness', { fadeIn: true });
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

  const getOptimalPresetForMode = (modeId: string) => {
    switch (modeId) {
      case 'pomodoro':
      case 'deep-work':
        return 'deep_focus';
      case 'memory-palace':
        return 'visualization';
      case 'ultralearning':
        return 'reasoning_boost';
      case 'review':
        return 'memory_flow';
      default:
        return 'deep_focus';
    }
  };

  const handleLogDistraction = async () => {
    const focusService = FocusTimerService.getInstance();
    focusService.logDistraction({
      reason: distractionReason,
      severity: distractionSeverity,
      triggerType: distractionTriggerType,
    });

    // Adjust cognitive load based on distraction severity
    const loadIncrease = distractionSeverity * 0.1;
    soundscape.updateCognitiveLoad(
      Math.min(1, soundscape.cognitiveLoad + loadIncrease),
    );

    setShowDistractionModal(false);
    Alert.alert('Distraction Logged', 'Your distraction has been recorded.');
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

          {/* Distraction Button */}
          <View style={styles.distractionContainer}>
            <Button
              title="😬 Distracted"
              onPress={() => setShowDistractionModal(true)}
              variant="secondary"
              size="medium"
              theme={theme}
              style={styles.distractionButton}
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

        {/* Distraction Modal */}
        <Modal
          visible={showDistractionModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDistractionModal(false)}
        >
          <View style={styles.modalOverlay}>
            <GlassCard theme={theme} style={styles.modalContent}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                Log Distraction
              </Text>
              <Text
                style={[
                  styles.modalSubtitle,
                  { color: themeColors.textSecondary },
                ]}
              >
                Help us understand what distracted you
              </Text>

              <View style={distractionModalStyles.distractionOptions}>
                <Text
                  style={[
                    distractionModalStyles.optionLabel,
                    { color: themeColors.text },
                  ]}
                >
                  Reason:
                </Text>
                <TouchableOpacity
                  style={[
                    styles.inputButton,
                    { borderColor: themeColors.border },
                  ]}
                  onPress={() => setShowReasonPicker(true)}
                >
                  <Text
                    style={[
                      styles.inputButtonText,
                      { color: themeColors.text },
                    ]}
                  >
                    {distractionReason}
                  </Text>
                </TouchableOpacity>

                <Text
                  style={[
                    distractionModalStyles.optionLabel,
                    { color: themeColors.text },
                  ]}
                >
                  Severity (1-5):
                </Text>
                <View style={distractionModalStyles.severityButtons}>
                  {[1, 2, 3, 4, 5].map((severity) => (
                    <TouchableOpacity
                      key={severity}
                      style={[
                        distractionModalStyles.severityButton,
                        {
                          backgroundColor:
                            distractionSeverity === severity
                              ? themeColors.primary
                              : 'rgba(255, 255, 255, 0.1)',
                        },
                      ]}
                      onPress={() =>
                        setDistractionSeverity(severity as 1 | 2 | 3 | 4 | 5)
                      }
                    >
                      <Text
                        style={[
                          distractionModalStyles.severityText,
                          {
                            color:
                              distractionSeverity === severity
                                ? themeColors.surface
                                : themeColors.text,
                          },
                        ]}
                      >
                        {severity}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text
                  style={[
                    distractionModalStyles.optionLabel,
                    { color: themeColors.text },
                  ]}
                >
                  Trigger Type:
                </Text>
                <TouchableOpacity
                  style={[
                    styles.inputButton,
                    { borderColor: themeColors.border },
                  ]}
                  onPress={() => setShowTriggerTypePicker(true)}
                >
                  <Text
                    style={[
                      styles.inputButtonText,
                      { color: themeColors.text },
                    ]}
                  >
                    {distractionTriggerType.charAt(0).toUpperCase() +
                      distractionTriggerType.slice(1)}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  onPress={() => setShowDistractionModal(false)}
                  variant="ghost"
                  theme={theme}
                  style={styles.modalButton}
                />
                <Button
                  title="Log Distraction"
                  onPress={handleLogDistraction}
                  variant="primary"
                  theme={theme}
                  style={styles.modalButton}
                />
              </View>
            </GlassCard>
          </View>
        </Modal>

        {/* Reason Picker Modal */}
        <Modal
          visible={showReasonPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowReasonPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.pickerModalContent}>
              <GlassCard theme={theme} style={styles.pickerModalCard}>
                <View style={styles.modalHeader}>
                  <Text
                    style={[styles.modalTitle, { color: themeColors.text }]}
                  >
                    Select Reason
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowReasonPicker(false)}
                    style={styles.closeButton}
                  >
                    <Text
                      style={[
                        styles.closeButtonText,
                        { color: themeColors.text },
                      ]}
                    >
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.modalScrollContent}>
                  {[
                    'Phone notification',
                    'Social media',
                    'Email',
                    'Colleague interruption',
                    'Personal thoughts',
                    'Noise',
                    'Hunger/Thirst',
                    'Other',
                  ].map((reason) => (
                    <TouchableOpacity
                      key={reason}
                      onPress={() => {
                        setDistractionReason(reason);
                        setShowReasonPicker(false);
                      }}
                      style={styles.pickerOption}
                    >
                      <GlassCard
                        theme={theme}
                        style={[
                          styles.pickerOptionCard,
                          distractionReason === reason && [
                            styles.pickerOptionSelected,
                            { borderColor: themeColors.primary },
                          ],
                        ]}
                      >
                        <Text
                          style={[
                            styles.pickerOptionText,
                            { color: themeColors.text },
                          ]}
                        >
                          {reason}
                        </Text>
                      </GlassCard>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </GlassCard>
            </View>
          </View>
        </Modal>

        {/* Trigger Type Picker Modal */}
        <Modal
          visible={showTriggerTypePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowTriggerTypePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.pickerModalContent}>
              <GlassCard theme={theme} style={styles.pickerModalCard}>
                <View style={styles.modalHeader}>
                  <Text
                    style={[styles.modalTitle, { color: themeColors.text }]}
                  >
                    Select Trigger Type
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowTriggerTypePicker(false)}
                    style={styles.closeButton}
                  >
                    <Text
                      style={[
                        styles.closeButtonText,
                        { color: themeColors.text },
                      ]}
                    >
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.modalScrollContent}>
                  {['internal', 'external', 'notification', 'unknown'].map(
                    (type) => (
                      <TouchableOpacity
                        key={type}
                        onPress={() => {
                          setDistractionTriggerType(
                            type as
                              | 'internal'
                              | 'external'
                              | 'notification'
                              | 'unknown',
                          );
                          setShowTriggerTypePicker(false);
                        }}
                        style={styles.pickerOption}
                      >
                        <GlassCard
                          theme={theme}
                          style={[
                            styles.pickerOptionCard,
                            distractionTriggerType === type && [
                              styles.pickerOptionSelected,
                              { borderColor: themeColors.primary },
                            ],
                          ]}
                        >
                          <Text
                            style={[
                              styles.pickerOptionText,
                              { color: themeColors.text },
                            ]}
                          >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Text>
                        </GlassCard>
                      </TouchableOpacity>
                    ),
                  )}
                </ScrollView>
              </GlassCard>
            </View>
          </View>
        </Modal>

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

        {/* Data Source Toggle */}
        <GlassCard theme={theme} style={styles.dataSourceCard}>
          <Text style={[styles.dataSourceTitle, { color: themeColors.text }]}>
            🎯 Focus Modes
          </Text>
          <View style={styles.dataSourceButtons}>
            <TouchableOpacity
              style={[
                styles.dataSourceButton,
                dataSource === 'static' && { backgroundColor: themeColors.primary },
                { borderColor: themeColors.border }
              ]}
              onPress={() => setDataSource('static')}
            >
              <Text style={[styles.dataSourceButtonText, { color: dataSource === 'static' ? '#FFFFFF' : themeColors.text }]}>
                Standard
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.dataSourceButton,
                dataSource === 'hybrid' && { backgroundColor: themeColors.primary },
                { borderColor: themeColors.border }
              ]}
              onPress={() => setDataSource('hybrid')}
            >
              <Text style={[styles.dataSourceButtonText, { color: dataSource === 'hybrid' ? '#FFFFFF' : themeColors.text }]}>
                Hybrid
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.dataSourceButton,
                dataSource === 'dynamic' && { backgroundColor: themeColors.primary },
                { borderColor: themeColors.border }
              ]}
              onPress={() => setDataSource('dynamic')}
            >
              <Text style={[styles.dataSourceButtonText, { color: dataSource === 'dynamic' ? '#FFFFFF' : themeColors.text }]}>
                Adaptive
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.dataSourceDescription, { color: themeColors.textSecondary }]}>
            {dataSource === 'static' && 'Using standard focus timer modes'}
            {dataSource === 'hybrid' && 'Combining standard modes with personalized timers'}
            {dataSource === 'dynamic' && 'Using AI-optimized focus durations based on your patterns'}
          </Text>
          {dynamicModes.length > 0 && (
            <Text style={[styles.dynamicModesCount, { color: themeColors.success }]}>
              {dynamicModes.length} personalized modes available
            </Text>
          )}
        </GlassCard>

        {/* Focus Mode Selection */}
        <View style={styles.modesContainer}>
          {/* Static modes (always show unless dynamic-only) */}
          {dataSource !== 'dynamic' && focusModes.map((mode) => (
            <GlassCard
              key={mode.id}
              theme={theme}
              onPress={() => handleModeSelect(mode)}
              style={[
                styles.modeCard,
                
                { borderColor: themeColors.warning, borderWidth: 1 },
                selectedMode?.id === mode.id && {
                  borderColor: themeColors.primary,
                  borderWidth: 2,
                },
              ]}
            >
              <View style={styles.modeTagContainer}>
                <Text style={styles.modeIcon}>{mode.icon}</Text>
                <Text style={[styles.modeTag, { backgroundColor: themeColors.warning }]}>
                  Standard
                </Text>
              </View>
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

          {/* Dynamic modes */}
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
  // Data Source Toggle
  dataSourceCard: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  dataSourceTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  dataSourceButtons: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  dataSourceButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    marginHorizontal: spacing.xs,
  },
  dataSourceButtonText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  dataSourceDescription: {
    ...typography.caption,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  dynamicModesCount: {
    ...typography.caption,
    fontWeight: '600',
  },
  modeTagContainer: {
    alignItems: 'center',
    position: 'relative',
    marginBottom: spacing.sm,
  },
  modeIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  modeTag: {
    ...typography.caption,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    color: '#FFFFFF',
    fontWeight: '600',
    position: 'absolute',
    top: -5,
    right: -10,
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
  distractionContainer: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  distractionButton: {
    minWidth: 120,
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalScrollContent: {
    padding: spacing.md,
  },
  pickerOption: {
    marginBottom: spacing.sm,
  },
  pickerOptionCard: {
    padding: spacing.md,
  },
  pickerOptionSelected: {
    borderWidth: 2,
  },
  pickerOptionText: {
    ...typography.body,
  },
  inputButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  inputButtonText: {
    fontSize: 16,
  },
  inputButtonArrow: {
    fontSize: 16,
  },
  pickerModalContent: {
    width: '90%',
    maxHeight: '70%',
  },
  pickerModalCard: {
    maxHeight: '100%',
  },
});

const distractionModalStyles = StyleSheet.create({
  distractionOptions: {
    marginBottom: spacing.xl,
  },
  optionLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  severityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  severityButton: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginHorizontal: 2,
  },
  severityText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
});

export default FocusTimerScreen;
