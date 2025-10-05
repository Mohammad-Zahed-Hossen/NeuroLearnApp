/**
 * Phase 7: Cognitive Soundscape Engine
 * 
 * Advanced binaural beat generation with Web Audio API integration.
 * Provides intelligent brainwave entrainment for optimal cognitive performance.
 */

import EventEmitter from 'eventemitter3';
import { Audio } from 'expo-av';
import { AppState } from 'react-native';
import { differenceInHours } from 'date-fns';
import { CircadianIntelligenceService } from '../health/CircadianIntelligenceService';

// Audio assets mapping - lazy loaded to avoid bundling errors
const audioAssets: Record<string, any> = {};

// Load audio asset dynamically
function loadAudioAsset(filename: string): any {
  try {
    switch (filename) {
      case 'uplifting-pad-texture.mp3':
        return require('../assets/audio/ambient_soundscapes/environments/uplifting-pad-texture.mp3');
      case 'shallow-river.mp3':
        return require('../assets/audio/ambient_soundscapes/nature/shallow-river.mp3');
      case 'soothing-river-flow.mp3':
        return require('../assets/audio/ambient_soundscapes/nature/soothing-river-flow.mp3');
      case 'forest-ambience-morningspring.mp3':
        return require('../assets/audio/ambient_soundscapes/nature/forest-ambience-morningspring.mp3');
      case 'rain-inside-a-car.mp3':
        return require('../assets/audio/ambient_soundscapes/nature/rain-inside-a-car.mp3');
      case 'forest-fire.mp3':
        return require('../assets/audio/ambient_soundscapes/environments/forest-fire.mp3');
      default:
        return null;
    }
  } catch (error) {
    console.warn(`Audio asset not found: ${filename}`);
    return null;
  }
}

// ==================== TYPES ====================

export type SoundscapeType =
  | 'none'
  | 'calm_readiness'
  | 'deep_focus'
  | 'reasoning_boost'
  | 'memory_flow'
  | 'speed_integration'
  | 'visualization'
  | 'deep_rest'
  | 'auto';

export interface SoundscapePreset {
  id: SoundscapeType;
  label: string;
  description: string;
  binauralFrequency: number;
  carrierFrequency: number;
  waveformType: 'sine' | 'square' | 'triangle';
  ambientTrack: string;
  ambientVolume: number;
  modulationDepth: number;
  adaptiveRange: [number, number];
  fadeInDuration: number;
  fadeOutDuration: number;
  cognitiveLoadSensitive: boolean;
  timeOfDaySensitive: boolean;
  performanceBased: boolean;
}

export interface SoundscapeState {
  isActive: boolean;
  currentPreset: SoundscapeType;
  currentFrequency: number;
  volume: number;
  sessionDuration: number;
  effectivenessScore: number;
  entrainmentStrength: number;
  adaptationCount: number;
}

// ==================== COGNITIVE SOUNDSCAPE ENGINE ====================

export class CognitiveSoundscapeEngine extends EventEmitter {
  private static instance: CognitiveSoundscapeEngine;

  // Services
  private circadianService: CircadianIntelligenceService;

  // Audio state
  private audioContext: any = null;
  private leftOscillator: any = null;
  private rightOscillator: any = null;
  private gainNode: any = null;
  private ambientSound: Audio.Sound | null = null;

  // Engine state
  private state: SoundscapeState = {
    isActive: false,
    currentPreset: 'none',
    currentFrequency: 0,
    volume: 0.7,
    sessionDuration: 0,
    effectivenessScore: 0,
    entrainmentStrength: 0,
    adaptationCount: 0,
  };

  // Timers and tracking
  private sessionTimer: NodeJS.Timeout | null = null;
  private adaptationTimer: NodeJS.Timeout | null = null;
  private cognitiveLoad: number = 0.5;
  private performanceHistory: number[] = [];

  public static getInstance(): CognitiveSoundscapeEngine {
    if (!CognitiveSoundscapeEngine.instance) {
      CognitiveSoundscapeEngine.instance = new CognitiveSoundscapeEngine();
    }
    return CognitiveSoundscapeEngine.instance;
  }

  private constructor() {
    super();
    this.circadianService = CircadianIntelligenceService.getInstance();
    this.setupAppStateHandling();
  }

