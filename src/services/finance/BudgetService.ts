import { supabase } from '../storage/SupabaseService';
import StorageService from '../storage/StorageService';

interface BudgetCategory {
  id: string;
  name: string;
  limit: number;
  spent: number;
  remaining: number;
  percentage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  forecast: number;
}

interface BudgetAnalysis {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  overBudgetCategories: string[];
  riskCategories: string[];
  savingsRate: number;
  burnRate: number;
  projectedEndOfMonth: number;
}

interface ETSForecast {
  category: string;
  nextMonthPrediction: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  seasonality: number;
}

/**
 * Enhanced Budget Service with ETS (Exponential Smoothing) Algorithm
 * Provides intelligent budget analysis and forecasting
 */
export class BudgetService {
  private static instance: BudgetService;
  private hybridStorage: StorageService;

  static getInstance(): BudgetService {
    if (!BudgetService.instance) {
      BudgetService.instance = new BudgetService();
    }
    return BudgetService.instance;
  }

  private constructor() {
  this.hybridStorage = StorageService.getInstance();
  }

  /**
   * Get comprehensive budget analysis with ETS forecasting
   */
  async getBudgetAnalysis(userId: string): Promise<{
    categories: BudgetCategory[];
    analysis: BudgetAnalysis;
    forecasts: ETSForecast[];
    recommendations: string[];
  }> {
    try {
      const [budgets, transactions] = await Promise.all([
        this.getBudgetCategories(userId),
        this.getRecentTransactions(userId, 90) // 3 months for ETS
      ]);

      const categories = await this.calculateCategorySpending(budgets, transactions);
      const analysis = this.performBudgetAnalysis(categories, transactions);
      const forecasts = await this.generateETSForecasts(userId, transactions);
      const recommendations = this.generateSmartRecommendations(analysis, forecasts);

      return { categories, analysis, forecasts, recommendations };
    } catch (error) {
      console.error('Error in budget analysis:', error);
      throw error;
    }
  }

  /**
   * ETS (Exponential Smoothing) Algorithm for spending forecasting
   */
  private async generateETSForecasts(userId: string, transactions: any[]): Promise<ETSForecast[]> {
    const categorySpending = this.groupTransactionsByCategory(transactions);
    const forecasts: ETSForecast[] = [];

    for (const [category, categoryTransactions] of Object.entries(categorySpending)) {
      const monthlySpending = this.aggregateMonthlySpending(categoryTransactions as any[]);

      if (monthlySpending.length >= 3) { // Need at least 3 months for ETS
        const forecast = this.calculateETSForecast(monthlySpending);
        forecasts.push({
          category,
          nextMonthPrediction: forecast.prediction,
          confidence: forecast.confidence,
          trend: forecast.trend,
          seasonality: forecast.seasonality
        });
      }
    }

    return forecasts;
  }

  /**
   * ETS Triple Exponential Smoothing Implementation
   */
  private calculateETSForecast(monthlyData: number[]): {
    prediction: number;
    confidence: number;
    trend: 'up' | 'down' | 'stable';
    seasonality: number;
  } {
    const alpha = 0.3; // Level smoothing
    const beta = 0.2;  // Trend smoothing
    const gamma = 0.1; // Seasonality smoothing

    if (monthlyData.length < 3) {
      return {
        prediction: monthlyData[monthlyData.length - 1] || 0,
        confidence: 0.3,
        trend: 'stable',
        seasonality: 0
      };
    }

    // Initialize components
    let level = monthlyData[0];
    let trend = monthlyData.length > 1 ? monthlyData[1] - monthlyData[0] : 0;
    const seasonalPeriod = Math.min(12, monthlyData.length);
    const seasonal: number[] = new Array(seasonalPeriod).fill(1);

    // ETS calculations
    for (let i = 1; i < monthlyData.length; i++) {
      const seasonalIndex = i % seasonalPeriod;
      const prevLevel = level;
      const prevTrend = trend;

      // Update level
      level = alpha * (monthlyData[i] / seasonal[seasonalIndex]) +
              (1 - alpha) * (prevLevel + prevTrend);

      // Update trend
      trend = beta * (level - prevLevel) + (1 - beta) * prevTrend;

      // Update seasonality
      seasonal[seasonalIndex] = gamma * (monthlyData[i] / level) +
                               (1 - gamma) * seasonal[seasonalIndex];
    }

    // Forecast next period
    const nextSeasonalIndex = monthlyData.length % seasonalPeriod;
    const prediction = (level + trend) * seasonal[nextSeasonalIndex];

    // Calculate confidence based on historical accuracy
    const confidence = this.calculateForecastConfidence(monthlyData, level, trend);

    // Determine trend direction
    const trendDirection = Math.abs(trend) < 0.1 ? 'stable' :
                          trend > 0 ? 'up' : 'down';

    return {
      prediction: Math.max(0, prediction),
      confidence,
      trend: trendDirection,
      seasonality: seasonal[nextSeasonalIndex]
    };
  }

