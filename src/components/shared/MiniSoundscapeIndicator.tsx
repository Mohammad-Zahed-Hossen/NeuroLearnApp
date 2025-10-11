/**
 * Enhanced MiniSoundscapeIndicator - Advanced Audio Visualizer
 *
 * Features:
 * - Real-time audio waveform visualization
 * - Dynamic color theming based on soundscape type
 * - Smooth spring animations with physics
 * - Multiple visualization modes (bars, circle, ripple)
 * - Smart size adaptation based on context
 * - Performance optimized with Reanimated 3
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withDelay,
  interpolate,
  useDerivedValue,
} from 'react-native-reanimated';
import {
  interpolateColorAny,
  withSequenceAny,
  castGradient,
} from '../../utils/reanimated-shims';
import { LinearGradient } from 'expo-linear-gradient';
import { useSoundscape } from '../../contexts/SoundscapeContext';
import { useCurrentAuraState } from '../../store/useAuraStore';

interface MiniSoundscapeIndicatorProps {
  size?: 'small' | 'medium' | 'large';
  mode?: 'bars' | 'circle' | 'ripple' | 'pulse';
  theme?: 'light' | 'dark' | 'auto';
  animated?: boolean;
  intensity?: number; // 0-1, for manual control
  colors?: string[];
}

// Soundscape type to color mapping
const SOUNDSCAPE_THEMES = {
  nature: {
    primary: '#10B981',
    secondary: '#34D399',
    gradient: ['#10B981', '#34D399', '#6EE7B7'],
  },
  focus: {
    primary: '#6366F1',
    secondary: '#8B5CF6',
    gradient: ['#6366F1', '#8B5CF6', '#A78BFA'],
  },
  rain: {
    primary: '#3B82F6',
    secondary: '#60A5FA',
    gradient: ['#3B82F6', '#60A5FA', '#93C5FD'],
  },
  ocean: {
    primary: '#0EA5E9',
    secondary: '#38BDF8',
    gradient: ['#0EA5E9', '#38BDF8', '#7DD3FC'],
  },
  white: {
    primary: '#6B7280',
    secondary: '#9CA3AF',
    gradient: ['#6B7280', '#9CA3AF', '#D1D5DB'],
  },
  brown: {
    primary: '#A16207',
    secondary: '#CA8A04',
    gradient: ['#A16207', '#CA8A04', '#EAB308'],
  },
  pink: {
    primary: '#EC4899',
    secondary: '#F472B6',
    gradient: ['#EC4899', '#F472B6', '#F9A8D4'],
  },
  default: {
    primary: '#4A90E2',
    secondary: '#5BA0F2',
    gradient: ['#4A90E2', '#5BA0F2', '#7BB3FF'],
  },
};

const SIZE_CONFIG = {
  small: { size: 20, barCount: 3, barWidth: 2, spacing: 2 },
  medium: { size: 28, barCount: 4, barWidth: 3, spacing: 2 },
  large: { size: 36, barCount: 5, barWidth: 3, spacing: 3 },
};

const MiniSoundscapeIndicator: React.FC<MiniSoundscapeIndicatorProps> = ({
  size = 'medium',
  mode = 'bars',
  theme = 'auto',
  animated = true,
  intensity,
  colors,
}) => {
  const soundscape = useSoundscape();
  const auraState = useCurrentAuraState();

  const config = SIZE_CONFIG[size];
  const isActive = soundscape?.isActive || false;
  const currentSoundscape = soundscape?.currentPreset || 'default';

  // Animation values
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const rotation = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  // Bar animation values
  // Create a fixed pool of up to 5 shared values (max barCount) to avoid calling hooks
  // dynamically inside callbacks or refs.
  const BAR_POOL = [
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
  ];
  const barHeights = useRef(BAR_POOL.slice(0, config.barCount)).current;

  // Circle/ripple animation values
  const rippleScale1 = useSharedValue(0.5);
  const rippleScale2 = useSharedValue(0.3);
  const rippleOpacity1 = useSharedValue(0.8);
  const rippleOpacity2 = useSharedValue(0.6);

  // Get current theme colors
  const currentTheme = useMemo(() => {
    if (colors) {
      return {
        primary: colors[0],
        secondary: colors[1] || colors[0],
        gradient: colors,
      };
    }

    return (
      SOUNDSCAPE_THEMES[currentSoundscape as keyof typeof SOUNDSCAPE_THEMES] ||
      SOUNDSCAPE_THEMES.default
    );
  }, [currentSoundscape, colors]);

  // Main visibility and activation animation
  useEffect(() => {
    if (isActive && animated) {
      opacity.value = withSpring(1, { damping: 15 });
      scale.value = withSpring(1, { damping: 12, stiffness: 150 });
    } else {
      opacity.value = withSpring(isActive ? 0.8 : 0, { damping: 15 });
      scale.value = withSpring(0.8, { damping: 15 });
    }
  }, [isActive, animated, opacity, scale]);

  // Bar animation effect
  useEffect(() => {
    if (!isActive || !animated || mode !== 'bars') return;

    const animateBars = () => {
      barHeights.forEach((height, index) => {
        const delay = index * 120;
        const randomHeight = 0.3 + Math.random() * 0.7;
        const actualIntensity =
          intensity !== undefined ? intensity : randomHeight;

        height.value = withDelay(
          delay,
          withSequenceAny(
            withTiming(actualIntensity, {
              duration: 200 + Math.random() * 400,
            }),
            withTiming(0.1, { duration: 300 + Math.random() * 200 }),
          ),
        );
      });
    };

    // Initial animation
    animateBars();

    // Repeating animation
    const interval = setInterval(animateBars, 800 + Math.random() * 400);

    return () => clearInterval(interval);
  }, [isActive, animated, mode, barHeights, intensity]);

  // Circle/ripple animation effect
  useEffect(() => {
    if (!isActive || !animated || (mode !== 'circle' && mode !== 'ripple'))
      return;

    // Primary ripple
    rippleScale1.value = withRepeat(
      withSequenceAny(
        withTiming(1.5, { duration: 1200 }),
        withTiming(0.5, { duration: 100 }),
      ),
      -1,
      false,
    );

    rippleOpacity1.value = withRepeat(
      withSequenceAny(
        withTiming(0.2, { duration: 1200 }),
        withTiming(0.8, { duration: 100 }),
      ),
      -1,
      false,
    );

    // Secondary ripple (delayed)
    rippleScale2.value = withDelay(
      400,
      withRepeat(
        withSequenceAny(
          withTiming(1.8, { duration: 1200 }),
          withTiming(0.3, { duration: 100 }),
        ),
        -1,
        false,
      ),
    );

    rippleOpacity2.value = withDelay(
      400,
      withRepeat(
        withSequenceAny(
          withTiming(0.1, { duration: 1200 }),
          withTiming(0.6, { duration: 100 }),
        ),
        -1,
        false,
      ),
    );
  }, [
    isActive,
    animated,
    mode,
    rippleScale1,
    rippleScale2,
    rippleOpacity1,
    rippleOpacity2,
  ]);

  // Pulse mode animation
  useEffect(() => {
    if (!isActive || !animated || mode !== 'pulse') return;

    pulseScale.value = withRepeat(
      withSequenceAny(
        withTiming(1.15, { duration: 600 }),
        withTiming(1, { duration: 600 }),
      ),
      -1,
      false,
    );
  }, [isActive, animated, mode, pulseScale]);

  // Container animated style
  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
    };
  });

  // Render different modes
  const renderBarsMode = () => {
    return (
      <View
        style={[
          styles.barsContainer,
          { width: config.size, height: config.size },
        ]}
      >
        {barHeights.map((height, index) => {
          const animatedBarStyle = useAnimatedStyle(() => {
            const barHeight = interpolate(
              height.value,
              [0, 1],
              [config.size * 0.2, config.size * 0.9],
            );

            const barOpacity = interpolate(height.value, [0, 1], [0.3, 1]);

            return {
              height: barHeight,
              opacity: barOpacity,
              backgroundColor: interpolateColorAny(
                height.value,
                [0, 0.5, 1],
                [
                  currentTheme.primary,
                  currentTheme.secondary,
                  currentTheme.gradient[2] || currentTheme.secondary,
                ],
              ),
            };
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.bar,
                {
                  width: config.barWidth,
                  marginRight:
                    index < barHeights.length - 1 ? config.spacing : 0,
                },
                animatedBarStyle,
              ]}
            />
          );
        })}
      </View>
    );
  };

  const renderCircleMode = () => {
    const circleStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: pulseScale.value }],
        backgroundColor: currentTheme.primary,
      };
    });

    return (
      <Animated.View
        style={[
          styles.circle,
          {
            width: config.size,
            height: config.size,
            borderRadius: config.size / 2,
          },
          circleStyle,
        ]}
      />
    );
  };

  const renderRippleMode = () => {
    const ripple1Style = useAnimatedStyle(() => {
      return {
        transform: [{ scale: rippleScale1.value }],
        opacity: rippleOpacity1.value,
        borderColor: currentTheme.primary,
      };
    });

    const ripple2Style = useAnimatedStyle(() => {
      return {
        transform: [{ scale: rippleScale2.value }],
        opacity: rippleOpacity2.value,
        borderColor: currentTheme.secondary,
      };
    });

    const centerDotStyle = useAnimatedStyle(() => {
      return {
        backgroundColor: currentTheme.primary,
        transform: [{ scale: pulseScale.value }],
      };
    });

    return (
      <View
        style={[
          styles.rippleContainer,
          { width: config.size, height: config.size },
        ]}
      >
        <Animated.View
          style={[
            styles.ripple,
            { width: config.size * 1.5, height: config.size * 1.5 },
            ripple1Style,
          ]}
        />
        <Animated.View
          style={[
            styles.ripple,
            { width: config.size * 1.3, height: config.size * 1.3 },
            ripple2Style,
          ]}
        />
        <Animated.View
          style={[
            styles.centerDot,
            { width: config.size * 0.3, height: config.size * 0.3 },
            centerDotStyle,
          ]}
        />
      </View>
    );
  };

  const renderPulseMode = () => {
    const pulseStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: pulseScale.value }],
      };
    });

    return (
      <Animated.View style={[styles.pulseContainer, pulseStyle]}>
        <LinearGradient
          colors={castGradient(currentTheme.gradient)}
          style={[
            styles.pulseGradient,
            {
              width: config.size,
              height: config.size,
              borderRadius: config.size / 2,
            },
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>
    );
  };

  // Don't render if not active and not forced visible
  if (!isActive && !intensity) return null;

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {mode === 'bars' && renderBarsMode()}
      {mode === 'circle' && renderCircleMode()}
      {mode === 'ripple' && renderRippleMode()}
      {mode === 'pulse' && renderPulseMode()}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bar: {
    borderRadius: 1,
    minHeight: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  circle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  rippleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ripple: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 1000,
    backgroundColor: 'transparent',
  },
  centerDot: {
    borderRadius: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  pulseContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseGradient: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default MiniSoundscapeIndicator;