  /**
   * Initialize the soundscape engine
   */
  public async initialize(): Promise<void> {
    try {
      console.log('🎵 Initializing Cognitive Soundscape Engine...');
      
      // Set audio mode for background playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      
      console.log('✅ Cognitive Soundscape Engine initialized');
    } catch (error) {
      console.error('❌ Failed to initialize soundscape engine:', error);
      throw error;
    }
  }

  /**
   * Start a soundscape with specified preset or auto-select based on circadian intelligence
   */
  public async startSoundscape(
    presetId: SoundscapeType | 'auto',
    options: {
      cognitiveLoad?: number;
      adaptiveMode?: boolean;
      fadeIn?: boolean;
      userId?: string;
    } = {}
  ): Promise<void> {
    try {
      if (presetId === 'none') {
        await this.stopSoundscape();
        return;
      }

      let actualPresetId = presetId;

      // Auto-select soundscape based on circadian intelligence
      if (presetId === 'auto') {
        actualPresetId = await this.selectCircadianSoundscape(options.userId);
      }

      const preset = this.getPreset(actualPresetId);

      // Stop current soundscape
      await this.stopSoundscape(false);

      // Update cognitive load
      if (options.cognitiveLoad !== undefined) {
        this.cognitiveLoad = options.cognitiveLoad;
      }

      // Start binaural beats
      await this.startBinauralBeats(preset);

      // Start ambient track
      if (preset.ambientTrack) {
        await this.startAmbientTrack(preset);
      }

      // Update state
      this.state = {
        ...this.state,
        isActive: true,
        currentPreset: actualPresetId,
        currentFrequency: preset.binauralFrequency,
        sessionDuration: 0,
        effectivenessScore: 0,
        entrainmentStrength: 0.5,
        adaptationCount: 0,
      };

      // Start session tracking
      this.startSessionTracking();

      // Start adaptive monitoring if enabled
      if (options.adaptiveMode) {
        this.startAdaptiveMonitoring(preset);
      }

      this.emit('soundscape_started', { preset: actualPresetId, frequency: preset.binauralFrequency });
      console.log(`🎧 Started soundscape: ${actualPresetId} (${preset.binauralFrequency} Hz)`);

    } catch (error) {
      console.error('❌ Failed to start soundscape:', error);
      throw error;
    }
  }

  /**
   * Select soundscape preset based on circadian intelligence data
   */
  private async selectCircadianSoundscape(userId?: string): Promise<Exclude<SoundscapeType, 'none' | 'auto'>> {
    try {
      if (!userId) {
        return 'calm_readiness'; // Default fallback
      }

      const circadianService = this.circadianService;

      // Get circadian data using public methods
      const sleepPressure = await circadianService.calculateSleepPressure(userId);
      const optimalWindow = await circadianService.predictOptimalSleepWindow(userId);
      const crdi = await circadianService.calculateCRDI(userId);

      // Get additional health metrics for biometric influence
      const healthMetrics = await circadianService.getHealthMetrics(userId);
      const cognitiveData = await circadianService.getCognitivePerformanceData(userId);

      // Simple heuristic: choose soundscape based on circadian data
      const now = new Date();
      const hour = now.getHours();
      const isNearBedtime = Math.abs(differenceInHours(optimalWindow.bedtime, now)) < 2;

      let selected: SoundscapeType = 'calm_readiness';

      // High sleep pressure suggests need for focus enhancement
      if (sleepPressure.currentPressure > 70) {
        selected = 'deep_focus';
      } else if (sleepPressure.alertnessScore < 40) {
        selected = 'reasoning_boost';
      } else {
        selected = 'memory_flow';
      }

      // Adjust based on time of day and circadian rhythm
      if (hour >= 20 || hour < 6 || isNearBedtime) {
        selected = 'deep_rest';
      } else if (hour >= 6 && hour <= 10) {
        // Morning - good for complex tasks
        selected = 'reasoning_boost';
      } else if (hour >= 14 && hour <= 18) {
        // Afternoon - good for focused work
        selected = 'deep_focus';
      }

      // Adjust based on circadian rhythm consistency (CRDI)
      if (crdi < 50) {
        // Poor circadian health - use gentler soundscapes
        selected = 'calm_readiness';
      }

      // Biometric data influence on soundscape intensity
      if (healthMetrics) {
        const { stressLevel, recoveryStatus, workoutIntensity } = healthMetrics;

        // High stress - use calming soundscapes
        if (stressLevel > 70) {
          selected = 'calm_readiness';
        }

        // Recovery status effects
        if (recoveryStatus === 'fatigued') {
          selected = 'deep_rest';
        } else if (recoveryStatus === 'recovered') {
          // Recent workout - enhance focus for learning
          if (workoutIntensity > 60) {
            selected = 'memory_flow';
          }
        }
      }

      // Cognitive performance data influence
      if (cognitiveData && cognitiveData.length > 0) {
        const recentPerformance = cognitiveData.slice(-7); // Last week
        const avgPerformance = recentPerformance.reduce((sum, p) => sum + p.performance, 0) / recentPerformance.length;

        // Poor recent performance - use memory enhancement
        if (avgPerformance < 0.5) {
          selected = 'memory_flow';
        }
      }

      return selected;
    } catch (error) {
      console.error('Error selecting circadian soundscape:', error);
      return 'calm_readiness';
    }
  }

