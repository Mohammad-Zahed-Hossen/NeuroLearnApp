/**
 * Advanced Attention Score Formula with Multi-Modal Integration
 * Combines eye tracking, EEG, environmental context, and behavioral patterns
 */

import { ContextSnapshot } from '../../services/ai/ContextSensorService';
import { AuraContext } from '../../services/ai/CognitiveAuraService';

// Core attention calculation with environmental factors
export const calculateAdvancedAttentionScore = (
  gazeStability: number,
  headStillness: number,
  normBlink: number,
  environmentalContext: ContextSnapshot,
  cognitiveLoad: number
): number => {
  // Base attention score (CAE 1.0 compatibility)
  const baseAttention = 0.5 * gazeStability + 0.2 * headStillness + 0.3 * (1 - normBlink);

  // Environmental adjustments (CAE 2.0)
  let environmentalMultiplier = 1.0;

  // Location bonus/penalty
  switch (environmentalContext.locationContext.environment) {
    case 'library':
      environmentalMultiplier *= 1.2;
      break;
    case 'home':
      environmentalMultiplier *= environmentalContext.locationContext.privacyLevel;
      break;
    case 'commute':
      environmentalMultiplier *= 0.7;
      break;
  }

  // Distraction penalty
  const distractionPenalty = 1 - (environmentalContext.locationContext.distractionRisk === 'high' ? 0.3 : 0);

  // Cognitive load adjustment
  const cognitiveAdjustment = cognitiveLoad > 0.8 ? 0.8 : 1.0;

  return Math.max(0, Math.min(1, baseAttention * environmentalMultiplier * distractionPenalty * cognitiveAdjustment));
};

// Multi-layer EMA with context awareness
export const applyContextualEMA = (
  rawValue: number,
  previousEMA: number,
  context: AuraContext,
  alpha: number = 0.3
): number => {
  // Context-adaptive smoothing
  const contextAlpha = {
    'DeepFocus': 0.4,        // More responsive during deep focus
    'CreativeFlow': 0.35,    // Moderate responsiveness for creativity
    'FragmentedAttention': 0.2, // Heavy smoothing for fragmented states
    'CognitiveOverload': 0.1  // Maximum smoothing during overload
  }[context] || alpha;

  return contextAlpha * rawValue + (1 - contextAlpha) * previousEMA;
};

// Predictive attention forecasting
export const forecastAttentionTrend = (
  history: AttentionSample[],
  environmentalContext: ContextSnapshot
): AttentionForecast => {
  const recentSamples = history.slice(-20); // Last 20 samples
  const trend = calculateTrend(recentSamples);

  // Environmental prediction factors
  const circadianFactor = getCircadianAttentionFactor(environmentalContext.timeIntelligence);
  const locationFactor = getLocationAttentionFactor(environmentalContext.locationContext);

  const predictedAttention = trend.next * circadianFactor * locationFactor;

  return {
    predicted: Math.max(0, Math.min(1, predictedAttention)),
    confidence: trend.confidence,
    timeframe: 300, // 5 minutes
    factors: {
      trend: trend.slope,
      circadian: circadianFactor,
      location: locationFactor
    }
  };
};

// Calculate trend from attention samples
export const calculateTrend = (samples: AttentionSample[]): { slope: number; next: number; confidence: number } => {
  if (samples.length < 2) {
    return { slope: 0, next: samples[0]?.value || 0.5, confidence: 0 };
  }

  const n = samples.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = samples.map(s => s.value);

  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumXX = x.reduce((sum, val) => sum + val * val, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Predict next value
  const next = slope * n + intercept;

  // Calculate confidence based on data spread
  const yMean = sumY / n;
  const ssRes = y.reduce((sum, val, i) => {
    const predicted = slope * i + intercept;
    return sum + Math.pow(val - predicted, 2);
  }, 0);
  const ssTot = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
  const rSquared = 1 - (ssRes / ssTot);
  const confidence = Math.max(0, Math.min(1, rSquared * Math.min(1, n / 10)));

  return { slope, next: Math.max(0, Math.min(1, next)), confidence };
};

// Get circadian attention factor
export const getCircadianAttentionFactor = (timeIntelligence: ContextSnapshot['timeIntelligence']): number => {
  const hour = timeIntelligence.circadianHour;

  // Peak attention windows based on circadian rhythm research
  if (hour >= 9 && hour <= 11) return 1.2; // Morning peak
  if (hour >= 14 && hour <= 16) return 1.1; // Afternoon peak
  if (hour >= 19 && hour <= 21) return 1.0; // Evening moderate
  if (hour >= 6 && hour <= 8) return 0.9; // Early morning
  if (hour >= 22 || hour <= 2) return 0.7; // Late night
  if (hour >= 2 && hour <= 5) return 0.6; // Deep night

  return 0.8; // Default moderate
};

// Get location attention factor
export const getLocationAttentionFactor = (locationContext: ContextSnapshot['locationContext']): number => {
  let factor = 1.0;

  // Environment factors
  switch (locationContext.environment) {
    case 'library':
      factor *= 1.3;
      break;
    case 'home':
      factor *= locationContext.privacyLevel;
      break;
    case 'office':
      factor *= 0.9;
      break;
    case 'commute':
      factor *= 0.6;
      break;
    case 'outdoor':
      factor *= 0.8;
      break;
    default:
      factor *= 0.85;
  }

  // Noise level adjustments
  switch (locationContext.noiseLevel) {
    case 'silent':
      factor *= 1.2;
      break;
    case 'quiet':
      factor *= 1.1;
      break;
    case 'moderate':
      factor *= 0.95;
      break;
    case 'noisy':
      factor *= 0.7;
      break;
    case 'very_noisy':
      factor *= 0.5;
      break;
  }

  // Distraction risk
  switch (locationContext.distractionRisk) {
    case 'very_low':
      factor *= 1.1;
      break;
    case 'low':
      factor *= 1.0;
      break;
    case 'medium':
      factor *= 0.9;
      break;
    case 'high':
      factor *= 0.7;
      break;
    case 'very_high':
      factor *= 0.5;
      break;
  }

  return Math.max(0.3, Math.min(1.5, factor));
};

interface AttentionSample {
  timestamp: number;
  value: number;
  context: AuraContext;
}

interface AttentionForecast {
  predicted: number;
  confidence: number;
  timeframe: number;
  factors: {
    trend: number;
    circadian: number;
    location: number;
  };
}
