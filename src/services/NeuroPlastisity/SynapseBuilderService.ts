/**
 * SynapseBuilderService - Core Neuroplasticity Analysis Engine
 * 
 * Analyzes neural connections and calculates synaptic strength using
 * neuroscience-based algorithms and FSRS integration for optimal learning.
 * 
 * Features:
 * - Synaptic strength calculation based on usage patterns
 * - Forgetting curve analysis for urgency detection
 * - Neuroplasticity scoring with retention rate prediction
 * - Connection type classification (prerequisite, association, etc.)
 * - Spaced repetition optimization for synapse strengthening
 */

import { NeuralNode, NeuralLink } from '../../services/learning/MindMapGeneratorService';
import HybridStorageService from '../../services/storage/HybridStorageService';
import { SynapseEdge, NeuroplasticitySession } from '../../screens/NeuroPlastisity/SynapseBuilderScreen';

export class SynapseBuilderService {
  private storage: HybridStorageService;
  
  constructor() {
    this.storage = HybridStorageService.getInstance();
  }

  /**
   * Analyze synaptic connections from neural links
   * Creates enhanced synapse edges with neuroplasticity metrics
   */
  async analyzeSynapticConnections(links: NeuralLink[], nodes: NeuralNode[]): Promise<SynapseEdge[]> {
    try {
      const synapseEdges: SynapseEdge[] = [];
      
      for (const link of links) {
        const sourceNode = nodes.find(n => n.id === link.source);
        const targetNode = nodes.find(n => n.id === link.target);
        
        if (!sourceNode || !targetNode) continue;

        // Calculate comprehensive synapse metrics
        const strength = this.calculateSynapticStrength(link, sourceNode, targetNode);
        const retentionRate = this.calculateRetentionRate(link, sourceNode, targetNode);
        const plasticityScore = this.calculatePlasticityScore(link, sourceNode, targetNode);
        const urgencyLevel = this.determineUrgencyLevel(strength, retentionRate, link);
        const connectionType = this.classifyConnectionType(link, sourceNode, targetNode);
        const cognitiveLoad = this.calculateCognitiveLoad(sourceNode, targetNode);

        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;

        const synapseEdge: SynapseEdge = {
          id: `synapse_${sourceId}_${targetId}`,
          sourceNodeId: sourceId,
          targetNodeId: targetId,
          strength,
          lastPracticeDate: link.lastActivated || new Date(),
          practiceCount: link.activationCount || 0,
          retentionRate,
          plasticityScore,
          urgencyLevel,
          connectionType,
          microTasksGenerated: 0,
          strengthHistory: this.initializeStrengthHistory(strength),
          neuralPathways: this.identifyNeuralPathways(sourceNode, targetNode),
          cognitiveLoad,
          lastReviewResult: null,
        };

        synapseEdges.push(synapseEdge);
      }

      // Sort by urgency and strength (weakest first)
      synapseEdges.sort((a, b) => {
        const urgencyWeight = { critical: 3, moderate: 2, stable: 1 };
        const urgencyDiff = urgencyWeight[b.urgencyLevel] - urgencyWeight[a.urgencyLevel];
        
        if (urgencyDiff !== 0) return urgencyDiff; // Prioritize by urgency
        return a.strength - b.strength; // Then by weakness
      });

      return synapseEdges;
    } catch (error) {
      console.error('Error analyzing synaptic connections:', error);
      return [];
    }
  }

  /**
   * Calculate synaptic strength using multiple factors
   * Based on usage frequency, recency, FSRS metrics, and node mastery
   */
  private calculateSynapticStrength(link: NeuralLink, sourceNode: NeuralNode, targetNode: NeuralNode): number {
    try {
      // Base strength from link weight and confidence
      const baseStrength = Math.min(link.strength * (link.confidence || 0.5), 1.0);
      
      // Usage frequency factor (0-0.3)
      const activationCount = link.activationCount || 0;
      const frequencyFactor = Math.min(activationCount / 20, 0.3); // Cap at 20 activations
      
      // Recency factor (0-0.25)
      const lastActivated = link.lastActivated ? new Date(link.lastActivated) : new Date(0);
      const daysSinceActivation = (Date.now() - lastActivated.getTime()) / (1000 * 60 * 60 * 24);
      const recencyFactor = Math.max(0, 0.25 - (daysSinceActivation / 30) * 0.25); // Decay over 30 days
      
      // Node mastery factor (0-0.25)
      const avgMastery = (sourceNode.masteryLevel + targetNode.masteryLevel) / 2;
      const masteryFactor = avgMastery * 0.25;
      
      // FSRS integration factor (0-0.2)
      const fsrsFactor = this.calculateFSRSContribution(sourceNode, targetNode);
      
      // Combine factors with weights
      const totalStrength = baseStrength + frequencyFactor + recencyFactor + masteryFactor + fsrsFactor;
      
      return Math.max(0, Math.min(1, totalStrength));
    } catch (error) {
      console.error('Error calculating synaptic strength:', error);
      return 0.5; // Default neutral strength
    }
  }

