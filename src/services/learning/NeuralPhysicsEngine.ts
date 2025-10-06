/**
 *  Neural Physics Engine 2.0 - Adaptive Physics for CAE 2.0
 *
 * This  physics engine integrates deeply with the Cognitive Aura Engine 2.0
 * to provide context-aware, adaptive physics simulation that responds to the user's
 * cognitive state, environmental context, and learning objectives.
 *
 * Key Enhancements for CAE 2.0:
 * - Context-aware physics modes (DeepFocus, CreativeFlow, FragmentedAttention, CognitiveOverload)
 * - Dynamic difficulty adjustment based on cognitive capacity forecasting
 * - Environmental context influence on physics behavior
 * - Predictive physics adaptation based on anticipated state changes
 * - Multi-modal integration with soundscape and memory systems
 */

import { EventEmitter } from 'eventemitter3';
import { AuraContext, AuraState } from '../ai/CognitiveAuraService';
import { NeuralGraph } from './MindMapGeneratorService';
import { ContextSnapshot, DigitalBodyLanguage } from '../ai/ContextSensorService';

// ====================  INTERFACES ====================

/**
 *  physics configuration for CAE 2.0
 */
export interface PhysicsConfig {
  // Core physics parameters
  nodeSize: { min: number; max: number; adaptive: boolean };
  linkStrength: { min: number; max: number; contextMultiplier: number };
  repulsionForce: { base: number; cognitiveLoadMultiplier: number };
  damping: { base: number; contextMultiplier: number };

  // CAE 2.0 enhancements
  contextualBehavior: {
    deepFocus: PhysicsContextBehavior;
    creativeFlow: PhysicsContextBehavior;
    fragmentedAttention: PhysicsContextBehavior;
    cognitiveOverload: PhysicsContextBehavior;
  } & Record<string, PhysicsContextBehavior>;

  // Environmental responsiveness
  environmentalFactors: {
    locationInfluence: number; // How much location affects physics
    timeInfluence: number; // How much time of day affects physics
    dblInfluence: number; // How much digital body language affects physics
    biologicalInfluence: number; // How much biological factors affect physics
  };

  // Predictive adjustments
  anticipatoryAdjustments: {
    enabled: boolean;
    lookaheadMinutes: number;
    adaptationSmoothing: number;
  };

  // Performance optimization
  adaptiveQuality: {
    enabled: boolean;
    qualityLevels: Array<{ deviceLoad: number; physicsQuality: number }>;
  };
}

/**
 * Physics behavior for each cognitive context
 */
export interface PhysicsContextBehavior {
  // Node behavior
  targetNodeMagnetism: number; // How strongly target node attracts attention
  nodeVisibility: { focused: number; peripheral: number; hidden: number };
  nodeAnimationIntensity: number; // How much nodes animate/pulse

  // Link behavior
  linkVisibilityThreshold: number; // Minimum strength for link to be visible
  linkAnimationStyle: 'static' | 'flowing' | 'pulsing' | 'sparking';
  connectionEmphasis: number; // How much to emphasize connections

  // Layout behavior
  clusteringTendency: number; // How much nodes cluster together
  spatialDistribution: 'tight' | 'balanced' | 'spread' | 'organic';
  layoutStability: number; // How stable the layout should be

  // Interaction behavior
  interactionSensitivity: number; // How responsive to user interactions
  hoverEffectIntensity: number; // Strength of hover effects
  selectionFeedback: number; // Visual feedback on selection

  // Adaptive elements
  difficultyAdjustment: number; // How much to adjust based on difficulty
  attentionGuidance: number; // How much to guide user attention
  cognitiveLoadReduction: number; // How much to reduce visual complexity
}

/**
 *  physics state tracking
 */
export interface PhysicsState {
  currentContext: AuraContext;
  cognitiveLoad: number;
  environmentalOptimality: number;
  targetNodeId: string | null;

  // Physics parameters (current)
  activeConfig: PhysicsContextBehavior;
  nodeCount: number;
  linkCount: number;
  simulationSpeed: number;
  qualityLevel: number;

  // Adaptive tracking
  lastUpdate: Date;
  adaptationCount: number;
  performanceMetrics: {
    fps: number;
    nodeRenderTime: number;
    interactionResponsiveness: number;
  };

  // Predictive elements
  anticipatedChanges: Array<{
    parameter: string;
    currentValue: number;
    targetValue: number;
    transitionDuration: number;
    reason: string;
  }>;
}

/**
 *  node properties with CAE 2.0 features
 */
export interface Node {
  // Core properties
  id: string;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;

  // CAE 2.0 enhancements
  cognitiveLoad: number;
  masteryLevel: number;
  priority: number;
  contextRelevance: Record<AuraContext, number>;

  // Visual enhancements
  opacity: number;
  pulseIntensity: number;
  glowEffect: number;
  colorIntensity: number;
  animationState: 'idle' | 'highlighted' | 'pulsing' | 'flowing' | 'sparking';

  // Adaptive properties
  lastInteraction: Date;
  interactionHistory: Array<{ timestamp: Date; type: string; intensity: number }>;
  adaptiveSize: number;
  adaptiveOpacity: number;

  // Context-specific properties
  isTargetNode: boolean;
  isInOptimalPath: boolean;
  difficultyAdjustment: number;
  attentionWeight: number;
}

/**
 *  link properties
 */
export interface Link {
  // Core properties
  id: string;
  source: string;
  target: string;
  strength: number;
  distance: number;

  // CAE 2.0 enhancements
  type: 'prerequisite' | 'similarity' | 'logical' | 'creative' | 'temporal';
  contextRelevance: Record<AuraContext, number>;
  cognitiveDistance: number;

  // Visual enhancements
  opacity: number;
  width: number;
  flowDirection: 'none' | 'forward' | 'backward' | 'bidirectional';
  animationSpeed: number;
  glowIntensity: number;

  // Adaptive properties
  lastActivation: Date;
  activationHistory: Array<{ timestamp: Date; intensity: number }>;
  adaptiveStrength: number;
  adaptiveVisibility: number;
}

// ====================  NEURAL PHYSICS ENGINE ====================

export class NeuralPhysicsEngine extends EventEmitter {
  private static instance: NeuralPhysicsEngine;

  // Core physics state
  private nodes: Map<string, Node> = new Map();
  private links: Map<string, Link> = new Map();
  private physicsState: PhysicsState;

  // Configuration
  private config: PhysicsConfig = {
    nodeSize: { min: 8, max: 24, adaptive: true },
    linkStrength: { min: 0.1, max: 2.0, contextMultiplier: 1.0 },
    repulsionForce: { base: 100, cognitiveLoadMultiplier: 1.2 },
    damping: { base: 0.9, contextMultiplier: 1.0 },

    contextualBehavior: {
      deepFocus: {
        targetNodeMagnetism: 2.5,
        nodeVisibility: { focused: 1.0, peripheral: 0.3, hidden: 0.1 },
        nodeAnimationIntensity: 0.8,
        linkVisibilityThreshold: 0.4,
        linkAnimationStyle: 'flowing',
        connectionEmphasis: 1.5,
        clusteringTendency: 0.3,
        spatialDistribution: 'tight',
        layoutStability: 0.8,
        interactionSensitivity: 1.2,
        hoverEffectIntensity: 1.5,
        selectionFeedback: 2.0,
        difficultyAdjustment: 1.0,
        attentionGuidance: 2.0,
        cognitiveLoadReduction: 0.3,
      },
      creativeFlow: {
        targetNodeMagnetism: 1.0,
        nodeVisibility: { focused: 1.0, peripheral: 0.8, hidden: 0.4 },
        nodeAnimationIntensity: 1.2,
        linkVisibilityThreshold: 0.2,
        linkAnimationStyle: 'sparking',
        connectionEmphasis: 2.0,
        clusteringTendency: 0.1,
        spatialDistribution: 'organic',
        layoutStability: 0.4,
        interactionSensitivity: 1.5,
        hoverEffectIntensity: 1.8,
        selectionFeedback: 1.5,
        difficultyAdjustment: 0.8,
        attentionGuidance: 0.5,
        cognitiveLoadReduction: 0.1,
      },
      fragmentedAttention: {
        targetNodeMagnetism: 1.5,
        nodeVisibility: { focused: 1.0, peripheral: 0.6, hidden: 0.2 },
        nodeAnimationIntensity: 0.5,
        linkVisibilityThreshold: 0.6,
        linkAnimationStyle: 'pulsing',
        connectionEmphasis: 1.0,
        clusteringTendency: 0.7,
        spatialDistribution: 'balanced',
        layoutStability: 0.9,
        interactionSensitivity: 0.8,
        hoverEffectIntensity: 1.0,
        selectionFeedback: 1.2,
        difficultyAdjustment: 0.7,
        attentionGuidance: 1.5,
        cognitiveLoadReduction: 0.5,
      },
      cognitiveOverload: {
        targetNodeMagnetism: 3.0,
        nodeVisibility: { focused: 1.0, peripheral: 0.1, hidden: 0.0 },
        nodeAnimationIntensity: 0.2,
        linkVisibilityThreshold: 0.8,
        linkAnimationStyle: 'static',
        connectionEmphasis: 0.5,
        clusteringTendency: 0.9,
        spatialDistribution: 'tight',
        layoutStability: 1.0,
        interactionSensitivity: 0.5,
        hoverEffectIntensity: 0.8,
        selectionFeedback: 1.8,
        difficultyAdjustment: 0.3,
        attentionGuidance: 3.0,
        cognitiveLoadReduction: 0.8,
      },
    },

    environmentalFactors: {
      locationInfluence: 0.15,
      timeInfluence: 0.1,
      dblInfluence: 0.2,
      biologicalInfluence: 0.1,
    },

    anticipatoryAdjustments: {
      enabled: true,
      lookaheadMinutes: 15,
      adaptationSmoothing: 0.3,
    },

    adaptiveQuality: {
      enabled: true,
      qualityLevels: [
        { deviceLoad: 0.9, physicsQuality: 0.5 },
        { deviceLoad: 0.7, physicsQuality: 0.7 },
        { deviceLoad: 0.5, physicsQuality: 0.85 },
        { deviceLoad: 0.0, physicsQuality: 1.0 },
      ],
    },
  };

  // Simulation state
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private currentFPS: number = 60;

  // CAE 2.0 integration
  private currentAuraState: AuraState | null = null;
  private contextTransitionProgress: number = 0;
  private transitionDuration: number = 2000; // 2 seconds
  private transitionStartTime: number = 0;

  // Performance monitoring
  private performanceHistory: Array<{
    timestamp: Date;
    fps: number;
    nodeCount: number;
    renderTime: number;
  }> = [];

