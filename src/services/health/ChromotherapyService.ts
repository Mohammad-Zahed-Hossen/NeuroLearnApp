import { Animated } from 'react-native';
import { colors } from '../../theme/colors';

export interface TherapeuticColorPalette {
  primary: string;
  accent: string;
  background: string;
  breathing: string;
  text: string;
  success: string;
  warning: string;
  error: string;
}

export interface BiometricColorResponse {
  stressLevel: number;
  recoveryScore: number;
  timeOfDay: number;
  recommendedPalette: TherapeuticColorPalette;
  breathingColors: string[];
  motivationalColors: string[];
}

export class ChromotherapyService {
  private static instance: ChromotherapyService;

  static getInstance(): ChromotherapyService {
    if (!ChromotherapyService.instance) {
      ChromotherapyService.instance = new ChromotherapyService();
    }
    return ChromotherapyService.instance;
  }

  /**
   * Color therapy based on circadian rhythms and mood states
   * Integrates with NeuroLearn's existing color system
   */
  getTherapeuticColors(
    timeOfDay: number,
    mood: string,
    goals: string[],
    stressLevel?: number
  ): TherapeuticColorPalette {
    const circadianPhase = this.getCircadianPhase(timeOfDay);
    const baseColors = this.getCircadianColors(circadianPhase);

    // Adjust colors based on stress level
    if (stressLevel !== undefined) {
      return this.adjustColorsForStress(baseColors, stressLevel);
    }

    // Personalize based on mood and goals
    return this.personalizeColors(baseColors, mood, goals);
  }

  /**
   * Dynamic color adaptation based on HRV and stress levels
   * Integrates with biometric data from workout logger
   */
  adaptColorsToPhysiology(
    hrvScore: number,
    stressLevel: number,
    recoveryStatus: string
  ): BiometricColorResponse {
    const currentHour = new Date().getHours();

    let recommendedPalette: TherapeuticColorPalette;

    if (stressLevel > 70) {
      // High stress: Cool, calming colors
      recommendedPalette = {
        primary: '#4ECDC4',        // Teal - reduces anxiety
        accent: '#45B7D1',         // Sky blue - promotes calm
        background: '#F0F9FF',     // Very light blue
        breathing: '#98FB98',      // Light green - healing
        text: '#1E293B',          // Dark slate
        success: '#10B981',       // Emerald
        warning: '#F59E0B',       // Amber
        error: '#EF4444'          // Red
      };
    } else if (recoveryStatus === 'rest' || hrvScore < 30) {
      // Low recovery: Gentle, restorative colors
      recommendedPalette = {
        primary: '#DDA0DD',        // Plum - restorative
        accent: '#E6E6FA',         // Lavender - calming
        background: '#FDF2F8',     // Very light pink
        breathing: '#F0E68C',      // Khaki - gentle energy
        text: '#374151',          // Warm gray
        success: '#059669',       // Deep green
        warning: '#D97706',       // Orange
        error: '#DC2626'          // Deep red
      };
    } else if (hrvScore > 70 && stressLevel < 30) {
      // Optimal state: Energizing colors
      recommendedPalette = {
        primary: '#FF6B35',        // Energizing orange
        accent: '#F7931E',         // Warm amber
        background: '#FFFBEB',     // Warm white
        breathing: '#FFE135',      // Yellow - alertness
        text: '#111827',          // Near black
        success: '#16A34A',       // Strong green
        warning: '#EA580C',       // Vivid orange
        error: '#B91C1C'          // Strong red
      };
    } else {
      // Balanced state: Harmonious colors
      recommendedPalette = {
        primary: '#6366F1',        // Indigo - balance
        accent: '#8B5CF6',         // Purple - creativity
        background: '#FAFAFA',     // Neutral light
        breathing: '#34D399',      // Green - growth
        text: '#1F2937',          // Dark gray
        success: '#059669',       // Teal green
        warning: '#D97706',       // Warm orange
        error: '#DC2626'          // Red
      };
    }

    return {
      stressLevel,
      recoveryScore: hrvScore,
      timeOfDay: currentHour,
      recommendedPalette,
      breathingColors: this.getBreathingColors(stressLevel),
      motivationalColors: this.getMotivationalColors(recoveryStatus, hrvScore)
    };
  }

  /**
   * Breathing exercise color synchronization
   * Creates smooth color transitions for breathing exercises
   */
  createBreathingColorSequence(
    technique: 'box' | '4-7-8' | 'coherent',
    stressLevel: number = 50
  ): {
    colors: string[];
    durations: number[];
    animations: Animated.Value[];
  } {
    const breathingPattern = this.getBreathingPattern(technique);
    const colors = this.getBreathingColors(stressLevel);

    const animations = breathingPattern.map(() => new Animated.Value(0));
    const durations = breathingPattern.map(phase => phase.duration * 1000);

    return {
      colors: colors.slice(0, breathingPattern.length),
      durations,
      animations
    };
  }

