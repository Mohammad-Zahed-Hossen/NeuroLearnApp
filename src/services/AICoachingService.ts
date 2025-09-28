/**
 * Phase 4, Step 4: AI Coaching Layer Service
 *
 * This service provides intelligent feedback on logic exercises
 * and English grammar correction for the Logic Trainer
 *
 * NOTE: This is the placeholder implementation with local evaluation.
 * Replace with actual AI service calls (Google AI Studio/Gemini) when ready.
 */

export interface GrammarCorrection {
  original: string;
  corrected: string;
  explanation: string;
  type: 'grammar' | 'syntax' | 'clarity' | 'structure';
  severity: 'minor' | 'moderate' | 'major';
}

export interface LogicEvaluation {
  score: 1 | 2 | 3 | 4 | 5;
  reasoning: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  validityAnalysis: {
    premisesValid: boolean;
    conclusionFollows: boolean;
    logicalStructure: 'sound' | 'unsound' | 'invalid';
  };
}

export interface AICoachingResponse {
  grammarFeedback: {
    hasErrors: boolean;
    corrections: GrammarCorrection[];
    overallQuality: 'poor' | 'fair' | 'good' | 'excellent';
  };
  logicFeedback: LogicEvaluation;
  combinedScore: {
    logic: number; // 0-5 logic score
    english: number; // 0-5 English score
    overall: number; // 0-5 combined score
  };
  personalizedTips: string[];
  nextSteps: string[];
}

/**
 * AI Coaching Service - The Smart Assistant Layer
 *
 * This service will provide:
 * 1. Real-time grammar correction (English weakness)
 * 2. Logic structure analysis (Critical thinking weakness)
 * 3. Personalized learning recommendations
 * 4. Progressive difficulty adjustment
 */
export class AICoachingService {
  private static instance: AICoachingService;

  // Configuration for AI behavior
  private readonly config = {
    // AI API settings (placeholder)
    apiKey: process.env.REACT_APP_GOOGLE_AI_KEY || '',
    model: 'gemini-pro',

    // Coaching parameters
    strictnessLevel: 0.7, // How critical the AI should be (0-1)
    focusOnWeakness: true, // Emphasize user's weak areas
    encouragementLevel: 0.8, // How encouraging vs critical (0-1)

    // Caching for performance
    enableCaching: true,
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
  };

  // Simple cache for repeated requests
  private responseCache: Map<
    string,
    { response: AICoachingResponse; timestamp: number }
  > = new Map();

  public static getInstance(): AICoachingService {
    if (!AICoachingService.instance) {
      AICoachingService.instance = new AICoachingService();
    }
    return AICoachingService.instance;
  }

  private constructor() {
    console.log('🤖 AI Coaching Service initialized');
  }

  /**
   * Main method: Get comprehensive feedback on logic exercise
   *
   * This is the core method called by LogicTrainerScreen for evaluation
   */
  public async getEnglishAndLogicFeedback(
    premise1: string,
    premise2: string,
    conclusion: string,
    exerciseType: 'deductive' | 'inductive' | 'abductive',
    domain: 'programming' | 'math' | 'english' | 'general',
  ): Promise<AICoachingResponse> {
    try {
      // Create cache key
      const cacheKey = this.createCacheKey(
        premise1,
        premise2,
        conclusion,
        exerciseType,
        domain,
      );

      // Check cache first
      if (this.config.enableCaching) {
        const cached = this.getCachedResponse(cacheKey);
        if (cached) {
          console.log('🤖 Returning cached AI feedback');
          return cached;
        }
      }

      // TODO: Phase 4 Implementation - Replace with actual AI API call
      // For now, use enhanced local evaluation
      const response = await this.evaluateLocallyEnhanced(
        premise1,
        premise2,
        conclusion,
        exerciseType,
        domain,
      );

      // Cache the response
      if (this.config.enableCaching) {
        this.cacheResponse(cacheKey, response);
      }

      return response;
    } catch (error) {
      console.error('Error getting AI feedback:', error);

      // Fallback to simple local evaluation
      return this.getFallbackResponse(
        premise1,
        premise2,
        conclusion,
        exerciseType,
      );
    }
  }

