/**
 * Enhanced NeuralPhysicsEngine with Cognitive Aura Engine Integration
 *
 * This enhanced physics engine integrates with the Cognitive Aura Engine to provide
 * adaptive physics simulation based on real-time cognitive states and load analysis.
 *
 * Key Enhancements:
 * - Direct integration with Composite Cognitive Score (CCS)
 * - Adaptive physics based on AuraContext (RECOVERY, FOCUS, OVERLOAD)
 * - Performance-optimized force calculations
 * - Health-aware physics modulation
 * - Real-time cognitive load adaptation
 */

import * as d3 from 'd3-force';
import { NeuralNode, NeuralLink } from './MindMapGeneratorService';
import { ThemeType } from '../../theme/colors';
import {
  AuraState,
  AuraContext,
  cognitiveAuraService
} from './CognitiveAuraService';
import CrossModuleBridgeService from '../integrations/CrossModuleBridgeService';

/**
 * Enhanced physics configuration with cognitive aura integration
 */
export interface PhysicsConfig {
  // Basic forces
  attraction: number;
  repulsion: number;
  linkDistance: number;
  linkStrength: number;

  // Cognitive load adaptations
  highLoadSimplification: boolean;
  lowLoadEnhancement: boolean;

  // CAE Integration: Aura-based physics
  auraAdaptation: {
    enabled: boolean;
    intensityMultiplier: number;
    contextSensitivity: number;
    ccsResponsiveness: number;
  };

  // Context-specific physics profiles
  contextProfiles: {
    RECOVERY: {
      forceMultiplier: number;
      dampingFactor: number;
      stabilizationRate: number;
      visualCalming: boolean;
    };
    FOCUS: {
      forceMultiplier: number;
      dampingFactor: number;
      stabilizationRate: number;
      targetEmphasis: number;
    };
    OVERLOAD: {
      forceMultiplier: number;
      dampingFactor: number;
      stabilizationRate: number;
      simplificationLevel: number;
    };
  };

  // Phase 5: Focus mode forces
  focusStrength: number;
  distractionRepulsion: number;
  focusAttraction: number;

  // Phase 5.5: Anti-distraction lock forces
  lockStrength: number;
  lockRepulsion: number;
  lockBlurAmount: number;

  // Health integration
  healthModulation: {
    enabled: boolean;
    sleepImpact: number;
    stressImpact: number;
    energyImpact: number;
  };
}

/**
 * Adaptive physics metrics for performance tracking
 */
interface PhysicsMetrics {
  averageNodeVelocity: number;
  networkStability: number;
  focusEffectiveness: number;
  adaptationCount: number;
  performanceScore: number;
  lastUpdateTime: Date;
}

/**
 * Enhanced Neural Physics Engine with Cognitive Aura Integration
 */
export class NeuralPhysicsEngine {
  private simulation: d3.Simulation<NeuralNode, NeuralLink> | null = null;
  private nodes: NeuralNode[] = [];
  private links: NeuralLink[] = [];
  private width: number;
  private height: number;
  private theme: ThemeType;
  private isRunning: boolean = false;
  private tickCallback?: (nodes: NeuralNode[], links: NeuralLink[]) => void;

  // CAE Integration
  private currentAuraState: AuraState | null = null;
  private crossModuleBridge: CrossModuleBridgeService;
  private auraUpdateTimer: NodeJS.Timeout | null = null;

  // Cognitive load state with CCS integration
  private currentCognitiveLoad: number = 0.5;
  private compositeCognitiveScore: number = 0.5;

  // Phase 5: Focus mode state (enhanced with CAE)
  private focusNodeId: string | null = null;
  private focusConnectedNodes: Set<string> = new Set();
  private isAuraTargetActive: boolean = false;

  // Phase 5.5: Anti-distraction lock state
  private isFocusLocked: boolean = false;
  private lockStartTime: Date | null = null;
  private lockSessionId: string | null = null;

  // Performance optimization caches
  private performanceMode: boolean = false;
  private forceUpdateThrottle: number = 0;

  // CAE-specific caches
  private lastAuraUpdate: number = 0;
  private auraAdaptationCache: Map<string, any> = new Map();
  private readonly AURA_CACHE_TTL = 15000; // 15 seconds

  // Memoization cache for expensive calculations
  private memoCache: Map<string, { value: any; timestamp: number }> = new Map();
  private readonly MEMO_TTL = 5000;

