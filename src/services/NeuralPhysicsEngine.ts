import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide
} from 'd3-force';
import { NeuralNode, NeuralLink, NeuralGraph } from './MindMapGeneratorService';

/**
 * Neural Color Mapping for Mind Map Visualization
 * Based on neuroscience research and cognitive psychology principles
 */
export interface NeuralColors {
  nodes: {
    [K in NeuralNode['type']]: {
      default: string;
      active: string;
      mastered: string;
      weak: string;
    };
  };
  links: {
    [K in NeuralLink['type']]: string;
  };
  ui: {
    background: string;
    canvas: string;
    text: string;
    textSecondary: string;
    glassHighlight: string;
  };
}

/**
 * Enhanced Neural Physics Engine
 * Implements brain-inspired force simulation with cognitive load adaptation
 */
export class NeuralPhysicsEngine {
  private simulation: any;
  private nodes: NeuralNode[] = [];
  private links: NeuralLink[] = [];
  private colors: NeuralColors;
  private width: number;
  private height: number;
  private theme: 'light' | 'dark';

  // Performance optimization
  private animationFrame?: number;
  private isSimulationRunning = false;

  // Cognitive load adaptation
  private currentCognitiveLoad = 0.5;

  constructor(width: number, height: number, theme: 'light' | 'dark' = 'dark') {
    this.width = width;
    this.height = height;
    this.theme = theme;
    this.colors = this.initializeColorScheme(theme);
    this.initializeSimulation();
  }

  /**
   * Initialize scientifically-based color scheme
   */
  private initializeColorScheme(theme: 'light' | 'dark'): NeuralColors {
    const colorSchemes = {
      dark: {
        nodes: {
          concept: {
            default: '#0EA5E9', // Cognitive clarity blue
            active: '#EF4444', // Alert red for immediate attention
            mastered: '#10B981', // Success green for mastery
            weak: '#F59E0B', // Warning amber for weak areas
          },
          skill: {
            default: '#8B5CF6', // Creative purple for skills
            active: '#EF4444',
            mastered: '#10B981',
            weak: '#F59E0B',
          },
          goal: {
            default: '#06B6D4', // Motivational cyan for goals
            active: '#EF4444',
            mastered: '#10B981',
            weak: '#F59E0B',
          },
          memory: {
            default: '#32808D', // Stable teal for memory
            active: '#EF4444',
            mastered: '#10B981',
            weak: '#F59E0B',
          },
          habit: {
            default: '#10B981', // Reinforcement green
            active: '#EF4444',
            mastered: '#32808D',
            weak: '#F59E0B',
          },
        },
        links: {
          association: 'rgba(14, 165, 233, 0.6)',
          prerequisite: 'rgba(139, 92, 246, 0.8)',
          similarity: 'rgba(245, 158, 11, 0.6)',
          temporal: 'rgba(16, 185, 129, 0.5)',
          spatial: 'rgba(6, 182, 212, 0.7)',
        },
        ui: {
          background: '#0A0F1A',
          canvas: '#111827',
          text: '#F0F9FF',
          textSecondary: '#E0F2FE',
          glassHighlight: 'rgba(255, 255, 255, 0.1)',
        },
      },
      light: {
        nodes: {
          concept: {
            default: '#0284C7',
            active: '#DC2626',
            mastered: '#059669',
            weak: '#D97706',
          },
          skill: {
            default: '#7C3AED',
            active: '#DC2626',
            mastered: '#059669',
            weak: '#D97706',
          },
          goal: {
            default: '#0891B2',
            active: '#DC2626',
            mastered: '#059669',
            weak: '#D97706',
          },
          memory: {
            default: '#0F766E',
            active: '#DC2626',
            mastered: '#059669',
            weak: '#D97706',
          },
          habit: {
            default: '#059669',
            active: '#DC2626',
            mastered: '#0F766E',
            weak: '#D97706',
          },
        },
        links: {
          association: 'rgba(2, 132, 199, 0.6)',
          prerequisite: 'rgba(124, 58, 237, 0.8)',
          similarity: 'rgba(217, 119, 6, 0.6)',
          temporal: 'rgba(5, 150, 105, 0.5)',
          spatial: 'rgba(8, 145, 178, 0.7)',
        },
        ui: {
          background: '#FAFBFC',
          canvas: '#FFFFFF',
          text: '#1E293B',
          textSecondary: '#64748B',
          glassHighlight: 'rgba(0, 0, 0, 0.05)',
        },
      },
    };

    return colorSchemes[theme];
  }