  /**
   * Enhanced local evaluation (temporary until AI integration)
   *
   * This provides sophisticated logic and English analysis using rule-based systems
   */
  private async evaluateLocallyEnhanced(
    premise1: string,
    premise2: string,
    conclusion: string,
    exerciseType: 'deductive' | 'inductive' | 'abductive',
    domain: string,
  ): Promise<AICoachingResponse> {
    // Simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // English analysis
    const grammarFeedback = this.analyzeEnglishGrammar(
      premise1,
      premise2,
      conclusion,
    );

    // Logic analysis
    const logicFeedback = this.analyzeLogicStructure(
      premise1,
      premise2,
      conclusion,
      exerciseType,
    );

    // Combined scoring
    const englishScore = this.calculateEnglishScore(grammarFeedback);
    const logicScore = logicFeedback.score;
    const overallScore = Math.round((englishScore + logicScore) / 2);

    // Personalized recommendations
    const personalizedTips = this.generatePersonalizedTips(
      grammarFeedback,
      logicFeedback,
      domain,
    );
    const nextSteps = this.generateNextSteps(
      logicScore,
      englishScore,
      exerciseType,
    );

    return {
      grammarFeedback,
      logicFeedback,
      combinedScore: {
        logic: logicScore,
        english: englishScore,
        overall: overallScore,
      },
      personalizedTips,
      nextSteps,
    };
  }

  /**
   * Analyze English grammar and writing quality
   */
  private analyzeEnglishGrammar(
    premise1: string,
    premise2: string,
    conclusion: string,
  ): AICoachingResponse['grammarFeedback'] {
    const corrections: GrammarCorrection[] = [];
    const allText = [premise1, premise2, conclusion].join(' ');

    // Basic grammar checks (expandable)
    const grammarRules = [
      {
        pattern: /\bi\s/gi,
        correction: (match: string) =>
          match.charAt(0).toUpperCase() + match.slice(1),
        type: 'grammar' as const,
        explanation: 'The pronoun "I" should always be capitalized',
        severity: 'minor' as const,
      },
      {
        pattern: /\s{2,}/g,
        correction: () => ' ',
        type: 'structure' as const,
        explanation: 'Remove extra spaces',
        severity: 'minor' as const,
      },
      {
        pattern: /^[a-z]/,
        correction: (match: string) => match.toUpperCase(),
        type: 'grammar' as const,
        explanation: 'Sentences should start with capital letters',
        severity: 'moderate' as const,
      },
      {
        pattern: /[a-z]\.[a-z]/gi,
        correction: (match: string) =>
          match.charAt(0) + '. ' + match.charAt(2).toUpperCase(),
        type: 'structure' as const,
        explanation: 'Add space after periods',
        severity: 'moderate' as const,
      },
    ];

    // Apply grammar rules
    [premise1, premise2, conclusion].forEach((text, index) => {
      const fieldName = ['Premise 1', 'Premise 2', 'Conclusion'][index];

      grammarRules.forEach((rule) => {
        const matches = text.match(rule.pattern);
        if (matches) {
          matches.forEach((match) => {
            corrections.push({
              original: match,
              corrected: rule.correction(match),
              explanation: `${fieldName}: ${rule.explanation}`,
              type: rule.type,
              severity: rule.severity,
            });
          });
        }
      });

      // Check for incomplete sentences
      if (text.trim().length > 0 && !text.trim().match(/[.!?]$/)) {
        corrections.push({
          original: text,
          corrected: text + '.',
          explanation: `${fieldName}: Add punctuation at the end`,
          type: 'structure',
          severity: 'minor',
        });
      }

      // Check sentence length and complexity
      if (text.length > 200) {
        corrections.push({
          original: text,
          corrected: text,
          explanation: `${fieldName}: Consider breaking into shorter sentences for clarity`,
          type: 'clarity',
          severity: 'minor',
        });
      }
    });

    // Determine overall quality
    let overallQuality: 'poor' | 'fair' | 'good' | 'excellent' = 'good';
    const majorErrors = corrections.filter(
      (c) => c.severity === 'major',
    ).length;
    const moderateErrors = corrections.filter(
      (c) => c.severity === 'moderate',
    ).length;

    if (majorErrors > 2 || moderateErrors > 4) {
      overallQuality = 'poor';
    } else if (majorErrors > 0 || moderateErrors > 2) {
      overallQuality = 'fair';
    } else if (corrections.length === 0) {
      overallQuality = 'excellent';
    }

    return {
      hasErrors: corrections.length > 0,
      corrections,
      overallQuality,
    };
  }

