import { supabase } from '../storage/SupabaseService';
import StorageService from '../storage/StorageService';
import { differenceInDays, format } from 'date-fns';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'health' | 'finance' | 'learning' | 'holistic';
  type: 'streak' | 'milestone' | 'improvement' | 'consistency' | 'challenge';
  criteria: {
    metric: string;
    threshold: number;
    timeframe?: number; // days
    comparison?: 'greater' | 'less' | 'equal' | 'streak';
  };
  rewards: {
    points: number;
    badge?: string;
    unlocks?: string[];
  };
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: Date;
  progress?: number; // 0-1
}

interface UserProgress {
  userId: string;
  totalPoints: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  achievements: Achievement[];
  badges: string[];
  weeklyGoals: Array<{
    id: string;
    description: string;
    target: number;
    current: number;
    category: string;
    deadline: Date;
  }>;
  motivationalState: 'motivated' | 'neutral' | 'struggling' | 'burnout';
}

interface BehaviorPattern {
  userId: string;
  pattern: 'consistent' | 'weekend_warrior' | 'perfectionist' | 'procrastinator' | 'balanced';
  confidence: number;
  recommendations: string[];
  triggers: string[];
  barriers: string[];
}

/**
 * Gamification Service implementing BJ Fogg Behavior Model
 * Motivation × Ability × Trigger = Behavior
 */
export class GamificationService {
  private static instance: GamificationService;
  private hybridStorage: StorageService;
  private achievements: Achievement[] = [];

  static getInstance(): GamificationService {
    if (!GamificationService.instance) {
      GamificationService.instance = new GamificationService();
    }
    return GamificationService.instance;
  }

  private constructor() {
  this.hybridStorage = StorageService.getInstance();
    this.initializeAchievements();
  }

  /**
   * Initialize achievement system with scientific behavior change principles
   */
  private initializeAchievements(): void {
    this.achievements = [
      // Health Achievements
      {
        id: 'sleep_consistency_7',
        title: 'Sleep Rhythm Master',
        description: 'Maintain consistent sleep schedule for 7 days',
        icon: 'sleep',
        category: 'health',
        type: 'streak',
        criteria: { metric: 'sleep_consistency', threshold: 7, comparison: 'streak' },
        rewards: { points: 100, badge: 'sleep_master' },
        rarity: 'common'
      },
      {
        id: 'crdi_improvement',
        title: 'Circadian Optimizer',
        description: 'Improve CRDI score by 20 points',
        icon: 'trending-up',
        category: 'health',
        type: 'improvement',
        criteria: { metric: 'crdi_score', threshold: 20, comparison: 'greater' },
        rewards: { points: 200, badge: 'circadian_master' },
        rarity: 'rare'
      },
      {
        id: 'workout_streak_14',
        title: 'Fitness Warrior',
        description: 'Complete workouts for 14 consecutive days',
        icon: 'dumbbell',
        category: 'health',
        type: 'streak',
        criteria: { metric: 'workout_streak', threshold: 14, comparison: 'streak' },
        rewards: { points: 300, badge: 'fitness_warrior', unlocks: ['advanced_workouts'] },
        rarity: 'epic'
      },

      // Financial Achievements
      {
        id: 'budget_adherence_30',
        title: 'Budget Ninja',
        description: 'Stay within budget for 30 days',
        icon: 'target',
        category: 'finance',
        type: 'consistency',
        criteria: { metric: 'budget_adherence', threshold: 30, timeframe: 30, comparison: 'greater' },
        rewards: { points: 250, badge: 'budget_ninja' },
        rarity: 'rare'
      },
      {
        id: 'savings_milestone_1000',
        title: 'Savings Champion',
        description: 'Save $1000 in a single month',
        icon: 'piggy-bank',
        category: 'finance',
        type: 'milestone',
        criteria: { metric: 'monthly_savings', threshold: 1000, comparison: 'greater' },
        rewards: { points: 500, badge: 'savings_champion' },
        rarity: 'epic'
      },

      // Learning Achievements
      {
        id: 'focus_session_streak_21',
        title: 'Focus Master',
        description: 'Complete focus sessions for 21 days straight',
        icon: 'brain',
        category: 'learning',
        type: 'streak',
        criteria: { metric: 'focus_streak', threshold: 21, comparison: 'streak' },
        rewards: { points: 400, badge: 'focus_master', unlocks: ['advanced_techniques'] },
        rarity: 'epic'
      },
      {
        id: 'cognitive_load_optimization',
        title: 'Mental Efficiency Expert',
        description: 'Maintain cognitive load below 70% for a week',
        icon: 'gauge',
        category: 'learning',
        type: 'consistency',
        criteria: { metric: 'cognitive_load', threshold: 70, timeframe: 7, comparison: 'less' },
        rewards: { points: 200, badge: 'efficiency_expert' },
        rarity: 'rare'
      },

      // Holistic Achievements
      {
        id: 'holistic_balance_7',
        title: 'Life Balance Guru',
        description: 'Achieve balance across health, finance, and learning for 7 days',
        icon: 'balance-scale',
        category: 'holistic',
        type: 'consistency',
        criteria: { metric: 'holistic_balance', threshold: 7, timeframe: 7, comparison: 'greater' },
        rewards: { points: 600, badge: 'balance_guru', unlocks: ['holistic_insights'] },
        rarity: 'legendary'
      },
      {
        id: 'stress_reduction_champion',
        title: 'Zen Master',
        description: 'Reduce stress levels by 30% over 2 weeks',
        icon: 'leaf',
        category: 'holistic',
        type: 'improvement',
        criteria: { metric: 'stress_reduction', threshold: 30, timeframe: 14, comparison: 'greater' },
        rewards: { points: 350, badge: 'zen_master' },
        rarity: 'epic'
      }
    ];
  }

