 /**
 * AdvancedAnalyticsCharts - Premium Chart Components for Analytics Hub
 *
 * A collection of sophisticated, animated chart components designed specifically
 * for the NeuroLearn Analytics Hub. Features adaptive styling, interactive elements,
 * and cognitive-load responsive design.
 *
 * Components:
 * - HolisticIntelligenceGauge: Circular progress with animated segments
 * - CorrelationHeatmap: Interactive correlation matrix visualization
 * - PredictiveTimeline: Time-series forecasting with confidence bands
 * - PerformanceRadar: Multi-dimensional performance analysis
 * - CognitiveTrendChart: Real-time cognitive load monitoring
 * - CrossDomainFlowChart: Sankey-style cross-domain influence visualization
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
// Use react-native-chart-kit instead of victory-native for better stability
import { PieChart, LineChart } from 'react-native-chart-kit';
const Victory: any = require('victory-native');
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Chart color schemes
export const CHART_COLORS = {
  intelligence: [
    '#6366F1',
    '#8B5CF6',
    '#EC4899',
    '#F59E0B',
    '#10B981',
    '#3B82F6',
  ],
  performance: ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0'],
  correlation: {
    positive: ['#10B981', '#34D399', '#6EE7B7'],
    negative: ['#EF4444', '#F87171', '#FCA5A5'],
    neutral: ['#6B7280', '#9CA3AF', '#D1D5DB'],
  },
  predictions: ['#6366F1', '#818CF8', '#A5B4FC'],
  cognitive: ['#8B5CF6', '#A78BFA', '#C4B5FD'],
};

// Common chart theme
export const NEUROLEARN_THEME = {
  ...Victory.VictoryTheme.material,
  axis: {
    style: {
      axis: { stroke: 'rgba(255, 255, 255, 0.2)', strokeWidth: 1 },
      axisLabel: { fill: '#D1D5DB', fontSize: 12, fontWeight: '500' },
      grid: { stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 1 },
      ticks: { stroke: 'rgba(255, 255, 255, 0.2)', size: 5 },
      tickLabels: { fill: '#9CA3AF', fontSize: 10 },
    },
  },
  chart: {
    padding: { left: 50, right: 30, top: 20, bottom: 40 },
  },
};

interface HolisticIntelligenceGaugeProps {
  scores: Record<string, number>;
  size?: number;
  showLabels?: boolean;
  onSegmentPress?: (segment: string) => void;
  animated?: boolean;
}

/**
 * Circular gauge showing holistic intelligence breakdown
 */
export const HolisticIntelligenceGauge: React.FC<
  HolisticIntelligenceGaugeProps