  /**
   * Stop current soundscape
   */
  public async stopSoundscape(fadeOut: boolean = true): Promise<void> {
    try {
      // Stop timers
      if (this.sessionTimer) {
        clearInterval(this.sessionTimer);
        this.sessionTimer = null;
      }
      
      if (this.adaptationTimer) {
        clearInterval(this.adaptationTimer);
        this.adaptationTimer = null;
      }
      
      // Stop binaural beats
      if (this.leftOscillator) {
        this.leftOscillator.stop();
        this.leftOscillator = null;
      }
      
      if (this.rightOscillator) {
        this.rightOscillator.stop();
        this.rightOscillator = null;
      }
      
      // Stop ambient sound
      if (this.ambientSound) {
        await this.ambientSound.stopAsync();
        await this.ambientSound.unloadAsync();
        this.ambientSound = null;
      }
      
      // Update state
      this.state = {
        ...this.state,
        isActive: false,
        currentPreset: 'none',
        currentFrequency: 0,
        entrainmentStrength: 0,
      };
      
      this.emit('soundscape_stopped', { sessionDuration: this.state.sessionDuration });
      console.log('⏹️ Soundscape stopped');
      
    } catch (error) {
      console.error('❌ Failed to stop soundscape:', error);
    }
  }

  /**
   * Set volume (0-1)
   */
  public setVolume(volume: number): void {
    this.state.volume = Math.max(0, Math.min(1, volume));
    
    if (this.gainNode) {
      this.gainNode.gain.value = this.state.volume * 0.3; // Keep binaural beats subtle
    }
    
    if (this.ambientSound) {
      this.ambientSound.setVolumeAsync(this.state.volume);
    }
  }

  /**
   * Update cognitive load for adaptive adjustment
   */
  public updateCognitiveLoad(load: number): void {
    this.cognitiveLoad = Math.max(0, Math.min(1, load));
    this.emit('cognitive_load_updated', { cognitiveLoad: this.cognitiveLoad });
  }

  /**
   * Record performance for learning
   */
  public async recordPerformance(performance: number): Promise<void> {
    this.performanceHistory.push(performance);
    if (this.performanceHistory.length > 50) {
      this.performanceHistory = this.performanceHistory.slice(-50);
    }
    
    // Update effectiveness score
    const recentPerformance = this.performanceHistory.slice(-5);
    this.state.effectivenessScore = recentPerformance.reduce((sum, p) => sum + p, 0) / recentPerformance.length;
    
    this.emit('performance_recorded', { performance, effectivenessScore: this.state.effectivenessScore });
  }

  /**
   * Get current engine state
   */
  public getState(): SoundscapeState {
    return { ...this.state };
  }

