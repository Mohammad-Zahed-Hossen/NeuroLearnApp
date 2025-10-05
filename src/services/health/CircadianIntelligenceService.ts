import { supabase } from '../storage/SupabaseService';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';
import HybridStorageService from '../storage/HybridStorageService';

interface CircadianData {
  lightExposure: number[];
  sleepPatterns: SleepEntry[];
  cognitivePerformance: number[];
  bodyTemperature?: number[];
}

interface SleepEntry {
  id: string;
  userId: string;
  bedtime: string;
  wakeTime: string;
  duration: number;
  quality: number;
  sleepDebt?: number;
  date: string;
}

export class CircadianIntelligenceService {
  private static instance: CircadianIntelligenceService;
  private storage: any;

  static getInstance(): CircadianIntelligenceService {
    if (!CircadianIntelligenceService.instance) {
      CircadianIntelligenceService.instance = new CircadianIntelligenceService();
    }
    return CircadianIntelligenceService.instance;
  }

  constructor() {
    this.storage = supabase;
  }

  /**
   * Circadian Rhythm Deviation Index (CRDI) Algorithm
   * Measures sleep schedule consistency - core metric for circadian health
   */
  async calculateCRDI(userId: string, days: number = 14): Promise<number> {
    try {
      const sleepData = await this.getSleepEntries(userId, days);

      if (sleepData.length < 7) return 0;

      const bedtimes = sleepData.map(entry => {
        const bedtime = new Date(entry.bedtime);
        return bedtime.getHours() + bedtime.getMinutes() / 60;
      });

      const waketimes = sleepData.map(entry => {
        const waketime = new Date(entry.wakeTime);
        return waketime.getHours() + waketime.getMinutes() / 60;
      });

      // Calculate standard deviation for consistency
      const bedtimeStdDev = this.calculateStandardDeviation(bedtimes);
      const waketimeStdDev = this.calculateStandardDeviation(waketimes);

      // CRDI: Lower values = better consistency (0-100 scale)
      const crdi = Math.max(0, 100 - ((bedtimeStdDev + waketimeStdDev) * 25));

      return Math.round(crdi);
    } catch (error) {
      console.error('Error calculating CRDI:', error);
      return 0;
    }
  }

  /**
   * Optimal Sleep Window Prediction using Ultradian Rhythms
   * Integrates with user's cognitive performance data from existing NeuroLearn features
   */
  async predictOptimalSleepWindow(userId: string): Promise<{
    bedtime: Date;
    wakeTime: Date;
    confidence: number;
    cognitiveImpact: string;
  }> {
    try {
      const sleepHistory = await this.getSleepEntries(userId, 30);
      const cognitiveData = await this.getCognitivePerformanceData(userId);

      if (sleepHistory.length < 7) {
        const defaultBedtime = new Date();
        defaultBedtime.setHours(22, 30, 0, 0);
        const defaultWakeTime = new Date(defaultBedtime.getTime() + 8 * 60 * 60 * 1000);

        return {
          bedtime: defaultBedtime,
          wakeTime: defaultWakeTime,
          confidence: 0.3,
          cognitiveImpact: 'Insufficient data for prediction'
        };
      }

      // Analyze historical patterns with circadian science
      const avgSleepDuration = sleepHistory.reduce((sum, entry) => sum + entry.duration, 0) / sleepHistory.length;
      const optimalDuration = Math.max(7, Math.min(9, avgSleepDuration));

      // Use chronotype and cognitive performance correlation
      const chronotype = await this.determineChronotype(userId);
      const baseOptimalBedtime = this.getChronotypeBaseline(chronotype);

      // Adjust for cognitive performance correlation
      const adjustedBedtime = this.optimizeBedtimeForCognition(baseOptimalBedtime, cognitiveData);

      const optimalBedtime = new Date();
      optimalBedtime.setHours(Math.floor(adjustedBedtime), (adjustedBedtime % 1) * 60);

      const optimalWakeTime = new Date(optimalBedtime.getTime() + (optimalDuration * 60 * 60 * 1000));

      return {
        bedtime: optimalBedtime,
        wakeTime: optimalWakeTime,
        confidence: this.calculatePredictionConfidence(sleepHistory),
        cognitiveImpact: this.predictCognitiveImpact(optimalDuration, chronotype)
      };
    } catch (error) {
      console.error('Error predicting optimal sleep window:', error);
      const fallbackBedtime = new Date();
      fallbackBedtime.setHours(22, 30, 0, 0);
      const fallbackWakeTime = new Date(fallbackBedtime.getTime() + 8 * 60 * 60 * 1000);

      return {
        bedtime: fallbackBedtime,
        wakeTime: fallbackWakeTime,
        confidence: 0,
        cognitiveImpact: 'Unable to predict due to error'
      };
    }
  }

  /**
   * Sleep Pressure Modeling using Two-Process Model
   * Integrates with NeuroLearn's focus tracking and cognitive load data
   */
  async calculateSleepPressure(userId: string): Promise<{
    currentPressure: number;
    optimalBedtime: Date;
    alertnessScore: number;
    cognitiveLoadImpact: number;
  }> {
    try {
      const lastSleep = await this.getLastSleepEntry(userId);
      const currentTime = new Date();
      const focusData = await this.getFocusSessionData(userId); // From existing NeuroLearn

      if (!lastSleep) {
        return {
          currentPressure: 80,
          optimalBedtime: new Date(currentTime.getTime() + 2 * 60 * 60 * 1000),
          alertnessScore: 30,
          cognitiveLoadImpact: 50
        };
      }

      const awakeHours = differenceInMinutes(currentTime, new Date(lastSleep.wakeTime)) / 60;

      // Two-process model: Process S (sleep pressure) and Process C (circadian)
      const processS = this.calculateProcessS(awakeHours, lastSleep.sleepDebt || 0);
      const processC = this.calculateProcessC(currentTime);

      // Factor in cognitive load from NeuroLearn focus sessions
      const cognitiveLoadFactor = this.calculateCognitiveLoadImpact(focusData);

      const sleepPressure = processS + processC + cognitiveLoadFactor;
      const alertnessScore = Math.max(0, 100 - sleepPressure);

      // Calculate optimal bedtime based on sleep pressure and circadian rhythm
      const optimalBedtime = this.calculateOptimalBedtime(sleepPressure, processC);

      return {
        currentPressure: Math.min(100, sleepPressure),
        optimalBedtime,
        alertnessScore: Math.round(alertnessScore),
        cognitiveLoadImpact: cognitiveLoadFactor
      };
    } catch (error) {
      console.error('Error calculating sleep pressure:', error);
      return {
        currentPressure: 50,
        optimalBedtime: new Date(),
        alertnessScore: 50,
        cognitiveLoadImpact: 0
      };
    }
  }

