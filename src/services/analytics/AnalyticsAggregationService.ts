/**
 * AnalyticsAggregationService - The Brain of NeuroLearn Analytics Hub
 *
 * Unifies all analytical capabilities from every module into one intelligent system.
 * Generates cross-domain correlations, predictive insights, and holistic intelligence scores.
 *
 * Features:
 * - Cross-module data correlation analysis
 * - Real-time holistic intelligence scoring
 * - Predictive analytics with AI insights
 * - Adaptive visualization recommendations
 * - Performance trend analysis across all domains
 */

import CrossModuleBridgeService from '../integrations/CrossModuleBridgeService';
import FocusTimerService from '../learning/FocusTimerService';
import SpacedRepetitionService from '../learning/SpacedRepetitionService';
import { MindMapGenerator } from '../learning/MindMapGeneratorService';
import AdvancedGeminiService from '../ai/AdvancedGeminiService';
import CircadianIntelligenceService from '../health/CircadianIntelligenceService';
import NotionSyncService from '../integrations/NotionSyncService';
import BudgetService from '../finance/BudgetService';
import { CognitiveAuraService } from '../ai/CognitiveAuraService';
import ContextSensorService from '../ai/ContextSensorService';
import { HybridStorageService } from '../storage/HybridStorageService';
import { supabase } from '../storage/SupabaseService';
import { MMKV } from 'react-native-mmkv';

// Core analytics interfaces
export interface HolisticAnalyticsReport {
  timestamp: string;
  reportId: string;
  userId: string;

  // Overall intelligence scores (0-100)
  overallScores: {
    holisticIntelligence: number;       // Master score combining all domains
    cognitivePerformance: number;       // Learning + focus + retention
    wellnessIndex: number;              // Health + circadian + stress
    financialHealth: number;            // Budget + savings + stress correlation
    adaptabilityIndex: number;          // How well user adapts to challenges
    predictiveCapacity: number;         // AI forecast accuracy
  };

  // Learning & cognitive analytics
  learningAnalytics: {
    retentionRateChart: Array<{ date: string; rate: number }>;
    masteryDistribution: Record<'beginner' | 'intermediate' | 'advanced' | 'expert', number>;
    studyStreak: number;
    atRiskCards: number;
    optimalLearningTimes: Array<{ hour: number; efficiency: number }>;
    knowledgeGraphHealth: number;
    neuralConnectionStrength: number;
    memoryPalaceUtilization: number;
  };

  // Focus & productivity analytics
  focusAnalytics: {
    totalFocusTime: number;
    averageSessionLength: number;
    distractionRate: number;
    focusEfficiency: number;
    deepWorkCapacity: number;
    cognitiveLoadTrend: Array<{ date: string; load: number }>;
    optimalFocusWindows: Array<{ start: number; end: number; efficiency: number }>;
    distractionPatterns: Array<{ trigger: string; frequency: number; impact: number }>;
  };

  // Health & wellness analytics
  healthAnalytics: {
    crdiScore: number;                  // Circadian Rhythm Disruption Index
    sleepQualityTrend: Array<{ date: string; quality: number }>;
    exerciseImpact: number;             // Correlation with cognitive performance
    stressLevelTrend: Array<{ date: string; stress: number }>;
    recoveryScore: number;
    optimalPerformanceWindows: Array<{ start: number; end: number; type: string }>;
    healthCognitiveCorrelation: number; // How health impacts learning
  };

  // Financial wellness analytics
  financialAnalytics: {
    budgetAdherence: number;
    savingsGrowthRate: number;
    financialStressImpact: number;      // Correlation with cognitive load
    spendingPatterns: Array<{ category: string; amount: number; trend: 'up' | 'down' | 'stable' }>;
    financialGoalProgress: number;
    debtReductionRate: number;
    financialWellnessTrend: Array<{ date: string; score: number }>;
  };

  // Context & environment analytics
  contextAnalytics: {
    environmentOptimality: number;
    locationPerformance: Array<{ location: string; efficiency: number }>;
    timeOptimalityMap: Array<{ hour: number; day: string; efficiency: number }>;
    weatherImpactAnalysis: Array<{ condition: string; impact: number }>;
    noiseImpactOnFocus: number;
    lightingImpactOnPerformance: number;
  };

  // AI insights & predictions
  aiInsights: {
    topCorrelation: string;
    forecastAccuracy: number;
    predictedOptimalSchedule: Array<{ time: string; activity: string; confidence: number }>;
    anomalyDetections: Array<{ type: string; severity: number; description: string }>;
    improvementRecommendations: Array<{ domain: string; suggestion: string; impact: number }>;
    personalityInsights: string;
    learningStyleAnalysis: string;
  };

  // Cross-domain correlations
  correlationMatrix: {
    sleepVsRetention: number;
    exerciseVsFocus: number;
    budgetStressVsCognition: number;
    weatherVsMood: number;
    timeOfDayVsPerformance: number;
    socialVsProductivity: number;
    nutritionVsEnergy: number;
    stressVsCreativity: number;
  };

  // Notion integration analytics
  notionSyncAnalytics: {
    syncedPages: number;
    knowledgeGraphNodes: number;
    averageNeuralConfidence: number;
    automaticInsightsGenerated: number;
    crossReferencesCreated: number;
    conceptLinkingAccuracy: number;
  };

  // Predictive analytics
  predictions: {
    next7DaysFocus: Array<{ date: string; predicted: number; confidence: number }>;
    retentionRiskForecast: Array<{ topic: string; risk: number; date: string }>;
    optimalChallengeLevel: number;
    burnoutRisk: number;
    performancePeakPrediction: string;
    recommendedBreakFrequency: number;
  };
}

export interface CorrelationAnalysis {
  pearsonCoefficient: number;
  pValue: number;
  significance: 'high' | 'medium' | 'low' | 'none';
  trendDirection: 'positive' | 'negative' | 'neutral';
  confidenceInterval: [number, number];
  sampleSize: number;
}

export interface AnomalyDetection {
  type: 'performance_drop' | 'unusual_pattern' | 'data_inconsistency' | 'behavioral_change';
  severity: 1 | 2 | 3 | 4 | 5;
  description: string;
  affectedMetrics: string[];
  detectionDate: Date;
  confidenceLevel: number;
  suggestedActions: string[];
}

export interface PredictiveForecast {
  metric: string;
  timeHorizon: '1day' | '1week' | '1month' | '3months';
  predictions: Array<{
    date: string;
    value: number;
    confidence: number;
    lowerBound: number;
    upperBound: number;
  }>;
  methodology: string;
  accuracy: number;
}

export class AnalyticsAggregationService {
  private static instance: AnalyticsAggregationService;

  // Service dependencies
  private crossModule: CrossModuleBridgeService;
  private focusTimer: FocusTimerService;
  private spacedRepetition: SpacedRepetitionService;
  private mindMap: MindMapGenerator;
  private geminiAI: AdvancedGeminiService;
  private circadian: CircadianIntelligenceService;
  private notionSync: NotionSyncService;
  private budget: BudgetService;
  private cognitiveAura: CognitiveAuraService;
  private contextSensor: ContextSensorService;
  private storage: HybridStorageService;

  // Cache for expensive calculations
  private reportCache = new Map<string, { data: HolisticAnalyticsReport; timestamp: number }>();
  private correlationCache = new Map<string, { data: CorrelationAnalysis; timestamp: number }>();

  private constructor() {
    this.crossModule = CrossModuleBridgeService.getInstance();
    this.focusTimer = FocusTimerService.getInstance();
    this.spacedRepetition = SpacedRepetitionService.getInstance();
  // MindMapGenerator uses named export 'MindMapGenerator'
  this.mindMap = MindMapGenerator.getInstance();
    this.geminiAI = AdvancedGeminiService.getInstance();
    this.circadian = CircadianIntelligenceService.getInstance();
    this.notionSync = NotionSyncService.getInstance();
    this.budget = BudgetService.getInstance();
  this.cognitiveAura = CognitiveAuraService.getInstance();
    this.contextSensor = ContextSensorService.getInstance();
    this.storage = HybridStorageService.getInstance();
  }

  public static getInstance(): AnalyticsAggregationService {
    if (!AnalyticsAggregationService.instance) {
      AnalyticsAggregationService.instance = new AnalyticsAggregationService();
    }
    return AnalyticsAggregationService.instance;
  }

