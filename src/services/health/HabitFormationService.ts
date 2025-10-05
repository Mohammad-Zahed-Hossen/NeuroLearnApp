import { HybridStorageService } from '../storage/HybridStorageService';
import { differenceInDays, format } from 'date-fns';

interface HabitData {
  id: string;
  userId: string;
  habitType: 'sleep' | 'exercise' | 'nutrition' | 'mindfulness';
  targetBehavior: string;
  frequency: 'daily' | 'weekly' | 'custom';
  difficulty: 1 | 2 | 3 | 4 | 5;
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  triggers: string[];
  rewards: string[];
  createdAt: Date;
}

export class HabitFormationService {
  private storage: HybridStorageService;

  constructor() {
    this.storage = HybridStorageService.getInstance();
  }

  // BJ Fogg Behavior Model Implementation
  async analyzeHabitFormation(userId: string, habitId: string): Promise<{
    motivationLevel: number;
    abilityLevel: number;
    triggerEffectiveness: number;
    behaviorChangeAdvice: string[];
  }> {
    const habit = await this.storage.getHabit(userId, habitId);
    const completionHistory = await this.storage.getHabitCompletionHistory(userId, habitId, 30);

    // Fogg Behavior Model: B = MAT (Behavior = Motivation × Ability × Trigger)
    const motivation = this.assessMotivation(habit, completionHistory);
    const ability = this.assessAbility(habit, completionHistory);
    const triggerEffectiveness = this.assessTriggers(habit, completionHistory);

    return {
      motivationLevel: motivation,
      abilityLevel: ability,
      triggerEffectiveness,
      behaviorChangeAdvice: this.generateBehaviorAdvice(motivation, ability, triggerEffectiveness)
    };
  }

  // Habit Stacking for Health Behaviors
  async suggestHabitStack(userId: string): Promise<{
    anchorHabit: string;
    newHabit: string;
    stackingFormula: string;
    successProbability: number;
  }> {
    const existingHabits = await this.storage.getUserHabits(userId);
    const strongHabits = existingHabits.filter((h: any) => h.completionRate > 0.8 && h.currentStreak > 14);

    if (strongHabits.length === 0) {
      return this.suggestFoundationHabit(userId);
    }

    const bestAnchor = strongHabits.reduce((best: any, habit: any) =>
      habit.completionRate > best.completionRate ? habit : best
    );

    const complementaryHabit = this.findComplementaryHabit(bestAnchor);

    return {
      anchorHabit: bestAnchor.targetBehavior,
      newHabit: complementaryHabit.behavior,
      stackingFormula: `After I ${bestAnchor.targetBehavior}, I will ${complementaryHabit.behavior}`,
      successProbability: this.calculateStackingProbability(bestAnchor, complementaryHabit)
    };
  }

  // Dopamine Optimization for Sustainable Motivation
  async optimizeDopamineRewards(userId: string): Promise<{
    currentDopamineProfile: string;
    recommendedRewardSchedule: 'fixed' | 'variable' | 'progressive';
    specificRewards: string[];
  }> {
    const userProfile = await this.storage.getUserHealthProfile(userId);
    const rewardHistory = await this.storage.getRewardHistory(userId, 30);

    // Analyze current dopamine sensitivity and reward effectiveness
    const dopamineProfile = this.analyzeDopamineProfile(rewardHistory);

    return {
      currentDopamineProfile: dopamineProfile.type,
      recommendedRewardSchedule: this.optimizeRewardSchedule(dopamineProfile),
      specificRewards: this.personalizeRewards(userProfile, dopamineProfile)
    };
  }

  private assessMotivation(habit: HabitData, history: any[]): number {
    // Analyze completion patterns, streaks, and user engagement
    const recentPerformance = history.slice(0, 7).filter(h => h.completed).length / 7;
    const streakConsistency = habit.currentStreak / (habit.longestStreak || 1);
    const difficultyMotivation = (6 - habit.difficulty) / 5; // Easier habits = higher motivation

    return Math.round((recentPerformance * 40 + streakConsistency * 30 + difficultyMotivation * 30));
  }

