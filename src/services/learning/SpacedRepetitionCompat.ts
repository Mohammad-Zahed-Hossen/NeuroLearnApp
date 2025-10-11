// Metro bundler rejects dynamic require(path) calls. Use static require fallbacks instead.
const tryRequire = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('./SpacedRepetitionService');
    return mod && (mod.default || mod);
  } catch (e) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod2 = require('../../services/learning/SpacedRepetitionService');
      return mod2 && (mod2.default || mod2);
    } catch (e2) {
      return null;
    }
  }
};

const canonical = tryRequire();

const SpacedRepetitionCompat: any = {
  getInstance() {
    if (canonical && canonical.getInstance) return canonical.getInstance();
    return SpacedRepetitionCompat;
  },

  async reduceDifficulty() {
    const inst = canonical && canonical.getInstance ? canonical.getInstance() : canonical;
    if (inst && typeof inst.reduceDifficulty === 'function') return inst.reduceDifficulty();
    return Promise.resolve();
  },

  async reviewBatch(...args: any[]) {
    const inst = canonical && canonical.getInstance ? canonical.getInstance() : canonical;
    if (inst && typeof inst.reviewBatch === 'function') return inst.reviewBatch(...args);
    return Promise.resolve({ success: true });
  },

  async pauseSession(sessionId: string) {
    const inst = canonical && canonical.getInstance ? canonical.getInstance() : canonical;
    if (inst && typeof inst.pauseSession === 'function') return inst.pauseSession(sessionId);
    return Promise.resolve();
  },

  async startReviewSession(...args: any[]) {
    const inst = canonical && canonical.getInstance ? canonical.getInstance() : canonical;
    if (inst && typeof inst.startReviewSession === 'function') return inst.startReviewSession(...args);
    return Promise.resolve({ success: true });
  },

  async enableAdaptiveDifficulty() {
    const inst = canonical && canonical.getInstance ? canonical.getInstance() : canonical;
    if (inst && typeof inst.enableAdaptiveDifficulty === 'function') return inst.enableAdaptiveDifficulty();
    return Promise.resolve();
  }
};

export default SpacedRepetitionCompat;
