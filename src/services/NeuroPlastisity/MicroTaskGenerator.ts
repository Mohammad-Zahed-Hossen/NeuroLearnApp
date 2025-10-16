/**
 * MicroTaskGenerator - AI-Powered Neuroplasticity Task Engine
 *
 * Generates intelligent micro-tasks designed to strengthen specific synaptic connections
 * using principles from cognitive science and neuroplasticity research.
 *
 * Features:
 * - Adaptive task difficulty based on connection strength
 * - Multiple task types: recall, connect, synthesize, apply, create
 * - Spaced repetition integration for optimal timing
 * - Cognitive load balancing for effective learning
 * - Progressive hint system for scaffolded learning
 */

import { NeuralNode } from '../../services/learning/MindMapGeneratorService';
import { SynapseEdge, MicroTask } from '../../screens/NeuroPlastisity/SynapseBuilderScreen';

export class MicroTaskGenerator {

  /**
   * Generate a micro-task for strengthening a specific synapse
   */
  async generateMicroTask(
    synapse: SynapseEdge,
    sourceNode: NeuralNode,
    targetNode: NeuralNode
  ): Promise<MicroTask> {
    try {
      // Determine optimal task type based on connection strength and type
      const taskType = this.determineOptimalTaskType(synapse, sourceNode, targetNode);

      // Generate task content based on type and nodes
      const taskContent = await this.generateTaskContent(taskType, synapse, sourceNode, targetNode);

      // Calculate task properties
      const difficulty = this.calculateTaskDifficulty(synapse, sourceNode, targetNode);
      const estimatedTime = this.estimateTaskTime(taskType, difficulty, synapse.cognitiveLoad);
      const plasticityBenefit = this.calculatePlasticityBenefit(taskType, synapse);
      const cognitiveSkills = this.identifyCognitiveSkills(taskType, sourceNode, targetNode);

      const microTask: MicroTask = {
        id: `task_${synapse.id}_${Date.now()}`,
        edgeId: synapse.id,
        taskType,
        sourceNodeContent: this.extractRelevantContent(sourceNode),
        targetNodeContent: this.extractRelevantContent(targetNode),
        prompt: taskContent.prompt,
        expectedResponse: taskContent.expectedResponse,
        difficulty,
        estimatedTimeMinutes: estimatedTime,
        cognitiveSkills,
        plasticityBenefit,
        adaptiveHints: await this.generateAdaptiveHints(taskType, sourceNode, targetNode),
        successCriteria: this.generateSuccessCriteria(taskType, synapse),
      };

      return microTask;
    } catch (error) {
      console.error('Error generating micro-task:', error);
      throw error;
    }
  }

  /**
   * Determine optimal task type based on synapse properties
   */
  private determineOptimalTaskType(
    synapse: SynapseEdge,
    sourceNode: NeuralNode,
    targetNode: NeuralNode
  ): MicroTask['taskType'] {

    // Very weak connections: Start with recall
    if (synapse.strength < 0.2) {
      return 'recall';
    }

    // Weak connections: Focus on connecting concepts
    if (synapse.strength < 0.4) {
      return 'connect';
    }

    // Moderate connections: Encourage synthesis
    if (synapse.strength < 0.6) {
      return 'synthesize';
    }

    // Strong connections: Apply knowledge
    if (synapse.strength < 0.8) {
      return 'apply';
    }

    // Very strong connections: Create new knowledge
    return 'create';
  }