  /**
   * Generate comprehensive holistic analytics report
   * This is the main method that powers the Analytics Hub
   */
  public async generateHolisticReport(userId: string, forceRefresh = false): Promise<HolisticAnalyticsReport> {
    try {
      // Check cache first (unless force refresh)
      const cacheKey = `holistic_${userId}`;
      if (!forceRefresh && this.reportCache.has(cacheKey)) {
        const cached = this.reportCache.get(cacheKey)!;
        // Cache valid for 30 minutes
        if (Date.now() - cached.timestamp < 30 * 60 * 1000) {
          return cached.data;
        }
      }

      console.log('Generating holistic analytics report for user:', userId);
      const startTime = Date.now();

      // Gather data from all modules concurrently for performance
      const [
        crossModuleData,
        learningData,
        focusData,
        healthData,
        financialData,
        contextData,
        aiInsightsData,
        notionData,
      ] = await Promise.all([
        this.gatherCrossModuleData(userId),
        this.gatherLearningAnalytics(userId),
        this.gatherFocusAnalytics(userId),
        this.gatherHealthAnalytics(userId),
        this.gatherFinancialAnalytics(userId),
        this.gatherContextAnalytics(userId),
        this.gatherAIInsights(userId),
        this.gatherNotionAnalytics(userId),
      ]);

      // Calculate cross-domain correlations
      const correlationMatrix = await this.calculateCorrelationMatrix(userId);

      // Generate predictive analytics
      const predictions = await this.generatePredictions(userId);

      // Calculate overall intelligence scores
      const overallScores = this.calculateOverallScores({
        learningData,
        focusData,
        healthData,
        financialData,
        contextData,
        correlationMatrix,
      });

      // Assemble the complete report
      const report: HolisticAnalyticsReport = {
        timestamp: new Date().toISOString(),
        reportId: `analytics_${userId}_${Date.now()}`,
        userId,
        overallScores,
        learningAnalytics: learningData,
        focusAnalytics: focusData,
        healthAnalytics: healthData,
        financialAnalytics: financialData,
        contextAnalytics: contextData,
        aiInsights: aiInsightsData,
        correlationMatrix,
        notionSyncAnalytics: notionData,
        predictions,
      };

      // Cache the report
      this.reportCache.set(cacheKey, {
        data: report,
        timestamp: Date.now(),
      });

      console.log(`Holistic report generated in ${Date.now() - startTime}ms`);

      // Persist report to database
      try {
        await this.persistReportToDatabase(report);
        console.log('Analytics report persisted to database');
      } catch (error) {
        console.error('Failed to persist analytics report:', error);
        // Don't fail the entire operation if persistence fails
      }

      return report;

    } catch (error) {
      console.error('Error generating holistic analytics report:', error);
      throw new Error(`Failed to generate analytics report: ${error}`);
    }
  }

  /**
   * Gather cross-module bridge data
   */
  private async gatherCrossModuleData(userId: string) {
    try {
      return await this.crossModule.getHolisticInsights(userId);
    } catch (error) {
      console.error('Error gathering cross-module data:', error);
      return this.getDefaultCrossModuleData();
    }
  }

  /**
   * Gather learning analytics from multiple sources
   */
  private async gatherLearningAnalytics(userId: string) {
    try {
      // Get data from multiple learning services
      const [flashcards, mindMapData, spacedRepData] = await Promise.all([
        // HybridStorageService exposes explicit getters; use getFlashcards
        (this.storage as any).getFlashcards?.() || [],
        this.mindMap.generateNeuralGraph(false),
        this.getSpacedRepetitionAnalytics(userId),
      ]);

      // Calculate learning metrics
      const retentionRateChart = await this.calculateRetentionTrend(flashcards);
      const masteryDistribution = this.calculateMasteryDistribution(flashcards);
      const studyStreak = await this.calculateStudyStreak(userId);
      const atRiskCards = this.spacedRepetition.getAtRiskCards(flashcards).length;
      const optimalLearningTimes = await this.calculateOptimalLearningTimes(userId);
      const knowledgeGraphHealth = this.calculateKnowledgeGraphHealth(mindMapData);
      const neuralConnectionStrength = this.calculateNeuralConnectionStrength(mindMapData);
      const memoryPalaceUtilization = await this.calculateMemoryPalaceUtilization(userId);

      return {
        retentionRateChart,
        masteryDistribution,
        studyStreak,
        atRiskCards,
        optimalLearningTimes,
        knowledgeGraphHealth,
        neuralConnectionStrength,
        memoryPalaceUtilization,
      };
    } catch (error) {
      console.error('Error gathering learning analytics:', error);
      return this.getDefaultLearningAnalytics();
    }
  }

  /**
   * Gather focus analytics from FocusTimerService
   */
  private async gatherFocusAnalytics(userId: string) {
    try {
      const focusMetrics = await this.focusTimer.getFocusHealthMetrics();
      const recentSessions = await this.focusTimer.getRecentFocusSessions(30);
      const distractionAnalysis = await this.focusTimer.getDistractionAnalysis();

      const totalFocusTime = recentSessions.reduce((sum, session) => sum + session.durationMinutes, 0);
      const averageSessionLength = recentSessions.length > 0
        ? totalFocusTime / recentSessions.length
        : 0;

      const distractionRate = focusMetrics.distractionsPerSession || 0;
      const focusEfficiency = focusMetrics.focusEfficiency || 0;
      const deepWorkCapacity = this.calculateDeepWorkCapacity(recentSessions);

      const cognitiveLoadTrend = await this.calculateCognitiveLoadTrend(userId);
      const optimalFocusWindows = await this.calculateOptimalFocusWindows(recentSessions);
      const distractionPatterns = this.analyzeDistractionPatterns(distractionAnalysis);

      return {
        totalFocusTime,
        averageSessionLength,
        distractionRate,
        focusEfficiency,
        deepWorkCapacity,
        cognitiveLoadTrend,
        optimalFocusWindows,
        distractionPatterns,
      };
    } catch (error) {
      console.error('Error gathering focus analytics:', error);
      return this.getDefaultFocusAnalytics();
    }
  }

  /**
   * Gather health analytics from various health services
   */
  private async gatherHealthAnalytics(userId: string) {
    try {
      const healthMetrics = await this.circadian.getHealthMetrics(userId);
      const sleepData = await this.getSleepAnalytics(userId);
      const exerciseData = await this.getExerciseAnalytics(userId);
      const stressData = await this.getStressAnalytics(userId);

  const crdiScore = (healthMetrics as any)?.crdiScore ?? 50;
      const sleepQualityTrend = sleepData.qualityTrend || [];
      const exerciseImpact = await this.calculateExerciseImpact(userId);
      const stressLevelTrend = stressData.stressTrend || [];
  const recoveryScore = (healthMetrics as any)?.recoveryScore ?? 50;
      const optimalPerformanceWindows = await this.calculateOptimalPerformanceWindows(userId);
      const healthCognitiveCorrelation = await this.calculateHealthCognitiveCorrelation(userId);

      return {
        crdiScore,
        sleepQualityTrend,
        exerciseImpact,
        stressLevelTrend,
        recoveryScore,
        optimalPerformanceWindows,
        healthCognitiveCorrelation,
      };
    } catch (error) {
      console.error('Error gathering health analytics:', error);
      return this.getDefaultHealthAnalytics();
    }
  }

  /**
   * Gather financial analytics from BudgetService
   */
  private async gatherFinancialAnalytics(userId: string) {
    try {
  // BudgetService exposes richer API; use getBudgetAnalysis if available or fallback
  const budgetData = await ((this.budget as any).getBudgetAnalysis?.(userId) || (this.budget as any).getBudgetSummary?.(userId) || {});
  const financialStress = await this.crossModule.getFinancialStressIndicators?.(userId) || {};

      const budgetAdherence = this.calculateBudgetAdherence(budgetData);
      const savingsGrowthRate = await this.calculateSavingsGrowthRate(userId);
      const financialStressImpact = await this.calculateFinancialStressImpact(userId);
      const spendingPatterns = this.analyzeSpendingPatterns(budgetData);
      const financialGoalProgress = await this.calculateFinancialGoalProgress(userId);
      const debtReductionRate = await this.calculateDebtReductionRate(userId);
      const financialWellnessTrend = await this.calculateFinancialWellnessTrend(userId);

      return {
        budgetAdherence,
        savingsGrowthRate,
        financialStressImpact,
        spendingPatterns,
        financialGoalProgress,
        debtReductionRate,
        financialWellnessTrend,
      };
    } catch (error) {
      console.error('Error gathering financial analytics:', error);
      return this.getDefaultFinancialAnalytics();
    }
  }

  /**
   * Gather context analytics from ContextSensorService
   */
  private async gatherContextAnalytics(userId: string) {
    try {
  const contextData = await (this.contextSensor as any).getContextAnalytics?.() || {};

      return {
        environmentOptimality: (contextData as any).averageOptimality ?? 0.7,
        locationPerformance: (contextData as any).locationPerformance || (contextData.knownLocations || []),
        timeOptimalityMap: (contextData.optimalTimeWindows || []).map((window: any) => ({
          hour: window.hour,
          day: 'everyday', // Simplified for now
          efficiency: window.performance,
        })),
        weatherImpactAnalysis: await this.analyzeWeatherImpact(userId),
        noiseImpactOnFocus: await this.calculateNoiseImpact(userId),
        lightingImpactOnPerformance: await this.calculateLightingImpact(userId),
      };
    } catch (error) {
      console.error('Error gathering context analytics:', error);
      return this.getDefaultContextAnalytics();
    }
  }