  /**
   * Analyze logical structure and reasoning quality
   */
  private analyzeLogicStructure(
    premise1: string,
    premise2: string,
    conclusion: string,
    exerciseType: 'deductive' | 'inductive' | 'abductive',
  ): LogicEvaluation {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const suggestions: string[] = [];
    let score: 1 | 2 | 3 | 4 | 5 = 3;

    // Check completeness
    const hasAllFields =
      premise1.trim().length >= 10 &&
      premise2.trim().length >= 10 &&
      conclusion.trim().length >= 10;

    if (hasAllFields) {
      strengths.push('All components provided with sufficient detail');
      score = Math.min(5, score + 1) as 1 | 2 | 3 | 4 | 5;
    } else {
      weaknesses.push('Incomplete reasoning - expand all sections');
      suggestions.push(
        'Provide at least 10 words for each premise and conclusion',
      );
      score = Math.max(1, score - 2) as 1 | 2 | 3 | 4 | 5;
    }

    // Check for logical indicators
    const logicalConnectors =
      /\b(therefore|thus|hence|consequently|because|since|if|then|given|assuming|follows that|it can be concluded|we can infer)\b/gi;
    const hasLogicalConnectors = logicalConnectors.test(conclusion);

    if (hasLogicalConnectors) {
      strengths.push('Uses clear logical connectors and indicators');
      score = Math.min(5, score + 1) as 1 | 2 | 3 | 4 | 5;
    } else {
      weaknesses.push('Missing logical transition words');
      suggestions.push(
        'Use connectors like "therefore," "thus," or "consequently"',
      );
    }

    // Type-specific analysis
    const typeAnalysis = this.analyzeByLogicType(
      premise1,
      premise2,
      conclusion,
      exerciseType,
    );
    strengths.push(...typeAnalysis.strengths);
    weaknesses.push(...typeAnalysis.weaknesses);
    suggestions.push(...typeAnalysis.suggestions);
    score = Math.max(1, Math.min(5, score + typeAnalysis.scoreAdjustment)) as
      | 1
      | 2
      | 3
      | 4
      | 5;

    // Validity analysis
    const validityAnalysis = this.assessValidity(
      premise1,
      premise2,
      conclusion,
      exerciseType,
    );

    // Generate reasoning
    const reasoning = this.generateLogicReasoning(
      score,
      exerciseType,
      validityAnalysis,
    );

    return {
      score,
      reasoning,
      strengths,
      weaknesses,
      suggestions,
      validityAnalysis,
    };
  }

  /**
   * Type-specific logic analysis
   */
  private analyzeByLogicType(
    premise1: string,
    premise2: string,
    conclusion: string,
    type: 'deductive' | 'inductive' | 'abductive',
  ): {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    scoreAdjustment: number;
  } {
    const result = {
      strengths: [] as string[],
      weaknesses: [] as string[],
      suggestions: [] as string[],
      scoreAdjustment: 0,
    };

    switch (type) {
      case 'deductive':
        // Look for universal statements and certainty
        const hasUniversalStatement =
          /\b(all|every|no|none|always|never)\b/gi.test(
            premise1 + ' ' + premise2,
          );
        const showsCertainty =
          /\b(must|certainly|definitely|necessarily)\b/gi.test(conclusion);

        if (hasUniversalStatement) {
          result.strengths.push(
            'Contains universal statements appropriate for deductive reasoning',
          );
          result.scoreAdjustment += 1;
        } else {
          result.suggestions.push(
            'Include universal terms (all, every, none) in premises',
          );
        }

        if (showsCertainty) {
          result.strengths.push('Conclusion expresses appropriate certainty');
        } else {
          result.suggestions.push(
            'Express certainty in conclusion (must, necessarily)',
          );
        }
        break;

      case 'inductive':
        // Look for pattern recognition and probability
        const showsPattern =
          /\b(pattern|trend|usually|often|generally|typically)\b/gi.test(
            premise1 + ' ' + premise2,
          );
        const showsProbability =
          /\b(likely|probably|suggests|indicates|may|might)\b/gi.test(
            conclusion,
          );

        if (showsPattern) {
          result.strengths.push(
            'Identifies patterns appropriate for inductive reasoning',
          );
          result.scoreAdjustment += 1;
        } else {
          result.suggestions.push(
            'Highlight patterns or trends in your premises',
          );
        }

        if (showsProbability) {
          result.strengths.push(
            'Conclusion appropriately expresses probability',
          );
        } else {
          result.suggestions.push(
            'Use probability language (likely, probably, suggests)',
          );
        }
        break;

      case 'abductive':
        // Look for explanation and best guess
        const offersExplanation =
          /\b(explains|because|reason|cause|due to)\b/gi.test(conclusion);
        const showsUncertainty =
          /\b(best explanation|most likely|probably|suggests)\b/gi.test(
            conclusion,
          );

        if (offersExplanation) {
          result.strengths.push(
            'Provides explanatory reasoning appropriate for abduction',
          );
          result.scoreAdjustment += 1;
        } else {
          result.suggestions.push(
            'Focus on explaining the observations in your conclusion',
          );
        }

        if (showsUncertainty) {
          result.strengths.push(
            'Appropriately acknowledges uncertainty in conclusion',
          );
        } else {
          result.suggestions.push(
            'Acknowledge uncertainty (most likely, best explanation)',
          );
        }
        break;
    }

    return result;
  }