  /**
   * Workout motivation colors based on exercise type and intensity
   */
  getWorkoutMotivationColors(
    workoutType: string,
    intensity: number,
    heartRate?: number
  ): {
    primaryColor: string;
    accentColor: string;
    backgroundColor: string;
    intensityColor: string;
  } {
    const baseIntensity = intensity / 5; // Normalize to 0-1

    switch (workoutType) {
      case 'hiit':
        return {
          primaryColor: this.interpolateColor('#FF4444', '#FF0000', baseIntensity),
          accentColor: '#FF6B35',
          backgroundColor: '#FEF2F2',
          intensityColor: this.getIntensityColor(intensity)
        };

      case 'strength':
        return {
          primaryColor: this.interpolateColor('#8B5CF6', '#6D28D9', baseIntensity),
          accentColor: '#A855F7',
          backgroundColor: '#FAF5FF',
          intensityColor: this.getIntensityColor(intensity)
        };

      case 'cardio':
        return {
          primaryColor: this.interpolateColor('#10B981', '#059669', baseIntensity),
          accentColor: '#34D399',
          backgroundColor: '#ECFDF5',
          intensityColor: this.getIntensityColor(intensity)
        };

      case 'yoga':
        return {
          primaryColor: '#F59E0B',
          accentColor: '#FCD34D',
          backgroundColor: '#FFFBEB',
          intensityColor: '#92400E'
        };

      default:
        return {
          primaryColor: '#6366F1',
          accentColor: '#8B5CF6',
          backgroundColor: '#F8FAFC',
          intensityColor: this.getIntensityColor(intensity)
        };
    }
  }

  /**
   * Sleep optimization colors based on circadian rhythm
   */
  getSleepColors(
    timeUntilBedtime: number,
    sleepQuality: number
  ): TherapeuticColorPalette {
    const hoursUntilBed = timeUntilBedtime / 60;

    if (hoursUntilBed <= 2) {
      // Pre-sleep colors - deep blues and purples
      return {
        primary: '#1E1B4B',        // Deep indigo
        accent: '#312E81',         // Dark purple
        background: '#0F0C29',     // Very dark blue
        breathing: '#4C1D95',      // Purple
        text: '#E0E7FF',          // Light indigo
        success: '#22C55E',       // Green
        warning: '#F59E0B',       // Amber
        error: '#EF4444'          // Red
      };
    } else if (hoursUntilBed <= 4) {
      // Evening transition colors
      return {
        primary: '#6B73FF',        // Calming indigo
        accent: '#9D4EDD',         // Lavender purple
        background: '#1A1A2E',     // Deep navy
        breathing: '#FF6B9D',      // Soft pink
        text: '#F1F5F9',          // Light gray
        success: '#10B981',       // Emerald
        warning: '#F59E0B',       // Amber
        error: '#EF4444'          // Red
      };
    } else {
      // Daytime colors - energizing but not overstimulating
      return this.getTherapeuticColors(
        new Date().getHours(),
        'relaxed',
        ['sleep_preparation'],
        30
      );
    }
  }

  // Private helper methods
  private getCircadianPhase(timeOfDay: number): 'morning' | 'afternoon' | 'evening' | 'night' {
    if (timeOfDay >= 6 && timeOfDay < 12) return 'morning';
    if (timeOfDay >= 12 && timeOfDay < 17) return 'afternoon';
    if (timeOfDay >= 17 && timeOfDay < 22) return 'evening';
    return 'night';
  }

  private getCircadianColors(phase: string): TherapeuticColorPalette {
    switch (phase) {
      case 'morning':
        return {
          primary: '#FF6B35',      // Energizing orange-red
          accent: '#F7931E',       // Warm amber
          background: '#FFF8DC',   // Soft cream
          breathing: '#FFE135',    // Yellow for alertness
          text: '#1A1A1A',        // Dark text
          success: '#16A34A',     // Fresh green
          warning: '#EA580C',     // Vibrant orange
          error: '#DC2626'        // Red
        };
      case 'afternoon':
        return {
          primary: '#4ECDC4',      // Balanced teal
          accent: '#45B7D1',       // Calming blue
          background: '#F0F8FF',   // Alice blue
          breathing: '#98FB98',    // Mint green
          text: '#1F2937',        // Dark gray
          success: '#059669',     // Teal green
          warning: '#D97706',     // Orange
          error: '#DC2626'        // Red
        };
      case 'evening':
        return {
          primary: '#6B73FF',      // Calming indigo
          accent: '#9D4EDD',       // Lavender purple
          background: '#1A1A2E',   // Deep navy
          breathing: '#FF6B9D',    // Soft pink
          text: '#F1F5F9',        // Light text
          success: '#10B981',     // Emerald
          warning: '#F59E0B',     // Amber
          error: '#EF4444'        // Red
        };
      default:
        return {
          primary: '#1E1B4B',      // Deep indigo
          accent: '#312E81',       // Dark purple
          background: '#0F0C29',   // Very dark
          breathing: '#4C1D95',    // Purple
          text: '#E0E7FF',        // Light indigo
          success: '#22C55E',     // Green
          warning: '#F59E0B',     // Amber
          error: '#EF4444'        // Red
        };
    }
  }

