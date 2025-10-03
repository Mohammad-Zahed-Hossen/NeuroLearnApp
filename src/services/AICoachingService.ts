
/**
 * AI Coaching Service - Edge Functions Only
 *
 * Refactored to use ONLY Supabase Edge Functions for all AI operations.
 * No direct AI API calls from frontend - all secrets stay on server side.
 */

import { SupabaseService } from './SupabaseService';

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

export class AICoachingService {
  private static instance: AICoachingService;
  private supabaseService: SupabaseService;

  // Configuration for AI behavior
  private readonly config = {
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
    this.supabaseService = SupabaseService.getInstance();
    console.log('🤖 AI Coaching Service initialized (Edge Functions Only)');
  }

  /**
   * Main method: Get comprehensive feedback on logic exercise
   * Now uses ONLY Edge Functions - no direct AI calls
   */
  public async getEnglishAndLogicFeedback(
    premise1: string,
    premise2: string,
    conclusion: string,
    exerciseType: 'deductive' | 'inductive' | 'abductive',
    domain: 'programming' | 'math' | 'english' | 'general',
  ): Promise<AICoachingResponse> {
    const startTime = Date.now();

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

      // Use Edge Function for AI evaluation (ONLY route to AI)
      const response = await this.callLogicEvaluationEdgeFunction(
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
      const fallback = this.getFallbackResponse(
        premise1,
        premise2,
        conclusion,
        exerciseType,
      );

      return fallback;
    }
  }