  /**
   * Gather AI insights from AdvancedGeminiService
   */
  private async gatherAIInsights(userId: string) {
    try {
  const insights = await (this.geminiAI as any).getAIInsights?.(userId) || {};
  const correlations = await (this.geminiAI as any).analyzeUserPatterns?.(userId) || {};
  const recommendations = await (this.geminiAI as any).generatePersonalizedRecommendations?.(userId) || [];

      return {
        topCorrelation: insights.topCorrelation || 'Sleep quality strongly impacts learning retention',
        forecastAccuracy: insights.forecastAccuracy || 0.78,
        predictedOptimalSchedule: await this.generateOptimalSchedule(userId),
        anomalyDetections: await this.detectAnomalies(userId),
        improvementRecommendations: (recommendations.slice?.(0, 5) || []).map((rec: any) => ({
          domain: rec?.category || 'general',
          suggestion: rec?.recommendation || rec?.suggestion || '',
          impact: rec?.confidenceScore ?? rec?.confidence ?? 0.7,
        })),
        personalityInsights: insights.personalityProfile || 'Data being analyzed...',
        learningStyleAnalysis: insights.learningStyle || 'Visual-kinesthetic learner with strong analytical preferences',
      };
    } catch (error) {
      console.error('Error gathering AI insights:', error);
      return this.getDefaultAIInsights();
    }
  }

  /**
   * Gather Notion sync analytics
   */
  private async gatherNotionAnalytics(userId: string) {
    try {
      const syncStats = await (this.notionSync as any).getSyncStats?.() || {};

      return {
        syncedPages: syncStats.totalPages || 0,
        knowledgeGraphNodes: syncStats.totalLinks || 0,
        averageNeuralConfidence: (syncStats as any).averageNeuralConfidence ?? 0.7,
        automaticInsightsGenerated: (syncStats as any).automaticInsightsGenerated ?? 0,
        crossReferencesCreated: (syncStats as any).crossReferencesCreated ?? 0,
        conceptLinkingAccuracy: (syncStats as any).conceptLinkingAccuracy ?? 0.8,
      };
    } catch (error) {
      console.error('Error gathering Notion analytics:', error);
      return this.getDefaultNotionAnalytics();
    }
  }

  /**
   * Calculate cross-domain correlation matrix
   * This is the unique differentiator of NeuroLearn
   */
  private async calculateCorrelationMatrix(userId: string) {
    try {
      const [
        sleepVsRetention,
        exerciseVsFocus,
        budgetStressVsCognition,
        weatherVsMood,
        timeOfDayVsPerformance,
        socialVsProductivity,
        nutritionVsEnergy,
        stressVsCreativity,
      ] = await Promise.all([
        this.calculateCorrelation(userId, 'sleep_quality', 'retention_rate'),
        this.calculateCorrelation(userId, 'exercise_frequency', 'focus_efficiency'),
        this.calculateCorrelation(userId, 'budget_stress', 'cognitive_load'),
        this.calculateCorrelation(userId, 'weather_condition', 'mood_rating'),
        this.calculateCorrelation(userId, 'time_of_day', 'performance_score'),
        this.calculateCorrelation(userId, 'social_interactions', 'productivity_index'),
        this.calculateCorrelation(userId, 'nutrition_quality', 'energy_levels'),
        this.calculateCorrelation(userId, 'stress_level', 'creative_output'),
      ]);

      return {
        sleepVsRetention: sleepVsRetention.pearsonCoefficient,
        exerciseVsFocus: exerciseVsFocus.pearsonCoefficient,
        budgetStressVsCognition: budgetStressVsCognition.pearsonCoefficient,
        weatherVsMood: weatherVsMood.pearsonCoefficient,
        timeOfDayVsPerformance: timeOfDayVsPerformance.pearsonCoefficient,
        socialVsProductivity: socialVsProductivity.pearsonCoefficient,
        nutritionVsEnergy: nutritionVsEnergy.pearsonCoefficient,
        stressVsCreativity: stressVsCreativity.pearsonCoefficient,
      };
    } catch (error) {
      console.error('Error calculating correlation matrix:', error);
      return this.getDefaultCorrelationMatrix();
    }
  }

  /**
   * Generate predictive analytics
   */
  private async generatePredictions(userId: string): Promise<HolisticAnalyticsReport['predictions']> {
    try {
      const next7DaysFocus = await this.predictFocusTrend(userId, 7);
      const retentionRiskForecast = await this.predictRetentionRisk(userId);
      const optimalChallengeLevel = await this.calculateOptimalChallengeLevel(userId);
      const burnoutRisk = await this.calculateBurnoutRisk(userId);
      const performancePeakPrediction = await this.predictPerformancePeak(userId);
      const recommendedBreakFrequency = await this.calculateOptimalBreakFrequency(userId);

      return {
        next7DaysFocus,
        retentionRiskForecast,
        optimalChallengeLevel,
        burnoutRisk,
        performancePeakPrediction,
        recommendedBreakFrequency,
      };
    } catch (error) {
      console.error('Error generating predictions:', error);
      return this.getDefaultPredictions();
    }
  }

  /**
   * Calculate overall intelligence scores
   */
  private calculateOverallScores(data: {
    learningData: any;
    focusData: any;
    healthData: any;
    financialData: any;
    contextData: any;
    correlationMatrix: any;
  }): HolisticAnalyticsReport['overallScores'] {
    try {
      // Cognitive Performance Score (0-100)
      const cognitivePerformance = Math.round(
        (data.learningData.knowledgeGraphHealth * 0.3) +
        (data.focusData.focusEfficiency * 100 * 0.3) +
        (data.learningData.neuralConnectionStrength * 100 * 0.2) +
        ((1 - data.focusData.distractionRate) * 100 * 0.2)
      );

      // Wellness Index Score (0-100)
      const wellnessIndex = Math.round(
        (data.healthData.crdiScore) +
        (data.healthData.recoveryScore) +
        ((1 - data.healthData.stressLevelTrend[data.healthData.stressLevelTrend.length - 1]?.stress || 0.5) * 100)
      ) / 3;

      // Financial Health Score (0-100)
      const financialHealth = Math.round(
        (data.financialData.budgetAdherence * 100 * 0.4) +
        (Math.max(0, data.financialData.savingsGrowthRate * 100) * 0.3) +
        ((1 - data.financialData.financialStressImpact) * 100 * 0.3)
      );

      // Adaptability Index - how well user adapts to changes
      const adaptabilityIndex = Math.round(
        (data.contextData.environmentOptimality * 100 * 0.4) +
        (data.learningData.memoryPalaceUtilization * 0.3) +
        (data.focusData.deepWorkCapacity * 0.3)
      );

      // Predictive Capacity - AI forecast accuracy
      const predictiveCapacity = Math.round((data.correlationMatrix.sleepVsRetention + 1) * 50); // Convert -1 to 1 → 0 to 100

      // Holistic Intelligence - master score
      const holisticIntelligence = Math.round(
        (cognitivePerformance * 0.25) +
        (wellnessIndex * 0.2) +
        (financialHealth * 0.15) +
        (adaptabilityIndex * 0.2) +
        (predictiveCapacity * 0.2)
      );

      return {
        holisticIntelligence,
        cognitivePerformance,
        wellnessIndex,
        financialHealth,
        adaptabilityIndex,
        predictiveCapacity,
      };
    } catch (error) {
      console.error('Error calculating overall scores:', error);
      return {
        holisticIntelligence: 65,
        cognitivePerformance: 70,
        wellnessIndex: 60,
        financialHealth: 55,
        adaptabilityIndex: 68,
        predictiveCapacity: 72,
      };
    }
  }

  // Helper methods for calculations (implementing key analytics)

  private async calculateCorrelation(userId: string, metric1: string, metric2: string): Promise<CorrelationAnalysis> {
    try {
      // This would implement actual Pearson correlation calculation
      // For now, returning mock data with realistic correlations
      const mockCorrelations: Record<string, number> = {
        'sleep_quality_retention_rate': 0.73,
        'exercise_frequency_focus_efficiency': 0.62,
        'budget_stress_cognitive_load': -0.58,
        'weather_condition_mood_rating': 0.34,
        'time_of_day_performance_score': 0.67,
        'social_interactions_productivity_index': -0.23,
        'nutrition_quality_energy_levels': 0.81,
        'stress_level_creative_output': -0.45,
      };

      const key = `${metric1}_${metric2}`;
      const coefficient = mockCorrelations[key] || 0.1 + (Math.random() - 0.5) * 0.8;

      return {
        pearsonCoefficient: coefficient,
        pValue: Math.abs(coefficient) > 0.5 ? 0.01 : 0.1,
        significance: Math.abs(coefficient) > 0.7 ? 'high' : Math.abs(coefficient) > 0.4 ? 'medium' : 'low',
        trendDirection: coefficient > 0.1 ? 'positive' : coefficient < -0.1 ? 'negative' : 'neutral',
        confidenceInterval: [coefficient - 0.1, coefficient + 0.1],
        sampleSize: 30 + Math.floor(Math.random() * 70),
      };
    } catch (error) {
      console.error('Error calculating correlation:', error);
      return {
        pearsonCoefficient: 0,
        pValue: 1.0,
        significance: 'none',
        trendDirection: 'neutral',
        confidenceInterval: [-0.1, 0.1],
        sampleSize: 0,
      };
    }
  }

