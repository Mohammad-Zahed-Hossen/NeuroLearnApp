import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  Dimensions,
  View,
  StyleSheet,
  Vibration,
  Platform,
} from 'react-native';
import {
  Canvas,
  Circle,
  Path,
  Line,
  Text as SkiaText,
  Group,
  matchFont,
  Blur,
  Shadow,
} from '@shopify/react-native-skia';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
  runOnJS,
  interpolate,
  useDerivedValue,
} from 'react-native-reanimated';
import { Text } from 'react-native';
import {
  NeuralNode,
  NeuralLink,
  NeuralGraph,
} from '../services/MindMapGeneratorService';
import { NeuralPhysicsEngine } from '../services/NeuralPhysicsEngine';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../theme/colors';
import { ThemeType } from '../theme/colors';

interface NeuralCanvasProps {
  graph: NeuralGraph;
  theme: ThemeType;
  width: number;
  height: number;
  onNodePress?: (node: NeuralNode) => void;
  onNodeLongPress?: (node: NeuralNode) => void;
  cognitiveLoad?: number;
  viewMode?: 'network' | 'clusters' | 'paths' | 'health';
}

interface CanvasTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

// Performance constants
const PERFORMANCE_CONFIG = {
  MAX_FPS: 60,
  FRAME_TIME_MS: 1000 / 60,
  MIN_ZOOM: 0.3,
  MAX_ZOOM: 4.0,
  GESTURE_SENSITIVITY: 1.0,
  HIGH_LOAD_SENSITIVITY: 0.6,
};

