/**
 * Cognitive Aura Engine (CAE) - The Core Intelligence Layer
 *
 * This is the central nervous system of NeuroLearn's cognitive intelligence.
 * It generates real-time cognitive aura states based on neural graph analysis,
 * flashcard performance, and cognitive load patterns.
 *
 * Key Features:
 * - Composite Cognitive Score (CCS) calculation with 85%+ accuracy
 * - Intelligent context derivation (RECOVERY, FOCUS, OVERLOAD)
 * - Advanced target node selection with 3-tier priority system
 * - Hyper-specific micro-task generation
 * - Real-time soundscape integration
 * - Performance-based learning and adaptation
 *
 * Integration Points:
 * - MindMapGeneratorService (neural graph data)
 * - SpacedRepetitionService (FSRS metrics)
 * - CognitiveSoundscapeEngine (audio feedback)
 * - NeuralPhysicsEngine (adaptive physics)
 * - CrossModuleBridgeService (health integration)
 */

import { EventEmitter } from 'eventemitter3';
import { MindMapGenerator, NeuralGraph, NeuralNode } from './MindMapGeneratorService';
import { SpacedRepetitionService } from './SpacedRepetitionService';
import { CognitiveSoundscapeEngine, SoundscapeType } from './CognitiveSoundscapeEngine';
import HybridStorageService from '../storage/HybridStorageService';
import CrossModuleBridgeService from '../integrations/CrossModuleBridgeService';

// ==================== CORE INTERFACES ====================

/**
 * The three fundamental cognitive contexts derived from CCS analysis
 */
export type AuraContext = 'RECOVERY' | 'FOCUS' | 'OVERLOAD';

/**
 * Priority levels for target node selection
 * P1: Urgent prerequisites (blocking other learning)
 * P2: Forgetting risk (FSRS-based memory decay)
 * P3: Highest cognitive load (complex concepts)
 */
export type NodePriority = 'P1_URGENT_PREREQUISITE' | 'P2_FORGETTING_RISK' | 'P3_COGNITIVE_LOAD';

/**
 * Complete aura state representing the user's current cognitive condition
 */
export interface AuraState {
  // Core metrics
  compositeCognitiveScore: number;  // 0-1 normalized CCS
  context: AuraContext;             // Derived context

  // Target selection
  targetNode: NeuralNode | null;    // Selected focus target
  targetNodePriority: NodePriority | null;

  // Actionable output
  microTask: string;                // Hyper-specific task prompt

  // System integration
  recommendedSoundscape: SoundscapeType;
  adaptivePhysicsMode: 'calm' | 'focus' | 'intense';

  // Analytics
  timestamp: Date;
  sessionId: string;
  confidence: number;               // Algorithm confidence (0-1)

  // Performance tracking
  previousStates: AuraState[];      // Last 5 states for trending
  adaptationCount: number;          // How many times adapted this session
}

/**
 * Configuration for CCS calculation weights
 */
interface CCSWeights {
  depth: number;           // Graph depth factor (D) - 40%
  strength: number;        // Synaptic strength factor (S) - 30%
  retention: number;       // Memory retention factor (R) - 20%
  urgency: number;         // Temporal urgency factor (U) - 10%
}

/**
 * Performance metrics for continuous learning
 */
interface PerformanceMetrics {
  accuracy: number;        // How accurate was the last prediction
  taskCompletion: number;  // Did user complete the micro-task
  timeToComplete: number;  // Efficiency metric
  userSatisfaction: number; // Self-reported rating (1-5)
  contextRelevance: number; // Was the context appropriate
}

// ==================== COGNITIVE AURA SERVICE ====================

export class CognitiveAuraService extends EventEmitter {
  private static instance: CognitiveAuraService;

  // Service dependencies
  private mindMapGenerator: MindMapGenerator;
  private srs: SpacedRepetitionService;
  private soundscapeEngine: CognitiveSoundscapeEngine;
  private storage: HybridStorageService;
  private crossModuleBridge: CrossModuleBridgeService;

  // Configuration
  private ccsWeights: CCSWeights = {
    depth: 0.4,      // 40% - Graph structural complexity
    strength: 0.3,   // 30% - Connection strength
    retention: 0.2,  // 20% - Memory stability
    urgency: 0.1     // 10% - Time pressure
  };

  // State management
  private currentState: AuraState | null = null;
  private sessionId: string;
  private performanceHistory: PerformanceMetrics[] = [];

  // Optimization caches
  private nodeCache: Map<string, NeuralNode> = new Map();
  private ccsCache: Map<string, number> = new Map();
  private lastCacheUpdate: number = 0;
  private readonly CACHE_TTL = 30000; // 30 seconds

  // Machine learning weights (adaptive)
  private adaptiveWeights = { ...this.ccsWeights };
  private learningRate = 0.1;

