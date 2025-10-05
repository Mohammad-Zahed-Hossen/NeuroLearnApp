import { supabase } from '../storage/SupabaseService';
import HybridStorageService from '../storage/HybridStorageService';
import AIInsightsService from '../ai/AIInsightsService';
import { CircadianIntelligenceService } from '../health/CircadianIntelligenceService';

interface HealthMetrics {
  crdiScore: number;
  sleepQuality: number;
  exerciseFrequency: number;
  stressLevel: number;
  recoveryScore: number;
  circadianPhase: 'peak' | 'optimal' | 'low';
  overallHealth: number;
}

interface FinancialStressIndicators {
  budgetPressure: number; // 0-1 scale
  spendingAnxiety: number; // 0-1 scale
  savingsConfidence: number; // 0-1 scale
  debtBurden: number; // 0-1 scale
  financialHealth: number; // 0-1 scale
}

interface CrossModuleData {
  healthMetrics: HealthMetrics;
  financialStress: FinancialStressIndicators;
  cognitiveLoad: number;
  holisticInsights: string[];
  recommendations: string[];
}

class CrossModuleBridgeService {
  private static instance: CrossModuleBridgeService;
  private hybridStorage: HybridStorageService;
  private aiInsights: AIInsightsService;
  private circadianService: CircadianIntelligenceService;

  static getInstance(): CrossModuleBridgeService {
    if (!CrossModuleBridgeService.instance) {
      CrossModuleBridgeService.instance = new CrossModuleBridgeService();
    }
    return CrossModuleBridgeService.instance;
  }

  private constructor() {
    this.hybridStorage = HybridStorageService.getInstance();
    this.aiInsights = AIInsightsService.getInstance();
    this.circadianService = CircadianIntelligenceService.getInstance();
  }

  /**
   * Get comprehensive health metrics from all health-related modules
   */
  async getHealthMetrics(userId: string): Promise<HealthMetrics> {
    try {
      // Get data from multiple health sources
      const [sleepData, workoutData, circadianData, stressData] = await Promise.all([
        this.getSleepMetrics(userId),
        this.getWorkoutMetrics(userId),
        this.circadianService.getHealthMetrics(userId),
        this.getStressMetrics(userId),
      ]);

      // Calculate CRDI score (Circadian Rhythm Disruption Index)
      const crdiScore = this.calculateCRDIScore(sleepData, circadianData);

      // Calculate overall health score
      const overallHealth = this.calculateOverallHealthScore(
        sleepData,
        workoutData,
        stressData,
        crdiScore
      );

      // Determine circadian phase based on recovery status
      const circadianPhase = circadianData?.recoveryStatus === 'fatigued' ? 'low' :
                            circadianData?.recoveryStatus === 'recovered' ? 'peak' : 'optimal';

      return {
        crdiScore,
        sleepQuality: sleepData.quality,
        exerciseFrequency: workoutData.frequency,
        stressLevel: stressData.level,
        recoveryScore: stressData.recovery,
        circadianPhase,
        overallHealth,
      };
    } catch (error) {
      console.error('Error getting health metrics:', error);
      return this.getDefaultHealthMetrics();
    }
  }

  /**
   * Get financial stress indicators
   */
  async getFinancialStressIndicators(userId: string): Promise<FinancialStressIndicators> {
    try {
      const financialData = await this.aiInsights.getFinancialData(userId);

      // Calculate budget pressure (over-budget categories / total categories)
      const overBudgetCategories = financialData.budgetStatus.filter(b => b.spent > b.limit).length;
      const budgetPressure = financialData.budgetStatus.length > 0
        ? overBudgetCategories / financialData.budgetStatus.length
        : 0;

      // Calculate spending anxiety based on expense volatility
      const spendingAnxiety = this.calculateSpendingAnxiety(financialData);

      // Calculate savings confidence
      const savingsConfidence = financialData.totalIncome > 0
        ? Math.min(1, (financialData.totalIncome - financialData.totalExpenses) / financialData.totalIncome)
        : 0;

      // Calculate debt burden (simplified - would need actual debt data)
      const debtBurden = Math.max(0, Math.min(1, (financialData.totalExpenses * 0.1) / financialData.totalIncome));

      // Overall financial health
      const financialHealth = (savingsConfidence + (1 - budgetPressure) + (1 - spendingAnxiety) + (1 - debtBurden)) / 4;

      return {
        budgetPressure,
        spendingAnxiety,
        savingsConfidence,
        debtBurden,
        financialHealth,
      };
    } catch (error) {
      console.error('Error getting financial stress indicators:', error);
      return this.getDefaultFinancialStressIndicators();
    }
  }

