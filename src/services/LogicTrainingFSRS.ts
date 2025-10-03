/**
 * Phase 4 Enhancement: FSRS Logic Training Integration
 *
 * Extends the existing SpacedRepetitionService with Logic Training support
 * This addition enables FSRS scheduling for critical thinking exercises
 */

import { SpacedRepetitionService, FSRSCard, Rating, CardState } from './SpacedRepetitionService';
import { LogicNode } from './StorageService';

/**
 * Logic Training Extensions for SpacedRepetitionService
 *
 * This enhancement maintains the existing FSRS architecture while adding
 * specialized logic training support for critical thinking development
 */
export class LogicTrainingFSRS {
  private srsService: SpacedRepetitionService;

  constructor() {
    this.srsService = SpacedRepetitionService.getInstance();
  }

  /**
   * Phase 4, Step 3: Schedule next logic training review using FSRS
   *
   * This is the CRITICAL method that integrates logic training with FSRS
   * Maps logic performance rating (1-5) to FSRS Rating system
   */
  public scheduleNextLogicReview(
    logicNode: LogicNode,
    performanceRating: 1 | 2 | 3 | 4 | 5,
    cognitiveLoad: number = 0.5,
    reviewDate: Date = new Date()
  ): LogicNode {
    try {
      // Convert LogicNode to FSRSCard format
      const fsrsCard: FSRSCard = this.convertLogicNodeToFSRSCard(logicNode);

      // Convert logic performance rating to FSRS Rating
      const fsrsRating = this.convertLogicRatingToFSRS(performanceRating);

      // Apply FSRS scheduling algorithm
      const { card: updatedCard, logs } = this.srsService.scheduleNextReviewFSRS(
        fsrsCard,
        fsrsRating,
        reviewDate
      );

      // Convert back to LogicNode format with cognitive load adjustments
      const updatedLogicNode = this.convertFSRSCardToLogicNode(
        updatedCard,
        logicNode,
        performanceRating,
        cognitiveLoad
      );

      // Ensure nextReviewDate is always a Date object
      if (!(updatedLogicNode.nextReviewDate instanceof Date)) {
        updatedLogicNode.nextReviewDate = new Date(updatedLogicNode.nextReviewDate);
      }

      // Log FSRS scheduling (safely)
      try {
        console.log(`🧠 Logic FSRS Scheduling:`, {
          nodeId: logicNode.id,
          question: logicNode.question.substring(0, 50) + '...',
          rating: performanceRating,
          fsrsRating,
          oldInterval: logicNode.interval,
          newInterval: updatedLogicNode.interval,
          nextReview: updatedLogicNode.nextReviewDate.toISOString(),
          stability: updatedCard.stability,
          difficulty: updatedCard.difficulty,
          cognitiveLoad,
        });
      } catch (logError) {
        console.log('🧠 Logic FSRS Scheduling completed (logging failed)');
      }

      return updatedLogicNode;

    } catch (error) {
      console.error('Error in logic FSRS scheduling:', error);

      // Fallback to simple interval increase
      return {
        ...logicNode,
        interval: Math.min(365, logicNode.interval * (performanceRating / 3)),
        repetitions: logicNode.repetitions + 1,
        nextReviewDate: new Date(Date.now() + (logicNode.interval * 24 * 60 * 60 * 1000)),
        lastAccessed: reviewDate,
        modified: reviewDate,
        totalAttempts: logicNode.totalAttempts + 1,
        correctAttempts: logicNode.correctAttempts + (performanceRating >= 3 ? 1 : 0),
      };
    }
  }

  /**
   * Convert LogicNode to FSRSCard for FSRS algorithm processing
   */
  private convertLogicNodeToFSRSCard(logicNode: LogicNode): FSRSCard {
    return {
      id: logicNode.id,
      due: logicNode.nextReviewDate,
      stability: logicNode.stability || this.estimateLogicStability(logicNode),
      difficulty: logicNode.fsrsDifficulty || this.estimateLogicDifficulty(logicNode),
      elapsed_days: this.calculateElapsedDays(logicNode.lastReview, new Date()),
      scheduled_days: logicNode.interval,
      reps: logicNode.repetitions,
      lapses: Math.max(0, logicNode.totalAttempts - logicNode.correctAttempts),
      state: this.determineLogicCardState(logicNode),
      last_review: logicNode.lastReview,
    };
  }

  /**
   * Convert FSRS card back to LogicNode format with enhancements
   */
  private convertFSRSCardToLogicNode(
    fsrsCard: FSRSCard,
    originalLogicNode: LogicNode,
    performanceRating: number,
    cognitiveLoad: number
  ): LogicNode {
    const now = new Date();

    // Apply cognitive load adjustment to interval
    let adjustedInterval = fsrsCard.scheduled_days;

    if (cognitiveLoad > 0.8) {
      // High cognitive load: reduce intervals to prevent overwhelming
      adjustedInterval = Math.max(1, Math.floor(adjustedInterval * 0.7));
    } else if (cognitiveLoad < 0.3) {
      // Low cognitive load: can handle slightly longer intervals
      adjustedInterval = Math.floor(adjustedInterval * 1.2);
    }

    return {
      ...originalLogicNode,
      // FSRS metrics
      interval: adjustedInterval,
      repetitions: fsrsCard.reps,
      nextReviewDate: fsrsCard.due,
      lastReview: now,
      lastAccessed: now,
      modified: now,

      // FSRS-specific tracking
      stability: fsrsCard.stability,
      fsrsDifficulty: fsrsCard.difficulty,
      state: fsrsCard.state,

      // Performance tracking
      totalAttempts: originalLogicNode.totalAttempts + 1,
      correctAttempts: originalLogicNode.correctAttempts + (performanceRating >= 3 ? 1 : 0),
      accessCount: originalLogicNode.accessCount + 1,

      // Dynamic ease factor calculation
      easeFactor: this.calculateLogicEaseFactor(fsrsCard.difficulty, performanceRating),
    };
  }

  /**
   * Convert logic performance rating (1-5) to FSRS Rating enum
   *
   * Logic Rating System:
   * 1 = Complete failure (logical errors, poor reasoning)
   * 2 = Partial understanding (some errors in reasoning)
   * 3 = Good logic (correct reasoning, minor issues)
   * 4 = Excellent logic (strong reasoning, well-structured)
   * 5 = Perfect logic (flawless reasoning, elegant structure)
   */
  private convertLogicRatingToFSRS(logicRating: 1 | 2 | 3 | 4 | 5): Rating {
    switch (logicRating) {
      case 1:
        return Rating.Again;   // Complete failure
      case 2:
        return Rating.Hard;    // Struggled with reasoning
      case 3:
        return Rating.Good;    // Standard performance
      case 4:
      case 5:
        return Rating.Easy;    // Excellent/Perfect performance
      default:
        return Rating.Good;
    }
  }

  /**
   * Estimate initial stability for logic nodes based on complexity
   */
  private estimateLogicStability(logicNode: LogicNode): number {
    let baseStability = 1.0;

    // Adjust based on logic difficulty
    const difficultyMultiplier = {
      1: 1.5,   // Easy logic
      2: 1.2,
      3: 1.0,   // Medium logic
      4: 0.8,
      5: 0.6,   // Very hard logic
    }[logicNode.difficulty] || 1.0;

    // Adjust based on logic type complexity
    const typeMultiplier = {
      deductive: 1.2,   // Most straightforward
      inductive: 1.0,   // Medium complexity
      abductive: 0.8,   // Most complex
    }[logicNode.type] || 1.0;

    // Adjust based on domain complexity
    const domainMultiplier = {
      general: 1.3,     // Easiest
      english: 1.1,
      math: 1.0,
      programming: 0.8, // Most complex
    }[logicNode.domain] || 1.0;

    baseStability *= difficultyMultiplier * typeMultiplier * domainMultiplier;

    return Math.max(0.1, Math.min(7.0, baseStability));
  }

  /**
   * Estimate initial difficulty for logic nodes
   */
  private estimateLogicDifficulty(logicNode: LogicNode): number {
    let baseDifficulty = 5.0; // Start at medium difficulty

    // Increase difficulty for complex logic types
    if (logicNode.type === 'abductive') baseDifficulty += 1.5;
    if (logicNode.type === 'inductive') baseDifficulty += 0.5;

    // Increase difficulty for complex domains
    if (logicNode.domain === 'programming') baseDifficulty += 1.0;
    if (logicNode.domain === 'math') baseDifficulty += 0.5;

    // Adjust for explicit difficulty rating
    baseDifficulty += (logicNode.difficulty - 3) * 0.5;

    return Math.max(1.0, Math.min(10.0, baseDifficulty));
  }

  /**
   * Calculate elapsed days between two dates
   */
  private calculateElapsedDays(lastReview: Date | undefined, currentDate: Date): number {
    if (!lastReview) return 0;

    const diffTime = currentDate.getTime() - lastReview.getTime();
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  }

  /**
   * Determine FSRS card state from logic node data
   */
  private determineLogicCardState(logicNode: LogicNode): CardState {
    if (logicNode.repetitions === 0) {
      return CardState.New;
    } else if (logicNode.repetitions < 3 || logicNode.interval < 4) {
      return CardState.Learning;
    } else if (logicNode.totalAttempts > logicNode.correctAttempts * 1.5) {
      return CardState.Relearning;
    } else {
      return CardState.Review;
    }
  }

