/**
 * Phase 5 Enhancement: NeuralCanvas with Focus Lock Dimming
 *
 * Adds visual focus lock that dims distracting nodes and emphasizes
 * the selected focus target for "neural tunnel vision"
 */

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
import { ViewStyle } from 'react-native';
import {
  Canvas,
  Circle,
  Path,
  Line,
  Text as SkiaText,
  Group,
  matchFont,
  Skia,
  vec,
  Blur,
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
  withTiming,
  useSharedValue,
  runOnJS,
  interpolate,
  useDerivedValue,
} from 'react-native-reanimated';
import { AnimatedPath } from '../common/AnimatedPath';
import { Text } from 'react-native';
import {
  NeuralNode,
  NeuralLink,
  NeuralGraph,
} from '../../services/learning/MindMapGeneratorService';
import { NeuralPhysicsEngine } from '../../services/learning/NeuralPhysicsEngine';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../../theme/colors';
import { ThemeType } from '../../theme/colors';

/**
 * Phase 5: Enhanced NeuralCanvas with Focus Lock
 * Implements visual "neural tunnel vision" for distraction-free focus
 */

interface NeuralCanvasProps {
  graph: NeuralGraph;
  theme: ThemeType;
  width: number;
  height: number;
  onNodePress?: (node: NeuralNode) => void;
  onNodeLongPress?: (node: NeuralNode) => void;
  cognitiveLoad?: number;
  viewMode?: 'network' | 'clusters' | 'paths' | 'health';
  // Phase 5: Focus lock props
  focusNodeId?: string | null;
  focusLock?: boolean;
  focusLockSessionId?: string | null;
}

// Performance constants
const PERFORMANCE_CONFIG = {
  MAX_FPS: 60,
  FRAME_TIME_MS: 1000 / 60,
  MIN_ZOOM: 0.5,
  MAX_ZOOM: 3.0,
  GESTURE_SENSITIVITY: 1.0,
  HIGH_LOAD_SENSITIVITY: 0.7,
};

/**
 * Phase 5: Focus dimming configuration
 */
const FOCUS_CONFIG = {
  DIMMED_OPACITY: 0.2, // How transparent non-focus nodes become
  FOCUS_OPACITY: 1.0, // Full opacity for focus nodes
  CONNECTED_OPACITY: 0.6, // Semi-transparent for connected nodes
  FOCUS_GLOW_RADIUS: 8, // Glow effect around focus node
  TRANSITION_DURATION: 800, // Smooth transition to focus mode
};

/**
 * Phase 5: Color palettes for different view modes
 */
const VIEW_MODE_COLORS = {
  network: {
    primary: '#6366F1',
    secondary: '#8B5CF6',
    accent: '#EC4899',
  },
  health: {
    critical: '#EF4444', // Red for critical health
    moderate: '#F59E0B', // Amber for moderate health
    healthy: '#10B981', // Green for healthy
    excellent: '#059669', // Dark green for excellent
  },
  clusters: {
    programming: '#3B82F6', // Blue
    memory: '#8B5CF6', // Purple
    logic: '#F59E0B', // Amber
    english: '#10B981', // Green
    general: '#6B7280', // Gray
  },
  paths: {
    active: '#F59E0B', // Amber for active paths
    prerequisite: '#3B82F6', // Blue for prerequisites
    mastery: '#10B981', // Green for mastery paths
    connection: '#8B5CF6', // Purple for connections
  },
} as const;

