/**
 * Cognitive Privacy & Settings Screen
 * Comprehensive privacy controls for cognitive data
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  TouchableOpacity,
  Modal,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Load NeuroLearnEngine at runtime inside ensureEngine to avoid static type issues
// and allow lazy initialization.

interface CognitivePrivacySettings {
  // Core functionality
  enableCognitiveMonitoring: boolean;
  enableEyeTracking: boolean;
  enableAICoaching: boolean;

  // Data handling
  saveProcessedMetrics: boolean;
  saveRawSensorData: boolean;
  enableCloudSync: boolean;
  enableAnalytics: boolean;

  // Sharing and insights
  shareAnonymizedData: boolean;
  enablePersonalization: boolean;
  enablePredictiveInsights: boolean;

  // Retention and deletion
  dataRetentionDays: number;
  autoDeleteAfterInactivity: boolean;

  // Consent tracking
  consentVersion: string;
  consentDate: Date | null;
  explicitConsent: boolean;
}

interface DataUsageStats {
  totalSamples: number;
  storageUsedMB: number;
  lastDataSync: Date | null;
  dataRetentionDays: number;
  sessionsRecorded: number;
}

export const CognitivePrivacyScreen: React.FC = () => {
  const [settings, setSettings] = useState<CognitivePrivacySettings>({
    enableCognitiveMonitoring: false,
    enableEyeTracking: false,
    enableAICoaching: true,
    saveProcessedMetrics: true,
    saveRawSensorData: false,
    enableCloudSync: false,
    enableAnalytics: true,
    shareAnonymizedData: false,
    enablePersonalization: true,
    enablePredictiveInsights: true,
    dataRetentionDays: 30,
    autoDeleteAfterInactivity: true,
    consentVersion: '1.0',
    consentDate: null,
    explicitConsent: false,
  });

  const [dataUsage, setDataUsage] = useState<DataUsageStats>({
    totalSamples: 0,
    storageUsedMB: 0,
    lastDataSync: null,
    dataRetentionDays: 30,
    sessionsRecorded: 0,
  });

  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showDataDeletion, setShowDataDeletion] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Lazily initialize or obtain engine instance. The engine may not be configured
  // yet when this screen mounts, so we create a ref and ensure initialization
  // before using it. This avoids the runtime error: "NeuroLearnEngine requires configuration on first initialization".
  const engineRef = React.useRef<any | null>(null);

  // Ensure engine exists; if not, try to load saved config from AsyncStorage or fall back to sensible defaults.
  const ensureEngine = async () => {
    if (engineRef.current) return engineRef.current;

    try {
      // Try to get existing instance (may throw if not initialized)
      // Load the engine class at runtime to avoid static import/type issues
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const {
        NeuroLearnEngine: EngineClass,
      } = require('../../core/NeuroLearnEngine');
      engineRef.current = (EngineClass as any).getInstance();
      return engineRef.current;
    } catch (e) {
      // Try to restore configuration from AsyncStorage
      try {
        const raw = await AsyncStorage.getItem('neurolearn_engine_config');
        let config: any = null;
        if (raw) {
          try {
            config = JSON.parse(raw);
          } catch (pe) {
            config = null;
          }
        }

        // Minimal default config if none persisted
        const defaultConfig = config || {
          userId: 'guest',
          enableDebugMode: false,
          enablePerformanceMonitoring: false,
          autoSyncInterval: 0,
          maxRetryAttempts: 3,
          offlineMode: false,
        };

        // Create instance and initialize in background (don't block UI long)
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const {
          NeuroLearnEngine: EngineClass2,
        } = require('../../core/NeuroLearnEngine');
        engineRef.current = (EngineClass2 as any).getInstance(defaultConfig);
        try {
          // initialize may be expensive; run but don't crash on failure
          await engineRef.current.initialize();
        } catch (ie) {
          console.warn('NeuroLearnEngine initialize failed (non-fatal):', ie);
        }

        return engineRef.current;
      } catch (err) {
        console.error('Failed to ensure NeuroLearnEngine instance:', err);
        return null;
      }
    }
  };

  useEffect(() => {
    // Load settings and data usage after ensuring engine is available
    (async () => {
      await ensureEngine();
      loadSettings();
      loadDataUsageStats();
    })();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('cognitive_privacy_settings');
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        parsedSettings.consentDate = parsedSettings.consentDate
          ? new Date(parsedSettings.consentDate)
          : null;
        setSettings(parsedSettings);
      }
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
    }
  };

  const saveSettings = async (newSettings: CognitivePrivacySettings) => {
    try {
      await AsyncStorage.setItem(
        'cognitive_privacy_settings',
        JSON.stringify(newSettings),
      );
      setSettings(newSettings);

      // Apply settings to cognitive system
      await applyCognitiveSettings(newSettings);

      console.log('Privacy settings saved and applied');
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  const applyCognitiveSettings = async (
    newSettings: CognitivePrivacySettings,
  ) => {
    try {
      // Configure cognitive monitoring
      const engine = await ensureEngine();
      if (!engine) return;

      if (newSettings.enableCognitiveMonitoring) {
        await engine.execute('cognitive:enable-monitoring', {
          eyeTracking: newSettings.enableEyeTracking,
          aiCoaching: newSettings.enableAICoaching,
        });
      } else {
        await engine.execute('cognitive:disable-monitoring', {});
      }

      // Configure data retention
      await engine.execute('cognitive:configure-retention', {
        retentionDays: newSettings.dataRetentionDays,
        saveRawData: newSettings.saveRawSensorData,
        enableCloudSync: newSettings.enableCloudSync,
      });

      // Configure AI features
      await engine.execute('cognitive:configure-ai', {
        enablePersonalization: newSettings.enablePersonalization,
        enablePredictiveInsights: newSettings.enablePredictiveInsights,
        enableCoaching: newSettings.enableAICoaching,
      });
    } catch (error) {
      console.error('Failed to apply cognitive settings:', error);
    }
  };

  const loadDataUsageStats = async () => {
    try {
      const engine = await ensureEngine();
      if (!engine) return;
      const result = await engine.execute('cognitive:get-data-usage', {});
      if (result.success) {
        setDataUsage(result.data);
      }
    } catch (error) {
      console.error('Failed to load data usage stats:', error);
    }
  };

  const handleToggle = (
    key: keyof CognitivePrivacySettings,
    value: boolean,
  ) => {
    const newSettings = { ...settings, [key]: value };

    // Handle dependent settings
    if (key === 'enableCognitiveMonitoring' && !value) {
      newSettings.enableEyeTracking = false;
      newSettings.enableAICoaching = false;
    }

    if (key === 'enableEyeTracking' && value) {
      newSettings.enableCognitiveMonitoring = true;
    }

    saveSettings(newSettings);
  };

  const handleConsentGiven = () => {
    const newSettings = {
      ...settings,
      explicitConsent: true,
      consentDate: new Date(),
      consentVersion: '1.0',
    };
    saveSettings(newSettings);

    Alert.alert(
      'Consent Recorded',
      'Thank you for providing your consent. You can modify these settings at any time.',
      [{ text: 'OK' }],
    );
  };

  const handleDataDeletion = async (
    deletionType: 'processed' | 'all' | 'cache',
  ) => {
    setIsLoading(true);

    try {
      const engine = await ensureEngine();
      if (!engine) throw new Error('Engine not available');

      const result = await engine.execute('cognitive:delete-data', {
        type: deletionType,
        confirmDeletion: true,
      });

      if (result.success) {
        Alert.alert(
          'Data Deleted',
          `Your ${deletionType} cognitive data has been permanently deleted.`,
          [
            {
              text: 'OK',
              onPress: () => {
                loadDataUsageStats();
                setShowDataDeletion(false);
              },
            },
          ],
        );
      } else {
        Alert.alert('Error', 'Failed to delete data. Please try again.');
      }
    } catch (error) {
      console.error('Data deletion failed:', error);
      Alert.alert('Error', 'An error occurred during data deletion.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderToggleRow = (
    label: string,
    value: boolean,
    key: keyof CognitivePrivacySettings,
    description?: string,
    dependsOn?: keyof CognitivePrivacySettings,
  ) => (
    <View style={styles.toggleRow}>
      <View style={styles.textContainer}>
        <Text style={styles.label}>{label}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={(newValue) => handleToggle(key, newValue)}
        disabled={dependsOn && !settings[dependsOn]}
        trackColor={{ false: '#767577', true: '#4CAF50' }}
        thumbColor={value ? '#ffffff' : '#f4f3f4'}
      />
    </View>
  );

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔒 Cognitive Privacy & Settings</Text>

      {/* Consent Section */}
      {!settings.explicitConsent && (
        <View style={styles.consentBanner}>
          <Text style={styles.consentText}>
            Before using cognitive monitoring features, please review our
            privacy practices and provide your consent.
          </Text>
          <TouchableOpacity
            style={styles.consentButton}
            onPress={handleConsentGiven}
          >
            <Text style={styles.consentButtonText}>Give Consent</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Core Features */}
      {renderSection(
        'Core Features',
        <>
          {renderToggleRow(
            'Enable Cognitive Monitoring',
            settings.enableCognitiveMonitoring,
            'enableCognitiveMonitoring',
            'Allow the app to monitor your attention and cognitive state',
          )}

          {renderToggleRow(
            'Enable Eye Tracking',
            settings.enableEyeTracking,
            'enableEyeTracking',
            'Use camera for attention detection (local processing only)',
            'enableCognitiveMonitoring',
          )}

          {renderToggleRow(
            'Enable AI Coaching',
            settings.enableAICoaching,
            'enableAICoaching',
            'Receive AI-powered learning recommendations',
          )}
        </>,
      )}

      {/* Data Collection */}
      {renderSection(
        'Data Collection',
        <>
          {renderToggleRow(
            'Save Processed Metrics',
            settings.saveProcessedMetrics,
            'saveProcessedMetrics',
            'Store attention scores and cognitive states locally',
          )}

          {renderToggleRow(
            'Save Raw Sensor Data',
            settings.saveRawSensorData,
            'saveRawSensorData',
            'Store raw eye tracking data (NOT recommended)',
          )}

          {renderToggleRow(
            'Enable Cloud Sync',
            settings.enableCloudSync,
            'enableCloudSync',
            'Sync cognitive data across devices (encrypted)',
          )}

          {renderToggleRow(
            'Enable Analytics',
            settings.enableAnalytics,
            'enableAnalytics',
            'Allow usage analytics to improve the app',
          )}
        </>,
      )}

      {/* AI Features */}
      {renderSection(
        'AI Features',
        <>
          {renderToggleRow(
            'Enable Personalization',
            settings.enablePersonalization,
            'enablePersonalization',
            'Use your data to personalize the learning experience',
          )}

          {renderToggleRow(
            'Enable Predictive Insights',
            settings.enablePredictiveInsights,
            'enablePredictiveInsights',
            'Get predictions about optimal learning times',
          )}

          {renderToggleRow(
            'Share Anonymized Data',
            settings.shareAnonymizedData,
            'shareAnonymizedData',
            'Help improve the app with anonymous usage data',
          )}
        </>,
      )}

      {/* Data Usage Stats */}
      {renderSection(
        'Data Usage',
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Samples:</Text>
            <Text style={styles.statValue}>
              {dataUsage.totalSamples.toLocaleString()}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Storage Used:</Text>
            <Text style={styles.statValue}>
              {dataUsage.storageUsedMB.toFixed(1)} MB
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Sessions Recorded:</Text>
            <Text style={styles.statValue}>{dataUsage.sessionsRecorded}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Data Retention:</Text>
            <Text style={styles.statValue}>
              {dataUsage.dataRetentionDays} days
            </Text>
          </View>
        </View>,
      )}

      {/* Privacy Controls */}
      {renderSection(
        'Privacy Controls',
        <>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowPrivacyPolicy(true)}
          >
            <Text style={styles.actionButtonText}>📋 View Privacy Policy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowDataDeletion(true)}
          >
            <Text style={styles.actionButtonText}>🗑️ Manage Data Deletion</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Linking.openURL('mailto:privacy@neurolearn.com')}
          >
            <Text style={styles.actionButtonText}>✉️ Contact Privacy Team</Text>
          </TouchableOpacity>
        </>,
      )}

      {/* Consent Information */}
      {settings.explicitConsent && settings.consentDate && (
        <View style={styles.consentInfo}>
          <Text style={styles.consentInfoText}>
            ✅ Consent given on {settings.consentDate.toLocaleDateString()}
          </Text>
          <Text style={styles.consentInfoText}>
            Version: {settings.consentVersion}
          </Text>
        </View>
      )}

      {/* Privacy Policy Modal */}
      <Modal
        visible={showPrivacyPolicy}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Privacy Policy</Text>
            <TouchableOpacity
              onPress={() => setShowPrivacyPolicy(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.privacyText}>
              {`# Cognitive Data Privacy Policy

## What We Collect
- Attention scores and cognitive states (processed data)
- Learning performance metrics
- Session duration and frequency
- Device and environmental context (optional)

## What We DON'T Collect
- Raw camera footage or images
- Personal identification from eye tracking
- Audio recordings or voice data
- Location data beyond general environment type

## How We Use Your Data
- Personalize your learning experience
- Provide AI coaching recommendations
- Improve app performance and features
- Generate anonymous usage statistics

## Data Storage & Security
- All data is encrypted at rest and in transit
- Raw sensor data is processed locally only
- Cloud sync uses end-to-end encryption
- You control data retention periods

## Your Rights
- Access all your data at any time
- Delete specific data types or all data
- Withdraw consent and stop data collection
- Export your data in standard formats

## Data Retention
- Processed metrics: Configurable (7-365 days)
- Raw sensor data: Never stored by default
- Session summaries: 1 year maximum
- Account data: Until account deletion

## Contact Us
For privacy questions: privacy@neurolearn.com

Last updated: ${new Date().toLocaleDateString()}`}
            </Text>
          </ScrollView>
        </View>
      </Modal>

      {/* Data Deletion Modal */}
      <Modal
        visible={showDataDeletion}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deletionModal}>
            <Text style={styles.deletionTitle}>Data Deletion Options</Text>

            <TouchableOpacity
              style={styles.deletionOption}
              onPress={() => handleDataDeletion('cache')}
              disabled={isLoading}
            >
              <Text style={styles.deletionOptionTitle}>Clear Cache</Text>
              <Text style={styles.deletionOptionDesc}>
                Remove temporary files and cached data
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deletionOption}
              onPress={() => handleDataDeletion('processed')}
              disabled={isLoading}
            >
              <Text style={styles.deletionOptionTitle}>
                Delete Processed Data
              </Text>
              <Text style={styles.deletionOptionDesc}>
                Remove attention scores and session metrics
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.deletionOption, styles.dangerOption]}
              onPress={() => handleDataDeletion('all')}
              disabled={isLoading}
            >
              <Text style={[styles.deletionOptionTitle, styles.dangerText]}>
                Delete All Cognitive Data
              </Text>
              <Text style={styles.deletionOptionDesc}>
                Permanently remove all cognitive monitoring data
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowDataDeletion(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  consentBanner: {
    backgroundColor: '#1a237e',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  consentText: {
    color: '#FFFFFF',
    marginBottom: 12,
    lineHeight: 20,
  },
  consentButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  consentButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#111111',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  textContainer: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: '#CCCCCC',
    lineHeight: 18,
  },
  statsContainer: {
    backgroundColor: '#0a0a0a',
    borderRadius: 6,
    padding: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  actionButton: {
    backgroundColor: '#1976D2',
    padding: 14,
    borderRadius: 6,
    marginBottom: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
  },
  consentInfo: {
    backgroundColor: '#0d5f23',
    padding: 12,
    borderRadius: 6,
    marginTop: 16,
  },
  consentInfoText: {
    color: '#FFFFFF',
    fontSize: 13,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#4CAF50',
    fontSize: 16,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  privacyText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deletionModal: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  deletionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  deletionOption: {
    backgroundColor: '#222222',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  deletionOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  deletionOptionDesc: {
    fontSize: 13,
    color: '#CCCCCC',
  },
  dangerOption: {
    backgroundColor: '#2d1b1b',
    borderWidth: 1,
    borderColor: '#d32f2f',
  },
  dangerText: {
    color: '#ff5252',
  },
  cancelButton: {
    backgroundColor: '#333333',
    padding: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
});