  /**
   * Calculate ease factor from FSRS difficulty
   */
  private calculateLogicEaseFactor(fsrsDifficulty: number, performanceRating: number): number {
    // Convert FSRS difficulty (1-10) to ease factor (1.3-4.0)
    const baseFactor = 4.0 - ((fsrsDifficulty - 1) / 9) * 2.7;

    // Apply performance adjustment
    const adjustment = (performanceRating - 3) * 0.1;

    return Math.max(1.3, Math.min(4.0, baseFactor + adjustment));
  }

  /**
   * Check if logic node is due for review
   */
  public isLogicNodeDue(
    logicNode: LogicNode,
    currentDate: Date = new Date()
  ): boolean {
    return logicNode.nextReviewDate <= currentDate;
  }

  /**
   * Get logic nodes due for review today
   * Powers the "Critical Logic Review: X Nodes Due" dashboard feature
   */
  public getLogicNodesDueToday(
    logicNodes: LogicNode[],
    date: Date = new Date()
  ): LogicNode[] {
    return logicNodes.filter(node => this.isLogicNodeDue(node, date));
  }

  /**
   * Phase 4: Calculate logic training session recommendations
   *
   * Provides intelligent session sizing based on cognitive load and due nodes
   */
  public getOptimalLogicSessionSize(
    dueLogicNodes: LogicNode[],
    cognitiveLoad: number,
    availableTimeMinutes: number = 30
  ): {
    sessionSize: number;
    recommendedNodes: LogicNode[];
    reasoning: string;
  } {
    const totalDue = dueLogicNodes.length;

    // Base session size for logic training (more intensive than flashcards)
    let baseSessionSize = Math.min(8, Math.max(3, totalDue));

    // Adjust for cognitive load (logic is more demanding)
    if (cognitiveLoad > 0.8) {
      baseSessionSize = Math.max(2, Math.floor(baseSessionSize * 0.5));
    } else if (cognitiveLoad > 0.6) {
      baseSessionSize = Math.floor(baseSessionSize * 0.7);
    } else if (cognitiveLoad < 0.3) {
      baseSessionSize = Math.min(totalDue, Math.floor(baseSessionSize * 1.3));
    }

    // Time-based adjustment (logic training takes ~4-5 minutes per node)
    const timeBasedLimit = Math.floor(availableTimeMinutes / 4.5);
    const finalSessionSize = Math.min(baseSessionSize, timeBasedLimit);

    // Priority selection: hardest and most overdue first
    const sortedNodes = dueLogicNodes
      .sort((a, b) => {
        // Prioritize by difficulty and overdue amount
        const aOverdue = (Date.now() - a.nextReviewDate.getTime()) / (1000 * 60 * 60 * 24);
        const bOverdue = (Date.now() - b.nextReviewDate.getTime()) / (1000 * 60 * 60 * 24);

        const aScore = a.difficulty * 2 + aOverdue;
        const bScore = b.difficulty * 2 + bOverdue;

        return bScore - aScore;
      })
      .slice(0, finalSessionSize);

    // Generate reasoning
    let reasoning = `Logic training session: ${finalSessionSize} nodes selected`;
    if (cognitiveLoad > 0.7) {
      reasoning += ' (reduced due to high cognitive load)';
    }
    if (timeBasedLimit < baseSessionSize) {
      reasoning += ' (limited by available time)';
    }

    return {
      sessionSize: finalSessionSize,
      recommendedNodes: sortedNodes,
      reasoning,
    };
  }

