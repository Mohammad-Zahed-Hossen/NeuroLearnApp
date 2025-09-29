import * as d3 from 'd3-force';
import { NeuralNode, NeuralLink } from './MindMapGeneratorService';
import { ThemeType } from '../theme/colors';

export interface PhysicsConfig {
  // Basic forces
  attraction: number;
  repulsion: number;
  linkDistance: number;
  linkStrength: number;

  // Cognitive load adaptations
  highLoadSimplification: boolean;
  lowLoadEnhancement: boolean;

  // Phase 5: Focus mode forces
  focusStrength: number; // How strongly to emphasize focus node
  distractionRepulsion: number; // How strongly to repel non-focus nodes
  focusAttraction: number; // How much to pull focus node to center

  // Phase 5.5: Anti-distraction lock forces
  lockStrength: number; // How strongly to enforce focus lock
  lockRepulsion: number; // Extreme repulsion when focus lock is active
  lockBlurAmount: number; // Visual blur amount for locked mode
}

export class NeuralPhysicsEngine {
  private simulation: d3.Simulation<NeuralNode, NeuralLink> | null = null;
  private nodes: NeuralNode[] = [];
  private links: NeuralLink[] = [];
  private width: number;
  private height: number;
  private theme: ThemeType;
  private isRunning: boolean = false;
  private tickCallback?: (nodes: NeuralNode[], links: NeuralLink[]) => void;

  // Cognitive load state
  private currentCognitiveLoad: number = 0.5;

  // Phase 5: Focus mode state
  private focusNodeId: string | null = null;
  private focusConnectedNodes: Set<string> = new Set();

  // Phase 5.5: Anti-distraction lock state
  private isFocusLocked: boolean = false;
  private lockStartTime: Date | null = null;
  private lockSessionId: string | null = null;

  // Performance optimization caches
  private performanceMode: boolean = false;
  private forceUpdateThrottle: number = 0;

  // Memoization cache for expensive calculations
  private memoCache: Map<string, { value: any; timestamp: number }> = new Map();
  private readonly MEMO_TTL = 5000; // 5 seconds TTL for memoized values

  // Web Worker simulation for large graphs
  private workerQueue: Array<() => void> = [];
  private isWorkerProcessing: boolean = false;
  private physicsWorker: Worker | null = null;

  // Configuration
  private config: PhysicsConfig = {
    attraction: 0.3,
    repulsion: -100,
    linkDistance: 80,
    linkStrength: 0.8,
    highLoadSimplification: true,
    lowLoadEnhancement: true,
    // Phase 5: Focus forces
    focusStrength: 2.5,
    distractionRepulsion: -300,
    focusAttraction: 0.15,
    // Phase 5.5: Anti-distraction lock forces
    lockStrength: 4.0,
    lockRepulsion: -500,
    lockBlurAmount: 3,
  };

  constructor(width: number, height: number, theme: ThemeType) {
    this.width = width;
    this.height = height;
    this.theme = theme;

    console.log(
      '🔬 Neural Physics Engine initialized with Phase 5.5 anti-distraction capabilities',
    );
  }

  /**
   * Phase 5, Step 2: Set Focus Node for Neural Lock
   *
   * This is the KEY method that enables "neural tunnel vision"
   * Physically reorganizes the network around the selected focus target
   */
  public setFocusNode(focusNodeId: string | null): void {
    console.log('🎯 Setting focus node:', focusNodeId);

    this.focusNodeId = focusNodeId;
    this.updateFocusConnectedNodes();
    this.updateFocusForces();

    // If simulation is running, apply forces immediately
    if (this.simulation) {
      this.simulation.alpha(0.3).restart();
    }
  }

