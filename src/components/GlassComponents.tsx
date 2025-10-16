import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import GradientFallback from './shared/GradientFallback';
import {
  colors,
  spacing,
  borderRadius,
  shadows,
  typography,
} from '../theme/colors';
import { ThemeType } from '../theme/colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: any;
  theme: ThemeType;
  onPress?: () => void;
  gradient?: boolean;
  variant?: 'card' | 'modal';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  theme,
  onPress,
  gradient = false,
  variant = 'card',
}) => {
  const themeColors = colors[theme];

  const CardComponent = onPress ? TouchableOpacity : View;

  // Get glass properties based on variant
  const getGlassProperties = () => {
    if (variant === 'modal') {
      // Use higher opacity for modals to reduce transparency
      const modalBackground =
        theme === 'dark'
          ? 'rgba(17, 24, 39, 0.95)'
          : 'rgba(255, 255, 255, 0.95)';
      const modalBorder =
        theme === 'dark'
          ? 'rgba(14, 165, 233, 0.25)'
          : 'rgba(3, 105, 161, 0.20)';
      return {
        backgroundColor: modalBackground,
        borderColor: modalBorder,
        shadow: shadows.lg, // Stronger shadow for modals
      };
    }
    return {
      backgroundColor: themeColors.glass,
      borderColor: themeColors.glassBorder,
      shadow: shadows.md,
    };
  };

  const glassProps = getGlassProperties();

  if (gradient) {
    return (
      <CardComponent onPress={onPress} activeOpacity={0.8}>
        <GradientFallback
          colors={[themeColors.glass, themeColors.surfaceLight]}
          style={[styles.card, { borderColor: themeColors.glassBorder }, style]}
        >
          {children}
        </GradientFallback>
      </CardComponent>
    );
  }

  return (
    <CardComponent
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.card,
        {
          backgroundColor: glassProps.backgroundColor,
          borderColor: glassProps.borderColor,
        },
        glassProps.shadow,
        style,
      ]}
    >
      {children}
    </CardComponent>
  );
};
interface ButtonProps {
  title: string | React.ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  theme: ThemeType;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: any;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  theme,
  disabled = false,
  icon,
  style,
}) => {
  const themeColors = colors[theme];

  const getButtonStyle = () => {
    const baseStyle = {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: borderRadius.md,
      ...shadows.sm,
    };

    const sizeStyles = {
      small: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
      medium: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
      large: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
    };

    const variantStyles = {
      primary: {
        backgroundColor: themeColors.primary,
      },
      secondary: {
        backgroundColor: themeColors.secondary,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: themeColors.primary,
      },
      ghost: {
        backgroundColor: themeColors.glass,
      },
    };

    return [
      baseStyle,
      sizeStyles[size],
      variantStyles[variant],
      disabled && { opacity: 0.5 },
    ];
  };

  const getTextStyle = () => {
    const baseTextStyle = {
      fontWeight: '600' as const,
      fontSize: size === 'small' ? 14 : size === 'large' ? 18 : 16,
    };

    const variantTextStyles = {
      primary: { color: '#FFFFFF' },
      secondary: { color: '#FFFFFF' },
      outline: { color: themeColors.primary },
      ghost: { color: themeColors.text },
    };

    return [baseTextStyle, variantTextStyles[variant]];
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[getButtonStyle(), style]}
    >
      {icon && <View style={{ marginRight: spacing.sm }}>{icon}</View>}
      <Text style={getTextStyle()}>{title}</Text>
    </TouchableOpacity>
  );
};

interface TimerDisplayProps {
  timeLeft: number;
  totalTime: number;
  theme: ThemeType;
  size?: number;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  timeLeft,
  totalTime,
  theme,
  size = 200,
}) => {
  const themeColors = colors[theme];
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <View style={[styles.timerContainer, { width: size, height: size }]}>
      {/* SVG Circle Progress would go here - simplified for now */}
      <View
        style={[
          styles.timerCircle,
          {
            width: size - 20,
            height: size - 20,
            borderColor: themeColors.primary,
            borderWidth: 8,
          },
        ]}
      >
        <Text style={[styles.timerText, { color: themeColors.text }]}>
          {formatTime(timeLeft)}
        </Text>
      </View>
    </View>
  );
};

interface ScreenContainerProps {
  children: React.ReactNode;
  theme: ThemeType;
  style?: any;
  gradient?: boolean;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  theme,
  gradient = true,
}) => {
  const themeColors = colors[theme];

  if (gradient) {
    return (
      <GradientFallback
        colors={[themeColors.background, themeColors.surface]}
        style={styles.container}
      >
        {children}
      </GradientFallback>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
  },
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerCircle: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  timerText: {
    ...typography.h1,
    fontSize: 36,
    fontWeight: 'bold',
  },
});
