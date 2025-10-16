/**
 * Enhanced Logger - Production-Ready Logging System
 *
 * Advanced logging with levels, formatting, persistence, and performance monitoring.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  context: string;
  message: string;
  data?: any;
  stack?: string;
  performanceMetrics?: {
    memory: number;
    cpu: number;
    duration?: number;
  };
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enablePersistence: boolean;
  maxLogEntries: number;
  enablePerformanceMetrics: boolean;
  enableRemoteLogging: boolean;
  remoteEndpoint?: string;
}

/**
 * Enhanced Logger
 *
 * Provides comprehensive logging capabilities with performance monitoring,
 * structured logging, and multiple output targets.
 */
export class Logger {
  private context: string;
  private static config: LoggerConfig = {
    // Determine defaults from environment where possible. Allow overrides via
    // process.env.LOG_LEVEL and other variables in dev or CI.
    level: ((): LogLevel => {
      try {
        const envLevel = (typeof process !== 'undefined' && process.env && process.env.LOG_LEVEL) ? process.env.LOG_LEVEL.toLowerCase() : undefined;
        if (envLevel) {
          switch (envLevel) {
            case 'debug': return LogLevel.DEBUG;
            case 'info': return LogLevel.INFO;
            case 'warn': return LogLevel.WARN;
            case 'error': return LogLevel.ERROR;
            case 'critical': return LogLevel.CRITICAL;
            default: break;
          }
        }
      } catch {}
      return typeof __DEV__ !== 'undefined' && __DEV__ ? LogLevel.DEBUG : LogLevel.INFO;
    })(),
    enableConsole: ((): boolean => {
      try {
        const v = (typeof process !== 'undefined' && process.env && process.env.LOG_ENABLE_CONSOLE);
        if (v !== undefined) return String(v).toLowerCase() === 'true';
      } catch {}
      return true;
    })(),
    enablePersistence: true,
    maxLogEntries: 1000,
    enablePerformanceMetrics: ((): boolean => {
      try {
        const v = (typeof process !== 'undefined' && process.env && process.env.LOG_ENABLE_PERF_METRICS);
        if (v !== undefined) return String(v).toLowerCase() === 'true';
      } catch {}
      return typeof __DEV__ !== 'undefined' && __DEV__;
    })(),
    enableRemoteLogging: false
  };

  private static logHistory: LogEntry[] = [];
  private static performanceTimers: Map<string, number> = new Map();

  constructor(context: string) {
    this.context = context;
  }

  /**
   * Configure global logger settings
   */
  public static configure(config: Partial<LoggerConfig>): void {
    Logger.config = { ...Logger.config, ...config };
  }

  /**
   * Log debug message
   */
  public debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log info message
   */
  public info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log warning message
   */
  public warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log error message
   */
  public error(message: string, error?: any): void {
    const stack = error?.stack || error?.toString() || new Error().stack;
    this.log(LogLevel.ERROR, message, error, stack);
  }

  /**
   * Log critical error
   */
  public critical(message: string, error?: any): void {
    const stack = error?.stack || error?.toString() || new Error().stack;
    this.log(LogLevel.CRITICAL, message, error, stack);

    // For critical errors, always log regardless of level
    this.forceLog(LogLevel.CRITICAL, message, error, stack);
  }

  /**
   * Start performance timer
   */
  public startTimer(timerName: string): void {
    const key = `${this.context}:${timerName}`;
    Logger.performanceTimers.set(key, Date.now());
  }

  /**
   * End performance timer and log duration
   */
  public endTimer(timerName: string, message?: string): number {
    const key = `${this.context}:${timerName}`;
    const startTime = Logger.performanceTimers.get(key);

    if (!startTime) {
      this.warn(`Timer '${timerName}' was not started`);
      return 0;
    }

    const duration = Date.now() - startTime;
    Logger.performanceTimers.delete(key);

    const logMessage = message || `${timerName} completed`;
    this.debug(logMessage, { duration: `${duration}ms` });

    return duration;
  }

