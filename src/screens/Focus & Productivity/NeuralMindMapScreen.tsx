/**
 *  Neural Mind Map Screen with CAE 2.0 Integration
 *
 * This  screen integrates the complete Cognitive Aura Engine 2.0 stack:
 * - Environmental & Biometric Context Sensing
 * - Neural Capacity Forecasting &  States
 * - Adaptive Physics with 4  cognitive contexts
    // initialize forecastStartTime to 0 to avoid explicit `undefined` which
    // can conflict with strict exactOptionalPropertyTypes. 0 is a safe neutral default.
    forecastStartTime: 0,
 * - Predictive intelligence and anticipatory adjustments
 * - Multi-modal system integration
 */

import React, {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { debounce } from 'lodash';
import { getNeuralWorker } from '../../workers/neuralWorker';
import { useNeuralMindMapState } from '../../hooks/useNeuralMindMapState';
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';
import { useProgressiveLoading } from '../../hooks/useProgressiveLoading';
import { useOptimizedCanvas } from '../../hooks/useOptimizedCanvas';
import { MemoryManager } from '../../utils/MemoryManager';
import {
  AdaptiveUIManager,
  AdaptiveUIConfig,
} from '../../utils/AdaptiveUIManager';
import { SmartCacheManager } from '../../utils/SmartCacheManager';
import { BackgroundProcessor } from '../../utils/BackgroundProcessor';
import { ServiceManager } from '../../utils/ServiceManager';
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
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import GradientFallback from '../../components/shared/GradientFallback';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';

// Core components
import {
  AppHeader,
  HamburgerMenu,
} from '../../components/navigation/Navigation';
import {
  GlassCard,
  Button,
  ScreenContainer,
} from '../../components/GlassComponents';
import { NeuralMindMap } from '../../components/ai/NeuralCanvas';
// Temporary typed shim so we can pass experimental renderData prop without
// changing the upstream component props. Keep this minimal and remove once
// NeuralMindMap accepts `renderData` in its props.
const AnyNeuralMindMap: any = NeuralMindMap as any;
import { MiniPlayer } from '../../components/MiniPlayerComponent';

//  CAE 2.0 imports
import MicroTaskCard from '../../components/shared/MicroTaskCard'; // New  component
import ContextInsightsPanel from '../../components/ai/ContextInsightsPanel'; // New context panel
import { CapacityForecastWidget } from '../../components/ai/CapacityForecastWidget'; // New forecast widget
import AdaptiveControlPanel from '../../components/ai/AdaptiveControlPanel'; // New adaptive controls

// Theme and styling
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../../theme/colors';
import { ThemeType } from '../../theme/colors';

// Services - CAE 2.0 Stack
import {
  MindMapGenerator,
  NeuralGraph,
  NeuralNode,
} from '../../services/learning/MindMapGeneratorService';
import StorageService from '../../services/storage/StorageService';
import {
  CognitiveAuraService,
  AuraState,
  AuraContext,
} from '../../services/ai/CognitiveAuraService';
import {
  ContextSensorService,
  ContextSnapshot,
  DigitalBodyLanguage,
} from '../../services/ai/ContextSensorService';
import {
  NeuralPhysicsEngine,
  PhysicsState,
} from '../../services/learning/NeuralPhysicsEngine';

// Context and hooks
import { useFocus } from '../../contexts/FocusContext';
import { useSoundscape } from '../../contexts/SoundscapeContext';
import { SoundscapeType } from '../../services/learning/CognitiveSoundscapeEngine';
import CrossModuleBridgeService from '../../services/integrations/CrossModuleBridgeService';
import {
  useAuraContext,
  useCognitiveLoad,
  useAuraConfidence,
  useIsLoading,
  useIsRefreshing,
  useAuraActions,
  useNeuralCanvasData,
} from '../../hooks/useOptimizedSelectors';
import { perf } from '../../utils/perfMarks';

// ====================  INTERFACES ====================

interface NeuralMindMapScreenProps {
  theme: ThemeType;
  onNavigate: (screen: string) => void;
  focusNodeId?: string | null;
}

/**
 *  view modes with CAE 2.0 context awareness
 */
interface ViewMode {
  id:
    | 'context_adaptive'
    | 'network'
    | 'clusters'
    | 'paths'
    | 'health'
    | 'forecast';
  name: string;
  description: string;
  icon: string;
  color: string;
  shortName: string;
  contextOptimized: AuraContext[];
  ai: boolean;
}

interface NodeDetail {
  node: NeuralNode;
  connections: number;
  centrality: number;
  recommendations: string[];
  networkPosition: 'central' | 'peripheral' | 'bridge';
  healthInsights: string[];
  pathRecommendations: string[];
  contextRelevance: Record<AuraContext, number>;
  cognitiveLoad: number;
  masteryLevel: number;
  optimalContexts: AuraContext[];
}

interface LoadingState {
  isGenerating: boolean;
  isCalculating: boolean;
  isRefreshing: boolean;
  isGeneratingAura: boolean;
  isContextSensing: boolean;
  isForecasting: boolean;
  progress?: number;
  stage?: string;
}

/**
 *  view modes with CAE 2.0 features
 */
const _VIEW_MODES: ViewMode[] = [
  {
    id: 'context_adaptive',
    name: 'Context Adaptive',
    shortName: 'Adaptive',
    description:
      'AI-powered view that adapts to your current cognitive context',
    icon: '🧠',
    color: '#6366F1',
    contextOptimized: [
      'DeepFocus',
      'CreativeFlow',
      'FragmentedAttention',
      'CognitiveOverload',
    ],
    ai: true,
  },
  {
    id: 'forecast',
    name: 'Cognitive Forecast',
    shortName: 'Forecast',
    description: 'Predictive view showing anticipated learning opportunities',
    icon: '🔮',
    color: '#8B5CF6',
    contextOptimized: ['DeepFocus', 'CreativeFlow'],
    ai: true,
  },
  {
    id: 'network',
    name: 'Neural Network',
    shortName: 'Network',
    description: 'Full brain-like visualization of all connections',
    icon: '🕸️',
    color: '#10B981',
    contextOptimized: ['CreativeFlow'],
    ai: false,
  },
  {
    id: 'health',
    name: 'Cognitive Health',
    shortName: 'Health',
    description: 'Context-aware highlighting of areas needing attention',
    icon: '❤️‍🩹',
    color: '#EF4444',
    contextOptimized: ['CognitiveOverload', 'FragmentedAttention'],
    ai: true,
  },
  {
    id: 'clusters',
    name: 'Knowledge Clusters',
    shortName: 'Clusters',
    description: 'Adaptive grouping based on current learning context',
    icon: '🔗',
    color: '#F59E0B',
    contextOptimized: ['DeepFocus', 'FragmentedAttention'],
    ai: true,
  },
  {
    id: 'paths',
    name: 'Learning Paths',
    shortName: 'Paths',
    description: 'Context-optimized learning sequences',
    icon: '🛤️',
    color: '#06B6D4',
    contextOptimized: ['DeepFocus', 'FragmentedAttention'],
    ai: true,
  },
];

const COGNITIVE_CONTEXT_COLORS = {
  DeepFocus: '#4338CA',
  CreativeFlow: '#7C3AED',
  FragmentedAttention: '#DC2626',
  CognitiveOverload: '#EA580C',
} as const;

/**
 * Pure helper: map AuraContext to optimal view mode.
 * Moved to module scope to be deterministic and avoid render-order issues.
 */
function getOptimalViewModeForContext(
  context: AuraContext,
): 'clusters' | 'network' | 'paths' | 'health' | 'context_adaptive' {
  switch (context) {
    case 'DeepFocus':
      return 'clusters';
    case 'CreativeFlow':
      return 'network';
    case 'FragmentedAttention':
      return 'paths';
    case 'CognitiveOverload':
      return 'health';
    default:
      return 'context_adaptive';
  }
}

// ====================  COMPONENT ====================

// Module-level deterministic helpers (avoid non-deterministic Math.random in production)
const _devRandom = (() => {
  try {
    return (process && process.env && process.env.NODE_ENV) !== 'production';
  } catch (e) {
    return false;
  }
})();

function deterministicUnitValue(id: string, salt = ''): number {
  let h = 2166136261 >>> 0;
  const s = id + '|' + salt;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h % 1000000) / 1000000;
}


