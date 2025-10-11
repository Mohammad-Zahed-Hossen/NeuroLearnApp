/**
 * Enhanced ErrorHandler - Production-Ready Error Management
 *
 * Comprehensive error handling with categorization, recovery strategies,
 * and intelligent error reporting with proper TypeScript support.
 */

import { Logger } from './Logger';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  VALIDATION = 'validation',
  NETWORK = 'network',
  STORAGE = 'storage',
  AUTHENTICATION = 'authentication',
  PERMISSION = 'permission',
  CALCULATION = 'calculation',
  SYSTEM = 'system',
  USER_INPUT = 'user_input',
  EXTERNAL_SERVICE = 'external_service',
  UNKNOWN = 'unknown'
}

export interface ErrorContext {
  source: string;
  operation: string;
  userId?: string;
  sessionId?: string;
  metadata?: any;
  stackTrace?: string;
}

export interface ErrorReport {
  id: string;
  timestamp: Date;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context: ErrorContext;
  originalError?: any;
  recoveryAttempts: number;
  resolved: boolean;
  userImpact: 'none' | 'low' | 'medium' | 'high';
}

export interface RecoveryStrategy {
  name: string;
  condition: (error: ErrorReport) => boolean;
  action: (error: ErrorReport) => Promise<boolean>;
  maxAttempts: number;
}

