import { supabase } from '../storage/SupabaseService';
import { NeuroIDGenerator } from '../../utils/NeuroIDGenerator';

export interface CircadianData {
  user_id: string;
  date: string;
  hour: number;
  performance_score: number;
  cognitive_load: number;
  focus_duration: number;
  distraction_count: number;
  sleep_quality?: number;
  energy_level?: number;
}

export interface LearningPrediction {
  optimal_hour: number;
  confidence_score: number;
  predicted_performance: number;
  recommended_duration: number;
  risk_factors: string[];
  next_best_alternative?: number;
}

export interface CognitivePattern {
  pattern_id: string;
  user_id: string;
  pattern_type: 'circadian' | 'weekly' | 'seasonal' | 'contextual';
  pattern_data: any;
  accuracy_score: number;
  last_updated: string;
  confidence_interval: number;
}

export class PredictiveAnalyticsService {
  private static instance: PredictiveAnalyticsService;
  private mlModel: any = null; // Placeholder for ML model
  private patternCache: Map<string, CognitivePattern> = new Map();

  static getInstance(): PredictiveAnalyticsService {
    if (!PredictiveAnalyticsService.instance) {
      PredictiveAnalyticsService.instance = new PredictiveAnalyticsService();
    }
    return PredictiveAnalyticsService.instance;
  }

  /**
   * Analyze user's circadian rhythm patterns to predict optimal learning times
   */
  async predictOptimalLearningTime(userId: string, targetDate?: Date): Promise<LearningPrediction> {
    try {
      const circadianData = await this.getCircadianData(userId, 30); // Last 30 days
      const patterns = await this.analyzeCircadianPatterns(circadianData);

      const targetHour = targetDate ? targetDate.getHours() : new Date().getHours();
      const prediction = await this.calculateOptimalTime(patterns, targetHour);

      return prediction;
    } catch (error) {
      console.error('Failed to predict optimal learning time:', error);
      return this.getFallbackPrediction(targetDate);
    }
  }

  /**
   * Predict cognitive fatigue based on current session data
   */
  async predictCognitiveFatigue(
    userId: string,
    currentSession: {
      start_time: Date;
      duration_minutes: number;
      current_performance: number;
      recent_distractions: number;
    }
  ): Promise<{
    fatigue_level: number; // 0-1 scale
    recommended_break: number; // minutes
    risk_of_decline: number; // 0-1 scale
    optimal_resume_time?: Date;
  }> {
    try {
      const historicalData = await this.getHistoricalSessionData(userId, 14); // Last 2 weeks
      const fatigueModel = await this.trainFatigueModel(historicalData);

      const fatiguePrediction = await this.applyFatigueModel(fatigueModel, currentSession);

      return fatiguePrediction;
    } catch (error) {
      console.error('Failed to predict cognitive fatigue:', error);
      return {
        fatigue_level: 0.5,
        recommended_break: 5,
        risk_of_decline: 0.3
      };
    }
  }

  /**
   * Generate personalized learning difficulty curve
   */
  async generateAdaptiveDifficulty(
    userId: string,
    subjectArea: string,
    currentSkill: number // 0-1 scale
  ): Promise<{
    optimal_difficulty: number; // 0-1 scale
    challenge_zone: { min: number; max: number };
    progression_rate: number;
    recommended_topics: string[];
  }> {
    try {
      const performanceHistory = await this.getSubjectPerformanceHistory(userId, subjectArea, 50);
      const skillTrajectory = await this.analyzeSkillProgression(performanceHistory);

      const adaptiveParams = await this.calculateAdaptiveParameters(skillTrajectory, currentSkill);

      return adaptiveParams;
    } catch (error) {
      console.error('Failed to generate adaptive difficulty:', error);
      return {
        optimal_difficulty: Math.max(0.3, Math.min(0.7, currentSkill)),
        challenge_zone: { min: 0.2, max: 0.8 },
        progression_rate: 0.05,
        recommended_topics: []
      };
    }
  }

  /**
   * Real-time cognitive load assessment during learning
   */
  async assessRealTimeCognitiveLoad(
    userId: string,
    sessionMetrics: {
      response_time: number;
      accuracy: number;
      eye_movement_patterns?: any;
      physiological_data?: any;
    }
  ): Promise<{
    current_load: number; // 0-1 scale
    load_trend: 'increasing' | 'stable' | 'decreasing';
    attention_quality: number; // 0-1 scale
    recommendations: string[];
  }> {
    try {
      const baselineMetrics = await this.getUserBaselineMetrics(userId);
      const realTimeAssessment = await this.processRealTimeMetrics(sessionMetrics, baselineMetrics);

      return realTimeAssessment;
    } catch (error) {
      console.error('Failed to assess real-time cognitive load:', error);
      return {
        current_load: 0.5,
        load_trend: 'stable',
        attention_quality: 0.5,
        recommendations: ['Continue monitoring performance']
      };
    }
  }

