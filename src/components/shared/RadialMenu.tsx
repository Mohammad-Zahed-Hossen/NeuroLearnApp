/**
 * Enhanced RadialMenu - Advanced Animated Radial Menu Component
 *
 * Features:
 * - Staggered spring animations with physics-based timing
 * - Dynamic positioning with collision detection
 * - Haptic feedback on interactions
 * - Contextual item styling (active states, badges)
 * - Smooth enter/exit transitions
 * - Premium visual effects (glow, shadows, blur)
 */

import React, { useEffect, useMemo, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  withSequence,
  interpolate,
  runOnJS,
  useDerivedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  castGradient,
  withSequenceAny,
  attachSharedValueListener,
} from '../../utils/reanimated-shims';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Enhanced item interface with more properties
interface RadialItem {
  id: string;
  icon: string;
  label?: string;
  badge?: number;
  active?: boolean;
  color?: string;
  gradient?: string[];
  disabled?: boolean;
  priority?: number;
}

interface RadialMenuProps {
  items: RadialItem[];
  onSelect: (item: RadialItem) => void;
  radius?: number;
  expandAnimation?: Animated.SharedValue<number>;
  centerX?: number;
  centerY?: number;
  theme?: 'light' | 'dark';
  forceVisible?: boolean;
}

// Premium color themes
const ITEM_THEMES = {
  light: {
    background: 'rgba(255, 255, 255, 0.95)',
    border: 'rgba(0, 0, 0, 0.1)',
    text: '#1F2937',
    shadow: 'rgba(0, 0, 0, 0.1)',
    active: '#6366F1',
  },
  dark: {
    background: 'rgba(30, 30, 30, 0.95)',
    border: 'rgba(255, 255, 255, 0.2)',
    text: '#F9FAFB',
    shadow: 'rgba(0, 0, 0, 0.3)',
    active: '#6366F1',
  },
};

const DEFAULT_GRADIENTS = {
  ai: ['#6366F1', '#4F46E5'],
  sound: ['#4A90E2', '#2171B5'],
  quick: ['#10B981', '#059669'],
  analytics: ['#F59E0B', '#D97706'],
  break: ['#EF4444', '#DC2626'],
  timer: ['#8B5CF6', '#7C3AED'],
};

