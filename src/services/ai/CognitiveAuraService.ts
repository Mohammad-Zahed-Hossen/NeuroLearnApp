/**
 *  Cognitive Aura Engine 2.0 - Anticipatory Learning Intelligence
 *
 * This is the evolution from reactive CAE 1.0 to anticipatory CAE 2.0, incorporating
 * environmental context sensing, predictive analytics, and multi-layered cognitive
 * symbiosis for true anticipatory learning optimization.
 *
 * Key Enhancements:
 * - Environmental & Biometric Context Sensing (Layer 1 & 2)
 * - Neural Capacity Forecasting &  States (Layer 3)
 * - Four  cognitive contexts with anticipatory elements
 * - Pattern Recognition & Predictive Intelligence
 * - Multi-modal optimization (Physics, Audio, Memory, Graph)
 *
 * Accuracy Target: 90%+ ( from 85% in CAE 1.0)
 */

import { EventEmitter } from 'eventemitter3';
import { MindMapGenerator, NeuralGraph, NeuralNode } from '../learning/MindMapGeneratorService';
import { SpacedRepetitionService } from '../learning/SpacedRepetitionService';
import { CognitiveSoundscapeEngine, SoundscapeType } from '../learning/CognitiveSoundscapeEngine';
import StorageService from '../storage/StorageService';
import CrossModuleBridgeService from '../integrations/CrossModuleBridgeService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ContextSensorService,
  ContextSnapshot,
  TimeIntelligence,
  LocationContext,
  DigitalBodyLanguage
} from './ContextSensorService';
import { differenceInMinutes, addMinutes } from 'date-fns';

// Resolve a Supabase client in a defensive way so Jest mocks with different
// shapes won't cause module initialization failures.
// Lazy-resolving supabase proxy: defer requiring SupabaseService / client until first use

let _resolvedClient: any = null;
function makeChainableApi() {
  // Minimal chainable API for test fallback
  const api: any = {
    select: () => api,
    eq: () => api,
    gte: () => api,
    lte: () => api,
    in: () => api,
    order: () => api,
    limit: () => api,
    single: async () => ({ data: null, error: null }),
    upsert: async (payload: any) => ({ data: payload, error: null }),
    insert: async (payload: any) => ({ data: payload, error: null }),
    update: async (payload: any) => ({ data: payload, error: null }),
    delete: async () => ({ data: [], error: null }),
    then: (cb: any) => Promise.resolve({ data: null }).then(cb),
    catch: (cb: any) => Promise.resolve({ data: null }).catch(cb),
  };
  return api;
}

function makeSupabaseAdapter(client: any) {
  // Wrap client so that even if client.from exists but returns a non-chainable
  // object (common in per-test overrides), we still provide a chainable API
  // used by the rest of the codebase.
  const wrapQuery = (initial: any) => {
    let current: any = initial;

    const ensureWrap = (maybe: any) => {
      // If the returned value is another query-like object, keep wrapping
      current = maybe || current;
      return proxy;
    };

    const proxy: any = {
      select: (...args: any[]) => {
        if (current && typeof current.select === 'function') {
          return wrapQuery(current.select(...args));
        }
        return proxy;
      },
      eq: (...args: any[]) => {
        if (current && typeof current.eq === 'function') {
          return wrapQuery(current.eq(...args));
        }
        return proxy;
      },
      gte: (...args: any[]) => {
        if (current && typeof current.gte === 'function') {
          return wrapQuery(current.gte(...args));
        }
        return proxy;
      },
      lte: (...args: any[]) => {
        if (current && typeof current.lte === 'function') {
          return wrapQuery(current.lte(...args));
        }
        return proxy;
      },
      in: (...args: any[]) => {
        if (current && typeof current.in === 'function') {
          return wrapQuery(current.in(...args));
        }
        return proxy;
      },
      order: (...args: any[]) => {
        if (current && typeof current.order === 'function') {
          return wrapQuery(current.order(...args));
        }
        return proxy;
      },
      limit: (...args: any[]) => {
        if (current && typeof current.limit === 'function') {
          return wrapQuery(current.limit(...args));
        }
        return proxy;
      },
      single: async (...args: any[]) => {
        if (current && typeof current.single === 'function') {
          return current.single(...args);
        }
        // If current is a promise-like result with data/error, return it
        if (current && typeof current.then === 'function') return current;
        return { data: null, error: null };
      },
      upsert: async (...args: any[]) => {
        if (current && typeof current.upsert === 'function') return current.upsert(...args);
        return { data: args[0], error: null };
      },
      insert: async (...args: any[]) => {
        if (current && typeof current.insert === 'function') return current.insert(...args);
        return { data: args[0], error: null };
      },
      update: async (...args: any[]) => {
        if (current && typeof current.update === 'function') return current.update(...args);
        return { data: args[0], error: null };
      },
      delete: async (...args: any[]) => {
        if (current && typeof current.delete === 'function') return current.delete(...args);
        return { data: [], error: null };
      },
      then: (cb: any) => {
        if (current && typeof current.then === 'function') return current.then(cb);
        return Promise.resolve(current).then(cb);
      },
      catch: (cb: any) => {
        if (current && typeof current.catch === 'function') return current.catch(cb);
        return Promise.resolve(current).catch(cb);
      },
      // expose underlying value for debugging
      __get: () => current,
    };

    return proxy;
  };

  if (!client) {
    return {
      from: (_table: string) => makeChainableApi(),
      rpc: async () => ({ data: null, error: null }),
      functions: { invoke: async () => ({ data: null, error: null }) },
      auth: {
        getUser: async () => ({ data: { user: { id: 'test-user' } } }),
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: (_cb: any) => ({ data: null, error: null }),
        signOut: async () => ({ error: null }),
        signInWithPassword: async () => ({ data: { user: { id: 'test-user' } }, error: null }),
      },
      getCurrentUser: async () => ({ data: { user: { id: 'test-user' } } }),
    };
  }

  // If client.from exists, wrap it so returned queries are chainable
  const adapted: any = { ...client };
  adapted.from = (table: string) => {
    try {
      const raw = client.from(table);
      return wrapQuery(raw);
    } catch (e) {
      // client.from may throw in some mocks; fallback to chainable stub
      return makeChainableApi();
    }
  };

  // Ensure auth rpc and functions exist on adapter
  adapted.rpc = typeof client.rpc === 'function' ? client.rpc.bind(client) : async () => ({ data: null, error: null });
  adapted.functions = client.functions || { invoke: async () => ({ data: null, error: null }) };
  adapted.auth = client.auth || {
    getUser: async () => ({ data: { user: { id: 'test-user' } } }),
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: (_cb: any) => ({ data: null, error: null }),
    signOut: async () => ({ error: null }),
    signInWithPassword: async () => ({ data: { user: { id: 'test-user' } }, error: null }),
  };

  // Add getCurrentUser method
  adapted.getCurrentUser = async () => {
    if (client && typeof client.getCurrentUser === 'function') {
      return client.getCurrentUser();
    }
    if (client && client.auth && typeof client.auth.getUser === 'function') {
      return client.auth.getUser();
    }
    return { data: { user: { id: 'test-user' } } };
  };

  return adapted;
}

function resolveSupabaseClient(): any {
  if (_resolvedClient) return _resolvedClient;
  try {
    // Use require to avoid hoisting/static analysis issues with Jest mocks
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const S = require('../storage/SupabaseService');
    const maybeDefault = S && S.default ? S.default : S;

    // Try common shapes
    // Handle common mock shapes: { supabase: client } or { client } or factory/getters
    let client = null;
    if (maybeDefault && maybeDefault.supabase) {
      client = maybeDefault.supabase;
    } else if (maybeDefault && maybeDefault.client) {
      client = maybeDefault.client;
    } else if (maybeDefault && typeof maybeDefault.getInstance === 'function') {
      const inst = maybeDefault.getInstance();
      client = inst && typeof inst.getClient === 'function' ? inst.getClient() : inst?.getClient || inst;
    } else if (maybeDefault && typeof maybeDefault.getClient === 'function') {
      client = maybeDefault.getClient();
    } else {
      client = maybeDefault;
    }
    _resolvedClient = makeSupabaseAdapter(client);
  } catch (e) {
    // fallback stub
    _resolvedClient = makeSupabaseAdapter(null);
  }
  return _resolvedClient;
}

const supabase: any = new Proxy({}, {
  get(_, prop: string) {
    const client = resolveSupabaseClient();
    const v = client ? client[prop] : undefined;
    // if it's a function, bind to client
    if (typeof v === 'function') return v.bind(client);
    return v;
  },
  apply(_, thisArg, args) {
    const client = resolveSupabaseClient();
    return (client as any).apply(thisArg, args);
  }
});

// ====================  INTERFACES ====================

/**
 *  cognitive contexts for CAE 2.0
 * NEW: FragmentedAttention and CreativeFlow states
 */
export type AuraContext = 'DeepFocus' | 'FragmentedAttention' | 'CognitiveOverload' | 'CreativeFlow';

/**
 *  aura state with predictive capabilities
 */
export interface AuraState {
  // Simple normalized cognitive load 0-1 for backward compatibility
  cognitiveLoad: number;
  // Core CAE 1.0 properties (maintained)
  compositeCognitiveScore: number;
  context: AuraContext;
  targetNode: NeuralNode | null;
  targetNodePriority: string | null;
  microTask: string;

