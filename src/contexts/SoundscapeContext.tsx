import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import { AppState } from 'react-native';
import {
  cognitiveSoundscapeEngine,
  SoundscapeType,
} from '../services/learning/CognitiveSoundscapeEngine';
import StorageService from '../services/storage/StorageService';
import { validatePresetAssets } from '../services/learning/SoundscapeAssetValidator';

// Reuse the implementation from the previous context file but fix TSX/typing issues
export interface SoundscapeContextState {
  currentPreset: SoundscapeType;
  isActive: boolean;
  volume: number;
  adaptiveMode: boolean;

  currentFrequency: number;
  cognitiveLoad: number;
  entrainmentStrength: number;
  effectivenessScore: number;

  sessionDuration: number;
  adaptationCount: number;

  miniPlayerVisible: boolean;
  settingsModalVisible: boolean;

  currentScreen: string;
  screenPresets: Record<string, SoundscapeType>;

  learningEnabled: boolean;
  performanceHistory: any[];

  isInitialized: boolean;
  lastError: string | null;
}

export interface PerformanceRecord {
  screen: string;
  preset: SoundscapeType;
  performance: number;
  cognitiveLoad: number;
  timestamp: Date;
  sessionDuration: number;
}

export interface SoundscapeContextActions {
  startPreset: (preset: SoundscapeType, options?: any) => Promise<void>;
  stopSoundscape: (fadeOut?: boolean) => Promise<void>;
  setVolume: (volume: number) => void;
  toggleAdaptiveMode: () => void;

  switchScreen: (screenName: string) => Promise<void>;
  setScreenPreset: (screen: string, preset: SoundscapeType) => void;

  recordPerformance: (performance: number) => void;
  updateCognitiveLoad: (load: number) => void;
  toggleLearningMode: () => void;

  toggleMiniPlayer: () => void;
  openSettings: () => void;
  closeSettings: () => void;

  initialize: () => Promise<void>;
  reset: () => Promise<void>;
  clearError: () => void;
}

export type SoundscapeContextValue = SoundscapeContextState &
  SoundscapeContextActions;

type SoundscapeAction =
  | { type: 'INITIALIZE_SUCCESS' }
  | { type: 'INITIALIZE_ERROR'; payload: string }
  | {
      type: 'PRESET_START';
      payload: { preset: SoundscapeType; frequency: number };
    }
  | { type: 'PRESET_STOP' }
  | { type: 'VOLUME_CHANGE'; payload: number }
  | { type: 'ADAPTIVE_MODE_TOGGLE' }
  | { type: 'SCREEN_SWITCH'; payload: string }
  | {
      type: 'SCREEN_PRESET_SET';
      payload: { screen: string; preset: SoundscapeType };
    }
  | { type: 'COGNITIVE_LOAD_UPDATE'; payload: number }
  | { type: 'PERFORMANCE_RECORD'; payload: PerformanceRecord }
  | { type: 'LEARNING_MODE_TOGGLE' }
  | { type: 'MINI_PLAYER_TOGGLE' }
  | { type: 'SETTINGS_OPEN' }
  | { type: 'SETTINGS_CLOSE' }
  | { type: 'STATE_UPDATE'; payload: Partial<SoundscapeContextState> }
  | { type: 'ERROR_CLEAR' }
  | { type: 'RESET' };

const defaultState: SoundscapeContextState = {
  currentPreset: 'none',
  isActive: false,
  volume: 0.7,
  adaptiveMode: true,

  currentFrequency: 0,
  cognitiveLoad: 0.5,
  entrainmentStrength: 0,
  effectivenessScore: 0,

  sessionDuration: 0,
  adaptationCount: 0,

  miniPlayerVisible: true,
  settingsModalVisible: false,

  currentScreen: 'dashboard',
  screenPresets: {
    dashboard: 'calm_readiness',
    logic: 'reasoning_boost',
    flashcards: 'memory_flow',
    focus: 'deep_focus',
    speed_reading: 'speed_integration',
    memory_palace: 'visualization',
    sleep: 'deep_rest',
  },

  learningEnabled: true,
  performanceHistory: [],

  isInitialized: false,
  lastError: null,
};

