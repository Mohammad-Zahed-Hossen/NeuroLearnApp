// ==================== NEURAL WORKER MESSAGES ====================

export interface NeuralWorkerMessage {
  type: 'init' | 'calculate_ccs' | 'forecast_capacity' | 'analyze_patterns' | 'derive_context' | 'learn_patterns' | 'dispose';
  id: string;
  data: any;
}

export interface NeuralWorkerResponse {
  type: 'initialized' | 'ccs_calculated' | 'capacity_forecasted' | 'patterns_analyzed' | 'context_derived' | 'patterns_learned' | 'disposed' | 'error';
  id: string;
  data: any;
  error?: string;
}

// Neural-specific data structures
export interface WorkerAuraState {
  sessionId: string;
  context: string;
  confidence: number;
  timestamp: Date;
  compositeCognitiveScore: number;
  capacityForecast: any;
  environmentalContext: any;
  targetNode?: { id: string };
  anticipatedStateChanges: any[];
}

export interface WorkerContextSnapshot {
  timestamp: Date;
  context: string;
  cognitiveLoad: number;
  environmentalFactors: Record<string, number>;
  performanceMetrics: Record<string, number>;
  attentionState: string;
}

export interface WorkerNeuralGraph {
  nodes: WorkerNeuralNode[];
  links: WorkerNeuralLink[];
  metadata: {
    totalNodes: number;
    totalLinks: number;
    averageConnectivity: number;
    complexityScore: number;
  };
}

export interface WorkerNeuralNode {
  id: string;
  type: 'concept' | 'skill' | 'memory' | 'pattern';
  strength: number;
  retention: number;
  urgency: number;
  contextRelevance: Record<string, number>;
  lastAccessed: Date;
  accessCount: number;
  difficulty: number;
  masteryLevel: number;
}

export interface WorkerNeuralLink {
  source: string;
  target: string;
  type: 'prerequisite' | 'association' | 'temporal' | 'causal';
  strength: number;
  confidence: number;
  lastStrengthened: Date;
}

export interface WorkerFlashcard {
  id: string;
  question: string;
  answer: string;
  difficulty: number;
  timesReviewed: number;
  lastReviewed: Date;
  nextReview: Date;
  retentionScore: number;
  contextTags: string[];
}

// Calculation data interfaces
export interface CCSCalculationData {
  graph: WorkerNeuralGraph;
  cards: WorkerFlashcard[];
  environmentalContext: Record<string, any>;
  currentContext: string;
  cognitiveLoad: number;
}

export interface CapacityForecastData {
  historicalData: WorkerContextSnapshot[];
  currentState: WorkerAuraState;
  timeHorizon: number; // minutes
  predictionIntervals: number[];
}

export interface ContextDerivationData {
  rawContext: Record<string, any>;
  historicalContexts: WorkerContextSnapshot[];
  environmentalFactors: Record<string, number>;
  userPreferences: Record<string, any>;
}

export interface PatternLearningData {
  patterns: Array<{
    id: string;
    features: Record<string, number>;
    outcomes: number[];
    frequency: number;
    confidence: number;
  }>;
  newObservations: Array<{
    features: Record<string, number>;
    outcome: number;
    timestamp: Date;
  }>;
}

// Utility functions for neural messages
export const createNeuralMessage = (
  type: NeuralWorkerMessage['type'],
  data: any,
  id: string = Math.random().toString(36).substr(2, 9)
): NeuralWorkerMessage => ({
  type,
  id,
  data,
});

// Type guards
export const isNeuralMessage = (msg: any): msg is NeuralWorkerMessage => {
  return msg && typeof msg.type === 'string' && ['init', 'calculate_ccs', 'forecast_capacity', 'analyze_patterns', 'derive_context', 'learn_patterns', 'dispose'].includes(msg.type);
};

export const isNeuralResponse = (msg: any): msg is NeuralWorkerResponse => {
  return msg && typeof msg.type === 'string' && ['initialized', 'ccs_calculated', 'capacity_forecasted', 'patterns_analyzed', 'context_derived', 'patterns_learned', 'disposed', 'error'].includes(msg.type);
};
