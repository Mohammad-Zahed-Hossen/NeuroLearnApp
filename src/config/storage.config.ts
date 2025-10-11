// Central storage configuration (hot / warm / cold tiers)
export const STORAGE_CONFIG = {
  hot: {
    // approximate maximum bytes for MMKV hot cache (10 MB default)
    maxSize: 10 * 1024 * 1024,
    retention: 48 * 60 * 60 * 1000, // 48 hours
    checkInterval: 30 * 60 * 1000, // 30 minutes
  },
  warm: {
    maxRecords: 10000,
    retention: 30 * 24 * 60 * 60 * 1000, // 30 days
    syncInterval: 15 * 60 * 1000, // 15 minutes
  },
  cold: {
    batchSize: 50,
    compression: true,
    retryAttempts: 3,
    retryDelay: 5000, // ms
  },
  monitoring: {
    baseInterval: 5 * 60 * 1000,
    adaptiveScaling: true,
    pauseWhenIdle: true,
    significantChangeThreshold: 0.15,
  },
} as const;

export type StorageConfig = typeof STORAGE_CONFIG;