  // Private methods
  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / squaredDiffs.length;
    return Math.sqrt(avgSquaredDiff);
  }

  private async determineChronotype(userId: string): Promise<'lark' | 'owl' | 'third-bird'> {
    const sleepData = await this.getSleepEntries(userId, 30);
    if (sleepData.length === 0) return 'third-bird';

    const avgBedtime = sleepData.reduce((sum, entry) => {
      const bedtime = new Date(entry.bedtime);
      return sum + bedtime.getHours() + bedtime.getMinutes() / 60;
    }, 0) / sleepData.length;

    if (avgBedtime < 22) return 'lark';
    if (avgBedtime > 23.5) return 'owl';
    return 'third-bird';
  }

  private getChronotypeBaseline(chronotype: string): number {
    switch (chronotype) {
      case 'lark': return 21.5; // 9:30 PM
      case 'owl': return 23.5;  // 11:30 PM
      default: return 22.5;     // 10:30 PM
    }
  }

  private calculateProcessS(awakeHours: number, sleepDebt: number): number {
    // Exponential accumulation of sleep pressure
    const basePressure = (awakeHours / 16) * 60; // 60% after 16 hours awake
    const debtMultiplier = 1 + (sleepDebt / 480); // Sleep debt in minutes
    return Math.min(80, basePressure * debtMultiplier);
  }

  private calculateProcessC(currentTime: Date): number {
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    const timeDecimal = hour + minute / 60;

    // Circadian alertness curve (simplified)
    const circadianCurve = Math.sin((timeDecimal - 6) * Math.PI / 12) * 20;
    return Math.max(-20, Math.min(20, circadianCurve));
  }

  private calculateCognitiveLoadImpact(focusData: any): number {
    if (!focusData || focusData.length === 0) return 0;

    // High cognitive load increases sleep pressure
    const avgCognitiveLoad = focusData.reduce((sum: number, session: any) =>
      sum + (session.cognitiveLoad || 0), 0) / focusData.length;

    return Math.min(15, avgCognitiveLoad * 0.3);
  }

  private optimizeBedtimeForCognition(baseBedtime: number, cognitiveData: any): number {
    if (!cognitiveData || cognitiveData.length === 0) return baseBedtime;

    // Analyze correlation between bedtime and cognitive performance
    // This would integrate with NeuroLearn's existing cognitive assessment data
    const performanceCorrelation = this.analyzeCognitiveCorrelation(cognitiveData);

    // Adjust bedtime based on when cognitive performance peaks
    return baseBedtime + performanceCorrelation;
  }

  private analyzeCognitiveCorrelation(cognitiveData: any): number {
    // Placeholder for cognitive performance correlation analysis
    // Would integrate with NeuroLearn's learning analytics
    return 0;
  }

  private predictCognitiveImpact(duration: number, chronotype: string): string {
    const impacts = [];

    if (duration < 7) {
      impacts.push('Reduced focus and memory consolidation');
    } else if (duration > 9) {
      impacts.push('Potential grogginess and reduced alertness');
    } else {
      impacts.push('Optimal for learning and memory');
    }

    if (chronotype === 'lark') {
      impacts.push('Best cognitive performance in morning hours');
    } else if (chronotype === 'owl') {
      impacts.push('Peak cognitive performance in evening hours');
    }

    return impacts.join('. ');
  }

  private calculatePredictionConfidence(sleepHistory: SleepEntry[]): number {
    const consistency = this.calculateStandardDeviation(
      sleepHistory.map(entry => entry.duration)
    );

    const dataPoints = sleepHistory.length;
    const baseConfidence = Math.min(1, dataPoints / 30);
    const consistencyFactor = Math.max(0, 1 - consistency / 3);

    return Math.round((baseConfidence * consistencyFactor) * 100) / 100;
  }

  private calculateOptimalBedtime(sleepPressure: number, circadianPhase: number): Date {
    const baseHour = 22; // 10 PM base
    const pressureAdjustment = (sleepPressure - 50) / 100; // -0.5 to +0.5 hours
    const circadianAdjustment = circadianPhase / 40; // Small circadian adjustment

    const optimalHour = baseHour + pressureAdjustment + circadianAdjustment;

    const bedtime = new Date();
    bedtime.setHours(Math.floor(optimalHour), (optimalHour % 1) * 60, 0, 0);

    return bedtime;
  }

  // Integration methods with existing NeuroLearn services
  private async getSleepEntries(userId: string, days: number): Promise<SleepEntry[]> {
    try {
      const entries = await HybridStorageService.getInstance().getSleepEntries(userId, days);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      return entries.filter(entry => new Date(entry.date) >= cutoffDate);
    } catch (error) {
      console.error('Error getting sleep entries:', error);
      return [];
    }
  }

  private async getLastSleepEntry(userId: string): Promise<SleepEntry | null> {
    const entries = await this.getSleepEntries(userId, 7);
    return entries.length > 0 ? entries[0] : null;
  }

  async getCognitivePerformanceData(userId: string): Promise<any[]> {
    // Integration point with NeuroLearn's cognitive assessment data
    try {
      return await HybridStorageService.getInstance().getCognitiveMetrics(userId);
    } catch (error) {
      console.error('Error getting cognitive performance data:', error);
      return [];
    }
  }

  async getHealthMetrics(userId: string): Promise<{
    stressLevel: number;
    recoveryStatus: 'fatigued' | 'recovered' | 'normal';
    workoutIntensity: number;
    sleepQuality: number;
  } | null> {
    try {
      const healthDataRaw = await HybridStorageService.getInstance().getHealthMetrics(userId);
      if (!healthDataRaw) return null;

      // Handle both single object and array cases
      const healthData = Array.isArray(healthDataRaw) ? healthDataRaw : [healthDataRaw];
      if (healthData.length === 0) return null;

      // Get most recent health metrics
      const latest = healthData[0];

      // Calculate recovery status based on recent workout and sleep data
      const recentWorkouts = healthData.slice(0, 7); // Last 7 days
      const avgWorkoutIntensity = recentWorkouts.reduce((sum: number, h: any) => sum + (h.workoutIntensity || 0), 0) / recentWorkouts.length;

      let recoveryStatus: 'fatigued' | 'recovered' | 'normal' = 'normal';
      if (avgWorkoutIntensity > 70) {
        recoveryStatus = 'fatigued';
      } else if (avgWorkoutIntensity > 40) {
        recoveryStatus = 'recovered';
      }

      return {
        stressLevel: latest.stressLevel || 50,
        recoveryStatus,
        workoutIntensity: latest.workoutIntensity || 0,
        sleepQuality: latest.sleepQuality || 70,
      };
    } catch (error) {
      console.error('Error getting health metrics:', error);
      return null;
    }
  }

  private async getFocusSessionData(userId: string): Promise<any[]> {
    // Integration point with NeuroLearn's focus tracking
    try {
      return await HybridStorageService.getInstance().getFocusSessions();
    } catch (error) {
      console.error('Error getting focus session data:', error);
      return [];
    }
  }
}

export default CircadianIntelligenceService;
