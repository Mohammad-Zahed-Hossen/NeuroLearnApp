/**
 * NotionDashboardScreen - Central Knowledge Bridge Interface
 *
 * Provides comprehensive Notion integration UI with adaptive design,
 * neural link visualization, and context-aware interactions
 *
 * Features:
 * - Glassmorphic adaptive UI based on Cognitive Aura
 * - Real-time sync status and controls
 * - Neural Mind-Notion sync map visualization
 * - Knowledge bridges display
 * - Quick actions and sound feedback
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Linking,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
// import { withSequence } from 'react-native-reanimated'; // Not available in this version

// Components
import { GlassCard } from '../../components/GlassComponents';
import { AppHeader } from '../../components/navigation/Navigation';

// Services
import NotionSyncService from '../../services/integrations/NotionSyncService';
import {
  CognitiveAuraService,
  AuraState,
} from '../../services/ai/CognitiveAuraService';
import { CognitiveSoundscapeEngine } from '../../services/learning/CognitiveSoundscapeEngine';

// Types & Utils
import { colors, spacing, typography, borderRadius } from '../../theme/colors';
import { ThemeType } from '../../theme/colors';
import { NOTION_CONFIG } from '../../config/integrations';

interface NotionDashboardScreenProps {
  theme: ThemeType;
  onNavigate: (screen: string) => void;
  oauthCode?: string;
}

interface KnowledgeBridge {
  id: string;
  title: string;
  notionTarget: string;
  description: string;
  status: 'connected' | 'syncing' | 'error' | 'disconnected';
  lastSync?: Date;
  icon: string;
  color: string;
  syncEnabled: boolean;
}

interface NeuralLink {
  neuralNodeId: string;
  notionPageTitle: string;
  notionPageUrl: string;
  linkCount: number;
  confidenceAvg: number;
  lastUpdated: Date;
}

interface SyncStats {
  totalPages: number;
  totalBlocks: number;
  totalLinks: number;
  lastSync?: Date;
  syncStatus: 'current' | 'pending' | 'stale';
  pendingChanges: number;
  successfulSyncsToday: number;
}

export const NotionDashboardScreen: React.FC<NotionDashboardScreenProps> = ({
  theme,
  onNavigate,
  oauthCode,
}) => {
  // ======================== STATE ========================
  const [isConnected, setIsConnected] = useState(false);
  const [workspaceInfo, setWorkspaceInfo] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [syncStats, setSyncStats] = useState<SyncStats>({
    totalPages: 0,
    totalBlocks: 0,
    totalLinks: 0,
    syncStatus: 'stale',
    pendingChanges: 0,
    successfulSyncsToday: 0,
  });
  const [neuralLinks, setNeuralLinks] = useState<NeuralLink[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [cognitiveState, setCognitiveState] = useState<string>('balanced');
  const [error, setError] = useState<string | null>(null);

  // Services
  const notionSync = useMemo(() => NotionSyncService.getInstance(), []);
  const cognitiveAura = useMemo(() => CognitiveAuraService.getInstance(), []);
  const soundscape = useMemo(() => CognitiveSoundscapeEngine.getInstance(), []);

  // Theme and styling
  const { width, height } = Dimensions.get('window');
  const themeColors = colors[theme];

  // Animations
  const syncPulse = useSharedValue(1);
  const connectionGlow = useSharedValue(0);
  const neuralMapScale = useSharedValue(1);

  // ======================== KNOWLEDGE BRIDGES CONFIG ========================
  const knowledgeBridges: KnowledgeBridge[] = [
    {
      id: 'learning_journal',
      title: 'Learning Journal',
      notionTarget: 'Daily Learning Log',
      description: 'Automatic session summaries and insights',
      status: isConnected ? 'connected' : 'disconnected',
      lastSync: syncStats.lastSync,
      icon: 'book-open-variant',
      color: '#3B82F6',
      syncEnabled: true,
    },
    {
      id: 'focus_metrics',
      title: 'Focus Metrics',
      notionTarget: 'Focus Tracker',
      description: 'Performance analytics and patterns',
      status: isConnected ? 'connected' : 'disconnected',
      lastSync: syncStats.lastSync,
      icon: 'target',
      color: '#10B981',
      syncEnabled: true,
    },
    {
      id: 'ai_insights',
      title: 'AI Insights',
      notionTarget: 'Cognitive Insights',
      description: 'Generated reflections and recommendations',
      status: isConnected ? 'connected' : 'disconnected',
      lastSync: syncStats.lastSync,
      icon: 'brain',
      color: '#8B5CF6',
      syncEnabled: true,
    },
  ];

  // ======================== EFFECTS ========================

  useEffect(() => {
    initializeDashboard();

    // Set up cognitive aura listener for adaptive UI
    const handleAuraUpdate = (state: AuraState) => {
      setCognitiveState(state.context);
      updateAdaptiveColors(state.context);
    };

    cognitiveAura.on('_aura_updated', handleAuraUpdate);

    const unsubscribe = () => {
      cognitiveAura.off('_aura_updated', handleAuraUpdate);
    };

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Auto-refresh data every 30 seconds when connected
    if (isConnected) {
      const interval = setInterval(() => {
        refreshSyncStats();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isConnected]);

  // Handle OAuth code when provided
  useEffect(() => {
    if (oauthCode) {
      handleOAuthCallback(oauthCode);
    }
  }, [oauthCode]);

  // Handle deep links for OAuth callback
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      if (url.startsWith('neurolearn://notion/callback')) {
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');
        if (code) {
          handleOAuthCallback(code);
        }
      }
    };

    // Check initial URL
    Linking.getInitialURL().then((url) => {
      if (url && url.startsWith('neurolearn://notion/callback')) {
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');
        if (code) {
          handleOAuthCallback(code);
        }
      }
    });

    // Listen for URL events
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription?.remove();
    };
  }, []);

  // ======================== INITIALIZATION ========================

  const initializeDashboard = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      // Check connection status
      const connected = notionSync.isConnected();
      setIsConnected(connected);

      if (connected) {
        // Get workspace info
        const workspace = notionSync.getWorkspaceInfo();
        setWorkspaceInfo(workspace);

        // Load sync statistics
        await refreshSyncStats();

        // Load neural links
        await refreshNeuralLinks();

        // Animate connection indicator
        connectionGlow.value = withTiming(1, { duration: 1000 });

        console.log('✅ Notion Dashboard initialized successfully');
      } else {
        connectionGlow.value = withTiming(0, { duration: 500 });
        console.log('⚠️ Notion not connected');
      }
    } catch (error) {
      console.error('❌ Dashboard initialization failed:', error);
      setError('Failed to initialize dashboard');
    } finally {
      setIsRefreshing(false);
    }
  }, [notionSync, connectionGlow]);

  const refreshSyncStats = useCallback(async () => {
    try {
      const stats = await notionSync.getSyncStats();
      setSyncStats(stats);

      // Animate sync status indicator
      if (stats.syncStatus === 'current') {
        syncPulse.value = withTiming(
          withSpring(1.1, { damping: 15 }),
          withSpring(1.0, { damping: 15 }),
        );
      }
    } catch (error) {
      console.error('❌ Failed to refresh sync stats:', error);
    }
  }, [notionSync, syncPulse]);

  const refreshNeuralLinks = useCallback(async () => {
    try {
      const links = await notionSync.getNeuralLinks();
      setNeuralLinks(links);

      // Animate neural map
      neuralMapScale.value = withTiming(
        withSpring(1.05, { damping: 20 }),
        withSpring(1.0, { damping: 20 }),
      );
    } catch (error) {
      console.error('❌ Failed to refresh neural links:', error);
    }
  }, [notionSync, neuralMapScale]);

  // Handle OAuth callback to exchange code for token and update connection status
  const handleOAuthCallback = useCallback(async (code: string) => {
    try {
      setIsRefreshing(true);
      setError(null);

      const result = await notionSync.exchangeOAuthCode(code);
      if (result.success) {
        setIsConnected(true);
        const workspace = notionSync.getWorkspaceInfo();
        setWorkspaceInfo(workspace);
        await refreshSyncStats();
        await refreshNeuralLinks();
        Alert.alert('Connected', 'Successfully connected to Notion.');
      } else {
        throw new Error(result.error || 'OAuth connection failed');
      }
    } catch (error) {
      console.error('❌ OAuth callback failed:', error);
      setError(error instanceof Error ? error.message : 'OAuth connection failed');
      Alert.alert('Connection Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsRefreshing(false);
    }
  }, [notionSync, refreshSyncStats, refreshNeuralLinks]);

  // ======================== SYNC ACTIONS ========================

  const handleSyncNow = useCallback(async () => {
    if (isSyncing || !isConnected) return;

    try {
      setIsSyncing(true);
      setError(null);

      // Play sync start sound
      soundscape.playUIFeedback('sync_start');

      // Start sync animation
      syncPulse.value = withTiming(1.2, { duration: 500 });

      console.log('🔄 Starting manual sync...');
      const syncSession = await notionSync.syncPages('incremental');

      if (syncSession.status === 'completed') {
        // Success feedback
        soundscape.playUIFeedback('success');

        // Refresh data
        await Promise.all([refreshSyncStats(), refreshNeuralLinks()]);

        // Reset pulse animation
        syncPulse.value = withSpring(1.0, { damping: 15 });

        // Show success message briefly
        Alert.alert(
          'Sync Complete',
          `Synced ${syncSession.pagesSynced} pages, ${syncSession.blocksSynced} blocks, and created ${syncSession.linksCreated} neural links.`,
        );

        console.log('✅ Manual sync completed successfully');
      } else {
        throw new Error(syncSession.errorDetails || 'Sync failed');
      }
    } catch (error) {
      console.error('❌ Manual sync failed:', error);

      // Error feedback
      soundscape.playUIFeedback('error');
      syncPulse.value = withSpring(1.0, { damping: 15 });

      setError(error instanceof Error ? error.message : 'Sync failed');

      Alert.alert(
        'Sync Failed',
        error instanceof Error ? error.message : 'Unknown error occurred',
        [
          { text: 'OK', style: 'default' },
          { text: 'Retry', onPress: handleSyncNow },
        ],
      );
    } finally {
      setIsSyncing(false);
    }
  }, [
    isSyncing,
    isConnected,
    notionSync,
    soundscape,
    syncPulse,
    refreshSyncStats,
    refreshNeuralLinks,
  ]);

  const handleAutoSyncToggle = useCallback(async () => {
    const newValue = !autoSyncEnabled;
    setAutoSyncEnabled(newValue);

    // Play toggle sound
    soundscape.playUIFeedback(newValue ? 'enable' : 'disable');

    // TODO: Update user preferences in storage
    console.log(`🔧 Auto-sync ${newValue ? 'enabled' : 'disabled'}`);
  }, [autoSyncEnabled, soundscape]);

  const handleBackupNow = useCallback(async () => {
    try {
      setIsRefreshing(true);

      soundscape.playUIFeedback('backup_start');

      const result = await notionSync.backupToSupabase();

      if (result.success) {
        soundscape.playUIFeedback('success');
        Alert.alert(
          'Backup Complete',
          'Your Notion data has been backed up successfully.',
        );
      } else {
        throw new Error(result.error || 'Backup failed');
      }
    } catch (error) {
      console.error('❌ Backup failed:', error);
      soundscape.playUIFeedback('error');
      Alert.alert(
        'Backup Failed',
        error instanceof Error ? error.message : 'Unknown error',
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [notionSync, soundscape]);

  // ======================== NAVIGATION ACTIONS ========================

  const handleConnectToNotion = useCallback(() => {
    // Navigate to Notion OAuth flow
    Alert.alert(
      'Connect to Notion',
      'You will be redirected to Notion to authorize the connection.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            const notionAuthUrl = `${NOTION_CONFIG.AUTH_URL}?` +
              `client_id=${NOTION_CONFIG.CLIENT_ID}&` +
              `redirect_uri=${encodeURIComponent(NOTION_CONFIG.REDIRECT_URI)}&` +
              `response_type=code&` +
              `owner=user`;

            Linking.openURL(notionAuthUrl);
          },
        },
      ],
    );
  }, []);

  const handleOpenInNotion = useCallback(
    (pageUrl?: string) => {
      if (pageUrl) {
        Linking.openURL(pageUrl);
        soundscape.playUIFeedback('navigation');
      } else {
        Alert.alert(
          'No Page Selected',
          'Select a linked page to open in Notion.',
        );
      }
    },
    [soundscape],
  );

  const handleAttachNode = useCallback(() => {
    // Navigate to neural mind map for node selection
    onNavigate('neural_mind_map');
    soundscape.playUIFeedback('navigation');
  }, [onNavigate, soundscape]);

  const handleResync = useCallback(() => {
    handleSyncNow();
  }, [handleSyncNow]);

  // ======================== ADAPTIVE UI ========================

  const updateAdaptiveColors = useCallback(
    (state: string) => {
      // Update UI colors based on cognitive state
      const stateColors = {
        focused: '#3B82F6',
        creative: '#8B5CF6',
        relaxed: '#10B981',
        energetic: '#F59E0B',
        balanced: themeColors.primary,
      };

      // Animation could be added here for color transitions
    },
    [themeColors.primary],
  );

  const getStatusColor = useCallback(
    (status: string) => {
      switch (status) {
        case 'connected':
        case 'synced':
        case 'current':
          return '#10B981'; // Green
        case 'syncing':
        case 'pending':
          return '#F59E0B'; // Amber
        case 'error':
          return '#EF4444'; // Red
        case 'stale':
          return '#6B7280'; // Gray
        default:
          return themeColors.textSecondary;
      }
    },
    [themeColors.textSecondary],
  );

  const formatTimeAgo = useCallback((date?: Date) => {
    if (!date) return 'Never';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }, []);

  // ======================== ANIMATION STYLES ========================

  const connectionGlowStyle = useAnimatedStyle(() => {
    const opacity = connectionGlow.value === null || connectionGlow.value === undefined || isNaN(connectionGlow.value) ? 0 : connectionGlow.value;
    return {
      shadowColor: isConnected ? '#10B981' : '#EF4444',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: opacity * 0.6,
      shadowRadius: opacity * 10,
      elevation: opacity * 5,
    };
  });

  const syncPulseStyle = useAnimatedStyle(() => {
    const scaleValue = syncPulse.value === null || syncPulse.value === undefined || isNaN(syncPulse.value) ? 1 : syncPulse.value;
    return {
      transform: [{ scale: scaleValue }],
    };
  });

  const neuralMapStyle = useAnimatedStyle(() => {
    const scaleValue = neuralMapScale.value === null || neuralMapScale.value === undefined || isNaN(neuralMapScale.value) ? 1 : neuralMapScale.value;
    return {
      transform: [{ scale: scaleValue }],
    };
  });

  // ======================== RENDER METHODS ========================

  const renderConnectionStatus = () => (
    <Animated.View style={[styles.connectionStatus, connectionGlowStyle]}>
      <GlassCard
        theme={theme}
        style={[
          styles.statusCard,
          { borderColor: getStatusColor(isConnected ? 'connected' : 'error') },
        ]}
      >
        <View style={styles.statusHeader}>
          <Icon
            name={isConnected ? 'check-circle' : 'alert-circle'}
            size={24}
            color={getStatusColor(isConnected ? 'connected' : 'error')}
          />
          <Text style={[styles.statusTitle, { color: themeColors.text }]}>
            {isConnected
              ? `🔗 Connected to ${workspaceInfo?.name || 'Notion'}`
              : '❌ Not Connected'}
          </Text>

          <Animated.View style={syncPulseStyle}>
            <TouchableOpacity
              style={[
                styles.syncButton,
                { opacity: isConnected && !isSyncing ? 1 : 0.5 },
              ]}
              onPress={handleSyncNow}
              disabled={!isConnected || isSyncing}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Icon name="sync" size={20} color="white" />
              )}
              <Text style={styles.syncButtonText}>
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </GlassCard>
    </Animated.View>
  );

  const renderKnowledgeBridges = () => (
    <GlassCard theme={theme} style={styles.sectionCard}>
      <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
        📚 Knowledge Bridges
      </Text>
      <Text
        style={[styles.sectionSubtitle, { color: themeColors.textSecondary }]}
      >
        Automated connections between NeuroLearn and Notion
      </Text>

      <View style={styles.bridgesContainer}>
        {knowledgeBridges.map((bridge) => (
          <TouchableOpacity
            key={bridge.id}
            style={[styles.bridgeCard, { borderLeftColor: bridge.color }]}
            onPress={() => {
              soundscape.playUIFeedback('tap');
              // Could navigate to specific bridge details
            }}
          >
            <View style={styles.bridgeHeader}>
              <Icon name={bridge.icon} size={20} color={bridge.color} />
              <Text style={[styles.bridgeTitle, { color: themeColors.text }]}>
                {bridge.title}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(bridge.status) },
                ]}
              >
                <Text style={styles.statusBadgeText}>{bridge.status}</Text>
              </View>
            </View>

            <Text
              style={[
                styles.bridgeTarget,
                { color: themeColors.textSecondary },
              ]}
            >
              → Linked with "{bridge.notionTarget}" Notion DB
            </Text>
            <Text
              style={[
                styles.bridgeDescription,
                { color: themeColors.textSecondary },
              ]}
            >
              {bridge.description}
            </Text>

            {bridge.lastSync && (
              <Text
                style={[
                  styles.bridgeLastSync,
                  { color: themeColors.textMuted },
                ]}
              >
                Last sync: {formatTimeAgo(bridge.lastSync)}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </GlassCard>
  );

  const renderNeuralSyncMap = () => (
    <Animated.View style={neuralMapStyle}>
      <GlassCard theme={theme} style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
          🧠 Mind–Notion Sync Map
        </Text>
        <Text
          style={[styles.sectionSubtitle, { color: themeColors.textSecondary }]}
        >
          Visual map showing links between Neural Nodes ↔ Notion Pages
        </Text>

        {neuralLinks.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.neuralLinksScroll}
          >
            {neuralLinks.map((link, index) => (
              <TouchableOpacity
                key={`${link.neuralNodeId}-${index}`}
                style={styles.neuralLinkCard}
                onPress={() => handleOpenInNotion(link.notionPageUrl)}
              >
                <LinearGradient
                  colors={[
                    themeColors.primary + '20',
                    themeColors.primary + '10',
                  ]}
                  style={styles.neuralLinkGradient}
                >
                  <View style={styles.neuralLinkHeader}>
                    <Icon name="brain" size={16} color={themeColors.primary} />
                    <Text
                      style={[styles.neuralNodeId, { color: themeColors.text }]}
                      numberOfLines={1}
                    >
                      {link.neuralNodeId}
                    </Text>
                  </View>

                  <View style={styles.neuralLinkArrow}>
                    <Icon
                      name="arrow-right"
                      size={12}
                      color={themeColors.textSecondary}
                    />
                  </View>

                  <View style={styles.neuralLinkFooter}>
                    <Icon
                      name="file-document"
                      size={16}
                      color={themeColors.secondary}
                    />
                    <Text
                      style={[
                        styles.notionPageTitle,
                        { color: themeColors.text },
                      ]}
                      numberOfLines={2}
                    >
                      {link.notionPageTitle}
                    </Text>
                  </View>

                  <View style={styles.linkMeta}>
                    <Text
                      style={[
                        styles.linkCount,
                        { color: themeColors.textSecondary },
                      ]}
                    >
                      {link.linkCount} links
                    </Text>
                    <Text
                      style={[
                        styles.confidence,
                        { color: themeColors.primary },
                      ]}
                    >
                      {Math.round(link.confidenceAvg * 100)}%
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyNeuralMap}>
            <Icon
              name="brain"
              size={48}
              color={themeColors.textSecondary}
              style={{ opacity: 0.5 }}
            />
            <Text
              style={[styles.emptyText, { color: themeColors.textSecondary }]}
            >
              {isConnected
                ? 'No neural links found yet'
                : 'Connect to Notion to see neural links'}
            </Text>
            {isConnected && (
              <TouchableOpacity
                style={styles.createLinkButton}
                onPress={handleAttachNode}
              >
                <Text
                  style={[
                    styles.createLinkText,
                    { color: themeColors.primary },
                  ]}
                >
                  Create First Link
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </GlassCard>
    </Animated.View>
  );

  const renderSyncStats = () => (
    <GlassCard theme={theme} style={styles.sectionCard}>
      <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
        📊 Notion Sync Stats
      </Text>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text
            style={[
              styles.statValue,
              { color: getStatusColor(syncStats.syncStatus) },
            ]}
          >
            {syncStats.totalPages}
          </Text>
          <Text
            style={[styles.statLabel, { color: themeColors.textSecondary }]}
          >
            Synced Pages
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text
            style={[
              styles.statValue,
              { color: getStatusColor(syncStats.syncStatus) },
            ]}
          >
            {syncStats.totalBlocks}
          </Text>
          <Text
            style={[styles.statLabel, { color: themeColors.textSecondary }]}
          >
            Content Blocks
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: themeColors.primary }]}>
            {syncStats.totalLinks}
          </Text>
          <Text
            style={[styles.statLabel, { color: themeColors.textSecondary }]}
          >
            Neural Links
          </Text>
        </View>
      </View>

      <View style={styles.syncMetadata}>
        <View style={styles.syncMetaRow}>
          <Text
            style={[styles.syncMetaLabel, { color: themeColors.textSecondary }]}
          >
            Last Sync:
          </Text>
          <Text
            style={[
              styles.syncMetaValue,
              { color: getStatusColor(syncStats.syncStatus) },
            ]}
          >
            {formatTimeAgo(syncStats.lastSync)}
          </Text>
        </View>

        <View style={styles.syncMetaRow}>
          <Text
            style={[styles.syncMetaLabel, { color: themeColors.textSecondary }]}
          >
            Status:
          </Text>
          <Text
            style={[
              styles.syncMetaValue,
              { color: getStatusColor(syncStats.syncStatus) },
            ]}
          >
            {syncStats.syncStatus.charAt(0).toUpperCase() +
              syncStats.syncStatus.slice(1)}
          </Text>
        </View>

        {syncStats.pendingChanges > 0 && (
          <View style={styles.syncMetaRow}>
            <Text
              style={[
                styles.syncMetaLabel,
                { color: themeColors.textSecondary },
              ]}
            >
              Pending Changes:
            </Text>
            <Text
              style={[
                styles.syncMetaValue,
                { color: getStatusColor('pending') },
              ]}
            >
              {syncStats.pendingChanges}
            </Text>
          </View>
        )}
      </View>
    </GlassCard>
  );

  const renderAutoSyncControls = () => (
    <GlassCard theme={theme} style={styles.sectionCard}>
      <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
        🔄 Auto-Sync Controls
      </Text>

      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[
            styles.toggleControl,
            {
              backgroundColor: autoSyncEnabled
                ? themeColors.primary
                : themeColors.surface,
            },
          ]}
          onPress={handleAutoSyncToggle}
        >
          <Icon
            name={autoSyncEnabled ? 'toggle-switch' : 'toggle-switch-off'}
            size={24}
            color={autoSyncEnabled ? 'white' : themeColors.textSecondary}
          />
          <Text
            style={[
              styles.toggleText,
              { color: autoSyncEnabled ? 'white' : themeColors.textSecondary },
            ]}
          >
            Enable Auto Sync
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionControl,
            { backgroundColor: themeColors.secondary + '20' },
          ]}
          onPress={handleBackupNow}
          disabled={!isConnected}
        >
          <Icon name="cloud-upload" size={20} color={themeColors.secondary} />
          <Text style={[styles.actionText, { color: themeColors.secondary }]}>
            Backup Now
          </Text>
        </TouchableOpacity>
      </View>
    </GlassCard>
  );

  const renderQuickActions = () => (
    <GlassCard theme={theme} style={styles.sectionCard}>
      <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
        🧩 Quick Actions
      </Text>

      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: '#3B82F6' + '20', borderColor: '#3B82F6' },
          ]}
          onPress={() => handleOpenInNotion()}
          disabled={!isConnected}
        >
          <Icon name="open-in-new" size={20} color="#3B82F6" />
          <Text style={[styles.actionButtonText, { color: '#3B82F6' }]}>
            Open in Notion
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: '#10B981' + '20', borderColor: '#10B981' },
          ]}
          onPress={handleResync}
          disabled={!isConnected || isSyncing}
        >
          <Icon name="sync" size={20} color="#10B981" />
          <Text style={[styles.actionButtonText, { color: '#10B981' }]}>
            Resync
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: '#8B5CF6' + '20', borderColor: '#8B5CF6' },
          ]}
          onPress={handleAttachNode}
        >
          <Icon name="link-variant" size={20} color="#8B5CF6" />
          <Text style={[styles.actionButtonText, { color: '#8B5CF6' }]}>
            Attach Node
          </Text>
        </TouchableOpacity>
      </View>
    </GlassCard>
  );

  // ======================== MAIN RENDER ========================

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      <AppHeader
        title="Notion Integration"
        subtitle={isConnected ? 'Knowledge Bridge Active' : 'Not Connected'}
        onBackPress={() => onNavigate('dashboard')}
        onMenuPress={() => {}} // Empty function for now
        theme={theme}
      />

      {error && (
        <View
          style={[styles.errorBanner, { backgroundColor: '#EF4444' + '20' }]}
        >
          <Icon name="alert-circle" size={16} color="#EF4444" />
          <Text style={[styles.errorText, { color: '#EF4444' }]}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Icon name="close" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={initializeDashboard}
            tintColor={themeColors.primary}
            colors={[themeColors.primary]}
          />
        }
      >
        {/* Connection Status */}
        {renderConnectionStatus()}

        {isConnected ? (
          <>
            {/* Knowledge Bridges */}
            {renderKnowledgeBridges()}

            {/* Neural Sync Map */}
            {renderNeuralSyncMap()}

            {/* Sync Stats */}
            {renderSyncStats()}

            {/* Auto-Sync Controls */}
            {renderAutoSyncControls()}

            {/* Quick Actions */}
            {renderQuickActions()}
          </>
        ) : (
          /* Connection Setup */
          <GlassCard theme={theme} style={styles.setupCard}>
            <Icon
              name="file-document"
              size={64}
              color={themeColors.textSecondary}
              style={styles.setupIcon}
            />
            <Text style={[styles.setupTitle, { color: themeColors.text }]}>
              Connect to Notion
            </Text>
            <Text
              style={[
                styles.setupDescription,
                { color: themeColors.textSecondary },
              ]}
            >
              Link your Notion workspace to create a seamless knowledge bridge
              between NeuroLearn and your notes.
            </Text>

            <TouchableOpacity
              style={[
                styles.connectButton,
                { backgroundColor: themeColors.primary },
              ]}
              onPress={handleConnectToNotion}
            >
              <Icon name="link" size={20} color="white" />
              <Text style={styles.connectButtonText}>Connect to Notion</Text>
            </TouchableOpacity>

            <View style={styles.setupBenefits}>
              <Text style={[styles.benefitsTitle, { color: themeColors.text }]}>
                Benefits:
              </Text>
              {[
                'Automatic session summaries',
                'AI-generated insights',
                'Bidirectional task sync',
                'Neural knowledge linking',
              ].map((benefit, index) => (
                <View key={index} style={styles.benefitItem}>
                  <Icon
                    name="check-circle"
                    size={16}
                    color={themeColors.primary}
                  />
                  <Text
                    style={[
                      styles.benefitText,
                      { color: themeColors.textSecondary },
                    ]}
                  >
                    {benefit}
                  </Text>
                </View>
              ))}
            </View>
          </GlassCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ======================== STYLES ========================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollContainer: {
    flex: 1,
  },

  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
    paddingTop: 90, 
  },

  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.md,
    marginBottom: 0,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.sm,
  },

  errorText: {
    flex: 1,
    fontSize: typography.sizes.sm,
  },

  // Connection Status
  connectionStatus: {
    marginBottom: spacing.lg,
  },

  statusCard: {
    padding: spacing.lg,
    borderWidth: 2,
  },

  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  statusTitle: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },

  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },

  syncButtonText: {
    color: 'white',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },

  // Section Cards
  sectionCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  sectionTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },

  sectionSubtitle: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },

  // Knowledge Bridges
  bridgesContainer: {
    gap: spacing.md,
  },

  bridgeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
  },

  bridgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },

  bridgeTitle: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },

  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },

  statusBadgeText: {
    color: 'white',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    textTransform: 'capitalize',
  },

  bridgeTarget: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
  },

  bridgeDescription: {
    fontSize: typography.sizes.sm,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },

  bridgeLastSync: {
    fontSize: typography.sizes.xs,
    fontStyle: 'italic',
  },

  // Neural Sync Map
  neuralLinksScroll: {
    flexGrow: 0,
  },

  neuralLinkCard: {
    width: 200,
    marginRight: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },

  neuralLinkGradient: {
    padding: spacing.md,
  },

  neuralLinkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },

  neuralNodeId: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },

  neuralLinkArrow: {
    alignItems: 'center',
    marginVertical: spacing.xs,
  },

  neuralLinkFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },

  notionPageTitle: {
    flex: 1,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
  },

  linkMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  linkCount: {
    fontSize: typography.sizes.xs,
  },

  confidence: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },

  emptyNeuralMap: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },

  emptyText: {
    fontSize: typography.sizes.md,
    textAlign: 'center',
  },

  createLinkButton: {
    marginTop: spacing.sm,
  },

  createLinkText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },

  // Sync Stats
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },

  statItem: {
    alignItems: 'center',
  },

  statValue: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
  },

  statLabel: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
    textAlign: 'center',
  },

  syncMetadata: {
    gap: spacing.sm,
  },

  syncMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  syncMetaLabel: {
    fontSize: typography.sizes.sm,
  },

  syncMetaValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },

  // Controls
  controlsContainer: {
    gap: spacing.md,
  },

  toggleControl: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },

  toggleText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
  },

  actionControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },

  actionText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
  },

  // Quick Actions
  actionsGrid: {
    gap: spacing.md,
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },

  actionButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
  },

  // Setup Card
  setupCard: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
  },

  setupIcon: {
    marginBottom: spacing.md,
  },

  setupTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },

  setupDescription: {
    fontSize: typography.sizes.md,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 300,
  },

  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },

  connectButtonText: {
    color: 'white',
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },

  setupBenefits: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },

  benefitsTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.sm,
  },

  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  benefitText: {
    fontSize: typography.sizes.md,
  },
});

export default NotionDashboardScreen;
