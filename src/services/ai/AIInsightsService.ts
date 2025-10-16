import { supabase } from '../storage/SupabaseService';
import StorageService from '../storage/StorageService';

interface FinancialData {
  totalIncome: number;
  totalExpenses: number;
  categoryBreakdown: Record<string, number>;
  budgetStatus: Array<{ category: string; spent: number; limit: number }>;
}

interface WellnessData {
  avgSleep: number;
  workoutFrequency: number;
  healthScore: number;
  trends: number[];
}

interface LearningData {
  activeNodes: number;
  masteryDistribution: Record<string, number>;
  studyStreak: number;
  cognitiveLoad: number;
  learningGoals: string[];
}

interface HolisticUserData {
  // Financial data
  monthlyIncome: number;
  monthlyExpenses: number;
  categoryBreakdown: Record<string, number>;
  budgetStatus: Array<{
    category: string;
    spent: number;
    limit: number;
    utilization: number;
  }>;
  savingsRate: number;

  // Health data
  healthMetrics: {
    crdiScore: number;
    sleepQuality: number;
    exerciseFrequency: number;
    stressLevel: number;
    recoveryScore: number;
  };

  // Learning data
  learningMetrics: LearningData;

  // Temporal context
  timeOfDay: number;
  dayOfWeek: string;
  currentMonth: string;
}

interface AIInsight {
  user_id: string;
  insight_type: string;
  content: string;
  generated_at: string;
}

export class AIInsightsService {
  private static instance: AIInsightsService;
  private hybridStorage: StorageService;

  static getInstance(): AIInsightsService {
    if (!AIInsightsService.instance) {
      AIInsightsService.instance = new AIInsightsService();
    }
    return AIInsightsService.instance;
  }

  private constructor() {
    this.hybridStorage = StorageService.getInstance();
  }

  async generateFinancialInsights(userId: string): Promise<string[]> {
    try {
      const data = await this.getFinancialData(userId);
  const insights: string[] = [];

      // Spending pattern analysis
      const categoryEntries = Object.entries(data.categoryBreakdown || {});
      const topCategory = categoryEntries.length > 0
        ? categoryEntries.sort(([,a], [,b]) => b - a)[0]
        : undefined;

      if (topCategory && topCategory[1] != null) {
        const amount = Number(topCategory[1]) || 0;
        insights.push(`Your highest spending category is ${topCategory[0]} at ৳${amount.toLocaleString()}`);
      }

      // Budget analysis
      const overBudget = (data.budgetStatus || []).filter(b => (b.spent || 0) > (b.limit || 0));
      if (overBudget.length > 0) {
        const firstOver = overBudget[0];
        const firstCategory = firstOver && firstOver.category ? firstOver.category : 'some';
        insights.push(`You're over budget in ${overBudget.length} categories. Consider reducing ${firstCategory} expenses.`);
      }

      // Savings potential
      const netAmount = data.totalIncome - data.totalExpenses;
      if (netAmount > 0) {
        insights.push(`Great job! You saved ৳${netAmount.toLocaleString()} this month. Consider investing this surplus.`);
      } else {
        insights.push(`You spent ৳${Math.abs(netAmount).toLocaleString()} more than you earned. Review your expenses.`);
      }

      return insights;
    } catch (error) {
      console.error('Error generating financial insights:', error);
      return ['Unable to generate insights at this time.'];
    }
  }

