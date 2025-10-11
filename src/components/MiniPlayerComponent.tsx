/**
 * Phase 7: Mini Player Component - Floating Bubble Design
 *
 * Floating bubble that opens a modal with intelligent soundscape controls.
 * Features glassmorphism design, swipe gestures, and cognitive-aware visibility.
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Vibration,
} from 'react-native';
import {
  PanGestureHandler,
  State,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

let Haptics: any;
try {
  Haptics = require('expo-haptics');
} catch (e) {
  Haptics = null;
}

import {
  colors,
  spacing,
  typography,
  borderRadius,
  ThemeType,
} from '../theme/colors';
import { useSoundscape } from '../contexts/SoundscapeContext';
import { SoundscapeType } from '../services/learning/CognitiveSoundscapeEngine';
import { useRegisterFloatingElement } from './shared/FloatingElementsContext';

// Screen dimensions
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

// Mini Player Dimensions
const MINI_PLAYER_HEIGHT = 72;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.8;

// Gesture Constants
const SWIPE_THRESHOLD = 50;
const ANIMATION_DURATION = 300;

// Preset configurations
const PRESET_OPTIONS = [
  { id: 'none', label: 'Off', icon: '⏹️', frequency: '0 Hz', color: '#666666' },
  {
    id: 'calm_readiness',
    label: 'Calm Readiness',
    icon: '🧘',
    frequency: 'Alpha 10 Hz',
    color: '#4A90E2',
  },
  {
    id: 'deep_focus',
    label: 'Deep Focus',
    icon: '🎯',
    frequency: 'Beta 18 Hz',
    color: '#7ED321',
  },
  {
    id: 'reasoning_boost',
    label: 'Reasoning Boost',
    icon: '🧠',
    frequency: 'Gamma 40 Hz',
    color: '#F5A623',
  },
  {
    id: 'memory_flow',
    label: 'Memory Flow',
    icon: '💭',
    frequency: 'Alpha 10 Hz',
    color: '#50E3C2',
  },
  {
    id: 'speed_integration',
    label: 'Speed Integration',
    icon: '⚡',
    frequency: 'Beta→Gamma',
    color: '#BD10E0',
  },
  {
    id: 'visualization',
    label: 'Visualization',
    icon: '🎨',
    frequency: 'Theta 6 Hz',
    color: '#B4009E',
  },
  {
    id: 'deep_rest',
    label: 'Deep Rest',
    icon: '😴',
    frequency: 'Delta 2.5 Hz',
    color: '#417505',
  },
];

type MiniPlayerState = 'minimized' | 'expanded' | 'hidden';

interface MiniPlayerProps {
  theme: ThemeType;
  style?: any;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ theme, style }) => {
  const themeColors = useMemo(() => colors[theme] || colors.light, [theme]);
  const soundscape = useSoundscape();

  // Smart Orchestra integration
  const { isVisible, position, zIndex } =
    useRegisterFloatingElement('miniPlayer');

  useEffect(() => {
    try {
      // eslint-disable-next-line no-console
      console.log('[MiniPlayer] orchestrator isVisible', isVisible);
    } catch {}
  }, [isVisible]);

  // Safe copies to prevent frozen object issues
  const safePosition = useMemo(
    () => (position ? { ...position } : { bottom: 0, right: 0 }),
    [position],
  );
  const safeZIndex = zIndex || 0;

  // Component state
  const [playerState, setPlayerState] = useState<MiniPlayerState>('minimized');
  const [gestureState, setGestureState] = useState({
    isDragging: false,
    startY: 0,
    startTime: 0,
  });

  // Animation values
  const translateY = useSharedValue(0);
  const opacityValue = useSharedValue(1);
  const heightValue = useSharedValue(MINI_PLAYER_HEIGHT);

  // Animated styles
  const miniPlayerAnimatedStyle = useAnimatedStyle(() => ({
    height: heightValue.value,
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: opacityValue.value,
    transform: [{ translateY: translateY.value }],
  }));

  // Current preset info
  const currentPresetOption = useMemo(
    () =>
      PRESET_OPTIONS.find((p) => p.id === soundscape.currentPreset) ||
      PRESET_OPTIONS[0],
    [soundscape.currentPreset],
  );

  // Animate state changes
  useEffect(() => {
    const targetHeight =
      playerState === 'expanded'
        ? EXPANDED_HEIGHT
        : playerState === 'minimized'
        ? MINI_PLAYER_HEIGHT
        : 0;

    // Height animation
    heightValue.value = withSpring(targetHeight, {
      damping: 10,
      stiffness: 100,
    });

    // Animate translateY
    if (playerState !== 'hidden') {
      translateY.value = withSpring(0, {
        damping: 10,
        stiffness: 100,
      });
    }
  }, [playerState]);

  // Animate visibility
  useEffect(() => {
    opacityValue.value = withTiming(isVisible ? 1 : 0, {
      duration: ANIMATION_DURATION,
    });
  }, [isVisible]);

  // Gesture handling
  const onPanGestureEvent = useCallback(
    (event: PanGestureHandlerGestureEvent) => {
      if (!gestureState.isDragging) return;
      const { translationY } = event.nativeEvent;

      if (playerState === 'minimized') {
        const newTranslateY = Math.max(
          -MINI_PLAYER_HEIGHT,
          Math.min(MINI_PLAYER_HEIGHT, translationY),
        );
        translateY.value = newTranslateY;
      }
    },
    [gestureState.isDragging, playerState],
  );

  const onPanGestureStateChange = useCallback(
    (event: any) => {
      const { state, translationY } = event.nativeEvent;

      if (state === State.BEGAN) {
        setGestureState({
          isDragging: true,
          startY: translationY,
          startTime: Date.now(),
        });
        Haptics?.impactAsync?.(Haptics?.ImpactFeedbackStyle?.Light);
      }

      if (state === State.END || state === State.CANCELLED) {
        setGestureState((prev) => ({ ...prev, isDragging: false }));

        if (Math.abs(translationY) > SWIPE_THRESHOLD) {
          if (translationY > 0) {
            // Swipe down
            if (playerState === 'expanded') {
              setPlayerState('minimized');
            } else if (playerState === 'minimized') {
              setPlayerState('hidden');
            }
            Haptics?.notificationAsync?.(
              Haptics?.NotificationFeedbackType?.Success,
            );
          } else {
            // Swipe up
            if (playerState === 'minimized') {
              setPlayerState('expanded');
            }
            Haptics?.impactAsync?.(Haptics?.ImpactFeedbackStyle?.Medium);
          }
        } else {
          // Snap back
          translateY.value = withSpring(0, {
            damping: 10,
            stiffness: 100,
          });
        }
      }
    },
    [playerState],
  );

  // Interaction handlers
  const handleMiniPlayerTap = useCallback(() => {
    Haptics?.impactAsync?.(Haptics?.ImpactFeedbackStyle?.Medium);

    if (playerState === 'minimized') {
      if (soundscape.isActive) {
        setPlayerState('expanded');
      } else {
        const defaultPreset =
          soundscape.screenPresets?.[soundscape.currentScreen || 'default'] ||
          'calm_readiness';
        soundscape.startPreset(defaultPreset);
        setPlayerState('expanded');
      }
    } else if (playerState === 'expanded') {
      setPlayerState('minimized');
    }
  }, [
    playerState,
    soundscape.isActive,
    soundscape.screenPresets,
    soundscape.currentScreen,
  ]);

  const handlePresetSelect = useCallback(
    async (presetId: SoundscapeType) => {
      Haptics?.impactAsync?.(Haptics?.ImpactFeedbackStyle?.Medium);
      try {
        if (presetId === 'none') {
          await soundscape.stopSoundscape();
        } else {
          await soundscape.startPreset(presetId, { fadeIn: true });
        }
        setPlayerState('minimized');
      } catch (error) {
        console.error('Failed to change preset:', error);
      }
    },
    [soundscape],
  );

  const handleVolumeChange = useCallback(
    (delta: number) => {
      Haptics?.impactAsync?.(Haptics?.ImpactFeedbackStyle?.Light);
      const newVolume = Math.max(0, Math.min(1, soundscape.volume + delta));
      soundscape.setVolume(newVolume);
    },
    [soundscape.volume, soundscape.setVolume],
  );

  // Render minimized player
  const renderMinimizedPlayer = () => (
    <View style={styles.minimizedContainer}>
      <View style={styles.presetInfo}>
        <Text style={styles.presetIcon}>{currentPresetOption.icon}</Text>
        <View style={styles.presetText}>
          <Text
            style={[styles.presetLabel, { color: themeColors.text }]}
            numberOfLines={1}
          >
            {soundscape.isActive ? currentPresetOption.label : 'Tap to start'}
          </Text>
          {soundscape.isActive && (
            <Text
              style={[
                styles.presetFrequency,
                { color: themeColors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {currentPresetOption.frequency}
            </Text>
          )}
        </View>
      </View>

      {soundscape.isActive && (
        <View style={styles.centerControls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => handleVolumeChange(-0.1)}
          >
            <Text style={styles.controlIcon}>🔉</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => soundscape.stopSoundscape()}
          >
            <Text style={styles.playIcon}>⏸️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => handleVolumeChange(0.1)}
          >
            <Text style={styles.controlIcon}>🔊</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.expandIndicator}>
        <Text style={[styles.expandIcon, { color: themeColors.textSecondary }]}>
          {playerState === 'expanded' ? '▼' : '▲'}
        </Text>
      </View>
    </View>
  );

  // Render expanded player
  const renderExpandedPlayer = () => (
    <View style={styles.expandedContainer}>
      <View style={styles.expandedHeader}>
        <Text style={[styles.expandedTitle, { color: themeColors.text }]}>
          🧠 Cognitive Soundscapes
        </Text>
        <Text
          style={[
            styles.expandedSubtitle,
            { color: themeColors.textSecondary },
          ]}
        >
          Select your neural state
        </Text>
      </View>

      {soundscape.isActive && (
        <View
          style={[
            styles.currentStatus,
            {
              backgroundColor:
                (currentPresetOption?.color || themeColors.primary) + '20',
            },
          ]}
        >
          <View style={styles.statusLeft}>
            <Text style={styles.statusIcon}>{currentPresetOption.icon}</Text>
            <View>
              <Text style={[styles.statusLabel, { color: themeColors.text }]}>
                {currentPresetOption.label}
              </Text>
              <Text
                style={[
                  styles.statusFrequency,
                  { color: themeColors.textSecondary },
                ]}
              >
                {currentPresetOption.frequency}
              </Text>
            </View>
          </View>
          <View style={styles.statusRight}>
            <Text
              style={[
                styles.statusActive,
                { color: currentPresetOption.color },
              ]}
            >
              ● Active
            </Text>
          </View>
        </View>
      )}

      <View style={styles.presetGrid}>
        {PRESET_OPTIONS.map((preset) => (
          <TouchableOpacity
            key={preset.id}
            style={[
              styles.presetCard,
              {
                backgroundColor:
                  soundscape.currentPreset === preset.id
                    ? (preset?.color || themeColors.primary) + '20'
                    : themeColors.surface,
                borderColor:
                  soundscape.currentPreset === preset.id
                    ? preset.color
                    : 'transparent',
              },
            ]}
            onPress={() => handlePresetSelect(preset.id as SoundscapeType)}
          >
            <View
              style={[styles.presetIconBg, { backgroundColor: preset.color }]}
            >
              <Text style={styles.presetCardIcon}>{preset.icon}</Text>
            </View>
            <Text
              style={[styles.presetCardLabel, { color: themeColors.text }]}
              numberOfLines={2}
            >
              {preset.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {soundscape.isActive && (
        <View style={styles.volumeSection}>
          <Text style={[styles.volumeTitle, { color: themeColors.text }]}>
            Volume
          </Text>
          <View style={styles.volumeControls}>
            <TouchableOpacity
              style={[
                styles.volumeBtn,
                { backgroundColor: themeColors.border },
              ]}
              onPress={() => handleVolumeChange(-0.1)}
            >
              <Text style={styles.volumeIcon}>−</Text>
            </TouchableOpacity>
            <View style={styles.volumeDisplay}>
              <Text style={[styles.volumeValue, { color: themeColors.text }]}>
                {Math.round(soundscape.volume * 100)}%
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.volumeBtn,
                { backgroundColor: themeColors.border },
              ]}
              onPress={() => handleVolumeChange(0.1)}
            >
              <Text style={styles.volumeIcon}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  // Only render if visible - remove special dashboard logic that creates invisible layer
  if (!isVisible) {
    return null;
  }

  // Do not render UI if soundscape is not initialized — keep hooks above intact to preserve hook order
  if (!soundscape || !soundscape.isInitialized) {
    return null;
  }

  // Ensure MiniPlayer is in correct state when visible
  if (playerState === 'hidden') {
    setPlayerState('minimized');
  }

  return (
    <View
      style={[StyleSheet.absoluteFill, { pointerEvents: 'box-none' }, style]}
    >
      <View
        style={[
          styles.miniPlayerContainer,
          miniPlayerAnimatedStyle,
          {
            bottom: safePosition.bottom,
            zIndex: safeZIndex,
          },
        ]}
      >
        <View style={[styles.animatedContainer, animatedContainerStyle]}>
          <PanGestureHandler
            onGestureEvent={onPanGestureEvent}
            onHandlerStateChange={onPanGestureStateChange}
            enabled={playerState !== 'hidden'}
          >
            <View style={styles.gestureContainer}>
              <BlurView
                style={StyleSheet.absoluteFill}
                intensity={theme === 'dark' ? 40 : 30}
                tint={theme === 'dark' ? 'dark' : 'light'}
              />

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleMiniPlayerTap}
                style={styles.contentTouchable}
              >
                {playerState === 'minimized' && renderMinimizedPlayer()}
                {playerState === 'expanded' && renderExpandedPlayer()}
              </TouchableOpacity>

              {playerState === 'minimized' && (
                <View style={styles.dragIndicator}>
                  <View
                    style={[
                      styles.dragBar,
                      { backgroundColor: themeColors.border },
                    ]}
                  />
                </View>
              )}
            </View>
          </PanGestureHandler>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  miniPlayerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },

  animatedContainer: {
    flex: 1,
  },

  gestureContainer: {
    flex: 1,
  },

  contentTouchable: {
    flex: 1,
  },

  // Minimized State
  minimizedContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },

  presetInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  presetIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },

  presetText: {
    flex: 1,
  },

  presetLabel: {
    ...typography.body,
    fontWeight: '600',
  },

  presetFrequency: {
    ...typography.caption,
  },

  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },

  controlButton: {
    padding: spacing.sm,
    marginHorizontal: spacing.xs,
  },

  controlIcon: {
    fontSize: 16,
  },

  playButton: {
    padding: spacing.sm,
    marginHorizontal: spacing.sm,
  },

  playIcon: {
    fontSize: 20,
  },

  expandIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  expandIcon: {
    fontSize: 14,
    fontWeight: 'bold',
  },

  dragIndicator: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  dragBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },

  // Expanded State
  expandedContainer: {
    flex: 1,
    padding: spacing.lg,
  },

  expandedHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  expandedTitle: {
    ...typography.h3,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },

  expandedSubtitle: {
    ...typography.body,
  },

  currentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },

  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },

  statusLabel: {
    ...typography.body,
    fontWeight: '600',
  },

  statusFrequency: {
    ...typography.caption,
  },

  statusRight: {
    alignItems: 'flex-end',
  },

  statusActive: {
    ...typography.caption,
    fontWeight: '600',
  },

  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },

  presetCard: {
    width: '48%',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 2,
  },

  presetIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },

  presetCardIcon: {
    fontSize: 24,
  },

  presetCardLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    textAlign: 'center',
  },

  volumeSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },

  volumeTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    marginBottom: spacing.md,
  },

  volumeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  volumeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.md,
  },

  volumeIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  volumeDisplay: {
    minWidth: 60,
    alignItems: 'center',
  },

  volumeValue: {
    ...typography.body,
    fontWeight: '600',
  },
});
