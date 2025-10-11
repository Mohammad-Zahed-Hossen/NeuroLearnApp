// Metro bundler rejects dynamic require(path) calls. Use static require fallbacks.
const tryRequire = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('./FocusTimerService');
    return mod && (mod.default || mod);
  } catch (e) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod2 = require('../../services/learning/FocusTimerService');
      return mod2 && (mod2.default || mod2);
    } catch (e2) {
      return null;
    }
  }
};

const canonical = tryRequire();

const FocusTimerCompat: any = {
  getInstance() {
    if (canonical && canonical.getInstance) return canonical.getInstance();
    return FocusTimerCompat;
  },

  async startSession(taskIdOrConfig: any, nodeId?: string, plannedDurationMinutes?: number, cognitiveLoadStart?: number) {
    const inst = canonical && canonical.getInstance ? canonical.getInstance() : canonical;
    if (!inst) return Promise.resolve({ sessionId: 'compat_session', success: true });

    // Support legacy callers that pass a single config object
    if (taskIdOrConfig && typeof taskIdOrConfig === 'object' && !nodeId) {
      // try to map
      const cfg = taskIdOrConfig;
      return inst.startSession(cfg.taskId || cfg.id || 'task_compat', cfg.nodeId, cfg.plannedDurationMinutes || 25, cfg.cognitiveLoadStart || 0);
    }

    return inst.startSession(taskIdOrConfig, nodeId, plannedDurationMinutes, cognitiveLoadStart);
  },

  async pauseSession(sessionId: string) {
    const inst = canonical && canonical.getInstance ? canonical.getInstance() : canonical;
    if (inst && typeof inst.pauseSession === 'function') return inst.pauseSession(sessionId);
    return Promise.resolve();
  }
};

export default FocusTimerCompat;