  /**
   * Initialize D3 force simulation with neuroplasticity-inspired physics
   */
  private initializeSimulation(): void {
    this.simulation = forceSimulation()
      .force('link', forceLink<NeuralNode, NeuralLink>()
        .id(d => d.id)
        .distance(this.calculateLinkDistance.bind(this))
        .strength(this.calculateLinkStrength.bind(this))
      )
      .force('charge', forceManyBody<NeuralNode>()
        .strength(this.calculateNodeCharge.bind(this))
        .distanceMin(25)
        .distanceMax(400)
      )
      .force('center', forceCenter(this.width / 2, this.height / 2))
      .force('collision', forceCollide<NeuralNode>()
        .radius(d => d.radius + 8)
        .strength(0.9)
      )
      .alphaDecay(0.0228) // Slower cooling for natural movement
      .velocityDecay(0.3); // Optimized damping

    // Performance optimization: limit simulation ticks
    this.simulation.alpha(0.3);
  }

  /**
   * Calculate synaptic distance based on connection strength and cognitive load
   */
  private calculateLinkDistance(link: NeuralLink): number {
    const baseDistance = 60;
    const cognitiveLoadAdjustment = this.currentCognitiveLoad * 20; // Spread out under load

    // Stronger connections = shorter distance (synaptic efficiency)
    const strengthDistance = (1 - link.strength) * 80;

    // Type-based distance modifiers (based on neuroscience)
    const typeMultipliers: Record<NeuralLink['type'], number> = {
      prerequisite: 0.7, // Prerequisites stay close
      association: 1.0, // Normal associative distance
      temporal: 1.3, // Temporal links can be farther
      similarity: 0.8, // Similar concepts cluster
      spatial: 1.1, // Spatial moderate distance
    };

    return baseDistance + strengthDistance * typeMultipliers[link.type] + cognitiveLoadAdjustment;
  }

  /**
   * Calculate synaptic strength with neuroplasticity principles
   */
  private calculateLinkStrength(link: NeuralLink): number {
    let strength = link.strength;

    // Hebbian learning: connections that fire together wire together
    const hebbianBoost = Math.min(0.4, link.activationCount * 0.03);
    strength += hebbianBoost;

    // Confidence multiplier (certainty strengthens connections)
    strength *= link.confidence;

    // Cognitive load adaptation: weaken under high load
    strength *= Math.max(0.6, 1 - this.currentCognitiveLoad * 0.4);

    // Type-specific strength modifiers
    const typeStrengths: Record<NeuralLink['type'], number> = {
      prerequisite: 1.4, // Strong prerequisite connections
      association: 1.0, // Normal associative strength
      temporal: 0.7, // Weaker temporal connections
      similarity: 0.9, // Medium similarity strength
      spatial: 0.8, // Moderate spatial connections
    };

    return Math.min(1.0, strength * typeStrengths[link.type]);
  }

  /**
   * Calculate neural charge with attention and importance factors
   */
  private calculateNodeCharge(node: NeuralNode): number {
    let charge = -150; // Base repulsion

    // Importance scaling (larger nodes need more space)
    const importanceMultiplier = Math.sqrt(node.radius / 15);
    charge *= importanceMultiplier;

    // Active nodes need attention space (increased repulsion)
    if (node.isActive) {
      charge *= 1.6;
    }

    // Well-mastered nodes are stable (reduced repulsion)
    if (node.masteryLevel > 0.8) {
      charge *= 0.6;
    }

    // Cognitive load adaptation
    charge *= Math.max(0.7, 1 - this.currentCognitiveLoad * 0.3);

    return charge;
  }

