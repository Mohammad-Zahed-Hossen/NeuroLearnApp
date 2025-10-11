/**
 * Enhanced FloatingCommandCenter - Smart Morphing Bubble System
 *
 * A modern, advanced floating command center that morphs based on context
 * and provides a unified interface for all floating actions
 *
 * Features:
 * - Context-aware morphing with intelligent priority system
 * - Advanced Reanimated 3 animations with spring physics
 * - Staggered radial menu with haptic feedback
 * - Dynamic color theming based on cognitive state
 * - Gesture-based interactions (tap, long press, pan)
 * - Premium visual effects (glow, blur, shadows)
 * - Smart positioning with collision detection
 */

import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useFloatingElements } from './FloatingElementsContext';
import MiniSoundscapeIndicator from './MiniSoundscapeIndicator';
import RadialMenu from './RadialMenu';
import FloatingChatBubble from '../ai/FloatingChatBubble';
import { useSoundscape } from '../../contexts/SoundscapeContext';
import { useCurrentAuraState } from '../../store/useAuraStore';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
  interpolate,
  useDerivedValue,
  withRepeat,
} from 'react-native-reanimated';
import {
  useAnimatedGestureHandlerAny,
  castGradient,
  withSequenceAny,
} from '../../utils/reanimated-shims';
import {
  PanGestureHandler,
  TapGestureHandler,
  State,
} from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
// ...existing code...

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Enhanced theme colors for different states
const BUBBLE_THEMES = {
  miniPlayer: {
    primary: '#4A90E2',
    secondary: '#2171B5',
    glow: '#4A90E2',
    gradient: ['#4A90E2', '#2171B5'],
  },
  aiChat: {
    primary: '#6366F1',
    secondary: '#4F46E5',
    glow: '#6366F1',
    gradient: ['#6366F1', '#4F46E5'],
  },
  fab: {
    primary: '#10B981',
    secondary: '#059669',
    glow: '#10B981',
    gradient: ['#10B981', '#059669'],
  },
  focus: {
    primary: '#F59E0B',
    secondary: '#D97706',
    glow: '#F59E0B',
    gradient: ['#F59E0B', '#D97706'],
  },
  break: {
    primary: '#EF4444',
    secondary: '#DC2626',
    glow: '#EF4444',
    gradient: ['#EF4444', '#DC2626'],
  },
};

interface Props {
  theme?: string;
  onRequestQuickAction?: () => void;
  onNavigate?: (screen: string) => void;
}

interface PrimaryContent {
  icon: string;
  type: 'miniPlayer' | 'aiChat' | 'fab' | 'focus' | 'break';
  priority: number;
  pulsing?: boolean;
  badge?: number;
}

