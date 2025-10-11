// src/components/FloatingActionButton.tsx
// Context-aware floating action button that adapts to current screen and cognitive load

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, ThemeType } from '../../theme/colors';
import { useCognitive } from '../../contexts/CognitiveProvider';
import { useRegisterFloatingElement } from '../shared/FloatingElementsOrchestrator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FloatingActionButtonProps {
  theme: ThemeType;
  onPress: () => void;
  currentScreen: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  theme,
  onPress,
  currentScreen,
}) => {
  const insets = useSafeAreaInsets();
  const themeColors = colors[theme];
  const cognitive = useCognitive();

  // Register with the floating elements orchestrator
  const { isVisible, position, zIndex, cognitiveLoad } =
    useRegisterFloatingElement('fab');

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Determine FAB content based on current screen and cognitive state
  const getFABContent = () => {
    // Show simplified FAB in simple mode or high cognitive load
    if (cognitive.uiMode === 'simple' || cognitive.cognitiveLoad > 0.7) {
      return { icon: '⚡', label: 'Quick', color: themeColors.primary };
    }

    switch (currentScreen) {
      case 'dashboard':
        return { icon: '⚡', label: 'Quick', color: themeColors.primary };
      case 'flashcards':
        return { icon: '➕', label: 'Add', color: themeColors.success };
      case 'focus':
        return { icon: '⏱️', label: 'Timer', color: themeColors.error };
      case 'tasks':
        return { icon: '✅', label: 'Task', color: themeColors.success };
      case 'neural-mind-map':
        return { icon: '🧠', label: 'Focus', color: themeColors.tertiary };
      default:
        return { icon: '🚀', label: 'Quick', color: themeColors.primary };
    }
  };

  const fabContent = getFABContent();

  // Pulse animation for attention (only for break suggestions in high cognitive load)
  useEffect(() => {
    if (cognitive.shouldSuggestBreak() && cognitive.cognitiveLoad > 0.7) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [cognitive.shouldSuggestBreak(), cognitive.cognitiveLoad]);

  // Hide/show animation
  useEffect(() => {
    const shouldShow = fabContent !== null && isVisible;

    Animated.spring(scaleAnim, {
      toValue: shouldShow ? 1 : 0,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [fabContent, isVisible]);

  if (!fabContent) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: position.bottom,
          right: position.right,
          zIndex: zIndex,
          transform: [{ scale: scaleAnim }, { scale: pulseAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: fabContent.color,
            shadowColor: fabContent.color,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityLabel={`${fabContent.label} actions`}
      >
        <Text style={styles.fabIcon}>{fabContent.icon}</Text>
        <Text style={styles.fabLabel}>{fabContent.label}</Text>
      </TouchableOpacity>

      {/* Break suggestion indicator */}
      {cognitive.shouldSuggestBreak() && (
        <View
          style={[
            styles.breakIndicator,
            { backgroundColor: themeColors.warning },
          ]}
        >
          <Text style={styles.breakIndicatorText}>!</Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1000,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  fabLabel: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  breakIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