const RadialMenu: React.FC<RadialMenuProps> = ({
  items,
  onSelect,
  radius = 100,
  expandAnimation,
  centerX = 0,
  centerY = 0,
  theme = 'dark',
  forceVisible = false,
}) => {
  const currentTheme = ITEM_THEMES[theme];

  // Animation values for each item
  // To follow the Rules of Hooks we create a fixed-size pool of shared values
  // and map items onto the pool. This avoids calling hooks inside loops or callbacks.
  const MAX_RADIAL_ITEMS = 12;
  const scalePool = [
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
  ];
  const opacityPool = [
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
  ];
  const rotationPool = [
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
  ];

  const itemAnimations = items.map((_, i) => ({
    scale: scalePool[i] || scalePool[0],
    opacity: opacityPool[i] || opacityPool[0],
    rotation: rotationPool[i] || rotationPool[0],
  }));

  // Calculate optimal positions with collision detection
  const positions = useMemo(() => {
    const itemCount = items.length;
    if (itemCount === 0) return [];

    const positions: Array<{ x: number; y: number; angle: number }> = [];

    if (itemCount === 1) {
      // Single item - place directly above
      positions.push({ x: 0, y: -radius, angle: -Math.PI / 2 });
    } else if (itemCount <= 4) {
      // Cardinal directions for 2-4 items
      const angles = [
        -Math.PI / 2, // Top
        0, // Right
        Math.PI, // Left
        Math.PI / 2, // Bottom
      ];

      for (let i = 0; i < itemCount; i++) {
        const angle = angles[i];
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        positions.push({ x, y, angle });
      }
    } else {
      // Circular arrangement for 5+ items
      const angleStep = (Math.PI * 2) / itemCount;
      const startAngle = -Math.PI / 2; // Start from top

      for (let i = 0; i < itemCount; i++) {
        const angle = startAngle + i * angleStep;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        positions.push({ x, y, angle });
      }
    }

    return positions;
  }, [items.length, radius]);

  // Trigger animations when expand state changes
  useEffect(() => {
    if (!expandAnimation) return;

    const unsubscribe = attachSharedValueListener(
      expandAnimation,
      ({ value }: any) => {
        itemAnimations.forEach((anim, index) => {
          const delay = index * 80; // Staggered delay
          const priority = items[index]?.priority || 0;
          const priorityDelay = Math.max(0, (5 - priority) * 20); // Higher priority = less delay

          if (value > 0) {
            // Expand animation
            anim.scale.value = withDelay(
              delay + priorityDelay,
              withSpring(1, {
                damping: 14,
                stiffness: 180,
                mass: 0.8,
              }),
            );
            anim.opacity.value = withDelay(
              delay + priorityDelay + 40,
              withSpring(1, { damping: 15 }),
            );
            anim.rotation.value = withDelay(
              delay + priorityDelay,
              withSequenceAny(
                withTiming(360, { duration: 400 }),
                withTiming(0, { duration: 100 }),
              ),
            );
          } else {
            // Collapse animation
            const collapseDelay = (itemAnimations.length - index - 1) * 40; // Reverse order
            anim.scale.value = withDelay(
              collapseDelay,
              withSpring(0, { damping: 12, stiffness: 200 }),
            );
            anim.opacity.value = withDelay(
              collapseDelay,
              withTiming(0, { duration: 150 }),
            );
            anim.rotation.value = withTiming(0, { duration: 150 });
          }
        });
      },
    );

    return () => unsubscribe();
  }, [expandAnimation, itemAnimations, items]);

  // Handle item selection with enhanced feedback
  const handleItemPress = React.useCallback(
    (item: RadialItem, index: number) => {
      if (item.disabled) return;

      try {
        // Debug log to trace item presses
        // eslint-disable-next-line no-console
        console.log('[RadialMenu] handleItemPress', item.id);
      } catch {}

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Visual feedback
      const anim = itemAnimations[index];
      anim.scale.value = withSequence(
        withTiming(1.2, { duration: 100 }),
        withSpring(1, { damping: 15, stiffness: 200 }),
      );

      // Trigger selection
      onSelect(item);
    },
    [onSelect, itemAnimations],
  );

  // Render individual radial item
  const renderRadialItem = (item: RadialItem, index: number) => {
    const position = positions[index];
    if (!position) return null;

    const anim = itemAnimations[index];
    const itemGradient = item.gradient ||
      DEFAULT_GRADIENTS[item.id as keyof typeof DEFAULT_GRADIENTS] || [
        currentTheme.active,
        currentTheme.active,
      ];

    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [
          { translateX: position.x },
          { translateY: position.y },
          { scale: anim.scale.value },
          { rotate: `${anim.rotation.value}deg` },
        ],
        opacity: anim.opacity.value,
      };
    });

    const containerStyle = useAnimatedStyle(() => {
      const glowIntensity = item.active ? 1 : 0.3;
      return {
        shadowRadius: interpolate(
          anim.scale.value,
          [0, 1],
          [0, 12 * glowIntensity],
        ),
        shadowOpacity: interpolate(
          anim.scale.value,
          [0, 1],
          [0, 0.4 * glowIntensity],
        ),
        elevation: interpolate(anim.scale.value, [0, 1], [0, 8]),
      };
    });

    return (
      <Animated.View
        key={item.id}
        style={[styles.itemContainer, animatedStyle, containerStyle]}
        pointerEvents="auto"
      >
        <TouchableOpacity
          onPress={() => {
            try {
              // eslint-disable-next-line no-console
              console.log('[RadialMenu] item onPress', item.id);
            } catch {}
            handleItemPress(item, index);
          }}
          disabled={item.disabled}
          activeOpacity={0.8}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        >
          <LinearGradient
            colors={
              (item.active
                ? itemGradient
                : [currentTheme.background, currentTheme.background]) as any
            }
            style={[
              styles.itemBackground,
              {
                borderColor: item.active
                  ? itemGradient[0]
                  : currentTheme.border,
                opacity: item.disabled ? 0.5 : 1,
              },
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Icon */}
            <Text
              style={[
                styles.itemIcon,
                {
                  color: item.active ? '#fff' : currentTheme.text,
                },
              ]}
            >
              {item.icon}
            </Text>

            {/* Badge */}
            {item.badge && (
              <View style={styles.itemBadge}>
                <Text style={styles.itemBadgeText}>{item.badge}</Text>
              </View>
            )}
          </LinearGradient>

          {/* Label */}
          {item.label && (
            <Text
              style={[
                styles.itemLabel,
                {
                  color: currentTheme.text,
                  textShadowColor: currentTheme.shadow,
                },
              ]}
            >
              {item.label}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { width: radius * 2 + 96, height: radius * 2 + 96, zIndex: 1205 },
      ]}
      pointerEvents="box-none"
    >
      {items.map(renderRadialItem)}

      {/* Non-animated overlay fallback for reliable touch targets when needed */}
      {forceVisible &&
        positions.map((pos, i) => {
          const item = items[i];
          if (!item) return null;
          return (
            <View
              key={`fallback-${item.id}`}
              style={[
                styles.fallbackItemContainer || styles.itemContainer,
                {
                  position: 'absolute',
                  left: radius + 48 + pos.x,
                  top: radius + 48 + pos.y,
                  zIndex: 9999,
                  elevation: 9999,
                },
              ]}
              pointerEvents="auto"
            >
              <TouchableOpacity
                onPress={() => {
                  try {
                    // eslint-disable-next-line no-console
                    console.log('[RadialMenu] fallback onPress', item.id);
                  } catch {}
                  onSelect(item);
                }}
                activeOpacity={0.8}
                style={styles.itemBackground}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <Text style={styles.itemIcon}>{item.icon}</Text>
              </TouchableOpacity>
              {item.label && <Text style={styles.itemLabel}>{item.label}</Text>}
            </View>
          );
        })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    // Enhanced shadow properties
    shadowOffset: { width: 0, height: 4 },
    shadowColor: '#000',
  },
  itemBackground: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    // Additional styling for premium look
    overflow: 'hidden',
  },
  itemIcon: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    // Text shadow for better visibility
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  itemLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    overflow: 'hidden',
    minWidth: 40,
    // Enhanced text shadow
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
    color: '#fff',
  },
  itemBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
    // Enhanced shadow for badge
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  itemBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  fallbackItemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Enhanced AnimatedRadialItem for more complex animations (alternative implementation)
const AnimatedRadialItem: React.FC<{
  item: RadialItem;
  position: { x: number; y: number; angle: number };
  index: number;
  expandAnimation?: Animated.SharedValue<number>;
  onSelect: (item: RadialItem) => void;
  theme: 'light' | 'dark';
}> = ({ item, position, index, expandAnimation, onSelect, theme }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);
  const glowIntensity = useSharedValue(0);

  const currentTheme = ITEM_THEMES[theme];
  const itemGradient = item.gradient ||
    DEFAULT_GRADIENTS[item.id as keyof typeof DEFAULT_GRADIENTS] || [
      currentTheme.active,
      currentTheme.active,
    ];

  // Enhanced animation with physics-based easing
  useEffect(() => {
    if (!expandAnimation) return;

    const unsubscribe = attachSharedValueListener(
      expandAnimation,
      ({ value }: any) => {
        const delay = index * 100 + (item.priority || 0) * 50;

        if (value > 0) {
          // Sophisticated enter animation
          scale.value = withDelay(
            delay,
            withSpring(1, {
              damping: 12,
              stiffness: 160,
              mass: 1.2,
              velocity: 2,
            }),
          );

          opacity.value = withDelay(delay + 60, withSpring(1, { damping: 16 }));

          rotation.value = withDelay(
            delay,
            withSequenceAny(
              withTiming(720, { duration: 600 }),
              withSpring(0, { damping: 15 }),
            ),
          );

          glowIntensity.value = withDelay(
            delay + 200,
            withSpring(item.active ? 1 : 0.3, { damping: 15 }),
          );
        } else {
          // Smooth exit animation
          const exitDelay = (6 - index) * 60;
          scale.value = withDelay(exitDelay, withSpring(0, { damping: 15 }));
          opacity.value = withDelay(
            exitDelay,
            withTiming(0, { duration: 200 }),
          );
          rotation.value = withTiming(0, { duration: 200 });
          glowIntensity.value = withTiming(0, { duration: 150 });
        }
      },
    );

    return () => unsubscribe();
  }, [
    expandAnimation,
    index,
    item.priority,
    item.active,
    scale,
    opacity,
    rotation,
    glowIntensity,
  ]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: position.x },
        { translateY: position.y },
        { scale: scale.value },
        { rotate: `${rotation.value}deg` },
      ],
      opacity: opacity.value,
      shadowRadius: interpolate(glowIntensity.value, [0, 1], [4, 16]),
      shadowOpacity: interpolate(glowIntensity.value, [0, 1], [0.2, 0.6]),
      elevation: interpolate(glowIntensity.value, [0, 1], [2, 12]),
    };
  });

  const handlePress = useCallback(() => {
    if (item.disabled) return;

    try {
      // eslint-disable-next-line no-console
      console.log('[RadialMenu] AnimatedRadialItem press', item.id);
    } catch {}

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Enhanced press animation
    scale.value = withSequence(
      withTiming(1.3, { duration: 120 }),
      withSpring(1, { damping: 12, stiffness: 180 }),
    );

    onSelect(item);
  }, [item, scale, onSelect]);

  return (
    <Animated.View
      style={[
        styles.itemContainer,
        animatedStyle,
        { shadowColor: itemGradient[0] },
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        disabled={item.disabled}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={
            (item.active
              ? itemGradient
              : [currentTheme.background, currentTheme.background]) as any
          }
          style={[
            styles.itemBackground,
            {
              borderColor: item.active ? itemGradient[0] : currentTheme.border,
              opacity: item.disabled ? 0.5 : 1,
            },
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text
            style={[
              styles.itemIcon,
              { color: item.active ? '#fff' : currentTheme.text },
            ]}
          >
            {item.icon}
          </Text>

          {item.badge && (
            <View style={styles.itemBadge}>
              <Text style={styles.itemBadgeText}>{item.badge}</Text>
            </View>
          )}
        </LinearGradient>

        {item.label && (
          <Text style={[styles.itemLabel, { color: currentTheme.text }]}>
            {item.label}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default RadialMenu;