  /**
   * Long-term learning trajectory prediction
   */
  async predictLearningTrajectory(
    userId: string,
    targetSkill: string,
    timeHorizon: number // days
  ): Promise<{
    projected_mastery: number; // 0-1 scale
    estimated_completion: Date;
    confidence_interval: { lower: number; upper: number };
    milestones: Array<{ date: Date; skill_level: number; description: string }>;
    risk_factors: string[];
  }> {
    try {
      const learningHistory = await this.getComprehensiveLearningHistory(userId, targetSkill);
      const trajectoryModel = await this.buildTrajectoryModel(learningHistory);

      const prediction = await this.projectTrajectory(trajectoryModel, timeHorizon);

      return prediction;
    } catch (error) {
      console.error('Failed to predict learning trajectory:', error);
      return {
        projected_mastery: 0.5,
        estimated_completion: new Date(Date.now() + timeHorizon * 24 * 60 * 60 * 1000),
        confidence_interval: { lower: 0.3, upper: 0.7 },
        milestones: [],
        risk_factors: ['Insufficient historical data']
      };
    }
  }

  // Private helper methods

  private async getCircadianData(userId: string, days: number): Promise<CircadianData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('circadian_data')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  private async analyzeCircadianPatterns(data: CircadianData[]): Promise<any> {
    // Simple pattern analysis - in advanced version, use ML algorithms
    const hourlyPerformance: { [hour: number]: number[] } = {};

    data.forEach(entry => {
      const h = entry.hour ?? 0;
      if (!hourlyPerformance[h]) {
        hourlyPerformance[h] = [];
      }
      hourlyPerformance[h].push(entry.performance_score ?? 0);
    });

    // Calculate average performance per hour
    const patterns = Object.entries(hourlyPerformance).map(([hour, scores]) => ({
      hour: parseInt(hour),
      avg_performance: scores.reduce((a, b) => a + b, 0) / scores.length,
      sample_size: scores.length
    }));

    return patterns.sort((a, b) => b.avg_performance - a.avg_performance);
  }

  private async calculateOptimalTime(patterns: any[], targetHour: number): Promise<LearningPrediction> {
    if (patterns.length === 0) {
      return this.getFallbackPrediction();
    }

    const bestHour = patterns[0];
    const currentHourPattern = patterns.find(p => p.hour === targetHour);

    const confidence = Math.min(bestHour.sample_size / 10, 1); // Simple confidence calculation

    return {
      optimal_hour: bestHour.hour,
      confidence_score: confidence,
      predicted_performance: bestHour.avg_performance,
      recommended_duration: this.calculateRecommendedDuration(bestHour.avg_performance),
      risk_factors: this.identifyRiskFactors(patterns, targetHour),
      next_best_alternative: patterns[1]?.hour
    };
  }

  private calculateRecommendedDuration(performance: number): number {
    // Higher performance allows longer sessions
    const baseDuration = 25; // Pomodoro standard
    const adjustment = (performance - 0.5) * 20; // ±20 minutes based on performance
    return Math.max(15, Math.min(60, baseDuration + adjustment));
  }

  private identifyRiskFactors(patterns: any[], targetHour: number): string[] {
    const risks: string[] = [];
    const targetPattern = patterns.find(p => p.hour === targetHour);

    if (!targetPattern) {
      risks.push('Limited data for this hour');
    } else if (targetPattern.sample_size < 3) {
      risks.push('Insufficient historical data');
    }

    const bestPerformance = Math.max(...patterns.map(p => p.avg_performance));
    const targetPerformance = targetPattern?.avg_performance || 0;

    if (targetPerformance < bestPerformance * 0.7) {
      risks.push('Performance significantly below optimal');
    }

    return risks;
  }

  private getFallbackPrediction(targetDate?: Date): LearningPrediction {
    const hour = targetDate ? targetDate.getHours() : 9; // Default to 9 AM

    return {
      optimal_hour: hour,
      confidence_score: 0.5,
      predicted_performance: 0.6,
      recommended_duration: 25,
      risk_factors: ['Using default prediction due to insufficient data']
    };
  }

