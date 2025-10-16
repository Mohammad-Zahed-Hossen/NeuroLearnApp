/**
 *
 * This replaces the simplified decay model with the advanced FSRS scheduling logic
 * FSRS provides superior adaptivity with high accuracy based on four performance ratings
 */

export interface FSRSCard {
  id: string;
  due: Date;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: CardState;
  last_review?: Date;
}

export interface FSRSReviewLog {
  rating: Rating;
  elapsed_days: number;
  scheduled_days: number;
  review: Date;
  state: CardState;
}

export enum CardState {
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3,
}

export enum Rating {
  Again = 1, // Complete failure, needs immediate re-study
  Hard = 2, // Difficult recall, reduce interval
  Good = 3, // Normal recall, standard interval
  Easy = 4, // Perfect recall, increase interval significantly
}

interface FSRSParameters {
  w: number[]; // 19 FSRS algorithm weights
  requestRetention: number; // Target retention rate (0.9 = 90%)
  maximumInterval: number; // Max days between reviews
  easyBonus: number; // Multiplier for easy responses
  hardInterval: number; // Interval multiplier for hard responses
}

/**
 * Enhanced Spaced Repetition Service implementing the FSRS Algorithm
 * Directly addresses weak memory/forgetting with optimal timing predictions
 */
export class SpacedRepetitionService {
  private static instance: SpacedRepetitionService;

  // FSRS Algorithm Parameters (optimized for cognitive learning)
  private fsrsParams: FSRSParameters = {
    // Optimal weights derived from extensive research data
    w: [
      0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234, 1.616,
      0.1544, 1.0824, 1.9813, 0.0953, 0.2975, 2.2042, 0.2407, 2.9466, 0.5034,
      0.6567,
    ],
    requestRetention: 0.9, // 90% retention target for optimal learning
    maximumInterval: 36500, // 100 years maximum
    easyBonus: 1.3, // 30% bonus for easy recalls
    hardInterval: 1.2, // 20% longer intervals for hard recalls
  };

  public static getInstance(): SpacedRepetitionService {
    if (!SpacedRepetitionService.instance) {
      SpacedRepetitionService.instance = new SpacedRepetitionService();
    }
    return SpacedRepetitionService.instance;
  }

