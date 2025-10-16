import StorageService from '../storage/StorageService';
import { SpacedRepetitionService } from './SpacedRepetitionService';
import { ReadingSession, SourceLink } from './SpeedReadingService';

/**
 * Enhanced MindMapGeneratorService with Phase 2: Data Intelligence & Logic
 * Implements Health Scoring, Learning Paths, and Cluster Analysis
 */

// Core interfaces with health scoring integration
export interface LogicStructure {
  question: string;
  premise1: string;
  premise2: string;
  conclusion: string;
  type: 'deductive' | 'inductive' | 'abductive';
  domain: 'programming' | 'math' | 'english' | 'general';
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export interface NeuralNode {
  // Core identification
  id: string;
  type: 'concept' | 'skill' | 'goal' | 'memory' | 'habit' | 'logic';

  // D3 force simulation properties
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;

  // Visual and neural properties
  radius: number;
  activationLevel: number;
  isActive: boolean;

  // Content and categorization - Enhanced for Logic Structure
  label: string;
  content: string | LogicStructure;
  category: string;

  // Cognitive and learning metrics
  masteryLevel: number;
  cognitiveLoad: number;
  lastAccessed: Date;
  accessCount: number;

  // FSRS integration - Complete mapping
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: Date;

  // FSRS performance tracking
  lastDifficulty?: 'again' | 'hard' | 'good' | 'easy';
  stability?: number;
  difficulty?: number;

  // Source tracking for navigation
  sourceType: 'flashcard' | 'task' | 'palace' | 'derived' | 'logic';
  sourceId: string;

  // Phase 2 Enhancement: Health Scoring
  healthScore?: number; // Calculated health score (0-1)
  healthCategory?: 'critical' | 'moderate' | 'healthy';

  // Performance optimization
  index?: number;

  // Connection references (populated during graph generation)
  connections?: string[]; // Array of connected node IDs
}

export interface NeuralLink {
  id: string;
  source: string | NeuralNode;
  target: string | NeuralNode;

  // Synaptic properties
  strength: number;
  weight: number;

  // Connection semantics - Enhanced for Logic Structure
  type:
    | 'association'
    | 'prerequisite'
    | 'similarity'
    | 'temporal'
    | 'spatial'
    | 'logical';

  // Learning and usage metrics
  activationCount: number;
  lastActivated: Date;
  confidence: number;

  // Performance optimization
  index?: number;
}

/**
 * Phase 2 Enhancement: Learning Path Interface
 * Step 5: Learning Path Logic Implementation
 */
export interface LearningPath {
  id: string;
  startNode: NeuralNode;
  endNode: NeuralNode;
  path: NeuralNode[];
  totalCost: number;
  estimatedTimeMinutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  pathType: 'prerequisite' | 'mastery' | 'remedial';
  recommendations: string[];
}

/**
 * Phase 2 Enhancement: Cluster Analysis Interface
 * Step 4: Cluster Data Preparation Implementation
 */
export interface KnowledgeCluster {
  id: string;
  name: string;
  nodes: NeuralNode[];
  health: number;
  masteryLevel: number;
  category: string;
  size: number;
  centroid: { x: number; y: number };
  criticalNodes: NeuralNode[];
  recommendations: string[];
}

export interface NeuralGraph {
  nodes: NeuralNode[];
  links: NeuralLink[];

  // Graph-level metrics
  totalActivationLevel: number;
  knowledgeHealth: number;
  cognitiveComplexity: number;
  lastUpdated: Date;

  // FSRS-specific metrics
  dueNodesCount: number;
  criticalLogicCount: number;

  // Phase 2 Enhancement: Advanced Analytics
  healthMetrics?: {
    overallHealth: number;
    criticalNodes: NeuralNode[];
    healthyNodes: NeuralNode[];
    atRiskNodes: NeuralNode[];
    healthDistribution: {
      critical: number;
      moderate: number;
      healthy: number;
    };
  };

  clusters?: KnowledgeCluster[];
  learningPaths?: LearningPath[];

  // Enhanced metrics
  metrics?: {
    density: number;
    averageClusterCoefficient: number;
    centralityScores: Map<string, number>;
    activationDistribution: { low: number; medium: number; high: number };
    logicTrainingProgress: number;

    // Phase 2 Additions
    clusterHealthScores: Map<string, number>;
    pathEfficiencyScores: Map<string, number>;
  };

  // Phase 6: Speed Reading Integration
  totalReadingSessions?: number;
  readingEfficiencyFactor?: number;
  averageReadingWPM?: number;
  readingComprehensionScore?: number;
}

/**
 * Enhanced Mind Map Generator with Phase 2: Data Intelligence & Logic
 * Implements Health Scoring, Learning Paths, and Cluster Analysis
 */
export class MindMapGenerator {
  private static instance: MindMapGenerator;
  private storage: StorageService;
  private srs: SpacedRepetitionService;

  // Enhanced caching for Phase 2 algorithms
  private lastGeneratedGraph?: NeuralGraph;
  private lastUpdateTime = 0;
  private cacheValidityMs = 5 * 60 * 1000; // 5 minutes

  // Phase 2 Caches
  private healthMetricsCache?: NeuralGraph['healthMetrics'];
  private clustersCache?: KnowledgeCluster[];
  private learningPathsCache?: LearningPath[];
  private cacheTimestamp = 0;

  public static getInstance(): MindMapGenerator {
    if (!MindMapGenerator.instance) {
      MindMapGenerator.instance = new MindMapGenerator();
    }
    return MindMapGenerator.instance;
  }

  private constructor() {
  this.storage = StorageService.getInstance();
    this.srs = SpacedRepetitionService.getInstance();
  }

  // Compatibility methods used by orchestrators
  public async generateMindMap(opts: any): Promise<any> {
    // delegate to main implementation if exists
    if ((this as any).generateNeuralGraph) {
      return (this as any).generateNeuralGraph(false);
    }
    return { nodes: [], links: [] };
  }

  public setSimplifiedMode(_enabled: boolean): void {
    // No-op compatibility
  }

  public async startSession(_id: string, _cfg: any): Promise<any> {
    return { success: true };
  }

  public async pauseSession(_id: string): Promise<void> {
    return;
  }

