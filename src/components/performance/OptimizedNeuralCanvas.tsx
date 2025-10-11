/**
 * Optimized Neural Canvas - Performance-First Implementation
 *
 * This component addresses the critical rendering performance issues
 * by implementing viewport culling, adaptive quality, and efficient rendering.
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Dimensions, View, StyleSheet } from 'react-native';
import {
  Canvas,
  Circle,
  Path,
  Line,
  Group,
  Skia,
} from '@shopify/react-native-skia';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';

import { NeuralNode, NeuralLink, NeuralGraph } from '../../services/learning/MindMapGeneratorService';
import { colors, ThemeType } from '../../theme/colors';
import PerformanceOptimizer from '../../services/performance/PerformanceOptimizer';
import OptimizedPhysicsWorker from '../../services/performance/OptimizedPhysicsWorker';
import { useNeuralCanvasData } from '../../hooks/useOptimizedStore';

interface OptimizedNeuralCanvasProps {
  graph: NeuralGraph;
  theme: ThemeType;
  width: number;
  height: number;
  onNodePress?: (node: NeuralNode) => void;
  focusNodeId?: string | null;
}

interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export const OptimizedNeuralCanvas: React.FC<OptimizedNeuralCanvasProps> = ({
  graph,
  theme,
  width,
  height,
  onNodePress,
  focusNodeId = null,
}) => {
  const themeColors = colors[theme];

  // Use optimized store hooks
  const { cognitiveLoad, context, isRefreshing } = useNeuralCanvasData();

  // Performance services
  const performanceOptimizer = useMemo(() => PerformanceOptimizer.getInstance(), []);
  const physicsWorker = useMemo(() => OptimizedPhysicsWorker.getInstance(), []);

  // Animated values
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // State
  const [nodes, setNodes] = useState<NeuralNode[]>([]);
  const [links, setLinks] = useState<NeuralLink[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Performance tracking
  const renderStartTime = useRef(0);
  const frameCount = useRef(0);

  // Get device capabilities and adaptive settings
  const deviceCapabilities = useMemo(() =>
    performanceOptimizer.getDeviceCapabilities(),
    []
  );

  const adaptiveSettings = useMemo(() =>
    performanceOptimizer.getAdaptiveRenderSettings(cognitiveLoad),
    [cognitiveLoad, performanceOptimizer]
  );

  // Optimize graph data based on device capabilities
  const optimizedGraph = useMemo(() => {
    if (!graph?.nodes?.length) return { nodes: [], links: [] };

    const startTime = performance.now();
    const optimized = performanceOptimizer.optimizeGraphData(graph.nodes, graph.links);
    const optimizeTime = performance.now() - startTime;

    if (optimizeTime > 10) {
      console.warn('⚠️ Graph optimization took', optimizeTime.toFixed(2), 'ms');
    }

    return optimized;
  }, [graph, performanceOptimizer]);

  // Viewport-based culling
  const viewportBounds = useMemo((): ViewportBounds => {
    const padding = adaptiveSettings.maxRenderDistance;
    return {
      minX: -translateX.value / scale.value - padding,
      maxX: (-translateX.value + width) / scale.value + padding,
      minY: -translateY.value / scale.value - padding,
      maxY: (-translateY.value + height) / scale.value + padding,
    };
  }, [translateX.value, translateY.value, scale.value, width, height, adaptiveSettings.maxRenderDistance]);

  // Visible nodes (viewport culling)
  const visibleNodes = useMemo(() => {
    if (adaptiveSettings.renderQuality === 'low') {
      // Aggressive culling for low-end devices
      return optimizedGraph.nodes.filter(node =>
        node.x !== undefined && node.y !== undefined &&
        node.x >= viewportBounds.minX && node.x <= viewportBounds.maxX &&
        node.y >= viewportBounds.minY && node.y <= viewportBounds.maxY
      ).slice(0, 30); // Hard limit for low-end devices
    }

    return optimizedGraph.nodes.filter(node =>
      node.x !== undefined && node.y !== undefined &&
      node.x >= viewportBounds.minX && node.x <= viewportBounds.maxX &&
      node.y >= viewportBounds.minY && node.y <= viewportBounds.maxY
    );
  }, [optimizedGraph.nodes, viewportBounds, adaptiveSettings.renderQuality]);

  // Visible links (only between visible nodes)
  const visibleLinks = useMemo(() => {
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
    return optimizedGraph.links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
    });
  }, [optimizedGraph.links, visibleNodes]);

  // Initialize physics worker
  useEffect(() => {
    const initializePhysics = async () => {
      try {
        physicsWorker.setCallbacks({
          onPositionsUpdated: (data: any) => {
            // Update node positions from worker
            setNodes(prevNodes => {
              const nodeMap = new Map(prevNodes.map(n => [n.id, n]));
              return data.nodes.map((workerNode: any) => {
                const existingNode = nodeMap.get(workerNode.id);
                return existingNode ? {
                  ...existingNode,
                  x: workerNode.x,
                  y: workerNode.y,
                } : existingNode;
              }).filter(Boolean) as NeuralNode[];
            });
          },
          onError: (error: any) => {
            console.error('Physics worker error:', error);
          },
          onFallbackActivated: () => {
            console.log('🔄 Physics fallback activated - performance may be reduced');
          }
        });

        await physicsWorker.initialize(
          {
            nodeSize: { min: 8, max: 24, adaptive: true },
            linkStrength: { min: 0.1, max: 2.0, contextMultiplier: 1.0 },
            repulsionForce: { base: 100, cognitiveLoadMultiplier: 1.2 },
            damping: { base: 0.9, contextMultiplier: 1.0 },
            contextualBehavior: {} as any,
            environmentalFactors: {
              locationInfluence: 0.1,
              timeInfluence: 0.1,
              dblInfluence: 0.1,
              biologicalInfluence: 0.1,
            },
            anticipatoryAdjustments: {
              enabled: false,
              lookaheadMinutes: 5,
              adaptationSmoothing: 0.1,
            },
            adaptiveQuality: {
              enabled: true,
              qualityLevels: [
                { deviceLoad: 0.3, physicsQuality: 0.5 },
                { deviceLoad: 0.7, physicsQuality: 0.8 },
                { deviceLoad: 1.0, physicsQuality: 1.0 },
              ],
            },
          },
          {
            currentContext: context || 'DeepFocus',
            cognitiveLoad: cognitiveLoad,
            environmentalOptimality: 0.8,
            targetNodeId: focusNodeId,
            activeConfig: {} as any,
            nodeCount: optimizedGraph.nodes.length,
            linkCount: optimizedGraph.links.length,
            simulationSpeed: 1.0,
            qualityLevel: adaptiveSettings.renderQuality === 'high' ? 1.0 : 0.5,
            lastUpdate: new Date(),
            adaptationCount: 0,
            performanceMetrics: {
              fps: 60,
              nodeRenderTime: 0,
              interactionResponsiveness: 0,
            },
            anticipatedChanges: [],
          }
        );

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize physics:', error);
        setIsInitialized(true); // Continue without physics
      }
    };

    initializePhysics();

    return () => {
      physicsWorker.stop();
    };
  }, [physicsWorker, context, cognitiveLoad, focusNodeId, adaptiveSettings.renderQuality]);

  // Update graph data
  useEffect(() => {
    if (!isInitialized) return;

    const updateGraph = async () => {
      try {
        setNodes(optimizedGraph.nodes);
        setLinks(optimizedGraph.links);

        if (optimizedGraph.nodes.length > 0) {
          await physicsWorker.updateGraph(
            optimizedGraph.nodes.map(node => ({
              id: node.id,
              x: node.x || Math.random() * width,
              y: node.y || Math.random() * height,
              vx: 0,
              vy: 0,
              size: node.radius || 15,
              opacity: 1,
              isTargetNode: node.id === focusNodeId,
              contextRelevance: { [context || 'DeepFocus']: 0.8 },
              cognitiveLoad: node.cognitiveLoad || 0.5,
              masteryLevel: node.masteryLevel || 0.5,
              priority: node.isActive ? 1 : 0.5,
              pulseIntensity: 0.5,
              glowEffect: 0,
              colorIntensity: 1,
              animationState: 'idle',
              lastInteraction: new Date(),
              interactionHistory: [],
              adaptiveSize: node.radius || 15,
              adaptiveOpacity: 1,
              isInOptimalPath: false,
              difficultyAdjustment: 0,
              attentionWeight: 1,
            })),
            optimizedGraph.links.map(link => ({
              id: link.id,
              source: typeof link.source === 'string' ? link.source : link.source.id,
              target: typeof link.target === 'string' ? link.target : link.target.id,
              strength: link.strength || 0.5,
              distance: 50,
              type: link.type || 'association',
              contextRelevance: { [context || 'DeepFocus']: 0.5 },
              cognitiveDistance: 1,
              opacity: 0.5,
              width: 1,
              flowDirection: 'none',
              animationSpeed: 1,
              glowIntensity: 0,
              lastActivation: new Date(),
              activationHistory: [],
              adaptiveStrength: link.strength || 0.5,
              adaptiveVisibility: 0.5,
            }))
          );

          physicsWorker.start();
        }
      } catch (error) {
        console.error('Failed to update graph:', error);
      }
    };

    updateGraph();
  }, [optimizedGraph, isInitialized, physicsWorker, width, height, focusNodeId, context]);

  // Performance monitoring
  useEffect(() => {
    renderStartTime.current = performance.now();
    frameCount.current++;

    // Record render time every 60 frames
    if (frameCount.current % 60 === 0) {
      const renderTime = performance.now() - renderStartTime.current;
      performanceOptimizer.recordRenderTime(renderTime);
    }
  });

  // Node press handler with performance tracking
  const handleNodePress = useCallback((node: NeuralNode) => {
    const startTime = performance.now();
    onNodePress?.(node);
    const latency = performance.now() - startTime;
    performanceOptimizer.recordInteractionLatency(latency);
  }, [onNodePress, performanceOptimizer]);

  // Hit testing with spatial optimization
  const findNodeAtPosition = useCallback((x: number, y: number): NeuralNode | null => {
    const adjustedX = (x - translateX.value) / scale.value;
    const adjustedY = (y - translateY.value) / scale.value;

    // Only check visible nodes for performance
    for (const node of visibleNodes) {
      if (node.x === undefined || node.y === undefined) continue;

      const distance = Math.sqrt(
        Math.pow(adjustedX - node.x, 2) + Math.pow(adjustedY - node.y, 2)
      );

      const touchRadius = (node.radius || 15) + 10;
      if (distance <= touchRadius) {
        return node;
      }
    }

    return null;
  }, [visibleNodes, translateX.value, translateY.value, scale.value]);

  // Optimized gesture handlers
  const tapGesture = useMemo(() => {
    return Gesture.Tap()
      .maxDuration(300)
      .onEnd((event) => {
        const tappedNode = findNodeAtPosition(event.x, event.y);
        if (tappedNode) {
          runOnJS(handleNodePress)(tappedNode);
        }
      });
  }, [findNodeAtPosition, handleNodePress]);

  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .minDistance(10)
      .onUpdate((event) => {
        translateX.value = event.translationX;
        translateY.value = event.translationY;
      });
  }, [translateX, translateY]);

  const pinchGesture = useMemo(() => {
    return Gesture.Pinch()
      .onUpdate((event) => {
        scale.value = Math.max(0.5, Math.min(3.0, event.scale));
      });
  }, [scale]);

  const composedGestures = useMemo(() => {
    return Gesture.Simultaneous(panGesture, pinchGesture, tapGesture);
  }, [panGesture, pinchGesture, tapGesture]);

  // Render single node with adaptive quality
  const renderNode = useCallback((node: NeuralNode, index: number) => {
    if (node.x === undefined || node.y === undefined) return null;

    const radius = Math.max(6, Math.min(20, node.radius || 15));
    const isFocusNode = node.id === focusNodeId;
    const nodeColor = isFocusNode ? themeColors.accent : themeColors.primary;
    const opacity = adaptiveSettings.renderQuality === 'low' ? 0.8 : 1.0;

    return (
      <Group key={`node_${node.id}_${index}`}>
        {/* Focus glow effect (only for high quality) */}
        {isFocusNode && adaptiveSettings.renderQuality === 'high' && (
          <Circle
            cx={node.x}
            cy={node.y}
            r={radius + 6}
            color={nodeColor}
            opacity={0.3}
          />
        )}

        {/* Main node */}
        <Circle
          cx={node.x}
          cy={node.y}
          r={radius}
          color={nodeColor}
          opacity={opacity}
        />

        {/* Active indicator */}
        {node.isActive && (
          <Circle
            cx={node.x}
            cy={node.y}
            r={radius * 0.6}
            color={themeColors.warning}
            opacity={0.7}
          />
        )}
      </Group>
    );
  }, [focusNodeId, themeColors, adaptiveSettings.renderQuality]);

  // Render single link with adaptive quality
  const renderLink = useCallback((link: NeuralLink, index: number) => {
    const sourceNode = visibleNodes.find(n => n.id === (typeof link.source === 'string' ? link.source : link.source.id));
    const targetNode = visibleNodes.find(n => n.id === (typeof link.target === 'string' ? link.target : link.target.id));

    if (!sourceNode || !targetNode ||
        sourceNode.x === undefined || sourceNode.y === undefined ||
        targetNode.x === undefined || targetNode.y === undefined) {
      return null;
    }

    const opacity = adaptiveSettings.renderQuality === 'low' ? 0.3 : 0.5;
    const strokeWidth = adaptiveSettings.renderQuality === 'low' ? 0.5 : 1;

    return (
      <Line
        key={`link_${link.id}_${index}`}
        p1={{ x: sourceNode.x, y: sourceNode.y }}
        p2={{ x: targetNode.x, y: targetNode.y }}
        color={themeColors.primary}
        strokeWidth={strokeWidth}
        opacity={opacity}
      />
    );
  }, [visibleNodes, themeColors, adaptiveSettings.renderQuality]);

  // Animated style
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  // Loading state
  if (!isInitialized) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.loadingContainer}>
          {/* Simple loading indicator */}
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <GestureDetector gesture={composedGestures}>
        <Animated.View style={[styles.canvasContainer, animatedStyle]}>
          <Canvas style={{ width, height }}>
            <Group>
              {/* Render links first (background) */}
              {visibleLinks.map(renderLink)}

              {/* Render nodes (foreground) */}
              {visibleNodes.map(renderNode)}
            </Group>
          </Canvas>
        </Animated.View>
      </GestureDetector>

      {/* Performance info (debug) */}
      {__DEV__ && (
        <View style={styles.debugInfo}>
          {/* Debug performance metrics */}
        </View>
      )}
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvasContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  debugInfo: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    borderRadius: 4,
  },
});

export default OptimizedNeuralCanvas;
