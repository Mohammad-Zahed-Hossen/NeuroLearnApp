import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Progress from 'react-native-progress';
import { GlassCard } from '../../components/GlassComponents';
import { supabase } from '../../services/storage/SupabaseService';
import { ThemeType } from '../../theme/colors';
import AdvancedGeminiService from '../../services/ai/AdvancedGeminiService';

interface BudgetManagerScreenProps {
  onBack?: () => void;
  theme?: ThemeType;
}

interface Budget {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

interface BudgetWithSpending extends Budget {
  spent: number;
  utilization: number;
  status: 'healthy' | 'warning' | 'critical' | 'over_budget';
}

const BudgetManagerScreen: React.FC<BudgetManagerScreenProps> = ({
  onBack,
}) => {
  const [budgets, setBudgets] = useState<BudgetWithSpending[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBudget, setNewBudget] = useState({ category: '', amount: '' });

  // AI Analytics state
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);

  const categories = [
    'food',
    'transport',
    'education',
    'health',
    'entertainment',
    'shopping',
  ];

  // Category icons and colors mapping
  const categoryConfig = {
    food: { icon: 'food', color: '#F59E0B', bgColor: '#FEF3C7' },
    transport: { icon: 'car', color: '#10B981', bgColor: '#D1FAE5' },
    education: { icon: 'school', color: '#8B5CF6', bgColor: '#EDE9FE' },
    health: { icon: 'medical-bag', color: '#EF4444', bgColor: '#FEE2E2' },
    entertainment: { icon: 'movie', color: '#06B6D4', bgColor: '#CFFAFE' },
    shopping: { icon: 'shopping', color: '#EC4899', bgColor: '#FCE7F3' },
  };

  useEffect(() => {
    loadBudgets();
  }, []);

  useEffect(() => {
    if (budgets.length > 0) {
      loadAIInsights();
    }
  }, [budgets]);

