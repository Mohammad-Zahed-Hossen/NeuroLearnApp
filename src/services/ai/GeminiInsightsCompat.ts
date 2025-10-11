/* Compatibility shim for legacy GeminiInsightsService API expected by orchestrators */

// Metro bundler rejects dynamic require(path) calls. Use static require fallbacks.
const tryRequire = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('./GeminiInsightsService');
    return mod && (mod.default || mod);
  } catch (e) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod2 = require('../../services/ai/GeminiInsightsService');
      return mod2 && (mod2.default || mod2);
    } catch (e2) {
      return null;
    }
  }
};

const canonical = tryRequire();

const GeminiInsightsCompat: any = {
  async pauseBackgroundAnalysis() {
    if (canonical) {
      const inst = canonical.getInstance ? canonical.getInstance() : canonical;
      if (inst && typeof inst.pauseBackgroundAnalysis === 'function') return inst.pauseBackgroundAnalysis();
    }
    return Promise.resolve();
  },

  async analyzeSession(session: any) {
    if (canonical) {
      const inst = canonical.getInstance ? canonical.getInstance() : canonical;
      if (inst && typeof inst.analyzeSession === 'function') return inst.analyzeSession(session);
    }
    return Promise.resolve({ insights: [], metrics: {} });
  }
};

export default GeminiInsightsCompat;