  private adjustColorsForStress(
    baseColors: TherapeuticColorPalette,
    stressLevel: number
  ): TherapeuticColorPalette {
    if (stressLevel > 70) {
      // High stress - cooler, more calming colors
      return {
        ...baseColors,
        primary: '#4ECDC4',      // Teal
        accent: '#45B7D1',       // Sky blue
        breathing: '#98FB98',    // Light green
        background: this.adjustSaturation(baseColors.background, -20)
      };
    } else if (stressLevel < 30) {
      // Low stress - can handle more energizing colors
      return {
        ...baseColors,
        primary: '#FF6B35',      // Orange
        accent: '#F7931E',       // Amber
        breathing: '#FFE135'     // Yellow
      };
    }

    return baseColors;
  }

  private personalizeColors(
    baseColors: TherapeuticColorPalette,
    mood: string,
    goals: string[]
  ): TherapeuticColorPalette {
    // Adjust colors based on mood and goals
    if (goals.includes('energy')) {
      return {
        ...baseColors,
        primary: '#FF6B35',      // Energizing orange
        accent: '#F7931E'        // Warm amber
      };
    }

    if (mood === 'anxious') {
      return {
        ...baseColors,
        primary: '#4ECDC4',      // Calming teal
        breathing: '#98FB98'     // Soothing green
      };
    }

    return baseColors;
  }

  private getBreathingPattern(technique: string) {
    switch (technique) {
      case 'box':
        return [
          { phase: 'inhale', duration: 4 },
          { phase: 'hold', duration: 4 },
          { phase: 'exhale', duration: 4 },
          { phase: 'hold', duration: 4 }
        ];
      case '4-7-8':
        return [
          { phase: 'inhale', duration: 4 },
          { phase: 'hold', duration: 7 },
          { phase: 'exhale', duration: 8 }
        ];
      case 'coherent':
        return [
          { phase: 'inhale', duration: 5 },
          { phase: 'exhale', duration: 5 }
        ];
      default:
        return [
          { phase: 'inhale', duration: 4 },
          { phase: 'exhale', duration: 6 }
        ];
    }
  }

  private getBreathingColors(stressLevel: number): string[] {
    if (stressLevel > 70) {
      return ['#4ECDC4', '#45B7D1', '#98FB98', '#87CEEB']; // Calming blues and greens
    } else if (stressLevel < 30) {
      return ['#FFE135', '#FF6B35', '#F7931E', '#FFA500']; // Energizing yellows and oranges
    } else {
      return ['#6366F1', '#8B5CF6', '#34D399', '#60A5FA']; // Balanced purples and blues
    }
  }

  private getMotivationalColors(recoveryStatus: string, hrvScore: number): string[] {
    if (recoveryStatus === 'optimal' && hrvScore > 70) {
      return ['#16A34A', '#10B981', '#059669']; // Strong greens
    } else if (recoveryStatus === 'rest') {
      return ['#F59E0B', '#EAB308', '#CA8A04']; // Gentle yellows
    } else {
      return ['#6366F1', '#8B5CF6', '#A855F7']; // Balanced purples
    }
  }

  private getIntensityColor(intensity: number): string {
    const colors = ['#10B981', '#22C55E', '#F59E0B', '#EF4444', '#DC2626'];
    // Accept either a normalized intensity (0.0-1.0) or a level (1-5).
    if (intensity <= 1) {
      // Map normalized value to index 0..4
      const idx = Math.max(0, Math.min(colors.length - 1, Math.floor(intensity * colors.length)));
      return colors[idx] || '#6B7280';
    }

    // Treat as 1-5 level
    const level = Math.round(intensity);
    const idx = Math.max(0, Math.min(colors.length - 1, level - 1));
    return colors[idx] || '#6B7280';
  }

  private interpolateColor(color1: string, color2: string, factor: number): string {
    // Interpolate two hex colors (e.g. #RRGGBB)
    const f = Math.max(0, Math.min(1, factor));
    const hex = (c: string) => {
      c = c.replace('#', '');
      if (c.length === 3) c = c.split('').map(x => x + x).join('');
      return [
        parseInt(c.substring(0, 2), 16),
        parseInt(c.substring(2, 4), 16),
        parseInt(c.substring(4, 6), 16)
      ];
    };
    const [r1, g1, b1] = hex(color1);
    const [r2, g2, b2] = hex(color2);
    const r = Math.round(r1 + (r2 - r1) * f);
    const g = Math.round(g1 + (g2 - g1) * f);
    const b = Math.round(b1 + (b2 - b1) * f);
    return (
      '#' +
      [r, g, b]
        .map((x) => x.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()
    );
  }

  private adjustSaturation(color: string, adjustment: number): string {
    // Would implement proper HSL adjustment in production
    return color;
  }

  private adjustBrightness(color: string, adjustment: number): string {
    // Would implement proper brightness adjustment in production
    return color;
  }
}

export default ChromotherapyService;