  // Event listeners
  private resizeHandler: (() => void) | null = null;
  private visibilityHandler: (() => void) | null = null;

  public static getInstance(): NeuralPhysicsEngine {
    if (!NeuralPhysicsEngine.instance) {
      NeuralPhysicsEngine.instance = new NeuralPhysicsEngine();
    }
    return NeuralPhysicsEngine.instance;
  }

  // Backwards-compatible public API (stubs / adapters)
  // These wrap internal functionality and provide safe no-op defaults when not available.
  public setFocusNode(focusNodeId: string | null): void {
    // Optional adapter - store focus node id and update internal structures if methods exist
    try {
      // if internal implementation exists (commented out older code), call it via index
      // @ts-ignore
      if (typeof this['setFocusNodeImpl'] === 'function') {
        // @ts-ignore
        this['setFocusNodeImpl'](focusNodeId);
      } else {
        // fallback: set target id in physicsState
        this.physicsState.targetNodeId = focusNodeId;
      }
    } catch (e) {}
  }

  public setFocusLock(isLocked: boolean, sessionId?: string): void {
    try {
      // @ts-ignore
      if (typeof this['setFocusLockImpl'] === 'function') {
        // @ts-ignore
        this['setFocusLockImpl'](isLocked, sessionId);
      }
      // otherwise no-op
    } catch (e) {}
  }

  public updateCognitiveLoad(cognitiveLoad: number): void {
    try {
      this.physicsState.cognitiveLoad = cognitiveLoad;
      // adapt config to new load
      // @ts-ignore
      if (typeof this['adaptConfigToCognitiveLoad'] === 'function') {
        // @ts-ignore
        this['adaptConfigToCognitiveLoad'](cognitiveLoad);
      }
    } catch (e) {}
  }

  public updateGraph(payload: { nodes?: any[]; links?: any[] } | NeuralGraph): void {
    try {
      // For compatibility, if payload has nodes and links, setGraphData
      // @ts-ignore
      if (payload && (payload as any).nodes) {
        const n = (payload as any).nodes.map((node: any) => ({ id: node.id, label: node.label }));
        const l = (payload as any).links?.map((link: any) => ({ source: link.source, target: link.target })) || [];
        this.setGraphData(n, l as any);
      }
    } catch (e) {}
  }

  public onTick(cb: (nodes: any[], links: any[]) => void): void {
    // No-op: consumers should use event emitter 'graph_updated' or similar
    // keep for compatibility
  }

  public start(): void {
    this.startSimulation();
  }

  public stop(): void {
    this.stopSimulation();
  }

  public getNodeOpacity(nodeId: string): number {
    const node = this.nodes.get(nodeId as string);
    return node ? node.opacity : 1;
  }

  public getNodeBlurAmount(nodeId: string): number {
    const node = this.nodes.get(nodeId as string);
    return node ? node.glowEffect || 0 : 0;
  }

  public getNodeColor(node: any): string {
    // simplistic color mapping (accepts NeuralNode or Node)
    return '#6366F1';
  }

  private constructor() {
    super();

    // Initialize physics state
    this.physicsState = {
      currentContext: 'FragmentedAttention',
      cognitiveLoad: 0.5,
      environmentalOptimality: 0.5,
      targetNodeId: null,
      activeConfig: this.config.contextualBehavior.fragmentedAttention,
      nodeCount: 0,
      linkCount: 0,
      simulationSpeed: 1.0,
      qualityLevel: 1.0,
      lastUpdate: new Date(),
      adaptationCount: 0,
      performanceMetrics: {
        fps: 60,
        nodeRenderTime: 16,
        interactionResponsiveness: 1.0,
      },
      anticipatedChanges: [],
    };

    console.log('🎯  Neural Physics Engine 2.0 initialized');

    // Set up performance monitoring
    this.initializePerformanceMonitoring();
  }

  // ==================== CAE 2.0 INTEGRATION METHODS ====================

  /**
   * Update physics based on  aura state (CAE 2.0 Integration)
   */
  public async updateFromAuraState(auraState: AuraState): Promise<void> {
    console.log(`🎯 Physics update from CAE 2.0: Context=${auraState.context}, Load=${(auraState.compositeCognitiveScore * 100).toFixed(1)}%`);

    const previousContext = this.physicsState.currentContext;
    const newContext = auraState.context;

    // Update current aura state
    this.currentAuraState = auraState;

    // Update physics state
    this.physicsState.currentContext = newContext;
    this.physicsState.cognitiveLoad = auraState.compositeCognitiveScore;
    this.physicsState.environmentalOptimality = auraState.environmentOptimality;
    this.physicsState.targetNodeId = auraState.targetNode?.id || null;
    this.physicsState.lastUpdate = new Date();

    // Handle context transition
    if (previousContext !== newContext) {
      await this.initiateContextTransition(previousContext, newContext, auraState);
    } else {
      // Update within same context
      await this.updateContextParameters(auraState);
    }

    // Apply environmental influences
    await this.applyEnvironmentalInfluences(auraState.environmentalContext);

    // Handle anticipatory adjustments
    if (this.config.anticipatoryAdjustments.enabled) {
      await this.applyAnticipatoryAdjustments(auraState.anticipatedStateChanges);
    }

    // Emit update event
    this.emit('physics_updated', {
      context: newContext,
      cognitiveLoad: this.physicsState.cognitiveLoad,
      transitionActive: this.contextTransitionProgress > 0,
    });
  }

  /**
   * Initiate smooth transition between cognitive contexts
   */
  private async initiateContextTransition(
    fromContext: AuraContext,
    toContext: AuraContext,
    auraState: AuraState
  ): Promise<void> {
    console.log(`🔄 Physics context transition: ${fromContext} → ${toContext}`);

    // Start transition
    this.contextTransitionProgress = 0;
    this.transitionStartTime = Date.now();

    const fromConfig = this.config.contextualBehavior[fromContext];
    const toConfig = this.config.contextualBehavior[toContext];

    // Create smooth transition animation
    const transitionAnimation = () => {
      const elapsed = Date.now() - this.transitionStartTime;
      const progress = Math.min(1, elapsed / this.transitionDuration);

      // Smooth easing function
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      // Interpolate physics parameters
      this.physicsState.activeConfig = this.interpolatePhysicsConfig(fromConfig, toConfig, easeProgress);

      // Update all nodes and links with new configuration
      this.updateNodesForTransition(easeProgress);
      this.updateLinksForTransition(easeProgress);

      this.contextTransitionProgress = progress;

      if (progress < 1) {
        requestAnimationFrame(transitionAnimation);
      } else {
        // Transition complete
        this.physicsState.activeConfig = toConfig;
        this.contextTransitionProgress = 0;
        this.physicsState.adaptationCount++;

        console.log(`✅ Physics transition complete: ${toContext}`);
        this.emit('transition_complete', { context: toContext });
      }
    };

    requestAnimationFrame(transitionAnimation);
  }

  /**
   * Interpolate between two physics configurations
   */
  private interpolatePhysicsConfig(
    fromConfig: PhysicsContextBehavior,
    toConfig: PhysicsContextBehavior,
    progress: number
  ): PhysicsContextBehavior {
    return {
      targetNodeMagnetism: this.lerp(fromConfig.targetNodeMagnetism, toConfig.targetNodeMagnetism, progress),
      nodeVisibility: {
        focused: this.lerp(fromConfig.nodeVisibility.focused, toConfig.nodeVisibility.focused, progress),
        peripheral: this.lerp(fromConfig.nodeVisibility.peripheral, toConfig.nodeVisibility.peripheral, progress),
        hidden: this.lerp(fromConfig.nodeVisibility.hidden, toConfig.nodeVisibility.hidden, progress),
      },
      nodeAnimationIntensity: this.lerp(fromConfig.nodeAnimationIntensity, toConfig.nodeAnimationIntensity, progress),
      linkVisibilityThreshold: this.lerp(fromConfig.linkVisibilityThreshold, toConfig.linkVisibilityThreshold, progress),
      linkAnimationStyle: progress < 0.5 ? fromConfig.linkAnimationStyle : toConfig.linkAnimationStyle,
      connectionEmphasis: this.lerp(fromConfig.connectionEmphasis, toConfig.connectionEmphasis, progress),
      clusteringTendency: this.lerp(fromConfig.clusteringTendency, toConfig.clusteringTendency, progress),
      spatialDistribution: progress < 0.5 ? fromConfig.spatialDistribution : toConfig.spatialDistribution,
      layoutStability: this.lerp(fromConfig.layoutStability, toConfig.layoutStability, progress),
      interactionSensitivity: this.lerp(fromConfig.interactionSensitivity, toConfig.interactionSensitivity, progress),
      hoverEffectIntensity: this.lerp(fromConfig.hoverEffectIntensity, toConfig.hoverEffectIntensity, progress),
      selectionFeedback: this.lerp(fromConfig.selectionFeedback, toConfig.selectionFeedback, progress),
      difficultyAdjustment: this.lerp(fromConfig.difficultyAdjustment, toConfig.difficultyAdjustment, progress),
      attentionGuidance: this.lerp(fromConfig.attentionGuidance, toConfig.attentionGuidance, progress),
      cognitiveLoadReduction: this.lerp(fromConfig.cognitiveLoadReduction, toConfig.cognitiveLoadReduction, progress),
    };
  }

  /**
   * Update context parameters within same context
   */
  private async updateContextParameters(auraState: AuraState): Promise<void> {
    const config = this.physicsState.activeConfig;

    // Adjust parameters based on cognitive capacity forecast
    const capacityForecast = auraState.capacityForecast;

    // Reduce complexity if mental clarity is low
    if (capacityForecast.mentalClarityScore < 0.5) {
      config.cognitiveLoadReduction = Math.min(0.9, config.cognitiveLoadReduction + 0.2);
      config.attentionGuidance = Math.min(3.0, config.attentionGuidance + 0.5);
    }

    // Increase interactivity if capacity is high
    if (capacityForecast.mentalClarityScore > 0.8) {
      config.interactionSensitivity = Math.min(2.0, config.interactionSensitivity + 0.3);
      config.hoverEffectIntensity = Math.min(2.0, config.hoverEffectIntensity + 0.2);
    }

    // Update target node emphasis
    if (auraState.targetNode) {
      this.updateTargetNodeEmphasis(auraState.targetNode.id, config.targetNodeMagnetism);
    }
  }