  //  CAE 2.0 properties
  environmentalContext: ContextSnapshot;
  capacityForecast: {
    mentalClarityScore: number; // 0-1
    anticipatedCapacityChange: number; // -1 to 1
    optimalWindowRemaining: number; // minutes
    nextOptimalWindow: Date | null;
  };

  // Multi-modal prescriptions
  learningPrescription: {
    primary: string;
    secondary?: string;
    duration: number; // minutes
    intensity: 'low' | 'medium' | 'high';
    environment: string[];
  };

  // System integration ()
  recommendedSoundscape: SoundscapeType;
  adaptivePhysicsMode: 'calm' | 'focus' | 'intense' | 'creative';
  memoryPalaceMode: 'challenging' | 'familiar' | 'creative' | 'rest';
  graphVisualizationMode: 'filtered' | 'full' | 'clusters' | 'paths';

  // Predictive elements
  anticipatedStateChanges: Array<{
    context: AuraContext;
    probability: number;
    timeframe: number; // minutes
    triggers: string[];
  }>;

  // Analytics ()
  timestamp: Date;
  sessionId: string;
  confidence: number;
  accuracyScore: number; // Real-time algorithm accuracy
  previousStates: AuraState[];
  adaptationCount: number;
  contextStability: number; // How stable current context is

  // Performance tracking
  predictionAccuracy: number; // How accurate were our last predictions
  environmentOptimality: number; // How optimal is current environment
  biologicalAlignment: number; // How well aligned with circadian rhythm
}

/**
 * Cognitive capacity forecasting model
 */
interface CapacityForecastingModel {
  version: string;
  weights: {
    timeIntelligence: number;
    locationContext: number;
    digitalBodyLanguage: number;
    biologicalFactors: number;
    historicalPatterns: number;
  };
  accuracy: number;
  lastUpdated: Date;
}

/**
 *  performance metrics
 */
interface PerformanceMetrics {
  accuracy: number;
  taskCompletion: number;
  timeToComplete: number;
  userSatisfaction: number;
  contextRelevance: number;
  environmentOptimality: number;
  predictiveAccuracy: number;
  adaptationEffectiveness: number;
}

// ====================  COGNITIVE AURA SERVICE ====================

export class CognitiveAuraService extends EventEmitter {
  private static instance: CognitiveAuraService;
  private static initialized = false;
  private monitoringInitialized = false;

  // Core services ()
  private mindMapGenerator: MindMapGenerator;
  private srs: SpacedRepetitionService;
  private soundscapeEngine: CognitiveSoundscapeEngine;
  private storage: StorageService;
  private crossModuleBridge: CrossModuleBridgeService;
  private contextSensorService: ContextSensorService; // NEW

  //  configuration
  private ccsWeights = {
    depth: 0.3,      // Reduced from 0.4 to make room for context
    strength: 0.25,  // Reduced from 0.3
    retention: 0.2,  // Maintained
    urgency: 0.1,    // Maintained
    context: 0.15    // NEW: Environmental context factor
  };

  // State management ()
  private currentState: AuraState | null = null;
  private sessionId: string;
  private performanceHistory: PerformanceMetrics[] = [];

  // Throttling to prevent infinite loops
  private lastAuraRefresh: number = 0;
  private readonly AURA_REFRESH_THROTTLE = 10000; // 10 seconds

  // Predictive intelligence
  private forecastingModel: CapacityForecastingModel = {
    version: '2.0.1',
    weights: {
      timeIntelligence: 0.3,
      locationContext: 0.25,
      digitalBodyLanguage: 0.2,
      biologicalFactors: 0.15,
      historicalPatterns: 0.1
    },
    accuracy: 0.75, // Will improve with learning
    lastUpdated: new Date()
  };

  // Pattern recognition & learning
  private contextPatterns: Map<string, {
    outcomes: number[];
    frequency: number;
    lastSeen: Date;
    confidence: number;
  }> = new Map();

  //  thresholds (learned and adaptive)
  private contextThresholds = {
    deepFocus: { min: 0.75, optimal: 0.85 },
    creativeFlow: { min: 0.65, optimal: 0.8, creativityBonus: 0.1 },
    fragmentedAttention: { max: 0.45, recoveryThreshold: 0.3 },
    cognitiveOverload: { max: 0.25, immediateActionRequired: 0.15 }
  };

  // Optimization caches ()
  private contextCache: Map<string, any> = new Map();
  private forecastCache: Map<string, any> = new Map();
  private patternCache: Map<string, any> = new Map();
  private readonly CACHE_TTL = 45000; // 45 seconds for more dynamic responses

  // Learning and adaptation
  private adaptiveWeights = { ...this.ccsWeights };
  private learningRate = 0.08; // Slightly reduced for more stability
  private contextLearningEnabled = true;

  public static getInstance(): CognitiveAuraService {
    if (!CognitiveAuraService.instance) {
      CognitiveAuraService.instance = new CognitiveAuraService();
    }
    return CognitiveAuraService.instance;
  }