function soundscapeReducer(
  state: SoundscapeContextState,
  action: SoundscapeAction,
): SoundscapeContextState {
  switch (action.type) {
    case 'INITIALIZE_SUCCESS':
      return { ...state, isInitialized: true, lastError: null };
    case 'INITIALIZE_ERROR':
      return { ...state, isInitialized: false, lastError: action.payload };
    case 'PRESET_START':
      return {
        ...state,
        currentPreset: action.payload.preset,
        isActive: true,
        currentFrequency: action.payload.frequency,
        sessionDuration: 0,
        adaptationCount: 0,
        effectivenessScore: 0,
        lastError: null,
      };
    case 'PRESET_STOP':
      return {
        ...state,
        currentPreset: 'none',
        isActive: false,
        currentFrequency: 0,
        entrainmentStrength: 0,
      };
    case 'VOLUME_CHANGE':
      return { ...state, volume: action.payload };
    case 'ADAPTIVE_MODE_TOGGLE':
      return { ...state, adaptiveMode: !state.adaptiveMode };
    case 'SCREEN_SWITCH':
      return { ...state, currentScreen: action.payload };
    case 'SCREEN_PRESET_SET':
      return {
        ...state,
        screenPresets: {
          ...state.screenPresets,
          [action.payload.screen]: action.payload.preset,
        },
      };
    case 'COGNITIVE_LOAD_UPDATE':
      return { ...state, cognitiveLoad: action.payload };
    case 'PERFORMANCE_RECORD':
      const newHistory = [...state.performanceHistory, action.payload];
      return { ...state, performanceHistory: newHistory.slice(-100) };
    case 'LEARNING_MODE_TOGGLE':
      return { ...state, learningEnabled: !state.learningEnabled };
    case 'MINI_PLAYER_TOGGLE':
      return { ...state, miniPlayerVisible: !state.miniPlayerVisible };
    case 'SETTINGS_OPEN':
      return { ...state, settingsModalVisible: true };
    case 'SETTINGS_CLOSE':
      return { ...state, settingsModalVisible: false };
    case 'STATE_UPDATE':
      return { ...state, ...action.payload };
    case 'ERROR_CLEAR':
      return { ...state, lastError: null };
    case 'RESET':
      return { ...defaultState, isInitialized: state.isInitialized };
    default:
      return state;
  }
}

const SoundscapeContext = createContext<SoundscapeContextValue | null>(null);

export interface SoundscapeProviderProps {
  children: ReactNode;
  autoInitialize?: boolean;
  persistSettings?: boolean;
}