  /**
   * Apply environmental influences to physics
   */
  private async applyEnvironmentalInfluences(environmentalContext: ContextSnapshot): Promise<void> {
    const influences = this.config.environmentalFactors;

    // Location influence
    const locationMultiplier = this.getLocationPhysicsMultiplier(environmentalContext.locationContext.environment);
    this.adjustPhysicsForLocation(locationMultiplier * influences.locationInfluence);

    // Time influence (circadian rhythm)
    const timeMultiplier = this.getTimePhysicsMultiplier(environmentalContext.timeIntelligence.circadianHour);
    this.adjustPhysicsForTime(timeMultiplier * influences.timeInfluence);

    // Digital body language influence
    const dblMultiplier = this.getDBLPhysicsMultiplier(environmentalContext.digitalBodyLanguage);
    this.adjustPhysicsForDBL(dblMultiplier * influences.dblInfluence);

    // Biological influence
    const biologicalMultiplier = this.getBiologicalPhysicsMultiplier(environmentalContext.timeIntelligence.energyLevel);
    this.adjustPhysicsForBiology(biologicalMultiplier * influences.biologicalInfluence);
  }

  /**
   * Get location-based physics multiplier
   */
  private getLocationPhysicsMultiplier(environment: string): number {
    switch (environment) {
      case 'library': return 1.2; // Enhance focus physics
      case 'home': return 1.0; // Neutral
      case 'office': return 0.9; // Slightly reduce complexity
      case 'commute': return 0.6; // Significantly reduce complexity
      case 'outdoor': return 0.8; // Reduce complexity, increase creativity
      default: return 1.0;
    }
  }

  /**
   * Get time-based physics multiplier
   */
  private getTimePhysicsMultiplier(circadianHour: number): number {
    // Peak attention hours (9-11 AM, 2-4 PM)
    if ((circadianHour >= 9 && circadianHour <= 11) ||
        (circadianHour >= 14 && circadianHour <= 16)) {
      return 1.1;
    }

    // Low attention hours (late evening, early morning)
    if (circadianHour >= 22 || circadianHour <= 6) {
      return 0.7;
    }

    return 1.0; // Normal hours
  }

  /**
   * Get DBL-based physics multiplier
   */
  private getDBLPhysicsMultiplier(dbl: DigitalBodyLanguage): number {
    switch (dbl.state) {
      case 'focused': return 1.2;
      case 'engaged': return 1.1;
      case 'restless': return 0.8;
      case 'fragmented': return 0.7;
      case 'overwhelmed': return 0.5;
      default: return 1.0;
    }
  }

  /**
   * Get biological-based physics multiplier
   */
  private getBiologicalPhysicsMultiplier(energyLevel: string): number {
    switch (energyLevel) {
      case 'peak': return 1.2;
      case 'high': return 1.1;
      case 'medium': return 1.0;
      case 'low': return 0.8;
      case 'recovery': return 0.6;
      default: return 1.0;
    }
  }

  /**
   * Apply anticipatory adjustments based on predicted state changes
   */
  private async applyAnticipatoryAdjustments(
    anticipatedStateChanges: AuraState['anticipatedStateChanges']
  ): Promise<void> {
    if (anticipatedStateChanges.length === 0) return;

    const lookaheadMinutes = this.config.anticipatoryAdjustments.lookaheadMinutes;
    const smoothing = this.config.anticipatoryAdjustments.adaptationSmoothing;

    for (const change of anticipatedStateChanges) {
      if (change.timeframe <= lookaheadMinutes && change.probability > 0.6) {
        console.log(`🔮 Anticipatory physics adjustment: ${change.context} in ${change.timeframe}min (${(change.probability * 100).toFixed(0)}%)`);

        // Pre-adjust physics towards anticipated context
        const anticipatedConfig = this.config.contextualBehavior[change.context];
        const currentConfig = this.physicsState.activeConfig;

        // Apply partial adjustment based on probability and time distance
        const adjustmentStrength = change.probability * smoothing * (1 - change.timeframe / lookaheadMinutes);

        this.physicsState.anticipatedChanges.push({
          parameter: 'context_preparation',
          currentValue: 0,
          targetValue: adjustmentStrength,
          transitionDuration: change.timeframe * 60 * 1000, // Convert to milliseconds
          reason: `Anticipating ${change.context}`,
        });

        // Apply subtle pre-adjustments
        this.applyAnticipationAdjustment(currentConfig, anticipatedConfig, adjustmentStrength);
      }
    }
  }

  /**
   * Apply subtle anticipation adjustment
   */
  private applyAnticipationAdjustment(
    currentConfig: PhysicsContextBehavior,
    anticipatedConfig: PhysicsContextBehavior,
    strength: number
  ): void {
    // Subtly adjust key parameters
    currentConfig.attentionGuidance = this.lerp(
      currentConfig.attentionGuidance,
      anticipatedConfig.attentionGuidance,
      strength * 0.3
    );

    currentConfig.cognitiveLoadReduction = this.lerp(
      currentConfig.cognitiveLoadReduction,
      anticipatedConfig.cognitiveLoadReduction,
      strength * 0.2
    );

    currentConfig.interactionSensitivity = this.lerp(
      currentConfig.interactionSensitivity,
      anticipatedConfig.interactionSensitivity,
      strength * 0.2
    );
  }

  // ==================== CORE PHYSICS METHODS () ====================

  /**
   * Initialize or update graph with  nodes and links
   */
  public setGraphData(
    nodeData: Array<{ id: string; label: string; [key: string]: any }>,
    linkData: Array<{ source: string; target: string; strength?: number; [key: string]: any }>
  ): void {
    console.log(`🎯 Setting  graph data: ${nodeData.length} nodes, ${linkData.length} links`);

    // Clear existing data
    this.nodes.clear();
    this.links.clear();

    // Create  nodes
    nodeData.forEach(nodeData => {
      const node: Node = {
        id: nodeData.id,
        label: nodeData.label,
        x: Math.random() * 800,
        y: Math.random() * 600,
        vx: 0,
        vy: 0,
        size: this.calculateInitialNodeSize(nodeData),

        // CAE 2.0 enhancements
        cognitiveLoad: nodeData.cognitiveLoad || Math.random(),
        masteryLevel: nodeData.masteryLevel || Math.random(),
        priority: nodeData.priority || 0,
        contextRelevance: {
          DeepFocus: Math.random(),
          CreativeFlow: Math.random(),
          FragmentedAttention: Math.random(),
          CognitiveOverload: Math.random(),
        },

        // Visual enhancements
        opacity: 1.0,
        pulseIntensity: 0.0,
        glowEffect: 0.0,
        colorIntensity: 1.0,
        animationState: 'idle',

        // Adaptive properties
        lastInteraction: new Date(0),
        interactionHistory: [],
        adaptiveSize: nodeData.size || 12,
        adaptiveOpacity: 1.0,

        // Context-specific properties
        isTargetNode: false,
        isInOptimalPath: false,
        difficultyAdjustment: 0,
        attentionWeight: 1.0,
      };

      this.nodes.set(nodeData.id, node);
    });

    // Create  links
    linkData.forEach(linkData => {
      const link: Link = {
        id: `${linkData.source}-${linkData.target}`,
        source: linkData.source,
        target: linkData.target,
        strength: linkData.strength || 0.5,
        distance: linkData.distance || 50,

        // CAE 2.0 enhancements
        type: linkData.type || 'similarity',
        contextRelevance: {
          DeepFocus: Math.random(),
          CreativeFlow: Math.random(),
          FragmentedAttention: Math.random(),
          CognitiveOverload: Math.random(),
        },
        cognitiveDistance: linkData.cognitiveDistance || Math.random(),

        // Visual enhancements
        opacity: 0.6,
        width: 1.0,
        flowDirection: 'none',
        animationSpeed: 0,
        glowIntensity: 0,

        // Adaptive properties
        lastActivation: new Date(0),
        activationHistory: [],
        adaptiveStrength: linkData.strength || 0.5,
        adaptiveVisibility: 0.6,
      };

      this.links.set(link.id, link);
    });

    // Update physics state
    this.physicsState.nodeCount = nodeData.length;
    this.physicsState.linkCount = linkData.length;

    // Apply current context configuration
    this.updateNodesForContext();
    this.updateLinksForContext();

    this.emit('graph_updated', {
      nodeCount: nodeData.length,
      linkCount: linkData.length,
    });
  }

  /**
   * Start  physics simulation
   */
  public startSimulation(): void {
    if (this.isRunning) return;

    console.log('🚀 Starting  physics simulation');

    this.isRunning = true;
    this.lastFrameTime = performance.now();

    const simulate = (currentTime: number) => {
      if (!this.isRunning) return;

      const deltaTime = currentTime - this.lastFrameTime;
      this.lastFrameTime = currentTime;

      // Calculate FPS
      this.currentFPS = 1000 / Math.max(deltaTime, 1);

      // Run physics step
      this.simulationStep(deltaTime);

      // Update performance metrics
      this.updatePerformanceMetrics(deltaTime);

      // Continue simulation
      this.animationFrameId = requestAnimationFrame(simulate);
    };

    this.animationFrameId = requestAnimationFrame(simulate);

    this.emit('simulation_started');
  }

  /**
   * Stop physics simulation
   */
  public stopSimulation(): void {
    if (!this.isRunning) return;

    console.log('⏹️ Stopping  physics simulation');

    this.isRunning = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.emit('simulation_stopped');
  }

  /**
   *  simulation step
   */
  private simulationStep(deltaTime: number): void {
    const dt = Math.min(deltaTime / 16.67, 2.0); // Cap at 2x normal frame time

    // Apply forces
    this.applyForces(dt);

    // Update positions
    this.updatePositions(dt);

    // Apply context-specific behaviors
    this.applyContextBehaviors(dt);

    // Update adaptive properties
    this.updateAdaptiveProperties(dt);

    // Emit position updates
    this.emitPositionUpdates();
  }

  /**
   * Apply physics forces with CAE 2.0 enhancements
   */
  private applyForces(deltaTime: number): void {
    const config = this.physicsState.activeConfig;

    // Reset forces
    this.nodes.forEach(node => {
      node.vx = 0;
      node.vy = 0;
    });

    // Link forces (attraction)
    this.links.forEach(link => {
      const sourceNode = this.nodes.get(link.source);
      const targetNode = this.nodes.get(link.target);

      if (!sourceNode || !targetNode) return;

      const dx = targetNode.x - sourceNode.x;
      const dy = targetNode.y - sourceNode.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance === 0) return;

      //  link force calculation
      const linkForce = this.calculateLinkForce(link, distance, config);
      const fx = (dx / distance) * linkForce * deltaTime;
      const fy = (dy / distance) * linkForce * deltaTime;

      sourceNode.vx += fx;
      sourceNode.vy += fy;
      targetNode.vx -= fx;
      targetNode.vy -= fy;
    });

