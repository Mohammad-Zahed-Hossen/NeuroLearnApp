/**
 * NeuroplasticityTracker - Advanced Progress Monitoring System
 *
 * Tracks neuroplastic changes and adaptation patterns over time.
 * Provides insights and recommendations based on learning neuroscience.
 *
 * Features:
 * - Real-time plasticity score calculation
 * - Adaptive learning path recommendations
 * - Neuroplastic adaptation tracking
 * - Progress visualization and insights
 * - Personalized training schedules
 */

import { SynapseEdge, NeuroplasticitySession } from '../../screens/NeuroPlastisity/SynapseBuilderScreen';
import HybridStorageService from '../../services/storage/HybridStorageService';

export interface PlasticityMetrics {
  overallPlasticityScore: number;
  connectionStrengthTrend: 'improving' | 'stable' | 'declining';
  criticalConnectionsCount: number;
  averageRetentionRate: number;
  learningVelocity: number; // Rate of improvement
  adaptationEfficiency: number; // How well brain adapts to training
  neuralPathwayDiversity: number; // Variety in connection types
  cognitiveLoadBalance: number; // Optimal challenge level
}

export interface PlasticityInsight {
  type: 'strength' | 'warning' | 'recommendation' | 'achievement';
  title: string;
  description: string;
  actionable: boolean;
  priority: 'low' | 'medium' | 'high';
  relatedSynapses: string[];
}

export class NeuroplasticityTracker {
  private storage: HybridStorageService;
  private readonly PLASTICITY_HISTORY_KEY = 'neuroplasticity_history';
  private readonly SESSION_HISTORY_KEY = 'session_history';

  constructor() {
    this.storage = HybridStorageService.getInstance();
  }

  /**
   * Calculate overall neuroplasticity score
   */
  async calculateOverallPlasticityScore(synapses: SynapseEdge[]): Promise<number> {
    try {
      if (synapses.length === 0) return 0;

      // Weight factors for overall score
      const weights = {
        averageStrength: 0.3,        // 30% - Current connection strength
        retentionHealth: 0.25,       // 25% - How well connections are retained
        plasticityPotential: 0.2,    // 20% - Capacity for further growth
        diversityBonus: 0.15,        // 15% - Variety in connection types
        practiceConsistency: 0.1,    // 10% - Regular practice patterns
      };

      // Calculate average connection strength
      const averageStrength = synapses.reduce((sum, s) => sum + s.strength, 0) / synapses.length;
      const strengthScore = averageStrength * 100;

      // Calculate retention health
      const averageRetention = synapses.reduce((sum, s) => sum + s.retentionRate, 0) / synapses.length;
      const retentionScore = averageRetention * 100;

      // Calculate plasticity potential (higher for synapses with room to grow)
      const averagePlasticity = synapses.reduce((sum, s) => sum + s.plasticityScore, 0) / synapses.length;
      const plasticityScore = averagePlasticity * 100;

      // Calculate diversity bonus
      const connectionTypes = new Set(synapses.map(s => s.connectionType));
      const diversityScore = Math.min(connectionTypes.size / 5, 1) * 100; // Max at 5 types

      // Calculate practice consistency
      const recentlyPracticed = synapses.filter(s => {
        if (!s.lastPracticeDate) return false;
        const daysSincePractice = (Date.now() - new Date(s.lastPracticeDate).getTime()) / (1000 * 60 * 60 * 24);
        return daysSincePractice <= 7; // Practiced within week
      }).length;
      const consistencyScore = (recentlyPracticed / synapses.length) * 100;

      // Weighted combination
      const overallScore =
        (strengthScore * weights.averageStrength) +
        (retentionScore * weights.retentionHealth) +
        (plasticityScore * weights.plasticityPotential) +
        (diversityScore * weights.diversityBonus) +
        (consistencyScore * weights.practiceConsistency);

      return Math.round(Math.max(0, Math.min(100, overallScore)));
    } catch (error) {
      console.error('Error calculating plasticity score:', error);
      return 50; // Default neutral score
    }
  }