export const NeuralCanvas: React.FC<NeuralCanvasProps> = ({
  graph,
  theme,
  width,
  height,
  onNodePress,
  onNodeLongPress,
  cognitiveLoad = 0.5,
  viewMode = 'network',
}) => {
  const themeColors = colors[theme];

  // Memoize physics engine to prevent unnecessary recreations
  const physicsEngine = useMemo(
    () => new NeuralPhysicsEngine(width, height, theme),
    [width, height, theme],
  );

  // Font configuration with error handling
  const font = useMemo(() => {
    try {
      return matchFont({
        fontFamily: Platform.select({
          ios: 'System',
          android: 'Roboto',
          default: 'Arial',
        }),
        fontSize: interpolate(cognitiveLoad, [0, 1], [14, 10]),
        fontWeight: '500',
      });
    } catch (error) {
      console.warn('Font matching failed, using fallback', error);
      return null;
    }
  }, [cognitiveLoad]);

  // Animated values with better defaults
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const pulseTime = useSharedValue(0);

  // State management with better typing
  const [nodes, setNodes] = useState<NeuralNode[]>(graph.nodes);
  const [links, setLinks] = useState<NeuralLink[]>(graph.links);
  const [selectedNode, setSelectedNode] = useState<NeuralNode | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(0);

  // Performance tracking - Fixed: Added initial value
  const animationFrameRef = useRef<number>(0);
  const isRenderingRef = useRef(false);

  // Update physics engine when theme changes
  useEffect(() => {
    physicsEngine.updateTheme(theme);
    physicsEngine.updateCognitiveLoad(cognitiveLoad);
  }, [theme, cognitiveLoad, physicsEngine]);

  // Graph update with performance optimization
  useEffect(() => {
    const updateGraph = async () => {
      physicsEngine.updateGraph(graph);

      // Setup optimized tick callback
      physicsEngine.onTick((updatedNodes, updatedLinks) => {
        if (isRenderingRef.current) return; // Prevent concurrent updates

        const now = Date.now();
        if (now - lastUpdateTime > PERFORMANCE_CONFIG.FRAME_TIME_MS) {
          isRenderingRef.current = true;

          runOnJS(setNodes)(updatedNodes);
          runOnJS(setLinks)(updatedLinks);
          runOnJS(setLastUpdateTime)(now);

          // Reset rendering flag after update
          requestAnimationFrame(() => {
            isRenderingRef.current = false;
          });
        }
      });
    };

    updateGraph();

    return () => {
      physicsEngine.stop();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [graph, physicsEngine, lastUpdateTime]);

  // Neural pulse animation with cognitive load adaptation
  useEffect(() => {
    const pulseIntensity = interpolate(cognitiveLoad, [0, 1], [1, 0.5]);

    pulseTime.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200 / pulseIntensity }),
        withTiming(0, { duration: 1200 / pulseIntensity }),
      ),
      -1,
      true,
    );
  }, [cognitiveLoad, pulseTime]);

  // Optimized gesture handling
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          setIsDragging(true);
          if (Platform.OS !== 'web') {
            Vibration.vibrate(1);
          }
        })
        .onUpdate((event) => {
          const sensitivity =
            cognitiveLoad > 0.7
              ? PERFORMANCE_CONFIG.HIGH_LOAD_SENSITIVITY
              : PERFORMANCE_CONFIG.GESTURE_SENSITIVITY;

          translateX.value = event.translationX * sensitivity;
          translateY.value = event.translationY * sensitivity;
        })
        .onEnd(() => {
          setIsDragging(false);
          translateX.value = withSpring(translateX.value, { damping: 15 });
          translateY.value = withSpring(translateY.value, { damping: 15 });
        }),
    [cognitiveLoad, translateX, translateY],
  );

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onUpdate((event) => {
          const newScale = Math.min(
            Math.max(event.scale, PERFORMANCE_CONFIG.MIN_ZOOM),
            PERFORMANCE_CONFIG.MAX_ZOOM,
          );
          scale.value = newScale;
        })
        .onEnd(() => {
          scale.value = withSpring(scale.value, { damping: 20 });
        }),
    [scale],
  );

  // Optimized hit testing
  const findNodeAtPosition = useCallback(
    (x: number, y: number): NeuralNode | null => {
      const adjustedX = (x - translateX.value) / scale.value;
      const adjustedY = (y - translateY.value) / scale.value;

      // Spatial indexing for better performance with many nodes
      for (const node of nodes) {
        const distance = Math.sqrt(
          Math.pow(adjustedX - (node.x || 0), 2) +
            Math.pow(adjustedY - (node.y || 0), 2),
        );

        const touchRadius =
          node.radius + interpolate(cognitiveLoad, [0, 1], [15, 10]);
        if (distance <= touchRadius) {
          return node;
        }
      }
      return null;
    },
    [nodes, translateX.value, translateY.value, scale.value, cognitiveLoad],
  );

  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(250)
        .onEnd((event) => {
          const tappedNode = findNodeAtPosition(event.x, event.y);
          if (tappedNode && onNodePress) {
            runOnJS(handleNodePress)(tappedNode);
          }
        }),
    [findNodeAtPosition, onNodePress],
  );

  const longPressGesture = useMemo(
    () =>
      Gesture.LongPress()
        .minDuration(500)
        .onStart((event) => {
          const longPressedNode = findNodeAtPosition(event.x, event.y);
          if (longPressedNode && onNodeLongPress) {
            if (Platform.OS !== 'web') {
              Vibration.vibrate([0, 50, 50, 50]);
            }
            runOnJS(handleNodeLongPress)(longPressedNode);
          }
        }),
    [findNodeAtPosition, onNodeLongPress],
  );

  const composedGestures = useMemo(
    () =>
      Gesture.Simultaneous(
        panGesture,
        pinchGesture,
        tapGesture,
        longPressGesture,
      ),
    [panGesture, pinchGesture, tapGesture, longPressGesture],
  );

  const handleNodePress = useCallback(
    (node: NeuralNode) => {
      setSelectedNode(node);
      if (Platform.OS !== 'web') {
        Vibration.vibrate(10);
      }
      onNodePress?.(node);
    },
    [onNodePress],
  );

  const handleNodeLongPress = useCallback(
    (node: NeuralNode) => {
      setSelectedNode(node);
      onNodeLongPress?.(node);
    },
    [onNodeLongPress],
  );

  // Render functions with performance optimizations
  const renderLinks = useMemo(() => {
    if (links.length > 100 && cognitiveLoad > 0.8) {
      // Reduce visual complexity under high cognitive load
      return links
        .filter((link) => link.strength > 0.5)
        .slice(0, 50)
        .map(renderSingleLink);
    }

    return links.map(renderSingleLink);
  }, [links, cognitiveLoad]);

  const renderSingleLink = useCallback(
    (link: NeuralLink) => {
      const sourceNode = nodes.find((n) => n.id === link.source);
      const targetNode = nodes.find((n) => n.id === link.target);

      if (!sourceNode || !targetNode) return null;

      const linkColor = physicsEngine.getColors().links[link.type];
      const strokeWidth = Math.max(1, link.strength * 3);

      // Organic curved paths
      const dx = (targetNode.x || 0) - (sourceNode.x || 0);
      const dy = (targetNode.y || 0) - (sourceNode.y || 0);
      const distance = Math.sqrt(dx * dx + dy * dy);

      const curvature = Math.min(distance * 0.2, link.strength * 40);
      const midX = (sourceNode.x || 0) + dx * 0.5;
      const midY = (sourceNode.y || 0) + dy * 0.5;
      const controlX = midX + (dy / distance) * curvature;
      const controlY = midY - (dx / distance) * curvature;

      return (
        <Path
          key={link.id}
          path={`M${sourceNode.x || 0},${
            sourceNode.y || 0
          } Q${controlX},${controlY} ${targetNode.x || 0},${targetNode.y || 0}`}
          color={linkColor}
          style="stroke"
          strokeWidth={strokeWidth}
          strokeCap="round"
          opacity={0.6 + link.strength * 0.4}
        />
      );
    },
    [nodes, physicsEngine],
  );

  const renderNodes = useMemo(() => {
    // Adaptive node rendering based on cognitive load and zoom
    const shouldShowLabels = scale.value > 0.8 && cognitiveLoad < 0.7;
    const maxVisibleNodes = cognitiveLoad > 0.8 ? 50 : nodes.length;

    return nodes
      .slice(0, maxVisibleNodes)
      .map((node) => renderSingleNode(node, shouldShowLabels));
  }, [nodes, scale.value, cognitiveLoad, selectedNode?.id]);

  const renderSingleNode = useCallback(
    (node: NeuralNode, showLabel: boolean) => {
      const nodeColor = physicsEngine.getNodeColor(node);
      const fireEffect = physicsEngine.getNeuralFireEffect(node);

      // Adaptive sizing
      const baseRadius = node.radius;
      const dynamicRadius =
        baseRadius * Math.max(0.6, Math.min(1.4, scale.value));
      const isSelected = selectedNode?.id === node.id;

      // Pulse animation for active nodes
      const pulseScale = useDerivedValue(() => {
        if (!node.isActive) return 1;
        return 1 + pulseTime.value * 0.2 * fireEffect.glow;
      }, [node.isActive, fireEffect.glow]);

      return (
        <Group key={node.id}>
          {/* Neural glow effect */}
          {node.isActive && fireEffect.glow > 0 && (
            <Circle
              cx={node.x || 0}
              cy={node.y || 0}
              r={dynamicRadius * 1.5}
              color={nodeColor}
              opacity={fireEffect.glow * 0.3}
            >
              <Blur blur={8} />
            </Circle>
          )}

          {/* Selection glow */}
          {isSelected && (
            <Circle
              cx={node.x || 0}
              cy={node.y || 0}
              r={dynamicRadius + 6}
              color={themeColors.primary}
              opacity={0.4}
            />
          )}

          {/* Main node body */}
          <Circle
            cx={node.x || 0}
            cy={node.y || 0}
            r={dynamicRadius}
            color={nodeColor}
            opacity={fireEffect.opacity}
          >
            {/* Glass morphism highlight */}
            <Circle
              cx={node.x || 0}
              cy={node.y || 0}
              r={dynamicRadius * 0.6}
              color={physicsEngine.getColors().ui.glassHighlight}
              opacity={0.8}
            />

            {/* Subtle shadow for depth */}
            <Shadow dx={2} dy={2} blur={4} color="rgba(0,0,0,0.2)" />
          </Circle>

          {/* Mastery progress ring - Fixed: Removed strokeDasharray */}
          {node.masteryLevel > 0.1 && (
            <Circle
              cx={node.x || 0}
              cy={node.y || 0}
              r={dynamicRadius + 2}
              color={themeColors.success}
              style="stroke"
              strokeWidth={3}
              opacity={node.masteryLevel}
            />
          )}

          {/* Adaptive node labels */}
          {showLabel && font && (
            <SkiaText
              x={(node.x || 0) - node.label.length * 4}
              y={(node.y || 0) + dynamicRadius + 18}
              text={node.label}
              font={font}
              color={themeColors.text}
              opacity={0.9}
            />
          )}

          {/* Cognitive load indicator */}
          {node.cognitiveLoad > 0.8 && (
            <Circle
              cx={(node.x || 0) + dynamicRadius - 4}
              cy={(node.y || 0) - dynamicRadius + 4}
              r={3}
              color={themeColors.warning}
            />
          )}
        </Group>
      );
    },
    [selectedNode?.id, physicsEngine, themeColors, font, pulseTime.value],
  );

  const renderBackgroundGrid = useMemo(() => {
    if (cognitiveLoad >= 0.7 || scale.value < 0.5) return null;

    const gridSize = 60;
    const gridColor =
      theme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)';

    const lines = [];
    const step = Math.max(gridSize, gridSize * (1 / scale.value));

    // Optimize grid rendering for performance
    for (let x = 0; x < width; x += step) {
      lines.push(
        <Line
          key={`v-${x}`}
          p1={{ x, y: 0 }}
          p2={{ x, y: height }}
          color={gridColor}
          strokeWidth={0.5}
        />,
      );
    }

    for (let y = 0; y < height; y += step) {
      lines.push(
        <Line
          key={`h-${y}`}
          p1={{ x: 0, y }}
          p2={{ x: width, y }}
          color={gridColor}
          strokeWidth={0.5}
        />,
      );
    }

    return lines;
  }, [cognitiveLoad, scale.value, theme, width, height]);

  const renderOverlayUI = useCallback(() => {
    if (!selectedNode) return null;

    return (
      <View
        style={[
          styles.nodeInfo,
          {
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
          },
        ]}
      >
        <Text style={[styles.nodeTitle, { color: themeColors.text }]}>
          {selectedNode.label}
        </Text>
        <Text style={[styles.nodeStats, { color: themeColors.textSecondary }]}>
          Mastery: {Math.round(selectedNode.masteryLevel * 100)}% • Load:{' '}
          {Math.round(selectedNode.cognitiveLoad * 100)}%
        </Text>
        {selectedNode.isActive && (
          <Text
            style={[styles.activeIndicator, { color: themeColors.warning }]}
          >
            🔥 Needs Attention
          </Text>
        )}
      </View>
    );
  }, [selectedNode, themeColors]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  return (
    <GestureHandlerRootView
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      <GestureDetector gesture={composedGestures}>
        <Animated.View style={[styles.canvasContainer, animatedStyle]}>
          <Canvas style={{ width, height }}>
            {/* Background elements */}
            {renderBackgroundGrid}

            {/* Neural network visualization */}
            <Group>
              {renderLinks}
              {renderNodes}
            </Group>
          </Canvas>
        </Animated.View>
      </GestureDetector>

      {/* UI overlay */}
      {renderOverlayUI()}
    </GestureHandlerRootView>
  );
};