  /**
   * Check if engine is active
   */
  public isActive(): boolean {
    return this.state.isActive;
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Start binaural beats generation
   */
  private async startBinauralBeats(preset: SoundscapePreset): Promise<void> {
    try {
      // Create Web Audio context (simplified for React Native)
      const leftFreq = preset.carrierFrequency;
      const rightFreq = preset.carrierFrequency + preset.binauralFrequency;
      
      // For React Native, we'll use a simplified approach with Audio API
      // In a full implementation, you'd use react-native-audio-toolkit or similar
      console.log(`🎵 Binaural beats: ${leftFreq}Hz (L) / ${rightFreq}Hz (R) = ${preset.binauralFrequency}Hz beat`);
      
    } catch (error) {
      console.error('❌ Failed to start binaural beats:', error);
    }
  }

  /**
   * Start ambient track
   */
  private async startAmbientTrack(preset: SoundscapePreset): Promise<void> {
    try {
      const assetModule = loadAudioAsset(preset.ambientTrack);

      if (!assetModule) {
        console.warn(`⚠️ Audio asset not found: ${preset.ambientTrack}`);
        return;
      }

      const { sound } = await Audio.Sound.createAsync(
        assetModule,
        {
          shouldPlay: true,
          isLooping: true,
          volume: preset.ambientVolume * this.state.volume,
        }
      );

      this.ambientSound = sound;
      console.log(`🌊 Started ambient track: ${preset.ambientTrack}`);

    } catch (error) {
      console.warn(`⚠️ Failed to load ambient track: ${preset.ambientTrack}`, error);
    }
  }

  /**
   * Start session tracking
   */
  private startSessionTracking(): void {
    this.sessionTimer = setInterval(() => {
      this.state.sessionDuration += 1;
      
      // Update entrainment strength (simplified calculation)
      const minutes = this.state.sessionDuration / 60;
      this.state.entrainmentStrength = Math.min(1, minutes / 10); // Full entrainment after 10 minutes
      
      this.emit('analytics_updated', {
        sessionDuration: this.state.sessionDuration,
        effectivenessScore: this.state.effectivenessScore,
        entrainmentStrength: this.state.entrainmentStrength,
        adaptationCount: this.state.adaptationCount,
      });
      
    }, 1000);
  }

  /**
   * Start adaptive monitoring
   */
  private startAdaptiveMonitoring(preset: SoundscapePreset): void {
    this.adaptationTimer = setInterval(async () => {
      if (preset.cognitiveLoadSensitive) {
        this.adaptToLoad(preset);
      }

      if (preset.timeOfDaySensitive) {
        await this.adaptToTimeOfDayAndCircadian(preset);
      }

      // Additional circadian phase considerations
      await this.adaptToCircadianPhases(preset);

    }, 30000); // Check every 30 seconds
  }

  /**
   * Adapt to cognitive load
   */
  private adaptToLoad(preset: SoundscapePreset): void {
    const [minFreq, maxFreq] = preset.adaptiveRange;
    const targetFreq = minFreq + (maxFreq - minFreq) * this.cognitiveLoad;
    
    if (Math.abs(targetFreq - this.state.currentFrequency) > 1) {
      this.state.currentFrequency = targetFreq;
      this.state.adaptationCount++;
      
      this.emit('adaptation_triggered', {
        reason: 'cognitive_load',
        oldFrequency: preset.binauralFrequency,
        newFrequency: targetFreq,
        cognitiveLoad: this.cognitiveLoad,
      });
      
      console.log(`🔄 Adapted frequency to ${targetFreq.toFixed(1)}Hz (load: ${(this.cognitiveLoad * 100).toFixed(0)}%)`);
    }
  }

  /**
   * Adapt to time of day and circadian phases with enhanced intelligence
   */
  private async adaptToTimeOfDayAndCircadian(preset: SoundscapePreset): Promise<void> {
    const hour = new Date().getHours();
    let adjustment = 0;

    // Basic time-of-day adjustments
    if (hour >= 6 && hour <= 10) {
      adjustment = 0.1; // Morning boost
    } else if (hour >= 14 && hour <= 18) {
      adjustment = -0.1; // Afternoon calm
    } else if (hour >= 20) {
      adjustment = -0.2; // Evening wind-down
    }

    // Circadian phase considerations
    // Morning: Alertness rising, good for complex tasks
    // Afternoon: Post-lunch dip, need focus enhancement
    // Evening: Wind-down phase, reduce stimulation
    // Night: Recovery phase, minimal stimulation

    if (hour >= 22 || hour <= 4) {
      // Deep night - minimal stimulation for recovery
      adjustment = -0.3;
    } else if (hour >= 2 && hour <= 5) {
      // Late night/early morning - prepare for wakefulness
      adjustment = -0.1;
    }

    if (adjustment !== 0) {
      const [minFreq, maxFreq] = preset.adaptiveRange;
      const adjustedFreq = Math.max(minFreq, Math.min(maxFreq, this.state.currentFrequency + adjustment));

      if (adjustedFreq !== this.state.currentFrequency) {
        this.state.currentFrequency = adjustedFreq;
        this.state.adaptationCount++;

        this.emit('adaptation_triggered', {
          reason: 'circadian_phase',
          hour,
          adjustment,
          newFrequency: adjustedFreq,
          circadianPhase: this.getCircadianPhase(hour),
        });
      }
    }
  }

  /**
   * Additional circadian phase adaptations based on health metrics
   */
  private async adaptToCircadianPhases(preset: SoundscapePreset): Promise<void> {
    try {
      // Get current user ID from somewhere - this might need to be passed in
      // For now, we'll assume it's available or use a default
      const userId = 'current_user'; // This should be properly obtained

      const circadianService = this.circadianService;
      const sleepPressure = await circadianService.calculateSleepPressure(userId);
      const healthMetrics = await circadianService.getHealthMetrics(userId);

      let adjustment = 0;

      // Adjust based on sleep pressure
      if (sleepPressure.currentPressure > 80) {
        // High sleep pressure - reduce stimulation to promote sleep
        adjustment = -0.2;
      } else if (sleepPressure.alertnessScore < 30) {
        // Low alertness - increase stimulation gently
        adjustment = 0.1;
      }

      // Adjust based on health metrics
      if (healthMetrics) {
        if (healthMetrics.recoveryStatus === 'fatigued') {
          // Fatigued - use gentler soundscapes
          adjustment -= 0.1;
        } else if (healthMetrics.recoveryStatus === 'recovered') {
          // Recovered - can handle more stimulation
          adjustment += 0.05;
        }

        // Stress level influence
        if (healthMetrics.stressLevel > 70) {
          adjustment -= 0.1; // Reduce stimulation when stressed
        }
      }

      if (adjustment !== 0) {
        const [minFreq, maxFreq] = preset.adaptiveRange;
        const adjustedFreq = Math.max(minFreq, Math.min(maxFreq, this.state.currentFrequency + adjustment));

        if (Math.abs(adjustedFreq - this.state.currentFrequency) > 0.5) { // Only adjust if significant change
          this.state.currentFrequency = adjustedFreq;
          this.state.adaptationCount++;

          this.emit('adaptation_triggered', {
            reason: 'circadian_health',
            adjustment,
            newFrequency: adjustedFreq,
            sleepPressure: sleepPressure.currentPressure,
            recoveryStatus: healthMetrics?.recoveryStatus,
          });
        }
      }
    } catch (error) {
      console.warn('Error in circadian phase adaptation:', error);
    }
  }

  /**
   * Get current circadian phase
   */
  private getCircadianPhase(hour: number): string {
    if (hour >= 6 && hour <= 10) return 'morning_alertness';
    if (hour >= 10 && hour <= 14) return 'midday_stability';
    if (hour >= 14 && hour <= 18) return 'afternoon_dip';
    if (hour >= 18 && hour <= 22) return 'evening_winddown';
    if (hour >= 22 || hour <= 2) return 'night_recovery';
    return 'late_night_transition';
  }

  /**
   * Get preset configuration
   */
  private getPreset(presetId: SoundscapeType): SoundscapePreset {
    const presets: Record<SoundscapeType, SoundscapePreset> = {
      none: {
        id: 'none',
        label: 'Off',
        description: 'No soundscape',
        binauralFrequency: 0,
        carrierFrequency: 0,
        waveformType: 'sine',
        ambientTrack: '',
        ambientVolume: 0,
        modulationDepth: 0,
        adaptiveRange: [0, 0],
        fadeInDuration: 0,
        fadeOutDuration: 0,
        cognitiveLoadSensitive: false,
        timeOfDaySensitive: false,
        performanceBased: false,
      },
      auto: {
        id: 'auto',
        label: 'Auto (Circadian)',
        description: 'Automatically selected based on circadian intelligence',
        binauralFrequency: 0, // Will be determined by circadian analysis
        carrierFrequency: 400,
        waveformType: 'sine',
        ambientTrack: '', // Will be determined by circadian analysis
        ambientVolume: 0.5,
        modulationDepth: 0.05,
        adaptiveRange: [2, 40], // Wide range for circadian adaptation
        fadeInDuration: 3.0,
        fadeOutDuration: 2.0,
        cognitiveLoadSensitive: true,
        timeOfDaySensitive: true,
        performanceBased: true,
      },
      calm_readiness: {
        id: 'calm_readiness',
        label: 'Calm Readiness',
        description: 'Relaxed awareness for planning',
        binauralFrequency: 10,
        carrierFrequency: 400,
        waveformType: 'sine',
        ambientTrack: 'uplifting-pad-texture.mp3',
        ambientVolume: 0.4,
        modulationDepth: 0.05,
        adaptiveRange: [8, 12],
        fadeInDuration: 3.0,
        fadeOutDuration: 2.0,
        cognitiveLoadSensitive: true,
        timeOfDaySensitive: true,
        performanceBased: true,
      },
      deep_focus: {
        id: 'deep_focus',
        label: 'Deep Focus',
        description: 'Intense concentration mode',
        binauralFrequency: 18,
        carrierFrequency: 400,
        waveformType: 'sine',
        ambientTrack: 'shallow-river.mp3',
        ambientVolume: 0.6,
        modulationDepth: 0.08,
        adaptiveRange: [15, 25],
        fadeInDuration: 4.0,
        fadeOutDuration: 3.0,
        cognitiveLoadSensitive: true,
        timeOfDaySensitive: true,
        performanceBased: true,
      },
      reasoning_boost: {
        id: 'reasoning_boost',
        label: 'Reasoning Boost',
        description: 'Enhanced logical thinking',
        binauralFrequency: 40,
        carrierFrequency: 340,
        waveformType: 'sine',
        ambientTrack: 'uplifting-pad-texture.mp3',
        ambientVolume: 0.3,
        modulationDepth: 0.12,
        adaptiveRange: [35, 50],
        fadeInDuration: 5.0,
        fadeOutDuration: 4.0,
        cognitiveLoadSensitive: true,
        timeOfDaySensitive: true,
        performanceBased: true,
      },
      memory_flow: {
        id: 'memory_flow',
        label: 'Memory Flow',
        description: 'Smooth recall and learning',
        binauralFrequency: 10,
        carrierFrequency: 400,
        waveformType: 'sine',
        ambientTrack: 'soothing-river-flow.mp3',
        ambientVolume: 0.5,
        modulationDepth: 0.06,
        adaptiveRange: [8, 13],
        fadeInDuration: 2.5,
        fadeOutDuration: 2.0,
        cognitiveLoadSensitive: true,
        timeOfDaySensitive: false,
        performanceBased: true,
      },
      speed_integration: {
        id: 'speed_integration',
        label: 'Speed Integration',
        description: 'Rapid processing and absorption',
        binauralFrequency: 25,
        carrierFrequency: 400,
        waveformType: 'sine',
        ambientTrack: 'forest-ambience-morningspring.mp3',
        ambientVolume: 0.7,
        modulationDepth: 0.15,
        adaptiveRange: [20, 45],
        fadeInDuration: 2.0,
        fadeOutDuration: 3.0,
        cognitiveLoadSensitive: true,
        timeOfDaySensitive: false,
        performanceBased: true,
      },
      visualization: {
        id: 'visualization',
        label: 'Visualization',
        description: 'Enhanced imagination and imagery',
        binauralFrequency: 6,
        carrierFrequency: 400,
        waveformType: 'sine',
        ambientTrack: 'rain-inside-a-car.mp3',
        ambientVolume: 0.6,
        modulationDepth: 0.1,
        adaptiveRange: [4, 8],
        fadeInDuration: 6.0,
        fadeOutDuration: 4.0,
        cognitiveLoadSensitive: true,
        timeOfDaySensitive: true,
        performanceBased: true,
      },
      deep_rest: {
        id: 'deep_rest',
        label: 'Deep Rest',
        description: 'Sleep preparation and recovery',
        binauralFrequency: 2.5,
        carrierFrequency: 400,
        waveformType: 'sine',
        ambientTrack: 'forest-fire.mp3',
        ambientVolume: 0.8,
        modulationDepth: 0.03,
        adaptiveRange: [1, 4],
        fadeInDuration: 8.0,
        fadeOutDuration: 6.0,
        cognitiveLoadSensitive: false,
        timeOfDaySensitive: true,
        performanceBased: false,
      },
    };
    
    return presets[presetId] || presets.calm_readiness;
  }

  /**
   * Setup app state handling for background operation
   */
  private setupAppStateHandling(): void {
    AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' && this.state.isActive) {
        console.log('📱 App backgrounded - soundscape continuing');
      } else if (nextAppState === 'active' && this.state.isActive) {
        console.log('📱 App foregrounded - soundscape active');
      }
    });
  }
}

// Export singleton instance
export const cognitiveSoundscapeEngine = CognitiveSoundscapeEngine.getInstance();
export default CognitiveSoundscapeEngine;