  async generateWellnessInsights(userId: string): Promise<string[]> {
    try {
      const data = await this.getWellnessData(userId);
  const insights: string[] = [];

      // Sleep analysis
      if (data.avgSleep < 7) {
        insights.push(`You're averaging ${data.avgSleep.toFixed(1)} hours of sleep. Aim for 7-9 hours for optimal health.`);
      } else if (data.avgSleep > 9) {
        insights.push(`You're sleeping ${data.avgSleep.toFixed(1)} hours on average. This might indicate oversleeping.`);
      } else {
        insights.push(`Excellent! Your sleep average of ${data.avgSleep.toFixed(1)} hours is in the healthy range.`);
      }

      // Workout frequency
      if (data.workoutFrequency < 3) {
        insights.push(`You worked out ${data.workoutFrequency} times this week. Try to aim for at least 3-4 sessions.`);
      } else {
        insights.push(`Great consistency! ${data.workoutFrequency} workouts this week shows dedication to your health.`);
      }

      // Health score trend
      const recentTrend = (data.trends || []).slice(-3);
      const firstTrend = recentTrend.length > 0 ? (recentTrend[0] ?? 0) : 0;
      const lastTrend = recentTrend.length > 0 ? (recentTrend[recentTrend.length - 1] ?? 0) : 0;
      const isImproving = recentTrend.length >= 2 ? (lastTrend > firstTrend) : false;

      if (isImproving) {
        insights.push(`Your health score is trending upward! Keep up the great work.`);
      } else {
        insights.push(`Your health score has dipped recently. Focus on consistent sleep and exercise.`);
      }

      return insights;
    } catch (error) {
      console.error('Error generating wellness insights:', error);
      return ['Unable to generate wellness insights at this time.'];
    }
  }

  async generateCombinedInsights(userId: string): Promise<string[]> {
    try {
      const [financialInsights, wellnessInsights] = await Promise.all([
        this.generateFinancialInsights(userId),
        this.generateWellnessInsights(userId)
      ]);

      const combined = [
        '🎯 **Weekly Summary**',
        ...financialInsights.slice(0, 2),
        ...wellnessInsights.slice(0, 2),
        '',
        '💡 **Recommendations**',
        'Consider setting aside 10% of your income for health-related expenses.',
        'Regular exercise can improve both physical health and financial discipline.',
      ];

      return combined;
    } catch (error) {
      console.error('Error generating combined insights:', error);
      return ['Unable to generate insights at this time.'];
    }
  }

  async getFinancialData(userId: string): Promise<FinancialData> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', thirtyDaysAgo);

    // Get budgets
    const { data: budgets } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    const totalIncome = transactions?.filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

    const totalExpenses = transactions?.filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