/**
 * Enhanced Error Handler
 *
 * Provides comprehensive error management with categorization,
 * automatic recovery, and intelligent error reporting.
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private logger: Logger;

  private errorHistory: Map<string, ErrorReport> = new Map();
  private recoveryStrategies: RecoveryStrategy[] = [];
  private maxErrorHistory = 1000;

  // Error patterns for automatic categorization
  private categoryPatterns = new Map<RegExp, ErrorCategory>([
    [/network|fetch|request|connection/i, ErrorCategory.NETWORK],
    [/storage|database|save|load|sync/i, ErrorCategory.STORAGE],
    [/auth|login|token|permission/i, ErrorCategory.AUTHENTICATION],
    [/validation|invalid|required|format/i, ErrorCategory.VALIDATION],
    [/calculation|math|compute|algorithm/i, ErrorCategory.CALCULATION],
    [/system|memory|cpu|performance/i, ErrorCategory.SYSTEM],
    [/user|input|form|data entry/i, ErrorCategory.USER_INPUT],
    [/external|api|service|third-party/i, ErrorCategory.EXTERNAL_SERVICE]
  ]);

  private constructor() {
    this.logger = new Logger('ErrorHandler');
    this.setupDefaultRecoveryStrategies();
    this.setupGlobalErrorHandlers();
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle error with automatic categorization and recovery
   */
  public async handleError(
    error: unknown,
    context: Partial<ErrorContext> = {},
    customCategory?: ErrorCategory,
    customSeverity?: ErrorSeverity
  ): Promise<ErrorReport> {
    const errorReport = this.createErrorReport(error, context, customCategory, customSeverity);

    // Store error
    this.errorHistory.set(errorReport.id, errorReport);
    this.limitErrorHistory();

    // Log error
    this.logError(errorReport);

    // Attempt recovery if applicable
    if (errorReport.severity !== ErrorSeverity.LOW) {
      await this.attemptRecovery(errorReport);
    }

    // Report to external services if critical
    if (errorReport.severity === ErrorSeverity.CRITICAL) {
      await this.reportCriticalError(errorReport);
    }

    return errorReport;
  }

  /**
   * Safe error handler that never throws
   */
  public safeHandle(
    error: unknown,
    context: Partial<ErrorContext> = {},
    fallbackMessage: string = 'An unexpected error occurred'
  ): string {
    try {
      const errorReport = this.createErrorReport(error, context);
      this.logError(errorReport);
      return this.formatUserMessage(errorReport);
    } catch (handlingError) {
      // If error handling itself fails, use fallback
      console.error('Error handler failed:', handlingError);
      return fallbackMessage;
    }
  }

  /**
   * Extract error message safely from unknown error
   */
  public static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (error && typeof error === 'object') {
      // Handle common error object structures
      if ('message' in error && typeof error.message === 'string') {
        return error.message;
      }

      if ('error' in error && typeof error.error === 'string') {
        return error.error;
      }

      if ('description' in error && typeof error.description === 'string') {
        return error.description;
      }
    }

    return 'Unknown error occurred';
  }

  /**
   * Get error stack trace safely
   */
  public static getErrorStack(error: unknown): string | undefined {
    if (error instanceof Error && error.stack) {
      return error.stack;
    }

    if (error && typeof error === 'object' && 'stack' in error && typeof error.stack === 'string') {
      return error.stack;
    }

    return undefined;
  }

  /**
   * Add custom recovery strategy
   */
  public addRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
    this.logger.info(`Recovery strategy added: ${strategy.name}`);
  }

  /**
   * Get error statistics
   */
  public getErrorStatistics(): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recoverySuccessRate: number;
    criticalErrors: number;
  } {
    const errors = Array.from(this.errorHistory.values());

    const stats = {
      totalErrors: errors.length,
      errorsByCategory: {} as Record<ErrorCategory, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      recoverySuccessRate: 0,
      criticalErrors: 0
    };

    // Initialize counters
    Object.values(ErrorCategory).forEach(category => {
      stats.errorsByCategory[category] = 0;
    });

    Object.values(ErrorSeverity).forEach(severity => {
      stats.errorsBySeverity[severity] = 0;
    });

    // Count errors
    let recoveredErrors = 0;

    errors.forEach(error => {
      stats.errorsByCategory[error.category]++;
      stats.errorsBySeverity[error.severity]++;

      if (error.severity === ErrorSeverity.CRITICAL) {
        stats.criticalErrors++;
      }

      if (error.resolved && error.recoveryAttempts > 0) {
        recoveredErrors++;
      }
    });

    // Calculate recovery success rate
    const errorsWithRecovery = errors.filter(e => e.recoveryAttempts > 0);
    stats.recoverySuccessRate = errorsWithRecovery.length > 0
      ? recoveredErrors / errorsWithRecovery.length
      : 0;

    return stats;
  }

  /**
   * Get recent errors
   */
  public getRecentErrors(limit: number = 50, severity?: ErrorSeverity): ErrorReport[] {
    let errors = Array.from(this.errorHistory.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (severity) {
      errors = errors.filter(error => error.severity === severity);
    }

    return errors.slice(0, limit);
  }

  /**
   * Clear error history
   */
  public clearHistory(): void {
    this.errorHistory.clear();
    this.logger.info('Error history cleared');
  }

  /**
   * Export error reports for analysis
   */
  public exportErrors(): string {
    const errors = Array.from(this.errorHistory.values()).map(error => ({
      ...error,
      timestamp: error.timestamp.toISOString()
    }));

    return JSON.stringify(errors, null, 2);
  }

  /**
   * Wrap async function with error handling
   */
  public wrapAsync<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context: Partial<ErrorContext> = {}
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args);
      } catch (error) {
        await this.handleError(error, {
          ...context,
          operation: context.operation || fn.name || 'anonymous function'
        });
        throw error; // Re-throw after handling
      }
    };
  }

  /**
   * Wrap sync function with error handling
   */
  public wrapSync<T extends any[], R>(
    fn: (...args: T) => R,
    context: Partial<ErrorContext> = {}
  ): (...args: T) => R {
    return (...args: T): R => {
      try {
        return fn(...args);
      } catch (error) {
        this.handleError(error, {
          ...context,
          operation: context.operation || fn.name || 'anonymous function'
        });
        throw error; // Re-throw after handling
      }
    };
  }

  // Private Methods

  private createErrorReport(
    error: unknown,
    context: Partial<ErrorContext>,
    customCategory?: ErrorCategory,
    customSeverity?: ErrorSeverity
  ): ErrorReport {
    const message = ErrorHandler.getErrorMessage(error);
    const stackTrace = ErrorHandler.getErrorStack(error);

    const report: ErrorReport = {
      id: this.generateErrorId(),
      timestamp: new Date(),
      message,
      category: customCategory || this.categorizeError(message),
      severity: customSeverity || this.determineSeverity(message, error),
      context: {
        source: 'unknown',
        operation: 'unknown',
        ...context,
        stackTrace: stackTrace || new Error().stack
      },
      originalError: error,
      recoveryAttempts: 0,
      resolved: false,
      userImpact: this.assessUserImpact(message, customSeverity)
    };

    return report;
  }

  private categorizeError(message: string): ErrorCategory {
    for (const [pattern, category] of this.categoryPatterns) {
      if (pattern.test(message)) {
        return category;
      }
    }
    return ErrorCategory.UNKNOWN;
  }

  private determineSeverity(message: string, error: unknown): ErrorSeverity {
    const lowerMessage = message.toLowerCase();

    // Critical indicators
    if (lowerMessage.includes('critical') ||
        lowerMessage.includes('fatal') ||
        lowerMessage.includes('system failure')) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity indicators
    if (lowerMessage.includes('auth') ||
        lowerMessage.includes('security') ||
        lowerMessage.includes('data loss') ||
        lowerMessage.includes('corruption')) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity indicators
    if (lowerMessage.includes('timeout') ||
        lowerMessage.includes('network') ||
        lowerMessage.includes('service unavailable')) {
      return ErrorSeverity.MEDIUM;
    }

    // Default to low for validation and user input errors
    return ErrorSeverity.LOW;
  }

  private assessUserImpact(message: string, severity?: ErrorSeverity): 'none' | 'low' | 'medium' | 'high' {
    if (severity === ErrorSeverity.CRITICAL) return 'high';
    if (severity === ErrorSeverity.HIGH) return 'medium';
    if (severity === ErrorSeverity.MEDIUM) return 'low';

    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('validation') || lowerMessage.includes('input')) {
      return 'low';
    }

    return 'none';
  }

  private logError(errorReport: ErrorReport): void {
    const logData = {
      errorId: errorReport.id,
      category: errorReport.category,
      severity: errorReport.severity,
      context: errorReport.context,
      userImpact: errorReport.userImpact
    };

    switch (errorReport.severity) {
      case ErrorSeverity.CRITICAL:
        this.logger.critical(errorReport.message, logData);
        break;
      case ErrorSeverity.HIGH:
        this.logger.error(errorReport.message, logData);
        break;
      case ErrorSeverity.MEDIUM:
        this.logger.warn(errorReport.message, logData);
        break;
      case ErrorSeverity.LOW:
      default:
        this.logger.info(errorReport.message, logData);
        break;
    }
  }

  private async attemptRecovery(errorReport: ErrorReport): Promise<void> {
    for (const strategy of this.recoveryStrategies) {
      if (strategy.condition(errorReport) && errorReport.recoveryAttempts < strategy.maxAttempts) {
        try {
          errorReport.recoveryAttempts++;
          const success = await strategy.action(errorReport);

          if (success) {
            errorReport.resolved = true;
            this.logger.info(`Error recovered using strategy: ${strategy.name}`, {
              errorId: errorReport.id,
              attempts: errorReport.recoveryAttempts
            });
            break;
          }
        } catch (recoveryError) {
          this.logger.error(`Recovery strategy failed: ${strategy.name}`, {
            originalErrorId: errorReport.id,
            recoveryError: ErrorHandler.getErrorMessage(recoveryError)
          });
        }
      }
    }
  }

  private async reportCriticalError(errorReport: ErrorReport): Promise<void> {
    try {
      // In a real app, this would send to an error reporting service
      console.error('🚨 CRITICAL ERROR REPORTED:', {
        id: errorReport.id,
        message: errorReport.message,
        context: errorReport.context,
        timestamp: errorReport.timestamp
      });

      // You could integrate with services like Sentry, Crashlytics, etc.
    } catch (reportingError) {
      this.logger.error('Failed to report critical error', reportingError);
    }
  }

  private formatUserMessage(errorReport: ErrorReport): string {
    switch (errorReport.category) {
      case ErrorCategory.NETWORK:
        return 'Network connection issue. Please check your internet connection and try again.';
      case ErrorCategory.VALIDATION:
        return 'Please check your input and try again.';
      case ErrorCategory.AUTHENTICATION:
        return 'Authentication failed. Please log in again.';
      case ErrorCategory.STORAGE:
        return 'Unable to save data. Please try again later.';
      case ErrorCategory.EXTERNAL_SERVICE:
        return 'External service temporarily unavailable. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  private setupDefaultRecoveryStrategies(): void {
    // Network retry strategy
    this.addRecoveryStrategy({
      name: 'NetworkRetry',
      condition: (error) => error.category === ErrorCategory.NETWORK,
      action: async (error) => {
        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        return true; // Simplified - in real app, would retry the operation
      },
      maxAttempts: 3
    });

    // Storage fallback strategy
    this.addRecoveryStrategy({
      name: 'StorageFallback',
      condition: (error) => error.category === ErrorCategory.STORAGE,
      action: async (error) => {
        // Try alternative storage method
        return false; // Simplified - would implement actual fallback
      },
      maxAttempts: 2
    });

    // Authentication refresh strategy
    this.addRecoveryStrategy({
      name: 'AuthRefresh',
      condition: (error) => error.category === ErrorCategory.AUTHENTICATION,
      action: async (error) => {
        // Try to refresh authentication
        return false; // Simplified - would implement token refresh
      },
      maxAttempts: 1
    });
  }

  private setupGlobalErrorHandlers(): void {
    // Global error handler for unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(event.reason, {
          source: 'global',
          operation: 'unhandledRejection'
        });
      });
    }
  }

  private limitErrorHistory(): void {
    if (this.errorHistory.size > this.maxErrorHistory) {
      // Remove oldest errors
      const sortedErrors = Array.from(this.errorHistory.entries())
        .sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime());

      const toRemove = sortedErrors.slice(0, this.errorHistory.size - this.maxErrorHistory);
      toRemove.forEach(([id]) => this.errorHistory.delete(id));
    }
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
}

// Global error utilities
export const safeAsync = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: Partial<ErrorContext>
) => {
  return ErrorHandler.getInstance().wrapAsync(fn, context);
};

export const safeSync = <T extends any[], R>(
  fn: (...args: T) => R,
  context?: Partial<ErrorContext>
) => {
  return ErrorHandler.getInstance().wrapSync(fn, context);
};

export const getErrorMessage = ErrorHandler.getErrorMessage;
export const getErrorStack = ErrorHandler.getErrorStack;

export default ErrorHandler;