  /**
   * Generate task content based on type and nodes
   */
  private async generateTaskContent(
    taskType: MicroTask['taskType'],
    synapse: SynapseEdge,
    sourceNode: NeuralNode,
    targetNode: NeuralNode
  ): Promise<{ prompt: string; expectedResponse: string }> {

    const sourceLabel = sourceNode.label || 'Source concept';
    const targetLabel = targetNode.label || 'Target concept';
    const sourceContent = this.extractRelevantContent(sourceNode);
    const targetContent = this.extractRelevantContent(targetNode);

    switch (taskType) {
      case 'recall':
        return this.generateRecallTask(sourceLabel, targetLabel, sourceContent, targetContent, synapse);

      case 'connect':
        return this.generateConnectionTask(sourceLabel, targetLabel, sourceContent, targetContent, synapse);

      case 'synthesize':
        return this.generateSynthesisTask(sourceLabel, targetLabel, sourceContent, targetContent, synapse);

      case 'apply':
        return this.generateApplicationTask(sourceLabel, targetLabel, sourceContent, targetContent, synapse);

      case 'create':
        return this.generateCreationTask(sourceLabel, targetLabel, sourceContent, targetContent, synapse);

      default:
        return this.generateConnectionTask(sourceLabel, targetLabel, sourceContent, targetContent, synapse);
    }
  }

  /**
   * Generate recall task - basic retrieval practice
   */
  private generateRecallTask(
    sourceLabel: string,
    targetLabel: string,
    sourceContent: any,
    targetContent: any,
    synapse: SynapseEdge
  ): { prompt: string; expectedResponse: string } {

    const recallTemplates: {
      prompt: string;
      expectedResponse: string;
    }[] = [
      {
        prompt: `When you think about "${sourceLabel}", what key concept or idea comes to mind that relates to "${targetLabel}"?`,
        expectedResponse: `Connection between ${sourceLabel} and ${targetLabel}, focusing on shared concepts or relationships`,
      },
      {
        prompt: `Recall what you know about "${sourceLabel}". How does this knowledge connect to "${targetLabel}"?`,
        expectedResponse: `Explanation of how ${sourceLabel} relates to or influences ${targetLabel}`,
      },
      {
        prompt: `What is the main relationship between "${sourceLabel}" and "${targetLabel}"?`,
        expectedResponse: `Clear description of the connection type and nature of relationship`,
      },
    ];

  const template = recallTemplates[Math.floor(Math.random() * recallTemplates.length)];
  const safeTemplate = template ?? recallTemplates[0]!;

    return {
      prompt: safeTemplate.prompt,
      expectedResponse: safeTemplate.expectedResponse,
    };
  }

  /**
   * Generate connection task - linking concepts explicitly
   */
  private generateConnectionTask(
    sourceLabel: string,
    targetLabel: string,
    sourceContent: any,
    targetContent: any,
    synapse: SynapseEdge
  ): { prompt: string; expectedResponse: string } {

    const connectionTemplates: {
      prompt: string;
      expectedResponse: string;
    }[] = [
      {
        prompt: `Explain how "${sourceLabel}" and "${targetLabel}" are connected. What bridges these two concepts?`,
        expectedResponse: `Detailed explanation of the connecting principles, shared elements, or logical relationships`,
      },
      {
        prompt: `Create a logical chain that connects "${sourceLabel}" to "${targetLabel}". What intermediate steps or concepts link them?`,
        expectedResponse: `Step-by-step logical progression from source to target concept`,
      },
      {
        prompt: `If you had to teach someone how "${sourceLabel}" relates to "${targetLabel}", what examples would you use?`,
        expectedResponse: `Concrete examples and analogies that illustrate the connection`,
      },
    ];

    // Choose template based on connection type
    let templateIndex = 0;
    switch (synapse.connectionType) {
      case 'prerequisite':
        templateIndex = 1; // Focus on logical progression
        break;
      case 'similarity':
        templateIndex = 0; // Focus on shared elements
        break;
      case 'logical':
        templateIndex = 1; // Focus on logical chains
        break;
      default:
        templateIndex = 2; // Use examples
    }

  const template = connectionTemplates[templateIndex];
  const safeTemplate = template ?? connectionTemplates[0]!;

    return {
      prompt: safeTemplate.prompt,
      expectedResponse: safeTemplate.expectedResponse,
    };
  }

