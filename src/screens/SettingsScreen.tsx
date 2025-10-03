import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Switch,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { AppHeader, HamburgerMenu } from '../components/Navigation';
import {
  GlassCard,
  Button,
  ScreenContainer,
} from '../components/GlassComponents';
import { colors, spacing, typography, borderRadius } from '../theme/colors';
import { ThemeType } from '../theme/colors';
import { HybridStorageService } from '../services/HybridStorageService';
import { TodoistService } from '../services/TodoistService';
import { SupabaseService } from '../services/SupabaseService';
import { Settings } from '../types';

interface SettingsScreenProps {
  theme: ThemeType;
  onNavigate: (screen: string) => void;
  onThemeChange?: (newTheme: ThemeType) => void;
}

interface ConnectionStatus {
  todoist: { connected: boolean; message: string; testing: boolean };
  notion: { connected: boolean; message: string; testing: boolean };
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  theme,
  onNavigate,
  onThemeChange,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    theme: 'dark',
    dailyGoal: 60,
    defaultSession: 'pomodoro',
    todoistToken: '',
    notionToken: '',
    autoSync: true,
    notifications: {
      studyReminders: true,
      breakAlerts: true,
      reviewNotifications: true,
    },
  });

  const [tempTokens, setTempTokens] = useState({
    todoist: '',
    notion: '',
  });

  const [notionDbIds, setNotionDbIds] = useState({
    content: '',
    logs: '',
  });

  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    todoist: { connected: false, message: 'Not configured', testing: false },
    notion: { connected: false, message: 'Not configured', testing: false },
  });

  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);

  const themeColors = colors[theme];
  const storage = HybridStorageService.getInstance();
  const todoistService = TodoistService.getInstance();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await storage.getSettings();
      setSettings(savedSettings);
      setTempTokens({
        todoist: savedSettings.todoistToken,
        notion: savedSettings.notionToken,
      });

      // Test existing connections
      if (savedSettings.todoistToken) {
        testTodoistConnection(savedSettings.todoistToken, false);
      }

      // Sound UI handled by global MiniPlayer
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      const updatedSettings: Settings = {
        ...settings,
        todoistToken: tempTokens.todoist,
        notionToken: tempTokens.notion,
      };

      await storage.saveSettings(updatedSettings);
      setSettings(updatedSettings);
      setHasUnsavedChanges(false);

      Alert.alert('Success', 'Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const testTodoistConnection = async (token?: string, showAlert = true) => {
    const testToken = token || tempTokens.todoist;
    if (!testToken.trim()) {
      setConnectionStatus((prev) => ({
        ...prev,
        todoist: {
          connected: false,
          message: 'Token required',
          testing: false,
        },
      }));
      return;
    }

    setConnectionStatus((prev) => ({
      ...prev,
      todoist: {
        connected: false,
        message: 'Testing connection...',
        testing: true,
      },
    }));

    try {
      todoistService.setApiToken(testToken);
      const result = await todoistService.testConnection();

      setConnectionStatus((prev) => ({
        ...prev,
        todoist: {
          connected: result.success,
          message: result.message,
          testing: false,
        },
      }));

      if (showAlert) {
        Alert.alert(
          result.success ? 'Connection Successful!' : 'Connection Failed',
          result.message,
          [{ text: 'OK' }],
        );
      }
    } catch (error: any) {
      const message = `Connection failed: ${error.message}`;
      setConnectionStatus((prev) => ({
        ...prev,
        todoist: { connected: false, message, testing: false },
      }));

      if (showAlert) {
        Alert.alert('Connection Error', message);
      }
    }
  };

  const handleSaveNotionIntegration = async () => {
    const supabaseService = SupabaseService.getInstance();

    // Validate inputs first
    if (!tempTokens.notion.trim()) {
      Alert.alert('Error', 'Notion token is required');
      return;
    }

    setConnectionStatus(prev => ({
      ...prev,
      notion: { connected: false, message: 'Saving...', testing: true }
    }));

    // Save to database
    const { error } = await supabaseService.updateUserProfile({
      notion_token: tempTokens.notion.trim(),
      notion_db_id: notionDbIds.content.trim() || null,
      notion_db_id_logs: notionDbIds.logs.trim() || null,
    });

    if (error) {
      Alert.alert('Save Failed', error.message);
      setConnectionStatus(prev => ({
        ...prev,
        notion: { connected: false, message: 'Save failed', testing: false }
      }));
      return;
    }

    // Test connection
    const { data, error: testError } = await supabaseService.syncNotionData('test-connection');

    if (testError) {
      Alert.alert('Connection Test Failed', testError.message);
      setConnectionStatus(prev => ({
        ...prev,
        notion: { connected: false, message: 'Test failed', testing: false }
      }));
    } else {
      Alert.alert('Success', 'Notion connected successfully!');
      setConnectionStatus(prev => ({
        ...prev,
        notion: { connected: true, message: 'Connected', testing: false }
      }));
    }
  };

  const testNotionConnection = async () => {
    if (!tempTokens.notion.trim()) {
      Alert.alert('Error', 'Please enter a Notion integration token');
      return;
    }

    setConnectionStatus((prev) => ({
      ...prev,
      notion: {
        connected: false,
        message: 'Testing connection...',
        testing: true,
      },
    }));

    try {
      const supabaseService = SupabaseService.getInstance();
      const result = await supabaseService.syncNotionData('test-connection');

      setConnectionStatus((prev) => ({
        ...prev,
        notion: {
          connected: !result.error,
          message: result.error ? result.error.message : 'Connection successful',
          testing: false,
        },
      }));

      Alert.alert(
        !result.error ? 'Connection Successful!' : 'Connection Failed',
        result.error ? result.error.message : 'Notion integration is working correctly',
        [{ text: 'OK' }],
      );
    } catch (error: any) {
      const message = `Connection failed: ${error.message}`;
      setConnectionStatus((prev) => ({
        ...prev,
        notion: { connected: false, message, testing: false },
      }));

      Alert.alert('Connection Error', message);
    }
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your flashcards, progress, and local data. This action cannot be undone.\n\nAre you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await storage.clearAllData();
              Alert.alert(
                'Data Cleared',
                'All local data has been cleared. The app will restart with default settings.',
                [{ text: 'OK', onPress: () => loadSettings() }],
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data. Please try again.');
            }
          },
        },
      ],
    );
  };

  const resetSoundLearning = async () => {
    try {
      await HybridStorageService.getInstance().resetOptimalProfiles();
      Alert.alert('Success', 'Sound personalization has been reset.');
    } catch (error) {
      console.error('Failed to reset sound learning:', error);
      Alert.alert('Error', 'Failed to reset sound learning.');
    }
  };

  const exportData = async () => {
    try {
      const exportString = await storage.exportAllData();

      // In a real app, you'd use react-native-share or similar
      Alert.alert(
        'Export Data',
        'Data export functionality will be implemented in the next update. This will allow you to backup all your learning data.',
        [{ text: 'OK' }],
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to export data. Please try again.');
    }
  };

  const handleThemeChange = (newTheme: ThemeType) => {
    setSettings((prev) => ({ ...prev, theme: newTheme }));
    setHasUnsavedChanges(true);
    if (onThemeChange) {
      onThemeChange(newTheme);
    }
  };

  const updateSetting = (key: keyof Settings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const updateNotificationSetting = (
    key: keyof Settings['notifications'],
    value: boolean,
  ) => {
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }));
    setHasUnsavedChanges(true);
  };

  const getConnectionStatusColor = (status: {
    connected: boolean;
    testing: boolean;
  }): string => {
    if (status.testing) return themeColors.warning;
    return status.connected ? themeColors.success : themeColors.error;
  };

  const getConnectionStatusIcon = (status: {
    connected: boolean;
    testing: boolean;
  }): string => {
    if (status.testing) return '⏳';
    return status.connected ? '✓' : '✗';
  };

  return (
    <ScreenContainer theme={theme}>
      <AppHeader
        title="Settings"
        theme={theme}
        onMenuPress={() => setMenuVisible(true)}
        rightComponent={
          hasUnsavedChanges ? (
            <TouchableOpacity onPress={saveSettings} disabled={saving}>
              <Text
                style={{
                  color: themeColors.primary,
                  fontSize: 16,
                  fontWeight: '600',
                }}
              >
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.container}
      >
        {/* App Preferences */}
        <GlassCard theme={theme} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            🎨 App Preferences
          </Text>

          {/* Theme Selection - Fixed Layout */}
          <View style={styles.themeSettingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: themeColors.text }]}>
                Theme
              </Text>
              <Text
                style={[
                  styles.settingDescription,
                  { color: themeColors.textSecondary },
                ]}
              >
                Choose your preferred app appearance
              </Text>
            </View>
          </View>

          <View style={styles.themeButtonsContainer}>
            <TouchableOpacity
              onPress={() => handleThemeChange('dark')}
              style={[
                styles.themeButton,
                settings.theme === 'dark' && {
                  backgroundColor: themeColors.primary,
                },
                { borderColor: themeColors.border },
              ]}
            >
              <Text
                style={[
                  styles.themeButtonText,
                  {
                    color:
                      settings.theme === 'dark' ? '#FFFFFF' : themeColors.text,
                  },
                ]}
              >
                🌙 Dark
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleThemeChange('light')}
              style={[
                styles.themeButton,
                settings.theme === 'light' && {
                  backgroundColor: themeColors.primary,
                },
                { borderColor: themeColors.border },
              ]}
            >
              <Text
                style={[
                  styles.themeButtonText,
                  {
                    color:
                      settings.theme === 'light' ? '#FFFFFF' : themeColors.text,
                  },
                ]}
              >
                ☀️ Light
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: themeColors.text }]}>
                Daily Goal (minutes)
              </Text>
              <Text
                style={[
                  styles.settingDescription,
                  { color: themeColors.textSecondary },
                ]}
              >
                Target daily focus time for optimal learning
              </Text>
            </View>
            <TextInput
              style={[
                styles.numberInput,
                {
                  borderColor: themeColors.border,
                  color: themeColors.text,
                  backgroundColor: themeColors.surfaceLight,
                },
              ]}
              value={settings.dailyGoal.toString()}
              onChangeText={(value) => {
                const numValue = parseInt(value) || 0;
                updateSetting(
                  'dailyGoal',
                  Math.min(Math.max(numValue, 1), 480),
                ); // 1-480 minutes
              }}
              keyboardType="numeric"
              maxLength={3}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: themeColors.text }]}>
                Auto-Sync
              </Text>
              <Text
                style={[
                  styles.settingDescription,
                  { color: themeColors.textSecondary },
                ]}
              >
                Automatically sync with external services
              </Text>
            </View>
            <Switch
              value={settings.autoSync}
              onValueChange={(value) => updateSetting('autoSync', value)}
              trackColor={{
                false: themeColors.border,
                true: themeColors.primary,
              }}
              thumbColor="#FFFFFF"
            />
          </View>
        </GlassCard>

        {/* API Integrations */}
        <GlassCard theme={theme} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            🔗 API Integrations
          </Text>

          {/* Todoist Integration - Fixed Container */}
          <View style={styles.integrationSection}>
            <View style={styles.integrationHeaderContainer}>
              <Text
                style={[styles.integrationTitle, { color: themeColors.text }]}
              >
                📋 Todoist
              </Text>
              <View style={styles.connectionStatusContainer}>
                <Text
                  style={[
                    styles.connectionStatusIcon,
                    {
                      color: getConnectionStatusColor(connectionStatus.todoist),
                    },
                  ]}
                >
                  {getConnectionStatusIcon(connectionStatus.todoist)}
                </Text>
                <Text
                  style={[
                    styles.connectionStatusText,
                    {
                      color: getConnectionStatusColor(connectionStatus.todoist),
                    },
                  ]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {connectionStatus.todoist.message}
                </Text>
              </View>
            </View>

            <TextInput
              style={[
                styles.tokenInput,
                {
                  borderColor: themeColors.border,
                  color: themeColors.text,
                  backgroundColor: themeColors.surfaceLight,
                },
              ]}
              placeholder="Enter your Todoist API token..."
              placeholderTextColor={themeColors.textMuted}
              value={tempTokens.todoist}
              onChangeText={(text) => {
                setTempTokens((prev) => ({ ...prev, todoist: text }));
                setHasUnsavedChanges(true);
              }}
              secureTextEntry={tempTokens.todoist.length > 0}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.integrationActions}>
              <Button
                title="Test Connection"
                onPress={() => testTodoistConnection()}
                variant="outline"
                size="small"
                theme={theme}
                disabled={
                  connectionStatus.todoist.testing || !tempTokens.todoist.trim()
                }
                style={styles.testButton}
              />

              <TouchableOpacity
                onPress={() =>
                  Alert.alert(
                    'Get Todoist API Token',
                    '1. Go to todoist.com/prefs/integrations\n2. Find "API token" section\n3. Copy your token\n4. Paste it in the field above',
                  )
                }
                style={styles.helpButton}
              >
                <Text
                  style={[
                    styles.helpButtonText,
                    { color: themeColors.primary },
                  ]}
                >
                  How to get token?
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Notion Integration - Fixed Container */}
          <View style={styles.integrationSection}>
            <View style={styles.integrationHeaderContainer}>
              <Text
                style={[styles.integrationTitle, { color: themeColors.text }]}
              >
                📝 Notion
              </Text>
              <View style={styles.connectionStatusContainer}>
                <Text
                  style={[
                    styles.connectionStatusIcon,
                    {
                      color: getConnectionStatusColor(connectionStatus.notion),
                    },
                  ]}
                >
                  {getConnectionStatusIcon(connectionStatus.notion)}
                </Text>
                <Text
                  style={[
                    styles.connectionStatusText,
                    {
                      color: getConnectionStatusColor(connectionStatus.notion),
                    },
                  ]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {connectionStatus.notion.message}
                </Text>
              </View>
            </View>

            <TextInput
              style={[
                styles.tokenInput,
                {
                  borderColor: themeColors.border,
                  color: themeColors.text,
                  backgroundColor: themeColors.surfaceLight,
                },
              ]}
              placeholder="Enter your Notion integration secret..."
              placeholderTextColor={themeColors.textMuted}
              value={tempTokens.notion}
              onChangeText={(text) => {
                setTempTokens((prev) => ({ ...prev, notion: text }));
                setHasUnsavedChanges(true);
              }}
              secureTextEntry={tempTokens.notion.length > 0}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={[
                styles.tokenInput,
                {
                  borderColor: themeColors.border,
                  color: themeColors.text,
                  backgroundColor: themeColors.surfaceLight,
                },
              ]}
              placeholder="Content Database ID..."
              placeholderTextColor={themeColors.textMuted}
              value={notionDbIds.content}
              onChangeText={(text) => {
                setNotionDbIds((prev) => ({ ...prev, content: text }));
                setHasUnsavedChanges(true);
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={[
                styles.tokenInput,
                {
                  borderColor: themeColors.border,
                  color: themeColors.text,
                  backgroundColor: themeColors.surfaceLight,
                },
              ]}
              placeholder="Logs Database ID..."
              placeholderTextColor={themeColors.textMuted}
              value={notionDbIds.logs}
              onChangeText={(text) => {
                setNotionDbIds((prev) => ({ ...prev, logs: text }));
                setHasUnsavedChanges(true);
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.integrationActions}>
              <Button
                title="Save Integration"
                onPress={handleSaveNotionIntegration}
                variant="primary"
                size="small"
                theme={theme}
                disabled={
                  connectionStatus.notion.testing || !tempTokens.notion.trim()
                }
                style={styles.saveButton}
              />

              <Button
                title="Test Connection"
                onPress={testNotionConnection}
                variant="outline"
                size="small"
                theme={theme}
                disabled={
                  connectionStatus.notion.testing || !tempTokens.notion.trim()
                }
                style={styles.testButton}
              />

              <TouchableOpacity
                onPress={() =>
                  Alert.alert(
                    'Get Notion Integration Token',
                    '1. Go to notion.so/my-integrations\n2. Create new integration\n3. Copy the "Internal Integration Token"\n4. Share your pages with the integration',
                  )
                }
                style={styles.helpButton}
              >
                <Text
                  style={[
                    styles.helpButtonText,
                    { color: themeColors.primary },
                  ]}
                >
                  How to get token?
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sync Progress Overlay */}
          {syncProgress && (
            <View style={styles.syncOverlay}>
              <View style={[styles.syncProgressCard, { backgroundColor: themeColors.surface }]}>
                <Text style={[styles.syncProgressTitle, { color: themeColors.text }]}>
                  🔄 Syncing with Notion
                </Text>
                <Text style={[styles.syncProgressMessage, { color: themeColors.textSecondary }]}>
                  {syncProgress}
                </Text>
                <View style={styles.syncProgressBar}>
                  <View style={[styles.syncProgressFill, { backgroundColor: themeColors.primary }]} />
                </View>
              </View>
            </View>
          )}
        </GlassCard>

        {/* Notifications */}
        <GlassCard theme={theme} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            🔔 Notifications
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: themeColors.text }]}>
                Study Reminders
              </Text>
              <Text
                style={[
                  styles.settingDescription,
                  { color: themeColors.textSecondary },
                ]}
              >
                Get reminded when it's time to review flashcards
              </Text>
            </View>
            <Switch
              value={settings.notifications.studyReminders}
              onValueChange={(value) =>
                updateNotificationSetting('studyReminders', value)
              }
              trackColor={{
                false: themeColors.border,
                true: themeColors.primary,
              }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: themeColors.text }]}>
                Break Alerts
              </Text>
              <Text
                style={[
                  styles.settingDescription,
                  { color: themeColors.textSecondary },
                ]}
              >
                Remind you to take breaks during long focus sessions
              </Text>
            </View>
            <Switch
              value={settings.notifications.breakAlerts}
              onValueChange={(value) =>
                updateNotificationSetting('breakAlerts', value)
              }
              trackColor={{
                false: themeColors.border,
                true: themeColors.primary,
              }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: themeColors.text }]}>
                Review Notifications
              </Text>
              <Text
                style={[
                  styles.settingDescription,
                  { color: themeColors.textSecondary },
                ]}
              >
                Notify when cards are due for review
              </Text>
            </View>
            <Switch
              value={settings.notifications.reviewNotifications}
              onValueChange={(value) =>
                updateNotificationSetting('reviewNotifications', value)
              }
              trackColor={{
                false: themeColors.border,
                true: themeColors.primary,
              }}
              thumbColor="#FFFFFF"
            />
          </View>
        </GlassCard>

        {/* Learning Algorithms */}
        <GlassCard theme={theme} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            🧠 Learning Algorithms
          </Text>

          <View style={styles.algorithmInfo}>
            <Text
              style={[styles.algorithmTitle, { color: themeColors.primary }]}
            >
              FSRS (Free Spaced Repetition Scheduler)
            </Text>
            <Text
              style={[
                styles.algorithmDescription,
                { color: themeColors.textSecondary },
              ]}
            >
              Currently active for flashcard scheduling. This algorithm
              optimizes review intervals based on your performance and cognitive
              load.
            </Text>
          </View>

          <View style={styles.algorithmInfo}>
            <Text
              style={[styles.algorithmTitle, { color: themeColors.primary }]}
            >
              RSVP (Rapid Serial Visual Presentation)
            </Text>
            <Text
              style={[
                styles.algorithmDescription,
                { color: themeColors.textSecondary },
              ]}
            >
              Currently active for speed reading training. Eliminates
              subvocalization and eye movement to increase reading speed.
            </Text>
          </View>
        </GlassCard>

        {/* Data Management */}
        <GlassCard theme={theme} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            💾 Data Management
          </Text>

          <View style={styles.dataActions}>
            <Button
              title="Export Data"
              onPress={exportData}
              variant="outline"
              size="medium"
              theme={theme}
              style={styles.dataButton}
            />

            <Button
              title="Clear All Data"
              onPress={clearAllData}
              variant="outline"
              size="medium"
              theme={theme}
              style={[styles.dataButton, { borderColor: themeColors.error }]}
            />
          </View>

          <View style={[styles.dataActions, { marginTop: 12 }]}>
            <Button
              title="Reset Sound Learning"
              onPress={() =>
                Alert.alert(
                  'Reset Sound Learning',
                  'This will clear personalized soundscape adjustments. Continue?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reset',
                      style: 'destructive',
                      onPress: resetSoundLearning,
                    },
                  ],
                )
              }
              variant="outline"
              size="medium"
              theme={theme}
              style={[styles.dataButton, { borderColor: themeColors.primary }]}
            />
          </View>

          <Text style={[styles.dataWarning, { color: themeColors.textMuted }]}>
            ⚠️ Data clearing is permanent and cannot be undone. Export your data
            first if you want to keep a backup.
          </Text>
        </GlassCard>

        {/* App Info */}
        <GlassCard theme={theme} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            ℹ️ App Information
          </Text>

          <View style={styles.infoRow}>
            <Text
              style={[styles.infoLabel, { color: themeColors.textSecondary }]}
            >
              Version:
            </Text>
            <Text style={[styles.infoValue, { color: themeColors.text }]}>
              1.0.0
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text
              style={[styles.infoLabel, { color: themeColors.textSecondary }]}
            >
              Build:
            </Text>
            <Text style={[styles.infoValue, { color: themeColors.text }]}>
              Evidence-Based Learning System
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text
              style={[styles.infoLabel, { color: themeColors.textSecondary }]}
            >
              Framework:
            </Text>
            <Text style={[styles.infoValue, { color: themeColors.text }]}>
              React Native + TypeScript
            </Text>
          </View>
        </GlassCard>

        {/* Save Button */}
        {hasUnsavedChanges && (
          <View style={styles.saveSection}>
            <Button
              title={saving ? 'Saving Settings...' : 'Save All Changes'}
              onPress={saveSettings}
              variant="primary"
              size="large"
              theme={theme}
              disabled={saving}
              style={styles.saveButton}
            />
          </View>
        )}
      </ScrollView>

      <HamburgerMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={onNavigate}
        currentScreen="settings"
        theme={theme}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  container: {
    padding: spacing.lg,
    paddingTop: 100, // Space for floating nav bar
    paddingBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.lg,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.lg,
  },
  settingLabel: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  settingDescription: {
    ...typography.bodySmall,
    lineHeight: 18,
  },

  // Fixed Theme Selection Layout
  themeSettingRow: {
    marginBottom: spacing.md,
  },
  themeButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  themeButton: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeButtonText: {
    ...typography.bodySmall,
    fontWeight: '600',
    textAlign: 'center',
  },

  numberInput: {
    borderWidth: 2,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    textAlign: 'center',
    minWidth: 80,
  },

  // Fixed API Integrations Layout
  integrationSection: {
    marginBottom: spacing.xl,
  },
  integrationHeaderContainer: {
    flexDirection: 'column',
    marginBottom: spacing.md,
  },
  integrationTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  connectionStatusContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    paddingRight: spacing.sm,
  },
  connectionStatusIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
    marginTop: 2,
  },
  connectionStatusText: {
    ...typography.bodySmall,
    fontWeight: '600',
    flex: 1,
    flexShrink: 1,
  },
  tokenInput: {
    borderWidth: 2,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    marginBottom: spacing.md,
  },
  integrationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  testButton: {
    flex: 0.4,
  },
  helpButton: {
    flex: 0.5,
  },
  helpButtonText: {
    ...typography.bodySmall,
    textAlign: 'right',
    textDecorationLine: 'underline',
  },

  // Learning Algorithms
  algorithmInfo: {
    marginBottom: spacing.lg,
  },
  algorithmTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  algorithmDescription: {
    ...typography.bodySmall,
    lineHeight: 20,
  },

  // Data Management
  dataActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  dataButton: {
    flex: 1,
  },
  dataWarning: {
    ...typography.caption,
    textAlign: 'center',
    lineHeight: 16,
  },

  // App Info
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoLabel: {
    ...typography.bodySmall,
  },
  infoValue: {
    ...typography.bodySmall,
    fontWeight: '600',
  },

  // Save Section
  saveSection: {
    marginTop: spacing.lg,
  },
  saveButton: {
    width: '100%',
  },
  smallButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sync Progress Overlay
  syncOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  syncProgressCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    minWidth: 280,
  },
  syncProgressTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  syncProgressMessage: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  syncProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  syncProgressFill: {
    height: '100%',
    width: '60%', // Fixed progress for demo
    borderRadius: 2,
  },
});