export const NeuralMindMapScreen: React.FC<NeuralMindMapScreenProps> = ({
  theme,
  onNavigate,
  focusNodeId,
}) => {
  const mountMarkRef = useRef<string | null>(null);
  const memoryManager = MemoryManager.getInstance();
  const { measureAsync } = usePerformanceMonitor('NeuralMindMapScreen');

  // ==================== OPTIMIZED STATE MANAGEMENT ====================
  const { state, actions } = useNeuralMindMapState();

  // Destructure state for easier access
  const {
    ui: {
      menuVisible,
      nodeDetailVisible,
      microTaskVisible,
      microTaskMinimized,
      contextInsightsVisible,
      capacityForecastVisible,
      adaptiveControlsVisible,
      sidePanelCollapsed,
      showBottomSheet,
      bottomActiveTab,
    },
    data: {
      neuralGraph,
      selectedNode,
      nodeDetail,
      auraState,
      contextSnapshot,
      physicsState,
    },
    settings: { viewMode, adaptiveColors },
    loading: loadingState,
    error,
  } = state;

  // Local state for complex objects that don't need frequent updates
  const [forecastStages, setForecastStages] = useState<{
    shortTerm: boolean;
    mediumTerm: boolean;
    longTerm: boolean;
  }>({ shortTerm: false, mediumTerm: false, longTerm: false });

  const [forecastProgress, setForecastProgress] = useState<{
    currentStage: 'short' | 'medium' | 'long' | null;
    progress: number;
  }>({ currentStage: null, progress: 0 });

  const [forecastCache, setForecastCache] = useState<{
    shortTerm?: any;
    mediumTerm?: any;
    longTerm?: any;
    lastUpdated: number;
  }>({ lastUpdated: 0 });

  // Performance tracking (kept local as it's frequently updated)
  const [performanceTracking, setPerformanceTracking] = useState<{
    taskStartTime: Date | null;
    completionCount: number;
    skipCount: number;
    contextSwitchCount: number;
    accuracyScore: number;
    forecastStartTime?: number;
  }>({
    taskStartTime: null,
    completionCount: 0,
    skipCount: 0,
    contextSwitchCount: 0,
    accuracyScore: 0.75,
    forecastStartTime: 0,
  });

  // Backwards-compatible setter aliases (map older local setter names to
  // the centralized actions / local state used by the new reducer-based
  // hook. This is a minimal, low-risk compatibility layer so existing
  // logic that calls setX(...) keeps working without large refactors.
  const setPerformanceMetrics = setPerformanceTracking;

  const setLoadingState = (
    updater: Partial<LoadingState> | ((prev: LoadingState) => LoadingState),
  ) => {
    if (typeof updater === 'function') {
      // pass current loadingState to the reducer helper
      actions.setLoading(
        (updater as (p: LoadingState) => LoadingState)(loadingState),
      );
    } else {
      actions.setLoading(updater as Partial<LoadingState>);
    }
  };

  const setAuraState = (s: AuraState) => {
    actions.setData({ auraState: s });
  };

  const setPhysicsState = (p: PhysicsState) => {
    actions.setData({ physicsState: p });
  };

  const setViewMode = (mode: ViewMode['id'] | string) => {
    actions.setSettings({ viewMode: mode as any });
  };

  const setSelectedNode = (node: NeuralNode | null) => {
    actions.setData({ selectedNode: node });
  };

  const setNodeDetail = (detail: NodeDetail | null) => {
    actions.setData({ nodeDetail: detail });
  };

  const setNodeDetailVisible = (v: boolean) => {
    // actions API exposes setUI (uppercase) from the reducer-based hook
    if (typeof (actions as any).setUI === 'function') {
      (actions as any).setUI({ nodeDetailVisible: v });
    } else {
      // fallback for older API
      (actions as any).setUi?.({ nodeDetailVisible: v } as any);
    }
  };

  const setMenuVisible = (v: boolean) => {
    if (typeof (actions as any).setUI === 'function') {
      (actions as any).setUI({ menuVisible: v });
    } else {
      (actions as any).setUi?.({ menuVisible: v } as any);
    }
  };

  const setContextInsightsVisible = (v: boolean) => {
    if (typeof (actions as any).setUI === 'function') {
      (actions as any).setUI({ contextInsightsVisible: v });
    } else {
      (actions as any).setUi?.({ contextInsightsVisible: v } as any);
    }
  };

  const setAdaptiveControlsVisible = (v: boolean) => {
    if (typeof (actions as any).setUI === 'function') {
      (actions as any).setUI({ adaptiveControlsVisible: v });
    } else {
      (actions as any).setUi?.({ adaptiveControlsVisible: v } as any);
    }
  };

  const setCapacityForecastVisible = (v: boolean) => {
    if (typeof (actions as any).setUI === 'function') {
      (actions as any).setUI({ capacityForecastVisible: v });
    } else {
      (actions as any).setUi?.({ capacityForecastVisible: v } as any);
    }
  };

  const setMicroTaskMinimized = (v: boolean) => {
    if (typeof (actions as any).setUI === 'function') {
      (actions as any).setUI({ microTaskMinimized: v });
    } else {
      (actions as any).setUi?.({ microTaskMinimized: v } as any);
    }
  };

  const setBottomActiveTab = (tab: string) => {
    if (typeof (actions as any).setUI === 'function') {
      (actions as any).setUI({ bottomActiveTab: tab as any });
    } else {
      (actions as any).setUi?.({ bottomActiveTab: tab as any } as any);
    }
  };

  const setShowBottomSheet = (v: boolean) => {
    if (typeof (actions as any).setUI === 'function') {
      (actions as any).setUI({ showBottomSheet: v });
    } else {
      (actions as any).setUi?.({ showBottomSheet: v } as any);
    }
  };

  const setContextSnapshot = (s: ContextSnapshot) => {
    actions.setData({ contextSnapshot: s });
  };

  // Contexts and services
  const { focusState, startFocusSession } = useFocus();
  const { startPreset } = useSoundscape();

  // Service instances (memoized)
  const mindMapGenerator = useMemo(() => MindMapGenerator.getInstance(), []);
  const storage = useMemo(() => StorageService.getInstance(), []);
  const CAE = useMemo(() => CognitiveAuraService.getInstance(), []);
  const contextSensorService = useMemo(
    () => ContextSensorService.getInstance(),
    [],
  );
  const PhysicsEngine = useMemo(() => NeuralPhysicsEngine.getInstance(), []);
  const crossModuleBridge = useMemo(
    () => CrossModuleBridgeService.getInstance(),
    [],
  );

  // Performance optimization services
  const adaptiveUIManager = useMemo(() => AdaptiveUIManager.getInstance(), []);
  const cacheManager = useMemo(() => SmartCacheManager.getInstance(), []);
  const backgroundProcessor = useMemo(
    () => BackgroundProcessor.getInstance(),
    [],
  );
  const serviceManager = useMemo(() => ServiceManager.getInstance(), []);

  // Optimized hooks
  const { getOptimizedRenderData, updateViewport } = useOptimizedCanvas();

  // Screen dimensions
  const { width, height } = Dimensions.get('window');
  const themeColors = colors[theme];

  // Animation values
  const contextTransitionProgress = useSharedValue(0);
  const capacityForecastScale = useSharedValue(1);
  const microTaskPulse = useSharedValue(1);
  // Side panel open/closed progress (0 = collapsed, 1 = expanded)
  const sidePanelProgress = useSharedValue(
    Dimensions.get('window').width < 720 ? 0 : 1,
  );

  // Timers and refs
  const auraUpdateTimer = useRef<NodeJS.Timeout | null>(null);
  const contextUpdateTimer = useRef<NodeJS.Timeout | null>(null);
  const performanceTimer = useRef<NodeJS.Timeout | null>(null);
  const monitoringStarted = useRef(false);
  // Listener handler refs so we can remove them precisely on cleanup
  const caeAuraUpdatedHandler = useRef<((a: AuraState) => void) | null>(null);
  const caeContextChangeHandler = useRef<((c: AuraContext) => void) | null>(
    null,
  );
  const contextSensorContextUpdatedHandler = useRef<
    ((s: ContextSnapshot) => void) | null
  >(null);
  const contextSensorDblUpdatedHandler = useRef<
    ((d: DigitalBodyLanguage) => void) | null
  >(null);
  const physicsUpdatedHandler = useRef<((u: any) => void) | null>(null);
  const physicsTransitionCompleteHandler = useRef<((e: any) => void) | null>(
    null,
  );
  const physicsNodeInteractionHandler = useRef<((e: any) => void) | null>(null);

  // ==================== COMPUTED VALUES ====================

  const currentViewMode = useMemo(
    () => _VIEW_MODES.find((mode) => mode.id === viewMode) || _VIEW_MODES[0],
    [viewMode],
  );

  // Map viewMode to supported NeuralMindMap view modes
  // Using module-level getOptimalViewModeForContext helper (pure function)

  const effectiveViewMode = useMemo(() => {
    if (viewMode === 'context_adaptive') {
      return getOptimalViewModeForContext(auraState?.context || 'DeepFocus') as
        | 'clusters'
        | 'paths'
        | 'network'
        | 'health';
    }
    if (viewMode === 'forecast') {
      return 'network'; // Default for forecast mode
    }
    return viewMode as 'clusters' | 'paths' | 'network' | 'health';
  }, [viewMode, auraState?.context]);

  const contextColor = useMemo(() => {
    if (!auraState) return themeColors.primary;
    return COGNITIVE_CONTEXT_COLORS[auraState.context] || themeColors.primary;
  }, [auraState, themeColors.primary]);

  const isContextOptimized = useMemo(() => {
    if (!auraState || !currentViewMode) return false;
    return currentViewMode.contextOptimized.includes(auraState.context);
  }, [currentViewMode, auraState]);

  const adaptiveRecommendations = useMemo(() => {
    if (!auraState || !contextSnapshot) return [];

    const recommendations: string[] = [];

    // Context-specific recommendations
    switch (auraState.context) {
      case 'DeepFocus':
        if (contextSnapshot.locationContext.distractionRisk === 'high') {
          recommendations.push(
            'Consider finding a quieter environment for optimal deep focus',
          );
        }
        if (auraState.capacityForecast.optimalWindowRemaining < 30) {
          recommendations.push(
            `Deep focus window ending in ${auraState.capacityForecast.optimalWindowRemaining} minutes`,
          );
        }
        break;

      case 'CreativeFlow':
        recommendations.push(
          'Perfect time for conceptual exploration and creative connections',
        );
        if (viewMode !== 'network') {
          recommendations.push('Try Network view to see creative connections');
        }
        break;

      case 'FragmentedAttention':
        recommendations.push('Focus on quick wins and review items');
        if (auraState.capacityForecast.nextOptimalWindow) {
          const timeToNext = Math.ceil(
            (auraState.capacityForecast.nextOptimalWindow.getTime() -
              Date.now()) /
              (1000 * 60),
          );
          recommendations.push(
            `Optimal learning window in ${timeToNext} minutes`,
          );
        }
        break;

      case 'CognitiveOverload':
        recommendations.push('Take breaks and focus on familiar concepts');
        if (contextSnapshot.digitalBodyLanguage.state === 'overwhelmed') {
          recommendations.push('Consider taking a longer break to recover');
        }
        break;
    }

    // Environmental recommendations
    if (contextSnapshot.overallOptimality < 0.6) {
      recommendations.push(
        `Environment optimality: ${(
          contextSnapshot.overallOptimality * 100
        ).toFixed(0)}% - consider optimizing`,
      );
    }

    return recommendations;
  }, [auraState, contextSnapshot, viewMode]);

  // ====================  INITIALIZATION ====================

  // Progressive loading setup
  const loadingStages = useMemo(
    () => [
      {
        key: 'contextSensing',
        loader: () => Promise.resolve(contextSensorService.startMonitoring(1)),
        priority: 'critical' as const,
      },
      {
        key: 'neuralGraph',
        loader: () => Promise.resolve(generateNeuralGraph()),
        priority: 'critical' as const,
        dependencies: ['contextSensing'],
      },
      {
        key: 'cognitiveAura',
        loader: () => Promise.resolve(initializeCognitiveAuraEngine()),
        priority: 'important' as const,
        dependencies: ['neuralGraph'],
      },
      {
        key: 'physicsEngine',
        loader: () => Promise.resolve(initializePhysicsIntegration()),
        priority: 'important' as const,
      },
      {
        key: 'monitoring',
        loader: () => Promise.resolve(setupMonitoring()),
        priority: 'optional' as const,
      },
    ],
    [],
  );

  const progressiveLoading = useProgressiveLoading(loadingStages);

  useEffect(() => {
    let mounted = true;
    mountMarkRef.current = perf.startMark('NeuralMindMapScreen');
    const componentId = 'neural-mind-map-screen';

    // Register services with service manager
    serviceManager.registerService('mindMapGenerator', mindMapGenerator);
    serviceManager.registerService('CAE', CAE);
    serviceManager.registerService('contextSensor', contextSensorService);
    serviceManager.registerService('physicsEngine', PhysicsEngine);

    const initializeSystem = async () => {
      try {
        console.log('🚀 Initializing Neural Mind Map with optimizations...');

        // Use progressive loading
        await progressiveLoading.loadAll();

        if (mounted) {
          actions.setLoading({
            isGenerating: false,
            isContextSensing: false,
            isGeneratingAura: false,
            isForecasting: false,
            stage: 'Ready',
          });
        }

        console.log('✅ Neural Mind Map system initialized successfully');
      } catch (error) {
        if (mounted) {
          console.error('❌ System initialization failed:', error);
          actions.setError('Failed to initialize learning system');
          actions.setLoading({ stage: 'Error' });
        }
      }
    };

    initializeSystem();

    return () => {
      mounted = false;
      memoryManager.cleanup(componentId);
      backgroundProcessor.cleanup();
      serviceManager.cleanup();
      cleanup();
    };
  }, [
    actions,
    progressiveLoading,
    serviceManager,
    backgroundProcessor,
    memoryManager,
  ]);

  useEffect(() => {
    // mark ready when stage becomes 'Ready' and generation flags are false
    if (
      loadingState.stage === 'Ready' &&
      !loadingState.isGenerating &&
      !loadingState.isContextSensing &&
      mountMarkRef.current
    ) {
      try {
        perf.measureReady('NeuralMindMapScreen', mountMarkRef.current);
      } catch (e) {
        // guarded
      }
      mountMarkRef.current = null;
    }
  }, [loadingState]);

  // ====================  CORE METHODS ====================

  /**
   * Generate neural graph with  error handling
   */
  const generateNeuralGraph = useCallback(
    async (forceRefresh = false) => {
      try {
        actions.setLoading({ isGenerating: true });
        actions.setError(null);

        // Try to get from cache first
        const cacheKey = 'neural-graph-main';
        let graph: NeuralGraph | null = null;

        if (!forceRefresh) {
          graph = await cacheManager.get<NeuralGraph>(cacheKey);
        }

        if (!graph) {
          graph = await measureAsync('Neural Graph Generation', async () => {
            return await mindMapGenerator.generateNeuralGraph(forceRefresh);
          });

          // Cache the generated graph
          await cacheManager.set(cacheKey, graph, 'warm');
        }

        actions.setData({ neuralGraph: graph });

        // Integrate with physics engine
        if (graph && graph.nodes.length > 0) {
          const nodeData = graph.nodes.map((node) => {
            const id = String(node.id || '');
            const cognitiveUnit = _devRandom ? Math.random() : deterministicUnitValue(id, 'cog');
            const masteryUnit = _devRandom ? Math.random() : deterministicUnitValue(id, 'mastery');
            const cognitiveLoad = node.cognitiveLoad ?? cognitiveUnit;
            const masteryLevel = node.masteryLevel ?? masteryUnit;
            return {
              id: node.id,
              label: node.label,
              cognitiveLoad,
              masteryLevel,
              size: 12 + cognitiveLoad * 12,
            };
          });

          const linkData = graph.links.map((link) => ({
            source:
              typeof link.source === 'string' ? link.source : link.source.id,
            target:
              typeof link.target === 'string' ? link.target : link.target.id,
            strength: link.strength || 0.5,
            type: link.type || 'similarity',
          }));

          PhysicsEngine.setGraphData(nodeData, linkData);
        }

        console.log('🧠  Neural Graph Generated:', {
          nodes: graph.nodes.length,
          links: graph.links.length,
          health: graph.knowledgeHealth,
          clusters: graph.clusters?.length || 0,
          paths: graph.learningPaths?.length || 0,
        });
      } catch (error: unknown) {
        console.error('❌ Neural graph generation failed:', error);
        actions.setError(
          (error as Error)?.message || 'Failed to generate brain map',
        );

        Alert.alert(
          'Neural Map Error',
          'Failed to generate your brain map. The system will fall back to basic mode.',
          [
            {
              text: 'Go to Flashcards',
              onPress: () => onNavigate('flashcards'),
            },
            { text: 'Retry', onPress: () => generateNeuralGraph(true) },
            { text: 'Continue Basic', style: 'cancel' },
          ],
        );
      } finally {
        actions.setLoading({ isGenerating: false });
      }
    },
    [mindMapGenerator, onNavigate, PhysicsEngine, actions],
  );

  /**
   * Progressive forecasting implementation with staged loading
   */
  const performProgressiveForecasting = useCallback(async () => {
    try {
      console.log('🔮 Starting progressive forecasting...');

      // Stage 1: Short-term forecasting (30min)
      setForecastProgress({ currentStage: 'short', progress: 0 });
      setPerformanceMetrics((prev) => ({
        ...prev,
        forecastStartTime: Date.now(),
      }));

      const shortTermForecast = await CAE.getCapacityForecast('short');
      setForecastCache((prev) => ({
        ...prev,
        shortTerm: shortTermForecast,
        lastUpdated: Date.now(),
      }));
      setForecastStages((prev) => ({ ...prev, shortTerm: true }));
      setForecastProgress({ currentStage: 'short', progress: 100 });

      // Allow UI interaction with short-term data
      setLoadingState((prev) => ({
        ...prev,
        stage: 'Short-term forecast ready',
      }));

      // Stage 2: Medium-term forecasting (2-4h)
      setForecastProgress({ currentStage: 'medium', progress: 0 });
      await new Promise((resolve) => setTimeout(resolve, 100)); // Brief pause for UX

      const mediumTermForecast = await CAE.getCapacityForecast('medium');
      setForecastCache((prev) => ({ ...prev, mediumTerm: mediumTermForecast }));
      setForecastStages((prev) => ({ ...prev, mediumTerm: true }));
      setForecastProgress({ currentStage: 'medium', progress: 100 });

      setLoadingState((prev) => ({
        ...prev,
        stage: 'Medium-term forecast ready',
      }));

      // Stage 3: Long-term forecasting (24h)
      setForecastProgress({ currentStage: 'long', progress: 0 });
      await new Promise((resolve) => setTimeout(resolve, 100)); // Brief pause for UX

      const longTermForecast = await CAE.getCapacityForecast('long');
      setForecastCache((prev) => ({ ...prev, longTerm: longTermForecast }));
      setForecastStages((prev) => ({ ...prev, longTerm: true }));
      setForecastProgress({ currentStage: null, progress: 0 });

      const forecastEndTime = Date.now();
      setPerformanceMetrics((prev) => ({
        ...prev,
        totalLoadTime:
          forecastEndTime - (prev.forecastStartTime || forecastEndTime),
      }));

      console.log('✅ Progressive forecasting completed');
    } catch (error) {
      console.error('❌ Progressive forecasting failed:', error);
      setForecastProgress({ currentStage: null, progress: 0 });
    }
  }, [CAE]);

  /**
   * Initialize Cognitive Aura Engine 2.0 with progressive forecasting
   */
  const initializeCognitiveAuraEngine = useCallback(async () => {
    try {
      console.log('🔮 Initializing  Cognitive Aura Engine...');

      // Generate initial  aura state
      const initialAuraState = await CAE.getAuraState(true);
      setAuraState(initialAuraState);

      // Set up aura state listeners
      // register CAE handlers and keep refs for precise removal
      caeAuraUpdatedHandler.current = safeHandler((auraState: AuraState) => {
        console.log(
          `🧠  aura updated: ${auraState.context} (${(
            auraState.compositeCognitiveScore * 100
          ).toFixed(1)}%)`,
        );
        setAuraState(auraState);
        updateAdaptiveUI(auraState);
        triggerContextTransitionAnimation(auraState.context);

        // Track context switches
        setPerformanceTracking((prev) => ({
          ...prev,
          contextSwitchCount: prev.contextSwitchCount + 1,
        }));
      });

      caeContextChangeHandler.current = safeHandler((context: AuraContext) => {
        console.log(`🔄 Context changed to: ${context}`);
        updateViewModeForContext(context);
      });

      if (caeAuraUpdatedHandler.current)
        CAE.on('_aura_updated', caeAuraUpdatedHandler.current);
      if (caeContextChangeHandler.current)
        CAE.on('context_change', caeContextChangeHandler.current);

      // Set up context sensor listeners
      // context sensor handlers
      contextSensorContextUpdatedHandler.current = safeHandler(
        (snapshot: ContextSnapshot) => {
          setContextSnapshot(snapshot);
          updateEnvironmentalUI(snapshot);
        },
      );

      contextSensorDblUpdatedHandler.current = safeHandler(
        (dbl: DigitalBodyLanguage) => {
          updateDBLIndicators(dbl);
        },
      );

      if (contextSensorContextUpdatedHandler.current)
        contextSensorService.on(
          'context_updated',
          contextSensorContextUpdatedHandler.current,
        );
      if (contextSensorDblUpdatedHandler.current)
        contextSensorService.on(
          'dbl_updated',
          contextSensorDblUpdatedHandler.current,
        );

      // Start progressive forecasting
      await performProgressiveForecasting();

      console.log('✅  Cognitive Aura Engine initialized');
    } catch (error) {
      console.error('❌ CAE 2.0 initialization failed:', error);
      throw error;
    }
  }, [CAE, contextSensorService, performProgressiveForecasting]);

  /**
   * Initialize physics engine integration
   */
  const initializePhysicsIntegration = useCallback(async () => {
    try {
      console.log('🎯 Initializing  Physics Integration...');

      // Set up physics engine listeners
      // physics handlers stored in refs so we can remove them precisely
      physicsUpdatedHandler.current = safeHandler((update: any) => {
        try {
          console.log(
            `🎯 Physics updated: ${update.context} (Load: ${(
              update.cognitiveLoad * 100
            ).toFixed(1)}%)`,
          );
        } catch (e) {
          console.warn('Physics update handler failed:', e);
        }
      });

      physicsTransitionCompleteHandler.current = safeHandler((event: any) => {
        try {
          console.log(`✅ Physics transition complete: ${event.context}`);
        } catch (e) {
          console.warn('Physics transition handler failed:', e);
        }
      });

      physicsNodeInteractionHandler.current = safeHandler((event: any) => {
        try {
          handleNodeInteraction(event.nodeId, event.type);
        } catch (e) {
          console.warn('Physics node interaction handler failed:', e);
        }
      });

      try {
        if (physicsUpdatedHandler.current)
          PhysicsEngine.on('physics_updated', physicsUpdatedHandler.current);
        if (physicsTransitionCompleteHandler.current)
          PhysicsEngine.on(
            'transition_complete',
            physicsTransitionCompleteHandler.current,
          );
        if (physicsNodeInteractionHandler.current)
          PhysicsEngine.on(
            'node_interaction',
            physicsNodeInteractionHandler.current,
          );
      } catch (e) {
        console.warn('Failed to register PhysicsEngine handlers:', e);
      }

      // Start physics simulation
      PhysicsEngine.startSimulation();

      // Get initial physics state
      const initialPhysicsState = PhysicsEngine.getPhysicsState();
      setPhysicsState(initialPhysicsState);

      console.log('✅  Physics Integration initialized');
    } catch (error) {
      console.error('❌ Physics integration initialization failed:', error);
      throw error;
    }
  }, [PhysicsEngine]);

  /**
   * Set up  monitoring systems
   */
  const setupMonitoring = useCallback(() => {
    // Prevent duplicate monitoring setup
    if (monitoringStarted.current) {
      console.log('Monitoring already started - skipping duplicate setup');
      return;
    }
    monitoringStarted.current = true;
    //  aura state updates (every 90 seconds for balance)
    auraUpdateTimer.current = setInterval(async () => {
      try {
        const freshAuraState = await CAE.getAuraState();

        // Update physics engine with new aura state
        await PhysicsEngine.updateFromAuraState(freshAuraState);
      } catch (error) {
        console.warn('⚠️ Periodic aura update failed:', error);
      }
    }, 90000); // 90 seconds

    // Context monitoring (every 30 seconds for responsiveness)
    contextUpdateTimer.current = setInterval(async () => {
      try {
        const currentContext = await contextSensorService.getCurrentContext();

        // Check for significant context changes
        if (
          contextSnapshot &&
          isSignificantContextChange(currentContext, contextSnapshot)
        ) {
          console.log(
            '🌍 Significant context change detected, refreshing aura state',
          );
          await CAE.getAuraState(true);
        }
      } catch (error) {
        console.warn('⚠️ Context monitoring failed:', error);
      }
    }, 30000); // 30 seconds

    // Performance monitoring (every 10 seconds)
    performanceTimer.current = setInterval(() => {
      updatePerformanceMetrics();
    }, 10000); // 10 seconds

    console.log('📊  monitoring systems active');
  }, [CAE, contextSensorService, PhysicsEngine, contextSnapshot]);

  /**
   * Update adaptive UI based on aura state with performance optimization
   */
  const updateAdaptiveUI = useCallback(
    async (auraState: AuraState) => {
      const contextColor = COGNITIVE_CONTEXT_COLORS[auraState.context];

      // Get adaptive UI configuration
      const adaptiveConfig: AdaptiveUIConfig = {
        cognitiveLoad: auraState.compositeCognitiveScore,
        devicePerformance: 'medium', // Would be detected dynamically
        batteryLevel: 0.8, // Would be from device info
        networkQuality: 'good', // Would be from network monitoring
        memoryPressure: 'low', // Would be from memory monitoring
      };

      const uiConfig = adaptiveUIManager.updateConfiguration(adaptiveConfig);

      // Update adaptive color scheme
      const newColors = {
        primary: contextColor,
        secondary: adjustColorBrightness(contextColor, 20),
        background: adjustColorBrightness(contextColor, -80),
        text: adjustColorBrightness(contextColor, 40),
        accent: adjustColorBrightness(contextColor, 60),
      };

      actions.setSettings({ adaptiveColors: newColors });

      // Only animate if animations are enabled
      if (uiConfig.animationsEnabled) {
        // Update capacity forecast widget
        capacityForecastScale.value = withSpring(
          auraState.capacityForecast.mentalClarityScore > 0.7
            ? 1.1
            : auraState.capacityForecast.mentalClarityScore < 0.4
            ? 0.9
            : 1.0,
          { damping: 15, stiffness: 150 },
        );

        // Update micro-task pulse based on urgency
        const urgency =
          auraState.context === 'CognitiveOverload'
            ? 0.7
            : auraState.context === 'DeepFocus'
            ? 1.2
            : 1.0;

        microTaskPulse.value = withTiming(urgency, { duration: 1000 });
      }

      // Cache the UI state for quick restoration
      await cacheManager.set(
        `ui-state-${auraState.context}`,
        { colors: newColors, config: uiConfig },
        'hot',
      );
    },
    [
      capacityForecastScale,
      microTaskPulse,
      adaptiveUIManager,
      cacheManager,
      actions,
    ],
  );

  /**
   * Update environmental UI indicators
   */
  const updateEnvironmentalUI = useCallback((snapshot: ContextSnapshot) => {
    // Could update environment-specific UI elements
    // For now, just log the update
    console.log(
      `🌍 Environmental UI updated: ${
        snapshot.locationContext.environment
      }, Optimality: ${(snapshot.overallOptimality * 100).toFixed(1)}%`,
    );
  }, []);

  /**
   * Update digital body language indicators
   */
  const updateDBLIndicators = useCallback((dbl: DigitalBodyLanguage) => {
    // Could update DBL-specific UI indicators
    console.log(
      `📱 DBL updated: ${dbl.state}, Load: ${(
        dbl.cognitiveLoadIndicator * 100
      ).toFixed(1)}%`,
    );
  }, []);

  /**
   * Trigger context transition animation
   */
  const triggerContextTransitionAnimation = useCallback(
    (newContext: AuraContext) => {
      contextTransitionProgress.value = 0;
      contextTransitionProgress.value = withTiming(
        1,
        { duration: 2000 },
        (finished) => {
          if (finished) {
            runOnJS(() => {
              console.log(
                `✅ Context transition animation complete: ${newContext}`,
              );
            })();
          }
        },
      );
    },
    [contextTransitionProgress],
  );

  /**
   * Update view mode based on context
   */
  const updateViewModeForContext = useCallback(
    (context: AuraContext) => {
      // Auto-switch to optimal view mode for context if in adaptive mode
      if (viewMode === 'context_adaptive') {
        const optimalMode = getOptimalViewModeForContext(context);
        if (optimalMode && optimalMode !== viewMode) {
          console.log(
            `🔄 Auto-switching to optimal view mode: ${optimalMode} for ${context}`,
          );
          setViewMode(optimalMode);
        }
      }
    },
    [viewMode],
  );

  // ====================  INTERACTION HANDLERS ====================

  // Small helper: wrap event handlers to prevent unhandled exceptions from
  // propagating up (for example SQLITE_FULL when a background save fails).
  // This keeps the UI responsive and logs the error for diagnostics.
  const safeHandler = useCallback(
    <T extends (...args: any[]) => any>(fn: T): T => {
      return ((...args: any[]) => {
        try {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - forward to the original handler
          return fn(...args);
        } catch (e) {
          console.warn('Non-fatal handler error:', e);
          return undefined;
        }
      }) as unknown as T;
    },
    [],
  );

  /**
   * Handle  node interaction
   */
  const handleNodeInteraction = useCallback(
    (node: NeuralNode, interactionType: 'hover' | 'click' | 'drag') => {
      // Record interaction with context sensor
      contextSensorService.recordInteraction({
        timestamp: new Date(),
        type: interactionType === 'click' ? 'touch' : 'scroll',
        metadata: {
          nodeId: node.id,
          interactionType,
          currentContext: auraState?.context,
          cognitiveLoad: auraState?.compositeCognitiveScore,
        },
      });

      if (interactionType === 'click') {
        setSelectedNode(node);
        generateNodeDetail(node);
      }

      console.log(`🎯  node interaction: ${interactionType} on ${node.label}`);
    },
    [contextSensorService, auraState],
  );

  /**
   * Handle node press (wrapper for NeuralMindMap onNodePress)
   */
  const handleNodePress = useCallback(
    (node: NeuralNode) => {
      handleNodeInteraction(node, 'click');
    },
    [handleNodeInteraction],
  );

  /**
   * Generate  node detail with context awareness
   */
  const generateNodeDetail = useCallback(
    async (node: NeuralNode) => {
      try {
        setLoadingState((prev) => ({ ...prev, isCalculating: true }));

        const connections =
          neuralGraph?.links.filter(
            (link) => link.source === node.id || link.target === node.id,
          ).length || 0;

        // Calculate  metrics
        const cognitiveLoad = node.cognitiveLoad ?? 0.5;
        const masteryLevel = node.masteryLevel ?? 0.5;

        // Generate context relevance scores
        const creativeFlowExtra = _devRandom ? Math.random() * 0.3 : deterministicUnitValue(node.id, 'creativeFlow') * 0.3;
        const contextRelevance: Record<AuraContext, number> = {
          DeepFocus: Math.max(0, cognitiveLoad - masteryLevel + 0.5),
          CreativeFlow: Math.max(0, connections / 10 + creativeFlowExtra),
          FragmentedAttention: Math.max(0, masteryLevel - cognitiveLoad + 0.3),
          CognitiveOverload: Math.max(0, 1 - cognitiveLoad),
        };

        // Determine optimal contexts
        const optimalContexts = (
          Object.entries(contextRelevance) as [AuraContext, number][]
        )
          .sort(([, a], [, b]) => b - a)
          .slice(0, 2)
          .map(([context]) => context);

        // Generate context-aware recommendations
        const recommendations = generateContextAwareRecommendations(
          node,
          contextRelevance,
          auraState?.context,
        );
        const healthInsights = generateHealthInsights(node, contextRelevance);
        const pathRecommendations = generatePathRecommendations(
          node,
          neuralGraph,
        );

        const Detail: NodeDetail = {
          node,
          connections,
          centrality: connections / Math.max(1, neuralGraph?.nodes.length || 1),
          recommendations,
          networkPosition: determineNetworkPosition(node, connections),
          healthInsights,
          pathRecommendations,
          contextRelevance,
          cognitiveLoad,
          masteryLevel,
          optimalContexts,
        };

        setNodeDetail(Detail);
        setNodeDetailVisible(true);

        console.log(`📊  node detail generated for: ${node.label}`);
      } catch (error) {
        console.error('❌  node detail generation failed:', error);
      } finally {
        setLoadingState((prev) => ({ ...prev, isCalculating: false }));
      }
    },
    [neuralGraph, auraState],
  );

  /**
   * Handle  micro-task completion
   */
  const handleMicroTaskComplete = useCallback(
    async (completed: boolean, timeSpent: number, satisfaction: number = 3) => {
      try {
        if (!auraState) return;

        // Record  performance metrics
        const Metrics = {
          accuracy: completed ? 1.0 : 0.0,
          taskCompletion: completed ? 1.0 : 0.0,
          timeToComplete: timeSpent / 1000, // Convert to seconds
          userSatisfaction: satisfaction,
          contextRelevance:
            auraState.environmentalContext?.contextQualityScore ?? 0,
          environmentOptimality: auraState.environmentOptimality ?? 0,
          predictiveAccuracy: auraState.predictionAccuracy ?? 0,
          adaptationEffectiveness: auraState.biologicalAlignment ?? 0,
        };

        await CAE.recordPerformance(Metrics);

        // Update local tracking
        setPerformanceTracking((prev) => ({
          ...prev,
          taskStartTime: null,
          completionCount: completed
            ? prev.completionCount + 1
            : prev.completionCount,
          skipCount: !completed ? prev.skipCount + 1 : prev.skipCount,
          accuracyScore:
            prev.accuracyScore * 0.8 + (completed ? 1.0 : 0.0) * 0.2, // Moving average
        }));

        // Generate new aura state
        await CAE.refreshAuraState();

        console.log(
          `✅  micro-task ${completed ? 'completed' : 'skipped'} in ${(
            timeSpent / 1000
          ).toFixed(1)}s`,
        );
      } catch (error) {
        console.error('❌  micro-task completion handling failed:', error);
      }
    },
    [auraState, CAE],
  );

  /**
   * Handle view mode change with context awareness
   */
  const handleViewModeChange = useCallback(
    (newMode: string) => {
      const mode = _VIEW_MODES.find((m) => m.id === newMode);
      if (!mode) return;

      // Check if mode is optimized for current context
      if (auraState && !mode.contextOptimized.includes(auraState.context)) {
        Alert.alert(
          'View Mode Context Mismatch',
          `${mode.name} is not optimized for your current ${auraState.context} state. Continue anyway?`,
          [
            {
              text: 'Use Adaptive Mode',
              onPress: () => setViewMode('context_adaptive'),
            },
            { text: 'Continue', onPress: () => setViewMode(newMode) },
            { text: 'Cancel', style: 'cancel' },
          ],
        );
      } else {
        setViewMode(newMode);
      }

      console.log(`🔄 View mode changed to: ${newMode}`);
    },
    [auraState],
  );

  // ==================== UTILITY FUNCTIONS ====================

  const isSignificantContextChange = useCallback(
    (newSnapshot: ContextSnapshot, oldSnapshot: ContextSnapshot): boolean => {
      // Check for significant changes in context
      if (
        newSnapshot.digitalBodyLanguage.state !==
        oldSnapshot.digitalBodyLanguage.state
      )
        return true;

      const loadChange = Math.abs(
        newSnapshot.digitalBodyLanguage.cognitiveLoadIndicator -
          oldSnapshot.digitalBodyLanguage.cognitiveLoadIndicator,
      );
      if (loadChange > 0.3) return true;

      const optimalityChange = Math.abs(
        newSnapshot.overallOptimality - oldSnapshot.overallOptimality,
      );
      if (optimalityChange > 0.2) return true;

      return false;
    },
    [],
  );

  const adjustColorBrightness = useCallback(
    (color: string, amount: number): string => {
      // Simple color brightness adjustment
      const hex = color.replace('#', '');
      const r = Math.max(
        0,
        Math.min(255, parseInt(hex.substr(0, 2), 16) + amount),
      );
      const g = Math.max(
        0,
        Math.min(255, parseInt(hex.substr(2, 2), 16) + amount),
      );
      const b = Math.max(
        0,
        Math.min(255, parseInt(hex.substr(4, 2), 16) + amount),
      );

      return `#${r.toString(16).padStart(2, '0')}${g
        .toString(16)
        .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    },
    [],
  );

  const updatePerformanceMetrics = useCallback(() => {
    // Update performance metrics
    setPerformanceTracking((prev) => ({
      ...prev,
      // Add any periodic performance updates here
    }));
  }, []);

  const generateContextAwareRecommendations = useCallback(
    (
      node: NeuralNode,
      contextRelevance: Record<AuraContext, number>,
      currentContext?: AuraContext,
    ): string[] => {
      const recommendations: string[] = [];

      if (currentContext && contextRelevance[currentContext] > 0.7) {
        recommendations.push(`Excellent choice for ${currentContext} context`);
      } else if (currentContext && contextRelevance[currentContext] < 0.3) {
        const entries = Object.entries(contextRelevance).sort(
          ([, a], [, b]) => b - a,
        );
        let topContext: AuraContext = 'DeepFocus';
        if (entries && entries.length > 0 && entries[0] && entries[0][0]) {
          topContext = entries[0][0] as AuraContext;
        }
        recommendations.push(`Consider reviewing in ${topContext} context`);
      }

      // Add cognitive load recommendations
      if (node.cognitiveLoad && node.cognitiveLoad > 0.8) {
        recommendations.push('High complexity - break into smaller chunks');
      } else if (node.cognitiveLoad && node.cognitiveLoad < 0.3) {
        recommendations.push('Good for quick review sessions');
      }

      return recommendations;
    },
    [],
  );

  const generateHealthInsights = useCallback(
    (
      node: NeuralNode,
      contextRelevance: Record<AuraContext, number>,
    ): string[] => {
      const insights: string[] = [];

      if (node.masteryLevel && node.masteryLevel < 0.3) {
        insights.push('Needs reinforcement - schedule regular reviews');
      }

      if (contextRelevance.CognitiveOverload > 0.6) {
        insights.push(
          'May contribute to cognitive overload - approach carefully',
        );
      }

      return insights;
    },
    [],
  );

  const generatePathRecommendations = useCallback(
    (node: NeuralNode, graph: NeuralGraph | null): string[] => {
      const recommendations: string[] = [];

      if (!graph) return recommendations;

      // Find prerequisite nodes
      const prerequisites = graph.links
        .filter(
          (link) => link.target === node.id && link.type === 'prerequisite',
        )
        .map((link) => graph.nodes.find((n) => n.id === link.source))
        .filter(Boolean);

      if (prerequisites.length > 0) {
        recommendations.push(
          `Review prerequisites: ${prerequisites
            .map((p) => p?.label)
            .join(', ')}`,
        );
      }

      return recommendations;
    },
    [],
  );

  const determineNetworkPosition = useCallback(
    (
      node: NeuralNode,
      connections: number,
    ): 'central' | 'peripheral' | 'bridge' => {
      if (connections > 5) return 'central';
      if (connections < 2) return 'peripheral';
      return 'bridge';
    },
    [],
  );

  const cleanup = useCallback(() => {
    if (auraUpdateTimer.current) {
      clearInterval(auraUpdateTimer.current);
      auraUpdateTimer.current = null;
    }

    if (contextUpdateTimer.current) {
      clearInterval(contextUpdateTimer.current);
      contextUpdateTimer.current = null;
    }

    if (performanceTimer.current) {
      clearInterval(performanceTimer.current);
      performanceTimer.current = null;
    }

    // Dispose services - remove only handlers we registered
    try {
      if (caeAuraUpdatedHandler.current && typeof CAE.off === 'function') {
        CAE.off('_aura_updated', caeAuraUpdatedHandler.current);
      }
      if (caeContextChangeHandler.current && typeof CAE.off === 'function') {
        CAE.off('context_change', caeContextChangeHandler.current);
      }
    } catch (e) {
      // Avoid global listener removal from a component cleanup. Log the error so
      // the issue can be investigated—removing all listeners may disrupt other
      // parts of the app that rely on the same service.
      console.warn(
        'Failed to remove specific CAE listeners during cleanup:',
        e,
      );
    }

    // Ensure we stop the monitoring loop and native subscriptions the service started
    try {
      if (typeof contextSensorService.stopMonitoring === 'function') {
        contextSensorService.stopMonitoring();
      } else {
        if (
          contextSensorContextUpdatedHandler.current &&
          typeof contextSensorService.off === 'function'
        ) {
          contextSensorService.off(
            'context_updated',
            contextSensorContextUpdatedHandler.current,
          );
        }
        if (
          contextSensorDblUpdatedHandler.current &&
          typeof contextSensorService.off === 'function'
        ) {
          contextSensorService.off(
            'dbl_updated',
            contextSensorDblUpdatedHandler.current,
          );
        }
      }
    } catch (e) {
      // Don't call removeAllListeners() here; prefer stopMonitoring() which
      // should tear down native subscriptions. If off() isn't available the
      // handlers may not be removable here — log for investigation.
      console.warn(
        'Failed to remove specific ContextSensorService listeners during cleanup:',
        e,
      );
    }

    try {
      if (
        physicsUpdatedHandler.current &&
        typeof PhysicsEngine.off === 'function'
      ) {
        PhysicsEngine.off('physics_updated', physicsUpdatedHandler.current);
      }
      if (
        physicsTransitionCompleteHandler.current &&
        typeof PhysicsEngine.off === 'function'
      ) {
        PhysicsEngine.off(
          'transition_complete',
          physicsTransitionCompleteHandler.current,
        );
      }
      if (
        physicsNodeInteractionHandler.current &&
        typeof PhysicsEngine.off === 'function'
      ) {
        PhysicsEngine.off(
          'node_interaction',
          physicsNodeInteractionHandler.current,
        );
      }
    } catch (e) {
      // Avoid removing all listeners from the physics engine at component
      // teardown. Log the failure so it can be inspected; other modules may
      // still depend on the engine's events.
      console.warn(
        'Failed to remove specific PhysicsEngine listeners during cleanup:',
        e,
      );
    }

    console.log('🧹  Neural Mind Map cleanup complete');
    monitoringStarted.current = false;
  }, [CAE, contextSensorService, PhysicsEngine]);

  // ==================== ANIMATION STYLES ====================

  const contextTransitionStyle = useAnimatedStyle(() => ({
    // interpolate supports multiple stops but type definitions may expect tuples; cast to any to satisfy compiler
    opacity: (interpolate as any)(
      contextTransitionProgress.value,
      [0, 0.5, 1],
      [1, 0.7, 1],
    ),
    transform: [
      {
        scale: (interpolate as any)(
          contextTransitionProgress.value,
          [0, 0.5, 1],
          [1, 0.98, 1],
        ),
      },
    ],
  }));

  const capacityForecastStyle = useAnimatedStyle(() => ({
    transform: [{ scale: capacityForecastScale.value }],
  }));

  const microTaskStyle = useAnimatedStyle(() => ({
    transform: [{ scale: microTaskPulse.value }],
  }));

  const sidePanelAnimatedStyle = useAnimatedStyle(() => ({
    width: (interpolate as any)(sidePanelProgress.value, [0, 1], [64, 320]),
    // subtle fade for children when collapsing
    opacity: (interpolate as any)(
      sidePanelProgress.value,
      [0, 0.2, 1],
      [0.9, 0.98, 1],
    ),
  }));

  // Sync sidePanelProgress when state changes
  useEffect(() => {
    sidePanelProgress.value = withTiming(sidePanelCollapsed ? 0 : 1, {
      duration: 300,
    });
  }, [sidePanelCollapsed, sidePanelProgress]);

  // ==================== RENDER ====================

  // guard progress access - `loadingState.progress` may be optional in the
  // strict typing, so read via a local runtime-safe variable
  const _loadingProgress: number | undefined = (loadingState as any).progress;

  if (loadingState.isGenerating || loadingState.isContextSensing) {
    return (
      <ScreenContainer
        theme={theme}
        style={[styles.container, { backgroundColor: themeColors.background }]}
      >
        <StatusBar backgroundColor={contextColor} barStyle="light-content" />

        <View style={styles.loadingContainer}>
          <GradientFallback
            colors={[contextColor, adjustColorBrightness(contextColor, -20)]}
            style={styles.loadingGradient}
          >
            <ActivityIndicator size="large" color="white" />
            <Text style={[styles.loadingTitle, { color: 'white' }]}>
              Cognitive Aura Engine 2.0
            </Text>
            <Text
              style={[styles.loadingStage, { color: 'rgba(255,255,255,0.8)' }]}
            >
              {loadingState.stage}
            </Text>

            {_loadingProgress !== undefined && (
              <View style={styles.progressContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${_loadingProgress * 100}%` },
                  ]}
                />
              </View>
            )}
          </GradientFallback>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      theme={theme}
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      <StatusBar backgroundColor={contextColor} barStyle="light-content" />

      {/*  Header */}
      <AppHeader
        title=" Neural Map"
        subtitle={auraState ? `${auraState.context} Context` : ''}
        theme={theme}
        onMenuPress={() => setMenuVisible(true)}
        backgroundColor={contextColor}
        rightActions={[
          {
            icon: 'brain',
            onPress: () => setContextInsightsVisible(true),
            badge: auraState?.anticipatedStateChanges.length || 0,
          },
          {
            icon: 'tune',
            onPress: () => setAdaptiveControlsVisible(true),
          },
        ]}
      />

      {/* Context Transition Overlay */}
      <Animated.View
        style={[styles.contextTransitionOverlay, contextTransitionStyle]}
      >
        {/*  View Mode Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.viewModeSelector}
          contentContainerStyle={styles.viewModeSelectorContent}
        >
          {_VIEW_MODES.map((mode) => {
            const isActive = viewMode === mode.id;
            const isOptimized = auraState
              ? mode.contextOptimized.includes(auraState.context)
              : false;

            return (
              <TouchableOpacity
                key={mode.id}
                style={[
                  styles.viewModeButton,
                  {
                    backgroundColor: isActive
                      ? adaptiveColors?.primary || mode.color
                      : themeColors.surface,
                    borderColor: isOptimized
                      ? adaptiveColors?.accent || mode.color
                      : 'transparent',
                    borderWidth: isOptimized ? 2 : 0,
                  },
                ]}
                onPress={() => handleViewModeChange(mode.id)}
              >
                <Text style={[styles.viewModeIcon]}>{mode.icon}</Text>
                <Text
                  style={[
                    styles.viewModeText,
                    { color: isActive ? 'white' : themeColors.textSecondary },
                  ]}
                >
                  {mode.shortName}
                </Text>
                {mode.ai && (
                  <View
                    style={[
                      styles.aiBadge,
                      { backgroundColor: adaptiveColors?.accent || '#8B5CF6' },
                    ]}
                  >
                    <Text style={styles.aiText}>AI</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Main Content Area - simplified 2-panel layout: Map + Collapsible Side Panel */}
        <View style={styles.mainContent}>
          {/* Map Panel (center) */}
          <View style={styles.centerPanel}>
            <GlassCard theme={theme} style={styles.neuralMapContainer}>
              {error ? (
                <View style={styles.errorContainer}>
                  <Icon
                    name="alert-circle"
                    size={48}
                    color={themeColors.error}
                  />
                  <Text
                    style={[styles.errorTitle, { color: themeColors.error }]}
                  >
                    Neural Map Error
                  </Text>
                  <Text
                    style={[
                      styles.errorMessage,
                      { color: themeColors.textSecondary },
                    ]}
                  >
                    {error}
                  </Text>
                  <Button
                    title="Retry"
                    onPress={() => generateNeuralGraph(true)}
                    theme={theme}
                    style={[
                      styles.retryButton,
                      { backgroundColor: contextColor },
                    ]}
                  />
                </View>
              ) : neuralGraph ? (
                <>
                  <AnyNeuralMindMap
                    graph={neuralGraph}
                    viewMode={
                      effectiveViewMode as
                        | 'network'
                        | 'clusters'
                        | 'paths'
                        | 'health'
                    }
                    onNodePress={handleNodePress}
                    theme={theme}
                    cognitiveLoad={auraState?.compositeCognitiveScore || 0.5}
                    focusNodeId={focusState.focusNodeId}
                    renderData={getOptimizedRenderData(neuralGraph, 1.0) as any}
                    onViewportChange={updateViewport}
                  />

                  {/* Context Overlay */}
                  {auraState && (
                    <View style={[styles.contextOverlay]}>
                      <GradientFallback
                        colors={[`${contextColor}20`, 'transparent']}
                        style={styles.contextGradient}
                      >
                        <Text
                          style={[styles.contextLabel, { color: contextColor }]}
                        >
                          {auraState.context}
                        </Text>
                        <Text
                          style={[
                            styles.contextScore,
                            { color: themeColors.textSecondary },
                          ]}
                        >
                          {(auraState.compositeCognitiveScore * 100).toFixed(0)}
                          % Cognitive Score
                        </Text>
                      </GradientFallback>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.emptyMapContainer}>
                  <Icon
                    name="brain"
                    size={64}
                    color={themeColors.textSecondary}
                  />
                  <Text
                    style={[styles.emptyMapTitle, { color: themeColors.text }]}
                  >
                    No Neural Data
                  </Text>
                  <Text
                    style={[
                      styles.emptyMapMessage,
                      { color: themeColors.textSecondary },
                    ]}
                  >
                    Add some learning content to generate your brain map
                  </Text>
                  <Button
                    title="Add Content"
                    onPress={() => onNavigate('flashcards')}
                    theme={theme}
                    style={[
                      styles.addContentButton,
                      { backgroundColor: contextColor },
                    ]}
                  />
                </View>
              )}
            </GlassCard>
          </View>

          {/* Bottom Tab Bar - replaces sidebar for clearer mobile UX */}
          <View style={styles.bottomTabWrapper}>
            {/* Floating content panel shown above the tab bar when a tab is active */}
            {/** Show small panel with content based on active tab **/}
            <View style={styles.bottomPanelContainer}>
              {/** Determine which content to render based on active tab **/}
              {bottomActiveTab === 'controls' && (
                <View>
                  {capacityForecastVisible && auraState && (
                    <CapacityForecastWidget
                      theme={theme}
                      contextColor={contextColor}
                      onToggleVisibility={() =>
                        setCapacityForecastVisible(!capacityForecastVisible)
                      }
                    />
                  )}
                </View>
              )}

              {bottomActiveTab === 'insights' && (
                <GlassCard theme={theme} style={styles.insightsCard}>
                  <Text style={[styles.insightsTitle, { color: contextColor }]}>
                    Context Insights
                  </Text>
                  {adaptiveRecommendations.slice(0, 5).map((rec, i) => (
                    <Text
                      key={i}
                      style={[
                        styles.insightText,
                        { color: themeColors.textSecondary },
                      ]}
                    >
                      • {rec}
                    </Text>
                  ))}
                </GlassCard>
              )}

              {bottomActiveTab === 'forecast' && (
                <GlassCard theme={theme} style={styles.metricsCard}>
                  <Text
                    style={[styles.metricsTitle, { color: themeColors.text }]}
                  >
                    Capacity Forecast
                  </Text>
                  {forecastCache.shortTerm ||
                  forecastCache.mediumTerm ||
                  forecastCache.longTerm ? (
                    <View>
                      <Text
                        style={[
                          styles.insightText,
                          { color: themeColors.textSecondary },
                        ]}
                      >
                        Short-term: {forecastCache.shortTerm ? 'Ready' : '—'}
                      </Text>
                      <Text
                        style={[
                          styles.insightText,
                          { color: themeColors.textSecondary },
                        ]}
                      >
                        Medium-term: {forecastCache.mediumTerm ? 'Ready' : '—'}
                      </Text>
                      <Text
                        style={[
                          styles.insightText,
                          { color: themeColors.textSecondary },
                        ]}
                      >
                        Long-term: {forecastCache.longTerm ? 'Ready' : '—'}
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={[
                        styles.insightText,
                        { color: themeColors.textSecondary },
                      ]}
                    >
                      Forecasts are being prepared — pull to refresh or wait a
                      moment.
                    </Text>
                  )}
                </GlassCard>
              )}

              {bottomActiveTab === 'microtask' &&
                microTaskVisible &&
                auraState && (
                  <Animated.View
                    style={[styles.microTaskContainer, microTaskStyle]}
                  >
                    <MicroTaskCard
                      auraState={auraState}
                      onTaskComplete={handleMicroTaskComplete}
                      onTaskSkip={() => handleMicroTaskComplete(false, 0, 2)}
                      onMinimizeToggle={() =>
                        setMicroTaskMinimized(!microTaskMinimized)
                      }
                      minimized={microTaskMinimized}
                      theme={theme}
                    />
                  </Animated.View>
                )}

              {bottomActiveTab === 'actions' && (
                <GlassCard theme={theme} style={styles.actionsCard}>
                  <Text
                    style={[styles.actionsTitle, { color: themeColors.text }]}
                  >
                    Quick Actions
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: `${contextColor}20` },
                    ]}
                    onPress={() => CAE.refreshAuraState()}
                  >
                    <Icon name="refresh" size={16} color={contextColor} />
                    <Text style={[styles.actionText, { color: contextColor }]}>
                      Refresh Aura
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: `${contextColor}20` },
                    ]}
                    onPress={() => generateNeuralGraph(true)}
                  >
                    <Icon name="brain" size={16} color={contextColor} />
                    <Text style={[styles.actionText, { color: contextColor }]}>
                      Rebuild Map
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: `${contextColor}20` },
                    ]}
                    onPress={() => setContextInsightsVisible(true)}
                  >
                    <Icon name="lightbulb" size={16} color={contextColor} />
                    <Text style={[styles.actionText, { color: contextColor }]}>
                      View Insights
                    </Text>
                  </TouchableOpacity>
                </GlassCard>
              )}
            </View>

            {/* Bottom Tab Bar */}
            <View style={styles.bottomTabBar}>
              <TouchableOpacity
                style={styles.tabButton}
                onPress={() => setBottomActiveTab('controls')}
              >
                <Icon
                  name="tune"
                  size={20}
                  color={
                    bottomActiveTab === 'controls'
                      ? contextColor
                      : themeColors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color:
                        bottomActiveTab === 'controls'
                          ? contextColor
                          : themeColors.textSecondary,
                    },
                  ]}
                >
                  Controls
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tabButton}
                onPress={() => setBottomActiveTab('insights')}
              >
                <Icon
                  name="lightbulb"
                  size={20}
                  color={
                    bottomActiveTab === 'insights'
                      ? contextColor
                      : themeColors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color:
                        bottomActiveTab === 'insights'
                          ? contextColor
                          : themeColors.textSecondary,
                    },
                  ]}
                >
                  Insights
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tabButton}
                onPress={() => setBottomActiveTab('forecast')}
              >
                <Icon
                  name="clock"
                  size={20}
                  color={
                    bottomActiveTab === 'forecast'
                      ? contextColor
                      : themeColors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color:
                        bottomActiveTab === 'forecast'
                          ? contextColor
                          : themeColors.textSecondary,
                    },
                  ]}
                >
                  Forecast
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tabButton}
                onPress={() => setBottomActiveTab('microtask')}
              >
                <Icon
                  name="format-list-checks"
                  size={20}
                  color={
                    bottomActiveTab === 'microtask'
                      ? contextColor
                      : themeColors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color:
                        bottomActiveTab === 'microtask'
                          ? contextColor
                          : themeColors.textSecondary,
                    },
                  ]}
                >
                  Microtask
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tabButton}
                onPress={() => setBottomActiveTab('actions')}
              >
                <Icon
                  name="dots-horizontal"
                  size={20}
                  color={
                    bottomActiveTab === 'actions'
                      ? contextColor
                      : themeColors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color:
                        bottomActiveTab === 'actions'
                          ? contextColor
                          : themeColors.textSecondary,
                    },
                  ]}
                >
                  Actions
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Bottom sheet modal for small screens */}
      <Modal
        visible={showBottomSheet}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBottomSheet(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setShowBottomSheet(false)}
        >
          <Animated.View
            style={[
              styles.bottomSheet,
              { backgroundColor: themeColors.surface || '#fff' },
            ]}
          >
            <View style={styles.bottomSheetHandle} />

            {/* View Mode Selector inside bottom sheet */}
            <View style={styles.bottomSheetContent}>
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                View Modes
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: spacing.sm }}
              >
                {_VIEW_MODES.map((mode) => {
                  const isActive = viewMode === mode.id;
                  return (
                    <TouchableOpacity
                      key={mode.id}
                      style={[
                        styles.viewModeButton,
                        { marginRight: spacing.sm },
                        isActive && { backgroundColor: mode.color + '20' },
                      ]}
                      onPress={() => {
                        handleViewModeChange(mode.id);
                        setShowBottomSheet(false);
                      }}
                    >
                      <Text style={styles.viewModeIcon}>{mode.icon}</Text>
                      <Text
                        style={[
                          styles.viewModeText,
                          { color: isActive ? mode.color : themeColors.text },
                        ]}
                      >
                        {mode.shortName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Quick actions */}
              <View style={{ marginTop: spacing.md }}>
                <Text
                  style={[styles.sectionTitle, { color: themeColors.text }]}
                >
                  Quick Actions
                </Text>
                <TouchableOpacity
                  style={[styles.actionButton, { marginTop: spacing.sm }]}
                  onPress={() => {
                    CAE.refreshAuraState();
                    setShowBottomSheet(false);
                  }}
                >
                  <Icon name="refresh" size={18} color={contextColor} />
                  <Text style={[styles.actionText, { color: contextColor }]}>
                    Refresh Aura
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { marginTop: spacing.xs }]}
                  onPress={() => {
                    generateNeuralGraph(true);
                    setShowBottomSheet(false);
                  }}
                >
                  <Icon name="brain" size={18} color={contextColor} />
                  <Text style={[styles.actionText, { color: contextColor }]}>
                    Rebuild Map
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { marginTop: spacing.xs }]}
                  onPress={() => {
                    setContextInsightsVisible(true);
                    setShowBottomSheet(false);
                  }}
                >
                  <Icon name="lightbulb" size={18} color={contextColor} />
                  <Text style={[styles.actionText, { color: contextColor }]}>
                    View Insights
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/*  Node Detail Modal */}
      <Modal
        visible={nodeDetailVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setNodeDetailVisible(false)}
      >
        {nodeDetail && (
          <View style={styles.modalOverlay}>
            <GlassCard
              theme={theme}
              variant="modal"
              style={styles.nodeDetailModal}
            >
              <View
                style={[
                  styles.nodeDetailHeader,
                  { borderBottomColor: contextColor },
                ]}
              >
                <Text
                  style={[styles.nodeDetailTitle, { color: themeColors.text }]}
                >
                  {nodeDetail.node.label}
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setNodeDetailVisible(false)}
                >
                  <Icon
                    name="close"
                    size={24}
                    color={themeColors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.nodeDetailContent}>
                {/* Context Relevance */}
                <View style={styles.contextRelevanceSection}>
                  <Text
                    style={[styles.sectionTitle, { color: themeColors.text }]}
                  >
                    Context Relevance
                  </Text>
                  {Object.entries(nodeDetail.contextRelevance).map(
                    ([context, relevanceRaw]: [string, unknown]) => {
                      const ctx = context as AuraContext;
                      const relevance =
                        typeof relevanceRaw === 'number'
                          ? relevanceRaw
                          : Number(relevanceRaw) || 0;
                      return (
                        <View key={ctx} style={styles.relevanceRow}>
                          <Text
                            style={[
                              styles.contextName,
                              { color: COGNITIVE_CONTEXT_COLORS[ctx] },
                            ]}
                          >
                            {ctx}
                          </Text>
                          <View style={styles.relevanceBar}>
                            <View
                              style={[
                                styles.relevanceFill,
                                {
                                  width: `${relevance * 100}%`,
                                  backgroundColor:
                                    COGNITIVE_CONTEXT_COLORS[ctx],
                                },
                              ]}
                            />
                          </View>
                          <Text
                            style={[
                              styles.relevanceScore,
                              { color: themeColors.textSecondary },
                            ]}
                          >
                            {(relevance * 100).toFixed(0)}%
                          </Text>
                        </View>
                      );
                    },
                  )}
                </View>

                {/* Metrics */}
                <View style={styles.metricsSection}>
                  <Text
                    style={[styles.sectionTitle, { color: themeColors.text }]}
                  >
                    Metrics
                  </Text>
                  <View style={styles.metricsGrid}>
                    <View style={styles.metricBox}>
                      <Text
                        style={[styles.metricBoxValue, { color: contextColor }]}
                      >
                        {(nodeDetail.cognitiveLoad * 100).toFixed(0)}%
                      </Text>
                      <Text
                        style={[
                          styles.metricBoxLabel,
                          { color: themeColors.textSecondary },
                        ]}
                      >
                        Cognitive Load
                      </Text>
                    </View>
                    <View style={styles.metricBox}>
                      <Text
                        style={[styles.metricBoxValue, { color: contextColor }]}
                      >
                        {(nodeDetail.masteryLevel * 100).toFixed(0)}%
                      </Text>
                      <Text
                        style={[
                          styles.metricBoxLabel,
                          { color: themeColors.textSecondary },
                        ]}
                      >
                        Mastery
                      </Text>
                    </View>
                    <View style={styles.metricBox}>
                      <Text
                        style={[styles.metricBoxValue, { color: contextColor }]}
                      >
                        {nodeDetail.connections}
                      </Text>
                      <Text
                        style={[
                          styles.metricBoxLabel,
                          { color: themeColors.textSecondary },
                        ]}
                      >
                        Connections
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Recommendations */}
                <View style={styles.recommendationsSection}>
                  <Text
                    style={[styles.sectionTitle, { color: themeColors.text }]}
                  >
                    Recommendations
                  </Text>
                  {nodeDetail.recommendations.map(
                    (rec: string, index: number) => (
                      <Text
                        key={index}
                        style={[
                          styles.recommendationText,
                          { color: themeColors.textSecondary },
                        ]}
                      >
                        • {rec}
                      </Text>
                    ),
                  )}
                </View>

                {/* Optimal Contexts */}
                <View style={styles.optimalContextsSection}>
                  <Text
                    style={[styles.sectionTitle, { color: themeColors.text }]}
                  >
                    Optimal Contexts
                  </Text>
                  <View style={styles.contextChips}>
                    {nodeDetail.optimalContexts.map((context: AuraContext) => (
                      <View
                        key={context}
                        style={[
                          styles.contextChip,
                          {
                            backgroundColor: `${
                              COGNITIVE_CONTEXT_COLORS[context as AuraContext]
                            }20`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.contextChipText,
                            {
                              color:
                                COGNITIVE_CONTEXT_COLORS[
                                  context as AuraContext
                                ],
                            },
                          ]}
                        >
                          {context}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>
            </GlassCard>
          </View>
        )}
      </Modal>

      {/* Context Insights Modal */}
      <Modal
        visible={contextInsightsVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setContextInsightsVisible(false)}
      >
        <ContextInsightsPanel
          onClose={() => setContextInsightsVisible(false)}
          theme={theme}
          contextColor={contextColor}
        />
      </Modal>

      {/* Adaptive Controls Modal */}
      <Modal
        visible={adaptiveControlsVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAdaptiveControlsVisible(false)}
      >
        <AdaptiveControlPanel
          onClose={() => setAdaptiveControlsVisible(false)}
          theme={theme}
          contextColor={contextColor}
        />
      </Modal>

      {/* Hamburger Menu */}
      <HamburgerMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={onNavigate}
        currentScreen="neural-mind-map"
        theme={theme}
      />

      {/* Mini Player */}
      <MiniPlayer theme={theme} />
    </ScreenContainer>
  );
};

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingGradient: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    minWidth: 280,
  },
  loadingTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  loadingStage: {
    fontSize: typography.sizes.md,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  progressContainer: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 2,
  },

  // Context transition
  contextTransitionOverlay: {
    flex: 1,
  },

  // View mode selector
  viewModeSelector: {
    maxHeight: 96,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxl || spacing.lg + spacing.xs, // keep selector below floating header
    zIndex: 10,
  },
  viewModeSelectorContent: {
    paddingVertical: spacing.sm,
  },
  viewModeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    minWidth: 80,
    alignItems: 'center',
    position: 'relative',
  },
  viewModeIcon: {
    fontSize: typography.sizes.lg,
    marginBottom: spacing.xs,
  },
  viewModeText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  aiBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  aiText: {
    color: 'white',
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },

  // Main content layout
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
    paddingTop: spacing.xl, // ensure content sits below header
  },

  centerPanel: {
    flex: 1,
    minWidth: 0,
  },

  sidePanel: {
    width: 320,
    gap: spacing.md,
    backgroundColor: 'transparent',
    padding: spacing.xs,
  },

  sidePanelCollapsed: {
    width: 64,
    paddingHorizontal: spacing.xs,
  },

  // Neural map
  neuralMapContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },

  contextOverlay: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
  },

  contextGradient: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },

  contextLabel: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },

  contextScore: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },

  // Error states
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginTop: spacing.md,
  },
  errorMessage: {
    fontSize: typography.sizes.md,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },

  emptyMapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyMapTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginTop: spacing.md,
  },
  emptyMapMessage: {
    fontSize: typography.sizes.md,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  addContentButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },

  // Widgets and cards
  capacityForecastContainer: {
    // Animated container for capacity forecast
  },

  insightsCard: {
    padding: spacing.md,
    borderLeftWidth: 4,
  },
  insightsTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
  },
  insightText: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },

  metricsCard: {
    padding: spacing.md,
  },
  metricsTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  metricLabel: {
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },

  // Micro task
  microTaskContainer: {
    // Animated container for micro task
  },

  // Actions
  actionsCard: {
    padding: spacing.md,
  },
  actionsTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  actionText: {
    fontSize: typography.sizes.sm,
    marginLeft: spacing.sm,
    fontWeight: typography.weights.medium,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },

  nodeDetailModal: {
    maxWidth: 500,
    maxHeight: '80%',
    minHeight: 400,
    width: '100%',
  },

  nodeDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },

  nodeDetailTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    flex: 1,
  },

  closeButton: {
    padding: spacing.sm,
  },

  nodeDetailContent: {
    flex: 1,
    padding: spacing.lg,
  },

  // Node detail sections
  contextRelevanceSection: {
    marginBottom: spacing.lg,
  },

  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
  },

  relevanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  contextName: {
    width: 120,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },

  relevanceBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },

  relevanceFill: {
    height: '100%',
    borderRadius: 4,
  },

  relevanceScore: {
    width: 40,
    fontSize: typography.sizes.xs,
    textAlign: 'right',
  },

  metricsSection: {
    marginBottom: spacing.lg,
  },

  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  metricBox: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.xs,
  },

  metricBoxValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },

  metricBoxLabel: {
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
    textAlign: 'center',
  },

  recommendationsSection: {
    marginBottom: spacing.lg,
  },

  recommendationText: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },

  optimalContextsSection: {
    marginBottom: spacing.lg,
  },

  contextChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  contextChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },

  contextChipText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  // Bottom sheet styles
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.md,
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  bottomSheetHandle: {
    width: 40,
    height: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  bottomSheetContent: {
    paddingBottom: spacing.lg,
  },
  // Bottom tab components
  bottomTabWrapper: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.md,
    alignItems: 'center',
  },
  bottomPanelContainer: {
    marginBottom: spacing.sm,
    width: '100%',
  },
  bottomTabBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    width: '100%',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  tabLabel: {
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },
});

