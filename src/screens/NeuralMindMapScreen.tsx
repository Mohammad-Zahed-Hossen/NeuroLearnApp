import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Alert,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { AppHeader, HamburgerMenu } from '../components/Navigation';
import {
  GlassCard,
  Button,
  ScreenContainer,
} from '../components/GlassComponents';
import { NeuralMindMap } from '../components/NeuralCanvas';
import { MiniPlayer } from '../components/MiniPlayerComponent';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../theme/colors';
import { ThemeType } from '../theme/colors';
import {
  MindMapGenerator,
  NeuralGraph,
  NeuralNode,
} from '../services/MindMapGeneratorService';
import { StorageService } from '../services/StorageService';
import { useFocus } from '../contexts/FocusContext';
import { useSoundscape } from '../contexts/SoundscapeContext';
import { SoundscapeType } from '../services/CognitiveSoundscapeEngine';

interface NeuralMindMapScreenProps {
  theme: ThemeType;
  onNavigate: (screen: string) => void;
  // Phase 5: Focus lock prop
  focusNodeId?: string | null;
}

/**
 * Phase 3: Enhanced ViewMode Interface with Health Analytics
 */
interface ViewMode {
  id: 'network' | 'clusters' | 'paths' | 'health';
  name: string;
  description: string;
  icon: string;
  color: string; // Added for visual distinction
  shortName: string; // For compact display
}

interface NodeDetail {
  node: NeuralNode;
  connections: number;
  centrality: number;
  recommendations: string[];
  networkPosition: 'central' | 'peripheral' | 'bridge';
  healthInsights?: string[]; // Phase 3 addition
  pathRecommendations?: string[]; // Phase 3 addition
}

interface LoadingState {
  isGenerating: boolean;
  isCalculating: boolean;
  isRefreshing: boolean;
  progress?: number;
}

interface ScreenContainerProps {
  children: React.ReactNode;
  theme: ThemeType;
  style?: any;
  gradient?: boolean;
}

/**
 * Phase 3: Enhanced VIEW_MODES with Color Coding and Analytics
 */
const VIEW_MODES: ViewMode[] = [
  {
    id: 'network',
    name: 'Neural Network',
    shortName: 'Network',
    description: 'Full brain-like visualization of all connections',
    icon: '🧠',
    color: '#6366F1', // Indigo for network view
  },
  {
    id: 'health',
    name: 'Cognitive Health',
    shortName: 'Health',
    description: 'Highlight weak areas needing immediate attention',
    icon: '❤️‍🩹',
    color: '#EF4444', // Red for health urgency
  },
  {
    id: 'clusters',
    name: 'Knowledge Clusters',
    shortName: 'Clusters',
    description: 'Group related concepts by knowledge domain',
    icon: '🔗',
    color: '#10B981', // Green for organized clusters
  },
  {
    id: 'paths',
    name: 'Learning Paths',
    shortName: 'Paths',
    description: 'Show optimal learning sequences and prerequisites',
    icon: '🛤️',
    color: '#F59E0B', // Amber for learning paths
  },
];

const COGNITIVE_LOAD_THRESHOLDS = {
  LOW: 0.3,
  MODERATE: 0.6,
  HIGH: 0.8,
} as const;