  /**
   * Check and award achievements based on user behavior
   */
  async checkAchievements(userId: string): Promise<{
    newAchievements: Achievement[];
    updatedProgress: UserProgress;
    motivationalTriggers: string[];
  }> {
    try {
      const userProgress = await this.getUserProgress(userId);
      const userMetrics = await this.gatherUserMetrics(userId);
      const newAchievements: Achievement[] = [];
      const motivationalTriggers: string[] = [];

      for (const achievement of this.achievements) {
        if (userProgress.achievements.some(a => a.id === achievement.id)) {
          continue; // Already unlocked
        }

        const progress = await this.calculateAchievementProgress(achievement, userMetrics);
        achievement.progress = progress;

        if (progress >= 1.0) {
          // Achievement unlocked!
          achievement.unlockedAt = new Date();
          newAchievements.push(achievement);
          userProgress.achievements.push(achievement);
          userProgress.totalPoints += achievement.rewards.points;

          if (achievement.rewards.badge) {
            userProgress.badges.push(achievement.rewards.badge);
          }

          // Generate motivational trigger
          motivationalTriggers.push(this.generateAchievementTrigger(achievement));
        }
      }

      // Update user level based on points
      userProgress.level = this.calculateLevel(userProgress.totalPoints);

      // Update motivational state
      userProgress.motivationalState = this.assessMotivationalState(userProgress, userMetrics);

      await this.saveUserProgress(userId, userProgress);

      return {
        newAchievements,
        updatedProgress: userProgress,
        motivationalTriggers
      };
    } catch (error) {
      console.error('Error checking achievements:', error);
      return {
        newAchievements: [],
        updatedProgress: await this.getUserProgress(userId),
        motivationalTriggers: []
      };
    }
  }

  /**
   * Analyze user behavior patterns using BJ Fogg Model
   */
  async analyzeBehaviorPattern(userId: string): Promise<BehaviorPattern> {
    try {
      const metrics = await this.gatherBehaviorMetrics(userId);
      const pattern = this.identifyBehaviorPattern(metrics);
      const recommendations = this.generateBehaviorRecommendations(pattern, metrics);

      return {
        userId,
        pattern: pattern.type,
        confidence: pattern.confidence,
        recommendations,
        triggers: pattern.triggers,
        barriers: pattern.barriers
      };
    } catch (error) {
      console.error('Error analyzing behavior pattern:', error);
      return {
        userId,
        pattern: 'balanced',
        confidence: 0.5,
        recommendations: ['Continue current habits'],
        triggers: [],
        barriers: []
      };
    }
  }

