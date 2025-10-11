import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { GlassCard } from '../GlassComponents';
import {
  ThemeType,
  colors,
  typography,
  spacing,
  borderRadius,
} from '../../theme/colors';
import {
  useAuraContext,
  useAuraConfidence,
} from '../../hooks/useOptimizedSelectors';
import useAuraStore from '../../store/useAuraStore';

// --- Placeholder Components ---
const ServiceStatusPill: React.FC<{
  status: 'Active' | 'Inactive' | 'Error';
  label: string;
}> = ({ status, label }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'Active':
        return '#10B981'; // Green
      case 'Inactive':
        return '#6B7280'; // Gray
      case 'Error':
        return '#EF4444'; // Red
      default:
        return '#6B7280';
    }
  };

  return (
    <View
      style={[
        styles.statusPill,
        {
          backgroundColor: getStatusColor() + '20',
          borderColor: getStatusColor(),
        },
      ]}
    >
      <Text style={[styles.statusText, { color: getStatusColor() }]}>
        {label}: {status}
      </Text>
    </View>
  );
};

const AdaptiveSwitch: React.FC<{
  value: boolean;
  onValueChange: (value: boolean) => void;
  label: string;
}> = ({ value, onValueChange, label }) => {
  return (
    <TouchableOpacity
      style={[styles.switchContainer, value && styles.switchActive]}
      onPress={() => onValueChange(!value)}
    >
      <Text style={styles.switchLabel}>{label}</Text>
      <View style={[styles.switch, value && styles.switchOn]}>
        <View style={[styles.switchKnob, value && styles.switchKnobOn]} />
      </View>
    </TouchableOpacity>
  );
};
// --- End Placeholder Components ---

interface ContextInsightsPanelProps {
  onClose: () => void;
  theme: ThemeType;
  contextColor: string;
}

