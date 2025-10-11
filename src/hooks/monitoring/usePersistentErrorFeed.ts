// src/hooks/monitoring/usePersistentErrorFeed.ts

import { useQuery } from '@tanstack/react-query';
import { ErrorReporterService } from '../../services/monitoring/ErrorReporterService';

interface DiagnosticLog {
  level: string;
  service: string;
  timestamp: Date;
  message?: string;
}

export interface ErrorFeedData {
  logs: DiagnosticLog[];
  totalCount: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  lastHourErrors: number;
  criticalErrors: DiagnosticLog[];
  topErrorServices: string[];
}

export const usePersistentErrorFeed = () => {
  const errorReporter = ErrorReporterService.getInstance();

  return useQuery<ErrorFeedData, Error>({
    queryKey: ['diagnostic-logs'],
    queryFn: async (): Promise<ErrorFeedData> => {
      try {
        const logs = errorReporter.getRecentLogs(50);

        // Calculate statistics
        const errorCount = logs.filter(log => log.level === 'ERROR').length;
        const warningCount = logs.filter(log => log.level === 'WARN').length;
        const infoCount = logs.filter(log => log.level === 'INFO').length;

        // Calculate errors in the last hour
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        const lastHourErrors = logs.filter(log =>
          log.level === 'ERROR' && new Date(log.timestamp).getTime() > oneHourAgo
        ).length;

        // Find critical errors (multiple errors from same service in short time)
        const criticalErrors = findCriticalErrors(logs);

        // Get top error-producing services
        const serviceErrorCounts = logs
          .filter(log => log.level === 'ERROR')
          .reduce((acc, log) => {
            acc[log.service] = (acc[log.service] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

        const topErrorServices = Object.entries(serviceErrorCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([service]) => service);

        return {
          logs,
          totalCount: logs.length,
          errorCount,
          warningCount,
          infoCount,
          lastHourErrors,
          criticalErrors,
          topErrorServices,
        };

      } catch (error) {
        console.error('Failed to load diagnostic logs:', error);

        return {
          logs: [],
          totalCount: 0,
          errorCount: 0,
          warningCount: 0,
          infoCount: 0,
          lastHourErrors: 0,
          criticalErrors: [],
          topErrorServices: [],
        };
      }
    },
    refetchInterval: 10000, // 10 seconds
    staleTime: 5000, // 5 seconds
    gcTime: 60000, // 1 minute
    retry: 2,
  });
};

function findCriticalErrors(logs: DiagnosticLog[]): DiagnosticLog[] {
  const criticalThreshold = 3; // 3 errors from same service in 10 minutes = critical
  const timeWindow = 10 * 60 * 1000; // 10 minutes

  const recentErrors = logs.filter(log =>
    log.level === 'ERROR' &&
    Date.now() - new Date(log.timestamp).getTime() < timeWindow
  );

  const serviceCounts = recentErrors.reduce((acc, log) => {
    acc[log.service] = (acc[log.service] || []).concat(log);
    return acc;
  }, {} as Record<string, DiagnosticLog[]>);

  const criticalServices = Object.entries(serviceCounts)
    .filter(([, errors]) => errors.length >= criticalThreshold)
    .map(([, errors]) => errors)
    .flat();

  return criticalServices;
}
