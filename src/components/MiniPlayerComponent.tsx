 /**
 * Phase 7: Mini Player Component
 *
 * Persistent floating soundscape control interface inspired by Brain.fm.
 * Features intelligent design, smooth animations, and seamless integration.
 *
 * Latest Features:
 * - Persistent overlay across all screens
 * - Smooth animations and transitions
 * - Intelligent preset switching
 * - Performance visualization
 * - One-tap controls
 * - Enhanced gesture handling and stability
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
// Gesture handler is provided by 'react-native-gesture-handler' package
import {
  PanGestureHandler,
  State,
  PanGestureHandlerGestureEvent,
  TapGestureHandler,
} from 'react-native-gesture-handler';
// Use Expo's BlurView which works with Expo Go
import BlurViewWrapper from './common/BlurViewWrapper';

import { LinearGradient } from 'expo-linear-gradient';

// Haptics: optional dynamic import to avoid test/runtime issues on unsupported platforms
let Haptics: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
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
import CognitiveSoundscapeEngine from '../services/learning/CognitiveSoundscapeEngine';
import { HybridStorageService } from '../services/storage/HybridStorageService';

// ==================== TYPES ====================

interface MiniPlayerProps {
  theme: ThemeType;
  style?: any;
}

interface PresetOption {
  id: SoundscapeType;
  label: string;
  icon: string;
  description: string;
  frequency: string;
  color: string;
}

interface GestureState {
  isDragging: boolean;
  startX: number;
  startY: number;
  startTime: number;
}

interface AnimationState {
  isExpanded: boolean;
  isMinimized: boolean;
  isAnimating: boolean;
}

// State machine for player states
type PlayerState =
  | { type: 'hidden' }

type PlayerVisibility = 'hidden' | 'minimized' | 'visible' | 'expanded';

// ==================== CONSTANTS ====================

// Screen dimensions
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

// FAB (Floating Action Button) Design Constants
const FAB_SIZE = 56; // Collapsed circle size
const FAB_EXPANDED_SIZE = 280; // Expanded size
const FAB_PADDING = 16; // Distance from screen edges
const DRAG_THRESHOLD = 5; // Smaller for circle

// Adaptive Sizing & Responsiveness
const ADAPTIVE_FAB_SIZE = Math.min(56, SCREEN_WIDTH * 0.15);
const EXPANDED_WIDTH = Math.min(320, SCREEN_WIDTH * 0.85);

// Gesture & Interaction Constants
const GESTURE_DEBOUNCE_TIME = 300; // ms
const LONG_PRESS_DURATION = 500; // ms
const SWIPE_THRESHOLD = 50; // pixels

// Auto-hide & UX Constants
const RECENT_INTERACTION_TIMEOUT = 3000; // ms
const FEEDBACK_ANIMATION_DURATION = 200; // ms

// Preset configurations with Brain.fm-inspired design
const PRESET_OPTIONS: PresetOption[] = [
  {
    id: 'none',
    label: 'Off',
    icon: '⏹️',
    description: 'No soundscape',
    frequency: '0 Hz',
    color: '#666666',
  },
  {
    id: 'calm_readiness',
    label: 'Calm Readiness',
    icon: '🧘',
    description: 'Relaxed awareness for planning',
    frequency: 'Alpha 10 Hz',
    color: '#4A90E2',
  },
  {
    id: 'deep_focus',
    label: 'Deep Focus',
    icon: '🎯',
    description: 'Intense concentration mode',
    frequency: 'Beta 18 Hz',
    color: '#7ED321',
  },
  {
    id: 'reasoning_boost',
    label: 'Reasoning Boost',
    icon: '🧠',
    description: 'Enhanced logical thinking',
    frequency: 'Gamma 40 Hz',
    color: '#F5A623',
  },
  {
    id: 'memory_flow',
    label: 'Memory Flow',
    icon: '💭',
    description: 'Smooth recall and learning',
    frequency: 'Alpha 10 Hz',
    color: '#50E3C2',
  },
  {
    id: 'speed_integration',
    label: 'Speed Integration',
    icon: '⚡',
    description: 'Rapid processing and absorption',
    frequency: 'Beta→Gamma',
    color: '#BD10E0',
  },
  {
    id: 'visualization',
    label: 'Visualization',
    icon: '🎨',
    description: 'Enhanced imagination and imagery',
    frequency: 'Theta 6 Hz',
    color: '#B4009E',
  },
  {
    id: 'deep_rest',
    label: 'Deep Rest',
    icon: '😴',
    description: 'Sleep preparation and recovery',
    frequency: 'Delta 2.5 Hz',
    color: '#417505',
  },
];

// ==================== HAPTICS HELPERS ====================
const hapticSelection = () => {
  try {
    Haptics?.selectionAsync?.();
  } catch (e) {
    // no-op
  }
};
const hapticImpact = (style?: any) => {
  try {
    Haptics?.impactAsync?.(style);
  } catch (e) {
    // no-op
  }
};
const hapticNotify = (type?: any) => {
  try {
    Haptics?.notificationAsync?.(type);
  } catch (e) {
    // no-op
  }
};

// ==================== MINI PLAYER COMPONENT ====================

export const MiniPlayer: React.FC<MiniPlayerProps> = React.memo(({ theme, style }) => {
  const themeColors = useMemo(() => colors[theme], [theme]);
  const soundscape = useSoundscape();

  // Component state
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartTime, setDragStartTime] = useState(0);
  const [personalizationEnabled, setPersonalizationEnabled] = useState(true);
  const [audioAvailable, setAudioAvailable] = useState<boolean | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showQuickSettings, setShowQuickSettings] = useState(false);
  const [autoHideEnabled, setAutoHideEnabled] = useState(true);
  const [snapToEdges, setSnapToEdges] = useState(true);

  // New state for enhancements
  const [recentUserInteraction, setRecentUserInteraction] = useState(false);
  const [gestureDebounceTimer, setGestureDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [recentlyUsedPresets, setRecentlyUsedPresets] = useState<SoundscapeType[]>([]);
  const [feedbackAnimation, setFeedbackAnimation] = useState(false);

  // Animation values
  const translateX = useRef(new Animated.Value(SCREEN_WIDTH - FAB_SIZE - FAB_PADDING)).current; // Start at bottom-right corner
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT - FAB_SIZE - FAB_PADDING)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const opacityValue = useRef(new Animated.Value(0.9)).current;
  const expandValue = useRef(new Animated.Value(0)).current;

  // FAB-specific animation values
  const fabScale = useRef(new Animated.Value(1)).current;
  const fabSize = useRef(new Animated.Value(FAB_SIZE)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  // Pulse animation for active state
  const pulseValue = useRef(new Animated.Value(1)).current;

  // Feedback animation
  const feedbackOpacity = useRef(new Animated.Value(0)).current;

  // Show feedback animation
  const showFeedback = useCallback(() => {
    Animated.sequence([
      Animated.timing(feedbackOpacity, {
        toValue: 0.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(feedbackOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Add near line 75 with other state
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
  const AUTO_HIDE_DELAY = 5000; // 5 seconds

  // Add near line 90 with other animation refs
  const settingsRotation = useRef(new Animated.Value(0)).current;

  // Volume slider animation
  const volumeSliderWidth = useRef(new Animated.Value(0)).current;

  // Current preset info - memoized for performance
  const currentPresetOption = useMemo(() =>
    PRESET_OPTIONS.find((p) => p.id === soundscape.currentPreset) ||
    PRESET_OPTIONS[0],
    [soundscape.currentPreset]
  );

  // ==================== ANIMATIONS ====================

  // Pulse animation when active
  useEffect(() => {
    if (soundscape.isActive) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.05,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseAnimation.start();

      return () => pulseAnimation.stop();
    } else {
      pulseValue.setValue(1);
    }
  }, [soundscape.isActive]);

  // Show mini player when soundscape is available
  useEffect(() => {
    if (soundscape.isInitialized) {
      Animated.spring(opacityValue, {
        toValue: soundscape.miniPlayerVisible ? 0.95 : 0,
        useNativeDriver: true,
      }).start();
    }
  }, [soundscape.isInitialized, soundscape.miniPlayerVisible]);

  // Initialize volume slider width
  useEffect(() => {
    Animated.timing(volumeSliderWidth, {
      toValue: soundscape.volume * 100,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [soundscape.volume]);

  // Detect audio availability
  useEffect(() => {
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('expo-av');
        setAudioAvailable(true);
      } catch (e) {
        setAudioAvailable(false);
      }
    })();
  }, []);

  // Hydrate persisted sound settings
  useEffect(() => {
    (async () => {
      try {
        const ss = await HybridStorageService.getInstance().getSoundSettings();
        if (ss) {
          setPersonalizationEnabled(ss.personalizationEnabled !== false);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  // Auto-hide after inactivity
  useEffect(() => {
    // Only auto-hide when playing, not expanded, and not dragging
    if (autoHideEnabled && soundscape.isActive && !isExpanded && !isDragging && !soundscape.settingsModalVisible) {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);

      // Show player first
      setIsMinimized(false);
      Animated.spring(opacityValue, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();

      // Then set timer to minimize
      inactivityTimer.current = setTimeout(() => {
        setIsMinimized(true);
        Animated.spring(opacityValue, {
          toValue: 0.3,
          useNativeDriver: true,
        }).start();
      }, AUTO_HIDE_DELAY);
    } else {
      // Keep visible when expanded or not playing
      setIsMinimized(false);
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      Animated.spring(opacityValue, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [autoHideEnabled, soundscape.isActive, isExpanded, isDragging, soundscape.settingsModalVisible]);


  // ==================== GESTURE HANDLING ====================

  const gestureStartX = useRef(0);
  const gestureStartY = useRef(0);

  const onPanGestureEvent = useCallback((event: PanGestureHandlerGestureEvent) => {
    if (!isDragging) return;

    // Apply translation directly to current position
    translateX.setValue(gestureStartX.current + event.nativeEvent.translationX);
    translateY.setValue(gestureStartY.current + event.nativeEvent.translationY);
  }, [isDragging]);

  const onPanGestureStateChange = useCallback((event: any) => {
    const { state, translationX, translationY, velocityX, velocityY } = event.nativeEvent;

    if (state === State.BEGAN) {
      hapticImpact(Haptics?.ImpactFeedbackStyle?.Light);
      setIsDragging(true);
      setDragStartTime(Date.now());

      // Store current position as gesture start
      gestureStartX.current = (translateX as any)._value;
      gestureStartY.current = (translateY as any)._value;

      Animated.spring(scaleValue, {
        toValue: 1.05,
        useNativeDriver: true,
      }).start();
      return;
    }

    if (state === State.END || state === State.CANCELLED) {
      const dragDuration = Date.now() - dragStartTime;

      setIsDragging(false);

      // Clear tap detection
      if (dragDuration < 200 && Math.sqrt(translationX ** 2 + translationY ** 2) < DRAG_THRESHOLD) {
        // Reset position
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: gestureStartX.current,
            useNativeDriver: true,
          }),
          Animated.spring(translateY, {
            toValue: gestureStartY.current,
            useNativeDriver: true,
          }),
          Animated.spring(scaleValue, {
            toValue: 1,
            useNativeDriver: true,
          }),
        ]).start();
        return;
      }

      // Calculate final position
      const finalX = gestureStartX.current + translationX;
      const finalY = gestureStartY.current + translationY;

      snapToPosition(finalX, finalY, velocityX, velocityY);

      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  }, [dragStartTime, snapToEdges]);

  const snapToPosition = useCallback((
    currentX: number,
    currentY: number,
    velocityX: number,
    velocityY: number,
  ) => {
    hapticNotify(Haptics?.NotificationFeedbackType?.Success);

    let targetX = currentX;
    let targetY = currentY;

    if (snapToEdges) {
      // Determine which corner is closest
      const isLeft = currentX < SCREEN_WIDTH / 2;
      const isTop = currentY < SCREEN_HEIGHT / 2;

      // Snap to corners
      targetX = isLeft ? FAB_PADDING : SCREEN_WIDTH - FAB_SIZE - FAB_PADDING;
      targetY = isTop ? 60 : SCREEN_HEIGHT - FAB_SIZE - FAB_PADDING - 80;
    } else {
      // Constrain within bounds
      targetX = Math.max(FAB_PADDING, Math.min(SCREEN_WIDTH - FAB_SIZE - FAB_PADDING, currentX));
      targetY = Math.max(60, Math.min(SCREEN_HEIGHT - FAB_SIZE - FAB_PADDING - 80, currentY));
    }

    Animated.parallel([
      Animated.spring(translateX, {
        toValue: targetX,
        velocity: velocityX,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: targetY,
        velocity: velocityY,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, [snapToEdges, translateX, translateY]);

  // ==================== INTERACTION HANDLERS ====================

  const handleMiniPlayerTap = useCallback(() => {
    hapticImpact(Haptics?.ImpactFeedbackStyle?.Medium);
    showFeedback();
    if (isMinimized) {
      setIsMinimized(false);
      Animated.spring(opacityValue, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
      return;
    }
    if (soundscape.isActive) {
      setIsExpanded(!isExpanded);

      Animated.spring(expandValue, {
        toValue: isExpanded ? 0 : 1,
        useNativeDriver: false,
      }).start();
    } else {
      // Start default preset
      const defaultPreset =
        soundscape.screenPresets[soundscape.currentScreen] || 'calm_readiness';
      soundscape.startPreset(defaultPreset);
    }
  }, [isMinimized, soundscape.isActive, isExpanded, soundscape.screenPresets, soundscape.currentScreen, showFeedback]);

  const handlePresetSelect = useCallback(async (presetId: SoundscapeType) => {
    hapticImpact(Haptics?.ImpactFeedbackStyle?.Medium);
    try {
      if (presetId === 'none') {
        await soundscape.stopSoundscape();
        hapticImpact(Haptics?.ImpactFeedbackStyle?.Soft);
      } else {
        await soundscape.startPreset(presetId, { fadeIn: true });
        hapticNotify(Haptics?.NotificationFeedbackType?.Success);
      }
      setIsExpanded(false);

      Animated.spring(expandValue, {
        toValue: 0,
        useNativeDriver: false,
      }).start();
    } catch (error) {
      console.error('Failed to change preset:', error);
    }
  }, [soundscape]);

  const handleVolumeChange = useCallback((delta: number) => {
    hapticImpact(Haptics?.ImpactFeedbackStyle?.Light);
    const newVolume = Math.max(0, Math.min(1, soundscape.volume + delta));
    soundscape.setVolume(newVolume);
  }, [soundscape.volume, soundscape.setVolume]);

  const handleQuickAction = useCallback(async (action: 'next' | 'previous') => {
    const currentIndex = PRESET_OPTIONS.findIndex(
      (p) => p.id === soundscape.currentPreset,
    );
    let nextIndex;
    if (action === 'next') {
      nextIndex = (currentIndex + 1) % PRESET_OPTIONS.length;
    } else {
      nextIndex = currentIndex === 0 ? PRESET_OPTIONS.length - 1 : currentIndex - 1;
    }
    const nextPreset = PRESET_OPTIONS[nextIndex];
    await handlePresetSelect(nextPreset.id);
    hapticImpact(Haptics?.ImpactFeedbackStyle?.Light);
  }, [soundscape.currentPreset, handlePresetSelect]);

  const handleVolumeSliderChange = useCallback((value: number) => {
    hapticImpact(Haptics?.ImpactFeedbackStyle?.Light);
    const newVolume = Math.max(0, Math.min(1, value));
    soundscape.setVolume(newVolume);

    // Animate the volume slider
    Animated.timing(volumeSliderWidth, {
      toValue: newVolume * 100,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [soundscape.setVolume]);

  // ==================== RENDER METHODS ====================

  const renderMiniPlayerContent = () => (
    <View style={styles.miniPlayerContent}>
      {/* Collapsed state: Only show icon */}
      {!isExpanded && (
        <View style={styles.collapsedContent}>
          <Text style={styles.collapsedIcon}>{currentPresetOption.icon}</Text>
        </View>
      )}

      {/* Expanded state: Show full content */}
      {isExpanded && (
        <>
          {/* Left: Preset Info with gradient overlay for better readability */}
          <View style={styles.presetInfo}>
            <Text style={styles.presetIcon}>{currentPresetOption.icon}</Text>
            <View style={styles.presetText}>
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.3)']}
                style={styles.textGradientOverlay}
              >
                <Text
                  style={[styles.presetLabel, { color: getContrastColor(currentPresetOption.color) }]}
                  numberOfLines={1}
                >
                  {currentPresetOption.label}
                </Text>
                <Text
                  style={[styles.presetFrequency, { color: getContrastColor(currentPresetOption.color) + 'CC' }]}
                  numberOfLines={1}
                >
                  {soundscape.isActive
                    ? currentPresetOption.frequency
                    : 'Tap to start'}
                </Text>
              </LinearGradient>
            </View>
          </View>

          {/* Right: Controls */}
          <View style={styles.controls}>
            {soundscape.isActive && (
              <>
                {/* Volume Controls */}
                <TouchableOpacity
                  style={styles.volumeButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleVolumeChange(-0.1);
                  }}
                >
                  <Text style={styles.controlIcon}>🔉</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.volumeButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleVolumeChange(0.1);
                  }}
                >
                  <Text style={styles.controlIcon}>🔊</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Settings */}
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={(e) => {
                e.stopPropagation();
                hapticSelection();

                Animated.sequence([
                  Animated.timing(settingsRotation, {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: true,
                  }),
                  Animated.timing(settingsRotation, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                  }),
                ]).start();

                setShowQuickSettings(!showQuickSettings);
              }}
            >
              <Animated.Text
                style={[
                  styles.controlIcon,
                  {
                    transform: [
                      {
                        rotate: settingsRotation.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '180deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                ⚙️
              </Animated.Text>
            </TouchableOpacity>
          </View>

          {/* Effectiveness Indicator */}
          {soundscape.isActive && soundscape.effectivenessScore > 0 && (
            <View style={styles.effectivenessBar}>
              <Animated.View
                style={[
                  styles.effectivenessFill,
                  {
                    width: `${soundscape.effectivenessScore * 100}%`,
                    backgroundColor: getEffectivenessColor(soundscape.effectivenessScore),
                  },
                ]}
              />
            </View>
          )}
        </>
      )}
    </View>
  );

  const renderQuickSettingsPanel = () => (
    <Animated.View
      style={[
        styles.quickSettingsPanel,
        {
          backgroundColor: themeColors.surface,
          opacity: 0.95,
          transform: [
            { translateX },
            { translateY: Animated.add(translateY, new Animated.Value(FAB_SIZE + 8)) },
          ],
        },
      ]}
    >
      <View style={styles.quickSettingRow}>
        <Text style={[styles.quickSettingLabel, { color: themeColors.text }]}>
          Auto-hide
        </Text>
        <TouchableOpacity
          style={[
            styles.quickToggle,
            {
              backgroundColor: autoHideEnabled
                ? currentPresetOption.color
                : themeColors.border,
            },
          ]}
          onPress={() => {
            hapticSelection();
            setAutoHideEnabled(!autoHideEnabled);
          }}
        >
          <Text style={[styles.quickToggleText, { color: '#FFFFFF' }]}>
            {autoHideEnabled ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickSettingRow}>
        <Text style={[styles.quickSettingLabel, { color: themeColors.text }]}>
          Snap to edges
        </Text>
        <TouchableOpacity
          style={[
            styles.quickToggle,
            {
              backgroundColor: snapToEdges
                ? currentPresetOption.color
                : themeColors.border,
            },
          ]}
          onPress={() => {
            hapticSelection();
            setSnapToEdges(!snapToEdges);
          }}
        >
          <Text style={[styles.quickToggleText, { color: '#FFFFFF' }]}>
            {snapToEdges ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderExpandedMenu = () => (
    <Modal
      visible={isExpanded}
      transparent
      animationType="slide"
      onRequestClose={() => setIsExpanded(false)}
    >
      <View style={styles.expandedOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => {
            hapticSelection();
            setIsExpanded(false);
          }}
        />

        <Animated.View
          style={[
            styles.expandedMenu,
            {
              backgroundColor: themeColors.surface,
              transform: [
                {
                  translateY: expandValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [SCREEN_HEIGHT, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <BlurViewWrapper
            style={StyleSheet.absoluteFill}
            intensity={theme === 'dark' ? 80 : 60}
            tint={theme === 'dark' ? 'dark' : 'light'}
          />

          {/* Drag handle */}
          <View style={styles.dragHandleContainer}>
            <View style={[styles.dragHandle, { backgroundColor: themeColors.border }]} />
          </View>

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

          <ScrollView
            style={styles.presetList}
            showsVerticalScrollIndicator={false}
          >
            {PRESET_OPTIONS.map((preset) => (
              <TouchableOpacity
                key={preset.id}
                style={[
                  styles.presetOption,
                  {
                    backgroundColor:
                      soundscape.currentPreset === preset.id
                        ? preset.color + '20'
                        : 'transparent',
                    borderColor:
                      soundscape.currentPreset === preset.id
                        ? preset.color
                        : 'transparent',
                  },
                ]}
                onPress={() => handlePresetSelect(preset.id)}
              >
                <View style={styles.presetOptionLeft}>
                  <View
                    style={[
                      styles.presetIconContainer,
                      { backgroundColor: preset.color },
                    ]}
                  >
                    <Text style={styles.presetOptionIcon}>{preset.icon}</Text>
                  </View>

                  <View style={styles.presetOptionText}>
                    <Text
                      style={[
                        styles.presetOptionLabel,
                        { color: themeColors.text },
                      ]}
                    >
                      {preset.label}
                    </Text>
                    <Text
                      style={[
                        styles.presetOptionDescription,
                        { color: themeColors.textSecondary },
                      ]}
                    >
                      {preset.description}
                    </Text>
                  </View>
                </View>

                <View style={styles.presetOptionRight}>
                  <Text
                    style={[
                      styles.presetOptionFrequency,
                      { color: preset.color },
                    ]}
                  >
                    {preset.frequency}
                  </Text>

                  {soundscape.currentPreset === preset.id &&
                    soundscape.isActive && (
                      <View
                        style={[
                          styles.activeIndicator,
                          { backgroundColor: preset.color },
                        ]}
                      >
                        <Text style={styles.activeIndicatorText}>●</Text>
                      </View>
                    )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Interactive Volume Control */}
          {soundscape.isActive && (
            <View style={styles.volumeControl}>
              <Text style={[styles.volumeLabel, { color: themeColors.text }]}>
                Volume
              </Text>
              <View style={styles.volumeSliderContainer}>
                <View
                  style={[
                    styles.volumeTrack,
                    { backgroundColor: themeColors.border },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.volumeFill,
                    {
                      width: volumeSliderWidth.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                      }),
                      backgroundColor: currentPresetOption.color,
                    },
                  ]}
                />
                <PanGestureHandler
                  onGestureEvent={(event) => {
                    const relativeX = event.nativeEvent.absoluteX - 40; // Adjust for padding
                    const sliderWidth = SCREEN_WIDTH - 80; // Adjust for padding
                    const newVolume = Math.max(0, Math.min(1, relativeX / sliderWidth));
                    handleVolumeSliderChange(newVolume);
                  }}
                >
                  <Animated.View
                    style={[
                      styles.volumeThumb,
                      {
                        backgroundColor: currentPresetOption.color,
                        left: volumeSliderWidth.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </PanGestureHandler>
              </View>
              <Text
                style={[
                  styles.volumeValue,
                  { color: themeColors.textSecondary },
                ]}
              >
                {Math.round(soundscape.volume * 100)}%
              </Text>
            </View>
          )}

          {/* Personalization Toggle */}
          <View style={styles.personalizationControl}>
            <View style={styles.personalizationRow}>
              <View style={styles.personalizationText}>
                <Text
                  style={[styles.personalizationLabel, { color: themeColors.text }]}
                >
                  Personalization
                </Text>
                <Text
                  style={[
                    styles.personalizationDescription,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  Adapt soundscapes to your preferences
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  {
                    backgroundColor: personalizationEnabled
                      ? currentPresetOption.color
                      : themeColors.border,
                  },
                ]}
                onPress={async () => {
                  hapticSelection();
                  const newValue = !personalizationEnabled;
                  setPersonalizationEnabled(newValue);
                  // Persist the setting
                  try {
                    const currentSettings = await HybridStorageService.getInstance().getSoundSettings();
                    await HybridStorageService.getInstance().saveSoundSettings({
                      ...currentSettings,
                      personalizationEnabled: newValue,
                    });
                  } catch (error) {
                    console.error('Failed to save personalization setting:', error);
                  }
                }}
              >
                <Text
                  style={[
                    styles.toggleText,
                    {
                      color: personalizationEnabled
                        ? '#FFFFFF'
                        : themeColors.text,
                    },
                  ]}
                >
                  {personalizationEnabled ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );

  // ==================== HELPERS ====================

  const getEffectivenessColor = (score: number): string => {
    if (score > 0.8) return '#7ED321';
    if (score > 0.6) return '#F5A623';
    if (score > 0.4) return '#BD10E0';
    return '#D0021B';
  };

  // Dynamic color contrast for better readability
  const getContrastColor = useCallback((backgroundColor: string): string => {
    // Simple luminance calculation for contrast
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  }, []);

  // Elevation levels for consistent visual hierarchy
  const getElevationStyle = useCallback((level: 'resting' | 'dragging' | 'expanded') => {
    switch (level) {
      case 'resting':
        return { elevation: 2, shadowOpacity: 0.1 };
      case 'dragging':
        return { elevation: 8, shadowOpacity: 0.3 };
      case 'expanded':
        return { elevation: 12, shadowOpacity: 0.4 };
      default:
        return { elevation: 2, shadowOpacity: 0.1 };
    }
  }, []);

  // Don't render if not initialized or hidden
  if (!soundscape.isInitialized || !soundscape.miniPlayerVisible) {
    return null;
  }

  return (
    <View
      style={[StyleSheet.absoluteFill, { pointerEvents: 'box-none', zIndex: 9999 }]}
      {...style}
    >
      {/* Main content - tap only, no gesture handler */}
      <Animated.View
        style={[
          styles.miniPlayerContainer,
          {
            backgroundColor: soundscape.isActive
              ? currentPresetOption.color
              : themeColors.surface,
            transform: [
              { translateX },
              { translateY },
              { scale: Animated.multiply(scaleValue, pulseValue) },
            ],
            opacity: opacityValue,
          },
        ]}
      >
        {/* Drag handle at top - ONLY this area is draggable */}
        <View style={styles.dragHandleArea}>
          <PanGestureHandler
            onGestureEvent={onPanGestureEvent}
            onHandlerStateChange={onPanGestureStateChange}
            enabled={!isExpanded}
          >
            <Animated.View style={styles.dragHandleTouch}>
              <View style={[styles.dragHandleIndicator, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
            </Animated.View>
          </PanGestureHandler>
        </View>

        {/* Content - tap to expand/collapse */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleMiniPlayerTap}
          style={styles.contentArea}
        >
          <BlurViewWrapper
            style={StyleSheet.absoluteFill}
            intensity={theme === 'dark' ? 40 : 30}
            tint={theme === 'dark' ? 'dark' : 'light'}
          />

          {renderMiniPlayerContent()}

          {/* Feedback overlay */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: 'rgba(255,255,255,0.3)',
                borderRadius: FAB_SIZE / 2,
                opacity: feedbackOpacity,
              },
            ]}
          />
        </TouchableOpacity>
      </Animated.View>

      {showQuickSettings && renderQuickSettingsPanel()}
      {renderExpandedMenu()}
    </View>
  );
});

  // ==================== STYLES ====================

  const styles = StyleSheet.create({
    miniPlayerTouchable: {
      flex: 1,
    },
    miniPlayerContainer: {
      position: 'absolute',
      width: FAB_SIZE,
      height: FAB_SIZE,
      borderRadius: FAB_SIZE / 2, // Make it circular
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 12,
      overflow: 'hidden',
      zIndex: 1000,
    },

    dragHandleArea: {
      width: '100%',
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'absolute',
      top: 0,
      zIndex: 10,
    },

    dragHandleTouch: {
      width: '100%',
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },

    dragHandleIndicator: {
      width: 30,
      height: 3,
      borderRadius: 2,
      backgroundColor: 'rgba(255,255,255,0.3)',
    },

    contentArea: {
      flex: 1,
      marginTop: 20, // Space for drag handle
    },

    miniPlayerContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
    },

    collapsedContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },

    collapsedIcon: {
      fontSize: 28,
      color: '#FFFFFF',
    },

    presetInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },

    presetIcon: {
      fontSize: 24,
      marginRight: spacing.sm,
    },

    presetText: {
      flex: 1,
    },

    textGradientOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
    },

    presetLabel: {
      ...typography.body,
      fontWeight: '600',
      color: '#FFFFFF',
    },

    presetFrequency: {
      ...typography.caption,
      color: 'rgba(255,255,255,0.8)',
    },

    controls: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    volumeButton: {
      padding: spacing.xs,
      marginHorizontal: spacing.xs,
    },

    settingsButton: {
      padding: spacing.xs,
      marginLeft: spacing.xs,
    },

    controlIcon: {
      fontSize: 16,
    },

    effectivenessBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 3,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },

    effectivenessFill: {
      height: '100%',
      borderRadius: 1,
    },

    // Quick Settings Panel
    quickSettingsPanel: {
      position: 'absolute',
      width: FAB_SIZE * 2, // Make it wider for better usability
      backgroundColor: 'rgba(0,0,0,0.9)',
      borderRadius: borderRadius.md,
      padding: spacing.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },

    quickSettingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },

    quickSettingLabel: {
      ...typography.caption,
      fontWeight: '600',
    },

    quickToggle: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.sm,
      minWidth: 50,
      alignItems: 'center',
    },

    quickToggleText: {
      ...typography.caption,
      fontWeight: '700',
      fontSize: 11,
    },

    // Expanded Menu Styles
    expandedOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },

    expandedMenu: {
      width: '100%',
      maxHeight: SCREEN_HEIGHT * 0.8,
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      padding: spacing.lg,
      paddingBottom: spacing.xl,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 20,
      overflow: 'hidden',
    },

    dragHandleContainer: {
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },

    dragHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
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

    presetList: {
      maxHeight: 400,
    },

    presetOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: borderRadius.md,
      marginBottom: spacing.sm,
      borderWidth: 2,
    },

    presetOptionLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },

    presetIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },

    presetOptionIcon: {
      fontSize: 20,
    },

    presetOptionText: {
      flex: 1,
    },

    presetOptionLabel: {
      ...typography.body,
      fontWeight: '600',
      marginBottom: 2,
    },

    presetOptionDescription: {
      ...typography.caption,
    },

    presetOptionRight: {
      alignItems: 'flex-end',
    },

    presetOptionFrequency: {
      ...typography.caption,
      fontWeight: '600',
      marginBottom: 2,
    },

    activeIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },

    activeIndicatorText: {
      fontSize: 8,
      color: '#FFFFFF',
    },

    // Volume Control
    volumeControl: {
      marginTop: spacing.lg,
      paddingTop: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.1)',
    },

    volumeLabel: {
      ...typography.bodySmall,
      fontWeight: '600',
      marginBottom: spacing.sm,
    },

    volumeSliderContainer: {
      height: 24,
      justifyContent: 'center',
      marginBottom: spacing.xs,
      position: 'relative',
    },

    volumeTrack: {
      height: 4,
      borderRadius: 2,
      position: 'absolute',
      left: 0,
      right: 0,
    },

    volumeFill: {
      height: 4,
      borderRadius: 2,
      position: 'absolute',
      left: 0,
    },

    volumeThumb: {
      width: 20,
      height: 20,
      borderRadius: 10,
      position: 'absolute',
      marginLeft: -10,
    },

    volumeValue: {
      ...typography.caption,
      textAlign: 'center',
    },

    // Personalization Control
    personalizationControl: {
      marginTop: spacing.lg,
      paddingTop: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.1)',
    },

    personalizationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    personalizationText: {
      flex: 1,
    },

    personalizationLabel: {
      ...typography.bodySmall,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },

    personalizationDescription: {
      ...typography.caption,
    },

    toggleButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      minWidth: 60,
      alignItems: 'center',
    },

    toggleText: {
      ...typography.caption,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });

