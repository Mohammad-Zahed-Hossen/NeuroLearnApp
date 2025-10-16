import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  type: 'income' | 'expense';
  date: string;
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
}

export interface FinanceSummary {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  budgetUtilization: number;
}

export interface OptimizedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryFn'> {
  queryFn: () => Promise<T>;
  batchQueries?: Array<{
    key: string[];
    queryFn: () => Promise<any>;
  }>;
}

// Debounced refetch hook to prevent rapid successive refreshes
export const useDebouncedRefetch = (refetchFn: () => Promise<any>, delay: number = 300) => {
  const timeoutRef = useRef<number | undefined>(undefined);

  return useCallback(() => {
    if (timeoutRef.current !== undefined) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      refetchFn();
    }, delay) as unknown as number;
  }, [refetchFn, delay]);
};

export const useOptimizedQuery = <T = unknown>({
  queryKey,
  queryFn,
  batchQueries,
  ...options
}: OptimizedQueryOptions<T>) => {
  // If batch queries are provided, execute them in parallel
  const batchQueryFn = async (): Promise<T> => {
    if (batchQueries && batchQueries.length > 0) {
      const results = await Promise.all([
        queryFn(),
        ...batchQueries.map(q => q.queryFn())
      ]);
      return results[0] as T; // Return the main query result
    }
    return queryFn();
  };

  return useQuery({
    queryKey,
    queryFn: batchQueryFn,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    dedupingInterval: 2000, // dedupe identical queries for 2s to avoid thundering
    retry: 2,
    retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 30000),
    ...options,
  } as any);
};

// Specialized hook for finance data with parallel fetching
export const useFinanceData = (userId?: string) => {
  return useOptimizedQuery({
    queryKey: ['finance-data', userId],
    queryFn: async () => {
  // Metro bundler resolves TS/TSX modules without .js; Node's nodenext tsconfig may require .js extension.
  // We keep the extension-free import for Metro and silence TS's node resolution check.
  // @ts-ignore
  const { supabase } = await import('../services/storage/SupabaseService');
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return {
          summary: { totalBalance: 0, monthlyIncome: 0, monthlyExpenses: 0, budgetUtilization: 0 },
          recentTransactions: [],
          budgets: [],
        };
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0];

      const [transactionsRes, budgetsRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', startOfMonth)
          .lte('date', endOfMonth)
          .order('date', { ascending: false }),
        supabase
          .from('budgets')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true),
      ]);

      const transactions = transactionsRes.data || [];
      const budgetsData = budgetsRes.data || [];

      const monthlyIncome =
        transactions?.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0) || 0;

      const monthlyExpenses =
        transactions?.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0) || 0;

      const totalBalance = monthlyIncome - monthlyExpenses;

      const totalBudget = budgetsData?.reduce((s: number, b: any) => s + b.amount, 0) || 0;
      const budgetUtilization = totalBudget > 0 ? (monthlyExpenses / totalBudget) * 100 : 0;

      const summary = {
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        budgetUtilization: Math.min(100, budgetUtilization),
      };

      return {
        summary,
        recentTransactions: transactions?.slice(0, 5) || [],
        budgets: budgetsData || [],
      };
    },
    enabled: !!userId,
  });
};

// Specialized hook for tasks data with consolidated Todoist and local tasks
export const useTasksData = (userId?: string) => {
  return useOptimizedQuery({
    queryKey: ['tasks-data', userId],
    queryFn: async () => {
  // @ts-ignore
  const { StorageService } = await import('../services/storage/StorageService');
  // @ts-ignore
  const { TodoistService } = await import('../services/integrations/TodoistService');

      const storage = StorageService.getInstance();
      const todoistService = TodoistService.getInstance();

      // Parallel fetch for local tasks and Todoist tasks
      const [localTasks, todoistTasks] = await Promise.all([
        storage.getTasks(),
        (async () => {
          try {
            const settings = await storage.getSettings();
            if (settings.todoistToken) {
              todoistService.setApiToken(settings.todoistToken);
              return await todoistService.getTasks();
            }
            return [];
          } catch (error) {
            console.error('Error fetching Todoist tasks:', error);
            return [];
          }
        })(),
      ]);

      return {
        localTasks,
        todoistTasks,
      };
    },
    enabled: !!userId,
  });
};

// Specialized hook for wellness data
export const useWellnessData = (userId: string) => {
  return useOptimizedQuery({
    queryKey: ['wellness-data', userId],
    queryFn: async () => {
      return {
        sleep: [],
        workout: [],
        water: []
      };
    },
    batchQueries: [
      {
        key: ['wellness-sleep', userId],
        queryFn: async () => [],
      },
      {
        key: ['wellness-workout', userId],
        queryFn: async () => [],
      },
      {
        key: ['wellness-water', userId],
        queryFn: async () => [],
      }
    ]
  });
};
