/**
 * MemoryManager - Centralized memory management and cleanup system
 * Prevents memory leaks by tracking and cleaning up resources
 */

export class MemoryManager {
  private static instance: MemoryManager;
  private cleanupTasks: Map<string, () => void> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private listeners: Map<string, { target: any; event: string; handler: any }> = new Map();
  private caches: Map<string, () => void> = new Map();

  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  registerCleanup(id: string, cleanup: () => void) {
    this.cleanupTasks.set(id, cleanup);
  }

  registerInterval(id: string, interval: NodeJS.Timeout) {
    this.intervals.set(id, interval);
  }

  /**
   * Register a named cache clear function that can be used during soft reset
   */
  registerCache(id: string, clearFn: () => void) {
    this.caches.set(id, clearFn);
  }

  registerListener(id: string, target: any, event: string, handler: any) {
    this.listeners.set(id, { target, event, handler });
  }

  cleanup(id?: string) {
    if (id) {
      // Clean specific resource
      this.cleanupTasks.get(id)?.();
      this.cleanupTasks.delete(id);

      const interval = this.intervals.get(id);
      if (interval) {
        clearInterval(interval);
        this.intervals.delete(id);
      }

      const listener = this.listeners.get(id);
      if (listener) {
        // Prefer `.off` where available, fall back to `removeListener` for other APIs
        if (typeof listener.target.off === 'function') {
          try {
            listener.target.off(listener.event, listener.handler);
          } catch (e) {
            listener.target.removeListener?.(listener.event, listener.handler);
          }
        } else {
          listener.target.removeListener?.(listener.event, listener.handler);
        }
        this.listeners.delete(id);
      }
    } else {
      // Clean all resources
      this.cleanupTasks.forEach(cleanup => cleanup());
      this.cleanupTasks.clear();

      this.intervals.forEach(interval => clearInterval(interval));
      this.intervals.clear();

      this.listeners.forEach(({ target, event, handler }) => {
        if (typeof target.off === 'function') {
          try {
            target.off(event, handler);
          } catch (e) {
            target.removeListener?.(event, handler);
          }
        } else {
          target.removeListener?.(event, handler);
        }
      });
      this.listeners.clear();
    }
  }

  /**
   * Soft reset: clear caches but keep intervals/listeners intact.
   * This is intended to be a low-risk mitigation step to reduce memory usage
   * without tearing down the whole app.
   */
  softReset() {
    try {
      this.caches.forEach((clearFn, key) => {
        try {
          clearFn();
        } catch (e) {
          // swallow
        }
      });

      // Also run lightweight cleanup tasks (not destructive)
      this.cleanupTasks.forEach((fn, id) => {
        try {
          // Only call cleanup tasks that are marked as low-risk via id prefix
          if (id.startsWith('cache:') || id.startsWith('temp:')) {
            fn();
          }
        } catch (e) {
          // ignore
        }
      });

      // Attempt to run user-land GC where available
      if (typeof (global as any).gc === 'function') {
        try { (global as any).gc(); } catch (e) { /* ignore */ }
      }
    } catch (e) {
      // ignore soft-reset errors
    }
  }

  getMemoryUsage() {
    return {
      cleanupTasks: this.cleanupTasks.size,
      intervals: this.intervals.size,
      listeners: this.listeners.size
    };
  }
}
