/**
 * Phase 7: Preset Configuration
 *
 * Scientific frequency mappings based on latest 2024-2025 brainwave entrainment research.
 * Each preset is carefully calibrated for optimal cognitive performance.
 *
 * Research Sources:
 * - 2024 Systematic Review of Binaural Beats (PMC10198548)
 * - Parametric Investigation of Binaural Beats (Nature 2025)
 * - Neural Oscillation Mapping Studies (2024-2025)
 * - Cognitive Load and Soundscape Research
 */

import { SoundscapePreset, SoundscapeType } from './CognitiveSoundscapeEngine';

// Recommended audio engine/libraries (developer note):
// - react-native-track-player: Best for full-featured playback (background, remote controls, reliable looping).
// - react-native-sound: Lightweight option for very short cues (low-latency), but less capable for background audio.
// Recommended approach: use react-native-track-player for ambient/long tracks and react-native-sound for short UI cues.

// Storage keys used by StorageService for soundscape settings and logs
export const STORAGE_KEYS = {
  SOUND_SETTINGS: '@neurolearn/sound_settings',
  NEURAL_LOGS: '@neurolearn/neural_performance_logs',
} as const;

// ==================== RESEARCH-BASED CONSTANTS ====================

// Optimal carrier frequencies based on 2024 research
export const OPTIMAL_CARRIER_FREQUENCIES = {
  LOW: 340, // Best for gamma beats (40 Hz)
  MEDIUM: 400, // Standard carrier frequency
  HIGH: 440, // Higher carrier for specific applications
} as const;

// Brainwave frequency bands with research-validated ranges
export const BRAINWAVE_BANDS = {
  DELTA: { min: 0.5, max: 4, optimal: [2, 2.5, 3] },
  THETA: { min: 4, max: 8, optimal: [6, 6.5, 7] },
  ALPHA: { min: 8, max: 12, optimal: [10, 10.5, 11] },
  BETA: { min: 13, max: 30, optimal: [18, 20, 22] },
  GAMMA: { min: 30, max: 100, optimal: [40, 45, 50] },
} as const;

// Ambient sound pressure levels (dBA) for optimal brain comfort
export const OPTIMAL_SPL = {
  QUIET: 40, // Minimal ambient presence
  COMFORTABLE: 50, // Optimal brain comfort (17.29% improvement)
  ACTIVE: 55, // For active concentration
  MASKING: 60, // Background noise masking
} as const;

// ==================== COGNITIVE PRESET CONFIGURATIONS ====================

/**
 * Complete preset configurations based on latest neuroscience research
 */
