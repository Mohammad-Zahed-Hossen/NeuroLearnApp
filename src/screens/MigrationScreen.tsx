import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  GlassCard,
  Button,
  ScreenContainer,
} from '../components/GlassComponents';
import { colors, spacing, typography } from '../theme/colors';
import { ThemeType } from '../theme/colors';
import MigrationService, { MigrationStatus } from '../services/MigrationService';

interface MigrationScreenProps {
  theme: ThemeType;
  onMigrationComplete: () => void;
}

export const MigrationScreen: React.FC<MigrationScreenProps> = ({
  theme,
  onMigrationComplete,
}) => {
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus>({
    isComplete: false,
    migratedTables: [],
    errors: [],
    totalRecords: 0,
    migratedRecords: 0,
  });
  const [isRunning, setIsRunning] = useState(false);

  const themeColors = colors[theme];
  const migrationService = MigrationService.getInstance();

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = async () => {
    try {
      const needsMigration = await migrationService.needsMigration();
      if (!needsMigration) {
        onMigrationComplete();
      }
    } catch (error) {
      console.error('Error checking migration status:', error);
    }
  };

  const startMigration = async () => {
    setIsRunning(true);

    try {
      const status = await migrationService.migrateAllData();
      setMigrationStatus(status);

      if (status.isComplete) {
        Alert.alert(
          'Migration Complete! 🎉',
          `Successfully migrated ${status.migratedRecords} records to Supabase.\n\nYour data is now securely stored in the cloud and ready for AI enhancements.`,
          [
            {
              text: 'Continue',
              onPress: onMigrationComplete,
            },
          ]
        );
      } else {
        Alert.alert(
          'Migration Issues',
          `Migration completed with some issues:\n\n${status.errors.join('\n')}\n\nYou can continue using the app, but some data may not be available.`,
          [
            {
              text: 'Continue Anyway',
              onPress: onMigrationComplete,
            },
            {
              text: 'Retry',
              onPress: startMigration,
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        'Migration Failed',
        `Failed to migrate data: ${error}\n\nYou can continue with local storage or try again.`,
        [
          {
            text: 'Continue with Local Storage',
            onPress: onMigrationComplete,
          },
          {
            text: 'Retry',
            onPress: startMigration,
          },
        ]
      );
    } finally {
      setIsRunning(false);
    }
  };

  const skipMigration = () => {
    Alert.alert(
      'Skip Migration?',
      'You can migrate your data later from Settings. Continue with local storage for now?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue with Local Storage',
          onPress: onMigrationComplete,
        },
      ]
    );
  };

  const getProgressPercentage = (): number => {
    if (migrationStatus.totalRecords === 0) return 0;
    return (migrationStatus.migratedRecords / migrationStatus.totalRecords) * 100;
  };

  return (
    <ScreenContainer theme={theme}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeColors.text }]}>
            🚀 Upgrade to Cloud Storage
          </Text>
          <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
            Migrate your learning data to Supabase for enhanced AI features and cross-device sync
          </Text>
        </View>

        <GlassCard theme={theme} style={styles.migrationCard}>
          <Text style={[styles.cardTitle, { color: themeColors.text }]}>
            Data Migration
          </Text>

          {!isRunning && migrationStatus.migratedRecords === 0 && (
            <View style={styles.benefits}>
              <Text style={[styles.benefitTitle, { color: themeColors.primary }]}>
                ✨ Benefits of Cloud Storage:
              </Text>
              <Text style={[styles.benefitItem, { color: themeColors.textSecondary }]}>
                • AI-powered learning recommendations
              </Text>
              <Text style={[styles.benefitItem, { color: themeColors.textSecondary }]}>
                • Cross-device synchronization
              </Text>
              <Text style={[styles.benefitItem, { color: themeColors.textSecondary }]}>
                • Advanced analytics and insights
              </Text>
              <Text style={[styles.benefitItem, { color: themeColors.textSecondary }]}>
                • Automatic backups and recovery
              </Text>
              <Text style={[styles.benefitItem, { color: themeColors.textSecondary }]}>
                • Enhanced security with RLS
              </Text>
            </View>
          )}

          {isRunning && (
            <View style={styles.progressContainer}>
              <Text style={[styles.progressText, { color: themeColors.text }]}>
                Migrating your data... {getProgressPercentage().toFixed(0)}%
              </Text>
              
              <View style={[styles.progressBar, { backgroundColor: themeColors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${getProgressPercentage()}%`,
                      backgroundColor: themeColors.primary,
                    },
                  ]}
                />
              </View>

              <Text style={[styles.progressDetail, { color: themeColors.textMuted }]}>
                {migrationStatus.migratedRecords} of {migrationStatus.totalRecords} records
              </Text>

              {migrationStatus.migratedTables.length > 0 && (
                <View style={styles.migratedTables}>
                  <Text style={[styles.migratedTitle, { color: themeColors.success }]}>
                    ✅ Migrated:
                  </Text>
                  {migrationStatus.migratedTables.map((table, index) => (
                    <Text
                      key={index}
                      style={[styles.migratedTable, { color: themeColors.textSecondary }]}
                    >
                      • {table}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {migrationStatus.errors.length > 0 && (
            <View style={styles.errorsContainer}>
              <Text style={[styles.errorsTitle, { color: themeColors.error }]}>
                ⚠️ Issues:
              </Text>
              {migrationStatus.errors.map((error, index) => (
                <Text
                  key={index}
                  style={[styles.errorText, { color: themeColors.error }]}
                >
                  • {error}
                </Text>
              ))}
            </View>
          )}

          <View style={styles.actions}>
            {!isRunning && !migrationStatus.isComplete && (
              <>
                <Button
                  title="Start Migration"
                  onPress={startMigration}
                  variant="primary"
                  size="large"
                  theme={theme}
                  style={styles.actionButton}
                />
                
                <Button
                  title="Skip for Now"
                  onPress={skipMigration}
                  variant="ghost"
                  size="medium"
                  theme={theme}
                  style={styles.actionButton}
                />
              </>
            )}

            {isRunning && (
              <Text style={[styles.runningText, { color: themeColors.textMuted }]}>
                Please wait while we migrate your data...
              </Text>
            )}
          </View>
        </GlassCard>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: themeColors.textMuted }]}>
            🔒 Your data is encrypted and secured with Row Level Security
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  migrationCard: {
    marginBottom: spacing.xl,
  },
  cardTitle: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  benefits: {
    marginBottom: spacing.xl,
  },
  benefitTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  benefitItem: {
    ...typography.bodySmall,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: spacing.xl,
  },
  progressText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressDetail: {
    ...typography.bodySmall,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  migratedTables: {
    marginBottom: spacing.lg,
  },
  migratedTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  migratedTable: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  errorsContainer: {
    marginBottom: spacing.lg,
  },
  errorsTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  actions: {
    alignItems: 'center',
  },
  actionButton: {
    marginBottom: spacing.md,
    width: '100%',
  },
  runningText: {
    ...typography.body,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    ...typography.caption,
    textAlign: 'center',
  },
});