  /**
   * Call the ai-logic-evaluator Edge Function (NEW)
   * This replaces direct AI API calls
   */
  private async callLogicEvaluationEdgeFunction(
    premise1: string,
    premise2: string,
    conclusion: string,
    exerciseType: 'deductive' | 'inductive' | 'abductive',
    domain: string,
  ): Promise<AICoachingResponse> {
    const supabase = this.supabaseService.getClient();

    const maxRetries = 3;
    let lastError: any = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { data, error } = await supabase.functions.invoke('ai-logic-evaluator', {
          method: 'POST',
          body: {
            premise1,
            premise2,
            conclusion,
            exerciseType,
            domain,
            strictnessLevel: this.config.strictnessLevel,
            encouragementLevel: this.config.encouragementLevel,
          },
        });

        if (error) {
          console.error(`AI Logic Evaluator Error (attempt ${attempt + 1}):`, error);
          lastError = error;

          if (attempt < maxRetries - 1) {
            // Exponential backoff: wait 1s, 2s, 4s...
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }
        } else {
          // Success - transform the response to match expected format
          return this.transformEdgeFunctionResponse(data);
        }
      } catch (e: any) {
        console.error(`Network Error (ai-logic-evaluator, attempt ${attempt + 1}):`, e);
        lastError = e;

        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }
      }
    }

    // All retries exhausted - use fallback
    throw new Error(`AI Logic Evaluation failed after ${maxRetries} attempts: ${lastError}`);
  }

  /**
   * Transform Edge Function response to AICoachingResponse format
   */
  private transformEdgeFunctionResponse(data: any): AICoachingResponse {
    return {
      grammarFeedback: data.grammarFeedback || {
        hasErrors: false,
        corrections: [],
        overallQuality: 'good' as const,
      },
      logicFeedback: data.logicFeedback || {
        score: 3 as const,
        reasoning: 'Basic logic evaluation',
        strengths: [],
        weaknesses: [],
        suggestions: [],
        validityAnalysis: {
          premisesValid: true,
          conclusionFollows: true,
          logicalStructure: 'sound' as const,
        },
      },
      combinedScore: data.combinedScore || {
        logic: 3,
        english: 3,
        overall: 3,
      },
      personalizedTips: data.personalizedTips || [],
      nextSteps: data.nextSteps || [],
    };
  }

  /**
   * Generate AI flashcards via Edge Function
   * Replaces direct AI calls for flashcard generation
   */
  public async generateFlashcard(
    text: string,
    category: string = 'general'
  ): Promise<{ front: string; back: string } | null> {
    const supabase = this.supabaseService.getClient();

    try {
      const { data, error } = await supabase.functions.invoke('ai-flashcard-creator', {
        method: 'POST',
        body: { text, category },
      });

      if (error) {
        console.error('AI Flashcard Creation Error:', error);
        return null;
      }

      return data.card || null;
    } catch (error) {
      console.error('Failed to generate AI flashcard:', error);
      return null;
    }
  }

  /**
   * Generate comprehension quiz via Edge Function
   * Replaces direct AI calls for quiz generation
   */
  public async generateComprehensionQuiz(
    sessionId: string,
    options: {
      questionCount?: number;
      difficulty?: 'adaptive' | 'easy' | 'medium' | 'hard';
      questionTypes?: Array<'factual' | 'inference' | 'vocabulary'>;
      adaptToPreviousPerformance?: boolean;
    } = {},
  ): Promise<{
    id: string;
    sessionId: string;
    questions: Array<{
      id: string;
      question: string;
      options: string[];
      correctAnswer: number;
      explanation?: string;
      difficulty: 1 | 2 | 3 | 4 | 5;
      conceptTested: string;
    }>;
    timeLimit?: number;
    created: Date;
  }> {
    const supabase = this.supabaseService.getClient();
    const maxRetries = 3;
    let lastError: string = '';

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { data, error } = await supabase.functions.invoke('ai-quiz-creator', {
          method: 'POST',
          body: { session_id: sessionId },
        });

        if (error) {
          lastError = `Edge Function Error: ${error.message}`;
          console.error(`AI Quiz Creator Error (attempt ${attempt + 1}):`, error);

          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }
        } else {
          // Success - transform the quiz data from the Edge Function
          const quizData = data.quiz;
          const questions = quizData.quiz_data.map((q: any, index: number) => ({
            id: q.question_id || `q_${sessionId}_${index}`,
            question: q.question,
            options: [
              q.options.A,
              q.options.B,
              q.options.C,
              q.options.D,
            ],
            correctAnswer: q.correct_answer === 'A' ? 0 :
                          q.correct_answer === 'B' ? 1 :
                          q.correct_answer === 'C' ? 2 : 3,
            explanation: `Question ${index + 1} from AI-generated quiz`,
            difficulty: 3, // Default medium difficulty
            conceptTested: q.question.split(' ').slice(0, 3).join(' '), // Extract concept from question
          }));

          return {
            id: quizData.id,
            sessionId: quizData.session_id,
            questions,
            timeLimit: 300, // 5 minutes default
            created: new Date(),
          };
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.error(`AI quiz generation failed (attempt ${attempt + 1}/${maxRetries}):`, error);
        if (attempt === maxRetries - 1) break;
      }
    }

    // All retries exhausted - use fallback
    console.error(`Failed to generate AI comprehension quiz after ${maxRetries} attempts: ${lastError}`);
    console.warn('Falling back to local quiz generation');
    return this.generateFallbackQuiz(sessionId, options);
  }

  /**
   * Fallback quiz generation when Edge Function is unavailable
   */
  private generateFallbackQuiz(
    sessionId: string,
    options: {
      questionCount?: number;
      difficulty?: 'adaptive' | 'easy' | 'medium' | 'hard';
      questionTypes?: Array<'factual' | 'inference' | 'vocabulary'>;
    } = {},
  ): {
    id: string;
    sessionId: string;
    questions: Array<{
      id: string;
      question: string;
      options: string[];
      correctAnswer: number;
      explanation?: string;
      difficulty: 1 | 2 | 3 | 4 | 5;
      conceptTested: string;
    }>;
    timeLimit?: number;
    created: Date;
  } {
    const count = Math.max(3, Math.min(10, options.questionCount ?? 5));
    const concepts = ['comprehension', 'analysis', 'recall', 'inference', 'vocabulary'];

    const difficultyMap: Record<string, 1 | 2 | 3 | 4 | 5> = {
      easy: 2,
      medium: 3,
      hard: 4,
      adaptive: 3,
    } as const;

    const baseDiff = difficultyMap[options.difficulty || 'adaptive'];

    const questions = Array.from({ length: count }).map((_, i) => {
      const concept = concepts[i % concepts.length];
      const type = options.questionTypes?.[i % (options.questionTypes?.length || 1)] || 'factual';

      const qPrefix = type === 'inference'
        ? 'What can be inferred about'
        : type === 'vocabulary'
        ? 'What is the meaning of'
        : 'According to the text, what is true about';

      const correct = `${concept} (correct)`;
      const distractors = [
        `${concept} (partially true)`,
        `${concept} (unrelated)`,
        `${concept} (opposite)`,
      ];

      const optionsArr = [correct, ...distractors];

      return {
        id: `q_${sessionId}_${i}`,
        question: `${qPrefix} "${concept}"?`,
        options: optionsArr,
        correctAnswer: 0,
        explanation: `Checks understanding of the concept "${concept}" from the passage`,
        difficulty: baseDiff,
        conceptTested: concept,
      };
    });

    return {
      id: `quiz_${sessionId}_${Date.now()}`,
      sessionId,
      questions,
      timeLimit: 60,
      created: new Date(),
    };
  }

  // ==================== CACHE MANAGEMENT ====================

  private createCacheKey(
    premise1: string,
    premise2: string,
    conclusion: string,
    exerciseType: string,
    domain: string,
  ): string {
    const combined = `${premise1}|${premise2}|${conclusion}|${exerciseType}|${domain}`;
    return btoa(combined).substring(0, 32); // Base64 encode and truncate
  }

  private getCachedResponse(cacheKey: string): AICoachingResponse | null {
    const cached = this.responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
      return cached.response;
    }
    return null;
  }

  private cacheResponse(cacheKey: string, response: AICoachingResponse): void {
    this.responseCache.set(cacheKey, {
      response,
      timestamp: Date.now(),
    });

    // Clean old cache entries periodically
    if (this.responseCache.size > 100) {
      const cutoffTime = Date.now() - this.config.cacheTimeout;
      for (const [key, value] of this.responseCache.entries()) {
        if (value.timestamp < cutoffTime) {
          this.responseCache.delete(key);
        }
      }
    }
  }

  /**
   * Fallback response when all Edge Functions fail
   */
  private getFallbackResponse(
    premise1: string,
    premise2: string,
    conclusion: string,
    exerciseType: 'deductive' | 'inductive' | 'abductive',
  ): AICoachingResponse {
    console.warn('🔄 Using fallback AI evaluation (local)');

    // Simple local evaluation
    const hasContent = premise1.length > 10 && premise2.length > 10 && conclusion.length > 10;
    const score = hasContent ? 3 : 2;

    return {
      grammarFeedback: {
        hasErrors: false,
        corrections: [],
        overallQuality: 'good' as const,
      },
      logicFeedback: {
        score: score as 1 | 2 | 3 | 4 | 5,
        reasoning: hasContent
          ? `Basic ${exerciseType} reasoning provided`
          : 'Incomplete reasoning - expand all sections',
        strengths: hasContent ? ['All components provided'] : [],
        weaknesses: hasContent ? [] : ['Missing detailed reasoning'],
        suggestions: hasContent
          ? ['Consider adding more logical connectors']
          : ['Provide more detailed premises and conclusion'],
        validityAnalysis: {
          premisesValid: hasContent,
          conclusionFollows: hasContent,
          logicalStructure: hasContent ? 'sound' : 'unsound',
        },
      },
      combinedScore: {
        logic: score,
        english: score,
        overall: score,
      },
      personalizedTips: [
        `Focus on improving ${exerciseType} reasoning skills`,
        'Practice writing clearer logical statements',
      ],
      nextSteps: [
        'Try more logic exercises',
        'Review logical reasoning patterns',
      ],
    };
  }

  // ==================== UTILITY METHODS ====================

  public clearCache(): void {
    this.responseCache.clear();
    console.log('🗑️ AI coaching cache cleared');
  }

  public getCacheInfo(): { size: number; oldestEntry: number | null } {
    if (this.responseCache.size === 0) {
      return { size: 0, oldestEntry: null };
    }

    let oldestTimestamp = Date.now();
    for (const cached of this.responseCache.values()) {
      if (cached.timestamp < oldestTimestamp) {
        oldestTimestamp = cached.timestamp;
      }
    }

    return {
      size: this.responseCache.size,
      oldestEntry: Date.now() - oldestTimestamp,
    };
  }
}

// Export singleton instance
export const aiCoachingService = AICoachingService.getInstance();
export default aiCoachingService;
