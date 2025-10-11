// Thin compatibility shim for PredictiveAnalyticsService
import * as Canonical from '../ai/PredictiveAnalyticsService';

const svcAny: any = (Canonical as any).getInstance ? (Canonical as any).getInstance() : (Canonical as any);

const PredictiveAnalyticsCompat = {
  async predictSpendingTrends(analysis: any) {
    if (svcAny && typeof svcAny.predictSpendingTrends === 'function') return svcAny.predictSpendingTrends(analysis);
    if (svcAny && typeof svcAny.predict === 'function') return svcAny.predict(analysis);
    return { trends: [], confidence: 0 };
  },

  async predictFinancialTrends(params: any) {
    if (svcAny && typeof svcAny.predictFinancialTrends === 'function') return svcAny.predictFinancialTrends(params);
    if (svcAny && typeof svcAny.predict === 'function') return svcAny.predict(params);
    return { insights: [], confidence: 0 };
  },

  async predict(data: any) {
    if (svcAny && typeof svcAny.predict === 'function') return svcAny.predict(data);
    return { prediction: null, confidence: 0 };
  }
};

export default PredictiveAnalyticsCompat;