  /**
   * Calculate comprehensive plasticity metrics
   */
  async calculatePlasticityMetrics(synapses: SynapseEdge[]): Promise<PlasticityMetrics> {
    try {
      const overallPlasticityScore = await this.calculateOverallPlasticityScore(synapses);

      // Get historical data for trend analysis
      const history = await this.getPlasticityHistory();
      const connectionStrengthTrend = this.analyzeTrend(history.map(h => h.averageStrength));

      // Critical connections
      const criticalConnectionsCount = synapses.filter(s => s.urgencyLevel === 'critical').length;

      // Average retention rate
      const averageRetentionRate = synapses.length > 0
        ? synapses.reduce((sum, s) => sum + s.retentionRate, 0) / synapses.length
        : 0;

      // Learning velocity (rate of improvement)
      const learningVelocity = this.calculateLearningVelocity(history);

      // Adaptation efficiency
      const adaptationEfficiency = this.calculateAdaptationEfficiency(synapses);

      // Neural pathway diversity
      const uniquePathways = new Set(synapses.flatMap(s => s.neuralPathways));
      const neuralPathwayDiversity = uniquePathways.size / Math.max(synapses.length, 1);

      // Cognitive load balance
      const cognitiveLoadBalance = this.calculateCognitiveLoadBalance(synapses);

      return {
        overallPlasticityScore,
        connectionStrengthTrend,
        criticalConnectionsCount,
        averageRetentionRate,
        learningVelocity,
        adaptationEfficiency,
        neuralPathwayDiversity,
        cognitiveLoadBalance,
      };
    } catch (error) {
      console.error('Error calculating plasticity metrics:', error);
      return {
        overallPlasticityScore: 50,
        connectionStrengthTrend: 'stable',
        criticalConnectionsCount: 0,
        averageRetentionRate: 0.6,
        learningVelocity: 0,
        adaptationEfficiency: 0.5,
        neuralPathwayDiversity: 0.5,
        cognitiveLoadBalance: 0.5,
      };
    }
  }

  /**
   * Generate actionable insights based on current state
   */
  async generatePlasticityInsights(synapses: SynapseEdge[]): Promise<PlasticityInsight[]> {
    const insights: PlasticityInsight[] = [];

    try {
      const metrics = await this.calculatePlasticityMetrics(synapses);

      // Critical connections warning
      if (metrics.criticalConnectionsCount > 0) {
        insights.push({
          type: 'warning',
          title: 'Critical Connections Need Attention',
          description: `${metrics.criticalConnectionsCount} neural connections are at risk of being forgotten. Immediate practice recommended.`,
          actionable: true,
          priority: 'high',
          relatedSynapses: synapses.filter(s => s.urgencyLevel === 'critical').map(s => s.id),
        });
      }

      // Low plasticity score
      if (metrics.overallPlasticityScore < 40) {
        insights.push({
          type: 'recommendation',
          title: 'Boost Neural Plasticity',
          description: 'Your brain adaptation capacity could be improved. Try varying your learning tasks and increasing practice frequency.',
          actionable: true,
          priority: 'medium',
          relatedSynapses: synapses.filter(s => s.plasticityScore < 0.4).map(s => s.id),
        });
      }

      // Positive trend recognition
      if (metrics.connectionStrengthTrend === 'improving' && metrics.overallPlasticityScore > 70) {
        insights.push({
          type: 'achievement',
          title: 'Excellent Progress!',
          description: 'Your neural connections are strengthening consistently. Keep up the great work!',
          actionable: false,
          priority: 'low',
          relatedSynapses: [],
        });
      }

      // Diversity recommendation
      if (metrics.neuralPathwayDiversity < 0.3) {
        insights.push({
          type: 'recommendation',
          title: 'Expand Learning Diversity',
          description: 'Try connecting concepts across different domains to build more diverse neural pathways.',
          actionable: true,
          priority: 'medium',
          relatedSynapses: synapses.slice(0, 5).map(s => s.id), // Suggest top 5
        });
      }

      // Cognitive load balance
      if (metrics.cognitiveLoadBalance < 0.4) {
        insights.push({
          type: 'recommendation',
          title: 'Optimize Challenge Level',
          description: 'Your learning tasks may be too easy or too hard. Aim for moderate challenge for optimal neuroplasticity.',
          actionable: true,
          priority: 'medium',
          relatedSynapses: synapses.filter(s => s.cognitiveLoad > 0.8 || s.cognitiveLoad < 0.2).map(s => s.id),
        });
      }

      // Learning velocity insights
      if (metrics.learningVelocity > 0.1) {
        insights.push({
          type: 'strength',
          title: 'Strong Learning Momentum',
          description: 'Your learning velocity is excellent. You\'re making rapid progress in strengthening connections.',
          actionable: false,
          priority: 'low',
          relatedSynapses: [],
        });
      } else if (metrics.learningVelocity < -0.05) {
        insights.push({
          type: 'warning',
          title: 'Learning Momentum Declining',
          description: 'Your progress has slowed. Consider increasing practice frequency or trying new learning strategies.',
          actionable: true,
          priority: 'high',
          relatedSynapses: synapses.filter(s => s.strength < 0.4).map(s => s.id),
        });
      }

      return insights.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

    } catch (error) {
      console.error('Error generating insights:', error);
      return [];
    }
  }

