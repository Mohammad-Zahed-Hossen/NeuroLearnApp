import { Flashcard } from '../types';

/**
 * Advanced Spaced Repetition System (SRS) based on cognitive science research
 * Implements Free Spaced Repetition Scheduler (FSRS) algorithm principles
 * for optimal memory retention and forgetting curve management.
 */
export class SpacedRepetitionService {
  private static instance: SpacedRepetitionService;

  public static getInstance(): SpacedRepetitionService {
    if (!SpacedRepetitionService.instance) {
      SpacedRepetitionService.instance = new SpacedRepetitionService();
    }
    return SpacedRepetitionService.instance;
  }

  /**
   * Calculate next review date based on card performance and cognitive load
   * @param card - The flashcard to schedule
   * @param rating - Performance rating (1-5: Again, Hard, Good, Easy, Perfect)
   * @param cognitiveLoad - Current cognitive load factor (0.5-2.0)
   * @returns Updated card with new review schedule
   */
  scheduleNextReview(
    card: Flashcard,
    rating: 1 | 2 | 3 | 4 | 5,
    cognitiveLoad: number = 1.0,
  ): Flashcard {
    const updatedCard = { ...card };
    const now = new Date();

    // FSRS-based algorithm with cognitive load adjustment
    if (rating < 3) {
      // Failed recall - restart with shorter interval
      updatedCard.repetitions = 0;
      updatedCard.interval = this.calculateFailureInterval(cognitiveLoad);
      updatedCard.easeFactor = Math.max(1.3, card.easeFactor - 0.2);
    } else {
      // Successful recall - increase interval
      updatedCard.repetitions += 1;
      updatedCard.interval = this.calculateSuccessInterval(
        card.interval,
        card.easeFactor,
        rating,
        cognitiveLoad,
        card.repetitions,
      );
      updatedCard.easeFactor = this.adjustEaseFactor(card.easeFactor, rating);
    }

    // Set next review date
    const nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() + updatedCard.interval);
    updatedCard.nextReview = nextReview;

    // Store difficulty for future cognitive load calculations
    updatedCard.difficulty = this.mapRatingToDifficulty(rating);