  /**
   * Phase 5.5: Set Focus Lock - Anti-Context Switching Lock
   *
   * This enforces the strongest level of visual and physical distraction filtering
   */
  public setFocusLock(isLocked: boolean, sessionId?: string): void {
    const wasLocked = this.isFocusLocked;
    this.isFocusLocked = isLocked;

    if (isLocked && !wasLocked) {
      // Engaging focus lock
      this.lockStartTime = new Date();
      this.lockSessionId = sessionId || null;

      // Apply immediate and stronger focus forces
      if (this.simulation) {
        this.updateAllForces();
        this.simulation.alpha(0.5).restart(); // Higher alpha for immediate effect
      }

      console.log('🔒 FOCUS LOCK ENGAGED - Anti-distraction layer active');
      console.log(
        `🧠 Physical repulsion increased to ${this.config.lockRepulsion}`
      );
    } else if (!isLocked && wasLocked) {
      // Disengaging focus lock
      this.lockStartTime = null;
      this.lockSessionId = null;

      // Return to normal focus forces
      if (this.simulation) {
        this.updateAllForces();
        this.simulation.alpha(0.3).restart();
      }

      console.log('🔓 Focus lock disengaged - returning to normal forces');
    }
  }

  /**
   * Get current focus node
   */
  public getFocusNode(): string | null {
    return this.focusNodeId;
  }

  /**
   * Check if focus mode is active
   */
  public isFocusModeActive(): boolean {
    return this.focusNodeId !== null;
  }

  /**
   * Phase 5.5: Check if anti-distraction focus lock is active
   */
  public isFocusLockActive(): boolean {
    return this.isFocusLocked;
  }

  /**
   * Phase 5.5: Get focus lock duration
   */
  public getFocusLockDuration(): number {
    if (!this.lockStartTime) return 0;
    return Date.now() - this.lockStartTime.getTime();
  }

  /**
   * Phase 5.5: Get focus lock session ID
   */
  public getFocusLockSessionId(): string | null {
    return this.lockSessionId;
  }

  /**
   * Update cognitive load and adapt physics accordingly
   */
  public updateCognitiveLoad(cognitiveLoad: number): void {
    this.currentCognitiveLoad = Math.max(0, Math.min(1, cognitiveLoad));
    this.adaptConfigToCognitiveLoad();

    if (this.simulation) {
      this.updateAllForces();
      this.simulation.alpha(0.2).restart();
    }

    console.log(
      `🧠 Cognitive load updated: ${Math.round(cognitiveLoad * 100)}%`,
    );
  }

  /**
   * Memoized calculation for expensive operations
   */
  private memoizedCalculate<T>(key: string, calculator: () => T): T {
    const now = Date.now();
    const cached = this.memoCache.get(key);

    if (cached && (now - cached.timestamp) < this.MEMO_TTL) {
      return cached.value;
    }

    const result = calculator();
    this.memoCache.set(key, { value: result, timestamp: now });

    // Clean up old entries periodically
    if (this.memoCache.size > 50) {
      const cutoff = now - this.MEMO_TTL;
      for (const [k, v] of this.memoCache.entries()) {
        if (v.timestamp < cutoff) {
          this.memoCache.delete(k);
        }
      }
    }

    return result;
  }

  /**
   * Initialize Web Worker for physics calculations
   */
  private initializeWorker(): void {
    if (this.physicsWorker) return; // Already initialized

    try {
      this.physicsWorker = new Worker('./physicsWorker.js');

      this.physicsWorker.onmessage = (e) => {
        const { type, nodes, error } = e.data;

        if (type === 'forcesComputed' && nodes) {
          // Update nodes with computed forces
          nodes.forEach((updatedNode: NeuralNode) => {
            const localNode = this.nodes.find(n => n.id === updatedNode.id);
            if (localNode) {
              localNode.vx = updatedNode.vx;
              localNode.vy = updatedNode.vy;
            }
          });

          // Process next task in queue
          this.isWorkerProcessing = false;
          this.processWorkerQueue();

        } else if (type === 'error') {
          console.error('Web Worker error:', error);
          this.isWorkerProcessing = false;
          this.processWorkerQueue(); // Continue with next task
        }
      };

      this.physicsWorker.onerror = (error) => {
        console.error('Web Worker failed:', error);
        this.isWorkerProcessing = false;
        this.physicsWorker = null; // Disable worker on error
        this.processWorkerQueue(); // Fall back to main thread
      };

      console.log('🔧 Physics Web Worker initialized');
    } catch (error) {
      console.warn('Failed to initialize Web Worker, falling back to main thread:', error);
      this.physicsWorker = null;
    }
  }