  /**
   * Get integrated cognitive load based on health and financial stress
   */
  async getIntegratedCognitiveLoad(userId: string): Promise<number> {
    try {
      const [healthMetrics, financialStress] = await Promise.all([
        this.getHealthMetrics(userId),
        this.getFinancialStressIndicators(userId),
      ]);

      // Base cognitive load from health factors
      let cognitiveLoad = 0.5;

      // Health factors
      if (healthMetrics.stressLevel > 0.7) cognitiveLoad += 0.2;
      if (healthMetrics.sleepQuality < 0.5) cognitiveLoad += 0.15;
      if (healthMetrics.exerciseFrequency < 2) cognitiveLoad += 0.1;
      if (healthMetrics.circadianPhase === 'low') cognitiveLoad += 0.1;

      // Financial stress factors
      if (financialStress.budgetPressure > 0.5) cognitiveLoad += 0.15;
      if (financialStress.spendingAnxiety > 0.7) cognitiveLoad += 0.1;
      if (financialStress.debtBurden > 0.6) cognitiveLoad += 0.1;

      // Normalize to 0-1 range
      return Math.max(0, Math.min(1, cognitiveLoad));
    } catch (error) {
      console.error('Error calculating integrated cognitive load:', error);
      return 0.5;
    }
  }

  /**
   * Get holistic insights combining health and financial data
   */
  async getHolisticInsights(userId: string): Promise<CrossModuleData> {
    try {
      const [healthMetrics, financialStress, cognitiveLoad] = await Promise.all([
        this.getHealthMetrics(userId),
        this.getFinancialStressIndicators(userId),
        this.getIntegratedCognitiveLoad(userId),
      ]);

      const holisticInsights = await this.generateHolisticInsights(
        healthMetrics,
        financialStress,
        cognitiveLoad
      );

      const recommendations = await this.generateCrossModuleRecommendations(
        healthMetrics,
        financialStress,
        cognitiveLoad
      );

      return {
        healthMetrics,
        financialStress,
        cognitiveLoad,
        holisticInsights,
        recommendations,
      };
    } catch (error) {
      console.error('Error getting holistic insights:', error);
      return this.getDefaultCrossModuleData();
    }
  }

  /**
   * Generate insights that connect health and financial wellness
   */
  private async generateHolisticInsights(
    health: HealthMetrics,
    finance: FinancialStressIndicators,
    cognitiveLoad: number
  ): Promise<string[]> {
    const insights: string[] = [];

    // Health-Finance connections
    if (health.stressLevel > 0.7 && finance.budgetPressure > 0.5) {
      insights.push('💰 High financial stress may be impacting your health. Consider stress-reduction techniques alongside budget management.');
    }

    if (health.sleepQuality < 0.5 && finance.spendingAnxiety > 0.6) {
      insights.push('😴 Poor sleep quality combined with financial anxiety creates a vicious cycle. Prioritize rest and financial planning.');
    }

    if (health.exerciseFrequency < 2 && finance.savingsConfidence < 0.3) {
      insights.push('🏃‍♂️ Regular exercise could improve both physical health and financial discipline. Small consistent steps help both areas.');
    }

    // Cognitive load insights
    if (cognitiveLoad > 0.8) {
      insights.push('🧠 High cognitive load detected. Consider breaking complex tasks into smaller steps and ensuring adequate rest.');
    }

    // Positive correlations
    if (health.overallHealth > 0.8 && finance.financialHealth > 0.7) {
      insights.push('🌟 Excellent overall wellness! Your health and financial habits are supporting each other beautifully.');
    }

    return insights;
  }

  /**
   * Generate cross-module recommendations
   */
  private async generateCrossModuleRecommendations(
    health: HealthMetrics,
    finance: FinancialStressIndicators,
    cognitiveLoad: number
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // High stress + financial pressure
    if (health.stressLevel > 0.7 && finance.budgetPressure > 0.5) {
      recommendations.push('Consider mindfulness apps or meditation to manage stress while reviewing your budget categories.');
      recommendations.push('Small financial wins (like paying off one credit card) can significantly reduce stress levels.');
    }

    // Sleep issues + spending anxiety
    if (health.sleepQuality < 0.5 && finance.spendingAnxiety > 0.6) {
      recommendations.push('Establish a consistent sleep schedule and create a "financial worry time" to contain anxiety.');
      recommendations.push('Try relaxation techniques before bed to improve sleep and reduce impulsive spending.');
    }

    // Low exercise + low savings confidence
    if (health.exerciseFrequency < 2 && finance.savingsConfidence < 0.3) {
      recommendations.push('Start with short walks while setting up automatic savings transfers.');
      recommendations.push('Exercise can boost confidence and discipline needed for consistent saving habits.');
    }

    // High cognitive load
    if (cognitiveLoad > 0.8) {
      recommendations.push('Break complex financial decisions into smaller steps when cognitive load is high.');
      recommendations.push('Use health tracking to identify optimal times for important financial planning.');
    }

    return recommendations;
  }