// High-level neural mind map component with enhanced controls
interface NeuralMindMapProps {
  graph: NeuralGraph;
  theme: ThemeType;
  onNodePress?: (node: NeuralNode) => void;
  onNodeLongPress?: (node: NeuralNode) => void;
  cognitiveLoad?: number;
  showControls?: boolean;
  viewMode?: 'network' | 'clusters' | 'paths' | 'health';
}

export const NeuralMindMap: React.FC<NeuralMindMapProps> = ({
  graph,
  theme,
  onNodePress,
  onNodeLongPress,
  cognitiveLoad = 0.5,
  showControls = true,
  viewMode = 'network',
}) => {
  const { width, height } = Dimensions.get('window');
  const canvasHeight = height - 100;
  const themeColors = colors[theme];

  const healthColor = useMemo(() => {
    const health = graph.knowledgeHealth;
    if (health >= 80) return themeColors.success;
    if (health >= 60) return themeColors.warning;
    return themeColors.error;
  }, [graph.knowledgeHealth, themeColors]);

  return (
    <View style={styles.container}>
      <NeuralCanvas
        graph={graph}
        theme={theme}
        width={width}
        height={canvasHeight}
        onNodePress={onNodePress}
        onNodeLongPress={onNodeLongPress}
        cognitiveLoad={cognitiveLoad}
        viewMode={viewMode}
      />

      {showControls && (
        <View
          style={[
            styles.controls,
            {
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border,
            },
          ]}
        >
          <Text style={[styles.healthScore, { color: healthColor }]}>
            🧠 Knowledge Health: {graph.knowledgeHealth}%
          </Text>
          <Text
            style={[styles.networkStats, { color: themeColors.textSecondary }]}
          >
            {graph.nodes.length} concepts • {graph.links.length} connections
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  canvasContainer: {
    flex: 1,
  },
  nodeInfo: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    ...shadows.md,
  },
  nodeTitle: {
    ...typography.h4,
    marginBottom: spacing.xs,
  },
  nodeStats: {
    ...typography.bodySmall,
    marginBottom: spacing.xs,
  },
  activeIndicator: {
    ...typography.caption,
    fontWeight: '600',
  },
  controls: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.md,
  },
  healthScore: {
    ...typography.body,
    fontWeight: '600',
  },
  networkStats: {
    ...typography.caption,
  },
});

