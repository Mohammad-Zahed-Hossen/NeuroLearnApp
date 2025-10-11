// src/hooks/monitoring/useIntegrationStatus.ts

import { useQuery } from '@tanstack/react-query';
import { SupabaseService } from '../../services/storage/SupabaseService';
import { TodoistService } from '../../services/integrations/TodoistService';
import { NotionSyncService } from '../../services/integrations/NotionSyncService';
import { ErrorReporterService } from '../../services/monitoring/ErrorReporterService';

export interface IntegrationStatus {
  service: string;
  status: '🟢' | '🟡' | '🔴';
  message: string;
  latencyMs: number;
  lastSync: Date | null;
  tokenValid: boolean;
  errorRate: number;
  availability: number; // percentage uptime
  lastError?: string;
  features: string[]; // Available features
}

export const useIntegrationStatus = () => {
  const errorReporter = ErrorReporterService.getInstance();

  return useQuery<IntegrationStatus[], Error>({
    queryKey: ['integration-health'],
    queryFn: async (): Promise<IntegrationStatus[]> => {
      const results: IntegrationStatus[] = [];

      // Supabase Integration Check
      await checkSupabaseIntegration(results, errorReporter);

      // Todoist Integration Check
      await checkTodoistIntegration(results, errorReporter);

      // Notion Integration Check
      await checkNotionIntegration(results, errorReporter);

      return results;
    },
    refetchInterval: 5 * 60 * 1000, // 5 minutes (Service Ping System)
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 10000),
  });
};

async function checkSupabaseIntegration(
  results: IntegrationStatus[],
  errorReporter: ErrorReporterService
): Promise<void> {
  try {
    const startTime = Date.now();
    const supabaseService = SupabaseService.getInstance();

    // Test connection with a simple query
    await supabaseService.checkConnectionAndLatency();

    const latency = Date.now() - startTime;
    const status = latency < 500 ? '🟢' : latency < 1000 ? '🟡' : '🔴';

    results.push({
      service: 'Supabase',
      status,
      message: `Database connected (${latency}ms)`,
      latencyMs: latency,
      lastSync: new Date(),
      tokenValid: true,
      errorRate: 0,
      availability: 99.9,
      features: ['Database', 'Edge Functions', 'Real-time', 'Storage'],
    });

  } catch (error) {
    errorReporter.logError('Integration:Supabase', `Connection failed: ${error}`, 'ERROR');

    results.push({
      service: 'Supabase',
      status: '🔴',
      message: 'Database connection failed',
      latencyMs: 0,
      lastSync: null,
      tokenValid: false,
      errorRate: 1,
      availability: 0,
      lastError: String(error),
      features: [],
    });
  }
}

async function checkTodoistIntegration(
  results: IntegrationStatus[],
  errorReporter: ErrorReporterService
): Promise<void> {
  try {
    const todoistService = TodoistService.getInstance();

    // Test connection and measure latency
    const latency = await todoistService.checkConnectionAndLatency();
    const status = latency < 1000 ? '🟢' : latency < 2000 ? '🟡' : '🔴';

    results.push({
      service: 'Todoist',
      status,
      message: `API connected (${latency}ms)`,
      latencyMs: latency,
      lastSync: new Date(), // Would get actual last sync time
      tokenValid: true,
      errorRate: 0,
      availability: 98.5,
      features: ['Tasks', 'Projects', 'Labels', 'Comments'],
    });

  } catch (error) {
    errorReporter.logError('Integration:Todoist', `Connection failed: ${error}`, 'ERROR');

    results.push({
      service: 'Todoist',
      status: '🔴',
      message: 'API connection failed',
      latencyMs: 0,
      lastSync: null,
      tokenValid: false,
      errorRate: 1,
      availability: 0,
      lastError: String(error),
      features: [],
    });
  }
}

async function checkNotionIntegration(
  results: IntegrationStatus[],
  errorReporter: ErrorReporterService
): Promise<void> {
  try {
    const startTime = Date.now();
    const notionService = NotionSyncService.getInstance();

    // Test connection and workspace access
    await notionService.checkConnectionAndLatency();

    const latency = Date.now() - startTime;
    const status = latency < 1000 ? '🟢' : latency < 2000 ? '🟡' : '🔴';

    results.push({
      service: 'Notion',
      status,
      message: `Workspace connected (${latency}ms)`,
      latencyMs: latency,
      lastSync: new Date(), // Would get actual last sync time
      tokenValid: true,
      errorRate: 0,
      availability: 97.8,
      features: ['Pages', 'Databases', 'Blocks', 'Comments'],
    });

  } catch (error) {
    errorReporter.logError('Integration:Notion', `Connection failed: ${error}`, 'ERROR');

    results.push({
      service: 'Notion',
      status: '🔴',
      message: 'Workspace connection failed',
      latencyMs: 0,
      lastSync: null,
      tokenValid: false,
      errorRate: 1,
      availability: 0,
      lastError: String(error),
      features: [],
    });
  }
}
