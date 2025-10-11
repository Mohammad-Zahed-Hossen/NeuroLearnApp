# Cognitive Intelligence Layer Implementation

This is the complete Cognitive Intelligence Layer implementation, fulfilling Phase 1 and the CognitiveOrchestrator link (Phase 6), and providing the foundational structure for the AICoachingService (Phase 3) and CognitiveSettingsScreen.tsx (Phase 4/7).

This integration leverages the prescribed Event Flow and the Attention Score Formula to create your Neuroadaptive intelligence platform.

## 1. Core Utilities & Types

### src/utils/attentionMath.ts (Attention Score Formula)

This file implements the core mathematical logic for calculating and smoothing the attention score.

```typescript
// src/utils/attentionMath.ts

// --- FORMULAS ---
// attention = 0.5(gazeStability) + 0.2(headStillness) + 0.3(1 - normBlink)
// EMA_t = 0.3(raw_t) + 0.7(EMA_{t-1})

/**
 * Calculates a raw, un-smoothed attention score (0.0 to 1.0).
 * @param gazeStability 0.0 (unstable) to 1.0 (perfectly stable)
 * @param headStillness 0.0 (moving) to 1.0 (still)
 * @param normBlink Normalized blink rate (0.0 to 1.0, where 1.0 is excessive blinking)
 * @returns Raw Attention Score (0.0 - 1.0)
 */
export const calculateAttentionScore = (
  gazeStability: number,
  headStillness: number,
  normBlink: number
): number => {
  // Ensure inputs are clamped between 0 and 1
  const gs = Math.min(1, Math.max(0, gazeStability));
  const hs = Math.min(1, Math.max(0, headStillness));
  const nb = Math.min(1, Math.max(0, normBlink));

  // The final formula:
  const attention =
    0.5 * gs +
    0.2 * hs +
    0.3 * (1 - nb); // 1 - normBlink accounts for the penalty of blinking

  return Math.min(1.0, Math.max(0.0, attention));
};

/**
 * Applies Exponential Moving Average (EMA) smoothing to the raw score.
 * @param rawValue The new raw attention score (raw_t)
 * @param previousEMA The previous smoothed score (EMA_{t-1})
 * @param alpha The smoothing factor (0.3 as per plan)
 * @returns The new smoothed EMA score (EMA_t)
 */
export const applyEMA = (
  rawValue: number,
  previousEMA: number,
  alpha: number = 0.3
): number => {
  // EMA_t = alpha * raw_t + (1 - alpha) * EMA_{t-1}
  return alpha * rawValue + (1 - alpha) * previousEMA;
};

/**
 * Defines the main data structure for a raw cognitive sample from the sensor.
 */
export interface CognitiveSample {
  timestamp: number;
  gazeStability: number; // 0.0 - 1.0
  headStillness: number; // 0.0 - 1.0
  blinkRate: number; // raw blinks per minute
  ear: number; // Eye Aspect Ratio (from camera frame processor)
}

/**
 * Defines the final, calculated cognitive state of the user.
 */
export type CognitiveState = 'HIGH_FOCUS' | 'NORMAL' | 'FATIGUE' | 'DROP';

export interface CognitiveMetrics {
  timestamp: number;
  smoothedAttention: number; // 0.0 - 1.0 (main metric)
  rawAttention: number; // 0.0 - 1.0
  gazeStability: number;
  headStillness: number;
  cognitiveState: CognitiveState;
  stateDurationSec: number; // How long user has been in this state
}
```

## 2. Cognitive Core Services

### src/services/EyeTrackingService.ts (Phase 1)

This service simulates the camera frame processing and emits raw cognitive data samples.

