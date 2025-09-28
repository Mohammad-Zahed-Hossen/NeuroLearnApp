/**
 * Phase 5 Enhancement: Neural Physics Engine with Focus Lock
 *
 * Adds intelligent focus mode that physically repels distracting nodes
 * and emphasizes the selected focus target through force manipulation
 */

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
  };

  constructor(width: number, height: number, theme: ThemeType) {
    this.width = width;
    this.height = height;
    this.theme = theme;

    console.log('🔬 Neural Physics Engine initialized with focus capabilities');
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
        // Ensure required physics properties
        x: node.x || Math.random() * this.width,
        y: node.y || Math.random() * this.height,
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

      this.initializeSimulation();
      this.updateFocusConnectedNodes();
      this.updateAllForces();

      console.log(
        `🔬 Graph updated: ${this.nodes.length} nodes, ${this.links.length} links`,
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
      this.simulation = d3.forceSimulation(this.nodes);

      // Set up basic forces
      this.updateAllForces();

      // Set up tick callback
      this.simulation.on('tick', () => {
        if (this.tickCallback && this.isRunning) {
          this.tickCallback([...this.nodes], [...this.links]);
        }
      });

      // Set up end callback
      this.simulation.on('end', () => {
        console.log('🏁 Physics simulation ended');
      });

      console.log('🔬 D3 force simulation initialized');
    } catch (error) {
      console.error('Error initializing D3 simulation:', error);
    }
  }

  /**
   * Phase 5: Update all forces based on current state
   */
  private updateAllForces(): void {
    if (!this.simulation) return;

    try {
      // Center force (adjusted for focus mode)
      const centerForce = d3.forceCenter(this.width / 2, this.height / 2);
      if (this.focusNodeId) {
        // Stronger centering in focus mode
        centerForce.strength(0.05);
      } else {
        centerForce.strength(0.02);
      }
      this.simulation.force('center', centerForce);

      // Collision force (prevent overlapping)
      const collisionForce = d3
        .forceCollide<NeuralNode>()
        .radius((node) => {
          const baseRadius = node.radius || 15;

          // Adjust radius based on cognitive load
          let adjustedRadius = baseRadius;
          if (this.currentCognitiveLoad > 0.7) {
            adjustedRadius *= 1.5; // More spacing when overwhelmed
          } else if (this.currentCognitiveLoad < 0.3) {
            adjustedRadius *= 0.8; // Tighter when focused
          }

          return adjustedRadius + 5; // Add padding
        })
        .strength(0.9);

      this.simulation.force('collision', collisionForce);

      // Link force
      this.updateLinkForces();

      // Many-body force (repulsion/attraction)
      this.updateManyBodyForces();

      // Phase 5: Focus-specific forces
      if (this.focusNodeId) {
        this.updateFocusForces();
      } else {
        // Remove focus forces when not in focus mode
        this.simulation.force('focusAttraction', null);
        this.simulation.force('distractionRepulsion', null);
      }
    } catch (error) {
      console.error('Error updating forces:', error);
    }
  }

  /**
   * Update link forces with focus consideration
   */
  private updateLinkForces(): void {
    if (!this.simulation || !this.links) return;

    const linkForce = d3
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

        // Phase 5: Focus adjustments
        if (this.focusNodeId) {
          const sourceId =
            typeof link.source === 'object' ? link.source.id : link.source;
          const targetId =
            typeof link.target === 'object' ? link.target.id : link.target;

          // Shorter links for focus node connections
          if (sourceId === this.focusNodeId || targetId === this.focusNodeId) {
            distance *= 0.6;
          } else if (
            this.focusConnectedNodes.has(sourceId) ||
            this.focusConnectedNodes.has(targetId)
          ) {
            distance *= 0.8;
          } else {
            // Longer links for distracting connections
            distance *= 1.5;
          }
        }

        return distance;
      })
      .strength((link) => {
        let strength = this.config.linkStrength * (link.strength || 0.5);

        // Phase 5: Focus strength adjustments
        if (this.focusNodeId) {
          const sourceId =
            typeof link.source === 'object' ? link.source.id : link.source;
          const targetId =
            typeof link.target === 'object' ? link.target.id : link.target;

          // Stronger links for focus connections
          if (sourceId === this.focusNodeId || targetId === this.focusNodeId) {
            strength *= this.config.focusStrength;
          } else if (
            this.focusConnectedNodes.has(sourceId) ||
            this.focusConnectedNodes.has(targetId)
          ) {
            strength *= 1.5;
          } else {
            // Weaker links for distracting connections
            strength *= 0.3;
          }
        }

        return strength;
      });

    this.simulation.force('link', linkForce);
  }

  /**
   * Phase 5: Update many-body forces with focus repulsion
   */
  private updateManyBodyForces(): void {
    if (!this.simulation) return;

    const manyBodyForce = d3
      .forceManyBody<NeuralNode>()
      .strength((node) => {
        let baseStrength = this.config.repulsion;

        // Adjust for cognitive load
        if (this.currentCognitiveLoad > 0.7) {
          baseStrength *= 1.5; // Stronger repulsion when overwhelmed
        } else if (this.currentCognitiveLoad < 0.3) {
          baseStrength *= 0.7; // Weaker repulsion when sharp
        }

        // Phase 5: Focus-based repulsion
        if (this.focusNodeId) {
          if (node.id === this.focusNodeId) {
            // Focus node has moderate repulsion
            return baseStrength * 0.5;
          } else if (this.focusConnectedNodes.has(node.id)) {
            // Connected nodes have normal repulsion
            return baseStrength;
          } else {
            // Distraction nodes have strong repulsion (pushes them away)
            return this.config.distractionRepulsion;
          }
        }

        return baseStrength;
      })
      .distanceMin(10)
      .distanceMax(200);

    this.simulation.force('charge', manyBodyForce);
  }

  /**
   * Phase 5: Apply focus-specific forces
   *
   * Creates the "neural tunnel vision" effect by adding custom forces
   */
  private updateFocusForces(): void {
    if (!this.simulation || !this.focusNodeId) return;

    // Focus attraction force - pulls focus node toward center
    const focusAttractionForce = (alpha: number) => {
      const focusNode = this.nodes.find((node) => node.id === this.focusNodeId);
      if (!focusNode) return;

      const centerX = this.width / 2;
      const centerY = this.height / 2;

      const dx = centerX - (focusNode.x || 0);
      const dy = centerY - (focusNode.y || 0);

      const strength = this.config.focusAttraction * alpha;

      focusNode.vx = (focusNode.vx || 0) + dx * strength;
      focusNode.vy = (focusNode.vy || 0) + dy * strength;
    };

    // Distraction repulsion force - pushes non-focus nodes to periphery
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

        const strength = (this.config.distractionRepulsion / 100) * alpha;
        const force = strength / distance;

        node.vx = (node.vx || 0) + (dx / distance) * force;
        node.vy = (node.vy || 0) + (dy / distance) * force;
      });
    };

    // Apply custom forces
    this.simulation.force('focusAttraction', focusAttractionForce);
    this.simulation.force('distractionRepulsion', distractionRepulsionForce);
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
    } else if (load < 0.3) {
      // Low load: enhance and energize the visualization
      this.config.attraction *= 1.2;
      this.config.repulsion *= 0.8;
      this.config.linkDistance *= 0.8;
      this.config.focusStrength *= 1.2; // Stronger focus when sharp
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
   * Get physics performance metrics
   */
  public getPerformanceMetrics(): {
    nodeCount: number;
    linkCount: number;
    isRunning: boolean;
    focusMode: boolean;
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
      cognitiveLoad: this.currentCognitiveLoad,
      averageNodeSpeed: avgSpeed,
    };
  }

  /**
   * Cleanup and dispose of resources
   */
  public dispose(): void {
    this.stop();
    this.simulation = null;
    this.nodes = [];
    this.links = [];
    this.focusConnectedNodes.clear();
    this.tickCallback = undefined;
    console.log('🗑️ Neural Physics Engine disposed');
  }
}

export default NeuralPhysicsEngine;