  // Default data methods
  private getDefaultLearningAnalytics() {
    return {
      retentionRateChart: [],
      masteryDistribution: { beginner: 40, intermediate: 35, advanced: 20, expert: 5 },
      studyStreak: 0,
      atRiskCards: 0,
      optimalLearningTimes: [],
      knowledgeGraphHealth: 50,
      neuralConnectionStrength: 0.5,
      memoryPalaceUtilization: 0.3,
    };
  }

  private getDefaultFocusAnalytics() {
    return {
      totalFocusTime: 0,
      averageSessionLength: 0,
      distractionRate: 0,
      focusEfficiency: 0,
      deepWorkCapacity: 0,
      cognitiveLoadTrend: [],
      optimalFocusWindows: [],
      distractionPatterns: [],
    };
  }

  private getDefaultHealthAnalytics() {
    return {
      crdiScore: 50,
      sleepQualityTrend: [],
      exerciseImpact: 0,
      stressLevelTrend: [],
      recoveryScore: 50,
      optimalPerformanceWindows: [],
      healthCognitiveCorrelation: 0,
    };
  }

  private getDefaultFinancialAnalytics() {
    return {
      budgetAdherence: 0,
      savingsGrowthRate: 0,
      financialStressImpact: 0,
      spendingPatterns: [],
      financialGoalProgress: 0,
      debtReductionRate: 0,
      financialWellnessTrend: [],
    };
  }

  private getDefaultContextAnalytics() {
    return {
      environmentOptimality: 0.7,
      locationPerformance: [],
      timeOptimalityMap: [],
      weatherImpactAnalysis: [],
      noiseImpactOnFocus: 0,
      lightingImpactOnPerformance: 0,
    };
  }

  private getDefaultAIInsights() {
    return {
      topCorrelation: 'Analyzing patterns...',
      forecastAccuracy: 0.5,
      predictedOptimalSchedule: [],
      anomalyDetections: [],
      improvementRecommendations: [],
      personalityInsights: 'Gathering data...',
      learningStyleAnalysis: 'Assessment in progress...',
    };
  }

  private getDefaultNotionAnalytics() {
    return {
      syncedPages: 0,
      knowledgeGraphNodes: 0,
      averageNeuralConfidence: 0,
      automaticInsightsGenerated: 0,
      crossReferencesCreated: 0,
      conceptLinkingAccuracy: 0,
    };
  }

  private getDefaultCorrelationMatrix() {
    return {
      sleepVsRetention: 0,
      exerciseVsFocus: 0,
      budgetStressVsCognition: 0,
      weatherVsMood: 0,
      timeOfDayVsPerformance: 0,
      socialVsProductivity: 0,
      nutritionVsEnergy: 0,
      stressVsCreativity: 0,
    };
  }

  private getDefaultPredictions() {
    return {
      next7DaysFocus: [],
      retentionRiskForecast: [],
      optimalChallengeLevel: 0.7,
      burnoutRisk: 0.3,
      performancePeakPrediction: 'Tomorrow at 10 AM',
      recommendedBreakFrequency: 45,
    };
  }

  private getDefaultCrossModuleData() {
    return {
      healthMetrics: {
        crdiScore: 50,
        sleepQuality: 0.5,
        exerciseFrequency: 0,
        stressLevel: 0.5,
        recoveryScore: 50,
        circadianPhase: 'optimal',
        overallHealth: 0.5,
      },
      financialStress: {
        budgetPressure: 0.5,
        spendingAnxiety: 0.5,
        savingsConfidence: 0.5,
        debtBurden: 0.5,
        financialHealth: 0.5,
      },
      cognitiveLoad: 0.5,
      holisticInsights: [],
      recommendations: [],
    };
  }

  // Placeholder implementations for complex calculations
  private async calculateRetentionTrend(flashcards: any[]): Promise<Array<{ date: string; rate: number }>> {
    try {
      if (!flashcards || flashcards.length === 0) return [];

      // Group flashcards by review date and calculate retention rates
      const retentionByDate: Record<string, { total: number; retained: number }> = {};

      flashcards.forEach(card => {
        if (card.reviewHistory && Array.isArray(card.reviewHistory)) {
          card.reviewHistory.forEach((review: any) => {
            const date = new Date(review.date).toISOString().split('T')[0];
            if (!retentionByDate[date]) {
              retentionByDate[date] = { total: 0, retained: 0 };
            }
            retentionByDate[date].total += 1;
            if (review.correct) {
              retentionByDate[date].retained += 1;
            }
          });
        }
      });

      return Object.entries(retentionByDate)
        .map(([date, data]) => ({
          date,
          rate: data.total > 0 ? (data.retained / data.total) * 100 : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30); // Last 30 days
    } catch (error) {
      console.error('Error calculating retention trend:', error);
      return [];
    }
  }

  private calculateMasteryDistribution(flashcards: any[]) {
    try {
      if (!flashcards || flashcards.length === 0) {
        return { beginner: 40, intermediate: 35, advanced: 20, expert: 5 };
      }

      const distribution = { beginner: 0, intermediate: 0, advanced: 0, expert: 0 };

      flashcards.forEach(card => {
        const mastery = card.masteryLevel || card.proficiency || 0;
        if (mastery < 0.25) distribution.beginner += 1;
        else if (mastery < 0.5) distribution.intermediate += 1;
        else if (mastery < 0.75) distribution.advanced += 1;
        else distribution.expert += 1;
      });

      const total = flashcards.length;
      return {
        beginner: Math.round((distribution.beginner / total) * 100),
        intermediate: Math.round((distribution.intermediate / total) * 100),
        advanced: Math.round((distribution.advanced / total) * 100),
        expert: Math.round((distribution.expert / total) * 100),
      };
    } catch (error) {
      console.error('Error calculating mastery distribution:', error);
      return { beginner: 40, intermediate: 35, advanced: 20, expert: 5 };
    }
  }

  private async calculateStudyStreak(userId: string): Promise<number> {
    try {
      // Get study sessions from the last 60 days
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const { data: sessions, error } = await supabase
        .from('focus_sessions')
        .select('created_at')
        .eq('user_id', userId)
        .gte('created_at', sixtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error || !sessions || sessions.length === 0) return 0;

      // Calculate current streak
      const uniqueDates = Array.from(new Set(
        sessions.map(session => new Date(session.created_at).toDateString())
      )).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

      let streak = 0;
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

      // Check if studied today or yesterday to start counting
      if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
        streak = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
          const currentDate = new Date(uniqueDates[i - 1]);
          const previousDate = new Date(uniqueDates[i]);
          const diffTime = currentDate.getTime() - previousDate.getTime();
          const diffDays = diffTime / (1000 * 60 * 60 * 24);

          if (diffDays === 1) {
            streak++;
          } else {
            break;
          }
        }
      }

      return streak;
    } catch (error) {
      console.error('Error calculating study streak:', error);
      return 0;
    }
  }