  // Helper methods for data retrieval
  private async getSleepMetrics(userId: string): Promise<{ quality: number; duration: number }> {
    try {
      const { data: sleepLogs } = await supabase
        .from('sleep_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false })
        .limit(7);

      if (!sleepLogs || sleepLogs.length === 0) {
        return { quality: 0.5, duration: 7 };
      }

      const avgQuality = sleepLogs.reduce((sum, log) => sum + (log.quality || 3), 0) / sleepLogs.length / 5; // Normalize 1-5 to 0-1
      const avgDuration = sleepLogs.reduce((sum, log) => sum + (log.duration || 7), 0) / sleepLogs.length;

      return { quality: avgQuality, duration: avgDuration };
    } catch (error) {
      console.error('Error getting sleep metrics:', error);
      return { quality: 0.5, duration: 7 };
    }
  }

  private async getWorkoutMetrics(userId: string): Promise<{ frequency: number; intensity: number }> {
    try {
      const { data: workoutLogs } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      const frequency = workoutLogs?.length || 0;
      const avgIntensity = workoutLogs && workoutLogs.length > 0
        ? workoutLogs.reduce((sum, log) => sum + (log.intensity || 3), 0) / workoutLogs.length / 5
        : 0.5;

      return { frequency, intensity: avgIntensity };
    } catch (error) {
      console.error('Error getting workout metrics:', error);
      return { frequency: 0, intensity: 0.5 };
    }
  }

  private async getStressMetrics(userId: string): Promise<{ level: number; recovery: number }> {
    try {
      // Get recent stress indicators from health logs
      const { data: healthLogs } = await supabase
        .from('health_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (!healthLogs || healthLogs.length === 0) {
        return { level: 0.5, recovery: 0.5 };
      }

      const avgStress = healthLogs.reduce((sum, log) => sum + (log.stress_level || 50), 0) / healthLogs.length / 100;
      const avgRecovery = healthLogs.reduce((sum, log) => sum + (log.recovery_score || 50), 0) / healthLogs.length / 100;

      return { level: avgStress, recovery: avgRecovery };
    } catch (error) {
      console.error('Error getting stress metrics:', error);
      return { level: 0.5, recovery: 0.5 };
    }
  }

  private calculateCRDIScore(sleepData: any, circadianData: any): number {
    // Simplified CRDI calculation based on sleep consistency and circadian alignment
    const sleepConsistency = sleepData.quality || 0.5;
    const circadianAlignment = circadianData?.recoveryStatus === 'recovered' ? 1 :
                              circadianData?.recoveryStatus === 'normal' ? 0.7 : 0.3;

    return (sleepConsistency + circadianAlignment) / 2;
  }

  private calculateOverallHealthScore(
    sleepData: any,
    workoutData: any,
    stressData: any,
    crdiScore: number
  ): number {
    const sleepScore = sleepData.quality || 0.5;
    const exerciseScore = Math.min(1, workoutData.frequency / 5); // Normalize to 5 workouts/week
    const stressScore = 1 - stressData.level; // Invert stress level

    return (sleepScore + exerciseScore + stressScore + crdiScore) / 4;
  }

  private calculateSpendingAnxiety(financialData: any): number {
    // Simplified calculation based on expense volatility and budget adherence
    const overBudgetRatio = financialData.budgetStatus.filter((b: any) => b.spent > b.limit).length / financialData.budgetStatus.length;
    const expenseVolatility = 0.5; // Would need historical data for real calculation

    return (overBudgetRatio + expenseVolatility) / 2;
  }

  private getDefaultHealthMetrics(): HealthMetrics {
    return {
      crdiScore: 0.5,
      sleepQuality: 0.5,
      exerciseFrequency: 2,
      stressLevel: 0.5,
      recoveryScore: 0.5,
      circadianPhase: 'optimal',
      overallHealth: 0.5,
    };
  }

  private getDefaultFinancialStressIndicators(): FinancialStressIndicators {
    return {
      budgetPressure: 0.5,
      spendingAnxiety: 0.5,
      savingsConfidence: 0.5,
      debtBurden: 0.5,
      financialHealth: 0.5,
    };
  }

  private getDefaultCrossModuleData(): CrossModuleData {
    return {
      healthMetrics: this.getDefaultHealthMetrics(),
      financialStress: this.getDefaultFinancialStressIndicators(),
      cognitiveLoad: 0.5,
      holisticInsights: ['Unable to generate holistic insights at this time.'],
      recommendations: ['Please ensure all modules are properly configured.'],
    };
  }
}

export default CrossModuleBridgeService;