  /**
   * Calculate retention rate based on forgetting curve and practice history
   */
  private calculateRetentionRate(link: NeuralLink, sourceNode: NeuralNode, targetNode: NeuralNode): number {
    try {
      // Base retention from node FSRS data
      const sourceRetention = this.calculateNodeRetention(sourceNode);
      const targetRetention = this.calculateNodeRetention(targetNode);
      const avgNodeRetention = (sourceRetention + targetRetention) / 2;
      
      // Link-specific retention factors
      const activationBonus = Math.min((link.activationCount || 0) / 10, 0.3);
      const confidenceBonus = (link.confidence || 0.5) * 0.2;
      
      // Time decay factor
      const lastActivated = link.lastActivated ? new Date(link.lastActivated) : new Date(0);
      const daysSinceActivation = (Date.now() - lastActivated.getTime()) / (1000 * 60 * 60 * 24);
      const decayFactor = Math.exp(-daysSinceActivation / 14); // 14-day half-life
      
      const retentionRate = (avgNodeRetention + activationBonus + confidenceBonus) * decayFactor;
      
      return Math.max(0.1, Math.min(1, retentionRate));
    } catch (error) {
      console.error('Error calculating retention rate:', error);
      return 0.6; // Default moderate retention
    }
  }

  /**
   * Calculate neuroplasticity score - how adaptable this connection is
   */
  private calculatePlasticityScore(link: NeuralLink, sourceNode: NeuralNode, targetNode: NeuralNode): number {
    try {
      // Higher plasticity for:
      // 1. Recent connections (more adaptable)
      // 2. Lower mastery levels (more room for growth)
      // 3. Active nodes (currently being learned)
      
      const lastActivated = link.lastActivated ? new Date(link.lastActivated) : new Date(0);
      const daysSinceActivation = (Date.now() - lastActivated.getTime()) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0.2, 1 - (daysSinceActivation / 60)); // 60-day window
      
      const avgMastery = (sourceNode.masteryLevel + targetNode.masteryLevel) / 2;
      const growthPotential = 1 - avgMastery; // More room for growth = higher plasticity
      
      const activityScore = (sourceNode.isActive || targetNode.isActive) ? 0.3 : 0.1;
      
      const plasticityScore = (recencyScore * 0.4) + (growthPotential * 0.4) + (activityScore * 0.2);
      
      return Math.max(0.1, Math.min(1, plasticityScore));
    } catch (error) {
      console.error('Error calculating plasticity score:', error);
      return 0.5;
    }
  }

  /**
   * Determine urgency level based on forgetting risk
   */
  private determineUrgencyLevel(strength: number, retentionRate: number, link: NeuralLink): 'critical' | 'moderate' | 'stable' {
    // Critical: Low strength + Low retention + Recent due date
    if (strength < 0.3 && retentionRate < 0.4) {
      return 'critical';
    }
    
    // Moderate: Medium risk factors
    if (strength < 0.6 && retentionRate < 0.7) {
      return 'moderate';
    }
    
    // Check for overdue connections
    const lastActivated = link.lastActivated ? new Date(link.lastActivated) : new Date(0);
    const daysSinceActivation = (Date.now() - lastActivated.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceActivation > 21) { // 3 weeks without activation
      return strength < 0.5 ? 'critical' : 'moderate';
    }
    
    return 'stable';
  }

  /**
   * Classify connection type based on content and relationship
   */
  private classifyConnectionType(link: NeuralLink, sourceNode: NeuralNode, targetNode: NeuralNode): SynapseEdge['connectionType'] {
    // Use existing link type if available
    if (link.type) {
      switch (link.type) {
        case 'prerequisite': return 'prerequisite';
        case 'temporal': return 'temporal';
        case 'logical': return 'logical';
        case 'similarity': return 'similarity';
        default: return 'association';
      }
    }

    // Classify based on node types and content
    if (sourceNode.type === 'concept' && targetNode.type === 'skill') {
      return 'prerequisite';
    }
    
    if (sourceNode.category === targetNode.category) {
      return 'similarity';
    }
    
    if (sourceNode.type === 'logic' || targetNode.type === 'logic') {
      return 'logical';
    }
    
    return 'association';
  }

  /**
   * Calculate cognitive load for this connection
   */
  private calculateCognitiveLoad(sourceNode: NeuralNode, targetNode: NeuralNode): number {
    const avgCognitiveLoad = (sourceNode.cognitiveLoad + targetNode.cognitiveLoad) / 2;
    const complexityBonus = this.calculateConnectionComplexity(sourceNode, targetNode);
    
    return Math.min(1, avgCognitiveLoad + complexityBonus);
  }

  /**
   * Calculate connection complexity based on node properties
   */
  private calculateConnectionComplexity(sourceNode: NeuralNode, targetNode: NeuralNode): number {
    // Higher complexity for:
    // - Different categories (cross-domain connections)
    // - Different types (e.g., concept to skill)
    // - Low mastery levels (harder to connect)
    
    const categoryDifference = sourceNode.category !== targetNode.category ? 0.2 : 0;
    const typeDifference = sourceNode.type !== targetNode.type ? 0.15 : 0;
    const masteryPenalty = (2 - sourceNode.masteryLevel - targetNode.masteryLevel) * 0.1;
    
    return Math.max(0, Math.min(0.5, categoryDifference + typeDifference + masteryPenalty));
  }

  /**
   * Calculate FSRS contribution to synapse strength
   */
  private calculateFSRSContribution(sourceNode: NeuralNode, targetNode: NeuralNode): number {
    const sourceStability = sourceNode.stability || 1;
    const targetStability = targetNode.stability || 1;
    const avgStability = (sourceStability + targetStability) / 2;
    
    // Convert stability to contribution (0-0.2)
    return Math.min(0.2, Math.log(avgStability + 1) / 10);
  }

  /**
   * Calculate node retention based on FSRS data
   */
  private calculateNodeRetention(node: NeuralNode): number {
    if (node.stability && node.difficulty) {
      // FSRS retention calculation
      const retention = Math.exp(-node.difficulty / node.stability);
      return Math.max(0.1, Math.min(1, retention));
    }
    
    // Fallback calculation
    const easeBonus = (node.easeFactor - 2.5) / 2; // Normalize ease factor
    const repetitionBonus = Math.min(node.repetitions / 10, 0.3);
    
    return Math.max(0.3, Math.min(1, 0.6 + easeBonus + repetitionBonus));
  }

  /**
   * Initialize strength history for tracking
   */
  private initializeStrengthHistory(currentStrength: number): Array<{ date: Date; strength: number }> {
    return [
      {
        date: new Date(),
        strength: currentStrength,
      },
    ];
  }

  /**
   * Identify neural pathways this connection participates in
   */
  private identifyNeuralPathways(sourceNode: NeuralNode, targetNode: NeuralNode): string[] {
    const pathways: string[] = [];
    
    // Add category-based pathways
    if (sourceNode.category) {
      pathways.push(`${sourceNode.category}_pathway`);
    }
    
    if (targetNode.category && targetNode.category !== sourceNode.category) {
      pathways.push(`${targetNode.category}_pathway`);
      pathways.push(`${sourceNode.category}_to_${targetNode.category}`);
    }
    
    // Add type-based pathways
    pathways.push(`${sourceNode.type}_to_${targetNode.type}`);
    
    return pathways;
  }

  /**
   * Update synapse strength after practice using three-tier storage
   */
  async updateSynapseStrength(
    synapseId: string,
    strengthDelta: number,
    reviewResult: 'success' | 'partial' | 'failed'
  ): Promise<SynapseEdge> {
    try {
      // Load existing synapse data using three-tier read strategy
      const existingSnapshots = await this.storage.getContextSnapshots();
      const synapseSnapshot = existingSnapshots.find(s => s.contextHash === synapseId);

      if (!synapseSnapshot) {
        throw new Error(`Synapse with id ${synapseId} not found in storage`);
      }

      const storedEdge = synapseSnapshot.payload as SynapseEdge;
      const baseStrength = storedEdge.strength;

      // Apply strength delta with diminishing returns
      const newStrength = Math.max(0, Math.min(1, baseStrength + (strengthDelta * this.getDiminishingReturnsMultiplier(baseStrength))));

      // Update retention rate based on result
      let retentionBonus = 0;
      switch (reviewResult) {
        case 'success':
          retentionBonus = 0.1;
          break;
        case 'partial':
          retentionBonus = 0.05;
          break;
        case 'failed':
          retentionBonus = -0.1;
          break;
      }

      const updatedPracticeCount = (storedEdge.practiceCount || 0) + 1;

      const updatedEdge: SynapseEdge = {
        ...storedEdge,
        strength: newStrength,
        lastPracticeDate: new Date(),
        practiceCount: updatedPracticeCount,
        retentionRate: Math.max(0.1, Math.min(1, storedEdge.retentionRate + retentionBonus)),
        urgencyLevel: newStrength < 0.3 ? 'critical' : newStrength < 0.6 ? 'moderate' : 'stable',
        microTasksGenerated: (storedEdge.microTasksGenerated || 0) + 1,
        strengthHistory: [
          ...storedEdge.strengthHistory,
          { date: new Date(), strength: newStrength }
        ],
        lastReviewResult: reviewResult,
      };

      // Save updated synapse data using three-tier write strategy
      const contextSnapshot = {
        contextHash: synapseId,
        version: (synapseSnapshot.version || 1) + 1,
        userId: synapseSnapshot.userId || null,
        timestamp: Date.now(),
        sessionId: `neuroplasticity_${Date.now()}`,
        payload: updatedEdge,
      };

      await this.storage.saveContextSnapshot(contextSnapshot);

      return updatedEdge;
    } catch (error) {
      console.error('Error updating synapse strength:', error);
      throw error;
    }
  }

  /**
   * Get diminishing returns multiplier for strength updates
   */
  private getDiminishingReturnsMultiplier(currentStrength: number): number {
    // Stronger connections are harder to strengthen further (neuroplasticity principle)
    if (currentStrength < 0.3) return 1.0;      // Easy gains for weak connections
    if (currentStrength < 0.6) return 0.8;      // Moderate gains
    if (currentStrength < 0.8) return 0.6;      // Harder gains
    return 0.4;                                 // Very hard gains for strong connections
  }

  /**
   * Get weakest synapses for priority training
   */
  async getWeakestSynapses(synapses: SynapseEdge[], limit: number = 10): Promise<SynapseEdge[]> {
    return synapses
      .filter(synapse => synapse.strength < 0.6) // Only consider weak connections
      .sort((a, b) => {
        // Primary sort: urgency level
        const urgencyWeight = { critical: 3, moderate: 2, stable: 1 };
        const urgencyDiff = urgencyWeight[a.urgencyLevel] - urgencyWeight[b.urgencyLevel];
        if (urgencyDiff !== 0) return -urgencyDiff; // Critical first
        
        // Secondary sort: strength (weakest first)
        return a.strength - b.strength;
      })
      .slice(0, limit);
  }

  /**
   * Calculate optimal practice schedule for synapses
   */
  calculateOptimalPracticeSchedule(synapses: SynapseEdge[]): Array<{ synapseId: string; recommendedDate: Date; priority: number }> {
    const schedule: Array<{ synapseId: string; recommendedDate: Date; priority: number }> = [];
    
    for (const synapse of synapses) {
      const daysSinceLastPractice = (Date.now() - synapse.lastPracticeDate.getTime()) / (1000 * 60 * 60 * 24);
      const priority = this.calculatePracticePriority(synapse, daysSinceLastPractice);
      
      // Calculate next practice date based on current strength and retention
      const intervalDays = this.calculateOptimalInterval(synapse);
      const recommendedDate = new Date(Date.now() + (intervalDays * 24 * 60 * 60 * 1000));
      
      schedule.push({
        synapseId: synapse.id,
        recommendedDate,
        priority,
      });
    }
    
    // Sort by priority (highest first)
    return schedule.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Calculate practice priority for a synapse
   */
  private calculatePracticePriority(synapse: SynapseEdge, daysSinceLastPractice: number): number {
    const urgencyWeight = { critical: 1.0, moderate: 0.7, stable: 0.4 };
    const strengthPenalty = 1 - synapse.strength; // Weaker = higher priority
    const timePressure = Math.min(daysSinceLastPractice / 21, 1); // Max urgency at 3 weeks
    const plasticityBonus = synapse.plasticityScore * 0.3;
    
    return urgencyWeight[synapse.urgencyLevel] + strengthPenalty + timePressure + plasticityBonus;
  }

  /**
   * Calculate optimal interval for next practice
   */
  private calculateOptimalInterval(synapse: SynapseEdge): number {
    // Base interval from strength (stronger = longer interval)
    const baseInterval = Math.max(1, synapse.strength * 14); // 1-14 days based on strength
    
    // Adjust based on retention rate
    const retentionMultiplier = Math.max(0.5, synapse.retentionRate);
    
    // Adjust based on cognitive load (harder concepts need more frequent practice)
    const cognitiveLoadPenalty = 1 - (synapse.cognitiveLoad * 0.3);
    
    const optimalInterval = baseInterval * retentionMultiplier * cognitiveLoadPenalty;
    
    return Math.max(1, Math.round(optimalInterval));
  }
}

export default SynapseBuilderService;