  /**
   * Assess logical validity
   */
  private assessValidity(
    premise1: string,
    premise2: string,
    conclusion: string,
    type: 'deductive' | 'inductive' | 'abductive',
  ): LogicEvaluation['validityAnalysis'] {
    // Simple heuristic validity checking
    const p1Words = premise1.toLowerCase().split(/\s+/);
    const p2Words = premise2.toLowerCase().split(/\s+/);
    const conclusionWords = conclusion.toLowerCase().split(/\s+/);

    // Check if conclusion contains elements from premises
    const conclusionUsesP1 = p1Words.some(
      (word) => word.length > 3 && conclusionWords.includes(word),
    );
    const conclusionUsesP2 = p2Words.some(
      (word) => word.length > 3 && conclusionWords.includes(word),
    );

    const premisesValid = premise1.length > 10 && premise2.length > 10;
    const conclusionFollows = conclusionUsesP1 || conclusionUsesP2;

    let logicalStructure: 'sound' | 'unsound' | 'invalid' = 'sound';

    if (!premisesValid) {
      logicalStructure = 'invalid';
    } else if (!conclusionFollows) {
      logicalStructure = 'unsound';
    }

    return {
      premisesValid,
      conclusionFollows,
      logicalStructure,
    };
  }

  /**
   * Generate reasoning explanation
   */
  private generateLogicReasoning(
    score: number,
    type: 'deductive' | 'inductive' | 'abductive',
    validity: LogicEvaluation['validityAnalysis'],
  ): string {
    const typeDescriptions = {
      deductive: 'moves from general principles to specific conclusions',
      inductive: 'builds general conclusions from specific observations',
      abductive: 'finds the most likely explanation for given evidence',
    };

    let reasoning = `${
      type.charAt(0).toUpperCase() + type.slice(1)
    } reasoning ${typeDescriptions[type]}. `;

    if (score >= 4) {
      reasoning += 'Your logic structure is strong and well-developed.';
    } else if (score >= 3) {
      reasoning +=
        'Your logic structure shows good understanding with room for improvement.';
    } else {
      reasoning += 'Your logic structure needs strengthening in key areas.';
    }

    if (validity.logicalStructure === 'invalid') {
      reasoning +=
        ' Focus on strengthening your premises with more substantial content.';
    } else if (validity.logicalStructure === 'unsound') {
      reasoning +=
        ' Ensure your conclusion clearly follows from your premises.';
    } else {
      reasoning += ' Your logical structure is valid and sound.';
    }

    return reasoning;
  }

  /**
   * Calculate English quality score (0-5)
   */
  private calculateEnglishScore(
    grammarFeedback: AICoachingResponse['grammarFeedback'],
  ): number {
    if (grammarFeedback.overallQuality === 'excellent') return 5;
    if (grammarFeedback.overallQuality === 'good') return 4;
    if (grammarFeedback.overallQuality === 'fair') return 3;
    if (grammarFeedback.overallQuality === 'poor') return 2;
    return 1;
  }

  /**
   * Generate personalized learning tips
   */
  private generatePersonalizedTips(
    grammarFeedback: AICoachingResponse['grammarFeedback'],
    logicFeedback: LogicEvaluation,
    domain: string,
  ): string[] {
    const tips: string[] = [];

    // English-focused tips (addressing user's English weakness)
    if (grammarFeedback.hasErrors) {
      const majorErrors = grammarFeedback.corrections.filter(
        (c) => c.severity === 'major',
      ).length;
      if (majorErrors > 0) {
        tips.push(
          '📝 Focus on fundamental grammar rules - they strengthen your logical expression',
        );
      } else {
        tips.push(
          '📝 Minor English improvements will make your reasoning clearer',
        );
      }
    } else {
      tips.push(
        '✅ Excellent English! Your clear writing supports strong logical reasoning',
      );
    }

    // Logic-focused tips (addressing user's logic weakness)
    if (logicFeedback.score <= 2) {
      tips.push(
        '🧠 Start with simple premise-conclusion relationships before complex reasoning',
      );
    } else if (logicFeedback.score <= 3) {
      tips.push(
        '🎯 Strengthen logical connections between your premises and conclusions',
      );
    } else {
      tips.push(
        '🚀 Strong logical foundation! Ready for more complex reasoning challenges',
      );
    }

    // Domain-specific tips
    const domainTips = {
      programming:
        '💻 Apply logical operators (AND, OR, NOT) thinking to strengthen reasoning',
      math: '🧮 Use mathematical precision in your logical statements',
      english: '📚 Focus on clear sentence structure and logical flow',
      general: '🎓 Practice with everyday examples to build logical intuition',
    };

    tips.push(domainTips[domain as keyof typeof domainTips]);

    return tips.slice(0, 3); // Limit to 3 tips for focus
  }