> = ({
  scores,
  size = 250,
  showLabels = true,
  onSegmentPress,
  animated = true,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.spring(animatedValue, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: false,
      }).start();
    }
  }, [scores, animated]);

  const data = Object.entries(scores).map(([key, value], index) => ({
    x: key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()),
    y: value,
    fill: CHART_COLORS.intelligence[index % CHART_COLORS.intelligence.length],
  }));

  const masterScore = Math.round(
    Object.values(scores).reduce((sum, score) => sum + score, 0) /
      Object.values(scores).length,
  );

  return (
    <View style={styles.gaugeContainer}>
      <View style={styles.gaugeChart}>
        <Victory.VictoryPie
          data={data}
          width={size}
          height={size}
          innerRadius={size * 0.4}
          outerRadius={size * 0.5}
          colorScale={CHART_COLORS.intelligence}
          labelComponent={
            showLabels ? (
              <Victory.VictoryLabel style={{ fill: '#FFFFFF', fontSize: 12 }} />
            ) : (
              <></>
            )
          }
          events={
            onSegmentPress
              ? [
                  {
                    target: 'data',
                    eventHandlers: {
                      onPress: () => ({
                        mutation: (props: any) => {
                          onSegmentPress(props.datum.x);
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Medium,
                          );
                          return props;
                        },
                      }),
                    },
                  },
                ]
              : undefined
          }
          animate={
            animated
              ? {
                  duration: 1000,
                  onLoad: { duration: 500 },
                }
              : undefined
          }
        />

        {/* Center master score */}
        <View
          style={[
            styles.centerScore,
            { width: size * 0.8, height: size * 0.8 },
          ]}
        >
          <Text style={styles.masterScoreValue}>{masterScore}</Text>
          <Text style={styles.masterScoreLabel}>Holistic Intelligence</Text>
        </View>
      </View>

      {/* Legend */}
      {showLabels && (
        <View style={styles.gaugeLegend}>
          {data.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.legendItem}
              onPress={() => onSegmentPress?.(item.x)}
            >
              <View
                style={[styles.legendColor, { backgroundColor: item.fill }]}
              />
              <Text style={styles.legendLabel}>{item.x}</Text>
              <Text style={styles.legendValue}>{item.y}%</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

interface CorrelationHeatmapProps {
  correlations: Record<string, number>;
  onCellPress?: (correlation: string, value: number) => void;
}

/**
 * Interactive heatmap showing cross-domain correlations
 */
export const CorrelationHeatmap: React.FC<CorrelationHeatmapProps> = ({
  correlations,
  onCellPress,
}) => {
  const getCorrelationColor = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue > 0.7) return value > 0 ? '#10B981' : '#EF4444';
    if (absValue > 0.4) return value > 0 ? '#34D399' : '#F87171';
    if (absValue > 0.1) return value > 0 ? '#6EE7B7' : '#FCA5A5';
    return '#6B7280';
  };

  const getCorrelationIntensity = (value: number) => {
    return Math.abs(value) * 0.8 + 0.2; // Minimum 20% opacity
  };

  return (
    <View style={styles.heatmapContainer}>
      <Text style={styles.heatmapTitle}>Cross-Domain Correlations</Text>

      <View style={styles.heatmapGrid}>
        {Object.entries(correlations).map(([key, value]) => {
          const [domain1, domain2] = key.split('Vs');
          const color = getCorrelationColor(value);
          const intensity = getCorrelationIntensity(value);

          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.heatmapCell,
                {
                  backgroundColor:
                    color +
                    Math.round(intensity * 255)
                      .toString(16)
                      .padStart(2, '0'),
                  borderColor: color,
                },
              ]}
              onPress={() => {
                onCellPress?.(key, value);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={styles.heatmapCellTitle}>{domain1}</Text>
              <Text style={styles.heatmapCellArrow}>↔</Text>
              <Text style={styles.heatmapCellTitle}>{domain2}</Text>
              <Text style={[styles.heatmapCellValue, { color }]}>
                {value > 0 ? '+' : ''}
                {Math.round(value * 100)}%
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Correlation strength legend */}
      <View style={styles.heatmapLegend}>
        <Text style={styles.heatmapLegendTitle}>Correlation Strength</Text>
        <View style={styles.heatmapLegendRow}>
          <View style={styles.heatmapLegendItem}>
            <View
              style={[
                styles.heatmapLegendColor,
                { backgroundColor: '#EF4444' },
              ]}
            />
            <Text style={styles.heatmapLegendLabel}>Strong Negative</Text>
          </View>
          <View style={styles.heatmapLegendItem}>
            <View
              style={[
                styles.heatmapLegendColor,
                { backgroundColor: '#6B7280' },
              ]}
            />
            <Text style={styles.heatmapLegendLabel}>Neutral</Text>
          </View>
          <View style={styles.heatmapLegendItem}>
            <View
              style={[
                styles.heatmapLegendColor,
                { backgroundColor: '#10B981' },
              ]}
            />
            <Text style={styles.heatmapLegendLabel}>Strong Positive</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

interface PredictiveTimelineProps {
  historicalData: Array<{ date: string; value: number }>;
  predictions: Array<{
    date: string;
    value: number;
    confidence: number;
    lowerBound: number;
    upperBound: number;
  }>;
  metric: string;
  unit?: string;
}

/**
 * Time-series chart with predictive forecasting and confidence bands
 */
export const PredictiveTimeline: React.FC<PredictiveTimelineProps> = ({
  historicalData,
  predictions,
  metric,
  unit = '',
}) => {
  const combinedData = [
    ...historicalData,
    ...predictions.map((p) => ({ date: p.date, value: p.value })),
  ];
  const splitIndex = historicalData.length;

  return (
    <View style={styles.timelineContainer}>
      <Text style={styles.timelineTitle}>{metric} Forecast</Text>

      <LineChart
        data={{
          labels: [...historicalData.map(d => d.date), ...predictions.map(d => d.date)],
          datasets: [
            {
              data: historicalData.map(d => d.value),
              color: () => CHART_COLORS.predictions[0],
              strokeWidth: 2,
            },
            {
              data: predictions.map(d => d.value),
              color: () => CHART_COLORS.predictions[1],
              strokeWidth: 2,
            },
          ],
        }}
        width={SCREEN_WIDTH * 0.9}
        height={220}
        chartConfig={{
          backgroundColor: 'transparent',
          backgroundGradientFrom: 'transparent',
          backgroundGradientTo: 'transparent',
          decimalPlaces: 2,
          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(209, 213, 219, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: '3',
            strokeWidth: '2',
            stroke: CHART_COLORS.predictions[0],
          },
        }}
        bezier
        style={{
          marginVertical: 8,
          borderRadius: 16,
        }}
        verticalLabelRotation={45}
      />

      {/* Legend */}
      <View style={styles.timelineLegend}>
        <View style={styles.timelineLegendItem}>
          <View
            style={[
              styles.timelineLegendLine,
              { backgroundColor: CHART_COLORS.predictions[0] },
            ]}
          />
          <Text style={styles.timelineLegendLabel}>Historical</Text>
        </View>
        <View style={styles.timelineLegendItem}>
          <View
            style={[
              styles.timelineLegendLine,
              { backgroundColor: CHART_COLORS.predictions[1] },
            ]}
          />
          <Text style={styles.timelineLegendLabel}>Predicted</Text>
        </View>
        <View style={styles.timelineLegendItem}>
          <View
            style={[
              styles.timelineLegendArea,
              { backgroundColor: CHART_COLORS.predictions[0] + '40' },
            ]}
          />
          <Text style={styles.timelineLegendLabel}>Confidence</Text>
        </View>
      </View>
    </View>
  );
};

interface PerformanceRadarProps {
  data: Record<string, number>;
  maxValue?: number;
  onMetricPress?: (metric: string) => void;
}

/**
 * Radar chart showing multi-dimensional performance
 */
export const PerformanceRadar: React.FC<PerformanceRadarProps> = ({
  data,
  maxValue = 100,
  onMetricPress,
}) => {
  const radarData = Object.entries(data).map(([key, value]) => ({
    x: key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()),
    y: value,
  }));

  return (
    <View style={styles.radarContainer}>
      <Text style={styles.radarTitle}>Performance Overview</Text>

      <Victory.VictoryChart
        polar
        theme={NEUROLEARN_THEME}
        width={SCREEN_WIDTH * 0.8}
        height={300}
        padding={50}
        domain={{ y: [0, maxValue] }}
      >
        <Victory.VictoryAxis
          dependentAxis
          tickFormat={() => ''}
          style={{
            axis: { stroke: 'none' },
            grid: { stroke: 'rgba(255, 255, 255, 0.2)', strokeWidth: 1 },
          }}
        />
        <Victory.VictoryAxis
          tickLabelComponent={
            <Victory.VictoryLabel style={{ fill: '#D1D5DB', fontSize: 12 }} />
          }
        />

        <Victory.VictoryArea
          data={radarData}
          style={{
            data: {
              fill: CHART_COLORS.performance[0] + '40',
              stroke: CHART_COLORS.performance[0],
              strokeWidth: 2,
            },
          }}
          animate={{
            duration: 1000,
            onLoad: { duration: 500 },
          }}
        />

        <Victory.VictoryScatter
          data={radarData}
          size={4}
          style={{
            data: { fill: CHART_COLORS.performance[1] },
          }}
        />
      </Victory.VictoryChart>

      {/* Performance metrics */}
      <View style={styles.radarMetrics}>
        {Object.entries(data).map(([key, value]) => (
          <TouchableOpacity
            key={key}
            style={styles.radarMetric}
            onPress={() => onMetricPress?.(key)}
          >
            <Text style={styles.radarMetricLabel}>{key}</Text>
            <Text style={styles.radarMetricValue}>{Math.round(value)}%</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

interface CognitiveTrendChartProps {
  data: Array<{ date: string; load: number; focus: number; energy: number }>;
  timeRange: '1day' | '1week' | '1month';
  onDataPointPress?: (dataPoint: any) => void;
}

/**
 * Multi-line chart showing cognitive trends over time
 */
export const CognitiveTrendChart: React.FC<CognitiveTrendChartProps> = ({
  data,
  timeRange,
  onDataPointPress,
}) => {
  return (
    <View style={styles.trendContainer}>
      <Text style={styles.trendTitle}>Cognitive Performance Trends</Text>

      <LineChart
        data={{
          labels: data.map(d => d.date),
          datasets: [
            {
              data: data.map(d => d.load),
              color: () => CHART_COLORS.cognitive[0],
              strokeWidth: 2,
            },
            {
              data: data.map(d => d.focus),
              color: () => CHART_COLORS.cognitive[1],
              strokeWidth: 2,
            },
            {
              data: data.map(d => d.energy),
              color: () => CHART_COLORS.cognitive[2],
              strokeWidth: 2,
            },
          ],
        }}
        width={SCREEN_WIDTH * 0.9}
        height={200}
        chartConfig={{
          backgroundColor: 'transparent',
          backgroundGradientFrom: 'transparent',
          backgroundGradientTo: 'transparent',
          decimalPlaces: 2,
          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(209, 213, 219, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: '3',
            strokeWidth: '2',
            stroke: CHART_COLORS.cognitive[0],
          },
        }}
        bezier
        style={{
          marginVertical: 8,
          borderRadius: 16,
        }}
        formatYLabel={(value) => `${Math.round(Number(value) * 100)}%`}
        verticalLabelRotation={timeRange === '1month' ? 45 : 0}
      />

      {/* Trend legend */}
      <View style={styles.trendLegend}>
        <View style={styles.trendLegendItem}>
          <View
            style={[
              styles.trendLegendColor,
              { backgroundColor: CHART_COLORS.cognitive[0] },
            ]}
          />
          <Text style={styles.trendLegendLabel}>Cognitive Load</Text>
        </View>
        <View style={styles.trendLegendItem}>
          <View
            style={[
              styles.trendLegendColor,
              { backgroundColor: CHART_COLORS.cognitive[1] },
            ]}
          />
          <Text style={styles.trendLegendLabel}>Focus Level</Text>
        </View>
        <View style={styles.trendLegendItem}>
          <View
            style={[
              styles.trendLegendColor,
              { backgroundColor: CHART_COLORS.cognitive[2] },
            ]}
          />
          <Text style={styles.trendLegendLabel}>Energy Level</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Gauge styles
  gaugeContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  gaugeChart: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerScore: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 1000,
    backgroundColor: 'rgba(15, 15, 35, 0.8)',
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  masterScoreValue: {
    color: '#6366F1',
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 4,
  },
  masterScoreLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  gaugeLegend: {
    marginTop: 20,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    gap: 12,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    flex: 1,
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '500',
  },
  legendValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Heatmap styles
  heatmapContainer: {
    marginVertical: 20,
  },
  heatmapTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  heatmapCell: {
    width: (SCREEN_WIDTH - 80) / 2.2,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  heatmapCellTitle: {
    color: '#D1D5DB',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  heatmapCellArrow: {
    color: '#9CA3AF',
    fontSize: 14,
    marginVertical: 4,
  },
  heatmapCellValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  heatmapLegend: {
    marginTop: 20,
    alignItems: 'center',
  },
  heatmapLegendTitle: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  heatmapLegendRow: {
    flexDirection: 'row',
    gap: 16,
  },
  heatmapLegendItem: {
    alignItems: 'center',
    gap: 4,
  },
  heatmapLegendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  heatmapLegendLabel: {
    color: '#9CA3AF',
    fontSize: 10,
  },

  // Timeline styles
  timelineContainer: {
    marginVertical: 20,
  },
  timelineTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  timelineLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
  },
  timelineLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timelineLegendLine: {
    width: 20,
    height: 2,
  },
  timelineLegendArea: {
    width: 20,
    height: 8,
    borderRadius: 4,
  },
  timelineLegendLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },

  // Radar styles
  radarContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  radarTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  radarMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  radarMetric: {
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    minWidth: 80,
  },
  radarMetricLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 4,
  },
  radarMetricValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Trend styles
  trendContainer: {
    marginVertical: 20,
  },
  trendTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  trendLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
  },
  trendLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trendLegendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  trendLegendLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },
});

export default {
  HolisticIntelligenceGauge,
  CorrelationHeatmap,
  PredictiveTimeline,
  PerformanceRadar,
  CognitiveTrendChart,
  CHART_COLORS,
  NEUROLEARN_THEME,
};