  /**
   * Log with performance metrics
   */
  public performance(message: string, operation: () => any): any {
    const startTime = Date.now();
    const memoryBefore = this.getMemoryUsage();

    try {
      const result = operation();
      const duration = Date.now() - startTime;
      const memoryAfter = this.getMemoryUsage();

      this.log(LogLevel.DEBUG, message, {
        result: result,
        performance: {
          duration: `${duration}ms`,
          memoryDelta: `${memoryAfter - memoryBefore}MB`
        }
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.error(`${message} failed`, {
        error,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Get log history
   */
  public static getHistory(level?: LogLevel, limit: number = 100): LogEntry[] {
    let logs = Logger.logHistory;

    if (level !== undefined) {
      logs = logs.filter(entry => entry.level >= level);
    }

    return logs.slice(-limit);
  }

  /**
   * Clear log history
   */
  public static clearHistory(): void {
    Logger.logHistory = [];
  }

  /**
   * Export logs for debugging
   */
  public static exportLogs(): string {
    const logs = Logger.logHistory.map(entry => ({
      timestamp: entry.timestamp.toISOString(),
      level: LogLevel[entry.level],
      context: entry.context,
      message: entry.message,
      data: entry.data,
      stack: entry.stack,
      performance: entry.performanceMetrics
    }));

    return JSON.stringify(logs, null, 2);
  }

  /**
   * Get performance metrics summary
   */
  public static getPerformanceMetrics(): {
    totalLogs: number;
    errorRate: number;
    averageMemoryUsage: number;
    criticalErrors: number;
  } {
    const totalLogs = Logger.logHistory.length;
    const errors = Logger.logHistory.filter(log => log.level >= LogLevel.ERROR).length;
    const criticalErrors = Logger.logHistory.filter(log => log.level === LogLevel.CRITICAL).length;

    const memoryLogs = Logger.logHistory.filter(log => log.performanceMetrics?.memory);
    const averageMemoryUsage = memoryLogs.length > 0
      ? memoryLogs.reduce((sum, log) => sum + (log.performanceMetrics?.memory || 0), 0) / memoryLogs.length
      : 0;

    return {
      totalLogs,
      errorRate: totalLogs > 0 ? errors / totalLogs : 0,
      averageMemoryUsage,
      criticalErrors
    };
  }

  // Private Methods

  private log(level: LogLevel, message: string, data?: any, stack?: string): void {
    if (level < Logger.config.level && level !== LogLevel.CRITICAL) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      context: this.context,
      message,
      data,
      ...(stack && { stack }),
      ...(Logger.config.enablePerformanceMetrics && {
        performanceMetrics: {
          memory: this.getMemoryUsage(),
          cpu: this.getCpuUsage()
        }
      })
    };

    // Add to history
    if (Logger.config.enablePersistence) {
      Logger.logHistory.push(entry);

      // Limit history size
      if (Logger.logHistory.length > Logger.config.maxLogEntries) {
        Logger.logHistory.shift();
      }
    }

    // Console output
    if (Logger.config.enableConsole) {
      this.outputToConsole(entry);
    }

    // Remote logging
    if (Logger.config.enableRemoteLogging && Logger.config.remoteEndpoint) {
      this.sendToRemote(entry).catch(err => {
        console.warn('Remote logging failed:', err);
      });
    }
  }

  private forceLog(level: LogLevel, message: string, data?: any, stack?: string): void {
    // Always log critical messages regardless of configuration
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      context: this.context,
      message,
      data,
      ...(stack && { stack })
    };

    console.error(`[CRITICAL] ${this.formatEntry(entry)}`);

    // Add to history even if persistence is disabled
    Logger.logHistory.push(entry);
  }

  private outputToConsole(entry: LogEntry): void {
    const formatted = this.formatEntry(entry);

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.log(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        break;
      case LogLevel.CRITICAL:
        console.error(`🚨 [CRITICAL] ${formatted}`);
        break;
    }
  }

  private formatEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = LogLevel[entry.level];
    const context = entry.context;
    const message = entry.message;

    let formatted = `[${timestamp}] ${level} [${context}] ${message}`;

    if (entry.data) {
      const dataStr = typeof entry.data === 'object'
        ? JSON.stringify(entry.data, null, 2)
        : entry.data;
      formatted += ` | Data: ${dataStr}`;
    }

    if (entry.performanceMetrics) {
      formatted += ` | Memory: ${entry.performanceMetrics.memory}MB`;
      if (entry.performanceMetrics.duration) {
        formatted += ` | Duration: ${entry.performanceMetrics.duration}ms`;
      }
    }

    if (entry.stack) {
      formatted += `\nStack: ${entry.stack}`;
    }

    return formatted;
  }

  private async sendToRemote(entry: LogEntry): Promise<void> {
    if (!Logger.config.remoteEndpoint) return;

    try {
      const response = await fetch(Logger.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(entry)
      });

      if (!response.ok) {
        throw new Error(`Remote logging failed: ${response.status}`);
      }
    } catch (error) {
      // Fail silently for remote logging to avoid infinite loops
    }
  }

  private getMemoryUsage(): number {
    try {
      // React Native doesn't have process.memoryUsage, so we estimate
      if (typeof performance !== 'undefined' && performance.memory) {
        return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
      }
      return 0;
    } catch {
      return 0;
    }
  }

  private getCpuUsage(): number {
    try {
      // Simplified CPU usage estimation for React Native
      return Math.random() * 10; // Placeholder implementation
    } catch {
      return 0;
    }
  }
}

export default Logger;
