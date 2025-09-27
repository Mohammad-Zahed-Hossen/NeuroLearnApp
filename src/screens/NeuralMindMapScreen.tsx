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

interface NeuralMindMapScreenProps {
  theme: ThemeType;
  onNavigate: (screen: string) => void;
}

interface ViewMode {
  id: 'network' | 'clusters' | 'paths' | 'health';
  name: string;
  description: string;
  icon: string;
}

interface NodeDetail {
  node: NeuralNode;
  connections: number;
  centrality: number;
  recommendations: string[];
  networkPosition: 'central' | 'peripheral' | 'bridge';
}

interface LoadingState {
  isGenerating: boolean;
  isCalculating: boolean;
  isRefreshing: boolean;
  progress?: number;
}

const VIEW_MODES: ViewMode[] = [
  {
    id: 'network',
    name: 'Neural Network',
    description: 'Full brain-like visualization of all connections',
    icon: '🧠',
  },
  {
    id: 'clusters',
    name: 'Knowledge Clusters',
    description: 'Group related concepts by domain',
    icon: '🔗',
  },
  {
    id: 'paths',
    name: 'Learning Paths',
    description: 'Show prerequisite and progression routes',
    icon: '🛤️',
  },
  {
    id: 'health',
    name: 'Cognitive Health',
    description: 'Highlight weak areas needing attention',
    icon: '❤️',
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

  const { width, height } = Dimensions.get('window');
  const themeColors = colors[theme];

  // Memoize services to prevent unnecessary re-instantiation
  const mindMapGenerator = useMemo(() => MindMapGenerator.getInstance(), []);
  const storage = useMemo(() => StorageService.getInstance(), []);

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

        // Analytics event
        console.log('Neural graph generated:', {
          nodes: graph.nodes.length,
          links: graph.links.length,
          health: graph.knowledgeHealth,
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
          ],
        );
      } finally {
        setLoadingState((prev) => ({ ...prev, isGenerating: false }));
      }
    },
    [mindMapGenerator, onNavigate],
  );

  /**
   * Calculate current cognitive load with enhanced metrics
   */
  const calculateCognitiveLoad = useCallback(async () => {
    try {
      setLoadingState((prev) => ({ ...prev, isCalculating: true }));

      const [flashcards, tasks, sessions] = await Promise.all([
        storage.getFlashcards(),
        storage.getTasks(),
        storage.getStudySessions(),
      ]);

      // Enhanced cognitive load calculation
      const dueFlashcards = flashcards.filter(
        (card) => new Date(card.nextReview) <= new Date(),
      ).length;

      const urgentTasks = tasks.filter(
        (task) => !task.isCompleted && task.priority >= 3,
      ).length;

      const recentFailures = sessions
        .filter((s) => s.type === 'flashcards' && !s.completed)
        .filter(
          (s) => Date.now() - s.startTime.getTime() < 24 * 60 * 60 * 1000,
        ).length;

      // Weighted cognitive load calculation
      const baseLoad = Math.min(
        1,
        (dueFlashcards * 0.1 + urgentTasks * 0.2) / 10,
      );
      const stressLoad = Math.min(0.3, recentFailures * 0.05);
      const totalLoad = Math.min(1, baseLoad + stressLoad);

      setCognitiveLoad(totalLoad);
    } catch (error) {
      console.error('Error calculating cognitive load:', error);
      setCognitiveLoad(0.5); // Default fallback
    } finally {
      setLoadingState((prev) => ({ ...prev, isCalculating: false }));
    }
  }, [storage]);

  /**
   * Handle node press with analytics
   */
  const handleNodePress = useCallback(
    (node: NeuralNode) => {
      setSelectedNode(node);
      generateNodeDetail(node);

      // Analytics
      console.log('Node selected:', {
        id: node.id,
        type: node.type,
        masteryLevel: node.masteryLevel,
        isActive: node.isActive,
      });
    },
    [neuralGraph],
  );

  /**
   * Handle node long press for detailed analysis
   */
  const handleNodeLongPress = useCallback(
    (node: NeuralNode) => {
      setSelectedNode(node);
      generateNodeDetail(node);
      setNodeDetailVisible(true);
    },
    [neuralGraph],
  );

  /**
   * Generate detailed node analysis with AI recommendations
   */
  const generateNodeDetail = useCallback(
    (node: NeuralNode) => {
      if (!neuralGraph) return;

      try {
        // Calculate network metrics
        const connections = neuralGraph.links.filter(
          (link) => link.source === node.id || link.target === node.id,
        ).length;

        const centrality =
          connections / Math.max(1, neuralGraph.nodes.length - 1);

        // Determine network position
        const networkPosition: NodeDetail['networkPosition'] =
          centrality > 0.7
            ? 'central'
            : centrality > 0.3
            ? 'bridge'
            : 'peripheral';

        // Generate enhanced AI recommendations
        const recommendations = generateEnhancedRecommendations(
          node,
          networkPosition,
        );

        setNodeDetail({
          node,
          connections,
          centrality,
          recommendations,
          networkPosition,
        });
      } catch (error) {
        console.error('Error generating node detail:', error);
      }
    },
    [neuralGraph],
  );

  /**
   * Generate AI-powered learning recommendations
   */
  const generateEnhancedRecommendations = useCallback(
    (node: NeuralNode, position: NodeDetail['networkPosition']): string[] => {
      const recommendations: string[] = [];

      // Mastery-based recommendations
      if (node.masteryLevel < 0.25) {
        recommendations.push(
          '🎯 Focus: This concept needs immediate attention and foundational work',
        );
        recommendations.push(
          '📚 Strategy: Use active recall and spaced repetition daily',
        );
      } else if (node.masteryLevel < 0.5) {
        recommendations.push(
          '🔄 Practice: Continue regular review to strengthen understanding',
        );
        recommendations.push(
          '🔗 Connect: Link this concept to related topics you know well',
        );
      } else if (node.masteryLevel > 0.85) {
        recommendations.push(
          '🚀 Advanced: Use this as a foundation for learning advanced topics',
        );
        recommendations.push(
          '👨‍🏫 Teach: Explain this concept to others to deepen mastery',
        );
      }

      // Activation-based recommendations
      if (node.isActive && node.cognitiveLoad > 0.7) {
        recommendations.push('⚡ Urgent: This concept is due for review today');
        recommendations.push(
          '🧘 Method: Break into smaller chunks to reduce cognitive load',
        );
      }

      // Network position recommendations
      switch (position) {
        case 'central':
          recommendations.push(
            '🌟 Strategic: This is a key concept - mastering it unlocks many others',
          );
          break;
        case 'bridge':
          recommendations.push(
            '🌉 Connector: This concept bridges different knowledge domains',
          );
          break;
        case 'peripheral':
          recommendations.push(
            '🔍 Isolated: Create more connections to integrate this knowledge',
          );
          break;
      }

      // Cognitive load recommendations
      if (node.cognitiveLoad > 0.8) {
        recommendations.push(
          '🎨 Visual: Use diagrams, mind maps, or memory techniques',
        );
        recommendations.push(
          '⏱️ Timing: Study this when your mental energy is highest',
        );
      }

      // Source-specific recommendations
      if (node.sourceType === 'flashcard') {
        recommendations.push(
          '💡 Enhance: Add visual cues or mnemonics to your flashcard',
        );
      } else if (node.sourceType === 'task') {
        recommendations.push(
          '✅ Action: Break this task into smaller, manageable steps',
        );
      }

      // Default encouragement
      if (recommendations.length === 0) {
        recommendations.push(
          '✅ Excellent: This concept is well-integrated in your knowledge network',
        );
        recommendations.push(
          '🎓 Next: Consider exploring advanced applications or related fields',
        );
      }

      return recommendations.slice(0, 5); // Limit to 5 recommendations for focus
    },
    [],
  );

  /**
   * Handle refresh with pull-to-refresh
   */
  const handleRefresh = useCallback(async () => {
    setLoadingState((prev) => ({ ...prev, isRefreshing: true }));
    try {
      await Promise.all([generateNeuralGraph(true), calculateCognitiveLoad()]);
      Alert.alert(
        'Updated',
        'Your neural map has been refreshed with the latest data.',
      );
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
      low: {
        color: themeColors.success,
        label: 'Optimal Load',
        description: 'Perfect state for learning new concepts',
      },
      moderate: {
        color: themeColors.primary,
        label: 'Moderate Load',
        description: 'Good balance of challenge and capacity',
      },
      high: {
        color: themeColors.warning,
        label: 'High Load',
        description: 'Consider reducing active items',
      },
      critical: {
        color: themeColors.error,
        label: 'Critical Load',
        description: 'Focus on urgent items only',
      },
    };

    if (cognitiveLoad < COGNITIVE_LOAD_THRESHOLDS.LOW) return configs.low;
    if (cognitiveLoad < COGNITIVE_LOAD_THRESHOLDS.MODERATE)
      return configs.moderate;
    if (cognitiveLoad < COGNITIVE_LOAD_THRESHOLDS.HIGH) return configs.high;
    return configs.critical;
  }, [cognitiveLoad, themeColors]);

  /**
   * Render loading state
   */
  const renderLoadingState = useCallback(
    () => (
      <ScreenContainer theme={theme}>
        <AppHeader
          title="Generating Neural Map..."
          theme={theme}
          onMenuPress={() => setMenuVisible(true)}
          cognitiveLoad={cognitiveLoad}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.text }]}>
            🧠 Analyzing your learning patterns...
          </Text>
          <Text
            style={[
              styles.loadingSubtext,
              { color: themeColors.textSecondary },
            ]}
          >
            Creating neural connections from your flashcards, tasks, and memory
            palaces
          </Text>
          {loadingState.progress && (
            <View style={styles.progressContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: themeColors.primary,
                    width: `${loadingState.progress}%`,
                  },
                ]}
              />
            </View>
          )}
        </View>
      </ScreenContainer>
    ),
    [theme, themeColors, cognitiveLoad, loadingState.progress],
  );

  /**
   * Render empty state
   */
  const renderEmptyState = useCallback(
    () => (
      <ScreenContainer theme={theme}>
        <AppHeader
          title="Neural Mind Map"
          theme={theme}
          onMenuPress={() => setMenuVisible(true)}
          cognitiveLoad={cognitiveLoad}
        />
        <View style={styles.emptyContainer}>
          <GlassCard theme={theme} style={styles.emptyCard}>
            <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
              🧠 Build Your Neural Map
            </Text>
            <Text
              style={[styles.emptyText, { color: themeColors.textSecondary }]}
            >
              Start learning with flashcards, tasks, or memory palaces to see
              your knowledge network come alive. Your brain map will show
              connections between concepts and highlight areas that need
              attention.
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
        </View>
      </ScreenContainer>
    ),
    [theme, themeColors, cognitiveLoad, onNavigate],
  );

  /**
   * Render error state
   */
  const renderErrorState = useCallback(
    () => (
      <ScreenContainer theme={theme}>
        <AppHeader
          title="Neural Mind Map"
          theme={theme}
          onMenuPress={() => setMenuVisible(true)}
          cognitiveLoad={cognitiveLoad}
        />
        <View style={styles.errorContainer}>
          <GlassCard theme={theme} style={styles.errorCard}>
            <Text style={[styles.errorTitle, { color: themeColors.error }]}>
              ⚠️ Neural Map Error
            </Text>
            <Text
              style={[styles.errorText, { color: themeColors.textSecondary }]}
            >
              {error || 'Failed to generate your brain map'}
            </Text>
            <Button
              title="Try Again"
              onPress={() => generateNeuralGraph(true)}
              variant="primary"
              theme={theme}
              style={styles.errorButton}
            />
          </GlassCard>
        </View>
      </ScreenContainer>
    ),
    [theme, themeColors, cognitiveLoad, error, generateNeuralGraph],
  );

  // Loading state
  if (loadingState.isGenerating && !neuralGraph) {
    return renderLoadingState();
  }

  // Error state
  if (error && !neuralGraph) {
    return renderErrorState();
  }

  // Empty state
  if (!neuralGraph || neuralGraph.nodes.length === 0) {
    return renderEmptyState();
  }

  return (
    <ScreenContainer theme={theme}>
      <AppHeader
        title="Neural Mind Map"
        theme={theme}
        onMenuPress={() => setMenuVisible(true)}
        cognitiveLoad={cognitiveLoad}
        rightComponent={
          <TouchableOpacity
            onPress={handleRefresh}
            disabled={loadingState.isRefreshing}
          >
            <Text
              style={{
                color: loadingState.isRefreshing
                  ? themeColors.textMuted
                  : themeColors.primary,
                fontSize: 18,
              }}
            >
              {loadingState.isRefreshing ? '⟳' : '↻'}
            </Text>
          </TouchableOpacity>
        }
      />

      {/* FIX: Header Overlap - Added proper paddingTop: 90 to mainContent accounting for header height */}
      <View style={styles.mainContent}>
        {/* FIX: Canvas Display Problem - Created separate topSection and canvasContainer with proper flex layout */}
        <View style={styles.topSection}>
          {/* Enhanced Status Dashboard */}
          <GlassCard theme={theme} style={styles.statusCard}>
            {/* FIX: Knowledge Health Text Positioning - Changed from statusGrid to statusRow for better horizontal layout */}
            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <Text
                  style={[
                    styles.statusLabel,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  Cognitive Load
                </Text>
                <View style={styles.loadIndicator}>
                  <View
                    style={[
                      styles.loadBar,
                      { backgroundColor: cognitiveLoadConfig.color },
                      { width: `${cognitiveLoad * 100}%` },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.statusValue,
                    { color: cognitiveLoadConfig.color },
                  ]}
                >
                  {cognitiveLoadConfig.label}
                </Text>
                {/* FIX: Knowledge Health Text Positioning - Added statusSubText style for multi-line text */}
                <Text
                  style={[
                    styles.statusSubText,
                    { color: themeColors.textMuted },
                  ]}
                >
                  {cognitiveLoadConfig.description}
                </Text>
              </View>

              <View style={styles.statusItem}>
                <Text
                  style={[
                    styles.statusLabel,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  Knowledge Health
                </Text>
                <Text
                  style={[styles.statusValue, { color: themeColors.success }]}
                >
                  {neuralGraph.knowledgeHealth}%
                </Text>
                {/* FIX: Knowledge Health Text Positioning - Added statusSubText style for multi-line text */}
                <Text
                  style={[
                    styles.statusSubText,
                    { color: themeColors.textMuted },
                  ]}
                >
                  Network connectivity score
                </Text>
              </View>

              <View style={styles.statusItem}>
                <Text
                  style={[
                    styles.statusLabel,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  Network Size
                </Text>
                <Text
                  style={[styles.statusValue, { color: themeColors.primary }]}
                >
                  {neuralGraph.nodes.length} concepts, {neuralGraph.links.length} connections
                </Text>
                {/* FIX: Knowledge Health Text Positioning - Added statusSubText style for multi-line text */}
                <Text
                  style={[
                    styles.statusSubText,
                    { color: themeColors.textMuted },
                  ]}
                >
                  Concepts & connections
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* FIX: View Mode Selector - Reduced maxHeight from 100 to 60, Set consistent height: 44 for buttons, Added flexShrink: 1 to prevent text overflow */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.viewModeScroll}
            contentContainerStyle={styles.viewModeContainer}
          >
            {VIEW_MODES.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                onPress={() => setViewMode(mode.id)}
                style={[
                  styles.viewModeButton,
                  viewMode === mode.id && {
                    backgroundColor: themeColors.primary,
                  },
                  { borderColor: themeColors.border },
                ]}
              >
                <Text style={styles.viewModeIcon}>{mode.icon}</Text>
                <Text
                  style={[
                    styles.viewModeText,
                    {
                      color: viewMode === mode.id ? '#FFFFFF' : themeColors.text,
                    },
                  ]}
                >
                  {mode.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* FIX: Canvas Container - Set flex: 1 with minHeight: 400, Removed conflicting ScrollView wrapper, Proper container structure with dedicated canvas area */}
        <View style={styles.canvasContainer}>
          <NeuralMindMap
            graph={neuralGraph}
            theme={theme}
            onNodePress={handleNodePress}
            onNodeLongPress={handleNodeLongPress}
            cognitiveLoad={cognitiveLoad}
            showControls={true}
            viewMode={viewMode}
          />
        </View>
      </View>

      {/* Enhanced Selected Node Panel */}
      {selectedNode && (
        <GlassCard theme={theme} style={styles.nodePanel}>
          <View style={styles.nodePanelHeader}>
            <View style={styles.nodeInfo}>
              <Text style={[styles.nodeName, { color: themeColors.text }]}>
                {selectedNode.label}
              </Text>
              <Text
                style={[styles.nodeType, { color: themeColors.textSecondary }]}
              >
                {selectedNode.type} • {selectedNode.category}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setNodeDetailVisible(true)}
              style={[
                styles.detailButton,
                { backgroundColor: themeColors.primary },
              ]}
            >
              <Text style={styles.detailButtonText}>Analysis</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.nodeMetrics}>
            <View style={styles.metric}>
              <Text
                style={[styles.metricValue, { color: themeColors.success }]}
              >
                {Math.round(selectedNode.masteryLevel * 100)}%
              </Text>
              <Text
                style={[styles.metricLabel, { color: themeColors.textMuted }]}
              >
                Mastered
              </Text>
            </View>

            <View style={styles.metric}>
              <Text
                style={[styles.metricValue, { color: themeColors.warning }]}
              >
                {Math.round(selectedNode.cognitiveLoad * 100)}%
              </Text>
              <Text
                style={[styles.metricLabel, { color: themeColors.textMuted }]}
              >
                Load
              </Text>
            </View>

            <View style={styles.metric}>
              <Text
                style={[styles.metricValue, { color: themeColors.primary }]}
              >
                {selectedNode.accessCount}
              </Text>
              <Text
                style={[styles.metricLabel, { color: themeColors.textMuted }]}
              >
                Reviews
              </Text>
            </View>

            <View style={styles.metric}>
              <Text
                style={[styles.metricValue, { color: themeColors.secondary }]}
              >
                {nodeDetail?.connections || 0}
              </Text>
              <Text
                style={[styles.metricLabel, { color: themeColors.textMuted }]}
              >
                Connections
              </Text>
            </View>
          </View>
        </GlassCard>
      )}

      {/* Enhanced Node Detail Modal */}
      <Modal
        visible={nodeDetailVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setNodeDetailVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassCard theme={theme} variant="modal" style={styles.modalContent}>
            {nodeDetail && (
              <>
                <View style={styles.modalHeader}>
                  <Text
                    style={[styles.modalTitle, { color: themeColors.text }]}
                  >
                    🧠 Neural Analysis
                  </Text>
                  <TouchableOpacity
                    onPress={() => setNodeDetailVisible(false)}
                    style={styles.closeButton}
                  >
                    <Text
                      style={[
                        styles.closeButtonText,
                        { color: themeColors.textSecondary },
                      ]}
                    >
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalScrollView}>
                  <View style={styles.nodeDetailHeader}>
                    <Text
                      style={[
                        styles.nodeDetailName,
                        { color: themeColors.text },
                      ]}
                    >
                      {nodeDetail.node.label}
                    </Text>
                    <View
                      style={[
                        styles.positionBadge,
                        { backgroundColor: themeColors.primary + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.positionBadgeText,
                          { color: themeColors.primary },
                        ]}
                      >
                        {nodeDetail.networkPosition.toUpperCase()}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.nodeDetailType,
                        { color: themeColors.textSecondary },
                      ]}
                    >
                      {nodeDetail.node.type} • {nodeDetail.node.category}
                    </Text>
                  </View>

                  <View style={styles.detailMetricsGrid}>
                    <View style={styles.detailMetric}>
                      <Text
                        style={[
                          styles.detailMetricLabel,
                          { color: themeColors.textSecondary },
                        ]}
                      >
                        Neural Connections
                      </Text>
                      <Text
                        style={[
                          styles.detailMetricValue,
                          { color: themeColors.primary },
                        ]}
                      >
                        {nodeDetail.connections}
                      </Text>
                    </View>

                    <View style={styles.detailMetric}>
                      <Text
                        style={[
                          styles.detailMetricLabel,
                          { color: themeColors.textSecondary },
                        ]}
                      >
                        Network Centrality
                      </Text>
                      <Text
                        style={[
                          styles.detailMetricValue,
                          { color: themeColors.secondary },
                        ]}
                      >
                        {Math.round(nodeDetail.centrality * 100)}%
                      </Text>
                    </View>

                    <View style={styles.detailMetric}>
                      <Text
                        style={[
                          styles.detailMetricLabel,
                          { color: themeColors.textSecondary },
                        ]}
                      >
                        Activation Level
                      </Text>
                      <Text
                        style={[
                          styles.detailMetricValue,
                          { color: themeColors.warning },
                        ]}
                      >
                        {Math.round(nodeDetail.node.activationLevel * 100)}%
                      </Text>
                    </View>

                    <View style={styles.detailMetric}>
                      <Text
                        style={[
                          styles.detailMetricLabel,
                          { color: themeColors.textSecondary },
                        ]}
                      >
                        Last Accessed
                      </Text>
                      <Text
                        style={[
                          styles.detailMetricValue,
                          { color: themeColors.textMuted },
                        ]}
                      >
                        {nodeDetail.node.lastAccessed.toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.recommendationsTitle,
                      { color: themeColors.text },
                    ]}
                  >
                    🎯 AI Learning Recommendations
                  </Text>

                  <View style={styles.recommendationsList}>
                    {nodeDetail.recommendations.map((rec, index) => (
                      <View key={index} style={styles.recommendationItem}>
                        <Text
                          style={[
                            styles.recommendationText,
                            { color: themeColors.textSecondary },
                          ]}
                        >
                          {rec}
                        </Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>

                <View style={styles.modalButtons}>
                  <Button
                    title="Study This Concept"
                    onPress={() => {
                      setNodeDetailVisible(false);
                      // Navigate to appropriate screen based on source
                      const navigationMap = {
                        flashcard: 'flashcards',
                        task: 'tasks',
                        palace: 'memory-palace',
                        derived: 'flashcards',
                      };
                      onNavigate(navigationMap[nodeDetail.node.sourceType]);
                    }}
                    variant="primary"
                    theme={theme}
                    style={styles.modalButton}
                  />

                  <Button
                    title="Close"
                    onPress={() => setNodeDetailVisible(false)}
                    variant="outline"
                    theme={theme}
                    style={styles.modalButton}
                  />
                </View>
              </>
            )}
          </GlassCard>
        </View>
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
  scrollContainer: {
    flex: 0,
    paddingTop: 100,
  },

  // FIX: Header Overlap - Added proper paddingTop: 90 to mainContent accounting for header height
  mainContent: {
    flex: 1,
    paddingTop: 100,
  },

  // FIX: Canvas Display Problem - Created separate topSection and canvasContainer with proper flex layout
  topSection: {
    flex: 0,
  },

  // Loading states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
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

  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  errorButton: {
    minWidth: 120,
  },

  // Status dashboard
  statusCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  // FIX: Knowledge Health Text Positioning - Changed from statusGrid to statusRow for better horizontal layout
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  statusItem: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: spacing.xs,
    minHeight: 80, // FIX: Knowledge Health Text Positioning - for consistent status item heights
  },
  statusLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  statusValue: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  // FIX: Knowledge Health Text Positioning - Added statusSubText style for multi-line text
  statusSubText: {
    ...typography.caption,
    textAlign: 'center',
    fontSize: 10,
    marginBottom: spacing.xs,
    flexShrink: 1, // FIX: Knowledge Health Text Positioning - to prevent text overflow
  },
  loadIndicator: {
    width: 60,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  loadBar: {
    height: '100%',
    borderRadius: 2,
  },

  // View mode selector
  viewModeScroll: {
    maxHeight: 100,
    marginBottom: 0,
    paddingHorizontal: spacing.sm,
  },
  viewModeContainer: {
    gap: spacing.sm,
    justifyContent: 'flex-start',
  },
  viewModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minWidth: 100,
  },
  viewModeIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  viewModeText: {
    ...typography.caption,
    fontWeight: '600',
  },

  // Canvas
  canvasContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },

  // Node panel
  nodePanel: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
  },
  nodePanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  nodeInfo: {
    flex: 1,
  },
  nodeName: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  nodeType: {
    ...typography.caption,
  },
  detailButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  detailButtonText: {
    color: '#FFFFFF',
    ...typography.caption,
    fontWeight: '600',
  },
  nodeMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    ...typography.h4,
    fontWeight: 'bold',
    marginBottom: spacing.xs / 2,
  },
  metricLabel: {
    ...typography.caption,
    fontSize: 10,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h3,
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalScrollView: {
    maxHeight: 400,
  },
  nodeDetailHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  nodeDetailName: {
    ...typography.h4,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  positionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  positionBadgeText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 10,
  },
  nodeDetailType: {
    ...typography.body,
    textAlign: 'center',
  },
  detailMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  detailMetric: {
    width: '48%',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  detailMetricLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  detailMetricValue: {
    ...typography.h4,
    fontWeight: 'bold',
  },
  recommendationsTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  recommendationsList: {
    marginBottom: spacing.lg,
  },
  recommendationItem: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  recommendationText: {
    ...typography.bodySmall,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});
