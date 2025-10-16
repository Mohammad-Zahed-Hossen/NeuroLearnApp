import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { GlassCard } from '../../components/GlassComponents';
import { useOptimizedQuery } from '../../hooks/useOptimizedQuery';
import type {
  Transaction,
  Budget,
  FinanceSummary,
} from '../../hooks/useOptimizedQuery';
import DashboardSkeleton from '../../components/skeletons/DashboardSkeleton';
import { useDebouncedRefetch } from '../../hooks/useOptimizedQuery';

const FinanceDashboardScreen = ({
  onNavigate,
  theme = 'dark',
}: {
  onNavigate: (screen: string) => void;
  theme?: 'light' | 'dark';
}) => {
  console.log('FinanceDashboardScreen onNavigate:', onNavigate); // Debug log

  const [refreshing, setRefreshing] = useState(false);

  // Use optimized query directly for finance data
  const { data, isLoading, refetch } = useOptimizedQuery<{
    summary: FinanceSummary;
    recentTransactions: Transaction[];
    budgets: Budget[];
  }>({
    queryKey: ['finance-data'],
    queryFn: async () => {
      // Import Supabase service (bundler mode resolves .ts without extension)
      const { supabase } = await import(
        '../../services/storage/SupabaseService'
      );
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return {
          summary: {
            totalBalance: 0,
            monthlyIncome: 0,
            monthlyExpenses: 0,
            budgetUtilization: 0,
          },
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
        transactions
          ?.filter((t: any) => t.type === 'income')
          .reduce((s: number, t: any) => s + t.amount, 0) || 0;

      const monthlyExpenses =
        transactions
          ?.filter((t: any) => t.type === 'expense')
          .reduce((s: number, t: any) => s + t.amount, 0) || 0;

      const totalBalance = monthlyIncome - monthlyExpenses;

      const totalBudget =
        budgetsData?.reduce((s: number, b: any) => s + b.amount, 0) || 0;
      const budgetUtilization =
        totalBudget > 0 ? (monthlyExpenses / totalBudget) * 100 : 0;

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
  });
  // Performance instrumentation (optional, guarded so tests won't fail)
  const mountMarkRef = useRef<string | null>(null);
  useEffect(() => {
    try {
      if (typeof performance !== 'undefined' && performance.mark) {
        const mark = `FinanceDashboard:mount:${Date.now()}`;
        performance.mark(mark);
        mountMarkRef.current = mark;
      }
    } catch (e) {
      // performance API not available in some test envs
    }
  }, []);

  useEffect(() => {
    try {
      if (
        mountMarkRef.current &&
        typeof performance !== 'undefined' &&
        performance.measure
      ) {
        // when data becomes ready, measure from mount mark to ready
        if (!isLoading) {
          const measureName = `FinanceDashboard:ready:${Date.now()}`;
          performance.measure(measureName, mountMarkRef.current);
          // Optionally log a small, parseable message for quick collection
          // eslint-disable-next-line no-console
          console.log(
            '[perf]',
            measureName,
            performance.getEntriesByName(measureName).pop(),
          );
        }
      }
    } catch (e) {
      // ignore
    }
  }, [isLoading]);

  // Ensure TS knows the shape when using optional chaining elsewhere
  const typedData = data as
    | {
        summary: FinanceSummary;
        recentTransactions: Transaction[];
        budgets: Budget[];
      }
    | undefined;

  const summary: FinanceSummary = typedData?.summary ?? {
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    budgetUtilization: 0,
  };

  const recentTransactions: Transaction[] = typedData?.recentTransactions ?? [];
  const budgets: Budget[] = typedData?.budgets ?? [];

  const onRefreshInternal = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // debounce the refresh to avoid multiple rapid refreshes
  const onRefresh = useDebouncedRefetch(onRefreshInternal, 350);

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      food: 'food',
      transport: 'car',
      education: 'school',
      health: 'medical-bag',
      entertainment: 'movie',
      shopping: 'shopping',
      income: 'cash-plus',
    };
    return icons[category] || 'cash';
  };

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString()}`;
  };

  // Memoize heavy child components
  const TransactionList = useMemo(() => {
    const Inner: React.FC = () => (
      <>
        {recentTransactions.length > 0 ? (
          recentTransactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionItem}>
              <View style={styles.transactionLeft}>
                <View
                  style={[
                    styles.transactionIcon,
                    {
                      backgroundColor:
                        transaction.type === 'income'
                          ? '#10B98120'
                          : '#EF444420',
                    },
                  ]}
                >
                  <Icon
                    name={getCategoryIcon(transaction.category)}
                    size={18}
                    color={
                      transaction.type === 'income' ? '#10B981' : '#EF4444'
                    }
                  />
                </View>
                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionDescription}>
                    {transaction.description || transaction.category}
                  </Text>
                  <Text style={styles.transactionMeta}>
                    {transaction.category} •{' '}
                    {new Date(transaction.date).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.transactionAmount,
                  {
                    color:
                      transaction.type === 'income' ? '#10B981' : '#EF4444',
                  },
                ]}
              >
                {transaction.type === 'income' ? '+' : '-'}
                {formatCurrency(transaction.amount)}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Icon name="receipt-outline" size={32} color="#9CA3AF" />
            <Text style={styles.emptyText}>
              No transactions yet. Add your first transaction to get started.
            </Text>
          </View>
        )}
      </>
    );

    return React.memo(Inner);
  }, [recentTransactions]);

  const BudgetChart = useMemo(() => {
    const Inner: React.FC = () => (
      <>
        {budgets.length > 0 && (
          <GlassCard theme="dark" style={styles.budgetCard}>
            <View style={styles.budgetHeader}>
              <Text style={styles.cardTitle}>Budget Status</Text>
              <TouchableOpacity onPress={() => onNavigate('budget-manager')}>
                <Text style={styles.manageText}>Manage</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.progressRow}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${summary.budgetUtilization}%`,
                      backgroundColor:
                        summary.budgetUtilization > 90
                          ? '#EF4444'
                          : summary.budgetUtilization > 70
                          ? '#F59E0B'
                          : '#10B981',
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(summary.budgetUtilization)}%
              </Text>
            </View>
            <Text style={styles.budgetStatus}>
              {summary.budgetUtilization > 100
                ? 'Over budget'
                : 'Within budget'}
            </Text>
          </GlassCard>
        )}
      </>
    );

    return React.memo(Inner);
  }, [budgets, summary]);

  if (isLoading) {
    return <DashboardSkeleton variant="finance" theme={theme} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Finance Dashboard</Text>
          <TouchableOpacity
            onPress={() => onNavigate('add-transaction')}
            style={styles.addButton}
          >
            <Icon name="plus" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={styles.summarySection}>
          <GlassCard theme="dark" style={styles.balanceCard}>
            <View style={styles.balanceRow}>
              <View>
                <Text style={styles.balanceLabel}>Total Balance</Text>
                <Text
                  style={[
                    styles.balanceAmount,
                    {
                      color: summary.totalBalance >= 0 ? '#10B981' : '#EF4444',
                    },
                  ]}
                >
                  {formatCurrency(summary.totalBalance)}
                </Text>
              </View>
              <View style={styles.balanceIcon}>
                <Icon name="wallet" size={24} color="#3B82F6" />
              </View>
            </View>
          </GlassCard>

          <View style={styles.incomeExpenseRow}>
            <GlassCard theme="dark" style={styles.incomeCard}>
              <View style={styles.metricCenter}>
                <Icon name="trending-up" size={24} color="#10B981" />
                <Text style={styles.metricLabel}>Income</Text>
                <Text style={styles.incomeAmount}>
                  {formatCurrency(summary.monthlyIncome)}
                </Text>
              </View>
            </GlassCard>

            <GlassCard theme="dark" style={styles.expenseCard}>
              <View style={styles.metricCenter}>
                <Icon name="trending-down" size={24} color="#EF4444" />
                <Text style={styles.metricLabel}>Expenses</Text>
                <Text style={styles.expenseAmount}>
                  {formatCurrency(summary.monthlyExpenses)}
                </Text>
              </View>
            </GlassCard>
          </View>
        </View>

        {/* Budget Status */}
        {budgets.length > 0 && (
          <GlassCard theme="dark" style={styles.budgetCard}>
            <View style={styles.budgetHeader}>
              <Text style={styles.cardTitle}>Budget Status</Text>
              <TouchableOpacity onPress={() => onNavigate('budget-manager')}>
                <Text style={styles.manageText}>Manage</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.progressRow}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${summary.budgetUtilization}%`,
                      backgroundColor:
                        summary.budgetUtilization > 90
                          ? '#EF4444'
                          : summary.budgetUtilization > 70
                          ? '#F59E0B'
                          : '#10B981',
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(summary.budgetUtilization)}%
              </Text>
            </View>
            <Text style={styles.budgetStatus}>
              {summary.budgetUtilization > 100
                ? 'Over budget'
                : 'Within budget'}
            </Text>
          </GlassCard>
        )}

        {/* Recent Transactions */}
        <GlassCard theme="dark" style={styles.transactionsCard}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.cardTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => onNavigate('transaction-history')}>
              <Text style={styles.manageText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentTransactions.length > 0 ? (
            recentTransactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionItem}>
                <View style={styles.transactionLeft}>
                  <View
                    style={[
                      styles.transactionIcon,
                      {
                        backgroundColor:
                          transaction.type === 'income'
                            ? '#10B98120'
                            : '#EF444420',
                      },
                    ]}
                  >
                    <Icon
                      name={getCategoryIcon(transaction.category)}
                      size={18}
                      color={
                        transaction.type === 'income' ? '#10B981' : '#EF4444'
                      }
                    />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionDescription}>
                      {transaction.description || transaction.category}
                    </Text>
                    <Text style={styles.transactionMeta}>
                      {transaction.category} •{' '}
                      {new Date(transaction.date).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.transactionAmount,
                    {
                      color:
                        transaction.type === 'income' ? '#10B981' : '#EF4444',
                    },
                  ]}
                >
                  {transaction.type === 'income' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Icon name="receipt-outline" size={32} color="#9CA3AF" />
              <Text style={styles.emptyText}>
                No transactions yet. Add your first transaction to get started.
              </Text>
            </View>
          )}
        </GlassCard>

        {/* Quick Actions */}
        <GlassCard theme="dark" style={styles.actionsCard}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              onPress={() => onNavigate('add-transaction')}
              style={styles.actionButton}
            >
              <View style={styles.actionContent}>
                <Icon name="plus-circle" size={24} color="#3B82F6" />
                <Text style={styles.actionText}>Add Transaction</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onNavigate('budget-manager')}
              style={styles.actionButton}
            >
              <View style={styles.actionContent}>
                <Icon name="wallet" size={24} color="#10B981" />
                <Text style={styles.actionText}>Manage Budget</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onNavigate('transaction-history')}
              style={styles.actionButton}
            >
              <View style={styles.actionContent}>
                <Icon name="history" size={24} color="#8B5CF6" />
                <Text style={styles.actionText}>View History</Text>
              </View>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'linear-gradient(135deg, #E0F2FE 0%, #F3E8FF 100%)',
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding to ensure content isn't hidden behind TabBar/FAB
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: 'linear-gradient(135deg, #E0F2FE 0%, #F3E8FF 100%)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 16,
    marginTop: 16,
  },
  content: {
    padding: 16,
    paddingTop: 48,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E40AF',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  addButton: {
    backgroundColor: '#2D3BE3',
    padding: 12,
    borderRadius: 24,
  },
  summarySection: {
    marginBottom: 24,
  },
  balanceCard: {
    marginBottom: 16,
    padding: 20,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  balanceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  incomeExpenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  incomeCard: {
    flex: 1,
    marginRight: 8,
    padding: 16,
  },
  expenseCard: {
    flex: 1,
    marginLeft: 8,
    padding: 16,
  },
  metricCenter: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 4,
  },
  incomeAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  budgetCard: {
    marginBottom: 24,
    padding: 20,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  manageText: {
    color: '#2D3BE3',
    fontWeight: '500',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  budgetStatus: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  transactionsCard: {
    marginBottom: 24,
    padding: 20,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  transactionMeta: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'capitalize',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  actionsCard: {
    padding: 20,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    width: '48%',
    marginBottom: 12,
  },
  actionContent: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginTop: 8,
  },
});

export default FinanceDashboardScreen;
