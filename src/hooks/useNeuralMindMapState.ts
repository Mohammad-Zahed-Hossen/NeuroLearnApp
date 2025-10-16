/**
 * Optimized state management for NeuralMindMapScreen
 * Replaces multiple useState hooks with centralized useReducer
 */

import { useReducer, useCallback, useMemo } from 'react';
import { AuraState, AuraContext } from '../services/ai/CognitiveAuraService';
import { ContextSnapshot } from '../services/ai/ContextSensorService';
import { NeuralGraph, NeuralNode } from '../services/learning/MindMapGeneratorService';

// Consolidated state interface
export interface NeuralMindMapState {
  ui: {
    menuVisible: boolean;
    nodeDetailVisible: boolean;
    microTaskVisible: boolean;
    microTaskMinimized: boolean;
    contextInsightsVisible: boolean;
    capacityForecastVisible: boolean;
    adaptiveControlsVisible: boolean;
    sidePanelCollapsed: boolean;
    showBottomSheet: boolean;
    bottomActiveTab: 'controls' | 'insights' | 'forecast' | 'microtask' | 'actions';
  };
  data: {
    neuralGraph: NeuralGraph | null;
    selectedNode: NeuralNode | null;
    nodeDetail: any | null;
    auraState: AuraState | null;
    contextSnapshot: ContextSnapshot | null;
    physicsState: any | null;
  };
  settings: {
    viewMode: string;
    adaptiveColors: any | null;
  };
  loading: {
    isGenerating: boolean;
    isCalculating: boolean;
    isRefreshing: boolean;
    isGeneratingAura: boolean;
    isContextSensing: boolean;
    isForecasting: boolean;
    stage?: string;
  };
  error: string | null;
}

// Action types
type NeuralMindMapAction =
  | { type: 'SET_UI'; payload: Partial<NeuralMindMapState['ui']> }
  | { type: 'SET_DATA'; payload: Partial<NeuralMindMapState['data']> }
  | { type: 'SET_SETTINGS'; payload: Partial<NeuralMindMapState['settings']> }
  | { type: 'SET_LOADING'; payload: Partial<NeuralMindMapState['loading']> }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: NeuralMindMapState = {
  ui: {
    menuVisible: false,
    nodeDetailVisible: false,
    microTaskVisible: true,
    microTaskMinimized: false,
    contextInsightsVisible: false,
    capacityForecastVisible: false,
    adaptiveControlsVisible: false,
    sidePanelCollapsed: true,
    showBottomSheet: false,
    bottomActiveTab: 'controls',
  },
  data: {
    neuralGraph: null,
    selectedNode: null,
    nodeDetail: null,
    auraState: null,
    contextSnapshot: null,
    physicsState: null,
  },
  settings: {
    viewMode: 'context_adaptive',
    adaptiveColors: null,
  },
  loading: {
    isGenerating: true,
    isCalculating: false,
    isRefreshing: false,
    isGeneratingAura: false,
    isContextSensing: false,
    isForecasting: false,
    stage: 'Initializing...',
  },
  error: null,
};

// Reducer function
function neuralMindMapReducer(
  state: NeuralMindMapState,
  action: NeuralMindMapAction
): NeuralMindMapState {
  switch (action.type) {
    case 'SET_UI':
      return { ...state, ui: { ...state.ui, ...action.payload } };
    case 'SET_DATA':
      return { ...state, data: { ...state.data, ...action.payload } };
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'SET_LOADING':
      return { ...state, loading: { ...state.loading, ...action.payload } };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'RESET_STATE':
      return initialState;
    default:
      return state;
  }
}

// Custom hook
export function useNeuralMindMapState() {
  const [state, dispatch] = useReducer(neuralMindMapReducer, initialState);

  // Memoized action creators
  const actions = useMemo(() => ({
    setUI: (payload: Partial<NeuralMindMapState['ui']>) =>
      dispatch({ type: 'SET_UI', payload }),
    setData: (payload: Partial<NeuralMindMapState['data']>) =>
      dispatch({ type: 'SET_DATA', payload }),
    setSettings: (payload: Partial<NeuralMindMapState['settings']>) =>
      dispatch({ type: 'SET_SETTINGS', payload }),
    setLoading: (payload: Partial<NeuralMindMapState['loading']>) =>
      dispatch({ type: 'SET_LOADING', payload }),
    setError: (error: string | null) =>
      dispatch({ type: 'SET_ERROR', payload: error }),
    resetState: () => dispatch({ type: 'RESET_STATE' }),
  }), []);

  return { state, actions };
}