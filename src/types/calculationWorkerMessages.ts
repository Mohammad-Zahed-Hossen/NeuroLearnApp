// ==================== CALCULATION WORKER MESSAGES ====================

export interface CalculationWorkerMessage {
  type: 'calculate_pearson' | 'perform_stats' | 'calculate_trend' | 'dispose';
  id: string;
  data: any;
}

export interface CalculationWorkerResponse {
  type: 'pearson_calculated' | 'stats_performed' | 'trend_calculated' | 'error' | 'disposed';
  id: string;
  data: any;
  error?: string;
}

// Utility functions for message creation
export const createCalculationMessage = (
  type: CalculationWorkerMessage['type'],
  data: any,
  id: string = Math.random().toString(36).substr(2, 9)
): CalculationWorkerMessage => ({
  type,
  id,
  data,
});

// Type guards
export const isCalculationMessage = (msg: any): msg is CalculationWorkerMessage => {
  return msg && typeof msg.type === 'string' && ['calculate_pearson', 'perform_stats', 'calculate_trend', 'dispose'].includes(msg.type);
};

export const isCalculationResponse = (msg: any): msg is CalculationWorkerResponse => {
  return msg && typeof msg.type === 'string' && ['pearson_calculated', 'stats_performed', 'trend_calculated', 'error', 'disposed'].includes(msg.type);
};