  private assessAbility(habit: HabitData, history: any[]): number {
    // Measure user's capability to perform the behavior
    const consistencyScore = habit.completionRate * 100;
    const difficultyAdjustment = habit.difficulty * 20;
    const timeConstraints = this.assessTimeConstraints(habit);

    return Math.max(0, Math.min(100, consistencyScore - difficultyAdjustment + timeConstraints));
  }

  private assessTriggers(habit: HabitData, history: any[]): number {
    // Analyze trigger effectiveness based on completion patterns
    const triggerStrength = habit.triggers.length * 10; // More triggers = higher score
    const consistencyAfterTriggers = history.filter((h: any) => h.triggerUsed).length / Math.max(history.length, 1) * 100;
    return Math.min(100, triggerStrength + consistencyAfterTriggers);
  }

  private async suggestFoundationHabit(userId: string): Promise<{
    anchorHabit: string;
    newHabit: string;
    stackingFormula: string;
    successProbability: number;
  }> {
    // Suggest basic habits for beginners
    return {
      anchorHabit: 'Wake up',
      newHabit: 'Drink a glass of water',
      stackingFormula: 'After I wake up, I will drink a glass of water',
      successProbability: 0.85
    };
  }

  private findComplementaryHabit(anchor: HabitData): { behavior: string; type: string } {
    // Find complementary habits based on anchor
    switch (anchor.habitType) {
      case 'sleep':
        return { behavior: 'Morning meditation', type: 'mindfulness' };
      case 'exercise':
        return { behavior: 'Healthy breakfast', type: 'nutrition' };
      case 'nutrition':
        return { behavior: 'Evening walk', type: 'exercise' };
      case 'mindfulness':
        return { behavior: 'Journaling', type: 'mindfulness' };
      default:
        return { behavior: 'Daily gratitude', type: 'mindfulness' };
    }
  }

  private calculateStackingProbability(anchor: HabitData, newHabit: { behavior: string; type: string }): number {
    // Calculate success probability based on anchor strength and habit compatibility
    const anchorStrength = anchor.completionRate;
    const compatibility = 0.8; // Assume good compatibility
    return Math.round((anchorStrength * compatibility) * 100) / 100;
  }

  private analyzeDopamineProfile(rewardHistory: any[]): { type: string; sensitivity: number } {
    // Analyze reward history to determine dopamine profile
    const avgRewards = rewardHistory.length > 0 ? rewardHistory.reduce((sum: number, r: any) => sum + (r.amount || 0), 0) / rewardHistory.length : 0;
    if (avgRewards > 5) return { type: 'high_sensitivity', sensitivity: 0.8 };
    if (avgRewards > 2) return { type: 'moderate_sensitivity', sensitivity: 0.5 };
    return { type: 'low_sensitivity', sensitivity: 0.2 };
  }

  private optimizeRewardSchedule(profile: { type: string; sensitivity: number }): 'fixed' | 'variable' | 'progressive' {
    switch (profile.type) {
      case 'high_sensitivity': return 'variable';
      case 'moderate_sensitivity': return 'progressive';
      default: return 'fixed';
    }
  }

  private personalizeRewards(profile: any, dopamineProfile: { type: string; sensitivity: number }): string[] {
    // Personalize rewards based on profile
    const baseRewards = ['Appreciation note', 'Small treat', 'Extra rest'];
    if (dopamineProfile.type === 'high_sensitivity') {
      return [...baseRewards, 'Social recognition', 'Achievement badge'];
    }
    return baseRewards;
  }

  private assessTimeConstraints(habit: HabitData): number {
    // Assess time constraints - for simplicity, return a fixed value
    return 10; // Assume some time constraint adjustment
  }

  private generateBehaviorAdvice(motivation: number, ability: number, triggers: number): string[] {
    const advice: string[] = [];

    if (motivation < 50) {
      advice.push("Focus on increasing motivation through clear benefits and social support");
      advice.push("Connect this habit to your core values and long-term health goals");
    }

    if (ability < 50) {
      advice.push("Simplify the behavior - start with the smallest possible version");
      advice.push("Remove barriers and optimize your environment for success");
    }

    if (triggers < 50) {
      advice.push("Strengthen your triggers with specific time and location cues");
      advice.push("Use implementation intentions: 'When X happens, I will do Y'");
    }

    return advice;
  }
}