  /**
   * Generate session recommendations based on current state
   */
  async generateSessionRecommendations(session: NeuroplasticitySession): Promise<string[]> {
    const recommendations: string[] = [];

    try {
      const successRate = session.successRate;
      const cognitiveStrain = session.cognitiveStrain;
      const plasticityGains = session.plasticityGains;

      // Success rate recommendations
      if (successRate > 0.8) {
        recommendations.push('Excellent performance! Consider increasing task difficulty for optimal challenge.');
        recommendations.push('Try tackling more complex connections or synthesis tasks.');
      } else if (successRate < 0.4) {
        recommendations.push('Focus on recall and connection tasks to build foundation before advancing.');
        recommendations.push('Use progressive hints more frequently to build confidence.');
      } else {
        recommendations.push('Good balance of challenge and success. Continue with current difficulty level.');
      }

      // Cognitive strain recommendations
      if (cognitiveStrain > 0.8) {
        recommendations.push('High cognitive load detected. Take breaks between tasks and reduce session length.');
        recommendations.push('Consider spacing sessions across multiple days for better retention.');
      } else if (cognitiveStrain < 0.3) {
        recommendations.push('Tasks may be too easy. Try more challenging connection types or synthesis tasks.');
      }

      // Plasticity gains recommendations
      const totalGains = plasticityGains.reduce((sum, gain) => sum + gain.strengthDelta, 0);
      if (totalGains > 0.5) {
        recommendations.push('Strong plasticity gains achieved! Schedule follow-up practice in 2-3 days.');
      } else if (totalGains < 0.1) {
        recommendations.push('Limited progress made. Focus on weaker connections and use more scaffolding.');
      }

      // Adaptation triggers
      if (session.adaptationsTriggered.length > 3) {
        recommendations.push('Multiple neural adaptations triggered - excellent session effectiveness!');
      }

      // Time-based recommendations
      const sessionDuration = session.endTime && session.startTime
        ? (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60)
        : 0;

      if (sessionDuration > 20) {
        recommendations.push('Long session detected. Consider shorter, more frequent sessions for better retention.');
      } else if (sessionDuration < 5) {
        recommendations.push('Very brief session. Consider extending slightly for more comprehensive strengthening.');
      }

      // Default recommendations if none generated
      if (recommendations.length === 0) {
        recommendations.push('Continue regular practice to maintain neural plasticity.');
        recommendations.push('Try different task types to build diverse connections.');
      }

      return recommendations;
    } catch (error) {
      console.error('Error generating session recommendations:', error);
      return ['Continue regular practice to maintain neural plasticity.'];
    }
  }

  /**
   * Track plasticity changes over time
   */
  async recordPlasticitySnapshot(synapses: SynapseEdge[]): Promise<void> {
    try {
      const snapshot = {
        timestamp: new Date(),
        totalSynapses: synapses.length,
        averageStrength: synapses.reduce((sum, s) => sum + s.strength, 0) / synapses.length,
        averageRetention: synapses.reduce((sum, s) => sum + s.retentionRate, 0) / synapses.length,
        criticalCount: synapses.filter(s => s.urgencyLevel === 'critical').length,
        plasticityScore: await this.calculateOverallPlasticityScore(synapses),
      };

      const history = await this.getPlasticityHistory();
      history.push(snapshot);

      // Keep only last 30 snapshots (roughly 1 month if daily)
      if (history.length > 30) {
        history.splice(0, history.length - 30);
      }

      await this.storage.setItem(this.PLASTICITY_HISTORY_KEY, history);
    } catch (error) {
      console.error('Error recording plasticity snapshot:', error);
    }
  }

  /**
   * Get plasticity history for trend analysis
   */
  private async getPlasticityHistory(): Promise<Array<{
    timestamp: Date;
    totalSynapses: number;
    averageStrength: number;
    averageRetention: number;
    criticalCount: number;
    plasticityScore: number;
  }>> {
    try {
      const history = await this.storage.getItem(this.PLASTICITY_HISTORY_KEY);
      return Array.isArray(history) ? history : [];
    } catch (error) {
      console.error('Error getting plasticity history:', error);
      return [];
    }
  }