    // Repulsion forces
    const nodeArray = Array.from(this.nodes.values());
    for (let i = 0; i < nodeArray.length; i++) {
      for (let j = i + 1; j < nodeArray.length; j++) {
        const nodeA = nodeArray[i];
        const nodeB = nodeArray[j];

        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) continue;

        //  repulsion calculation
        const repulsionForce = this.calculateRepulsionForce(nodeA, nodeB, distance, config);
        const fx = (dx / distance) * repulsionForce * deltaTime;
        const fy = (dy / distance) * repulsionForce * deltaTime;

        nodeA.vx -= fx;
        nodeA.vy -= fy;
        nodeB.vx += fx;
        nodeB.vy += fy;
      }
    }

    // Target node magnetism
    if (this.physicsState.targetNodeId) {
      this.applyTargetNodeMagnetism(config.targetNodeMagnetism, deltaTime);
    }
  }

  /**
   * Calculate  link force
   */
  private calculateLinkForce(link: Link, distance: number, config: PhysicsContextBehavior): number {
    const baseForce = link.adaptiveStrength * this.config.linkStrength.contextMultiplier;
    const contextRelevance = link.contextRelevance[this.physicsState.currentContext] || 0.5;
    const distanceModifier = (distance - link.distance) / link.distance;

    return baseForce * contextRelevance * distanceModifier;
  }

  /**
   * Calculate  repulsion force
   */
  private calculateRepulsionForce(
    nodeA: Node,
    nodeB: Node,
    distance: number,
    config: PhysicsContextBehavior
  ): number {
    const baseRepulsion = this.config.repulsionForce.base;
    const cognitiveLoadMultiplier = 1 + (this.physicsState.cognitiveLoad * this.config.repulsionForce.cognitiveLoadMultiplier);
    const sizeMultiplier = Math.sqrt(nodeA.adaptiveSize * nodeB.adaptiveSize);

    return (baseRepulsion * cognitiveLoadMultiplier * sizeMultiplier) / (distance * distance);
  }

  /**
   * Apply target node magnetism
   */
  private applyTargetNodeMagnetism(magnetism: number, deltaTime: number): void {
    const targetNode = this.nodes.get(this.physicsState.targetNodeId!);
    if (!targetNode) return;

    // Calculate center of screen (would be passed from UI)
    const centerX = 400; // Mock center
    const centerY = 300;

    const dx = centerX - targetNode.x;
    const dy = centerY - targetNode.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 50) { // Only apply if not already centered
      const force = magnetism * 0.1;
      targetNode.vx += (dx / distance) * force * deltaTime;
      targetNode.vy += (dy / distance) * force * deltaTime;
    }
  }

  /**
   * Update node positions with damping
   */
  private updatePositions(deltaTime: number): void {
    const damping = this.config.damping.base * this.config.damping.contextMultiplier;
    const layoutStability = this.physicsState.activeConfig.layoutStability;

    this.nodes.forEach(node => {
      // Apply velocity with damping
      node.x += node.vx * layoutStability;
      node.y += node.vy * layoutStability;

      // Apply damping
      node.vx *= damping;
      node.vy *= damping;

      // Boundary constraints (would be set from UI)
      const margin = node.adaptiveSize;
      node.x = Math.max(margin, Math.min(800 - margin, node.x));
      node.y = Math.max(margin, Math.min(600 - margin, node.y));
    });
  }

  /**
   * Apply context-specific behaviors
   */
  private applyContextBehaviors(deltaTime: number): void {
    const config = this.physicsState.activeConfig;
    const context = this.physicsState.currentContext;

    this.nodes.forEach(node => {
      // Update animation state based on context
      this.updateNodeAnimationState(node, config, context);

      // Update visual properties
      this.updateNodeVisualProperties(node, config, context);

      // Update attention weight
      this.updateNodeAttentionWeight(node, config);
    });

    this.links.forEach(link => {
      // Update link visual properties
      this.updateLinkVisualProperties(link, config, context);
    });
  }

  /**
   * Update node animation state
   */
  private updateNodeAnimationState(
    node: Node,
    config: PhysicsContextBehavior,
    context: AuraContext
  ): void {
    if (node.isTargetNode) {
      node.animationState = 'highlighted';
      node.pulseIntensity = config.nodeAnimationIntensity * 1.5;
    } else if (node.contextRelevance[context] > 0.7) {
      node.animationState = context === 'CreativeFlow' ? 'sparking' : 'pulsing';
      node.pulseIntensity = config.nodeAnimationIntensity;
    } else {
      node.animationState = 'idle';
      node.pulseIntensity = config.nodeAnimationIntensity * 0.3;
    }
  }

  /**
   * Update node visual properties
   */
  private updateNodeVisualProperties(
    node: Node,
    config: PhysicsContextBehavior,
    context: AuraContext
  ): void {
    const relevance = node.contextRelevance[context];

    // Determine visibility category
    let visibilityCategory: 'focused' | 'peripheral' | 'hidden';
    if (node.isTargetNode || relevance > 0.8) {
      visibilityCategory = 'focused';
    } else if (relevance > 0.3) {
      visibilityCategory = 'peripheral';
    } else {
      visibilityCategory = 'hidden';
    }

    // Update opacity
    const targetOpacity = config.nodeVisibility[visibilityCategory];
    node.adaptiveOpacity = this.lerp(node.adaptiveOpacity, targetOpacity, 0.1);

    // Update size based on importance and cognitive load reduction
    const baseSize = this.config.nodeSize.adaptive ?
      (node.cognitiveLoad * 0.5 + node.masteryLevel * 0.3 + relevance * 0.2) *
      (this.config.nodeSize.max - this.config.nodeSize.min) + this.config.nodeSize.min :
      node.size;

    const cognitiveReduction = 1 - config.cognitiveLoadReduction;
    const targetSize = baseSize * cognitiveReduction * (node.isTargetNode ? 1.2 : 1.0);

    node.adaptiveSize = this.lerp(node.adaptiveSize, targetSize, 0.1);

    // Update glow effect
    node.glowEffect = node.isTargetNode ? config.selectionFeedback : 0;
  }

  /**
   * Update node attention weight
   */
  private updateNodeAttentionWeight(node: Node, config: PhysicsContextBehavior): void {
    let attentionWeight = 1.0;

    // Increase weight for target node
    if (node.isTargetNode) {
      attentionWeight *= config.attentionGuidance;
    }

    // Adjust based on cognitive load and mastery
    attentionWeight *= (1 - node.cognitiveLoad * 0.3) * (1 + node.masteryLevel * 0.2);

    node.attentionWeight = this.lerp(node.attentionWeight, attentionWeight, 0.1);
  }

  /**
   * Update link visual properties
   */
  private updateLinkVisualProperties(
    link: Link,
    config: PhysicsContextBehavior,
    context: AuraContext
  ): void {
    const relevance = link.contextRelevance[context];

    // Update visibility
    const targetOpacity = relevance > config.linkVisibilityThreshold ?
      relevance * config.connectionEmphasis : 0;

    link.adaptiveVisibility = this.lerp(link.adaptiveVisibility, targetOpacity, 0.1);

    // Update animation based on context
    link.flowDirection = this.getLinkFlowDirection(link, context, config);
    link.animationSpeed = config.nodeAnimationIntensity;
  }

  /**
   * Get link flow direction based on context
   */
  private getLinkFlowDirection(
    link: Link,
    context: AuraContext,
    config: PhysicsContextBehavior
  ): Link['flowDirection'] {
    switch (config.linkAnimationStyle) {
      case 'flowing':
        return link.type === 'prerequisite' ? 'forward' : 'bidirectional';
      case 'sparking':
        return 'bidirectional';
      case 'pulsing':
        return 'none';
      case 'static':
      default:
        return 'none';
    }
  }

  /**
   * Update adaptive properties
   */
  private updateAdaptiveProperties(deltaTime: number): void {
    // Update quality level based on performance
    if (this.config.adaptiveQuality.enabled) {
      this.updateAdaptiveQuality();
    }

    // Update simulation speed based on node count and performance
    this.updateSimulationSpeed();

    // Apply difficulty adjustments
    this.applyDifficultyAdjustments();
  }

  /**
   * Update adaptive quality based on performance
   */
  private updateAdaptiveQuality(): void {
    const deviceLoad = this.calculateDeviceLoad();

    for (const level of this.config.adaptiveQuality.qualityLevels) {
      if (deviceLoad >= level.deviceLoad) {
        this.physicsState.qualityLevel = level.physicsQuality;
        break;
      }
    }

    // Adjust rendering quality
    this.adjustRenderingQuality(this.physicsState.qualityLevel);
  }

  /**
   * Calculate current device load
   */
  private calculateDeviceLoad(): number {
    const fpsRatio = Math.max(0, 1 - this.currentFPS / 60);
    const nodeLoadRatio = Math.min(1, this.physicsState.nodeCount / 200);

    return (fpsRatio * 0.7 + nodeLoadRatio * 0.3);
  }

  /**
   * Adjust rendering quality
   */
  private adjustRenderingQuality(qualityLevel: number): void {
    // Reduce animation intensity
    const animationMultiplier = qualityLevel;

    this.nodes.forEach(node => {
      node.pulseIntensity *= animationMultiplier;
    });

    this.links.forEach(link => {
      link.animationSpeed *= animationMultiplier;
    });
  }

  /**
   * Update simulation speed
   */
  private updateSimulationSpeed(): void {
    const targetSpeed = this.currentFPS > 45 ? 1.0 :
                       this.currentFPS > 30 ? 0.8 : 0.6;

    this.physicsState.simulationSpeed = this.lerp(
      this.physicsState.simulationSpeed,
      targetSpeed,
      0.1
    );
  }

  /**
   * Apply difficulty adjustments
   */
  private applyDifficultyAdjustments(): void {
    const config = this.physicsState.activeConfig;
    const adjustment = config.difficultyAdjustment;

    this.nodes.forEach(node => {
      // Adjust node difficulty based on cognitive load
      const difficultyReduction = (1 - adjustment) * this.physicsState.cognitiveLoad;
      node.difficultyAdjustment = difficultyReduction;

      // Apply visual adjustments
      node.adaptiveOpacity *= (1 + difficultyReduction * 0.2);
      node.adaptiveSize *= (1 - difficultyReduction * 0.1);
    });
  }

  // ==================== PHYSICS ADJUSTMENT METHODS ====================

  private adjustPhysicsForLocation(influence: number): void {
    // Implement location-based adjustments
    const config = this.physicsState.activeConfig;

    if (influence > 0) {
      config.layoutStability += influence * 0.2;
      config.attentionGuidance += influence * 0.5;
    }
  }

  private adjustPhysicsForTime(influence: number): void {
    const config = this.physicsState.activeConfig;

    if (influence > 0) {
      config.nodeAnimationIntensity += influence * 0.3;
      config.interactionSensitivity += influence * 0.2;
    }
  }

  private adjustPhysicsForDBL(influence: number): void {
    const config = this.physicsState.activeConfig;

    if (influence > 0) {
      config.interactionSensitivity += influence * 0.4;
      config.hoverEffectIntensity += influence * 0.3;
    } else {
      config.cognitiveLoadReduction += Math.abs(influence) * 0.5;
      config.attentionGuidance += Math.abs(influence) * 0.3;
    }
  }

  private adjustPhysicsForBiology(influence: number): void {
    const config = this.physicsState.activeConfig;

    if (influence > 0) {
      config.nodeAnimationIntensity += influence * 0.2;
    } else {
      config.layoutStability += Math.abs(influence) * 0.3;
      config.cognitiveLoadReduction += Math.abs(influence) * 0.2;
    }
  }

  // ==================== HELPER METHODS ====================

  private calculateInitialNodeSize(nodeData: any): number {
    const baseSize = nodeData.size || 12;
    const cognitiveLoad = nodeData.cognitiveLoad || 0.5;
    const masteryLevel = nodeData.masteryLevel || 0.5;

    return baseSize * (0.7 + cognitiveLoad * 0.3 - masteryLevel * 0.2);
  }

  private updateNodesForContext(): void {
    const config = this.physicsState.activeConfig;
    const context = this.physicsState.currentContext;

    this.nodes.forEach(node => {
      this.updateNodeVisualProperties(node, config, context);
      this.updateNodeAnimationState(node, config, context);
    });
  }

  private updateLinksForContext(): void {
    const config = this.physicsState.activeConfig;
    const context = this.physicsState.currentContext;

    this.links.forEach(link => {
      this.updateLinkVisualProperties(link, config, context);
    });
  }

  private updateNodesForTransition(progress: number): void {
    // Update nodes during context transition
    this.nodes.forEach(node => {
      // Smooth transitions for visual properties
      node.opacity = node.adaptiveOpacity;
      node.size = node.adaptiveSize;
    });
  }

  private updateLinksForTransition(progress: number): void {
    // Update links during context transition
    this.links.forEach(link => {
      link.opacity = link.adaptiveVisibility;
    });
  }

  private updateTargetNodeEmphasis(targetNodeId: string, magnetism: number): void {
    this.nodes.forEach(node => {
      if (node.id === targetNodeId) {
        node.isTargetNode = true;
        node.attentionWeight = magnetism;
      } else {
        node.isTargetNode = false;
        node.attentionWeight = 1.0;
      }
    });
  }

  private lerp(start: number, end: number, factor: number): number {
    return start + (end - start) * factor;
  }

  private emitPositionUpdates(): void {
    // Emit position updates for rendering
    const nodePositions = Array.from(this.nodes.values()).map(node => ({
      id: node.id,
      x: node.x,
      y: node.y,
      size: node.adaptiveSize,
      opacity: node.adaptiveOpacity,
      glow: node.glowEffect,
      animation: node.animationState,
      pulseIntensity: node.pulseIntensity,
    }));

    const linkPositions = Array.from(this.links.values()).map(link => ({
      id: link.id,
      opacity: link.adaptiveVisibility,
      width: link.width,
      flow: link.flowDirection,
      animationSpeed: link.animationSpeed,
    }));

    this.emit('positions_updated', {
      nodes: nodePositions,
      links: linkPositions,
      timestamp: Date.now(),
    });
  }

  // ==================== PERFORMANCE MONITORING ====================

  private initializePerformanceMonitoring(): void {
    // Set up performance monitoring
    setInterval(() => {
      this.recordPerformanceMetrics();
    }, 5000); // Every 5 seconds
  }

  private updatePerformanceMetrics(deltaTime: number): void {
    this.physicsState.performanceMetrics.fps = this.currentFPS;
    this.physicsState.performanceMetrics.nodeRenderTime = deltaTime;
    this.physicsState.performanceMetrics.interactionResponsiveness =
      Math.max(0, Math.min(1, (60 - deltaTime) / 60));
  }

  private recordPerformanceMetrics(): void {
    this.performanceHistory.push({
      timestamp: new Date(),
      fps: this.currentFPS,
      nodeCount: this.physicsState.nodeCount,
      renderTime: this.physicsState.performanceMetrics.nodeRenderTime,
    });

    // Keep only last 100 records
    if (this.performanceHistory.length > 100) {
      this.performanceHistory = this.performanceHistory.slice(-100);
    }
  }

  // ==================== PUBLIC API ====================

  /**
   * Get current physics state
   */
  public getPhysicsState(): PhysicsState {
    return { ...this.physicsState };
  }

  /**
   * Get current node positions
   */
  public getNodePositions(): Array<{ id: string; x: number; y: number; [key: string]: any }> {
    return Array.from(this.nodes.values()).map(node => ({
      id: node.id,
      x: node.x,
      y: node.y,
      size: node.adaptiveSize,
      opacity: node.adaptiveOpacity,
      glow: node.glowEffect,
      animation: node.animationState,
    }));
  }

  /**
   * Handle node interaction
   */
  public handleNodeInteraction(nodeId: string, interactionType: 'hover' | 'click' | 'drag'): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    const config = this.physicsState.activeConfig;

    // Record interaction
    node.lastInteraction = new Date();
    node.interactionHistory.push({
      timestamp: new Date(),
      type: interactionType,
      intensity: config.interactionSensitivity,
    });

    // Apply interaction effects
    switch (interactionType) {
      case 'hover':
        node.glowEffect = config.hoverEffectIntensity;
        break;
      case 'click':
        node.glowEffect = config.selectionFeedback;
        node.pulseIntensity = config.nodeAnimationIntensity * 2;
        break;
      case 'drag':
        // Handled by physics simulation
        break;
    }

    this.emit('node_interaction', { nodeId, type: interactionType });
  }

  /**
   * Update physics configuration
   */
  public updateConfiguration(newConfig: Partial<PhysicsConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Re-apply current context with new configuration
    if (this.currentAuraState) {
      this.updateFromAuraState(this.currentAuraState);
    }

    this.emit('configuration_updated', this.config);
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): {
    averageFPS: number;
    currentFPS: number;
    nodeCount: number;
    qualityLevel: number;
    adaptationCount: number;
  } {
    const recentHistory = this.performanceHistory.slice(-20);
    const averageFPS = recentHistory.length > 0 ?
      recentHistory.reduce((sum, record) => sum + record.fps, 0) / recentHistory.length :
      60;

    return {
      averageFPS,
      currentFPS: this.currentFPS,
      nodeCount: this.physicsState.nodeCount,
      qualityLevel: this.physicsState.qualityLevel,
      adaptationCount: this.physicsState.adaptationCount,
    };
  }

  /**
   * Reset physics simulation
   */
  public reset(): void {
    this.stopSimulation();
    this.nodes.clear();
    this.links.clear();

    this.physicsState = {
      ...this.physicsState,
      nodeCount: 0,
      linkCount: 0,
      adaptationCount: 0,
      anticipatedChanges: [],
    };

    this.contextTransitionProgress = 0;
    this.performanceHistory = [];

    this.emit('physics_reset');
  }

  /**
   * Dispose physics engine
   */
  public dispose(): void {
    this.stopSimulation();
    this.removeAllListeners();

    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }

    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }

    console.log('🧹  Neural Physics Engine 2.0 disposed');
  }
}