  /**
   * Generate synthesis task - combining concepts creatively
   */
  private generateSynthesisTask(
    sourceLabel: string,
    targetLabel: string,
    sourceContent: any,
    targetContent: any,
    synapse: SynapseEdge
  ): { prompt: string; expectedResponse: string } {

    const synthesisTemplates: {
      prompt: string;
      expectedResponse: string;
    }[] = [
      {
        prompt: `Combine the principles of "${sourceLabel}" with "${targetLabel}" to create a new insight or understanding. What emerges from this combination?`,
        expectedResponse: `Novel insight that synthesizes both concepts into something new`,
      },
      {
        prompt: `How might "${sourceLabel}" enhance or modify your understanding of "${targetLabel}"? What new perspective does this create?`,
        expectedResponse: `Enhanced understanding showing how the combination creates new knowledge`,
      },
      {
        prompt: `Imagine you're solving a complex problem that requires both "${sourceLabel}" and "${targetLabel}". How would you integrate these concepts?`,
        expectedResponse: `Integrated solution showing synthesis of both concepts in problem-solving context`,
      },
    ];

  const template = synthesisTemplates[Math.floor(Math.random() * synthesisTemplates.length)];
  const safeTemplate = template ?? synthesisTemplates[0]!;

    return {
      prompt: safeTemplate.prompt,
      expectedResponse: safeTemplate.expectedResponse,
    };
  }

  /**
   * Generate application task - using knowledge practically
   */
  private generateApplicationTask(
    sourceLabel: string,
    targetLabel: string,
    sourceContent: any,
    targetContent: any,
    synapse: SynapseEdge
  ): { prompt: string; expectedResponse: string } {

    const applicationTemplates: {
      prompt: string;
      expectedResponse: string;
    }[] = [
      {
        prompt: `Design a real-world scenario where you would use both "${sourceLabel}" and "${targetLabel}". How would you apply this knowledge?`,
        expectedResponse: `Practical scenario with step-by-step application of both concepts`,
      },
      {
        prompt: `You're consulting on a project that involves "${sourceLabel}". How would your knowledge of "${targetLabel}" influence your recommendations?`,
        expectedResponse: `Professional application showing how both concepts inform decision-making`,
      },
      {
        prompt: `Create a mini-lesson plan that teaches others how "${sourceLabel}" connects to "${targetLabel}" through practical examples.`,
        expectedResponse: `Educational application with concrete examples and teaching strategies`,
      },
    ];

  const template = applicationTemplates[Math.floor(Math.random() * applicationTemplates.length)];
  const safeTemplate = template ?? applicationTemplates[0]!;

    return {
      prompt: safeTemplate.prompt,
      expectedResponse: safeTemplate.expectedResponse,
    };
  }

  /**
   * Generate creation task - producing new knowledge
   */
  private generateCreationTask(
    sourceLabel: string,
    targetLabel: string,
    sourceContent: any,
    targetContent: any,
    synapse: SynapseEdge
  ): { prompt: string; expectedResponse: string } {

    const creationTemplates: {
      prompt: string;
      expectedResponse: string;
    }[] = [
      {
        prompt: `Invent a new concept or method that builds upon both "${sourceLabel}" and "${targetLabel}". What would you call it and how would it work?`,
        expectedResponse: `Original creation that meaningfully combines both concepts with clear explanation`,
      },
      {
        prompt: `Write a short story or scenario where "${sourceLabel}" and "${targetLabel}" interact in an unexpected way. What new possibilities emerge?`,
        expectedResponse: `Creative narrative that explores novel interactions between the concepts`,
      },
      {
        prompt: `Design an improvement to existing knowledge by combining "${sourceLabel}" with "${targetLabel}". What enhancement could you create?`,
        expectedResponse: `Innovative enhancement showing creative synthesis and improvement`,
      },
    ];

  const template = creationTemplates[Math.floor(Math.random() * creationTemplates.length)];
  const safeTemplate = template ?? creationTemplates[0]!;

    return {
      prompt: safeTemplate.prompt,
      expectedResponse: safeTemplate.expectedResponse,
    };
  }

