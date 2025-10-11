/**
 * FinanceOrchestrator - Complete Finance Intelligence Coordinator
 *
 * Orchestrates all finance-related operations including budget tracking,
 * transaction analysis, stress-to-cognitive mapping, and predictive analytics
 * with intelligent cross-domain correlations.
 */

import { EventSystem, NeuroLearnEvent, EVENT_TYPES } from '../EventSystem';
import { StorageOrchestrator } from './StorageOrchestrator';
import { CalculationEngine } from '../CalculationEngine';
import { Logger } from '../utils/Logger';
import { getErrorMessage } from '../utils/ErrorHandler';
import { CommandContext, CommandResult } from '../NeuroLearnEngine';

// Finance Services
// Use type-only imports if original types are available, otherwise fall back to `any` for compatibility
import type { BudgetService as BudgetServiceType } from '../../services/finance/BudgetService';
import BudgetService from '../../services/finance/BudgetServiceCompat';
import type { PredictiveAnalyticsService as PredictiveAnalyticsType } from '../../services/analytics/PredictiveAnalyticsService';
import PredictiveAnalyticsService from '../../services/analytics/PredictiveAnalyticsCompat';
import { AnalyticsAggregationService } from '../../services/analytics/AnalyticsAggregationService';

export interface FinanceConfig {
  stressThreshold: number;
  budgetWarningPercentage: number;
  enablePredictiveAnalytics: boolean;
  enableCognitiveCorrelation: boolean;
  autoSyncInterval: number;
}

export interface FinanceMetrics {
  monthlyIncome: number;
  monthlyExpenses: number;
  budgetUtilization: number;
  savingsRate: number;
  financialStressLevel: number;
  cognitiveImpactScore: number;
  predictiveInsights: any[];
}

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: Date;
  type: 'income' | 'expense';
  tags: string[];
  cognitiveState?: number;
  stressLevel?: number;
}

/**
 * Finance Orchestrator
 *
 * Central coordinator for all finance operations with cognitive intelligence.
 */
export class FinanceOrchestrator {
  private eventSystem: EventSystem;
  private storageOrchestrator: StorageOrchestrator;
  private calculationEngine: CalculationEngine;
  private logger: Logger;

  // Finance Services
  private budgetService: BudgetServiceType | any;
  private predictiveAnalytics: PredictiveAnalyticsType | any;
  private analyticsAggregation: any;

  // Configuration
  private config: FinanceConfig = {
    stressThreshold: 0.7,
    budgetWarningPercentage: 80,
    enablePredictiveAnalytics: true,
    enableCognitiveCorrelation: true,
    autoSyncInterval: 60 // minutes
  };

  // State
  private isInitialized = false;
  private metrics: FinanceMetrics = {
    monthlyIncome: 0,
    monthlyExpenses: 0,
    budgetUtilization: 0,
    savingsRate: 0,
    financialStressLevel: 0,
    cognitiveImpactScore: 0,
    predictiveInsights: []
  };