export const SoundscapeProvider: React.FC<SoundscapeProviderProps> = ({
  children,
  autoInitialize = true,
  persistSettings = true,
}) => {
  const [state, dispatch] = useReducer(soundscapeReducer, defaultState);

  const initialize = useCallback(async () => {
    try {
      console.log('🎵 Initializing Cognitive Soundscape System...');

      // Run a lightweight runtime validation to ensure presets reference bundled assets
      // This logs missing mappings to the console during startup for easier debugging.
      try {
        validatePresetAssets();
      } catch (e) {
        console.warn('⚠️ Preset asset validation failed:', e);
      }

      if (persistSettings) {
        await loadPersistedSettings();
      }

      // Engine listeners and background handling are set up in a dedicated effect
      // to ensure we return a proper cleanup function that removes listeners
      // and subscriptions when the provider unmounts.

      dispatch({ type: 'INITIALIZE_SUCCESS' });
      console.log('✅ Cognitive Soundscape System initialized');
    } catch (err) {
      const error = err as any;
      console.error('❌ Failed to initialize soundscape system:', error);
      dispatch({
        type: 'INITIALIZE_ERROR',
        payload: error?.message ?? String(error),
      });
    }
  }, [persistSettings]);

  // Ensure engine listeners and AppState subscription are cleaned up on unmount.
  useEffect(() => {
    // Register engine listeners (store handler refs so cleanup can remove only these)
    const analyticsHandler = (data: any) => {
      dispatch({
        type: 'STATE_UPDATE',
        payload: {
          sessionDuration: data.sessionDuration || 0,
          effectivenessScore: data.effectivenessScore || 0,
          entrainmentStrength:
            data.entraintmentStrength || data.entrainmentStrength || 0,
          adaptationCount: data.adaptationCount || 0,
        },
      });
    };

    const adaptationHandler = (data: any) => {
      console.log('🔄 Soundscape adaptation triggered:', data);
    };

    const cognitiveLoadHandler = (data: any) => {
      dispatch({ type: 'COGNITIVE_LOAD_UPDATE', payload: data.cognitiveLoad });
    };

    const startedHandler = (data: any) => {
      console.log('🎧 Soundscape started:', data);
    };

    const stoppedHandler = (data: any) => {
      console.log('⏹️ Soundscape stopped:', data);
      dispatch({ type: 'PRESET_STOP' });
    };

    cognitiveSoundscapeEngine.on('analytics_updated', analyticsHandler);
    cognitiveSoundscapeEngine.on('adaptation_triggered', adaptationHandler);
    cognitiveSoundscapeEngine.on(
      'cognitive_load_updated',
      cognitiveLoadHandler,
    );
    cognitiveSoundscapeEngine.on('soundscape_started', startedHandler);
    cognitiveSoundscapeEngine.on('soundscape_stopped', stoppedHandler);

    // Setup AppState background handling and capture cleanup
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background' && state.isActive) {
        console.log('📱 App backgrounded - soundscape continuing');
      } else if (nextAppState === 'active' && state.isActive) {
        console.log('📱 App foregrounded - soundscape active');
      }
    };

    const appSub = AppState.addEventListener(
      'change',
      handleAppStateChange as any,
    );

    return () => {
      try {
        cognitiveSoundscapeEngine.off('analytics_updated', analyticsHandler);
        cognitiveSoundscapeEngine.off(
          'adaptation_triggered',
          adaptationHandler,
        );
        cognitiveSoundscapeEngine.off(
          'cognitive_load_updated',
          cognitiveLoadHandler,
        );
        cognitiveSoundscapeEngine.off('soundscape_started', startedHandler);
        cognitiveSoundscapeEngine.off('soundscape_stopped', stoppedHandler);
      } catch (e) {
        /* ignore: best-effort cleanup */
      }

      try {
        appSub.remove();
      } catch (e) {
        /* noop for older RN versions */
      }
    };
    // Intentionally leave dependencies minimal to run once on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (autoInitialize && !state.isInitialized) {
      initialize();
    }
  }, [autoInitialize, state.isInitialized, initialize]);

  // setupEngineListeners was removed — listeners are registered in the mount
  // effect above using named handlers so they can be removed precisely on
  // unmount. Leaving this function would risk duplicate anonymous listeners
  // that cannot be off()'d easily.

  const setupBackgroundHandling = useCallback(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background' && state.isActive) {
        console.log('📱 App backgrounded - soundscape continuing');
      } else if (nextAppState === 'active' && state.isActive) {
        console.log('📱 App foregrounded - soundscape active');
      }
    };

    const sub = AppState.addEventListener(
      'change',
      handleAppStateChange as any,
    );

    return () => {
      try {
        sub.remove();
      } catch (e) {
        /* noop for older RN versions */
      }
    };
  }, [state.isActive]);

  const loadPersistedSettings = useCallback(async () => {
    try {
      const storage = StorageService.getInstance();
      const settings: any = await storage.getSettings();

      if (settings?.soundscapeSettings) {
        dispatch({
          type: 'STATE_UPDATE',
          payload: {
            volume: settings.soundscapeSettings.volume ?? defaultState.volume,
            adaptiveMode:
              settings.soundscapeSettings.adaptiveMode ??
              defaultState.adaptiveMode,
            learningEnabled:
              settings.soundscapeSettings.learningEnabled ??
              defaultState.learningEnabled,
            screenPresets:
              settings.soundscapeSettings.screenPresets ??
              defaultState.screenPresets,
          },
        });
      }
    } catch (err) {
      console.warn('⚠️ Failed to load soundscape settings:', err);
    }
  }, []);

  const saveSettingsToStorage = useCallback(async () => {
    if (!persistSettings) return;

    try {
      const storage = StorageService.getInstance();
      const settings: any = await storage.getSettings();

      await storage.saveSettings({
        ...settings,
        soundscapeSettings: {
          volume: state.volume,
          adaptiveMode: state.adaptiveMode,
          learningEnabled: state.learningEnabled,
          screenPresets: state.screenPresets,
        },
      });
    } catch (err) {
      console.warn('⚠️ Failed to persist soundscape settings:', err);
    }
  }, [
    state.volume,
    state.adaptiveMode,
    state.learningEnabled,
    state.screenPresets,
    persistSettings,
  ]);

  useEffect(() => {
    if (state.isInitialized) {
      saveSettingsToStorage();
    }
  }, [
    state.volume,
    state.adaptiveMode,
    state.learningEnabled,
    saveSettingsToStorage,
    state.isInitialized,
  ]);

  const startPreset = useCallback(
    async (preset: SoundscapeType, options: any = {}) => {
      try {
        const effectiveCognitiveLoad =
          options.cognitiveLoad ?? state.cognitiveLoad;

        await cognitiveSoundscapeEngine.startSoundscape(preset, {
          cognitiveLoad: effectiveCognitiveLoad,
          adaptiveMode: options.adaptiveMode ?? state.adaptiveMode,
          fadeIn: options.fadeIn ?? true,
        });

        const engineState = cognitiveSoundscapeEngine.getState();

        dispatch({
          type: 'PRESET_START',
          payload: { preset, frequency: engineState.currentFrequency || 0 },
        });
      } catch (err) {
        const error = err as any;
        console.error('❌ Failed to start preset:', error);
        dispatch({
          type: 'INITIALIZE_ERROR',
          payload: error?.message ?? String(error),
        });
      }
    },
    [state.cognitiveLoad, state.adaptiveMode],
  );

  const stopSoundscape = useCallback(async () => {
    try {
      await cognitiveSoundscapeEngine.stopSoundscape();
      dispatch({ type: 'PRESET_STOP' });
    } catch (err) {
      console.error('❌ Failed to stop soundscape:', err);
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    cognitiveSoundscapeEngine.setVolume(clampedVolume);
    dispatch({ type: 'VOLUME_CHANGE', payload: clampedVolume });
  }, []);

  const toggleAdaptiveMode = useCallback(() => {
    dispatch({ type: 'ADAPTIVE_MODE_TOGGLE' });
  }, []);

  const switchScreen = useCallback(
    async (screenName: string) => {
      dispatch({ type: 'SCREEN_SWITCH', payload: screenName });

      if (
        state.isActive &&
        state.adaptiveMode &&
        state.screenPresets[screenName]
      ) {
        const newPreset = state.screenPresets[screenName];
        if (newPreset !== state.currentPreset) {
          console.log(
            `🔄 Auto-switching to ${newPreset} for screen ${screenName}`,
          );
          await startPreset(newPreset, {
            fadeIn: true,
            screenContext: screenName,
          });
        }
      }
    },
    [
      state.isActive,
      state.adaptiveMode,
      state.screenPresets,
      state.currentPreset,
      startPreset,
    ],
  );

  const setScreenPreset = useCallback(
    (screen: string, preset: SoundscapeType) => {
      dispatch({ type: 'SCREEN_PRESET_SET', payload: { screen, preset } });
    },
    [],
  );

  const recordPerformance = useCallback(
    async (performance: number) => {
      if (!state.learningEnabled) return;

      const record: PerformanceRecord = {
        screen: state.currentScreen,
        preset: state.currentPreset,
        performance,
        cognitiveLoad: state.cognitiveLoad,
        timestamp: new Date(),
        sessionDuration: state.sessionDuration,
      };

      try {
        await cognitiveSoundscapeEngine.recordSoundscapePerformance({
          taskCompletion: performance,
          userSatisfaction: performance * 5, // Convert 0-1 to 1-5 scale
          focusImprovement: performance,
          contextAccuracy: 0.8, // Default assumption
        });
      } catch (e) {
        console.warn('Failed to persist performance in engine', e);
      }
      dispatch({ type: 'PERFORMANCE_RECORD', payload: record });

      console.log(
        `📊 Performance recorded: ${(performance * 100).toFixed(0)}% for ${
          state.currentPreset
        } on ${state.currentScreen}`,
      );
    },
    [
      state.learningEnabled,
      state.currentScreen,
      state.currentPreset,
      state.cognitiveLoad,
      state.sessionDuration,
    ],
  );

  const updateCognitiveLoad = useCallback((load: number) => {
    const clampedLoad = Math.max(0, Math.min(1, load));
    cognitiveSoundscapeEngine.updateCognitiveLoad(clampedLoad);
    dispatch({ type: 'COGNITIVE_LOAD_UPDATE', payload: clampedLoad });
  }, []);

  const toggleLearningMode = useCallback(() => {
    dispatch({ type: 'LEARNING_MODE_TOGGLE' });
  }, []);
  const toggleMiniPlayer = useCallback(() => {
    dispatch({ type: 'MINI_PLAYER_TOGGLE' });
  }, []);
  const openSettings = useCallback(() => {
    dispatch({ type: 'SETTINGS_OPEN' });
  }, []);
  const closeSettings = useCallback(() => {
    dispatch({ type: 'SETTINGS_CLOSE' });
  }, []);

  const reset = useCallback(async () => {
    await stopSoundscape();
    dispatch({ type: 'RESET' });
  }, [stopSoundscape]);
  const clearError = useCallback(() => {
    dispatch({ type: 'ERROR_CLEAR' });
  }, []);

  const contextValue: SoundscapeContextValue = useMemo(
    () => ({
      ...state,
      startPreset,
      stopSoundscape,
      setVolume,
      toggleAdaptiveMode,
      switchScreen,
      setScreenPreset,
      recordPerformance,
      updateCognitiveLoad,
      toggleLearningMode,
      toggleMiniPlayer,
      openSettings,
      closeSettings,
      initialize,
      reset,
      clearError,
    }),
    [
      state,
      startPreset,
      stopSoundscape,
      setVolume,
      toggleAdaptiveMode,
      switchScreen,
      setScreenPreset,
      recordPerformance,
      updateCognitiveLoad,
      toggleLearningMode,
      toggleMiniPlayer,
      openSettings,
      closeSettings,
      initialize,
      reset,
      clearError,
    ],
  );

  return (
    <SoundscapeContext.Provider value={contextValue}>
      {children}
    </SoundscapeContext.Provider>
  );
};

export const useSoundscape = (): SoundscapeContextValue => {
  const context = useContext(SoundscapeContext);
  if (!context)
    throw new Error('useSoundscape must be used within a SoundscapeProvider');
  return context;
};

export default SoundscapeProvider;