export default NeuralMindMapScreen;

// // Add these imports to your existing NeuralMindMapScreen.tsx
// import React, { useState, useEffect, useCallback, useMemo } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Dimensions,
//   Alert,
//   Modal,
//   ScrollView,
//   TouchableOpacity,
//   ActivityIndicator,
//   RefreshControl,
//   SafeAreaView,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// import {
//   AppHeader,
//   HamburgerMenu,
// } from '../../components/navigation/Navigation';
// import {
//   GlassCard,
//   Button,
//   ScreenContainer,
// } from '../../components/GlassComponents';
// import { NeuralMindMap } from '../../components/ai/NeuralCanvas';
// import { MiniPlayer } from '../../components/MiniPlayerComponent';
// import {
//   colors,
//   spacing,
//   typography,
//   borderRadius,
//   shadows,
// } from '../../theme/colors';
// import { ThemeType } from '../../theme/colors';
// import {
//   MindMapGenerator,
//   NeuralGraph,
//   NeuralNode,
// } from '../../services/learning/MindMapGeneratorService';
// HybridStorageService references removed — use StorageService facade instead
// import { useFocus } from '../../contexts/FocusContext';
// import { useSoundscape } from '../../contexts/SoundscapeContext';
// import { SoundscapeType } from '../../services/learning/CognitiveSoundscapeEngine';
// import CrossModuleBridgeService from '../../services/integrations/CrossModuleBridgeService';
// import { CircadianIntelligenceService } from '../../services/health/CircadianIntelligenceService';

