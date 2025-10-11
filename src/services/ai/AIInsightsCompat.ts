/**
 * AIInsights / PredictiveAnalytics compatibility shim
 */
import AIInsightsService from './AIInsightsService';
import { PredictiveAnalyticsService } from './PredictiveAnalyticsService';

const aiAny: any = (AIInsightsService as any).default || AIInsightsService;
const predAny: any = (PredictiveAnalyticsService as any).default || PredictiveAnalyticsService;

const AIInsightsCompat: any = {
  async initialize() {
    if (typeof aiAny.initialize === 'function') await aiAny.initialize();
    if (typeof predAny.initialize === 'function') await predAny.initialize();
    return Promise.resolve();
  },
  async analyzePatterns(data: any, opts?: any) {
    if (typeof aiAny.analyzePatterns === 'function') return aiAny.analyzePatterns(data, opts);
    if (typeof aiAny.analyze === 'function') return aiAny.analyze(data, opts);
    return Promise.resolve([]);
  },
  async analyzeLearningSession(session: any) {
    if (typeof aiAny.analyzeLearningSession === 'function') return aiAny.analyzeLearningSession(session);
    if (typeof aiAny.analyzeSession === 'function') return aiAny.analyzeSession(session);
    return Promise.resolve(null);
  },
  async predictTrends(query: any) {
    if (typeof predAny.predictTrends === 'function') return predAny.predictTrends(query);
    if (typeof predAny.predict === 'function') return predAny.predict(query);
    return Promise.resolve([]);
  },
  async predictSpendingTrends(data: any) {
    if (typeof predAny.predictSpendingTrends === 'function') return predAny.predictSpendingTrends(data);
    if (typeof predAny.predictFinancialTrends === 'function') return predAny.predictFinancialTrends(data);
    return Promise.resolve([]);
  },
  async optimizeLearningPath(opts: any) {
    if (typeof aiAny.optimizeLearningPath === 'function') return aiAny.optimizeLearningPath(opts);
    return Promise.resolve(null);
  },
  async getModelPerformance() {
    if (typeof aiAny.getModelPerformance === 'function') return aiAny.getModelPerformance();
    if (typeof predAny.getModelPerformance === 'function') return predAny.getModelPerformance();
    return Promise.resolve({ accuracy: 0 });
  },
  async analyzeSpendingPatterns(data: any) {
    if (typeof aiAny.analyzeSpendingPatterns === 'function') return aiAny.analyzeSpendingPatterns(data);
    return Promise.resolve([]);
  }
};

export default AIInsightsCompat;