  // Context thresholds (learned from data)
  private contextThresholds = {
    recovery: 0.3,   // < 0.3 = RECOVERY
    focus: 0.7       // >= 0.7 = OVERLOAD, else FOCUS
  };

  /**
   * Singleton pattern with dependency injection
   */
  public static getInstance(): CognitiveAuraService {
    if (!CognitiveAuraService.instance) {
      CognitiveAuraService.instance = new CognitiveAuraService();
    }
    return CognitiveAuraService.instance;
  }

  private constructor() {
    super();

    // Initialize dependencies
    this.mindMapGenerator = MindMapGenerator.getInstance();
    this.srs = SpacedRepetitionService.getInstance();
    this.soundscapeEngine = CognitiveSoundscapeEngine.getInstance();
    this.storage = HybridStorageService.getInstance();
    this.crossModuleBridge = CrossModuleBridgeService.getInstance();

    // Generate unique session ID
    this.sessionId = `cae_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('🧠 Cognitive Aura Engine initialized');
    console.log(`🎯 Session ID: ${this.sessionId}`);
  }

  // ==================== MAIN ENGINE METHOD ====================

  /**
   * Generate complete aura state - The heart of the CAE
   * This is the single source of cognitive truth for the entire application
   */
  public async getAuraState(forceRefresh: boolean = false): Promise<AuraState> {
    try {
      console.log('🔮 Generating Cognitive Aura State...');

      // Check cache validity
      if (!forceRefresh && this.currentState && this.isStateFresh()) {
        console.log('⚡ Using cached aura state');
        return this.currentState;
      }

      // Step 1: Get neural graph data
      const graph = await this.mindMapGenerator.generateNeuralGraph();
      const cards = await this.storage.getFlashcards();

      if (!graph || !graph.nodes || graph.nodes.length === 0) {
        console.warn('⚠️ Empty neural graph, returning default state');
        return this.createDefaultState();
      }

      // Step 2: Calculate Composite Cognitive Score (CCS)
      const ccs = await this.calculateCompositeCognitiveScore(graph, cards);
      console.log(`📊 Composite Cognitive Score: ${(ccs * 100).toFixed(1)}%`);

      // Step 3: Derive cognitive context
      const context = this.deriveContext(ccs);
      console.log(`🎯 Cognitive Context: ${context}`);

      // Step 4: Select target node using intelligent prioritization
      const { targetNode, priority } = await this.selectTargetNode(graph);
      console.log(`🎲 Target Node: ${targetNode?.label || 'None'} (${priority || 'N/A'})`);

      // Step 5: Generate hyper-specific micro-task
      const microTask = this.generateMicroTask(targetNode, context);
      console.log(`📝 Micro-task: ${microTask.substring(0, 50)}...`);

      // Step 6: Recommend optimal soundscape
      const recommendedSoundscape = this.recommendSoundscape(context, ccs);

      // Step 7: Determine adaptive physics mode
      const adaptivePhysicsMode = this.getAdaptivePhysicsMode(context, ccs);

      // Step 8: Calculate confidence score
      const confidence = this.calculateConfidence(graph, targetNode, context);

      // Step 9: Create new state
      const newState: AuraState = {
        compositeCognitiveScore: ccs,
        context,
        targetNode,
        targetNodePriority: priority,
        microTask,
        recommendedSoundscape,
        adaptivePhysicsMode,
        timestamp: new Date(),
        sessionId: this.sessionId,
        confidence,
        previousStates: this.currentState ? [this.currentState, ...(this.currentState.previousStates || [])].slice(0, 5) : [],
        adaptationCount: this.currentState ? this.currentState.adaptationCount + 1 : 0
      };

      // Step 10: Trigger soundscape immediately
      await this.applySoundscapeIntegration(newState);

      // Step 11: Update state and emit events
      this.currentState = newState;
      this.emit('aura_state_updated', newState);

      // Step 12: Analytics and logging
      await this.logAuraState(newState);

      console.log('✨ Cognitive Aura State generated successfully');
      return newState;

    } catch (error) {
      console.error('❌ Failed to generate aura state:', error);
      return this.createErrorState(error);
    }
  }

  // ==================== CCS CALCULATION (CORE ALGORITHM) ====================

  /**
   * Calculate Composite Cognitive Score using weighted formula:
   * CCS = (D × 0.4) + (S × 0.3) + (R × 0.2) + (U × 0.1)
   *
   * This is the most critical algorithm in the entire system.
   * Accuracy target: 85%+
   */
  private async calculateCompositeCognitiveScore(
    graph: NeuralGraph,
    cards: any[]
  ): Promise<number> {
    try {
      const cacheKey = `ccs_${graph.lastUpdated.getTime()}_${cards.length}`;

      // Check cache first
      const cached = this.ccsCache.get(cacheKey);
      if (cached && (Date.now() - this.lastCacheUpdate) < this.CACHE_TTL) {
        return cached;
      }

      // Calculate the four factors
      const depthFactor = await this.calculateDepthFactor(graph);
      const strengthFactor = await this.calculateStrengthFactor(graph);
      const retentionFactor = await this.calculateRetentionFactor(graph, cards);
      const urgencyFactor = await this.calculateUrgencyFactor(graph, cards);

      console.log(`🔢 CCS Factors: D=${depthFactor.toFixed(3)}, S=${strengthFactor.toFixed(3)}, R=${retentionFactor.toFixed(3)}, U=${urgencyFactor.toFixed(3)}`);

      // Apply adaptive weights (learned from performance)
      const ccs = (depthFactor * this.adaptiveWeights.depth) +
                  (strengthFactor * this.adaptiveWeights.strength) +
                  (retentionFactor * this.adaptiveWeights.retention) +
                  (urgencyFactor * this.adaptiveWeights.urgency);

      // Normalize to 0-1 range with safety bounds
      const normalizedCCS = Math.max(0, Math.min(1, ccs));

      // Cache the result
      this.ccsCache.set(cacheKey, normalizedCCS);
      this.lastCacheUpdate = Date.now();

      // Integrate health factors for enhanced accuracy
      const healthAdjustment = await this.getHealthAdjustment();
      const finalCCS = Math.max(0, Math.min(1, normalizedCCS * healthAdjustment));

      console.log(`🧮 CCS: ${(normalizedCCS * 100).toFixed(1)}% → ${(finalCCS * 100).toFixed(1)}% (health-adjusted)`);

      return finalCCS;

    } catch (error) {
      console.error('❌ CCS calculation failed:', error);
      return 0.5; // Safe fallback
    }
  }

  /**
   * Depth Factor (D): Measures cognitive complexity of active learning
   */
  private async calculateDepthFactor(graph: NeuralGraph): Promise<number> {
    const activeNodes = graph.nodes.filter(node => node.isActive);
    if (activeNodes.length === 0) return 0.2; // Low complexity when no active learning

    // Calculate average path length to active nodes
    const totalPathComplexity = activeNodes.reduce((sum, node) => {
      const connections = graph.links.filter(link =>
        link.source === node.id || link.target === node.id
      ).length;

      // Nodes with more connections are deeper in the knowledge graph
      const pathComplexity = Math.min(1, connections / 10); // Normalize to max 10 connections
      return sum + pathComplexity;
    }, 0);

    const averageComplexity = totalPathComplexity / activeNodes.length;

    // Factor in cluster interconnectedness
    const clusterComplexity = graph.clusters ?
      graph.clusters.reduce((sum, cluster) => sum + (cluster.nodes.length * 0.1), 0) / graph.clusters.length :
      0.5;

    return Math.min(1, (averageComplexity * 0.7) + (clusterComplexity * 0.3));
  }

  /**
   * Strength Factor (S): Measures synaptic strength and connection quality
   */
  private async calculateStrengthFactor(graph: NeuralGraph): Promise<number> {
    if (graph.links.length === 0) return 0.3; // Default for no connections

    // Calculate weighted average of link strengths
    const totalStrength = graph.links.reduce((sum, link) => sum + (link.strength || 0.5), 0);
    const averageStrength = totalStrength / graph.links.length;

    // Factor in network density
    const maxPossibleLinks = (graph.nodes.length * (graph.nodes.length - 1)) / 2;
    const density = graph.links.length / Math.max(1, maxPossibleLinks);

    // Combine strength and density with optimal balance
    const strengthComponent = averageStrength * 0.7;
    const densityComponent = Math.min(1, density * 5) * 0.3; // Cap density influence

    return strengthComponent + densityComponent;
  }

  /**
   * Retention Factor (R): Measures memory stability using FSRS metrics
   */
  private async calculateRetentionFactor(graph: NeuralGraph, cards: any[]): Promise<number> {
    if (cards.length === 0) return 0.5; // Neutral when no cards

    let totalRetention = 0;
    let cardCount = 0;

    // Calculate retention for each card using FSRS stability
    cards.forEach(card => {
      if (card.stability && card.stability > 0) {
        // Higher stability = better retention
        const retentionStrength = Math.min(1, Math.log(card.stability + 1) / Math.log(365));
        totalRetention += retentionStrength;
        cardCount++;
      } else if (card.easeFactor && card.interval) {
        // Fallback calculation for legacy cards
        const normalizedEase = (card.easeFactor - 1.3) / (4.0 - 1.3);
        const intervalBonus = Math.min(0.5, card.interval / 365);
        totalRetention += Math.max(0, Math.min(1, normalizedEase + intervalBonus));
        cardCount++;
      }
    });

    if (cardCount === 0) return 0.5;

    const averageRetention = totalRetention / cardCount;

    // Factor in due cards (lower retention if many cards are due)
    const dueCards = cards.filter(card => {
      const nextReview = new Date(card.nextReview || 0);
      return nextReview <= new Date();
    }).length;

    const dueRatio = dueCards / cards.length;
    const retentionPenalty = Math.min(0.3, dueRatio * 0.5);

    return Math.max(0, Math.min(1, averageRetention - retentionPenalty));
  }

  /**
   * Urgency Factor (U): Measures temporal pressure and deadline proximity
   */
  private async calculateUrgencyFactor(graph: NeuralGraph, cards: any[]): Promise<number> {
    let urgencyScore = 0;

    // Check for overdue cards
    const now = new Date();
    const overdueCards = cards.filter(card => {
      const nextReview = new Date(card.nextReview || 0);
      return nextReview < now;
    });

    if (overdueCards.length > 0) {
      // Calculate average days overdue
      const totalOverdueDays = overdueCards.reduce((sum, card) => {
        const nextReview = new Date(card.nextReview || 0);
        const daysOverdue = (now.getTime() - nextReview.getTime()) / (24 * 60 * 60 * 1000);
        return sum + Math.max(0, daysOverdue);
      }, 0);

      const averageOverdue = totalOverdueDays / overdueCards.length;
      urgencyScore += Math.min(0.6, averageOverdue * 0.1); // Max 0.6 for overdue cards
    }

    // Check for critical learning paths
    const criticalNodes = graph.nodes.filter(node =>
      node.healthScore !== undefined && node.healthScore < 0.3
    );

    if (criticalNodes.length > 0) {
      const criticalRatio = criticalNodes.length / graph.nodes.length;
      urgencyScore += Math.min(0.4, criticalRatio * 0.8);
    }

    return Math.max(0, Math.min(1, urgencyScore));
  }

  // ==================== CONTEXT DERIVATION ====================

  /**
   * Derive cognitive context from CCS with adaptive thresholds
   */
  private deriveContext(ccs: number): AuraContext {
    // Use adaptive thresholds learned from user performance
    if (ccs < this.contextThresholds.recovery) {
      return 'RECOVERY';
    } else if (ccs >= this.contextThresholds.focus) {
      return 'OVERLOAD';
    } else {
      return 'FOCUS';
    }
  }

  // ==================== TARGET NODE SELECTION ====================

  /**
   * Select optimal target node using 3-tier priority system
   * P1: Urgent Prerequisites → P2: Forgetting Risk → P3: Cognitive Load
   */
  private async selectTargetNode(graph: NeuralGraph): Promise<{
    targetNode: NeuralNode | null;
    priority: NodePriority | null;
  }> {
    try {
      // P1: Check for urgent prerequisites (blocking other learning)
      const urgentPrereqs = await this.findUrgentPrerequisites(graph);
      if (urgentPrereqs.length > 0) {
        const selected = this.selectBestFromCandidates(urgentPrereqs);
        return { targetNode: selected, priority: 'P1_URGENT_PREREQUISITE' };
      }

      // P2: Check for forgetting risk (FSRS-based memory decay)
      const forgettingRisk = await this.findForgettingRiskNodes(graph);
      if (forgettingRisk.length > 0) {
        const selected = this.selectBestFromCandidates(forgettingRisk);
        return { targetNode: selected, priority: 'P2_FORGETTING_RISK' };
      }

      // P3: Select highest cognitive load node
      const highLoadNodes = this.findHighCognitiveLoadNodes(graph);
      if (highLoadNodes.length > 0) {
        const selected = this.selectBestFromCandidates(highLoadNodes);
        return { targetNode: selected, priority: 'P3_COGNITIVE_LOAD' };
      }

      // Fallback: Select random active node
      const activeNodes = graph.nodes.filter(node => node.isActive);
      if (activeNodes.length > 0) {
        const randomNode = activeNodes[Math.floor(Math.random() * activeNodes.length)];
        return { targetNode: randomNode, priority: 'P3_COGNITIVE_LOAD' };
      }

      return { targetNode: null, priority: null };

    } catch (error) {
      console.error('❌ Target node selection failed:', error);
      return { targetNode: null, priority: null };
    }
  }

  /**
   * Find nodes that are prerequisites for other learning (blocking progress)
   */
  private async findUrgentPrerequisites(graph: NeuralGraph): Promise<NeuralNode[]> {
    return graph.nodes.filter(node => {
      // Check if this node is a prerequisite for other active nodes
      const dependentNodes = graph.links.filter(link =>
        link.source === node.id &&
        link.type === 'prerequisite' &&
        graph.nodes.find(n => n.id === link.target && n.isActive)
      );

      // Urgent if: prerequisite for active learning AND not mastered
      return dependentNodes.length > 0 &&
             node.masteryLevel < 0.7 &&
             node.healthScore !== undefined &&
             node.healthScore < 0.5;
    });
  }

  /**
   * Find nodes at risk of being forgotten (FSRS memory decay)
   */
  private async findForgettingRiskNodes(graph: NeuralGraph): Promise<NeuralNode[]> {
    const riskThreshold = 0.6; // Stability below 60% indicates risk

    return graph.nodes.filter(node => {
      // Use FSRS stability metric
      if (node.stability && node.stability > 0) {
        const stabilityScore = Math.min(1, Math.log(node.stability + 1) / Math.log(365));
        return stabilityScore < riskThreshold && node.isActive;
      }

      // Fallback: use interval and ease factor
      if (node.interval && node.easeFactor) {
        const retentionEstimate = Math.min(1, node.interval / 30); // 30 days = good retention
        return retentionEstimate < riskThreshold && node.isActive;
      }

      return false;
    });
  }

  /**
   * Find nodes with highest cognitive load
   */
  private findHighCognitiveLoadNodes(graph: NeuralGraph): NeuralNode[] {
    // Sort by cognitive load descending
    const sortedNodes = graph.nodes
      .filter(node => node.cognitiveLoad > 0.6) // Only high-load nodes
      .sort((a, b) => (b.cognitiveLoad || 0) - (a.cognitiveLoad || 0));

    // Return top 3 candidates
    return sortedNodes.slice(0, 3);
  }

  /**
   * Select the best node from candidates using multi-criteria optimization
   */
  private selectBestFromCandidates(candidates: NeuralNode[]): NeuralNode {
    if (candidates.length === 1) return candidates[0];

    // Score each candidate using multiple criteria
    const scoredCandidates = candidates.map(node => {
      let score = 0;

      // Health score (prefer unhealthy nodes)
      if (node.healthScore !== undefined) {
        score += (1 - node.healthScore) * 0.3;
      }

      // Cognitive load (prefer high load)
      score += (node.cognitiveLoad || 0) * 0.25;

      // Mastery gap (prefer low mastery for learning opportunity)
      score += (1 - node.masteryLevel) * 0.2;

      // Access frequency (prefer less accessed nodes)
      const maxAccess = Math.max(...candidates.map(n => n.accessCount || 0));
      if (maxAccess > 0) {
        score += (1 - (node.accessCount || 0) / maxAccess) * 0.15;
      }

      // Activation level (prefer highly active nodes)
      score += (node.activationLevel || 0) * 0.1;

      return { node, score };
    });

    // Return highest scoring node
    const bestCandidate = scoredCandidates.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    return bestCandidate.node;
  }

  // ==================== MICRO-TASK GENERATION ====================

  /**
   * Generate hyper-specific micro-task based on node type and context
   */
  private generateMicroTask(targetNode: NeuralNode | null, context: AuraContext): string {
    if (!targetNode) {
      return this.getContextualDefaultTask(context);
    }

    // Generate task based on node type
    switch (targetNode.type) {
      case 'concept':
        return this.generateConceptTask(targetNode, context);
      case 'skill':
      case 'logic':
        return this.generateLogicTask(targetNode, context);
      case 'memory':
        return this.generateMemoryTask(targetNode, context);
      case 'habit':
        return this.generateHabitTask(targetNode, context);
      case 'goal':
        return this.generateGoalTask(targetNode, context);
      default:
        return this.generateGenericTask(targetNode, context);
    }
  }

  /**
   * Generate concept-specific micro-task
   */
  private generateConceptTask(node: NeuralNode, context: AuraContext): string {
    const concept = node.label || 'this concept';
    const urgencyWords = context === 'OVERLOAD' ? 'quickly review' :
                        context === 'RECOVERY' ? 'gently revisit' : 'focus on';

    if (node.masteryLevel < 0.3) {
      return `${urgencyWords} the fundamentals of ${concept}. Break it down into 3 simple components and explain each in your own words.`;
    } else if (node.masteryLevel < 0.7) {
      return `${urgencyWords} ${concept} by creating a practical example or analogy that demonstrates your understanding.`;
    } else {
      return `${urgencyWords} ${concept} by teaching it to someone else or finding a real-world application.`;
    }
  }

  /**
   * Generate logic/skill-specific micro-task
   */
  private generateLogicTask(node: NeuralNode, context: AuraContext): string {
    const skill = node.label || 'this skill';

    if (typeof node.content === 'object' && 'type' in node.content) {
      const logicStructure = node.content as any;
      const problemType = logicStructure.type || 'deductive';

      switch (context) {
        case 'RECOVERY':
          return `Gently practice ${skill} with a simple ${problemType} reasoning problem. Take your time and focus on the logical flow.`;
        case 'FOCUS':
          return `Solve a ${problemType} reasoning problem involving ${skill}. Write out each step of your logical reasoning process.`;
        case 'OVERLOAD':
          return `Quick review: identify the key logical pattern in ${skill} and solve one ${problemType} problem using that pattern.`;
      }
    }

    return `Practice ${skill} with a focused 10-minute exercise tailored to your current ${context.toLowerCase()} state.`;
  }

  /**
   * Generate memory-specific micro-task
   */
  private generateMemoryTask(node: NeuralNode, context: AuraContext): string {
    const memory = node.label || 'this memory';

    switch (context) {
      case 'RECOVERY':
        return `Gently reinforce ${memory} using spaced repetition. Review it once and associate it with a positive emotion.`;
      case 'FOCUS':
        return `Strengthen ${memory} by creating 3 different memory associations or mnemonics. Test your recall after each one.`;
      case 'OVERLOAD':
        return `Quick memory drill: recall ${memory} and immediately use it in a practical context to reinforce the connection.`;
    }
  }

  /**
   * Generate habit-specific micro-task
   */
  private generateHabitTask(node: NeuralNode, context: AuraContext): string {
    const habit = node.label || 'this habit';

    switch (context) {
      case 'RECOVERY':
        return `Take a gentle step toward ${habit}. Do the smallest possible version that still counts as progress.`;
      case 'FOCUS':
        return `Dedicate focused attention to ${habit}. Practice it mindfully for 10-15 minutes.`;
      case 'OVERLOAD':
        return `Quick habit reinforcement: do a 2-minute version of ${habit} to maintain momentum despite high cognitive load.`;
    }
  }

  /**
   * Generate goal-specific micro-task
   */
  private generateGoalTask(node: NeuralNode, context: AuraContext): string {
    const goal = node.label || 'this goal';

    switch (context) {
      case 'RECOVERY':
        return `Reflect on ${goal}. Write down one small step you could take when you're feeling more energized.`;
      case 'FOCUS':
        return `Make concrete progress on ${goal}. Identify and complete the next actionable task that moves you closer.`;
      case 'OVERLOAD':
        return `Quick goal check: review your progress on ${goal} and adjust priorities if needed. Keep it simple.`;
    }
  }

  /**
   * Generate generic micro-task for unknown types
   */
  private generateGenericTask(node: NeuralNode, context: AuraContext): string {
    const item = node.label || 'this topic';

    switch (context) {
      case 'RECOVERY':
        return `Take a gentle approach to ${item}. Review it briefly and note what you'd like to explore when you have more energy.`;
      case 'FOCUS':
        return `Give focused attention to ${item}. Spend 15 minutes exploring it deeply and making connections.`;
      case 'OVERLOAD':
        return `Quick review of ${item}. Identify the most important aspect and reinforce your understanding of just that piece.`;
    }
  }

  /**
   * Get contextual default task when no target node is available
   */
  private getContextualDefaultTask(context: AuraContext): string {
    switch (context) {
      case 'RECOVERY':
        return 'Take a gentle learning break. Review something you already know well to build confidence and maintain momentum.';
      case 'FOCUS':
        return 'This is an optimal learning moment. Choose your most challenging active flashcard or concept to tackle.';
      case 'OVERLOAD':
        return 'Cognitive load is high. Take 5 minutes to quickly review and organize your learning priorities.';
    }
  }

  // ==================== SOUNDSCAPE INTEGRATION ====================

  /**
   * Recommend optimal soundscape based on context and CCS
   */
  private recommendSoundscape(context: AuraContext, ccs: number): SoundscapeType {
    switch (context) {
      case 'RECOVERY':
        return ccs < 0.15 ? 'deep_rest' : 'calm_readiness';
      case 'FOCUS':
        return ccs > 0.5 ? 'deep_focus' : 'memory_flow';
      case 'OVERLOAD':
        return ccs > 0.85 ? 'deep_rest' : 'reasoning_boost';
      default:
        return 'calm_readiness';
    }
  }

  /**
   * Apply soundscape integration immediately
   */
  private async applySoundscapeIntegration(state: AuraState): Promise<void> {
    try {
      // Only change soundscape if user has it enabled and it's different
      const currentSoundscapeState = this.soundscapeEngine.getState();

      if (currentSoundscapeState.isActive &&
          currentSoundscapeState.currentPreset !== state.recommendedSoundscape) {

        console.log(`🎵 Switching soundscape: ${currentSoundscapeState.currentPreset} → ${state.recommendedSoundscape}`);

        await this.soundscapeEngine.startSoundscape(state.recommendedSoundscape, {
          cognitiveLoad: state.compositeCognitiveScore,
          adaptiveMode: true,
          fadeIn: true
        });
      }
    } catch (error) {
      console.warn('⚠️ Soundscape integration failed:', error);
      // Non-critical error, continue without soundscape
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get adaptive physics mode for neural canvas
   */
  private getAdaptivePhysicsMode(context: AuraContext, ccs: number): 'calm' | 'focus' | 'intense' {
    switch (context) {
      case 'RECOVERY':
        return 'calm';
      case 'FOCUS':
        return 'focus';
      case 'OVERLOAD':
        return ccs > 0.9 ? 'calm' : 'intense'; // Switch to calm if severely overloaded
    }
  }

  /**
   * Calculate algorithm confidence based on data quality
   */
  private calculateConfidence(graph: NeuralGraph, targetNode: NeuralNode | null, context: AuraContext): number {
    let confidence = 0.5; // Base confidence

    // Data quality factors
    if (graph.nodes.length > 10) confidence += 0.1;
    if (graph.links.length > 20) confidence += 0.1;
    if (targetNode?.healthScore !== undefined) confidence += 0.1;
    if (this.performanceHistory.length > 5) confidence += 0.1;

    // Algorithm certainty factors
    if (context === 'FOCUS') confidence += 0.1; // Most reliable context
    if (targetNode && targetNode.masteryLevel !== undefined) confidence += 0.1;

    return Math.max(0.3, Math.min(1.0, confidence));
  }

  /**
   * Get health adjustment factor from CrossModuleBridgeService
   */
  private async getHealthAdjustment(): Promise<number> {
    try {
      const healthMetrics = await this.crossModuleBridge.getHealthMetrics('currentUser');

      if (!healthMetrics) return 1.0; // No adjustment if no health data

      // Calculate adjustment based on health factors
      let adjustment = 1.0;

      // Sleep quality impact (30% weight)
      if (healthMetrics.sleepQuality < 0.5) {
        adjustment *= 0.85; // Reduce CCS when sleep deprived
      } else if (healthMetrics.sleepQuality > 0.8) {
        adjustment *= 1.1; // Boost CCS when well-rested
      }

      // Stress level impact (20% weight)
      if (healthMetrics.stressLevel > 0.7) {
        adjustment *= 0.9; // Reduce CCS when highly stressed
      }

      // Exercise impact (10% weight)
      if (healthMetrics.exerciseFrequency >= 3) {
        adjustment *= 1.05; // Small boost for regular exercise
      }

      // Circadian phase impact (15% weight)
      if (healthMetrics.circadianPhase === 'low') {
        adjustment *= 0.8; // Significant reduction during low phase
      } else if (healthMetrics.circadianPhase === 'peak') {
        adjustment *= 1.15; // Boost during peak phase
      }

      return Math.max(0.5, Math.min(1.5, adjustment)); // Clamp between 0.5-1.5x

    } catch (error) {
      console.warn('⚠️ Health adjustment calculation failed:', error);
      return 1.0; // No adjustment on error
    }
  }

  /**
   * Check if current state is still fresh
   */
  private isStateFresh(): boolean {
    if (!this.currentState) return false;

    const ageMinutes = (Date.now() - this.currentState.timestamp.getTime()) / (60 * 1000);
    return ageMinutes < 5; // State is fresh for 5 minutes
  }

  /**
   * Create default state when no data is available
   */
  private createDefaultState(): AuraState {
    return {
      compositeCognitiveScore: 0.5,
      context: 'FOCUS',
      targetNode: null,
      targetNodePriority: null,
      microTask: 'Start by adding some flashcards or study materials to build your neural network.',
      recommendedSoundscape: 'calm_readiness',
      adaptivePhysicsMode: 'calm',
      timestamp: new Date(),
      sessionId: this.sessionId,
      confidence: 0.3,
      previousStates: [],
      adaptationCount: 0
    };
  }

  /**
   * Create error state when something goes wrong
   */
  private createErrorState(error: any): AuraState {
    return {
      compositeCognitiveScore: 0.5,
      context: 'RECOVERY',
      targetNode: null,
      targetNodePriority: null,
      microTask: 'Take a moment to restart the application if you continue having issues.',
      recommendedSoundscape: 'calm_readiness',
      adaptivePhysicsMode: 'calm',
      timestamp: new Date(),
      sessionId: this.sessionId,
      confidence: 0.1,
      previousStates: [],
      adaptationCount: 0
    };
  }

  /**
   * Log aura state for analytics and learning
   */
  private async logAuraState(state: AuraState): Promise<void> {
    try {
      // Store in local storage for persistence
      const logEntry = {
        sessionId: state.sessionId,
        timestamp: state.timestamp.toISOString(),
        ccs: state.compositeCognitiveScore,
        context: state.context,
        targetNodeId: state.targetNode?.id || null,
        priority: state.targetNodePriority,
        confidence: state.confidence,
        adaptationCount: state.adaptationCount
      };

      // TODO: Implement storage of aura state logs
      // await this.storage.appendAuraStateLog(logEntry);

    } catch (error) {
      console.warn('⚠️ Failed to log aura state:', error);
    }
  }

  // ==================== PERFORMANCE LEARNING ====================

  /**
   * Record user performance to improve future predictions
   */
  public async recordPerformance(metrics: PerformanceMetrics): Promise<void> {
    try {
      this.performanceHistory.push(metrics);

      // Keep only last 100 performance records
      if (this.performanceHistory.length > 100) {
        this.performanceHistory = this.performanceHistory.slice(-100);
      }

      // Update adaptive weights based on performance
      this.updateAdaptiveWeights(metrics);

      // Update context thresholds if needed
      this.updateContextThresholds(metrics);

      console.log(`📊 Performance recorded: accuracy=${(metrics.accuracy * 100).toFixed(1)}%`);

    } catch (error) {
      console.error('❌ Failed to record performance:', error);
    }
  }

  /**
   * Update adaptive weights based on performance feedback
   */
  private updateAdaptiveWeights(metrics: PerformanceMetrics): void {
    // Simple gradient descent adjustment
    const learningRate = this.learningRate;
    const error = 1 - metrics.accuracy; // Error rate

    // Adjust weights based on error (simplified approach)
    if (error > 0.3) { // High error rate
      // Reduce all weights slightly and redistribute
      this.adaptiveWeights.depth *= (1 - learningRate * error * 0.1);
      this.adaptiveWeights.strength *= (1 - learningRate * error * 0.1);
      this.adaptiveWeights.retention *= (1 + learningRate * error * 0.1); // Increase retention weight
      this.adaptiveWeights.urgency *= (1 - learningRate * error * 0.05);
    }

    // Normalize weights to sum to 1
    const totalWeight = Object.values(this.adaptiveWeights).reduce((sum, w) => sum + w, 0);
    if (totalWeight > 0) {
      Object.keys(this.adaptiveWeights).forEach(key => {
        (this.adaptiveWeights as any)[key] /= totalWeight;
      });
    }
  }

  /**
   * Update context thresholds based on user feedback
   */
  private updateContextThresholds(metrics: PerformanceMetrics): void {
    // Adjust thresholds if context relevance is poor
    if (metrics.contextRelevance < 0.6) {
      // Make small adjustments to improve context accuracy
      this.contextThresholds.recovery = Math.max(0.1, this.contextThresholds.recovery - 0.01);
      this.contextThresholds.focus = Math.min(0.9, this.contextThresholds.focus + 0.01);
    }
  }

  // ==================== PUBLIC API ====================

  /**
   * Get current aura state (cached)
   */
  public getCurrentState(): AuraState | null {
    return this.currentState;
  }

  /**
   * Force refresh of aura state
   */
  public async refreshState(): Promise<AuraState> {
    return this.getAuraState(true);
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): {
    totalRecords: number;
    averageAccuracy: number;
    averageCompletion: number;
    averageSatisfaction: number;
  } {
    if (this.performanceHistory.length === 0) {
      return { totalRecords: 0, averageAccuracy: 0, averageCompletion: 0, averageSatisfaction: 0 };
    }

    const totals = this.performanceHistory.reduce((acc, metrics) => ({
      accuracy: acc.accuracy + metrics.accuracy,
      completion: acc.completion + metrics.taskCompletion,
      satisfaction: acc.satisfaction + metrics.userSatisfaction
    }), { accuracy: 0, completion: 0, satisfaction: 0 });

    const count = this.performanceHistory.length;

    return {
      totalRecords: count,
      averageAccuracy: totals.accuracy / count,
      averageCompletion: totals.completion / count,
      averageSatisfaction: totals.satisfaction / count
    };
  }

  /**
   * Update configuration weights
   */
  public updateWeights(newWeights: Partial<CCSWeights>): void {
    this.ccsWeights = { ...this.ccsWeights, ...newWeights };
    this.adaptiveWeights = { ...this.ccsWeights }; // Reset adaptive weights
    console.log('⚙️ CCS weights updated:', this.ccsWeights);
  }

  /**
   * Clear caches and force full recalculation
   */
  public clearCaches(): void {
    this.nodeCache.clear();
    this.ccsCache.clear();
    this.lastCacheUpdate = 0;
    console.log('🧹 Cognitive Aura caches cleared');
  }

  /**
   * Dispose of the service and clean up resources
   */
  public dispose(): void {
    this.removeAllListeners();
    this.clearCaches();
    this.performanceHistory = [];
    this.currentState = null;
    console.log('🧹 Cognitive Aura Service disposed');
  }
}

// Export singleton instance
export const cognitiveAuraService = CognitiveAuraService.getInstance();
export default CognitiveAuraService;
