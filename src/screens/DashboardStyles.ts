import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme/colors';

export const createDashboardStyles = (theme: 'light' | 'dark') => {
  const themeColors = colors[theme];

  return StyleSheet.create({
    // Settings Modal Styles
    settingsOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
    },
    settingsBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    settingsCard: {
      width: '85%',
      maxWidth: 480,
      margin: 20,
      // backgroundColor: themeColors.surface + 'EE',
    },
    settingsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    settingsTitle: {
      ...typography.h3,
      fontWeight: '600',
    },
    closeSettings: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeIcon: {
      fontSize: 24,
      fontWeight: '300',
    },
    settingsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    settingItem: {
      width: '48%',
      alignItems: 'center',
      padding: spacing.md,
      marginBottom: spacing.md,
      borderRadius: 12,
      borderWidth: 1,
    },
    settingIcon: {
      fontSize: 24,
      marginBottom: spacing.xs,
    },
    settingLabel: {
      ...typography.bodySmall,
      fontWeight: '500',
      textAlign: 'center',
    },

    // Existing Dashboard Styles
    content: {
      flex: 1,
      paddingTop: 60, // Space for floating nav bar
    },
    container: {
      padding: spacing.lg,
      paddingBottom: spacing.xl * 4,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 100,
    },
    loadingText: {
      ...typography.body,
    },
    cognitiveCard: {
      marginBottom: spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    cognitiveHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cognitiveTextContainer: {
      flex: 1,
      marginRight: spacing.md,
    },
    cardTitle: {
      ...typography.h4,
      marginBottom: spacing.xs,
    },
    cognitiveAdvice: {
      ...typography.bodySmall,
    },
    loadIndicator: {
      alignItems: 'center',
    },
    loadValue: {
      ...typography.h3,
      fontWeight: 'bold',
      marginBottom: spacing.xs,
    },
    loadDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    sectionHeader: {
      ...typography.h4,
      fontWeight: '600',
      marginBottom: spacing.md,
      marginTop: spacing.sm,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    metricCard: {
      width: '48%',
      alignItems: 'center',
      marginBottom: spacing.md,
      paddingVertical: spacing.lg,
    },
    metricIcon: {
      fontSize: 24,
      marginBottom: spacing.sm,
    },
    metricValue: {
      ...typography.h2,
      fontWeight: 'bold',
      marginBottom: spacing.xs,
    },
    metricLabel: {
      ...typography.bodySmall,
      fontWeight: '600',
    },
    recommendationCard: {
      marginBottom: spacing.lg,
    },
    recommendationText: {
      ...typography.body,
      lineHeight: 22,
      marginBottom: spacing.md,
    },
    sessionInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
    },
    sessionInfoText: {
      ...typography.caption,
    },
    actionsCard: {
      marginBottom: spacing.lg,
    },
    actionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    actionButton: {
      width: '48%',
      marginBottom: spacing.sm,
    },
    performanceCard: {
      marginBottom: spacing.lg,
    },
    performanceRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: spacing.lg,
    },
    performanceItem: {
      alignItems: 'center',
    },
    performanceValue: {
      ...typography.h3,
      fontWeight: 'bold',
      marginBottom: spacing.xs,
    },
    performanceLabel: {
      ...typography.caption,
    },
    progressBar: {
      height: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
    },

    // Group Card Styles
    groupGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    groupCard: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: 16,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    groupCardTouchable: {
      width: '31%',
      height: 160, // Fixed height for uniform cards
      marginBottom: spacing.md,
    },
    groupIcon: {
      fontSize: 28,
      marginBottom: spacing.sm,
    },
    groupTitle: {
      ...typography.body,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    groupSubtitle: {
      ...typography.caption,
      textAlign: 'center',
      opacity: 0.8,
    },

    // Metrics Modal Styles
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
    },
    modalBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    modalCard: {
      width: '85%',
      maxWidth: 480,
      margin: 20,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    modalTitle: {
      ...typography.h3,
      fontWeight: '600',
    },
    closeModal: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalMetricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    modalMetricCard: {
      width: '48%',
      alignItems: 'center',
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    modalMetricIcon: {
      fontSize: 24,
      marginBottom: spacing.sm,
    },
    modalMetricValue: {
      ...typography.h2,
      fontWeight: 'bold',
      marginBottom: spacing.xs,
    },
    modalMetricLabel: {
      ...typography.bodySmall,
      fontWeight: '600',
      textAlign: 'center',
    },

    // Test Section Styles (Development Only)
    testSection: {
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    testButton: {
      width: '100%',
    },
  });
};