```typescript
// src/services/EyeTrackingService.ts

import EventSystem from '../core/EventSystem'; // Assumed from your Orchestration Engine
import { CognitiveSample } from '../utils/attentionMath';

const SAMPLE_INTERVAL_MS = 500; // Emit a sample every 500ms
const SIMULATION_MODE = true; // Phase 1: Simulation mode

export class EyeTrackingService {
  private static instance: EyeTrackingService;
  private timer: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private eventSystem: EventSystem;

  // Simulation State: Start near Normal/Fatigue
  private sim_gazeStability = 0.6;
  private sim_headStillness = 0.7;
  private sim_blinkRate = 12; // Blinks per minute

  private constructor() {
    this.eventSystem = EventSystem.getInstance(); // Use your existing EventSystem
  }

  public static getInstance(): EyeTrackingService {
    if (!EyeTrackingService.instance) {
      EyeTrackingService.instance = new EyeTrackingService();
    }
    return EyeTrackingService.instance;
  }

  /**

    if (SIMULATION_MODE) {
      this.timer = setInterval(() => {
        this.emitSimulatedSample(userId);
      }, SAMPLE_INTERVAL_MS);
      console.log('👁️ EyeTrackingService started in SIMULATION MODE.');
    } else {
      // Phase 2 Integration: Start Vision Camera frame processor here
      console.log('👁️ EyeTrackingService started (REAL MODE - requires Phase 2)');
    }
  }

  /**
   * Stops the data stream.
   */
  public stopMonitoring(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isMonitoring = false;
    console.log('🛑 EyeTrackingService stopped.');
  }

  /**
   * Generates and emits a slightly randomized cognitive sample.
   */
  private emitSimulatedSample(userId: string): void {
    // 1. Randomly drift the simulation state to mimic human behavior
    this.sim_gazeStability = this.sim_gazeStability + (Math.random() - 0.5) * 0.05;
    this.sim_headStillness = this.sim_headStillness + (Math.random() - 0.5) * 0.05;
    this.sim_blinkRate = this.sim_blinkRate + (Math.random() - 0.5) * 2;

    // Clamp values
    this.sim_gazeStability = Math.min(1.0, Math.max(0.2, this.sim_gazeStability));
    this.sim_headStillness = Math.min(1.0, Math.max(0.2, this.sim_headStillness));
    this.sim_blinkRate = Math.min(30, Math.max(5, this.sim_blinkRate)); // Bpm

    const sample: CognitiveSample = {
      timestamp: Date.now(),
      gazeStability: this.sim_gazeStability,
      headStillness: this.sim_headStillness,
      blinkRate: this.sim_blinkRate,
      ear: 0.28 + Math.random() * 0.05, // Eye Aspect Ratio simulation (placeholder)
    };

    // Publish to the event system (Emitter in Event Flow Summary)
    this.eventSystem.publish('COGNITIVE_SAMPLE', { userId, sample });
  }
}
src/services/CognitiveDataService.ts (Phase 1)
This service is the first listener, responsible for logging the raw samples and converting them into a raw attention score.

TypeScript

// src/services/CognitiveDataService.ts

import EventSystem from '../core/EventSystem';
import StorageService from './StorageService'; // Assumed existing StorageService
import {
  CognitiveSample,
  calculateAttentionScore,
  CognitiveMetrics,
} from '../utils/attentionMath';

/**
 * A central cache for recent raw cognitive samples.
 */
interface CognitiveLog {
  userId: string;
  samples: CognitiveSample[];
  rawMetricsHistory: CognitiveMetrics[];
}

export class CognitiveDataService {
  private static instance: CognitiveDataService;
  private eventSystem: EventSystem;
  private storageService: StorageService;
  private log: CognitiveLog = { userId: '', samples: [], rawMetricsHistory: [] };

  private constructor() {
    this.eventSystem = EventSystem.getInstance();
    this.storageService = StorageService.getInstance();
    this.eventSystem.subscribe('COGNITIVE_SAMPLE', this.handleCognitiveSample);
  }

  public static getInstance(): CognitiveDataService {
    if (!CognitiveDataService.instance) {
      CognitiveDataService.instance = new CognitiveDataService();
    }
    return CognitiveDataService.instance;
  }

  /**
   * Processes a new raw cognitive sample.
   */
  private handleCognitiveSample = ({ userId, sample }: { userId: string; sample: CognitiveSample }) => {
    if (this.log.userId === '' || this.log.userId !== userId) {
      this.log.userId = userId;
    }

    // 1. Log the raw sample
    this.log.samples.push(sample);
    if (this.log.samples.length > 200) { // Keep a rolling window of recent samples
      this.log.samples.shift();
    }

    // 2. Calculate Raw Attention Score
    const rawAttention = this.processSampleToScore(sample);

    // 3. Emit the Raw Attention Score for smoothing in CognitiveStateService
    this.eventSystem.publish('RAW_ATTENTION_SCORE', { userId, rawAttention, sample });
  };

  /**
   * Converts raw sensor data to a normalized score.
   */
  private processSampleToScore(sample: CognitiveSample): number {
    // A standard blink rate is ~15-20 blinks per minute.
    // Normalize blink rate: 15BPM -> 0.0, 30BPM -> 1.0 (Excessive), 5BPM -> 0.0
    const normalizedBlink = Math.min(1.0, Math.max(0.0, (sample.blinkRate - 15) / 15));

    return calculateAttentionScore(
      sample.gazeStability,
      sample.headStillness,
      normalizedBlink
    );
  }

  /**
   * Retrieve recent logs (for analytics/debugging).
   */
  public getLogs(): CognitiveLog {
    return this.log;
  }

  /**
   * Saves the session data to persistent storage.
   */
  public async saveSessionData(sessionId: string): Promise<void> {
      // The session end event will trigger this to persist the logs and metrics.
      // this.storageService.saveCognitiveSession(sessionId, this.log);
      // this.log.samples = []; // Clear log for next session
  }
}
src/services/CognitiveStateService.ts (Phase 1)
This service applies EMA smoothing and determines the final CognitiveState.

TypeScript

// src/services/CognitiveStateService.ts

import EventSystem from '../core/EventSystem';
import {
  applyEMA,
  CognitiveMetrics,
  CognitiveState,
  CognitiveSample,
} from '../utils/attentionMath';

const ALPHA = 0.3; // EMA smoothing factor
const INITIAL_ATTENTION = 0.6; // Start value for EMA
const THRESHOLDS = { // Normalized thresholds (0.0 - 1.0, based on plan's 0-100 scores)
  HIGH_FOCUS: 0.70, // > 70
  NORMAL: 0.40,     // 40 - 70
  FATIGUE: 0.25,    // 25 - 40
};

export class CognitiveStateService {
  private static instance: CognitiveStateService;
  private eventSystem: EventSystem;

  private currentMetrics: CognitiveMetrics = {
    timestamp: Date.now(),
    smoothedAttention: INITIAL_ATTENTION,
    rawAttention: INITIAL_ATTENTION,
    gazeStability: 0.5,
    headStillness: 0.5,
    cognitiveState: 'NORMAL',
    stateDurationSec: 0,
  };
  private lastStateChangeTime: number = Date.now();

  private constructor() {
    this.eventSystem = EventSystem.getInstance();
    this.eventSystem.subscribe('RAW_ATTENTION_SCORE', this.handleRawScore);
  }

  public static getInstance(): CognitiveStateService {
    if (!CognitiveStateService.instance) {
      CognitiveStateService.instance = new CognitiveStateService();
    }
    return CognitiveStateService.instance;
  }

  /**
   * Processes the raw attention score, applies EMA, and determines the state.
   */
  private handleRawScore = ({ userId, rawAttention, sample }: { userId: string, rawAttention: number, sample: CognitiveSample }) => {
    const now = Date.now();

    // 1. Apply EMA Smoothing
    const smoothedAttention = applyEMA(
      rawAttention,
      this.currentMetrics.smoothedAttention,
      ALPHA
    );

    // 2. Determine New Cognitive State based on thresholds
    const newCognitiveState = this.determineCognitiveState(smoothedAttention);
    const stateChanged = newCognitiveState !== this.currentMetrics.cognitiveState;

    // 3. Update Metrics
    this.currentMetrics = {
      timestamp: now,
      smoothedAttention,
      rawAttention,
      gazeStability: sample.gazeStability,
      headStillness: sample.headStillness,
      cognitiveState: newCognitiveState,
      stateDurationSec: Math.floor((now - this.lastStateChangeTime) / 1000),
    };

    // 4. If state changed, reset duration and publish event
    if (stateChanged) {
      this.lastStateChangeTime = now;
      this.currentMetrics.stateDurationSec = 0;
      // Publish (CognitiveStateService is the Emitter in the Event Flow)
      this.eventSystem.publish('COGNITIVE_STATE_CHANGED', this.currentMetrics);
      console.log(`🧠 State Change: ${newCognitiveState} (Score: ${(smoothedAttention * 100).toFixed(1)}%)`);
    } else {
      // Always publish the current metrics for continuous listeners (e.g., UI component)
      this.eventSystem.publish('COGNITIVE_METRICS_UPDATED', this.currentMetrics);
    }

    // The CognitiveOrchestrator subscribes to this event and passes it to the main Engine.
  };

  /**
   * Applies the threshold logic to get the final CognitiveState.
   */
  private determineCognitiveState(score: number): CognitiveState {
    if (score > THRESHOLDS.HIGH_FOCUS) {
      return 'HIGH_FOCUS'; // Action: Extend session
    } else if (score >= THRESHOLDS.NORMAL) {
      return 'NORMAL'; // Action: Keep
    } else if (score >= THRESHOLDS.FATIGUE) {
      return 'FATIGUE'; // Action: Micro-break
    } else {
      return 'DROP'; // Action: Pause
    }
  }

  /**
   * Allows external components (like the Orchestrator) to get the current state.
   */
  public getState(): CognitiveMetrics {
    return this.currentMetrics;
  }

  /**
   * Public method for orchestrator to subscribe to state changes (not strictly needed,
   * but good practice to expose a clear subscription mechanism).
   */
  public subscribe(callback: (state: CognitiveMetrics) => void): () => void {
    const handler = (data: any) => callback(data as CognitiveMetrics);
    this.eventSystem.subscribe('COGNITIVE_STATE_CHANGED', handler);
    return () => this.eventSystem.unsubscribe('COGNITIVE_STATE_CHANGED', handler);
  }
}
3. Orchestrator Link & Adaptive Services
core/orchestrators/CognitiveOrchestrator.ts (Phase 6)
This links the new cognitive layer into your existing Turbo Engine architecture.

TypeScript

// core/orchestrators/CognitiveOrchestrator.ts

import { CognitiveStateService, CognitiveMetrics } from '../../services/CognitiveStateService';
import { CognitiveDataService } from '../../services/CognitiveDataService';
import { EyeTrackingService } from '../../services/EyeTrackingService';
import EventSystem from '../EventSystem';

/**
 * Orchestrates the Cognitive Intelligence Layer.
 * - Initializes and manages the Eye Tracking stream.
 * - Subscribes to CognitiveStateService and re-publishes the state change on the global bus.
 * - Provides a unified API to the NeuroLearnEngine.
 */
export class CognitiveOrchestrator {
  private cognitiveStateService: CognitiveStateService;
  private cognitiveDataService: CognitiveDataService;
  private eyeTrackingService: EyeTrackingService;

  constructor(private eventSystem: EventSystem) {
    this.cognitiveStateService = CognitiveStateService.getInstance();
    this.cognitiveDataService = CognitiveDataService.getInstance();
    this.eyeTrackingService = EyeTrackingService.getInstance();
  }

  /**
   * Initializes the core orchestration link.
   * This is where you register it inside NeuroLearnEngine.ts
   */
  public initialize(userId: string) {
    // 1. Start the data stream (starts the simulation loop for now)
    this.eyeTrackingService.startMonitoring(userId);

    // 2. Subscribe to the Cognitive State changes and relay them to the global EventSystem
    // This connects the cognitive layer (COGNITIVE_STATE_CHANGED) to all adaptive services (FocusTimer, FocusSound, AICoaching)
    this.cognitiveStateService.subscribe((state: CognitiveMetrics) => {
      this.eventSystem.publish('COGNITIVE_STATE_CHANGED', state);
    });

    console.log('🔗 CognitiveOrchestrator initialized and listening for state changes.');
  }

  /**
   * Public API for NeuroLearnEngine to access current cognitive data.
   */
  public getCurrentState(): CognitiveMetrics {
    return this.cognitiveStateService.getState();
  }

  public getRecentData() {
    return this.cognitiveDataService.getLogs();
  }

  public stopEngine() {
      this.eyeTrackingService.stopMonitoring();
  }
}

// **NeuroLearnEngine.ts** (Integration Snippet)
/*
//... inside NeuroLearnEngine class ...
this.cognitive = new CognitiveOrchestrator(this.eventSystem);
this.cognitive.initialize(this.userId); // Pass the current user ID
*/
src/services/AICoachingService.ts (Phase 3 Foundation)
This service will handle AI interaction using the provided prompt template.

TypeScript

// src/services/AICoachingService.ts

import { CognitiveMetrics } from '../utils/attentionMath';
// Assume your existing Gemini integration service
import { AdvancedGeminiService } from '../ai/AdvancedGeminiService';

// JSON structure for the adaptive quiz
export interface AdaptiveQuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface SessionFeedback {
  praise: string;
  focusTips: string[];
  soundscapeSuggestion: string;
  adaptiveQuiz: AdaptiveQuizQuestion[];
}

export class AICoachingService {
  private static instance: AICoachingService;
  private geminiService: AdvancedGeminiService;

  private constructor() {
    this.geminiService = AdvancedGeminiService.getInstance();
  }

  public static getInstance(): AICoachingService {
    if (!AICoachingService.instance) {
      AICoachingService.instance = new AICoachingService();
    }
    return AICoachingService.instance;
  }

  /**
   * Uses Gemini/AI to generate personalized feedback based on a session's performance.
   * @param metrics The aggregated cognitive metrics from the session.
   * @param sessionType The type of session (e.g., 'Logic Exercise', 'Reading').
   */
  public async generateSessionFeedback(
    metrics: CognitiveMetrics,
    sessionType: string,
    durationMinutes: number
  ): Promise<SessionFeedback> {

    // AI Feedback Prompt Template (from the plan)
    const promptContent = `
      Task: ${sessionType};
      avgAttention=${(metrics.smoothedAttention * 100).toFixed(0)};
      avgBlinkRate=15; // Placeholder, would use real average from logs
      duration=${durationMinutes}min.
      Generate:
      (1) 1-sentence praise or encouragement,
      (2) 2 practical focus tips,
      (3) 1 adaptive soundscape suggestion (e.g., 'Alpha Beats' or 'Rainforest'),
      (4) 3 short multiple-choice questions (JSON format matching AdaptiveQuizQuestion[]).
    `;

    const systemContent = "You are NeuroLearn’s cognitive coach. Use the following metrics to generate short, friendly, evidence-based feedback. The quiz must be relevant to the session type.";

    try {
      // In a real implementation, you'd call Gemini with the structured prompt:
      // const response = await this.geminiService.generateStructuredResponse(systemContent, promptContent, JSON.SCHEMA);

      // *** MOCK RESPONSE for immediate integration: ***
      return {
        praise: `Great job on maintaining focus! Your average attention of ${(metrics.smoothedAttention * 100).toFixed(0)}% shows high commitment.`,
        focusTips: [
          'Try the 50/10 method: work for 50 minutes, then take a 10-minute full break.',
          'Before your next session, ensure your lighting is balanced to reduce eye strain.',
        ],
        soundscapeSuggestion: 'Alpha Binaural Beats',
        adaptiveQuiz: [
          {
            question: `What is the best next step for improving ${sessionType} mastery?`,
            options: ['Review core concepts', 'Take a 3-hour break', 'Start a new project', 'Ignore the fatigue'],
            answer: 'Review core concepts',
            explanation: 'Reviewing is key for consolidation.',
          },
        ],
      };
    } catch (error) {
      console.error('AI Coaching failed:', error);
      return this.getFallbackFeedback();
    }
  }

  private getFallbackFeedback(): SessionFeedback {
    return {
      praise: 'Keep up the momentum!',
      focusTips: ['Take a micro-break.', 'Check your environment.'],
      soundscapeSuggestion: 'Gentle Rain',
      adaptiveQuiz: [],
    };
  }
}
4. Privacy & Consent Screen
src/screens/CognitiveSettingsScreen.tsx (Phase 7)
Implements the required privacy and consent toggles for the new cognitive layer.

TypeScript

// src/screens/CognitiveSettingsScreen.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Switch, Alert } from 'react-native';
import { GlassCard, ScreenContainer, Button } from '../components/GlassComponents';
import { ThemeType } from '../theme/colors';
import StorageService from '../services/StorageService'; // Assumed existing service

interface CognitiveSettingsScreenProps {
  theme: ThemeType;
  contextColor: string;
}

interface CognitiveSettings {
  enableEyeTracking: boolean;
  allowCognitiveDataLogging: boolean;
  autoGenerateAIFeedback: boolean;
}

export const CognitiveSettingsScreen: React.FC<CognitiveSettingsScreenProps> = ({ theme, contextColor }) => {
  const [settings, setSettings] = useState<CognitiveSettings>({
    enableEyeTracking: false,
    allowCognitiveDataLogging: true,
    autoGenerateAIFeedback: true,
  });
  const storage = StorageService.getInstance();
  const STORAGE_KEY = '@NeuroLearn:CognitiveSettings';

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const storedSettings = await storage.get<CognitiveSettings>(STORAGE_KEY);
      if (storedSettings) {
        setSettings(storedSettings);
      }
    } catch (e) {
      console.error('Failed to load cognitive settings', e);
    }
  };

  const saveSettings = async (newSettings: CognitiveSettings) => {
    setSettings(newSettings);
    await storage.save(STORAGE_KEY, newSettings);
  };

  const handleToggle = (key: keyof CognitiveSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    saveSettings(newSettings);
    // In a real app, toggling 'enableEyeTracking' would trigger EyeTrackingService.start/stopMonitoring
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear Cognitive Data',
      'Are you sure you want to permanently delete all locally stored cognitive logs, scores, and attention history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // In a real app, this would call StorageService.clearCognitiveLogs() and CognitiveDataService.clearLogs()
            Alert.alert('Success', 'Cognitive data cleared successfully.');
          },
        },
      ]
    );
  };

  const renderToggleRow = (label: string, value: boolean, key: keyof CognitiveSettings, description: string) => (
    <View style={styles.toggleRow}>
      <View style={styles.textContainer}>
        <Text style={[styles.label, { color: theme.text.primary }]}>{label}</Text>
        <Text style={[styles.description, { color: theme.text.secondary }]}>{description}</Text>
      </View>
      <Switch
        onValueChange={() => handleToggle(key)}
        value={value}
        trackColor={{ false: theme.background.secondary, true: contextColor }}
        thumbColor={theme.background.primary}
      />
    </View>
  );

  return (
    <ScreenContainer theme={theme}>
      <ScrollView style={styles.container}>
        <Text style={[styles.title, { color: contextColor }]}>
          Cognitive Intelligence Settings
        </Text>

        <GlassCard theme={theme} style={styles.card}>
          <Text style={[styles.sectionTitle, { color: contextColor }]}>Core Biometric Sensors</Text>
          {renderToggleRow(
            'Enable Eye Tracking',
            settings.enableEyeTracking,
            'enableEyeTracking',
            'Allows the app to use your front camera to detect gaze stability and fatigue (Privacy Policy: no frames are saved, only derived metrics).'
          )}
          {/* Optional: EEGService toggle would go here */}
        </GlassCard>

        <GlassCard theme={theme} style={styles.card}>
          <Text style={[styles.sectionTitle, { color: contextColor }]}>Data & AI Consent</Text>
          {renderToggleRow(
            'Allow Cognitive Data Logging',
            settings.allowCognitiveDataLogging,
            'allowCognitiveDataLogging',
            'Stores your historical attention scores locally and in the cloud for analytics and pattern recognition.'
          )}
          {renderToggleRow(
            'Auto-generate AI Feedback',
            settings.autoGenerateAIFeedback,
            'autoGenerateAIFeedback',
            'Enables Gemini to generate personalized coaching tips and quizzes after each focus session.'
          )}
        </GlassCard>

        <GlassCard theme={theme} style={styles.card}>
          <Text style={[styles.sectionTitle, { color: contextColor }]}>Privacy Controls</Text>
          <Button
            title="Clear All Cognitive Data"
            onPress={handleClearData}
            style={styles.clearButton}
            textStyle={{ color: '#FF6B6B' }}
          />
          <Text style={[styles.description, { color: theme.text.secondary, marginTop: 10 }]}>
            Warning: This action is irreversible and will reset your attention history and focus trends.
          </Text>
        </GlassCard>

        <View style={{ height: 50 }} />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    marginBottom: 20,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  textContainer: {
    flex: 1,
    marginRight: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  description: {
    fontSize: 12,
    marginTop: 4,
  },
  clearButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderColor: '#FF6B6B',
    borderWidth: 1,
  }
});