// interface NeuralMindMapScreenProps {
//   theme: ThemeType;
//   onNavigate: (screen: string) => void;
//   // Phase 5: Focus lock prop
//   focusNodeId?: string | null;
// }

// /**
//  * Phase 3:  ViewMode Interface with Health Analytics
//  */
// interface ViewMode {
//   id: 'network' | 'clusters' | 'paths' | 'health';
//   name: string;
//   description: string;
//   icon: string;
//   color: string; // Added for visual distinction
//   shortName: string; // For compact display
// }

// interface NodeDetail {
//   node: NeuralNode;
//   connections: number;
//   centrality: number;
//   recommendations: string[];
//   networkPosition: 'central' | 'peripheral' | 'bridge';
//   healthInsights?: string[]; // Phase 3 addition
//   pathRecommendations?: string[]; // Phase 3 addition
// }

// interface LoadingState {
//   isGenerating: boolean;
//   isCalculating: boolean;
//   isRefreshing: boolean;
//   progress?: number;
// }

// interface ScreenContainerProps {
//   children: React.ReactNode;
//   theme: ThemeType;
//   style?: any;
//   gradient?: boolean;
// }

// /**
//  * Phase 3:  VIEW_MODES with Color Coding and Analytics
//  */
// const VIEW_MODES: ViewMode[] = [
//   {
//     id: 'network',
//     name: 'Neural Network',
//     shortName: 'Network',
//     description: 'Full brain-like visualization of all connections',
//     icon: '🧠',
//     color: '#6366F1', // Indigo for network view
//   },
//   {
//     id: 'health',
//     name: 'Cognitive Health',
//     shortName: 'Health',
//     description: 'Highlight weak areas needing immediate attention',
//     icon: '❤️‍🩹',
//     color: '#EF4444', // Red for health urgency
//   },
//   {
//     id: 'clusters',
//     name: 'Knowledge Clusters',
//     shortName: 'Clusters',
//     description: 'Group related concepts by knowledge domain',
//     icon: '🔗',
//     color: '#10B981', // Green for organized clusters
//   },
//   {
//     id: 'paths',
//     name: 'Learning Paths',
//     shortName: 'Paths',
//     description: 'Show optimal learning sequences and prerequisites',
//     icon: '🛤️',
//     color: '#F59E0B', // Amber for learning paths
//   },
// ];

// const COGNITIVE_LOAD_THRESHOLDS = {
//   LOW: 0.3,
//   MODERATE: 0.6,
//   HIGH: 0.8,
// } as const;

// export const NeuralMindMapScreen: React.FC<NeuralMindMapScreenProps> = ({
//   theme,
//   onNavigate,
//   focusNodeId,
// }) => {
//   const [menuVisible, setMenuVisible] = useState(false);
//   const [loadingState, setLoadingState] = useState<LoadingState>({
//     isGenerating: true,
//     isCalculating: false,
//     isRefreshing: false,
//   });
//   const [neuralGraph, setNeuralGraph] = useState<NeuralGraph | null>(null);
//   const [viewMode, setViewMode] = useState<ViewMode['id']>('network');
//   const [selectedNode, setSelectedNode] = useState<NeuralNode | null>(null);
//   const [nodeDetailVisible, setNodeDetailVisible] = useState(false);
//   const [nodeDetail, setNodeDetail] = useState<NodeDetail | null>(null);
//   const [cognitiveLoad, setCognitiveLoad] = useState(0.5);
//   const [cognitiveLoadFactor, setCognitiveLoadFactor] = useState(1.0);
//   const [adaptiveColors, setAdaptiveColors] = useState<{
//     primary: string;
//     background: string;
//     text: string;
//   } | null>(null);
//   const [error, setError] = useState<string | null>(null);

//   const { focusState, startFocusSession } = useFocus();

//   // Health integration services
//   const crossModuleBridge = CrossModuleBridgeService.getInstance();

//   const { width, height } = Dimensions.get('window');
//   const themeColors = colors[theme];

//   // Memoize services
//   const mindMapGenerator = useMemo(() => MindMapGenerator.getInstance(), []);
// (Previously used HybridStorageService.getInstance(); now replaced by StorageService.getInstance())

//   // Get current view mode configuration
//   const currentViewMode = useMemo(
//     () => VIEW_MODES.find((mode) => mode.id === viewMode) || VIEW_MODES[0],
//     [viewMode],
//   );

//   /**
//    * Phase 3 Enhancement: View Mode Analytics
//    * Calculate mode-specific metrics for display
//    */
//   const viewModeAnalytics = useMemo(() => {
//     if (!neuralGraph) return null;

//     const analytics = {
//       network: {
//         totalNodes: neuralGraph.nodes.length,
//         totalLinks: neuralGraph.links.length,
//         density: neuralGraph.metrics?.density || 0,
//         insight: `${neuralGraph.nodes.length} concepts connected`,
//       },
//       health: {
//         overallHealth: neuralGraph.healthMetrics?.overallHealth || 0,
//         criticalNodes: neuralGraph.healthMetrics?.criticalNodes.length || 0,
//         healthyNodes: neuralGraph.healthMetrics?.healthyNodes.length || 0,
//         insight: `${
//           neuralGraph.healthMetrics?.criticalNodes.length || 0
//         } critical concepts need attention`,
//       },
//       clusters: {
//         clusterCount: neuralGraph.clusters?.length || 0,
//         averageClusterHealth:
//           neuralGraph.clusters && neuralGraph.clusters.length > 0
//             ? neuralGraph.clusters.reduce((sum, c) => sum + c.health, 0) /
//               neuralGraph.clusters.length
//             : 0,
//         weakestCluster:
//           neuralGraph.clusters?.sort((a, b) => a.health - b.health)[0]?.name ||
//           'None',
//         insight: `${
//           neuralGraph.clusters?.length || 0
//         } knowledge domains identified`,
//       },
//       paths: {
//         pathCount: neuralGraph.learningPaths?.length || 0,
//         shortestPath:
//           neuralGraph.learningPaths && neuralGraph.learningPaths.length > 0
//             ? neuralGraph.learningPaths.reduce(
//                 (min, path) =>
//                   path.estimatedTimeMinutes < min
//                     ? path.estimatedTimeMinutes
//                     : min,
//                 Infinity,
//               )
//             : 0,
//         averagePathTime:
//           neuralGraph.learningPaths && neuralGraph.learningPaths.length > 0
//             ? neuralGraph.learningPaths.reduce(
//                 (sum, p) => sum + p.estimatedTimeMinutes,
//                 0,
//               ) / neuralGraph.learningPaths.length
//             : 0,
//         insight: `${
//           neuralGraph.learningPaths?.length || 0
//         } optimal learning sequences available`,
//       },
//     };

//     return analytics[viewMode] || analytics.network;
//   }, [neuralGraph, viewMode]);

//   // Initialize screen
//   useEffect(() => {
//     let mounted = true;
//     const initialize = async () => {
//       try {
//         await Promise.all([generateNeuralGraph(), calculateCognitiveLoad()]);
//       } catch (error) {
//         if (mounted) {
//           console.error('Initialization error:', error);
//           setError('Failed to initialize neural map');
//         }
//       }
//     };
//     initialize();
//     return () => {
//       mounted = false;
//     };
//   }, []);

//   // Health integration useEffect
//   useEffect(() => {
//     const updateHealthIntegration = async () => {
//       try {
//         // Get health metrics from cross-module bridge
//         const healthData = await crossModuleBridge.getHealthMetrics('currentUser');

//         if (healthData) {
//           // Calculate cognitive load factor based on health
//           const healthScore = healthData.overallHealth || 0.8;
//           const circadianPhase = healthData.circadianPhase || 'optimal';

//           // Adjust cognitive load factor based on health and circadian rhythm
//           let loadFactor = 1.0;
//           if (healthScore < 0.6) loadFactor = 0.7; // Reduce load for poor health
//           else if (healthScore > 0.9) loadFactor = 1.2; // Increase capacity for excellent health

//           if (circadianPhase === 'low') loadFactor *= 0.8;
//           else if (circadianPhase === 'peak') loadFactor *= 1.1;

//           setCognitiveLoadFactor(loadFactor);

//           // Set adaptive colors based on health state
//           const adaptiveColors = {
//             primary: healthScore < 0.5 ? '#EF4444' : healthScore < 0.7 ? '#F59E0B' : '#10B981',
//             background: healthScore < 0.5 ? '#FEF2F2' : healthScore < 0.7 ? '#FFFBEB' : '#F0FDF4',
//             text: healthScore < 0.5 ? '#991B1B' : healthScore < 0.7 ? '#92400E' : '#166534',
//           };
//           setAdaptiveColors(adaptiveColors);
//         }
//       } catch (error) {
//         console.error('Health integration error:', error);
//         // Fallback to default values
//         setCognitiveLoadFactor(1.0);
//         setAdaptiveColors(null);
//       }
//     };

//     updateHealthIntegration();

//     // Set up periodic health updates (every 5 minutes)
//     const healthInterval = setInterval(updateHealthIntegration, 5 * 60 * 1000);

//     return () => clearInterval(healthInterval);
//   }, [crossModuleBridge]);

//   /**
//    * Generate neural graph with  error handling
//    */
//   const generateNeuralGraph = useCallback(
//     async (forceRefresh = false) => {
//       try {
//         setLoadingState((prev) => ({ ...prev, isGenerating: true }));
//         setError(null);

//         const graph = await mindMapGenerator.generateNeuralGraph(forceRefresh);
//         setNeuralGraph(graph);

//         // Analytics event with Phase 3 metrics
//         console.log('🧠 Phase 3 Neural Graph Generated:', {
//           nodes: graph.nodes.length,
//           links: graph.links.length,
//           health: graph.knowledgeHealth,
//           clusters: graph.clusters?.length || 0,
//           paths: graph.learningPaths?.length || 0,
//         });
//       } catch (error: unknown) {
//         console.error('Error generating neural graph:', error);
//         setError((error as Error)?.message || 'Failed to generate brain map');
//         Alert.alert(
//           'Neural Map Error',
//           'Failed to generate your brain map. Make sure you have some learning data first.',
//           [
//             {
//               text: 'Go to Flashcards',
//               onPress: () => onNavigate('flashcards'),
//             },
//             { text: 'Try Again', onPress: () => generateNeuralGraph(true) },
//             { text: 'Cancel', style: 'cancel' },
//           ],
//         );
//       } finally {
//         setLoadingState((prev) => ({ ...prev, isGenerating: false }));
//       }
//     },
//     [mindMapGenerator, onNavigate],
//   );

//   /**
//    * Calculate current cognitive load
//    */
//   const calculateCognitiveLoad = useCallback(async () => {
//     try {
//       setLoadingState((prev) => ({ ...prev, isCalculating: true }));

//       const [flashcards, tasks, sessions] = await Promise.all([
//         storage.getFlashcards(),
//         storage.getTasks(),
//         storage.getStudySessions(),
//       ]);

//       const dueFlashcards = flashcards.filter(
//         (card) => new Date(card.nextReview) <= new Date(),
//       ).length;

//       const urgentTasks = tasks.filter(
//         (task) => !task.isCompleted && task.priority >= 3,
//       ).length;

//       const recentFailures = sessions
//         .filter((s) => s.type === 'flashcards' && !s.completed)
//         .filter(
//           (s) =>
//             s.startTime !== undefined &&
//             Date.now() - s.startTime.getTime() < 24 * 60 * 60 * 1000,
//         ).length;

//       const baseLoad = Math.min(
//         1,
//         (dueFlashcards * 0.1 + urgentTasks * 0.2) / 10,
//       );
//       const stressLoad = Math.min(0.3, recentFailures * 0.05);
//       const totalLoad = Math.min(1, baseLoad + stressLoad);

//       setCognitiveLoad(totalLoad);
//     } catch (error) {
//       console.error('Error calculating cognitive load:', error);
//       setCognitiveLoad(0.5);
//     } finally {
//       setLoadingState((prev) => ({ ...prev, isCalculating: false }));
//     }
//   }, [storage]);

//   /**
//    * Phase 3 Enhancement: Smart View Mode Switch
//    * Automatically suggest best view mode based on current state
//    */
//   const handleViewModeChange = useCallback((newMode: ViewMode['id']) => {
//     setViewMode(newMode);

//     // Analytics and smart suggestions
//     const suggestions: Record<ViewMode['id'], string> = {
//       health:
//         '🏥 Health Mode: Focusing on concepts that need immediate attention',
//       clusters: '🔗 Cluster Mode: Viewing knowledge organized by domain',
//       paths: '🛤️ Path Mode: Showing optimal learning sequences',
//       network: '🧠 Network Mode: Full neural visualization of all connections',
//     };

//     console.log('View Mode Changed:', suggestions[newMode]);

//     // Clear selected node when switching modes for better UX
//     setSelectedNode(null);
//   }, []);

//   /**
//    * Phase 3 Enhancement: Intelligent Node Press Handler
//    * Provides mode-specific node interaction
//    */
//   const handleNodePress = useCallback(
//     (node: NeuralNode) => {
//       setSelectedNode(node);
//       generateNodeDetail(node);

//       // Mode-specific analytics
//       console.log(`Node selected in ${viewMode} mode:`, {
//         id: node.id,
//         type: node.type,
//         health: node.healthScore,
//         mastery: node.masteryLevel,
//         isActive: node.isActive,
//         mode: viewMode,
//       });
//     },
//     [viewMode],
//   );

//   /**
//    *  node detail generation with mode-specific insights
//    */
//   const generateNodeDetail = useCallback(
//     (node: NeuralNode) => {
//       if (!neuralGraph) return;

//       try {
//         // Calculate network metrics
//         const connections = neuralGraph.links.filter(
//           (link) => link.source === node.id || link.target === node.id,
//         ).length;

//         const centrality =
//           connections / Math.max(1, neuralGraph.nodes.length - 1);

//         const networkPosition: NodeDetail['networkPosition'] =
//           centrality > 0.7
//             ? 'central'
//             : centrality > 0.3
//             ? 'bridge'
//             : 'peripheral';

//         // Generate  AI recommendations
//         const recommendations = generateRecommendations(
//           node,
//           networkPosition,
//         );

//         // Phase 3: Mode-specific insights
//         const healthInsights = generateHealthInsights(node);
//         const pathRecommendations = generatePathRecommendations(node);

//         setNodeDetail({
//           node,
//           connections,
//           centrality,
//           recommendations,
//           networkPosition,
//           healthInsights,
//           pathRecommendations,
//         });
//       } catch (error) {
//         console.error('Error generating node detail:', error);
//       }
//     },
//     [neuralGraph],
//   );

//   /**
//    * Phase 3: Generate health-specific insights
//    */
//   const generateHealthInsights = useCallback((node: NeuralNode): string[] => {
//     const insights: string[] = [];

//     if (node.healthScore !== undefined) {
//       if (node.healthScore < 0.3) {
//         insights.push('🚨 Critical health - requires immediate intervention');
//         insights.push(
//           '📈 Success rate below 30% - foundational issues detected',
//         );
//       } else if (node.healthScore < 0.7) {
//         insights.push('⚠️ Moderate health - regular maintenance needed');
//         insights.push('📊 Success rate 30-70% - room for improvement');
//       } else {
//         insights.push('✅ Excellent health - well-maintained concept');
//         insights.push('🌟 Success rate above 70% - strong foundation');
//       }
//     }

//     if (node.isActive) {
//       insights.push('🔥 Due for review - memory strength declining');
//     }

//     return insights;
//   }, []);

//   /**
//    * Phase 3: Generate path-specific recommendations
//    */
//   const generatePathRecommendations = useCallback(
//     (node: NeuralNode): string[] => {
//       if (!neuralGraph?.learningPaths) return [];

//       const recommendations: string[] = [];

//       // Find paths involving this node
//       const involvedPaths = neuralGraph.learningPaths.filter((path) =>
//         path.path.some((pathNode) => pathNode.id === node.id),
//       );

//       if (involvedPaths.length > 0) {
//         recommendations.push(
//           `🛤️ Part of ${involvedPaths.length} learning sequences`,
//         );

//         const shortestPath = involvedPaths.reduce((shortest, current) =>
//           current.estimatedTimeMinutes < shortest.estimatedTimeMinutes
//             ? current
//             : shortest,
//         );

//         recommendations.push(
//           `⏱️ Shortest path: ${shortestPath.estimatedTimeMinutes} minutes`,
//         );
//       }

//       return recommendations;
//     },
//     [neuralGraph],
//   );

//   /**
//    *  AI recommendations with Phase 3 features
//    */
//   const generateRecommendations = useCallback(
//     (node: NeuralNode, position: NodeDetail['networkPosition']): string[] => {
//       const recommendations: string[] = [];

//       // Health-based recommendations
//       if (node.healthScore !== undefined) {
//         if (node.healthScore < 0.3) {
//           recommendations.push(
//             '🎯 URGENT: Review this concept daily until mastery improves',
//           );
//           recommendations.push('🧩 Break into smaller, manageable pieces');
//         } else if (node.healthScore < 0.7) {
//           recommendations.push('📈 Regular practice will improve health score');
//           recommendations.push('🔗 Connect to related concepts you know well');
//         } else {
//           recommendations.push(
//             '🌟 Excellent health - use as foundation for new learning',
//           );
//         }
//       }

//       // Mastery-based recommendations
//       if (node.masteryLevel < 0.25) {
//         recommendations.push('📚 Focus on fundamentals and core understanding');
//       } else if (node.masteryLevel > 0.85) {
//         recommendations.push(
//           '🚀 Ready for advanced applications and teaching others',
//         );
//       }

//       // Network position insights
//       switch (position) {
//         case 'central':
//           recommendations.push(
//             '🌟 KEY CONCEPT: Mastering this unlocks many others',
//           );
//           break;
//         case 'bridge':
//           recommendations.push(
//             '🌉 CONNECTOR: Links different knowledge domains',
//           );
//           break;
//         case 'peripheral':
//           recommendations.push(
//             '🔍 ISOLATED: Create more connections to integrate',
//           );
//           break;
//       }

//       return recommendations.slice(0, 4); // Limit for focus
//     },
//     [],
//   );

//   /**
//    * Handle refresh with pull-to-refresh
//    */
//   const handleRefresh = useCallback(async () => {
//     setLoadingState((prev) => ({ ...prev, isRefreshing: true }));
//     try {
//       await Promise.all([generateNeuralGraph(true), calculateCognitiveLoad()]);
//       Alert.alert(
//         'Updated',
//         'Your neural map has been refreshed with the latest data.',
//       );
//     } catch (error) {
//       Alert.alert('Error', 'Failed to refresh neural map.');
//     } finally {
//       setLoadingState((prev) => ({ ...prev, isRefreshing: false }));
//     }
//   }, [generateNeuralGraph, calculateCognitiveLoad]);

//   /**
//    * Get cognitive load styling
//    */
//   const cognitiveLoadConfig = useMemo(() => {
//     const configs = {
//       low: {
//         color: themeColors.success,
//         label: 'Optimal Load',
//         description: 'Perfect for new concepts',
//       },
//       moderate: {
//         color: themeColors.primary,
//         label: 'Moderate Load',
//         description: 'Good challenge balance',
//       },
//       high: {
//         color: themeColors.warning,
//         label: 'High Load',
//         description: 'Reduce active items',
//       },
//       critical: {
//         color: themeColors.error,
//         label: 'Critical Load',
//         description: 'Focus on urgent only',
//       },
//     };

//     if (cognitiveLoad < COGNITIVE_LOAD_THRESHOLDS.LOW) return configs.low;
//     if (cognitiveLoad < COGNITIVE_LOAD_THRESHOLDS.MODERATE)
//       return configs.moderate;
//     if (cognitiveLoad < COGNITIVE_LOAD_THRESHOLDS.HIGH) return configs.high;
//     return configs.critical;
//   }, [cognitiveLoad, themeColors]);

//   /**
//    * Render loading state
//    */
//   const renderLoadingState = useCallback(
//     () => (
//       <ScreenContainer theme={theme} style={styles.loadingContainer}>
//         <AppHeader
//           title="Neural Map"
//           theme={theme}
//           onMenuPress={() => setMenuVisible(true)}
//           cognitiveLoad={cognitiveLoad}
//           floating={false}
//         />
//         <GlassCard theme={theme} style={styles.loadingCard}>
//           <Text style={[styles.loadingText, { color: themeColors.text }]}>
//             🧠 Analyzing your learning patterns...
//           </Text>
//           <Text
//             style={[
//               styles.loadingSubtext,
//               { color: themeColors.textSecondary },
//             ]}
//           >
//             Creating neural connections from your flashcards, tasks, and memory
//             palaces
//           </Text>
//           <ActivityIndicator size="large" color={themeColors.primary} />
//           {loadingState.progress && (
//             <View style={styles.progressContainer}>
//               <View
//                 style={[
//                   styles.progressBar,
//                   {
//                     backgroundColor: themeColors.primary,
//                     width: `${loadingState.progress}%`,
//                   },
//                 ]}
//               />
//             </View>
//           )}
//         </GlassCard>
//       </ScreenContainer>
//     ),
//     [theme, themeColors, cognitiveLoad, loadingState.progress],
//   );

//   /**
//    * Render empty state
//    */
//   const renderEmptyState = useCallback(
//     () => (
//       <ScreenContainer theme={theme} style={styles.emptyContainer}>
//         <AppHeader
//           title="Neural Map"
//           theme={theme}
//           onMenuPress={() => setMenuVisible(true)}
//           cognitiveLoad={cognitiveLoad}
//           floating={false}
//         />
//         <GlassCard theme={theme} style={styles.emptyCard}>
//           <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
//             🧠 Build Your Neural Map
//           </Text>
//           <Text
//             style={[styles.emptyText, { color: themeColors.textSecondary }]}
//           >
//             Start learning with flashcards, tasks, or memory palaces to see your
//             knowledge network come alive. Your brain map will show connections
//             between concepts and highlight areas that need attention.
//           </Text>
//           <View style={styles.emptyActions}>
//             <Button
//               title="Create Flashcards"
//               onPress={() => onNavigate('flashcards')}
//               variant="primary"
//               theme={theme}
//               style={styles.emptyButton}
//             />
//             <Button
//               title="Add Tasks"
//               onPress={() => onNavigate('tasks')}
//               variant="outline"
//               theme={theme}
//               style={styles.emptyButton}
//             />
//           </View>
//         </GlassCard>
//       </ScreenContainer>
//     ),
//     [theme, themeColors, cognitiveLoad, onNavigate],
//   );

//   // Loading state
//   if (loadingState.isGenerating && !neuralGraph) {
//     return renderLoadingState();
//   }

//   // Empty state
//   if (!neuralGraph || neuralGraph.nodes.length === 0) {
//     return renderEmptyState();
//   }

//   return (
//     <View style={{ flex: 1 }}>
//       <SafeAreaView style={{ backgroundColor: themeColors.background }}>
//         <AppHeader
//           title="Neural Map"
//           theme={theme}
//           onMenuPress={() => setMenuVisible(true)}
//           cognitiveLoad={cognitiveLoad}
//           rightComponent={
//             <TouchableOpacity onPress={handleRefresh}>
//               <Text style={[styles.refreshIcon, { color: themeColors.text }]}>
//                 {loadingState.isRefreshing ? '⟳' : '↻'}
//               </Text>
//             </TouchableOpacity>
//           }
//           floating={true}
//         />
//       </SafeAreaView>

//       <SafeAreaView style={{ flex: 1 }}>
//         <ScreenContainer theme={theme} style={styles.container}>
//           <View style={styles.mainContent}>
//             {/* Phase 3:  Status Dashboard with Mode Analytics */}
//             <View style={styles.topSection}>
//               <GlassCard theme={theme} style={styles.statusCard}>
//                 <View style={styles.statusRow}>
//                   <View style={styles.statusItem}>
//                     <Text
//                       style={[
//                         styles.statusLabel,
//                         { color: themeColors.textSecondary },
//                       ]}
//                     >
//                       Cognitive Load
//                     </Text>
//                     <Text
//                       style={[
//                         styles.statusValue,
//                         { color: cognitiveLoadConfig.color },
//                       ]}
//                     >
//                       {cognitiveLoadConfig.label}
//                     </Text>
//                     <Text
//                       style={[
//                         styles.statusSubText,
//                         { color: themeColors.textSecondary },
//                       ]}
//                     >
//                       {cognitiveLoadConfig.description}
//                     </Text>
//                   </View>

//                   <View style={styles.statusItem}>
//                     <Text
//                       style={[
//                         styles.statusLabel,
//                         { color: themeColors.textSecondary },
//                       ]}
//                     >
//                       Knowledge Health
//                     </Text>
//                     <Text
//                       style={[
//                         styles.statusValue,
//                         { color: themeColors.success },
//                       ]}
//                     >
//                       {neuralGraph.knowledgeHealth}%
//                     </Text>
//                     <Text
//                       style={[
//                         styles.statusSubText,
//                         { color: themeColors.textSecondary },
//                       ]}
//                     >
//                       Network connectivity score
//                     </Text>
//                   </View>

//                   <View style={styles.statusItem}>
//                     <Text
//                       style={[
//                         styles.statusLabel,
//                         { color: themeColors.textSecondary },
//                       ]}
//                     >
//                       Current View
//                     </Text>
//                     <Text
//                       style={[
//                         styles.statusValue,
//                         { color: currentViewMode.color },
//                       ]}
//                     >
//                       {currentViewMode.icon} {currentViewMode.shortName}
//                     </Text>
//                     <Text
//                       style={[
//                         styles.statusSubText,
//                         { color: themeColors.textSecondary },
//                       ]}
//                     >
//                       {viewModeAnalytics?.insight || 'No data'}
//                     </Text>
//                   </View>
//                 </View>
//               </GlassCard>

//               {/* Phase 3:  View Mode Selector with Visual Indicators */}
//               <GlassCard theme={theme} style={styles.viewModeSelector}>
//                 <ScrollView
//                   horizontal
//                   showsHorizontalScrollIndicator={false}
//                   contentContainerStyle={styles.viewModeContainer}
//                 >
//                   {VIEW_MODES.map((mode) => (
//                     <TouchableOpacity
//                       key={mode.id}
//                       onPress={() => handleViewModeChange(mode.id)}
//                       style={[
//                         styles.viewModeButton,
//                         viewMode === mode.id && [
//                           styles.viewModeButtonActive,
//                           {
//                             backgroundColor: mode.color + '20',
//                             borderColor: mode.color,
//                           },
//                         ],
//                         { borderColor: themeColors.border },
//                       ]}
//                     >
//                       <Text
//                         style={[
//                           styles.viewModeIcon,
//                           viewMode === mode.id && { color: mode.color },
//                         ]}
//                       >
//                         {mode.icon}
//                       </Text>
//                       <Text
//                         style={[
//                           styles.viewModeText,
//                           {
//                             color:
//                               viewMode === mode.id
//                                 ? mode.color
//                                 : themeColors.text,
//                           },
//                         ]}
//                         numberOfLines={1}
//                       >
//                         {mode.shortName}
//                       </Text>
//                       <Text
//                         style={[
//                           styles.viewModeDescription,
//                           {
//                             color:
//                               viewMode === mode.id
//                                 ? mode.color
//                                 : themeColors.textSecondary,
//                           },
//                         ]}
//                         numberOfLines={2}
//                       >
//                         {mode.description}
//                       </Text>
//                     </TouchableOpacity>
//                   ))}
//                 </ScrollView>
//               </GlassCard>
//             </View>

//             {/* Phase 3: Neural Canvas with View Mode Support */}
//             <View style={styles.canvasContainer}>
//               <NeuralMindMap
//                 graph={neuralGraph}
//                 theme={theme}
//                 onNodePress={handleNodePress}
//                 onNodeLongPress={(node) => {
//                   setSelectedNode(node);
//                   generateNodeDetail(node);
//                   setNodeDetailVisible(true);
//                   if (startFocusSession && node.id && node.label) {
//                     startFocusSession(node.id, node.label, 'node');
//                   }
//                 }}
//                 cognitiveLoad={cognitiveLoad}
//                 showControls={false}
//                 viewMode={viewMode} // Phase 3: Pass view mode to canvas
//                 focusNodeId={focusState.focusNodeId} // Phase 5: Pass focus node ID from context
//                 focusLock={!!focusState.focusNodeId} // Phase 5.5: Enable focus lock when focus is active
//               />
//             </View>

//             {/*  Selected Node Panel */}
//             {selectedNode && (
//               <GlassCard theme={theme} style={styles.selectedNodePanel}>
//                 <View style={styles.selectedNodeHeader}>
//                   <Text
//                     style={[
//                       styles.selectedNodeTitle,
//                       { color: themeColors.text },
//                     ]}
//                   >
//                     {selectedNode.label}
//                   </Text>
//                   <Text
//                     style={[
//                       styles.selectedNodeSubtitle,
//                       { color: themeColors.textSecondary },
//                     ]}
//                   >
//                     {selectedNode.type} • {selectedNode.category}
//                   </Text>
//                 </View>

//                 <TouchableOpacity
//                   onPress={() => setNodeDetailVisible(true)}
//                   style={[
//                     styles.detailButton,
//                     { backgroundColor: currentViewMode.color },
//                   ]}
//                 >
//                   <Text style={styles.detailButtonText}>Full Analysis</Text>
//                 </TouchableOpacity>

