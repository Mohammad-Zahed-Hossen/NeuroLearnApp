import React, { createContext, useContext, useState, ReactNode } from 'react';

/**
 * Phase 5: Global Focus State Management
 * Enables neural focus lock across the entire application
 */

interface FocusState {
  isActive: boolean;
  focusNodeId: string | null;
  sessionStartTime: Date | null;
  sessionEndTime: Date | null;
  targetTitle: string;
  targetType: 'task' | 'node' | 'logic' | 'flashcard';
}

interface FocusContextType {
  focusState: FocusState;
  startFocusSession: (nodeId: string, title: string, type: FocusState['targetType']) => void;
  endFocusSession: () => void;
  isFocusActive: boolean;
  getFocusNodeId: () => string | null;
}

const FocusContext = createContext<FocusContextType | undefined>(undefined);

interface FocusProviderProps {
  children: ReactNode;
}

export const FocusProvider: React.FC<FocusProviderProps> = ({ children }) => {
  const [focusState, setFocusState] = useState<FocusState>({
    isActive: false,
    focusNodeId: null,
    sessionStartTime: null,
    sessionEndTime: null,
    targetTitle: '',
    targetType: 'task',
  });

  const startFocusSession = (
    nodeId: string,
    title: string,
    type: FocusState['targetType']
  ) => {
    const now = new Date();
    setFocusState({
      isActive: true,
      focusNodeId: nodeId,
      sessionStartTime: now,
      sessionEndTime: null,
      targetTitle: title,
      targetType: type,
    });

    console.log(`🧠 Neural focus lock activated for: ${title} (${nodeId})`);
  };

  const endFocusSession = () => {
    setFocusState({
      isActive: false,
      focusNodeId: null,
      sessionStartTime: null,
      sessionEndTime: null,
      targetTitle: '',
      targetType: 'task',
    });

    console.log('🧠 Neural focus lock deactivated');
  };

  const isFocusActive = focusState.isActive;
  const getFocusNodeId = () => focusState.focusNodeId;

  const value: FocusContextType = {
    focusState,
    startFocusSession,
    endFocusSession,
    isFocusActive,
    getFocusNodeId,
  };

  return (
    <FocusContext.Provider value={value}>
      {children}
    </FocusContext.Provider>
  );
};

export const useFocus = (): FocusContextType => {
  const context = useContext(FocusContext);
  if (context === undefined) {
    throw new Error('useFocus must be used within a FocusProvider');
  }
  return context;
};
