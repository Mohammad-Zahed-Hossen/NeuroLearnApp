import { GoogleGenerativeAI } from '@google/generative-ai';
import StorageService from '../storage/StorageService';
import AIInsightsService from './AIInsightsService';

interface HolisticUserData {
  // Financial data
  monthlyIncome: number;
  monthlyExpenses: number;
  categoryBreakdown: Record<string, number>;
  budgetStatus: Array<{
    category: string;
    spent: number;
    limit: number;
    utilization: number;
  }>;
  savingsRate: number;

  // Health data (from your Health & Wellness module)
  healthMetrics: {
    crdiScore: number;
    sleepQuality: number;
    exerciseFrequency: number;
    stressLevel: number;
    recoveryScore: number;
  };

  // Learning data (from MindMapGeneratorService)
  learningMetrics: {
    activeNodes: number;
    masteryDistribution: Record<string, number>;
    studyStreak: number;
    cognitiveLoad: number;
    learningGoals: string[];
  };

  // Temporal context
  timeOfDay: number;
  dayOfWeek: string;
  currentMonth: string;
}

interface GeminiResponse {
  insights: string[];
  recommendations: string[];
  prioritizedActions: string[];
  crossModuleConnections: string[];
}

export class AdvancedGeminiService {
  private static instance: AdvancedGeminiService;
  private genAI: GoogleGenerativeAI;
  private model: any;
  private hybridStorage: StorageService;
  private aiInsights: AIInsightsService;

  // Conversation context for chat functionality
  private chatHistory: Array<{role: 'user' | 'model', parts: string[]}> = [];

  static getInstance(): AdvancedGeminiService {
    if (!AdvancedGeminiService.instance) {
      AdvancedGeminiService.instance = new AdvancedGeminiService();
    }
    return AdvancedGeminiService.instance;
  }