  /**
   * Main method: Generate complete neural graph with Phase 2 enhancements
   * Now includes Health Scoring, Cluster Analysis, and Learning Path Generation
   */
  async generateNeuralGraph(forceRefresh = false): Promise<NeuralGraph> {
    try {
      // Check cache validity
      const now = Date.now();
      if (
        !forceRefresh &&
        this.lastGeneratedGraph &&
        now - this.lastUpdateTime < this.cacheValidityMs
      ) {
        return this.lastGeneratedGraph;
      }

      // Load all data sources in parallel
      const [flashcards, tasks, sessions, palaces, logicNodes, readingSessions] =
        await Promise.all([
        this.storage.getFlashcards(),
          this.storage.getTasks(),
          this.storage.getStudySessions(),
          this.storage.getMemoryPalaces(),
          this.storage.getLogicNodes(),
          this.storage.getReadingSessions(),
        ]);

      // Early return if no data
      if (
        !flashcards.length &&
        !tasks.length &&
        !palaces.length &&
        !logicNodes.length &&
        !readingSessions.length
      ) {
        return this.createEmptyGraph();
      }

      // Generate nodes with enhanced health scoring
      const nodeGenerators = [
        () => this.generateFlashcardNodes(flashcards, sessions),
        () => this.generateTaskNodes(tasks),
        () => this.generateMemoryPalaceNodes(palaces),
        () => this.generateLogicNodes(logicNodes, sessions),
        () => this.generateDerivedNodes(flashcards, tasks),
        () => this.generateReadingNodes(readingSessions),
      ];

      const nodeArrays = await Promise.all(
        nodeGenerators.map((generator) => Promise.resolve(generator())),
      );

      const nodes = nodeArrays.flat();

      // CRITICAL: Apply FSRS activation detection and health scoring
      const currentDate = new Date();
      nodes.forEach((node) => {
        // FSRS activation detection
        node.isActive =
          node.nextReviewDate && node.nextReviewDate <= currentDate;

        // Phase 2: Calculate health score for each node
        node.healthScore = this.calculateNodeHealthScore(node);
        node.healthCategory = this.categorizeNodeHealth(node.healthScore);
      });

      // Generate enhanced links
      const linkGenerators = [
        () => this.generateCategoryLinks(nodes),
        () => this.generateSemanticLinks(nodes),
        () => this.generateTemporalLinks(nodes, sessions),
        () => this.generateGoalLinks(nodes, tasks),
        () => this.generatePrerequisiteLinks(nodes),
        () => this.generateLogicalLinks(nodes),
      ];

      const linkArrays = await Promise.all(
        linkGenerators.map((generator) => Promise.resolve(generator())),
      );

      const links = linkArrays.flat();

      // Phase 2: Advanced Analysis
      const healthMetrics = this.calculateHealthMetrics(nodes);
      const clusters = await this.generateKnowledgeClusters(nodes, links);
      const learningPaths = await this.generateLearningPaths(nodes, links);

      // Create enhanced graph with Phase 2 analytics
      const graph = await this.createEnhancedGraph(
        nodes,
        links,
        healthMetrics,
        clusters,
        learningPaths,
        readingSessions,
      );

      // Cache the result
      this.lastGeneratedGraph = graph;
      this.lastUpdateTime = now;
      this.cacheTimestamp = now;

      console.log('🧠 Phase 2 Neural Graph Generated:');
      console.log(
        `   📊 Health: ${Math.round(
          (healthMetrics?.overallHealth || 0.5) * 100,
        )}%`,
      );
      console.log(`   🔗 Clusters: ${clusters.length}`);
      console.log(`   🛤️  Paths: ${learningPaths.length}`);

      return graph;
    } catch (error: any) {
      console.error('Error generating neural graph:', error);
      throw new Error(
        `Neural graph generating failed: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Phase 2, Step 6: Health Scoring Implementation
   * THE HIGHEST VALUE FEATURE - Core health score calculation
   */
  private calculateNodeHealthScore(node: NeuralNode): number {
    try {
      // 1. Mastery Factor (Long-Term Health) - 40% weight
      const masteryFactor = Math.max(0, Math.min(1, node.masteryLevel || 0));

      // 2. Urgency Factor (FSRS-Driven, Short-Term Health) - 40% weight
      const urgencyFactor = this.calculateUrgencyFactor(node);

      // 3. Stability Factor (FSRS Stability Metric) - 20% weight
      const stabilityFactor = this.calculateStabilityFactor(node);

      // Final weighted health score
      const healthScore =
        masteryFactor * 0.4 + urgencyFactor * 0.4 + stabilityFactor * 0.2;

      return Math.max(0, Math.min(1, healthScore));
    } catch (error) {
      console.warn('Error calculating health score for node:', node.id, error);
      return 0.5; // Default neutral health
    }
  }

  /**
   * Calculate urgency factor (higher = healthier, lower = more urgent)
   */
  private calculateUrgencyFactor(node: NeuralNode): number {
    // If node is actively due for review, it's unhealthy
    if (node.isActive) {
      const now = new Date();
      const nextReview = new Date(node.nextReviewDate || now);
      const daysPastDue = Math.max(
        0,
        (now.getTime() - nextReview.getTime()) / (24 * 60 * 60 * 1000),
      );

      // Exponential penalty for overdue items
      const overduePenalty = Math.min(0.8, daysPastDue * 0.1);
      return Math.max(0.1, 0.3 - overduePenalty);
    }

    // Calculate retention confidence for non-due items
    const intervalBonus = Math.min(0.3, ((node.interval || 1) / 365) * 0.3);
    const easeBonus = Math.min(
      0.4,
      (((node.easeFactor || 2.5) - 1.3) / (4.0 - 1.3)) * 0.4,
    );

    return Math.max(0.2, Math.min(1.0, 0.6 + intervalBonus + easeBonus));
  }

  /**
   * Calculate stability factor from FSRS metrics
   */
  private calculateStabilityFactor(node: NeuralNode): number {
    // Use FSRS stability if available
    if (node.stability && typeof node.stability === 'number') {
      return Math.min(
        1,
        Math.max(0, Math.log(node.stability + 1) / Math.log(365)),
      );
    }

    // Fallback calculation
    const repetitionBonus = Math.min(0.4, ((node.repetitions || 0) / 20) * 0.4);
    const accessBonus = Math.min(0.3, ((node.accessCount || 0) / 50) * 0.3);

    return Math.max(0.1, Math.min(1.0, 0.3 + repetitionBonus + accessBonus));
  }

  /**
   * Categorize node health into actionable categories
   */
  private categorizeNodeHealth(
    healthScore: number,
  ): 'critical' | 'moderate' | 'healthy' {
    if (healthScore < 0.3) return 'critical';
    if (healthScore < 0.7) return 'moderate';
    return 'healthy';
  }

  /**
   * Phase 2, Step 6: Health Metrics Calculation
   * Generate comprehensive health analytics
   */
  private calculateHealthMetrics(
    nodes: NeuralNode[],
  ): NeuralGraph['healthMetrics'] {
    try {
      const criticalNodes = nodes.filter(
        (n) => n.healthCategory === 'critical',
      );
      const atRiskNodes = nodes.filter((n) => n.healthCategory === 'moderate');
      const healthyNodes = nodes.filter((n) => n.healthCategory === 'healthy');

      const overallHealth =
        nodes.length > 0
          ? nodes.reduce((sum, node) => sum + (node.healthScore || 0.5), 0) /
            nodes.length
          : 0.5;

      const total = nodes.length || 1;
      const healthDistribution = {
        critical: Math.round((criticalNodes.length / total) * 100),
        moderate: Math.round((atRiskNodes.length / total) * 100),
        healthy: Math.round((healthyNodes.length / total) * 100),
      };

      return {
        overallHealth,
        criticalNodes,
        healthyNodes,
        atRiskNodes,
        healthDistribution,
      };
    } catch (error) {
      console.error('Error calculating health metrics:', error);
      return {
        overallHealth: 0.5,
        criticalNodes: [],
        healthyNodes: [],
        atRiskNodes: [],
        healthDistribution: { critical: 0, moderate: 0, healthy: 0 },
      };
    }
  }

  /**
   * Phase 2, Step 4: Knowledge Clusters Generation
   * Group nodes into cohesive knowledge domains
   */
  private async generateKnowledgeClusters(
    nodes: NeuralNode[],
    links: NeuralLink[],
  ): Promise<KnowledgeCluster[]> {
    try {
      // Group by category first (simple clustering)
      const categoryGroups = new Map<string, NeuralNode[]>();

      nodes.forEach((node) => {
        const category = node.category || 'uncategorized';
        if (!categoryGroups.has(category)) {
          categoryGroups.set(category, []);
        }
        categoryGroups.get(category)!.push(node);
      });

      // Convert to enhanced clusters
      const clusters: KnowledgeCluster[] = [];

      for (const [category, clusterNodes] of Array.from(categoryGroups.entries())) {
        if (clusterNodes.length === 0) continue;

        const cluster = await this.createKnowledgeCluster(
          category,
          clusterNodes,
          links,
        );
        clusters.push(cluster);
      }

      // Sort by health (worst first for attention)
      clusters.sort((a, b) => a.health - b.health);

      console.log(`🔗 Generated ${clusters.length} knowledge clusters`);
      return clusters;
    } catch (error) {
      console.error('Error generating knowledge clusters:', error);
      return [];
    }
  }

  /**
   * Create enhanced knowledge cluster with health metrics
   */
  private async createKnowledgeCluster(
    category: string,
    nodes: NeuralNode[],
    links: NeuralLink[],
  ): Promise<KnowledgeCluster> {
    // Calculate cluster health (average of node health scores)
    const healthScores = nodes.map((n) => n.healthScore || 0.5);
    const health =
      healthScores.reduce((sum, h) => sum + h, 0) / healthScores.length;

    // Calculate cluster mastery level
    const masteryLevels = nodes.map((n) => n.masteryLevel || 0);
    const masteryLevel =
      masteryLevels.reduce((sum, m) => sum + m, 0) / masteryLevels.length;

    // Calculate centroid
    const validNodes = nodes.filter(
      (n) => typeof n.x === 'number' && typeof n.y === 'number',
    );
    const centroid =
      validNodes.length > 0
        ? {
            x: validNodes.reduce((sum, n) => sum + n.x!, 0) / validNodes.length,
            y: validNodes.reduce((sum, n) => sum + n.y!, 0) / validNodes.length,
          }
        : { x: 0, y: 0 };

    // Find critical nodes
    const criticalNodes = nodes.filter((n) => n.healthCategory === 'critical');

    // Generate recommendations
    const recommendations = this.generateClusterRecommendations(
      health,
      criticalNodes.length,
      nodes.length,
    );

    return {
      id: `cluster_${category}`,
      name: this.formatCategoryName(category),
      nodes,
      health,
      masteryLevel,
      category,
      size: nodes.length,
      centroid,
      criticalNodes,
      recommendations,
    };
  }

  /**
   * Generate cluster-specific recommendations
   */
  private generateClusterRecommendations(
    health: number,
    criticalCount: number,
    totalCount: number,
  ): string[] {
    const recommendations: string[] = [];

    if (health < 0.3) {
      recommendations.push(
        '🚨 Critical cluster - requires immediate attention',
      );
      recommendations.push('📚 Focus on foundational concepts first');
      recommendations.push('⏰ Schedule daily review sessions');
    } else if (health < 0.7) {
      recommendations.push('⚠️  Moderate health - regular practice needed');
      recommendations.push('🔗 Strengthen connections between concepts');
    } else {
      recommendations.push(
        '✅ Healthy cluster - maintain with periodic review',
      );
      recommendations.push('🚀 Ready for advanced concepts in this domain');
    }

    if (criticalCount > 0) {
      recommendations.push(
        `🎯 ${criticalCount}/${totalCount} concepts need urgent review`,
      );
    }

    return recommendations;
  }

  /**
   * Phase 2, Step 5: Learning Path Generation
   * Determine efficient sequences for learning related concepts
   */
  private async generateLearningPaths(
    nodes: NeuralNode[],
    links: NeuralLink[],
  ): Promise<LearningPath[]> {
    try {
      const paths: LearningPath[] = [];

      // Generate prerequisite paths (from weak to strong concepts)
      const weakNodes = nodes.filter((n) => (n.healthScore || 0.5) < 0.4);
      const strongNodes = nodes.filter((n) => (n.healthScore || 0.5) > 0.7);

      for (const weakNode of weakNodes.slice(0, 5)) {
        // Limit to 5 for performance
        for (const strongNode of strongNodes.slice(0, 3)) {
          const path = this.findLearningPath(
            weakNode,
            strongNode,
            nodes,
            links,
          );
          if (path && path.path.length > 1) {
            paths.push(path);
          }
        }
      }

      // Generate mastery paths (to achieve specific goals)
      const goalNodes = nodes.filter((n) => n.type === 'goal');
      for (const goalNode of goalNodes.slice(0, 3)) {
        const mastertyPath = this.findMasteryPath(goalNode, nodes, links);
        if (mastertyPath) {
          paths.push(mastertyPath);
        }
      }

      // Sort by efficiency (shortest high-impact paths first)
      paths.sort((a, b) => a.totalCost - b.totalCost);

      console.log(`🛤️  Generated ${paths.length} learning paths`);
      return paths.slice(0, 10); // Limit to top 10 paths
    } catch (error) {
      console.error('Error generating learning paths:', error);
      return [];
    }
  }

  /**
   * Find optimal learning path between two nodes using Dijkstra's algorithm
   * Cost is weighted by health score (unhealthy = higher cost)
   */
  private findLearningPath(
    startNode: NeuralNode,
    endNode: NeuralNode,
    allNodes: NeuralNode[],
    links: NeuralLink[],
  ): LearningPath | null {
    try {
      // Simple shortest path implementation (Dijkstra's simplified)
      const distances = new Map<string, number>();
      const previous = new Map<string, string>();
      const unvisited = new Set<string>();

      // Initialize distances
      allNodes.forEach((node) => {
        distances.set(node.id, node.id === startNode.id ? 0 : Infinity);
        unvisited.add(node.id);
      });

      // Build adjacency map
      const adjacency = new Map<string, { nodeId: string; cost: number }[]>();
      links.forEach((link) => {
        const sourceId =
          typeof link.source === 'string' ? link.source : link.source.id;
        const targetId =
          typeof link.target === 'string' ? link.target : link.target.id;

        if (!adjacency.has(sourceId)) adjacency.set(sourceId, []);
        if (!adjacency.has(targetId)) adjacency.set(targetId, []);

        // Cost based on target node health (unhealthy = higher cost)
        const targetNode = allNodes.find((n) => n.id === targetId);
        const cost = targetNode
          ? (1 - (targetNode.healthScore || 0.5)) * 10 + 1
          : 5;

        adjacency.get(sourceId)!.push({ nodeId: targetId, cost });
        adjacency.get(targetId)!.push({ nodeId: sourceId, cost }); // Bidirectional
      });

      // Dijkstra's algorithm (simplified)
      while (unvisited.size > 0) {
        // Find unvisited node with minimum distance
        let currentNodeId = '';
        let minDistance = Infinity;
        for (const nodeId of Array.from(unvisited)) {
          const distance = distances.get(nodeId) || Infinity;
          if (distance < minDistance) {
            minDistance = distance;
            currentNodeId = nodeId;
          }
        }

        if (!currentNodeId || minDistance === Infinity) break;

        unvisited.delete(currentNodeId);

        // Stop if we reached the target
        if (currentNodeId === endNode.id) break;

        // Update distances to neighbors
        const neighbors = adjacency.get(currentNodeId) || [];
        for (const neighbor of neighbors) {
          if (!unvisited.has(neighbor.nodeId)) continue;

          const newDistance = minDistance + neighbor.cost;
          const currentDistance = distances.get(neighbor.nodeId) || Infinity;

          if (newDistance < currentDistance) {
            distances.set(neighbor.nodeId, newDistance);
            previous.set(neighbor.nodeId, currentNodeId);
          }
        }
      }

      // Reconstruct path
      const path: NeuralNode[] = [];
      let currentId: string | undefined = endNode.id;

      while (currentId) {
        const node = allNodes.find((n) => n.id === currentId);
        if (node) {
          path.unshift(node);
        }
        currentId = previous.get(currentId);
      }

      // Validate path — ensure we have at least two nodes and that first/last exist
      if (path.length < 2) {
        return null;
      }
      const firstNode = path[0];
      const lastNode = path[path.length - 1];
      if (!firstNode || !lastNode || firstNode.id !== startNode.id || lastNode.id !== endNode.id) {
        return null;
      }

      const totalCost = distances.get(endNode.id) || Infinity;
      const estimatedTimeMinutes = Math.round(totalCost * 15); // 15 minutes per cost unit
      const recommendations = this.generatePathRecommendations(path);

      return {
        id: `path_${startNode.id}_to_${endNode.id}`,
        startNode,
        endNode,
        path,
        totalCost,
        estimatedTimeMinutes,
        difficulty: this.assessPathDifficulty(path),
        pathType: 'prerequisite',
        recommendations,
      };
    } catch (error) {
      console.warn('Error finding learning path:', error);
      return null;
    }
  }

  /**
   * Find mastery path to achieve a specific goal
   */
  private findMasteryPath(
    goalNode: NeuralNode,
    allNodes: NeuralNode[],
    links: NeuralLink[],
  ): LearningPath | null {
    // For now, return a simple path to the goal from weakest related concepts
    const relatedNodes = allNodes.filter(
      (n) =>
        n.category === goalNode.category &&
        n.id !== goalNode.id &&
        (n.healthScore || 0.5) < 0.6,
    );

    if (relatedNodes.length === 0) return null;

    // Find weakest related node
    const startNode = relatedNodes.reduce((weakest, current) =>
      (current.healthScore || 0) < (weakest.healthScore || 0)
        ? current
        : weakest,
    );

    return this.findLearningPath(startNode, goalNode, allNodes, links);
  }

  /**
   * Assess path difficulty based on concepts involved
   */
  private assessPathDifficulty(
    path: NeuralNode[],
  ): 'beginner' | 'intermediate' | 'advanced' {
    const avgMastery =
      path.reduce((sum, node) => sum + (node.masteryLevel || 0), 0) /
      path.length;
    const avgCognitiveLoad =
      path.reduce((sum, node) => sum + (node.cognitiveLoad || 0.5), 0) /
      path.length;

    const complexity = 1 - avgMastery + avgCognitiveLoad;

    if (complexity < 0.4) return 'beginner';
    if (complexity < 0.8) return 'intermediate';
    return 'advanced';
  }

  /**
   * Generate path-specific recommendations
   */
  private generatePathRecommendations(path: NeuralNode[]): string[] {
    const recommendations: string[] = [];

    recommendations.push(`📍 ${path.length}-step learning sequence`);
    recommendations.push(
      `⏱️ Estimated completion: ${Math.round(path.length * 15)} minutes`,
    );

    const criticalSteps = path.filter(
      (n) => n.healthCategory === 'critical',
    ).length;
    if (criticalSteps > 0) {
      recommendations.push(
        `🚨 ${criticalSteps} critical concepts need extra attention`,
      );
    }

    const logicSteps = path.filter((n) => n.type === 'logic').length;
    if (logicSteps > 0) {
      recommendations.push(`🧠 ${logicSteps} logical reasoning steps included`);
    }

    return recommendations;
  }

  /**
   * Format category name for display
   */
  private formatCategoryName(category: string): string {
    return category
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Enhanced node generation methods (using existing implementations with health scoring)

  private generateFlashcardNodes(
    flashcards: any[],
    sessions: any[],
  ): NeuralNode[] {
    // Implementation from previous version with health scoring added
    return flashcards.map((card, index) => {
      const masteryLevel = this.calculateEnhancedMastery(card, sessions);
      const isActive = this.srs.isCardDue(card);
      const cognitiveLoad = this.calculateCognitiveLoad(card, masteryLevel);

      const node: NeuralNode = {
        id: `flashcard_${card.id}`,
        type: 'concept',
        x: this.generateInitialPosition(index, flashcards.length).x,
        y: this.generateInitialPosition(index, flashcards.length).y,
        radius: this.calculateNodeRadius(
          masteryLevel,
          cognitiveLoad,
          'concept',
        ),
        activationLevel: this.calculateActivationLevel(
          isActive,
          masteryLevel,
          cognitiveLoad,
        ),
        isActive,
        label: this.extractSmartKeyTerms(card.front),
        content: card.front,
        category: card.category,
        masteryLevel,
        cognitiveLoad,
        lastAccessed: card.nextReview,
        accessCount: this.calculateAccessCount(card.id, sessions, 'flashcards'),
        easeFactor: card.easeFactor || 2.5,
        interval: card.interval || 1,
        repetitions: card.repetitions || 0,
        nextReviewDate: card.nextReview,
        lastDifficulty: card.difficulty,
        stability: card.stability,
        difficulty: card.difficulty,
        sourceType: 'flashcard',
        sourceId: card.id,
      };

      // Phase 2: Add health scoring
      node.healthScore = this.calculateNodeHealthScore(node);
      node.healthCategory = this.categorizeNodeHealth(node.healthScore);

      return node;
    });
  }

  private generateLogicNodes(logicNodes: any[], sessions: any[]): NeuralNode[] {
    // Implementation from previous version with health scoring
    return logicNodes.map((logicItem, index) => {
      const logicStructure: LogicStructure = {
        question: logicItem.question || '',
        premise1: logicItem.premise1 || '',
        premise2: logicItem.premise2 || '',
        conclusion: logicItem.conclusion || '',
        type: logicItem.type || 'deductive',
        domain: logicItem.domain || 'general',
        difficulty: logicItem.difficulty || 3,
      };

      const masteryLevel = this.calculateLogicMastery(logicItem, sessions);
      const isActive =
        this.srs.isCardDue({
          nextReview: logicItem.nextReviewDate,
          interval: logicItem.interval || 1,
        }) || masteryLevel < 0.4;

      const cognitiveLoad = this.calculateLogicCognitiveLoad(logicStructure);

      const node: NeuralNode = {
        id: `logic_${logicItem.id}`,
        type: 'logic',
        x: this.generateInitialPosition(index, logicNodes.length).x + 200,
        y: this.generateInitialPosition(index, logicNodes.length).y + 100,
        radius: this.calculateNodeRadius(masteryLevel, cognitiveLoad, 'logic'),
        activationLevel: isActive
          ? Math.min(1.0, 0.8 + logicStructure.difficulty * 0.04)
          : masteryLevel * 0.7,
        isActive,
        label: this.extractLogicLabel(logicStructure),
        content: logicStructure,
        category: `logic_${logicStructure.domain}`,
        masteryLevel,
        cognitiveLoad,
        lastAccessed: logicItem.lastAccessed || new Date(),
        accessCount: logicItem.accessCount || 0,
        easeFactor: logicItem.easeFactor || 2.5,
        interval: logicItem.interval || 1,
        repetitions: logicItem.repetitions || 0,
        nextReviewDate: logicItem.nextReviewDate || new Date(),
        lastDifficulty: logicItem.lastDifficulty,
        stability: logicItem.stability,
        difficulty: logicItem.difficulty,
        sourceType: 'logic',
        sourceId: logicItem.id,
      };

      // Phase 2: Add health scoring
      node.healthScore = this.calculateNodeHealthScore(node);
      node.healthCategory = this.categorizeNodeHealth(node.healthScore);

      return node;
    });
  }

  /**
   * Generate reading session nodes for neural map integration
   */
  private generateReadingNodes(readingSessions: any[]): NeuralNode[] {
    try {
      return readingSessions.map((session: any, index: number) => {
        const efficiency = this.calculateReadingEfficiency(session);
        const cognitiveLoad = 0.3; // Reading is generally lower cognitive load

        const node: NeuralNode = {
          id: `reading_${session.id}`,
          type: 'memory',
          x: this.generateInitialPosition(index, readingSessions.length).x + 150,
          y: this.generateInitialPosition(index, readingSessions.length).y - 80,
          radius: this.calculateNodeRadius(efficiency, cognitiveLoad, 'memory'),
          activationLevel: efficiency,
          isActive: efficiency > 0.7,
          label: session.textTitle || `Reading ${index + 1}`,
          content: `${session.wpmAchieved} WPM, ${Math.round(session.comprehensionScore * 100)}% comprehension`,
          category: `reading_${session.textDifficulty || 'medium'}`,
          masteryLevel: efficiency,
          cognitiveLoad,
          lastAccessed: session.endTime,
          accessCount: 1,
          easeFactor: 2.5,
          interval: 7,
          repetitions: 1,
          nextReviewDate: session.endTime,
          sourceType: 'derived',
          sourceId: session.id,
        };

        node.healthScore = this.calculateNodeHealthScore(node);
        node.healthCategory = this.categorizeNodeHealth(node.healthScore);
        return node;
      });
    } catch (e) {
      console.warn('generateReadingNodes failed', e);
      return [];
    }
  }

  /**
   * Calculate reading efficiency from session data
   */
  private calculateReadingEfficiency(session: any): number {
    try {
      let efficiency = 0;

      // WPM efficiency (normalized to 0-1)
      const wpmScore = Math.min(1, session.wpmAchieved / 500); // 500 WPM as max
      efficiency += wpmScore * 0.4;

      // Comprehension score
      efficiency += (session.comprehensionScore || 0.8) * 0.4;

      // Concept extraction bonus
      const conceptBonus = Math.min(0.2, (session.conceptsIdentified?.length || 0) / 10 * 0.2);
      efficiency += conceptBonus;

      return Math.max(0, Math.min(1, efficiency));
    } catch (e) {
      return 0.6; // Default efficiency
    }
  }

  /**
   * Create enhanced graph with Phase 2 analytics
   */
  private async createEnhancedGraph(
    nodes: NeuralNode[],
    links: NeuralLink[],
    healthMetrics: NeuralGraph['healthMetrics'] | undefined,
    clusters: KnowledgeCluster[],
    learningPaths: LearningPath[],
    readingSessions: any[] = [],
  ): Promise<NeuralGraph> {
    // Calculate core metrics
    const totalActivationLevel = this.calculateTotalActivation(nodes);
    const knowledgeHealth = Math.round(
      (healthMetrics?.overallHealth || 0.5) * 100,
    );
    // Use healthMetrics with fallback
    const safeHealthMetrics = healthMetrics || {
      overallHealth: 0.5,
      criticalNodes: [],
      healthyNodes: [],
      atRiskNodes: [],
      healthDistribution: { critical: 0, moderate: 0, healthy: 0 },
    };

    const cognitiveComplexity = this.calculateCognitiveComplexity(nodes);

    // FSRS-specific metrics
    const currentDate = new Date();
    const dueNodesCount = nodes.filter(
      (node) => node.nextReviewDate && node.nextReviewDate <= currentDate,
    ).length;

    const criticalLogicCount = nodes.filter(
      (node) => node.type === 'logic' && node.isActive,
    ).length;

    // Phase 2: Enhanced metrics
    const clusterHealthScores = new Map<string, number>();
    clusters.forEach((cluster) => {
      clusterHealthScores.set(cluster.id, cluster.health);
    });

    const pathEfficiencyScores = new Map<string, number>();
    learningPaths.forEach((path) => {
      const efficiency = 1 / Math.max(1, path.totalCost);
      pathEfficiencyScores.set(path.id, efficiency);
    });

    // Phase 6: Reading analytics
    const totalReadingSessions = readingSessions.length;
    const readingEfficiencyFactor = readingSessions.length > 0
      ? readingSessions.reduce((sum, s) => sum + this.calculateReadingEfficiency(s), 0) / readingSessions.length
      : 0;
    const averageReadingWPM = readingSessions.length > 0
      ? readingSessions.reduce((sum, s) => sum + (s.wpmAchieved || 0), 0) / readingSessions.length
      : 0;
    const readingComprehensionScore = readingSessions.length > 0
      ? readingSessions.reduce((sum, s) => sum + (s.comprehensionScore || 0), 0) / readingSessions.length
      : 0;

    return {
      nodes,
      links,
      totalActivationLevel,
      knowledgeHealth,
      cognitiveComplexity,
      dueNodesCount,
      criticalLogicCount,
      lastUpdated: new Date(),

      // Phase 2 Enhancements
      healthMetrics: safeHealthMetrics,
      clusters,
      learningPaths,

      // Phase 6: Speed Reading Integration
      totalReadingSessions,
      readingEfficiencyFactor,
      averageReadingWPM,
      readingComprehensionScore,

      metrics: {
        density: this.calculateGraphDensity(nodes, links),
        averageClusterCoefficient: 0.4,
        centralityScores: new Map(),
        activationDistribution: this.calculateActivationDistribution(nodes),
        logicTrainingProgress: this.calculateLogicProgress(nodes),
        clusterHealthScores,
        pathEfficiencyScores,
      },
    };
  }

  // Helper methods (simplified implementations)
  private calculateGraphDensity(
    nodes: NeuralNode[],
    links: NeuralLink[],
  ): number {
    const n = nodes.length;
    const maxLinks = (n * (n - 1)) / 2;
    return maxLinks > 0 ? links.length / maxLinks : 0;
  }

  private calculateActivationDistribution(nodes: NeuralNode[]): {
    low: number;
    medium: number;
    high: number;
  } {
    const low = nodes.filter((n) => (n.activationLevel || 0) < 0.3).length;
    const high = nodes.filter((n) => (n.activationLevel || 0) > 0.7).length;
    const medium = nodes.length - low - high;

    return { low, medium, high };
  }

  private calculateLogicProgress(nodes: NeuralNode[]): number {
    const logicNodes = nodes.filter((n) => n.type === 'logic');
    if (logicNodes.length === 0) return 0;

    const totalProgress = logicNodes.reduce(
      (sum, node) => sum + (node.masteryLevel || 0),
      0,
    );
    return totalProgress / logicNodes.length;
  }

  // Placeholder methods (to be implemented or kept from an existing version)
  private generateTaskNodes(tasks: any[]): NeuralNode[] {
    try {
      return tasks.map((task: any, idx: number) => {
        const mastery = task.completed ? 1 : 0.2;
        const cognitiveLoad = 0.4;
        const node: NeuralNode = {
          id: `task_${task.id || idx}`,
          type: 'goal',
          x: this.generateInitialPosition(idx, tasks.length).x - 30,
          y: this.generateInitialPosition(idx, tasks.length).y - 30,
          radius: this.calculateNodeRadius(mastery, cognitiveLoad, 'goal'),
          activationLevel: this.calculateActivationLevel(
            !task.completed,
            mastery,
            cognitiveLoad,
          ),
          isActive: !task.completed,
          label: task.title || task.name || `Task ${idx}`,
          content: task.description || '',
          category: task.project || task.category || 'tasks',
          masteryLevel: mastery,
          cognitiveLoad,
          lastAccessed: task.modified || new Date(),
          accessCount: task.accessCount || 1,
          easeFactor: task.easeFactor || 2.5,
          interval: task.interval || 1,
          repetitions: task.repetitions || 0,
          nextReviewDate: task.nextReview || new Date(),
          sourceType: 'task',
          sourceId: task.id || `${idx}`,
        };

        node.healthScore = this.calculateNodeHealthScore(node);
        node.healthCategory = this.categorizeNodeHealth(node.healthScore);
        return node;
      });
    } catch (e) {
      console.warn('generateTaskNodes failed', e);
      return [];
    }
  }
  private generateMemoryPalaceNodes(palaces: any[]): NeuralNode[] {
    try {
      return palaces.map((palace: any, idx: number) => {
        const mastery = palace.masteryLevel || 0.6;
        const cognitiveLoad = 0.3;
        const node: NeuralNode = {
          id: `palace_${palace.id || idx}`,
          type: 'memory',
          x: this.generateInitialPosition(idx, palaces.length).x,
          y: this.generateInitialPosition(idx, palaces.length).y - 120,
          radius: this.calculateNodeRadius(mastery, cognitiveLoad, 'memory'),
          activationLevel: this.calculateActivationLevel(
            true,
            mastery,
            cognitiveLoad,
          ),
          isActive: true,
          label: palace.name || `Memory Palace ${idx}`,
          content: palace.description || '',
          category: palace.category || 'memory_palace',
          masteryLevel: mastery,
          cognitiveLoad,
          lastAccessed: palace.lastAccessed || new Date(),
          accessCount: palace.accessCount || 1,
          easeFactor: palace.easeFactor || 2.5,
          interval: palace.interval || 7,
          repetitions: palace.repetitions || 0,
          nextReviewDate: palace.nextReview || new Date(),
          sourceType: 'palace',
          sourceId: palace.id || `${idx}`,
        };

        node.healthScore = this.calculateNodeHealthScore(node);
        node.healthCategory = this.categorizeNodeHealth(node.healthScore);
        return node;
      });
    } catch (e) {
      console.warn('generateMemoryPalaceNodes failed', e);
      return [];
    }
  }
  private generateDerivedNodes(flashcards: any[], tasks: any[]): NeuralNode[] {
    try {
      const derived: NeuralNode[] = [];
      // Simple derived skills: group flashcard categories to produce skill nodes
      const categories = new Map<string, any[]>();
      flashcards.forEach((c) => {
        const cat = c.category || 'general';
        if (!categories.has(cat)) categories.set(cat, []);
        categories.get(cat)!.push(c);
      });

      let idx = 0;
      for (const [cat, cards] of Array.from(categories.entries())) {
        const mastery =
          cards.reduce(
            (s: number, c: any) =>
              s + (c.easeFactor ? Math.min(1, (c.easeFactor - 1) / 3) : 0.5),
            0,
          ) / cards.length;
        const node: NeuralNode = {
          id: `skill_${cat}`,
          type: 'skill',
          x: this.generateInitialPosition(idx, categories.size).x + 50,
          y: this.generateInitialPosition(idx, categories.size).y + 50,
          radius: this.calculateNodeRadius(mastery, 0.4, 'skill'),
          activationLevel: this.calculateActivationLevel(false, mastery, 0.4),
          isActive: false,
          label: `Skill: ${this.formatCategoryName(cat)}`,
          content: `Derived skill from ${cards.length} cards`,
          category: cat,
          masteryLevel: mastery,
          cognitiveLoad: 0.4,
          lastAccessed: new Date(),
          accessCount: cards.length,
          easeFactor: 2.5,
          interval: 7,
          repetitions: 0,
          nextReviewDate: new Date(),
          sourceType: 'derived',
          sourceId: `derived_${cat}`,
        };

        node.healthScore = this.calculateNodeHealthScore(node);
        node.healthCategory = this.categorizeNodeHealth(node.healthScore);
        derived.push(node);
        idx++;
      }

      return derived;
    } catch (e) {
      console.warn('generateDerivedNodes failed', e);
      return [];
    }
  }
  private generateCategoryLinks(nodes: NeuralNode[]): NeuralLink[] {
    try {
      const links: NeuralLink[] = [];
      // Link nodes that share the same category
      const byCategory = new Map<string, NeuralNode[]>();
      nodes.forEach((n) => {
        const cat = n.category || 'uncategorized';
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        byCategory.get(cat)!.push(n);
      });

      for (const [cat, group] of byCategory.entries()) {
        if (!group || group.length < 2) continue;
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            const a = group[i];
            const b = group[j];
            if (!a || !b || !a.id || !b.id) continue;
            links.push({
              id: `cat_${a.id}_${b.id}`,
              source: a.id,
              target: b.id,
              strength: 0.5,
              weight: 0.3,
              type: 'association',
              activationCount: 0,
              lastActivated: new Date(),
              confidence: 0.4,
            });
          }
        }
      }

      return links;
    } catch (e) {
      console.warn('generateCategoryLinks failed', e);
      return [];
    }
  }
  private generateSemanticLinks(nodes: NeuralNode[]): NeuralLink[] {
    try {
      const links: NeuralLink[] = [];
      // Very simple semantic linking: if labels share words, link them
      const sanitize = (s: string) =>
        s.toLowerCase().replace(/[^a-z0-9 ]/g, '');
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const ni = nodes[i];
          const nj = nodes[j];
          const a = sanitize(ni?.label || '');
          const b = sanitize(nj?.label || '');
          const aWords = new Set(a.split(' ').filter(Boolean));
          const bWords = new Set(b.split(' ').filter(Boolean));
          const common = Array.from(aWords).filter((w) => bWords.has(w));
          if (common.length > 0) {
            if (!ni?.id || !nj?.id) continue;
            links.push({
              id: `sem_${ni.id}_${nj.id}`,
              source: ni.id,
              target: nj.id,
              strength: Math.min(0.9, 0.2 + common.length * 0.1),
              weight: 0.2,
              type: 'similarity',
              activationCount: 0,
              lastActivated: new Date(),
              confidence: Math.min(0.9, 0.3 + common.length * 0.1),
            });
          }
        }
      }

      return links;
    } catch (e) {
      console.warn('generateSemanticLinks failed', e);
      return [];
    }
  }
  private generateTemporalLinks(
    nodes: NeuralNode[],
    sessions: any[],
  ): NeuralLink[] {
    try {
      const links: NeuralLink[] = [];
      // Link nodes that were referenced in the same session (co-occurrence)
      sessions.forEach((s: any) => {
        const refs = (s.sourceLinks || [])
          .map((l: any) => l.conceptId)
          .filter(Boolean);
        for (let i = 0; i < refs.length; i++) {
          for (let j = i + 1; j < refs.length; j++) {
            const a = refs[i];
            const b = refs[j];
            if (!a || !b) continue;
            links.push({
              id: `temp_${s.id}_${a}_${b}`,
              source: a,
              target: b,
              strength: 0.3,
              weight: 0.2,
              type: 'temporal',
              activationCount: 0,
              lastActivated: new Date(s.endTime || Date.now()),
              confidence: 0.4,
            });
          }
        }
      });

      return links;
    } catch (e) {
      console.warn('generateTemporalLinks failed', e);
      return [];
    }
  }
  private generateGoalLinks(nodes: NeuralNode[], tasks: any[]): NeuralLink[] {
    try {
      const links: NeuralLink[] = [];
      // For each task node, try to find nodes with matching category or shared words
      tasks.forEach((task: any) => {
        const taskNodeId = `task_${task.id}`;
        const candidates = nodes.filter(
          (n) =>
            n.category === task.project ||
            (n.label &&
              task.title &&
              n.label.toLowerCase().includes((task.title || '').toLowerCase())),
        );
        candidates.forEach((cand) => {
          links.push({
            id: `goal_${taskNodeId}_${cand.id}`,
            source: taskNodeId,
            target: cand.id,
            strength: 0.45,
            weight: 0.35,
            type: 'prerequisite',
            activationCount: 0,
            lastActivated: new Date(),
            confidence: 0.5,
          });
        });
      });

      return links;
    } catch (e) {
      console.warn('generateGoalLinks failed', e);
      return [];
    }
  }
  private generatePrerequisiteLinks(nodes: NeuralNode[]): NeuralLink[] {
    try {
      const links: NeuralLink[] = [];
      const concepts = nodes.filter(
        (n) => n.type === 'concept' || n.type === 'skill',
      );
      concepts.sort((a, b) => (a.masteryLevel || 0) - (b.masteryLevel || 0));
      for (let i = 0; i < concepts.length - 1; i++) {
        const a = concepts[i];
        const b = concepts[i + 1];
        if (!a || !b || !a.id || !b.id) continue;
        links.push({
          id: `prereq_${a.id}_${b.id}`,
          source: a.id,
          target: b.id,
          strength: 0.35,
          weight: 0.25,
          type: 'prerequisite',
          activationCount: 0,
          lastActivated: new Date(),
          confidence: 0.45,
        });
      }
      return links;
    } catch (e) {
      console.warn('generatePrerequisiteLinks failed', e);
      return [];
    }
  }
  private generateLogicalLinks(nodes: NeuralNode[]): NeuralLink[] {
    try {
      const links: NeuralLink[] = [];
      const logicNodes = nodes.filter((n) => n.type === 'logic');
      const conceptNodes = nodes.filter((n) => n.type === 'concept');

      logicNodes.forEach((ln) => {
        const text = typeof ln.content === 'string' ? ln.content : JSON.stringify(ln.content);
        conceptNodes.forEach((cn) => {
          const labelRaw = cn?.label || '';
          const label = labelRaw.toLowerCase();
          const firstWord = label.split(' ')[0];
          if (!firstWord) return;
          if (text.toLowerCase().includes(firstWord)) {
            if (!ln?.id || !cn?.id) return;
            links.push({
              id: `logical_${ln.id}_${cn.id}`,
              source: ln.id,
              target: cn.id,
              strength: 0.5,
              weight: 0.4,
              type: 'logical',
              activationCount: 0,
              lastActivated: new Date(),
              confidence: 0.6,
            });
          }
        });
      });

      return links;
    } catch (e) {
      console.warn('generateLogicalLinks failed', e);
      return [];
    }
  }

  private calculateEnhancedMastery(card: any, sessions: any[]): number {
    try {
      const reps = card.repetitions || 0;
      const ef = card.easeFactor || 2.5;
      return Math.max(0, Math.min(1, Math.tanh(reps / 8) + (ef - 2.5) * 0.05));
    } catch (e) {
      return 0.5;
    }
  }
  private calculateCognitiveLoad(card: any, masteryLevel: number): number {
    try {
      const length =
        typeof card === 'string'
          ? card.length
          : (card.front || card.content || '').length || 100;
      const lenFactor = Math.min(1, length / 400);
      return Math.max(
        0.1,
        Math.min(1, 0.3 + (1 - masteryLevel) * 0.5 + lenFactor * 0.2),
      );
    } catch (e) {
      return 0.5;
    }
  }
  private calculateNodeRadius(
    masteryLevel: number,
    cognitiveLoad: number,
    type: string,
  ): number {
    const base = type === 'goal' || type === 'skill' ? 18 : 14;
    return Math.round(
      base + (masteryLevel || 0) * 6 + (cognitiveLoad || 0) * 3,
    );
  }
  private calculateActivationLevel(
    isActive: boolean,
    masteryLevel: number,
    cognitiveLoad: number,
  ): number {
    const activeBoost = isActive ? 0.35 : 0;
    const masteryPenalty = (masteryLevel || 0) * 0.25;
    const loadBoost = (cognitiveLoad || 0) * 0.2;
    return Math.max(
      0,
      Math.min(1, 0.2 + activeBoost + loadBoost - masteryPenalty),
    );
  }
  private calculateAccessCount(
    id: string,
    sessions: any[],
    type: string,
  ): number {
    try {
      if (!sessions || sessions.length === 0) return 1;
      let count = 0;
      sessions.forEach((s) => {
        if (Array.isArray(s.sourceLinks)) {
          if (s.sourceLinks.some((l: any) => l.conceptId === id)) count++;
        }
      });
      return Math.max(1, count);
    } catch (e) {
      return 1;
    }
  }
  private generateInitialPosition(
    index: number,
    total: number,
  ): { x: number; y: number } {
    const angle = index * 2.4;
    const radius = Math.sqrt(index) * 15;
    return {
      x: 150 + radius * Math.cos(angle),
      y: 150 + radius * Math.sin(angle),
    };
  }
  private extractSmartKeyTerms(text: string): string {
    return text.slice(0, 20);
  }
  private calculateLogicMastery(logicItem: any, sessions: any[]): number {
    return 0.5;
  }
  private calculateLogicCognitiveLoad(logic: LogicStructure): number {
    return 0.5;
  }
  private extractLogicLabel(logic: LogicStructure): string {
    return logic.question.split(' ').slice(0, 3).join(' ') + '...';
  }
  private calculateTotalActivation(nodes: NeuralNode[]): number {
    try {
      return nodes.reduce((sum, n) => sum + (n.activationLevel || 0), 0);
    } catch (e) {
      return 0.5;
    }
  }
  private calculateCognitiveComplexity(nodes: NeuralNode[]): number {
    try {
      if (!nodes.length) return 0;
      const avg =
        nodes.reduce((s, n) => s + (n.cognitiveLoad || 0.5), 0) / nodes.length;
      return Math.max(0, Math.min(1, avg));
    } catch (e) {
      return 0.5;
    }
  }

  // ==================== PHASE 6: Neural integration helpers ====================
  public async generateNeuralLinksFromReadingSession(
    session: ReadingSession,
  ): Promise<SourceLink[]> {
    try {
      const concepts =
        session.conceptsIdentified && session.conceptsIdentified.length > 0
          ? session.conceptsIdentified
          : [];
      const links: SourceLink[] = concepts.map((concept) => ({
        type: 'source_read',
        sessionId: session.id,
        textSource: session.textSource,
        conceptId: concept,
        relevanceScore: 0.8,
        extractedAt: new Date(),
      }));
      // Optionally persist
  await StorageService.getInstance().saveSourceLinks(links);
      return links;
    } catch (e) {
      console.error(
        'MindMapGenerator.generateNeuralLinksFromReadingSession error:',
        e,
      );
      return [];
    }
  }

  /**
   * Update knowledge health using reading efficiency inputs.
   * Returns a normalized delta [0..1] that can be used to boost overall health.
   */
  public updateKnowledgeHealthWithReadingEfficiency(
    wpmAchieved: number,
    comprehensionScore: number,
    conceptExtractionRate: number,
  ): number {
    // Weighted combination; conservative effect to avoid spikes
    const wpmFactor = Math.min(1, wpmAchieved / 600); // 600 as reference high
    const delta =
      0.5 * comprehensionScore +
      0.3 * wpmFactor +
      0.2 * Math.min(1, conceptExtractionRate);
    return Math.max(0, Math.min(1, delta));
  }

  private createEmptyGraph(): NeuralGraph {
    return {
      nodes: [],
      links: [],
      totalActivationLevel: 0,
      knowledgeHealth: 0,
      cognitiveComplexity: 0,
      dueNodesCount: 0,
      criticalLogicCount: 0,
      lastUpdated: new Date(),
      healthMetrics: {
        overallHealth: 0,
        criticalNodes: [],
        healthyNodes: [],
        atRiskNodes: [],
        healthDistribution: { critical: 0, moderate: 0, healthy: 0 },
      },
      clusters: [],
      learningPaths: [],
    };
  }
}

// Backwards compatibility: export alias and add small no-op methods
export const MindMapGeneratorService = MindMapGenerator as any;

// Ensure common methods expected by orchestrators exist as no-ops if absent
if (!(MindMapGenerator.prototype as any).generateMindMap) {
  (MindMapGenerator.prototype as any).generateMindMap = async function (opts: any) {
    return { nodes: [], links: [] };
  };
}

if (!(MindMapGenerator.prototype as any).setSimplifiedMode) {
  (MindMapGenerator.prototype as any).setSimplifiedMode = function (_enabled: boolean) {
    return;
  };
}

if (!(MindMapGenerator.prototype as any).startSession) {
  (MindMapGenerator.prototype as any).startSession = async function (_id: string, _cfg: any) {
    return { success: true };
  };
}

if (!(MindMapGenerator.prototype as any).pauseSession) {
  (MindMapGenerator.prototype as any).pauseSession = async function (_id: string) {
    return;
  };
}
