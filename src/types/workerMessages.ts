/**
 * Web Worker Message Types for CAE Physics and Analytics
 *
 * Defines the communication protocol between main thread and workers
 * for physics calculations and analytics processing.
 */

// ==================== PHYSICS WORKER MESSAGES ====================

export interface PhysicsWorkerMessage {
  type: 'init' | 'update_graph' | 'simulate_step' | 'update_context' | 'get_positions' | 'dispose';
  id: string; // Message ID for correlation
  data: any;
}

export interface PhysicsWorkerResponse {
  type: 'initialized' | 'graph_updated' | 'step_completed' | 'positions_updated' | 'context_updated' | 'disposed' | 'error';
  id: string;
  data: any;
  error?: string;
}

// Physics-specific data structures
export interface WorkerNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  cognitiveLoad: number;
  masteryLevel: number;
  priority: number;
  contextRelevance: Record<string, number>;
  isTargetNode: boolean;
  isInOptimalPath: boolean;
  difficultyAdjustment: number;
  attentionWeight: number;

  // Adaptive properties (computed in worker)
  adaptiveSize: number;
  adaptiveOpacity: number;
  glowEffect: number;
  animationState: 'idle' | 'highlighted' | 'pulsing' | 'flowing' | 'sparking';
  pulseIntensity: number;
}

export interface WorkerLink {
  id: string;
  source: string;
  target: string;
  strength: number;
  distance: number;
  type: 'prerequisite' | 'similarity' | 'logical' | 'creative' | 'temporal';
  contextRelevance: Record<string, number>;
  cognitiveDistance: number;
  adaptiveStrength: number;

  // Adaptive properties (computed in worker)
  adaptiveVisibility: number;
  width: number;
  flowDirection: 'none' | 'forward' | 'backward' | 'bidirectional';
  animationSpeed: number;
}

export interface WorkerPhysicsConfig {
  nodeSize: { min: number; max: number; adaptive: boolean };
  linkStrength: { min: number; max: number; contextMultiplier: number };
  repulsionForce: { base: number; cognitiveLoadMultiplier: number };
  damping: { base: number; contextMultiplier: number };
  contextualBehavior: Record<string, any>; // Simplified for worker
  environmentalFactors: Record<string, number>;
  anticipatoryAdjustments: { enabled: boolean; lookaheadMinutes: number; adaptationSmoothing: number };
  adaptiveQuality: { enabled: boolean; qualityLevels: any[] };
}

export interface WorkerPhysicsState {
  currentContext: string;
  cognitiveLoad: number;
  environmentalOptimality: number;
  targetNodeId: string | null;
  activeConfig: any;
  nodeCount: number;
  linkCount: number;
  simulationSpeed: number;
  qualityLevel: number;
}

// Message data interfaces
export interface InitMessageData {
  config: WorkerPhysicsConfig;
  state: WorkerPhysicsState;
}

export interface UpdateGraphMessageData {
  nodes: WorkerNode[];
  links: WorkerLink[];
}

export interface SimulateStepMessageData {
  deltaTime: number;
  currentTime: number;
}

export interface UpdateContextMessageData {
  context: string;
  cognitiveLoad: number;
  targetNodeId: string | null;
  config: any;
}

export interface PositionsResponseData {
  nodes: Array<{
    id: string;
    x: number;
    y: number;
    size: number;
    opacity: number;
    glow: number;
    animation: string;
    pulseIntensity: number;
  }>;
  links: Array<{
    id: string;
    opacity: number;
    width: number;
    flow: string;
    animationSpeed: number;
  }>;
  timestamp: number;
}

// ==================== ANALYTICS WORKER MESSAGES ====================

export interface AnalyticsWorkerMessage {
  type: 'calculate_analytics' | 'get_insights' | 'process_performance' | 'dispose';
  id: string;
  data: any;
}

export interface AnalyticsWorkerResponse {
  type: 'analytics_calculated' | 'insights_ready' | 'performance_processed' | 'error';
  id: string;
  data: any;
  error?: string;
}

// Analytics data structures
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

export interface WorkerPerformanceEntry {
  accuracy: number;
  completion: number;
  satisfaction: number;
  timestamp: Date;
}

export interface WorkerAnalyticsData {
  performanceHistory: WorkerPerformanceEntry[];
  stateHistory: Map<string, WorkerAuraState>;
  currentAuraState: WorkerAuraState | null;
}

// ==================== SHARED UTILITIES ====================

export interface WorkerError {
  message: string;
  stack?: string;
  code?: string;
}

export interface WorkerMetrics {
  processingTime: number;
  memoryUsage: number;
  messageCount: number;
}

// Utility functions for message creation
export const createPhysicsMessage = (
  type: PhysicsWorkerMessage['type'],
  data: any,
  id: string = Math.random().toString(36).substr(2, 9)
): PhysicsWorkerMessage => ({
  type,
  id,
  data,
});

export const createAnalyticsMessage = (
  type: AnalyticsWorkerMessage['type'],
  data: any,
  id: string = Math.random().toString(36).substr(2, 9)
): AnalyticsWorkerMessage => ({
  type,
  id,
  data,
});

// Type guards
export const isPhysicsMessage = (msg: any): msg is PhysicsWorkerMessage => {
  return msg && typeof msg.type === 'string' && ['init', 'update_graph', 'simulate_step', 'update_context', 'get_positions', 'dispose'].includes(msg.type);
};

export const isAnalyticsMessage = (msg: any): msg is AnalyticsWorkerMessage => {
  return msg && typeof msg.type === 'string' && ['calculate_analytics', 'get_insights', 'process_performance', 'dispose'].includes(msg.type);
};

export const isPhysicsResponse = (msg: any): msg is PhysicsWorkerResponse => {
  return msg && typeof msg.type === 'string' && ['initialized', 'graph_updated', 'step_completed', 'positions_updated', 'context_updated', 'disposed', 'error'].includes(msg.type);
};

export const isAnalyticsResponse = (msg: any): msg is AnalyticsWorkerResponse => {
  return msg && typeof msg.type === 'string' && ['analytics_calculated', 'insights_ready', 'performance_processed', 'error'].includes(msg.type);
};