  /**
   * Phase 4: Generate logic training progress analytics
   *
   * Provides insights for neural mind map and dashboard
   */
  public analyzeLogicTrainingProgress(
    logicNodes: LogicNode[]
  ): {
    overallLogicMastery: number;
    strengthsByDomain: Record<string, number>;
    weakestLogicTypes: string[];
    criticalNodes: LogicNode[];
    progressTrend: 'improving' | 'stable' | 'declining';
    recommendations: string[];
  } {
    if (logicNodes.length === 0) {
      return {
        overallLogicMastery: 0,
        strengthsByDomain: {},
        weakestLogicTypes: [],
        criticalNodes: [],
        progressTrend: 'stable',
        recommendations: ['Start with basic deductive reasoning exercises'],
      };
    }

    // Calculate overall mastery (based on success rate and stability)
    const totalAttempts = logicNodes.reduce((sum, node) => sum + node.totalAttempts, 0);
    const totalCorrect = logicNodes.reduce((sum, node) => sum + node.correctAttempts, 0);
    const successRate = totalAttempts > 0 ? totalCorrect / totalAttempts : 0;

    const avgStability = logicNodes
      .filter(node => node.stability)
      .reduce((sum, node) => sum + (node.stability || 0), 0) / logicNodes.length;

    const overallLogicMastery = Math.min(1, (successRate * 0.7) + ((avgStability / 10) * 0.3));

    // Analyze strengths by domain
    const strengthsByDomain: Record<string, number> = {};

    ['programming', 'math', 'english', 'general'].forEach(domain => {
      const domainNodes = logicNodes.filter(node => node.domain === domain);
      if (domainNodes.length > 0) {
        const domainCorrect = domainNodes.reduce((sum, node) => sum + node.correctAttempts, 0);
        const domainTotal = domainNodes.reduce((sum, node) => sum + node.totalAttempts, 0);
        strengthsByDomain[domain] = domainTotal > 0 ? domainCorrect / domainTotal : 0;
      }
    });

    // Find weakest logic types
    const typePerformance = {
      deductive: { correct: 0, total: 0 },
      inductive: { correct: 0, total: 0 },
      abductive: { correct: 0, total: 0 },
    };

    logicNodes.forEach(node => {
      typePerformance[node.type].correct += node.correctAttempts;
      typePerformance[node.type].total += node.totalAttempts;
    });

    const weakestLogicTypes = Object.entries(typePerformance)
      .filter(([_, perf]) => perf.total > 0)
      .map(([type, perf]) => ({ type, rate: perf.correct / perf.total }))
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 2)
      .map(item => item.type);

    // Find critical nodes (low success rate and due soon)
    const criticalNodes = logicNodes
      .filter(node => {
        const successRate = node.totalAttempts > 0 ? node.correctAttempts / node.totalAttempts : 0;
        const isDueSoon = node.nextReviewDate <= new Date(Date.now() + 24 * 60 * 60 * 1000);
        return successRate < 0.5 || (isDueSoon && successRate < 0.7);
      })
      .sort((a, b) => {
        const aRate = a.totalAttempts > 0 ? a.correctAttempts / a.totalAttempts : 0;
        const bRate = b.totalAttempts > 0 ? b.correctAttempts / b.totalAttempts : 0;
        return aRate - bRate;
      })
      .slice(0, 5);

    // Determine progress trend (simplified)
    const recentNodes = logicNodes
      .filter(node => node.modified > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .filter(node => node.totalAttempts > 0);

    let progressTrend: 'improving' | 'stable' | 'declining' = 'stable';

    if (recentNodes.length > 2) {
      const recentSuccess = recentNodes.reduce((sum, node) => {
        return sum + (node.correctAttempts / node.totalAttempts);
      }, 0) / recentNodes.length;

      if (recentSuccess > successRate + 0.1) {
        progressTrend = 'improving';
      } else if (recentSuccess < successRate - 0.1) {
        progressTrend = 'declining';
      }
    }

    // Generate recommendations
    const recommendations: string[] = [];

    if (overallLogicMastery < 0.4) {
      recommendations.push('Focus on fundamental logical reasoning principles');
    }

    if (weakestLogicTypes.length > 0) {
      recommendations.push(`Strengthen ${weakestLogicTypes.join(' and ')} reasoning skills`);
    }

    if (criticalNodes.length > 0) {
      recommendations.push(`Review ${criticalNodes.length} struggling concepts immediately`);
    }

    if (progressTrend === 'declining') {
      recommendations.push('Reduce session intensity and review fundamentals');
    } else if (progressTrend === 'improving') {
      recommendations.push('Good progress! Consider tackling harder difficulty levels');
    }

    return {
      overallLogicMastery,
      strengthsByDomain,
      weakestLogicTypes,
      criticalNodes,
      progressTrend,
      recommendations,
    };
  }

  /**
   * Phase 4: Smart difficulty adjustment based on performance
   *
   * Automatically adjusts logic node difficulty based on FSRS data
   */
  public adjustLogicDifficulty(
    logicNode: LogicNode,
    recentPerformance: number[] // Array of recent ratings (1-5)
  ): number {
    if (recentPerformance.length < 3) {
      return logicNode.difficulty; // Need more data
    }

    const avgPerformance = recentPerformance.reduce((sum, rating) => sum + rating, 0) / recentPerformance.length;
    const currentDifficulty = logicNode.difficulty;

    // Adjust difficulty based on performance
    if (avgPerformance >= 4.5 && currentDifficulty < 5) {
      // Consistently excellent performance - increase difficulty
      return Math.min(5, currentDifficulty + 1);
    } else if (avgPerformance <= 2.0 && currentDifficulty > 1) {
      // Consistently poor performance - decrease difficulty
      return Math.max(1, currentDifficulty - 1);
    }

    return currentDifficulty; // Keep current difficulty
  }
}

// Export singleton instance
export const logicTrainingFSRS = new LogicTrainingFSRS();
export default logicTrainingFSRS;