// Export singleton instance
export const neuralPhysicsEngineInstance = NeuralPhysicsEngine.getInstance();
export default neuralPhysicsEngineInstance;







































































// import * as d3 from 'd3-force';
// import { NeuralNode, NeuralLink } from './MindMapGeneratorService';
// import { ThemeType } from '../../theme/colors';

// export interface PhysicsConfig {
//   // Basic forces
//   attraction: number;
//   repulsion: number;
//   linkDistance: number;
//   linkStrength: number;

//   // Cognitive load adaptations
//   highLoadSimplification: boolean;
//   lowLoadEnhancement: boolean;

//   // Phase 5: Focus mode forces
//   focusStrength: number; // How strongly to emphasize focus node
//   distractionRepulsion: number; // How strongly to repel non-focus nodes
//   focusAttraction: number; // How much to pull focus node to center

//   // Phase 5.5: Anti-distraction lock forces
//   lockStrength: number; // How strongly to enforce focus lock
//   lockRepulsion: number; // Extreme repulsion when focus lock is active
//   lockBlurAmount: number; // Visual blur amount for locked mode
// }

// export class NeuralPhysicsEngine {
//   private simulation: d3.Simulation<NeuralNode, NeuralLink> | null = null;
//   private nodes: NeuralNode[] = [];
//   private links: NeuralLink[] = [];
//   private width: number;
//   private height: number;
//   private theme: ThemeType;
//   private isRunning: boolean = false;
//   private tickCallback?: (nodes: NeuralNode[], links: NeuralLink[]) => void;

//   // Cognitive load state
//   private currentCognitiveLoad: number = 0.5;

//   // Phase 5: Focus mode state
//   private focusNodeId: string | null = null;
//   private focusConnectedNodes: Set<string> = new Set();

//   // Phase 5.5: Anti-distraction lock state
//   private isFocusLocked: boolean = false;
//   private lockStartTime: Date | null = null;
//   private lockSessionId: string | null = null;

//   // Performance optimization caches
//   private performanceMode: boolean = false;
//   private forceUpdateThrottle: number = 0;

//   // Memoization cache for expensive calculations
//   private memoCache: Map<string, { value: any; timestamp: number }> = new Map();
//   private readonly MEMO_TTL = 5000; // 5 seconds TTL for memoized values

//   // Web Worker simulation for large graphs
//   private workerQueue: Array<() => void> = [];
//   private isWorkerProcessing: boolean = false;
//   private physicsWorker: Worker | null = null;

//   // Configuration
//   private config: PhysicsConfig = {
//     attraction: 0.3,
//     repulsion: -100,
//     linkDistance: 80,
//     linkStrength: 0.8,
//     highLoadSimplification: true,
//     lowLoadEnhancement: true,
//     // Phase 5: Focus forces
//     focusStrength: 2.5,
//     distractionRepulsion: -300,
//     focusAttraction: 0.15,
//     // Phase 5.5: Anti-distraction lock forces
//     lockStrength: 4.0,
//     lockRepulsion: -500,
//     lockBlurAmount: 3,
//   };

//   constructor(width: number, height: number, theme: ThemeType) {
//     this.width = width;
//     this.height = height;
//     this.theme = theme;
//   }

//   /**
//    * Phase 5, Step 2: Set Focus Node for Neural Lock
//    *
//    * This is the KEY method that enables "neural tunnel vision"
//    * Physically reorganizes the network around the selected focus target
//    */
//   public setFocusNode(focusNodeId: string | null): void {
//     console.log('🎯 Setting focus node:', focusNodeId);