  /**
   * Get node color with cognitive state awareness
   */
  public getNodeColor(node: NeuralNode): string {
    const nodeColors = this.colors.nodes[node.type];

    // Priority hierarchy based on cognitive urgency
    if (node.isActive && node.cognitiveLoad > 0.7) {
      return nodeColors.active; // Immediate attention needed
    } else if (node.masteryLevel > 0.85) {
      return nodeColors.mastered; // Well learned
    } else if (node.masteryLevel < 0.25 || node.cognitiveLoad > 0.8) {
      return nodeColors.weak; // Needs work
    } else {
      return nodeColors.default; // Normal state
    }
  }

  /**
   * Get link color with dynamic opacity based on strength
   */
  public getLinkColor(link: NeuralLink): string {
    const baseColor = this.colors.links[link.type];

    // Dynamic opacity based on strength, confidence, and cognitive load
    const baseOpacity = link.strength * link.confidence;
    const cognitiveAdjustment = Math.max(0.3, 1 - this.currentCognitiveLoad * 0.5);
    const finalOpacity = Math.min(0.9, baseOpacity * cognitiveAdjustment);

    // Parse and adjust RGBA opacity
    const rgbaMatch = baseColor.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
    if (rgbaMatch) {
      const [, r, g, b] = rgbaMatch;
      return `rgba(${r}, ${g}, ${b}, ${finalOpacity})`;
    }

    return baseColor;
  }

  /**
   * Neural firing effect with cognitive load adaptation
   */
  public getNeuralFireEffect(node: NeuralNode): { opacity: number; scale: number; glow: number } {
    if (!node.isActive) {
      return { opacity: 0.8, scale: 1.0, glow: 0 };
    }

    // Create pulsing based on urgency and cognitive load
    const time = Date.now() * 0.002;
    const urgencyFactor = node.cognitiveLoad * node.activationLevel;
    const pulseSpeed = 1 + urgencyFactor * 2;

    const pulse = (Math.sin(time * pulseSpeed + this.hashCode(node.id)) + 1) / 2;

    // Cognitive load reduces visual complexity
    const loadReduction = Math.max(0.5, 1 - this.currentCognitiveLoad * 0.5);

    return {
      opacity: 0.6 + (pulse * 0.4 * loadReduction),
      scale: 1.0 + (pulse * 0.3 * loadReduction),
      glow: pulse * urgencyFactor * loadReduction,
    };
  }

  /**
   * Update simulation with performance optimization
   */
  public updateGraph(graph: NeuralGraph): void {
    this.nodes = [...graph.nodes];
    this.links = [...graph.links];

    // Performance: only restart if significant changes
    const hasSignificantChanges = this.nodes.length !== this.simulation.nodes()?.length ||
                                  this.links.length !== (this.simulation.force('link')?.links()?.length || 0);

    this.simulation.nodes(this.nodes);
    this.simulation.force('link')?.links(this.links);

    if (hasSignificantChanges) {
      this.simulation.alpha(0.5).restart();
      this.isSimulationRunning = true;
    }
  }

  /**
   * Optimized tick callback with throttling
   */
  public onTick(callback: (nodes: NeuralNode[], links: NeuralLink[]) => void): void {
    let lastUpdateTime = 0;

    this.simulation.on('tick', () => {
      const now = Date.now();

      // Throttle to 60fps maximum
      if (now - lastUpdateTime > 16) {
        callback(this.nodes, this.links);
        lastUpdateTime = now;
      }

      // Auto-stop simulation when stable
      if (this.simulation.alpha() < 0.005) {
        this.isSimulationRunning = false;
      }
    });
  }

  /**
   * Enhanced drag behavior with cognitive feedback
   */
  public setupNodeDrag(
    node: NeuralNode,
    onStart?: () => void,
    onDrag?: () => void,
    onEnd?: () => void
  ): void {
    if (onStart) {
      this.simulation.alphaTarget(0.2).restart();
      this.isSimulationRunning = true;
    }

    if (onDrag) {
      // Fix node position during drag
      node.fx = node.x;
      node.fy = node.y;
    }

    if (onEnd) {
      // Release node with gentle settling
      this.simulation.alphaTarget(0);
      setTimeout(() => {
        node.fx = null;
        node.fy = null;
      }, 100);
    }
  }