  private async getHistoricalSessionData(userId: string, days: number): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('focus_sessions')
      .select(`
        *,
        distraction_events(count)
      `)
      .eq('user_id', userId)
      .gte('start_time', startDate.toISOString())
      .order('start_time', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  private async trainFatigueModel(historicalData: any[]): Promise<any> {
    // Placeholder for ML model training
    // In production, this would use TensorFlow.js or similar
    return {
      coefficients: [0.1, -0.2, 0.05], // Example coefficients
      intercept: 0.3
    };
  }

  private async applyFatigueModel(model: any, session: any): Promise<any> {
    // Simple linear model application
    const fatigueScore = model.coefficients[0] * session.duration_minutes +
                        model.coefficients[1] * session.recent_distractions +
                        model.coefficients[2] * (1 - session.current_performance) +
                        model.intercept;

    const fatigueLevel = Math.max(0, Math.min(1, fatigueScore));

    return {
      fatigue_level: fatigueLevel,
      recommended_break: Math.ceil(fatigueLevel * 15), // 0-15 minutes
      risk_of_decline: fatigueLevel > 0.7 ? 0.8 : fatigueLevel > 0.5 ? 0.5 : 0.2,
      optimal_resume_time: fatigueLevel > 0.6 ?
        new Date(Date.now() + (fatigueLevel * 30 * 60 * 1000)) : undefined // 0-30 minutes break
    };
  }

  private async getSubjectPerformanceHistory(userId: string, subject: string, limit: number): Promise<any[]> {
    // Get performance data for specific subject area
    const { data, error } = await supabase
      .from('cognitive_metrics')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  private async analyzeSkillProgression(performanceHistory: any[]): Promise<any> {
    // Analyze learning curve and progression patterns
    if (performanceHistory.length < 5) {
      return { progression_rate: 0.01, stability: 0.5 };
    }

    const recent = performanceHistory.slice(0, 10);
    const older = performanceHistory.slice(10, 20);

    const recentAvg = recent.reduce((sum, p) => sum + p.focus_score, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((sum, p) => sum + p.focus_score, 0) / older.length : recentAvg;

    const progressionRate = (recentAvg - olderAvg) / Math.max(olderAvg, 0.1);

    return {
      progression_rate: Math.max(-0.1, Math.min(0.1, progressionRate)),
      current_level: recentAvg,
      stability: this.calculateStability(recent)
    };
  }

  private calculateStability(recentData: any[]): number {
    if (recentData.length < 2) return 0.5;

    const values = recentData.map(d => d.focus_score);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;

    // Convert variance to stability score (0-1, higher is more stable)
    return Math.max(0, Math.min(1, 1 - Math.sqrt(variance)));
  }

  private async calculateAdaptiveParameters(trajectory: any, currentSkill: number): Promise<any> {
    const optimalDifficulty = Math.max(0.1, Math.min(0.9,
      currentSkill + trajectory.progression_rate * 2
    ));

    const challengeZone = {
      min: Math.max(0.05, optimalDifficulty - 0.2),
      max: Math.min(0.95, optimalDifficulty + 0.2)
    };

    return {
      optimal_difficulty: optimalDifficulty,
      challenge_zone: challengeZone,
      progression_rate: trajectory.progression_rate,
      recommended_topics: [] // Would be populated based on knowledge gaps
    };
  }

  private async getUserBaselineMetrics(userId: string): Promise<any> {
    // Get user's baseline cognitive metrics
    const { data, error } = await supabase
      .from('cognitive_metrics')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        avg_response_time: 1000,
        avg_accuracy: 0.8,
        baseline_load: 0.5
      };
    }

    return {
      avg_response_time: data.reduce((sum, d) => sum + (d.response_time || 1000), 0) / data.length,
      avg_accuracy: data.reduce((sum, d) => sum + (d.accuracy || 0.8), 0) / data.length,
      baseline_load: data.reduce((sum, d) => sum + (d.cognitive_load || 0.5), 0) / data.length
    };
  }

  private async processRealTimeMetrics(sessionMetrics: any, baseline: any): Promise<any> {
    const responseTimeRatio = sessionMetrics.response_time / baseline.avg_response_time;
    const accuracyRatio = sessionMetrics.accuracy / baseline.avg_accuracy;

    // Calculate cognitive load based on performance deviation from baseline
    const loadFromResponse = Math.max(0, Math.min(1, (responseTimeRatio - 0.8) / 0.4));
    const loadFromAccuracy = Math.max(0, Math.min(1, (1 - accuracyRatio) * 2));

    const currentLoad = (loadFromResponse + loadFromAccuracy) / 2;

    // Determine trend (simplified)
    const loadTrend = currentLoad > baseline.baseline_load + 0.1 ? 'increasing' :
                     currentLoad < baseline.baseline_load - 0.1 ? 'decreasing' : 'stable';

    const attentionQuality = (accuracyRatio + (1 - loadFromResponse)) / 2;

  const recommendations: string[] = [];
    if (currentLoad > 0.7) {
      recommendations.push('Consider taking a short break');
    }
    if (attentionQuality < 0.5) {
      recommendations.push('Try focusing on simpler material');
    }

    return {
      current_load: currentLoad,
      load_trend: loadTrend,
      attention_quality: attentionQuality,
      recommendations
    };
  }

  private async getComprehensiveLearningHistory(userId: string, skill: string): Promise<any[]> {
    // Get comprehensive learning data across different activities
    const [flashcards, logicNodes, readingSessions] = await Promise.all([
      supabase.from('flashcards').select('*').eq('user_id', userId).eq('category', skill),
      supabase.from('logic_nodes').select('*').eq('user_id', userId),
      supabase.from('reading_sessions').select('*').eq('user_id', userId)
    ]);

    return [
      ...(flashcards.data || []),
      ...(logicNodes.data || []),
      ...(readingSessions.data || [])
    ].sort((a, b) => new Date(b.created_at || b.created_at).getTime() - new Date(a.created_at || a.created_at).getTime());
  }

  private async buildTrajectoryModel(history: any[]): Promise<any> {
    // Build a simple trajectory model
    if (history.length < 5) {
      return { slope: 0.01, intercept: 0.5, r_squared: 0.5 };
    }

    // Simple linear regression on learning progress
    const n = history.length;
    const sumX = history.reduce((sum, item, index) => sum + index, 0);
    const sumY = history.reduce((sum, item) => sum + (item.stability || item.comprehension_score || 0.5), 0);
    const sumXY = history.reduce((sum, item, index) => sum + index * (item.stability || item.comprehension_score || 0.5), 0);
    const sumXX = history.reduce((sum, item, index) => sum + index * index, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return {
      slope: Math.max(-0.01, Math.min(0.01, slope)), // Constrain slope
      intercept: Math.max(0, Math.min(1, intercept)),
      r_squared: 0.8 // Placeholder
    };
  }

  private async projectTrajectory(model: any, days: number): Promise<any> {
    const currentPoint = model.intercept + model.slope * 100; // Assuming 100 data points
    const projectedMastery = Math.max(0, Math.min(1, currentPoint + model.slope * days));

    const estimatedCompletion = new Date();
    if (projectedMastery < 0.9) {
      const remainingDays = (0.9 - currentPoint) / Math.max(model.slope, 0.001);
      estimatedCompletion.setDate(estimatedCompletion.getDate() + remainingDays);
    }

    return {
      projected_mastery: projectedMastery,
      estimated_completion: estimatedCompletion,
      confidence_interval: {
        lower: Math.max(0, projectedMastery - 0.2),
        upper: Math.min(1, projectedMastery + 0.2)
      },
      milestones: this.generateMilestones(currentPoint, model.slope, days),
      risk_factors: projectedMastery < 0.5 ? ['Slow progress detected'] : []
    };
  }

  private generateMilestones(currentLevel: number, slope: number, days: number): any[] {
  const milestones: { date: Date; skill_level: number; description: string }[] = [];
    const interval = Math.max(1, Math.floor(days / 5));

    for (let i = interval; i <= days; i += interval) {
      const projectedLevel = Math.max(0, Math.min(1, currentLevel + slope * i));
      milestones.push({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        skill_level: projectedLevel,
        description: `Projected skill level: ${(projectedLevel * 100).toFixed(1)}%`
      });
    }

    return milestones;
  }

  /**
   * Cache cognitive patterns for performance
   */
  async cacheCognitivePattern(pattern: CognitivePattern): Promise<void> {
    this.patternCache.set(`${pattern.user_id}_${pattern.pattern_type}`, pattern);

    // Also store in database for persistence
    const { error } = await supabase
      .from('cognitive_patterns')
      .upsert([{
        id: pattern.pattern_id,
        user_id: pattern.user_id,
        pattern_type: pattern.pattern_type,
        pattern_data: pattern.pattern_data,
        accuracy_score: pattern.accuracy_score,
        last_updated: pattern.last_updated,
        confidence_interval: pattern.confidence_interval
      }]);

    if (error) {
      console.error('Failed to cache cognitive pattern:', error);
    }
  }

  /**
   * Get cached cognitive pattern
   */
  getCachedPattern(userId: string, patternType: string): CognitivePattern | null {
    return this.patternCache.get(`${userId}_${patternType}`) || null;
  }

  /**
   * Clear pattern cache (useful for memory management)
   */
  clearPatternCache(): void {
    this.patternCache.clear();
  }
}