//     this.focusNodeId = focusNodeId;
//     this.updateFocusConnectedNodes();
//     this.updateFocusForces();

//     // If simulation is running, apply forces immediately
//     if (this.simulation) {
//       this.simulation.alpha(0.3).restart();
//     }
//   }

//   /**
//    * Phase 5.5: Set Focus Lock - Anti-Context Switching Lock
//    *
//    * This enforces the strongest level of visual and physical distraction filtering
//    */
//   public setFocusLock(isLocked: boolean, sessionId?: string): void {
//     const wasLocked = this.isFocusLocked;
//     this.isFocusLocked = isLocked;

//     if (isLocked && !wasLocked) {
//       // Engaging focus lock
//       this.lockStartTime = new Date();
//       this.lockSessionId = sessionId || null;

//       // Apply immediate and stronger focus forces
//       if (this.simulation) {
//         this.updateAllForces();
//         this.simulation.alpha(0.5).restart(); // Higher alpha for immediate effect
//       }

//       console.log('🔒 FOCUS LOCK ENGAGED - Anti-distraction layer active');
//       console.log(
//         `🧠 Physical repulsion increased to ${this.config.lockRepulsion}`
//       );
//     } else if (!isLocked && wasLocked) {
//       // Disengaging focus lock
//       this.lockStartTime = null;
//       this.lockSessionId = null;

//       // Return to normal focus forces
//       if (this.simulation) {
//         this.updateAllForces();
//         this.simulation.alpha(0.3).restart();
//       }

//       console.log('🔓 Focus lock disengaged - returning to normal forces');
//     }
//   }

//   /**
//    * Get current focus node
//    */
//   public getFocusNode(): string | null {
//     return this.focusNodeId;
//   }

//   /**
//    * Check if focus mode is active
//    */
//   public isFocusModeActive(): boolean {
//     return this.focusNodeId !== null;
//   }

//   /**
//    * Phase 5.5: Check if anti-distraction focus lock is active
//    */
//   public isFocusLockActive(): boolean {
//     return this.isFocusLocked;
//   }

//   /**
//    * Phase 5.5: Get focus lock duration
//    */
//   public getFocusLockDuration(): number {
//     if (!this.lockStartTime) return 0;
//     return Date.now() - this.lockStartTime.getTime();
//   }

//   /**
//    * Phase 5.5: Get focus lock session ID
//    */
//   public getFocusLockSessionId(): string | null {
//     return this.lockSessionId;
//   }

//   /**
//    * Update cognitive load and adapt physics accordingly
//    */
//   public updateCognitiveLoad(cognitiveLoad: number): void {
//     this.currentCognitiveLoad = Math.max(0, Math.min(1, cognitiveLoad));
//     this.adaptConfigToCognitiveLoad();

//     if (this.simulation) {
//       this.updateAllForces();
//       this.simulation.alpha(0.2).restart();
//     }

//     console.log(
//       `🧠 Cognitive load updated: ${Math.round(cognitiveLoad * 100)}%`,
//     );
//   }

//   /**
//    * Memoized calculation for expensive operations
//    */
//   private memoizedCalculate<T>(key: string, calculator: () => T): T {
//     const now = Date.now();
//     const cached = this.memoCache.get(key);

//     if (cached && (now - cached.timestamp) < this.MEMO_TTL) {
//       return cached.value;
//     }

//     const result = calculator();
//     this.memoCache.set(key, { value: result, timestamp: now });

//     // Clean up old entries periodically
//     if (this.memoCache.size > 50) {
//       const cutoff = now - this.MEMO_TTL;
//       for (const [k, v] of this.memoCache.entries()) {
//         if (v.timestamp < cutoff) {
//           this.memoCache.delete(k);
//         }
//       }
//     }

//     return result;
//   }

//   /**
//    * Initialize Web Worker for physics calculations
//    */
//   private initializeWorker(): void {
//     if (this.physicsWorker) return; // Already initialized

//     try {
//       this.physicsWorker = new Worker('./physicsWorker.js');

//       this.physicsWorker.onmessage = (e) => {
//         const { type, nodes, error } = e.data;

//         if (type === 'forcesComputed' && nodes) {
//           // Update nodes with computed forces
//           nodes.forEach((updatedNode: NeuralNode) => {
//             const localNode = this.nodes.find(n => n.id === updatedNode.id);
//             if (localNode) {
//               localNode.vx = updatedNode.vx;
//               localNode.vy = updatedNode.vy;
//             }
//           });

//           // Process next task in queue
//           this.isWorkerProcessing = false;
//           this.processWorkerQueue();

//         } else if (type === 'error') {
//           console.error('Web Worker error:', error);
//           this.isWorkerProcessing = false;
//           this.processWorkerQueue(); // Continue with next task
//         }
//       };

//       this.physicsWorker.onerror = (error) => {
//         console.error('Web Worker failed:', error);
//         this.isWorkerProcessing = false;
//         this.physicsWorker = null; // Disable worker on error
//         this.processWorkerQueue(); // Fall back to main thread
//       };

//       console.log('🔧 Physics Web Worker initialized');
//     } catch (error) {
//       console.warn('Failed to initialize Web Worker, falling back to main thread:', error);
//       this.physicsWorker = null;
//     }
//   }

//   /**
//    * Process Web Worker queue for large graph calculations
//    */
//   private processWorkerQueue(): void {
//     if (this.isWorkerProcessing || this.workerQueue.length === 0) return;

//     this.isWorkerProcessing = true;

//     // Process one task at a time
//     const task = this.workerQueue.shift();
//     if (task) {
//       try {
//         task();
//       } catch (error) {
//         console.error('Error in worker task:', error);
//       } finally {
//         this.isWorkerProcessing = false;
//         // Process next task if available
//         if (this.workerQueue.length > 0) {
//           this.processWorkerQueue();
//         }
//       }
//     }
//   }

//   /**
//    * Queue expensive calculation for background processing
//    */
//   private queueExpensiveCalculation(task: () => void): void {
//     if (this.performanceMode && this.physicsWorker) {
//       // Use Web Worker for large graphs
//       this.workerQueue.push(() => {
//         if (this.physicsWorker) {
//           this.physicsWorker.postMessage({
//             type: 'computeForces',
//             data: {
//               nodes: [...this.nodes],
//               links: [...this.links],
//               config: { ...this.config },
//               currentCognitiveLoad: this.currentCognitiveLoad,
//               focusNodeId: this.focusNodeId,
//               isFocusLocked: this.isFocusLocked,
//               focusConnectedNodes: Array.from(this.focusConnectedNodes)
//             }
//           });
//         }
//       });
//       this.processWorkerQueue();
//     } else {
//       // Execute immediately for smaller graphs or when worker unavailable
//       task();
//     }
//   }

//   /**
//    * Update the graph data and restart simulation
//    */
//   public updateGraph(graphData: {
//     nodes: NeuralNode[];
//     links: NeuralLink[];
//     totalActivationLevel?: number;
//     knowledgeHealth?: number;
//     cognitiveComplexity?: number;
//     dueNodesCount?: number;
//     criticalLogicCount?: number;
//     lastUpdated?: Date;
//   }): void {
//     try {
//       if (!Array.isArray(graphData.nodes) || !Array.isArray(graphData.links)) {
//         console.error('Invalid graph data provided to physics engine');
//         return;
//       }

//       this.nodes = graphData.nodes.map((node) => ({
//         ...node,
//         // Ensure required physics properties - start more centered to avoid downward bias
//         x: node.x || (this.width / 2 + (Math.random() - 0.5) * this.width * 0.6),
//         y: node.y || (this.height / 2 + (Math.random() - 0.5) * this.height * 0.6),
//         vx: node.vx || 0,
//         vy: node.vy || 0,
//         fx: node.fx,
//         fy: node.fy,
//       }));

//       this.links = graphData.links.map((link) => ({
//         ...link,
//         source: typeof link.source === 'string' ? link.source : link.source.id,
//         target: typeof link.target === 'string' ? link.target : link.target.id,
//       }));

//       // Performance optimization: Enable performance mode for large graphs
//       this.checkPerformanceMode();

//       this.initializeSimulation();
//       this.updateFocusConnectedNodes();
//       this.updateAllForces();

//       console.log(
//         `🔬 Graph updated: ${this.nodes.length} nodes, ${this.links.length} links${this.performanceMode ? ' (Performance Mode)' : ''}`,
//       );
//     } catch (error) {
//       console.error('Error updating graph in physics engine:', error);
//     }
//   }

//   /**
//    * Set callback for simulation tick updates
//    */
//   public onTick(
//     callback: (nodes: NeuralNode[], links: NeuralLink[]) => void,
//   ): void {
//     this.tickCallback = callback;
//   }

//   /**
//    * Start the simulation
//    */
//   public start(): void {
//     if (!this.simulation) {
//       this.initializeSimulation();
//     }

//     this.isRunning = true;
//     this.simulation?.restart();
//     console.log('🚀 Physics simulation started');
//   }

//   /**
//    * Stop the simulation
//    */
//   public stop(): void {
//     this.isRunning = false;
//     this.simulation?.stop();
//     console.log('⏸️ Physics simulation stopped');
//   }

//   /**
//    * Initialize D3 force simulation
//    */
//   private initializeSimulation(): void {
//     if (!this.nodes || this.nodes.length === 0) {
//       console.warn('Cannot initialize simulation with empty nodes');
//       return;
//     }

//     try {
//       // Create simulation with nodes
//       this.simulation = d3.forceSimulation(this.nodes)
//         .alphaDecay(0.01)   // Slower cooling rate for better stabilization
//         .alphaMin(0.01)     // Higher minimum alpha to prevent premature stopping
//         .velocityDecay(0.6); // Higher velocity retention to prevent nodes flying off

//       // Set up basic forces
//       this.updateAllForces();

//       // Set up tick callback
//       this.simulation.on('tick', () => {
//         if (this.tickCallback && this.isRunning) {
//           // Apply boundary constraints before calling tick callback
//           this.applyBoundaryConstraints();
//           this.tickCallback([...this.nodes], [...this.links]);
//         }
//       });

//       // Set up end callback
//       this.simulation.on('end', () => {
//         console.log('🏁 Physics simulation ended');
//       });

//       console.log('🔬 D3 force simulation initialized with stabilization parameters and boundary constraints');
//     } catch (error) {
//       console.error('Error initializing D3 simulation:', error);
//     }
//   }

//   /**
//    * Phase 5.5: Update all forces based on current state including focus lock
//    */
//   private updateAllForces(): void {
//     if (!this.simulation) return;

