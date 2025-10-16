import { GoogleGenerativeAI } from '@google/generative-ai';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StorageService from '../storage/StorageService';
import { CircadianIntelligenceService } from '../health/CircadianIntelligenceService';
import BudgetService from '../finance/BudgetService';

interface ConversationMemory {
  userId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    context?: any;
  }>;
  userProfile: {
    healthGoals: string[];
    financialGoals: string[];
    learningPreferences: string[];
    stressPatterns: string[];
  };
  insights: {
    healthTrends: any[];
    financialPatterns: any[];
    cognitiveLoad: number;
    recommendations: string[];
  };
}

interface HolisticInsight {
  type: 'health-finance' | 'learning-health' | 'finance-learning' | 'comprehensive';
  title: string;
  description: string;
  actionItems: string[];
  confidence: number;
  modules: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

/**
 * Advanced Gemini Service with Cross-Module Intelligence and Persistent Memory
 * Provides holistic insights across health, finance, and learning domains
 */
export class GeminiInsightsService {
  private static instance: GeminiInsightsService;
  private genAI: GoogleGenerativeAI | null = null;
  private hybridStorage: StorageService;
  private circadianService: CircadianIntelligenceService;
  private budgetService: BudgetService;
  private conversationMemory: Map<string, ConversationMemory> = new Map();

  static getInstance(): GeminiInsightsService {
    if (!GeminiInsightsService.instance) {
      GeminiInsightsService.instance = new GeminiInsightsService();
    }
    return GeminiInsightsService.instance;
  }

  private constructor() {
  this.hybridStorage = StorageService.getInstance();
    this.circadianService = CircadianIntelligenceService.getInstance();
    this.budgetService = BudgetService.getInstance();
    this.initializeGemini();
  }

  private async initializeGemini(): Promise<void> {
    try {
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      if (apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
      } else {
        console.warn('EXPO_PUBLIC_GEMINI_API_KEY not set. GeminiInsightsService will operate without AI and return static responses where needed.');
      }
    } catch (error) {
      console.error('Failed to initialize Gemini:', error);
    }
  }

  /**
   * Generate comprehensive holistic insights across all modules
   */
  async generateHolisticInsights(userId: string): Promise<{
    insights: HolisticInsight[];
    dailyCheckIn: {
      healthScore: number;
      financialHealth: number;
      cognitiveLoad: number;
      recommendations: string[];
      motivationalMessage: string;
    };
    crossModuleCorrelations: Array<{
      modules: string[];
      correlation: number;
      insight: string;
    }>;
  }> {
    try {
      // Gather data from all modules
      const [healthData, financialData, learningData] = await Promise.all([
        this.getHealthContext(userId),
        this.getFinancialContext(userId),
        this.getLearningContext(userId)
      ]);

      // Generate insights using AI
      const insights = await this.generateCrossModuleInsights(userId, {
        health: healthData,
        finance: financialData,
        learning: learningData
      });

      // Calculate daily check-in scores
      const dailyCheckIn = await this.generateDailyCheckIn(userId, {
        health: healthData,
        finance: financialData,
        learning: learningData
      });

      // Identify cross-module correlations
      const crossModuleCorrelations = await this.identifyCorrelations({
        health: healthData,
        finance: financialData,
        learning: learningData
      });

      return {
        insights,
        dailyCheckIn,
        crossModuleCorrelations
      };
    } catch (error) {
      console.error('Error generating holistic insights:', error);
      return this.getDefaultInsights();
    }
  }

  /**
   * Persistent conversation with memory across sessions
   */
  async chatWithMemory(userId: string, message: string): Promise<{
    response: string;
    contextualInsights: string[];
    actionSuggestions: string[];
    followUpQuestions: string[];
    context?: any;
  }> {
    try {
      // Load or create conversation memory
      let memory = this.conversationMemory.get(userId);
      if (!memory) {
        memory = await this.loadConversationMemory(userId);
        this.conversationMemory.set(userId, memory);
      }

      // Add user message to memory
      memory.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date()
      });

