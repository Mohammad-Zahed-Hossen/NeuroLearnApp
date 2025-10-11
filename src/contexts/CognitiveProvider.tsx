// src/contexts/CognitiveProvider.tsx
// Enhances existing FocusContext and SoundscapeContext with cognitive load awareness

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocus } from './FocusContext';
import { useSoundscape } from './SoundscapeContext';
import StorageService from '../services/storage/StorageService';
import { CircadianIntelligenceService } from '../services/health/CircadianIntelligenceService';

interface CognitiveMetrics {
  focusScore: number; // 0-1 scale
  attentionSpan: number; // minutes
  taskSwitchingRate: number; // switches per hour
  errorRate: number; // 0-1 scale
  responseTime: number; // milliseconds
  sessionQuality: 'excellent' | 'good' | 'moderate' | 'poor';
}

interface CognitiveState {
  // Core metrics (integrates with existing contexts)
  cognitiveLoad: number; // 0-1 scale
  mentalFatigue: number; // 0-1 scale
  attentionScore: number; // 0-1 scale

  // UI adaptation
  uiMode: 'simple' | 'normal' | 'advanced';
  adaptiveComplexity: boolean;

  // Learning state
  learningPhase: 'acquiring' | 'consolidating' | 'mastering' | 'maintaining';
  optimalSessionLength: number; // minutes

  // Environmental factors
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  isWeekend: boolean;
  sessionCount: number; // sessions today

  // Integration with existing contexts
  focusIntegration: boolean;
  soundscapeIntegration: boolean;

  // Historical data
  weeklyTrends: {
    avgCognitiveLoad: number;
    peakPerformanceHours: string[];
    optimalBreakFrequency: number;
  };
}

interface CognitiveActions {
  updateCognitiveLoad: (load: number) => void;
  recordSession: (metrics: Partial<CognitiveMetrics>) => void;
  adaptUI: (forceMode?: 'simple' | 'normal' | 'advanced') => void;
  resetDay: () => void;
  getOptimalSessionSize: () => number;
  shouldSuggestBreak: () => boolean;
  getPersonalizedRecommendations: () => Promise<string[]>;
  integrateFocusState: (focusActive: boolean) => void;
  integrateSoundscapeState: (preset: string, isActive: boolean) => void;
}

type CognitiveContextType = CognitiveState & CognitiveActions;

const CognitiveContext = createContext<CognitiveContextType | null>(null);

interface CognitiveProviderProps {
  children: ReactNode;
}

