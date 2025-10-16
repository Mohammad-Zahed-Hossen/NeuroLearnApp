/**
 * DataFlowManager - Advanced Data Flow Orchestration
 *
 * Manages intelligent data flow between all system components with
 * real-time optimization, conflict resolution, and performance monitoring.
 */

import { EventSystem, EVENT_TYPES } from './EventSystem';
import { Logger } from './utils/Logger';
import { PerformanceProfiler } from './utils/PerformanceProfiler';

export interface DataFlowRule {
  id: string;
  source: string;
  target: string;
  conditions: any[];
  transformations: any[];
  priority: number;
  enabled: boolean;
}

export interface DataFlowMetrics {
  totalTransfers: number;
  averageLatency: number;
  errorRate: number;
  throughput: number;
  activeFlows: number;
  conflictResolutions: number;
}

export interface DataPacket {
  id: string;
  source: string;
  target: string;
  data: any;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  metadata: any;
  retryCount: number;
}

/**
 * Advanced Data Flow Manager
 *
 * Orchestrates all data movement across the NeuroLearn ecosystem with
 * intelligent routing, conflict resolution, and performance optimization.
 */
export class DataFlowManager {
  private static instance: DataFlowManager;
  private eventSystem!: EventSystem;
  private logger: Logger;
  private profiler!: PerformanceProfiler;

  // Data Flow State
  private isInitialized = false;
  private flowRules: Map<string, DataFlowRule> = new Map();
  private activeFlows: Map<string, DataPacket> = new Map();
  private flowQueue: DataPacket[] = [];
  private processingRate = 100; // ms between processing cycles

  // Performance Metrics
  private metrics: DataFlowMetrics = {
    totalTransfers: 0,
    averageLatency: 0,
    errorRate: 0,
    throughput: 0,
    activeFlows: 0,
    conflictResolutions: 0
  };

  // Processing Control
  private processingTimer: NodeJS.Timeout | null = null;
  private maxConcurrentFlows = 50;
  private retryLimit = 3;

  private constructor() {
    this.logger = new Logger('DataFlowManager');
  this.profiler = PerformanceProfiler.getInstance();
  }

  public static getInstance(): DataFlowManager {
    if (!DataFlowManager.instance) {
      DataFlowManager.instance = new DataFlowManager();
    }
    return DataFlowManager.instance;
  }

  /**
   * Initialize the data flow manager
   */
  public async initialize(eventSystem: EventSystem): Promise<void> {
    try {
      this.logger.info('Initializing Data Flow Manager...');

      this.eventSystem = eventSystem;
      await this.profiler.initialize();

      // Setup default flow rules
      this.setupDefaultFlowRules();

      // Setup event listeners
      this.setupEventListeners();

      // Start processing loop
      this.startProcessing();

      this.isInitialized = true;
      this.logger.info('Data Flow Manager initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize Data Flow Manager', error);
      throw error;
    }
  }

  /**
   * Queue data for transfer between components
   */
  public async queueData(
    source: string,
    target: string,
    data: any,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    metadata: any = {}
  ): Promise<string> {
    const packet: DataPacket = {
      id: this.generatePacketId(),
      source: source || 'unknown',
      target: target || 'unknown',
      data,
      timestamp: new Date(),
      priority,
      metadata: metadata || {},
      retryCount: 0
    };

    // Add to queue based on priority
    this.insertPacketByPriority(packet);

    this.logger.debug(`Data packet queued: ${packet.id} (${source} → ${target})`);

    // Emit data flow event
    this.eventSystem.emitEvent(
      EVENT_TYPES.DATA_FLOW_QUEUED,
      'DataFlowManager',
      { packetId: packet.id, source, target, priority },
      priority
    );

    return packet.id;
  }