  /**
   * Calculate task difficulty based on multiple factors
   */
  private calculateTaskDifficulty(
    synapse: SynapseEdge,
    sourceNode: NeuralNode,
    targetNode: NeuralNode
  ): 'beginner' | 'intermediate' | 'advanced' {

    // Factors that increase difficulty:
    // - Low synapse strength (harder to make connections)
    // - High cognitive load
    // - Cross-domain connections
    // - Low node mastery levels

    const strengthPenalty = 1 - synapse.strength; // 0-1, higher = more difficult
    const cognitiveLoadPenalty = synapse.cognitiveLoad; // 0-1, higher = more difficult
    const categoryPenalty = sourceNode.category !== targetNode.category ? 0.3 : 0;
    const masteryPenalty = (2 - sourceNode.masteryLevel - targetNode.masteryLevel) / 2;

    const totalDifficulty = strengthPenalty + cognitiveLoadPenalty + categoryPenalty + masteryPenalty;

    if (totalDifficulty > 1.5) return 'advanced';
    if (totalDifficulty > 0.8) return 'intermediate';
    return 'beginner';
  }

  /**
   * Estimate task completion time
   */
  private estimateTaskTime(
    taskType: MicroTask['taskType'],
    difficulty: 'beginner' | 'intermediate' | 'advanced',
    cognitiveLoad: number
  ): number {

    // Base times by task type (in minutes)
    const baseTimes = {
      recall: 2,
      connect: 3,
      synthesize: 5,
      apply: 7,
      create: 10,
    };

    // Difficulty multipliers
    const difficultyMultipliers = {
      beginner: 1.0,
      intermediate: 1.5,
      advanced: 2.0,
    };

    const baseTime = baseTimes[taskType];
    const difficultyMultiplier = difficultyMultipliers[difficulty];
    const cognitiveLoadMultiplier = 1 + (cognitiveLoad * 0.5); // Up to 50% increase

    const estimatedTime = baseTime * difficultyMultiplier * cognitiveLoadMultiplier;

    return Math.max(1, Math.round(estimatedTime));
  }

  /**
   * Calculate plasticity benefit of completing this task
   */
  private calculatePlasticityBenefit(taskType: MicroTask['taskType'], synapse: SynapseEdge): number {

    // Base benefits by task type
    const baseBenefits = {
      recall: 0.1,      // Basic retrieval strengthening
      connect: 0.15,    // Connection strengthening
      synthesize: 0.2,  // Higher-order thinking benefits
      apply: 0.25,      // Application strengthens retention
      create: 0.3,      // Creation provides maximum benefit
    };

    const baseBenefit = baseBenefits[taskType];

    // Higher benefit for weaker connections (more room for improvement)
    const weaknessBonusMultiplier = 2 - synapse.strength;

    // Higher benefit for high plasticity connections
    const plasticityMultiplier = 0.5 + (synapse.plasticityScore * 0.5);

    const totalBenefit = baseBenefit * weaknessBonusMultiplier * plasticityMultiplier;

    return Math.max(0.05, Math.min(0.5, totalBenefit));
  }

