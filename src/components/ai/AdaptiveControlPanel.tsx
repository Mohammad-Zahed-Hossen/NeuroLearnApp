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
import { ThemeType, colors, typography, spacing, borderRadius } from '../../theme/colors';
import useAuraStore from '../../store/useAuraStore';

// --- ASSUMED AURA 2.0 TYPES ---
interface ServiceStatus {
  cae: 'Active' | 'Inactive' | 'Error';
  physics: 'Active' | 'Inactive' | 'Error';
  sensor: 'Active' | 'Inactive' | 'Error';
  soundscape: 'Active' | 'Inactive' | 'Error';
}

interface AdaptiveSettings {
  autoOptimize: boolean;
  predictiveMode: boolean;
  environmentalControl: boolean;
  learningAdaptation: boolean;
}
// --- Placeholder Components ---
const ServiceStatusPill: React.FC<{ status: 'Active' | 'Inactive' | 'Error'; label: string }> = ({ status, label }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'Active': return '#10B981'; // Green
      case 'Inactive': return '#6B7280'; // Gray
      case 'Error': return '#EF4444'; // Red
      default: return '#6B7280';
    }
  };

  return (
    <View style={[styles.statusPill, { backgroundColor: getStatusColor() + '20', borderColor: getStatusColor() }]}>
      <Text style={[styles.statusText, { color: getStatusColor() }]}>{label}: {status}</Text>
    </View>
  );
};

const AdaptiveSwitch: React.FC<{ value: boolean; onValueChange: (value: boolean) => void; label: string; description?: string }> = ({ value, onValueChange, label, description }) => {
  return (
    <TouchableOpacity
      style={[styles.switchContainer, value && styles.switchActive]}
      onPress={() => onValueChange(!value)}
    >
      <View style={styles.switchContent}>
        <Text style={styles.switchLabel}>{label}</Text>
        {description && <Text style={styles.switchDescription}>{description}</Text>}
      </View>
      <View style={[styles.switch, value && styles.switchOn]}>
        <View style={[styles.switchKnob, value && styles.switchKnobOn]} />
      </View>
    </TouchableOpacity>
  );
};
// --- End Placeholder Components ---

interface AdaptiveControlPanelProps {
  onClose: () => void;
  theme: ThemeType;
  contextColor: string;
}

