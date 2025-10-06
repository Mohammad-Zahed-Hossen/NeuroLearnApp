import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { GlassCard } from '../GlassComponents';
import { ThemeType, colors, typography, spacing, borderRadius } from '../../theme/colors';
import useAuraStore from '../../store/useAuraStore';

// --- ASSUMED AURA 2.0 TYPES ---
interface CapacityForecast {
  mentalClarityScore: number; // 0-1
  optimalWindow: string; // e.g., '14:00-16:00'
  biologicalAlignment: number; // 0-1
  forecastSummary: string; // e.g., 'Optimal Focus predicted in 90 min'
  environmentalOptimality: number; // 0-1
}
// --- Placeholder Components ---
const ProgressRing: React.FC<{ percentage: number; color: string; label: string }> = ({ percentage, color, label }) => {
  const size = 60;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = percentage * circumference;

  return (
    <View style={styles.progressRingContainer}>
        {/* Mock SVG or Skia for the ring visualization */}
        <View style={[styles.progressRingMock, { width: size, height: size, borderRadius: size/2, borderColor: color, borderWidth: strokeWidth/2, opacity: 0.3 }]} />
        <Text style={[styles.progressText, { color }]}>{`${Math.round(percentage * 100)}%`}</Text>
        <Text style={[styles.progressLabel, { color: colors.light.textSecondary }]}>{label}</Text>
    </View>
  );
};
// --- End Placeholder Components ---

interface CapacityForecastWidgetProps {
  theme: ThemeType;
  contextColor: string;
  onToggleVisibility: () => void;
}

export const CapacityForecastWidget: React.FC<CapacityForecastWidgetProps> = ({
  theme,
  contextColor,
  onToggleVisibility,
}) => {
  const currentAuraState = useAuraStore(state => state.currentAuraState);

  // Derive capacity forecast from aura state
  const capacityForecast: CapacityForecast = currentAuraState ? {
    mentalClarityScore: currentAuraState.capacityForecast.mentalClarityScore,
    optimalWindow: currentAuraState.capacityForecast.nextOptimalWindow ?
      currentAuraState.capacityForecast.nextOptimalWindow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' +
      new Date(currentAuraState.capacityForecast.nextOptimalWindow.getTime() + 2 * 60 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
      'No Clear Window Today',
    biologicalAlignment: currentAuraState.biologicalAlignment,
    forecastSummary: currentAuraState.capacityForecast.anticipatedCapacityChange > 0 ?
      `Capacity improving in ${Math.abs(currentAuraState.capacityForecast.optimalWindowRemaining)} min` :
      `Optimal Focus predicted in ${Math.abs(currentAuraState.capacityForecast.optimalWindowRemaining)} min`,
    environmentalOptimality: currentAuraState.environmentOptimality,
  } : {
    mentalClarityScore: 0.5,
    optimalWindow: 'No Data',
    biologicalAlignment: 0.5,
    forecastSummary: 'Forecast unavailable',
    environmentalOptimality: 0.5,
  };

  const themeColors = colors[theme];
  const optimalWindowIcon = capacityForecast.optimalWindow !== 'No Clear Window Today' ? 'target-variant' : 'sleep'; // Use target-variant for focus

  return (
    <GlassCard theme={theme} style={styles.widget}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: contextColor }]}>
          Capacity Forecast
        </Text>
        <TouchableOpacity onPress={onToggleVisibility} style={styles.closeButton}>
          <Icon name="eye-off" size={20} color={contextColor} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* 1. Predictive Header */}
        <View style={styles.focusWindow}>
            <Icon name={optimalWindowIcon} size={28} color={contextColor} style={{ marginRight: spacing.sm }}/>
            <View>
                <Text style={[styles.windowLabel, { color: themeColors.textSecondary }]}>Next Optimal Focus</Text>
                <Text style={[styles.windowTime, { color: themeColors.text }]}>
                    {capacityForecast.optimalWindow}
                </Text>
            </View>
        </View>

        {/* 2. Alignment Visualization */}
        <View style={styles.alignmentMetrics}>
            <ProgressRing
                percentage={capacityForecast.biologicalAlignment}
                color={themeColors.success} // Green/Recovery for biological health
                label="Biological"
            />
            <ProgressRing
                percentage={capacityForecast.mentalClarityScore}
                color={themeColors.primary} // Blue/Focus for raw clarity
                label="Clarity Score"
            />
             <ProgressRing
                percentage={capacityForecast.environmentalOptimality}
                color={themeColors.warning} // Amber/Overload for external factors
                label="Environment"
            />
        </View>

        {/* 3. Forecast Summary */}
        <Text style={[styles.forecastSummary, { color: themeColors.textSecondary }]}>
            {capacityForecast.forecastSummary}
        </Text>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  widget: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h4,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    //
  },
  // Focus Window Styles
  focusWindow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    padding: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.sm,
  },
  windowLabel: {
    ...typography.caption,
  },
  windowTime: {
    ...typography.h3,
    fontWeight: 'bold',
  },
  // Alignment Metrics Styles
  alignmentMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  progressRingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: Dimensions.get('window').width / 4, // Make it responsive
  },
  progressRingMock: {
      position: 'absolute',
      opacity: 0.3,
  },
  progressText: {
    ...typography.body,
    fontWeight: 'bold',
  },
  progressLabel: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  // Summary Styles
  forecastSummary: {
    ...typography.bodySmall,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
});
