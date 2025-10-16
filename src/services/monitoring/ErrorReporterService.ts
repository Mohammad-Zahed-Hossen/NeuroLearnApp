// src/services/monitoring/ErrorReporterService.ts - Complete Implementation

import { MMKV } from 'react-native-mmkv';

export interface DiagnosticLog {
  id: string;
  timestamp: Date;
  service: string;
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  message: string;
  traceId: string;
  metadata?: Record<string, any>;
  stackTrace?: string;
  userContext?: {
    userId?: string;
    sessionId?: string;
    screenName?: string;
  };
}

export class ErrorReporterService {
  private static instance: ErrorReporterService;
  private storage = new MMKV({ id: 'error-logs' });
  private maxLogs = 50;
  private sessionId: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
  }

  public static getInstance(): ErrorReporterService {
    if (!ErrorReporterService.instance) {
      ErrorReporterService.instance = new ErrorReporterService();
    }
    return ErrorReporterService.instance;
  }

  /**
   * Log an error with structured metadata
   */
  public logError(
    service: string,
    message: string,
    level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' = 'ERROR',
    metadata?: any,
    error?: Error
  ): void {
    const errorLog: DiagnosticLog = {
      id: `${level.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date(),
      service,
      level,
      message,
      traceId: this.generateTraceId(),
      ...(metadata && { metadata }),
      ...(error?.stack && { stackTrace: error.stack }),
      userContext: {
        sessionId: this.sessionId,
        // Add more user context as needed
      },
    };

    this.addLogToStorage(errorLog);

    // Also log to console in development
    if (__DEV__) {
      const logMethod = level === 'ERROR' ? console.error :
                       level === 'WARN' ? console.warn : console.log;
      logMethod(`[${service}] ${message}`, metadata || '');
    }
  }

  /**
   * Get recent logs with optional filtering
   */
  public getRecentLogs(
    limit: number = 50,
    filter?: {
      service?: string;
      level?: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
      since?: Date;
    }
  ): DiagnosticLog[] {
    let logs = this.getLogsFromStorage();

    // Apply filters
    if (filter) {
      logs = logs.filter(log => {
        if (filter.service && log.service !== filter.service) return false;
        if (filter.level && log.level !== filter.level) return false;
        if (filter.since && new Date(log.timestamp) < filter.since) return false;
        return true;
      });
    }

    return logs.slice(0, limit);
  }

  /**
   * Generate anonymized diagnostic report for sharing
   */
  public async generateAnonymizedReport(): Promise<string> {
    const logs = this.getLogsFromStorage();

    // System information (anonymized)
  const oldest = logs.length > 0 ? logs[logs.length - 1] : undefined;
  const newest = logs.length > 0 ? logs[0] : undefined;

  const systemInfo = {
      timestamp: new Date().toISOString(),
      sessionId: this.anonymizeId(this.sessionId),
      appVersion: '1.0.0', // Get from app config
      platform: 'react-native',
      logCount: logs.length,

      // Log statistics
      errorCount: logs.filter(log => log.level === 'ERROR').length,
      warningCount: logs.filter(log => log.level === 'WARN').length,
      infoCount: logs.filter(log => log.level === 'INFO').length,

      // Service breakdown
      services: this.getServiceBreakdown(logs),

      // Time range
      oldestLog: oldest ? oldest.timestamp : null,
      newestLog: newest ? newest.timestamp : null,
    };

    // Anonymize logs
    const anonymizedLogs = logs.slice(0, 30).map(log => ({ // Limit to 30 most recent
      id: this.anonymizeId(log.id),
      timestamp: log.timestamp,
      service: log.service,
      level: log.level,
      message: this.anonymizeMessage(log.message),
      traceId: this.anonymizeId(log.traceId),
      stackTrace: log.stackTrace ? '[STACK_TRACE_REMOVED]' : undefined,
      metadata: this.anonymizeMetadata(log.metadata),
    }));

    return JSON.stringify({
      system: systemInfo,
      logs: anonymizedLogs,
    }, null, 2);
  }

  /**
   * Clear all stored logs
   */
  public clearLogs(): void {
    this.storage.delete('logs');
  }

  /**
   * Get log statistics
   */
  public getLogStatistics(): {
    totalLogs: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    topServices: Array<{ service: string; count: number }>;
    lastHourErrors: number;
  } {
    const logs = this.getLogsFromStorage();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const serviceCounts = logs.reduce((acc, log) => {
      acc[log.service] = (acc[log.service] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topServices = Object.entries(serviceCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([service, count]) => ({ service, count }));

    return {
      totalLogs: logs.length,
      errorCount: logs.filter(log => log.level === 'ERROR').length,
      warningCount: logs.filter(log => log.level === 'WARN').length,
      infoCount: logs.filter(log => log.level === 'INFO').length,
      topServices,
      lastHourErrors: logs.filter(log =>
        log.level === 'ERROR' && new Date(log.timestamp) > oneHourAgo
      ).length,
    };
  }

  // Private methods
  private addLogToStorage(log: DiagnosticLog): void {
    const logs = this.getLogsFromStorage();
    logs.unshift(log);

    // Implement circular buffer - keep only latest logs
    if (logs.length > this.maxLogs) {
      logs.splice(this.maxLogs);
    }

    try {
      this.storage.set('logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to store error log:', error);
    }
  }

  private getLogsFromStorage(): DiagnosticLog[] {
    try {
      const logsJson = this.storage.getString('logs');
      if (!logsJson) return [];

      const logs = JSON.parse(logsJson);
      // Ensure timestamps are Date objects
      return logs.map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp),
      }));
    } catch (error) {
      console.error('Failed to retrieve logs from storage:', error);
      return [];
    }
  }

  private getServiceBreakdown(logs: DiagnosticLog[]): Record<string, number> {
    return logs.reduce((acc, log) => {
      acc[log.service] = (acc[log.service] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  private anonymizeId(id: string): string {
    // Keep the prefix, hash the rest
    if (!id || typeof id !== 'string') return '***INVALID_ID***';
    const parts = id.split('_');
    if (parts.length > 1) {
      const prefix = parts.slice(0, parts.length - 1).join('_');
      const suffix = parts[parts.length - 1] || '';
      return `${prefix}_***${suffix.slice(-4)}`;
    }
    return `***${id.slice(-4)}`;
  }

  private anonymizeMessage(message: string): string {
    return message
      // Email addresses
      .replace(/\b[\w\.-]+@[\w\.-]+\.\w+\b/g, '***EMAIL***')
      // Credit card numbers
      .replace(/\b\d{4}[\s-]\d{4}[\s-]\d{4}[\s-]\d{4}\b/g, '***CARD***')
      // Phone numbers
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '***PHONE***')
      // Bearer tokens
      .replace(/Bearer\s+[\w\.-]+/g, 'Bearer ***TOKEN***')
      // API keys
      .replace(/api[_-]?key[\s:=]+[\w\.-]+/gi, 'api_key=***KEY***')
      // User IDs (assuming they're UUIDs or similar)
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '***USER_ID***')
      // URLs with sensitive params
      .replace(/(https?:\/\/[^\s]+)(token|key|password|secret)=([^&\s]+)/gi, '$1$2=***REDACTED***');
  }

  private anonymizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;

    const sensitiveKeys = [
      'token', 'password', 'key', 'secret', 'auth', 'authorization',
      'email', 'phone', 'ssn', 'credit_card', 'userid', 'user_id',
      'session', 'cookie', 'jwt', 'bearer'
    ];

    const anonymized = { ...metadata };

    const anonymizeValue = (obj: any, key: string): any => {
      if (typeof obj[key] === 'string') {
        return sensitiveKeys.some(sensitive =>
          key.toLowerCase().includes(sensitive)
        ) ? '***REDACTED***' : obj[key];
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        return this.anonymizeMetadata(obj[key]);
      }
      return obj[key];
    };

    for (const key of Object.keys(anonymized)) {
      anonymized[key] = anonymizeValue(anonymized, key);
    }

    return anonymized;
  }
}

export default ErrorReporterService;
