import React, { createContext, useContext } from 'react';

// Keep this file minimal: it only defines the shared context and two hooks
// so other components can import them without importing the full orchestrator
// component, which prevents require-cycle warnings.

export type CognitiveLoadLevel = 'low' | 'medium' | 'high';

export interface FloatingElementsContextType {
  cognitiveLoad: CognitiveLoadLevel;
  setCognitiveLoad: (load: CognitiveLoadLevel) => void;
  currentScreen: string;
  setCurrentScreen: (screen: string) => void;
  isKeyboardVisible: boolean;
  isMiniPlayerActive: boolean;
  setMiniPlayerActive: (active: boolean) => void;
  hasUnreadMessages: boolean;
  setUnreadMessages: (has: boolean) => void;
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

// Default placeholder so TS can infer shape; real provider is rendered by the
// FloatingElementsOrchestrator component.
export const FloatingElementsContext =
  createContext<FloatingElementsContextType | null>(null);

export const useFloatingElements = (): FloatingElementsContextType => {
  const ctx = useContext(FloatingElementsContext);
  if (!ctx)
    throw new Error(
      'useFloatingElements must be used within FloatingElementsProvider',
    );
  return ctx;
};

// Helper used by floating children to read a specific element's visibility/position
export const useRegisterFloatingElement = (
  elementType: 'aiChat' | 'fab' | 'miniPlayer',
  _options?: { priority?: number; canHide?: boolean },
) => {
  const context = useFloatingElements();

  const isVisible = context.visibility[elementType];
  const position = context.positions[elementType];
  // zIndex mapping kept in the orchestrator; callers only need a numeric zIndex.
  const zIndexMap: Record<string, number> = {
    miniPlayer: 800,
    fab: 900,
    aiChat: 1000,
  };

  const zIndex = zIndexMap[elementType] ?? 0;

  return {
    isVisible,
    position,
    zIndex,
    cognitiveLoad: context.cognitiveLoad,
    currentScreen: context.currentScreen,
  };
};

export default FloatingElementsContext;