  private calculateForecastConfidence(data: number[], level: number, trend: number): number {
    if (data.length < 3) return 0.3;

    // Calculate Mean Absolute Percentage Error (MAPE)
    let totalError = 0;
    let validPredictions = 0;

    for (let i = 2; i < data.length; i++) {
      const predicted = level + trend * (i - data.length + 1);
      const actual = data[i];

      if (actual > 0) {
        totalError += Math.abs((actual - predicted) / actual);
        validPredictions++;
      }
    }

    const mape = validPredictions > 0 ? totalError / validPredictions : 1;
    return Math.max(0.1, Math.min(0.95, 1 - mape));
  }

  private async getBudgetCategories(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('budget_analysis')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching budget categories:', error);
      return [];
    }
  }

  private async getRecentTransactions(userId: string, days: number): Promise<any[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('date', cutoffDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  private async calculateCategorySpending(budgets: any[], transactions: any[]): Promise<BudgetCategory[]> {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === currentMonth &&
             transactionDate.getFullYear() === currentYear;
    });

    return budgets.map(budget => {
      const categorySpending = monthlyTransactions
        .filter(t => t.category === budget.category)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const percentage = budget.limit > 0 ? (categorySpending / budget.limit) * 100 : 0;
      const remaining = budget.limit - categorySpending;

      // Calculate trend from last 3 months
      const trend = this.calculateCategoryTrend(budget.category, transactions);

      return {
        id: budget.id,
        name: budget.category,
        limit: budget.limit,
        spent: categorySpending,
        remaining,
        percentage,
        trend,
        forecast: this.calculateSimpleForecast(budget.category, transactions)
      };
    });
  }

  private calculateCategoryTrend(category: string, transactions: any[]): 'increasing' | 'decreasing' | 'stable' {
    const monthlySpending = this.getLastThreeMonthsSpending(category, transactions);

    if (monthlySpending.length < 2) return 'stable';

    const recent = monthlySpending[monthlySpending.length - 1];
    const previous = monthlySpending[monthlySpending.length - 2];

    const change = (recent - previous) / previous;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private getLastThreeMonthsSpending(category: string, transactions: any[]): number[] {
    const monthlySpending: { [key: string]: number } = {};

    transactions
      .filter(t => t.category === category)
      .forEach(t => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        monthlySpending[monthKey] = (monthlySpending[monthKey] || 0) + Math.abs(t.amount);
      });

    return Object.values(monthlySpending).slice(-3);
  }

  private calculateSimpleForecast(category: string, transactions: any[]): number {
    const monthlySpending = this.getLastThreeMonthsSpending(category, transactions);

    if (monthlySpending.length === 0) return 0;

    // Simple moving average
    return monthlySpending.reduce((sum, amount) => sum + amount, 0) / monthlySpending.length;
  }

  private performBudgetAnalysis(categories: BudgetCategory[], transactions: any[]): BudgetAnalysis {
    const totalBudget = categories.reduce((sum, cat) => sum + cat.limit, 0);
    const totalSpent = categories.reduce((sum, cat) => sum + cat.spent, 0);
    const totalRemaining = totalBudget - totalSpent;

    const overBudgetCategories = categories
      .filter(cat => cat.spent > cat.limit)
      .map(cat => cat.name);

    const riskCategories = categories
      .filter(cat => cat.percentage > 80 && cat.percentage <= 100)
      .map(cat => cat.name);

    // Calculate monthly income (simplified)
    const monthlyIncome = this.estimateMonthlyIncome(transactions);
    const savingsRate = monthlyIncome > 0 ? (monthlyIncome - totalSpent) / monthlyIncome : 0;

    // Calculate burn rate (daily spending rate)
    const daysInMonth = new Date().getDate();
    const burnRate = daysInMonth > 0 ? totalSpent / daysInMonth : 0;

    // Project end of month spending
    const remainingDays = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - daysInMonth;
    const projectedEndOfMonth = totalSpent + (burnRate * remainingDays);

    return {
      totalBudget,
      totalSpent,
      totalRemaining,
      overBudgetCategories,
      riskCategories,
      savingsRate,
      burnRate,
      projectedEndOfMonth
    };
  }

  private estimateMonthlyIncome(transactions: any[]): number {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const incomeTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return t.amount > 0 && // Positive amounts are income
             transactionDate.getMonth() === currentMonth &&
             transactionDate.getFullYear() === currentYear;
    });

    return incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  }

  private groupTransactionsByCategory(transactions: any[]): { [category: string]: any[] } {
    return transactions.reduce((groups, transaction) => {
      const category = transaction.category || 'uncategorized';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(transaction);
      return groups;
    }, {});
  }

  private aggregateMonthlySpending(transactions: any[]): number[] {
    const monthlySpending: { [key: string]: number } = {};

    transactions.forEach(t => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlySpending[monthKey] = (monthlySpending[monthKey] || 0) + Math.abs(t.amount);
    });

    // Sort by month and return values
    return Object.keys(monthlySpending)
      .sort()
      .map(key => monthlySpending[key]);
  }

  private generateSmartRecommendations(analysis: BudgetAnalysis, forecasts: ETSForecast[]): string[] {
    const recommendations: string[] = [];

    // Over-budget warnings
    if (analysis.overBudgetCategories.length > 0) {
      recommendations.push(`🚨 Over budget in: ${analysis.overBudgetCategories.join(', ')}. Consider reducing spending in these areas.`);
    }

    // Risk category warnings
    if (analysis.riskCategories.length > 0) {
      recommendations.push(`⚠️ Approaching limits in: ${analysis.riskCategories.join(', ')}. Monitor spending closely.`);
    }

    // Savings rate feedback
    if (analysis.savingsRate < 0.1) {
      recommendations.push('💰 Low savings rate detected. Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings.');
    } else if (analysis.savingsRate > 0.2) {
      recommendations.push('🎉 Excellent savings rate! Consider investing surplus funds for long-term growth.');
    }

    // Forecast-based recommendations
    const increasingCategories = forecasts.filter(f => f.trend === 'up' && f.confidence > 0.7);
    if (increasingCategories.length > 0) {
      recommendations.push(`📈 Rising spending predicted in: ${increasingCategories.map(f => f.category).join(', ')}. Plan accordingly.`);
    }

    // Burn rate warnings
    if (analysis.projectedEndOfMonth > analysis.totalBudget * 1.1) {
      recommendations.push('🔥 Current spending pace may exceed monthly budget. Consider slowing down discretionary spending.');
    }

    return recommendations;
  }

  /**
   * Create or update budget category
   */
  async setBudgetLimit(userId: string, category: string, limit: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('budget_analysis')
        .upsert({
          user_id: userId,
          category,
          limit,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error setting budget limit:', error);
      throw error;
    }
  }

  /**
   * Get spending insights for a specific category
   */
  async getCategoryInsights(userId: string, category: string): Promise<{
    monthlyAverage: number;
    trend: string;
    topMerchants: string[];
    seasonalPattern: number[];
    recommendations: string[];
  }> {
    try {
      const transactions = await this.getRecentTransactions(userId, 365); // 1 year
      const categoryTransactions = transactions.filter(t => t.category === category);

      const monthlySpending = this.aggregateMonthlySpending(categoryTransactions);
      const monthlyAverage = monthlySpending.reduce((sum, amount) => sum + amount, 0) / monthlySpending.length;

      const topMerchants = this.getTopMerchants(categoryTransactions);
      const seasonalPattern = this.calculateSeasonalPattern(categoryTransactions);
      const trend = this.calculateCategoryTrend(category, transactions);

      const recommendations = this.generateCategoryRecommendations(category, {
        monthlyAverage,
        trend,
        topMerchants,
        seasonalPattern
      });

      return {
        monthlyAverage,
        trend,
        topMerchants,
        seasonalPattern,
        recommendations
      };
    } catch (error) {
      console.error('Error getting category insights:', error);
      throw error;
    }
  }

  private getTopMerchants(transactions: any[]): string[] {
    const merchantSpending: { [merchant: string]: number } = {};

    transactions.forEach(t => {
      const merchant = t.description || 'Unknown';
      merchantSpending[merchant] = (merchantSpending[merchant] || 0) + Math.abs(t.amount);
    });

    return Object.entries(merchantSpending)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([merchant]) => merchant);
  }

  private calculateSeasonalPattern(transactions: any[]): number[] {
    const monthlySpending = new Array(12).fill(0);
    const monthlyCounts = new Array(12).fill(0);

    transactions.forEach(t => {
      const month = new Date(t.date).getMonth();
      monthlySpending[month] += Math.abs(t.amount);
      monthlyCounts[month]++;
    });

    return monthlySpending.map((total, index) =>
      monthlyCounts[index] > 0 ? total / monthlyCounts[index] : 0
    );
  }

  private generateCategoryRecommendations(category: string, insights: any): string[] {
    const recommendations: string[] = [];

    if (insights.trend === 'increasing') {
      recommendations.push(`📈 ${category} spending is trending up. Consider setting alerts or finding alternatives.`);
    }

    if (insights.topMerchants.length > 0) {
      recommendations.push(`🏪 Top spending at: ${insights.topMerchants[0]}. Look for discounts or loyalty programs.`);
    }

    // Seasonal recommendations
    const currentMonth = new Date().getMonth();
    const nextMonth = (currentMonth + 1) % 12;
    const seasonalIncrease = insights.seasonalPattern[nextMonth] > insights.seasonalPattern[currentMonth] * 1.2;

    if (seasonalIncrease) {
      recommendations.push(`🗓️ ${category} spending typically increases next month. Budget accordingly.`);
    }

    return recommendations;
  }
}

export default BudgetService;