  /**
   * Generate personalized weekly goals based on behavior patterns
   */
  async generateWeeklyGoals(userId: string): Promise<Array<{
    id: string;
    description: string;
    target: number;
    current: number;
    category: string;
    deadline: Date;
    difficulty: 'easy' | 'medium' | 'hard';
    motivation: string;
  }>> {
    try {
      const behaviorPattern = await this.analyzeBehaviorPattern(userId);
      const userProgress = await this.getUserProgress(userId);
      const currentMetrics = await this.gatherUserMetrics(userId);

      const goals = [];

      // Health goal based on pattern
      if (behaviorPattern.pattern === 'consistent') {
        goals.push({
          id: 'health_consistency',
          description: 'Maintain sleep schedule within 30 minutes',
          target: 7,
          current: currentMetrics.sleepConsistencyDays || 0,
          category: 'health',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          difficulty: 'easy' as const,
          motivation: 'You\'re already consistent - keep the momentum!'
        });
      } else if (behaviorPattern.pattern === 'procrastinator') {
        goals.push({
          id: 'health_small_steps',
          description: 'Complete 3 short workouts this week',
          target: 3,
          current: currentMetrics.weeklyWorkouts || 0,
          category: 'health',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          difficulty: 'easy' as const,
          motivation: 'Small steps lead to big changes!'
        });
      }

      // Financial goal
      goals.push({
        id: 'finance_tracking',
        description: 'Track expenses for 5 days',
        target: 5,
        current: currentMetrics.expenseTrackingDays || 0,
        category: 'finance',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        difficulty: 'medium' as const,
        motivation: 'Awareness is the first step to financial freedom!'
      });

      // Learning goal
      goals.push({
        id: 'learning_focus',
        description: 'Complete 4 focused learning sessions',
        target: 4,
        current: currentMetrics.weeklyFocusSessions || 0,
        category: 'learning',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        difficulty: 'medium' as const,
        motivation: 'Your brain grows stronger with each focused session!'
      });

      return goals;
    } catch (error) {
      console.error('Error generating weekly goals:', error);
      return [];
    }
  }

  /**
   * Provide motivational triggers based on BJ Fogg's trigger types
   */
  async getMotivationalTriggers(userId: string): Promise<{
    sparkTriggers: string[]; // Motivate behavior
    facilitatorTriggers: string[]; // Make behavior easier
    signalTriggers: string[]; // Remind to do behavior
  }> {
    try {
      const behaviorPattern = await this.analyzeBehaviorPattern(userId);
      const userProgress = await this.getUserProgress(userId);
      const currentTime = new Date().getHours();

      const sparkTriggers = [];
      const facilitatorTriggers = [];
      const signalTriggers = [];

      // Spark triggers (increase motivation)
      if (userProgress.motivationalState === 'struggling') {
        sparkTriggers.push('🌟 Remember: You\'ve already earned ' + userProgress.totalPoints + ' points this month!');
        sparkTriggers.push('💪 Your longest streak was ' + userProgress.longestStreak + ' days - you can do it again!');
      }

      // Facilitator triggers (make it easier)
      if (behaviorPattern.pattern === 'procrastinator') {
        facilitatorTriggers.push('⏰ Set a 5-minute timer for your next task - that\'s all you need to start!');
        facilitatorTriggers.push('📱 Use the quick-log feature to track habits in under 30 seconds');
      }

      // Signal triggers (reminders)
      if (currentTime >= 22 && currentTime <= 23) {
        signalTriggers.push('🌙 Perfect time to log your sleep and prepare for tomorrow');
      }
      if (currentTime >= 8 && currentTime <= 10) {
        signalTriggers.push('☀️ Morning energy is high - great time for a focus session!');
      }

      return {
        sparkTriggers,
        facilitatorTriggers,
        signalTriggers
      };
    } catch (error) {
      console.error('Error getting motivational triggers:', error);
      return {
        sparkTriggers: [],
        facilitatorTriggers: [],
        signalTriggers: []
      };
    }
  }

