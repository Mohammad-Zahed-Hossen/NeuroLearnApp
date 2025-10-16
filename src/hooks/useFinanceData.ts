import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/storage/SupabaseService';

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
export const useFinanceData = () => {
  return useQuery({
    queryKey: ['finance-data'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let transactions: Transaction[] = [];
      let budgetsData: Budget[] = [];

      if (user) {
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

        // transactionsRes may be { data, error }
        if (transactionsRes && !transactionsRes.error && (transactionsRes as any).data) {
          transactions = (transactionsRes as any).data;
        }

        if (budgetsRes && !budgetsRes.error && (budgetsRes as any).data) {
          budgetsData = (budgetsRes as any).data;
        }
      }

      const monthlyIncome =
        transactions?.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0) || 0;

      const monthlyExpenses =
        transactions?.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0) || 0;

      const totalBalance = monthlyIncome - monthlyExpenses;

      const totalBudget = budgetsData?.reduce((s, b) => s + b.amount, 0) || 0;
      const budgetUtilization = totalBudget > 0 ? (monthlyExpenses / totalBudget) * 100 : 0;

      const summary: FinanceSummary = {
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
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};
