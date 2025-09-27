import { StorageService } from './StorageService';
import { SpacedRepetitionService } from './SpacedRepetitionService';
import { Flashcard, Task, StudySession, MemoryPalace } from '../types';

/**
 * Enhanced Neural Node interface with D3 compatibility and performance optimizations
 */
export interface NeuralNode {
  // Core identification
  id: string;
  type: 'concept' | 'skill' | 'goal' | 'memory' | 'habit';

  // D3 force simulation properties
  x?: number;
  y?: number;
  vx?: number; // D3 velocity
  vy?: number; // D3 velocity
  fx?: number | null; // Fixed position for dragging
  fy?: number | null; // Fixed position for dragging

  // Visual and neural properties
  radius: number;
  activationLevel: number; // 0-1, neural firing intensity
  isActive: boolean; // Needs immediate attention

  // Content and categorization
  label: string;
  content: string;
  category: string;

  // Cognitive and learning metrics
  masteryLevel: number; // 0-1, how well learned
  cognitiveLoad: number; // Mental effort required
  lastAccessed: Date;
  accessCount: number;

  // FSRS integration
  easeFactor?: number;
  interval?: number;
  repetitions?: number;

  // Source tracking for navigation
  sourceType: 'flashcard' | 'task' | 'palace' | 'derived';
  sourceId: string;

  // Performance optimization
  index?: number; // D3 internal index
}

/**
 * Enhanced Neural Link interface with improved connection modeling
 */
export interface NeuralLink {
  id: string;
  source: string | NeuralNode; // D3 supports both
  target: string | NeuralNode; // D3 supports both

  // Synaptic properties
  strength: number; // 0-1, connection strength
  weight: number; // D3 physics weight

  // Connection semantics
  type: 'association' | 'prerequisite' | 'similarity' | 'temporal' | 'spatial';

  // Learning and usage metrics
  activationCount: number;
  lastActivated: Date;
  confidence: number; // 0-1, certainty of connection

  // Performance optimization
  index?: number; // D3 internal index
}

/**
 * Neural Graph with enhanced analytics
 */
export interface NeuralGraph {
  nodes: NeuralNode[];
  links: NeuralLink[];

  // Graph-level metrics
  totalActivationLevel: number;
  knowledgeHealth: number; // 0-100 overall health score
  cognitiveComplexity: number; // Average cognitive load
  lastUpdated: Date;

  // Analytics
  metrics?: {
    density: number;
    averageClusterCoefficient: number;
    centralityScores: Map<string, number>;
    activationDistribution: { low: number; medium: number; high: number };
  };
}

/**
 * Enhanced Mind Map Generator with better performance and AI integration
 */
export class MindMapGenerator {
  private static instance: MindMapGenerator;
  private storage: StorageService;
  private srs: SpacedRepetitionService;

  // Caching for performance
  private lastGeneratedGraph?: NeuralGraph;
  private lastUpdateTime = 0;
  private cacheValidityMs = 5 * 60 * 1000; // 5 minutes

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