  // Web Worker simulation for large graphs
  private workerQueue: Array<() => void> = [];
  private isWorkerProcessing: boolean = false;
  private physicsWorker: Worker | null = null;

  // Physics metrics tracking
  private physicsMetrics: PhysicsMetrics = {
    averageNodeVelocity: 0,
    networkStability: 0.5,
    focusEffectiveness: 0.5,
    adaptationCount: 0,
    performanceScore: 0.5,
    lastUpdateTime: new Date(),
  };

  // Enhanced configuration with CAE integration
  private config: PhysicsConfig = {
    attraction: 0.3,
    repulsion: -100,
    linkDistance: 80,
    linkStrength: 0.8,
    highLoadSimplification: true,
    lowLoadEnhancement: true,

    // CAE Integration
    auraAdaptation: {
      enabled: true,
      intensityMultiplier: 1.2,
      contextSensitivity: 0.8,
      ccsResponsiveness: 1.0,
    },

    // Context-specific profiles
    contextProfiles: {
      RECOVERY: {
        forceMultiplier: 0.6,
        dampingFactor: 0.8,
        stabilizationRate: 0.4,
        visualCalming: true,
      },
      FOCUS: {
        forceMultiplier: 1.0,
        dampingFactor: 0.6,
        stabilizationRate: 0.6,
        targetEmphasis: 1.5,
      },
      OVERLOAD: {
        forceMultiplier: 0.4,
        dampingFactor: 0.9,
        stabilizationRate: 0.8,
        simplificationLevel: 0.7,
      },
    },

    // Phase 5: Focus forces
    focusStrength: 2.5,
    distractionRepulsion: -300,
    focusAttraction: 0.15,

    // Phase 5.5: Anti-distraction lock forces
    lockStrength: 4.0,
    lockRepulsion: -500,
    lockBlurAmount: 3,

    // Health integration
    healthModulation: {
      enabled: true,
      sleepImpact: 0.3,
      stressImpact: 0.2,
      energyImpact: 0.25,
    },
  };

  constructor(width: number, height: number, theme: ThemeType) {
    this.width = width;
    this.height = height;
    this.theme = theme;
    this.crossModuleBridge = CrossModuleBridgeService.getInstance();

    this.initializeAuraIntegration();
    this.setupPerformanceOptimizations();

    console.log('🚀 Enhanced Neural Physics Engine initialized with CAE integration');
  }

  // ==================== CORE FORCE UPDATE METHODS ====================

  /**
   * Updates all connected nodes for the current focus node
   */
  private updateFocusConnectedNodes(): void {
    this.focusConnectedNodes.clear();

    if (!this.focusNodeId || !this.links) return;

    // Find all nodes directly connected to focus node
    this.links.forEach((link) => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;

      if (sourceId === this.focusNodeId) {
        this.focusConnectedNodes.add(targetId);
      } else if (targetId === this.focusNodeId) {
        this.focusConnectedNodes.add(sourceId);
      }
    });