  /**
   * Update cognitive load and adapt simulation
   */
  public updateCognitiveLoad(load: number): void {
    this.currentCognitiveLoad = Math.max(0, Math.min(1, load));

    // Restart simulation with new cognitive parameters
    if (this.nodes.length > 0) {
      this.simulation.alpha(0.1).restart();
    }
  }

  /**
   * Advanced network analysis with cognitive metrics
   */
  public calculateNetworkMetrics() {
    const nodeCount = this.nodes.length;
    const linkCount = this.links.length;

    if (nodeCount === 0) {
      return {
        density: 0,
        averageClusterCoefficient: 0,
        centralityScores: new Map<string, number>(),
        cognitiveComplexity: 0,
        activationDistribution: { low: 0, medium: 0, high: 0 },
      };
    }

    // Network density
    const maxPossibleLinks = (nodeCount * (nodeCount - 1)) / 2;
    const density = maxPossibleLinks > 0 ? linkCount / maxPossibleLinks : 0;

    // Centrality scores
    const centralityScores = new Map<string, number>();
    this.nodes.forEach(node => {
      const connections = this.links.filter(link =>
        link.source === node.id || link.target === node.id
      ).length;
      centralityScores.set(node.id, connections / Math.max(1, nodeCount - 1));
    });

    // Clustering coefficient
    let totalClusterCoeff = 0;
    this.nodes.forEach(node => {
      const neighbors = this.getNeighbors(node);
      if (neighbors.length < 2) return;

      let neighborConnections = 0;
      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          if (this.areConnected(neighbors[i], neighbors[j])) {
            neighborConnections++;
          }
        }
      }

      const maxNeighborConnections = (neighbors.length * (neighbors.length - 1)) / 2;
      const clusterCoeff = maxNeighborConnections > 0 ? neighborConnections / maxNeighborConnections : 0;
      totalClusterCoeff += clusterCoeff;
    });

    const averageClusterCoefficient = totalClusterCoeff / nodeCount;

    // Cognitive complexity (based on activation and load)
    const cognitiveComplexity = this.nodes.reduce((sum, node) =>
      sum + (node.activationLevel * node.cognitiveLoad), 0
    ) / nodeCount;

    // Activation distribution
    const activationDistribution = this.nodes.reduce((dist, node) => {
      if (node.activationLevel < 0.3) dist.low++;
      else if (node.activationLevel < 0.7) dist.medium++;
      else dist.high++;
      return dist;
    }, { low: 0, medium: 0, high: 0 });

    return {
      density,
      averageClusterCoefficient,
      centralityScores,
      cognitiveComplexity,
      activationDistribution,
    };
  }

  // Helper methods
  private getNeighbors(node: NeuralNode): NeuralNode[] {
    const neighborIds = new Set<string>();

this.links.forEach((link) => {
  if (link.source === node.id) neighborIds.add(link.target.toString());
  else if (link.target === node.id) neighborIds.add(link.source.toString());
});

    return this.nodes.filter(n => neighborIds.has(n.id));
  }

  private areConnected(node1: NeuralNode, node2: NeuralNode): boolean {
    return this.links.some(link =>
      (link.source === node1.id && link.target === node2.id) ||
      (link.source === node2.id && link.target === node1.id)
    );
  }

  private hashCode(str: string): number {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  // Public API methods
  public updateTheme(theme: 'light' | 'dark'): void {
    this.theme = theme;
    this.colors = this.initializeColorScheme(theme);
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.simulation.force('center', forceCenter(width / 2, height / 2));
    this.simulation.alpha(0.2).restart();
  }

  public stop(): void {
    this.simulation.stop();
    this.isSimulationRunning = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  public restart(): void {
    this.simulation.alpha(0.3).restart();
    this.isSimulationRunning = true;
  }

  public getColors(): NeuralColors {
    return this.colors;
  }

  public isRunning(): boolean {
    return this.isSimulationRunning;
  }
}