export const NeuralCanvas: React.FC<NeuralCanvasProps> = ({
  graph,
  theme,
  width,
  height,
  onNodePress,
  onNodeLongPress,
  cognitiveLoad = 0.5,
  viewMode = 'network',
  focusNodeId = null, // Phase 5: Focus lock prop
  focusLock = false, // New prop for focus lock state
  focusLockSessionId = null, // Optional session ID for focus lock
}) => {
  const themeColors = colors[theme];

  // Phase 5: Animation time for paths mode
  const pathAnimationTime = useSharedValue(0);

  // Phase 5: Focus lock animation
  const focusTransition = useSharedValue(0);
  const focusGlow = useSharedValue(0);

  // Safe physics engine initialization
  const physicsEngine = useMemo(() => {
    try {
      const engine = new NeuralPhysicsEngine(width, height, theme);
      // Set initial focus lock state
      engine.setFocusLock(focusLock, focusLockSessionId ?? undefined);
      return engine;
    } catch (error) {
      console.warn('Physics engine initialization failed:', error);
      return null;
    }
  }, [width, height, theme]);

  // Update focus lock state in physics engine when props change
  useEffect(() => {
    if (physicsEngine) {
      physicsEngine.setFocusLock(focusLock, focusLockSessionId ?? undefined);
    }
  }, [focusLock, focusLockSessionId, physicsEngine]);

  // Safe font configuration
  const font = useMemo(() => {
    try {
      return matchFont({
        fontFamily: Platform.select({
          ios: 'Helvetica',
          android: 'Roboto',
          default: 'Arial',
        }),
        fontSize: Math.max(
          10,
          Math.min(16, interpolate(cognitiveLoad, [0, 1], [14, 10])),
        ),
        fontWeight: '500',
      });
    } catch (error) {
      console.warn('Font matching failed:', error);
      return null;
    }
  }, [cognitiveLoad]);

  // Animated values with safe defaults
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const pulseTime = useSharedValue(0);

  // State with safe initialization
  const [nodes, setNodes] = useState<NeuralNode[]>(() => graph?.nodes || []);
  const [links, setLinks] = useState<NeuralLink[]>(() => graph?.links || []);
  const [selectedNode, setSelectedNode] = useState<NeuralNode | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Phase 5: Performance optimization - derived scale threshold
  const scaleThreshold = useDerivedValue(() => scale.value > 1.2);

  // Phase 5: Occlusion culling - viewport bounds calculation
  const viewportBounds = useMemo(() => {
    const padding = 100; // Extra padding to avoid pop-in
    return {
      minX: -translateX.value / scale.value - padding,
      maxX: (-translateX.value + width) / scale.value + padding,
      minY: -translateY.value / scale.value - padding,
      maxY: (-translateY.value + height) / scale.value + padding,
    };
  }, [translateX.value, translateY.value, scale.value, width, height]);

  // Phase 5: Visible nodes filtering for occlusion culling
  const visibleNodes = useMemo(() => {
    return nodes.filter(
      (node) =>
        (node.x || 0) >= viewportBounds.minX &&
        (node.x || 0) <= viewportBounds.maxX &&
        (node.y || 0) >= viewportBounds.minY &&
        (node.y || 0) <= viewportBounds.maxY,
    );
  }, [nodes, viewportBounds]);

  // Phase 5: Spatial hashing for hit testing performance
  const spatialGrid = useMemo(() => {
    const cellSize = 50; // Adjust based on average node size
    const grid = new Map<string, NeuralNode[]>();

    nodes.forEach((node) => {
      if (typeof node.x === 'number' && typeof node.y === 'number') {
        const cellX = Math.floor(node.x / cellSize);
        const cellY = Math.floor(node.y / cellSize);
        const key = `${cellX},${cellY}`;

        if (!grid.has(key)) grid.set(key, []);
        grid.get(key)!.push(node);
      }
    });

    return { grid, cellSize };
  }, [nodes]);

  // Phase 5: Focus state
  const [focusConnectedNodes, setFocusConnectedNodes] = useState<Set<string>>(
    new Set(),
  );

  // Safe refs
  const animationFrameRef = useRef<number>(0);
  const isUpdatingRef = useRef(false);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      physicsEngine?.stop();
    };
  }, [physicsEngine]);

  // Phase 5: Handle focus node changes
  useEffect(() => {
    if (focusNodeId) {
      // Start focus transition
      focusTransition.value = withTiming(1, {
        duration: FOCUS_CONFIG.TRANSITION_DURATION,
      });
      focusGlow.value = withRepeat(withTiming(1, { duration: 2000 }), -1, true);

      // Update connected nodes
      updateFocusConnectedNodes(focusNodeId);

      // Set focus in physics engine
      if (physicsEngine) {
        physicsEngine.setFocusNode(focusNodeId);
      }

      console.log(`🎯 Focus lock activated for node: ${focusNodeId}`);
    } else {
      // Clear focus
      focusTransition.value = withTiming(0, {
        duration: FOCUS_CONFIG.TRANSITION_DURATION,
      });
      focusGlow.value = 0;
      setFocusConnectedNodes(new Set());

      if (physicsEngine) {
        physicsEngine.setFocusNode(null);
      }

      console.log('🎯 Focus lock deactivated');
    }
  }, [focusNodeId, physicsEngine, focusTransition, focusGlow]);

  // Phase 5: Initialize path animation when in paths mode
  useEffect(() => {
    if (viewMode === 'paths') {
      pathAnimationTime.value = withRepeat(
        withTiming(1, { duration: 2000 }),
        -1,
        false,
      );
    } else {
      pathAnimationTime.value = 0;
    }
  }, [viewMode, pathAnimationTime]);

  /**
   * Phase 5: Update connected nodes set for focus dimming
   */
  const updateFocusConnectedNodes = useCallback(
    (focusId: string) => {
      const connectedSet = new Set<string>();

      if (Array.isArray(links)) {
        links.forEach((link) => {
          const sourceId =
            typeof link.source === 'object' ? link.source.id : link.source;
          const targetId =
            typeof link.target === 'object' ? link.target.id : link.target;

          if (sourceId === focusId) {
            connectedSet.add(targetId);
          } else if (targetId === focusId) {
            connectedSet.add(sourceId);
          }
        });
      }

      setFocusConnectedNodes(connectedSet);
      console.log(
        `🎯 Focus connected nodes updated: ${connectedSet.size} nodes`,
      );
    },
    [links],
  );

  // Safe graph update with cognitive load integration
  useEffect(() => {
    if (!graph || !physicsEngine || !isMountedRef.current) {
      return;
    }

    try {
      const safeNodes = Array.isArray(graph.nodes) ? graph.nodes : [];
      const safeLinks = Array.isArray(graph.links) ? graph.links : [];

      setNodes(safeNodes);
      setLinks(safeLinks);

      if (safeNodes.length > 0) {
        // Phase 2: Update cognitive load in physics engine
        physicsEngine.updateCognitiveLoad(cognitiveLoad);

        physicsEngine.updateGraph({
          nodes: safeNodes,
          links: safeLinks,
          totalActivationLevel: graph.totalActivationLevel || 0,
          knowledgeHealth: graph.knowledgeHealth || 0,
          cognitiveComplexity: graph.cognitiveComplexity || 0,
          dueNodesCount: graph.dueNodesCount || 0,
          criticalLogicCount: graph.criticalLogicCount || 0,
          lastUpdated: graph.lastUpdated || new Date(),
        });

        // Update focus connected nodes if in focus mode
        if (focusNodeId) {
          updateFocusConnectedNodes(focusNodeId);
        }

        // Safe tick handling with throttling
        let lastTick = 0;
        physicsEngine.onTick((updatedNodes: NeuralNode[], updatedLinks: NeuralLink[]) => {
          if (!isMountedRef.current || isUpdatingRef.current) return;

          const now = Date.now();
          if (now - lastTick < PERFORMANCE_CONFIG.FRAME_TIME_MS) return;

          lastTick = now;
          isUpdatingRef.current = true;

          try {
            if (Array.isArray(updatedNodes) && updatedNodes.length > 0) {
              runOnJS(setNodes)(updatedNodes);
            }
            if (Array.isArray(updatedLinks)) {
              runOnJS(setLinks)(updatedLinks);
            }
          } catch (error) {
            console.warn('Tick update failed:', error);
          } finally {
            isUpdatingRef.current = false;
          }
        });

        // Start the physics simulation
        physicsEngine.start();

        setIsInitialized(true);
      }
    } catch (error) {
      console.error('Graph update failed:', error);
    }
  }, [graph, physicsEngine, cognitiveLoad, focusNodeId]);

  // Safe pulse animation
  useEffect(() => {
    try {
      const intensity = Math.max(
        0.5,
        Math.min(2, interpolate(cognitiveLoad, [0, 1], [1, 0.6])),
      );

      pulseTime.value = withRepeat(
        withTiming(1, { duration: 2000 * intensity }),
        -1,
        true,
      );
    } catch (error) {
      console.warn('Pulse animation failed:', error);
    }
  }, [cognitiveLoad, pulseTime]);

  // Safe node press handler
  const handleNodePress = useCallback(
    (node: NeuralNode | null) => {
      if (!node || !isMountedRef.current) return;

      try {
        setSelectedNode(node);

        if (Platform.OS !== 'web') {
          Vibration.vibrate(10);
        }

        onNodePress?.(node);
      } catch (error) {
        console.warn('Node press failed:', error);
      }
    },
    [onNodePress],
  );

  // Safe node long press handler
  const handleNodeLongPress = useCallback(
    (node: NeuralNode | null) => {
      if (!node || !isMountedRef.current) return;

      try {
        setSelectedNode(node);

        if (Platform.OS !== 'web') {
          Vibration.vibrate([0, 50, 50, 50]);
        }

        onNodeLongPress?.(node);
      } catch (error) {
        console.warn('Node long press failed:', error);
      }
    },
    [onNodeLongPress],
  );

  // Ultra-safe hit testing with spatial hashing
  const findNodeAtPosition = useCallback(
    (
      x: number,
      y: number,
      currentTranslateX: number = 0,
      currentTranslateY: number = 0,
      currentScale: number = 1,
    ): NeuralNode | null => {
      try {
        if (!Array.isArray(nodes) || nodes.length === 0) {
          return null;
        }

        const safeScale = Math.max(0.1, Math.min(5, currentScale));
        const adjustedX = x;
        const adjustedY = y;

        // Use spatial grid for efficient lookup
        const cellX = Math.floor(adjustedX / spatialGrid.cellSize);
        const cellY = Math.floor(adjustedY / spatialGrid.cellSize);
        const key = `${cellX},${cellY}`;

        const nearbyNodes = spatialGrid.grid.get(key) || [];

        // Check nodes in the current cell and adjacent cells
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const adjacentKey = `${cellX + dx},${cellY + dy}`;
            const adjacentNodes = spatialGrid.grid.get(adjacentKey) || [];
            nearbyNodes.push(...adjacentNodes);
          }
        }

        // Remove duplicates
        const uniqueNodes = Array.from(new Set(nearbyNodes));

        for (const node of uniqueNodes) {
          if (
            !node ||
            typeof node.x !== 'number' ||
            typeof node.y !== 'number' ||
            isNaN(node.x) ||
            isNaN(node.y)
          ) {
            continue;
          }

          const distance = Math.sqrt(
            Math.pow(adjustedX - node.x, 2) + Math.pow(adjustedY - node.y, 2),
          );

          const touchRadius = Math.max(20, (node.radius || 15) + 20);

          if (distance <= touchRadius) {
            return node;
          }
        }

        return null;
      } catch (error) {
        console.warn('Hit testing failed:', error);
        return null;
      }
    },
    [nodes, spatialGrid],
  );

  // Safe gesture handlers
  const tapGesture = useMemo(() => {
    return Gesture.Tap()
      .maxDuration(300)
      .onEnd((event) => {
        if (
          !event ||
          typeof event.x !== 'number' ||
          typeof event.y !== 'number' ||
          isNaN(event.x) ||
          isNaN(event.y)
        )
          return;
        try {
          if (
            !isMountedRef.current ||
            !findNodeAtPosition ||
            typeof findNodeAtPosition !== 'function'
          )
            return;

          const tappedNode = findNodeAtPosition(
            event.x,
            event.y,
            translateX.value,
            translateY.value,
            scale.value,
          );

          if (tappedNode) {
            runOnJS(handleNodePress)(tappedNode);
          }
        } catch (error) {
          console.warn(
            'Tap gesture failed:',
            error instanceof Error ? error.message : error || 'Unknown error',
          );
        }
      });
  }, [findNodeAtPosition, handleNodePress, translateX, translateY, scale]);

  const longPressGesture = useMemo(() => {
    return Gesture.LongPress()
      .minDuration(600)
      .onStart((event) => {
        if (
          !event ||
          typeof event.x !== 'number' ||
          typeof event.y !== 'number' ||
          isNaN(event.x) ||
          isNaN(event.y)
        )
          return;
        try {
          if (!isMountedRef.current) return;

          const longPressedNode = findNodeAtPosition(
            event.x,
            event.y,
            translateX.value,
            translateY.value,
            scale.value,
          );

          if (longPressedNode) {
            runOnJS(handleNodeLongPress)(longPressedNode);
          }
        } catch (error) {
          // Only log meaningful errors
          if (
            error &&
            typeof error === 'object' &&
            Object.keys(error).length > 0
          ) {
            console.warn('Long press gesture failed:', error);
          }
        }
      });
  }, [findNodeAtPosition, handleNodeLongPress, translateX, translateY, scale]);

  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .minDistance(25) // Require minimum movement to start pan, allowing taps to work
      .onStart(() => {
        try {
          if (!isMountedRef.current) return;
          if (Platform.OS !== 'web') {
            Vibration.vibrate(1);
          }
        } catch (error) {
          // Only log meaningful errors
          if (
            error &&
            typeof error === 'object' &&
            Object.keys(error).length > 0
          ) {
            console.warn('Pan start failed:', error);
          }
        }
      })
      .onUpdate((event) => {
        try {
          const sensitivity =
            cognitiveLoad > 0.7
              ? PERFORMANCE_CONFIG.HIGH_LOAD_SENSITIVITY
              : PERFORMANCE_CONFIG.GESTURE_SENSITIVITY;

          translateX.value = (event.translationX || 0) * sensitivity;
          translateY.value = (event.translationY || 0) * sensitivity;
        } catch (error) {
          console.warn('Pan update failed:', error);
        }
      })
      .onEnd(() => {
        try {
          translateX.value = withSpring(translateX.value, { damping: 15 });
          translateY.value = withSpring(translateY.value, { damping: 15 });
        } catch (error) {
          console.warn('Pan end failed:', error);
        }
      });
  }, [cognitiveLoad, translateX, translateY]);

  const pinchGesture = useMemo(() => {
    return Gesture.Pinch()
      .onUpdate((event) => {
        try {
          const newScale = Math.min(
            Math.max(event.scale || 1, PERFORMANCE_CONFIG.MIN_ZOOM),
            PERFORMANCE_CONFIG.MAX_ZOOM,
          );
          scale.value = newScale;
        } catch (error) {
          console.warn('Pinch update failed:', error);
        }
      })
      .onEnd(() => {
        try {
          scale.value = withSpring(scale.value, { damping: 20 });
        } catch (error) {
          console.warn('Pinch end failed:', error);
        }
      });
  }, [scale]);

  // Safe gesture composition
  const composedGestures = useMemo(() => {
    try {
      return Gesture.Simultaneous(
        panGesture,
        pinchGesture,
        tapGesture,
        longPressGesture,
      );
    } catch (error) {
      console.warn('Gesture composition failed:', error);
      return panGesture;
    }
  }, [panGesture, pinchGesture, tapGesture, longPressGesture]);

  /**
   * Phase 5: Get node opacity based on focus mode
   */
  const getNodeOpacity = useCallback(
    (node: NeuralNode): number => {
      if (!physicsEngine) return 1.0;
      return physicsEngine.getNodeOpacity(node.id);
    },
    [physicsEngine],
  );

  /**
   * Phase 5: Get node blur amount based on focus mode
   */
  const getNodeBlurAmount = useCallback(
    (node: NeuralNode): number => {
      if (!physicsEngine) return 0;
      return physicsEngine.getNodeBlurAmount(node.id);
    },
    [physicsEngine],
  );

  /**
   * Phase 5: Get link opacity based on focus mode
   */
  const getLinkOpacity = useCallback(
    (link: NeuralLink): number => {
      if (!physicsEngine) return 1.0;
      // For now, fallback to default opacity based on strength
      return Math.max(0.1, Math.min(0.8, (link.strength || 0.5) * 0.6));
    },
    [physicsEngine],
  );

  /**
   * Phase 3: Get node color based on view mode
   */
  const getNodeColor = useCallback(
    (node: NeuralNode): string => {
      try {
        switch (viewMode) {
          case 'health':
            // Phase 3: Health-based coloring
            const healthScore = node.healthScore || 0.5;
            if (healthScore < 0.3) return VIEW_MODE_COLORS.health.critical;
            if (healthScore < 0.7) return VIEW_MODE_COLORS.health.moderate;
            if (healthScore < 0.9) return VIEW_MODE_COLORS.health.healthy;
            return VIEW_MODE_COLORS.health.excellent;

          case 'clusters':
            // Phase 3: Cluster-based coloring
            const domain = node.category?.toLowerCase() || 'general';
            if (domain.includes('program'))
              return VIEW_MODE_COLORS.clusters.programming;
            if (domain.includes('memory'))
              return VIEW_MODE_COLORS.clusters.memory;
            if (domain.includes('logic'))
              return VIEW_MODE_COLORS.clusters.logic;
            if (domain.includes('english'))
              return VIEW_MODE_COLORS.clusters.english;
            return VIEW_MODE_COLORS.clusters.general;

          case 'paths':
            // Phase 3: Path-based coloring
            if (node.isActive) return VIEW_MODE_COLORS.paths.active;
            if (node.masteryLevel > 0.8) return VIEW_MODE_COLORS.paths.mastery;
            if (node.masteryLevel < 0.3)
              return VIEW_MODE_COLORS.paths.prerequisite;
            return VIEW_MODE_COLORS.paths.connection;

          case 'network':
          default:
            // Use physics engine color or fallback
            return physicsEngine?.getNodeColor?.(node) || themeColors.primary;
        }
      } catch (error) {
        console.warn('Error getting node color:', error);
        return themeColors.primary;
      }
    },
    [viewMode, physicsEngine, themeColors.primary],
  );

  /**
   * Phase 3: Get link color and style based on view mode
   */
  const getLinkStyle = useCallback(
    (
      link: NeuralLink,
    ): {
      color: string;
      strokeWidth: number;
      isDashed?: boolean;
    } => {
      try {
        const baseStrokeWidth = Math.max(
          0.5,
          Math.min(4, (link.strength || 0.5) * 2),
        );

        switch (viewMode) {
          case 'health':
            // Health links show connection strength
            return {
              color: themeColors.primary,
              strokeWidth: baseStrokeWidth,
            };

          case 'clusters':
            // Cluster links are more prominent between same clusters
            return {
              color: VIEW_MODE_COLORS.clusters.general,
              strokeWidth: baseStrokeWidth * 1.2,
            };

          case 'paths':
            // Path links can be animated and more prominent
            return {
              color: VIEW_MODE_COLORS.paths.connection,
              strokeWidth: baseStrokeWidth * 1.5,
              isDashed: true, // Animated dashed lines
            };

          case 'network':
          default:
            return {
              color: themeColors.primary,
              strokeWidth: baseStrokeWidth,
            };
        }
      } catch (error) {
        console.warn('Error getting link style:', error);
        return {
          color: themeColors.primary,
          strokeWidth: 1,
        };
      }
    },
    [viewMode, themeColors.primary],
  );

  /**
   * Phase 3: Render cluster hulls (convex hulls around node groups)
   */
  const renderClusterHulls = useCallback(() => {
    if (viewMode !== 'clusters' || !graph?.clusters) return [];

    try {
      return graph.clusters
        .map((cluster, index) => {
          if (!cluster.nodes || cluster.nodes.length < 3) return null;

          // Get valid positioned nodes
          const positionedNodes = cluster.nodes.filter(
            (node) =>
              typeof node.x === 'number' &&
              typeof node.y === 'number' &&
              !isNaN(node.x) &&
              !isNaN(node.y),
          );

          if (positionedNodes.length < 3) return null;

          // Simple convex hull calculation (gift wrapping algorithm simplified)
          const hullPoints = calculateConvexHull(positionedNodes);

          if (hullPoints.length < 3) return null;

          // Create Skia path from hull points
          const path = Skia.Path.Make();
          path.moveTo(hullPoints[0].x, hullPoints[0].y);

          for (let i = 1; i < hullPoints.length; i++) {
            path.lineTo(hullPoints[i].x, hullPoints[i].y);
          }
          path.close();

          // Get cluster color
          const clusterColor = getClusterColor(cluster.category);

          // Phase 5: Apply focus dimming to cluster hulls
          const hullOpacity = focusNodeId
            ? FOCUS_CONFIG.DIMMED_OPACITY * 0.5
            : 0.1;

          return (
            <Path
              key={`cluster_hull_${cluster.id}_${index}`}
              path={path}
              color={clusterColor}
              style="fill"
              opacity={hullOpacity}
            />
          );
        })
        .filter(Boolean);
    } catch (error) {
      console.warn('Error rendering cluster hulls:', error);
      return [];
    }
  }, [viewMode, graph?.clusters, focusNodeId]);

  /**
   * Simple convex hull calculation
   */
  const calculateConvexHull = useCallback(
    (points: NeuralNode[]): { x: number; y: number }[] => {
      if (points.length < 3) return points.map((p) => ({ x: p.x!, y: p.y! }));

      // Find the bottom-most point
      let bottom = 0;
      for (let i = 1; i < points.length; i++) {
        if (
          points[i].y! > points[bottom].y! ||
          (points[i].y! === points[bottom].y! &&
            points[i].x! < points[bottom].x!)
        ) {
          bottom = i;
        }
      }

      // Simple hull - just create a bounding box with some padding
      const minX = Math.min(...points.map((p) => p.x!)) - 20;
      const maxX = Math.max(...points.map((p) => p.x!)) + 20;
      const minY = Math.min(...points.map((p) => p.y!)) - 20;
      const maxY = Math.max(...points.map((p) => p.y!)) + 20;

      return [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
      ];
    },
    [],
  );

  /**
   * Get cluster color based on category
   */
  const getClusterColor = useCallback((category: string): string => {
    const domain = category?.toLowerCase() || 'general';
    if (domain.includes('program'))
      return VIEW_MODE_COLORS.clusters.programming;
    if (domain.includes('memory')) return VIEW_MODE_COLORS.clusters.memory;
    if (domain.includes('logic')) return VIEW_MODE_COLORS.clusters.logic;
    if (domain.includes('english')) return VIEW_MODE_COLORS.clusters.english;
    return VIEW_MODE_COLORS.clusters.general;
  }, []);

  /**
   * Phase 5: Render single link with focus dimming and curved Bezier paths
   */
  const renderSingleLink = useCallback(
    (link: NeuralLink, index: number) => {
      try {
        if (!link || !Array.isArray(nodes) || nodes.length === 0) {
          return null;
        }

        const sourceNode = nodes.find((n) => n && n.id === link.source);
        const targetNode = nodes.find((n) => n && n.id === link.target);

        if (
          !sourceNode ||
          !targetNode ||
          typeof sourceNode.x !== 'number' ||
          typeof sourceNode.y !== 'number' ||
          typeof targetNode.x !== 'number' ||
          typeof targetNode.y !== 'number' ||
          isNaN(sourceNode.x) ||
          isNaN(sourceNode.y) ||
          isNaN(targetNode.x) ||
          isNaN(targetNode.y)
        ) {
          return null;
        }

        const linkStyle = getLinkStyle(link);
        const linkOpacity = getLinkOpacity(link);

        // Calculate control points for Bezier curve
        const midX = (sourceNode.x + targetNode.x) / 2;
        const midY = (sourceNode.y + targetNode.y) / 2;
        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const curveOffset = Math.min(30, distance / 4);

        // Perpendicular vector for curve control points
        const perpX = -dy;
        const perpY = dx;
        const norm = Math.sqrt(perpX * perpX + perpY * perpY);
        const unitPerpX = perpX / norm;
        const unitPerpY = perpY / norm;

        // Control points for cubic Bezier curve
        const controlPoint1 = {
          x: midX + unitPerpX * curveOffset,
          y: midY + unitPerpY * curveOffset,
        };
        const controlPoint2 = {
          x: midX + unitPerpX * curveOffset,
          y: midY + unitPerpY * curveOffset,
        };

        // Create Skia path for Bezier curve
        const path = Skia.Path.Make();
        path.moveTo(sourceNode.x, sourceNode.y);
        path.cubicTo(
          controlPoint1.x,
          controlPoint1.y,
          controlPoint2.x,
          controlPoint2.y,
          targetNode.x,
          targetNode.y,
        );

        // Phase 3: Animated stroke for paths mode
        if (viewMode === 'paths' && linkStyle.isDashed) {
          return (
            <AnimatedPath
              key={`link_${link.id}_${index}`}
              path={path}
              color={linkStyle.color}
              strokeWidth={linkStyle.strokeWidth}
              opacity={linkOpacity}
              animationTime={pathAnimationTime}
              start={0}
              end={1}
            />
          );
        }

        return (
          <Path
            key={`link_${link.id}_${index}`}
            path={path}
            color={linkStyle.color}
            style="stroke"
            strokeWidth={linkStyle.strokeWidth}
            opacity={linkOpacity}
          />
        );
      } catch (error) {
        console.warn(`Error rendering link ${index}:`, error);
        return null;
      }
    },
    [nodes, getLinkStyle, getLinkOpacity, viewMode, pathAnimationTime],
  );

  /**
   * Phase 3: Animated line component for paths mode
   */
  const AnimatedLine: React.FC<{
    p1: { x: number; y: number };
    p2: { x: number; y: number };
    color: string;
    strokeWidth: number;
    opacity: number;
    animationTime: Animated.SharedValue<number>;
  }> = ({ p1, p2, color, strokeWidth, opacity, animationTime }) => {
    const animatedOpacity = useDerivedValue(() => {
      const baseOpacity = opacity;
      const pulseEffect = interpolate(animationTime.value, [0, 1], [0.3, 1.0]);
      return baseOpacity * pulseEffect;
    });

    return (
      <Line
        p1={p1}
        p2={p2}
        color={color}
        strokeWidth={strokeWidth}
        opacity={animatedOpacity.value}
      />
    );
  };

  /**
   * Create shape path based on node type
   */
  const createNodeShape = useCallback(
    (node: NeuralNode, centerX: number, centerY: number, radius: number) => {
      const path = Skia.Path.Make();

      switch (node.type) {
        case 'skill':
          // Rectangle/Square
          const rectSize = radius * 1.2;
          const halfRect = rectSize / 2;
          path.moveTo(centerX - halfRect, centerY - halfRect);
          path.lineTo(centerX + halfRect, centerY - halfRect);
          path.lineTo(centerX + halfRect, centerY + halfRect);
          path.lineTo(centerX - halfRect, centerY + halfRect);
          path.close();
          break;

        case 'goal':
          // Diamond
          const diamondSize = radius * 1.4;
          path.moveTo(centerX, centerY - diamondSize);
          path.lineTo(centerX + diamondSize, centerY);
          path.lineTo(centerX, centerY + diamondSize);
          path.lineTo(centerX - diamondSize, centerY);
          path.close();
          break;

        case 'memory':
          // Star
          const starSize = radius * 1.3;
          const spikes = 5;
          const outerRadius = starSize;
          const innerRadius = starSize * 0.5;

          for (let i = 0; i < spikes * 2; i++) {
            const angle = (i * Math.PI) / spikes;
            const r = i % 2 === 0 ? outerRadius : innerRadius;
            const x = centerX + Math.cos(angle - Math.PI / 2) * r;
            const y = centerY + Math.sin(angle - Math.PI / 2) * r;

            if (i === 0) path.moveTo(x, y);
            else path.lineTo(x, y);
          }
          path.close();
          break;

        case 'habit':
          // Triangle
          const triangleSize = radius * 1.5;
          path.moveTo(centerX, centerY - triangleSize);
          path.lineTo(
            centerX + triangleSize * 0.866,
            centerY + triangleSize * 0.5,
          );
          path.lineTo(
            centerX - triangleSize * 0.866,
            centerY + triangleSize * 0.5,
          );
          path.close();
          break;

        case 'logic':
          // Hexagon
          const hexSize = radius * 1.1;
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const x = centerX + Math.cos(angle) * hexSize;
            const y = centerY + Math.sin(angle) * hexSize;

            if (i === 0) path.moveTo(x, y);
            else path.lineTo(x, y);
          }
          path.close();
          break;

        case 'concept':
        default:
          // Circle (default) - return null to use Circle component instead
          return null;
      }

      return path;
    },
    [],
  );

  /**
   * Phase 5: Render single node with focus dimming and glow effects
   */
  const renderSingleNode = useCallback(
    (node: NeuralNode, index: number, showLabel: boolean) => {
      try {
        if (
          !node ||
          typeof node.x !== 'number' ||
          typeof node.y !== 'number' ||
          isNaN(node.x) ||
          isNaN(node.y)
        ) {
          return null;
        }

        const radius = Math.max(8, Math.min(30, node.radius || 15));
        const isSelected = selectedNode?.id === node.id;
        const nodeColor = getNodeColor(node);
        const nodeOpacity = getNodeOpacity(node);
        const nodeBlur = getNodeBlurAmount(node);

        // Phase 5: Focus node enhancements
        const isFocusNode = node.id === focusNodeId;
        const enhancedRadius = isFocusNode ? radius * 1.2 : radius;

        // Create node shape based on type
        const nodeShape = createNodeShape(node, node.x, node.y, enhancedRadius);
        const isCircle = nodeShape === null; // null means use Circle component

        return (
          <Group key={`node_${node.id}_${index}`}>
            {/* Phase 5: Focus node glow effect */}
            {isFocusNode && (
              <Circle
                cx={node.x}
                cy={node.y}
                r={enhancedRadius + FOCUS_CONFIG.FOCUS_GLOW_RADIUS}
                color={nodeColor}
                opacity={focusGlow.value * 0.3}
              />
            )}

            {/* Selection indicator */}
            {isSelected && (
              <Circle
                cx={node.x}
                cy={node.y}
                r={enhancedRadius + 4}
                color={themeColors.accent}
                opacity={nodeOpacity * 0.5}
              />
            )}

            {/* Phase 5: Apply blur effect to main node elements when focus lock is active */}
            {nodeBlur > 0 ? (
              <Blur blur={nodeBlur}>
                {/* Phase 3: Health mode - add warning ring for critical nodes */}
                {viewMode === 'health' &&
                  node.healthScore !== undefined &&
                  node.healthScore < 0.3 && (
                    <Circle
                      cx={node.x}
                      cy={node.y}
                      r={enhancedRadius + 6}
                      color={VIEW_MODE_COLORS.health.critical}
                      opacity={nodeOpacity * 0.3}
                    />
                  )}

                {/* Main node - use shape or circle */}
                {isCircle ? (
                  <Circle
                    cx={node.x}
                    cy={node.y}
                    r={enhancedRadius}
                    color={nodeColor}
                    opacity={nodeOpacity}
                  />
                ) : (
                  <Path
                    path={nodeShape}
                    color={nodeColor}
                    style="fill"
                    opacity={nodeOpacity}
                  />
                )}

                {/* Phase 3: Health mode - inner health indicator */}
                {viewMode === 'health' && node.healthScore !== undefined && (
                  <Circle
                    cx={node.x}
                    cy={node.y}
                    r={enhancedRadius * 0.6}
                    color={nodeColor}
                    opacity={nodeOpacity * (node.healthScore || 0)}
                  />
                )}

                {/* Phase 3: Paths mode - pulsing for active nodes */}
                {viewMode === 'paths' && node.isActive && (
                  <Circle
                    cx={node.x}
                    cy={node.y}
                    r={enhancedRadius * 1.2}
                    color={VIEW_MODE_COLORS.paths.active}
                    opacity={nodeOpacity * 0.4}
                  />
                )}

                {/* Node label */}
                {showLabel && font && node.label && (
                  <SkiaText
                    x={node.x - (node.label?.length || 0) * 3}
                    y={node.y + enhancedRadius + 16}
                    text={String(node.label).substring(0, 15)}
                    font={font}
                    color={themeColors.text}
                    opacity={nodeOpacity}
                  />
                )}
              </Blur>
            ) : (
              <>
                {/* Phase 3: Health mode - add warning ring for critical nodes */}
                {viewMode === 'health' &&
                  node.healthScore !== undefined &&
                  node.healthScore < 0.3 && (
                    <Circle
                      cx={node.x}
                      cy={node.y}
                      r={enhancedRadius + 6}
                      color={VIEW_MODE_COLORS.health.critical}
                      opacity={nodeOpacity * 0.3}
                    />
                  )}

                {/* Main node - use shape or circle */}
                {isCircle ? (
                  <Circle
                    cx={node.x}
                    cy={node.y}
                    r={enhancedRadius}
                    color={nodeColor}
                    opacity={nodeOpacity}
                  />
                ) : (
                  <Path
                    path={nodeShape}
                    color={nodeColor}
                    style="fill"
                    opacity={nodeOpacity}
                  />
                )}

                {/* Phase 3: Health mode - inner health indicator */}
                {viewMode === 'health' && node.healthScore !== undefined && (
                  <Circle
                    cx={node.x}
                    cy={node.y}
                    r={enhancedRadius * 0.6}
                    color={nodeColor}
                    opacity={nodeOpacity * (node.healthScore || 0)}
                  />
                )}

                {/* Phase 3: Paths mode - pulsing for active nodes */}
                {viewMode === 'paths' && node.isActive && (
                  <Circle
                    cx={node.x}
                    cy={node.y}
                    r={enhancedRadius * 1.2}
                    color={VIEW_MODE_COLORS.paths.active}
                    opacity={nodeOpacity * 0.4}
                  />
                )}

                {/* Node label */}
                {showLabel && font && node.label && (
                  <SkiaText
                    x={node.x - (node.label?.length || 0) * 3}
                    y={node.y + enhancedRadius + 16}
                    text={String(node.label).substring(0, 15)}
                    font={font}
                    color={themeColors.text}
                    opacity={nodeOpacity}
                  />
                )}
              </>
            )}
          </Group>
        );
      } catch (error) {
        console.warn(`Error rendering node ${index}:`, error);
        return null;
      }
    },
    [
      selectedNode?.id,
      getNodeColor,
      getNodeOpacity,
      getNodeBlurAmount,
      themeColors,
      font,
      viewMode,
      focusNodeId,
      focusGlow,
      createNodeShape,
    ],
  );

  /**
   * Phase 5: Render links with cluster hulls first (so they appear behind nodes)
   */
  const renderLinks = useMemo(() => {
    try {
      if (!Array.isArray(links) || links.length === 0) {
        return [];
      }

      // Limit links under high cognitive load
      const maxLinks = cognitiveLoad > 0.8 ? 50 : links.length;

      // Use visibleNodes to filter links for occlusion culling
      const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
      const filteredLinks = links.filter((link) => {
        const sourceId =
          typeof link.source === 'object' ? link.source.id : link.source;
        const targetId =
          typeof link.target === 'object' ? link.target.id : link.target;
        return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
      });

      const visibleLinks = filteredLinks.slice(0, maxLinks);

      return visibleLinks.map(renderSingleLink).filter(Boolean);
    } catch (error) {
      console.warn('Error rendering links:', error);
      return [];
    }
  }, [links, cognitiveLoad, renderSingleLink, visibleNodes]);

  /**
   * Phase 5: Render nodes with enhanced focus dimming
   */
  const renderNodes = useMemo(() => {
    try {
      if (!Array.isArray(nodes) || nodes.length === 0) {
        return [];
      }

      const shouldShowLabels =
        scale.value > 1 &&
        cognitiveLoad < 0.7 &&
        (!focusNodeId || focusTransition.value < 0.5);
      const maxNodes = cognitiveLoad > 0.8 ? 30 : nodes.length;

      // Use visibleNodes for occlusion culling
      const visibleNodesLimited = visibleNodes.slice(0, maxNodes);

      return visibleNodesLimited
        .map((node, index) => renderSingleNode(node, index, shouldShowLabels))
        .filter(Boolean);
    } catch (error) {
      console.warn('Error rendering nodes:', error);
      return [];
    }
  }, [
    nodes,
    scale.value,
    cognitiveLoad,
    focusNodeId,
    focusTransition,
    renderSingleNode,
    visibleNodes,
  ]);

  // Safe overlay UI
  const renderOverlayUI = useCallback(() => {
    if (!selectedNode) return null;

    try {
      return (
        <View
          style={[
            styles.nodeInfo,
            { backgroundColor: themeColors.surface + '95' },
          ]}
        >
          <Text style={[styles.nodeTitle, { color: themeColors.text }]}>
            {String(selectedNode.label || 'Unknown Node')}
          </Text>
          <Text
            style={[styles.nodeStats, { color: themeColors.textSecondary }]}
          >
            Type: {selectedNode.type || 'unknown'} •
            {viewMode === 'health' &&
              selectedNode.healthScore !== undefined &&
              ` Health: ${Math.round(selectedNode.healthScore * 100)}% • `}
            Mastery: {Math.round((selectedNode.masteryLevel || 0) * 100)}%
          </Text>
          {selectedNode.isActive && (
            <Text
              style={[styles.activeIndicator, { color: themeColors.warning }]}
            >
              🔥 Needs Attention
            </Text>
          )}
          {/* Phase 5: Focus mode indicator */}
          {focusNodeId === selectedNode.id && (
            <Text style={[styles.focusIndicator, { color: themeColors.info }]}>
              🎯 Focus Target
            </Text>
          )}
        </View>
      );
    } catch (error) {
      console.warn('Error rendering overlay UI:', error);
      return null;
    }
  }, [selectedNode, themeColors, viewMode, focusNodeId]);

  // Safe animated style
  const animatedStyle = useAnimatedStyle(() => {
    try {
      return {
        transform: [
          { scale: Math.max(0.1, Math.min(5, scale.value)) },
          { translateX: translateX.value },
          { translateY: translateY.value },
        ],
      };
    } catch (error) {
      console.warn('Animated style failed:', error);
      return {};
    }
  });

  // Loading state
  if (!isInitialized || !physicsEngine) {
    return (
      <View
        style={[styles.container, { backgroundColor: themeColors.background }]}
      >
        <Text style={[styles.loadingText, { color: themeColors.text }]}>
          Loading neural network...
        </Text>
      </View>
    );
  }

  // Main render
  return (
    <GestureHandlerRootView
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      <GestureDetector gesture={composedGestures}>
        <Animated.View style={[styles.canvasContainer, animatedStyle]}>
          <Canvas style={{ width, height }}>
            <Group>
              {/* Phase 3: Render cluster hulls first (background) */}
              {renderClusterHulls()}

              {/* Render links */}
              {renderLinks}

              {/* Render nodes */}
              {renderNodes}
            </Group>
          </Canvas>
        </Animated.View>
      </GestureDetector>

      {renderOverlayUI()}

      {/* Phase 5: Focus mode status indicator */}
      {focusNodeId && (
        <View
          style={[
            styles.focusStatus,
            { backgroundColor: themeColors.info + '20' },
          ]}
        >
          <Text style={[styles.focusStatusText, { color: themeColors.info }]}>
            🎯 Focus Lock Active
          </Text>
        </View>
      )}
    </GestureHandlerRootView>
  );
};

