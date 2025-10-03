
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Modal,
  TouchableOpacity,
  Vibration,
  Platform,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { AppHeader, HamburgerMenu } from '../components/Navigation';
import {
  GlassCard,
  Button,
  ScreenContainer,
} from '../components/GlassComponents';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../theme/colors';
import { ThemeType } from '../theme/colors';
import { TodoistService } from '../services/TodoistService';
import { FocusSession } from '../services/StorageService';
import {
  MindMapGenerator,
  NeuralNode,
} from '../services/MindMapGeneratorService';
import { NeuralPhysicsEngine } from '../services/NeuralPhysicsEngine';
import { FocusTimerService, DistractionLogOptions, ActiveSession } from '../services/FocusTimerService';
import { Task } from '../types';
import { useFocus } from '../contexts/FocusContext';

/**
 * Phase 5, Step 3: Adaptive Focus Timer Screen
 *
 * This is the CORE UI for intelligent focus sessions that:
 * 1. Adapts session length based on cognitive load
 * 2. Enforces neural focus lock through physics manipulation
 * 3. Converges Todoist tasks with internal learning goals
 * 4. Provides non-intrusive, adaptive focus experience
 */

interface FocusTimerScreenProps {
  theme: ThemeType;
  onNavigate: (screen: string) => void;
}

interface AdaptiveTimerConfig {
  duration: number; // Minutes for the session
  reasoning: string; // Why this duration was chosen
  cognitiveLoad: number; // Current mental state (0-1)
  recommended: boolean; // Is this the AI-recommended duration?
}

interface FocusTarget {
  id: string;
  title: string;
  type: 'task' | 'node' | 'logic' | 'flashcard';
  source: 'todoist' | 'neural' | 'logic' | 'memory';
  priority: number;
  description?: string;
  estimatedTime?: number;
  neuralNodeId?: string; // If linked to a neural node
  taskId?: string; // If linked to a Todoist task
}

