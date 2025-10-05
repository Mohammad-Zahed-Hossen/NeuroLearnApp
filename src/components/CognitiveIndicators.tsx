import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { colors, spacing, typography, borderRadius, ThemeType } from '../theme/colors';

interface CognitiveLoadIndicatorProps {
  theme: ThemeType;
  load: number;
  showBreakSuggestion?: boolean;
  onBreakPress?: () => void;
  variant?: 'bar' | 'badge' | 'banner' | 'compact';
  style?: any;
  size?: 'small' | 'medium' | 'large';
}

export const CognitiveLoadIndicator: React.FC<CognitiveLoadIndicatorProps> = ({
  theme,
  load,
  showBreakSuggestion = false,
  onBreakPress,
  variant = 'bar',
  style,
}) => {
  const themeColors = colors[theme];

  const getLoadColor = (load: number) => {
    if (load >= 0.8) return themeColors.error;
    if (load >= 0.6) return themeColors.warning;
    if (load >= 0.4) return themeColors.info;
    return themeColors.success;
  };

  const getLoadLabel = (load: number) => {
    if (load >= 0.8) return 'High Load';
    if (load >= 0.6) return 'Medium Load';
    if (load >= 0.4) return 'Light Load';
    return 'Optimal';
  };

  const loadColor = getLoadColor(load);
  const loadLabel = getLoadLabel(load);

  if (variant === 'bar') {
    return (
      <View style={[styles.barContainer, { backgroundColor: themeColors.glass }, style]}>
        <View
          style={[
            styles.loadBar,
            {
              backgroundColor: loadColor,
              width: `${load * 100}%`,
            },
          ]}
        />
        {showBreakSuggestion && (
          <View style={[styles.breakOverlay, { backgroundColor: themeColors.warning + '40' }]}>
            <TouchableOpacity
              style={styles.breakButton}
              onPress={onBreakPress}
              activeOpacity={0.7}
              accessibilityLabel="Take a break suggestion"
            >
              <Text style={[styles.breakText, { color: themeColors.warning }]}>🧘 Take Break</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  if (variant === 'badge') {
    return (
      <View style={[styles.badgeContainer, { backgroundColor: loadColor + '20' }, style]}>
        <Text style={[styles.badgeText, { color: loadColor }]}>
          {loadLabel}
        </Text>
        {showBreakSuggestion && (
          <View style={[styles.breakDot, { backgroundColor: themeColors.warning }]} />
        )}
      </View>
    );
  }

  if (variant === 'banner') {
    return (
      <View style={[styles.bannerContainer, { backgroundColor: loadColor + '15' }, style]}>
        <Text style={[styles.bannerIcon, { color: loadColor }]}>
          {load >= 0.8 ? '🧠' : load >= 0.6 ? '⚠️' : '✅'}
        </Text>
        <View style={styles.bannerContent}>
          <Text style={[styles.bannerTitle, { color: loadColor }]}>
            {loadLabel}
          </Text>
          <Text style={[styles.bannerSubtitle, { color: themeColors.textSecondary }]}>
            {load >= 0.8
              ? 'Consider taking a break or simplifying tasks'
              : load >= 0.6
              ? 'Monitor your focus levels'
              : 'Optimal cognitive state maintained'
            }
          </Text>
        </View>
        {showBreakSuggestion && onBreakPress && (
          <TouchableOpacity
            style={[styles.bannerButton, { backgroundColor: themeColors.warning }]}
            onPress={onBreakPress}
            activeOpacity={0.8}
            accessibilityLabel="Take a break to reduce cognitive load"
          >
            <Text style={[styles.bannerButtonText, { color: themeColors.text }]}>Take Break</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (variant === 'compact') {
    return (
      <View style={[styles.compactContainer, style]}>
        <View style={[styles.compactBar, { backgroundColor: loadColor }]} />
        {showBreakSuggestion && (
          <View style={[styles.compactBreak, { backgroundColor: themeColors.warning }]} />
        )}
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  // Bar variant
  barContainer: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
    position: 'relative',
  },
  loadBar: {
    height: '100%',
    borderRadius: 1.5,
  },
  breakOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breakButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  breakText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Badge variant
  badgeContainer: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  breakDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: spacing.xs,
  },

  // Banner variant
  bannerContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    ...typography.body,
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 2,
  },
  bannerSubtitle: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 16,
  },
  bannerButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  bannerButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactBar: {
    height: 4,
    width: 20,
    borderRadius: 2,
  },
  compactBreak: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginLeft: spacing.xs,
  },
});
