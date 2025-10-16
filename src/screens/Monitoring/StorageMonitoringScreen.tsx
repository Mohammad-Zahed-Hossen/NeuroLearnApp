// File intentionally replaced with a clean implementation.
import React, { useEffect, useState, Suspense } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { GlassCard } from '../../components/GlassComponents';
import HybridStorageService from '../../services/storage/HybridStorageService';
import BackupService from '../../services/storage/BackupService';
import * as Haptics from 'expo-haptics';
import { measureAsync } from '../../core/utils/perfUtils';
import { checkPerfBudget } from '../../core/perfBudgets';

const LazyStorageCharts = React.lazy(() => import('./StorageCharts'));
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface StorageMonitoringScreenProps {
  theme: 'light' | 'dark';
}

interface StorageMetrics {
  migration: any;
  cleanup: any;
  info: any;
}

export default function StorageMonitoringScreen({
  theme,
}: StorageMonitoringScreenProps) {
  const [metrics, setMetrics] = useState<StorageMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [perf, setPerf] = useState<{
    refreshMedian?: number;
    budgetExceeded?: boolean;
  } | null>(null);
  const [telemetry, setTelemetry] = useState<any>(null);
  const service = HybridStorageService.getInstance();

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      try {
        const mig = service.getMigrationMetrics();
        const clean = service.getCleanupMetrics();
        const info = await service.getStorageInfo();
        if (!mounted) return;
        setMetrics({ migration: mig, cleanup: clean, info });
      } catch (error) {
        console.error('Failed to refresh storage metrics:', error);
      }
    };

    refresh();

    let unsubTelemetry: (() => void) | null = null;
    try {
      unsubTelemetry =
        service.registerTelemetrySink((m: any) => {
          try {
            setTelemetry(m);
          } catch (e) {}
        }) || null;
    } catch (e) {}

    (async () => {
      try {
        const median = await measureAsync(
          async () => await service.getStorageInfo(),
          3,
        );
        if (!mounted) return;
        const budgetCheck = checkPerfBudget(
          'StorageMonitoringScreen',
          median,
          'refresh',
        );
        setPerf({ refreshMedian: median, budgetExceeded: !budgetCheck.ok });
      } catch (e) {}
    })();

    const id = setInterval(refresh, 10000);
    return () => {
      mounted = false;
      clearInterval(id);
      try {
        if (unsubTelemetry) unsubTelemetry();
      } catch (e) {}
    };
  }, []);

  const handleCleanup = async () => {
    setLoading(true);
    try {
      await service.performStorageCleanup();
      Alert.alert('Success', 'Storage cleanup completed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const mig = service.getMigrationMetrics();
      const clean = service.getCleanupMetrics();
      const info = await service.getStorageInfo();
      setMetrics({ migration: mig, cleanup: clean, info });
    } catch (error) {
      Alert.alert('Error', 'Failed to perform cleanup');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    setLoading(true);
    try {
      const key = await BackupService.createLocalBackup('manual');
      if (key) {
        Alert.alert('Success', `Backup saved: ${key}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Error', 'Failed to create backup');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create backup');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const mig = service.getMigrationMetrics();
      const clean = service.getCleanupMetrics();
      const info = await service.getStorageInfo();
      setMetrics({ migration: mig, cleanup: clean, info });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Failed to refresh storage metrics:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (!metrics) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading Storage Metrics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabContent}>
        <GlassCard theme={theme} style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.cardTitle}>Storage Status</Text>
            <View style={styles.statusIndicator}>
              <Text style={styles.statusIcon}>
                {metrics.info?.isOnline ? '🟢' : '🔴'}
              </Text>
            </View>
          </View>

          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Online Status</Text>
              <View style={styles.statusIndicator}>
                <View
                  style={[
                    styles.indicatorDot,
                    {
                      backgroundColor: metrics.info?.isOnline
                        ? '#10B981'
                        : '#EF4444',
                    },
                  ]}
                />
                <Text style={styles.statusValue}>
                  {metrics.info?.isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>

            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Cache Size</Text>
              <Text style={styles.statusValue}>
                {metrics.info?.cacheSize || 0}
              </Text>
            </View>

            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Queue Size</Text>
              <Text style={styles.statusValue}>
                {metrics.info?.queueSize || 0}
              </Text>
            </View>
          </View>
        </GlassCard>

        <GlassCard theme={theme} style={styles.metricsCard}>
          <Text style={styles.cardTitle}>Migration Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Hot → Warm</Text>
              <Text style={styles.metricValue}>
                {metrics.migration?.hotToWarm || 0}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Warm → Cold</Text>
              <Text style={styles.metricValue}>
                {metrics.migration?.warmToCold || 0}
              </Text>
            </View>
          </View>
          <Text style={styles.lastRunText}>
            Last run:{' '}
            {new Date(metrics.migration?.lastRunAt || 0).toLocaleString()}
          </Text>
        </GlassCard>

        <GlassCard theme={theme} style={styles.metricsCard}>
          <Text style={styles.cardTitle}>Cleanup Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Hot Cleaned</Text>
              <Text style={styles.metricValue}>
                {metrics.cleanup?.cleanedHot || 0}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Warm Cleaned</Text>
              <Text style={styles.metricValue}>
                {metrics.cleanup?.cleanedWarm || 0}
              </Text>
            </View>
          </View>
          <Text style={styles.lastRunText}>
            Last run:{' '}
            {new Date(metrics.cleanup?.lastRunAt || 0).toLocaleString()}
          </Text>
        </GlassCard>

        <GlassCard theme={theme} style={styles.metricsCard}>
          <Text style={styles.cardTitle}>Storage Charts</Text>
          <Suspense
            fallback={<Text style={styles.loadingText}>Loading charts...</Text>}
          >
            <LazyStorageCharts />
          </Suspense>
          {perf?.refreshMedian ? (
            <Text style={styles.lastRunText}>
              Refresh median: {Math.round(perf.refreshMedian)} ms{' '}
              {perf.budgetExceeded ? '(budget exceeded)' : ''}
            </Text>
          ) : null}
          {telemetry ? (
            <Text style={styles.lastRunText}>
              Last telemetry: {new Date(telemetry.timestamp).toLocaleString()}
            </Text>
          ) : null}
        </GlassCard>

        <GlassCard theme={theme} style={styles.actionsCard}>
          <Text style={styles.cardTitle}>Storage Actions</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.actionButton, loading && styles.buttonDisabled]}
              onPress={handleCleanup}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Running...' : 'Run Cleanup Now'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, loading && styles.buttonDisabled]}
              onPress={handleBackup}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Creating...' : 'Create Backup'}
              </Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        <GlassCard theme={theme} style={styles.refreshCard}>
          <TouchableOpacity
            style={[styles.refreshButton, refreshing && styles.buttonDisabled]}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            <Text style={styles.refreshButtonText}>
              {refreshing ? 'Refreshing...' : 'Refresh Metrics'}
            </Text>
          </TouchableOpacity>
        </GlassCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: { color: '#9CA3AF', marginTop: 16, fontSize: 16 },
  tabContent: { gap: 16 },
  statusCard: { padding: 20, marginBottom: 16 },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600' as any,
    marginBottom: 8,
  },
  statusIcon: { fontSize: 16 },
  statusGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  statusItem: { alignItems: 'center', flex: 1 },
  statusLabel: { color: '#9CA3AF', fontSize: 12, marginBottom: 8 },
  statusIndicator: { flexDirection: 'row', alignItems: 'center' },
  indicatorDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' as any },
  metricsCard: { padding: 20, marginBottom: 16 },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  metric: {
    width: (SCREEN_WIDTH - 80) / 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricLabel: { color: '#9CA3AF', fontSize: 12, marginBottom: 8 },
  metricValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' as any },
  lastRunText: { color: '#9CA3AF', fontSize: 12 },
  actionsCard: { padding: 20, marginBottom: 16 },
  buttonContainer: { gap: 12 },
  actionButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#6366F1', fontSize: 14, fontWeight: 600 },
  refreshCard: { padding: 16, marginBottom: 16, alignItems: 'center' },
  refreshButton: {
    backgroundColor: 'rgba(16,185,129,0.08)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.18)',
  },
  refreshButtonText: { color: '#10B981', fontSize: 14, fontWeight: 700 },
} as const);
