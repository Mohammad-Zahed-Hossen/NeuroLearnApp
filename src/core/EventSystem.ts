/**
 * EventSystem - Event-Driven Communication Hub
 *
 * Centralized event bus for cross-module communication in the NeuroLearn ecosystem.
 * Implements a robust publish-subscribe pattern with event filtering, prioritization,
 * and automatic cleanup.
 *
 * Features:
 * - Type-safe event definitions
 * - Event prioritization and queuing
 * - Automatic event cleanup and memory management
 * - Event history and debugging
 * - Cross-module event routing
 */

import { EventEmitter } from 'eventemitter3';
import { Logger } from './utils/Logger';
import { getErrorMessage } from './utils/ErrorHandler';

export interface NeuroLearnEvent {
  id: string;
  type: string;
  source: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  data: any;
  correlationId?: string;
  userId?: string;
}

export interface EventSubscription {
  id: string;
  eventType: string;
  handler: (event: NeuroLearnEvent) => void | Promise<void>;
  options: {
    priority?: 'low' | 'medium' | 'high';
    once?: boolean;
    filter?: (event: NeuroLearnEvent) => boolean;
  };
  createdAt: Date;
}

/**
 * Central Event System for NeuroLearn
 *
 * Handles all cross-module communication through a robust event bus system.
 */
export class EventSystem extends EventEmitter {
  private static instance: EventSystem;
  private logger: Logger;
  private eventHistory: NeuroLearnEvent[] = [];
  private subscriptions: Map<string, EventSubscription> = new Map();
  private eventQueue: NeuroLearnEvent[] = [];
  private isProcessingQueue = false;
  private maxHistorySize = 1000;
  private maxQueueSize = 500;

  private constructor() {
    super();
    this.logger = new Logger('EventSystem');
    this.setupInternalEventHandlers();
  }

  public static getInstance(): EventSystem {
    if (!EventSystem.instance) {
      EventSystem.instance = new EventSystem();
    }
    return EventSystem.instance;
  }

  /**
   * Emit a NeuroLearn event
   */
  public emitEvent(
    type: string,
    source: string,
    data: any,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    correlationId?: string,
    userId?: string
  ): void {
    this.publish(type, source, data, priority, correlationId, userId);
  }

  /**
   * Publish an event (alias for emitEvent)
   */
  public publish(
    type: string,
    source: string,
    data: any,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    correlationId?: string,
    userId?: string
  ): void {
    const event: NeuroLearnEvent = {
      id: this.generateEventId(),
      type,
      source,
      timestamp: new Date(),
      priority,
      data,
      correlationId,
      userId
    };

    this.logger.debug(`Event emitted: ${type}`, {
      eventId: event.id,
      source,
      priority
    });

    // Add to history
    this.addToHistory(event);

    // Handle based on priority
    if (priority === 'critical') {
      this.processEventImmediately(event);
    } else {
      this.addToQueue(event);
    }
  }

  /**
   * Subscribe to events with advanced options
   */
  public subscribe(
    eventType: string,
    handler: (event: NeuroLearnEvent) => void | Promise<void>,
    options: {
      priority?: 'low' | 'medium' | 'high';
      once?: boolean;
      filter?: (event: NeuroLearnEvent) => boolean;
    } = {}
  ): string {
    const subscription: EventSubscription = {
      id: this.generateSubscriptionId(),
      eventType,
      handler,
      options,
      createdAt: new Date()
    };

    this.subscriptions.set(subscription.id, subscription);

    // Register with EventEmitter
    const wrappedHandler = async (event: NeuroLearnEvent) => {
      try {
        // Apply filter if provided
        if (subscription.options.filter && !subscription.options.filter(event)) {
          return;
        }

        await handler(event);

        // Remove if once option is set
        if (subscription.options.once) {
          this.unsubscribe(subscription.id);
        }
      } catch (error) {
        this.logger.error(`Event handler error for ${eventType}`, error);
        this.emitEvent('system:event:error', 'EventSystem', {
          subscriptionId: subscription.id,
          eventType,
          error: getErrorMessage(error)
        }, 'high');
      }
    };

    this.on(eventType, wrappedHandler);

    this.logger.debug(`Subscription created for ${eventType}`, {
      subscriptionId: subscription.id,
      options
    });

    return subscription.id;
  }

  /**
   * Unsubscribe from events
   */
  public unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    this.removeAllListeners(subscription.eventType);
    this.subscriptions.delete(subscriptionId);