    const categoryBreakdown = transactions?.filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + parseFloat(t.amount);
        return acc;
      }, {} as Record<string, number>) || {};

    const budgetStatus = budgets?.map(budget => {
      const spent = transactions?.filter(t =>
        t.type === 'expense' &&
        t.category === budget.category &&
        t.date >= budget.start_date &&
        t.date <= budget.end_date
      ).reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

      return {
        category: budget.category,
        spent,
        limit: budget.amount,
      };
    }) || [];

    return {
      totalIncome,
      totalExpenses,
      categoryBreakdown,
      budgetStatus,
    };
  }

  private async getWellnessData(userId: string): Promise<WellnessData> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get sleep logs
    const { data: sleepLogs } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('date', sevenDaysAgo);

    // Get workout logs
    const { data: workoutLogs } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('date', sevenDaysAgo);

    const avgSleep = sleepLogs && sleepLogs.length > 0
      ? sleepLogs.reduce((sum, log) => sum + log.duration, 0) / sleepLogs.length
      : 0;

    const workoutFrequency = workoutLogs?.length || 0;

    // Calculate health score (simplified)
    const sleepScore = Math.min(avgSleep / 8 * 100, 100);
    const workoutScore = Math.min(workoutFrequency / 4 * 100, 100);
    const healthScore = (sleepScore + workoutScore) / 2;

    // Generate trend data (simplified)
    const trends = Array.from({ length: 7 }, (_, i) => {
      const baseScore = healthScore;
      const variation = (Math.random() - 0.5) * 20;
      return Math.max(0, Math.min(100, baseScore + variation));
    });

    return {
      avgSleep,
      workoutFrequency,
      healthScore,
      trends,
    };
  }

  /**
   * Gather comprehensive holistic data from all modules
   */
  async gatherHolisticData(userId: string): Promise<HolisticUserData> {
    try {
      // Financial data
      const financialData = await this.getFinancialData(userId);

      // Health data
      const healthData = await this.gatherHealthData(userId);

      // Learning data
      const learningData = await this.gatherLearningData(userId);

      const now = new Date();

      return {
        monthlyIncome: financialData.totalIncome,
        monthlyExpenses: financialData.totalExpenses,
        categoryBreakdown: financialData.categoryBreakdown,
        budgetStatus: financialData.budgetStatus.map(b => ({
          ...b,
          utilization: b.limit > 0 ? (b.spent / b.limit) * 100 : 0
        })),
        savingsRate: financialData.totalIncome > 0 ?
          ((financialData.totalIncome - financialData.totalExpenses) / financialData.totalIncome) * 100 : 0,

        healthMetrics: healthData,
        learningMetrics: learningData,

        timeOfDay: now.getHours(),
        dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
        currentMonth: now.toLocaleDateString('en-US', { month: 'long' })
      };
    } catch (error) {
      console.error('Error gathering holistic data:', error);
      throw error;
    }
  }

  private async gatherHealthData(userId: string): Promise<HolisticUserData['healthMetrics']> {
    try {
      // Get health metrics from hybrid storage
      const healthMetrics = await this.hybridStorage.getHealthMetrics?.(userId) || {};

      return {
        crdiScore: healthMetrics.crdiScore || 50,
        sleepQuality: healthMetrics.avgSleepQuality || 3,
        exerciseFrequency: healthMetrics.weeklyWorkouts || 0,
        stressLevel: healthMetrics.stressLevel || 50,
        recoveryScore: healthMetrics.recoveryScore || 50
      };
    } catch (error) {
      console.error('Error gathering health data:', error);
      return {
        crdiScore: 50,
        sleepQuality: 3,
        exerciseFrequency: 0,
        stressLevel: 50,
        recoveryScore: 50
      };
    }
  }

  private async gatherLearningData(userId: string): Promise<LearningData> {
    try {
      // Get data from MindMapGeneratorService via hybrid storage
      const hybridStorageAny = this.hybridStorage as any;
      const graph = await hybridStorageAny.getNeuralGraph?.() || null;
      const studySessions = await hybridStorageAny.getStudySessions?.() || [];

      return {
        activeNodes: graph?.nodes?.filter((n: any) => n.isActive)?.length || 0,
        masteryDistribution: this.calculateMasteryDistribution(graph?.nodes || []),
        studyStreak: this.calculateStudyStreak(studySessions),
        cognitiveLoad: graph?.nodes?.reduce((sum: number, n: any) => sum + (n.cognitiveLoad || 0), 0) / (graph?.nodes?.length || 1) || 0,
        learningGoals: this.extractLearningGoals(graph?.nodes || [])
      };
    } catch (error) {
      console.error('Error gathering learning data:', error);
      return {
        activeNodes: 0,
        masteryDistribution: {},
        studyStreak: 0,
        cognitiveLoad: 0.5,
        learningGoals: []
      };
    }
  }

  // Helper methods for learning data processing
  private calculateMasteryDistribution(nodes: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    nodes.forEach(node => {
      const level = node.masteryLevel || 0;
      const category = level < 0.3 ? 'beginner' :
                     level < 0.7 ? 'intermediate' : 'advanced';
      distribution[category] = (distribution[category] || 0) + 1;
    });

    return distribution;
  }

  private calculateStudyStreak(sessions: any[]): number {
    if (sessions.length === 0) return 0;

    const today = new Date();
    let streak = 0;

    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = checkDate.toISOString().split('T')[0];

      const hasSession = sessions.some(session =>
        session.date?.startsWith(dateStr)
      );

      if (hasSession) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private extractLearningGoals(nodes: any[]): string[] {
    return nodes
      .filter(node => node.type === 'goal' || node.category === 'goal')
      .map(node => node.label || node.content)
      .slice(0, 3);
  }

  async storeInsight(userId: string, type: string, content: string): Promise<void> {
    try {
      await supabase
        .from('ai_insights')
        .insert({
          user_id: userId,
          insight_type: type,
          content,
          generated_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error storing insight:', error);
    }
  }
}

export default AIInsightsService;