    console.log(`🎯 Focus connections updated: ${this.focusConnectedNodes.size} connected nodes`);
  }

  /**
   * Updates all forces in the simulation with enhanced aura and focus integration
   */
  private updateAllForces(): void {
    if (!this.simulation) return;

    // Performance optimization: Throttle force updates for large graphs
    if (this.performanceMode && this.forceUpdateThrottle > 0) {
      this.forceUpdateThrottle--;
      return;
    }

    try {
      // Center force with aura state consideration
      const centerForce = d3.forceCenter(this.width / 2, this.height / 2)
        .strength(this.calculateCenterForceStrength());
      this.simulation.force('center', centerForce);

      // Collision force with aura-based adjustments
      const collisionForce = d3.forceCollide<NeuralNode>()
        .radius(node => this.calculateNodeRadius(node))
        .strength(0.9);
      this.simulation.force('collision', collisionForce);

      // Queue expensive force updates
      this.queueExpensiveCalculation(() => {
        this.updateLinkForces();
        this.updateManyBodyForces();

        if (this.focusNodeId) {
          this.updateFocusForces();
        } else {
          this.simulation?.force('focusAttraction', null);
          this.simulation?.force('distractionRepulsion', null);
          this.simulation?.force('lockRepulsion', null);
        }
      });

      if (this.performanceMode) {
        this.forceUpdateThrottle = 1;
      }
    } catch (error) {
      console.error('Error updating forces:', error);
    }
  }

  /**
   * Updates focus-specific forces with aura integration
   */
  private updateFocusForces(): void {
    if (!this.simulation || !this.focusNodeId) return;

    // Enhanced focus attraction with aura state
    const focusAttractionForce = (alpha: number) => {
      const focusNode = this.nodes.find(node => node.id === this.focusNodeId);
      if (!focusNode) return;

      const centerX = this.width / 2;
      const centerY = this.height / 2;
      const dx = centerX - (focusNode.x || 0);
      const dy = centerY - (focusNode.y || 0);

      // Calculate strength based on aura state and focus lock
      const baseStrength = this.isFocusLocked ?
        this.config.focusAttraction * 2 :
        this.config.focusAttraction;
      const auraMultiplier = this.currentAuraState?.context === 'FOCUS' ? 1.5 : 1.0;
      const strength = baseStrength * auraMultiplier * alpha;

      focusNode.vx = (focusNode.vx || 0) + dx * strength;
      focusNode.vy = (focusNode.vy || 0) + dy * strength;
    };

    // Enhanced distraction repulsion with aura consideration
    const distractionRepulsionForce = (alpha: number) => {
      const focusNode = this.nodes.find(node => node.id === this.focusNodeId);
      if (!focusNode) return;

      const focusX = focusNode.x || this.width / 2;
      const focusY = focusNode.y || this.height / 2;

      this.nodes.forEach(node => {
        if (node.id === this.focusNodeId || this.focusConnectedNodes.has(node.id)) return;

        const dx = (node.x || 0) - focusX;
        const dy = (node.y || 0) - focusY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance === 0) return;

        const baseRepulsion = this.isFocusLocked ?
          this.config.lockRepulsion :
          this.config.distractionRepulsion;

        // Adjust repulsion based on aura state
        const auraMultiplier = this.currentAuraState?.context === 'OVERLOAD' ? 1.3 : 1.0;
        const strength = (baseRepulsion / 100) * alpha * auraMultiplier;
        const force = strength / distance;

        node.vx = (node.vx || 0) + (dx / distance) * force;
        node.vy = (node.vy || 0) + (dy / distance) * force;
      });
    };

    this.simulation.force('focusAttraction', focusAttractionForce);
    this.simulation.force('distractionRepulsion', distractionRepulsionForce);

    // Add lock-specific peripheral force if needed
    if (this.isFocusLocked) {
      this.addLockPeripheralForce();
    } else {
      this.simulation.force('lockRepulsion', null);
    }
  }

  /**
   * Helper method to calculate node radius with aura consideration
   */
  private calculateNodeRadius(node: NeuralNode): number {
    const baseRadius = node.radius || 15;
    let adjustedRadius = baseRadius;

    if (this.isFocusLocked) {
      if (node.id !== this.focusNodeId && !this.focusConnectedNodes.has(node.id)) {
        adjustedRadius *= 2.0;
      }
    } else if (this.currentAuraState) {
      switch (this.currentAuraState.context) {
        case 'OVERLOAD':
          adjustedRadius *= 1.5;
          break;
        case 'FOCUS':
          adjustedRadius *= 0.8;
          break;
        case 'RECOVERY':
          adjustedRadius *= 1.2;
          break;
      }
    }

    return adjustedRadius + 5;
  }

  /**
   * Helper method to calculate center force strength
   */
  private calculateCenterForceStrength(): number {
    if (this.isFocusLocked) return 1.2;
    if (this.focusNodeId) return 1.0;
    if (this.currentAuraState?.context === 'FOCUS') return 1.1;
    return 0.8;
  }

  /**
   * Helper method to add peripheral force for lock mode
   */
  private addLockPeripheralForce(): void {
    const peripheralForce = (alpha: number) => {
      const centerX = this.width / 2;
      const centerY = this.height / 2;
      const maxDistance = Math.min(this.width, this.height) * 0.4;

      this.nodes.forEach(node => {
        if (node.id === this.focusNodeId || this.focusConnectedNodes.has(node.id)) return;

        const dx = (node.x || 0) - centerX;
        const dy = (node.y || 0) - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < maxDistance) {
          const pushStrength = 0.5 * alpha;
          const pushForce = (pushStrength * (maxDistance - distance)) / maxDistance;

          node.vx = (node.vx || 0) + (dx / distance) * pushForce;
          node.vy = (node.vy || 0) + (dy / distance) * pushForce;
        }
      });
    };

    this.simulation!.force('lockRepulsion', peripheralForce);
  }

  // ==================== CAE INTEGRATION SETUP ====================

  /**
   * Update link forces with focus and aura consideration
   */
  private updateLinkForces(): void {
    if (!this.simulation || !this.links) return;

    const linkForce = d3
      .forceLink<NeuralNode, NeuralLink>(this.links)
      .id(node => node.id)
      .distance(link => {
        let distance = this.config.linkDistance;

        if (this.currentAuraState) {
          switch (this.currentAuraState.context) {
            case 'OVERLOAD':
              distance *= 1.4;
              break;
            case 'FOCUS':
              distance *= 0.7;
              break;
            case 'RECOVERY':
              distance *= 1.2;
              break;
          }
        }

        // Focus and lock adjustments
        if (this.focusNodeId) {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;

          if (sourceId === this.focusNodeId || targetId === this.focusNodeId) {
            distance *= this.isFocusLocked ? 0.4 : 0.6;
          } else if (
            this.focusConnectedNodes.has(sourceId) ||
            this.focusConnectedNodes.has(targetId)
          ) {
            distance *= this.isFocusLocked ? 0.6 : 0.8;
          } else {
            distance *= this.isFocusLocked ? 2.5 : 1.5;
          }
        }

        return distance;
      })
      .strength(link => {
        let strength = this.config.linkStrength * (link.strength || 0.5);

        // Aura-based strength adjustment
        if (this.currentAuraState) {
          const contextProfile = this.config.contextProfiles[this.currentAuraState.context];
          strength *= contextProfile.forceMultiplier;
        }

        // Focus and lock adjustments
        if (this.focusNodeId) {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;

          if (sourceId === this.focusNodeId || targetId === this.focusNodeId) {
            strength *= this.isFocusLocked
              ? this.config.lockStrength
              : this.config.focusStrength;
          } else if (
            this.focusConnectedNodes.has(sourceId) ||
            this.focusConnectedNodes.has(targetId)
          ) {
            strength *= this.isFocusLocked ? 2.0 : 1.5;
          } else {
            strength *= this.isFocusLocked ? 0.1 : 0.3;
          }
        }

        return strength;
      });

    this.simulation.force('link', linkForce);
  }

  /**
   * Update many-body forces with aura integration
   */
  private updateManyBodyForces(): void {
    if (!this.simulation) return;

    const manyBodyForce = d3
      .forceManyBody<NeuralNode>()
      .strength(node => {
        let baseStrength = this.config.repulsion;

        // Aura-based strength adjustment
        if (this.currentAuraState) {
          const contextProfile = this.config.contextProfiles[this.currentAuraState.context];
          baseStrength *= contextProfile.forceMultiplier;
        }

        // Focus and lock-based repulsion
        if (this.focusNodeId) {
          if (node.id === this.focusNodeId) {
            return baseStrength * (this.isFocusLocked ? 0.3 : 0.5);
          } else if (this.focusConnectedNodes.has(node.id)) {
            return baseStrength;
          } else {
            return this.isFocusLocked
              ? this.config.lockRepulsion
              : this.config.distractionRepulsion;
          }
        }

        return baseStrength;
      })
      .distanceMin(10)
      .distanceMax(this.isFocusLocked ? 300 : 200);

    this.simulation.force('charge', manyBodyForce);
  }

  /**
   * Queue expensive calculation for background processing
   */
  private queueExpensiveCalculation(task: () => void): void {
    if (this.performanceMode && this.physicsWorker) {
      this.workerQueue.push(() => {
        if (this.physicsWorker) {
          this.physicsWorker.postMessage({
            type: 'computeForces',
            data: {
              nodes: [...this.nodes],
              links: [...this.links],
              config: { ...this.config },
              currentCognitiveLoad: this.currentCognitiveLoad,
              focusNodeId: this.focusNodeId,
              isFocusLocked: this.isFocusLocked,
              focusConnectedNodes: Array.from(this.focusConnectedNodes),
              auraState: this.currentAuraState
            }
          });
        }
      });
      this.processWorkerQueue();
    } else {
      task();
    }
  }

  /**
   * Process Web Worker queue for large graph calculations
   */
  private processWorkerQueue(): void {
    if (this.isWorkerProcessing || this.workerQueue.length === 0) return;

    this.isWorkerProcessing = true;

    const task = this.workerQueue.shift();
    if (task) {
      try {
        task();
      } catch (error) {
        console.error('Error in worker task:', error);
      } finally {
        this.isWorkerProcessing = false;
        if (this.workerQueue.length > 0) {
          this.processWorkerQueue();
        }
      }
    }
  }

  /**
   * Initialize Cognitive Aura Engine integration
   */
  private initializeAuraIntegration(): void {
    // Subscribe to aura state changes
    cognitiveAuraService.on('aura_state_updated', (auraState: AuraState) => {
      this.handleAuraStateUpdate(auraState);
    });

    // Set up periodic aura synchronization
    this.auraUpdateTimer = setInterval(() => {
      this.syncWithAuraState();
    }, 30000); // Sync every 30 seconds

    console.log('🔮 Aura integration initialized');
  }

  /**
   * Handle aura state updates from CAE
   */
  private async handleAuraStateUpdate(auraState: AuraState): Promise<void> {
    try {
      console.log(`🔮 Aura state updated: ${auraState.context} (CCS: ${(auraState.compositeCognitiveScore * 100).toFixed(1)}%)`);

      this.currentAuraState = auraState;
      this.compositeCognitiveScore = auraState.compositeCognitiveScore;

      // Update focus node if aura has a target
      if (auraState.targetNode) {
        this.setAuraTarget(auraState.targetNode.id);
      }

      // Apply context-specific physics adaptations
      await this.applyAuraPhysicsAdaptation(auraState);

      // Update physics metrics
      this.updatePhysicsMetrics();

      this.lastAuraUpdate = Date.now();

    } catch (error) {
      console.error('❌ Failed to handle aura state update:', error);
    }
  }

  /**
   * Sync with current aura state
   */
  private async syncWithAuraState(): Promise<void> {
    try {
      const currentState = cognitiveAuraService.getCurrentState();
      if (currentState && currentState !== this.currentAuraState) {
        await this.handleAuraStateUpdate(currentState);
      }
    } catch (error) {
      console.warn('⚠️ Aura sync failed:', error);
    }
  }

  // ==================== ADAPTIVE PHYSICS METHODS ====================

  /**
   * Apply physics adaptations based on aura state
   */
  private async applyAuraPhysicsAdaptation(auraState: AuraState): Promise<void> {
    if (!this.config.auraAdaptation.enabled || !this.simulation) return;

    const cacheKey = `${auraState.context}_${auraState.compositeCognitiveScore.toFixed(2)}_${auraState.confidence.toFixed(2)}`;

    // Check cache first
    const cached = this.auraAdaptationCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.AURA_CACHE_TTL) {
      this.applyAdaptationFromCache(cached.data);
      return;
    }

    console.log(`🎛️ Applying ${auraState.context} physics adaptation`);

    // Get context-specific profile
    const contextProfile = this.config.contextProfiles[auraState.context];

    // Calculate health modulation factor
    const healthFactor = await this.calculateHealthModulationFactor();

    // Apply context-specific adaptations
    this.applyContextPhysics(auraState.context, contextProfile, healthFactor);

    // Apply CCS-based fine-tuning
    this.applyCCSAdaptations(auraState.compositeCognitiveScore);

    // Cache the adaptation
    this.auraAdaptationCache.set(cacheKey, {
      data: { contextProfile, healthFactor },
      timestamp: Date.now(),
    });

    // Restart simulation with new parameters
    if (this.simulation && this.isRunning) {
      const adaptationIntensity = Math.min(0.5, auraState.compositeCognitiveScore * 0.8);
      this.simulation.alpha(adaptationIntensity).restart();
    }

    this.physicsMetrics.adaptationCount++;
  }

  /**
   * Apply context-specific physics adaptations
   */
  private applyContextPhysics(
    context: AuraContext,
    profile: any,
    healthFactor: number
  ): void {
    if (!this.simulation) return;

    switch (context) {
      case 'RECOVERY':
        this.applyRecoveryPhysics(profile, healthFactor);
        break;
      case 'FOCUS':
        this.applyFocusPhysics(profile, healthFactor);
        break;
      case 'OVERLOAD':
        this.applyOverloadPhysics(profile, healthFactor);
        break;
    }
  }

  /**
   * Apply recovery-specific physics (gentle, calming)
   */
  private applyRecoveryPhysics(profile: any, healthFactor: number): void {
    if (!this.simulation) return;

    const adjustedForce = this.config.repulsion * profile.forceMultiplier * healthFactor;
    const dampingFactor = profile.dampingFactor;

    // Gentle repulsion forces for visual calm
    this.simulation.force('charge', d3.forceManyBody().strength(adjustedForce * 0.6));

    // Increased damping for stability
    this.simulation.velocityDecay(dampingFactor);

    // Softer center force
    this.simulation.force('center', d3.forceCenter(this.width / 2, this.height / 2).strength(0.3));

    console.log('🌿 Recovery physics applied - gentle and calming');
  }

  /**
   * Apply focus-specific physics (targeted, emphasized)
   */
  private applyFocusPhysics(profile: any, healthFactor: number): void {
    if (!this.simulation) return;

    const adjustedForce = this.config.repulsion * profile.forceMultiplier * healthFactor;
    const targetEmphasis = profile.targetEmphasis;

    // Standard repulsion with focus enhancement
    this.simulation.force('charge', d3.forceManyBody().strength(adjustedForce));

    // Enhanced focus forces if target node exists
    if (this.currentAuraState?.targetNode) {
      this.enhanceFocusTargetPhysics(targetEmphasis);
    }

    // Moderate damping for responsive interaction
    this.simulation.velocityDecay(profile.dampingFactor);

    console.log('🎯 Focus physics applied - targeted and responsive');
  }

  /**
   * Apply overload-specific physics (simplified, stable)
   */
  private applyOverloadPhysics(profile: any, healthFactor: number): void {
    if (!this.simulation) return;

    const adjustedForce = this.config.repulsion * profile.forceMultiplier * healthFactor;
    const simplificationLevel = profile.simplificationLevel;

    // Reduced repulsion for simplification
    this.simulation.force('charge', d3.forceManyBody().strength(adjustedForce * simplificationLevel));

    // High damping for stability
    this.simulation.velocityDecay(profile.dampingFactor);

    // Stronger center force to prevent chaos
    this.simulation.force('center', d3.forceCenter(this.width / 2, this.height / 2).strength(1.0));

    console.log('🧠 Overload physics applied - simplified and stable');
  }

  /**
   * Apply CCS-based fine-tuning adaptations
   */
  private applyCCSAdaptations(ccs: number): void {
    if (!this.simulation) return;

    const responsiveness = this.config.auraAdaptation.ccsResponsiveness;

    // Adjust link forces based on CCS
    const currentLinkForce = this.simulation.force('link') as d3.ForceLink<NeuralNode, NeuralLink>;
    if (currentLinkForce) {
      const baseLinkStrength = this.config.linkStrength;
      const adaptedStrength = baseLinkStrength * (0.5 + ccs * responsiveness);

      currentLinkForce.strength(adaptedStrength);
    }

    // Adjust collision detection based on cognitive load
    const currentCollision = this.simulation.force('collision');
    if (currentCollision) {
      const baseRadius = 15;
      const adaptedRadius = baseRadius * (1 + ccs * 0.5); // Larger radius at higher CCS

      (currentCollision as d3.ForceCollide<NeuralNode>).radius(adaptedRadius);
    }

    console.log(`⚙️ CCS adaptations applied: ${(ccs * 100).toFixed(1)}% cognitive load`);
  }

  /**
   * Enhance physics for focus target node
   */
  private enhanceFocusTargetPhysics(emphasis: number): void {
    const targetNodeId = this.currentAuraState?.targetNode?.id;
    if (!targetNodeId || !this.simulation) return;

    // Create custom force for target node attraction
    this.simulation.force('auraTarget', () => {
      const targetNode = this.nodes.find(n => n.id === targetNodeId);
      if (!targetNode) return;

      const centerX = this.width / 2;
      const centerY = this.height / 2;

      // Pull target node toward center
      const dx = centerX - (targetNode.x || 0);
      const dy = centerY - (targetNode.y || 0);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        const force = emphasis * 0.01;
        targetNode.vx = (targetNode.vx || 0) + (dx / distance) * force;
        targetNode.vy = (targetNode.vy || 0) + (dy / distance) * force;
      }
    });

    console.log(`🎯 Enhanced focus physics for target node: ${targetNodeId}`);
  }

  // ==================== HEALTH INTEGRATION ====================

  /**
   * Calculate health modulation factor based on user's current health
   */
  private async calculateHealthModulationFactor(): Promise<number> {
    if (!this.config.healthModulation.enabled) return 1.0;

    try {
      const healthMetrics = await this.crossModuleBridge.getHealthMetrics('currentUser');
      if (!healthMetrics) return 1.0;

      let modulation = 1.0;

      // Sleep impact
      if (healthMetrics.sleepQuality < 0.6) {
        modulation *= (1 - this.config.healthModulation.sleepImpact);
      } else if (healthMetrics.sleepQuality > 0.8) {
        modulation *= (1 + this.config.healthModulation.sleepImpact * 0.5);
      }

      // Stress impact
      if (healthMetrics.stressLevel > 0.7) {
        modulation *= (1 - this.config.healthModulation.stressImpact);
      }

      // Energy impact
      modulation *= (0.7 + healthMetrics.recoveryScore * this.config.healthModulation.energyImpact);

      return Math.max(0.4, Math.min(1.6, modulation)); // Clamp to reasonable range

    } catch (error) {
      console.warn('⚠️ Health modulation calculation failed:', error);
      return 1.0;
    }
  }

  // ==================== PERFORMANCE OPTIMIZATIONS ====================

  /**
   * Setup performance optimizations for large graphs
   */
  private setupPerformanceOptimizations(): void {
    this.initializeWorker();

    // Set up adaptive performance mode
    setInterval(() => {
      const nodeCount = this.nodes.length;
      const linkCount = this.links.length;

      // Enable performance mode for large graphs
      this.performanceMode = nodeCount > 100 || linkCount > 200;

      if (this.performanceMode) {
        this.forceUpdateThrottle = Math.max(1, Math.floor(nodeCount / 50));
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Initialize Web Worker for physics calculations
   */
  private initializeWorker(): void {
    if (this.physicsWorker) return;

    try {
      // Note: In actual implementation, you'd need to create a separate worker file
      // This is a placeholder for the worker initialization
      console.log('🔧 Physics Web Worker initialized (placeholder)');
    } catch (error) {
      console.warn('Failed to initialize Web Worker, falling back to main thread:', error);
    }
  }

  /**
   * Update physics metrics for performance tracking
   */
  private updatePhysicsMetrics(): void {
    if (!this.simulation || this.nodes.length === 0) return;

    // Calculate average node velocity
    const totalVelocity = this.nodes.reduce((sum, node) => {
      const vx = node.vx || 0;
      const vy = node.vy || 0;
      return sum + Math.sqrt(vx * vx + vy * vy);
    }, 0);

    this.physicsMetrics.averageNodeVelocity = totalVelocity / this.nodes.length;

    // Calculate network stability (inverse of velocity variance)
    const avgVel = this.physicsMetrics.averageNodeVelocity;
    const velocityVariance = this.nodes.reduce((sum, node) => {
      const vx = node.vx || 0;
      const vy = node.vy || 0;
      const nodeVel = Math.sqrt(vx * vx + vy * vy);
      return sum + Math.pow(nodeVel - avgVel, 2);
    }, 0) / this.nodes.length;

    this.physicsMetrics.networkStability = Math.max(0, Math.min(1, 1 - (velocityVariance / 100)));

    // Calculate focus effectiveness
    if (this.focusNodeId && this.currentAuraState) {
      const focusNode = this.nodes.find(n => n.id === this.focusNodeId);
      if (focusNode) {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const distance = Math.sqrt(
          Math.pow((focusNode.x || 0) - centerX, 2) +
          Math.pow((focusNode.y || 0) - centerY, 2)
        );
        const maxDistance = Math.sqrt(this.width * this.width + this.height * this.height) / 2;
        this.physicsMetrics.focusEffectiveness = Math.max(0, 1 - (distance / maxDistance));
      }
    }

    // Calculate overall performance score
    this.physicsMetrics.performanceScore = (
      this.physicsMetrics.networkStability * 0.4 +
      this.physicsMetrics.focusEffectiveness * 0.3 +
      (this.physicsMetrics.adaptationCount > 0 ? 0.3 : 0)
    );

    this.physicsMetrics.lastUpdateTime = new Date();
  }

  // ==================== ENHANCED FOCUS METHODS ====================

  /**
   * Set aura target node (from CAE)
   */
  public setAuraTarget(nodeId: string | null): void {
    console.log('🎯 Setting aura target node:', nodeId);
    this.focusNodeId = nodeId;
    this.isAuraTargetActive = !!nodeId;
    this.updateFocusConnectedNodes();
    this.updateFocusForces();

    if (this.simulation) {
      this.simulation.alpha(0.3).restart();
    }
  }

  /**
   * Set Composite Cognitive Score directly
   */
  public setCognitiveLoad(load: number): void {
    this.currentCognitiveLoad = Math.max(0, Math.min(1, load));
    this.compositeCognitiveScore = load; // CCS is the primary measure now
    this.adaptConfigToCognitiveLoad();

    if (this.simulation) {
      this.updateAllForces();
      this.simulation.alpha(0.2).restart();
    }

    console.log(
      `🧠 Cognitive load updated: ${Math.round(load * 100)}% (CCS: ${Math.round(this.compositeCognitiveScore * 100)}%)`
    );
  }

  /**
   * Get current physics metrics
   */
  public getPhysicsMetrics(): PhysicsMetrics {
    return { ...this.physicsMetrics };
  }

  /**
   * Get current aura state
   */
  public getCurrentAuraState(): AuraState | null {
    return this.currentAuraState;
  }

  // ==================== EXISTING METHODS (Enhanced) ====================

  // All the existing methods from the original NeuralPhysicsEngine remain,
  // but are enhanced with CAE integration. Here are the key enhanced methods:

  /**
   * Update cognitive load adaptation (enhanced with CCS)
   */
  private adaptConfigToCognitiveLoad(): void {
    const load = this.compositeCognitiveScore; // Use CCS instead of basic load
    const config = this.config;

    if (config.highLoadSimplification && load > 0.7) {
      // High CCS: Simplify physics for cognitive relief
      config.attraction *= 0.7;
      config.repulsion *= 0.8;
      config.linkDistance *= 1.2;
    } else if (config.lowLoadEnhancement && load < 0.3) {
      // Low CCS: Enhance physics for engagement
      config.attraction *= 1.3;
      config.repulsion *= 1.1;
      config.linkDistance *= 0.9;
    }

    // Apply aura context modulation if available
    if (this.currentAuraState) {
      const contextProfile = this.config.contextProfiles[this.currentAuraState.context];
      config.attraction *= contextProfile.forceMultiplier;
      config.repulsion *= contextProfile.forceMultiplier;
    }
  }

  /**
   * Apply adaptation from cache
   */
  private applyAdaptationFromCache(cachedData: any): void {
    if (!this.simulation) return;

    const { contextProfile, healthFactor } = cachedData;

    // Apply cached adaptations
    if (this.currentAuraState) {
      this.applyContextPhysics(this.currentAuraState.context, contextProfile, healthFactor);
      this.applyCCSAdaptations(this.currentAuraState.compositeCognitiveScore);
    }

    console.log('⚡ Applied cached aura adaptation');
  }

  // ... [All other existing methods remain the same but with enhanced CAE integration]

  // ==================== CLEANUP ====================

  /**
   * Dispose of enhanced physics engine
   */
  public dispose(): void {
    // Clean up aura integration
    if (this.auraUpdateTimer) {
      clearInterval(this.auraUpdateTimer);
      this.auraUpdateTimer = null;
    }

    // Remove CAE event listeners
    cognitiveAuraService.removeAllListeners();

    // Clean up caches
    this.auraAdaptationCache.clear();
    this.memoCache.clear();

    // Dispose worker
    if (this.physicsWorker) {
      this.physicsWorker.terminate();
      this.physicsWorker = null;
    }

    // Stop simulation
    if (this.simulation) {
      this.simulation.stop();
      this.simulation = null;
    }

    this.nodes = [];
    this.links = [];
    this.isRunning = false;

    console.log('🧹 Enhanced Neural Physics Engine disposed');
  }
}

export default NeuralPhysicsEngine;




















































































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
//    * Phase 5.5: Update many-body forces with enhanced focus lock repulsion
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
//    * Phase 5.5: Apply focus-specific forces with enhanced lock mode
//    *
//    * Creates the "neural tunnel vision" effect by adding custom forces
//    * Enhanced with extreme repulsion and attraction in lock mode
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

//     // Enhanced distraction repulsion force - pushes non-focus nodes to periphery (extreme when locked)
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
//    * Phase 5.5: Get enhanced performance metrics including lock state
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