    this.logger.debug(`Subscription removed`, { subscriptionId });
    return true;
  }

  /**
   * Get event history with filtering options
   */
  public getEventHistory(
    filter?: {
      type?: string;
      source?: string;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      since?: Date;
      userId?: string;
    },
    limit = 100
  ): NeuroLearnEvent[] {
    let events = [...this.eventHistory];

    if (filter) {
      events = events.filter(event => {
        if (filter.type && event.type !== filter.type) return false;
        if (filter.source && event.source !== filter.source) return false;
        if (filter.priority && event.priority !== filter.priority) return false;
        if (filter.since && event.timestamp < filter.since) return false;
        if (filter.userId && event.userId !== filter.userId) return false;
        return true;
      });
    }

    return events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get active subscriptions
   */
  public getActiveSubscriptions(): EventSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Clear event history
   */
  public clearHistory(): void {
    this.eventHistory = [];
    this.logger.info('Event history cleared');
  }

  /**
   * Get system statistics
   */
  public getStats(): {
    totalEvents: number;
    activeSubscriptions: number;
    queueSize: number;
    eventsByType: Record<string, number>;
    eventsByPriority: Record<string, number>;
  } {
    const eventsByType: Record<string, number> = {};
    const eventsByPriority: Record<string, number> = {};

    this.eventHistory.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsByPriority[event.priority] = (eventsByPriority[event.priority] || 0) + 1;
    });

    return {
      totalEvents: this.eventHistory.length,
      activeSubscriptions: this.subscriptions.size,
      queueSize: this.eventQueue.length,
      eventsByType,
      eventsByPriority
    };
  }

  // Private Methods

  private setupInternalEventHandlers(): void {
    // Process queue periodically
    setInterval(() => {
      this.processQueue();
    }, 100);

    // Cleanup old events
    setInterval(() => {
      this.cleanupHistory();
    }, 60000); // Every minute
  }

  private processEventImmediately(event: NeuroLearnEvent): void {
    this.logger.debug(`Processing critical event immediately: ${event.type}`, {
      eventId: event.id
    });

    this.emit(event.type, event);
  }

  private addToQueue(event: NeuroLearnEvent): void {
    if (this.eventQueue.length >= this.maxQueueSize) {
      // Remove oldest low priority events to make room
      this.eventQueue = this.eventQueue.filter(e => e.priority !== 'low');

      if (this.eventQueue.length >= this.maxQueueSize) {
        this.logger.warn('Event queue full, dropping oldest events');
        this.eventQueue.splice(0, this.eventQueue.length - this.maxQueueSize + 1);
      }
    }

    // Insert based on priority
    const insertIndex = this.findInsertIndex(event);
    this.eventQueue.splice(insertIndex, 0, event);
  }

  private findInsertIndex(event: NeuroLearnEvent): number {
  const priorityOrder: Record<'critical' | 'high' | 'medium' | 'low', number> = { critical: -1, high: 0, medium: 1, low: 2 };
  const eventPriorityValue = priorityOrder[event.priority];

    for (let i = 0; i < this.eventQueue.length; i++) {
      const queueEventPriorityValue = priorityOrder[this.eventQueue[i].priority];
      if (eventPriorityValue < queueEventPriorityValue) {
        return i;
      }
    }

    return this.eventQueue.length;
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      // Process up to 10 events per cycle to avoid blocking
      const eventsToProcess = this.eventQueue.splice(0, 10);

      for (const event of eventsToProcess) {
        this.logger.debug(`Processing queued event: ${event.type}`, {
          eventId: event.id
        });

        this.emit(event.type, event);
      }
    } catch (error) {
      this.logger.error('Error processing event queue', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private addToHistory(event: NeuroLearnEvent): void {
    this.eventHistory.push(event);

    // Keep history within limits
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.splice(0, this.eventHistory.length - this.maxHistorySize);
    }
  }

  private cleanupHistory(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    const initialLength = this.eventHistory.length;
    this.eventHistory = this.eventHistory.filter(event =>
      event.timestamp > cutoffTime || event.priority === 'critical'
    );

    const cleanedCount = initialLength - this.eventHistory.length;
    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} old events from history`);
    }
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
}

// Pre-defined event types for type safety
export const EVENT_TYPES = {
  // System Events
  SYSTEM_INITIALIZED: 'system:initialized',
  SYSTEM_SHUTDOWN: 'system:shutdown',
  SYSTEM_ERROR: 'system:error',
  SYSTEM_WARNING: 'system:warning',
  SYSTEM_OPTIMIZE: 'system:optimize',

  // Command Events
  COMMAND_STARTED: 'command:started',
  COMMAND_COMPLETED: 'command:completed',
  COMMAND_ERROR: 'command:error',

  // Cognitive Events
  COGNITIVE_LOAD_HIGH: 'cognitive:load:high',
  COGNITIVE_LOAD_NORMAL: 'cognitive:load:normal',
  COGNITIVE_STATE_CHANGED: 'cognitive:state:changed',

  // Learning Events
  LEARNING_SESSION_STARTED: 'learning:session:started',
  LEARNING_SESSION_COMPLETED: 'learning:session:completed',
  LEARNING_PROGRESS_UPDATED: 'learning:progress:updated',
  FLASHCARD_REVIEWED: 'learning:flashcard:reviewed',
  KNOWLEDGE_MASTERED: 'learning:knowledge:mastered',

  // Focus Events
  FOCUS_SESSION_STARTED: 'focus:session:started',
  FOCUS_SESSION_COMPLETED: 'focus:session:completed',
  FOCUS_INTERRUPTION: 'focus:interruption',
  BREAK_RECOMMENDED: 'focus:break:recommended',

  // Storage Events
  STORAGE_SYNC_NEEDED: 'storage:sync:needed',
  STORAGE_SYNC_COMPLETED: 'storage:sync:completed',
  STORAGE_ERROR: 'storage:error',
  DATA_MIGRATED: 'storage:data:migrated',
  // Data Flow Events (used by DataFlowManager and orchestrators)
  DATA_FLOW_QUEUED: 'data:flow:queued',
  DATA_FLOW_COMPLETED: 'data:flow:completed',
  DATA_FLOW_RULE_ADDED: 'data:flow:rule:added',
  DATA_FLOW_RULE_REMOVED: 'data:flow:rule:removed',
  DATA_CONFLICT_RESOLVED: 'data:conflict:resolved',

  // Network Events
  NETWORK_ONLINE: 'network:online',
  NETWORK_OFFLINE: 'network:offline',
  SYNC_STARTED: 'sync:started',
  SYNC_COMPLETED: 'sync:completed',
  SYNC_FAILED: 'sync:failed',

  // AI Events
  AI_INSIGHT_GENERATED: 'ai:insight:generated',
  AI_RECOMMENDATION_READY: 'ai:recommendation:ready',
  AI_PATTERN_DETECTED: 'ai:pattern:detected',
  AI_ANALYSIS_COMPLETED: 'ai:analysis:completed',

  // Finance Events
  TRANSACTION_ADDED: 'finance:transaction:added',
  BUDGET_EXCEEDED: 'finance:budget:exceeded',
  FINANCIAL_GOAL_ACHIEVED: 'finance:goal:achieved',
  STRESS_LEVEL_CHANGED: 'finance:stress:changed',

  // Wellness Events
  SLEEP_TRACKED: 'wellness:sleep:tracked',
  EXERCISE_LOGGED: 'wellness:exercise:logged',
  MOOD_UPDATED: 'wellness:mood:updated',
  HEALTH_METRIC_CHANGED: 'wellness:health:changed',

  // Context Events
  LOCATION_CHANGED: 'context:location:changed',
  ENVIRONMENT_OPTIMIZED: 'context:environment:optimized',
  DISTRACTION_DETECTED: 'context:distraction:detected',

  // Performance Events
  PERFORMANCE_WARNING: 'performance:warning',
  PERFORMANCE_CRITICAL: 'performance:critical',
  MEMORY_PRESSURE: 'performance:memory:pressure',

  // User Events
  USER_LOGGED_IN: 'user:logged:in',
  USER_LOGGED_OUT: 'user:logged:out',
  USER_PREFERENCE_CHANGED: 'user:preference:changed',

  // Cross-Module Events
  CROSS_MODULE_CORRELATION: 'cross:module:correlation',
  HOLISTIC_SCORE_UPDATED: 'cross:module:holistic:updated',
  ADAPTIVE_CHANGE_NEEDED: 'cross:module:adaptive:change'
  ,
  // State Events
  STATE_CHANGED: 'state:changed',
  STATE_ROLLBACK: 'state:rollback',
  STATE_IMPORTED: 'state:imported'
} as const;

export default EventSystem;