export const AdaptiveControlPanel: React.FC<AdaptiveControlPanelProps> = ({
  onClose,
  theme,
  contextColor,
}) => {
  const { currentAuraState } = useAuraStore();
  const themeColors = colors[theme];

  // Derive service status from aura state
  const serviceStatus: ServiceStatus = {
    cae: currentAuraState ? 'Active' : 'Inactive',
    physics: currentAuraState?.adaptivePhysicsMode ? 'Active' : 'Inactive',
    sensor: currentAuraState?.environmentalContext ? 'Active' : 'Inactive',
    soundscape: currentAuraState?.recommendedSoundscape ? 'Active' : 'Inactive',
  };

  // Adaptive settings state
  const [adaptiveSettings, setAdaptiveSettings] = React.useState<AdaptiveSettings>({
    autoOptimize: true,
    predictiveMode: true,
    environmentalControl: true,
    learningAdaptation: true,
  });

  const handleSettingChange = (key: keyof AdaptiveSettings, value: boolean) => {
    setAdaptiveSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!currentAuraState) {
    return (
      <View style={styles.overlay}>
        <GlassCard theme={theme} style={styles.panel}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: contextColor }]}>
              Adaptive Controls
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={contextColor} />
            </TouchableOpacity>
          </View>
          <View style={styles.content}>
            <Text style={[styles.placeholder, { color: themeColors.textSecondary }]}>
              No aura data available. Please ensure Cognitive Aura Engine is active.
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
            Adaptive Controls
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={contextColor} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 1. Service Status Overview */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: contextColor }]}>Service Status</Text>
            <View style={styles.serviceGrid}>
              <ServiceStatusPill status={serviceStatus.cae} label="CAE" />
              <ServiceStatusPill status={serviceStatus.physics} label="Physics" />
              <ServiceStatusPill status={serviceStatus.sensor} label="Sensor" />
              <ServiceStatusPill status={serviceStatus.soundscape} label="Soundscape" />
            </View>
          </View>

          {/* 2. Current Cognitive Context */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: contextColor }]}>Current Context</Text>
            <View style={styles.contextCard}>
              <View style={styles.contextHeader}>
                <Text style={[styles.contextState, { color: contextColor, backgroundColor: contextColor + '20' }]}>
                  {currentAuraState.context}
                </Text>
                <Text style={[styles.contextScore, { color: themeColors.text }]}>
                  {(currentAuraState.compositeCognitiveScore * 100).toFixed(1)}% CCS
                </Text>
              </View>
              <Text style={[styles.contextTask, { color: themeColors.textSecondary }]}>
                {currentAuraState.microTask}
              </Text>
            </View>
          </View>

          {/* 3. Adaptive Settings */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: contextColor }]}>Adaptive Settings</Text>
            <View style={styles.settingsList}>
              <AdaptiveSwitch
                value={adaptiveSettings.autoOptimize}
                onValueChange={(value) => handleSettingChange('autoOptimize', value)}
                label="Auto-Optimize Environment"
                description="Automatically adjust soundscapes and physics based on context"
              />
              <AdaptiveSwitch
                value={adaptiveSettings.predictiveMode}
                onValueChange={(value) => handleSettingChange('predictiveMode', value)}
                label="Predictive Mode"
                description="Anticipate cognitive state changes and prepare adaptations"
              />
              <AdaptiveSwitch
                value={adaptiveSettings.environmentalControl}
                onValueChange={(value) => handleSettingChange('environmentalControl', value)}
                label="Environmental Control"
                description="Monitor and adapt to environmental factors"
              />
              <AdaptiveSwitch
                value={adaptiveSettings.learningAdaptation}
                onValueChange={(value) => handleSettingChange('learningAdaptation', value)}
                label="Learning Adaptation"
                description="Adjust learning prescriptions based on real-time feedback"
              />
            </View>
          </View>

          {/* 4. Active Adaptations */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: contextColor }]}>Active Adaptations</Text>
            <View style={styles.adaptationsList}>
              <View style={styles.adaptationItem}>
                <Icon name="music-note" size={20} color={themeColors.textSecondary} />
                <View style={styles.adaptationContent}>
                  <Text style={[styles.adaptationTitle, { color: themeColors.text }]}>Soundscape</Text>
                  <Text style={[styles.adaptationValue, { color: themeColors.textSecondary }]}>
                    {currentAuraState.recommendedSoundscape}
                  </Text>
                </View>
              </View>
              <View style={styles.adaptationItem}>
                <Icon name="atom" size={20} color={themeColors.textSecondary} />
                <View style={styles.adaptationContent}>
                  <Text style={[styles.adaptationTitle, { color: themeColors.text }]}>Physics Mode</Text>
                  <Text style={[styles.adaptationValue, { color: themeColors.textSecondary }]}>
                    {currentAuraState.adaptivePhysicsMode}
                  </Text>
                </View>
              </View>
              <View style={styles.adaptationItem}>
                <Icon name="brain" size={20} color={themeColors.textSecondary} />
                <View style={styles.adaptationContent}>
                  <Text style={[styles.adaptationTitle, { color: themeColors.text }]}>Memory Palace</Text>
                  <Text style={[styles.adaptationValue, { color: themeColors.textSecondary }]}>
                    {currentAuraState.memoryPalaceMode}
                  </Text>
                </View>
              </View>
              <View style={styles.adaptationItem}>
                <Icon name="graph" size={20} color={themeColors.textSecondary} />
                <View style={styles.adaptationContent}>
                  <Text style={[styles.adaptationTitle, { color: themeColors.text }]}>Graph Visualization</Text>
                  <Text style={[styles.adaptationValue, { color: themeColors.textSecondary }]}>
                    {currentAuraState.graphVisualizationMode}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 5. System Health */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: contextColor }]}>System Health</Text>
            <View style={styles.healthGrid}>
              <View style={styles.healthItem}>
                <Text style={[styles.healthValue, { color: themeColors.text }]}>
                  {(currentAuraState.confidence * 100).toFixed(1)}%
                </Text>
                <Text style={[styles.healthLabel, { color: themeColors.textSecondary }]}>Confidence</Text>
              </View>
              <View style={styles.healthItem}>
                <Text style={[styles.healthValue, { color: themeColors.text }]}>
                  {(currentAuraState.accuracyScore * 100).toFixed(1)}%
                </Text>
                <Text style={[styles.healthLabel, { color: themeColors.textSecondary }]}>Accuracy</Text>
              </View>
              <View style={styles.healthItem}>
                <Text style={[styles.healthValue, { color: themeColors.text }]}>
                  {currentAuraState.adaptationCount}
                </Text>
                <Text style={[styles.healthLabel, { color: themeColors.textSecondary }]}>Adaptations</Text>
              </View>
              <View style={styles.healthItem}>
                <Text style={[styles.healthValue, { color: themeColors.text }]}>
                  {(currentAuraState.contextStability * 100).toFixed(1)}%
                </Text>
                <Text style={[styles.healthLabel, { color: themeColors.textSecondary }]}>Stability</Text>
              </View>
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
  // Context Card
  contextCard: {
    padding: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.md,
  },
  contextHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  contextState: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  contextScore: {
    ...typography.h4,
    fontWeight: 'bold',
  },
  contextTask: {
    ...typography.bodySmall,
    lineHeight: 20,
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
  switchContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  switchLabel: {
    ...typography.body,
    fontWeight: '600',
  },
  switchDescription: {
    ...typography.caption,
    marginTop: spacing.xs,
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
  // Adaptations
  adaptationsList: {
    gap: spacing.sm,
  },
  adaptationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.sm,
  },
  adaptationContent: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  adaptationTitle: {
    ...typography.body,
    fontWeight: '600',
  },
  adaptationValue: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  // Health
  healthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  healthItem: {
    flex: 1,
    minWidth: 70,
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.sm,
  },
  healthValue: {
    ...typography.h4,
    fontWeight: 'bold',
  },
  healthLabel: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  placeholder: {
    ...typography.body,
    textAlign: 'center',
    padding: spacing.xl,
  },
});

export default AdaptiveControlPanel;