  /**
   * Identify cognitive skills being exercised
   */
  private identifyCognitiveSkills(
    taskType: MicroTask['taskType'],
    sourceNode: NeuralNode,
    targetNode: NeuralNode
  ): string[] {

    const skills: string[] = [];

    // Task-type specific skills
    switch (taskType) {
      case 'recall':
        skills.push('memory retrieval', 'pattern recognition');
        break;
      case 'connect':
        skills.push('relational thinking', 'analogical reasoning');
        break;
      case 'synthesize':
        skills.push('synthesis', 'creative thinking', 'conceptual integration');
        break;
      case 'apply':
        skills.push('application', 'problem-solving', 'transfer');
        break;
      case 'create':
        skills.push('creativity', 'innovation', 'divergent thinking');
        break;
    }

    // Node-type specific skills
    if (sourceNode.type === 'logic' || targetNode.type === 'logic') {
      skills.push('logical reasoning', 'deductive thinking');
    }

    if (sourceNode.category?.includes('math') || targetNode.category?.includes('math')) {
      skills.push('mathematical thinking', 'quantitative reasoning');
    }

    if (sourceNode.category?.includes('language') || targetNode.category?.includes('language')) {
      skills.push('linguistic processing', 'verbal reasoning');
    }

    return skills;
  }

  /**
   * Generate adaptive hints for scaffolded learning
   */
  private async generateAdaptiveHints(
    taskType: MicroTask['taskType'],
    sourceNode: NeuralNode,
    targetNode: NeuralNode
  ): Promise<string[]> {

    const hints: string[] = [];

    // Progressive hint levels
    hints.push(`Think about what "${sourceNode.label}" and "${targetNode.label}" have in common.`);

    hints.push(`Consider how "${sourceNode.label}" might influence or relate to "${targetNode.label}".`);

    if (sourceNode.category && targetNode.category) {
      if (sourceNode.category === targetNode.category) {
        hints.push(`Both concepts belong to the ${sourceNode.category} domain - how might they interact within this field?`);
      } else {
        hints.push(`These concepts bridge ${sourceNode.category} and ${targetNode.category} - what connects these domains?`);
      }
    }

    // Task-specific hints
    switch (taskType) {
      case 'connect':
        hints.push(`Try thinking of a specific example where both concepts would be relevant.`);
        break;
      case 'synthesize':
        hints.push(`What new insight emerges when you combine these ideas?`);
        break;
      case 'apply':
        hints.push(`Imagine a real situation where you'd need to use both concepts together.`);
        break;
      case 'create':
        hints.push(`What completely new idea could you build from these foundations?`);
        break;
    }

    return hints;
  }

  /**
   * Generate success criteria for task evaluation
   */
  private generateSuccessCriteria(taskType: MicroTask['taskType'], synapse: SynapseEdge): string[] {

    const criteria: string[] = [];

    // Universal criteria
    criteria.push('Response demonstrates understanding of both concepts');
    criteria.push('Connection between concepts is clearly articulated');

    // Task-specific criteria
    switch (taskType) {
      case 'recall':
        criteria.push('Key elements of both concepts are accurately recalled');
        criteria.push('Basic relationship is identified');
        break;

      case 'connect':
        criteria.push('Logical connection is established between concepts');
        criteria.push('Explanation includes specific details or examples');
        break;

      case 'synthesize':
        criteria.push('New insight or understanding is generated');
        criteria.push('Synthesis goes beyond simple combination');
        break;

      case 'apply':
        criteria.push('Practical application is realistic and detailed');
        criteria.push('Both concepts are meaningfully integrated in application');
        break;

      case 'create':
        criteria.push('Original idea demonstrates creative integration');
        criteria.push('Creation is feasible and well-explained');
        break;
    }

    // Connection-type specific criteria
    switch (synapse.connectionType) {
      case 'prerequisite':
        criteria.push('Prerequisite relationship is acknowledged');
        break;
      case 'logical':
        criteria.push('Logical reasoning chain is sound');
        break;
      case 'similarity':
        criteria.push('Similar features or patterns are identified');
        break;
    }

    return criteria;
  }

  /**
   * Extract relevant content from a node for task generation
   */
  private extractRelevantContent(node: NeuralNode): any {
    return {
      label: node.label,
      type: node.type,
      category: node.category,
      content: typeof node.content === 'string' ? node.content : JSON.stringify(node.content),
      masteryLevel: node.masteryLevel,
      cognitiveLoad: node.cognitiveLoad,
    };
  }
}

export default MicroTaskGenerator;