  private constructor() {
    // Initialize with your Gemini API key
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      console.error('EXPO_PUBLIC_GEMINI_API_KEY is not set. AdvancedGeminiService will run in degraded mode without AI. Set EXPO_PUBLIC_GEMINI_API_KEY in your environment.');
      // @ts-ignore - allow null for genAI when API key missing
      this.genAI = null as any;
      this.model = null;
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    }
  this.hybridStorage = StorageService.getInstance();
    this.aiInsights = AIInsightsService.getInstance();
  }

  /**
   * Generate holistic summary for daily check-in
   * This powers the DailyCheckinCard component
   */
  async getHolisticSummary(userId: string): Promise<GeminiResponse> {
    try {
      if (!this.model) {
        console.warn('AI model not initialized; returning fallback holistic summary.');
        return this.getFallbackResponse();
      }
      const userData = await this.gatherHolisticData(userId);
      const prompt = this.buildHolisticPrompt(userData);

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.parseGeminiResponse(text);
    } catch (error) {
      console.error('Error generating holistic summary:', error);
      return this.getFallbackResponse();
    }
  }

  /**
   * Financial forecasting with ETS algorithm integration
   */
  async generateFinancialForecast(userId: string, categoryId?: string): Promise<{
    forecast: Array<{month: string, predicted: number, confidence: number}>;
    insights: string[];
    alerts: string[];
  }> {
    try {
      if (!this.model) {
        console.warn('AI model not initialized; returning fallback forecast results.');
        return { forecast: [], insights: [], alerts: [] };
      }
      const financialData = await this.gatherFinancialData(userId);
      const forecastData = this.applyETSForecasting(financialData, categoryId);

      const prompt = this.buildFinancialForecastPrompt(financialData, forecastData);
      const result = await this.model.generateContent(prompt);
      const text = (await result.response).text();

      return {
        forecast: forecastData,
        insights: this.extractInsights(text),
        alerts: this.generateFinancialAlerts(forecastData, financialData)
      };
    } catch (error) {
      console.error('Error generating financial forecast:', error);
      return { forecast: [], insights: [], alerts: [] };
    }
  }

  /**
   * Conversational AI chat with context memory
   */
  async chatWithAI(userId: string, userMessage: string): Promise<string> {
    // Always sanitize input first
    const sanitizedMessage = String(userMessage || '').trim();
    if (!sanitizedMessage) {
      return "I didn't receive a message. Could you please try again?";
    }

    try {
      if (!this.model) {
        console.warn('AI model not initialized; returning static response.');
        return "AI not available right now. Please try again later.";
      }
      // Initialize chat with user context if empty
      if (this.chatHistory.length === 0) {
        await this.initializeChatContext(userId);
      }

      // Add user message to history
      this.chatHistory.push({ role: 'user', parts: [sanitizedMessage] });

      // Strictly validate history objects before passing to SDK
      const validHistory = this.chatHistory
        .filter(
          (item) =>
            item &&
            typeof item === 'object' &&
            'role' in item &&
            'parts' in item &&
            (item as any).role &&
            Array.isArray((item as any).parts) &&
            (item as any).parts.length > 0 &&
            typeof (item as any).parts[0] === 'string'
        )
        .slice(-10); // keep last 10 for safety

      // Try chat mode first
      try {
        const chat = this.model.startChat({ history: validHistory });
        const result = await chat.sendMessage(sanitizedMessage);
        const response = await result.response;
        const text = response.text();
        const sanitizedResponse = String(text || '').trim();
        if (!sanitizedResponse) throw new Error('Empty response from AI');

        this.chatHistory.push({ role: 'model', parts: [sanitizedResponse] });
        if (this.chatHistory.length > 20) this.chatHistory = this.chatHistory.slice(-16);
        return sanitizedResponse;
      } catch (e) {
        // Fallback to single-shot generateContent if chat fails (avoids "in" operator errors)
        const gc = await this.model.generateContent(sanitizedMessage);
        const text = (await gc.response).text();
        const sanitizedResponse = String(text || '').trim() || 'OK';
        this.chatHistory.push({ role: 'model', parts: [sanitizedResponse] });
        return sanitizedResponse;
      }
    } catch (error) {
      console.error('Chat error:', error);
      return "I'm having trouble processing that right now. Could you try rephrasing your question?";
    }
  }
  /**
   * Gather comprehensive user data from all modules
   */
  private async gatherHolisticData(userId: string): Promise<HolisticUserData> {
    try {
      // Financial data
      const financialInsights = await this.aiInsights.generateFinancialInsights(userId);
      const financialData = await this.aiInsights['getFinancialData'](userId);

      // Health data (integrate with your Health & Wellness module)
      const healthData = await this.gatherHealthData(userId);

      // Learning data (from MindMapGeneratorService)
      const learningData = await this.gatherLearningData(userId);

      const now = new Date();

      return {
        monthlyIncome: financialData.totalIncome || 0,
        monthlyExpenses: financialData.totalExpenses || 0,
        categoryBreakdown: financialData.categoryBreakdown || {},
        budgetStatus: financialData.budgetStatus?.map(b => ({
          ...b,
          utilization: b.limit > 0 ? (b.spent / b.limit) * 100 : 0
        })) || [],
        savingsRate: financialData.totalIncome > 0 ?
          ((financialData.totalIncome - financialData.totalExpenses) / financialData.totalIncome) * 100 : 0,

        healthMetrics: healthData,
        learningMetrics: learningData,

        timeOfDay: now.getHours(),
        dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
        currentMonth: now.toLocaleDateString('en-US', { month: 'long' })
      };
    } catch (error) {
      console.error('Error gathering holistic data:', error);
      throw error;
    }
  }

  private async gatherHealthData(userId: string): Promise<HolisticUserData['healthMetrics']> {
    // This integrates with your Health & Wellness module
    // You would call CircadianIntelligenceService and other health services here

    try {
      // Placeholder - replace with actual health service calls
      const healthMetrics = await this.hybridStorage.getHealthMetrics?.(userId) || {};

      return {
        crdiScore: healthMetrics.crdiScore || 50,
        sleepQuality: healthMetrics.avgSleepQuality || 3,
        exerciseFrequency: healthMetrics.weeklyWorkouts || 0,
        stressLevel: healthMetrics.stressLevel || 50,
        recoveryScore: healthMetrics.recoveryScore || 50
      };
    } catch (error) {
      return {
        crdiScore: 50,
        sleepQuality: 3,
        exerciseFrequency: 0,
        stressLevel: 50,
        recoveryScore: 50
      };
    }
  }

  private async gatherLearningData(userId: string): Promise<HolisticUserData['learningMetrics']> {
    try {
      // Get data from MindMapGeneratorService
      // Explicitly cast hybridStorage to any to access getNeuralGraph and getStudySessions
      const hybridStorageAny = this.hybridStorage as any;
      const graph = await hybridStorageAny.getNeuralGraph?.() || null;
      const studySessions = await hybridStorageAny.getStudySessions?.() || [];

      return {
        activeNodes: graph?.nodes?.filter((n: any) => n.isActive)?.length || 0,
        masteryDistribution: this.calculateMasteryDistribution(graph?.nodes || []),
        studyStreak: this.calculateStudyStreak(studySessions),
        cognitiveLoad: graph?.nodes?.reduce((sum: number, n: any) => sum + (n.cognitiveLoad || 0), 0) / (graph?.nodes?.length || 1) || 0,
        learningGoals: this.extractLearningGoals(graph?.nodes || [])
      };
    } catch (error) {
      return {
        activeNodes: 0,
        masteryDistribution: {},
        studyStreak: 0,
        cognitiveLoad: 0.5,
        learningGoals: []
      };
    }
  }

  /**
   * Build comprehensive structured prompt for Gemini
   */
  private buildHolisticPrompt(userData: HolisticUserData): string {
    return `You are NeuroLearn AI, an advanced personal coach specializing in the intersection of learning, health, and financial wellness. Analyze this user's holistic data and provide personalized insights.

**CURRENT USER DATA:**

📊 **FINANCIAL HEALTH:**
- Monthly Income: ৳${userData.monthlyIncome.toLocaleString()}
- Monthly Expenses: ৳${userData.monthlyExpenses.toLocaleString()}
- Savings Rate: ${userData.savingsRate.toFixed(1)}%
- Budget Utilization: ${Object.entries(userData.budgetStatus).map(([_, status]) =>
  `${status.category}: ${status.utilization.toFixed(0)}%`).join(', ')}
- Top Spending: ${Object.entries(userData.categoryBreakdown)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 2)
  .map(([cat, amount]) => `${cat}: ৳${amount.toLocaleString()}`).join(', ')}

🏃 **HEALTH METRICS:**
- Sleep Consistency (CRDI): ${userData.healthMetrics.crdiScore}/100
- Sleep Quality: ${userData.healthMetrics.sleepQuality}/5
- Exercise Frequency: ${userData.healthMetrics.exerciseFrequency} times/week
- Stress Level: ${userData.healthMetrics.stressLevel}/100
- Recovery Score: ${userData.healthMetrics.recoveryScore}/100

🧠 **LEARNING PROGRESS:**
- Active Learning Nodes: ${userData.learningMetrics.activeNodes}
- Study Streak: ${userData.learningMetrics.studyStreak} days
- Cognitive Load: ${(userData.learningMetrics.cognitiveLoad * 100).toFixed(0)}%
- Learning Goals: ${userData.learningMetrics.learningGoals.join(', ') || 'None set'}

⏰ **CONTEXT:**
- Current Time: ${userData.timeOfDay}:00 on ${userData.dayOfWeek}
- Month: ${userData.currentMonth}

**ANALYSIS REQUIREMENTS:**

Provide a structured response with these exact sections:

**📚 LEARNING INSIGHTS:**
- 2-3 insights about learning progress and cognitive health
- Connection between sleep/health and learning performance

**💰 FINANCIAL INSIGHTS:**
- 2-3 insights about spending patterns and financial health
- Budget alerts if any category > 90%

**🏃 HEALTH INSIGHTS:**
- 2-3 insights about health trends and recovery
- Sleep and exercise recommendations

**🎯 TODAY'S PRIORITY:**
- Single most important action for today based on all data

**🔗 CROSS-MODULE CONNECTIONS:**
- 2-3 insights connecting health, learning, and finance
- How improvements in one area can benefit others

Keep insights concise, actionable, and encouraging. Use Bengali currency format (৳) and maintain a supportive coaching tone.`;
  }

  /**
   * Apply Exponential Smoothing (ETS) algorithm for financial forecasting
   */
  private applyETSForecasting(
    financialData: any,
    categoryId?: string
  ): Array<{month: string, predicted: number, confidence: number}> {
    // Simplified ETS implementation
    // In production, you'd use a more robust algorithm

    const historical = categoryId
      ? this.getCategoryHistory(financialData, categoryId)
      : this.getTotalSpendingHistory(financialData);

    if (historical.length < 3) {
      return []; // Need minimum data for forecasting
    }

    const forecast = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

    // Simple trend calculation
    const recent = historical.slice(-3);
    const trend = recent.length >= 2 ? (recent[recent.length - 1] - recent[recent.length - 2]) : 0;
    const lastValue = recent[recent.length - 1];

    for (let i = 0; i < 3; i++) {
      const predicted = Math.max(0, lastValue + (trend * (i + 1)));
      const confidence = Math.max(0.3, 0.9 - (i * 0.2)); // Decreasing confidence

      forecast.push({
        month: months[i],
        predicted: Math.round(predicted),
        confidence: Math.round(confidence * 100)
      });
    }

    return forecast;
  }

  private getCategoryHistory(financialData: any, categoryId: string): number[] {
    // Extract historical data for specific category
    // This would integrate with your actual transaction history
    return [1000, 1200, 1100]; // Placeholder
  }

  private getTotalSpendingHistory(financialData: any): number[] {
    // Extract total spending history
    return [15000, 16000, 14500]; // Placeholder
  }

  /**
   * Parse Gemini response into structured format
   */
  private parseGeminiResponse(text: string): GeminiResponse {
    const sections = text.split('**');

    return {
      insights: [
        ...this.extractSection(text, 'LEARNING INSIGHTS'),
        ...this.extractSection(text, 'FINANCIAL INSIGHTS'),
        ...this.extractSection(text, 'HEALTH INSIGHTS')
      ],
      recommendations: this.extractSection(text, "TODAY'S PRIORITY"),
      prioritizedActions: this.extractSection(text, "TODAY'S PRIORITY"),
      crossModuleConnections: this.extractSection(text, 'CROSS-MODULE CONNECTIONS')
    };
  }

  private extractSection(text: string, sectionName: string): string[] {
    const regex = new RegExp(`\\*\\*${sectionName}:?\\*\\*([\\s\\S]*?)(?=\\*\\*|$)`, 'i');
    const match = text.match(regex);

    if (match && match[1]) {
      return match[1]
        .trim()
        .split('\n')
        .filter((line: string) => line.trim().length > 0)
        .map((line: string) => line.replace(/^[-•*]\s*/, '').trim())
        .filter((line: string) => line.length > 0);
    }

    return [];
  }

  private async initializeChatContext(userId: string): Promise<void> {
    // Use static context to avoid data gathering issues
    const contextPrompt = `You are NeuroLearn AI, a personal coach specializing in the intersection of learning, health, and financial wellness. Be helpful, encouraging, and connect insights across health, learning, and finance when relevant.`;

    // Create fresh objects to avoid prototype issues
    this.chatHistory = [
      Object.assign({}, { role: 'user' as const, parts: ['Initialize context'] }),
      Object.assign({}, { role: 'model' as const, parts: [contextPrompt] })
    ];
  }

  private generateFinancialAlerts(forecast: any[], currentData: any): string[] {
    const alerts = [];

    // Check for concerning forecast trends
    if (forecast.length >= 2 && forecast.some(f => f.predicted > currentData.monthlyIncome * 0.9)) {
      alerts.push(`⚠️ Predicted spending may exceed 90% of income next month`);
    }

    // Check budget overruns
    currentData.budgetStatus?.forEach((budget: any) => {
      if (budget.utilization > 100) {
        alerts.push(`🚨 Over budget in ${budget.category}: ${budget.utilization.toFixed(0)}%`);
      } else if (budget.utilization > 85) {
        alerts.push(`⚠️ Approaching budget limit in ${budget.category}: ${budget.utilization.toFixed(0)}%`);
      }
    });

    return alerts;
  }

  private extractInsights(text: string): string[] {
    return text
      .split('\n')
      .filter(line => line.includes('insight') || line.includes('recommend') || line.includes('should'))
      .slice(0, 3);
  }

  private getFallbackResponse(): GeminiResponse {
    return {
      insights: [
        "Continue tracking your expenses to build better spending awareness",
        "Focus on maintaining consistent sleep patterns for optimal cognitive function",
        "Set small, achievable learning goals to build momentum"
      ],
      recommendations: [
        "Review your budget categories and spending patterns",
        "Prioritize 7-8 hours of quality sleep tonight",
        "Complete one active learning session today"
      ],
      prioritizedActions: [
        "Focus on your highest-impact learning goal today"
      ],
      crossModuleConnections: [
        "Better sleep leads to improved financial decision-making",
        "Regular learning routine can increase earning potential",
        "Reduced financial stress improves sleep quality"
      ]
    };
  }

  // Helper methods for learning data processing
  private calculateMasteryDistribution(nodes: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    nodes.forEach(node => {
      const level = node.masteryLevel || 0;
      const category = level < 0.3 ? 'beginner' :
                     level < 0.7 ? 'intermediate' : 'advanced';
      distribution[category] = (distribution[category] || 0) + 1;
    });

    return distribution;
  }

  private calculateStudyStreak(sessions: any[]): number {
    if (sessions.length === 0) return 0;

    const today = new Date();
    let streak = 0;

    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = checkDate.toISOString().split('T');

      const hasSession = sessions.some(session =>
        session.date?.startsWith(dateStr)
      );

      if (hasSession) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private extractLearningGoals(nodes: any[]): string[] {
    return nodes
      .filter(node => node.type === 'goal' || node.category === 'goal')
      .map(node => node.label || node.content)
      .slice(0, 3);
  }

  private async gatherFinancialData(userId: string) {
    return this.aiInsights['getFinancialData'](userId);
  }

  private buildFinancialForecastPrompt(current: any, forecast: any[]): string {
    return `Analyze this financial forecast and provide insights:

Current: Income ৳${current.totalIncome}, Expenses ৳${current.totalExpenses}
Forecast: ${forecast.map(f => `${f.month}: ৳${f.predicted} (${f.confidence}% confidence)`).join(', ')}

Provide 3 key insights and 2 actionable recommendations.`;
  }
}

export default AdvancedGeminiService;
