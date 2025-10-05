import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { View, Dimensions, Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Position constants based on ergonomics research
export const POSITION_CONSTANTS = {
  // Bottom spacing from screen edge
  BOTTOM_OFFSET: 80, // Above navigation bar
  MINI_PLAYER_HEIGHT: 72,

  // Right side positioning (right-handed optimization)
  RIGHT_OFFSET: 20,

  // Vertical spacing between elements (optimal for preventing mis-taps)
  ELEMENT_SPACING: 70,

  // Z-index hierarchy
  Z_INDEX: {
    MINI_PLAYER: 800,
    FAB: 900,
    AI_CHAT: 1000,
  },

  // Element sizes
  SIZES: {
    AI_CHAT: 64,
    FAB: 56,
    MINI_PLAYER_HEIGHT: 72,
  },
} as const;

// Cognitive load levels
export type CognitiveLoadLevel = 'low' | 'medium' | 'high';

// Context for orchestrator state
interface FloatingElementsContextType {
  cognitiveLoad: CognitiveLoadLevel;
  setCognitiveLoad: (load: CognitiveLoadLevel) => void;
  currentScreen: string;
  setCurrentScreen: (screen: string) => void;
  isKeyboardVisible: boolean;
  isMiniPlayerActive: boolean;
  setMiniPlayerActive: (active: boolean) => void;
  hasUnreadMessages: boolean;
  setUnreadMessages: (has: boolean) => void;
  positions: {
    aiChat: { bottom: number; right: number };
    fab: { bottom: number; right: number };
    miniPlayer: { bottom: number; right: number };
  };
  visibility: {
    aiChat: boolean;
    fab: boolean;
    miniPlayer: boolean;
  };
}

const FloatingElementsContext = createContext<FloatingElementsContextType | null>(null);

export const useFloatingElements = () => {
  const context = useContext(FloatingElementsContext);
  if (!context) {
    throw new Error('useFloatingElements must be used within FloatingElementsProvider');
  }
  return context;
};

// Main orchestrator component
interface FloatingElementsOrchestratorProps {
  children: React.ReactNode;
  cognitiveLoad?: CognitiveLoadLevel;
  currentScreen?: string;
}

export const FloatingElementsOrchestrator: React.FC<FloatingElementsOrchestratorProps> = ({
  children,
  cognitiveLoad: externalCognitiveLoad,
  currentScreen: externalCurrentScreen,
}) => {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = Dimensions.get('window');

  // Internal state
  const [cognitiveLoad, setCognitiveLoad] = useState<CognitiveLoadLevel>('low');
  const [currentScreen, setCurrentScreen] = useState<string>('dashboard');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [isMiniPlayerActive, setMiniPlayerActive] = useState(false);
  const [hasUnreadMessages, setUnreadMessages] = useState(false);

  // Use external values if provided, otherwise use internal state
  const effectiveCognitiveLoad = externalCognitiveLoad || cognitiveLoad;
  const effectiveCurrentScreen = externalCurrentScreen || currentScreen;

  // Calculate positions based on ergonomics and current state
  const positions = React.useMemo(() => {
    const baseBottom = POSITION_CONSTANTS.BOTTOM_OFFSET + insets.bottom;

    return {
      aiChat: {
        bottom: baseBottom + POSITION_CONSTANTS.MINI_PLAYER_HEIGHT + POSITION_CONSTANTS.ELEMENT_SPACING,
        right: POSITION_CONSTANTS.RIGHT_OFFSET,
      },
      fab: {
        bottom: baseBottom + POSITION_CONSTANTS.MINI_PLAYER_HEIGHT + POSITION_CONSTANTS.ELEMENT_SPACING * 2,
        right: POSITION_CONSTANTS.RIGHT_OFFSET,
      },
      miniPlayer: {
        bottom: baseBottom,
        right: 0, // Full width
      },
    };
  }, [insets.bottom]);

  // Determine visibility based on cognitive load and context
  const visibility = React.useMemo(() => {
    const baseVisibility = {
      aiChat: true, // Always visible (primary element)
      fab: true,
      miniPlayer: isMiniPlayerActive,
    };

    // Adjust based on cognitive load
    switch (effectiveCognitiveLoad) {
      case 'low':
        // Show all elements
        return baseVisibility;

      case 'medium':
        // Hide FAB if not essential, minimize mini player
        return {
          ...baseVisibility,
          fab: false, // Hide secondary element
        };

      case 'high':
        // Only show AI chat for critical interactions
        return {
          aiChat: true,
          fab: false,
          miniPlayer: false,
        };

      default:
        return baseVisibility;
    }
  }, [effectiveCognitiveLoad, isMiniPlayerActive]);

  // Keyboard visibility handling
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Hide all floating elements when keyboard is visible
  const effectiveVisibility = React.useMemo(() => {
    if (isKeyboardVisible) {
      return {
        aiChat: false,
        fab: false,
        miniPlayer: false,
      };
    }
    return visibility;
  }, [visibility, isKeyboardVisible]);

  // Context value
  const contextValue: FloatingElementsContextType = {
    cognitiveLoad: effectiveCognitiveLoad,
    setCognitiveLoad,
    currentScreen: effectiveCurrentScreen,
    setCurrentScreen,
    isKeyboardVisible,
    isMiniPlayerActive,
    setMiniPlayerActive,
    hasUnreadMessages,
    setUnreadMessages,
    positions,
    visibility: effectiveVisibility,
  };

  return (
    <FloatingElementsContext.Provider value={contextValue}>
      {children}
    </FloatingElementsContext.Provider>
  );
};

// Hook for components to register themselves with the orchestrator
export const useRegisterFloatingElement = (
  elementType: 'aiChat' | 'fab' | 'miniPlayer',
  options?: {
    priority?: number;
    canHide?: boolean;
  }
) => {
  const context = useFloatingElements();

  const isVisible = context.visibility[elementType];
  const position = context.positions[elementType];
  const zIndex = POSITION_CONSTANTS.Z_INDEX[elementType.toUpperCase() as keyof typeof POSITION_CONSTANTS.Z_INDEX];

  return {
    isVisible,
    position,
    zIndex,
    cognitiveLoad: context.cognitiveLoad,
    currentScreen: context.currentScreen,
  };
};

export default FloatingElementsOrchestrator;
