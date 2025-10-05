/**
 * EyeTrackingService - lightweight simulated eye-tracking for attention metrics
 *
 * This implementation is intentionally JS-friendly and does not depend on
 * native ML models. It provides a pluggable interface so a real ML pipeline
 * (Vision Camera + frame processors) can replace the simulate methods later.
 */

export interface EyeTrackingMetrics {
  blinkRate: number; // blinks per minute
  gazeStability: number; // 0-1
  attentionScore: number; // 0-1
  headPosition: { x: number; y: number; z: number };
  lastBlinkTimestamp: number;
  isUserPresent: boolean;
}

export class EyeTrackingService {
  private static instance: EyeTrackingService;
  private isTracking = false;
  private metrics: EyeTrackingMetrics;
  private blinkCount = 0;
  private lastMetricsUpdate = Date.now();
  private metricsInterval: NodeJS.Timeout | null = null;

  private readonly ATTENTION_THRESHOLDS = {
    high: { maxBlinkRate: 12, minStability: 0.8 },
    medium: { maxBlinkRate: 18, minStability: 0.6 },
    low: { maxBlinkRate: 25, minStability: 0.4 },
  };

  public static getInstance(): EyeTrackingService {
    if (!EyeTrackingService.instance) {
      EyeTrackingService.instance = new EyeTrackingService();
    }
    return EyeTrackingService.instance;
  }

  private constructor() {
    this.metrics = {
      blinkRate: 15,
      gazeStability: 0.7,
      attentionScore: 0.5,
      headPosition: { x: 0, y: 0, z: 1 },
      lastBlinkTimestamp: 0,
      isUserPresent: false,
    };
  }

  public async initialize(): Promise<boolean> {
    // Placeholder: in real app check camera permissions
    console.log('EyeTrackingService initialized (simulated)');
    return true;
  }

  public startTracking(): void {
    if (this.isTracking) return;
    this.isTracking = true;
    this.blinkCount = 0;
    this.lastMetricsUpdate = Date.now();

    this.metricsInterval = setInterval(() => this.calculateMetrics(), 1000);
    console.log('EyeTrackingService: tracking started');
  }

  public stopTracking(): void {
    this.isTracking = false;
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    console.log('EyeTrackingService: tracking stopped');
  }

  // Simulate blink detection
  public detectBlink(): void {
    const now = Date.now();
    if (now - this.metrics.lastBlinkTimestamp < 200) return;
    this.blinkCount++;
    this.metrics.lastBlinkTimestamp = now;
  }

  private calculateMetrics(): void {
    if (!this.isTracking) return;
    const now = Date.now();
    const minutes = (now - this.lastMetricsUpdate) / 1000 / 60;
    if (minutes > 0) {
      this.metrics.blinkRate = this.blinkCount / minutes;
      this.blinkCount = 0;
      this.lastMetricsUpdate = now;
    }

    // Randomized gaze stability for simulation
    this.metrics.gazeStability = Math.max(
      0.1,
      Math.min(1, 0.7 + (Math.random() * 0.3 - 0.15)),
    );
    this.metrics.headPosition = {
      x: Math.sin(Date.now() / 5000) * 0.05,
      y: Math.cos(Date.now() / 3000) * 0.03,
      z: 1 + Math.sin(Date.now() / 7000) * 0.01,
    };
    this.metrics.isUserPresent = true;

    this.metrics.attentionScore = this.calculateAttentionScore();
  }

  private calculateAttentionScore(): number {
    const blinkScore = Math.max(
      0,
      1 - Math.abs(this.metrics.blinkRate - 17.5) / 17.5,
    );
    return Math.max(
      0,
      Math.min(1, blinkScore * 0.6 + this.metrics.gazeStability * 0.4),
    );
  }

  public getMetrics(): EyeTrackingMetrics {
    return { ...this.metrics };
  }

  public getCognitiveLoad(): number {
    const { attentionScore, blinkRate } = this.metrics;
    if (
      attentionScore > 0.8 &&
      blinkRate < this.ATTENTION_THRESHOLDS.high.maxBlinkRate
    ) {
      return 0.8;
    } else if (
      attentionScore > 0.6 &&
      blinkRate < this.ATTENTION_THRESHOLDS.medium.maxBlinkRate
    ) {
      return 0.6;
    }
    return 0.4;
  }

  public shouldTakeBreak(): { needed: boolean; reason: string } {
    const { blinkRate, gazeStability, attentionScore } = this.metrics;
    if (blinkRate < 8)
      return { needed: true, reason: 'Low blink rate indicates intense focus' };
    if (gazeStability < 0.3)
      return {
        needed: true,
        reason: 'Unstable gaze indicates distraction or fatigue',
      };
    if (attentionScore > 0.9 && blinkRate < 10)
      return { needed: true, reason: 'Extended intense focus detected' };
    return { needed: false, reason: '' };
  }
}

export const eyeTrackingService = EyeTrackingService.getInstance();
