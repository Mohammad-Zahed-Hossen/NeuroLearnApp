import { ContextSensorService } from '../../services/ai/ContextSensorService';

// Thin compatibility shim exposing initialize() and getEnvironmentalContext()
const svcAny: any = (ContextSensorService as any).getInstance ? (ContextSensorService as any).getInstance() : (ContextSensorService as any);

export default {
  async initialize() {
    // ContextSensorService is lazy; ensure instance exists by calling getCurrentContext
    try {
      if (typeof svcAny.getCurrentContext === 'function') {
        await svcAny.getCurrentContext(false);
      }
    } catch (e) {
      // ignore
    }
  },

  async getCurrentContext(forceRefresh: boolean = false) {
    if (typeof svcAny.getCurrentContext === 'function') {
      return svcAny.getCurrentContext(forceRefresh);
    }
    // fallback: try getCurrentContext without args
    return svcAny.getCurrentContext ? svcAny.getCurrentContext() : {};
  },

  async getEnvironmentalContext(forceRefresh: boolean = false) {
    // Return a lightweight environmental subset expected by adapters
    const ctx = typeof svcAny.getCurrentContext === 'function' ? await svcAny.getCurrentContext(forceRefresh) : {};
    return {
      timeIntelligence: ctx.timeIntelligence || {},
      locationContext: ctx.locationContext || {},
      digitalBodyLanguage: ctx.digitalBodyLanguage || {},
      batteryLevel: ctx.batteryLevel,
      networkQuality: ctx.networkQuality
    };
  }
};