export const NeuralMindMapScreen: React.FC<NeuralMindMapScreenProps> = ({
  theme,
  onNavigate,
  focusNodeId,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isGenerating: true,
    isCalculating: false,
    isRefreshing: false,
  });
  const [neuralGraph, setNeuralGraph] = useState<NeuralGraph | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode['id']>('network');
  const [selectedNode, setSelectedNode] = useState<NeuralNode | null>(null);
  const [nodeDetailVisible, setNodeDetailVisible] = useState(false);
  const [nodeDetail, setNodeDetail] = useState<NodeDetail | null>(null);
  const [cognitiveLoad, setCognitiveLoad] = useState(0.5);
  const [error, setError] = useState<string | null>(null);

  const { focusState, startFocusSession } = useFocus();

  const { width, height } = Dimensions.get('window');
  const themeColors = colors[theme];

  // Memoize services
  const mindMapGenerator = useMemo(() => MindMapGenerator.getInstance(), []);
  const storage = useMemo(() => StorageService.getInstance(), []);

  // Get current view mode configuration
  const currentViewMode = useMemo(
    () => VIEW_MODES.find(mode => mode.id === viewMode) || VIEW_MODES[0],
    [viewMode]
  );

  /**
   * Phase 3 Enhancement: View Mode Analytics
   * Calculate mode-specific metrics for display
   */
  const viewModeAnalytics = useMemo(() => {
    if (!neuralGraph) return null;

    const analytics = {
      network: {
        totalNodes: neuralGraph.nodes.length,
        totalLinks: neuralGraph.links.length,
        density: neuralGraph.metrics?.density || 0,
        insight: `${neuralGraph.nodes.length} concepts connected`,
      },
      health: {
        overallHealth: neuralGraph.healthMetrics?.overallHealth || 0,
        criticalNodes: neuralGraph.healthMetrics?.criticalNodes.length || 0,
        healthyNodes: neuralGraph.healthMetrics?.healthyNodes.length || 0,
        insight: `${
          neuralGraph.healthMetrics?.criticalNodes.length || 0
        } critical concepts need attention`,
      },
      clusters: {
        clusterCount: neuralGraph.clusters?.length || 0,
        averageClusterHealth:
          neuralGraph.clusters && neuralGraph.clusters.length > 0
            ? neuralGraph.clusters.reduce((sum, c) => sum + c.health, 0) /
              neuralGraph.clusters.length
            : 0,
        weakestCluster:
          neuralGraph.clusters?.sort((a, b) => a.health - b.health)[0]?.name ||
          'None',
        insight: `${
          neuralGraph.clusters?.length || 0
        } knowledge domains identified`,
      },
      paths: {
        pathCount: neuralGraph.learningPaths?.length || 0,
        shortestPath:
          neuralGraph.learningPaths && neuralGraph.learningPaths.length > 0
            ? neuralGraph.learningPaths.reduce(
                (min, path) =>
                  path.estimatedTimeMinutes < min
                    ? path.estimatedTimeMinutes
                    : min,
                Infinity,
              )
            : 0,
        averagePathTime:
          neuralGraph.learningPaths && neuralGraph.learningPaths.length > 0
            ? neuralGraph.learningPaths.reduce(
                (sum, p) => sum + p.estimatedTimeMinutes,
                0,
              ) / neuralGraph.learningPaths.length
            : 0, //issue here
        insight: `${
          neuralGraph.learningPaths?.length || 0
        } optimal learning sequences available`,
      },
    };

    return analytics[viewMode] || analytics.network;
  }, [neuralGraph, viewMode]);

  // Initialize screen
  useEffect(() => {
    let mounted = true;
    const initialize = async () => {
      try {
        await Promise.all([generateNeuralGraph(), calculateCognitiveLoad()]);
      } catch (error) {
        if (mounted) {
          console.error('Initialization error:', error);
          setError('Failed to initialize neural map');
        }
      }
    };
    initialize();
    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Generate neural graph with enhanced error handling
   */
  const generateNeuralGraph = useCallback(
    async (forceRefresh = false) => {
      try {
        setLoadingState((prev) => ({ ...prev, isGenerating: true }));
        setError(null);

        const graph = await mindMapGenerator.generateNeuralGraph(forceRefresh);
        setNeuralGraph(graph);

        // Analytics event with Phase 3 metrics
        console.log('🧠 Phase 3 Neural Graph Generated:', {
          nodes: graph.nodes.length,
          links: graph.links.length,
          health: graph.knowledgeHealth,
          clusters: graph.clusters?.length || 0,
          paths: graph.learningPaths?.length || 0,
        });

      } catch (error: unknown) {
        console.error('Error generating neural graph:', error);
        setError((error as Error)?.message || 'Failed to generate brain map');
        Alert.alert(
          'Neural Map Error',
          'Failed to generate your brain map. Make sure you have some learning data first.',
          [
            {
              text: 'Go to Flashcards',
              onPress: () => onNavigate('flashcards'),
            },
            { text: 'Try Again', onPress: () => generateNeuralGraph(true) },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } finally {
        setLoadingState((prev) => ({ ...prev, isGenerating: false }));
      }
    },
    [mindMapGenerator, onNavigate]
  );

  /**
   * Calculate current cognitive load
   */
  const calculateCognitiveLoad = useCallback(async () => {
    try {
      setLoadingState((prev) => ({ ...prev, isCalculating: true }));

      const [flashcards, tasks, sessions] = await Promise.all([
        storage.getFlashcards(),
        storage.getTasks(),
        storage.getStudySessions(),
      ]);

      const dueFlashcards = flashcards.filter(
        (card) => new Date(card.nextReview) <= new Date()
      ).length;

      const urgentTasks = tasks.filter(
        (task) => !task.isCompleted && task.priority >= 3
      ).length;

      const recentFailures = sessions
        .filter((s) => s.type === 'flashcards' && !s.completed)
        .filter(
          (s) => Date.now() - s.startTime.getTime() < 24 * 60 * 60 * 1000
        ).length;

      const baseLoad = Math.min(1, (dueFlashcards * 0.1 + urgentTasks * 0.2) / 10);
      const stressLoad = Math.min(0.3, recentFailures * 0.05);
      const totalLoad = Math.min(1, baseLoad + stressLoad);

      setCognitiveLoad(totalLoad);
    } catch (error) {
      console.error('Error calculating cognitive load:', error);
      setCognitiveLoad(0.5);
    } finally {
      setLoadingState((prev) => ({ ...prev, isCalculating: false }));
    }
  }, [storage]);

  /**
   * Phase 3 Enhancement: Smart View Mode Switch
   * Automatically suggest best view mode based on current state
   */
  const handleViewModeChange = useCallback((newMode: ViewMode['id']) => {
    setViewMode(newMode);

    // Analytics and smart suggestions
    const suggestions: Record<ViewMode['id'], string> = {
      health: '🏥 Health Mode: Focusing on concepts that need immediate attention',
      clusters: '🔗 Cluster Mode: Viewing knowledge organized by domain',
      paths: '🛤️ Path Mode: Showing optimal learning sequences',
      network: '🧠 Network Mode: Full neural visualization of all connections',
    };

    console.log('View Mode Changed:', suggestions[newMode]);

    // Clear selected node when switching modes for better UX
    setSelectedNode(null);
  }, []);

  /**
   * Phase 3 Enhancement: Intelligent Node Press Handler
   * Provides mode-specific node interaction
   */
  const handleNodePress = useCallback(
    (node: NeuralNode) => {
      setSelectedNode(node);
      generateNodeDetail(node);

      // Mode-specific analytics
      console.log(`Node selected in ${viewMode} mode:`, {
        id: node.id,
        type: node.type,
        health: node.healthScore,
        mastery: node.masteryLevel,
        isActive: node.isActive,
        mode: viewMode,
      });
    },
    [viewMode]
  );

  /**
   * Enhanced node detail generation with mode-specific insights
   */
  const generateNodeDetail = useCallback(
    (node: NeuralNode) => {
      if (!neuralGraph) return;

      try {
        // Calculate network metrics
        const connections = neuralGraph.links.filter(
          (link) => link.source === node.id || link.target === node.id
        ).length;

        const centrality = connections / Math.max(1, neuralGraph.nodes.length - 1);

        const networkPosition: NodeDetail['networkPosition'] =
          centrality > 0.7 ? 'central' : centrality > 0.3 ? 'bridge' : 'peripheral';

        // Generate enhanced AI recommendations
        const recommendations = generateEnhancedRecommendations(node, networkPosition);

        // Phase 3: Mode-specific insights
        const healthInsights = generateHealthInsights(node);
        const pathRecommendations = generatePathRecommendations(node);

        setNodeDetail({
          node,
          connections,
          centrality,
          recommendations,
          networkPosition,
          healthInsights,
          pathRecommendations,
        });
      } catch (error) {
        console.error('Error generating node detail:', error);
      }
    },
    [neuralGraph]
  );

  /**
   * Phase 3: Generate health-specific insights
   */
  const generateHealthInsights = useCallback((node: NeuralNode): string[] => {
    const insights: string[] = [];

    if (node.healthScore !== undefined) {
      if (node.healthScore < 0.3) {
        insights.push('🚨 Critical health - requires immediate intervention');
        insights.push('📈 Success rate below 30% - foundational issues detected');
      } else if (node.healthScore < 0.7) {
        insights.push('⚠️ Moderate health - regular maintenance needed');
        insights.push('📊 Success rate 30-70% - room for improvement');
      } else {
        insights.push('✅ Excellent health - well-maintained concept');
        insights.push('🌟 Success rate above 70% - strong foundation');
      }
    }

    if (node.isActive) {
      insights.push('🔥 Due for review - memory strength declining');
    }

    return insights;
  }, []);

  /**
   * Phase 3: Generate path-specific recommendations
   */
  const generatePathRecommendations = useCallback((node: NeuralNode): string[] => {
    if (!neuralGraph?.learningPaths) return [];

    const recommendations: string[] = [];

    // Find paths involving this node
    const involvedPaths = neuralGraph.learningPaths.filter(path =>
      path.path.some(pathNode => pathNode.id === node.id)
    );

    if (involvedPaths.length > 0) {
      recommendations.push(`🛤️ Part of ${involvedPaths.length} learning sequences`);

      const shortestPath = involvedPaths.reduce((shortest, current) =>
        current.estimatedTimeMinutes < shortest.estimatedTimeMinutes ? current : shortest
      );

      recommendations.push(`⏱️ Shortest path: ${shortestPath.estimatedTimeMinutes} minutes`);
    }

    return recommendations;
  }, [neuralGraph]);

  /**
   * Enhanced AI recommendations with Phase 3 features
   */
  const generateEnhancedRecommendations = useCallback(
    (node: NeuralNode, position: NodeDetail['networkPosition']): string[] => {
      const recommendations: string[] = [];

      // Health-based recommendations
      if (node.healthScore !== undefined) {
        if (node.healthScore < 0.3) {
          recommendations.push('🎯 URGENT: Review this concept daily until mastery improves');
          recommendations.push('🧩 Break into smaller, manageable pieces');
        } else if (node.healthScore < 0.7) {
          recommendations.push('📈 Regular practice will improve health score');
          recommendations.push('🔗 Connect to related concepts you know well');
        } else {
          recommendations.push('🌟 Excellent health - use as foundation for new learning');
        }
      }

      // Mastery-based recommendations
      if (node.masteryLevel < 0.25) {
        recommendations.push('📚 Focus on fundamentals and core understanding');
      } else if (node.masteryLevel > 0.85) {
        recommendations.push('🚀 Ready for advanced applications and teaching others');
      }

      // Network position insights
      switch (position) {
        case 'central':
          recommendations.push('🌟 KEY CONCEPT: Mastering this unlocks many others');
          break;
        case 'bridge':
          recommendations.push('🌉 CONNECTOR: Links different knowledge domains');
          break;
        case 'peripheral':
          recommendations.push('🔍 ISOLATED: Create more connections to integrate');
          break;
      }

      return recommendations.slice(0, 4); // Limit for focus
    },
    []
  );

  /**
   * Handle refresh with pull-to-refresh
   */
  const handleRefresh = useCallback(async () => {
    setLoadingState((prev) => ({ ...prev, isRefreshing: true }));
    try {
      await Promise.all([generateNeuralGraph(true), calculateCognitiveLoad()]);
      Alert.alert('Updated', 'Your neural map has been refreshed with the latest data.');
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh neural map.');
    } finally {
      setLoadingState((prev) => ({ ...prev, isRefreshing: false }));
    }
  }, [generateNeuralGraph, calculateCognitiveLoad]);

  /**
   * Get cognitive load styling
   */
  const cognitiveLoadConfig = useMemo(() => {
    const configs = {
      low: { color: themeColors.success, label: 'Optimal Load', description: 'Perfect for new concepts' },
      moderate: { color: themeColors.primary, label: 'Moderate Load', description: 'Good challenge balance' },
      high: { color: themeColors.warning, label: 'High Load', description: 'Reduce active items' },
      critical: { color: themeColors.error, label: 'Critical Load', description: 'Focus on urgent only' },
    };

    if (cognitiveLoad < COGNITIVE_LOAD_THRESHOLDS.LOW) return configs.low;
    if (cognitiveLoad < COGNITIVE_LOAD_THRESHOLDS.MODERATE) return configs.moderate;
    if (cognitiveLoad < COGNITIVE_LOAD_THRESHOLDS.HIGH) return configs.high;
    return configs.critical;
  }, [cognitiveLoad, themeColors]);

  /**
   * Render loading state
   */
  const renderLoadingState = useCallback(
    () => (
      <ScreenContainer theme={theme} style={styles.loadingContainer}>
        <AppHeader
          title="Neural Map"
          theme={theme}
          onMenuPress={() => setMenuVisible(true)}
          cognitiveLoad={cognitiveLoad}
        />
        <GlassCard theme={theme} style={styles.loadingCard}>
          <Text style={[styles.loadingText, { color: themeColors.text }]}>
            🧠 Analyzing your learning patterns...
          </Text>
          <Text style={[styles.loadingSubtext, { color: themeColors.textSecondary }]}>
            Creating neural connections from your flashcards, tasks, and memory palaces
          </Text>
          <ActivityIndicator size="large" color={themeColors.primary} />
          {loadingState.progress && (
            <View style={styles.progressContainer}>
              <View
                style={[
                  styles.progressBar,
                  { backgroundColor: themeColors.primary, width: `${loadingState.progress}%` },
                ]}
              />
            </View>
          )}
        </GlassCard>
      </ScreenContainer>
    ),
    [theme, themeColors, cognitiveLoad, loadingState.progress]
  );

  /**
   * Render empty state
   */
  const renderEmptyState = useCallback(
    () => (
      <ScreenContainer theme={theme} style={styles.emptyContainer}>
        <AppHeader
          title="Neural Map"
          theme={theme}
          onMenuPress={() => setMenuVisible(true)}
          cognitiveLoad={cognitiveLoad}
        />
        <GlassCard theme={theme} style={styles.emptyCard}>
          <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
            🧠 Build Your Neural Map
          </Text>
          <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
            Start learning with flashcards, tasks, or memory palaces to see your knowledge
            network come alive. Your brain map will show connections between concepts and
            highlight areas that need attention.
          </Text>
          <View style={styles.emptyActions}>
            <Button
              title="Create Flashcards"
              onPress={() => onNavigate('flashcards')}
              variant="primary"
              theme={theme}
              style={styles.emptyButton}
            />
            <Button
              title="Add Tasks"
              onPress={() => onNavigate('tasks')}
              variant="outline"
              theme={theme}
              style={styles.emptyButton}
            />
          </View>
        </GlassCard>
      </ScreenContainer>
    ),
    [theme, themeColors, cognitiveLoad, onNavigate]
  );

  // Loading state
  if (loadingState.isGenerating && !neuralGraph) {
    return renderLoadingState();
  }

  // Empty state
  if (!neuralGraph || neuralGraph.nodes.length === 0) {
    return renderEmptyState();
  }

  return (
    <ScreenContainer theme={theme} style={styles.container}>
      <AppHeader
        title="Neural Map"
        theme={theme}
        onMenuPress={() => setMenuVisible(true)}
        cognitiveLoad={cognitiveLoad}
        rightComponent={
          <TouchableOpacity onPress={handleRefresh}>
            <Text style={[styles.refreshIcon, { color: themeColors.text }]}>
              {loadingState.isRefreshing ? '⟳' : '↻'}
            </Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.mainContent}>
        {/* Phase 3: Enhanced Status Dashboard with Mode Analytics */}
        <View style={styles.topSection}>
          <GlassCard theme={theme} style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <Text style={[styles.statusLabel, { color: themeColors.textSecondary }]}>
                  Cognitive Load
                </Text>
                <Text style={[styles.statusValue, { color: cognitiveLoadConfig.color }]}>
                  {cognitiveLoadConfig.label}
                </Text>
                <Text style={[styles.statusSubText, { color: themeColors.textSecondary }]}>
                  {cognitiveLoadConfig.description}
                </Text>
              </View>

              <View style={styles.statusItem}>
                <Text style={[styles.statusLabel, { color: themeColors.textSecondary }]}>
                  Knowledge Health
                </Text>
                <Text style={[styles.statusValue, { color: themeColors.success }]}>
                  {neuralGraph.knowledgeHealth}%
                </Text>
                <Text style={[styles.statusSubText, { color: themeColors.textSecondary }]}>
                  Network connectivity score
                </Text>
              </View>

              <View style={styles.statusItem}>
                <Text style={[styles.statusLabel, { color: themeColors.textSecondary }]}>
                  Current View
                </Text>
                <Text style={[styles.statusValue, { color: currentViewMode.color }]}>
                  {currentViewMode.icon} {currentViewMode.shortName}
                </Text>
                <Text style={[styles.statusSubText, { color: themeColors.textSecondary }]}>
                  {viewModeAnalytics?.insight || 'No data'}
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* Phase 3: Enhanced View Mode Selector with Visual Indicators */}
          <GlassCard theme={theme} style={styles.viewModeSelector}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.viewModeContainer}
            >
              {VIEW_MODES.map((mode) => (
                <TouchableOpacity
                  key={mode.id}
                  onPress={() => handleViewModeChange(mode.id)}
                  style={[
                    styles.viewModeButton,
                    viewMode === mode.id && [
                      styles.viewModeButtonActive,
                      { backgroundColor: mode.color + '20', borderColor: mode.color },
                    ],
                    { borderColor: themeColors.border },
                  ]}
                >
                  <Text style={[
                    styles.viewModeIcon,
                    viewMode === mode.id && { color: mode.color }
                  ]}>
                    {mode.icon}
                  </Text>
                  <Text
                    style={[
                      styles.viewModeText,
                      { color: viewMode === mode.id ? mode.color : themeColors.text },
                    ]}
                    numberOfLines={1}
                  >
                    {mode.shortName}
                  </Text>
                  <Text
                    style={[
                      styles.viewModeDescription,
                      { color: viewMode === mode.id ? mode.color : themeColors.textSecondary },
                    ]}
                    numberOfLines={2}
                  >
                    {mode.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </GlassCard>
        </View>

        {/* Phase 3: Neural Canvas with View Mode Support */}
        <View style={styles.canvasContainer}>
          <NeuralMindMap
            graph={neuralGraph}
            theme={theme}
            onNodePress={handleNodePress}
            onNodeLongPress={(node) => {
              setSelectedNode(node);
              generateNodeDetail(node);
              setNodeDetailVisible(true);
              if (startFocusSession && node.id && node.label) {
                startFocusSession(node.id, node.label, 'node');
              }
            }}
            cognitiveLoad={cognitiveLoad}
            showControls={false}
            viewMode={viewMode} // Phase 3: Pass view mode to canvas
            focusNodeId={focusState.focusNodeId} // Phase 5: Pass focus node ID from context
            focusLock={!!focusState.focusNodeId} // Phase 5.5: Enable focus lock when focus is active
          />
        </View>

        {/* Enhanced Selected Node Panel */}
        {selectedNode && (
          <GlassCard theme={theme} style={styles.selectedNodePanel}>
            <View style={styles.selectedNodeHeader}>
              <Text style={[styles.selectedNodeTitle, { color: themeColors.text }]}>
                {selectedNode.label}
              </Text>
              <Text style={[styles.selectedNodeSubtitle, { color: themeColors.textSecondary }]}>
                {selectedNode.type} • {selectedNode.category}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setNodeDetailVisible(true)}
              style={[styles.detailButton, { backgroundColor: currentViewMode.color }]}
            >
              <Text style={styles.detailButtonText}>Full Analysis</Text>
            </TouchableOpacity>

            <View style={styles.quickStats}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: themeColors.success }]}>
                  {Math.round(selectedNode.masteryLevel * 100)}%
                </Text>
                <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>
                  Mastered
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: themeColors.warning }]}>
                  {Math.round(selectedNode.cognitiveLoad * 100)}%
                </Text>
                <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>
                  Load
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: themeColors.info }]}>
                  {selectedNode.accessCount}
                </Text>
                <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>
                  Reviews
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: themeColors.primary }]}>
                  {nodeDetail?.connections || 0}
                </Text>
                <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>
                  Links
                </Text>
              </View>
            </View>
          </GlassCard>
        )}
      </View>

      {/* MiniPlayer Component Integration */}
      <MiniPlayer
        theme={theme}
        style={styles.miniPlayer}
      />

      {/* Enhanced Node Detail Modal with Phase 3 Insights */}
      <Modal
        visible={nodeDetailVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setNodeDetailVisible(false)}
      >
        {nodeDetail && (
          <ScreenContainer theme={theme}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                🧠 Neural Analysis
              </Text>
              <TouchableOpacity
                onPress={() => setNodeDetailVisible(false)}
                style={styles.closeButton}
              >
                <Text style={[styles.closeButtonText, { color: themeColors.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <GlassCard theme={theme} style={styles.nodeOverviewCard}>
                <Text style={[styles.nodeOverviewTitle, { color: themeColors.text }]}>
                  {nodeDetail.node.label}
                </Text>
                <View style={styles.nodeOverviewBadge}>
                  <Text style={[styles.nodeOverviewBadgeText, { color: currentViewMode.color }]}>
                    {nodeDetail.networkPosition.toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.nodeOverviewSubtitle, { color: themeColors.textSecondary }]}>
                  {nodeDetail.node.type} • {nodeDetail.node.category}
                </Text>
              </GlassCard>

              {/* Phase 3: Health Insights Section */}
              {nodeDetail.healthInsights && nodeDetail.healthInsights.length > 0 && (
                <GlassCard theme={theme} style={styles.insightsCard}>
                  <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                    ❤️‍🩹 Health Analysis
                  </Text>
                  {nodeDetail.healthInsights.map((insight, index) => (
                    <Text
                      key={index}
                      style={[styles.insightText, { color: themeColors.textSecondary }]}
                    >
                      {insight}
                    </Text>
                  ))}
                </GlassCard>
              )}

              {/* Network Metrics */}
              <GlassCard theme={theme} style={styles.metricsCard}>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                  📊 Network Metrics
                </Text>
                <View style={styles.metricsGrid}>
                  <View style={styles.metricItem}>
                    <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>
                      Neural Connections
                    </Text>
                    <Text style={[styles.metricValue, { color: themeColors.primary }]}>
                      {nodeDetail.connections}
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>
                      Network Centrality
                    </Text>
                    <Text style={[styles.metricValue, { color: themeColors.success }]}>
                      {Math.round(nodeDetail.centrality * 100)}%
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>
                      Activation Level
                    </Text>
                    <Text style={[styles.metricValue, { color: themeColors.warning }]}>
                      {Math.round(nodeDetail.node.activationLevel * 100)}%
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>
                      Last Accessed
                    </Text>
                    <Text style={[styles.metricValue, { color: themeColors.info }]}>
                      {nodeDetail.node.lastAccessed.toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </GlassCard>

              {/* AI Recommendations */}
              <GlassCard theme={theme} style={styles.recommendationsCard}>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                  🎯 AI Learning Recommendations
                </Text>
                {nodeDetail.recommendations.map((rec, index) => (
                  <Text
                    key={index}
                    style={[styles.recommendationText, { color: themeColors.textSecondary }]}
                  >
                    {rec}
                  </Text>
                ))}
              </GlassCard>

              {/* Phase 3: Path Recommendations */}
              {nodeDetail.pathRecommendations && nodeDetail.pathRecommendations.length > 0 && (
                <GlassCard theme={theme} style={styles.pathCard}>
                  <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                    🛤️ Learning Path Insights
                  </Text>
                  {nodeDetail.pathRecommendations.map((rec, index) => (
                    <Text
                      key={index}
                      style={[styles.pathText, { color: themeColors.textSecondary }]}
                    >
                      {rec}
                    </Text>
                  ))}
                </GlassCard>
              )}

              <View style={styles.modalActions}>
                <Button
                  title="Study This Concept"
                  onPress={() => {
                    setNodeDetailVisible(false);
                    // Navigate to appropriate screen
                    const navigationMap = {
                      flashcard: 'flashcards',
                      task: 'tasks',
                      palace: 'memory-palace',
                      derived: 'flashcards',
                      logic: 'flashcards', // Phase 3: Add logic navigation
                    };
                    onNavigate(navigationMap[nodeDetail.node.sourceType] || 'flashcards');
                  }}
                  variant="primary"
                  theme={theme}
                  style={styles.modalButton}
                />
                <Button
                  title="Close Analysis"
                  onPress={() => setNodeDetailVisible(false)}
                  variant="outline"
                  theme={theme}
                  style={styles.modalButton}
                />
              </View>
            </ScrollView>
          </ScreenContainer>
        )}
      </Modal>

      <HamburgerMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={onNavigate}
        currentScreen="neural-mind-map"
        theme={theme}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    paddingTop: 100, // Account for header
  },
  topSection: {
    flex: 0,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  statusCard: {
    marginBottom: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusLabel: {
    ...typography.caption,
    marginBottom: 4,
  },
  statusValue: {
    ...typography.h4,
    fontWeight: '600',
    marginBottom: 2,
  },
  statusSubText: {
    ...typography.caption,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Phase 3: Enhanced View Mode Selector
  viewModeSelector: {
    paddingVertical: spacing.sm,
  },
  viewModeContainer: {
    paddingHorizontal: spacing.md,
  },
  viewModeButton: {
    width: 110,
    height: 80,
    marginRight: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModeButtonActive: {
    borderWidth: 2,
  },
  viewModeIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  viewModeText: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
  },
  viewModeDescription: {
    ...typography.caption,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 12,
  },

  canvasContainer: {
    flex: 1,
    minHeight: 400,
  },

  // Enhanced Selected Node Panel
  selectedNodePanel: {
    margin: spacing.md,
    padding: spacing.md,
  },
  selectedNodeHeader: {
    marginBottom: spacing.sm,
  },
  selectedNodeTitle: {
    ...typography.h4,
    marginBottom: 4,
  },
  selectedNodeSubtitle: {
    ...typography.caption,
  },
  detailButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  detailButtonText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 10,
  },

  // Modal styles
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
    padding: spacing.md,
  },

  // Node overview
  nodeOverviewCard: {
    alignItems: 'center',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  nodeOverviewTitle: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  nodeOverviewBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  nodeOverviewBadgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  nodeOverviewSubtitle: {
    ...typography.body,
  },

  // Phase 3: Health insights
  insightsCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  insightText: {
    ...typography.body,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },

  // Metrics
  metricsCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricItem: {
    width: '48%',
    marginBottom: spacing.md,
  },
  metricLabel: {
    ...typography.caption,
    marginBottom: 4,
  },
  metricValue: {
    ...typography.body,
    fontWeight: '600',
  },

  // Recommendations
  recommendationsCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  recommendationText: {
    ...typography.body,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },

  // Phase 3: Path recommendations
  pathCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pathText: {
    ...typography.body,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },

  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  modalButton: {
    flex: 1,
  },

  // Loading states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.h3,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  loadingSubtext: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  progressContainer: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.h2,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  emptyButton: {
    flex: 1,
    minWidth: 140,
  },

  refreshIcon: {
    fontSize: 18,
    fontWeight: '600',
  },
  miniPlayer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
});
