// Lightweight performance mark helper
// Guards the global performance API and provides consistent naming for marks/measures.

export const perf = {
  isSupported: typeof performance !== 'undefined' && typeof performance.mark === 'function',
  startMark: (screenId: string) => {
    try {
      if (typeof performance !== 'undefined' && performance.mark) {
        const mark = `${screenId}:mount:${Date.now()}`;
        performance.mark(mark);
        return mark;
      }
    } catch (e) {
      // ignore
    }
    return null;
  },
  measureReady: (screenId: string, mountMark?: string | null) => {
    try {
      if (
        !mountMark ||
        typeof performance === 'undefined' ||
        typeof performance.measure !== 'function'
      ) {
        return null;
      }
      const measureName = `${screenId}:ready:${Date.now()}`;
      performance.measure(measureName, mountMark);
      const entries = performance.getEntriesByName(measureName);
      const entry = entries && entries.length ? entries[entries.length - 1] : null;
      // Log a compact, parseable line for collection
      // eslint-disable-next-line no-console
      console.log('[perf]', screenId, measureName, entry ? { duration: entry.duration } : null);
      return entry || null;
    } catch (e) {
      return null;
    }
  },
};