  /**
   * Process Web Worker queue for large graph calculations
   */
  private processWorkerQueue(): void {
    if (this.isWorkerProcessing || this.workerQueue.length === 0) return;

    this.isWorkerProcessing = true;

    // Process one task at a time
    const task = this.workerQueue.shift();
    if (task) {
      try {
        task();
      } catch (error) {
        console.error('Error in worker task:', error);
      } finally {
        this.isWorkerProcessing = false;
        // Process next task if available
        if (this.workerQueue.length > 0) {
          this.processWorkerQueue();
        }
      }
    }
  }

  /**
   * Queue expensive calculation for background processing
   */
  private queueExpensiveCalculation(task: () => void): void {
    if (this.performanceMode && this.physicsWorker) {
      // Use Web Worker for large graphs
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
              focusConnectedNodes: Array.from(this.focusConnectedNodes)
            }
          });
        }
      });
      this.processWorkerQueue();
    } else {
      // Execute immediately for smaller graphs or when worker unavailable
      task();
    }
  }

  /**
   * Update the graph data and restart simulation
   */
  public updateGraph(graphData: {
    nodes: NeuralNode[];
    links: NeuralLink[];
    totalActivationLevel?: number;
    knowledgeHealth?: number;
    cognitiveComplexity?: number;
    dueNodesCount?: number;
    criticalLogicCount?: number;
    lastUpdated?: Date;
  }): void {
    try {
      if (!Array.isArray(graphData.nodes) || !Array.isArray(graphData.links)) {
        console.error('Invalid graph data provided to physics engine');
        return;
      }

      this.nodes = graphData.nodes.map((node) => ({
        ...node,
        // Ensure required physics properties - start more centered to avoid downward bias
        x: node.x || (this.width / 2 + (Math.random() - 0.5) * this.width * 0.6),
        y: node.y || (this.height / 2 + (Math.random() - 0.5) * this.height * 0.6),
        vx: node.vx || 0,
        vy: node.vy || 0,
        fx: node.fx,
        fy: node.fy,
      }));

      this.links = graphData.links.map((link) => ({
        ...link,
        source: typeof link.source === 'string' ? link.source : link.source.id,
        target: typeof link.target === 'string' ? link.target : link.target.id,
      }));

      // Performance optimization: Enable performance mode for large graphs
      this.checkPerformanceMode();

      this.initializeSimulation();
      this.updateFocusConnectedNodes();
      this.updateAllForces();

      console.log(
        `🔬 Graph updated: ${this.nodes.length} nodes, ${this.links.length} links${this.performanceMode ? ' (Performance Mode)' : ''}`,
      );
    } catch (error) {
      console.error('Error updating graph in physics engine:', error);
    }
  }

  /**
   * Set callback for simulation tick updates
   */
  public onTick(
    callback: (nodes: NeuralNode[], links: NeuralLink[]) => void,
  ): void {
    this.tickCallback = callback;
  }

  /**
   * Start the simulation
   */
  public start(): void {
    if (!this.simulation) {
      this.initializeSimulation();
    }

    this.isRunning = true;
    this.simulation?.restart();
    console.log('🚀 Physics simulation started');
  }

  /**
   * Stop the simulation
   */
  public stop(): void {
    this.isRunning = false;
    this.simulation?.stop();
    console.log('⏸️ Physics simulation stopped');
  }

  /**
   * Initialize D3 force simulation
   */
  private initializeSimulation(): void {
    if (!this.nodes || this.nodes.length === 0) {
      console.warn('Cannot initialize simulation with empty nodes');
      return;
    }

    try {
      // Create simulation with nodes
      this.simulation = d3.forceSimulation(this.nodes)
        .alphaDecay(0.01)   // Slower cooling rate for better stabilization
        .alphaMin(0.01)     // Higher minimum alpha to prevent premature stopping
        .velocityDecay(0.6); // Higher velocity retention to prevent nodes flying off

      // Set up basic forces
      this.updateAllForces();

      // Set up tick callback
      this.simulation.on('tick', () => {
        if (this.tickCallback && this.isRunning) {
          // Apply boundary constraints before calling tick callback
          this.applyBoundaryConstraints();
          this.tickCallback([...this.nodes], [...this.links]);
        }
      });

      // Set up end callback
      this.simulation.on('end', () => {
        console.log('🏁 Physics simulation ended');
      });

      console.log('🔬 D3 force simulation initialized with stabilization parameters and boundary constraints');
    } catch (error) {
      console.error('Error initializing D3 simulation:', error);
    }
  }

  /**
   * Phase 5.5: Update all forces based on current state including focus lock
   */
  private updateAllForces(): void {
    if (!this.simulation) return;

    // Performance optimization: Throttle force updates for large graphs
    if (this.performanceMode && this.forceUpdateThrottle > 0) {
      this.forceUpdateThrottle--;
      return; // Skip this update to reduce computational load
    }

    try {
      // Memoized center force calculation - increased strength to prevent downward bias
      const centerForce = this.memoizedCalculate(
        `centerForce-${this.isFocusLocked}-${!!this.focusNodeId}`,
        () => {
          const force = d3.forceCenter(this.width / 2, this.height / 2);
          if (this.isFocusLocked) {
            // Strongest centering in focus lock mode
            force.strength(1.2);
          } else if (this.focusNodeId) {
            // Stronger centering in focus mode
            force.strength(1.0);
          } else {
            force.strength(0.8);
          }
          return force;
        }
      );
      this.simulation.force('center', centerForce);

      // Memoized collision force calculation
      const collisionForce = this.memoizedCalculate(
        `collisionForce-${this.isFocusLocked}-${this.currentCognitiveLoad.toFixed(2)}-${this.focusNodeId}`,
        () => d3
          .forceCollide<NeuralNode>()
          .radius((node) => {
            const baseRadius = node.radius || 15;

            // Adjust radius based on cognitive load and focus lock
            let adjustedRadius = baseRadius;
            if (this.isFocusLocked) {
              // More spacing for non-focus nodes when locked
              if (
                node.id !== this.focusNodeId &&
                !this.focusConnectedNodes.has(node.id)
              ) {
                adjustedRadius *= 2.0;
              }
            } else if (this.currentCognitiveLoad > 0.7) {
              adjustedRadius *= 1.5; // More spacing when overwhelmed
            } else if (this.currentCognitiveLoad < 0.3) {
              adjustedRadius *= 0.8; // Tighter when focused
            }

            return adjustedRadius + 5; // Add padding
          })
          .strength(0.9)
      );

      this.simulation.force('collision', collisionForce);

      // Queue expensive force updates for background processing
      this.queueExpensiveCalculation(() => {
        this.updateLinkForces();
        this.updateManyBodyForces();

        // Phase 5 & 5.5: Focus-specific forces
        if (this.focusNodeId) {
          this.updateFocusForces();
        } else {
          // Remove focus forces when not in focus mode
          this.simulation?.force('focusAttraction', null);
          this.simulation?.force('distractionRepulsion', null);
          this.simulation?.force('lockRepulsion', null);
        }
      });

      // Reset throttle counter after successful update
      if (this.performanceMode) {
        this.forceUpdateThrottle = 1;
      }
    } catch (error) {
      console.error('Error updating forces:', error);
    }
  }

  /**
   * Update link forces with focus and lock consideration
   */
  private updateLinkForces(): void {
    if (!this.simulation || !this.links) return;

    // Memoized link force calculation based on current state
    const linkForce = this.memoizedCalculate(
      `linkForce-${this.currentCognitiveLoad.toFixed(2)}-${this.isFocusLocked}-${!!this.focusNodeId}-${this.focusConnectedNodes.size}`,
      () => d3
        .forceLink<NeuralNode, NeuralLink>(this.links)
        .id((node) => node.id)
        .distance((link) => {
          let distance = this.config.linkDistance;

          // Adjust distance based on cognitive load
          if (this.currentCognitiveLoad > 0.7) {
            distance *= 1.4; // More spacing when overwhelmed
          } else if (this.currentCognitiveLoad < 0.3) {
            distance *= 0.7; // Tighter when sharp
          }

          // Phase 5 & 5.5: Focus and lock adjustments
          if (this.focusNodeId) {
            const sourceId =
              typeof link.source === 'object' ? link.source.id : link.source;
            const targetId =
              typeof link.target === 'object' ? link.target.id : link.target;

            // Shorter links for focus node connections
            if (sourceId === this.focusNodeId || targetId === this.focusNodeId) {
              distance *= this.isFocusLocked ? 0.4 : 0.6; // Even shorter when locked
            } else if (
              this.focusConnectedNodes.has(sourceId) ||
              this.focusConnectedNodes.has(targetId)
            ) {
              distance *= this.isFocusLocked ? 0.6 : 0.8;
            } else {
              // Much longer links for distracting connections when locked
              distance *= this.isFocusLocked ? 2.5 : 1.5;
            }
          }

          return distance;
        })
        .strength((link) => {
          let strength = this.config.linkStrength * (link.strength || 0.5);

          // Phase 5 & 5.5: Focus and lock strength adjustments
          if (this.focusNodeId) {
            const sourceId =
              typeof link.source === 'object' ? link.source.id : link.source;
            const targetId =
              typeof link.target === 'object' ? link.target.id : link.target;

            // Stronger links for focus connections
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
              // Much weaker links for distracting connections when locked
              strength *= this.isFocusLocked ? 0.1 : 0.3;
            }
          }

          return strength;
        })
    );

    this.simulation.force('link', linkForce);
  }

  /**
   * Phase 5.5: Update many-body forces with enhanced focus lock repulsion
   */
  private updateManyBodyForces(): void {
    if (!this.simulation) return;

    // Memoized many-body force calculation based on current state
    const manyBodyForce = this.memoizedCalculate(
      `manyBodyForce-${this.currentCognitiveLoad.toFixed(2)}-${this.isFocusLocked}-${!!this.focusNodeId}-${this.focusConnectedNodes.size}`,
      () => d3
        .forceManyBody<NeuralNode>()
        .strength((node) => {
          let baseStrength = this.config.repulsion;

          // Adjust for cognitive load
          if (this.currentCognitiveLoad > 0.7) {
            baseStrength *= 1.5; // Stronger repulsion when overwhelmed
          } else if (this.currentCognitiveLoad < 0.3) {
            baseStrength *= 0.7; // Weaker repulsion when sharp
          }

          // Phase 5 & 5.5: Focus and lock-based repulsion
          if (this.focusNodeId) {
            if (node.id === this.focusNodeId) {
              // Focus node has moderate repulsion
              return baseStrength * (this.isFocusLocked ? 0.3 : 0.5);
            } else if (this.focusConnectedNodes.has(node.id)) {
              // Connected nodes have normal repulsion
              return baseStrength;
            } else {
              // Distraction nodes have extreme repulsion when locked
              return this.isFocusLocked
                ? this.config.lockRepulsion
                : this.config.distractionRepulsion;
            }
          }

          return baseStrength;
        })
        .distanceMin(10)
        .distanceMax(this.isFocusLocked ? 300 : 200) // Larger max distance when locked
    );

    this.simulation.force('charge', manyBodyForce);
  }

  /**
   * Phase 5.5: Apply focus-specific forces with enhanced lock mode
   *
   * Creates the "neural tunnel vision" effect by adding custom forces
   * Enhanced with extreme repulsion and attraction in lock mode
   */
  private updateFocusForces(): void {
    if (!this.simulation || !this.focusNodeId) return;

    // Focus attraction force - pulls focus node toward center (stronger when locked)
    const focusAttractionForce = (alpha: number) => {
      const focusNode = this.nodes.find((node) => node.id === this.focusNodeId);
      if (!focusNode) return;

      const centerX = this.width / 2;
      const centerY = this.height / 2;

      const dx = centerX - (focusNode.x || 0);
      const dy = centerY - (focusNode.y || 0);

      const strength =
        (this.isFocusLocked
          ? this.config.focusAttraction * 2
          : this.config.focusAttraction) * alpha;

      focusNode.vx = (focusNode.vx || 0) + dx * strength;
      focusNode.vy = (focusNode.vy || 0) + dy * strength;
    };

    // Enhanced distraction repulsion force - pushes non-focus nodes to periphery (extreme when locked)
    const distractionRepulsionForce = (alpha: number) => {
      const focusNode = this.nodes.find((node) => node.id === this.focusNodeId);
      if (!focusNode) return;

      const focusX = focusNode.x || this.width / 2;
      const focusY = focusNode.y || this.height / 2;

      this.nodes.forEach((node) => {
        if (
          node.id === this.focusNodeId ||
          this.focusConnectedNodes.has(node.id)
        ) {
          return; // Skip focus node and connected nodes
        }

        const dx = (node.x || 0) - focusX;
        const dy = (node.y || 0) - focusY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return;

        // Use lock repulsion when focus lock is active
        const baseRepulsion = this.isFocusLocked
          ? this.config.lockRepulsion
          : this.config.distractionRepulsion;
        const strength = (baseRepulsion / 100) * alpha;
        const force = strength / distance;

        node.vx = (node.vx || 0) + (dx / distance) * force;
        node.vy = (node.vy || 0) + (dy / distance) * force;
      });
    };

    // Phase 5.5: Additional lock-specific peripheral force
    if (this.isFocusLocked) {
      const peripheralForce = (alpha: number) => {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const maxDistance = Math.min(this.width, this.height) * 0.4;

        this.nodes.forEach((node) => {
          if (
            node.id === this.focusNodeId ||
            this.focusConnectedNodes.has(node.id)
          ) {
            return; // Skip focus node and connected nodes
          }

          const dx = (node.x || 0) - centerX;
          const dy = (node.y || 0) - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < maxDistance) {
            // Push nodes outward if they're too close to center
            const pushStrength = 0.5 * alpha;
            const pushForce =
              (pushStrength * (maxDistance - distance)) / maxDistance;

            node.vx = (node.vx || 0) + (dx / distance) * pushForce;
            node.vy = (node.vy || 0) + (dy / distance) * pushForce;
          }
        });
      };

      this.simulation.force('lockRepulsion', peripheralForce);
    } else {
      this.simulation.force('lockRepulsion', null);
    }

    // Apply custom forces
    this.simulation.force('focusAttraction', focusAttractionForce);
    this.simulation.force('distractionRepulsion', distractionRepulsionForce);
  }

  /**
   * Apply responsive boundary constraints to keep nodes within canvas bounds
   * Updated to ensure symmetric forces to prevent downward bias
   */
  private applyBoundaryConstraints(): void {
    // Responsive padding based on canvas size and node radius
    const basePadding = Math.min(this.width, this.height) * 0.05; // 5% of smaller dimension
    const maxNodeRadius = Math.max(...this.nodes.map(n => n.radius || 15));
    const padding = Math.max(basePadding, maxNodeRadius + 10); // Ensure nodes don't clip

    const minX = padding;
    const maxX = this.width - padding;
    const minY = padding;
    const maxY = this.height - padding;

    // Boundary force strength (gradual push-back near edges)
    const boundaryForce = 0.02;

    this.nodes.forEach((node) => {
      const nodeRadius = node.radius || 15;
      let constrained = false;

      // Gradual boundary forces for smoother behavior
      const leftForce = Math.max(0, minX - (node.x! - nodeRadius));
      const rightForce = Math.max(0, (node.x! + nodeRadius) - maxX);
      const topForce = Math.max(0, minY - (node.y! - nodeRadius));
      const bottomForce = Math.max(0, (node.y! + nodeRadius) - maxY);

      // Apply gradual forces symmetrically
      if (leftForce > 0) {
        node.vx = (node.vx || 0) + leftForce * boundaryForce;
        constrained = true;
      }
      if (rightForce > 0) {
        node.vx = (node.vx || 0) - rightForce * boundaryForce;
        constrained = true;
      }
      if (topForce > 0) {
        node.vy = (node.vy || 0) + topForce * boundaryForce;
        constrained = true;
      }
      if (bottomForce > 0) {
        // Reduce bottom force slightly to prevent downward bias
        node.vy = (node.vy || 0) - bottomForce * boundaryForce * 0.9;
        constrained = true;
      }

      // Hard constraints as fallback (only when node is significantly out of bounds)
      const hardMargin = padding * 0.5;
      if (node.x! < -hardMargin) {
        node.x = -hardMargin;
        node.vx = Math.abs(node.vx || 0) * 0.3;
        constrained = true;
      } else if (node.x! > this.width + hardMargin) {
        node.x = this.width + hardMargin;
        node.vx = -Math.abs(node.vx || 0) * 0.3;
        constrained = true;
      }

      if (node.y! < -hardMargin) {
        node.y = -hardMargin;
        node.vy = Math.abs(node.vy || 0) * 0.3;
        constrained = true;
      } else if (node.y! > this.height + hardMargin) {
        node.y = this.height + hardMargin;
        node.vy = -Math.abs(node.vy || 0) * 0.3;
        constrained = true;
      }

      // Apply damping when near boundaries
      if (constrained) {
        node.vx = (node.vx || 0) * 0.95; // Light damping
        node.vy = (node.vy || 0) * 0.95;
      }
    });
  }

  /**
   * Phase 5: Update connected nodes set for focus mode
   */
  private updateFocusConnectedNodes(): void {
    this.focusConnectedNodes.clear();

    if (!this.focusNodeId || !this.links) return;

    // Find all nodes directly connected to focus node
    this.links.forEach((link) => {
      const sourceId =
        typeof link.source === 'object' ? link.source.id : link.source;
      const targetId =
        typeof link.target === 'object' ? link.target.id : link.target;

      if (sourceId === this.focusNodeId) {
        this.focusConnectedNodes.add(targetId);
      } else if (targetId === this.focusNodeId) {
        this.focusConnectedNodes.add(sourceId);
      }
    });

    console.log(
      `🎯 Focus connections updated: ${this.focusConnectedNodes.size} connected nodes`,
    );
  }

  /**
   * Check and enable performance mode for large graphs
   */
  private checkPerformanceMode(): void {
    const nodeCount = this.nodes.length;
    const wasPerformanceMode = this.performanceMode;

    // Enable performance mode for graphs with 100+ nodes
    this.performanceMode = nodeCount >= 100;

    if (this.performanceMode && !wasPerformanceMode) {
      console.log('⚡ Performance mode enabled for large graph');
      // Reduce force update frequency for large graphs
      this.forceUpdateThrottle = 1; // Skip every other update
    } else if (!this.performanceMode && wasPerformanceMode) {
      console.log('⚡ Performance mode disabled');
      this.forceUpdateThrottle = 0;
    }
  }

  /**
   * Adapt configuration based on cognitive load
   */
  private adaptConfigToCognitiveLoad(): void {
    const load = this.currentCognitiveLoad;

    if (load > 0.7) {
      // High load: simplify and calm the visualization
      this.config.attraction *= 0.8;
      this.config.repulsion *= 1.2;
      this.config.linkDistance *= 1.3;
      this.config.distractionRepulsion *= 1.5; // Stronger focus lock when overwhelmed
      this.config.lockRepulsion *= 1.3; // Even stronger lock when overwhelmed
    } else if (load < 0.3) {
      // Low load: enhance and energize the visualization
      this.config.attraction *= 1.2;
      this.config.repulsion *= 0.8;
      this.config.linkDistance *= 0.8;
      this.config.focusStrength *= 1.2; // Stronger focus when sharp
      this.config.lockStrength *= 1.1; // Slightly stronger lock when sharp
    }
    // Medium load: use default values
  }

  /**
   * Get node color based on state and theme
   */
  public getNodeColor(node: NeuralNode): string {
    // This method is called by the canvas for consistent coloring
    const baseColors = {
      light: {
        default: '#6366F1',
        active: '#EF4444',
        mastered: '#10B981',
        weak: '#F59E0B',
      },
      dark: {
        default: '#8B5CF6',
        active: '#F87171',
        mastered: '#34D399',
        weak: '#FBBF24',
      },
    };

    const colors = baseColors[this.theme];

    // Determine color based on node state
    if (node.isActive) {
      return colors.active;
    } else if (node.masteryLevel > 0.8) {
      return colors.mastered;
    } else if (node.masteryLevel < 0.3) {
      return colors.weak;
    } else {
      return colors.default;
    }
  }

  /**
   * Phase 5: Check if node is in focus context
   */
  public isNodeInFocusContext(nodeId: string): boolean {
    if (!this.focusNodeId) return false;

    return nodeId === this.focusNodeId || this.focusConnectedNodes.has(nodeId);
  }

  /**
   * Phase 5.5: Get visual opacity for node based on focus lock state
   */
  public getNodeOpacity(nodeId: string): number {
    if (!this.isFocusLocked || !this.focusNodeId) {
      return 1.0; // Full opacity when not locked
    }

    if (nodeId === this.focusNodeId) {
      return 1.0; // Full opacity for focus node
    } else if (this.focusConnectedNodes.has(nodeId)) {
      return 0.6; // Semi-transparent for connected nodes
    } else {
      return 0.1; // Very transparent for distraction nodes
    }
  }

  /**
   * Phase 5.5: Get visual blur amount for node based on focus lock state
   */
  public getNodeBlurAmount(nodeId: string): number {
    if (!this.isFocusLocked || !this.focusNodeId) {
      return 0; // No blur when not locked
    }

    if (nodeId === this.focusNodeId) {
      return 0; // No blur for focus node
    } else if (this.focusConnectedNodes.has(nodeId)) {
      return 1; // Light blur for connected nodes
    } else {
      return this.config.lockBlurAmount; // Strong blur for distraction nodes
    }
  }

  /**
   * Phase 5.5: Get enhanced performance metrics including lock state
   */
  public getPerformanceMetrics(): {
    nodeCount: number;
    linkCount: number;
    isRunning: boolean;
    focusMode: boolean;
    focusLocked: boolean;
    lockDuration: number;
    cognitiveLoad: number;
    averageNodeSpeed: number;
  } {
    const avgSpeed =
      this.nodes.length > 0
        ? this.nodes.reduce((sum, node) => {
            const vx = node.vx || 0;
            const vy = node.vy || 0;
            return sum + Math.sqrt(vx * vx + vy * vy);
          }, 0) / this.nodes.length
        : 0;

    return {
      nodeCount: this.nodes.length,
      linkCount: this.links.length,
      isRunning: this.isRunning,
      focusMode: this.focusNodeId !== null,
      focusLocked: this.isFocusLocked,
      lockDuration: this.getFocusLockDuration(),
      cognitiveLoad: this.currentCognitiveLoad,
      averageNodeSpeed: avgSpeed,
    };
  }

  /**
   * Cleanup and dispose of resources
   */
  public dispose(): void {
    this.stop();

    // Explicitly remove all forces from simulation to prevent memory leaks
    if (this.simulation) {
      this.simulation.force('center', null);
      this.simulation.force('collision', null);
      this.simulation.force('link', null);
      this.simulation.force('charge', null);
      this.simulation.force('focusAttraction', null);
      this.simulation.force('distractionRepulsion', null);
      this.simulation.force('lockRepulsion', null);
      // Remove tick and end event listeners
      this.simulation.on('tick', null);
      this.simulation.on('end', null);
      this.simulation = null;
    }

    this.nodes = [];
    this.links = [];
    this.focusConnectedNodes.clear();
    this.tickCallback = undefined;

    // Clear focus lock state
    this.isFocusLocked = false;
    this.lockStartTime = null;
    this.lockSessionId = null;

    // Clear memoization cache
    this.memoCache.clear();

    // Terminate Web Worker if active
    if (this.physicsWorker) {
      this.physicsWorker.terminate();
      this.physicsWorker = null;
    }

    // Clear worker queue
    this.workerQueue.length = 0;
    this.isWorkerProcessing = false;

    console.log('🗑️ Neural Physics Engine disposed with full cleanup');
  }
}

export default NeuralPhysicsEngine;