  private async calculateAchievementProgress(achievement: Achievement, metrics: any): Promise<number> {
    const { criteria } = achievement;

    switch (criteria.metric) {
      case 'sleep_consistency':
        return Math.min(1, (metrics.sleepConsistencyDays || 0) / criteria.threshold);

      case 'crdi_score':
        const improvement = (metrics.currentCRDI || 0) - (metrics.baselineCRDI || 0);
        return Math.min(1, Math.max(0, improvement / criteria.threshold));

      case 'workout_streak':
        return Math.min(1, (metrics.workoutStreak || 0) / criteria.threshold);

      case 'budget_adherence':
        return Math.min(1, (metrics.budgetAdherenceDays || 0) / criteria.threshold);

      case 'monthly_savings':
        return Math.min(1, (metrics.monthlySavings || 0) / criteria.threshold);

      case 'focus_streak':
        return Math.min(1, (metrics.focusStreak || 0) / criteria.threshold);

      case 'cognitive_load':
        const daysUnderThreshold = metrics.lowCognitiveLoadDays || 0;
        return Math.min(1, daysUnderThreshold / (criteria.timeframe || 7));

      case 'holistic_balance':
        return Math.min(1, (metrics.balancedDays || 0) / criteria.threshold);

      case 'stress_reduction':
        const stressReduction = (metrics.baselineStress || 100) - (metrics.currentStress || 100);
        const targetReduction = (metrics.baselineStress || 100) * (criteria.threshold / 100);
        return Math.min(1, Math.max(0, stressReduction / targetReduction));

      default:
        return 0;
    }
  }

  private async gatherUserMetrics(userId: string): Promise<any> {
    try {
      // Gather metrics from all modules
      const [sleepData, workoutData, budgetData, focusData] = await Promise.all([
        this.getSleepMetrics(userId),
        this.getWorkoutMetrics(userId),
        this.getBudgetMetrics(userId),
        this.getFocusMetrics(userId)
      ]);

      return {
        sleepConsistencyDays: sleepData.consistencyDays,
        currentCRDI: sleepData.crdiScore,
        baselineCRDI: sleepData.baselineCRDI,
        workoutStreak: workoutData.currentStreak,
        weeklyWorkouts: workoutData.weeklyCount,
        budgetAdherenceDays: budgetData.adherenceDays,
        monthlySavings: budgetData.monthlySavings,
        expenseTrackingDays: budgetData.trackingDays,
        focusStreak: focusData.currentStreak,
        weeklyFocusSessions: focusData.weeklyCount,
        lowCognitiveLoadDays: focusData.lowLoadDays,
        balancedDays: this.calculateBalancedDays(sleepData, workoutData, budgetData, focusData),
        currentStress: sleepData.stressLevel,
        baselineStress: sleepData.baselineStress
      };
    } catch (error) {
      console.error('Error gathering user metrics:', error);
      return {};
    }
  }

  private async getSleepMetrics(userId: string): Promise<any> {
    try {
      const { data } = await supabase
        .from('sleep_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (!data || data.length === 0) {
        return { consistencyDays: 0, crdiScore: 50, baselineCRDI: 50, stressLevel: 50, baselineStress: 50 };
      }

      // Calculate sleep consistency
      let consistencyDays = 0;
      for (let i = 1; i < data.length; i++) {
        const current = new Date(data[i-1].bedtime);
        const previous = new Date(data[i].bedtime);
        const timeDiff = Math.abs(current.getTime() - previous.getTime()) / (1000 * 60); // minutes

        if (timeDiff <= 30) { // Within 30 minutes
          consistencyDays++;
        } else {
          break;
        }
      }

      return {
        consistencyDays,
        crdiScore: data[0].crdi_score || 50,
        baselineCRDI: data[data.length - 1]?.crdi_score || 50,
        stressLevel: data[0].stress_level || 50,
        baselineStress: data[data.length - 1]?.stress_level || 50
      };
    } catch (error) {
      console.error('Error getting sleep metrics:', error);
      return { consistencyDays: 0, crdiScore: 50, baselineCRDI: 50, stressLevel: 50, baselineStress: 50 };
    }
  }

  private async getWorkoutMetrics(userId: string): Promise<any> {
    try {
      const { data } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (!data || data.length === 0) {
        return { currentStreak: 0, weeklyCount: 0 };
      }

      // Calculate current streak
      let currentStreak = 0;
      const today = new Date();

      for (const workout of data) {
        const workoutDate = new Date(workout.date);
        const daysDiff = differenceInDays(today, workoutDate);

        if (daysDiff === currentStreak) {
          currentStreak++;
        } else {
          break;
        }
      }

      // Calculate weekly count
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const weeklyCount = data.filter(w => new Date(w.date) >= weekAgo).length;

      return { currentStreak, weeklyCount };
    } catch (error) {
      console.error('Error getting workout metrics:', error);
      return { currentStreak: 0, weeklyCount: 0 };
    }
  }

