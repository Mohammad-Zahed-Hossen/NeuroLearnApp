/* Compatibility shim for legacy AdvancedGeminiService API expected by orchestrators */
// This shim will forward calls to the canonical implementation when available
// and provide safe no-op/default responses otherwise.

// Metro bundler rejects dynamic require(path) calls. Use static require fallbacks.
const tryRequire = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('./AdvancedGeminiService');
    return mod && (mod.default || mod);
  } catch (e) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod2 = require('../../services/ai/AdvancedGeminiService');
      return mod2 && (mod2.default || mod2);
    } catch (e2) {
      return null;
    }
  }
};

const canonical = tryRequire();

const AdvancedGeminiCompat: any = {
  async initialize(...args: any[]) {
    if (canonical) {
      if (canonical.getInstance) return canonical.getInstance().initialize?.(...args);
      if (typeof canonical.initialize === 'function') return canonical.initialize(...args);
    }
    return Promise.resolve(true);
  },

  async generateRecommendations(context: any) {
    if (canonical) {
      const inst = canonical.getInstance ? canonical.getInstance() : canonical;
      if (inst && typeof inst.generateRecommendations === 'function') return inst.generateRecommendations(context);
    }
    return Promise.resolve([]);
  },

  async generateStressReductionPlan(context: any) {
    if (canonical) {
      const inst = canonical.getInstance ? canonical.getInstance() : canonical;
      if (inst && typeof inst.generateStressReductionPlan === 'function') return inst.generateStressReductionPlan(context);
    }
    return Promise.resolve(null);
  },

  async pauseBackgroundAnalysis() {
    if (canonical) {
      const inst = canonical.getInstance ? canonical.getInstance() : canonical;
      if (inst && typeof inst.pauseBackgroundAnalysis === 'function') return inst.pauseBackgroundAnalysis();
    }
    return Promise.resolve();
  }
};

export default AdvancedGeminiCompat;