  private async calculateOptimalLearningTimes(userId: string) {
    try {
      // Get focus sessions with performance data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: sessions, error } = await supabase
        .from('focus_sessions')
        .select('created_at, focus_efficiency, duration_minutes')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (error || !sessions || sessions.length === 0) return [];

      // Group by hour and calculate average efficiency
      const hourlyPerformance: Record<number, { totalEfficiency: number; count: number }> = {};

      sessions.forEach(session => {
        const hour = new Date(session.created_at).getHours();
        const efficiency = session.focus_efficiency || 0.5;

        if (!hourlyPerformance[hour]) {
          hourlyPerformance[hour] = { totalEfficiency: 0, count: 0 };
        }
        hourlyPerformance[hour].totalEfficiency += efficiency;
        hourlyPerformance[hour].count += 1;
      });

    // Return top 3 performing hours
    return Object.entries(hourlyPerformance)
      .map(([hour, data]: [string, { totalEfficiency: number; count: number }]) => ({
        hour: parseInt(hour),
        efficiency: Math.round((data.totalEfficiency / data.count) * 100),
      }))
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, 3);
    } catch (error) {
      console.error('Error calculating optimal learning times:', error);
      return [];
    }
  }

  private calculateKnowledgeGraphHealth(mindMapData: any): number {
    // Implementation would assess the health of the neural graph
    return mindMapData.knowledgeHealth || 50;
  }

  private calculateNeuralConnectionStrength(mindMapData: any): number {
    // Implementation would measure average connection strength
    return mindMapData.averageConnectionStrength || 0.5;
  }

  private async calculateMemoryPalaceUtilization(userId: string): Promise<number> {
    // Implementation would measure memory palace usage effectiveness
    return 0.3;
  }

  // Additional helper methods would be implemented here...
  private calculateDeepWorkCapacity(sessions: any[]): number {
    if (!sessions || sessions.length === 0) return 0;

    // Deep work capacity is based on longest uninterrupted focus sessions
    const deepSessions = sessions.filter(session =>
      session.durationMinutes >= 90 && session.distractionCount <= 2
    );

    if (deepSessions.length === 0) return 0;

    const averageDeepSession = deepSessions.reduce((sum, session) =>
      sum + session.durationMinutes, 0
    ) / deepSessions.length;

    // Normalize to 0-1 scale (max expected deep work session is 4 hours)
    return Math.min(averageDeepSession / 240, 1);
  }

  private async calculateCognitiveLoadTrend(userId: string): Promise<Array<{ date: string; load: number }>> {
    try {
      // Get focus sessions from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: sessions, error } = await supabase
        .from('focus_sessions')
        .select('created_at, cognitive_load, focus_efficiency')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error || !sessions || sessions.length === 0) return [];

      // Group by date and calculate average cognitive load
      const dailyLoad = sessions.reduce((acc: Record<string, { total: number; count: number }>, session: any) => {
        const date = new Date(session.created_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { total: 0, count: 0 };
        }
        acc[date].total += session.cognitive_load || session.focus_efficiency || 0.5;
        acc[date].count += 1;
        return acc;
      }, {});

      return Object.entries(dailyLoad).map(([date, data]) => ({
        date,
        load: data.total / data.count,
      }));
    } catch (error) {
      console.error('Error calculating cognitive load trend:', error);
      return [];
    }
  }

  private async calculateOptimalFocusWindows(sessions: any[]): Promise<Array<{ start: number; end: number; efficiency: number }>> {
    if (!sessions || sessions.length === 0) return [];

    // Analyze performance by hour of day
    const hourlyPerformance = sessions.reduce((acc, session) => {
      const hour = new Date(session.startTime || session.created_at).getHours();
      if (!acc[hour]) {
        acc[hour] = { totalEfficiency: 0, count: 0 };
      }
      acc[hour].totalEfficiency += session.focusEfficiency || session.efficiency || 0.5;
      acc[hour].count += 1;
      return acc;
    }, {} as Record<number, { totalEfficiency: number; count: number }>);

    // Find top 3 performing hours
    const sortedHours = Object.entries(hourlyPerformance)
      .map(([hour, data]) => ({
        start: parseInt(hour),
        end: (parseInt(hour) + 1) % 24,
        efficiency: (data as { totalEfficiency: number; count: number }).totalEfficiency / (data as { totalEfficiency: number; count: number }).count,
      }))
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, 3);

    return sortedHours;
  }

  private analyzeDistractionPatterns(analysis: any) {
    if (!analysis || !analysis.distractionTypes) return [];

    return Object.entries(analysis.distractionTypes || {}).map(([trigger, data]: [string, any]) => ({
      trigger,
      frequency: data.frequency || 0,
      impact: data.impact || 0.5,
    }));
  }

  private async getSpacedRepetitionAnalytics(userId: string) {
    return {};
  }

  private async getSleepAnalytics(userId: string) {
    return { qualityTrend: [] };
  }

  private async getExerciseAnalytics(userId: string) {
    return {};
  }

  private async getStressAnalytics(userId: string) {
    return { stressTrend: [] };
  }

  private async calculateExerciseImpact(userId: string): Promise<number> {
    try {
      // Get exercise data from health_metrics table
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: healthData, error } = await supabase
        .from('health_metrics')
        .select('exercise_frequency, exercise_intensity, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error || !healthData || healthData.length === 0) return 0;

      // Get focus sessions to correlate with exercise
      const { data: focusSessions, error: focusError } = await supabase
        .from('focus_sessions')
        .select('focus_efficiency, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (focusError || !focusSessions) return 0;

      // Calculate correlation between exercise and focus efficiency
      const exerciseDays = healthData.filter(h => (h.exercise_frequency || 0) > 0).length;
      const totalDays = Math.max(healthData.length, 1);
      const exerciseFrequency = exerciseDays / totalDays;

      // Average focus efficiency on exercise days vs non-exercise days
      const exerciseDayEfficiency = focusSessions
        .filter(session => {
          const sessionDate = new Date(session.created_at).toDateString();
          return healthData.some(h => {
            const healthDate = new Date(h.created_at).toDateString();
            return healthDate === sessionDate && (h.exercise_frequency || 0) > 0;
          });
        })
        .reduce((sum, session) => sum + (session.focus_efficiency || 0), 0);

      const nonExerciseDayEfficiency = focusSessions
        .filter(session => {
          const sessionDate = new Date(session.created_at).toDateString();
          return !healthData.some(h => {
            const healthDate = new Date(h.created_at).toDateString();
            return healthDate === sessionDate && (h.exercise_frequency || 0) > 0;
          });
        })
        .reduce((sum, session) => sum + (session.focus_efficiency || 0), 0);

      const avgExerciseEfficiency = exerciseDayEfficiency / Math.max(exerciseDays, 1);
      const avgNonExerciseEfficiency = nonExerciseDayEfficiency / Math.max(totalDays - exerciseDays, 1);

      // Impact is the difference in efficiency (0-1 scale)
      const impact = Math.max(0, Math.min(1, (avgExerciseEfficiency - avgNonExerciseEfficiency + 0.5)));

      return impact;
    } catch (error) {
      console.error('Error calculating exercise impact:', error);
      return 0;
    }
  }

  private async calculateOptimalPerformanceWindows(userId: string): Promise<Array<{ start: number; end: number; type: string }>> {
    try {
      // Get health metrics and focus sessions to determine optimal performance windows
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: healthData, error: healthError } = await supabase
        .from('health_metrics')
        .select('sleep_quality, stress_level, energy_level, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      const { data: focusData, error: focusError } = await supabase
        .from('focus_sessions')
        .select('focus_efficiency, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if ((healthError && focusError) || (!healthData && !focusData)) return [];

      // Analyze performance by hour of day
      const hourlyPerformance: Record<number, { health: number; focus: number; count: number }> = {};

      // Process health data by hour
      if (healthData) {
        healthData.forEach(entry => {
          const hour = new Date(entry.created_at).getHours();
          const healthScore = (
            (entry.sleep_quality || 0.5) * 0.4 +
            (1 - (entry.stress_level || 0.5)) * 0.4 +
            (entry.energy_level || 0.5) * 0.2
          );

          if (!hourlyPerformance[hour]) {
            hourlyPerformance[hour] = { health: 0, focus: 0, count: 0 };
          }
          hourlyPerformance[hour].health += healthScore;
          hourlyPerformance[hour].count += 1;
        });
      }

      // Process focus data by hour
      if (focusData) {
        focusData.forEach(session => {
          const hour = new Date(session.created_at).getHours();
          const focusScore = session.focus_efficiency || 0.5;

          if (!hourlyPerformance[hour]) {
            hourlyPerformance[hour] = { health: 0, focus: 0, count: 0 };
          }
          hourlyPerformance[hour].focus += focusScore;
          if (!healthData) hourlyPerformance[hour].count += 1; // Only increment if no health data
        });
      }

      // Calculate combined performance score for each hour
      const hourlyScores = Object.entries(hourlyPerformance).map(([hour, data]) => {
        const healthAvg = data.count > 0 ? data.health / data.count : 0.5;
        const focusAvg = data.count > 0 ? data.focus / data.count : 0.5;
        const combinedScore = (healthAvg * 0.6) + (focusAvg * 0.4);

        return {
          hour: parseInt(hour),
          score: combinedScore,
          health: healthAvg,
          focus: focusAvg,
        };
      });

      // Find optimal windows (2-hour blocks with highest average performance)
      const optimalWindows: Array<{ start: number; end: number; type: string }> = [];
      const sortedHours = hourlyScores.sort((a, b) => b.score - a.score);

      // Take top 3 hours and create 2-hour windows around them
      for (let i = 0; i < Math.min(3, sortedHours.length); i++) {
        const topHour = sortedHours[i];
        const start = topHour.hour;
        const end = (start + 2) % 24; // 2-hour window

        // Determine window type based on health vs focus dominance
        let type = 'balanced';
        if (topHour.health > topHour.focus + 0.2) type = 'health-optimal';
        else if (topHour.focus > topHour.health + 0.2) type = 'focus-optimal';

        optimalWindows.push({ start, end, type });
      }

      return optimalWindows;
    } catch (error) {
      console.error('Error calculating optimal performance windows:', error);
      return [];
    }
  }

  private async calculateHealthCognitiveCorrelation(userId: string): Promise<number> {
    try {
      // Get health metrics and cognitive performance data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: healthData, error: healthError } = await supabase
        .from('health_metrics')
        .select('sleep_quality, stress_level, exercise_frequency, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      const { data: focusData, error: focusError } = await supabase
        .from('focus_sessions')
        .select('focus_efficiency, cognitive_load, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if ((healthError && focusError) || (!healthData && !focusData)) return 0;

      // Create daily averages for correlation calculation
      const dailyHealth: Record<string, { health: number; count: number }> = {};
      const dailyCognitive: Record<string, { cognitive: number; count: number }> = {};

      // Process health data
      if (healthData) {
        healthData.forEach(entry => {
          const date = new Date(entry.created_at).toISOString().split('T')[0];
          const healthScore = (
            (entry.sleep_quality || 0.5) * 0.4 +
            (1 - (entry.stress_level || 0.5)) * 0.4 +
            Math.min((entry.exercise_frequency || 0) / 7, 1) * 0.2
          );

          if (!dailyHealth[date]) {
            dailyHealth[date] = { health: 0, count: 0 };
          }
          dailyHealth[date].health += healthScore;
          dailyHealth[date].count += 1;
        });
      }

      // Process cognitive data
      if (focusData) {
        focusData.forEach(session => {
          const date = new Date(session.created_at).toISOString().split('T')[0];
          const cognitiveScore = session.focus_efficiency || (1 - (session.cognitive_load || 0.5));

          if (!dailyCognitive[date]) {
            dailyCognitive[date] = { cognitive: 0, count: 0 };
          }
          dailyCognitive[date].cognitive += cognitiveScore;
          dailyCognitive[date].count += 1;
        });
      }

      // Calculate correlation between health and cognitive performance
      const commonDates = Object.keys(dailyHealth).filter(date => dailyCognitive[date]);

      if (commonDates.length < 3) return 0; // Need minimum data points

      const healthValues = commonDates.map(date => dailyHealth[date].health / dailyHealth[date].count);
      const cognitiveValues = commonDates.map(date => dailyCognitive[date].cognitive / dailyCognitive[date].count);

      // Simple Pearson correlation calculation
      const n = healthValues.length;
      const sumHealth = healthValues.reduce((a, b) => a + b, 0);
      const sumCognitive = cognitiveValues.reduce((a, b) => a + b, 0);
      const sumHealthSq = healthValues.reduce((a, b) => a + b * b, 0);
      const sumCognitiveSq = cognitiveValues.reduce((a, b) => a + b * b, 0);
      const sumHealthCognitive = healthValues.reduce((a, b, i) => a + b * cognitiveValues[i], 0);

      const numerator = n * sumHealthCognitive - sumHealth * sumCognitive;
      const denominator = Math.sqrt((n * sumHealthSq - sumHealth * sumHealth) * (n * sumCognitiveSq - sumCognitive * sumCognitive));

      const correlation = denominator === 0 ? 0 : numerator / denominator;

      // Return absolute correlation (0-1 scale, higher is better correlation)
      return Math.abs(correlation);
    } catch (error) {
      console.error('Error calculating health cognitive correlation:', error);
      return 0;
    }
  }

  private calculateBudgetAdherence(budgetData: any): number {
    try {
      if (!budgetData || typeof budgetData !== 'object') return 0;

      // Calculate budget adherence based on spending vs budget limits
      const categories = budgetData.categories || budgetData.spendingCategories || [];
      if (!Array.isArray(categories) || categories.length === 0) return 0;

      let totalBudget = 0;
      let totalSpent = 0;
      let categoriesWithinBudget = 0;

      categories.forEach((category: any) => {
        const budget = category.budget || category.limit || 0;
        const spent = category.spent || category.amount || 0;

        if (budget > 0) {
          totalBudget += budget;
          totalSpent += spent;

          // Count categories within budget (allowing 10% buffer)
          if (spent <= budget * 1.1) {
            categoriesWithinBudget += 1;
          }
        }
      });

      if (totalBudget === 0) return 0;

      // Calculate adherence as weighted average of spending ratio and category compliance
      const spendingRatio = Math.max(0, Math.min(1, totalBudget / Math.max(totalSpent, totalBudget)));
      const categoryCompliance = categoriesWithinBudget / categories.length;

      // Return adherence score (0-1 scale)
      return (spendingRatio * 0.6) + (categoryCompliance * 0.4);
    } catch (error) {
      console.error('Error calculating budget adherence:', error);
      return 0;
    }
  }

  private async calculateSavingsGrowthRate(userId: string): Promise<number> {
    try {
      // Get savings data from the last 90 days to calculate growth rate
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: savingsData, error } = await supabase
        .from('financial_metrics')
        .select('savings_balance, created_at')
        .eq('user_id', userId)
        .gte('created_at', ninetyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error || !savingsData || savingsData.length < 2) return 0;

      // Calculate growth rate using compound annual growth rate (CAGR)
      const firstBalance = savingsData[0].savings_balance || 0;
      const lastBalance = savingsData[savingsData.length - 1].savings_balance || 0;

      if (firstBalance <= 0) return 0;

      const daysDiff = (new Date(savingsData[savingsData.length - 1].created_at).getTime() -
                       new Date(savingsData[0].created_at).getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff <= 0) return 0;

      // Calculate daily growth rate
      const growthRate = Math.pow(lastBalance / firstBalance, 1 / daysDiff) - 1;

      // Annualize the growth rate (assuming 365 days per year)
      const annualizedRate = Math.pow(1 + growthRate, 365) - 1;

      // Return as percentage (0-1 scale, can be negative for losses)
      return Math.max(-1, Math.min(1, annualizedRate));
    } catch (error) {
      console.error('Error calculating savings growth rate:', error);
      return 0;
    }
  }

  private async calculateFinancialStressImpact(userId: string): Promise<number> {
    try {
      // Get financial metrics and cognitive load data to correlate financial stress with cognition
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: financialData, error: financialError } = await supabase
        .from('financial_metrics')
        .select('budget_pressure, spending_anxiety, debt_burden, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      const { data: focusData, error: focusError } = await supabase
        .from('focus_sessions')
        .select('cognitive_load, focus_efficiency, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if ((financialError && focusError) || (!financialData && !focusData)) return 0;

      // Create daily averages for correlation calculation
      const dailyFinancialStress: Record<string, { stress: number; count: number }> = {};
      const dailyCognitiveLoad: Record<string, { load: number; count: number }> = {};

      // Process financial stress data
      if (financialData) {
        financialData.forEach(entry => {
          const date = new Date(entry.created_at).toISOString().split('T')[0];
          const stressScore = (
            (entry.budget_pressure || 0.5) * 0.4 +
            (entry.spending_anxiety || 0.5) * 0.4 +
            (entry.debt_burden || 0.5) * 0.2
          );

          if (!dailyFinancialStress[date]) {
            dailyFinancialStress[date] = { stress: 0, count: 0 };
          }
          dailyFinancialStress[date].stress += stressScore;
          dailyFinancialStress[date].count += 1;
        });
      }

      // Process cognitive load data
      if (focusData) {
        focusData.forEach(session => {
          const date = new Date(session.created_at).toISOString().split('T')[0];
          const loadScore = session.cognitive_load || (1 - (session.focus_efficiency || 0.5));

          if (!dailyCognitiveLoad[date]) {
            dailyCognitiveLoad[date] = { load: 0, count: 0 };
          }
          dailyCognitiveLoad[date].load += loadScore;
          dailyCognitiveLoad[date].count += 1;
        });
      }

      // Calculate correlation between financial stress and cognitive load
      const commonDates = Object.keys(dailyFinancialStress).filter(date => dailyCognitiveLoad[date]);

      if (commonDates.length < 3) return 0; // Need minimum data points

      const stressValues = commonDates.map(date => dailyFinancialStress[date].stress / dailyFinancialStress[date].count);
      const loadValues = commonDates.map(date => dailyCognitiveLoad[date].load / dailyCognitiveLoad[date].count);

      // Simple Pearson correlation calculation
      const n = stressValues.length;
      const sumStress = stressValues.reduce((a, b) => a + b, 0);
      const sumLoad = loadValues.reduce((a, b) => a + b, 0);
      const sumStressSq = stressValues.reduce((a, b) => a + b * b, 0);
      const sumLoadSq = loadValues.reduce((a, b) => a + b * b, 0);
      const sumStressLoad = stressValues.reduce((a, b, i) => a + b * loadValues[i], 0);

      const numerator = n * sumStressLoad - sumStress * sumLoad;
      const denominator = Math.sqrt((n * sumStressSq - sumStress * sumStress) * (n * sumLoadSq - sumLoad * sumLoad));

      const correlation = denominator === 0 ? 0 : numerator / denominator;

      // Return absolute correlation (0-1 scale, higher means more impact)
      return Math.abs(correlation);
    } catch (error) {
      console.error('Error calculating financial stress impact:', error);
      return 0;
    }
  }

  private analyzeSpendingPatterns(budgetData: any): Array<{ category: string; amount: number; trend: 'up' | 'down' | 'stable' }> {
    try {
      if (!budgetData || typeof budgetData !== 'object') return [];

      const categories = budgetData.categories || budgetData.spendingCategories || [];
      if (!Array.isArray(categories) || categories.length === 0) return [];

      const spendingPatterns: Array<{ category: string; amount: number; trend: 'up' | 'down' | 'stable' }> = [];

      categories.forEach((category: any) => {
        const categoryName = category.name || category.category || 'Unknown';
        const currentAmount = category.spent || category.amount || 0;
        const budgetAmount = category.budget || category.limit || 0;

        // Determine trend based on spending vs budget ratio
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (budgetAmount > 0) {
          const spendingRatio = currentAmount / budgetAmount;
          if (spendingRatio > 1.2) trend = 'up'; // Overspending significantly
          else if (spendingRatio < 0.8) trend = 'down'; // Underspending
          // else stable
        }

        spendingPatterns.push({
          category: categoryName,
          amount: currentAmount,
          trend,
        });
      });

      // Sort by amount descending
      return spendingPatterns.sort((a, b) => b.amount - a.amount);
    } catch (error) {
      console.error('Error analyzing spending patterns:', error);
      return [];
    }
  }

  private async calculateFinancialGoalProgress(userId: string): Promise<number> {
    try {
      // Get financial goals and current progress from database
      const { data: goals, error } = await supabase
        .from('financial_goals')
        .select('goal_amount, current_amount, target_date, created_at')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error || !goals || goals.length === 0) return 0;

      // Calculate weighted progress across all active goals
      let totalWeightedProgress = 0;
      let totalWeight = 0;

      goals.forEach(goal => {
        const targetAmount = goal.goal_amount || 0;
        const currentAmount = goal.current_amount || 0;

        if (targetAmount > 0) {
          const progress = Math.min(currentAmount / targetAmount, 1); // Cap at 100%

          // Weight by goal size (larger goals have more impact)
          const weight = targetAmount;
          totalWeightedProgress += progress * weight;
          totalWeight += weight;
        }
      });

      if (totalWeight === 0) return 0;

      // Return overall progress (0-1 scale)
      return totalWeightedProgress / totalWeight;
    } catch (error) {
      console.error('Error calculating financial goal progress:', error);
      return 0;
    }
  }

  private async calculateDebtReductionRate(userId: string): Promise<number> {
    try {
      // Get debt data from the last 90 days to calculate reduction rate
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: debtData, error } = await supabase
        .from('financial_metrics')
        .select('debt_balance, created_at')
        .eq('user_id', userId)
        .gte('created_at', ninetyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error || !debtData || debtData.length < 2) return 0;

      // Calculate debt reduction rate
      const firstDebt = debtData[0].debt_balance || 0;
      const lastDebt = debtData[debtData.length - 1].debt_balance || 0;

      if (firstDebt <= 0) return 0; // No debt to reduce

      const daysDiff = (new Date(debtData[debtData.length - 1].created_at).getTime() -
                       new Date(debtData[0].created_at).getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff <= 0) return 0;

      // Calculate debt reduction amount and rate
      const debtReduction = firstDebt - lastDebt;

      if (debtReduction <= 0) return 0; // Debt increased or stayed the same

      // Calculate monthly reduction rate (positive means debt is being reduced)
      const monthlyReductionRate = (debtReduction / daysDiff) * 30;

      // Return as a normalized score (0-1 scale, higher is better)
      // Assuming a good debt reduction rate is reducing debt by at least 1% of original debt per month
      const normalizedRate = Math.min(monthlyReductionRate / (firstDebt * 0.01), 1);

      return Math.max(0, normalizedRate);
    } catch (error) {
      console.error('Error calculating debt reduction rate:', error);
      return 0;
    }
  }

  private async calculateFinancialWellnessTrend(userId: string): Promise<Array<{ date: string; score: number }>> {
    try {
      // Get financial metrics from the last 30 days to calculate wellness trend
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: financialData, error } = await supabase
        .from('financial_metrics')
        .select('budget_pressure, spending_anxiety, savings_balance, debt_balance, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error || !financialData || financialData.length === 0) return [];

      // Calculate daily financial wellness scores
      const dailyWellness: Record<string, { scores: number[]; count: number }> = {};

      financialData.forEach(entry => {
        const date = new Date(entry.created_at).toISOString().split('T')[0];

        // Calculate wellness score based on multiple factors
        const budgetPressure = entry.budget_pressure || 0.5;
        const spendingAnxiety = entry.spending_anxiety || 0.5;
        const savingsBalance = entry.savings_balance || 0;
        const debtBalance = entry.debt_balance || 0;

        // Normalize savings and debt (assuming positive savings and low debt are good)
        const savingsScore = Math.min(savingsBalance / 10000, 1); // Cap at $10k for normalization
        const debtScore = Math.max(0, 1 - (debtBalance / 50000)); // Lower debt is better, cap at $50k

        // Overall wellness score (0-1 scale)
        const wellnessScore = (
          (1 - budgetPressure) * 0.3 +      // Lower budget pressure is better
          (1 - spendingAnxiety) * 0.3 +     // Lower anxiety is better
          savingsScore * 0.2 +               // Higher savings is better
          debtScore * 0.2                    // Lower debt is better
        );

        if (!dailyWellness[date]) {
          dailyWellness[date] = { scores: [], count: 0 };
        }
        dailyWellness[date].scores.push(wellnessScore);
        dailyWellness[date].count += 1;
      });

      // Return daily averages
      return Object.entries(dailyWellness)
        .map(([date, data]) => ({
          date,
          score: data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('Error calculating financial wellness trend:', error);
      return [];
    }
  }

  private async analyzeWeatherImpact(userId: string): Promise<Array<{ condition: string; impact: number }>> {
    try {
      // Get weather data and correlate with performance metrics
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Note: This would typically integrate with a weather API
      // For now, we'll simulate weather data based on focus sessions
      const { data: focusSessions, error } = await supabase
        .from('focus_sessions')
        .select('focus_efficiency, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error || !focusSessions || focusSessions.length === 0) return [];

      // Simulate weather conditions based on dates (this would come from weather API)
      const weatherConditions = ['sunny', 'cloudy', 'rainy', 'windy', 'snowy'];
      const weatherImpact: Record<string, { efficiency: number[]; count: number }> = {};

      focusSessions.forEach(session => {
        // Simulate weather based on date (in real implementation, this would be from weather API)
        const date = new Date(session.created_at);
        const dayOfMonth = date.getDate();
        const condition = weatherConditions[dayOfMonth % weatherConditions.length];

        if (!weatherImpact[condition]) {
          weatherImpact[condition] = { efficiency: [], count: 0 };
        }
        weatherImpact[condition].efficiency.push(session.focus_efficiency || 0.5);
        weatherImpact[condition].count += 1;
      });

      // Calculate average impact for each weather condition
      return Object.entries(weatherImpact)
        .map(([condition, data]) => ({
          condition,
          impact: data.efficiency.reduce((sum, eff) => sum + eff, 0) / data.efficiency.length,
        }))
        .sort((a, b) => b.impact - a.impact);
    } catch (error) {
      console.error('Error analyzing weather impact:', error);
      return [];
    }
  }

  private async calculateNoiseImpact(userId: string): Promise<number> {
    try {
      // Get focus sessions with distraction data to analyze noise impact
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: focusSessions, error } = await supabase
        .from('focus_sessions')
        .select('distraction_count, focus_efficiency, duration_minutes, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error || !focusSessions || focusSessions.length === 0) return 0;

      // Calculate correlation between distractions (proxy for noise) and focus efficiency
      const sessionsWithDistractions = focusSessions.filter(session =>
        (session.distraction_count || 0) > 0
      );

      if (sessionsWithDistractions.length === 0) return 0;

      // Calculate average efficiency drop due to distractions
      const avgEfficiencyWithDistractions = sessionsWithDistractions.reduce(
        (sum, session) => sum + (session.focus_efficiency || 0.5), 0
      ) / sessionsWithDistractions.length;

      const avgEfficiencyOverall = focusSessions.reduce(
        (sum, session) => sum + (session.focus_efficiency || 0.5), 0
      ) / focusSessions.length;

      // Impact is the efficiency drop attributed to noise/distractions (0-1 scale)
      const impact = Math.max(0, Math.min(1, (avgEfficiencyOverall - avgEfficiencyWithDistractions) + 0.5));

      return impact;
    } catch (error) {
      console.error('Error calculating noise impact:', error);
      return 0;
    }
  }

  private async calculateLightingImpact(userId: string): Promise<number> {
    try {
      // Get focus sessions with time data to analyze lighting impact
      // Lighting impact is typically higher during evening/night hours when artificial lighting matters more
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: focusSessions, error } = await supabase
        .from('focus_sessions')
        .select('focus_efficiency, duration_minutes, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error || !focusSessions || focusSessions.length === 0) return 0;

      // Analyze performance by time of day (lighting conditions)
      const daytimeSessions = focusSessions.filter(session => {
        const hour = new Date(session.created_at).getHours();
        return hour >= 6 && hour <= 18; // Daytime (natural light)
      });

      const eveningSessions = focusSessions.filter(session => {
        const hour = new Date(session.created_at).getHours();
        return hour >= 19 || hour <= 5; // Evening/night (artificial light)
      });

      if (daytimeSessions.length === 0 || eveningSessions.length === 0) return 0;

      // Calculate average efficiency for each lighting condition
      const avgDaytimeEfficiency = daytimeSessions.reduce(
        (sum, session) => sum + (session.focus_efficiency || 0.5), 0
      ) / daytimeSessions.length;

      const avgEveningEfficiency = eveningSessions.reduce(
        (sum, session) => sum + (session.focus_efficiency || 0.5), 0
      ) / eveningSessions.length;

      // Impact is the difference in efficiency between lighting conditions (0-1 scale)
      // Positive impact means artificial lighting helps, negative means it hinders
      const impact = Math.max(-1, Math.min(1, avgEveningEfficiency - avgDaytimeEfficiency));

      // Return absolute value as impact score (0-1 scale)
      return Math.abs(impact);
    } catch (error) {
      console.error('Error calculating lighting impact:', error);
      return 0;
    }
  }

  private async generateOptimalSchedule(userId: string): Promise<Array<{ time: string; activity: string; confidence: number }>> {
    try {
      // Get user's optimal performance windows and learning patterns
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: focusSessions, error: focusError } = await supabase
        .from('focus_sessions')
        .select('created_at, focus_efficiency, duration_minutes')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      const { data: healthData, error: healthError } = await supabase
        .from('health_metrics')
        .select('sleep_quality, energy_level, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if ((focusError && healthError) || (!focusSessions && !healthData)) return [];

      // Analyze performance by hour of day
      const hourlyPerformance: Record<number, { efficiency: number; count: number; health: number }> = {};

      // Process focus data
      if (focusSessions) {
        focusSessions.forEach(session => {
          const hour = new Date(session.created_at).getHours();
          if (!hourlyPerformance[hour]) {
            hourlyPerformance[hour] = { efficiency: 0, count: 0, health: 0.5 };
          }
          hourlyPerformance[hour].efficiency += session.focus_efficiency || 0.5;
          hourlyPerformance[hour].count += 1;
        });
      }

      // Process health data
      if (healthData) {
        healthData.forEach(entry => {
          const hour = new Date(entry.created_at).getHours();
          const healthScore = (entry.sleep_quality || 0.5) * 0.6 + (entry.energy_level || 0.5) * 0.4;

          if (!hourlyPerformance[hour]) {
            hourlyPerformance[hour] = { efficiency: 0.5, count: 1, health: 0 };
          }
          hourlyPerformance[hour].health += healthScore;
          if (!focusSessions) hourlyPerformance[hour].count += 1;
        });
      }

      // Calculate combined scores and find optimal times
      const optimalSchedule: Array<{ time: string; activity: string; confidence: number }> = [];
      const sortedHours = Object.entries(hourlyPerformance)
        .map(([hour, data]) => ({
          hour: parseInt(hour),
          score: (data.efficiency / Math.max(data.count, 1)) * 0.6 + (data.health / Math.max(data.count, 1)) * 0.4,
          efficiency: data.efficiency / Math.max(data.count, 1),
          health: data.health / Math.max(data.count, 1),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5); // Top 5 hours

      // Generate schedule recommendations
      const activities = [
        'Deep Learning Session',
        'Problem Solving',
        'Creative Work',
        'Review & Practice',
        'Planning & Strategy'
      ];

      sortedHours.forEach((hourData, index) => {
        const timeString = `${hourData.hour.toString().padStart(2, '0')}:00`;
        const activity = activities[index % activities.length];
        const confidence = Math.round(hourData.score * 100);

        optimalSchedule.push({
          time: timeString,
          activity,
          confidence,
        });
      });

      return optimalSchedule;
    } catch (error) {
      console.error('Error generating optimal schedule:', error);
      return [];
    }
  }

  private async detectAnomalies(userId: string): Promise<Array<{ type: string; severity: number; description: string }>> {
    try {
      const anomalies: Array<{ type: string; severity: number; description: string }> = [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Check for focus efficiency anomalies
      const { data: focusSessions, error: focusError } = await supabase
        .from('focus_sessions')
        .select('focus_efficiency, duration_minutes, distraction_count, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (!focusError && focusSessions && focusSessions.length > 5) {
        const efficiencies = focusSessions.map(s => s.focus_efficiency || 0.5);
        const avgEfficiency = efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length;
        const stdDev = Math.sqrt(
          efficiencies.reduce((sum, eff) => sum + Math.pow(eff - avgEfficiency, 2), 0) / efficiencies.length
        );

        // Check for significant drops in recent sessions
        const recentSessions = focusSessions.slice(-3);
        const recentAvg = recentSessions.reduce((sum, s) => sum + (s.focus_efficiency || 0.5), 0) / recentSessions.length;

        if (recentAvg < avgEfficiency - (stdDev * 1.5)) {
          anomalies.push({
            type: 'performance_drop',
            severity: Math.min(5, Math.round((avgEfficiency - recentAvg) / stdDev)),
            description: `Focus efficiency dropped significantly in recent sessions (${(recentAvg * 100).toFixed(1)}% vs ${(avgEfficiency * 100).toFixed(1)}% average)`,
          });
        }

        // Check for unusually long sessions with low efficiency
        const inefficientLongSessions = focusSessions.filter(s =>
          s.duration_minutes > 120 && (s.focus_efficiency || 0.5) < 0.3
        );

        if (inefficientLongSessions.length > 0) {
          anomalies.push({
            type: 'behavioral_change',
            severity: Math.min(4, inefficientLongSessions.length),
            description: `${inefficientLongSessions.length} long focus sessions (>2hrs) showed very low efficiency, suggesting fatigue or distraction issues`,
          });
        }
      }

      // Check for health metric anomalies
      const { data: healthData, error: healthError } = await supabase
        .from('health_metrics')
        .select('sleep_quality, stress_level, energy_level, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (!healthError && healthData && healthData.length > 3) {
        const recentHealth = healthData.slice(-3);
        const olderHealth = healthData.slice(-7, -3);

        if (recentHealth.length > 0 && olderHealth.length > 0) {
          const recentStress = recentHealth.reduce((sum, h) => sum + (h.stress_level || 0.5), 0) / recentHealth.length;
          const olderStress = olderHealth.reduce((sum, h) => sum + (h.stress_level || 0.5), 0) / olderHealth.length;

          if (recentStress > olderStress + 0.3) {
            anomalies.push({
              type: 'behavioral_change',
              severity: Math.min(4, Math.round((recentStress - olderStress) * 10)),
              description: `Stress levels have increased significantly (${(recentStress * 100).toFixed(1)}% vs ${(olderStress * 100).toFixed(1)}% previously)`,
            });
          }

          const recentSleep = recentHealth.reduce((sum, h) => sum + (h.sleep_quality || 0.5), 0) / recentHealth.length;
          const olderSleep = olderHealth.reduce((sum, h) => sum + (h.sleep_quality || 0.5), 0) / olderHealth.length;

          if (recentSleep < olderSleep - 0.3) {
            anomalies.push({
              type: 'performance_drop',
              severity: Math.min(4, Math.round((olderSleep - recentSleep) * 10)),
              description: `Sleep quality has declined significantly (${(recentSleep * 100).toFixed(1)}% vs ${(olderSleep * 100).toFixed(1)}% previously)`,
            });
          }
        }
      }

      // Check for learning pattern anomalies
      const { data: flashcards, error: flashcardError } = await supabase
        .from('flashcards')
        .select('review_history, mastery_level, created_at')
        .eq('user_id', userId);

      if (!flashcardError && flashcards && flashcards.length > 0) {
        const atRiskCards = flashcards.filter(card => {
          if (!card.review_history || !Array.isArray(card.review_history)) return false;
          const recentReviews = card.review_history.slice(-3);
          const incorrectRecent = recentReviews.filter((r: any) => !r.correct).length;
          return incorrectRecent >= 2; // 2 or more incorrect in last 3 reviews
        });

        if (atRiskCards.length > flashcards.length * 0.3) { // More than 30% at risk
          anomalies.push({
            type: 'data_inconsistency',
            severity: Math.min(3, Math.round(atRiskCards.length / flashcards.length * 10)),
            description: `${atRiskCards.length} cards (${Math.round(atRiskCards.length / flashcards.length * 100)}%) are at risk of being forgotten`,
          });
        }
      }

      return anomalies.sort((a, b) => b.severity - a.severity);
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      return [];
    }
  }

  private async predictFocusTrend(userId: string, days: number) {
    return [];
  }

  private async predictRetentionRisk(userId: string) {
    return [];
  }

  private async calculateOptimalChallengeLevel(userId: string): Promise<number> {
    return 0.7;
  }

  private async calculateBurnoutRisk(userId: string): Promise<number> {
    return 0.3;
  }

  private async predictPerformancePeak(userId: string): Promise<string> {
    return 'Tomorrow at 10 AM';
  }

  private async calculateOptimalBreakFrequency(userId: string): Promise<number> {
    return 45;
  }

  /**
   * Clear analytics cache
   */
  public clearCache(): void {
    this.reportCache.clear();
    this.correlationCache.clear();
  }

  /**
   * Get cached report if available
   */
  public getCachedReport(userId: string): HolisticAnalyticsReport | null {
    const cacheKey = `holistic_${userId}`;
    const cached = this.reportCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) {
      return cached.data;
    }

    return null;
  }

  /**
   * Persist analytics report to database
   */
  private async persistReportToDatabase(report: HolisticAnalyticsReport): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('analytics_reports')
        .insert({
          user_id: report.userId,
          report_id: report.reportId,
          timestamp: report.timestamp,
          report_data: report,
          created_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      console.log('Analytics report persisted successfully:', report.reportId);
    } catch (error) {
      console.error('Error persisting analytics report:', error);
      throw error;
    }
  }
}

export default AnalyticsAggregationService;