export const COGNITIVE_PRESETS: Record<SoundscapeType, SoundscapePreset> = {
  // No soundscape
  none: {
    id: 'none',
    label: 'Off',
    description: 'No cognitive soundscape active',
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

  // Dashboard: Calm Readiness - Alpha 10 Hz
  calm_readiness: {
    id: 'calm_readiness',
    label: 'Calm Readiness',
    description:
      'Relaxed awareness state for planning and overview tasks. Promotes clear thinking without tension.',

    // Research-optimized parameters
    binauralFrequency: 10, // Alpha 10 Hz - peak relaxed focus
    carrierFrequency: OPTIMAL_CARRIER_FREQUENCIES.MEDIUM,
    waveformType: 'sine', // Smoothest entrainment

    // Ambient configuration (mapped to bundled assets)
    ambientTrack: 'ambient_soundscapes/environments/uplifting-pad-texture.mp3', // 50 dBA equivalent
    ambientVolume: 0.4, // Subtle background presence

    // Advanced features
    modulationDepth: 0.05, // Light modulation for naturalness
    adaptiveRange: [8, 12], // Alpha band range
    fadeInDuration: 3.0, // Gentle introduction
    fadeOutDuration: 2.0, // Smooth exit

    // Contextual intelligence
    cognitiveLoadSensitive: true, // Adapts to stress levels
    timeOfDaySensitive: true, // Morning/evening adjustments
    performanceBased: true, // Learns from effectiveness
  },

  // Focus Timer: Deep Focus - Beta 18 Hz
  deep_focus: {
    id: 'deep_focus',
    label: 'Deep Focus',
    description:
      'Sustained attention and concentration. Ideal for intensive work requiring continuous focus.',

    // Beta wave optimization for active concentration
    binauralFrequency: 18, // Beta 18 Hz - optimal for focus
    carrierFrequency: OPTIMAL_CARRIER_FREQUENCIES.MEDIUM,
    waveformType: 'sine',

    // Brown noise for attention enhancement (mapped)
    ambientTrack: 'ambient_soundscapes/nature/shallow-river.mp3', // river ambience for focus
    ambientVolume: 0.6, // More prominent for masking

    // Focus-specific settings
    modulationDepth: 0.08, // Slight variation to prevent habituation
    adaptiveRange: [15, 25], // Beta range for adaptation
    fadeInDuration: 4.0, // Longer ramp for focus establishment
    fadeOutDuration: 3.0, // Gentle exit from deep state

    // High adaptivity for focus work
    cognitiveLoadSensitive: true,
    timeOfDaySensitive: true,
    performanceBased: true,
  },

  // Logic Training: Reasoning Boost - Gamma 40 Hz
  reasoning_boost: {
    id: 'reasoning_boost',
    label: 'Reasoning Boost',
    description:
      'Enhanced logical thinking and problem-solving. Gamma waves for cognitive integration and insight.',

    // Gamma optimization based on 2024 research
    binauralFrequency: 40, // Gamma 40 Hz - peak reasoning
    carrierFrequency: OPTIMAL_CARRIER_FREQUENCIES.LOW, // 340 Hz optimal for gamma
    waveformType: 'sine',

    // Low hum for gamma enhancement (mapped)
    ambientTrack: 'ambient_soundscapes/environments/uplifting-pad-texture.mp3',
    ambientVolume: 0.3, // Minimal distraction

    // Gamma-specific parameters
    modulationDepth: 0.12, // Higher modulation for gamma stability
    adaptiveRange: [35, 50], // Gamma range
    fadeInDuration: 5.0, // Longer establishment for gamma
    fadeOutDuration: 4.0, // Careful exit from high-frequency state

    // Maximum adaptivity for complex cognitive tasks
    cognitiveLoadSensitive: true,
    timeOfDaySensitive: true,
    performanceBased: true,
  },

  // Flashcards: Memory Flow - Alpha 10 Hz with nature sounds
  memory_flow: {
    id: 'memory_flow',
    label: 'Memory Flow',
    description:
      'Smooth recall and learning. Alpha waves combined with natural sounds for optimal memory encoding.',

    // Alpha for memory consolidation
    binauralFrequency: 10, // Alpha 10 Hz for memory
    carrierFrequency: OPTIMAL_CARRIER_FREQUENCIES.MEDIUM,
    waveformType: 'sine',

    // Nature sounds for memory enhancement (mapped)
    ambientTrack: 'ambient_soundscapes/nature/soothing-river-flow.mp3', // river sound for memory enhancement
    ambientVolume: 0.5, // Balanced presence

    // Memory-optimized settings
    modulationDepth: 0.06, // Gentle variation for naturalness
    adaptiveRange: [8, 13], // Alpha-low beta range
    fadeInDuration: 2.5, // Quick entry for flashcard sessions
    fadeOutDuration: 2.0, // Smooth exit

    // Performance-based learning for memory effectiveness
    cognitiveLoadSensitive: true,
    timeOfDaySensitive: false, // Memory works consistently
    performanceBased: true,
  },

  // Speed Reading: Speed Integration - Beta→Gamma transition
  speed_integration: {
    id: 'speed_integration',
    label: 'Speed Integration',
    description:
      'Rapid processing and information integration. Dynamic frequency adaptation for speed reading.',

    // Starting at beta, can adapt to gamma
    binauralFrequency: 25, // Beta 25 Hz starting point
    carrierFrequency: OPTIMAL_CARRIER_FREQUENCIES.MEDIUM,
    waveformType: 'sine',

    // Forest ambient for rapid processing (mapped)
    ambientTrack: 'ambient_soundscapes/nature/forest-ambience-morningspring.mp3',
    ambientVolume: 0.7, // Strong background for focus

    // Dynamic adaptation for speed reading
    modulationDepth: 0.15, // Higher modulation for adaptability
    adaptiveRange: [20, 45], // Beta to gamma range
    fadeInDuration: 2.0, // Quick activation
    fadeOutDuration: 3.0, // Careful exit from high state

    // Maximum performance-based adaptation
    cognitiveLoadSensitive: true,
    timeOfDaySensitive: false, // Speed reading works anytime
    performanceBased: true,
  },

  // Memory Palace: Visualization - Theta 6 Hz
  visualization: {
    id: 'visualization',
    label: 'Visualization',
    description:
      'Enhanced imagination and spatial thinking. Theta waves for creative visualization and memory palace construction.',

    // Theta for creative visualization
    binauralFrequency: 6, // Theta 6 Hz optimal for imagery
    carrierFrequency: OPTIMAL_CARRIER_FREQUENCIES.MEDIUM,
    waveformType: 'sine',

    // Gentle rain for visualization (mapped)
    ambientTrack: 'ambient_soundscapes/nature/rain-inside-a-car.mp3', // light rain ambience
    ambientVolume: 0.6, // Immersive but not distracting

    // Theta-specific settings
    modulationDepth: 0.1, // Medium modulation for theta stability
    adaptiveRange: [4, 8], // Theta range
    fadeInDuration: 6.0, // Long ramp for theta entrainment
    fadeOutDuration: 4.0, // Careful exit from deep state

    // Time-sensitive for optimal visualization periods
    cognitiveLoadSensitive: true,
    timeOfDaySensitive: true, // Best in quiet periods
    performanceBased: true,
  },

  // Sleep Prep: Deep Rest - Delta 2.5 Hz
  deep_rest: {
    id: 'deep_rest',
    label: 'Deep Rest',
    description:
      'Sleep preparation and deep recovery. Delta waves for regenerative rest and preparation for sleep.',

    // Delta for deep rest
    binauralFrequency: 2.5, // Delta 2.5 Hz optimal for sleep prep
    carrierFrequency: OPTIMAL_CARRIER_FREQUENCIES.MEDIUM,
    waveformType: 'sine',

    // Rain and drone for sleep (mapped)
    ambientTrack: 'ambient_soundscapes/environments/forest-fire.mp3', // deep ambient for sleep preparation
    ambientVolume: 0.8, // Strong presence for masking

    // Sleep optimization
    modulationDepth: 0.03, // Minimal modulation for stability
    adaptiveRange: [1, 4], // Delta range
    fadeInDuration: 8.0, // Very long ramp for deep state
    fadeOutDuration: 6.0, // Gentle emergence

    // Highly time-sensitive for circadian rhythm
    cognitiveLoadSensitive: false, // Focus on sleep, not load
    timeOfDaySensitive: true, // Evening optimization
    performanceBased: false, // Sleep quality metrics separate
  },
};

// ==================== SCREEN-TO-PRESET MAPPINGS ====================

/**
 * Intelligent screen-to-preset mappings with fallback options
 */
export const SCREEN_PRESET_MAPPINGS: Record<
  string,
  {
    primary: SoundscapeType;
    alternatives: SoundscapeType[];
    contextualRules?: {
      condition: string;
      preset: SoundscapeType;
    }[];
  }
> = {
  dashboard: {
    primary: 'calm_readiness',
    alternatives: ['deep_focus', 'memory_flow'],
    contextualRules: [
      { condition: 'high_cognitive_load', preset: 'deep_focus' },
      { condition: 'morning', preset: 'calm_readiness' },
      { condition: 'evening', preset: 'deep_rest' },
    ],
  },

  focus: {
    primary: 'deep_focus',
    alternatives: ['reasoning_boost', 'calm_readiness'],
    contextualRules: [
      { condition: 'complex_task', preset: 'reasoning_boost' },
      { condition: 'tired', preset: 'calm_readiness' },
    ],
  },

  logic: {
    primary: 'reasoning_boost',
    alternatives: ['deep_focus', 'speed_integration'],
    contextualRules: [
      { condition: 'difficult_problem', preset: 'reasoning_boost' },
      { condition: 'routine_practice', preset: 'deep_focus' },
    ],
  },

  flashcards: {
    primary: 'memory_flow',
    alternatives: ['calm_readiness', 'deep_focus'],
    contextualRules: [
      { condition: 'new_material', preset: 'deep_focus' },
      { condition: 'review', preset: 'memory_flow' },
    ],
  },

  speed_reading: {
    primary: 'speed_integration',
    alternatives: ['deep_focus', 'reasoning_boost'],
    contextualRules: [
      { condition: 'difficult_text', preset: 'reasoning_boost' },
      { condition: 'speed_focus', preset: 'speed_integration' },
    ],
  },

  memory_palace: {
    primary: 'visualization',
    alternatives: ['calm_readiness', 'memory_flow'],
    contextualRules: [
      { condition: 'construction', preset: 'visualization' },
      { condition: 'review', preset: 'memory_flow' },
    ],
  },

  settings: {
    primary: 'calm_readiness',
    alternatives: ['none'],
  },

  sleep: {
    primary: 'deep_rest',
    alternatives: ['calm_readiness'],
    contextualRules: [
      { condition: 'bedtime', preset: 'deep_rest' },
      { condition: 'relaxation', preset: 'calm_readiness' },
    ],
  },
};

// ==================== ADAPTIVE CONFIGURATION ====================

/**
 * Configuration for adaptive soundscape behavior
 */
export const ADAPTIVE_CONFIG = {
  // Cognitive load adaptation thresholds
  cognitiveLoadThresholds: {
    low: 0.3,
    medium: 0.6,
    high: 0.8,
  },

  // Time-based adaptations
  timeAdaptations: {
    morning: { hourRange: [6, 10], boost: 'alertness' },
    midday: { hourRange: [11, 14], boost: 'focus' },
    afternoon: { hourRange: [15, 18], boost: 'sustained' },
    evening: { hourRange: [19, 22], boost: 'calm' },
    night: { hourRange: [23, 5], boost: 'rest' },
  },

  // Performance learning parameters
  learningConfig: {
    minimumSessions: 5, // Minimum sessions before adaptation
    adaptationRate: 0.1, // How quickly to adapt (0-1)
    performanceWindow: 10, // Sessions to consider for learning
    significanceThreshold: 0.15, // Minimum improvement to matter
  },

  // Frequency modulation settings
  modulationConfig: {
    enableNaturalVariation: true,
    variationRange: 0.5, // Hz variation range
    variationPeriod: 120, // Seconds between variations
    adaptiveModulation: true, // Adapt modulation to performance
  },
};

// ==================== AUDIO ASSET CONFIGURATIONS ====================

/**
 * Audio asset specifications for ambient tracks
 */
export const AUDIO_ASSETS: Record<
  string,
  {
    filename: string;
    description: string;
    spl: number; // Sound pressure level in dBA
    frequency_range: string; // Frequency content description
    loop_optimized: boolean; // Seamless looping capability
    duration: number; // Duration in seconds
  }
> = {
  // Binaural Beats
  alpha_10hz: {
    filename: 'binaural_beats/alpha/alpha_10hz_focus.mp3',
    description: '10Hz Alpha binaural beats for focused relaxation',
    spl: 50,
    frequency_range: '340-350 Hz carrier',
    loop_optimized: true,
    duration: 1800, // 30 minutes
  },

  alpha_8hz: {
    filename: 'binaural_beats/alpha/alpha_8hz_calm.mp3',
    description: '8Hz Alpha binaural beats for calm awareness',
    spl: 48,
    frequency_range: '340-348 Hz carrier',
    loop_optimized: true,
    duration: 1800,
  },

  beta_18hz: {
    filename: 'binaural_beats/beta/beta_18hz_concentrate.mp3',
    description: '18Hz Beta binaural beats for deep concentration',
    spl: 52,
    frequency_range: '340-358 Hz carrier',
    loop_optimized: true,
    duration: 1800,
  },

  gamma_40hz: {
    filename: 'binaural_beats/gamma/gamma_40hz_learning.mp3',
    description: '40Hz Gamma binaural beats for enhanced learning',
    spl: 50,
    frequency_range: '340-380 Hz carrier',
    loop_optimized: true,
    duration: 1800,
  },

  theta_5hz: {
    filename: 'binaural_beats/theta/theta_5hz_meditation.mp3',
    description: '5Hz Theta binaural beats for deep meditation',
    spl: 45,
    frequency_range: '340-345 Hz carrier',
    loop_optimized: true,
    duration: 1800,
  },

  // Nature Ambients
  ambient_rain: {
    filename: 'ambient_soundscapes/nature/ambient_rain_light.mp3',
    description: 'Light rain sounds for relaxation and visualization',
    spl: 45,
    frequency_range: '100-8000 Hz',
    loop_optimized: true,
    duration: 1200, // 20 minutes
  },

  ambient_forest: {
    filename: 'ambient_soundscapes/nature/ambient_forest.mp3',
    description: 'Forest sounds for focus and concentration',
    spl: 50,
    frequency_range: '200-6000 Hz',
    loop_optimized: true,
    duration: 1500, // 25 minutes
  },

  ambient_waves: {
    filename: 'ambient_soundscapes/nature/ambient_waves.mp3',
    description: 'Ocean waves for memory enhancement',
    spl: 48,
    frequency_range: '50-4000 Hz',
    loop_optimized: true,
    duration: 1800, // 30 minutes
  },

  // Environment Ambients
  cyber_library: {
    filename: 'ambient_soundscapes/environments/ambient_cyber_library.mp3',
    description: 'Digital library ambience for calm readiness',
    spl: 50,
    frequency_range: '100-2000 Hz',
    loop_optimized: true,
    duration: 1200,
  },

  coffee_shop: {
    filename: 'ambient_soundscapes/environments/ambient_coffee_shop.mp3',
    description: 'Coffee shop background for focus masking',
    spl: 55,
    frequency_range: '200-4000 Hz',
    loop_optimized: true,
    duration: 1500,
  },

  // UI Sounds
  session_start: {
    filename: 'ui_sounds/ui_session_start.wav',
    description: 'Session start notification sound',
    spl: 60,
    frequency_range: '440-880 Hz',
    loop_optimized: false,
    duration: 2,
  },

  session_end: {
    filename: 'ui_sounds/ui_session_end.wav',
    description: 'Session end notification sound',
    spl: 60,
    frequency_range: '330-660 Hz',
    loop_optimized: false,
    duration: 3,
  },

  button_click: {
    filename: 'ui_sounds/ui_button_click.wav',
    description: 'UI button interaction feedback',
    spl: 55,
    frequency_range: '1000-2000 Hz',
    loop_optimized: false,
    duration: 0.2,
  },
};

// ==================== VALIDATION FUNCTIONS ====================

/**
 * Validate preset configuration
 */
export function validatePreset(preset: SoundscapePreset): boolean {
  // Frequency range validation
  if (preset.binauralFrequency < 0 || preset.binauralFrequency > 100) {
    console.error(`Invalid binaural frequency: ${preset.binauralFrequency}`);
    return false;
  }

  // Carrier frequency validation
  if (preset.carrierFrequency < 200 || preset.carrierFrequency > 800) {
    console.error(`Invalid carrier frequency: ${preset.carrierFrequency}`);
    return false;
  }

  // Adaptive range validation
  const [minFreq, maxFreq] = preset.adaptiveRange;
  if (minFreq >= maxFreq || minFreq < 0 || maxFreq > 100) {
    console.error(`Invalid adaptive range: [${minFreq}, ${maxFreq}]`);
    return false;
  }

  return true;
}

/**
 * Get preset by ID with validation
 */
export function getPreset(presetId: SoundscapeType): SoundscapePreset {
  const preset = COGNITIVE_PRESETS[presetId];

  if (!preset) {
    console.error(`Unknown preset ID: ${presetId}`);
    return COGNITIVE_PRESETS.calm_readiness; // Safe fallback
  }

  if (!validatePreset(preset)) {
    console.error(`Invalid preset configuration: ${presetId}`);
    return COGNITIVE_PRESETS.calm_readiness; // Safe fallback
  }

  return preset;
}

/**
 * Get screen preset mapping
 */
export function getScreenPreset(
  screenName: string,
  context?: { cognitiveLoad?: number; timeOfDay?: number },
): SoundscapeType {
  const mapping = SCREEN_PRESET_MAPPINGS[screenName];

  if (!mapping) {
    console.warn(`No preset mapping for screen: ${screenName}`);
    return 'calm_readiness';
  }

  // Apply contextual rules if context provided
  if (context && mapping.contextualRules) {
    for (const rule of mapping.contextualRules) {
      if (shouldApplyRule(rule.condition, context)) {
        return rule.preset;
      }
    }
  }

  return mapping.primary;
}

/**
 * Check if contextual rule should be applied
 */
function shouldApplyRule(condition: string, context: any): boolean {
  switch (condition) {
    case 'high_cognitive_load':
      return (
        context.cognitiveLoad > ADAPTIVE_CONFIG.cognitiveLoadThresholds.high
      );

    case 'morning':
      const hour = new Date().getHours();
      return hour >= 6 && hour <= 10;

    case 'evening':
      return new Date().getHours() >= 19;

    default:
      return false;
  }
}

// ==================== EXPORTS ====================

// Named exports are declared inline above; no additional re-export needed.