  const loadBudgets = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Load budgets
      const { data: budgetsData, error: budgetsError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (budgetsError) throw budgetsError;

      // Calculate spending for each budget
      const budgetsWithSpending = await Promise.all(
        (budgetsData || []).map(async (budget) => {
          const { data: transactions, error: txError } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', user.id)
            .eq('category', budget.category)
            .eq('type', 'expense')
            .gte('date', budget.start_date)
            .lte('date', budget.end_date);

          if (txError) {
            console.error('Error loading transactions:', txError);
            return { ...budget, spent: 0, utilization: 0, status: 'healthy' as const };
          }

          const spent = transactions?.reduce((sum, tx) => sum + tx.amount, 0) || 0;
          const utilization = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

          let status: 'healthy' | 'warning' | 'critical' | 'over_budget';
          if (spent > budget.amount) {
            status = 'over_budget';
          } else if (utilization >= 90) {
            status = 'critical';
          } else if (utilization >= 70) {
            status = 'warning';
          } else {
            status = 'healthy';
          }

          return { ...budget, spent, utilization, status };
        })
      );

      setBudgets(budgetsWithSpending);
    } catch (error) {
      console.error('Error loading budgets:', error);
    }
  };

  const addBudget = async () => {
    if (!newBudget.category || !newBudget.amount) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('budgets').insert({
        user_id: user.id,
        category: newBudget.category,
        amount: parseFloat(newBudget.amount),
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        is_active: true,
      });

      if (error) throw error;

      setNewBudget({ category: '', amount: '' });
      setShowAddForm(false);
      loadBudgets();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const deleteBudget = async (budgetId: string) => {
    try {
      const { error } = await supabase
        .from('budgets')
        .update({ is_active: false })
        .eq('id', budgetId);

      if (error) throw error;
      loadBudgets();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const loadAIInsights = async () => {
    if (budgets.length === 0) return;

    setLoadingAI(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const geminiService = AdvancedGeminiService.getInstance();

      // Generate financial forecast for the most spent category
      const topCategory = budgets.reduce((prev, current) =>
        prev.spent > current.spent ? prev : current
      );

      const forecast = await geminiService.generateFinancialForecast(user.id, topCategory.category);

      // Get holistic summary for budget insights
      const holisticSummary = await geminiService.getHolisticSummary(user.id);

      setForecastData(forecast.forecast);
      setAiInsights([
        ...holisticSummary.insights.filter(insight =>
          insight.toLowerCase().includes('budget') ||
          insight.toLowerCase().includes('spend') ||
          insight.toLowerCase().includes('finance')
        ),
        ...forecast.alerts
      ]);
    } catch (error) {
      console.error('Error loading AI insights:', error);
    } finally {
      setLoadingAI(false);
    }
  };

  // Calculate overview stats
  const overviewStats = budgets.reduce(
    (acc, budget) => ({
      totalBudget: acc.totalBudget + budget.amount,
      totalSpent: acc.totalSpent + budget.spent,
      healthyCount: acc.healthyCount + (budget.status === 'healthy' ? 1 : 0),
      warningCount: acc.warningCount + (budget.status === 'warning' ? 1 : 0),
      criticalCount: acc.criticalCount + (budget.status === 'critical' ? 1 : 0),
      overBudgetCount: acc.overBudgetCount + (budget.status === 'over_budget' ? 1 : 0),
    }),
    {
      totalBudget: 0,
      totalSpent: 0,
      healthyCount: 0,
      warningCount: 0,
      criticalCount: 0,
      overBudgetCount: 0,
    }
  );

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#10B981';
      case 'warning': return '#F59E0B';
      case 'critical': return '#EF4444';
      case 'over_budget': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return 'check-circle';
      case 'warning': return 'alert-circle';
      case 'critical': return 'alert';
      case 'over_budget': return 'alert-circle-outline';
      default: return 'circle';
    }
  };

  return (
    <LinearGradient
      colors={['#DBEAFE', '#FAF5FF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 48 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => onBack?.()}
              style={{ marginRight: 16 }}
            >
              <Icon name="arrow-left" size={24} color="#374151" />
            </TouchableOpacity>
            <Text
              style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}
            >
              Budget Manager
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowAddForm(!showAddForm)}
            style={{ backgroundColor: '#6366F1', padding: 8, borderRadius: 20 }}
          >
            <Icon name="plus" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Overview Summary Card */}
        {budgets.length > 0 && (
          <GlassCard theme="dark" style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Icon name="chart-pie" size={24} color="#6366F1" />
              <Text style={{ fontSize: 18, fontWeight: '600', marginLeft: 8 }}>
                Budget Overview
              </Text>
            </View>

            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: '#6B7280' }}>Total Budget</Text>
                <Text style={{ fontWeight: '600' }}>৳{overviewStats.totalBudget.toLocaleString()}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: '#6B7280' }}>Total Spent</Text>
                <Text style={{ fontWeight: '600' }}>৳{overviewStats.totalSpent.toLocaleString()}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#6B7280' }}>Remaining</Text>
                <Text style={{ fontWeight: '600', color: overviewStats.totalSpent > overviewStats.totalBudget ? '#EF4444' : '#10B981' }}>
                  ৳{(overviewStats.totalBudget - overviewStats.totalSpent).toLocaleString()}
                </Text>
              </View>
            </View>

            <Progress.Bar
              progress={Math.min(overviewStats.totalSpent / overviewStats.totalBudget, 1)}
              width={null}
              height={8}
              color={overviewStats.totalSpent > overviewStats.totalBudget ? '#EF4444' : '#10B981'}
              unfilledColor="#E5E7EB"
              borderRadius={4}
              style={{ marginBottom: 16 }}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>
                {Math.round((overviewStats.totalSpent / overviewStats.totalBudget) * 100)}% used
              </Text>
              <View style={{ flexDirection: 'row' }}>
                {overviewStats.healthyCount > 0 && (
                  <Text style={{ fontSize: 12, color: '#10B981', marginRight: 8 }}>
                    {overviewStats.healthyCount} on track
                  </Text>
                )}
                {(overviewStats.warningCount + overviewStats.criticalCount + overviewStats.overBudgetCount) > 0 && (
                  <Text style={{ fontSize: 12, color: '#F59E0B' }}>
                    {(overviewStats.warningCount + overviewStats.criticalCount + overviewStats.overBudgetCount)} need attention
                  </Text>
                )}
              </View>
            </View>
          </GlassCard>
        )}

        {showAddForm && (
          <GlassCard theme="dark" style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16 }}>
              Add New Budget
            </Text>

            <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8 }}>
              Category
            </Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                marginBottom: 16,
              }}
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setNewBudget({ ...newBudget, category: cat })}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    marginRight: 8,
                    marginBottom: 8,
                    backgroundColor:
                      newBudget.category === cat ? categoryConfig[cat as keyof typeof categoryConfig].color : '#E5E7EB',
                  }}
                >
                  <Icon
                    name={categoryConfig[cat as keyof typeof categoryConfig].icon}
                    size={16}
                    color={newBudget.category === cat ? 'white' : '#374151'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={{
                      textTransform: 'capitalize',
                      color: newBudget.category === cat ? 'white' : '#374151',
                    }}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8 }}>
              Monthly Limit
            </Text>
            <TextInput
              value={newBudget.amount}
              onChangeText={(text) =>
                setNewBudget({ ...newBudget, amount: text })
              }
              placeholder="Enter amount"
              keyboardType="numeric"
              style={{
                backgroundColor: 'rgba(255,255,255,0.5)',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
              }}
            />

            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                onPress={addBudget}
                style={{
                  flex: 1,
                  backgroundColor: '#6366F1',
                  paddingVertical: 12,
                  borderRadius: 12,
                  marginRight: 16,
                }}
              >
                <Text
                  style={{
                    textAlign: 'center',
                    color: 'white',
                    fontWeight: '600',
                  }}
                >
                  Add Budget
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowAddForm(false)}
                style={{
                  flex: 1,
                  backgroundColor: '#D1D5DB',
                  paddingVertical: 12,
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    textAlign: 'center',
                    color: '#374151',
                    fontWeight: '600',
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        )}

        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16 }}>
          Active Budgets
        </Text>

        {budgets.map((budget) => {
          const config = categoryConfig[budget.category as keyof typeof categoryConfig] || categoryConfig.food;
          const remaining = Math.max(0, budget.amount - budget.spent);

          return (
            <GlassCard key={budget.id} theme="dark" style={{ marginBottom: 16 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: config.bgColor,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    <Icon name={config.icon} size={20} color={config.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: '600',
                        textTransform: 'capitalize',
                      }}
                    >
                      {budget.category}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>
                      Monthly limit
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => deleteBudget(budget.id)}
                  style={{
                    backgroundColor: '#FEF2F2',
                    padding: 8,
                    borderRadius: 20,
                  }}
                >
                  <Icon name="delete" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: config.color }}>
                  ৳{budget.spent.toLocaleString()}
                </Text>
                <Text style={{ fontSize: 14, color: '#6B7280' }}>
                  of ৳{budget.amount.toLocaleString()} limit
                </Text>
              </View>

              <Progress.Bar
                progress={Math.min(budget.utilization / 100, 1)}
                width={null}
                height={8}
                color={getProgressColor(budget.status)}
                unfilledColor="#E5E7EB"
                borderRadius={4}
                style={{ marginBottom: 12 }}
              />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon
                    name={getStatusIcon(budget.status)}
                    size={16}
                    color={getProgressColor(budget.status)}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={{ fontSize: 12, color: '#6B7280' }}>
                    {Math.round(budget.utilization)}% used
                  </Text>
                </View>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: remaining > 0 ? '#10B981' : '#EF4444'
                }}>
                  ৳{remaining.toLocaleString()} left
                </Text>
              </View>
            </GlassCard>
          );
        })}

        {/* AI Insights Section */}
        {aiInsights.length > 0 && (
          <GlassCard theme="dark" style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Icon name="brain" size={24} color="#8B5CF6" />
              <Text style={{ fontSize: 18, fontWeight: '600', marginLeft: 8 }}>
                AI Insights
              </Text>
              {loadingAI && (
                <Icon name="loading" size={20} color="#8B5CF6" style={{ marginLeft: 'auto' }} />
              )}
            </View>

            {aiInsights.map((insight, index) => (
              <View key={index} style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 14, color: '#6B7280', lineHeight: 20 }}>
                  • {insight}
                </Text>
              </View>
            ))}
          </GlassCard>
        )}

        {/* Financial Forecast Section */}
        {forecastData.length > 0 && (
          <GlassCard theme="dark" style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Icon name="trending-up" size={24} color="#06B6D4" />
              <Text style={{ fontSize: 18, fontWeight: '600', marginLeft: 8 }}>
                Financial Forecast
              </Text>
            </View>

            {forecastData.slice(0, 3).map((forecast, index) => (
              <View key={index} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '600' }}>
                    {forecast.category || 'Overall'}
                  </Text>
                  <Text style={{ fontSize: 14, color: forecast.predicted > 0 ? '#10B981' : '#EF4444' }}>
                    ৳{Math.abs(forecast.predicted).toLocaleString()}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>
                  {forecast.period || 'Next month'}
                </Text>
              </View>
            ))}
          </GlassCard>
        )}

        {budgets.length === 0 && (
          <GlassCard theme="dark">
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Icon name="wallet-outline" size={48} color="#9CA3AF" />
              <Text
                style={{ color: '#9CA3AF', marginTop: 16, textAlign: 'center', marginBottom: 16 }}
              >
                No budgets set yet. Start tracking your expenses by creating your first budget.
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddForm(true)}
                style={{
                  backgroundColor: '#6366F1',
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>
                  Set Your First Budget
                </Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        )}
      </ScrollView>
    </LinearGradient>
  );
};

export default BudgetManagerScreen;