  private async getBudgetMetrics(userId: string): Promise<any> {
    try {
      // This would integrate with actual budget tracking
      return {
        adherenceDays: 15, // Mock data
        monthlySavings: 500,
        trackingDays: 20
      };
    } catch (error) {
      console.error('Error getting budget metrics:', error);
      return { adherenceDays: 0, monthlySavings: 0, trackingDays: 0 };
    }
  }

  private async getFocusMetrics(userId: string): Promise<any> {
    try {
      const focusSessions = await this.hybridStorage.getFocusSessions();

      // Calculate current streak
      let currentStreak = 0;
      const today = new Date();

      // Calculate weekly count
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const weeklyCount = focusSessions.filter((s: any) => new Date(s.date) >= weekAgo).length;

      // Calculate low cognitive load days
      const lowLoadDays = focusSessions.filter((s: any) => (s.cognitiveLoad || 100) < 70).length;

      return { currentStreak, weeklyCount, lowLoadDays };
    } catch (error) {
      console.error('Error getting focus metrics:', error);
      return { currentStreak: 0, weeklyCount: 0, lowLoadDays: 0 };
    }
  }

  private calculateBalancedDays(...moduleData: any[]): number {
    // Simplified calculation - would need more sophisticated logic
    return Math.min(...moduleData.map(data => Object.values(data).reduce((sum: number, val: any) => sum + (typeof val === 'number' ? val : 0), 0)));
  }

  private async getUserProgress(userId: string): Promise<UserProgress> {
    try {
      const stored = await this.hybridStorage.getUserProgress(userId);
      if (stored) return stored as UserProgress;
    } catch (error) {
      console.error('Error loading user progress via facade:', error);
    }

    return {
      userId,
      totalPoints: 0,
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
      achievements: [],
      badges: [],
      weeklyGoals: [],
      motivationalState: 'neutral'
    };
  }

  private async saveUserProgress(userId: string, progress: UserProgress): Promise<void> {
    try {
      await this.hybridStorage.saveUserProgress(userId, progress);
    } catch (error) {
      console.error('Error saving user progress:', error);
    }
  }

  private calculateLevel(points: number): number {
    // Level progression: 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500...
    let level = 1;
    let requiredPoints = 100;
    let totalRequired = 0;

    while (totalRequired + requiredPoints <= points) {
      totalRequired += requiredPoints;
      level++;
      requiredPoints += 200; // Increasing difficulty
    }

    return level;
  }

  private assessMotivationalState(progress: UserProgress, metrics: any): 'motivated' | 'neutral' | 'struggling' | 'burnout' {
    const recentAchievements = progress.achievements.filter(a =>
      a.unlockedAt && differenceInDays(new Date(), a.unlockedAt) <= 7
    ).length;

    const streakRatio = progress.currentStreak / Math.max(1, progress.longestStreak);

    if (recentAchievements >= 2 && streakRatio > 0.8) return 'motivated';
    if (recentAchievements === 0 && streakRatio < 0.3) return 'struggling';
    if (progress.currentStreak === 0 && progress.longestStreak > 10) return 'burnout';

    return 'neutral';
  }

  private generateAchievementTrigger(achievement: Achievement): string {
    const rarityEmojis = {
      common: '🎉',
      rare: '⭐',
      epic: '🏆',
      legendary: '👑'
    };

    return `${rarityEmojis[achievement.rarity]} Achievement Unlocked: ${achievement.title}! ${achievement.description}`;
  }

  private async gatherBehaviorMetrics(userId: string): Promise<any> {
    // Gather comprehensive behavior data for pattern analysis
    const metrics = await this.gatherUserMetrics(userId);

    return {
      consistency: this.calculateConsistencyScore(metrics),
      weekendActivity: this.calculateWeekendActivity(metrics),
      perfectionism: this.calculatePerfectionismScore(metrics),
      procrastination: this.calculateProcrastinationScore(metrics),
      balance: this.calculateBalanceScore(metrics)
    };
  }

  private identifyBehaviorPattern(metrics: any): { type: BehaviorPattern['pattern']; confidence: number; triggers: string[]; barriers: string[] } {
    const scores = {
      consistent: metrics.consistency,
      weekend_warrior: metrics.weekendActivity,
      perfectionist: metrics.perfectionism,
      procrastinator: metrics.procrastination,
      balanced: metrics.balance
    };

    const maxScore = Math.max(...Object.values(scores));
    const pattern = Object.keys(scores).find(key => scores[key as keyof typeof scores] === maxScore) as BehaviorPattern['pattern'];

    return {
      type: pattern,
      confidence: maxScore,
      triggers: this.getPatternTriggers(pattern),
      barriers: this.getPatternBarriers(pattern)
    };
  }

