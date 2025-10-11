import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { View, Dimensions, Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCurrentAuraState } from '../../store/useAuraStore';
import FloatingCommandCenter from './FloatingCommandCenter';
import { MiniPlayer } from '../MiniPlayerComponent';
import FloatingElementsContext, {
  useFloatingElements as useFloatingElementsFromContext,
} from './FloatingElementsContext';
import { BlurView } from 'expo-blur';
import {
  Modal,
  TouchableOpacity,
  Text,
  View as RNView,
  StyleSheet,
} from 'react-native';

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
  // Programmatic UI requests
  showAIChat: boolean;
  setShowAIChat: (open: boolean) => void;
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

// Use the shared context implementation in a separate module to avoid
// require-cycle warnings when floating children import the orchestrator.
const useFloatingElements = useFloatingElementsFromContext;

// Main orchestrator component
interface FloatingElementsOrchestratorProps {
  children: React.ReactNode;
  cognitiveLoad?: CognitiveLoadLevel;
  currentScreen?: string;
  onNavigate?: (screen: string) => void;
}

export const FloatingElementsOrchestrator: React.FC<
  FloatingElementsOrchestratorProps
> = ({
  children,
  cognitiveLoad: externalCognitiveLoad,
  currentScreen: externalCurrentScreen,
  onNavigate,
}) => {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = Dimensions.get('window');
  const auraState = useCurrentAuraState();

  // Internal state
  const [cognitiveLoad, setCognitiveLoad] = useState<CognitiveLoadLevel>('low');
  const [currentScreen, setCurrentScreen] = useState<string>('dashboard');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [isMiniPlayerActive, setMiniPlayerActive] = useState(false);
  const [hasUnreadMessages, setUnreadMessages] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);

  // Wrapped setters with logs to help trace programmatic calls from other components
  const setMiniPlayerActiveWrapped = (active: boolean) => {
    try {
      // eslint-disable-next-line no-console
      console.log('[FloatingElementsOrchestrator] setMiniPlayerActive', active);
    } catch {}
    setMiniPlayerActive(active);
  };

  const setShowAIChatWrapped = (open: boolean) => {
    try {
      // eslint-disable-next-line no-console
      console.log('[FloatingElementsOrchestrator] setShowAIChat', open);
    } catch {}
    setShowAIChat(open);
  };

  const setUnreadMessagesWrapped = (has: boolean) => {
    try {
      // eslint-disable-next-line no-console
      console.log('[FloatingElementsOrchestrator] setUnreadMessages', has);
    } catch {}
    setUnreadMessages(has);
  };

  // Map aura context to cognitive load
  const getCognitiveLoadFromAura = (): CognitiveLoadLevel => {
    if (!auraState) return 'low';

    switch (auraState.context) {
      case 'DeepFocus':
        return 'low';
      case 'CreativeFlow':
        return 'low';
      case 'FragmentedAttention':
        return 'medium';
      case 'CognitiveOverload':
        return 'high';
      default:
        return 'low';
    }
  };

  // Use external values if provided, otherwise derive from aura state or internal state
  const effectiveCognitiveLoad =
    externalCognitiveLoad || getCognitiveLoadFromAura() || cognitiveLoad;
  const effectiveCurrentScreen = externalCurrentScreen || currentScreen;

  // Calculate positions based on ergonomics and current state
  const positions = React.useMemo(() => {
    const baseBottom = POSITION_CONSTANTS.BOTTOM_OFFSET + insets.bottom;

    return {
      aiChat: {
        bottom:
          baseBottom +
          POSITION_CONSTANTS.MINI_PLAYER_HEIGHT +
          POSITION_CONSTANTS.ELEMENT_SPACING,
        right: POSITION_CONSTANTS.RIGHT_OFFSET,
      },
      fab: {
        bottom:
          baseBottom +
          POSITION_CONSTANTS.MINI_PLAYER_HEIGHT +
          POSITION_CONSTANTS.ELEMENT_SPACING * 2,
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
      miniPlayer: isMiniPlayerActive || effectiveCurrentScreen === 'dashboard', // Show on dashboard by default
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
  }, [effectiveCognitiveLoad, isMiniPlayerActive, effectiveCurrentScreen]);

  // Keyboard visibility handling
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true),
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false),
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
    setMiniPlayerActive: setMiniPlayerActiveWrapped,
    hasUnreadMessages,
    setUnreadMessages: setUnreadMessagesWrapped,
    showAIChat,
    setShowAIChat: setShowAIChatWrapped,
    positions,
    visibility: effectiveVisibility,
  };

  // Debug visibility traces (helpful to see computed visibility changes)
  useEffect(() => {
    try {
      // eslint-disable-next-line no-console
      console.log(
        '[FloatingElementsOrchestrator] visibility',
        effectiveVisibility,
      );
    } catch {}
  }, [effectiveVisibility]);

  return (
    <FloatingElementsContext.Provider value={contextValue}>
      {children}

      {/* Unified Smart Morphing Bubble */}
      <FloatingCommandCenter onNavigate={onNavigate} />

      {/* MiniPlayer modal is owned by the orchestrator to avoid circular imports.
          FloatingCommandCenter only requests the orchestrator to open the mini
          player via ctx.setMiniPlayerActive(true). */}
      <Modal
        visible={isMiniPlayerActive}
        transparent
        animationType="fade"
        onRequestClose={() => setMiniPlayerActiveWrapped(false)}
      >
        <BlurView intensity={50} style={styles.modalBackdrop as any}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setMiniPlayerActiveWrapped(false)}
          />
          <RNView style={styles.miniPlayerModal}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setMiniPlayerActiveWrapped(false);
              }}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
            <MiniPlayer theme={'dark' as any} />
          </RNView>
        </BlurView>
      </Modal>
    </FloatingElementsContext.Provider>
  );
};

// Hook for components to register themselves with the orchestrator
export const useRegisterFloatingElement = (
  elementType: 'aiChat' | 'fab' | 'miniPlayer',
  options?: {
    priority?: number;
    canHide?: boolean;
  },
) => {
  const context = useFloatingElements();

  const isVisible = context.visibility[elementType];
  const position = context.positions[elementType];
  const zIndex =
    POSITION_CONSTANTS.Z_INDEX[
      elementType.toUpperCase() as keyof typeof POSITION_CONSTANTS.Z_INDEX
    ];

  return {
    isVisible,
    position,
    zIndex,
    cognitiveLoad: context.cognitiveLoad,
    currentScreen: context.currentScreen,
  };
};

export default FloatingElementsOrchestrator;

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniPlayerModal: {
    width: 340,
    height: 440,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    backgroundColor: 'transparent',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  closeIcon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
