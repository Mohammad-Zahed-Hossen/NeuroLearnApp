/**
 * Engine Worker Message Types
 *
 * Defines the communication protocol between main thread and engine worker
 * for heavy NeuroLearnEngine operations.
 */

// ==================== ENGINE WORKER MESSAGES ====================

export interface EngineWorkerMessage {
  type: 'cross_domain_correlation' | 'optimize_schedule' | 'optimize_learning_path' | 'predict_performance' | 'analyze_patterns' | 'dispose';
  id: string;
  data: any;
}

export interface EngineWorkerResponse {
  type: 'operation_complete' | 'disposed' | 'error';
  id: string;
  data: any;
  error?: string;
}

// Utility functions for message creation
export const createEngineMessage = (
  type: EngineWorkerMessage['type'],
  data: any,
  id: string = Math.random().toString(36).substr(2, 9)
): EngineWorkerMessage => ({
  type,
  id,
  data,
});

// Type guards
export const isEngineMessage = (msg: any): msg is EngineWorkerMessage => {
  return msg && typeof msg.type === 'string' && ['cross_domain_correlation', 'optimize_schedule', 'optimize_learning_path', 'predict_performance', 'analyze_patterns', 'dispose'].includes(msg.type);
};

export const isEngineResponse = (msg: any): msg is EngineWorkerResponse => {
  return msg && typeof msg.type === 'string' && ['operation_complete', 'disposed', 'error'].includes(msg.type);
};