//     // Performance optimization: Throttle force updates for large graphs
//     if (this.performanceMode && this.forceUpdateThrottle > 0) {
//       this.forceUpdateThrottle--;
//       return; // Skip this update to reduce computational load
//     }

//     try {
//       // Memoized center force calculation - increased strength to prevent downward bias
//       const centerForce = this.memoizedCalculate(
//         `centerForce-${this.isFocusLocked}-${!!this.focusNodeId}`,
//         () => {
//           const force = d3.forceCenter(this.width / 2, this.height / 2);
//           if (this.isFocusLocked) {
//             // Strongest centering in focus lock mode
//             force.strength(1.2);
//           } else if (this.focusNodeId) {
//             // Stronger centering in focus mode
//             force.strength(1.0);
//           } else {
//             force.strength(0.8);
//           }
//           return force;
//         }
//       );
//       this.simulation.force('center', centerForce);

//       // Memoized collision force calculation
//       const collisionForce = this.memoizedCalculate(
//         `collisionForce-${this.isFocusLocked}-${this.currentCognitiveLoad.toFixed(2)}-${this.focusNodeId}`,
//         () => d3
//           .forceCollide<NeuralNode>()
//           .radius((node) => {
//             const baseRadius = node.radius || 15;

//             // Adjust radius based on cognitive load and focus lock
//             let adjustedRadius = baseRadius;
//             if (this.isFocusLocked) {
//               // More spacing for non-focus nodes when locked
//               if (
//                 node.id !== this.focusNodeId &&
//                 !this.focusConnectedNodes.has(node.id)
//               ) {
//                 adjustedRadius *= 2.0;
//               }
//             } else if (this.currentCognitiveLoad > 0.7) {
//               adjustedRadius *= 1.5; // More spacing when overwhelmed
//             } else if (this.currentCognitiveLoad < 0.3) {
//               adjustedRadius *= 0.8; // Tighter when focused
//             }

//             return adjustedRadius + 5; // Add padding
//           })
//           .strength(0.9)
//       );

//       this.simulation.force('collision', collisionForce);

//       // Queue expensive force updates for background processing
//       this.queueExpensiveCalculation(() => {
//         this.updateLinkForces();
//         this.updateManyBodyForces();

//         // Phase 5 & 5.5: Focus-specific forces
//         if (this.focusNodeId) {
//           this.updateFocusForces();
//         } else {
//           // Remove focus forces when not in focus mode
//           this.simulation?.force('focusAttraction', null);
//           this.simulation?.force('distractionRepulsion', null);
//           this.simulation?.force('lockRepulsion', null);
//         }
//       });

//       // Reset throttle counter after successful update
//       if (this.performanceMode) {
//         this.forceUpdateThrottle = 1;
//       }
//     } catch (error) {
//       console.error('Error updating forces:', error);
//     }
//   }

//   /**
//    * Update link forces with focus and lock consideration
//    */
//   private updateLinkForces(): void {
//     if (!this.simulation || !this.links) return;

//     // Memoized link force calculation based on current state
//     const linkForce = this.memoizedCalculate(
//       `linkForce-${this.currentCognitiveLoad.toFixed(2)}-${this.isFocusLocked}-${!!this.focusNodeId}-${this.focusConnectedNodes.size}`,
//       () => d3
//         .forceLink<NeuralNode, NeuralLink>(this.links)
//         .id((node) => node.id)
//         .distance((link) => {
//           let distance = this.config.linkDistance;

//           // Adjust distance based on cognitive load
//           if (this.currentCognitiveLoad > 0.7) {
//             distance *= 1.4; // More spacing when overwhelmed
//           } else if (this.currentCognitiveLoad < 0.3) {
//             distance *= 0.7; // Tighter when sharp
//           }

//           // Phase 5 & 5.5: Focus and lock adjustments
//           if (this.focusNodeId) {
//             const sourceId =
//               typeof link.source === 'object' ? link.source.id : link.source;
//             const targetId =
//               typeof link.target === 'object' ? link.target.id : link.target;

//             // Shorter links for focus node connections
//             if (sourceId === this.focusNodeId || targetId === this.focusNodeId) {
//               distance *= this.isFocusLocked ? 0.4 : 0.6; // Even shorter when locked
//             } else if (
//               this.focusConnectedNodes.has(sourceId) ||
//               this.focusConnectedNodes.has(targetId)
//             ) {
//               distance *= this.isFocusLocked ? 0.6 : 0.8;
//             } else {
//               // Much longer links for distracting connections when locked
//               distance *= this.isFocusLocked ? 2.5 : 1.5;
//             }
//           }

//           return distance;
//         })
//         .strength((link) => {
//           let strength = this.config.linkStrength * (link.strength || 0.5);

//           // Phase 5 & 5.5: Focus and lock strength adjustments
//           if (this.focusNodeId) {
//             const sourceId =
//               typeof link.source === 'object' ? link.source.id : link.source;
//             const targetId =
//               typeof link.target === 'object' ? link.target.id : link.target;

//             // Stronger links for focus connections
//             if (sourceId === this.focusNodeId || targetId === this.focusNodeId) {
//               strength *= this.isFocusLocked
//                 ? this.config.lockStrength
//                 : this.config.focusStrength;
//             } else if (
//               this.focusConnectedNodes.has(sourceId) ||
//               this.focusConnectedNodes.has(targetId)
//             ) {
//               strength *= this.isFocusLocked ? 2.0 : 1.5;
//             } else {
//               // Much weaker links for distracting connections when locked
//               strength *= this.isFocusLocked ? 0.1 : 0.3;
//             }
//           }

//           return strength;
//         })
//     );

//     this.simulation.force('link', linkForce);
//   }

//   /**
//    * Phase 5.5: Update many-body forces with  focus lock repulsion
//    */
//   private updateManyBodyForces(): void {
//     if (!this.simulation) return;

//     // Memoized many-body force calculation based on current state
//     const manyBodyForce = this.memoizedCalculate(
//       `manyBodyForce-${this.currentCognitiveLoad.toFixed(2)}-${this.isFocusLocked}-${!!this.focusNodeId}-${this.focusConnectedNodes.size}`,
//       () => d3
//         .forceManyBody<NeuralNode>()
//         .strength((node) => {
//           let baseStrength = this.config.repulsion;

//           // Adjust for cognitive load
//           if (this.currentCognitiveLoad > 0.7) {
//             baseStrength *= 1.5; // Stronger repulsion when overwhelmed
//           } else if (this.currentCognitiveLoad < 0.3) {
//             baseStrength *= 0.7; // Weaker repulsion when sharp
//           }

//           // Phase 5 & 5.5: Focus and lock-based repulsion
//           if (this.focusNodeId) {
//             if (node.id === this.focusNodeId) {
//               // Focus node has moderate repulsion
//               return baseStrength * (this.isFocusLocked ? 0.3 : 0.5);
//             } else if (this.focusConnectedNodes.has(node.id)) {
//               // Connected nodes have normal repulsion
//               return baseStrength;
//             } else {
//               // Distraction nodes have extreme repulsion when locked
//               return this.isFocusLocked
//                 ? this.config.lockRepulsion
//                 : this.config.distractionRepulsion;
//             }
//           }

//           return baseStrength;
//         })
//         .distanceMin(10)
//         .distanceMax(this.isFocusLocked ? 300 : 200) // Larger max distance when locked
//     );

//     this.simulation.force('charge', manyBodyForce);
//   }

//   /**
//    * Phase 5.5: Apply focus-specific forces with  lock mode
//    *
//    * Creates the "neural tunnel vision" effect by adding custom forces
//    *  with extreme repulsion and attraction in lock mode
//    */
//   private updateFocusForces(): void {
//     if (!this.simulation || !this.focusNodeId) return;

//     // Focus attraction force - pulls focus node toward center (stronger when locked)
//     const focusAttractionForce = (alpha: number) => {
//       const focusNode = this.nodes.find((node) => node.id === this.focusNodeId);
//       if (!focusNode) return;

//       const centerX = this.width / 2;
//       const centerY = this.height / 2;

//       const dx = centerX - (focusNode.x || 0);
//       const dy = centerY - (focusNode.y || 0);

//       const strength =
//         (this.isFocusLocked
//           ? this.config.focusAttraction * 2
//           : this.config.focusAttraction) * alpha;

//       focusNode.vx = (focusNode.vx || 0) + dx * strength;
//       focusNode.vy = (focusNode.vy || 0) + dy * strength;
//     };

//     //  distraction repulsion force - pushes non-focus nodes to periphery (extreme when locked)
//     const distractionRepulsionForce = (alpha: number) => {
//       const focusNode = this.nodes.find((node) => node.id === this.focusNodeId);
//       if (!focusNode) return;

//       const focusX = focusNode.x || this.width / 2;
//       const focusY = focusNode.y || this.height / 2;

//       this.nodes.forEach((node) => {
//         if (
//           node.id === this.focusNodeId ||
//           this.focusConnectedNodes.has(node.id)
//         ) {
//           return; // Skip focus node and connected nodes
//         }

//         const dx = (node.x || 0) - focusX;
//         const dy = (node.y || 0) - focusY;
//         const distance = Math.sqrt(dx * dx + dy * dy);

//         if (distance === 0) return;

//         // Use lock repulsion when focus lock is active
//         const baseRepulsion = this.isFocusLocked
//           ? this.config.lockRepulsion
//           : this.config.distractionRepulsion;
//         const strength = (baseRepulsion / 100) * alpha;
//         const force = strength / distance;

//         node.vx = (node.vx || 0) + (dx / distance) * force;
//         node.vy = (node.vy || 0) + (dy / distance) * force;
//       });
//     };

//     // Phase 5.5: Additional lock-specific peripheral force
//     if (this.isFocusLocked) {
//       const peripheralForce = (alpha: number) => {
//         const centerX = this.width / 2;
//         const centerY = this.height / 2;
//         const maxDistance = Math.min(this.width, this.height) * 0.4;

//         this.nodes.forEach((node) => {
//           if (
//             node.id === this.focusNodeId ||
//             this.focusConnectedNodes.has(node.id)
//           ) {
//             return; // Skip focus node and connected nodes
//           }

//           const dx = (node.x || 0) - centerX;
//           const dy = (node.y || 0) - centerY;
//           const distance = Math.sqrt(dx * dx + dy * dy);

//           if (distance < maxDistance) {
//             // Push nodes outward if they're too close to center
//             const pushStrength = 0.5 * alpha;
//             const pushForce =
//               (pushStrength * (maxDistance - distance)) / maxDistance;

//             node.vx = (node.vx || 0) + (dx / distance) * pushForce;
//             node.vy = (node.vy || 0) + (dy / distance) * pushForce;
//           }
//         });
//       };