  constructor(
    eventSystem: EventSystem,
    storageOrchestrator: StorageOrchestrator,
    calculationEngine: CalculationEngine,
    logger: Logger,
    config?: Partial<FinanceConfig>
  ) {
    this.eventSystem = eventSystem;
    this.storageOrchestrator = storageOrchestrator;
    this.calculationEngine = calculationEngine;
    this.logger = logger;

    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Initialize the finance orchestrator
   */
  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Finance Orchestrator...');

      // Initialize finance services
  // Compat shims are plain objects; assign directly
  // Types above allow `any` to reduce friction while iterating
  this.budgetService = BudgetService;
  this.predictiveAnalytics = PredictiveAnalyticsService;
  // AnalyticsAggregationService still expected to have getInstance()
  this.analyticsAggregation = AnalyticsAggregationService.getInstance?.() as any;

      // Setup event listeners
      this.setupEventListeners();

      // Load historical metrics
      await this.loadMetrics();

      this.isInitialized = true;
      this.logger.info('Finance Orchestrator initialized successfully');

      this.eventSystem.emitEvent(
        'finance:orchestrator:initialized',
        'FinanceOrchestrator',
        { metrics: this.metrics },
        'medium'
      );

    } catch (error) {
      this.logger.error('Failed to initialize Finance Orchestrator', error);
      throw error;
    }
  }

  /**
   * Execute finance commands
   */
  public async execute(
    action: string,
    params: any,
    context: CommandContext
  ): Promise<CommandResult> {
    if (!this.isInitialized) {
      throw new Error('FinanceOrchestrator not initialized');
    }

    try {
      switch (action) {
        case 'add-transaction':
          return await this.handleAddTransaction(params, context);

        case 'update-budget':
          return await this.handleUpdateBudget(params, context);

        case 'analyze-spending':
          return await this.handleAnalyzeSpending(params, context);

        case 'predict-trends':
          return await this.handlePredictTrends(params, context);

        case 'calculate-stress':
          return await this.handleCalculateStress(params, context);

        case 'get-insights':
          return await this.handleGetInsights(params, context);

        case 'correlate-cognitive':
          return await this.handleCorrelateCognitive(params, context);

        case 'optimize-budget':
          return await this.handleOptimizeBudget(params, context);

        case 'metrics':
          await this.updateMetrics();
          return { success: true, data: this.metrics };

        default:
          throw new Error(`Unknown finance action: ${action}`);
      }
    } catch (error) {
      this.logger.error(`Finance operation failed: ${action}`, error);
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Get current finance status
   */
  public getStatus(): 'active' | 'idle' | 'error' | 'disabled' {
    if (!this.isInitialized) return 'disabled';
    if (this.metrics.financialStressLevel > 0.8) return 'error';
    return 'active';
  }

  /**
   * Get finance metrics
   */
  public getMetrics(): FinanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Shutdown the orchestrator
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down Finance Orchestrator...');

    try {
      // Save final metrics
      await this.saveMetrics();

      this.isInitialized = false;
      this.logger.info('Finance Orchestrator shutdown completed');

    } catch (error) {
      this.logger.error('Finance Orchestrator shutdown error', error);
    }
  }

  // Private Methods

  private setupEventListeners(): void {
    // Listen for learning sessions to correlate with spending
    this.eventSystem.subscribe(EVENT_TYPES.LEARNING_SESSION_COMPLETED, async (event) => {
      await this.correlateLearningWithFinance(event.data);
    });

    // Listen for stress level changes
    this.eventSystem.subscribe('wellness:stress:changed', async (event) => {
      await this.updateFinancialStressCorrelation(event.data);
    });

    // Listen for cognitive load changes
    this.eventSystem.subscribe(EVENT_TYPES.COGNITIVE_LOAD_HIGH, async (event) => {
      await this.analyzeStressSpendingCorrelation(event.data);
    });
  }

  // Command Handlers

  private async handleAddTransaction(params: any, context: CommandContext): Promise<CommandResult> {
    const { amount, category, description, type, tags = [], cognitiveState } = params;

    try {
      const transaction: Transaction = {
        id: this.generateTransactionId(),
        amount,
        category,
        description,
        date: new Date(),
        type,
        tags,
        cognitiveState,
        stressLevel: await this.getCurrentStressLevel()
      };

      // Add transaction through budget service
      const result = await this.budgetService.addTransaction(transaction);

      // Store transaction data
      await this.storageOrchestrator.execute('set', {
        key: `transaction_${transaction.id}`,
        value: transaction
      }, context);

      // Analyze immediate impact
      await this.analyzeTransactionImpact(transaction);

      // Update metrics
      await this.updateMetrics();

      // Emit transaction event
      this.eventSystem.emitEvent(
        EVENT_TYPES.TRANSACTION_ADDED,
        'FinanceOrchestrator',
        { transaction },
        'medium'
      );

      return { success: true, data: { transaction, result } };

    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  private async handleUpdateBudget(params: any, context: CommandContext): Promise<CommandResult> {
    const { category, amount, period = 'monthly' } = params;

    try {
      const result = await this.budgetService.updateBudget(category, amount, period);

      // Check if budget update affects stress levels
      await this.analyzeBudgetStressImpact(category, amount);

      return { success: true, data: result };

    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  private async handleAnalyzeSpending(params: any, context: CommandContext): Promise<CommandResult> {
    const { timeframe = '30d', categories, includePredictions = false } = params;

    try {
      const analysis = await this.budgetService.analyzeSpending({
        timeframe,
        categories,
        includeCorrelations: this.config.enableCognitiveCorrelation
      });

      if (includePredictions && this.config.enablePredictiveAnalytics) {
        const predictions = await this.predictiveAnalytics.predictSpendingTrends(analysis);
        analysis.predictions = predictions;
      }

      return { success: true, data: analysis };

    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  private async handlePredictTrends(params: any, context: CommandContext): Promise<CommandResult> {
    const { horizon = '90d', categories, includeStressFactors = true } = params;

    try {
      const trends = await this.predictiveAnalytics.predictFinancialTrends({
        horizon,
        categories,
        includeStressFactors,
        cognitiveCorrelations: this.config.enableCognitiveCorrelation
      });

      // Update predictive insights in metrics
      this.metrics.predictiveInsights = trends.insights || [];

      return { success: true, data: trends };

    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  private async handleCalculateStress(params: any, context: CommandContext): Promise<CommandResult> {
    try {
      const stressLevel = await this.calculateFinancialStress();

      // Update metrics
      this.metrics.financialStressLevel = stressLevel;

      // Emit stress change event if significant
      if (Math.abs(stressLevel - this.metrics.financialStressLevel) > 0.1) {
        this.eventSystem.emitEvent(
          EVENT_TYPES.STRESS_LEVEL_CHANGED,
          'FinanceOrchestrator',
          { previousLevel: this.metrics.financialStressLevel, newLevel: stressLevel },
          'medium'
        );
      }

      return { success: true, data: { stressLevel } };

    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  private async handleGetInsights(params: any, context: CommandContext): Promise<CommandResult> {
    const { includeRecommendations = true, timeframe = '30d' } = params;

    try {
      let insights: any = { insights: [], recommendations: [] };
      if (this.analyticsAggregation && typeof this.analyticsAggregation.generateFinancialInsights === 'function') {
        insights = await this.analyticsAggregation.generateFinancialInsights({
          timeframe,
          includeRecommendations,
          cognitiveCorrelations: this.config.enableCognitiveCorrelation
        });
      }

      return { success: true, data: insights };

    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  private async handleCorrelateCognitive(params: any, context: CommandContext): Promise<CommandResult> {
    const { metric = 'spending', timeframe = '30d' } = params;

    try {
      const correlations = await this.calculateCognitiveCorrelations(metric, timeframe);

      return { success: true, data: correlations };

    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  private async handleOptimizeBudget(params: any, context: CommandContext): Promise<CommandResult> {
    const { goals, constraints, cognitiveOptimization = true } = params;

    try {
      const optimization = await this.budgetService.optimizeBudget({
        goals,
        constraints,
        cognitiveFactors: cognitiveOptimization ? await this.getCognitiveFactors() : null
      });

      return { success: true, data: optimization };

    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  // Analysis Methods

  private async analyzeTransactionImpact(transaction: Transaction): Promise<void> {
    const impact = {
      budgetImpact: await this.calculateBudgetImpact(transaction),
      stressImpact: await this.calculateStressImpact(transaction),
      cognitiveImpact: this.calculateCognitiveImpact(transaction)
    };

    // Emit significant impact events
    if (impact.stressImpact > 0.2) {
      this.eventSystem.emitEvent(
        'finance:high:stress:transaction',
        'FinanceOrchestrator',
        { transaction, impact },
        'high'
      );
    }

    if (impact.budgetImpact > this.config.budgetWarningPercentage / 100) {
      this.eventSystem.emitEvent(
        EVENT_TYPES.BUDGET_EXCEEDED,
        'FinanceOrchestrator',
        { transaction, impact },
        'high'
      );
    }
  }

  private async calculateFinancialStress(): Promise<number> {
    const budgetUtilization = this.metrics.budgetUtilization;
    const savingsRate = this.metrics.savingsRate;
    const recentTransactions = await this.getRecentTransactions(7);

    // Calculate stress based on multiple factors
    let stress = 0;

    // Budget utilization stress
    if (budgetUtilization > 0.8) {
      stress += 0.4;
    } else if (budgetUtilization > 0.6) {
      stress += 0.2;
    }

    // Savings rate stress
    if (savingsRate < 0.1) {
      stress += 0.3;
    } else if (savingsRate < 0.2) {
      stress += 0.15;
    }

    // Recent high spending stress
    const highSpendingTransactions = recentTransactions.filter(t => t.amount > this.metrics.monthlyIncome * 0.1);
    stress += Math.min(0.3, highSpendingTransactions.length * 0.1);

    return Math.min(1, stress);
  }

  private async calculateCognitiveCorrelations(metric: string, timeframe: string): Promise<any> {
    const correlations = await this.calculationEngine.calculate('cognitive_finance_correlations', {
      metric,
      timeframe,
      financialData: this.metrics,
      includeStress: true
    });

    return correlations;
  }

  private async calculateBudgetImpact(transaction: Transaction): Promise<number> {
    if (transaction.type === 'income') return 0;

    const categoryBudget = await this.budgetService.getCategoryBudget(transaction.category);
    const categorySpending = await this.budgetService.getCategorySpending(transaction.category);

    return transaction.amount / (categoryBudget - categorySpending);
  }

  private async calculateStressImpact(transaction: Transaction): Promise<number> {
    const baseStress = this.metrics.financialStressLevel;
    const transactionStress = transaction.amount / this.metrics.monthlyIncome;

    return Math.min(1, baseStress + transactionStress);
  }

  private calculateCognitiveImpact(transaction: Transaction): number {
    if (!transaction.cognitiveState) return 0;

    // Higher cognitive load correlates with impulsive spending
    const cognitiveImpact = transaction.cognitiveState * (transaction.amount / this.metrics.monthlyIncome);

    return Math.min(1, cognitiveImpact);
  }

  // Event Handlers

  private async correlateLearningWithFinance(learningData: any): Promise<void> {
    this.logger.info('Correlating learning session with financial patterns');

    // Analyze if learning stress correlates with spending patterns
    const correlation = await this.calculationEngine.calculate('learning_spending_correlation', {
      learningData,
      financialMetrics: this.metrics,
      timeWindow: '24h'
    });

    if (correlation.strength > 0.7) {
      this.eventSystem.emitEvent(
        EVENT_TYPES.CROSS_MODULE_CORRELATION,
        'FinanceOrchestrator',
        { type: 'learning_finance', correlation },
        'medium'
      );
    }
  }

  private async updateFinancialStressCorrelation(stressData: any): Promise<void> {
    // Update cognitive impact score based on wellness stress
    const previousImpact = this.metrics.cognitiveImpactScore;
    this.metrics.cognitiveImpactScore = (this.metrics.cognitiveImpactScore + stressData.level) / 2;

    if (Math.abs(this.metrics.cognitiveImpactScore - previousImpact) > 0.15) {
      this.eventSystem.emitEvent(
        'finance:cognitive:impact:changed',
        'FinanceOrchestrator',
        { previousImpact, newImpact: this.metrics.cognitiveImpactScore },
        'medium'
      );
    }
  }

  private async analyzeStressSpendingCorrelation(cognitiveData: any): Promise<void> {
    // Analyze if high cognitive load leads to increased spending
    const recentTransactions = await this.getRecentTransactions(1);
    const highCognitiveSpending = recentTransactions.filter(t =>
      t.cognitiveState && t.cognitiveState > 0.7 && t.amount > this.metrics.monthlyIncome * 0.05
    );

    if (highCognitiveSpending.length > 0) {
      this.eventSystem.emitEvent(
        'finance:stress:spending:detected',
        'FinanceOrchestrator',
        { transactions: highCognitiveSpending, cognitiveData },
        'medium'
      );
    }
  }

  private async analyzeBudgetStressImpact(category: string, amount: number): Promise<void> {
    const currentSpending = await this.budgetService.getCategorySpending(category);
    const utilization = currentSpending / amount;

    if (utilization > this.config.budgetWarningPercentage / 100) {
      this.eventSystem.emitEvent(
        'finance:budget:stress:high',
        'FinanceOrchestrator',
        { category, utilization, amount },
        'high'
      );
    }
  }

  // Utility Methods

  private async getCurrentStressLevel(): Promise<number> {
    return this.metrics.financialStressLevel;
  }

  private async getCognitiveFactors(): Promise<any> {
    return {
      currentLoad: await this.getCognitiveLoad(),
      stressLevel: this.metrics.financialStressLevel,
      impactScore: this.metrics.cognitiveImpactScore
    };
  }

  private async getCognitiveLoad(): Promise<number> {
    // Get cognitive load from cognitive service through event system
    // This would be implemented based on your CognitiveAuraService
    return 0.5; // Placeholder
  }

  private async getRecentTransactions(days: number): Promise<Transaction[]> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Query transactions from storage
    const result = await this.storageOrchestrator.execute('query', {
      collection: 'transactions',
      filters: {
        date: { $gte: cutoffDate }
      }
    }, { userId: 'current', sessionId: 'current', timestamp: new Date(), priority: 'medium', source: 'FinanceOrchestrator' });

    return result.success ? result.data : [];
  }

  private async updateMetrics(): Promise<void> {
    try {
      // Calculate updated financial metrics
      const budgetSummary = await this.budgetService.getBudgetSummary();

      this.metrics.monthlyIncome = budgetSummary.income || 0;
      this.metrics.monthlyExpenses = budgetSummary.expenses || 0;
      this.metrics.budgetUtilization = budgetSummary.utilization || 0;
      this.metrics.savingsRate = budgetSummary.savingsRate || 0;
      this.metrics.financialStressLevel = await this.calculateFinancialStress();

      await this.saveMetrics();

    } catch (error) {
      this.logger.warn('Failed to update finance metrics', error);
    }
  }

  private async loadMetrics(): Promise<void> {
    try {
      const result = await this.storageOrchestrator.execute('get', {
        key: 'finance_metrics'
      }, { userId: 'current', sessionId: 'current', timestamp: new Date(), priority: 'medium', source: 'FinanceOrchestrator' });

      if (result.success && result.data.value) {
        this.metrics = { ...this.metrics, ...result.data.value };
      }
    } catch (error) {
      this.logger.warn('Failed to load finance metrics', error);
    }
  }

  private async saveMetrics(): Promise<void> {
    try {
      await this.storageOrchestrator.execute('set', {
        key: 'finance_metrics',
        value: this.metrics
      }, { userId: 'current', sessionId: 'current', timestamp: new Date(), priority: 'medium', source: 'FinanceOrchestrator' });
    } catch (error) {
      this.logger.warn('Failed to save finance metrics', error);
    }
  }

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
}

export default FinanceOrchestrator;