const FloatingCommandCenter: React.FC<Props> = ({
  theme = 'dark',
  onRequestQuickAction,
  onNavigate,
}) => {
  const ctx = useFloatingElements();
  const soundscape = useSoundscape();
  const auraState = useCurrentAuraState();

  // State management
  const [expanded, setExpanded] = useState(false);
  // Local fallback flags: used if orchestrator visibility setters don't make the UI appear
  const [fallbackMiniVisible, setFallbackMiniVisible] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [lastSelection, setLastSelection] = useState<string | null>(null);
  const [fallbackAIVisible, setFallbackAIVisible] = useState(false);

  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const rotation = useSharedValue(0);
  const glowIntensity = useSharedValue(0);
  const radialExpansion = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Gesture refs
  const tapRef = useRef(null);
  const panRef = useRef(null);

  // Enhanced priority system with context awareness
  const primaryContent = useMemo((): PrimaryContent => {
    const cognitiveLoad = ctx.cognitiveLoad;

    // High cognitive load - show break suggestion with pulsing
    if (cognitiveLoad === 'high') {
      return {
        icon: '🧘',
        type: 'break',
        priority: 10,
        pulsing: true,
      };
    }

    // Focus timer active - show timer controls
    if (auraState?.context === 'DeepFocus') {
      return {
        icon: '⏱️',
        type: 'focus',
        priority: 9,
      };
    }

    // Soundscape active (but not on dashboard) - show mini player
    if (soundscape?.isActive && ctx.currentScreen !== 'dashboard') {
      return {
        icon: '🎵',
        type: 'miniPlayer',
        priority: 8,
      };
    }

    // Unread AI messages - show AI chat with badge
    if (ctx.hasUnreadMessages) {
      return {
        icon: '🤖',
        type: 'aiChat',
        priority: 7,
        badge: 1, // Could be dynamic unread count
      };
    }

    // Default contextual FAB
    return {
      icon: '⚡',
      type: 'fab',
      priority: 1,
    };
  }, [
    soundscape?.isActive,
    ctx.currentScreen,
    ctx.hasUnreadMessages,
    ctx.cognitiveLoad,
    auraState?.context,
  ]);

  // Dynamic theme based on primary content
  const currentTheme = useMemo(() => {
    return BUBBLE_THEMES[primaryContent.type];
  }, [primaryContent.type]);

  // Pulsing animation for high priority items
  useEffect(() => {
    if (primaryContent.pulsing) {
      pulseScale.value = withRepeat(
        withSequenceAny(
          withTiming(1.1, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
        false,
      );
    } else {
      pulseScale.value = withSpring(1);
    }
  }, [primaryContent.pulsing, pulseScale]);

  // Glow effect based on state
  useEffect(() => {
    glowIntensity.value = withSpring(expanded ? 1 : 0.3, {
      damping: 15,
      stiffness: 100,
    });
  }, [expanded, glowIntensity]);

  // Enhanced tap handler with immediate feedback
  const handleTap = useCallback(() => {
    'worklet';

    // mark handled on JS side to avoid duplicate fallback
    try {
      runOnJS(() => {
        try {
          // update a timestamp ref on JS thread
          (lastHandledAtRef as any).current = Date.now();
        } catch {}
      })();
    } catch {}

    // Immediate scale feedback
    scale.value = withSequenceAny(
      withTiming(0.9, { duration: 100 }),
      withSpring(1, { damping: 15, stiffness: 200 }),
    );

    // Haptic feedback
    runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);

    // Route based on primary content type
    runOnJS((type: string) => {
      switch (type) {
        case 'miniPlayer':
          ctx.setMiniPlayerActive(true);
          break;
        case 'aiChat':
          ctx.setUnreadMessages(false);
          ctx.setShowAIChat(true);
          break;
        case 'focus':
          if (onNavigate) onNavigate('focus');
          break;
        case 'break':
          // Show break suggestion modal
          setShowQuickActions(true);
          break;
        default:
          // Toggle radial expansion for FAB
          setExpanded((prev) => {
            const next = !prev;
            radialExpansion.value = withSpring(next ? 1 : 0, {
              damping: 12,
              stiffness: 120,
            });
            return next;
          });
      }
    })(primaryContent.type);
  }, [primaryContent.type, ctx, onNavigate, radialExpansion]);

  // JS fallback for environments where the animated gesture handler is not available
  const handleTapFallback = useCallback(() => {
    try {
      console.log(
        '[FloatingCommandCenter] handleTapFallback primary:',
        primaryContent.type,
      );
    } catch {}
    // prevent duplicate handling if the animated handler already processed the tap
    try {
      const last = (lastHandledAtRef as any).current || 0;
      if (Date.now() - last < 600) return;
      (lastHandledAtRef as any).current = Date.now();
    } catch {}

    // Provide basic haptic and routing behavior without worklet animations
    try {
      Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    switch (primaryContent.type) {
      case 'miniPlayer':
        try {
          ctx.setMiniPlayerActive(true);
        } catch {}
        try {
          console.log('[FloatingCommandCenter] fallback opened miniPlayer');
        } catch {}
        break;
      case 'aiChat':
        try {
          ctx.setUnreadMessages(false);
          ctx.setShowAIChat(true);
        } catch {}
        try {
          console.log('[FloatingCommandCenter] fallback opened aiChat');
        } catch {}
        break;
      case 'focus':
        if (onNavigate) onNavigate('focus');
        break;
      case 'break':
        setShowQuickActions(true);
        break;
      default:
        // Toggle radial expansion for FAB (non-animated fallback)
        setExpanded((prev) => {
          const next = !prev;
          try {
            radialExpansion.value = next ? 1 : 0;
          } catch {}
          return next;
        });
        try {
          console.log('[FloatingCommandCenter] fallback toggled expanded');
        } catch {}
        break;
    }
  }, [primaryContent.type, ctx, onNavigate, radialExpansion]);

  // small ref to coordinate between worklet handler and JS fallback to avoid dupes
  const lastHandledAtRef = useRef<number | null>(0);

  // Enhanced long press handler
  const handleLongPress = useCallback(() => {
    'worklet';

    // Stronger haptic feedback for long press
    runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy);

    // Always expand radial menu on long press
    runOnJS(setExpanded)(true);
    radialExpansion.value = withSpring(1, {
      damping: 12,
      stiffness: 120,
    });

    // Rotation feedback
    rotation.value = withSequenceAny(
      withTiming(5, { duration: 100 }),
      withSpring(0, { damping: 15 }),
    );
  }, [radialExpansion, rotation]);

  // Gesture handlers
  const tapGestureHandler = useAnimatedGestureHandlerAny({
    onStart: (_evt: any) => {
      'worklet';
      // Visual feedback on touch down
      scale.value = withTiming(0.95, { duration: 50 });
    },
    onEnd: (_evt: any) => {
      'worklet';
      scale.value = withSpring(1);
      // mark handled on JS thread to prevent fallback duplicate
      try {
        // runOnJS to update the lastHandledAtRef on JS thread
        runOnJS(() => {
          try {
            (lastHandledAtRef as any).current = Date.now();
          } catch {}
        })();
      } catch {}

      handleTap();
    },
    onCancel: () => {
      'worklet';
      scale.value = withSpring(1);
    },
  });

  const longPressHandler = useAnimatedGestureHandlerAny({
    onStart: () => {
      'worklet';
      // Start building up visual feedback
      scale.value = withTiming(0.98, { duration: 200 });
    },
    onActive: () => {
      'worklet';
      if (!isDragging) {
        handleLongPress();
      }
    },
    onEnd: () => {
      'worklet';
      scale.value = withSpring(1);
    },
  });

  // Pan gesture for drag-to-reposition (future feature)
  const panGestureHandler = useAnimatedGestureHandlerAny({
    onStart: (_evt: any) => {
      'worklet';
      runOnJS(setIsDragging)(true);
    },
    onActive: (evt: any) => {
      'worklet';
      translateX.value = evt.translationX;
      translateY.value = evt.translationY;
    },
    onEnd: (_evt: any) => {
      'worklet';
      // Snap back to original position (can be enhanced for custom positioning)
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      runOnJS(setIsDragging)(false);
    },
  });

  // Enhanced radial menu items with context awareness
  const radialItems = useMemo(() => {
    const baseItems = [
      {
        id: 'ai',
        icon: '🤖',
        label: 'AI Chat',
        badge: ctx.hasUnreadMessages ? 1 : undefined,
      },
      {
        id: 'sound',
        icon: '🎵',
        label: 'Soundscape',
        active: soundscape?.isActive,
      },
      {
        id: 'quick',
        icon: '⚡',
        label: 'Actions',
      },
      {
        id: 'analytics',
        icon: '📊',
        label: 'Stats',
      },
    ];

    // Add contextual items based on current state
    if (ctx.cognitiveLoad === 'high') {
      baseItems.push({
        id: 'break',
        icon: '🧘',
        label: 'Break',
      });
    }

    if (auraState?.context === 'DeepFocus') {
      baseItems.push({
        id: 'timer',
        icon: '⏱️',
        label: 'Timer',
      });
    }

    return baseItems;
  }, [
    ctx.hasUnreadMessages,
    soundscape?.isActive,
    ctx.cognitiveLoad,
    auraState?.context,
  ]);

  // Enhanced radial item selection
  const handleRadialSelect = useCallback(
    (item: any) => {
      try {
        console.log('[FloatingCommandCenter] handleRadialSelect', item.id);
      } catch {}
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Close radial menu with staggered animation
      setExpanded(false);
      radialExpansion.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
      });

      // Handle selection
      switch (item.id) {
        case 'sound':
          try {
            // Primary action: request orchestrator to open mini player
            ctx.setMiniPlayerActive(true);
          } catch {}
          try {
            console.log(
              '[FloatingCommandCenter] calling ctx.setMiniPlayerActive(true)',
            );
          } catch {}
          try {
            ctx.setMiniPlayerActive(true);
            try {
              console.log(
                '[FloatingCommandCenter] ctx.setMiniPlayerActive completed',
              );
            } catch {}
          } catch (e) {
            try {
              console.log(
                '[FloatingCommandCenter] ctx.setMiniPlayerActive threw',
                e,
              );
            } catch {}
          }
          try {
            // Fallback to ensure UI appears even if orchestrator visibility gating blocks it
            setFallbackMiniVisible(true);
            setTimeout(() => setFallbackMiniVisible(false), 5000);
          } catch {}
          try {
            console.log('[FloatingCommandCenter] opened miniPlayer via radial');
          } catch {}
          try {
            setLastSelection('sound');
            setTimeout(() => setLastSelection(null), 1500);
          } catch {}
          break;
        case 'ai':
          try {
            console.log(
              '[FloatingCommandCenter] clearing unread messages before opening AI',
            );
          } catch {}
          try {
            ctx.setUnreadMessages(false);
            try {
              console.log(
                '[FloatingCommandCenter] ctx.setUnreadMessages completed',
              );
            } catch {}
          } catch (e) {
            try {
              console.log(
                '[FloatingCommandCenter] ctx.setUnreadMessages threw',
                e,
              );
            } catch {}
          }
          try {
            console.log(
              '[FloatingCommandCenter] calling ctx.setShowAIChat(true)',
            );
          } catch {}
          try {
            ctx.setShowAIChat(true);
            try {
              console.log(
                '[FloatingCommandCenter] ctx.setShowAIChat completed',
              );
            } catch {}
          } catch (e) {
            try {
              console.log('[FloatingCommandCenter] ctx.setShowAIChat threw', e);
            } catch {}
          }
          try {
            // Fallback visible flag to force open the chat if orchestrator gating prevents it
            setFallbackAIVisible(true);
            setTimeout(() => setFallbackAIVisible(false), 5000);
          } catch {}
          try {
            console.log('[FloatingCommandCenter] opened aiChat via radial');
          } catch {}
          try {
            setLastSelection('ai');
            setTimeout(() => setLastSelection(null), 1500);
          } catch {}
          break;
        case 'quick':
          setShowQuickActions(true);
          break;
        case 'analytics':
          if (onNavigate) onNavigate('tasks');
          break;
        case 'break':
          // Show break suggestions
          setShowQuickActions(true);
          break;
        case 'timer':
          if (onNavigate) onNavigate('focus');
          break;
        default:
          // Unknown id - log
          try {
            console.log('[FloatingCommandCenter] unknown radial item', item.id);
          } catch {}
          break;
      }
    },
    [ctx, onNavigate, radialExpansion],
  );

  // Animated styles
  const bubbleAnimatedStyle = useAnimatedStyle(() => {
    const currentScale = scale.value * pulseScale.value;
    const glowRadius = interpolate(glowIntensity.value, [0, 1], [0, 20]);

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: currentScale },
        { rotate: `${rotation.value}deg` },
      ],
      opacity: opacity.value,
      shadowRadius: glowRadius,
      shadowOpacity: interpolate(glowIntensity.value, [0, 1], [0.3, 0.8]),
      elevation: interpolate(glowIntensity.value, [0, 1], [8, 16]),
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(radialExpansion.value, [0, 1], [0, 1]),
    };
  });

  const indicatorStyle = useAnimatedStyle(() => {
    return {
      opacity: primaryContent.type === 'miniPlayer' ? 1 : 0,
      transform: [
        { scale: interpolate(pulseScale.value, [1, 1.1], [1, 1.05]) },
      ],
    };
  });

  // Position and visibility
  const position = ctx.positions.fab;
  const visible = ctx.visibility.fab;

  // Debug: log overlay positions when expanded so we can verify where touch targets are placed
  useEffect(() => {
    if (!expanded) return;
    try {
      const itemCount = radialItems.length;
      const r = 90;
      const fabSize = 64;
      const centerX = SCREEN_WIDTH - (position.right + fabSize / 2);
      const centerY = SCREEN_HEIGHT - (position.bottom + fabSize / 2);
      const computed: Array<{ id: string; left: number; top: number }> = [];

      if (itemCount === 1) {
        computed.push({
          id: radialItems[0].id,
          left: centerX,
          top: centerY - r,
        });
      } else if (itemCount <= 4) {
        const angles = [-Math.PI / 2, 0, Math.PI, Math.PI / 2];
        for (let i = 0; i < itemCount; i++) {
          const angle = angles[i];
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          computed.push({
            id: radialItems[i].id,
            left: centerX + x,
            top: centerY + y,
          });
        }
      } else {
        const angleStep = (Math.PI * 2) / itemCount;
        const startAngle = -Math.PI / 2;
        for (let i = 0; i < itemCount; i++) {
          const angle = startAngle + i * angleStep;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          computed.push({
            id: radialItems[i].id,
            left: centerX + x,
            top: centerY + y,
          });
        }
      }
      try {
        console.log('[FloatingCommandCenter] overlay positions', computed);
      } catch {}
    } catch (e) {
      try {
        console.log(
          '[FloatingCommandCenter] overlay positions compute error',
          e,
        );
      } catch {}
    }
  }, [expanded]);

  if (!visible) return null;

  return (
    <>
      {/* Enhanced backdrop with blur */}
      {expanded && (
        <Animated.View
          style={[styles.backdrop, backdropStyle]}
          pointerEvents="auto"
        >
          <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => {
              setExpanded(false);
              radialExpansion.value = withSpring(0);
            }}
          />
        </Animated.View>
      )}

      <Animated.View
        style={[
          styles.container,
          {
            bottom: position.bottom,
            right: position.right,
          },
        ]}
      >
        <PanGestureHandler ref={panRef} onGestureEvent={panGestureHandler}>
          <Animated.View>
            <TapGestureHandler
              ref={tapRef}
              onGestureEvent={tapGestureHandler}
              numberOfTaps={1}
              minPointers={1}
              waitFor={panRef}
            >
              <Animated.View style={[styles.wrapper]}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => {
                    try {
                      console.log(
                        '[FloatingCommandCenter] Touchable onPress',
                        primaryContent.type,
                      );
                    } catch {}
                    handleTapFallback();
                  }}
                >
                  <Animated.View
                    style={[
                      styles.bubble,
                      bubbleAnimatedStyle,
                      {
                        shadowColor: currentTheme.glow,
                        borderColor: `${currentTheme.primary}50`,
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={castGradient(currentTheme.gradient)}
                      style={styles.gradientBubble}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.icon}>{primaryContent.icon}</Text>

                      {/* Soundscape indicator */}
                      <Animated.View
                        style={[styles.indicatorWrap, indicatorStyle]}
                      >
                        <MiniSoundscapeIndicator />
                      </Animated.View>

                      {/* Notification badge */}
                      {primaryContent.badge && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>
                            {primaryContent.badge}
                          </Text>
                        </View>
                      )}
                    </LinearGradient>
                  </Animated.View>
                </TouchableOpacity>
              </Animated.View>
            </TapGestureHandler>
          </Animated.View>
        </PanGestureHandler>

        {/* Enhanced radial menu */}
        <View
          style={[styles.radialWrap, { zIndex: 1205, elevation: 1205 }]}
          pointerEvents={expanded ? 'auto' : 'none'}
        >
          <RadialMenu
            items={radialItems}
            onSelect={handleRadialSelect}
            radius={90}
            expandAnimation={radialExpansion}
            forceVisible={expanded}
          />
        </View>

        {/* Strong top-layer touch overlay to guarantee radial taps are received
            This renders absolute, unanimated touch targets on top of everything
            when the radial menu is expanded. It mirrors the RadialMenu positions.
        */}
        {expanded && (
          <View pointerEvents="box-none" style={styles.globalTouchOverlay}>
            {(() => {
              // Compute positions for overlay targets (duplicate of RadialMenu logic)
              const itemCount = radialItems.length;
              const r = 90; // same radius used by RadialMenu
              const touchSize = 56;
              const fabSize = 64;

              // screen center for FAB
              const centerX = SCREEN_WIDTH - (position.right + fabSize / 2);
              const centerY = SCREEN_HEIGHT - (position.bottom + fabSize / 2);

              const positions: Array<{ x: number; y: number }>[] = [] as any;
              const computed: Array<{ x: number; y: number }> = [];

              if (itemCount === 1) {
                computed.push({ x: 0, y: -r });
              } else if (itemCount <= 4) {
                const angles = [-Math.PI / 2, 0, Math.PI, Math.PI / 2];
                for (let i = 0; i < itemCount; i++) {
                  const angle = angles[i];
                  computed.push({
                    x: Math.cos(angle) * r,
                    y: Math.sin(angle) * r,
                  });
                }
              } else {
                const angleStep = (Math.PI * 2) / itemCount;
                const startAngle = -Math.PI / 2;
                for (let i = 0; i < itemCount; i++) {
                  const angle = startAngle + i * angleStep;
                  computed.push({
                    x: Math.cos(angle) * r,
                    y: Math.sin(angle) * r,
                  });
                }
              }

              return radialItems.map((it, i) => {
                const pos = computed[i];
                if (!pos) return null;
                const left = centerX + pos.x - touchSize / 2;
                const top = centerY + pos.y - touchSize / 2;

                return (
                  <View
                    key={`global-touch-${it.id}`}
                    style={{
                      position: 'absolute',
                      left,
                      top,
                      zIndex: 99999,
                      elevation: 99999,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        try {
                          console.log(
                            '[FloatingCommandCenter] global overlay press',
                            it.id,
                          );
                        } catch {}
                        handleRadialSelect(it);
                      }}
                      style={{
                        width: touchSize,
                        height: touchSize,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
                      activeOpacity={0.8}
                    >
                      {/* transparent tappable area */}
                      <View
                        style={{
                          width: touchSize,
                          height: touchSize,
                          borderRadius: touchSize / 2,
                        }}
                      />
                    </TouchableOpacity>
                  </View>
                );
              });
            })()}
          </View>
        )}
      </Animated.View>

      {/* Modals */}
      {/* Debug toast for last radial selection */}
      {lastSelection && (
        <View style={styles.debugToast} pointerEvents="none">
          <Text style={styles.debugToastText}>Selected: {lastSelection}</Text>
        </View>
      )}
      {/* MiniPlayer modal is intentionally rendered by the orchestrator to
          avoid a circular import (FloatingCommandCenter <-> MiniPlayer). The
          orchestrator consumes ctx.isMiniPlayerActive and renders the
          MiniPlayer as needed. */}

      {/* AI Chat Modal */}
      <FloatingChatBubble
        isVisible={ctx.showAIChat || fallbackAIVisible}
        theme={theme === 'dark' ? 'dark' : 'light'}
        onClose={() => {
          try {
            ctx.setShowAIChat(false);
          } catch {}
          try {
            setFallbackAIVisible(false);
          } catch {}
        }}
      />

      {/* Enhanced Quick Actions Sheet */}
      <Modal
        visible={showQuickActions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowQuickActions(false)}
      >
        <View style={styles.quickActionsOverlay}>
          <TouchableOpacity
            style={styles.quickActionsBackdrop}
            activeOpacity={1}
            onPress={() => setShowQuickActions(false)}
          />
          <BlurView intensity={30} style={styles.quickActionsSheet}>
            <View style={styles.quickActionsHeader}>
              <Text style={styles.quickActionsTitle}>
                {primaryContent.type === 'break'
                  ? 'Take a Break'
                  : 'Quick Actions'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowQuickActions(false)}
                style={styles.closeQuickActions}
              >
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.quickActionsGrid}>
              {primaryContent.type === 'break' ? (
                // Break-specific actions
                <>
                  <TouchableOpacity
                    style={styles.quickActionItem}
                    onPress={() => {
                      setShowQuickActions(false);
                      if (onNavigate) onNavigate('breathing');
                    }}
                  >
                    <Text style={styles.quickActionIcon}>🌬️</Text>
                    <Text style={styles.quickActionLabel}>Breathing</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickActionItem}
                    onPress={() => {
                      setShowQuickActions(false);
                      if (onNavigate) onNavigate('meditation');
                    }}
                  >
                    <Text style={styles.quickActionIcon}>🧘</Text>
                    <Text style={styles.quickActionLabel}>Meditation</Text>
                  </TouchableOpacity>
                </>
              ) : (
                // Regular quick actions
                <>
                  <TouchableOpacity
                    style={styles.quickActionItem}
                    onPress={() => {
                      setShowQuickActions(false);
                      if (onNavigate) onNavigate('flashcards');
                    }}
                  >
                    <Text style={styles.quickActionIcon}>📚</Text>
                    <Text style={styles.quickActionLabel}>Review Cards</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickActionItem}
                    onPress={() => {
                      setShowQuickActions(false);
                      if (onNavigate) onNavigate('focus');
                    }}
                  >
                    <Text style={styles.quickActionIcon}>⏱️</Text>
                    <Text style={styles.quickActionLabel}>Focus Session</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickActionItem}
                    onPress={() => {
                      setShowQuickActions(false);
                      if (onNavigate) onNavigate('speed-reading');
                    }}
                  >
                    <Text style={styles.quickActionIcon}>📖</Text>
                    <Text style={styles.quickActionLabel}>Speed Read</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickActionItem}
                    onPress={() => {
                      setShowQuickActions(false);
                      if (onNavigate) onNavigate('tasks');
                    }}
                  >
                    <Text style={styles.quickActionIcon}>✅</Text>
                    <Text style={styles.quickActionLabel}>View Tasks</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </BlurView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1200,
  },
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    // Enhanced shadow for depth
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  gradientBubble: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 28,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  indicatorWrap: {
    position: 'absolute',
    right: -4,
    bottom: -4,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  radialWrap: {
    position: 'absolute',
    bottom: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1190,
  },
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
  // Quick Actions Sheet Styles
  quickActionsOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  quickActionsBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  quickActionsSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    minHeight: 320,
  },
  quickActionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  quickActionsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeQuickActions: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionItem: {
    width: '48%',
    alignItems: 'center',
    padding: 20,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  debugToast: {
    position: 'absolute',
    bottom: 160,
    left: '50%',
    transform: [{ translateX: -80 }],
    width: 160,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  debugToastText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  globalTouchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99998,
    elevation: 99998,
    // transparent container for touchables
    backgroundColor: 'transparent',
  },
});

export default FloatingCommandCenter;