//                 <View style={styles.quickStats}>
//                   <View style={styles.statItem}>
//                     <Text
//                       style={[styles.statValue, { color: themeColors.success }]}
//                     >
//                       {Math.round(selectedNode.masteryLevel * 100)}%
//                     </Text>
//                     <Text
//                       style={[
//                         styles.statLabel,
//                         { color: themeColors.textSecondary },
//                       ]}
//                     >
//                       Mastered
//                     </Text>
//                   </View>
//                   <View style={styles.statItem}>
//                     <Text
//                       style={[styles.statValue, { color: themeColors.warning }]}
//                     >
//                       {Math.round(selectedNode.cognitiveLoad * 100)}%
//                     </Text>
//                     <Text
//                       style={[
//                         styles.statLabel,
//                         { color: themeColors.textSecondary },
//                       ]}
//                     >
//                       Load
//                     </Text>
//                   </View>
//                   <View style={styles.statItem}>
//                     <Text
//                       style={[styles.statValue, { color: themeColors.info }]}
//                     >
//                       {selectedNode.accessCount}
//                     </Text>
//                     <Text
//                       style={[
//                         styles.statLabel,
//                         { color: themeColors.textSecondary },
//                       ]}
//                     >
//                       Reviews
//                     </Text>
//                   </View>
//                   <View style={styles.statItem}>
//                     <Text
//                       style={[styles.statValue, { color: themeColors.primary }]}
//                     >
//                       {nodeDetail?.connections || 0}
//                     </Text>
//                     <Text
//                       style={[
//                         styles.statLabel,
//                         { color: themeColors.textSecondary },
//                       ]}
//                     >
//                       Links
//                     </Text>
//                   </View>
//                 </View>
//               </GlassCard>
//             )}
//           </View>

//           {/* MiniPlayer Component Integration */}
//           <MiniPlayer theme={theme} style={styles.miniPlayer} />

//           {/*  Node Detail Modal with Phase 3 Insights */}
//           <Modal
//             visible={nodeDetailVisible}
//             animationType="slide"
//             presentationStyle="pageSheet"
//             onRequestClose={() => setNodeDetailVisible(false)}
//           >
//             {nodeDetail && (
//               <ScreenContainer theme={theme}>
//                 <View style={styles.modalHeader}>
//                   <Text
//                     style={[styles.modalTitle, { color: themeColors.text }]}
//                   >
//                     🧠 Neural Analysis
//                   </Text>
//                   <TouchableOpacity
//                     onPress={() => setNodeDetailVisible(false)}
//                     style={styles.closeButton}
//                   >
//                     <Text
//                       style={[
//                         styles.closeButtonText,
//                         { color: themeColors.text },
//                       ]}
//                     >
//                       ✕
//                     </Text>
//                   </TouchableOpacity>
//                 </View>

//                 <ScrollView style={styles.modalContent}>
//                   <GlassCard theme={theme} style={styles.nodeOverviewCard}>
//                     <Text
//                       style={[
//                         styles.nodeOverviewTitle,
//                         { color: themeColors.text },
//                       ]}
//                     >
//                       {nodeDetail.node.label}
//                     </Text>
//                     <View style={styles.nodeOverviewBadge}>
//                       <Text
//                         style={[
//                           styles.nodeOverviewBadgeText,
//                           { color: currentViewMode.color },
//                         ]}
//                       >
//                         {nodeDetail.networkPosition.toUpperCase()}
//                       </Text>
//                     </View>
//                     <Text
//                       style={[
//                         styles.nodeOverviewSubtitle,
//                         { color: themeColors.textSecondary },
//                       ]}
//                     >
//                       {nodeDetail.node.type} • {nodeDetail.node.category}
//                     </Text>
//                   </GlassCard>

//                   {/* Phase 3: Health Insights Section */}
//                   {nodeDetail.healthInsights &&
//                     nodeDetail.healthInsights.length > 0 && (
//                       <GlassCard theme={theme} style={styles.insightsCard}>
//                         <Text
//                           style={[
//                             styles.sectionTitle,
//                             { color: themeColors.text },
//                           ]}
//                         >
//                           ❤️‍🩹 Health Analysis
//                         </Text>
//                         {nodeDetail.healthInsights.map((insight, index) => (
//                           <Text
//                             key={index}
//                             style={[
//                               styles.insightText,
//                               { color: themeColors.textSecondary },
//                             ]}
//                           >
//                             {insight}
//                           </Text>
//                         ))}
//                       </GlassCard>
//                     )}

//                   {/* Network Metrics */}
//                   <GlassCard theme={theme} style={styles.metricsCard}>
//                     <Text
//                       style={[styles.sectionTitle, { color: themeColors.text }]}
//                     >
//                       📊 Network Metrics
//                     </Text>
//                     <View style={styles.metricsGrid}>
//                       <View style={styles.metricItem}>
//                         <Text
//                           style={[
//                             styles.metricLabel,
//                             { color: themeColors.textSecondary },
//                           ]}
//                         >
//                           Neural Connections
//                         </Text>
//                         <Text
//                           style={[
//                             styles.metricValue,
//                             { color: themeColors.primary },
//                           ]}
//                         >
//                           {nodeDetail.connections}
//                         </Text>
//                       </View>
//                       <View style={styles.metricItem}>
//                         <Text
//                           style={[
//                             styles.metricLabel,
//                             { color: themeColors.textSecondary },
//                           ]}
//                         >
//                           Network Centrality
//                         </Text>
//                         <Text
//                           style={[
//                             styles.metricValue,
//                             { color: themeColors.success },
//                           ]}
//                         >
//                           {Math.round(nodeDetail.centrality * 100)}%
//                         </Text>
//                       </View>
//                       <View style={styles.metricItem}>
//                         <Text
//                           style={[
//                             styles.metricLabel,
//                             { color: themeColors.textSecondary },
//                           ]}
//                         >
//                           Activation Level
//                         </Text>
//                         <Text
//                           style={[
//                             styles.metricValue,
//                             { color: themeColors.warning },
//                           ]}
//                         >
//                           {Math.round(nodeDetail.node.activationLevel * 100)}%
//                         </Text>
//                       </View>
//                       <View style={styles.metricItem}>
//                         <Text
//                           style={[
//                             styles.metricLabel,
//                             { color: themeColors.textSecondary },
//                           ]}
//                         >
//                           Last Accessed
//                         </Text>
//                         <Text
//                           style={[
//                             styles.metricValue,
//                             { color: themeColors.info },
//                           ]}
//                         >
//                           {nodeDetail.node.lastAccessed.toLocaleDateString()}
//                         </Text>
//                       </View>
//                     </View>
//                   </GlassCard>

//                   {/* AI Recommendations */}
//                   <GlassCard theme={theme} style={styles.recommendationsCard}>
//                     <Text
//                       style={[styles.sectionTitle, { color: themeColors.text }]}
//                     >
//                       🎯 AI Learning Recommendations
//                     </Text>
//                     {nodeDetail.recommendations.map((rec, index) => (
//                       <Text
//                         key={index}
//                         style={[
//                           styles.recommendationText,
//                           { color: themeColors.textSecondary },
//                         ]}
//                       >
//                         {rec}
//                       </Text>
//                     ))}
//                   </GlassCard>

//                   {/* Phase 3: Path Recommendations */}
//                   {nodeDetail.pathRecommendations &&
//                     nodeDetail.pathRecommendations.length > 0 && (
//                       <GlassCard theme={theme} style={styles.pathCard}>
//                         <Text
//                           style={[
//                             styles.sectionTitle,
//                             { color: themeColors.text },
//                           ]}
//                         >
//                           🛤️ Learning Path Insights
//                         </Text>
//                         {nodeDetail.pathRecommendations.map((rec, index) => (
//                           <Text
//                             key={index}
//                             style={[
//                               styles.pathText,
//                               { color: themeColors.textSecondary },
//                             ]}
//                           >
//                             {rec}
//                           </Text>
//                         ))}
//                       </GlassCard>
//                     )}

//                   <View style={styles.modalActions}>
//                     <Button
//                       title="Study This Concept"
//                       onPress={() => {
//                         setNodeDetailVisible(false);
//                         // Navigate to appropriate screen
//                         const navigationMap = {
//                           flashcard: 'flashcards',
//                           task: 'tasks',
//                           palace: 'memory-palace',
//                           derived: 'flashcards',
//                           logic: 'flashcards', // Phase 3: Add logic navigation
//                         };
//                         onNavigate(
//                           navigationMap[nodeDetail.node.sourceType] ||
//                             'flashcards',
//                         );
//                       }}
//                       variant="primary"
//                       theme={theme}
//                       style={styles.modalButton}
//                     />
//                     <Button
//                       title="Close Analysis"
//                       onPress={() => setNodeDetailVisible(false)}
//                       variant="outline"
//                       theme={theme}
//                       style={styles.modalButton}
//                     />
//                   </View>
//                 </ScrollView>
//               </ScreenContainer>
//             )}
//           </Modal>

//           <HamburgerMenu
//             visible={menuVisible}
//             onClose={() => setMenuVisible(false)}
//             onNavigate={onNavigate}
//             currentScreen="neural-mind-map"
//             theme={theme}
//           />
//         </ScreenContainer>
//       </SafeAreaView>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   mainContent: {
//     flex: 1,
//     paddingTop: 100, // Space for floating header
//   },
//   topSection: {
//     flex: 0,
//     paddingHorizontal: spacing.md,
//     paddingBottom: spacing.sm,
//   },
//   statusCard: {
//     marginBottom: spacing.sm,
//   },
//   statusRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'flex-start',
//   },
//   statusItem: {
//     flex: 1,
//     alignItems: 'center',
//   },
//   statusLabel: {
//     ...typography.caption,
//     marginBottom: 4,
//   },
//   statusValue: {
//     ...typography.h4,
//     fontWeight: '600',
//     marginBottom: 2,
//   },
//   statusSubText: {
//     ...typography.caption,
//     textAlign: 'center',
//     lineHeight: 16,
//   },

//   // Phase 3:  View Mode Selector
//   viewModeSelector: {
//     paddingVertical: spacing.sm,
//   },
//   viewModeContainer: {
//     paddingHorizontal: spacing.md,
//   },
//   viewModeButton: {
//     width: 110,
//     height: 80,
//     marginRight: spacing.sm,
//     borderRadius: borderRadius.md,
//     borderWidth: 1,
//     padding: spacing.xs,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   viewModeButtonActive: {
//     borderWidth: 2,
//   },
//   viewModeIcon: {
//     fontSize: 20,
//     marginBottom: 4,
//   },
//   viewModeText: {
//     ...typography.caption,
//     fontWeight: '600',
//     marginBottom: 2,
//     textAlign: 'center',
//   },
//   viewModeDescription: {
//     ...typography.caption,
//     fontSize: 10,
//     textAlign: 'center',
//     lineHeight: 12,
//   },

//   canvasContainer: {
//     flex: 1,
//     minHeight: 400,
//   },

//   //  Selected Node Panel
//   selectedNodePanel: {
//     margin: spacing.md,
//     padding: spacing.md,
//   },
//   selectedNodeHeader: {
//     marginBottom: spacing.sm,
//   },
//   selectedNodeTitle: {
//     ...typography.h4,
//     marginBottom: 4,
//   },
//   selectedNodeSubtitle: {
//     ...typography.caption,
//   },
//   detailButton: {
//     paddingVertical: spacing.xs,
//     paddingHorizontal: spacing.sm,
//     borderRadius: borderRadius.sm,
//     alignItems: 'center',
//     marginBottom: spacing.sm,
//   },
//   detailButtonText: {
//     ...typography.caption,
//     color: '#FFFFFF',
//     fontWeight: '600',
//   },
//   quickStats: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//   },
//   statItem: {
//     alignItems: 'center',
//     flex: 1,
//   },
//   statValue: {
//     ...typography.body,
//     fontWeight: '600',
//     marginBottom: 2,
//   },
//   statLabel: {
//     ...typography.caption,
//     fontSize: 10,
//   },

//   // Modal styles
//   modalHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: spacing.lg,
//     paddingTop: 60, // Account for status bar
//   },
//   modalTitle: {
//     ...typography.h3,
//   },
//   closeButton: {
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: 'rgba(255,255,255,0.1)',
//   },
//   closeButtonText: {
//     fontSize: 16,
//   },
//   modalContent: {
//     flex: 1,
//     padding: spacing.md,
//   },

//   // Node overview
//   nodeOverviewCard: {
//     alignItems: 'center',
//     padding: spacing.lg,
//     marginBottom: spacing.md,
//   },
//   nodeOverviewTitle: {
//     ...typography.h3,
//     textAlign: 'center',
//     marginBottom: spacing.sm,
//   },
//   nodeOverviewBadge: {
//     paddingHorizontal: spacing.sm,
//     paddingVertical: spacing.xs,
//     backgroundColor: 'rgba(255,255,255,0.1)',
//     borderRadius: borderRadius.sm,
//     marginBottom: spacing.sm,
//   },
//   nodeOverviewBadgeText: {
//     ...typography.caption,
//     fontWeight: '600',
//   },
//   nodeOverviewSubtitle: {
//     ...typography.body,
//   },

//   // Phase 3: Health insights
//   insightsCard: {
//     padding: spacing.md,
//     marginBottom: spacing.md,
//   },
//   insightText: {
//     ...typography.body,
//     marginBottom: spacing.sm,
//     lineHeight: 20,
//   },

//   // Metrics
//   metricsCard: {
//     padding: spacing.md,
//     marginBottom: spacing.md,
//   },
//   sectionTitle: {
//     ...typography.h4,
//     marginBottom: spacing.md,
//   },
//   metricsGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     justifyContent: 'space-between',
//   },
//   metricItem: {
//     width: '48%',
//     marginBottom: spacing.md,
//   },
//   metricLabel: {
//     ...typography.caption,
//     marginBottom: 4,
//   },
//   metricValue: {
//     ...typography.body,
//     fontWeight: '600',
//   },

//   // Recommendations
//   recommendationsCard: {
//     padding: spacing.md,
//     marginBottom: spacing.md,
//   },
//   recommendationText: {
//     ...typography.body,
//     marginBottom: spacing.sm,
//     lineHeight: 20,
//   },

//   // Phase 3: Path recommendations
//   pathCard: {
//     padding: spacing.md,
//     marginBottom: spacing.md,
//   },
//   pathText: {
//     ...typography.body,
//     marginBottom: spacing.sm,
//     lineHeight: 20,
//   },

//   modalActions: {
//     flexDirection: 'row',
//     gap: spacing.md,
//     marginTop: spacing.lg,
//     marginBottom: spacing.xl,
//   },
//   modalButton: {
//     flex: 1,
//   },

//   // Loading states
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: spacing.xl,
//   },
//   loadingCard: {
//     alignItems: 'center',
//     padding: spacing.xl,
//   },
//   loadingText: {
//     ...typography.h3,
//     textAlign: 'center',
//     marginTop: spacing.lg,
//     marginBottom: spacing.md,
//   },
//   loadingSubtext: {
//     ...typography.body,
//     textAlign: 'center',
//     lineHeight: 22,
//     marginBottom: spacing.lg,
//   },
//   progressContainer: {
//     width: '100%',
//     height: 4,
//     backgroundColor: 'rgba(255, 255, 255, 0.1)',
//     borderRadius: 2,
//     overflow: 'hidden',
//     marginTop: spacing.md,
//   },
//   progressBar: {
//     height: '100%',
//     borderRadius: 2,
//   },

//   // Empty state
//   emptyContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: spacing.lg,
//     paddingTop: 36,
//     paddingBottom: 120, // Hide under floating nav bar
//   },
//   emptyCard: {
//     alignItems: 'center',
//     padding: spacing.xl,
//   },
//   emptyTitle: {
//     ...typography.h2,
//     marginBottom: spacing.lg,
//     textAlign: 'center',
//   },
//   emptyText: {
//     ...typography.body,
//     textAlign: 'center',
//     lineHeight: 24,
//     marginBottom: spacing.xl,
//   },
//   emptyActions: {
//     flexDirection: 'row',
//     gap: spacing.md,
//   },
//   emptyButton: {
//     flex: 1,
//     minWidth: 140,
//   },

//   refreshIcon: {
//     fontSize: 18,
//     fontWeight: '600',
//   },
//   miniPlayer: {
//     position: 'absolute',
//     bottom: 20,
//     left: 20,
//     right: 20,
//   },
// });
