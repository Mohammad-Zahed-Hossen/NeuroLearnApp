// src/components/QuickActionBottomSheet.tsx
// Enhanced bottom sheet with contextual quick actions based on current screen and cognitive state

import React, { useMemo, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  ThemeType,
} from '../../theme/colors';
import { CognitiveLoadIndicator } from '../CognitiveIndicators';
import { useCognitive } from '../../contexts/CognitiveProvider';
import { useSoundscape } from '../../contexts/SoundscapeContext';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  cognitiveLoad?: number;
}

interface QuickActionBottomSheetProps {
  theme: ThemeType;
  bottomSheetRef?: React.RefObject<any>;
  currentScreen: string;
  onAction: (actionId: string, params?: any) => void;
  visible?: boolean;
  onClose?: () => void;
}

export const QuickActionBottomSheet: React.FC<QuickActionBottomSheetProps> = ({
  theme,
  bottomSheetRef,
  currentScreen,
  onAction,
  visible = false,
  onClose,
}) => {
  const themeColors = colors[theme];
  const cognitive = useCognitive();
  const soundscape = useSoundscape();
  const sheetRef = useRef<BottomSheet>(null);
  const [pressedAction, setPressedAction] = useState<string | null>(null);
  const [animatingActions, setAnimatingActions] = useState<Set<string>>(new Set());

  // Generate contextual actions based on current screen and cognitive state
  const getQuickActions = useCallback((): QuickAction[] => {
    const baseActions: QuickAction[] = [
      {
        id: 'quick-study',
        title: 'Quick Study',
        description: 'Review 5 flashcards',
        icon: '⚡',
        color: themeColors.primary,
        cognitiveLoad: 0.6,
      },
      {
        id: 'start-timer',
        title: 'Focus Timer',
        description: 'Start 25min session',
        icon: '⏱️',
        color: themeColors.error,
        cognitiveLoad: 0.3,
      },
      {
        id: 'smart-break',
        title: 'Smart Break',
        description: 'AI-recommended break',
        icon: '🧘',
        color: themeColors.success,
        cognitiveLoad: 0.1,
      },
    ];

    // Screen-specific actions
    const screenActions: Record<string, QuickAction[]> = {
      flashcards: [
        {
          id: 'add-flashcard',
          title: 'Add Flashcard',
          description: 'Create new card',
          icon: '➕',
          color: themeColors.success,
          cognitiveLoad: 0.4,
        },
      ],
      tasks: [
        {
          id: 'add-task',
          title: 'Add Task',
          description: 'Quick task entry',
          icon: '✅',
          color: themeColors.success,
          cognitiveLoad: 0.3,
        },
      ],
      'neural-mind-map': [
        {
          id: 'focus-node',
          title: 'Focus Lock',
          description: 'Enable neural focus',
          icon: '🎯',
          color: themeColors.tertiary,
          cognitiveLoad: 0.2,
        },
      ],
    };

    // Soundscape actions
    const soundscapeActions: QuickAction[] = [];
    if (soundscape) {
      if (soundscape.isActive) {
        soundscapeActions.push({
          id: 'toggle-soundscape',
          title: 'Stop Soundscape',
          description: 'Turn off audio',
          icon: '⏹️',
          color: themeColors.warning,
          cognitiveLoad: 0.1,
        });
      } else {
        soundscapeActions.push({
          id: 'toggle-soundscape',
          title: 'Start Soundscape',
          description: 'Focus audio',
          icon: '🎵',
          color: themeColors.info,
          cognitiveLoad: 0.2,
        });
      }
    }

    // Cognitive actions
    const cognitiveActions: QuickAction[] = [];
    if (cognitive.uiMode !== 'simple') {
      cognitiveActions.push({
        id: 'enable-simple-mode',
        title: 'Simple Mode',
        description: 'Reduce complexity',
        icon: '🎯',
        color: themeColors.accent,
        cognitiveLoad: 0.1,
      });
    }

    if (cognitive.shouldSuggestBreak()) {
      cognitiveActions.unshift({
        id: 'suggested-break',
        title: 'Suggested Break',
        description: 'You need a break',
        icon: '🚨',
        color: themeColors.warning,
        cognitiveLoad: 0.1,
      });
    }

    const allActions = [
      ...baseActions,
      ...(screenActions[currentScreen] || []),
      ...soundscapeActions,
      ...cognitiveActions,
    ];

    // Filter based on cognitive load in simple mode
    if (cognitive.uiMode === 'simple') {
      return allActions.filter((action) => (action.cognitiveLoad || 0) <= 0.5);
    }

    return allActions;
  }, [currentScreen, cognitive, soundscape, themeColors]);

  // Snap points for the bottom sheet - multiple snap points for better scrolling
  const snapPoints = useMemo(() => {
    const screenHeight = Dimensions.get('window').height;
    const actionsCount = getQuickActions().length;

    // Calculate dynamic height based on content
    const baseHeight = 120; // Header height
    const warningHeight = cognitive.cognitiveLoad > 0 ? 80 : 0;
    const actionsHeight = actionsCount * 60; // Smaller action items
    const totalContentHeight = baseHeight + warningHeight + actionsHeight;

    // Create multiple snap points for better UX
    const minHeight = Math.max(200, Math.min(totalContentHeight * 0.4, screenHeight * 0.3));
    const midHeight = Math.max(minHeight + 50, Math.min(totalContentHeight * 0.7, screenHeight * 0.6));
    const maxHeight = Math.max(midHeight + 50, Math.min(totalContentHeight, screenHeight * 0.9));

    return [minHeight, midHeight, maxHeight];
  }, [currentScreen, cognitive, soundscape, getQuickActions]);

  // Handle sheet changes - only close when fully collapsed
  const handleSheetChanges = useCallback((index: number) => {
    // Only close when the sheet is fully collapsed (index 0)
    // Intermediate snap points (1, 2) should not close the sheet
    if (index === 0) {
      onClose?.();
    }
  }, [onClose]);

  // Backdrop component
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={0}
        appearsOnIndex={1}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  const quickActions = getQuickActions();

  const handleActionPress = async (action: QuickAction) => {
    // Add haptic feedback
    if (Platform.OS === 'ios') {
      // For iOS, use HapticFeedback
      // Note: In a real app, you'd import and use ReactNativeHapticFeedback
    }

    setPressedAction(action.id);
    setAnimatingActions(prev => new Set(prev).add(action.id));

    // Add a small delay for visual feedback
    setTimeout(() => {
      onAction(action.id);
      onClose?.();
      setPressedAction(null);
      setAnimatingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(action.id);
        return newSet;
      });
    }, 150);
  };

  const renderAction = (action: QuickAction) => {
    const responsivePadding = Math.max(spacing.md, Dimensions.get('window').width * 0.04);
    const isPressed = pressedAction === action.id;
    const isAnimating = animatingActions.has(action.id);

    return (
      <Animated.View
        key={action.id}
        style={[
          styles.actionItemContainer,
          isPressed && styles.actionItemPressed,
        ]}
      >
        <TouchableOpacity
          style={[
            styles.actionItem,
            {
              backgroundColor: themeColors.surface,
              borderColor: isPressed ? action.color : themeColors.border,
              padding: responsivePadding,
              shadowColor: isPressed ? action.color : '#000',
              shadowOpacity: isPressed ? 0.3 : 0.1,
              shadowRadius: isPressed ? 8 : 4,
              elevation: isPressed ? 8 : 3,
            },
          ]}
          onPress={() => handleActionPress(action)}
          activeOpacity={0.9}
          accessibilityLabel={`Quick action: ${action.title}, ${action.description}`}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View
            style={[
              styles.actionIcon,
              {
                backgroundColor: action.color + '20',
                borderWidth: 2,
                borderColor: action.color + '40',
              },
            ]}
          >
            <Text style={[styles.actionIconText, { color: action.color }]}>
              {action.icon}
            </Text>
          </View>
          <View style={styles.actionContent}>
            <Text style={[styles.actionTitle, { color: themeColors.text }]}>
              {action.title}
            </Text>
            <Text
              style={[
                styles.actionDescription,
                { color: themeColors.textSecondary },
              ]}
            >
              {action.description}
            </Text>
            {action.cognitiveLoad && (
              <View style={styles.cognitiveInfo}>
                <Text style={[styles.cognitiveText, { color: themeColors.textSecondary }]}>
                  Cognitive load: {Math.round(action.cognitiveLoad * 100)}%
                </Text>
              </View>
            )}
          </View>
          <View style={styles.actionMeta}>
            {action.cognitiveLoad && action.cognitiveLoad > 0.6 && (
              <View
                style={[
                  styles.loadIndicator,
                  { backgroundColor: themeColors.warning },
                ]}
              />
            )}
            <Icon
              name="chevron-right"
              size={20}
              color={themeColors.textSecondary}
              style={styles.actionArrow}
            />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <BottomSheet
      ref={sheetRef}
      index={visible ? 1 : 0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={false}
      backgroundStyle={{
        backgroundColor: themeColors.background,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
      }}
      handleIndicatorStyle={{
        backgroundColor: themeColors.textSecondary,
        width: 40,
      }}
      style={{
        zIndex: 10000, // Ensure it appears above navigation
      }}
    >
      <BottomSheetView style={styles.sheetContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeColors.text }]}>
            ⚡ Quick Actions
          </Text>
          <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
            Context-aware shortcuts
          </Text>
        </View>

        {/* Cognitive Load Warning */}
        {cognitive.cognitiveLoad > 0 && (
          <CognitiveLoadIndicator
            theme={theme}
            load={cognitive.cognitiveLoad}
            showBreakSuggestion={cognitive.shouldSuggestBreak()}
            onBreakPress={() => {
              // Close bottom sheet and navigate to break screen
              sheetRef.current?.close();
              onAction('smart-break');
            }}
            variant="banner"
            style={styles.warningBanner}
          />
        )}

        <ScrollView
          style={styles.actionsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.actionsContainer}
        >
          {quickActions.map(renderAction)}
        </ScrollView>
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  sheetContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  actionsContainer: {
    paddingBottom: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
  },
  warningBanner: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  warningText: {
    ...typography.caption,
    textAlign: 'center',
    fontWeight: '600',
  },
  actionsList: {
    flex: 1,
  },
  actionItemContainer: {
    marginBottom: spacing.sm,
  },
  actionItemPressed: {
    transform: [{ scale: 0.98 }],
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  actionIconText: {
    fontSize: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionDescription: {
    ...typography.caption,
    marginBottom: 4,
  },
  cognitiveInfo: {
    marginTop: 2,
  },
  cognitiveText: {
    ...typography.caption,
    fontSize: 10,
    fontStyle: 'italic',
  },
  actionMeta: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  actionArrow: {
    opacity: 0.6,
  },
});
