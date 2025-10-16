/**
 * SynapseBuilderScreen - Revolutionary Neuroplasticity Training Interface
 *
 * The world's first interactive synapse strengthening system for learning optimization.
 * Uses neuroscience principles to identify and target weak neural connections.
 *
 * Core Features:
 * - Real-time synapse strength visualization
 * - AI-generated micro-tasks for connection strengthening
 * - Adaptive difficulty based on neuroplasticity research
 * - Spaced repetition optimized for synaptic strengthening
 * - Progress tracking with neuroplasticity metrics
 * - Mixed practice and interleaving for maximum neural adaptation
 */

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedGestureHandler,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  TapGestureHandler,
} from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

// Services and utilities
import {
  MindMapGenerator,
  NeuralNode,
  NeuralLink,
} from '../../services/learning/MindMapGeneratorService';
import { SynapseBuilderService } from '../../services/NeuroPlastisity/SynapseBuilderService';
import { NeuroplasticityTracker } from '../../services/NeuroPlastisity/NeuroplasticityTracker';
import { MicroTaskGenerator } from '../../services/NeuroPlastisity/MicroTaskGenerator';
import HybridStorageService from '../../services/storage/HybridStorageService';
import { GlassCard } from '../../components/GlassComponents';

// Enhanced data interfaces
export interface SynapseEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  strength: number; // 0-1 normalized
  lastPracticeDate: Date;
  practiceCount: number;
  retentionRate: number;
  plasticityScore: number;
  urgencyLevel: 'critical' | 'moderate' | 'stable';
  connectionType:
    | 'association'
    | 'prerequisite'
    | 'similarity'
    | 'logical'
    | 'temporal';
  microTasksGenerated: number;
  strengthHistory: Array<{ date: Date; strength: number }>;
  neuralPathways: string[];
  cognitiveLoad: number;
  lastReviewResult: 'success' | 'partial' | 'failed' | null;
}

export interface NeuroplasticitySession {
  id: string;
  sessionType:
    | 'synapse_strengthening'
    | 'pathway_building'
    | 'cluster_integration';
  targetEdgeIds: string[];
  startTime: Date;
  endTime?: Date;
  completedTasks: number;
  successRate: number;
  cognitiveStrain: number;
  plasticityGains: Array<{ edgeId: string; strengthDelta: number }>;
  adaptationsTriggered: string[];
  nextSessionRecommendations: string[];
}