// High-level neural mind map component
interface NeuralMindMapProps {
  graph: NeuralGraph;
  theme: ThemeType;
  onNodePress?: (node: NeuralNode) => void;
  onNodeLongPress?: (node: NeuralNode) => void;
  cognitiveLoad?: number;
  showControls?: boolean;
  viewMode?: 'network' | 'clusters' | 'paths' | 'health';
  // Phase 5: Focus lock prop
  focusNodeId?: string | null;
  focusLock?: boolean;
}

export const NeuralMindMap: React.FC<NeuralMindMapProps> = ({
  graph,
  theme,
  onNodePress,
  onNodeLongPress,
  cognitiveLoad = 0.5,
  showControls = true,
  viewMode = 'network',
  focusNodeId = null, // Phase 5: Focus lock prop
}) => {
  const { width, height } = Dimensions.get('window');
  const canvasHeight = height - 100;
  const themeColors = colors[theme];

  // Safe graph validation
  const safeGraph = useMemo(() => {
    if (!graph) {
      return {
        nodes: [],
        links: [],
        totalActivationLevel: 0,
        knowledgeHealth: 0,
        cognitiveComplexity: 0,
        dueNodesCount: 0,
        criticalLogicCount: 0,
        lastUpdated: new Date(),
      };
    }
    return graph;
  }, [graph]);

  const healthColor = useMemo(() => {
    try {
      const health = safeGraph.knowledgeHealth || 0;
      if (health >= 80) return themeColors.success;
      if (health >= 60) return themeColors.warning;
      return themeColors.error;
    } catch (error) {
      console.warn('Health color calculation failed:', error);
      return themeColors.primary;
    }
  }, [safeGraph.knowledgeHealth, themeColors]);

  /**
   * Phase 3: View mode specific display info
   */
  const viewModeInfo = useMemo(() => {
    const info = {
      network: `${safeGraph.nodes?.length || 0} concepts • ${
        safeGraph.links?.length || 0
      } links`,
      health: `${
        safeGraph.healthMetrics?.criticalNodes.length || 0
      } critical • Health: ${Math.round(
        (safeGraph.healthMetrics?.overallHealth || 0) * 100,
      )}%`,
      clusters: `${safeGraph.clusters?.length || 0} domains • ${
        safeGraph.nodes?.length || 0
      } concepts`,
      paths: `${safeGraph.learningPaths?.length || 0} routes • ${
        safeGraph.dueNodesCount || 0
      } due`,
    };
    return info[viewMode] || info.network;
  }, [safeGraph, viewMode]);

  return (
    <View style={styles.container}>
      <NeuralCanvas
        graph={safeGraph}
        theme={theme}
        width={width}
        height={canvasHeight}
        onNodePress={onNodePress}
        onNodeLongPress={onNodeLongPress}
        cognitiveLoad={cognitiveLoad}
        viewMode={viewMode}
        focusNodeId={focusNodeId} // Phase 5: Pass focus prop
      />

      {showControls && (
        <View
          style={[
            styles.controls,
            { backgroundColor: themeColors.surface + '95' },
          ]}
        >
          <Text style={[styles.healthScore, { color: healthColor }]}>
            🧠{' '}
            {viewMode === 'health'
              ? 'Health'
              : viewMode === 'clusters'
              ? 'Clusters'
              : viewMode === 'paths'
              ? 'Paths'
              : 'Network'}
            : {safeGraph.knowledgeHealth || 0}%
          </Text>
          <Text
            style={[styles.networkStats, { color: themeColors.textSecondary }]}
          >
            {viewModeInfo}
          </Text>
          {/* Phase 5: Focus mode indicator */}
          {focusNodeId && (
            <Text style={[styles.focusMode, { color: themeColors.info }]}>
              🎯 Focus Active
            </Text>
          )}
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
  loadingText: {
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
  },
  nodeInfo: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
  // Phase 5: Focus indicators
  focusIndicator: {
    ...typography.caption,
    fontWeight: '600',
  },
  focusStatus: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  focusStatusText: {
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
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
  focusMode: {
    ...typography.caption,
    fontWeight: '600',
  },
});
