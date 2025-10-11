import HybridStorageService from '../storage/HybridStorageService';

export class BiometricIntegrationService {
  private static instance: BiometricIntegrationService;

  private constructor() {}

  public static getInstance(): BiometricIntegrationService {
    if (!BiometricIntegrationService.instance) BiometricIntegrationService.instance = new BiometricIntegrationService();
    return BiometricIntegrationService.instance;
  }

  public async initialize(): Promise<boolean> {
    // No-op for now; in future this can set up sensor integrations
    return Promise.resolve(true);
  }

  /**
   * Return latest biometric metrics dynamically from HybridStorageService.
   * This ensures the app displays live data from the storage pipeline rather than hardcoded values.
   */
  public async getLatestMetrics(userId?: string): Promise<{ heartRate?: number | null; hrv?: number | null; spo2?: number | null }> {
    try {
      const uid = userId || 'current_user';
      const svc: any = HybridStorageService.getInstance();
      if (svc && typeof svc.getHealthMetrics === 'function') {
        const metrics = await svc.getHealthMetrics(uid);
        // normalize shape
        const heartRate = metrics?.heartRate ?? metrics?.heart_rate ?? metrics?.hr ?? null;
        const hrv = metrics?.hrv ?? metrics?.hrvScore ?? null;
        const spo2 = metrics?.spo2 ?? null;
        return { heartRate, hrv, spo2 };
      }
    } catch (e) {
      // swallow and return nulls - best-effort dynamic behavior
    }
    return { heartRate: null, hrv: null, spo2: null };
  }

  public async getHeartRate(userId?: string): Promise<number | undefined> {
    const m = await this.getLatestMetrics(userId);
    if (m.heartRate == null) return undefined;
    return Number(m.heartRate);
  }

  public async getHRV(userId?: string): Promise<number | undefined> {
    const m = await this.getLatestMetrics(userId);
    if (m.hrv == null) return undefined;
    return Number(m.hrv);
  }
}

export default BiometricIntegrationService;
