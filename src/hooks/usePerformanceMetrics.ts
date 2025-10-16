import { useRef } from 'react';

type Tracker = { end: () => void };

export function usePerformanceMetrics() {
  const trackers = useRef<Record<string, number>>({});

  function trackScreenLoad(screenName: string): Tracker {
    const start = Date.now();
    trackers.current[screenName] = start;

    return {
      end: () => {
        const s = trackers.current[screenName] ?? start;
        const duration = Date.now() - s;
        // TODO: wire this into analytics/telemetry in the future
        // For now, emit a console metric which will be visible during local testing
        // and can be picked up by an attached logger.
        // Keep message concise for parsers.
        // eslint-disable-next-line no-console
        console.debug(`[perf] screen_load:${screenName} ${duration}ms`);
        // cleanup
        delete trackers.current[screenName];
      },
    };
  }

  return { trackScreenLoad };
}

export default usePerformanceMetrics;
