/*
 * Compatibility shim for Cognitive Aura Service
 *
 * Many adapters and orchestrators expect legacy method names such as
 * initialize(), getCurrentState(), getPatterns(), predictStateChanges(), optimizeForTask(), etc.
 * The canonical service lives in src/services/ai/CognitiveAuraService.ts and exposes
 * methods like getAuraState(), getCurrentAuraState(), refreshAuraState(), recordPerformance(), etc.
 *
 * This file provides thin wrappers with the legacy names that forward to the
 * canonical implementations. Keep this file minimal and non-invasive.
 */

import { cognitiveAuraService } from '../ai/CognitiveAuraService';

// Re-export the singleton for callers that import the instance directly
// Use `any` to remain flexible for legacy method names expected by adapters
export const CognitiveAuraCompat: any = {
  // legacy: initialize -> no-op (service is singleton and lazily initialized)
  async initialize() {
    // force initialization by calling a safe method
    try {
      await cognitiveAuraService.getCurrentAuraState();
    } catch (e) {
      // ignore errors during compatibility init
    }
  },

  // legacy getter alias
  async getCurrentState() {
    return cognitiveAuraService.getCurrentAuraState();
  },

  // modern canonical names mapped as expected
  async getAuraState(forceRefresh: boolean = false) {
    return cognitiveAuraService.getAuraState(forceRefresh);
  },

  async refreshAuraState() {
    return cognitiveAuraService.refreshAuraState();
  },

  async getPatterns() {
    // There is no single getPatterns; expose contextPatterns via getContextAnalytics
    const analytics = cognitiveAuraService.getContextAnalytics();
    return analytics.environmentalPatterns || [];
  },

  async predictStateChanges(...args: any[]) {
    // Forward to private predictive method via refresh path or existing public API
    // Best-effort: call getAuraState and return anticipatedStateChanges
    const state = await cognitiveAuraService.getAuraState(false);
    return state ? state.anticipatedStateChanges : [];
  },

  async optimizeForTask(task: string) {
    // No direct mapping; heuristically trigger a refresh and return current learningPrescription
    const state = await cognitiveAuraService.getAuraState(true);
    return state ? state.learningPrescription : null;
  },

  async recordPerformance(metrics: any) {
    return cognitiveAuraService.recordPerformance(metrics as any);
  },

  getPerformanceStats() {
    return cognitiveAuraService.getPerformanceStats();
  },

  clearCaches() {
    return cognitiveAuraService.clearCaches();
  }
};

// Default export for legacy require/import styles
export default CognitiveAuraCompat;