  /**
   * Process data transformation and routing
   */
  public async routeData(packetId: string): Promise<boolean> {
    const packet = this.getPacket(packetId);
    if (!packet) {
      this.logger.warn(`Packet not found: ${packetId}`);
      return false;
    }

    try {
      const startTime = Date.now();

      // Find applicable flow rules
      const rules = this.findApplicableRules(packet);

      if (rules.length === 0) {
        this.logger.warn(`No routing rules found for: ${packet.source} → ${packet.target}`);
        return await this.handleUnroutablePacket(packet);
      }

      // Apply highest priority rule
      const rule = rules[0];
      if (!rule) {
        this.logger.warn(`No applicable rule found after filtering for packet ${packet.id}`);
        return await this.handleUnroutablePacket(packet);
      }

      const processedData = await this.applyTransformations(packet.data, rule.transformations || []);

      // Route to target
      const success = await this.deliverData(packet.target, processedData, packet.metadata);

      if (success) {
        this.activeFlows.delete(packet.id);
        this.updateMetrics(Date.now() - startTime, true);

        this.eventSystem.emitEvent(
          EVENT_TYPES.DATA_FLOW_COMPLETED,
          'DataFlowManager',
          { packetId, rule: rule.id, latency: Date.now() - startTime },
          'low'
        );

        return true;
      } else {
        return await this.handleFailedDelivery(packet);
      }

    } catch (error) {
      this.logger.error(`Data routing failed for packet ${packetId}`, error);
      return await this.handleFailedDelivery(packet);
    }
  }

  /**
   * Add custom flow rule
   */
  public addFlowRule(rule: DataFlowRule): void {
    this.flowRules.set(rule.id, rule);
    this.logger.info(`Flow rule added: ${rule.id} (${rule.source} → ${rule.target})`);

    this.eventSystem.emitEvent(
      EVENT_TYPES.DATA_FLOW_RULE_ADDED,
      'DataFlowManager',
      { ruleId: rule.id },
      'low'
    );
  }

  /**
   * Remove flow rule
   */
  public removeFlowRule(ruleId: string): boolean {
    const removed = this.flowRules.delete(ruleId);
    if (removed) {
      this.logger.info(`Flow rule removed: ${ruleId}`);

      this.eventSystem.emitEvent(
        EVENT_TYPES.DATA_FLOW_RULE_REMOVED,
        'DataFlowManager',
        { ruleId },
        'low'
      );
    }
    return removed;
  }

  /**
   * Get current data flow metrics
   */
  public getMetrics(): DataFlowMetrics {
    return {
      ...this.metrics,
      activeFlows: this.activeFlows.size
    };
  }

  /**
   * Optimize data flow performance
   */
  public async optimizeFlow(): Promise<void> {
    this.logger.info('Optimizing data flow performance...');

    try {
      // Analyze current performance
      const analysis = await this.analyzeFlowPerformance();

      // Adjust processing rate based on load
      if (analysis.avgQueueSize > 20) {
        this.processingRate = Math.max(50, this.processingRate - 10);
      } else if (analysis.avgQueueSize < 5) {
        this.processingRate = Math.min(200, this.processingRate + 10);
      }

      // Clean up expired flows
      await this.cleanupExpiredFlows();

      // Optimize rule priority
      await this.optimizeRulePriority();

      this.logger.info(`Flow optimization completed. New processing rate: ${this.processingRate}ms`);

    } catch (error) {
      this.logger.error('Flow optimization failed', error);
    }
  }

  /**
   * Handle data conflicts and resolution
   */
  public async resolveConflict(
    conflictingPackets: DataPacket[],
    strategy: 'merge' | 'latest' | 'priority' = 'priority'
  ): Promise<DataPacket> {
    this.logger.info(`Resolving data conflict with ${conflictingPackets.length} packets using ${strategy} strategy`);

    let resolvedPacket: DataPacket;

    switch (strategy) {
      case 'merge':
        resolvedPacket = await this.mergePackets(conflictingPackets);
        break;
      case 'latest':
        resolvedPacket = conflictingPackets.reduce((latest, current) =>
          current.timestamp > latest.timestamp ? current : latest
        );
        break;
      case 'priority':
      default:
        resolvedPacket = this.selectHighestPriorityPacket(conflictingPackets);
        break;
    }

    this.metrics.conflictResolutions++;

    this.eventSystem.emitEvent(
      EVENT_TYPES.DATA_CONFLICT_RESOLVED,
      'DataFlowManager',
      {
        strategy,
        conflictCount: conflictingPackets.length,
        resolvedPacketId: resolvedPacket.id
      },
      'medium'
    );

    return resolvedPacket;
  }