//       this.simulation.force('lockRepulsion', peripheralForce);
//     } else {
//       this.simulation.force('lockRepulsion', null);
//     }

//     // Apply custom forces
//     this.simulation.force('focusAttraction', focusAttractionForce);
//     this.simulation.force('distractionRepulsion', distractionRepulsionForce);
//   }

//   /**
//    * Apply responsive boundary constraints to keep nodes within canvas bounds
//    * Updated to ensure symmetric forces to prevent downward bias
//    */
//   private applyBoundaryConstraints(): void {
//     // Responsive padding based on canvas size and node radius
//     const basePadding = Math.min(this.width, this.height) * 0.05; // 5% of smaller dimension
//     const maxNodeRadius = Math.max(...this.nodes.map(n => n.radius || 15));
//     const padding = Math.max(basePadding, maxNodeRadius + 10); // Ensure nodes don't clip

//     const minX = padding;
//     const maxX = this.width - padding;
//     const minY = padding;
//     const maxY = this.height - padding;

//     // Boundary force strength (gradual push-back near edges)
//     const boundaryForce = 0.02;

//     this.nodes.forEach((node) => {
//       const nodeRadius = node.radius || 15;
//       let constrained = false;

//       // Gradual boundary forces for smoother behavior
//       const leftForce = Math.max(0, minX - (node.x! - nodeRadius));
//       const rightForce = Math.max(0, (node.x! + nodeRadius) - maxX);
//       const topForce = Math.max(0, minY - (node.y! - nodeRadius));
//       const bottomForce = Math.max(0, (node.y! + nodeRadius) - maxY);

//       // Apply gradual forces symmetrically
//       if (leftForce > 0) {
//         node.vx = (node.vx || 0) + leftForce * boundaryForce;
//         constrained = true;
//       }
//       if (rightForce > 0) {
//         node.vx = (node.vx || 0) - rightForce * boundaryForce;
//         constrained = true;
//       }
//       if (topForce > 0) {
//         node.vy = (node.vy || 0) + topForce * boundaryForce;
//         constrained = true;
//       }
//       if (bottomForce > 0) {
//         // Reduce bottom force slightly to prevent downward bias
//         node.vy = (node.vy || 0) - bottomForce * boundaryForce * 0.9;
//         constrained = true;
//       }

//       // Hard constraints as fallback (only when node is significantly out of bounds)
//       const hardMargin = padding * 0.5;
//       if (node.x! < -hardMargin) {
//         node.x = -hardMargin;
//         node.vx = Math.abs(node.vx || 0) * 0.3;
//         constrained = true;
//       } else if (node.x! > this.width + hardMargin) {
//         node.x = this.width + hardMargin;
//         node.vx = -Math.abs(node.vx || 0) * 0.3;
//         constrained = true;
//       }

//       if (node.y! < -hardMargin) {
//         node.y = -hardMargin;
//         node.vy = Math.abs(node.vy || 0) * 0.3;
//         constrained = true;
//       } else if (node.y! > this.height + hardMargin) {
//         node.y = this.height + hardMargin;
//         node.vy = -Math.abs(node.vy || 0) * 0.3;
//         constrained = true;
//       }

//       // Apply damping when near boundaries
//       if (constrained) {
//         node.vx = (node.vx || 0) * 0.95; // Light damping
//         node.vy = (node.vy || 0) * 0.95;
//       }
//     });
//   }

//   /**
//    * Phase 5: Update connected nodes set for focus mode
//    */
//   private updateFocusConnectedNodes(): void {
//     this.focusConnectedNodes.clear();

//     if (!this.focusNodeId || !this.links) return;

//     // Find all nodes directly connected to focus node
//     this.links.forEach((link) => {
//       const sourceId =
//         typeof link.source === 'object' ? link.source.id : link.source;
//       const targetId =
//         typeof link.target === 'object' ? link.target.id : link.target;

//       if (sourceId === this.focusNodeId) {
//         this.focusConnectedNodes.add(targetId);
//       } else if (targetId === this.focusNodeId) {
//         this.focusConnectedNodes.add(sourceId);
//       }
//     });

//     console.log(
//       `🎯 Focus connections updated: ${this.focusConnectedNodes.size} connected nodes`,
//     );
//   }

//   /**
//    * Check and enable performance mode for large graphs
//    */
//   private checkPerformanceMode(): void {
//     const nodeCount = this.nodes.length;
//     const wasPerformanceMode = this.performanceMode;

//     // Enable performance mode for graphs with 100+ nodes
//     this.performanceMode = nodeCount >= 100;

//     if (this.performanceMode && !wasPerformanceMode) {
//       console.log('⚡ Performance mode enabled for large graph');
//       // Reduce force update frequency for large graphs
//       this.forceUpdateThrottle = 1; // Skip every other update
//     } else if (!this.performanceMode && wasPerformanceMode) {
//       console.log('⚡ Performance mode disabled');
//       this.forceUpdateThrottle = 0;
//     }
//   }

//   /**
//    * Adapt configuration based on cognitive load
//    */
//   private adaptConfigToCognitiveLoad(): void {
//     const load = this.currentCognitiveLoad;

//     if (load > 0.7) {
//       // High load: simplify and calm the visualization
//       this.config.attraction *= 0.8;
//       this.config.repulsion *= 1.2;
//       this.config.linkDistance *= 1.3;
//       this.config.distractionRepulsion *= 1.5; // Stronger focus lock when overwhelmed
//       this.config.lockRepulsion *= 1.3; // Even stronger lock when overwhelmed
//     } else if (load < 0.3) {
//       // Low load: enhance and energize the visualization
//       this.config.attraction *= 1.2;
//       this.config.repulsion *= 0.8;
//       this.config.linkDistance *= 0.8;
//       this.config.focusStrength *= 1.2; // Stronger focus when sharp
//       this.config.lockStrength *= 1.1; // Slightly stronger lock when sharp
//     }
//     // Medium load: use default values
//   }

//   /**
//    * Get node color based on state and theme
//    */
//   public getNodeColor(node: NeuralNode): string {
//     // This method is called by the canvas for consistent coloring
//     const baseColors = {
//       light: {
//         default: '#6366F1',
//         active: '#EF4444',
//         mastered: '#10B981',
//         weak: '#F59E0B',
//       },
//       dark: {
//         default: '#8B5CF6',
//         active: '#F87171',
//         mastered: '#34D399',
//         weak: '#FBBF24',
//       },
//     };

//     const colors = baseColors[this.theme];

//     // Determine color based on node state
//     if (node.isActive) {
//       return colors.active;
//     } else if (node.masteryLevel > 0.8) {
//       return colors.mastered;
//     } else if (node.masteryLevel < 0.3) {
//       return colors.weak;
//     } else {
//       return colors.default;
//     }
//   }

//   /**
//    * Phase 5: Check if node is in focus context
//    */
//   public isNodeInFocusContext(nodeId: string): boolean {
//     if (!this.focusNodeId) return false;

//     return nodeId === this.focusNodeId || this.focusConnectedNodes.has(nodeId);
//   }

//   /**
//    * Phase 5.5: Get visual opacity for node based on focus lock state
//    */
//   public getNodeOpacity(nodeId: string): number {
//     if (!this.isFocusLocked || !this.focusNodeId) {
//       return 1.0; // Full opacity when not locked
//     }

//     if (nodeId === this.focusNodeId) {
//       return 1.0; // Full opacity for focus node
//     } else if (this.focusConnectedNodes.has(nodeId)) {
//       return 0.6; // Semi-transparent for connected nodes
//     } else {
//       return 0.1; // Very transparent for distraction nodes
//     }
//   }

//   /**
//    * Phase 5.5: Get visual blur amount for node based on focus lock state
//    */
//   public getNodeBlurAmount(nodeId: string): number {
//     if (!this.isFocusLocked || !this.focusNodeId) {
//       return 0; // No blur when not locked
//     }

//     if (nodeId === this.focusNodeId) {
//       return 0; // No blur for focus node
//     } else if (this.focusConnectedNodes.has(nodeId)) {
//       return 1; // Light blur for connected nodes
//     } else {
//       return this.config.lockBlurAmount; // Strong blur for distraction nodes
//     }
//   }

//   /**
//    * Phase 5.5: Get  performance metrics including lock state
//    */
//   public getPerformanceMetrics(): {
//     nodeCount: number;
//     linkCount: number;
//     isRunning: boolean;
//     focusMode: boolean;
//     focusLocked: boolean;
//     lockDuration: number;
//     cognitiveLoad: number;
//     averageNodeSpeed: number;
//   } {
//     const avgSpeed =
//       this.nodes.length > 0
//         ? this.nodes.reduce((sum, node) => {
//             const vx = node.vx || 0;
//             const vy = node.vy || 0;
//             return sum + Math.sqrt(vx * vx + vy * vy);
//           }, 0) / this.nodes.length
//         : 0;

//     return {
//       nodeCount: this.nodes.length,
//       linkCount: this.links.length,
//       isRunning: this.isRunning,
//       focusMode: this.focusNodeId !== null,
//       focusLocked: this.isFocusLocked,
//       lockDuration: this.getFocusLockDuration(),
//       cognitiveLoad: this.currentCognitiveLoad,
//       averageNodeSpeed: avgSpeed,
//     };
//   }

//   /**
//    * Cleanup and dispose of resources
//    */
//   public dispose(): void {
//     this.stop();

//     // Explicitly remove all forces from simulation to prevent memory leaks
//     if (this.simulation) {
//       this.simulation.force('center', null);
//       this.simulation.force('collision', null);
//       this.simulation.force('link', null);
//       this.simulation.force('charge', null);
//       this.simulation.force('focusAttraction', null);
//       this.simulation.force('distractionRepulsion', null);
//       this.simulation.force('lockRepulsion', null);
//       // Remove tick and end event listeners
//       this.simulation.on('tick', null);
//       this.simulation.on('end', null);
//       this.simulation = null;
//     }

//     this.nodes = [];
//     this.links = [];
//     this.focusConnectedNodes.clear();
//     this.tickCallback = undefined;

//     // Clear focus lock state
//     this.isFocusLocked = false;
//     this.lockStartTime = null;
//     this.lockSessionId = null;

//     // Clear memoization cache
//     this.memoCache.clear();

//     // Terminate Web Worker if active
//     if (this.physicsWorker) {
//       this.physicsWorker.terminate();
//       this.physicsWorker = null;
//     }

//     // Clear worker queue
//     this.workerQueue.length = 0;
//     this.isWorkerProcessing = false;

//     console.log('🗑️ Neural Physics Engine disposed with full cleanup');
//   }
// }

// export default NeuralPhysicsEngine;