export const AdaptiveFocusScreen: React.FC<FocusTimerScreenProps> = ({
  theme,
  onNavigate,
}) => {
  const themeColors = colors[theme];
  const { width, height } = Dimensions.get('window');

  // Focus context for neural focus lock
  const { startFocusSession: startGlobalFocus, endFocusSession: endGlobalFocus } = useFocus();

  // Ref to track if a session was active to prevent alert on initial load
  const wasSessionActive = useRef(false);

  // Services
  const todoistService = TodoistService.getInstance();
  const mindMapGenerator = MindMapGenerator.getInstance();
  const focusTimerService = FocusTimerService.getInstance();

  // Physics engine for focus lock
  const physicsEngine = useRef(new NeuralPhysicsEngine(width, height, theme)).current;
  useEffect(() => {
    focusTimerService.setPhysicsEngine(physicsEngine);
  }, [focusTimerService]);

  // Core state
  const [menuVisible, setMenuVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Distraction modal state
  const [showDistractionModal, setShowDistractionModal] = useState<boolean>(false);
  const [showReasonPicker, setShowReasonPicker] = useState<boolean>(false);
  const [showTriggerTypePicker, setShowTriggerTypePicker] = useState<boolean>(false);
  const [distractionReason, setDistractionReason] = useState<string>('Phone notification');
  const [distractionSeverity, setDistractionSeverity] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [distractionTriggerType, setDistractionTriggerType] = useState<'internal' | 'external' | 'notification' | 'unknown'>('external');

  // Focus selection state
  const [focusTargets, setFocusTargets] = useState<FocusTarget[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<FocusTarget | null>(
    null,
  );
  const [targetSelectionVisible, setTargetSelectionVisible] = useState(false);

  // Adaptive configuration
  const [adaptiveConfig, setAdaptiveConfig] = useState<AdaptiveTimerConfig>({
    duration: 25, // Default Pomodoro
    reasoning: 'Standard focus session',
    cognitiveLoad: 0.5,
    recommended: true,
  });

  // Session management
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [sessionAnalytics, setSessionAnalytics] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  /**
   * Compute time remaining from active session
   */
  const getTimeRemaining = useCallback((): number => {
    if (!activeSession) return 0;
    const now = new Date();
    const elapsedMs = now.getTime() - activeSession.startTime.getTime();
    const elapsedSeconds = elapsedMs / 1000;
    const totalSeconds = activeSession.plannedDurationMinutes * 60;
    const remaining = totalSeconds - elapsedSeconds;
    return Math.max(0, remaining);
  }, [activeSession]);

  // Subscribe to session changes
  useEffect(() => {
    const unsubscribe = focusTimerService.onSessionChange(setActiveSession);
    return unsubscribe;
  }, [focusTimerService]);

  // Update time remaining every second during active session
  useEffect(() => {
    if (!activeSession) {
      setTimeRemaining(0);
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining());
    }, 1000);

    // Set initial value
    setTimeRemaining(getTimeRemaining());

    return () => clearInterval(interval);
  }, [activeSession, getTimeRemaining]);

  /**
   * Phase 5: Calculate adaptive timer configuration based on cognitive load
   *
   * This is the CORE adaptive intelligence that prevents overwhelm
   */
  const calculateAdaptiveConfiguration = useCallback(async () => {
    try {
      // Get current neural graph for cognitive load calculation
      const neuralGraph = await mindMapGenerator.generateNeuralGraph(false);
      const cognitiveLoad = Math.max(
        0,
        Math.min(
          1,
          neuralGraph.dueNodesCount / 20 +
            neuralGraph.cognitiveComplexity / 100 +
            (100 - neuralGraph.knowledgeHealth) / 200,
        ),
      );

      // Phase 5: Adaptive duration calculation
      let duration: number;
      let reasoning: string;

      if (cognitiveLoad > 0.8) {
        // Very high load: Short, manageable sessions
        duration = 15;
        reasoning =
          'Short session due to high mental load - preventing overwhelm';
      } else if (cognitiveLoad > 0.6) {
        // High load: Reduced sessions
        duration = 20;
        reasoning = 'Reduced session due to elevated mental load';
      } else if (cognitiveLoad > 0.4) {
        // Medium load: Standard sessions
        duration = 25;
        reasoning = 'Standard session duration - balanced mental load';
      } else if (cognitiveLoad > 0.2) {
        // Low load: Extended sessions
        duration = 35;
        reasoning = 'Extended session - low mental load allows deeper focus';
      } else {
        // Very low load: Long deep work sessions
        duration = 45;
        reasoning =
          'Deep work session - optimal mental state for extended focus';
      }

      // Check session history for personalization
      const analytics = todoistService.getFocusSessionAnalytics();
      if (analytics.totalSessions > 5) {
        // Adjust based on historical completion rate
        if (analytics.completionRate < 0.6) {
          duration = Math.max(15, duration - 5);
          reasoning += ' (adjusted down based on completion history)';
        } else if (analytics.completionRate > 0.9) {
          duration = Math.min(60, duration + 5);
          reasoning += ' (adjusted up based on excellent completion history)';
        }
      }

      setAdaptiveConfig({
        duration,
        reasoning,
        cognitiveLoad,
        recommended: true,
      });

      console.log(
        `🧠 Adaptive timer configured: ${duration}min (load: ${Math.round(
          cognitiveLoad * 100,
        )}%)`,
      );
    } catch (error) {
      console.error('Error calculating adaptive configuration:', error);

      // Fallback to default configuration
      setAdaptiveConfig({
        duration: 25,
        reasoning:
          'Default configuration (unable to calculate adaptive timing)',
        cognitiveLoad: 0.5,
        recommended: false,
      });
    }
  }, [mindMapGenerator, todoistService]);

  // Handle session completion
  useEffect(() => {
    // Show alert only if session ended and was previously active (to avoid alert on initial load)
    if (activeSession === null && selectedTarget && wasSessionActive.current) {
      // Session ended
      Alert.alert(
        'Focus Session Complete! 🎉',
        'Great work! Your focused session is finished.',
        [
          {
            text: 'View Neural Map',
            onPress: () => onNavigate('neural-mind-map'),
          },
          {
            text: 'Another Session',
            onPress: () => calculateAdaptiveConfiguration(),
          },
          { text: 'Finish' },
        ],
      );
      wasSessionActive.current = false; // Reset flag after alert
    } else if (activeSession !== null) {
      wasSessionActive.current = true; // Mark session as active
    }
  }, [activeSession, selectedTarget, onNavigate, calculateAdaptiveConfiguration]);


  /**
   * Initialize screen with focus targets and adaptive configuration
   */
  useEffect(() => {
    const initializeScreen = async () => {
      try {
        setIsLoading(true);

        // Load cognitive load and adapt timer configuration
        await calculateAdaptiveConfiguration();

        // Load available focus targets
        await loadFocusTargets();

        // Load session analytics
        const analytics = todoistService.getFocusSessionAnalytics();
        setSessionAnalytics(analytics);

        console.log('⏰ Adaptive Focus Timer initialized');
      } catch (error) {
        console.error('Error initializing focus timer:', error);
        Alert.alert('Error', 'Failed to initialize focus timer');
      } finally {
        setIsLoading(false);
      }
    };

    initializeScreen();
  }, []);

  /**
   * Load available focus targets from multiple sources
   */
  const loadFocusTargets = useCallback(async () => {
    try {
      const targets: FocusTarget[] = [];

      // Load Todoist tasks
      try {
        const { urgent, important, quick, recommended } =
          await todoistService.getFocusReadyTasks();

        // Track added task IDs to prevent duplicates
        const addedTaskIds = new Set<string>();

        // Add urgent tasks (highest priority)
        urgent.forEach((task) => {
          if (!addedTaskIds.has(task.id)) {
            addedTaskIds.add(task.id);
            targets.push({
              id: `task_${task.id}`,
              title: task.content,
              type: 'task',
              source: 'todoist',
              priority: 4,
              description: task.description,
              estimatedTime: 25,
              taskId: task.id,
            });
          }
        });

        // Add important tasks (if not already added)
        important.forEach((task) => {
          if (!addedTaskIds.has(task.id)) {
            addedTaskIds.add(task.id);
            targets.push({
              id: `task_${task.id}`,
              title: task.content,
              type: 'task',
              source: 'todoist',
              priority: task.priority,
              description: task.description,
              estimatedTime: 30,
              taskId: task.id,
            });
          }
        });

        // Add quick tasks (if not already added)
        quick.forEach((task) => {
          if (!addedTaskIds.has(task.id)) {
            addedTaskIds.add(task.id);
            targets.push({
              id: `task_${task.id}`,
              title: task.content,
              type: 'task',
              source: 'todoist',
              priority: 2,
              description: task.description,
              estimatedTime: 15,
              taskId: task.id,
            });
          }
        });
      } catch (error) {
        console.warn('Could not load Todoist tasks for focus targets:', error);
      }

      // Load neural nodes (learning targets)
      try {
        const neuralGraph = await mindMapGenerator.generateNeuralGraph(false);

        // Add due/active neural nodes
        const dueNodes = neuralGraph.nodes.filter((node) => node.isActive);
        dueNodes.slice(0, 10).forEach((node) => {
          // Limit to prevent overwhelm
          targets.push({
            id: `node_${node.id}`,
            title: `Learn: ${node.label}`,
            type: 'node',
            source: 'neural',
            priority: 3,
            description: `${node.type} concept - ${node.category}`,
            estimatedTime: 20,
            neuralNodeId: node.id,
          });
        });

        // Add critical logic nodes from Phase 4
        const logicNodes = neuralGraph.nodes.filter(
          (node) =>
            node.type === 'logic' && node.healthScore && node.healthScore < 0.5,
        );
        logicNodes.slice(0, 5).forEach((node) => {
          targets.push({
            id: `logic_${node.id}`,
            title: `Logic Training: ${node.label}`,
            type: 'logic',
            source: 'logic',
            priority: 4,
            description: 'Critical thinking exercise',
            estimatedTime: 15,
            neuralNodeId: node.id,
          });
        });
      } catch (error) {
        console.warn('Could not load neural nodes for focus targets:', error);
      }

      // Sort by priority (highest first)
      targets.sort((a, b) => b.priority - a.priority);

      setFocusTargets(targets);

      // Auto-select highest priority target if none selected
      if (!selectedTarget && targets.length > 0) {
        setSelectedTarget(targets[0]);
      }

      console.log(`🎯 Loaded ${targets.length} focus targets`);
    } catch (error) {
      console.error('Error loading focus targets:', error);
    }
  }, [todoistService, mindMapGenerator, selectedTarget]);

  /**
   * Phase 5: Start Focus Session with Neural Lock
   *
   * This is where the magic happens - adaptive timing + neural focus lock
   */
  const startFocusSession = useCallback(async () => {
    if (!selectedTarget) {
      Alert.alert(
        'No Target Selected',
        'Please select a focus target before starting a session.',
      );
      return;
    }

    try {
      // Vibration feedback for session start
      if (Platform.OS !== 'web') {
        Vibration.vibrate([0, 100, 50, 100]);
      }

      // Start session using FocusTimerService
      await focusTimerService.startSession(
        selectedTarget.taskId || selectedTarget.id,
        selectedTarget.neuralNodeId,
        adaptiveConfig.duration,
        adaptiveConfig.cognitiveLoad,
      );

      // Start global focus session
      startGlobalFocus(
        selectedTarget.neuralNodeId || selectedTarget.id,
        selectedTarget.title,
        selectedTarget.type,
      );

      // Phase 5: Enable Neural Focus Lock
      if (selectedTarget.neuralNodeId) {
        // This will trigger the physics engine to focus on the selected node
        // The NeuralMindMapScreen will receive this focus state
        console.log(
          `🧠 Neural focus lock activated for node: ${selectedTarget.neuralNodeId}`,
        );
      }

      console.log(
        `⏰ Focus session started: ${adaptiveConfig.duration} minutes for "${selectedTarget.title}"`,
      );

      Alert.alert(
        'Focus Session Started',
        `${adaptiveConfig.duration}-minute session for:\n"${selectedTarget.title}"\n\n${adaptiveConfig.reasoning}`,
        [{ text: 'Focus!' }],
      );
    } catch (error) {
      console.error('Error starting focus session:', error);
      Alert.alert('Error', 'Failed to start focus session');
    }
  }, [selectedTarget, adaptiveConfig, focusTimerService, startGlobalFocus]);

  /**
   * Complete the current focus session
   */
  const completeFocusSession = useCallback(
    async (outcome: 'completed' | 'interrupted') => {
      if (activeSession) {
        // End session using FocusTimerService
        const sessionEndOptions = {
          selfReportFocus: outcome === 'completed' ? 4 as const : 2 as const,
          distractionReason: outcome === 'completed' ? undefined : 'Session interrupted',
          completionRate: outcome === 'completed' ? 1.0 : 0.5,
          todoistTaskCompleted: outcome === 'completed' && selectedTarget?.taskId ? true : false,
        };

        await focusTimerService.endSession(sessionEndOptions);
      }

      // Clear neural focus lock
      endGlobalFocus();
      console.log('🧠 Neural focus lock deactivated');

      // Vibration feedback
      if (Platform.OS !== 'web') {
        if (outcome === 'completed') {
          Vibration.vibrate([0, 200, 100, 200, 100, 200]);
        } else {
          Vibration.vibrate([0, 500]);
        }
      }
    },
    [activeSession, selectedTarget, focusTimerService, endGlobalFocus],
  );

  /**
   * Open distraction modal
   */
  const logDistraction = useCallback(() => {
    if (activeSession) {
      setShowDistractionModal(true);
    }
  }, [activeSession]);

  /**
   * Handle distraction logging with user inputs
   */
  const handleLogDistraction = useCallback(async () => {
    try {
      await focusTimerService.logDistraction({
        reason: distractionReason,
        severity: distractionSeverity,
        triggerType: distractionTriggerType,
      });
      setShowDistractionModal(false);
      Alert.alert('Distraction Logged', 'Distraction has been recorded and neural penalty applied.');
    } catch (error) {
      console.error('Error logging distraction:', error);
      Alert.alert('Error', 'Failed to log distraction');
    }
  }, [distractionReason, distractionSeverity, distractionTriggerType, focusTimerService]);

  /**
   * Stop session early
   */
  const stopSessionEarly = useCallback(() => {
    Alert.alert(
      'Stop Session?',
      'Are you sure you want to stop this focus session early?',
      [
        { text: 'Continue Focusing', style: 'cancel' },
        {
          text: 'Stop Session',
          style: 'destructive',
          onPress: () => completeFocusSession('interrupted'),
        },
      ],
    );
  }, [completeFocusSession]);

  /**
   * Format time display
   */
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  /**
   * Get time color based on remaining time
   */
  const getTimeColor = useCallback((timeRemaining: number): string => {
    if (!activeSession) return themeColors.warning;
    const totalTime = activeSession.plannedDurationMinutes * 60;
    const percentage = timeRemaining / totalTime;

    if (percentage > 0.7) return themeColors.success;
    if (percentage > 0.3) return themeColors.warning;
    return themeColors.error;
  }, [activeSession, themeColors]);

  // Loading state
  if (isLoading) {
    return (
      <ScreenContainer theme={theme} style={[styles.container, { paddingTop: 60 }]}>
        <AppHeader
          title="Adaptive Focus"
          theme={theme}
          onMenuPress={() => setMenuVisible(true)}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.text }]}>
            Calculating optimal focus configuration...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer theme={theme} style={styles.container}>
      <AppHeader
        title="Adaptive Focus"
        theme={theme}
        onMenuPress={() => setMenuVisible(true)}
        rightComponent={
          sessionAnalytics && (
            <TouchableOpacity onPress={() => setTargetSelectionVisible(true)}>
              <Text
                style={[styles.sessionCount, { color: themeColors.primary }]}
              >
                {sessionAnalytics.sessionsToday}
              </Text>
            </TouchableOpacity>
          )
        }
      />

      <View style={styles.mainContent}>
        {/* Session Status */}
        {activeSession ? (
          // Active Session View
          <View style={styles.activeSessionContainer}>
            <GlassCard theme={theme} style={styles.timerCard}>
              {/* Current Target */}
              <View style={styles.targetHeader}>
                <Text style={[styles.targetTitle, { color: themeColors.text }]}>
                  {selectedTarget?.title || 'Focus Session'}
                </Text>
                <Text
                  style={[
                    styles.targetType,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  {selectedTarget?.type.toUpperCase()} •{' '}
                  {selectedTarget?.source.toUpperCase()}
                </Text>
              </View>

              {/* Timer Display */}
              <View style={styles.timerDisplay}>
                <Text
                  style={[
                    styles.timerText,
                    {
                      color: getTimeColor(getTimeRemaining()),
                    },
                  ]}
                >
                  {formatTime(getTimeRemaining())}
                </Text>
                <Text
                  style={[
                    styles.timerSubtext,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  FOCUSING
                </Text>
              </View>

              {/* Progress Ring Visual */}
              <View style={styles.progressContainer}>
                <View style={styles.progressRing}>
                  {/* Background ring */}
                  <View
                    style={[
                      styles.progressRingBackground,
                      { borderColor: themeColors.primary + '30' },
                    ]}
                  />
                  {/* Progress fill */}
                  <View
                    style={[
                      styles.progressRingFill,
                      {
                        borderColor: getTimeColor(getTimeRemaining()),
                        transform: [
                          {
                            rotate: `${
                              (1 -
                                getTimeRemaining() /
                                  (activeSession.plannedDurationMinutes * 60)) *
                              360
                            }deg`,
                          },
                        ],
                      },
                    ]}
                  />
                  {/* Center content */}
                  <View style={styles.progressRingCenter}>
                    <Text
                      style={[
                        styles.progressPercentage,
                        { color: themeColors.text },
                      ]}
                    >
                      {Math.round(
                        (getTimeRemaining() /
                          (activeSession.plannedDurationMinutes * 60)) *
                          100
                      )}
                      %
                    </Text>
                  </View>
                </View>
              </View>

              {/* Session Controls */}
              <View style={styles.sessionControls}>
                <TouchableOpacity
                  onPress={logDistraction}
                  style={[
                    styles.controlButton,
                    { borderColor: themeColors.warning },
                  ]}
                >
                  <Text
                    style={[
                      styles.controlButtonText,
                      { color: themeColors.warning },
                    ]}
                  >
                    😬
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={stopSessionEarly}
                  style={[
                    styles.controlButton,
                    { borderColor: themeColors.error },
                  ]}
                >
                  <Text
                    style={[
                      styles.controlButtonText,
                      { color: themeColors.error },
                    ]}
                  >
                    ⏹️
                  </Text>
                </TouchableOpacity>
              </View>
            </GlassCard>

            {/* Focus Lock Status */}
            {activeSession.nodeId && (
              <GlassCard theme={theme} style={styles.focusLockCard}>
                <Text
                  style={[
                    styles.focusLockTitle,
                    { color: themeColors.warning },
                  ]}
                >
                  🧠 Neural Focus Lock Active
                </Text>
                <Text
                  style={[
                    styles.focusLockText,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  Mind map is filtering distractions and highlighting your focus
                  target
                </Text>
              </GlassCard>
            )}
          </View>
        ) : (
          // Setup View
          <ScrollView
            style={styles.setupContainer}
            contentContainerStyle={styles.setupContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Adaptive Configuration Display */}
            <GlassCard theme={theme} style={styles.configCard}>
              <Text style={[styles.configTitle, { color: themeColors.text }]}>
                🧠 Adaptive Configuration
              </Text>
              <View style={styles.configStats}>
                <View style={styles.configStat}>
                  <Text
                    style={[
                      styles.configStatValue,
                      { color: themeColors.primary },
                    ]}
                  >
                    {adaptiveConfig.duration}
                  </Text>
                  <Text
                    style={[
                      styles.configStatLabel,
                      { color: themeColors.textSecondary },
                    ]}
                  >
                    Minutes
                  </Text>
                </View>
                <View style={styles.configStat}>
                  <Text
                    style={[
                      styles.configStatValue,
                      { color: themeColors.warning },
                    ]}
                  >
                    {Math.round(adaptiveConfig.cognitiveLoad * 100)}%
                  </Text>
                  <Text
                    style={[
                      styles.configStatLabel,
                      { color: themeColors.textSecondary },
                    ]}
                  >
                    Mental Load
                  </Text>
                </View>
                <View style={styles.configStat}>
                  <Text
                    style={[
                      styles.configStatValue,
                      { color: themeColors.success },
                    ]}
                  >
                    {sessionAnalytics?.completionRate
                      ? Math.round(sessionAnalytics.completionRate * 100)
                      : 0}
                    %
                  </Text>
                  <Text
                    style={[
                      styles.configStatLabel,
                      { color: themeColors.textSecondary },
                    ]}
                  >
                    Success Rate
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.configReasoning,
                  { color: themeColors.textSecondary },
                ]}
              >
                {adaptiveConfig.reasoning}
              </Text>
            </GlassCard>

            {/* Focus Target Selection */}
            <GlassCard theme={theme} style={styles.targetCard}>
              <Text
                style={[styles.targetCardTitle, { color: themeColors.text }]}
              >
                🎯 Focus Target
              </Text>

              {selectedTarget ? (
                <View style={styles.selectedTargetContainer}>
                  <View style={styles.selectedTargetHeader}>
                    <Text
                      style={[
                        styles.selectedTargetTitle,
                        { color: themeColors.text },
                      ]}
                    >
                      {selectedTarget.title}
                    </Text>
                    <View
                      style={[
                        styles.priorityBadge,
                        {
                          backgroundColor:
                            getPriorityColor(selectedTarget.priority) + '20',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityText,
                          { color: getPriorityColor(selectedTarget.priority) },
                        ]}
                      >
                        P{selectedTarget.priority}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.selectedTargetDescription,
                      { color: themeColors.textSecondary },
                    ]}
                  >
                    {selectedTarget.description}
                  </Text>

                  <View style={styles.selectedTargetMeta}>
                    <Text
                      style={[
                        styles.selectedTargetMetaText,
                        { color: themeColors.textSecondary },
                      ]}
                    >
                      {selectedTarget.type.toUpperCase()} • Est.{' '}
                      {selectedTarget.estimatedTime}min
                    </Text>
                  </View>
                </View>
              ) : (
                <Text
                  style={[
                    styles.noTargetText,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  No focus target selected
                </Text>
              )}

              <Button
                title="Change Target"
                onPress={() => setTargetSelectionVisible(true)}
                variant="outline"
                theme={theme}
                style={styles.changeTargetButton}
              />
            </GlassCard>

            {/* Session Analytics */}
            {sessionAnalytics && sessionAnalytics.totalSessions > 0 && (
              <GlassCard theme={theme} style={styles.analyticsCard}>
                <Text
                  style={[styles.analyticsTitle, { color: themeColors.text }]}
                >
                  📊 Session Insights
                </Text>
                <View style={styles.analyticsGrid}>
                  <View style={styles.analyticItem}>
                    <Text
                      style={[
                        styles.analyticValue,
                        { color: themeColors.primary },
                      ]}
                    >
                      {sessionAnalytics.totalSessions}
                    </Text>
                    <Text
                      style={[
                        styles.analyticLabel,
                        { color: themeColors.textSecondary },
                      ]}
                    >
                      Total Sessions
                    </Text>
                  </View>
                  <View style={styles.analyticItem}>
                    <Text
                      style={[
                        styles.analyticValue,
                        { color: themeColors.success },
                      ]}
                    >
                      {sessionAnalytics.averageActualDuration}m
                    </Text>
                    <Text
                      style={[
                        styles.analyticLabel,
                        { color: themeColors.textSecondary },
                      ]}
                    >
                      Avg Duration
                    </Text>
                  </View>
                  <View style={styles.analyticItem}>
                    <Text
                      style={[
                        styles.analyticValue,
                        { color: themeColors.warning },
                      ]}
                    >
                      {sessionAnalytics.sessionsToday}
                    </Text>
                    <Text
                      style={[
                        styles.analyticLabel,
                        { color: themeColors.textSecondary },
                      ]}
                    >
                      Today
                    </Text>
                  </View>
                </View>

                {sessionAnalytics.adaptiveRecommendations.length > 0 && (
                  <View style={styles.recommendationsContainer}>
                    <Text
                      style={[
                        styles.recommendationsTitle,
                        { color: themeColors.info },
                      ]}
                    >
                      💡 AI Recommendations:
                    </Text>
                    {sessionAnalytics.adaptiveRecommendations
                      .slice(0, 2)
                      .map((rec: string, index: number) => (
                        <Text
                          key={index}
                          style={[
                            styles.recommendationText,
                            { color: themeColors.textSecondary },
                          ]}
                        >
                          • {rec}
                        </Text>
                      ))}
                  </View>
                )}
              </GlassCard>
            )}

            {/* Start Session Button */}
            <Button
              title={`Start ${adaptiveConfig.duration}-Minute Focus Session`}
              onPress={startFocusSession}
              variant="primary"
              theme={theme}
              disabled={!selectedTarget}
              style={styles.startButton}
            />
          </ScrollView>
        )}
      </View>

      {/* Target Selection Modal */}
      <Modal
        visible={targetSelectionVisible}
        animationType="slide"
        presentationStyle="overFullScreen"
        onRequestClose={() => setTargetSelectionVisible(false)}
      >
        <ScreenContainer theme={theme}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              🎯 Select Focus Target
            </Text>
            <TouchableOpacity
              onPress={() => setTargetSelectionVisible(false)}
              style={styles.closeButton}
            >
              <Text
                style={[styles.closeButtonText, { color: themeColors.text }]}
              >
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
            {focusTargets.length === 0 ? (
              <GlassCard theme={theme} style={styles.emptyTargetsCard}>
                <Text
                  style={[
                    styles.emptyTargetsText,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  No focus targets available. Connect Todoist or create some
                  learning content to get started.
                </Text>
              </GlassCard>
            ) : (
              focusTargets.map((target) => (
                <TouchableOpacity
                  key={target.id}
                  onPress={() => {
                    setSelectedTarget(target);
                    setTargetSelectionVisible(false);
                  }}
                  style={styles.targetOption}
                >
                  <GlassCard
                    theme={theme}
                    style={[
                      styles.targetOptionCard,
                      selectedTarget?.id === target.id && [
                        styles.targetOptionSelected,
                        { borderColor: themeColors.primary },
                      ],
                    ]}
                  >
                    <View style={styles.targetOptionHeader}>
                      <Text
                        style={[
                          styles.targetOptionTitle,
                          { color: themeColors.text },
                        ]}
                      >
                        {target.title}
                      </Text>
                      <View
                        style={[
                          styles.priorityBadge,
                          {
                            backgroundColor:
                              getPriorityColor(target.priority) + '20',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.priorityText,
                            { color: getPriorityColor(target.priority) },
                          ]}
                        >
                          P{target.priority}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.targetOptionDescription,
                        { color: themeColors.textSecondary },
                      ]}
                    >
                      {target.description}
                    </Text>

                    <View style={styles.targetOptionMeta}>
                      <Text
                        style={[
                          styles.targetOptionMetaText,
                          { color: themeColors.textSecondary },
                        ]}
                      >
                        {target.type.toUpperCase()} •{' '}
                        {target.source.toUpperCase()} • {target.estimatedTime}
                        min
                      </Text>
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </ScreenContainer>
      </Modal>

      {/* Distraction Modal */}
      <Modal
        visible={showDistractionModal}
        animationType="slide"
        presentationStyle="overFullScreen"
        onRequestClose={() => setShowDistractionModal(false)}
      >
        <ScreenContainer theme={theme}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              😬 Log Distraction
            </Text>
            <TouchableOpacity
              onPress={() => setShowDistractionModal(false)}
              style={styles.closeButton}
            >
              <Text
                style={[styles.closeButtonText, { color: themeColors.text }]}
              >
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
            <GlassCard theme={theme} style={styles.distractionCard}>
              <Text style={[styles.distractionTitle, { color: themeColors.text }]}>
                What distracted you?
              </Text>

              {/* Reason Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>
                  Reason
                </Text>
                <TouchableOpacity
                  onPress={() => setShowReasonPicker(true)}
                  style={[styles.inputButton, { borderColor: themeColors.primary }]}
                >
                  <Text style={[styles.inputButtonText, { color: themeColors.text }]}>
                    {distractionReason}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Severity Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>
                  Severity (1-5)
                </Text>
                <View style={styles.severityContainer}>
                  {[1, 2, 3, 4, 5].map(severity => (
                    <TouchableOpacity
                      key={severity}
                      onPress={() => setDistractionSeverity(severity as 1 | 2 | 3 | 4 | 5)}
                      style={[
                        styles.severityButton,
                        {
                          backgroundColor: distractionSeverity === severity
                            ? themeColors.primary
                            : themeColors.surface + '40'
                        }
                      ]}
                    >
                      <Text
                        style={[
                          styles.severityText,
                          {
                            color: distractionSeverity === severity
                              ? themeColors.surface
                              : themeColors.text
                          }
                        ]}
                      >
                        {severity}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[styles.severityDescription, { color: themeColors.textSecondary }]}>
                  {distractionSeverity === 1 && 'Minor distraction - barely noticed'}
                  {distractionSeverity === 2 && 'Light distraction - quick glance'}
                  {distractionSeverity === 3 && 'Moderate distraction - brief engagement'}
                  {distractionSeverity === 4 && 'Significant distraction - lost focus'}
                  {distractionSeverity === 5 && 'Major distraction - completely derailed'}
                </Text>
              </View>

              {/* Trigger Type Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>
                  Trigger Type
                </Text>
              <TouchableOpacity
                onPress={() => setShowTriggerTypePicker(true)}
                style={[styles.inputButton, { borderColor: themeColors.primary }]}
              >
                <Text style={[styles.inputButtonText, { color: themeColors.text }]}>
                  {distractionTriggerType.charAt(0).toUpperCase() + distractionTriggerType.slice(1)}
                </Text>
              </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              <View style={styles.distractionActions}>
                <Button
                  title="Cancel"
                  onPress={() => setShowDistractionModal(false)}
                  variant="outline"
                  theme={theme}
                  style={styles.cancelButton}
                />
                <Button
                  title="Log Distraction"
                  onPress={handleLogDistraction}
                  variant="primary"
                  theme={theme}
                  style={styles.logButton}
                />
              </View>
            </GlassCard>
          </ScrollView>
        </ScreenContainer>
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
                <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                  Select Reason
                </Text>
                <TouchableOpacity
                  onPress={() => setShowReasonPicker(false)}
                  style={styles.closeButton}
                >
                  <Text
                    style={[styles.closeButtonText, { color: themeColors.text }]}
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
                  'Other'
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
                <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                  Select Trigger Type
                </Text>
                <TouchableOpacity
                  onPress={() => setShowTriggerTypePicker(false)}
                  style={styles.closeButton}
                >
                  <Text
                    style={[styles.closeButtonText, { color: themeColors.text }]}
                  >
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScrollContent}>
                {[
                  'internal',
                  'external',
                  'notification',
                  'unknown'
                ].map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => {
                      setDistractionTriggerType(type as 'internal' | 'external' | 'notification' | 'unknown');
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
                ))}
              </ScrollView>
            </GlassCard>
          </View>
        </View>
      </Modal>

      <HamburgerMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={onNavigate}
        currentScreen="focus-timer"
        theme={theme}
      />
    </ScreenContainer>
  );
};

/**
 * Helper function to get priority color
 */
const getPriorityColor = (priority: number): string => {
  switch (priority) {
    case 4:
      return '#EF4444'; // High priority - red
    case 3:
      return '#F59E0B'; // Medium priority - orange
    case 2:
      return '#3B82F6'; // Low priority - blue
    case 1:
      return '#6B7280'; // Very low priority - gray
    default:
      return '#6B7280';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    paddingTop: 100, // Account for header
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.md,
  },

  sessionCount: {
    ...typography.caption,
    fontWeight: '600',
  },

  // Active Session View
  activeSessionContainer: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  timerCard: {
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  targetHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  targetTitle: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  targetType: {
    ...typography.caption,
    fontWeight: '600',
  },
  timerDisplay: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  timerText: {
    fontSize: 64,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  timerSubtext: {
    ...typography.body,
    fontWeight: '600',
    letterSpacing: 2,
  },
  progressContainer: {
    marginBottom: spacing.lg,
  },
  progressRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingBackground: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressRingFill: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: 'transparent',
    borderTopColor: '#4F46E5',
  },
  progressRingCenter: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercentage: {
    ...typography.h4,
    fontWeight: 'bold',
  },
  sessionControls: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonText: {
    fontSize: 24,
  },
  focusLockCard: {
    padding: spacing.md,
    alignItems: 'center',
  },
  focusLockTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  focusLockText: {
    ...typography.caption,
    textAlign: 'center',
  },

  // Setup View
  setupContainer: {
    flex: 1,
  },
  setupContent: {
    padding: spacing.lg,
  },
  configCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  configTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  configStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  configStat: {
    alignItems: 'center',
  },
  configStatValue: {
    ...typography.h2,
    fontWeight: '600',
  },
  configStatLabel: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  configReasoning: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Target Selection
  targetCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  targetCardTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  selectedTargetContainer: {
    marginBottom: spacing.md,
  },
  selectedTargetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  selectedTargetTitle: {
    ...typography.h4,
    flex: 1,
    marginRight: spacing.sm,
  },
  selectedTargetDescription: {
    ...typography.body,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  selectedTargetMeta: {
    marginBottom: spacing.sm,
  },
  selectedTargetMetaText: {
    ...typography.caption,
    fontWeight: '500',
  },
  noTargetText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  changeTargetButton: {
    marginTop: spacing.sm,
  },
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  priorityText: {
    ...typography.caption,
    fontWeight: '600',
  },

  // Analytics
  analyticsCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  analyticsTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  analyticsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  analyticItem: {
    alignItems: 'center',
  },
  analyticValue: {
    ...typography.h3,
    fontWeight: '600',
  },
  analyticLabel: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  recommendationsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  recommendationsTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  recommendationText: {
    ...typography.caption,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },

  startButton: {
    marginTop: spacing.md,
  },

  // Modal
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: 60, // Account for status bar
  },
  modalTitle: {
    ...typography.h3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  closeButtonText: {
    fontSize: 16,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  modalScrollContent: {
    paddingBottom: 20, // Extra bottom padding to prevent cutoff
  },
  emptyTargetsCard: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyTargetsText: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  targetOption: {
    marginBottom: spacing.md,
  },
  targetOptionCard: {
    padding: spacing.md,
  },
  targetOptionSelected: {
    borderWidth: 2,
  },
  targetOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  targetOptionTitle: {
    ...typography.body,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
  },
  targetOptionDescription: {
    ...typography.caption,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  targetOptionMeta: {},
  targetOptionMetaText: {
    ...typography.caption,
    fontWeight: '500',
  },

  // Distraction Modal
  distractionCard: {
    padding: spacing.lg,
  },
  distractionTitle: {
    ...typography.h3,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  inputButton: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  inputButtonText: {
    ...typography.body,
    flex: 1,
  },
  inputButtonArrow: {
    ...typography.caption,
    fontSize: 14,
  },
  severityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  severityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityText: {
    ...typography.body,
    fontWeight: '600',
  },
  severityDescription: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  distractionActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
  },
  logButton: {
    flex: 1,
  },

  // Picker Modals
  pickerOption: {
    marginBottom: spacing.md,
  },
  pickerOptionCard: {
    padding: spacing.md,
  },
  pickerOptionSelected: {
    borderWidth: 2,
  },
  pickerOptionText: {
    ...typography.body,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  pickerModalContent: {
    width: '90%',
    maxHeight: '70%',
  },
  pickerModalCard: {
    maxHeight: '100%',
  },
});