  /**
   * Generate next steps for improvement
   */
  private generateNextSteps(
    logicScore: number,
    englishScore: number,
    exerciseType: 'deductive' | 'inductive' | 'abductive',
  ): string[] {
    const steps: string[] = [];

    // Logic progression
    if (logicScore <= 2) {
      steps.push(
        'Master basic premise-conclusion structures with simple examples',
      );
    } else if (logicScore <= 3) {
      steps.push(`Practice more ${exerciseType} reasoning exercises`);
    } else {
      const nextTypes = {
        deductive: 'inductive',
        inductive: 'abductive',
        abductive: 'deductive',
      };
      steps.push(`Advance to ${nextTypes[exerciseType]} reasoning challenges`);
    }

    // English progression
    if (englishScore <= 2) {
      steps.push('Focus on clear sentence structure and basic grammar');
    } else if (englishScore <= 3) {
      steps.push('Enhance vocabulary and logical connectors');
    } else {
      steps.push('Practice complex argumentation and persuasive writing');
    }

    // Integration step
    steps.push(
      'Combine improved English and logic skills in real-world scenarios',
    );

    return steps.slice(0, 3); // Limit to 3 steps
  }

  /**
   * Cache management
   */
  private createCacheKey(...args: string[]): string {
    return args.join('|').toLowerCase().replace(/\s+/g, ' ');
  }

  private getCachedResponse(key: string): AICoachingResponse | null {
    const cached = this.responseCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
      return cached.response;
    }
    return null;
  }

  private cacheResponse(key: string, response: AICoachingResponse): void {
    this.responseCache.set(key, {
      response,
      timestamp: Date.now(),
    });

    // Clean old cache entries
    if (this.responseCache.size > 100) {
      const entries = Array.from(this.responseCache.entries());
      entries.slice(0, 50).forEach(([k]) => this.responseCache.delete(k));
    }
  }

  /**
   * Fallback response for errors
   */
  private getFallbackResponse(
    premise1: string,
    premise2: string,
    conclusion: string,
    exerciseType: 'deductive' | 'inductive' | 'abductive',
  ): AICoachingResponse {
    return {
      grammarFeedback: {
        hasErrors: false,
        corrections: [],
        overallQuality: 'good',
      },
      logicFeedback: {
        score: 3,
        reasoning: `Your ${exerciseType} reasoning shows good effort. Continue practicing!`,
        strengths: ['Completed all components of the exercise'],
        weaknesses: [],
        suggestions: ['Keep practicing to improve logical structure'],
        validityAnalysis: {
          premisesValid: true,
          conclusionFollows: true,
          logicalStructure: 'sound',
        },
      },
      combinedScore: {
        logic: 3,
        english: 3,
        overall: 3,
      },
      personalizedTips: [
        '🧠 Regular practice will strengthen your logical reasoning',
        '📝 Clear writing supports clear thinking',
      ],
      nextSteps: [
        'Continue with similar exercises',
        'Focus on logical connectors',
      ],
    };
  }

  /**
   * TODO: Phase 4 Complete Implementation
   *
   * Replace the local evaluation with actual AI service calls:
   *
   * 1. Google AI Studio / Gemini Integration:
   *    - Set up API keys and authentication
   *    - Create prompts for grammar and logic evaluation
   *    - Handle rate limiting and error responses
   *
   * 2. Advanced Grammar Checking:
   *    - Integrate with Grammarly API or similar service
   *    - Provide detailed syntax and style feedback
   *    - Context-aware corrections
   *
   * 3. Logic Analysis AI:
   *    - Train or use models specifically for logical reasoning
   *    - Implement formal logic validation
   *    - Provide sophisticated argumentation analysis
   *
   * 4. Personalization Engine:
   *    - Track user progress over time
   *    - Adapt coaching style to user's learning patterns
   *    - Provide domain-specific feedback
   */
}

// Export singleton instance
export const aiCoachingService = AICoachingService.getInstance();
export default aiCoachingService;