    return updatedCard;
  }

  /**
   * Calculate failure interval with cognitive load consideration
   */
  private calculateFailureInterval(cognitiveLoad: number): number {
    // Base interval: 1 day, adjusted for cognitive load
    const baseInterval = 1;
    const adjustedInterval = Math.max(0.1, baseInterval * (2 - cognitiveLoad));
    return Math.round(adjustedInterval);
  }

  /**
   * Calculate success interval using FSRS principles
   */
  private calculateSuccessInterval(
    previousInterval: number,
    easeFactor: number,
    rating: number,
    cognitiveLoad: number,
    repetitions: number,
  ): number {
    let newInterval: number;

    if (repetitions === 1) {
      // First successful review
      newInterval = rating === 4 ? 4 : rating === 5 ? 6 : 1;
    } else if (repetitions === 2) {
      // Second successful review
      newInterval = rating === 4 ? 6 : rating === 5 ? 10 : 3;
    } else {
      // Subsequent reviews - use ease factor
      const ratingMultiplier = this.getRatingMultiplier(rating);
      newInterval = previousInterval * easeFactor * ratingMultiplier;
    }

    // Apply cognitive load adjustment
    const cognitiveAdjustment = this.getCognitiveLoadAdjustment(cognitiveLoad);
    newInterval *= cognitiveAdjustment;

    // Ensure minimum interval of 1 day
    return Math.max(1, Math.round(newInterval));
  }

  /**
   * Adjust ease factor based on performance
   */
  private adjustEaseFactor(currentEase: number, rating: number): number {
    const adjustment = 0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02);
    return Math.max(1.3, currentEase + adjustment);
  }

  /**
   * Get rating multiplier for interval calculation
   */
  private getRatingMultiplier(rating: number): number {
    switch (rating) {
      case 3:
        return 1.0; // Good
      case 4:
        return 1.3; // Easy
      case 5:
        return 1.5; // Perfect
      default:
        return 1.0;
    }
  }

  /**
   * Get cognitive load adjustment factor
   */
  private getCognitiveLoadAdjustment(cognitiveLoad: number): number {
    // High cognitive load = longer intervals (less frequent reviews)
    // Low cognitive load = shorter intervals (more frequent reviews)
    if (cognitiveLoad > 1.5) return 1.2; // High load - extend intervals
    if (cognitiveLoad > 1.2) return 1.1; // Medium-high load
    if (cognitiveLoad < 0.8) return 0.9; // Low load - shorten intervals
    return 1.0; // Normal load
  }

  /**
   * Map performance rating to difficulty level
   */
  private mapRatingToDifficulty(
    rating: number,
  ): 'again' | 'hard' | 'good' | 'easy' | 'perfect' {
    switch (rating) {
      case 1:
        return 'again';
      case 2:
        return 'hard';
      case 3:
        return 'good';
      case 4:
        return 'easy';
      case 5:
        return 'perfect';
      default:
        return 'good';
    }
  }

  /**
   * Check if a card is due for review
   */
  isCardDue(card: Flashcard): boolean {
    const now = new Date();
    return card.nextReview <= now;
  }

  /**
   * Get cards due for review, sorted by urgency
   */
  getDueCards(cards: Flashcard[]): Flashcard[] {
    const now = new Date();
    return cards
      .filter((card) => this.isCardDue(card))
      .sort((a, b) => {
        // Sort by urgency: overdue cards first, then by next review date
        const aOverdue = now.getTime() - a.nextReview.getTime();
        const bOverdue = now.getTime() - b.nextReview.getTime();
        return bOverdue - aOverdue;
      });
  }

  /**
   * Calculate current cognitive load based on recent performance
   * This is a simplified version - in practice, you'd consider more factors
   */
  calculateCognitiveLoad(recentSessions: any[]): number {
    if (recentSessions.length === 0) return 1.0;

    // Factors that increase cognitive load:
    // - Recent difficult sessions
    // - High frequency of study sessions
    // - Poor recent performance

    const recentPerformance =
      recentSessions
        .slice(-5) // Last 5 sessions
        .reduce((acc, session) => acc + (session.successRate || 0.5), 0) / 5;

    const sessionFrequency = recentSessions.filter((session) => {
      const sessionDate = new Date(session.startTime);
      const daysDiff =
        (Date.now() - sessionDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 1; // Sessions in last 24 hours
    }).length;

    // Calculate cognitive load (0.5 to 2.0 range)
    let cognitiveLoad = 1.0;

    // Adjust based on recent performance (poor performance increases load)
    if (recentPerformance < 0.3) cognitiveLoad += 0.4;
    else if (recentPerformance < 0.5) cognitiveLoad += 0.2;
    else if (recentPerformance > 0.8) cognitiveLoad -= 0.2;

    // Adjust based on session frequency (too many sessions increases load)
    if (sessionFrequency > 4) cognitiveLoad += 0.3;
    else if (sessionFrequency > 2) cognitiveLoad += 0.1;

    return Math.max(0.5, Math.min(2.0, cognitiveLoad));
  }

  /**
   * Get optimal study session size based on cognitive load
   */
  getOptimalSessionSize(cognitiveLoad: number, availableCards: number): number {
    let baseSize = 10; // Default session size

    if (cognitiveLoad > 1.5) baseSize = 5; // High load - smaller sessions
    else if (cognitiveLoad > 1.2) baseSize = 7; // Medium-high load
    else if (cognitiveLoad < 0.8) baseSize = 15; // Low load - larger sessions

    return Math.min(baseSize, availableCards);
  }

  /**
   * Predict forgetting probability for a card
   */
  predictForgettingProbability(card: Flashcard): number {
    const now = new Date();
    const daysSinceReview =
      (now.getTime() - card.nextReview.getTime()) / (1000 * 60 * 60 * 24);

    // Simplified forgetting curve based on Ebbinghaus
    const retentionRate = Math.exp(
      -daysSinceReview / (card.interval * card.easeFactor),
    );
    return 1 - Math.max(0, Math.min(1, retentionRate));
  }

  /**
   * Get cards that are at risk of being forgotten soon
   */
  getAtRiskCards(cards: Flashcard[], riskThreshold: number = 0.3): Flashcard[] {
    return cards
      .filter((card) => {
        const forgettingProbability = this.predictForgettingProbability(card);
        return forgettingProbability > riskThreshold && !this.isCardDue(card);
      })
      .sort((a, b) => {
        const aRisk = this.predictForgettingProbability(a);
        const bRisk = this.predictForgettingProbability(b);
        return bRisk - aRisk;
      });
  }
}