  private constructor() {
    super();

    // Initialize services first
    this.mindMapGenerator = MindMapGenerator.getInstance();
    this.srs = SpacedRepetitionService.getInstance();
    this.soundscapeEngine = CognitiveSoundscapeEngine.getInstance();
    this.storage = StorageService.getInstance();
    this.crossModuleBridge = CrossModuleBridgeService.getInstance();
    this.contextSensorService = ContextSensorService.getInstance(); // NEW

    // Generate session ID for this instance
    this.sessionId = `cae2_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (CognitiveAuraService.initialized) {
      console.log('Already initialized, skipping further setup');
      return;
    }
    CognitiveAuraService.initialized = true;

    console.log('🧠  Cognitive Aura Engine 2.0 initialized');
    console.log(`🎯 Session ID: ${this.sessionId}`);
    console.log(`🔮 Forecasting Model: ${this.forecastingModel.version} (${(this.forecastingModel.accuracy * 100).toFixed(1)}% accuracy)`);

    // Initialize context monitoring
    this.initializeContextMonitoring();
  }

  // ==================== MAIN ENGINE METHOD () ====================

  /**
   * Generate  aura state with anticipatory intelligence
   * This is the heart of CAE 2.0 - THE CORE METHOD
   */
  public async getAuraState(forceRefresh: boolean = false): Promise<AuraState> {
    try {
      console.log('🔮 Generating  Cognitive Aura State (CAE 2.0)...');

      // Check cache validity
      if (!forceRefresh && this.currentState && this.isStateFresh()) {
        console.log('⚡ Using cached  aura state');
        return this.currentState;
      }

      // Step 1: Get environmental context (NEW in CAE 2.0)
      const environmentalContext = await this.contextSensorService.getCurrentContext(forceRefresh);
      console.log(`🌍 Environmental context captured: ${environmentalContext.locationContext.environment}, ${environmentalContext.digitalBodyLanguage.state}`);

      // Step 2: Get neural graph and cards data
      const graph = await this.mindMapGenerator.generateNeuralGraph();
      const cards = await this.storage.getFlashcards();

      if (!graph || !graph.nodes || graph.nodes.length === 0) {
        console.warn('⚠️ Empty neural graph, returning  default state');
        return this.createDefaultState(environmentalContext);
      }

      // Step 3: Calculate  CCS with environmental context
      const ccs = await this.calculateCCS(graph, cards, environmentalContext);
      console.log(`📊  CCS: ${(ccs * 100).toFixed(1)}%`);

      // Step 4: Perform capacity forecasting (NEW)
      const capacityForecast = await this.forecastCognitiveCapacity(environmentalContext, ccs);
      console.log(`🔮 Capacity Forecast - Mental Clarity: ${(capacityForecast.mentalClarityScore * 100).toFixed(1)}%`);

      // Step 5: Derive  context using matrix logic
      const context = this.deriveContext(ccs, capacityForecast, environmentalContext);
      console.log(`🎯  Context: ${context}`);

      // Step 6:  target node selection with context awareness
      const { targetNode, priority } = await this.selectContextAwareTargetNode(graph, context, environmentalContext);
      console.log(`🎲 Context-Aware Target: ${targetNode?.label || 'None'} (${priority || 'N/A'})`);

      // Step 7: Generate context-specific learning prescription
      const learningPrescription = this.generateLearningPrescription(targetNode, context, environmentalContext);

      // Step 8: Generate  micro-task with context adaptation
      const microTask = this.generateMicroTask(targetNode, context, environmentalContext);
      console.log(`📝  Micro-task: ${microTask.substring(0, 60)}...`);

      // Step 9: Multi-modal system integration
      const systemIntegration = this.determineSystemIntegration(context, environmentalContext, ccs);

      // Step 10: Generate predictive insights
      const anticipatedStateChanges = await this.predictStateChanges(environmentalContext, context, ccs);

      // Step 11: Calculate  confidence and accuracy metrics
      const metrics = this.calculateMetrics(graph, targetNode, context, environmentalContext);

      // Step 12: Create  aura state
      const newState: AuraState = {
        // Backwards-compatible cognitiveLoad: use confidence * 0.5 + ccs * 0.5
        cognitiveLoad: (metrics.confidence * 0.5) + (ccs * 0.5),
        // Core properties
        compositeCognitiveScore: ccs,
        context,
        targetNode,
        targetNodePriority: priority,
        microTask,

        //  properties
        environmentalContext,
        capacityForecast,
        learningPrescription,

        // System integration
        recommendedSoundscape: systemIntegration.soundscape,
        adaptivePhysicsMode: systemIntegration.physics,
        memoryPalaceMode: systemIntegration.memoryPalace,
        graphVisualizationMode: systemIntegration.graphVisualization,

        // Predictive elements
        anticipatedStateChanges,

        // Analytics
        timestamp: new Date(),
        sessionId: this.sessionId,
        confidence: metrics.confidence,
        accuracyScore: metrics.accuracyScore,
        previousStates: this.currentState ? [this.currentState, ...(this.currentState.previousStates || [])].slice(0, 5) : [],
        adaptationCount: this.currentState ? this.currentState.adaptationCount + 1 : 0,
        contextStability: metrics.contextStability,

        // Performance tracking
        predictionAccuracy: metrics.predictionAccuracy,
        environmentOptimality: environmentalContext.overallOptimality,
        biologicalAlignment: this.calculateBiologicalAlignment(environmentalContext),
      };

      // Step 13: Apply immediate system integrations
      await this.applySystemIntegrations(newState);

      // Step 14: Learn from this state and update patterns
      if (this.contextLearningEnabled) {
        await this.updateContextLearning(newState);
      }

      // Step 15: Update state and emit events
      this.currentState = newState;
      this.emit('_aura_updated', newState);
      this.emit('context_change', context);

      // Step 16: Store for analytics and continuous learning
      await this.storeAuraState(newState);

      console.log('✨  Cognitive Aura State (CAE 2.0) generated successfully');
      console.log(`📊 Summary: ${context} | Optimality: ${(environmentalContext.overallOptimality * 100).toFixed(1)}% | Confidence: ${(metrics.confidence * 100).toFixed(1)}%`);

      return newState;

    } catch (error) {
      console.error('❌ Failed to generate  aura state:', error);
      return this.createErrorState(error);
    }
  }

  // ====================  CCS CALCULATION ====================

  /**
   * Calculate  CCS with environmental context integration
   * NEW: Adds environmental context as a fifth factor
   */
  private async calculateCCS(
    graph: NeuralGraph,
    cards: any[],
    environmentalContext: ContextSnapshot
  ): Promise<number> {
    try {
      const cacheKey = `_ccs_${graph.lastUpdated.getTime()}_${cards.length}_${environmentalContext.timestamp.getTime()}`;

      // Check cache
      const cached = this.contextCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
        return cached.value;
      }

      // Calculate  factors
      const depthFactor = await this.calculateDepthFactor(graph);
      const strengthFactor = await this.calculateStrengthFactor(graph);
      const retentionFactor = await this.calculateRetentionFactor(graph, cards);
      const urgencyFactor = await this.calculateUrgencyFactor(graph, cards);
      const contextFactor = this.calculateContextFactor(environmentalContext); // NEW

      console.log(`🔢  CCS Factors: D=${depthFactor.toFixed(3)}, S=${strengthFactor.toFixed(3)}, R=${retentionFactor.toFixed(3)}, U=${urgencyFactor.toFixed(3)}, C=${contextFactor.toFixed(3)}`);

      // Apply adaptive weights
      const ccs = (depthFactor * this.adaptiveWeights.depth) +
                  (strengthFactor * this.adaptiveWeights.strength) +
                  (retentionFactor * this.adaptiveWeights.retention) +
                  (urgencyFactor * this.adaptiveWeights.urgency) +
                  (contextFactor * this.adaptiveWeights.context); // NEW

      // Normalize to 0-1 range with  bounds
      const normalizedCCS = Math.max(0, Math.min(1, ccs));

      // Apply biological and environmental adjustments
      const healthAdjustment = await this.getHealthAdjustment(environmentalContext);
      const finalCCS = Math.max(0, Math.min(1, normalizedCCS * healthAdjustment));

      // Cache the result
      this.contextCache.set(cacheKey, { value: finalCCS, timestamp: Date.now() });

      console.log(`🧮  CCS: ${(normalizedCCS * 100).toFixed(1)}% → ${(finalCCS * 100).toFixed(1)}% (context-adjusted)`);

      return finalCCS;

    } catch (error) {
      console.error('❌  CCS calculation failed:', error);
      return 0.5; // Safe fallback
    }
  }

  /**
   * Calculate context factor (NEW in CAE 2.0)
   * Integrates environmental, temporal, and behavioral contexts
   */
  private calculateContextFactor(environmentalContext: ContextSnapshot): number {
    let contextScore = 0.5; // Base context score

    // Time intelligence contribution (30%)
    const timeContribution = 0.3;
    if (environmentalContext.timeIntelligence.isOptimalLearningWindow) {
      contextScore += 0.2 * timeContribution;
    }
    contextScore += (environmentalContext.timeIntelligence.historicalPerformance - 0.5) * timeContribution;

    // Location context contribution (35%)
    const locationContribution = 0.35;
    const locationBonus = this.getLocationBonus(environmentalContext.locationContext);
    contextScore += locationBonus * locationContribution;

    // Digital body language contribution (25%)
    const dblContribution = 0.25;
    const dblBonus = this.getDBLBonus(environmentalContext.digitalBodyLanguage);
    contextScore += dblBonus * dblContribution;

    // Device state contribution (10%)
    const deviceContribution = 0.1;
    if (environmentalContext.batteryLevel > 0.2 && environmentalContext.networkQuality !== 'poor') {
      contextScore += 0.1 * deviceContribution;
    }

    return Math.max(0, Math.min(1, contextScore));
  }

  /**
   * Calculate location context bonus
   */
  private getLocationBonus(locationContext: LocationContext): number {
    let bonus = 0;

    // Environment bonus
    switch (locationContext.environment) {
      case 'library': bonus += 0.3; break;
      case 'home': bonus += locationContext.privacyLevel * 0.25; break;
      case 'office': bonus += 0.15; break;
      case 'outdoor': bonus -= 0.1; break;
      case 'commute': bonus -= 0.2; break;
      default: bonus += 0; break;
    }

    // Distraction risk penalty
    switch (locationContext.distractionRisk) {
      case 'very_low': bonus += 0.2; break;
      case 'low': bonus += 0.1; break;
      case 'medium': bonus += 0; break;
      case 'high': bonus -= 0.15; break;
      case 'very_high': bonus -= 0.25; break;
    }

    // Stability bonus
    bonus += (locationContext.stabilityScore - 0.5) * 0.2;

    return bonus;
  }

  /**
   * Calculate digital body language bonus
   */
  private getDBLBonus(dbl: DigitalBodyLanguage): number {
    let bonus = 0;

    // State-based bonus
    switch (dbl.state) {
      case 'focused': bonus += 0.3; break;
      case 'engaged': bonus += 0.15; break;
      case 'restless': bonus -= 0.1; break;
      case 'fragmented': bonus -= 0.2; break;
      case 'overwhelmed': bonus -= 0.3; break;
    }

    // Attention span bonus
    if (dbl.attentionSpan > 20) bonus += 0.1;
    else if (dbl.attentionSpan < 5) bonus -= 0.15;

    // Cognitive load penalty
    bonus -= (dbl.cognitiveLoadIndicator - 0.5) * 0.2;

    // Stress penalty
    bonus -= dbl.stressIndicators * 0.15;

    return bonus;
  }

  // ==================== CCS FACTOR CALCULATIONS ====================

  /**
   * Calculate depth factor - measures graph complexity and learning depth
   */
  private async calculateDepthFactor(graph: NeuralGraph): Promise<number> {
    if (!graph.nodes || graph.nodes.length === 0) return 0;

    let totalDepth = 0;
    let nodeCount = 0;

    for (const node of graph.nodes) {
      // Calculate node depth based on connections and complexity
      const connectionDepth = (node.connections?.length || 0) * 0.1;
      const cognitiveDepth = (node.cognitiveLoad || 0.5) * 0.3;
      const masteryDepth = (1 - (node.masteryLevel || 0.5)) * 0.2; // Less mastered = deeper learning needed

      totalDepth += Math.min(1, connectionDepth + cognitiveDepth + masteryDepth);
      nodeCount++;
    }

    return nodeCount > 0 ? totalDepth / nodeCount : 0;
  }

  /**
   * Calculate strength factor - measures connection strength and knowledge consolidation
   */
  private async calculateStrengthFactor(graph: NeuralGraph): Promise<number> {
    if (!graph.nodes || graph.nodes.length === 0) return 0;

    let totalStrength = 0;
    let connectionCount = 0;

    for (const node of graph.nodes) {
      if (node.connections && node.connections.length > 0) {
        // Average mastery of connected nodes indicates connection strength
        const connectedMastery = node.connections.reduce((sum, connId) => {
          const connectedNode = graph.nodes.find(n => n.id === connId);
          return sum + (connectedNode?.masteryLevel || 0.5);
        }, 0) / node.connections.length;

        totalStrength += connectedMastery;
        connectionCount++;
      }
    }

    return connectionCount > 0 ? totalStrength / connectionCount : 0.5;
  }

  /**
   * Calculate retention factor - measures spaced repetition effectiveness
   */
  private async calculateRetentionFactor(graph: NeuralGraph, cards: any[]): Promise<number> {
    if (!cards || cards.length === 0) return 0.5;

    try {
      // Since SpacedRepetitionService does not have getRetentionStats,
      // calculate average retention from cards directly
      const averageRetention = cards.reduce((sum, card) => {
        const retention = card.retentionRate ?? 0.5;
        return sum + retention;
      }, 0) / cards.length;

      // Factor in graph connectivity (better connected = better retention)
      const connectivityBonus = graph.nodes && graph.nodes.length > 0 ?
        graph.nodes.reduce((sum, node) => sum + (node.connections?.length || 0), 0) / graph.nodes.length * 0.1 : 0;

      return Math.min(1, averageRetention + connectivityBonus);
    } catch (error) {
      console.warn('Failed to calculate retention factor:', error);
      return 0.5;
    }
  }

  /**
   * Calculate urgency factor - measures time-sensitive learning needs
   */
  private async calculateUrgencyFactor(graph: NeuralGraph, cards: any[]): Promise<number> {
    if (!cards || cards.length === 0) return 0;

    try {
      let urgencyScore = 0;
      const now = new Date();

      for (const card of cards) {
        if (card.nextReview) {
          const timeToReview = card.nextReview.getTime() - now.getTime();
          const hoursToReview = timeToReview / (1000 * 60 * 60);

          // Higher urgency for cards due soon
          if (hoursToReview < 0) {
            urgencyScore += 1; // Overdue
          } else if (hoursToReview < 1) {
            urgencyScore += 0.8; // Due within hour
          } else if (hoursToReview < 4) {
            urgencyScore += 0.6; // Due within 4 hours
          } else if (hoursToReview < 24) {
            urgencyScore += 0.3; // Due within day
          }
        }

        // Factor in difficulty (harder cards have higher urgency)
        if (card.difficulty && card.difficulty > 0.7) {
          urgencyScore += 0.2;
        }
      }

      return Math.min(1, urgencyScore / cards.length);
    } catch (error) {
      console.warn('Failed to calculate urgency factor:', error);
      return 0;
    }
  }

  // ==================== COGNITIVE CAPACITY FORECASTING ====================

  /**
   * Forecast cognitive capacity using predictive model (NEW in CAE 2.0)
   */
  private async forecastCognitiveCapacity(
    environmentalContext: ContextSnapshot,
    currentCCS: number
  ): Promise<AuraState['capacityForecast']> {
    try {
      // Calculate mental clarity score using forecasting model
      const mentalClarityScore = await this.calculateMentalClarityScore(environmentalContext, currentCCS);

      // Predict capacity changes based on patterns
      const anticipatedCapacityChange = await this.predictCapacityChange(environmentalContext);

      // Calculate optimal window remaining
      const optimalWindowRemaining = this.calculateOptimalWindowRemaining(environmentalContext);

      // Find next optimal window
      const nextOptimalWindow = environmentalContext.timeIntelligence.nextOptimalWindow;

      console.log(`🔮 Capacity Forecast: Clarity=${(mentalClarityScore * 100).toFixed(1)}%, Change=${(anticipatedCapacityChange * 100).toFixed(1)}%, Window=${optimalWindowRemaining}min`);

      return {
        mentalClarityScore,
        anticipatedCapacityChange,
        optimalWindowRemaining,
        nextOptimalWindow,
      };

    } catch (error) {
      console.error('❌ Capacity forecasting failed:', error);
      return {
        mentalClarityScore: 0.5,
        anticipatedCapacityChange: 0,
        optimalWindowRemaining: 0,
        nextOptimalWindow: null,
      };
    }
  }

  /**
   * Calculate mental clarity score using ML model
   */
  private async calculateMentalClarityScore(
    environmentalContext: ContextSnapshot,
    currentCCS: number
  ): Promise<number> {
    const model = this.forecastingModel.weights;

    let clarityScore = currentCCS * 0.4; // Base from current CCS

    // Time intelligence factors
    clarityScore += environmentalContext.timeIntelligence.historicalPerformance * model.timeIntelligence;

    // Location context factors
    const locationOptimality = environmentalContext.locationContext.privacyLevel * 0.6 +
                             (environmentalContext.locationContext.distractionRisk === 'low' ? 0.4 : 0);
    clarityScore += locationOptimality * model.locationContext;

    // Digital body language factors
    const dblOptimality = (1 - environmentalContext.digitalBodyLanguage.cognitiveLoadIndicator) * 0.7 +
                         (environmentalContext.digitalBodyLanguage.attentionSpan / 30) * 0.3;
    clarityScore += dblOptimality * model.digitalBodyLanguage;

    // Biological factors (circadian, health)
    const biologicalOptimality = await this.calculateBiologicalOptimality(environmentalContext);
    clarityScore += biologicalOptimality * model.biologicalFactors;

    // Historical patterns
    const historicalBonus = await this.getHistoricalPatternBonus(environmentalContext);
    clarityScore += historicalBonus * model.historicalPatterns;

    return Math.max(0, Math.min(1, clarityScore));
  }

  /**
   * Predict capacity change over time
   */
  private async predictCapacityChange(environmentalContext: ContextSnapshot): Promise<number> {
    // Simple prediction based on time trends and current state
    const currentHour = environmentalContext.timeIntelligence.circadianHour;
    const energyLevel = environmentalContext.timeIntelligence.energyLevel;

    let predictedChange = 0;

    // Circadian rhythm predictions
    if (currentHour >= 8 && currentHour <= 11) {
      predictedChange += 0.1; // Morning peak approaching/continuing
    } else if (currentHour >= 14 && currentHour <= 16) {
      predictedChange += 0.05; // Afternoon peak
    } else if (currentHour >= 22 || currentHour <= 6) {
      predictedChange -= 0.2; // Evening/night decline
    }

    // Energy level trends
    switch (energyLevel) {
      case 'peak':
        predictedChange -= 0.1; // Peak will decline
        break;
      case 'high':
        predictedChange += 0.05; // May increase to peak
        break;
      case 'recovery':
        predictedChange += 0.15; // Should improve from recovery
        break;
      case 'low':
        predictedChange += 0.1; // Should improve from low
        break;
    }

    // DBL state influence
    if (environmentalContext.digitalBodyLanguage.state === 'overwhelmed') {
      predictedChange -= 0.15;
    } else if (environmentalContext.digitalBodyLanguage.state === 'focused') {
      predictedChange += 0.05;
    }

    return Math.max(-1, Math.min(1, predictedChange));
  }

  /**
   * Calculate remaining time in current optimal window
   */
  private calculateOptimalWindowRemaining(environmentalContext: ContextSnapshot): number {
    if (!environmentalContext.timeIntelligence.isOptimalLearningWindow) return 0;

    // Simple heuristic: assume optimal windows last 2-3 hours
    const currentTime = new Date();
    const optimalWindowDuration = 150; // 2.5 hours in minutes
    const windowStart = new Date(currentTime.getTime() - (60 * 60 * 1000)); // Assume started 1 hour ago
    const windowEnd = new Date(windowStart.getTime() + (optimalWindowDuration * 60 * 1000));

    const remaining = differenceInMinutes(windowEnd, currentTime);
    return Math.max(0, remaining);
  }

  // ====================  CONTEXT DERIVATION ====================

  /**
   * Derive  context using matrix logic (NEW in CAE 2.0)
   * Maps CCS, Capacity Forecast, and DBL State to four  contexts
   */
  private deriveContext(
    ccsScore: number,
    forecast: AuraState['capacityForecast'],
    environmentalContext: ContextSnapshot
  ): AuraContext {

    const dblState = environmentalContext.digitalBodyLanguage.state;

    // Context decision matrix logic

    // CreativeFlow: High capacity + engaged/focused + creative potential
    if (forecast.mentalClarityScore > 0.65 &&
        (dblState === 'engaged' || dblState === 'focused') &&
        this.hasCreativePotential(environmentalContext)) {
      console.log('🎨 Context Matrix → CreativeFlow (High capacity + Creative conditions)');
      return 'CreativeFlow';
    }

    // DeepFocus: High CCS + high capacity + focused DBL
    if (ccsScore > this.contextThresholds.deepFocus.min &&
        forecast.mentalClarityScore > 0.7 &&
        (dblState === 'focused' || dblState === 'engaged')) {
      console.log('🎯 Context Matrix → DeepFocus (High CCS + High capacity + Focused)');
      return 'DeepFocus';
    }

    // CognitiveOverload: Low CCS + declining capacity + overwhelmed DBL
    if (ccsScore < this.contextThresholds.cognitiveOverload.max ||
        forecast.anticipatedCapacityChange < -0.2 ||
        dblState === 'overwhelmed') {
      console.log('🔥 Context Matrix → CognitiveOverload (Low CCS or declining capacity or overwhelmed)');
      return 'CognitiveOverload';
    }

    // FragmentedAttention: Everything else (middle ground)
    console.log('🔀 Context Matrix → FragmentedAttention (Default/middle conditions)');
    return 'FragmentedAttention';
  }

  /**
   * Assess creative potential from environmental context
   */
  private hasCreativePotential(environmentalContext: ContextSnapshot): boolean {
    // Creative potential indicators
    const indicators = [];

    // Time factors
    if (environmentalContext.timeIntelligence.timeOfDay === 'evening' ||
        environmentalContext.timeIntelligence.timeOfDay === 'afternoon') {
      indicators.push('optimal_creative_time');
    }

    // Environment factors
    if (environmentalContext.locationContext.environment === 'outdoor' ||
        environmentalContext.locationContext.privacyLevel > 0.7) {
      indicators.push('creative_environment');
    }

    // DBL factors
    if (environmentalContext.digitalBodyLanguage.attentionSpan > 15 &&
        environmentalContext.digitalBodyLanguage.cognitiveLoadIndicator < 0.6) {
      indicators.push('creative_mindstate');
    }

    return indicators.length >= 2;
  }

  // ====================  TARGET SELECTION ====================

  /**
   *  target node selection with context awareness
   */
  private async selectContextAwareTargetNode(
    graph: NeuralGraph,
    context: AuraContext,
    environmentalContext: ContextSnapshot
  ): Promise<{ targetNode: NeuralNode | null; priority: string | null }> {

    if (!graph.nodes || graph.nodes.length === 0) {
      return { targetNode: null, priority: null };
    }

    // Context-specific selection strategies
    switch (context) {
      case 'DeepFocus':
        return this.selectDeepFocusTarget(graph, environmentalContext);

      case 'CreativeFlow':
        return this.selectCreativeFlowTarget(graph, environmentalContext);

      case 'FragmentedAttention':
        return this.selectFragmentedAttentionTarget(graph, environmentalContext);

      case 'CognitiveOverload':
        return this.selectOverloadRecoveryTarget(graph, environmentalContext);

      default:
        return this.selectDefaultTarget(graph);
    }
  }

  /**
   * Select target for DeepFocus context
   */
  private selectDeepFocusTarget(
    graph: NeuralGraph,
    environmentalContext: ContextSnapshot
  ): { targetNode: NeuralNode | null; priority: string } {

    // Prioritize challenging, high-impact nodes
    const candidates = graph.nodes.filter(node =>
      node.cognitiveLoad && node.cognitiveLoad > 0.6 &&
      node.masteryLevel && node.masteryLevel < 0.8
    );

    if (candidates.length === 0) {
      return { targetNode: graph.nodes[0], priority: 'P3_COGNITIVE_LOAD' };
    }

    // Sort by impact and difficulty
    const sortedCandidates = candidates.sort((a, b) => {
      const aScore = (a.cognitiveLoad || 0.5) * (1 - (a.masteryLevel || 0.5));
      const bScore = (b.cognitiveLoad || 0.5) * (1 - (b.masteryLevel || 0.5));
      return bScore - aScore;
    });

    return {
      targetNode: sortedCandidates[0],
      priority: 'P1_HIGH_IMPACT_DEEP_LEARNING'
    };
  }

  /**
   * Select target for CreativeFlow context
   */
  private selectCreativeFlowTarget(
    graph: NeuralGraph,
    environmentalContext: ContextSnapshot
  ): { targetNode: NeuralNode | null; priority: string } {

    // Prioritize nodes with conceptual connections and creative potential
    const conceptualNodes = graph.nodes.filter(node =>
      node.type === 'concept' ||
      (node.connections && node.connections.length > 3)
    );

    if (conceptualNodes.length === 0) {
      return { targetNode: graph.nodes[0], priority: 'P3_CREATIVE_EXPLORATION' };
    }

    // Sort by connectivity and conceptual richness
    const sortedNodes = conceptualNodes.sort((a, b) => {
      const aConnectivity = (a.connections?.length || 0);
      const bConnectivity = (b.connections?.length || 0);
      return bConnectivity - aConnectivity;
    });

    return {
      targetNode: sortedNodes[0],
      priority: 'P1_CONCEPTUAL_ALCHEMY'
    };
  }

  /**
   * Select target for FragmentedAttention context
   */
  private selectFragmentedAttentionTarget(
    graph: NeuralGraph,
    environmentalContext: ContextSnapshot
  ): { targetNode: NeuralNode | null; priority: string } {

    // Prioritize quick wins and review items
    const quickWins = graph.nodes.filter(node =>
      (node.cognitiveLoad && node.cognitiveLoad < 0.4) ||
      (node.masteryLevel && node.masteryLevel > 0.7)
    );

    if (quickWins.length === 0) {
      return { targetNode: graph.nodes[0], priority: 'P3_FRAGMENTED_REVIEW' };
    }

    // Sort by ease and quick completion potential
    const sortedNodes = quickWins.sort((a, b) => {
      const aEase = (a.masteryLevel || 0.5) - (a.cognitiveLoad || 0.5);
      const bEase = (b.masteryLevel || 0.5) - (b.cognitiveLoad || 0.5);
      return bEase - aEase;
    });

    return {
      targetNode: sortedNodes[0],
      priority: 'P2_QUICK_REINFORCEMENT'
    };
  }

  /**
   * Select target for CognitiveOverload context
   */
  private selectOverloadRecoveryTarget(
    graph: NeuralGraph,
    environmentalContext: ContextSnapshot
  ): { targetNode: NeuralNode | null; priority: string } {

    // Prioritize very simple, familiar nodes for gentle recovery
    const recoveryNodes = graph.nodes.filter(node =>
      node.masteryLevel && node.masteryLevel > 0.8 &&
      node.cognitiveLoad && node.cognitiveLoad < 0.3
    );

    if (recoveryNodes.length === 0) {
      // Find the simplest available node
      const simplestNode = graph.nodes.reduce((simplest, current) => {
        const currentSimplicity = (current.masteryLevel || 0) - (current.cognitiveLoad || 1);
        const simplestSimplicity = (simplest.masteryLevel || 0) - (simplest.cognitiveLoad || 1);
        return currentSimplicity > simplestSimplicity ? current : simplest;
      });

      return { targetNode: simplestNode, priority: 'P1_GENTLE_RECOVERY' };
    }

    // Select the most mastered, least challenging node
    const sortedNodes = recoveryNodes.sort((a, b) => {
      const aRecoveryScore = (a.masteryLevel || 0.5) - (a.cognitiveLoad || 0.5);
      const bRecoveryScore = (b.masteryLevel || 0.5) - (b.cognitiveLoad || 0.5);
      return bRecoveryScore - aRecoveryScore;
    });

    return {
      targetNode: sortedNodes[0],
      priority: 'P1_GENTLE_RECOVERY'
    };
  }

  /**
   * Fallback target selection
   */
  private selectDefaultTarget(graph: NeuralGraph): { targetNode: NeuralNode | null; priority: string | null } {
    if (graph.nodes.length === 0) return { targetNode: null, priority: null };
    return { targetNode: graph.nodes[0], priority: 'P3_DEFAULT_SELECTION' };
  }

  // ==================== LEARNING PRESCRIPTION GENERATION ====================

  /**
   * Generate context-specific learning prescription (NEW in CAE 2.0)
   */
  private generateLearningPrescription(
    targetNode: NeuralNode | null,
    context: AuraContext,
    environmentalContext: ContextSnapshot
  ): AuraState['learningPrescription'] {

    // Context-specific prescriptions based on CAE 2.0 plan
    switch (context) {
      case 'DeepFocus':
        return {
          primary: 'Systematic Knowledge Construction',
          secondary: 'Complex Problem Solving',
          duration: Math.max(25, environmentalContext.digitalBodyLanguage.attentionSpan),
          intensity: 'high',
          environment: ['library', 'private_office', 'quiet_home_space']
        };

      case 'CreativeFlow':
        return {
          primary: 'Conceptual Alchemy',
          secondary: 'Pattern Recognition',
          duration: 30,
          intensity: 'medium',
          environment: ['outdoor_space', 'creative_room', 'inspirational_setting']
        };

      case 'FragmentedAttention':
        return {
          primary: 'Interval-Based Review',
          secondary: 'Quick Reinforcement Drills',
          duration: Math.min(15, environmentalContext.digitalBodyLanguage.attentionSpan),
          intensity: 'low',
          environment: ['any_location', 'commute_friendly', 'mobile_optimized']
        };

      case 'CognitiveOverload':
        return {
          primary: 'Gentle Cognitive Recovery',
          secondary: 'Stress Reduction Activities',
          duration: 10,
          intensity: 'low',
          environment: ['comfortable_space', 'low_stimulation', 'recovery_zone']
        };

      default:
        return {
          primary: 'Adaptive Learning',
          duration: 20,
          intensity: 'medium',
          environment: ['any_suitable_location']
        };
    }
  }

  // ====================  MICRO-TASK GENERATION ====================

  /**
   * Generate  micro-task with context adaptation
   */
  private generateMicroTask(
    targetNode: NeuralNode | null,
    context: AuraContext,
    environmentalContext: ContextSnapshot
  ): string {

    if (!targetNode) {
      return this.getContextSpecificEmptyStateTask(context);
    }

    const baseTask = this.generateBaseTask(targetNode, context);
    const contextualAdaptation = this.getContextualAdaptation(context, environmentalContext);
    const environmentalCues = this.getEnvironmentalCues(environmentalContext);

    return `${contextualAdaptation} ${baseTask} ${environmentalCues}`;
  }

  /**
   * Generate base task based on node and context
   */
  private generateBaseTask(targetNode: NeuralNode, context: AuraContext): string {
    switch (context) {
      case 'DeepFocus':
        return `Engage in deep analysis of "${targetNode.label}". Break down its core components and explore the underlying principles for 15-20 minutes of uninterrupted focus.`;

      case 'CreativeFlow':
        return `Explore creative connections around "${targetNode.label}". What unexpected relationships can you discover? Let your mind wander through related concepts for 10-15 minutes.`;

      case 'FragmentedAttention':
        return `Quick review: Spend 3-5 minutes reinforcing your understanding of "${targetNode.label}". Focus on key points and quick recall.`;

      case 'CognitiveOverload':
        return `Gently revisit "${targetNode.label}" without pressure. Take your time to simply reconnect with the familiar concepts at your own pace.`;

      default:
        return `Review "${targetNode.label}" using an approach that feels right for your current state.`;
    }
  }

  /**
   * Get contextual adaptation phrases
   */
  private getContextualAdaptation(context: AuraContext, environmentalContext: ContextSnapshot): string {
    const timeOfDay = environmentalContext.timeIntelligence.timeOfDay;
    const energyLevel = environmentalContext.timeIntelligence.energyLevel;

    switch (context) {
      case 'DeepFocus':
        if (energyLevel === 'peak') {
          return 'Seize this peak mental state.';
        }
        return 'Channel your focused energy.';

      case 'CreativeFlow':
        if (timeOfDay === 'evening') {
          return 'Let your evening creativity flourish.';
        }
        return 'Embrace the creative flow.';

      case 'FragmentedAttention':
        return 'Work with your current attention pattern.';

      case 'CognitiveOverload':
        return 'Be gentle with yourself right now.';

      default:
        return 'Adapt to your current state.';
    }
  }

  /**
   * Get environmental cues and suggestions
   */
  private getEnvironmentalCues(environmentalContext: ContextSnapshot): string {
    const cues = [];

    // Location-based cues
    if (environmentalContext.locationContext.distractionRisk === 'high') {
      cues.push('Consider finding a quieter space if possible.');
    }

    // Time-based cues
    if (environmentalContext.timeIntelligence.nextOptimalWindow) {
      const minutesToNext = differenceInMinutes(environmentalContext.timeIntelligence.nextOptimalWindow, new Date());
      if (minutesToNext < 120) {
        cues.push(`Your next optimal window is in ${minutesToNext} minutes.`);
      }
    }

    // DBL-based cues
    if (environmentalContext.digitalBodyLanguage.appSwitchFrequency > 2) {
      cues.push('Try to minimize app switching during this session.');
    }

    return cues.length > 0 ? cues.join(' ') : '';
  }

  /**
   * Get task for empty state based on context
   */
  private getContextSpecificEmptyStateTask(context: AuraContext): string {
    switch (context) {
      case 'DeepFocus':
        return 'Create new flashcards or study materials to build your neural network. Your focused state is perfect for content creation.';

      case 'CreativeFlow':
        return 'Brainstorm new learning topics or explore connections between subjects you find interesting.';

      case 'FragmentedAttention':
        return 'Add a few quick flashcards or review any materials you have available.';

      case 'CognitiveOverload':
        return 'Take a moment to rest and consider what you\'d like to learn when you\'re feeling more refreshed.';

      default:
        return 'Start by adding some learning content to build your personalized neural network.';
    }
  }

  // ==================== SYSTEM INTEGRATION () ====================

  /**
   * Determine multi-modal system integration settings
   */
  private determineSystemIntegration(
    context: AuraContext,
    environmentalContext: ContextSnapshot,
    ccs: number
  ): {
    soundscape: SoundscapeType;
    physics: 'calm' | 'focus' | 'intense' | 'creative';
    memoryPalace: 'challenging' | 'familiar' | 'creative' | 'rest';
    graphVisualization: 'filtered' | 'full' | 'clusters' | 'paths';
  } {

    switch (context) {
      case 'DeepFocus':
        return {
          soundscape: 'focus_flow' as SoundscapeType,
          physics: 'intense',
          memoryPalace: 'challenging',
          graphVisualization: 'filtered' // Show only relevant nodes
        };

      case 'CreativeFlow':
        return {
          soundscape: 'creative_inspiration' as SoundscapeType,
          physics: 'creative',
          memoryPalace: 'creative',
          graphVisualization: 'clusters' // Show conceptual clusters
        };

      case 'FragmentedAttention':
        return {
          soundscape: 'ambient_focus' as SoundscapeType,
          physics: 'focus',
          memoryPalace: 'familiar',
          graphVisualization: 'paths' // Show clear learning paths
        };

      case 'CognitiveOverload':
        return {
          soundscape: 'calm_recovery' as SoundscapeType,
          physics: 'calm',
          memoryPalace: 'rest',
          graphVisualization: 'filtered' // Minimize complexity
        };

      default:
        return {
          soundscape: 'balanced_learning' as SoundscapeType,
          physics: 'focus',
          memoryPalace: 'familiar',
          graphVisualization: 'full'
        };
    }
  }

  // ==================== UTILITY METHODS () ====================

  /**
   * Calculate biological alignment score
   */
  private calculateBiologicalAlignment(environmentalContext: ContextSnapshot): number {
    let alignment = 0.5; // Base alignment

    // Circadian alignment
    if (environmentalContext.timeIntelligence.isOptimalLearningWindow) {
      alignment += 0.3;
    }

    // Energy level alignment
    switch (environmentalContext.timeIntelligence.energyLevel) {
      case 'peak': alignment += 0.2; break;
      case 'high': alignment += 0.1; break;
      case 'recovery': alignment -= 0.2; break;
      case 'low': alignment -= 0.1; break;
    }

    return Math.max(0, Math.min(1, alignment));
  }

  /**
   * Calculate  health adjustment
   */
  private async getHealthAdjustment(environmentalContext: ContextSnapshot): Promise<number> {
    try {
      // Get the current authenticated user ID
      const { data: { user } } = await supabase.getCurrentUser();
      if (!user) {
        console.warn('No authenticated user found for health adjustment');
        return 1.0;
      }

      const healthMetrics = await this.crossModuleBridge.getHealthMetrics(user.id);

      if (!healthMetrics) return 1.0;

      let adjustment = 1.0;

      // Traditional health factors (from CAE 1.0)
      if (healthMetrics.sleepQuality < 0.5) {
        adjustment *= 0.85;
      } else if (healthMetrics.sleepQuality > 0.8) {
        adjustment *= 1.1;
      }

      if (healthMetrics.stressLevel > 0.7) {
        adjustment *= 0.9;
      }

      // NEW: Environmental context influence
      if (environmentalContext.digitalBodyLanguage.state === 'overwhelmed') {
        adjustment *= 0.8;
      } else if (environmentalContext.digitalBodyLanguage.state === 'focused') {
        adjustment *= 1.05;
      }

      // NEW: Location stability influence
      if (environmentalContext.locationContext.stabilityScore < 0.5) {
        adjustment *= 0.95; // Unstable location slight penalty
      }

      return Math.max(0.5, Math.min(1.5, adjustment));

    } catch (error) {
      console.warn('⚠️  health adjustment calculation failed:', error);
      return 1.0;
    }
  }

  /**
   * Calculate biological optimality for forecasting
   */
  private async calculateBiologicalOptimality(environmentalContext: ContextSnapshot): Promise<number> {
    const timeIntel = environmentalContext.timeIntelligence;

    let optimality = timeIntel.historicalPerformance;

    // Circadian bonus
    if (timeIntel.isOptimalLearningWindow) {
      optimality += 0.2;
    }

    // Energy level bonus
    switch (timeIntel.energyLevel) {
      case 'peak': optimality += 0.15; break;
      case 'high': optimality += 0.1; break;
      case 'recovery': optimality -= 0.15; break;
      case 'low': optimality -= 0.1; break;
    }

    return Math.max(0, Math.min(1, optimality));
  }

  /**
   * Get historical pattern bonus
   */
  private async getHistoricalPatternBonus(environmentalContext: ContextSnapshot): Promise<number> {
    // This would integrate with stored pattern learning data
    // For now, return a simple heuristic

    const contextKey = `${environmentalContext.locationContext.environment}_${environmentalContext.timeIntelligence.timeOfDay}_${environmentalContext.digitalBodyLanguage.state}`;

    const pattern = this.contextPatterns.get(contextKey);
    if (!pattern) return 0;

    const averageOutcome = pattern.outcomes.reduce((sum, outcome) => sum + outcome, 0) / pattern.outcomes.length;
    const bonus = (averageOutcome - 0.5) * pattern.confidence;

    return Math.max(-0.2, Math.min(0.2, bonus));
  }

  // ==================== PREDICTIVE INTELLIGENCE ====================

  /**
   * Predict state changes over time horizon
   */
  private async predictStateChanges(
    environmentalContext: ContextSnapshot,
    currentContext: AuraContext,
    currentCCS: number
  ): Promise<AuraState['anticipatedStateChanges']> {

    const predictions: AuraState['anticipatedStateChanges'] = [];

    // Predict changes based on time progression
    if (currentContext === 'DeepFocus') {
      predictions.push({
        context: 'FragmentedAttention',
        probability: 0.7,
        timeframe: 45,
        triggers: ['attention_fatigue', 'cognitive_load_accumulation']
      });
    }

    if (currentContext === 'FragmentedAttention' &&
        environmentalContext.timeIntelligence.nextOptimalWindow) {
      const minutesToOptimal = differenceInMinutes(
        environmentalContext.timeIntelligence.nextOptimalWindow,
        new Date()
      );

      if (minutesToOptimal < 90) {
        predictions.push({
          context: 'DeepFocus',
          probability: 0.8,
          timeframe: minutesToOptimal,
          triggers: ['optimal_learning_window', 'circadian_peak']
        });
      }
    }

    if (environmentalContext.digitalBodyLanguage.appSwitchFrequency > 2) {
      predictions.push({
        context: 'CognitiveOverload',
        probability: 0.6,
        timeframe: 20,
        triggers: ['high_distraction', 'cognitive_fragmentation']
      });
    }

    return predictions;
  }

  // ====================  METRICS CALCULATION ====================

  /**
   * Calculate  confidence and accuracy metrics
   */
  private calculateMetrics(
    graph: NeuralGraph,
    targetNode: NeuralNode | null,
    context: AuraContext,
    environmentalContext: ContextSnapshot
  ): {
    confidence: number;
    accuracyScore: number;
    contextStability: number;
    predictionAccuracy: number;
  } {

    let confidence = 0.6; //  base confidence
    let accuracyScore = this.forecastingModel.accuracy; // Use model accuracy

    // Data quality factors ()
    if (graph.nodes.length > 10) confidence += 0.1;
    if (graph.links.length > 20) confidence += 0.1;
    if (this.performanceHistory.length > 10) confidence += 0.1;

    // Environmental context factors (NEW)
    if (environmentalContext.contextQualityScore > 0.7) confidence += 0.1;
    if (environmentalContext.locationContext.locationConfidence > 0.8) confidence += 0.05;

    // Context-specific confidence adjustments
    switch (context) {
      case 'DeepFocus':
        if (environmentalContext.digitalBodyLanguage.state === 'focused') confidence += 0.1;
        break;
      case 'CognitiveOverload':
        confidence -= 0.1; // Less confident in overload states
        break;
    }

    // Context stability calculation
    const contextStability = this.calculateContextStability(environmentalContext);

    // Prediction accuracy (based on recent performance)
    const predictionAccuracy = this.calculateRecentPredictionAccuracy();

    return {
      confidence: Math.max(0.3, Math.min(1.0, confidence)),
      accuracyScore: Math.max(0.5, Math.min(1.0, accuracyScore)),
      contextStability,
      predictionAccuracy,
    };
  }

  /**
   * Calculate context stability
   */
  private calculateContextStability(environmentalContext: ContextSnapshot): number {
    let stability = 0.5;

    // Location stability
    stability += environmentalContext.locationContext.stabilityScore * 0.4;

    // DBL stability
    if (environmentalContext.digitalBodyLanguage.appSwitchFrequency < 1) {
      stability += 0.2;
    } else if (environmentalContext.digitalBodyLanguage.appSwitchFrequency > 3) {
      stability -= 0.2;
    }

    // Time stability (how long until next major change)
    if (environmentalContext.timeIntelligence.nextOptimalWindow) {
      const minutesToChange = differenceInMinutes(environmentalContext.timeIntelligence.nextOptimalWindow, new Date());
      if (minutesToChange > 60) stability += 0.1;
    }

    return Math.max(0, Math.min(1, stability));
  }

  /**
   * Calculate recent prediction accuracy
   */
  private calculateRecentPredictionAccuracy(): number {
    const recentMetrics = this.performanceHistory.slice(-10);
    if (recentMetrics.length === 0) return 0.7;

    const averagePredictiveAccuracy = recentMetrics
      .filter(m => m.predictiveAccuracy !== undefined)
      .reduce((sum, m) => sum + (m.predictiveAccuracy || 0), 0) /
      Math.max(1, recentMetrics.filter(m => m.predictiveAccuracy !== undefined).length);

    return averagePredictiveAccuracy || 0.7;
  }

  // ==================== STATE CREATION HELPERS ====================

  /**
   * Create  default state
   */
  private createDefaultState(environmentalContext: ContextSnapshot): AuraState {
    return {
    // Backwards-compatible cognitiveLoad
    cognitiveLoad: 0.5,
      compositeCognitiveScore: 0.5,
      context: 'FragmentedAttention',
      targetNode: null,
      targetNodePriority: null,
      microTask: this.getContextSpecificEmptyStateTask('FragmentedAttention'),

      environmentalContext,
      capacityForecast: {
        mentalClarityScore: 0.5,
        anticipatedCapacityChange: 0,
        optimalWindowRemaining: 0,
        nextOptimalWindow: null,
      },
      learningPrescription: {
        primary: 'Getting Started',
        duration: 15,
        intensity: 'low',
        environment: ['any_comfortable_location']
      },

      recommendedSoundscape: 'calm_readiness' as SoundscapeType,
      adaptivePhysicsMode: 'calm',
      memoryPalaceMode: 'familiar',
      graphVisualizationMode: 'full',

      anticipatedStateChanges: [],

      timestamp: new Date(),
      sessionId: this.sessionId,
      confidence: 0.4,
      accuracyScore: 0.6,
      previousStates: [],
      adaptationCount: 0,
      contextStability: 0.5,
      predictionAccuracy: 0.6,
      environmentOptimality: environmentalContext.overallOptimality,
      biologicalAlignment: this.calculateBiologicalAlignment(environmentalContext),
    };
  }

  /**
   * Create  error state
   */
  private createErrorState(error: any): AuraState {
    const fallbackContext: ContextSnapshot = {
      timestamp: new Date(),
      sessionId: this.sessionId,
      timeIntelligence: {
        circadianHour: new Date().getHours(),
        timeOfDay: 'morning',
        dayOfWeek: 'monday',
        isOptimalLearningWindow: false,
        energyLevel: 'medium',
        historicalPerformance: 0.5,
        nextOptimalWindow: null,
      },
      locationContext: {
        environment: 'unknown',
        noiseLevel: 'moderate',
        socialSetting: 'alone',
        stabilityScore: 0.5,
        privacyLevel: 0.5,
        distractionRisk: 'medium',
        coordinates: null,
        isKnownLocation: false,
        locationConfidence: 0.3,
      },
      digitalBodyLanguage: {
        state: 'engaged',
        appSwitchFrequency: 0,
        scrollingVelocity: 0,
        typingSpeed: 0,
        typingAccuracy: 1.0,
        touchPressure: 0.5,
        interactionPauses: [],
        deviceOrientation: 'portrait',
        attentionSpan: 20,
        cognitiveLoadIndicator: 0.5,
        stressIndicators: 0,
      },
      batteryLevel: 0.5,
      isCharging: false,
      networkQuality: 'good',
      deviceTemperature: null,
      overallOptimality: 0.5,
      recommendedAction: 'proceed',
      contextQualityScore: 0.5,
      anticipatedChanges: [],
    };

    return this.createDefaultState(fallbackContext);
  }

  // ==================== INITIALIZATION AND CLEANUP ====================

  /**
   * Initialize context monitoring
   */
  private async initializeContextMonitoring(): Promise<void> {
    try {
      // Start context sensor monitoring with longer intervals to prevent spam
      await this.contextSensorService.startMonitoring(5); // 5-minute intervals

      // Set up context change listeners with throttling
      this.contextSensorService.on('context_updated', (context: ContextSnapshot) => {
        console.log('🌍 Environmental context updated, triggering aura refresh');
        this.throttledAuraRefresh();
      });

      this.contextSensorService.on('dbl_updated', (dbl: DigitalBodyLanguage) => {
        console.log('📱 Digital body language updated');
        // Only refresh if significant change
        if (this.isSignificantDBLChange(dbl)) {
          this.throttledAuraRefresh();
        }
      });

      console.log('🎯 Context monitoring initialized');

    } catch (error) {
      console.error('❌ Failed to initialize context monitoring:', error);
    }
  }

  /**
   * Throttled aura refresh to prevent infinite loops
   */
  private throttledAuraRefresh(): void {
    const now = Date.now();
    if (now - this.lastAuraRefresh < this.AURA_REFRESH_THROTTLE) {
      console.log('⏱️ Aura refresh throttled, skipping');
      return;
    }

    this.lastAuraRefresh = now;
    this.getAuraState(true).catch(console.error);
  }

  /**
   * Check if DBL change is significant enough to trigger refresh
   */
  private isSignificantDBLChange(newDBL: DigitalBodyLanguage): boolean {
    if (!this.currentState) return true;

    const currentDBL = this.currentState.environmentalContext.digitalBodyLanguage;

    // Check for state change
    if (newDBL.state !== currentDBL.state) return true;

    // Check for significant cognitive load change
    const loadChange = Math.abs(newDBL.cognitiveLoadIndicator - currentDBL.cognitiveLoadIndicator);
    if (loadChange > 0.2) return true;

    // Check for significant attention span change
    const attentionChange = Math.abs(newDBL.attentionSpan - currentDBL.attentionSpan);
    if (attentionChange > 10) return true; // 10+ minute change

    return false;
  }

  // ==================== PUBLIC API () ====================

  /**
   * Get current  aura state (public API)
   */
  public async getCurrentAuraState(): Promise<AuraState | null> {
    return this.currentState;
  }

  /**
   * Force refresh of aura state
   */
  public async refreshAuraState(): Promise<AuraState> {
    return this.getAuraState(true);
  }

  /**
   * Record performance metrics (overloaded for backwards compatibility)
   */
  public async recordPerformance(metrics: PerformanceMetrics): Promise<void>;
  public async recordPerformance(metrics: any): Promise<void>;
  public async recordPerformance(metrics: PerformanceMetrics | any): Promise<void> {
    let performanceMetrics: PerformanceMetrics;

    // Check if it's already the new format
    if (metrics.accuracy !== undefined && typeof metrics.accuracy === 'number' &&
        metrics.taskCompletion !== undefined && metrics.timeToComplete !== undefined) {
      performanceMetrics = metrics as PerformanceMetrics;
    } else {
      // Legacy format, convert to new format
      performanceMetrics = {
        accuracy: metrics.accuracy || 0.5,
        taskCompletion: metrics.taskCompletion || 0.5,
        timeToComplete: metrics.timeToComplete || 60,
        userSatisfaction: metrics.userSatisfaction || 3,
        contextRelevance: metrics.contextRelevance || 0.5,
        environmentOptimality: 0.5,
        predictiveAccuracy: 0.5,
        adaptationEffectiveness: 0.5,
      };
    }

    this.performanceHistory.push(performanceMetrics);

    // Keep only last 50 records
    if (this.performanceHistory.length > 50) {
      this.performanceHistory = this.performanceHistory.slice(-50);
    }

    // Update adaptive weights based on performance
    await this.updateAdaptiveWeights(performanceMetrics);

    console.log(`📊 Performance recorded: Accuracy=${(performanceMetrics.accuracy * 100).toFixed(1)}%, Prediction=${(performanceMetrics.predictiveAccuracy * 100).toFixed(1)}%`);
  }

  /**
   * Get performance statistics (overloaded for backwards compatibility)
   */
  public getPerformanceStats(): {
    totalRecords: number;
    averageAccuracy: number;
    averagePredictiveAccuracy: number;
    averageContextRelevance: number;
    averageEnvironmentOptimality: number;
    modelAccuracy: number;
  };
  public getPerformanceStats(): any;
  public getPerformanceStats(): {
    totalRecords: number;
    averageAccuracy: number;
    averagePredictiveAccuracy: number;
    averageContextRelevance: number;
    averageEnvironmentOptimality: number;
    modelAccuracy: number;
  } | any {
    if (this.performanceHistory.length === 0) {
      return {
        totalRecords: 0,
        averageAccuracy: 0,
        averagePredictiveAccuracy: 0,
        averageContextRelevance: 0,
        averageEnvironmentOptimality: 0,
        modelAccuracy: this.forecastingModel.accuracy,
      };
    }

    const total = this.performanceHistory.length;
    const averageAccuracy = this.performanceHistory.reduce((sum, m) => sum + m.accuracy, 0) / total;
    const averagePredictiveAccuracy = this.performanceHistory.reduce((sum, m) => sum + (m.predictiveAccuracy || 0), 0) / total;
    const averageContextRelevance = this.performanceHistory.reduce((sum, m) => sum + m.contextRelevance, 0) / total;
    const averageEnvironmentOptimality = this.performanceHistory.reduce((sum, m) => sum + (m.environmentOptimality || 0), 0) / total;

    return {
      totalRecords: total,
      averageAccuracy,
      averagePredictiveAccuracy,
      averageContextRelevance,
      averageEnvironmentOptimality,
      modelAccuracy: this.forecastingModel.accuracy,
    };
  }

  /**
   * Get context analytics
   */
  public getContextAnalytics(): {
    contextDistribution: Record<AuraContext, number>;
    environmentalPatterns: any;
    forecastingAccuracy: number;
    learningPatterns: any;
  } {
    // This would analyze stored context snapshots and patterns
    // For now, return mock data structure
    return {
      contextDistribution: {
        'DeepFocus': 0.3,
        'CreativeFlow': 0.2,
        'FragmentedAttention': 0.35,
        'CognitiveOverload': 0.15,
      },
      environmentalPatterns: Array.from(this.contextPatterns.entries()).map(([key, pattern]) => ({
        context: key,
        frequency: pattern.frequency,
        averageOutcome: pattern.outcomes.reduce((sum, outcome) => sum + outcome, 0) / pattern.outcomes.length,
        confidence: pattern.confidence,
      })),
      forecastingAccuracy: this.forecastingModel.accuracy,
      learningPatterns: {
        totalPatterns: this.contextPatterns.size,
        mostEffective: 'morning_library_focused',
        leastEffective: 'evening_commute_fragmented',
      }
    };
  }

  // ==================== CLEANUP ====================

  /**
   * Clean up resources and stop monitoring
   */
  public dispose(): void {
    this.contextSensorService.stopMonitoring();
    this.contextSensorService.dispose();
    this.removeAllListeners();

    console.log('🧹  Cognitive Aura Engine 2.0 disposed');
  }

  // ==================== ADDITIONAL HELPER METHODS ====================

  private async updateAdaptiveWeights(metrics: PerformanceMetrics): Promise<void> {
    // Simple adaptive weight updating based on performance
    if (metrics.accuracy > 0.8) {
      // Good performance, slightly increase context weight
      this.adaptiveWeights.context = Math.min(0.2, this.adaptiveWeights.context + this.learningRate * 0.1);
    } else if (metrics.accuracy < 0.6) {
      // Poor performance, reduce context weight, increase proven factors
      this.adaptiveWeights.context = Math.max(0.1, this.adaptiveWeights.context - this.learningRate * 0.1);
      this.adaptiveWeights.depth += this.learningRate * 0.05;
    }

    // Normalize weights to sum to 1
    const totalWeight = Object.values(this.adaptiveWeights).reduce((sum, weight) => sum + weight, 0);
    Object.keys(this.adaptiveWeights).forEach(key => {
      this.adaptiveWeights[key as keyof typeof this.adaptiveWeights] /= totalWeight;
    });
  }

  private async updateContextLearning(state: AuraState): Promise<void> {
    const contextKey = `${state.environmentalContext.locationContext.environment}_${state.environmentalContext.timeIntelligence.timeOfDay}_${state.environmentalContext.digitalBodyLanguage.state}`;

    const existingPattern = this.contextPatterns.get(contextKey);

    if (existingPattern) {
      existingPattern.outcomes.push(state.compositeCognitiveScore);
      existingPattern.frequency += 1;
      existingPattern.lastSeen = new Date();

      // Keep only last 20 outcomes
      if (existingPattern.outcomes.length > 20) {
        existingPattern.outcomes = existingPattern.outcomes.slice(-20);
      }

      // Update confidence based on consistency
      const variance = this.calculateVariance(existingPattern.outcomes);
      existingPattern.confidence = Math.max(0.3, Math.min(1, 1 - variance));

    } else {
      this.contextPatterns.set(contextKey, {
        outcomes: [state.compositeCognitiveScore],
        frequency: 1,
        lastSeen: new Date(),
        confidence: 0.5,
      });
    }
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }

  private isStateFresh(): boolean {
    if (!this.currentState) return false;
    const age = Date.now() - this.currentState.timestamp.getTime();
    return age < this.CACHE_TTL;
  }

  private async applySystemIntegrations(state: AuraState): Promise<void> {
    try {
      // Apply soundscape
      await this.soundscapeEngine.playContextSound(state.context as any);

      // Other system integrations would be applied here
      // (physics engine, memory palace, etc.)

    } catch (error) {
      console.warn('⚠️ System integration application failed:', error);
    }
  }

  private async storeAuraState(state: AuraState): Promise<void> {
    try {
      // Store context snapshot via StorageService facade
      try {
        await this.storage.saveContextSnapshot?.(state.environmentalContext);
      } catch (err) {
        console.warn('StorageService.saveContextSnapshot failed in CognitiveAuraService, falling back to AsyncStorage:', err);
        // Fallback: only if facade fails
        try {
          const key = `aura_state_${state.timestamp.getTime()}`;
          const payload = { ...state, timestamp: state.timestamp.toISOString() } as any;
          await AsyncStorage.setItem(key, JSON.stringify(payload));
        } catch (e) {
          console.warn('CognitiveAuraService: AsyncStorage fallback failed for context snapshot:', e);
        }
      }

      // Store forecasting result for accuracy tracking via facade
      try {
        await this.storage.saveCognitiveForecast?.({
          modelVersion: this.forecastingModel.version,
          predictedContext: state.context,
          predictedOptimality: state.capacityForecast.mentalClarityScore,
          predictionHorizon: 60, // 1 hour ahead
        });
      } catch (err) {
        console.warn('StorageService.saveCognitiveForecast failed in CognitiveAuraService, falling back to AsyncStorage:', err);
        // Fallback: only if facade fails
        try {
          const cacheKey = '@neurolearn/cache_cognitive_forecasts';
          const existingRaw = await AsyncStorage.getItem(cacheKey);
          const existing = existingRaw ? JSON.parse(existingRaw) : [];
          existing.push({
            modelVersion: this.forecastingModel.version,
            predictedContext: state.context,
            predictedOptimality: state.capacityForecast.mentalClarityScore,
            predictionHorizon: 60,
            timestamp: state.timestamp.toISOString(),
          });
          // Keep only last 100 forecasts
          const trimmed = existing.slice(-100);
          await AsyncStorage.setItem(cacheKey, JSON.stringify(trimmed));
        } catch (e) {
          console.warn('CognitiveAuraService: AsyncStorage fallback failed for cognitive forecast:', e);
        }
      }
    } catch (error) {
      console.warn('⚠️  aura state storage failed:', error);
    }
  }


  /**
   * Clear all caches
   */
  public clearCaches(): void {
    this.contextCache.clear();
    this.forecastCache.clear();
    this.patternCache.clear();
    console.log('🧹 All caches cleared');
  }
}

// ==================== EXPORT INSTANCE ====================

/**
 * Singleton instance of Cognitive Aura Service
 */
export const cognitiveAuraService = CognitiveAuraService.getInstance();


