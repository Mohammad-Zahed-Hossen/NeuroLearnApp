/**
 * TelemetrySink - registers with HybridStorageService to forward migration/cleanup metrics
 * to the app analytics backend if available, or to console as a fallback.
 */
import HybridStorageService from './HybridStorageService';

let analytics: any = null;
try {
  // Try to load an optional AnalyticsService if present
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  analytics = require('../analytics/AnalyticsService').default;
} catch (e) {
  analytics = null;
}

function forwardMetrics(metrics: any) {
  try {
    if (analytics && typeof analytics.track === 'function') {
      analytics.track('storage.metrics', metrics);
    } else if (analytics && typeof analytics.sendEvent === 'function') {
      analytics.sendEvent('storage.metrics', metrics);
    } else {
      // Fallback: log to console
      console.info('TelemetrySink: storage.metrics', metrics);
    }
  } catch (e) {
    // swallow
  }
}

// Register sink with HybridStorageService
try {
  HybridStorageService.getInstance().registerTelemetrySink(forwardMetrics);
} catch (e) {
  // ignore registration failures (e.g., in tests where HybridStorageService is mocked)
}

export default {
  forwardMetrics,
};