export const ContextInsightsPanel: React.FC<ContextInsightsPanelProps> = ({
  onClose,
  theme,
  contextColor,
}) => {
  const { currentAuraState } = useAuraStore();
  const themeColors = colors[theme];

  // Derive data from aura state
  const auraState = currentAuraState;
  const contextSnapshot = currentAuraState?.environmentalContext;

  // Mock physics state (since not in store)
  const physicsState = { mode: 'calm', intensity: 0.7 };

  // Mock service statuses (derive from aura state availability)
  const serviceStatuses = {
    cae: auraState ? 'Active' : 'Inactive',
    physics: physicsState ? 'Active' : 'Inactive',
    sensor: contextSnapshot ? 'Active' : 'Inactive',
    soundscape: auraState?.recommendedSoundscape ? 'Active' : 'Inactive',
  };

  // Mock adaptive settings (could be from store in future)
  const [adaptiveSettings, setAdaptiveSettings] = React.useState({
    autoOptimize: true,
    predictiveAlerts: true,
    environmentalSensing: true,
    learningPrescription: true,
  });

  const handleSettingChange = (
    key: keyof typeof adaptiveSettings,
    value: boolean,
  ) => {
    setAdaptiveSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (!auraState || !contextSnapshot) {
    return (
      <View style={styles.overlay}>
        <GlassCard theme={theme} style={styles.panel}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: contextColor }]}>
              Context Insights
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={contextColor} />
            </TouchableOpacity>
          </View>
          <View style={styles.content}>
            <Text
              style={[styles.placeholder, { color: themeColors.textSecondary }]}
            >
              No aura data available. Please ensure Cognitive Aura Engine is
              active.
            </Text>
          </View>
        </GlassCard>
      </View>
    );
  }

  return (
    <View style={styles.overlay}>
      <GlassCard theme={theme} style={styles.panel}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: contextColor }]}>
            Context Insights
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={contextColor} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 1. Service Status Overview */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: contextColor }]}>
              Service Status
            </Text>
            <View style={styles.serviceGrid}>
              <ServiceStatusPill
                status={serviceStatuses.cae as any}
                label="CAE"
              />
              <ServiceStatusPill
                status={serviceStatuses.physics as any}
                label="Physics"
              />
              <ServiceStatusPill
                status={serviceStatuses.sensor as any}
                label="Sensor"
              />
              <ServiceStatusPill
                status={serviceStatuses.soundscape as any}
                label="Soundscape"
              />
            </View>
          </View>

          {/* 2. Environmental Context */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: contextColor }]}>
              Environmental Context
            </Text>
            <View style={styles.contextGrid}>
              <View style={styles.contextItem}>
                <Icon
                  name="office-building"
                  size={20}
                  color={themeColors.textSecondary}
                />
                <Text
                  style={[
                    styles.contextLabel,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  Location
                </Text>
                <Text
                  style={[styles.contextValue, { color: themeColors.text }]}
                >
                  {contextSnapshot.locationContext.environment}
                </Text>
              </View>
              <View style={styles.contextItem}>
                <Icon
                  name="volume-high"
                  size={20}
                  color={themeColors.textSecondary}
                />
                <Text
                  style={[
                    styles.contextLabel,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  Noise
                </Text>
                <Text
                  style={[styles.contextValue, { color: themeColors.text }]}
                >
                  {contextSnapshot.locationContext.noiseLevel}
                </Text>
              </View>
              <View style={styles.contextItem}>
                <Icon
                  name="account-group"
                  size={20}
                  color={themeColors.textSecondary}
                />
                <Text
                  style={[
                    styles.contextLabel,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  Social
                </Text>
                <Text
                  style={[styles.contextValue, { color: themeColors.text }]}
                >
                  {contextSnapshot.locationContext.socialSetting}
                </Text>
              </View>
              <View style={styles.contextItem}>
                <Icon
                  name="battery"
                  size={20}
                  color={themeColors.textSecondary}
                />
                <Text
                  style={[
                    styles.contextLabel,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  Battery
                </Text>
                <Text
                  style={[styles.contextValue, { color: themeColors.text }]}
                >
                  {Math.round(contextSnapshot.batteryLevel * 100)}%
                </Text>
              </View>
            </View>
          </View>

          {/* 3. Cognitive State */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: contextColor }]}>
              Cognitive State
            </Text>
            <View style={styles.stateCard}>
              <View style={styles.stateHeader}>
                <Text
                  style={[
                    styles.stateContext,
                    {
                      color: contextColor,
                      backgroundColor: contextColor + '20',
                    },
                  ]}
                >
                  {auraState.context}
                </Text>
                <Text style={[styles.stateScore, { color: themeColors.text }]}>
                  {(auraState.compositeCognitiveScore * 100).toFixed(1)}% CCS
                </Text>
              </View>
              <Text
                style={[styles.stateTask, { color: themeColors.textSecondary }]}
              >
                {auraState.microTask}
              </Text>
            </View>
          </View>

          {/* 4. Learning Prescription */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: contextColor }]}>
              Learning Prescription
            </Text>
            <View style={styles.prescriptionCard}>
              <Text
                style={[
                  styles.prescriptionPrimary,
                  { color: themeColors.text },
                ]}
              >
                {auraState.learningPrescription.primary}
              </Text>
              {auraState.learningPrescription.secondary && (
                <Text
                  style={[
                    styles.prescriptionSecondary,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  + {auraState.learningPrescription.secondary}
                </Text>
              )}
              <View style={styles.prescriptionMeta}>
                <Text
                  style={[
                    styles.prescriptionMetaText,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  Duration: {auraState.learningPrescription.duration}min •
                  Intensity: {auraState.learningPrescription.intensity}
                </Text>
              </View>
            </View>
          </View>

          {/* 5. System Integration */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: contextColor }]}>
              System Integration
            </Text>
            <View style={styles.integrationGrid}>
              <View style={styles.integrationItem}>
                <Icon
                  name="music-note"
                  size={20}
                  color={themeColors.textSecondary}
                />
                <Text
                  style={[
                    styles.integrationLabel,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  Soundscape
                </Text>
                <Text
                  style={[styles.integrationValue, { color: themeColors.text }]}
                >
                  {auraState.recommendedSoundscape}
                </Text>
              </View>
              <View style={styles.integrationItem}>
                <Icon name="atom" size={20} color={themeColors.textSecondary} />
                <Text
                  style={[
                    styles.integrationLabel,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  Physics
                </Text>
                <Text
                  style={[styles.integrationValue, { color: themeColors.text }]}
                >
                  {auraState.adaptivePhysicsMode}
                </Text>
              </View>
              <View style={styles.integrationItem}>
                <Icon
                  name="brain"
                  size={20}
                  color={themeColors.textSecondary}
                />
                <Text
                  style={[
                    styles.integrationLabel,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  Memory
                </Text>
                <Text
                  style={[styles.integrationValue, { color: themeColors.text }]}
                >
                  {auraState.memoryPalaceMode}
                </Text>
              </View>
              <View style={styles.integrationItem}>
                <Icon
                  name="graph"
                  size={20}
                  color={themeColors.textSecondary}
                />
                <Text
                  style={[
                    styles.integrationLabel,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  Graph
                </Text>
                <Text
                  style={[styles.integrationValue, { color: themeColors.text }]}
                >
                  {auraState.graphVisualizationMode}
                </Text>
              </View>
            </View>
          </View>

          {/* 6. Predictive Insights */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: contextColor }]}>
              Predictive Insights
            </Text>
            <View style={styles.predictionsList}>
              {auraState.anticipatedStateChanges.map(
                (change: any, index: number) => (
                  <View key={index} style={styles.predictionItem}>
                    <Icon
                      name="trending-up"
                      size={16}
                      color={themeColors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.predictionText,
                        { color: themeColors.text },
                      ]}
                    >
                      {change.context} in {change.timeframe}min (
                      {(change.probability * 100).toFixed(0)}%)
                    </Text>
                  </View>
                ),
              )}
            </View>
          </View>

          {/* 7. Performance Metrics */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: contextColor }]}>
              Performance Metrics
            </Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: themeColors.text }]}>
                  {(auraState.confidence * 100).toFixed(1)}%
                </Text>
                <Text
                  style={[
                    styles.metricLabel,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  Confidence
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: themeColors.text }]}>
                  {(auraState.accuracyScore * 100).toFixed(1)}%
                </Text>
                <Text
                  style={[
                    styles.metricLabel,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  Accuracy
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: themeColors.text }]}>
                  {auraState.adaptationCount}
                </Text>
                <Text
                  style={[
                    styles.metricLabel,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  Adaptations
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: themeColors.text }]}>
                  {(auraState.contextStability * 100).toFixed(1)}%
                </Text>
                <Text
                  style={[
                    styles.metricLabel,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  Stability
                </Text>
              </View>
            </View>
          </View>

          {/* 8. Adaptive Settings */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: contextColor }]}>
              Adaptive Settings
            </Text>
            <View style={styles.settingsList}>
              <AdaptiveSwitch
                value={adaptiveSettings.autoOptimize}
                onValueChange={(value) =>
                  handleSettingChange('autoOptimize', value)
                }
                label="Auto-Optimize Environment"
              />
              <AdaptiveSwitch
                value={adaptiveSettings.predictiveAlerts}
                onValueChange={(value) =>
                  handleSettingChange('predictiveAlerts', value)
                }
                label="Predictive State Alerts"
              />
              <AdaptiveSwitch
                value={adaptiveSettings.environmentalSensing}
                onValueChange={(value) =>
                  handleSettingChange('environmentalSensing', value)
                }
                label="Environmental Sensing"
              />
              <AdaptiveSwitch
                value={adaptiveSettings.learningPrescription}
                onValueChange={(value) =>
                  handleSettingChange('learningPrescription', value)
                }
                label="Learning Prescriptions"
              />
            </View>
          </View>
        </ScrollView>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  panel: {
    width: '90%',
    maxHeight: '80%',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h4,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  // Service Status
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '500',
  },
  // Context Grid
  contextGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  contextItem: {
    flex: 1,
    minWidth: 80,
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.sm,
  },
  contextLabel: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  contextValue: {
    ...typography.body,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  // State Card
  stateCard: {
    padding: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.md,
  },
  stateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  stateContext: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    ...typography.caption,
  },
  stateScore: {
    ...typography.h4,
    fontWeight: 'bold',
  },
  stateTask: {
    ...typography.bodySmall,
    lineHeight: 20,
  },
  // Prescription Card
  prescriptionCard: {
    padding: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.md,
  },
  prescriptionPrimary: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  prescriptionSecondary: {
    ...typography.bodySmall,
    marginBottom: spacing.sm,
  },
  prescriptionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  prescriptionMetaText: {
    ...typography.caption,
  },
  // Integration Grid
  integrationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  integrationItem: {
    flex: 1,
    minWidth: 80,
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.sm,
  },
  integrationLabel: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  integrationValue: {
    ...typography.body,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  // Predictions
  predictionsList: {
    gap: spacing.sm,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.sm,
  },
  predictionText: {
    ...typography.bodySmall,
    marginLeft: spacing.sm,
  },
  // Metrics
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metricItem: {
    flex: 1,
    minWidth: 70,
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.sm,
  },
  metricValue: {
    ...typography.h4,
    fontWeight: 'bold',
  },
  metricLabel: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  // Settings
  settingsList: {
    gap: spacing.md,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.md,
  },
  switchActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
  },
  switchLabel: {
    ...typography.body,
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#374151',
    padding: 2,
  },
  switchOn: {
    backgroundColor: '#0EA5E9',
  },
  switchKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    transform: [{ translateX: 0 }],
  },
  switchKnobOn: {
    transform: [{ translateX: 22 }],
  },
  placeholder: {
    ...typography.body,
    textAlign: 'center',
    padding: spacing.xl,
  },
});

export default ContextInsightsPanel;