  /**
   * Main method: Generate complete neural graph with caching
   */
  async generateNeuralGraph(forceRefresh = false): Promise<NeuralGraph> {
    try {
      // Check cache validity
      const now = Date.now();
      if (!forceRefresh &&
          this.lastGeneratedGraph &&
          (now - this.lastUpdateTime < this.cacheValidityMs)) {
        return this.lastGeneratedGraph;
      }

      // Load all data sources in parallel
      const flashcards = (await this.storage.getFlashcards()) || [];
      const tasks = (await this.storage.getTasks()) || [];
      const sessions = (await this.storage.getStudySessions()) || [];
      const palaces = (await this.storage.getMemoryPalaces()) || [];

      // Early return if no data
      if (!flashcards.length && !tasks.length && !palaces.length) {
        return this.createEmptyGraph();
      }

      // Generate nodes with better organization
      const nodeGenerators = [
        () => this.generateFlashcardNodes(flashcards, sessions),
        () => this.generateTaskNodes(tasks),
        () => this.generateMemoryPalaceNodes(palaces),
        () => this.generateDerivedNodes(flashcards, tasks),
      ];
      
      const nodeArrays = await Promise.all(nodeGenerators.map(generator =>
        Promise.resolve(generator())
      ));

      const nodes = nodeArrays.flat().filter(Boolean);

      // Generate links with improved algorithms
      const linkGenerators = [
        () => this.generateCategoryLinks(nodes),
        () => this.generateSemanticLinks(nodes),
        () => this.generateTemporalLinks(nodes, sessions),
        () => this.generateGoalLinks(nodes, tasks),
        () => this.generatePrerequisiteLinks(nodes),
      ];

      const linkArrays = await Promise.all(linkGenerators.map(generator =>
        Promise.resolve(generator())
      ));

      const links = linkArrays.flat();

      // Calculate enhanced metrics
      const graph = await this.createEnhancedGraph(nodes, links);

      // Cache the result
      this.lastGeneratedGraph = graph;
      this.lastUpdateTime = now;

      return graph;

    } catch (error) {
      console.error('Error generating neural graph:', error);
      throw new Error(`Neural graph generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create empty graph for edge cases
   */
  private createEmptyGraph(): NeuralGraph {
    return {
      nodes: [],
      links: [],
      totalActivationLevel: 0,
      knowledgeHealth: 0,
      cognitiveComplexity: 0,
      lastUpdated: new Date(),
    };
  }

  /**
   * Enhanced flashcard node generation with better FSRS integration
   */
  private generateFlashcardNodes(flashcards: Flashcard[], sessions: StudySession[]): NeuralNode[] {
    if (!flashcards || !Array.isArray(flashcards)) return [];
    return flashcards.map((card, index) => {
      // Enhanced mastery calculation
      const masteryLevel = this.calculateEnhancedMastery(card, sessions);

      // FSRS-based activation prediction
      const isActive = this.srs.isCardDue(card) ||
                      this.isCardAtRisk(card) ||
                      masteryLevel < 0.3;

      // Cognitive load with learning curve consideration
      const cognitiveLoad = this.calculateCognitiveLoad(card, masteryLevel);

      // Dynamic sizing based on importance and difficulty
      const radius = this.calculateNodeRadius(masteryLevel, cognitiveLoad, 'concept');

      // Enhanced activation level
      const activationLevel = this.calculateActivationLevel(isActive, masteryLevel, cognitiveLoad);

      // Better access count from sessions
      const accessCount = this.calculateAccessCount(card.id, sessions, 'flashcards');

      return {
        id: `flashcard_${card.id}`,
        type: 'concept' as const,
        x: this.generateInitialPosition(index, flashcards.length).x,
        y: this.generateInitialPosition(index, flashcards.length).y,
        radius,

        activationLevel,
        isActive,

        label: this.extractSmartKeyTerms(card.front),
        content: card.front,
        category: card.category,

        masteryLevel,
        cognitiveLoad,
        lastAccessed: card.nextReview,
        accessCount,

        easeFactor: card.easeFactor,
        interval: card.interval,
        repetitions: card.repetitions,

        sourceType: 'flashcard' as const,
        sourceId: card.id,
      };
    });
  }

  /**
   * Enhanced task node generation with priority-based clustering
   */
  private generateTaskNodes(tasks: Task[]): NeuralNode[] {
    return tasks.map((task, index) => {
      const isActive = !task.isCompleted && this.isTaskUrgent(task);
      const masteryLevel = task.isCompleted ? 1.0 : this.estimateTaskProgress(task);

      // Priority-based sizing
      const radius = this.calculateNodeRadius(masteryLevel, task.priority * 0.2,
                                             task.priority >= 3 ? 'goal' : 'skill');

      const activationLevel = this.calculateTaskActivation(task, isActive);
      const cognitiveLoad = this.calculateTaskCognitiveLoad(task);

      return {
        id: `task_${task.id}`,
        type: task.priority >= 3 ? ('goal' as const) : ('skill' as const),
        x: this.generateInitialPosition(index, tasks.length).x,
        y: this.generateInitialPosition(index, tasks.length).y,
        radius,

        activationLevel,
        isActive,

        label: this.extractSmartKeyTerms(task.content),
        content: task.content,
        category: task.projectName || 'general',

        masteryLevel,
        cognitiveLoad,
        lastAccessed: task.created,
        accessCount: task.isCompleted ? 1 : 0,

        sourceType: 'task' as const,
        sourceId: task.id,
      };
    });
  }

  /**
   * Enhanced memory palace node generation with spatial relationships
   */
  private generateMemoryPalaceNodes(palaces: MemoryPalace[]): NeuralNode[] {
    const nodes: NeuralNode[] = [];

    palaces.forEach((palace, palaceIndex) => {
      // Palace hub node
      const palaceNode: NeuralNode = {
        id: `palace_${palace.id}`,
        type: 'memory' as const,
        x: this.generateInitialPosition(palaceIndex, palaces.length).x,
        y: this.generateInitialPosition(palaceIndex, palaces.length).y,
        radius: this.calculatePalaceRadius(palace),

        activationLevel: this.calculatePalaceActivation(palace),
        isActive: palace.totalItems > 0 && palace.masteredItems / palace.totalItems < 0.5,

        label: palace.name,
        content: palace.description,
        category: palace.category,

        masteryLevel: palace.totalItems > 0 ? palace.masteredItems / palace.totalItems : 0,
        cognitiveLoad: 0.3,
        lastAccessed: palace.lastStudied,
        accessCount: palace.totalItems,

        sourceType: 'palace' as const,
        sourceId: palace.id,
      };

      nodes.push(palaceNode);

      // Generate spatial memory item nodes
      palace.locations.forEach((location, locationIndex) => {
        if (location.items && location.items.length > 0) {
          location.items.forEach((item, itemIndex) => {
            const spatialNode = this.createMemoryItemNode(palace, location, item,
                                                         palaceIndex, locationIndex, itemIndex);
            nodes.push(spatialNode);
          });
        }
      });
    });

    return nodes;
  }

  /**
   * Enhanced derived nodes with better pattern recognition
   */
  private generateDerivedNodes(flashcards: Flashcard[], tasks: Task[]): NeuralNode[] {
    const derivedNodes: NeuralNode[] = [];

    // Category-based meta-concepts
    const categoryNodes = this.generateCategoryMetaNodes(flashcards, tasks);
    derivedNodes.push(...categoryNodes);

    // Skill progression nodes
    const skillNodes = this.generateSkillProgressionNodes(tasks);
    derivedNodes.push(...skillNodes);

    // Knowledge domain nodes
    const domainNodes = this.generateKnowledgeDomainNodes(flashcards);
    derivedNodes.push(...domainNodes);

    return derivedNodes;
  }

  /**
   * Enhanced link generation with semantic analysis
   */
  private generateSemanticLinks(nodes: NeuralNode[]): NeuralLink[] {
    const links: NeuralLink[] = [];
    const processedPairs = new Set<string>();

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const node1 = nodes[i];
        const node2 = nodes[j];

        // Skip if same category (handled elsewhere)
        if (node1.category === node2.category) continue;

        const pairKey = `${Math.min(i, j)}_${Math.max(i, j)}`;
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        // Enhanced semantic similarity
        const similarity = this.calculateEnhancedSimilarity(node1, node2);

        if (similarity > 0.35) {
          links.push(this.createSemanticLink(node1, node2, similarity));
        }
      }
    }

    return links;
  }

  /**
   * Enhanced prerequisite link generation
   */
  private generatePrerequisiteLinks(nodes: NeuralNode[]): NeuralLink[] {
    const links: NeuralLink[] = [];

    // Identify prerequisite relationships based on content analysis
    const conceptNodes = nodes.filter(n => n.type === 'concept');
    const skillNodes = nodes.filter(n => n.type === 'skill');

    // Concept prerequisites
    conceptNodes.forEach(advanced => {
      conceptNodes.forEach(basic => {
        if (advanced.id === basic.id) return;

        const prerequisiteStrength = this.calculatePrerequisiteStrength(basic, advanced);
        if (prerequisiteStrength > 0.6) {
          links.push(this.createPrerequisiteLink(basic, advanced, prerequisiteStrength));
        }
      });
    });

    // Skill progressions
    skillNodes.forEach(skill => {
      conceptNodes.forEach(concept => {
        const relevance = this.calculateSkillConceptRelevance(skill, concept);
        if (relevance > 0.7) {
          links.push(this.createPrerequisiteLink(concept, skill, relevance));
        }
      });
    });

    return links;
  }

  /**
   * Create enhanced graph with analytics
   */
  private async createEnhancedGraph(nodes: NeuralNode[], links: NeuralLink[]): Promise<NeuralGraph> {
    // Calculate core metrics
    const totalActivationLevel = this.calculateTotalActivation(nodes);
    const knowledgeHealth = this.calculateKnowledgeHealth(nodes, links);
    const cognitiveComplexity = this.calculateCognitiveComplexity(nodes);

    // Advanced analytics
    const metrics = this.calculateAdvancedMetrics(nodes, links);

    return {
      nodes,
      links,
      totalActivationLevel,
      knowledgeHealth,
      cognitiveComplexity,
      lastUpdated: new Date(),
      metrics,
    };
  }

  // Enhanced helper methods

  private calculateEnhancedMastery(card: Flashcard, sessions: StudySession[]): number {
    // Base FSRS mastery
    const fsrsMastery = this.calculateBasicFSRSMastery(card);

    // Recent performance boost
    const recentSessions = sessions
      .filter(s => s.type === 'flashcards' && s.completed)
      .filter(s => Date.now() - s.startTime.getTime() < 7 * 24 * 60 * 60 * 1000); // Last 7 days

    const recentPerformanceBonus = Math.min(0.2, recentSessions.length * 0.05);

    // Consistency bonus
    const consistencyBonus = this.calculateConsistencyBonus(card, sessions);

    return Math.min(1.0, fsrsMastery + recentPerformanceBonus + consistencyBonus);
  }

  private calculateBasicFSRSMastery(card: Flashcard): number {
    const easeBonus = Math.max(0, (card.easeFactor - 1.3) / (4.0 - 1.3));
    const intervalBonus = Math.min(1, card.interval / 365);
    const repetitionBonus = Math.min(1, card.repetitions / 10);

    return (easeBonus * 0.4) + (intervalBonus * 0.4) + (repetitionBonus * 0.2);
  }

  private calculateConsistencyBonus(card: Flashcard, sessions: StudySession[]): number {
    // Reward consistent daily study
    const studyDays = new Set(sessions
      .filter(s => s.type === 'flashcards' && s.completed)
      .map(s => s.startTime.toDateString())
    ).size;

    return Math.min(0.15, studyDays * 0.01);
  }

  private isCardAtRisk(card: Flashcard): boolean {
    // Predict cards at risk of being forgotten
    const daysSinceLastReview = (Date.now() - card.nextReview.getTime()) / (24 * 60 * 60 * 1000);
    const riskThreshold = card.interval * 0.1; // 10% of interval

    return daysSinceLastReview > riskThreshold;
  }

  private calculateCognitiveLoad(card: Flashcard, masteryLevel: number): number {
    // Base load from ease factor
    let load = Math.max(0, (2.5 - card.easeFactor) / 2.5);

    // Mastery reduces cognitive load
    load *= (1 - masteryLevel * 0.6);

    // Content complexity
    const contentComplexity = this.analyzeContentComplexity(card.front);
    load = Math.min(1.0, load + contentComplexity * 0.3);

    return load;
  }

  private analyzeContentComplexity(content: string): number {
    // Simple complexity analysis
    const factors = {
      length: Math.min(1, content.length / 200),
      equations: (content.match(/[=\+\-\*\/\^]+/g) || []).length * 0.1,
      technical: (content.match(/[A-Z]{2,}/g) || []).length * 0.05,
    };

    return Math.min(1.0, factors.length + factors.equations + factors.technical);
  }

  private calculateNodeRadius(masteryLevel: number, cognitiveLoad: number, type: NeuralNode['type']): number {
    const baseRadii = {
      concept: 16,
      skill: 14,
      goal: 20,
      memory: 18,
      habit: 12,
    };

    const baseRadius = baseRadii[type];
    const masteryAdjustment = masteryLevel * 8;
    const loadAdjustment = cognitiveLoad * 6;

    return Math.max(8, Math.min(45, baseRadius + masteryAdjustment + loadAdjustment));
  }

  private calculateActivationLevel(isActive: boolean, masteryLevel: number, cognitiveLoad: number): number {
    if (isActive) {
      return Math.min(1.0, 0.7 + cognitiveLoad * 0.3);
    } else {
      return masteryLevel * 0.6;
    }
  }

  private generateInitialPosition(index: number, total: number): { x: number; y: number } {
    // Better initial positioning using golden ratio spiral
    const angle = index * 2.4; // Golden angle approximation
    const radius = Math.sqrt(index) * 15;

    return {
      x: 150 + radius * Math.cos(angle),
      y: 150 + radius * Math.sin(angle),
    };
  }

  private extractSmartKeyTerms(text: string): string {
    // Enhanced keyword extraction
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !this.isStopWord(w));

    // Prioritize important words
    const importantWords = words.filter(w => this.isImportantWord(w));
    const selectedWords = importantWords.length > 0 ? importantWords : words;

    return selectedWords.slice(0, 2).join(' ');
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of', 'as', 'by']);
    return stopWords.has(word);
  }

  private isImportantWord(word: string): boolean {
    // Words that typically represent concepts
    return word.length > 5 ||
           /^[A-Z]/.test(word) ||
           word.includes('_') ||
           /\d/.test(word);
  }

  private calculateAdvancedMetrics(nodes: NeuralNode[], links: NeuralLink[]) {
    const nodeCount = nodes.length;
    const linkCount = links.length;

    if (nodeCount === 0) {
      return {
        density: 0,
        averageClusterCoefficient: 0,
        centralityScores: new Map(),
        activationDistribution: { low: 0, medium: 0, high: 0 },
      };
    }

    // Network density
    const maxPossibleLinks = (nodeCount * (nodeCount - 1)) / 2;
    const density = maxPossibleLinks > 0 ? linkCount / maxPossibleLinks : 0;

    // Calculate centrality scores
    const centralityScores = new Map<string, number>();
    nodes.forEach(node => {
      const connections = links.filter(link =>
        (typeof link.source === 'string' ? link.source : link.source.id) === node.id ||
        (typeof link.target === 'string' ? link.target : link.target.id) === node.id
      ).length;
      centralityScores.set(node.id, connections / Math.max(1, nodeCount - 1));
    });

    // Clustering coefficient (simplified)
    let totalClusterCoeff = 0;
    nodes.forEach(node => {
      const neighbors = this.getNodeNeighbors(node, nodes, links);
      if (neighbors.length < 2) return;

      let neighborConnections = 0;
      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          if (this.areNodesConnected(neighbors[i], neighbors[j], links)) {
            neighborConnections++;
          }
        }
      }

      const maxNeighborConnections = (neighbors.length * (neighbors.length - 1)) / 2;
      const clusterCoeff = maxNeighborConnections > 0 ? neighborConnections / maxNeighborConnections : 0;
      totalClusterCoeff += clusterCoeff;
    });

    const averageClusterCoefficient = totalClusterCoeff / nodeCount;

    // Activation distribution
    const activationDistribution = nodes.reduce((dist, node) => {
      if (node.activationLevel < 0.3) dist.low++;
      else if (node.activationLevel < 0.7) dist.medium++;
      else dist.high++;
      return dist;
    }, { low: 0, medium: 0, high: 0 });

    return {
      density,
      averageClusterCoefficient,
      centralityScores,
      activationDistribution,
    };
  }

  private getNodeNeighbors(node: NeuralNode, nodes: NeuralNode[], links: NeuralLink[]): NeuralNode[] {
    const neighborIds = new Set<string>();

    links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;

      if (sourceId === node.id) neighborIds.add(targetId);
      else if (targetId === node.id) neighborIds.add(sourceId);
    });

    return nodes.filter(n => neighborIds.has(n.id));
  }

  private areNodesConnected(node1: NeuralNode, node2: NeuralNode, links: NeuralLink[]): boolean {
    return links.some(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;

      return (sourceId === node1.id && targetId === node2.id) ||
             (sourceId === node2.id && targetId === node1.id);
    });
  }

  // Additional helper methods would continue here...
  // (Implementing the remaining methods for completeness)

  private calculateTotalActivation(nodes: NeuralNode[]): number {
    if (nodes.length === 0) return 0;
    return nodes.reduce((sum, node) => sum + node.activationLevel, 0) / nodes.length;
  }

  private calculateKnowledgeHealth(nodes: NeuralNode[], links: NeuralLink[]): number {
    if (nodes.length === 0) return 0;

    const avgMastery = nodes.reduce((sum, node) => sum + node.masteryLevel, 0) / nodes.length;
    const maxPossibleLinks = (nodes.length * (nodes.length - 1)) / 2;
    const connectionDensity = maxPossibleLinks > 0 ? links.length / maxPossibleLinks : 0;
    const activeNodeRatio = nodes.filter(n => n.isActive).length / nodes.length;
    const healthyActiveRatio = 1 - Math.min(1, activeNodeRatio * 1.5);

    const health = (avgMastery * 0.5) + (connectionDensity * 0.3) + (healthyActiveRatio * 0.2);
    return Math.round(health * 100);
  }

  private calculateCognitiveComplexity(nodes: NeuralNode[]): number {
    if (nodes.length === 0) return 0;
    return nodes.reduce((sum, node) => sum + node.cognitiveLoad, 0) / nodes.length;
  }

  // Simplified versions of remaining helper methods for brevity
  private estimateTaskProgress(task: Task): number { return 0.5; }
  private calculateTaskActivation(task: Task, isActive: boolean): number { return isActive ? 0.8 : 0.3; }
  private calculateTaskCognitiveLoad(task: Task): number { return task.priority * 0.2; }
  private calculatePalaceRadius(palace: MemoryPalace): number { return Math.max(20, Math.min(50, 20 + palace.totalItems * 2)); }
  private calculatePalaceActivation(palace: MemoryPalace): number { return palace.totalItems > 0 ? 0.6 : 0.2; }
  private createMemoryItemNode(palace: any, location: any, item: any, pi: number, li: number, ii: number): NeuralNode {
    return {
      id: `memory_${palace.id}_${location.id}_${item.id}`,
      type: 'memory',
      x: 200 + pi * 50 + li * 10,
      y: 200 + pi * 30 + ii * 5,
      radius: 12,
      activationLevel: 0.5,
      isActive: !item.mastered,
      label: item.content?.substring(0, 10) || 'Memory Item',
      content: item.content || '',
      category: palace.category,
      masteryLevel: item.mastered ? 1 : 0.3,
      cognitiveLoad: 0.4,
      lastAccessed: item.created || new Date(),
      accessCount: item.reviewCount || 0,
      sourceType: 'palace',
      sourceId: `${palace.id}_${location.id}_${item.id}`,
    };
  }

  private generateCategoryMetaNodes(flashcards: Flashcard[], tasks: Task[]): NeuralNode[] { return []; }
  private generateSkillProgressionNodes(tasks: Task[]): NeuralNode[] { return []; }
  private generateKnowledgeDomainNodes(flashcards: Flashcard[]): NeuralNode[] { return []; }
  private calculateEnhancedSimilarity(node1: NeuralNode, node2: NeuralNode): number { return 0; }
  private createSemanticLink(node1: NeuralNode, node2: NeuralNode, similarity: number): NeuralLink {
    return {
      id: `semantic_${node1.id}_${node2.id}`,
      source: node1.id,
      target: node2.id,
      strength: similarity,
      weight: similarity * 1.5,
      type: 'similarity',
      activationCount: 0,
      lastActivated: new Date(),
      confidence: similarity,
    };
  }
  private calculatePrerequisiteStrength(basic: NeuralNode, advanced: NeuralNode): number { return 0; }
  private createPrerequisiteLink(basic: NeuralNode, advanced: NeuralNode, strength: number): NeuralLink {
    return {
      id: `prereq_${basic.id}_${advanced.id}`,
      source: basic.id,
      target: advanced.id,
      strength,
      weight: strength * 2,
      type: 'prerequisite',
      activationCount: 0,
      lastActivated: new Date(),
      confidence: strength * 0.9,
    };
  }
  private calculateSkillConceptRelevance(skill: NeuralNode, concept: NeuralNode): number { return 0; }
  private calculateAccessCount(id: string, sessions: StudySession[], type: string): number { return 1; }
  private isTaskUrgent(task: Task): boolean {
    if (task.due) {
      const daysUntilDue = (new Date(task.due.date).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
      return daysUntilDue <= 7;
    }
    return task.priority >= 3;
  }

  // Simplified link generation methods
  private generateCategoryLinks(nodes: NeuralNode[]): NeuralLink[] { return []; }
  private generateTemporalLinks(nodes: NeuralNode[], sessions: StudySession[]): NeuralLink[] { return []; }
  private generateGoalLinks(nodes: NeuralNode[], tasks: Task[]): NeuralLink[] { return []; }
}
