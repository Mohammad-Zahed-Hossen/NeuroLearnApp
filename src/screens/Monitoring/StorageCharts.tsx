import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import HybridStorageService from '../../services/storage/HybridStorageService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TelemetrySample = {
  timestamp: number;
  migration?: { hotToWarm?: number; warmToCold?: number };
  cleanup?: { cleanedHot?: number; cleanedWarm?: number };
};

const MAX_SAMPLES = 48;

export default function StorageCharts() {
  const service = HybridStorageService.getInstance();
  const [samples, setSamples] = useState<TelemetrySample[]>([]);

  useEffect(() => {
    let mounted = true;

    // Seed with current metrics snapshot if available
    try {
      const mig = service.getMigrationMetrics();
      const clean = service.getCleanupMetrics();
      const now = Date.now();
      const seed: TelemetrySample = {
        timestamp: now,
        migration: {
          hotToWarm: mig.hotToWarm || 0,
          warmToCold: mig.warmToCold || 0,
        },
        cleanup: {
          cleanedHot: clean.cleanedHot || 0,
          cleanedWarm: clean.cleanedWarm || 0,
        },
      };
      if (mounted)
        setSamples((prev) => {
          const next = [...prev, seed].slice(-MAX_SAMPLES);
          return next;
        });
    } catch (e) {
      // ignore
    }

    const cb = (m: any) => {
      try {
        const sample: TelemetrySample = {
          timestamp: m?.timestamp || Date.now(),
          migration: {
            hotToWarm: m?.migration?.hotToWarm || 0,
            warmToCold: m?.migration?.warmToCold || 0,
          },
          cleanup: {
            cleanedHot: m?.cleanup?.cleanedHot || 0,
            cleanedWarm: m?.cleanup?.cleanedWarm || 0,
          },
        };
        // push latest sample
        setSamples((prev) => {
          const next = [...prev, sample].slice(-MAX_SAMPLES);
          return next;
        });
      } catch (e) {
        // swallow
      }
    };

    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = service.registerTelemetrySink(cb) || null;
    } catch (e) {
      // ignore
    }

    return () => {
      mounted = false;
      try {
        if (unsubscribe) unsubscribe();
      } catch (e) {
        // ignore
      }
    };
  }, []);

  const labels = useMemo(
    () =>
      samples.map((s) => {
        const d = new Date(s.timestamp);
        return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
      }),
    [samples],
  );

  const migrationHotSeries = useMemo(
    () => samples.map((s) => s.migration?.hotToWarm || 0),
    [samples],
  );
  const migrationWarmSeries = useMemo(
    () => samples.map((s) => s.migration?.warmToCold || 0),
    [samples],
  );
  const cleanupHotSeries = useMemo(
    () => samples.map((s) => s.cleanup?.cleanedHot || 0),
    [samples],
  );
  const cleanupWarmSeries = useMemo(
    () => samples.map((s) => s.cleanup?.cleanedWarm || 0),
    [samples],
  );

  const hasData =
    samples.length > 0 &&
    (migrationHotSeries.some((v) => !!v) ||
      migrationWarmSeries.some((v) => !!v) ||
      cleanupHotSeries.some((v) => !!v) ||
      cleanupWarmSeries.some((v) => !!v));

  if (!hasData) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          No chart data yet — waiting for telemetry samples.
        </Text>
      </View>
    );
  }

  // Responsive width with padding
  const chartWidth = Math.max(Math.min(SCREEN_WIDTH - 48, 900), 300);

  // Chart config for react-native-chart-kit
  const chartConfig = {
    backgroundGradientFrom: '#0f172a',
    backgroundGradientTo: '#0b1220',
    color: (opacity = 1) => `rgba(99,102,241, ${opacity})`,
    decimalPlaces: 0,
    labelColor: (opacity = 1) => `rgba(156,163,175, ${opacity})`,
    propsForDots: { r: '3', strokeWidth: '0' },
  } as any;

  return (
    <View style={styles.container}>
      <Text style={{ color: '#9CA3AF', marginBottom: 6 }}>
        Migrations (count)
      </Text>
      <LineChart
        data={{
          labels,
          datasets: [
            { data: migrationHotSeries, color: () => '#4F46E5' },
            { data: migrationWarmSeries, color: () => '#06B6D4' },
          ],
          legend: ['Hot → Warm', 'Warm → Cold'],
        }}
        width={chartWidth}
        height={220}
        chartConfig={chartConfig}
        bezier
        style={{ borderRadius: 12 }}
      />

      <Text style={{ color: '#9CA3AF', marginTop: 12, marginBottom: 6 }}>
        Cleanup (items removed)
      </Text>
      <LineChart
        data={{
          labels,
          datasets: [
            { data: cleanupHotSeries, color: () => '#10B981' },
            { data: cleanupWarmSeries, color: () => '#F97316' },
          ],
          legend: ['Hot Cleaned', 'Warm Cleaned'],
        }}
        width={chartWidth}
        height={180}
        chartConfig={chartConfig}
        style={{ borderRadius: 12 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8, alignItems: 'center' },
  emptyContainer: { padding: 12 },
  emptyText: { color: '#9CA3AF' },
});