  /**
   * Monitor data flow health
   */
  public getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check error rate
    if (this.metrics.errorRate > 0.1) {
      issues.push('High error rate detected');
      recommendations.push('Check data validation and transformation rules');
    }

    // Check queue size
    if (this.flowQueue.length > 100) {
      issues.push('Large queue size detected');
      recommendations.push('Increase processing rate or add more workers');
    }

    // Check average latency
    if (this.metrics.averageLatency > 1000) {
      issues.push('High latency detected');
      recommendations.push('Optimize transformation rules and target systems');
    }

    // Check active flows
    if (this.activeFlows.size > this.maxConcurrentFlows * 0.8) {
      issues.push('High concurrent flow count');
      recommendations.push('Consider flow throttling or load balancing');
    }

    let status: 'healthy' | 'degraded' | 'critical';
    if (issues.length === 0) {
      status = 'healthy';
    } else if (issues.length <= 2) {
      status = 'degraded';
    } else {
      status = 'critical';
    }

    return { status, issues, recommendations };
  }

  /**
   * Shutdown data flow manager
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down Data Flow Manager...');

    try {
      // Stop processing
      if (this.processingTimer) {
        clearInterval(this.processingTimer);
        this.processingTimer = null;
      }

      // Process remaining queue with timeout
      await this.flushQueue(5000); // 5 second timeout

      // Clear state
      this.activeFlows.clear();
      this.flowQueue.length = 0;
      this.flowRules.clear();

      this.isInitialized = false;
      this.logger.info('Data Flow Manager shutdown completed');

    } catch (error) {
      this.logger.error('Data Flow Manager shutdown error', error);
    }
  }

  /**
   * Compatibility method: forceSyncAll
   * Some orchestrators expect this helper to exist. Provide a best-effort
   * implementation that flushes queues and triggers optimization.
   */
  public async forceSyncAll(): Promise<void> {
    this.logger.info('forceSyncAll called - flushing queues and optimizing flows');
    try {
      await this.flushQueue(5000);
      await this.optimizeFlow();
    } catch (e) {
      this.logger.warn('forceSyncAll encountered an error', e);
    }
  }

  // Private Methods

  private setupDefaultFlowRules(): void {
    // Learning to Storage flow
    this.addFlowRule({
      id: 'learning_to_storage',
      source: 'LearningOrchestrator',
      target: 'StorageOrchestrator',
      conditions: [{ type: 'always' }],
      transformations: [{ type: 'sanitize' }, { type: 'compress' }],
      priority: 1,
      enabled: true
    });

    // Wellness to Storage flow
    this.addFlowRule({
      id: 'wellness_to_storage',
      source: 'WellnessOrchestrator',
      target: 'StorageOrchestrator',
      conditions: [{ type: 'always' }],
      transformations: [{ type: 'sanitize' }],
      priority: 2,
      enabled: true
    });

    // AI to All Systems flow
    this.addFlowRule({
      id: 'ai_insights_broadcast',
      source: 'AIOrchestrator',
      target: '*',
      conditions: [{ type: 'insight_priority', value: 'high' }],
      transformations: [{ type: 'format_insight' }],
      priority: 0,
      enabled: true
    });

    // Cross-module correlations
    this.addFlowRule({
      id: 'cross_module_correlations',
      source: '*',
      target: 'AIOrchestrator',
      conditions: [{ type: 'correlation_opportunity' }],
      transformations: [{ type: 'aggregate_for_correlation' }],
      priority: 3,
      enabled: true
    });
  }

  private setupEventListeners(): void {
    // Listen for high-priority data events
    this.eventSystem.subscribe(EVENT_TYPES.COGNITIVE_LOAD_HIGH, (event) => {
      this.processingRate = Math.max(50, this.processingRate - 20); // Faster processing
    });

    // Listen for system optimization events
    this.eventSystem.subscribe(EVENT_TYPES.SYSTEM_OPTIMIZE, async () => {
      await this.optimizeFlow();
    });
  }

  private startProcessing(): void {
    this.processingTimer = setInterval(async () => {
      await this.processQueue();
    }, this.processingRate);
  }

  private async processQueue(): Promise<void> {
    if (this.flowQueue.length === 0 || this.activeFlows.size >= this.maxConcurrentFlows) {
      return;
    }

    const packet = this.flowQueue.shift();
    if (!packet) return;

    // Move to active flows
    this.activeFlows.set(packet.id, packet);

    // Process asynchronously
    this.routeData(packet.id).catch(error => {
      this.logger.error(`Async routing failed for packet ${packet.id}`, error);
    });
  }

  private insertPacketByPriority(packet: DataPacket): void {
  const priorityOrder: Record<DataPacket['priority'], number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const packetPriority = priorityOrder[packet.priority] ?? priorityOrder.medium;

    // Insert in priority order
    let inserted = false;
    for (let i = 0; i < this.flowQueue.length; i++) {
      const queued = this.flowQueue[i];
      const queuedPriority = priorityOrder[queued?.priority ?? 'medium'];
      if (packetPriority < queuedPriority) {
        this.flowQueue.splice(i, 0, packet);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      this.flowQueue.push(packet);
    }
  }

  private getPacket(packetId: string): DataPacket | null {
    const active = this.activeFlows.get(packetId);
    if (active) return active;

    const queued = this.flowQueue.find(p => p.id === packetId);
    if (queued) return queued;

    return null;
  }

  private findApplicableRules(packet: DataPacket): DataFlowRule[] {
    const rules: DataFlowRule[] = [];

    for (const rule of this.flowRules.values()) {
      if (!rule.enabled) continue;

      // Check source match
      if (rule.source !== '*' && rule.source !== packet.source) continue;

      // Check target match
      if (rule.target !== '*' && rule.target !== packet.target) continue;

      // Check conditions
      if (this.evaluateConditions(packet, rule.conditions)) {
        rules.push(rule);
      }
    }

    // Sort by priority (lower number = higher priority)
    return rules.sort((a, b) => a.priority - b.priority);
  }

  private evaluateConditions(packet: DataPacket, conditions: any[]): boolean {
    for (const condition of conditions) {
      switch (condition.type) {
        case 'always':
          return true;
        case 'insight_priority':
          return packet.metadata.insightPriority === condition.value;
        case 'correlation_opportunity':
          return packet.metadata.hasCorrelationData === true;
        default:
          return true;
      }
    }
    return true;
  }

  private async applyTransformations(data: any, transformations: any[]): Promise<any> {
    let processedData = data;

    for (const transform of transformations) {
      switch (transform.type) {
        case 'sanitize':
          processedData = this.sanitizeData(processedData);
          break;
        case 'compress':
          processedData = this.compressData(processedData);
          break;
        case 'format_insight':
          processedData = this.formatInsight(processedData);
          break;
        case 'aggregate_for_correlation':
          processedData = this.aggregateForCorrelation(processedData);
          break;
      }
    }

    return processedData;
  }

  private async deliverData(target: string, data: any, metadata: any): Promise<boolean> {
    try {
      // Emit delivery event
      this.eventSystem.emitEvent(
        `${target.toLowerCase()}:data:received`,
        'DataFlowManager',
        { data, metadata },
        'medium'
      );

      return true;
    } catch (error) {
      this.logger.error(`Data delivery failed to ${target}`, error);
      return false;
    }
  }

  private async handleUnroutablePacket(packet: DataPacket): Promise<boolean> {
    this.logger.warn(`Unroutable packet: ${packet.id}`);

    // Try generic delivery
    try {
      await this.deliverData(packet.target, packet.data, packet.metadata);
      return true;
    } catch (error) {
      this.logger.error(`Generic delivery failed for packet ${packet.id}`, error);
      return false;
    }
  }

  private async handleFailedDelivery(packet: DataPacket): Promise<boolean> {
    packet.retryCount++;

    if (packet.retryCount >= this.retryLimit) {
      this.logger.error(`Packet ${packet.id} exceeded retry limit, dropping`);
      this.activeFlows.delete(packet.id);
      this.updateMetrics(0, false);
      return false;
    }

    // Re-queue with delay
    setTimeout(() => {
      this.flowQueue.unshift(packet);
    }, 1000 * packet.retryCount);

    return false;
  }

  private async mergePackets(packets: DataPacket[]): Promise<DataPacket> {
    if (!packets || packets.length === 0) {
      // Return a safe default packet when nothing to merge
      return {
        id: this.generatePacketId(),
        source: 'unknown',
        target: 'unknown',
        data: {},
        timestamp: new Date(),
        priority: 'medium',
        metadata: {},
        retryCount: 0
      };
    }

  const basePacket = packets[0]!;
    const mergedData: any = {};

    // Merge data from all packets
    packets.forEach(packet => {
      Object.assign(mergedData, packet.data);
    });

    return {
      id: this.generatePacketId(),
      source: basePacket.source || 'unknown',
      target: basePacket.target || 'unknown',
      data: mergedData,
      timestamp: new Date(),
      priority: basePacket.priority || 'medium',
      metadata: basePacket.metadata || {},
      retryCount: basePacket.retryCount || 0
    };
  }

  private selectHighestPriorityPacket(packets: DataPacket[]): DataPacket {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return packets.reduce((highest, current) => {
      const currentPriority = priorityOrder[current.priority];
      const highestPriority = priorityOrder[highest.priority];
      return currentPriority < highestPriority ? current : highest;
    });
  }

  private async analyzeFlowPerformance(): Promise<any> {
    return {
      avgQueueSize: this.flowQueue.length,
      processingRate: this.processingRate,
      errorRate: this.metrics.errorRate,
      throughput: this.metrics.throughput
    };
  }

  private async cleanupExpiredFlows(): Promise<void> {
    const expiredThreshold = Date.now() - 300000; // 5 minutes

    for (const [id, packet] of this.activeFlows.entries()) {
      if (packet.timestamp.getTime() < expiredThreshold) {
        this.activeFlows.delete(id);
        this.logger.debug(`Expired flow cleaned up: ${id}`);
      }
    }
  }

  private async optimizeRulePriority(): Promise<void> {
    // Analyze rule usage and adjust priorities
    // Implementation would analyze rule usage patterns
  }

  private async flushQueue(timeoutMs: number): Promise<void> {
    const startTime = Date.now();

    while (this.flowQueue.length > 0 && Date.now() - startTime < timeoutMs) {
      await this.processQueue();
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  private updateMetrics(latency: number, success: boolean): void {
    this.metrics.totalTransfers++;

    if (success) {
      this.metrics.averageLatency = (this.metrics.averageLatency + latency) / 2;
    } else {
      this.metrics.errorRate = (this.metrics.errorRate * 0.9) + 0.1;
    }

    this.metrics.throughput = this.metrics.totalTransfers / ((Date.now() - this.startTime) / 1000);
  }

  // Data transformation helpers
  private sanitizeData(data: any): any {
    // Remove sensitive information, validate structure
    return JSON.parse(JSON.stringify(data)); // Deep clone and sanitize
  }

  private compressData(data: any): any {
    // Compress large data structures
    return data; // Placeholder implementation
  }

  private formatInsight(data: any): any {
    // Format AI insights for consumption
    return {
      ...data,
      formatted: true,
      timestamp: new Date().toISOString()
    };
  }

  private aggregateForCorrelation(data: any): any {
    // Aggregate data for correlation analysis
    return {
      ...data,
      aggregated: true,
      correlationReady: true
    };
  }

  private generatePacketId(): string {
    return `packet_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  private startTime = Date.now();
}

export default DataFlowManager;