  /**
   * FSRS Core Algorithm: Schedule next review based on performance rating
   * This is the heart of the intelligence engine that replaces scheduleNextReview
   */
  public scheduleNextReviewFSRS(
    card: FSRSCard,
    rating: Rating,
    reviewDate: Date = new Date(),
  ): { card: FSRSCard; logs: FSRSReviewLog[] } {
    const elapsed_days = card.last_review
      ? Math.max(
          0,
          Math.floor(
            (reviewDate.getTime() - card.last_review.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : 0;

    const scheduled_days = card.scheduled_days;

    // Create review log entry
    const reviewLog: FSRSReviewLog = {
      rating,
      elapsed_days,
      scheduled_days,
      review: reviewDate,
      state: card.state,
    };

    let updatedCard = { ...card };
    updatedCard.elapsed_days = elapsed_days;
    updatedCard.last_review = reviewDate;
    updatedCard.reps += 1;

    // FSRS Algorithm Logic based on card state and rating
    switch (card.state) {
      case CardState.New:
        updatedCard = this.handleNewCard(updatedCard, rating);
        break;

      case CardState.Learning:
      case CardState.Relearning:
        updatedCard = this.handleLearningCard(updatedCard, rating);
        break;

      case CardState.Review:
        updatedCard = this.handleReviewCard(updatedCard, rating, elapsed_days);
        break;
    }

    // Calculate due date
    const dueDate = new Date(
      reviewDate.getTime() + updatedCard.scheduled_days * 24 * 60 * 60 * 1000,
    );
    updatedCard.due = dueDate;

    return {
      card: updatedCard,
      logs: [reviewLog],
    };
  }

  /**
   * Handle new card scheduling (first time seeing the card)
   */
  private handleNewCard(card: FSRSCard, rating: Rating): FSRSCard {
    const updatedCard = { ...card };

    // Initialize difficulty and stability for new cards
    updatedCard.difficulty = this.initDifficulty(rating);
    updatedCard.stability = this.initStability(rating);

    switch (rating) {
      case Rating.Again:
        updatedCard.scheduled_days = 0;
        updatedCard.state = CardState.Learning;
        updatedCard.lapses += 1;
        break;

      case Rating.Hard:
        updatedCard.scheduled_days = 1;
        updatedCard.state = CardState.Learning;
        break;

      case Rating.Good:
        updatedCard.scheduled_days = Math.round(updatedCard.stability);
        updatedCard.state = CardState.Review;
        break;

      case Rating.Easy:
        updatedCard.scheduled_days = Math.round(
          updatedCard.stability * this.fsrsParams.easyBonus,
        );
        updatedCard.state = CardState.Review;
        break;
    }

    return updatedCard;
  }

  /**
   * Handle learning/relearning card scheduling
   */
  private handleLearningCard(card: FSRSCard, rating: Rating): FSRSCard {
    const updatedCard = { ...card };

    switch (rating) {
      case Rating.Again:
        updatedCard.scheduled_days = 0;
        updatedCard.lapses += 1;
        break;

      case Rating.Hard:
        updatedCard.scheduled_days = 1;
        break;

      case Rating.Good:
        updatedCard.stability = this.calculateStability(
          updatedCard,
          rating,
          card.elapsed_days,
          true,
        );
        updatedCard.difficulty = this.nextDifficulty(
          updatedCard.difficulty,
          rating,
        );
        updatedCard.scheduled_days = Math.round(updatedCard.stability);
        updatedCard.state = CardState.Review;
        break;

      case Rating.Easy:
        updatedCard.stability = this.calculateStability(
          updatedCard,
          rating,
          card.elapsed_days,
          true,
        );
        updatedCard.difficulty = this.nextDifficulty(
          updatedCard.difficulty,
          rating,
        );
        updatedCard.scheduled_days = Math.round(
          updatedCard.stability * this.fsrsParams.easyBonus,
        );
        updatedCard.state = CardState.Review;
        break;
    }

    return updatedCard;
  }

  /**
   * Handle review card scheduling (mature cards in long-term memory)
   */
  private handleReviewCard(
    card: FSRSCard,
    rating: Rating,
    elapsed_days: number,
  ): FSRSCard {
    const updatedCard = { ...card };

    if (rating === Rating.Again) {
      // Card failed review - back to relearning
      updatedCard.state = CardState.Relearning;
      updatedCard.scheduled_days = 0;
      updatedCard.lapses += 1;

      // Reduce stability significantly for failures
      updatedCard.stability = Math.max(1, updatedCard.stability * 0.7);
      updatedCard.difficulty = Math.min(10, updatedCard.difficulty + 0.2);
    } else {
      // Successful review - update stability and difficulty
      updatedCard.stability = this.calculateStability(
        updatedCard,
        rating,
        elapsed_days,
        false,
      );
      updatedCard.difficulty = this.nextDifficulty(
        updatedCard.difficulty,
        rating,
      );

      // Calculate next interval based on updated stability
      let interval = updatedCard.stability;

      if (rating === Rating.Hard) {
        interval *= this.fsrsParams.hardInterval;
      } else if (rating === Rating.Easy) {
        interval *= this.fsrsParams.easyBonus;
      }

      updatedCard.scheduled_days = Math.min(
        Math.round(interval),
        this.fsrsParams.maximumInterval,
      );
    }

    return updatedCard;
  }

  /**
   * Initialize difficulty for new cards based on first rating
   */
  private initDifficulty(rating: Rating): number {
    const w = this.fsrsParams.w || [];
    const w4 = typeof w[4] === 'number' ? w[4] : 1;
    const w5 = typeof w[5] === 'number' ? w[5] : 0;
    return Math.max(1, Math.min(10, w4 - Math.exp(w5 * (rating - 1)) + 1));
  }

  /**
   * Initialize stability for new cards based on first rating
   */
  private initStability(rating: Rating): number {
    const w = this.fsrsParams.w || [];
    const val = w[rating - 1] ?? 1;
    return Math.max(0.1, val);
  }

  /**
   * Calculate next difficulty based on current difficulty and rating
   */
  private nextDifficulty(currentDifficulty: number, rating: Rating): number {
    const w = this.fsrsParams.w || [];
    const w6 = typeof w[6] === 'number' ? w[6] : 0;
    const delta = -w6 * (rating - 3);
    const nextDifficulty = currentDifficulty + delta;

    return Math.max(1, Math.min(10, nextDifficulty));
  }

  /**
   * Calculate stability using the FSRS formula
   * This is the most complex part of the algorithm - predicts optimal review timing
   */
  private calculateStability(
    card: FSRSCard,
    rating: Rating,
    elapsed_days: number,
    isNewGraduation: boolean,
  ): number {
    const w = this.fsrsParams.w || [];
    const difficulty = typeof card.difficulty === 'number' ? card.difficulty : 5;
    const stability = typeof card.stability === 'number' ? card.stability : 1;

    if (isNewGraduation) {
      // For cards graduating from learning to review
      const w7 = typeof w[7] === 'number' ? w[7] : 1;
      const w8 = typeof w[8] === 'number' ? w[8] : 1;
      const w9 = typeof w[9] === 'number' ? w[9] : 1;
      const w10 = typeof w[10] === 'number' ? w[10] : 0;
      const reps = typeof card.reps === 'number' ? card.reps : 0;
      return Math.max(
        0.1,
        w7 *
          Math.pow(difficulty, -w8) *
          (Math.pow((card.scheduled_days || 0) + 1, w9) - 1) *
          Math.exp(w10 * (1 - reps)),
      );
    } else {
      // For cards already in review
      const retention = this.calculateRetention(stability, elapsed_days);
      const retrievability = Math.exp(
        (Math.log(retention) * elapsed_days) / stability,
      );

      let newStability: number;

      const w11 = typeof w[11] === 'number' ? w[11] : 1;
      const w12 = typeof w[12] === 'number' ? w[12] : 1;
      const w13 = typeof w[13] === 'number' ? w[13] : 1;
      const w14 = typeof w[14] === 'number' ? w[14] : 0;
      const w15 = typeof w[15] === 'number' ? w[15] : 0;
      const w16 = typeof w[16] === 'number' ? w[16] : 0;
      const w17 = typeof w[17] === 'number' ? w[17] : 0;
      const w18 = typeof w[18] === 'number' ? w[18] : 1;

      if (rating === Rating.Again) {
        newStability =
          w11 *
          Math.pow(difficulty, -w12) *
          (Math.pow(stability + 1, w13) - 1) *
          Math.exp(w14 * (1 - retrievability));
      } else {
        const factor = rating - 3 + w16 * (rating === Rating.Easy ? 1 : 0);
        const powBase = Math.max(-100, retrievability - w17);
        newStability =
          stability *
          Math.exp(
            w15 * factor * Math.pow(powBase, w18) * (1 + Math.exp(w17 - retrievability)),
          );
      }

      return Math.max(0.1, newStability);
    }
  }

  /**
   * Calculate retention probability based on stability and elapsed time
   */
  private calculateRetention(stability: number, elapsed_days: number): number {
    if (stability <= 0 || elapsed_days <= 0) return 1.0;
    return Math.exp(-elapsed_days / stability);
  }

  /**
   * Enhanced card due checking with FSRS logic
   * Replaces the simple isCardDue method
   */
  public isCardDueFSRS(
    card: FSRSCard,
    currentDate: Date = new Date(),
  ): boolean {
    return card.due <= currentDate;
  }

  /**
   * Get cards due for review today (FSRS-enhanced)
   * This powers the "Critical Logic Review: X Nodes Due" dashboard feature
   */
  public getCardsDueToday(
    cards: FSRSCard[],
    date: Date = new Date(),
  ): FSRSCard[] {
    return cards.filter((card) => this.isCardDueFSRS(card, date));
  }

  /**
   * Convert legacy flashcard to FSRS card format
   * For backward compatibility with existing data
   */
  public convertLegacyCard(legacyCard: any): FSRSCard {
    return {
      id: legacyCard.id,
      due: legacyCard.nextReview || new Date(),
      stability: this.estimateStabilityFromLegacy(legacyCard),
      difficulty: this.estimateDifficultyFromLegacy(legacyCard),
      elapsed_days: 0,
      scheduled_days: legacyCard.interval || 1,
      reps: legacyCard.repetitions || 0,
      lapses: 0, // Not tracked in legacy format
      state: this.determineStateFromLegacy(legacyCard),
      last_review: legacyCard.lastReviewed,
    };
  }

  /**
   * Estimate stability from legacy ease factor and interval
   */
  private estimateStabilityFromLegacy(legacyCard: any): number {
    const easeFactor = legacyCard.easeFactor || 2.5;
    const interval = legacyCard.interval || 1;

    // Rough estimation: higher ease factor suggests higher stability
    return Math.max(1, interval * (easeFactor / 2.5));
  }

  /**
   * Estimate difficulty from legacy ease factor
   */
  private estimateDifficultyFromLegacy(legacyCard: any): number {
    const easeFactor = legacyCard.easeFactor || 2.5;

    // Lower ease factor suggests higher difficulty
    return Math.max(
      1,
      Math.min(10, 10 - ((easeFactor - 1.3) / (4.0 - 1.3)) * 9),
    );
  }

  /**
   * Determine card state from legacy data
   */
  private determineStateFromLegacy(legacyCard: any): CardState {
    const repetitions = legacyCard.repetitions || 0;
    const interval = legacyCard.interval || 1;

    if (repetitions === 0) return CardState.New;
    if (interval < 4) return CardState.Learning;
    return CardState.Review;
  }

  /**
   * Get optimal study session size based on cognitive load
   * Adaptive session sizing for better learning outcomes
   */
  public getOptimalSessionSize(
    totalDueCards: number,
    cognitiveLoad: number,
    availableTimeMinutes: number = 30,
  ): number {
    // Base session size
    let sessionSize = Math.min(20, totalDueCards);

    // Reduce session size under high cognitive load
    if (cognitiveLoad > 0.7) {
      sessionSize = Math.floor(sessionSize * 0.6);
    } else if (cognitiveLoad > 0.5) {
      sessionSize = Math.floor(sessionSize * 0.8);
    }

    // Adjust for available time (assuming 1.5 minutes per card)
    const timeBasedLimit = Math.floor(availableTimeMinutes / 1.5);
    sessionSize = Math.min(sessionSize, timeBasedLimit);

    return Math.max(5, sessionSize); // Minimum 5 cards per session
  }

  /**
   * Analyze learning patterns and suggest optimization
   * Provides insights for the neural mind map analytics
   */
  public analyzeLearningPatterns(
    cards: FSRSCard[],
    reviewLogs: FSRSReviewLog[],
  ): {
    averageRetention: number;
    difficultCardTypes: string[];
    optimalStudyTimes: string[];
    suggestionForImprovement: string;
  } {
    // Calculate average retention from review success rates
    const totalReviews = reviewLogs.length;
    const successfulReviews = reviewLogs.filter(
      (log) => log.rating >= Rating.Good,
    ).length;
    const averageRetention =
      totalReviews > 0 ? successfulReviews / totalReviews : 0;

    // Identify difficult card patterns
    const difficultCards = cards.filter((card) => card.difficulty > 7);
    const difficultCardTypes = [
      ...new Set(
        difficultCards
          .map((card) => card.id?.split('_')?.[0])
          .filter((type): type is string => type !== undefined),
      ),
    ];

    // Suggest optimal study times (placeholder - could be enhanced with time-based analysis)
    const optimalStudyTimes = ['Morning (8-10 AM)', 'Evening (6-8 PM)'];

    // Generate improvement suggestion
    let suggestionForImprovement = '';
    if (averageRetention < 0.8) {
      suggestionForImprovement =
        'Focus on understanding concepts rather than memorization. Consider breaking complex topics into smaller pieces.';
    } else if (averageRetention > 0.95) {
      suggestionForImprovement =
        'Excellent retention! Consider increasing difficulty or adding more challenging material.';
    } else {
      suggestionForImprovement =
        'Good progress! Maintain consistent daily review sessions for optimal results.';
    }

    return {
      averageRetention,
      difficultCardTypes,
      optimalStudyTimes,
      suggestionForImprovement,
    };
  }

  /**
   * Get due cards (backward compatibility with legacy interface)
   * Converts legacy flashcards to FSRS format and filters due cards
   */
  public getDueCards(flashcards: any[]): any[] {
    const fsrsCards = flashcards.map((card) => this.convertLegacyCard(card));
    const dueCards = this.getCardsDueToday(fsrsCards);

    // Convert back to legacy format for dashboard compatibility
    return dueCards.map((fsrsCard) => {
      const originalCard = flashcards.find((card) => card.id === fsrsCard.id);
      return (
        originalCard || {
          id: fsrsCard.id,
          nextReview: fsrsCard.due,
          difficulty: fsrsCard.difficulty,
          stability: fsrsCard.stability,
        }
      );
    });
  }

  /**
   * Get cards at risk of being forgotten
   * Uses FSRS stability and difficulty to predict forgetting risk
   */
  public getAtRiskCards(flashcards: any[], riskThreshold: number = 0.3): any[] {
    const currentDate = new Date();

    return flashcards.filter((card) => {
      const fsrsCard = this.convertLegacyCard(card);

      // Calculate days until due
      const daysUntilDue = Math.floor(
        (fsrsCard.due.getTime() - currentDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      // Cards are at risk if:
      // 1. High difficulty (> 7)
      // 2. Low stability (< 5 days)
      // 3. Due soon with low predicted retention
      const retention = this.calculateRetention(
        fsrsCard.stability,
        Math.abs(daysUntilDue),
      );

      return (
        fsrsCard.difficulty > 7 ||
        fsrsCard.stability < 5 ||
        (daysUntilDue <= 2 && retention < 1 - riskThreshold)
      );
    });
  }

  /**
   * Calculate cognitive load based on recent study sessions
   * Higher values indicate mental fatigue and need for breaks
   */
  public calculateCognitiveLoad(recentSessions: any[]): number {
    if (recentSessions.length === 0) return 1.0;

    let totalLoad = 0;
    let sessionCount = 0;

    for (const session of recentSessions) {
      if (!session.completed) continue;

      const duration =
        session.endTime && session.startTime
          ? (session.endTime.getTime() - session.startTime.getTime()) /
            (1000 * 60)
          : 25; // Default 25 minutes

      const cardsStudied = session.cardsStudied || 10;
      const sessionLoad = this.calculateSessionLoad(
        duration,
        cardsStudied,
        session.type,
      );

      totalLoad += sessionLoad;
      sessionCount++;
    }

    if (sessionCount === 0) return 1.0;

    const averageLoad = totalLoad / sessionCount;

    // Normalize to 0.5-2.0 range
    // 1.0 = optimal load
    // > 1.5 = high fatigue
    // < 0.8 = could handle more
    return Math.max(0.5, Math.min(2.0, averageLoad));
  }

  /**
   * Calculate load for individual study session
   */
  private calculateSessionLoad(
    durationMinutes: number,
    cardsStudied: number,
    sessionType: string = 'flashcards',
  ): number {
    // Base load factors
    let baseLoad = 1.0;

    // Adjust for session intensity
    const cardsPerMinute = cardsStudied / Math.max(1, durationMinutes);

    if (cardsPerMinute > 1.5) {
      baseLoad += 0.3; // High intensity
    } else if (cardsPerMinute < 0.5) {
      baseLoad -= 0.2; // Low intensity
    }

    // Adjust for session type
    switch (sessionType) {
      case 'flashcards':
        baseLoad *= 1.0; // Standard
        break;
      case 'logic-training':
        baseLoad *= 1.4; // More cognitively demanding
        break;
      case 'speed-reading':
        baseLoad *= 0.8; // Less cognitively demanding
        break;
      case 'focus':
        baseLoad *= 1.2; // Moderate cognitive demand
        break;
    }

    // Duration fatigue factor
    if (durationMinutes > 45) {
      baseLoad += 0.2; // Extended sessions increase fatigue
    } else if (durationMinutes < 15) {
      baseLoad -= 0.1; // Short sessions less fatiguing
    }

    return baseLoad;
  }

  /**
   * Get optimal session size based on cognitive load and due cards
   * Used by dashboard for smart recommendations
   * Duplicate issue
   */
  // public getOptimalSessionSize(
  //   cognitiveLoad: number,
  //   dueCards: number,
  // ): number {
  //   let baseSize = Math.min(15, Math.max(5, dueCards));

  //   // Adjust for cognitive load
  //   if (cognitiveLoad > 1.5) {
  //     baseSize = Math.floor(baseSize * 0.6); // High fatigue - reduce session
  //   } else if (cognitiveLoad > 1.2) {
  //     baseSize = Math.floor(baseSize * 0.8); // Moderate fatigue
  //   } else if (cognitiveLoad < 0.8) {
  //     baseSize = Math.floor(baseSize * 1.3); // Low fatigue - can handle more
  //   }

  //   return Math.max(5, Math.min(20, baseSize));
  // }



  // Backward compatibility methods (delegate to FSRS implementations)
  public scheduleNextReview(
    difficulty: 'again' | 'hard' | 'good' | 'easy' | 'perfect',
    card: any,
  ): any {
    const fsrsCard = this.convertLegacyCard(card);
    const rating = this.convertLegacyDifficultyToRating(difficulty);
    const result = this.scheduleNextReviewFSRS(fsrsCard, rating);

    // Convert back to legacy format with updated values
    return {
      ...card,
      nextReview: result.card.due,
      interval: result.card.scheduled_days,
      easeFactor: Math.max(1.3, 2.5 - (result.card.difficulty - 1) * 0.2), // Convert FSRS difficulty back to ease factor
      repetitions: result.card.reps,
      lastReviewed: result.card.last_review,
    };
  }

  public isCardDue(card: any): boolean {
    const fsrsCard = this.convertLegacyCard(card);
    return this.isCardDueFSRS(fsrsCard);
  }

  private convertLegacyDifficultyToRating(
    difficulty: 'again' | 'hard' | 'good' | 'easy' | 'perfect',
  ): Rating {
    switch (difficulty) {
      case 'again':
        return Rating.Again;
      case 'hard':
        return Rating.Hard;
      case 'good':
        return Rating.Good;
      case 'easy':
      case 'perfect':
        return Rating.Easy;
      default:
        return Rating.Good;
    }
  }
}

export default SpacedRepetitionService;

