/**
 * Calculation Worker - Offloads complex mathematical computations
 *
 * Handles heavy calculations like Pearson correlation, statistical analysis,
 * and trend calculations to prevent blocking the main thread.
 */

import { CalculationWorkerMessage, CalculationWorkerResponse } from '../types/calculationWorkerMessages';

// Worker context
const ctx: Worker = self as any;

// Utility functions for calculations
function calculatePearsonCorrelation(x: number[], y: number[]): any {
  if (x.length !== y.length || x.length < 2) {
    return { coefficient: 0, pValue: 1, reliability: 0 };
  }

  const n = x.length;
  const meanX = x.reduce((sum, val) => sum + val, 0) / n;
  const meanY = y.reduce((sum, val) => sum + val, 0) / n;

  let numerator = 0;
  let sumXSquared = 0;
  let sumYSquared = 0;

  for (let i = 0; i < n; i++) {
    const xi = x[i] as number;
    const yi = y[i] as number;
    const xDiff = xi - meanX;
    const yDiff = yi - meanY;
    numerator += xDiff * yDiff;
    sumXSquared += xDiff * xDiff;
    sumYSquared += yDiff * yDiff;
  }

  const denominator = Math.sqrt(sumXSquared * sumYSquared);
  const coefficient = denominator === 0 ? 0 : numerator / denominator;

  // Simplified p-value calculation
  const tStat = coefficient * Math.sqrt((n - 2) / (1 - coefficient * coefficient));
  const pValue = 2 * (1 - tDistribution(Math.abs(tStat), n - 2));

  return {
    coefficient,
    pValue,
    reliability: n > 10 ? Math.min(1, n / 30) : 0.5
  };
}

function performStatisticalAnalysis(values: number[], analysisType: string = 'descriptive'): any {
  if (!Array.isArray(values) || values.length === 0) {
    return { error: 'Invalid data for statistical analysis' };
  }

  const results: any = {};

  // Descriptive statistics
  results.descriptive = {
    mean: calculateMean(values),
    median: calculateMedian(values),
    mode: calculateMode(values),
    standardDeviation: calculateStandardDeviation(values),
    variance: calculateVariance(values),
    min: Math.min(...values),
    max: Math.max(...values),
    range: Math.max(...values) - Math.min(...values),
    count: values.length
  };

  if (analysisType === 'comprehensive') {
    results.distribution = {
      skewness: calculateSkewness(values),
      kurtosis: calculateKurtosis(values),
      quartiles: calculateQuartiles(values)
    };

    results.outliers = detectOutliers(values);
    results.trends = calculateTrend(values);
  }

  return results;
}

function calculateTrend(values: number[]): any {
  if (values.length < 2) {
    return { slope: 0, nextValue: values[0] ?? 0, confidence: 0 };
  }

  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = values;

  const meanX = calculateMean(x);
  const meanY = calculateMean(y);

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    const xi = x[i] as number;
    const yi = y[i] as number;
    numerator += (xi - meanX) * (yi - meanY);
    denominator += (xi - meanX) * (xi - meanX);
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = meanY - slope * meanX;
  const nextValue = slope * n + intercept;

  // Calculate R-squared for confidence
  const yPredicted = x.map(xi => slope * xi + intercept);
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const yi = y[i] as number;
    const yp = yPredicted[i] as number;
    ssRes += Math.pow(yi - yp, 2);
    ssTot += Math.pow(yi - meanY, 2);
  }
  const rSquared = ssTot === 0 ? 1 : 1 - (ssRes / ssTot);

  return {
    slope,
    intercept,
    nextValue,
    confidence: Math.max(0, rSquared),
    rSquared
  };
}

// Helper functions
function calculateMean(values: number[]): number {
  return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    const a = sorted[mid - 1] ?? 0;
    const b = sorted[mid] ?? 0;
    return (a + b) / 2;
  }
  return sorted[mid] ?? 0;
}

function calculateMode(values: number[]): number {
  if (values.length === 0) return 0;
  const frequency: Record<number, number> = {};
  values.forEach(val => frequency[val] = (frequency[val] || 0) + 1);

  let maxFreq = 0;
  let mode = values[0] ?? 0;
  for (const [val, freq] of Object.entries(frequency)) {
    if (freq > maxFreq) {
      maxFreq = freq;
      mode = parseFloat(val);
    }
  }
  return mode;
}

function calculateStandardDeviation(values: number[]): number {
  return Math.sqrt(calculateVariance(values));
}

function calculateVariance(values: number[]): number {
  const mean = calculateMean(values);
  return values.length > 0 ?
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length : 0;
}

function calculateSkewness(values: number[]): number {
  const mean = calculateMean(values);
  const stdDev = calculateStandardDeviation(values);
  const n = values.length;

  if (stdDev === 0) return 0;

  const skew = values.reduce((sum, val) => {
    return sum + Math.pow((val - mean) / stdDev, 3);
  }, 0);

  return (n / ((n - 1) * (n - 2))) * skew;
}

function calculateKurtosis(values: number[]): number {
  const mean = calculateMean(values);
  const stdDev = calculateStandardDeviation(values);
  const n = values.length;

  if (stdDev === 0) return 0;

  const kurt = values.reduce((sum, val) => {
    return sum + Math.pow((val - mean) / stdDev, 4);
  }, 0);

  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * kurt -
         (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3));
}

function calculateQuartiles(values: number[]): { q1: number; q2: number; q3: number } {
  if (values.length === 0) return { q1: 0, q2: 0, q3: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const q1Index = Math.floor(n * 0.25);
  const q3Index = Math.floor(n * 0.75);

  const q1 = sorted[Math.min(q1Index, n - 1)] ?? 0;
  const q2 = calculateMedian(sorted) ?? 0;
  const q3 = sorted[Math.min(q3Index, n - 1)] ?? 0;

  return { q1, q2, q3 };
}

function detectOutliers(values: number[]): number[] {
  const quartiles = calculateQuartiles(values);
  const iqr = quartiles.q3 - quartiles.q1;
  const lowerBound = quartiles.q1 - 1.5 * iqr;
  const upperBound = quartiles.q3 + 1.5 * iqr;

  return values.filter(val => val < lowerBound || val > upperBound);
}

function tDistribution(t: number, df: number): number {
  // Simplified t-distribution approximation
  return 0.5 * (1 + Math.sign(t) * Math.sqrt(1 - Math.exp(-2 * t * t / Math.PI)));
}

// Message handler
ctx.addEventListener('message', (event: MessageEvent<CalculationWorkerMessage>) => {
  const { type, id, data } = event.data;

  try {
    let result: any;

    switch (type) {
      case 'calculate_pearson':
        result = calculatePearsonCorrelation(data.x, data.y);
        ctx.postMessage({
          type: 'pearson_calculated',
          id,
          data: result
        } as CalculationWorkerResponse);
        break;

      case 'perform_stats':
        result = performStatisticalAnalysis(data.values, data.analysisType);
        ctx.postMessage({
          type: 'stats_performed',
          id,
          data: result
        } as CalculationWorkerResponse);
        break;

      case 'calculate_trend':
        result = calculateTrend(data.values);
        ctx.postMessage({
          type: 'trend_calculated',
          id,
          data: result
        } as CalculationWorkerResponse);
        break;

      case 'dispose':
        ctx.postMessage({
          type: 'disposed',
          id,
          data: { success: true }
        } as CalculationWorkerResponse);
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    ctx.postMessage({
      type: 'error',
      id,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as CalculationWorkerResponse);
  }
});