  /**
   * Analyze trend from historical data
   */
  private analyzeTrend(values: number[]): 'improving' | 'stable' | 'declining' {
    if (values.length < 2) return 'stable';

    const recent = values.slice(-5); // Last 5 data points
    if (recent.length < 2) return 'stable';

    // Calculate simple trend
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));

    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

    const change = secondAvg - firstAvg;

    if (change > 0.05) return 'improving';
    if (change < -0.05) return 'declining';
    return 'stable';
  }

  /**
   * Calculate learning velocity (rate of improvement)
   */
  private calculateLearningVelocity(history: Array<{ plasticityScore: number; timestamp: Date }>): number {
    if (history.length < 2) return 0;

    const sorted = history.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const recent = sorted.slice(-5); // Last 5 snapshots

    if (recent.length < 2) return 0;

  const first = recent[0];
  const last = recent[recent.length - 1];
  if (!first || !last) return 0;

  const scoreDiff = (last.plasticityScore ?? 0) - (first.plasticityScore ?? 0);
  const timeDiff = (new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()) / (1000 * 60 * 60 * 24); // Days

  return timeDiff > 0 ? scoreDiff / timeDiff : 0;
  }

  /**
   * Calculate adaptation efficiency
   */
  private calculateAdaptationEfficiency(synapses: SynapseEdge[]): number {
    // Efficiency = high plasticity synapses with recent practice / total synapses
    const recentlyPracticed = synapses.filter(s => {
      const daysSincePractice = (Date.now() - s.lastPracticeDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSincePractice <= 3; // Practiced within 3 days
    });

    const efficientSynapses = recentlyPracticed.filter(s => s.plasticityScore > 0.6);

    return synapses.length > 0 ? efficientSynapses.length / synapses.length : 0;
  }

  /**
   * Calculate cognitive load balance
   */
  private calculateCognitiveLoadBalance(synapses: SynapseEdge[]): number {
    if (synapses.length === 0) return 0.5;

    // Optimal cognitive load is around 0.6 (moderate challenge)
    const optimalLoad = 0.6;
    const deviations = synapses.map(s => Math.abs(s.cognitiveLoad - optimalLoad));
    const averageDeviation = deviations.reduce((sum, d) => sum + d, 0) / deviations.length;

    // Convert deviation to balance score (lower deviation = better balance)
    return Math.max(0, 1 - (averageDeviation / 0.5));
  }

  /**
   * Get optimal training schedule based on current state
   */
  async getOptimalTrainingSchedule(synapses: SynapseEdge[]): Promise<Array<{
    date: Date;
    targetSynapses: string[];
    sessionType: NeuroplasticitySession['sessionType'];
    estimatedDuration: number;
    priority: 'high' | 'medium' | 'low';
  }>> {
    const schedule: Array<{
      date: Date;
      targetSynapses: string[];
      sessionType: NeuroplasticitySession['sessionType'];
      estimatedDuration: number;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    const now = new Date();

    // Critical synapses - schedule immediately
    const criticalSynapses = synapses.filter(s => s.urgencyLevel === 'critical');
    if (criticalSynapses.length > 0) {
      schedule.push({
        date: now,
        targetSynapses: criticalSynapses.slice(0, 3).map(s => s.id), // Limit to 3 for focused session
        sessionType: 'synapse_strengthening',
        estimatedDuration: 15,
        priority: 'high',
      });
    }

    // Moderate synapses - schedule for tomorrow
    const moderateSynapses = synapses.filter(s => s.urgencyLevel === 'moderate');
    if (moderateSynapses.length > 0) {
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      schedule.push({
        date: tomorrow,
        targetSynapses: moderateSynapses.slice(0, 5).map(s => s.id),
        sessionType: 'pathway_building',
        estimatedDuration: 20,
        priority: 'medium',
      });
    }

    // Cluster integration - schedule for 2 days
    const diverseSynapses = synapses.filter(s => s.neuralPathways.length > 1);
    if (diverseSynapses.length >= 3) {
      const dayAfterTomorrow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      schedule.push({
        date: dayAfterTomorrow,
        targetSynapses: diverseSynapses.slice(0, 4).map(s => s.id),
        sessionType: 'cluster_integration',
        estimatedDuration: 25,
        priority: 'low',
      });
    }

    return schedule.sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}

export default NeuroplasticityTracker;