export const CognitiveProvider: React.FC<CognitiveProviderProps> = ({
  children,
}) => {
  const [cognitiveState, setCognitiveState] = useState<CognitiveState>({
    cognitiveLoad: 0.5,
    mentalFatigue: 0.3,
    attentionScore: 0.7,
    uiMode: 'normal',
    adaptiveComplexity: true,
    learningPhase: 'acquiring',
    optimalSessionLength: 25,
    timeOfDay: 'morning',
    isWeekend: false,
    sessionCount: 0,
    focusIntegration: true,
    soundscapeIntegration: true,
    weeklyTrends: {
      avgCognitiveLoad: 0.5,
      peakPerformanceHours: ['09:00', '14:00'],
      optimalBreakFrequency: 4,
    },
  });

  const [storageService] = useState(() => StorageService.getInstance());
  const [circadianService] = useState(() =>
    CircadianIntelligenceService.getInstance(),
  );

  // Get existing contexts for integration
  const focusContext = useFocus?.(); // Optional integration
  const soundscapeContext = useSoundscape?.(); // Optional integration

  // Initialize cognitive state from storage
  useEffect(() => {
    loadCognitiveProfile();
    determineTimeOfDay();

    const interval = setInterval(() => {
      determineTimeOfDay();
      updateEnvironmentalFactors();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Integrate with existing FocusContext
  useEffect(() => {
    if (focusContext && cognitiveState.focusIntegration) {
      integrateFocusState(focusContext.isFocusActive);
    }
  }, [focusContext?.isFocusActive, cognitiveState.focusIntegration]);

  // Integrate with existing SoundscapeContext
  useEffect(() => {
    if (soundscapeContext && cognitiveState.soundscapeIntegration) {
      integrateSoundscapeState(
        soundscapeContext.currentPreset,
        soundscapeContext.isActive,
      );
    }
  }, [
    soundscapeContext?.currentPreset,
    soundscapeContext?.isActive,
    cognitiveState.soundscapeIntegration,
  ]);

  // Auto-adapt UI based on cognitive load changes
  useEffect(() => {
    if (cognitiveState.adaptiveComplexity) {
      autoAdaptUI();
    }
  }, [cognitiveState.cognitiveLoad, cognitiveState.mentalFatigue]);

  const loadCognitiveProfile = async () => {
    try {
      // Prefer the StorageService facade so profile/config flows through hybrid pipeline
      const settings = await storageService.getSettings();
      let applied = false;

      if (settings && settings.cognitiveSettings) {
        // Map the small cognitiveSettings blob into the richer cognitive state where possible
        const cs = settings.cognitiveSettings;
        setCognitiveState((prev) => ({
          ...prev,
          adaptiveComplexity: !!cs.adaptiveComplexity,
          // keep other runtime defaults; cognitiveLoad will still start fresh
          sessionCount: 0,
          cognitiveLoad: 0.5,
        }));
        applied = true;
      }

      if (!applied) {
        // Best-effort legacy fallback: load a more complete profile from AsyncStorage if present
        try {
          const profile = await AsyncStorage.getItem(
            '@neurolearn/cognitive_profile',
          );
          if (profile) {
            const parsedProfile = JSON.parse(profile);
            setCognitiveState((prev) => ({
              ...prev,
              ...parsedProfile,
              sessionCount: 0, // Reset daily counters
              cognitiveLoad: 0.5, // Start fresh
            }));
          }
        } catch (e) {
          console.warn(
            'AsyncStorage fallback failed loading cognitive profile:',
            e,
          );
        }
      }
    } catch (error) {
      console.warn(
        'Failed to load cognitive profile via StorageService, falling back to AsyncStorage:',
        error,
      );
      try {
        const profile = await AsyncStorage.getItem(
          '@neurolearn/cognitive_profile',
        );
        if (profile) {
          const parsedProfile = JSON.parse(profile);
          setCognitiveState((prev) => ({
            ...prev,
            ...parsedProfile,
            sessionCount: 0,
            cognitiveLoad: 0.5,
          }));
        }
      } catch (err) {
        console.error(
          'Error loading cognitive profile from AsyncStorage fallback:',
          err,
        );
      }
    }
  };

  const determineTimeOfDay = () => {
    const hour = new Date().getHours();
    let timeOfDay: CognitiveState['timeOfDay'] = 'morning';

    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'night';

    const isWeekend = [0, 6].includes(new Date().getDay());

    setCognitiveState((prev) => ({ ...prev, timeOfDay, isWeekend }));
  };

  const updateEnvironmentalFactors = () => {
    const hour = new Date().getHours();
    const { peakPerformanceHours } = cognitiveState.weeklyTrends;

    const isPeakHour = peakPerformanceHours.some((peakHour) => {
      const peakHourNum = parseInt(peakHour.split(':')[0]);
      return Math.abs(hour - peakHourNum) <= 1;
    });

    if (isPeakHour) {
      setCognitiveState((prev) => ({
        ...prev,
        attentionScore: Math.min(1, prev.attentionScore + 0.1),
        cognitiveLoad: Math.max(0, prev.cognitiveLoad - 0.1),
      }));
    }
  };

  const autoAdaptUI = () => {
    const { cognitiveLoad, mentalFatigue, sessionCount } = cognitiveState;

    if (
      cognitiveLoad > 0.75 ||
      mentalFatigue > 0.8 ||
      sessionCount > 8 ||
      cognitiveState.timeOfDay === 'night'
    ) {
      setCognitiveState((prev) => ({ ...prev, uiMode: 'simple' }));
    } else if (
      cognitiveLoad < 0.3 &&
      mentalFatigue < 0.4 &&
      cognitiveState.timeOfDay === 'morning'
    ) {
      setCognitiveState((prev) => ({ ...prev, uiMode: 'advanced' }));
    } else {
      setCognitiveState((prev) => ({ ...prev, uiMode: 'normal' }));
    }
  };

  // Cognitive Actions Implementation
  const updateCognitiveLoad = (load: number) => {
    const clampedLoad = Math.max(0, Math.min(1, load));

    setCognitiveState((prev) => {
      const newFatigue = Math.min(
        1,
        prev.mentalFatigue + (clampedLoad > 0.7 ? 0.05 : -0.02),
      );
      const newAttention = Math.max(
        0,
        prev.attentionScore + (clampedLoad < 0.5 ? 0.02 : -0.03),
      );

      return {
        ...prev,
        cognitiveLoad: clampedLoad,
        mentalFatigue: newFatigue,
        attentionScore: newAttention,
      };
    });

    // Update integrated soundscape based on cognitive load
    if (soundscapeContext && cognitiveState.soundscapeIntegration) {
      soundscapeContext.updateCognitiveLoad(clampedLoad);
    }
  };

  const recordSession = async (metrics: Partial<CognitiveMetrics>) => {
    try {
      const sessionData = {
        timestamp: new Date().toISOString(),
        cognitiveLoad: cognitiveState.cognitiveLoad,
        metrics,
        uiMode: cognitiveState.uiMode,
        sessionNumber: cognitiveState.sessionCount,
        focusActive: focusContext?.isFocusActive || false,
        soundscapeActive: soundscapeContext?.isActive || false,
      };

      await storageService.saveFocusSession({
        id: `cognitive_${Date.now()}`,
        taskId: focusContext?.getFocusNodeId() || 'general',
        startTime: new Date(Date.now() - (metrics.responseTime || 1500)),
        endTime: new Date(),
        durationMinutes: cognitiveState.optimalSessionLength,
        plannedDurationMinutes: cognitiveState.optimalSessionLength,
        distractionCount: Math.round((metrics.errorRate || 0.1) * 10),
        distractionEvents: [],
        selfReportFocus: Math.round((metrics.focusScore || 0.5) * 5) as
          | 1
          | 2
          | 3
          | 4
          | 5,
        completionRate: metrics.focusScore || 0.5,
        cognitiveLoadStart: cognitiveState.cognitiveLoad,
        cognitiveLoadEnd: cognitiveState.cognitiveLoad,
        focusLockUsed: focusContext?.isFocusActive || false,
        created: new Date(),
        modified: new Date(),
      });

      updateLearningPhase(metrics);
    } catch (error) {
      console.error('Error recording session:', error);
    }
  };

  const updateLearningPhase = (metrics: Partial<CognitiveMetrics>) => {
    const { focusScore = 0.5, errorRate = 0.3 } = metrics;

    let newPhase = cognitiveState.learningPhase;

    if (focusScore > 0.8 && errorRate < 0.1) {
      newPhase = 'mastering';
    } else if (focusScore > 0.6 && errorRate < 0.2) {
      newPhase = 'consolidating';
    } else if (focusScore < 0.4 || errorRate > 0.4) {
      newPhase = 'acquiring';
    } else {
      newPhase = 'maintaining';
    }

    setCognitiveState((prev) => ({ ...prev, learningPhase: newPhase }));
  };

  const adaptUI = (forceMode?: 'simple' | 'normal' | 'advanced') => {
    if (forceMode) {
      setCognitiveState((prev) => ({
        ...prev,
        uiMode: forceMode,
        adaptiveComplexity: false,
      }));
    } else {
      setCognitiveState((prev) => ({
        ...prev,
        adaptiveComplexity: true,
      }));
      autoAdaptUI();
    }
  };

  const resetDay = () => {
    setCognitiveState((prev) => ({
      ...prev,
      sessionCount: 0,
      cognitiveLoad: 0.5,
      mentalFatigue: 0.2,
      attentionScore: 0.8,
    }));
  };

  const getOptimalSessionSize = (): number => {
    const { cognitiveLoad, learningPhase, timeOfDay } = cognitiveState;

    let baseSize = 25; // minutes

    if (cognitiveLoad > 0.7) baseSize = Math.max(10, baseSize - 10);
    else if (cognitiveLoad < 0.4) baseSize = baseSize + 5;

    switch (learningPhase) {
      case 'acquiring':
        baseSize = Math.max(15, baseSize - 5);
        break;
      case 'consolidating':
        baseSize = baseSize;
        break;
      case 'mastering':
        baseSize = baseSize + 5;
        break;
      case 'maintaining':
        baseSize = baseSize - 5;
        break;
    }

    if (timeOfDay === 'morning') baseSize = baseSize + 5;
    else if (timeOfDay === 'night') baseSize = Math.max(10, baseSize - 10);

    return Math.min(45, Math.max(10, baseSize));
  };

  const shouldSuggestBreak = (): boolean => {
    return (
      cognitiveState.cognitiveLoad > 0.75 ||
      cognitiveState.mentalFatigue > 0.7 ||
      cognitiveState.sessionCount %
        cognitiveState.weeklyTrends.optimalBreakFrequency ===
        0
    );
  };

  const getPersonalizedRecommendations = async (): Promise<string[]> => {
    const recommendations: string[] = [];
    const { cognitiveLoad, learningPhase, timeOfDay, sessionCount } =
      cognitiveState;

    // Get circadian data for personalized recommendations
    let circadianData = null;
    try {
      // Assuming we have a userId - in real implementation, this would come from auth context
      const userId = 'current_user'; // Placeholder
      const sleepPressure = await circadianService.calculateSleepPressure(
        userId,
      );
      const optimalWindow = await circadianService.predictOptimalSleepWindow(
        userId,
      );
      const crdi = await circadianService.calculateCRDI(userId);
      circadianData = { sleepPressure, optimalWindow, crdi };
    } catch (error) {
      console.warn(
        'Could not fetch circadian data for recommendations:',
        error,
      );
    }

    if (cognitiveLoad > 0.7) {
      recommendations.push('🧘 Take a 5-minute mindfulness break');
      recommendations.push('💧 Stay hydrated - drink some water');
      recommendations.push('📱 Switch to Simple Mode to reduce cognitive load');
    }

    if (learningPhase === 'acquiring') {
      recommendations.push('🎯 Focus on understanding rather than speed');
      recommendations.push('📝 Use active recall techniques');
    } else if (learningPhase === 'mastering') {
      recommendations.push('🎲 Try challenging variations');
      recommendations.push('🎨 Apply knowledge in creative ways');
    }

    if (timeOfDay === 'morning') {
      recommendations.push('☕ Perfect time for complex cognitive tasks');
    } else if (timeOfDay === 'evening') {
      recommendations.push('📚 Good time for review and consolidation');
    }

    if (sessionCount > 6) {
      recommendations.push('🚶 Take a longer break and move around');
    }

    // Circadian-based recommendations
    if (circadianData) {
      const { sleepPressure, optimalWindow, crdi } = circadianData;
      const now = new Date();

      // Sleep pressure recommendations
      if (sleepPressure.currentPressure > 80) {
        recommendations.push(
          '😴 High sleep pressure detected - consider a short nap',
        );
        recommendations.push(
          '🌙 Prepare for optimal sleep window at ' +
            optimalWindow.bedtime.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
        );
      }

      // Circadian rhythm health
      if (crdi < 50) {
        recommendations.push(
          '⏰ Your circadian rhythm needs attention - maintain consistent sleep schedule',
        );
        recommendations.push(
          '🌅 Try morning sunlight exposure to improve circadian health',
        );
      }

      // Time-based cognitive recommendations
      const hour = now.getHours();
      if (hour >= 14 && hour <= 16) {
        recommendations.push(
          '🌞 Afternoon dip detected - consider light exercise or caffeine',
        );
      } else if (hour >= 20) {
        recommendations.push(
          '🌙 Evening hours - focus on memory consolidation tasks',
        );
      }
    }

    // Integrate soundscape recommendations
    if (
      soundscapeContext &&
      !soundscapeContext.isActive &&
      cognitiveLoad > 0.6
    ) {
      recommendations.push(
        '🎵 Try a focus soundscape to improve concentration',
      );
    }

    // Add circadian-aware soundscape recommendation
    if (circadianData && soundscapeContext && !soundscapeContext.isActive) {
      const hour = new Date().getHours();
      if (hour >= 20 || hour < 6) {
        recommendations.push(
          '🌙 Try deep rest soundscape for better sleep preparation',
        );
      } else if (cognitiveLoad > 0.5) {
        recommendations.push(
          '🎵 Auto-select circadian soundscape for optimal focus',
        );
      }
    }

    return recommendations.slice(0, 3);
  };

  // Integration methods
  const integrateFocusState = (focusActive: boolean) => {
    if (focusActive) {
      setCognitiveState((prev) => ({
        ...prev,
        sessionCount: prev.sessionCount + 1,
        cognitiveLoad: Math.min(1, prev.cognitiveLoad + 0.1),
      }));
    }
  };

  const integrateSoundscapeState = (preset: string, isActive: boolean) => {
    if (isActive && preset !== 'none') {
      // Soundscape can help reduce cognitive load
      setCognitiveState((prev) => ({
        ...prev,
        cognitiveLoad: Math.max(0, prev.cognitiveLoad - 0.05),
        mentalFatigue: Math.max(0, prev.mentalFatigue - 0.02),
      }));
    }
  };

  const contextValue: CognitiveContextType = {
    ...cognitiveState,
    updateCognitiveLoad,
    recordSession,
    adaptUI,
    resetDay,
    getOptimalSessionSize,
    shouldSuggestBreak,
    getPersonalizedRecommendations,
    integrateFocusState,
    integrateSoundscapeState,
  };

  return (
    <CognitiveContext.Provider value={contextValue}>
      {children}
    </CognitiveContext.Provider>
  );
};

export const useCognitive = (): CognitiveContextType => {
  const context = useContext(CognitiveContext);
  if (!context) {
    throw new Error('useCognitive must be used within a CognitiveProvider');
  }
  return context;
};

export default CognitiveProvider;