  private calculateConsistencyScore(metrics: any): number {
    // High consistency if user maintains regular patterns
    const consistencyFactors = [
      metrics.sleepConsistencyDays / 7,
      metrics.workoutStreak / 14,
      metrics.focusStreak / 7
    ];

    return consistencyFactors.reduce((sum, factor) => sum + Math.min(1, factor), 0) / consistencyFactors.length;
  }

  private calculateWeekendActivity(metrics: any): number {
    // Would need weekend-specific data to calculate properly
    return 0.5; // Placeholder
  }

  private calculatePerfectionismScore(metrics: any): number {
    // High scores but inconsistent patterns suggest perfectionism
    const highStandards = (metrics.currentCRDI > 80 ? 1 : 0) + (metrics.weeklyFocusSessions > 5 ? 1 : 0);
    const inconsistency = metrics.workoutStreak < 3 ? 1 : 0;

    return (highStandards + inconsistency) / 3;
  }

  private calculateProcrastinationScore(metrics: any): number {
    // Low streaks but occasional high performance
    const lowStreaks = (metrics.workoutStreak < 3 ? 1 : 0) + (metrics.focusStreak < 3 ? 1 : 0);
    const occasionalHigh = metrics.weeklyFocusSessions > 3 ? 1 : 0;

    return (lowStreaks + (1 - occasionalHigh)) / 3;
  }

  private calculateBalanceScore(metrics: any): number {
    // Moderate performance across all areas
    const balanceFactors = [
      Math.min(1, metrics.sleepConsistencyDays / 5),
      Math.min(1, metrics.weeklyWorkouts / 3),
      Math.min(1, metrics.weeklyFocusSessions / 3),
      Math.min(1, metrics.budgetAdherenceDays / 20)
    ];

    const variance = this.calculateVariance(balanceFactors);
    return 1 - variance; // Lower variance = better balance
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  private getPatternTriggers(pattern: BehaviorPattern['pattern']): string[] {
    const triggers = {
      consistent: ['Daily reminders', 'Routine anchors', 'Progress tracking'],
      weekend_warrior: ['Weekend planning', 'Batch scheduling', 'Recovery reminders'],
      perfectionist: ['Progress over perfection', 'Small wins celebration', 'Flexibility reminders'],
      procrastinator: ['Tiny habits', 'Implementation intentions', 'Accountability partners'],
      balanced: ['Variety in activities', 'Cross-training', 'Holistic progress tracking']
    };

    return triggers[pattern] || [];
  }

  private getPatternBarriers(pattern: BehaviorPattern['pattern']): string[] {
    const barriers = {
      consistent: ['Boredom', 'Lack of variety', 'Plateau effects'],
      weekend_warrior: ['Weekday fatigue', 'All-or-nothing thinking', 'Recovery neglect'],
      perfectionist: ['Fear of failure', 'All-or-nothing mindset', 'Burnout risk'],
      procrastinator: ['Overwhelm', 'Lack of clarity', 'Perfectionism'],
      balanced: ['Lack of focus', 'Spreading too thin', 'Decision fatigue']
    };

    return barriers[pattern] || [];
  }

  private generateBehaviorRecommendations(pattern: { type: BehaviorPattern['pattern']; confidence: number }, metrics: any): string[] {
    const recommendations = {
      consistent: [
        'Add variety to prevent boredom',
        'Set progressive challenges',
        'Celebrate consistency milestones'
      ],
      weekend_warrior: [
        'Plan lighter weekday activities',
        'Focus on recovery between intense sessions',
        'Build sustainable daily habits'
      ],
      perfectionist: [
        'Embrace "good enough" progress',
        'Set minimum viable habits',
        'Practice self-compassion'
      ],
      procrastinator: [
        'Start with 2-minute habits',
        'Use implementation intentions',
        'Remove barriers to starting'
      ],
      balanced: [
        'Maintain current approach',
        'Consider specializing in one area',
        'Track holistic progress'
      ]
    };

    return recommendations[pattern.type] || [];
  }
}

export default GamificationService;