export interface MicroTask {
  id: string;
  edgeId: string;
  taskType: 'recall' | 'connect' | 'synthesize' | 'apply' | 'create';
  sourceNodeContent: any;
  targetNodeContent: any;
  prompt: string;
  expectedResponse: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTimeMinutes: number;
  cognitiveSkills: string[];
  plasticityBenefit: number;
  adaptiveHints: string[];
  successCriteria: string[];
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Neuroplasticity color themes
const NEUROPLASTICITY_COLORS = {
  critical: {
    primary: '#EF4444',
    secondary: '#FCA5A5',
    glow: '#FEE2E2',
    gradient: ['#EF4444', '#DC2626'],
  },
  moderate: {
    primary: '#F59E0B',
    secondary: '#FCD34D',
    glow: '#FEF3C7',
    gradient: ['#F59E0B', '#D97706'],
  },
  stable: {
    primary: '#10B981',
    secondary: '#6EE7B7',
    glow: '#D1FAE5',
    gradient: ['#10B981', '#059669'],
  },
  strengthening: {
    primary: '#6366F1',
    secondary: '#A5B4FC',
    glow: '#E0E7FF',
    gradient: ['#6366F1', '#4F46E5'],
  },
  plasticity: {
    primary: '#EC4899',
    secondary: '#F9A8D4',
    glow: '#FCE7F3',
    gradient: ['#EC4899', '#DB2777'],
  },
};

// Top-level Synapse card component to avoid calling hooks conditionally inside
// a render helper. Hooks must be used at component-level so their order is stable.
const SynapseCard: React.FC<{
  edge: SynapseEdge;
  onSelect: (edge: SynapseEdge) => void;
  synapseAnimations: any;
  recentStrengthening: string[];
}> = ({ edge, onSelect, synapseAnimations, recentStrengthening }) => {
  const colors = NEUROPLASTICITY_COLORS[edge.urgencyLevel];
  const strengthPercentage = edge.strength * 100;

  const animatedStyle = useAnimatedStyle(() => {
    const scale = synapseAnimations.value?.[edge.id] || 1;
    return {
      transform: [{ scale }],
    };
  });

  const isRecent = recentStrengthening.includes(edge.id);

  return (
    <Animated.View key={edge.id} style={[styles.synapseCard, animatedStyle]}>
      <TouchableOpacity
        onPress={() => onSelect(edge)}
        style={styles.synapseCardContent}
      >
        <LinearGradient
          colors={colors.gradient as unknown as string[]}
          style={styles.synapseGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.synapseHeader}>
            <Text style={styles.synapseType}>
              {edge.connectionType.toUpperCase()}
            </Text>
            <Text style={styles.synapseStrength}>
              {Math.round(strengthPercentage)}%
            </Text>
          </View>

          <View style={styles.synapseProgress}>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: `${strengthPercentage}%`,
                    backgroundColor: isRecent
                      ? NEUROPLASTICITY_COLORS.strengthening.primary
                      : colors.primary,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.synapseMetrics}>
            <Text style={styles.metricText}>
              Practice: {edge.practiceCount}x
            </Text>
            <Text style={styles.metricText}>
              Retention: {Math.round(edge.retentionRate * 100)}%
            </Text>
          </View>

          {edge.urgencyLevel === 'critical' && (
            <View style={styles.urgencyBadge}>
              <Text style={styles.urgencyText}>⚠️ CRITICAL</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface Props {
  navigation: any;
  theme: 'light' | 'dark';
}

export const SynapseBuilderScreen: React.FC<Props> = ({
  navigation,
  theme,
}) => {
  // State management
  const [neuralGraph, setNeuralGraph] = useState<{
    nodes: NeuralNode[];
    links: NeuralLink[];
  } | null>(null);
  const [synapseEdges, setSynapseEdges] = useState<SynapseEdge[]>([]);
  const [selectedEdge, setSelectedEdge] = useState<SynapseEdge | null>(null);
  const [currentTask, setCurrentTask] = useState<MicroTask | null>(null);
  const [activeSession, setActiveSession] =
    useState<NeuroplasticitySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [userResponse, setUserResponse] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [plasticityScore, setPlasticityScore] = useState(0);
  const [recentStrengthening, setRecentStrengthening] = useState<string[]>([]);

  // Animation values
  const synapseAnimations = useSharedValue<Record<string, number>>({});
  const progressRing = useSharedValue(0);
  const plasticityPulse = useSharedValue(1);
  const taskCompletionGlow = useSharedValue(0);

  // Animated styles - must be defined at top level to maintain hook order
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: plasticityPulse.value }],
  }));

  const progressGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: taskCompletionGlow.value * 0.1 + 1 }],
  }));

  // Services
  const synapseService = useRef(new SynapseBuilderService()).current;
  const plasticityTracker = useRef(new NeuroplasticityTracker()).current;
  const taskGenerator = useRef(new MicroTaskGenerator()).current;

  // Initialize screen data
  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      setLoading(true);

      // Load neural graph
      const graph = await MindMapGenerator.getInstance().generateNeuralGraph(
        false,
      );
      setNeuralGraph(graph);

      // Generate synapse edges from neural links
      const edges = await synapseService.analyzeSynapticConnections(
        graph.links,
        graph.nodes,
      );

      setSynapseEdges(edges);

      // Calculate initial plasticity score
      const score = await plasticityTracker.calculateOverallPlasticityScore(
        edges,
      );
      setPlasticityScore(score);

      // Start plasticity tracking animations
      progressRing.value = withTiming(score / 100, { duration: 2000 });
      plasticityPulse.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1500 }),
          withTiming(1, { duration: 1500 }),
        ),
        -1,
        false,
      );

      setLoading(false);
    } catch (error) {
      console.error('Error initializing Synapse Builder:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to initialize neuroplasticity analysis');
    }
  };

  // Get weak synapses for priority training
  const weakSynapses = useMemo(() => {
    return synapseEdges
      .filter((edge) => edge.strength < 0.5 && edge.urgencyLevel !== 'stable')
      .sort((a, b) => a.strength - b.strength)
      .slice(0, 10); // Top 10 weakest
  }, [synapseEdges]);

  // Get critical synapses needing immediate attention
  const criticalSynapses = useMemo(() => {
    return synapseEdges.filter((edge) => edge.urgencyLevel === 'critical');
  }, [synapseEdges]);

  // Handle synapse selection for strengthening
  const handleSynapseSelect = useCallback(
    async (edge: SynapseEdge) => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedEdge(edge);

        // Generate micro-task for this synapse
        const sourceNode = neuralGraph?.nodes.find(
          (n) => n.id === edge.sourceNodeId,
        );
        const targetNode = neuralGraph?.nodes.find(
          (n) => n.id === edge.targetNodeId,
        );

        if (sourceNode && targetNode) {
          const task = await taskGenerator.generateMicroTask(
            edge,
            sourceNode,
            targetNode,
          );
          setCurrentTask(task);
          setShowTaskModal(true);

          // Animate selected synapse
          synapseAnimations.value = {
            ...synapseAnimations.value,
            [edge.id]: withSpring(1.2, { damping: 15 }),
          };
        }
      } catch (error) {
        console.error('Error selecting synapse:', error);
        Alert.alert('Error', 'Failed to generate strengthening task');
      }
    },
    [neuralGraph, taskGenerator, synapseAnimations],
  );

  // Start neuroplasticity training session
  const startTrainingSession = useCallback(async () => {
    try {
      const session: NeuroplasticitySession = {
        id: `session_${Date.now()}`,
        sessionType: 'synapse_strengthening',
        // Ensure we only include existing ids
        targetEdgeIds: weakSynapses
          .slice(0, 5)
          .map((e) => e?.id)
          .filter(Boolean) as string[], // Focus on top 5 weak synapses
        startTime: new Date(),
        completedTasks: 0,
        successRate: 0,
        cognitiveStrain: 0,
        plasticityGains: [],
        adaptationsTriggered: [],
        nextSessionRecommendations: [],
      };

      setActiveSession(session);

      // Start with first weak synapse
      if (weakSynapses.length > 0 && weakSynapses[0]) {
        await handleSynapseSelect(weakSynapses[0]);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error starting training session:', error);
      Alert.alert('Error', 'Failed to start training session');
    }
  }, [weakSynapses, handleSynapseSelect]);

  // Process task completion
  const handleTaskCompletion = useCallback(
    async (success: boolean, response: string) => {
      if (!currentTask || !selectedEdge || !activeSession) return;

      try {
        // Calculate success and plasticity gain
        const plasticityGain = success
          ? currentTask.plasticityBenefit
          : currentTask.plasticityBenefit * 0.3;

        // Update synapse strength
        const updatedEdge = await synapseService.updateSynapseStrength(
          selectedEdge.id,
          plasticityGain,
          success ? 'success' : 'failed',
        );

        // Update session progress
        const updatedSession = {
          ...activeSession,
          completedTasks: activeSession.completedTasks + 1,
          plasticityGains: [
            ...activeSession.plasticityGains,
            { edgeId: selectedEdge.id, strengthDelta: plasticityGain },
          ],
          adaptationsTriggered: success
            ? [...activeSession.adaptationsTriggered, 'synaptic_strengthening']
            : activeSession.adaptationsTriggered,
        };

        setActiveSession(updatedSession);

        // Update UI state
        setSynapseEdges((prev) =>
          prev.map((edge) =>
            edge.id === selectedEdge.id ? updatedEdge : edge,
          ),
        );

        if (success) {
          setRecentStrengthening((prev) => [...prev, selectedEdge.id]);
          taskCompletionGlow.value = withSequence(
            withTiming(1, { duration: 300 }),
            withTiming(0, { duration: 1000 }),
          );
        }

        // Close current task and potentially load next
        setShowTaskModal(false);
        setCurrentTask(null);
        setSelectedEdge(null);
        setUserResponse('');

        // Continue with next target synapse if session is ongoing
        const completedEdgeIds = updatedSession.plasticityGains.map(
          (g) => g.edgeId,
        );
        const remainingTargetIds = updatedSession.targetEdgeIds.filter(
          (id) => !completedEdgeIds.includes(id),
        );

        if (remainingTargetIds.length > 0) {
          setTimeout(() => {
            const nextEdgeId = remainingTargetIds[0];
            const nextEdge = synapseEdges.find((e) => e.id === nextEdgeId);
            if (nextEdge) {
              handleSynapseSelect(nextEdge);
            }
          }, 1000);
        } else {
          // Session complete
          await completeTrainingSession(updatedSession);
        }

        Haptics.impactAsync(
          success
            ? Haptics.ImpactFeedbackStyle.Heavy
            : Haptics.ImpactFeedbackStyle.Light,
        );
      } catch (error) {
        console.error('Error processing task completion:', error);
        Alert.alert('Error', 'Failed to process task result');
      }
    },
    [
      currentTask,
      selectedEdge,
      activeSession,
      synapseService,
      weakSynapses,
      handleSynapseSelect,
      taskCompletionGlow,
    ],
  );

  // Complete training session
  const completeTrainingSession = useCallback(
    async (session: NeuroplasticitySession) => {
      try {
        const completedSession = {
          ...session,
          endTime: new Date(),
          successRate:
            session.plasticityGains.length / session.completedTasks || 0,
          nextSessionRecommendations:
            await plasticityTracker.generateSessionRecommendations(session),
        };

        // Save session data
        await HybridStorageService.getInstance().setItem(
          'neuroplasticity_sessions',
          [completedSession],
        );

        // Update overall plasticity score
        const newScore =
          await plasticityTracker.calculateOverallPlasticityScore(synapseEdges);
        setPlasticityScore(newScore);
        progressRing.value = withTiming(newScore / 100, { duration: 2000 });

        setActiveSession(null);
        setShowProgressModal(true);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error('Error completing session:', error);
      }
    },
    [synapseEdges, plasticityTracker, progressRing],
  );

  // (Synapse card rendering moved to the SynapseCard component above to ensure hook order stability)

  // Render task modal
  const renderTaskModal = () => {
    if (!currentTask || !selectedEdge) return null;

    return (
      <Modal visible={showTaskModal} transparent animationType="fade">
        <BlurView intensity={50} style={styles.modalOverlay}>
          <GlassCard theme={theme} style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <Text style={styles.taskTitle}>Synapse Strengthening</Text>
              <Text style={styles.taskType}>
                {currentTask.taskType.toUpperCase()}
              </Text>
            </View>

            <View style={styles.taskContent}>
              <Text style={styles.taskPrompt}>{currentTask.prompt}</Text>

              <TextInput
                style={styles.responseInput}
                value={userResponse}
                onChangeText={setUserResponse}
                placeholder="Enter your response..."
                multiline
                numberOfLines={4}
                placeholderTextColor="#9CA3AF"
              />

              <View style={styles.taskMetrics}>
                <Text style={styles.metricLabel}>
                  Difficulty: {currentTask.difficulty}
                </Text>
                <Text style={styles.metricLabel}>
                  Estimated: {currentTask.estimatedTimeMinutes}min
                </Text>
                <Text style={styles.metricLabel}>
                  Plasticity Benefit:{' '}
                  {Math.round(currentTask.plasticityBenefit * 100)}%
                </Text>
              </View>
            </View>

            <View style={styles.taskActions}>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => handleTaskCompletion(false, userResponse)}
              >
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={() => handleTaskCompletion(true, userResponse)}
                disabled={!userResponse.trim()}
              >
                <LinearGradient
                  colors={
                    NEUROPLASTICITY_COLORS.strengthening
                      .gradient as unknown as string[]
                  }
                  style={styles.submitGradient}
                >
                  <Text style={styles.submitButtonText}>Submit</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </BlurView>
      </Modal>
    );
  };

  // Render progress modal
  const renderProgressModal = () => {
    return (
      <Modal visible={showProgressModal} transparent animationType="fade">
        <BlurView intensity={50} style={styles.modalOverlay}>
          <GlassCard theme={theme} style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>
                🧠 Neuroplasticity Session Complete!
              </Text>

              <Animated.View style={progressGlowStyle}>
                <Text style={styles.plasticityScore}>
                  Overall Plasticity: {Math.round(plasticityScore)}%
                </Text>
              </Animated.View>
            </View>

            <View style={styles.sessionStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {activeSession?.completedTasks || 0}
                </Text>
                <Text style={styles.statLabel}>Tasks Completed</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {Math.round((activeSession?.successRate || 0) * 100)}%
                </Text>
                <Text style={styles.statLabel}>Success Rate</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {recentStrengthening.length}
                </Text>
                <Text style={styles.statLabel}>Synapses Strengthened</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => {
                setShowProgressModal(false);
                setRecentStrengthening([]);
              }}
            >
              <LinearGradient
                colors={
                  NEUROPLASTICITY_COLORS.plasticity
                    .gradient as unknown as string[]
                }
                style={styles.continueGradient}
              >
                <Text style={styles.continueButtonText}>Continue Training</Text>
              </LinearGradient>
            </TouchableOpacity>
          </GlassCard>
        </BlurView>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={NEUROPLASTICITY_COLORS.plasticity.primary}
          />
          <Text style={styles.loadingText}>
            Analyzing neural connections...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.screenTitle}>🧠 Synapse Builder</Text>
          <Text style={styles.screenSubtitle}>Neuroplasticity Training</Text>
        </View>

        <Animated.View style={headerAnimatedStyle}>
          <View style={styles.plasticityIndicator}>
            <Text style={styles.plasticityText}>
              {Math.round(plasticityScore)}%
            </Text>
          </View>
        </Animated.View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Critical Synapses Alert */}
        {criticalSynapses.length > 0 && (
          <GlassCard theme={theme} style={styles.alertCard}>
            <Text style={styles.alertTitle}>
              ⚠️ Critical Connections Detected
            </Text>
            <Text style={styles.alertText}>
              {criticalSynapses.length} neural connection
              {criticalSynapses.length > 1 ? 's' : ''} need immediate attention
              to prevent forgetting.
            </Text>
          </GlassCard>
        )}

        {/* Training Session Controls */}
        <GlassCard theme={theme} style={styles.controlCard}>
          <Text style={styles.controlTitle}>Neuroplasticity Training</Text>
          <Text style={styles.controlDescription}>
            Strengthen weak synaptic connections through targeted
            micro-exercises
          </Text>

          {!activeSession ? (
            <TouchableOpacity
              style={styles.startButton}
              onPress={startTrainingSession}
            >
              <LinearGradient
                colors={
                  NEUROPLASTICITY_COLORS.strengthening
                    .gradient as unknown as string[]
                }
                style={styles.startGradient}
              >
                <Text style={styles.startButtonText}>
                  🎯 Start Training Session
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={styles.sessionStatus}>
              <Text style={styles.sessionText}>
                Training in Progress... {activeSession.completedTasks} tasks
                completed
              </Text>
              <View style={styles.sessionProgress}>
                <View
                  style={[
                    styles.sessionProgressFill,
                    {
                      width: `${
                        (activeSession.completedTasks /
                          activeSession.targetEdgeIds.length) *
                        100
                      }%`,
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </GlassCard>

        {/* Weak Synapses Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            🎯 Priority Connections ({weakSynapses.length})
          </Text>
          <Text style={styles.sectionSubtitle}>
            These neural pathways need strengthening for optimal learning
          </Text>

          {weakSynapses.length > 0 ? (
            <View style={styles.synapseGrid}>
              {weakSynapses.map((edge) => (
                <SynapseCard
                  key={edge.id}
                  edge={edge}
                  onSelect={handleSynapseSelect}
                  synapseAnimations={synapseAnimations}
                  recentStrengthening={recentStrengthening}
                />
              ))}
            </View>
          ) : (
            <GlassCard theme={theme} style={styles.emptyStateCard}>
              <Text style={styles.emptyStateTitle}>
                📚 No Weak Connections Found
              </Text>
              <Text style={styles.emptyStateText}>
                Add more flashcards, notes, or learning content to build neural
                connections. The more you learn, the more synapses you'll have
                to strengthen!
              </Text>
            </GlassCard>
          )}
        </View>

        {/* Recent Progress */}
        {recentStrengthening.length > 0 && (
          <GlassCard theme={theme} style={styles.progressSection}>
            <Text style={styles.progressSectionTitle}>
              ✨ Recent Strengthening
            </Text>
            <Text style={styles.progressSectionText}>
              {recentStrengthening.length} connection
              {recentStrengthening.length > 1 ? 's' : ''} strengthened in this
              session
            </Text>
          </GlassCard>
        )}

        {/* Plasticity Insights */}
        <GlassCard theme={theme} style={styles.insightsCard}>
          <Text style={styles.insightsTitle}>🔬 Neuroplasticity Insights</Text>
          <View style={styles.insightsList}>
            <Text style={styles.insightItem}>
              • Total Connections: {synapseEdges.length}
            </Text>
            <Text style={styles.insightItem}>
              • Weak Connections: {weakSynapses.length}
            </Text>
            <Text style={styles.insightItem}>
              • Critical Connections: {criticalSynapses.length}
            </Text>
            <Text style={styles.insightItem}>
              • Plasticity Score: {Math.round(plasticityScore)}%
            </Text>
          </View>
        </GlassCard>
      </ScrollView>

      {/* Modals */}
      {renderTaskModal()}
      {renderProgressModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F23',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  screenTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  screenSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 2,
  },
  plasticityIndicator: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: NEUROPLASTICITY_COLORS.plasticity.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: NEUROPLASTICITY_COLORS.plasticity.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  plasticityText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  alertCard: {
    marginVertical: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: NEUROPLASTICITY_COLORS.critical.primary,
  },
  alertTitle: {
    color: NEUROPLASTICITY_COLORS.critical.primary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  alertText: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
  },
  controlCard: {
    marginTop: 16,
    marginBottom: 24,
    padding: 20,
  },
  controlTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  controlDescription: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  startButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  startGradient: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sessionStatus: {
    padding: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  sessionText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 8,
  },
  sessionProgress: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  sessionProgressFill: {
    height: '100%',
    backgroundColor: NEUROPLASTICITY_COLORS.strengthening.primary,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 16,
  },
  synapseGrid: {
    gap: 12,
  },
  synapseCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  synapseCardContent: {
    overflow: 'hidden',
  },
  synapseGradient: {
    padding: 16,
  },
  synapseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  synapseType: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
  },
  synapseStrength: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  synapseProgress: {
    marginBottom: 12,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  synapseMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricText: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.8,
  },
  urgencyBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: NEUROPLASTICITY_COLORS.critical.primary,
  },
  urgencyText: {
    color: NEUROPLASTICITY_COLORS.critical.primary,
    fontSize: 10,
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: NEUROPLASTICITY_COLORS.strengthening.primary,
  },
  progressSectionTitle: {
    color: NEUROPLASTICITY_COLORS.strengthening.primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressSectionText: {
    color: '#D1D5DB',
    fontSize: 14,
  },
  emptyStateCard: {
    marginTop: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyStateTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  insightsCard: {
    marginBottom: 24,
    padding: 20,
  },
  insightsTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  insightsList: {
    gap: 8,
  },
  insightItem: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  taskCard: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
  },
  taskHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  taskTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  taskType: {
    color: NEUROPLASTICITY_COLORS.strengthening.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  taskContent: {
    marginBottom: 24,
  },
  taskPrompt: {
    color: '#D1D5DB',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  responseInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  taskMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  taskActions: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  progressCard: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    alignItems: 'center',
  },
  progressHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  progressTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  plasticityScore: {
    color: NEUROPLASTICITY_COLORS.plasticity.primary,
    fontSize: 24,
    fontWeight: '700',
  },
  sessionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
  },
  continueButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  continueGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SynapseBuilderScreen;