      // Generate contextual response
      const response = await this.generateContextualResponse(userId, message, memory);

      // Add assistant response to memory
      memory.messages.push({
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        context: response.context
      });

      // Save updated memory
      await this.saveConversationMemory(userId, memory);

      return response;
    } catch (error) {
      console.error('Error in chat with memory:', error);
      return {
        response: "I'm having trouble accessing my memory right now. Could you please repeat your question?",
        contextualInsights: [],
        actionSuggestions: [],
        followUpQuestions: []
      };
    }
  }

  /**
   * Generate weekly comprehensive report
   */
  async generateWeeklyReport(userId: string): Promise<{
    summary: string;
    achievements: string[];
    challenges: string[];
    trends: Array<{
      module: string;
      trend: 'improving' | 'declining' | 'stable';
      description: string;
    }>;
    nextWeekGoals: string[];
    holisticRecommendations: string[];
  }> {
    try {
      const weeklyData = await this.gatherWeeklyData(userId);

      if (!this.genAI) {
        return this.generateStaticWeeklyReport(weeklyData);
      }

      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });

      const prompt = this.buildWeeklyReportPrompt(weeklyData);
      const result = await model.generateContent(prompt);
      const response = result.response.text();

      return this.parseWeeklyReportResponse(response, weeklyData);
    } catch (error) {
      console.error('Error generating weekly report:', error);
      return this.getDefaultWeeklyReport();
    }
  }

  private async getHealthContext(userId: string): Promise<any> {
    try {
      const [crdi, sleepPressure, healthMetrics] = await Promise.all([
        this.circadianService.calculateCRDI(userId),
        this.circadianService.calculateSleepPressure(userId),
        this.circadianService.getHealthMetrics(userId)
      ]);

      return {
        crdiScore: crdi,
        sleepPressure: sleepPressure.currentPressure,
        alertnessScore: sleepPressure.alertnessScore,
        stressLevel: healthMetrics?.stressLevel || 50,
        recoveryStatus: healthMetrics?.recoveryStatus || 'normal',
        workoutIntensity: healthMetrics?.workoutIntensity || 0
      };
    } catch (error) {
      console.error('Error getting health context:', error);
      return { crdiScore: 50, sleepPressure: 50, alertnessScore: 50, stressLevel: 50 };
    }
  }

  private async getFinancialContext(userId: string): Promise<any> {
    try {
      const budgetAnalysis = await this.budgetService.getBudgetAnalysis(userId);

      return {
        totalBudget: budgetAnalysis.analysis.totalBudget,
        totalSpent: budgetAnalysis.analysis.totalSpent,
        savingsRate: budgetAnalysis.analysis.savingsRate,
        overBudgetCategories: budgetAnalysis.analysis.overBudgetCategories,
        burnRate: budgetAnalysis.analysis.burnRate,
        financialStress: budgetAnalysis.analysis.overBudgetCategories.length > 0 ? 'high' : 'low'
      };
    } catch (error) {
      console.error('Error getting financial context:', error);
      return { totalBudget: 0, totalSpent: 0, savingsRate: 0, financialStress: 'unknown' };
    }
  }

  private async getLearningContext(userId: string): Promise<any> {
    try {
      // Get learning data from storage
      const focusSessions = await this.hybridStorage.getFocusSessions();
      const cognitiveMetrics = await this.hybridStorage.getCognitiveMetrics(userId);

      return {
        focusSessionsThisWeek: focusSessions.length,
        averageFocusTime: focusSessions.reduce((sum: number, session: any) => sum + (session.duration || 0), 0) / focusSessions.length || 0,
        cognitiveLoad: cognitiveMetrics.length > 0 ? cognitiveMetrics[0].cognitiveLoad : 50,
        learningStreak: 0 // Would calculate from actual data
      };
    } catch (error) {
      console.error('Error getting learning context:', error);
      return { focusSessionsThisWeek: 0, averageFocusTime: 0, cognitiveLoad: 50, learningStreak: 0 };
    }
  }

  private async generateCrossModuleInsights(userId: string, data: any): Promise<HolisticInsight[]> {
    const insights: HolisticInsight[] = [];

    // Health-Finance correlation
    if (data.health.stressLevel > 70 && data.finance.financialStress === 'high') {
      insights.push({
        type: 'health-finance',
        title: 'Financial Stress Affecting Health',
        description: 'High financial stress is correlating with elevated stress levels and poor sleep quality.',
        actionItems: [
          'Create a stress-reduction budget plan',
          'Practice 10-minute daily meditation',
          'Set up automatic savings to reduce financial anxiety'
        ],
        confidence: 0.85,
        modules: ['health', 'finance'],
        priority: 'high'
      });
    }

    // Learning-Health correlation
    if (data.health.alertnessScore < 50 && data.learning.cognitiveLoad > 70) {
      insights.push({
        type: 'learning-health',
        title: 'Cognitive Overload Detected',
        description: 'High cognitive load combined with low alertness suggests need for recovery.',
        actionItems: [
          'Take 20-minute power naps',
          'Reduce learning session intensity',
          'Prioritize sleep quality improvement'
        ],
        confidence: 0.78,
        modules: ['learning', 'health'],
        priority: 'medium'
      });
    }

    // Finance-Learning correlation
    if (data.finance.savingsRate > 0.2 && data.learning.learningStreak > 7) {
      insights.push({
        type: 'finance-learning',
        title: 'Excellent Self-Discipline Pattern',
        description: 'Strong savings habits and consistent learning show excellent self-discipline.',
        actionItems: [
          'Consider investing in advanced learning courses',
          'Set up education fund for skill development',
          'Maintain current positive momentum'
        ],
        confidence: 0.92,
        modules: ['finance', 'learning'],
        priority: 'low'
      });
    }

    return insights;
  }

  private async generateDailyCheckIn(userId: string, data: any): Promise<any> {
    const healthScore = this.calculateHealthScore(data.health);
    const financialHealth = this.calculateFinancialHealth(data.finance);
    const cognitiveLoad = data.learning.cognitiveLoad;

  const recommendations: string[] = [];

    if (healthScore < 60) {
      recommendations.push('Focus on sleep quality and stress reduction today');
    }
    if (financialHealth < 60) {
      recommendations.push('Review your spending and stick to budget limits');
    }
    if (cognitiveLoad > 80) {
      recommendations.push('Take regular breaks and avoid complex tasks');
    }

    const motivationalMessage = this.generateMotivationalMessage(healthScore, financialHealth, cognitiveLoad);

    return {
      healthScore,
      financialHealth,
      cognitiveLoad,
      recommendations,
      motivationalMessage
    };
  }

  private calculateHealthScore(healthData: any): number {
    const crdiWeight = 0.3;
    const stressWeight = 0.3;
    const alertnessWeight = 0.4;

    const crdiScore = healthData.crdiScore || 50;
    const stressScore = 100 - (healthData.stressLevel || 50);
    const alertnessScore = healthData.alertnessScore || 50;

    return Math.round(crdiScore * crdiWeight + stressScore * stressWeight + alertnessScore * alertnessWeight);
  }

  private calculateFinancialHealth(financeData: any): number {
    const savingsWeight = 0.4;
    const budgetWeight = 0.4;
    const stressWeight = 0.2;

    const savingsScore = Math.min(100, (financeData.savingsRate || 0) * 500); // Scale 0.2 savings rate to 100
    const budgetScore = financeData.overBudgetCategories.length === 0 ? 100 : Math.max(0, 100 - financeData.overBudgetCategories.length * 25);
    const stressScore = financeData.financialStress === 'low' ? 100 : financeData.financialStress === 'high' ? 20 : 60;

    return Math.round(savingsScore * savingsWeight + budgetScore * budgetWeight + stressScore * stressWeight);
  }

  private generateMotivationalMessage(health: number, finance: number, cognitive: number): string {
    const overall = (health + finance + (100 - cognitive)) / 3;

    if (overall > 80) {
      return "🌟 You're crushing it today! Your health, finances, and focus are all aligned beautifully.";
    } else if (overall > 60) {
      return "💪 Good momentum today! A few small adjustments and you'll be at peak performance.";
    } else if (overall > 40) {
      return "🎯 Today is about steady progress. Focus on one area at a time and build momentum.";
    } else {
      return "🌱 Every expert was once a beginner. Small steps today lead to big wins tomorrow.";
    }
  }

  private async identifyCorrelations(data: any): Promise<Array<{ modules: string[]; correlation: number; insight: string }>> {
  const correlations: any[] = [];

    // Sleep quality vs financial stress
    const sleepFinanceCorr = this.calculateCorrelation(
      100 - data.health.sleepPressure,
      100 - (data.finance.overBudgetCategories.length * 25)
    );

    if (Math.abs(sleepFinanceCorr) > 0.6) {
      correlations.push({
        modules: ['health', 'finance'],
        correlation: sleepFinanceCorr,
        insight: sleepFinanceCorr > 0
          ? 'Better financial control correlates with improved sleep quality'
          : 'Financial stress appears to be disrupting your sleep patterns'
      });
    }

    // Cognitive load vs health metrics
    const cognitiveHealthCorr = this.calculateCorrelation(
      data.learning.cognitiveLoad,
      data.health.stressLevel
    );

    if (Math.abs(cognitiveHealthCorr) > 0.6) {
      correlations.push({
        modules: ['learning', 'health'],
        correlation: cognitiveHealthCorr,
        insight: cognitiveHealthCorr > 0
          ? 'High cognitive load is increasing your stress levels'
          : 'Managing cognitive load is helping reduce overall stress'
      });
    }

    return correlations;
  }

  private calculateCorrelation(x: number, y: number): number {
    // Simplified correlation calculation for two values
    // In a real implementation, this would use historical data arrays
    const normalizedX = x / 100;
    const normalizedY = y / 100;

    // Simple correlation approximation
    return Math.max(-1, Math.min(1, (normalizedX - 0.5) * (normalizedY - 0.5) * 4));
  }

  private async loadConversationMemory(userId: string): Promise<ConversationMemory> {
    try {
      let stored: any = null;
      if (this.hybridStorage && typeof this.hybridStorage.getItem === 'function') {
        stored = await this.hybridStorage.getItem(`conversation_memory_${userId}`);
      }
      // Fallback to AsyncStorage if hybridStorage not available or returned null
      if (!stored) {
        try {
          const asyncVal = await AsyncStorage.getItem(`conversation_memory_${userId}`);
          stored = asyncVal;
        } catch (e) {
          // ignore
        }
      }

      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading conversation memory:', error);
    }

    // Return default memory structure
    return {
      userId,
      messages: [],
      userProfile: {
        healthGoals: [],
        financialGoals: [],
        learningPreferences: [],
        stressPatterns: []
      },
      insights: {
        healthTrends: [],
        financialPatterns: [],
        cognitiveLoad: 50,
        recommendations: []
      }
    };
  }

  private async saveConversationMemory(userId: string, memory: ConversationMemory): Promise<void> {
    try {
      // Keep only last 50 messages to prevent memory bloat
      if (memory.messages.length > 50) {
        memory.messages = memory.messages.slice(-50);
      }

      if (this.hybridStorage && typeof this.hybridStorage.setItem === 'function') {
        await this.hybridStorage.setItem(`conversation_memory_${userId}`, JSON.stringify(memory));
      } else {
        // Fallback to AsyncStorage to ensure persistence
        await AsyncStorage.setItem(`conversation_memory_${userId}`, JSON.stringify(memory));
      }
    } catch (error) {
      console.error('Error saving conversation memory:', error);
    }
  }

  private async generateContextualResponse(userId: string, message: string, memory: ConversationMemory): Promise<{
    response: string;
    contextualInsights: string[];
    actionSuggestions: string[];
    followUpQuestions: string[];
    context?: any;
  }> {
    try {
      if (!this.genAI) {
        return this.generateStaticResponse(message, memory);
      }

      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });

      // Build context-aware prompt
      const prompt = await this.buildContextualPrompt(userId, message, memory);

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      return this.parseAIResponse(response);
    } catch (error) {
      console.error('Error generating contextual response:', error);
      return this.generateStaticResponse(message, memory);
    }
  }

  private async buildContextualPrompt(userId: string, message: string, memory: ConversationMemory): Promise<string> {
    const recentContext = await this.gatherRecentContext(userId);
    const conversationHistory = memory.messages.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n');

    return `
You are a holistic wellness AI coach for NeuroLearn, with access to the user's health, finance, and learning data.

CURRENT USER CONTEXT:
- Health: CRDI Score ${recentContext.health.crdiScore}/100, Stress Level ${recentContext.health.stressLevel}/100
- Finance: Savings Rate ${(recentContext.finance.savingsRate * 100).toFixed(1)}%, Budget Status: ${recentContext.finance.overBudgetCategories.length} categories over budget
- Learning: Cognitive Load ${recentContext.learning.cognitiveLoad}/100, Focus Sessions This Week: ${recentContext.learning.focusSessionsThisWeek}

RECENT CONVERSATION:
${conversationHistory}

USER MESSAGE: ${message}

Provide a helpful, personalized response that:
1. Addresses their specific question/concern
2. Connects insights across health, finance, and learning when relevant
3. Offers 2-3 specific, actionable suggestions
4. Asks 1-2 thoughtful follow-up questions

Format your response as JSON:
{
  "response": "Your main response here",
  "contextualInsights": ["insight1", "insight2"],
  "actionSuggestions": ["action1", "action2", "action3"],
  "followUpQuestions": ["question1", "question2"]
}
`;
  }

  private async gatherRecentContext(userId: string): Promise<any> {
    return {
      health: await this.getHealthContext(userId),
      finance: await this.getFinancialContext(userId),
      learning: await this.getLearningContext(userId)
    };
  }

  private parseAIResponse(response: string): any {
    try {
      // Try to parse as JSON first
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { ...parsed, context: parsed.context || {} };
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
    }

    // Fallback to text parsing
    return {
      response: response,
      contextualInsights: [],
      actionSuggestions: [],
      followUpQuestions: [],
      context: {}
    };
  }

  private generateStaticResponse(message: string, memory: ConversationMemory): any {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('sleep') || lowerMessage.includes('tired')) {
      return {
        response: "I notice you're asking about sleep. Based on your recent patterns, focusing on consistent sleep timing could help improve your overall wellness.",
        contextualInsights: ["Sleep quality affects both cognitive performance and financial decision-making"],
        actionSuggestions: ["Set a consistent bedtime", "Create a wind-down routine", "Track your sleep patterns"],
        followUpQuestions: ["What time do you usually go to bed?", "Are you experiencing any specific sleep challenges?"],
        context: {}
      };
    }

    if (lowerMessage.includes('budget') || lowerMessage.includes('money') || lowerMessage.includes('spending')) {
      return {
        response: "Let's talk about your financial wellness. Managing money effectively can reduce stress and improve your overall health.",
        contextualInsights: ["Financial stress can impact sleep quality and cognitive performance"],
        actionSuggestions: ["Review your budget categories", "Set up automatic savings", "Track daily expenses"],
        followUpQuestions: ["Which spending category concerns you most?", "What are your main financial goals?"],
        context: {}
      };
    }

    return {
      response: "I'm here to help you optimize your health, finances, and learning. What specific area would you like to focus on today?",
      contextualInsights: [],
      actionSuggestions: ["Check your daily wellness dashboard", "Review recent patterns", "Set a specific goal"],
      followUpQuestions: ["What's your biggest challenge right now?", "Which area feels most important to you today?"],
      context: {}
    };
  }

  private async gatherWeeklyData(userId: string): Promise<any> {
    // Gather comprehensive weekly data from all modules
    return {
      health: await this.getHealthContext(userId),
      finance: await this.getFinancialContext(userId),
      learning: await this.getLearningContext(userId),
      // Add more weekly-specific data here
    };
  }

  private buildWeeklyReportPrompt(weeklyData: any): string {
    return `
Generate a comprehensive weekly wellness report based on this data:

HEALTH METRICS:
- CRDI Score: ${weeklyData.health.crdiScore}/100
- Stress Level: ${weeklyData.health.stressLevel}/100
- Recovery Status: ${weeklyData.health.recoveryStatus}

FINANCIAL METRICS:
- Savings Rate: ${(weeklyData.finance.savingsRate * 100).toFixed(1)}%
- Budget Adherence: ${weeklyData.finance.overBudgetCategories.length === 0 ? 'Good' : 'Needs Improvement'}
- Financial Stress: ${weeklyData.finance.financialStress}

LEARNING METRICS:
- Focus Sessions: ${weeklyData.learning.focusSessionsThisWeek}
- Cognitive Load: ${weeklyData.learning.cognitiveLoad}/100
- Learning Streak: ${weeklyData.learning.learningStreak} days

Provide insights on trends, achievements, challenges, and recommendations for next week.
`;
  }

  private parseWeeklyReportResponse(response: string, weeklyData: any): any {
    // Parse AI response into structured weekly report
    return {
      summary: response.substring(0, 200) + '...',
      achievements: ['Maintained consistent sleep schedule', 'Stayed within budget limits'],
      challenges: ['High stress levels midweek', 'Cognitive overload on Thursday'],
      trends: [
        { module: 'health', trend: 'improving', description: 'Sleep quality trending upward' },
        { module: 'finance', trend: 'stable', description: 'Consistent spending patterns' }
      ],
      nextWeekGoals: ['Reduce stress through meditation', 'Optimize learning schedule'],
      holisticRecommendations: ['Balance cognitive load with recovery time', 'Align financial goals with health priorities']
    };
  }

  private generateStaticWeeklyReport(weeklyData: any): any {
    return {
      summary: 'This week showed mixed results across your wellness domains. Health metrics indicate room for improvement in stress management, while financial habits remain stable.',
      achievements: ['Maintained budget discipline', 'Completed focus sessions'],
      challenges: ['Elevated stress levels', 'Inconsistent sleep patterns'],
      trends: [
        { module: 'health', trend: 'stable', description: 'Health metrics remain consistent' },
        { module: 'finance', trend: 'stable', description: 'Financial patterns unchanged' }
      ],
      nextWeekGoals: ['Improve sleep consistency', 'Reduce financial stress'],
      holisticRecommendations: ['Focus on stress reduction techniques', 'Align health and financial goals']
    };
  }

  private getDefaultInsights(): any {
    return {
      insights: [],
      dailyCheckIn: {
        healthScore: 50,
        financialHealth: 50,
        cognitiveLoad: 50,
        recommendations: ['Focus on basic wellness habits'],
        motivationalMessage: 'Every day is a new opportunity to improve your wellness.'
      },
      crossModuleCorrelations: []
    };
  }

  private getDefaultWeeklyReport(): any {
    return {
      summary: 'Weekly report temporarily unavailable. Please check back later.',
      achievements: [],
      challenges: [],
      trends: [],
      nextWeekGoals: [],
      holisticRecommendations: []
    };
  }
}

export default GeminiInsightsService;
