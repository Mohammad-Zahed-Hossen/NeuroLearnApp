import StorageService from '../storage/StorageService';
import { differenceInMinutes, format } from 'date-fns';

export class AdvancedSleepService {
  private storage: StorageService;

  constructor() {
  this.storage = StorageService.getInstance();
  }

  // Sleep Architecture Analysis
  async analyzeSleepArchitecture(userId: string): Promise<{
    sleepEfficiency: number;
    deepSleepPercentage: number;
    remPercentage: number;
    sleepFragmentation: number;
    recommendations: string[];
  }> {
    const sleepData = await this.storage.getSleepEntries(userId, 30);
    const movementData = await this.getMovementPatterns(userId);

    // Estimate sleep stages using movement patterns and duration
    const sleepStages = this.estimateSleepStages(sleepData, movementData);

    return {
      sleepEfficiency: this.calculateSleepEfficiency(sleepData),
      deepSleepPercentage: sleepStages.deepSleep,
      remPercentage: sleepStages.rem,
      sleepFragmentation: this.calculateFragmentation(movementData),
      recommendations: this.generateSleepRecommendations(sleepStages)
    };
  }

  // Sleep Pressure Modeling
  async calculateSleepPressure(userId: string): Promise<{
    currentPressure: number;
    optimalBedtime: Date;
    alertnessScore: number;
  }> {
    const lastSleep = await this.storage.getLastSleepEntry(userId);
    const currentTime = new Date();

    if (!lastSleep) {
      return {
        currentPressure: 80,
        optimalBedtime: new Date(currentTime.getTime() + 2 * 60 * 60 * 1000),
        alertnessScore: 30
      };
    }

    const awakeHours = differenceInMinutes(currentTime, new Date(lastSleep.wakeTime)) / 60;

    // Two-process model: Process S (sleep pressure) and Process C (circadian)
    const processS = this.calculateProcessS(awakeHours, lastSleep.sleepDebt || 0);
    const processC = this.calculateProcessC(currentTime);

    const sleepPressure = processS + processC;
    const alertnessScore = Math.max(0, 100 - sleepPressure);

    // Calculate optimal bedtime based on sleep pressure and circadian rhythm
    const optimalBedtime = this.calculateOptimalBedtime(sleepPressure, processC);

    return {
      currentPressure: Math.min(100, sleepPressure),
      optimalBedtime,
      alertnessScore: Math.round(alertnessScore)
    };
  }

  // Smart Wake-up Optimization
  async optimizeWakeTime(userId: string, targetWakeTime: Date): Promise<{
    recommendedWakeTime: Date;
    sleepCycles: number;
    expectedAlertness: number;
  }> {
    const userProfile = await this.storage.getUserHealthProfile(userId);
    const avgCycleLength = userProfile.avgSleepCycleLength || 90; // minutes

    const bedtime = new Date(targetWakeTime);
    bedtime.setHours(bedtime.getHours() - 8); // Assume 8 hours target

    const totalSleepMinutes = differenceInMinutes(targetWakeTime, bedtime);
    const exactCycles = totalSleepMinutes / avgCycleLength;

    // Round to nearest half cycle for optimal awakening
    const optimalCycles = Math.round(exactCycles * 2) / 2;
    const optimalSleepDuration = optimalCycles * avgCycleLength;

    const recommendedWakeTime = new Date(bedtime.getTime() + optimalSleepDuration * 60 * 1000);

    return {
      recommendedWakeTime,
      sleepCycles: optimalCycles,
      expectedAlertness: this.predictWakeAlertness(optimalCycles)
    };
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

  private async getMovementPatterns(userId: string): Promise<any[]> {
    // Placeholder: Assume movement data is stored in storage
    // In a real implementation, this would fetch from a wearable device or storage
    return await this.storage.getMovementData ? this.storage.getMovementData(userId, 30) : [];
  }

  private estimateSleepStages(sleepData: any[], movementData: any[]): { deepSleep: number; rem: number } {
    if (sleepData.length === 0) return { deepSleep: 0, rem: 0 };

    const totalSleepDuration = sleepData.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    const lowMovementPeriods = movementData.filter(m => (m.intensity || 0) < 0.3).length;
    const deepSleepPercentage = movementData.length > 0 ? (lowMovementPeriods / movementData.length) * 100 : 0;
    const remPercentage = Math.min(25, totalSleepDuration / 480 * 25); // Estimate REM as ~25% of sleep time

    return {
      deepSleep: Math.round(deepSleepPercentage),
      rem: Math.round(remPercentage)
    };
  }

  private calculateSleepEfficiency(sleepData: any[]): number {
    if (sleepData.length === 0) return 0;

    const totalTimeInBed = sleepData.reduce((sum, entry) => sum + (entry.timeInBed || entry.duration || 0), 0);
    const totalSleepTime = sleepData.reduce((sum, entry) => sum + (entry.duration || 0), 0);

    return totalTimeInBed > 0 ? Math.round((totalSleepTime / totalTimeInBed) * 100) : 0;
  }

  private calculateFragmentation(movementData: any[]): number {
    // Fragmentation as movements per hour
    const totalMovements = movementData.length;
    const assumedSleepHours = 8; // Assume 8 hours of sleep data
    return assumedSleepHours > 0 ? totalMovements / assumedSleepHours : 0;
  }

  private generateSleepRecommendations(sleepStages: { deepSleep: number; rem: number }): string[] {
    const recommendations: string[] = [];

    if (sleepStages.deepSleep < 20) {
      recommendations.push('Increase deep sleep by maintaining a cooler room temperature (around 65°F/18°C).');
    }
    if (sleepStages.rem < 20) {
      recommendations.push('Improve REM sleep with a consistent bedtime routine and avoid screens before bed.');
    }
    if (sleepStages.deepSleep < 15 || sleepStages.rem < 15) {
      recommendations.push('Consider consulting a sleep specialist for personalized advice.');
    }

    return recommendations;
  }

  private calculateOptimalBedtime(sleepPressure: number, processC: number): Date {
    const currentTime = new Date();
    // Adjust bedtime based on sleep pressure and circadian rhythm
    const pressureAdjustment = (sleepPressure / 100) * 2; // Hours to adjust
    const circadianAdjustment = (processC / 20) * 1; // Additional hour based on circadian
    const optimalHoursBeforeWake = 8 - pressureAdjustment + circadianAdjustment;

    const optimalBedtime = new Date(currentTime.getTime() - optimalHoursBeforeWake * 60 * 60 * 1000);
    return optimalBedtime;
  }

  private predictWakeAlertness(optimalCycles: number): number {
    // Alertness increases with complete sleep cycles, peaking at 5-6 cycles
    const baseAlertness = optimalCycles * 15;
    const peakBonus = optimalCycles >= 5 ? 20 : 0;
    return Math.min(100, Math.max(0, baseAlertness + peakBonus));
  }
}
