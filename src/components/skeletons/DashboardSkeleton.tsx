import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonPlaceholder from '../shared/ExpoSkeletonPlaceholder';
import { ThemeType } from '../../theme/colors';

interface DashboardSkeletonProps {
  theme: ThemeType;
  variant?: 'finance' | 'wellness' | 'analytics' | 'holistic' | 'default';
}

export const DashboardSkeleton: React.FC<DashboardSkeletonProps> = ({
  theme,
  variant = 'default'
}) => {
  const isDark = theme === 'dark';
  const backgroundColor = isDark ? '#2a2a2a' : '#f0f0f0';
  const highlightColor = isDark ? '#3a3a3a' : '#e0e0e0';

  const renderFinanceSkeleton = () => (
    <>
      {/* Header */}
      <View style={styles.header} />

      {/* Balance Card */}
      <View style={styles.card} />

      {/* Income/Expense Row */}
      <View style={styles.row}>
        <View style={styles.smallCard} />
        <View style={styles.smallCard} />
      </View>

      {/* Budget Card */}
      <View style={styles.card} />

      {/* Transactions Card */}
      <View style={styles.card}>
        <View style={styles.listItem} />
        <View style={styles.listItem} />
        <View style={styles.listItem} />
      </View>

      {/* Actions Card */}
      <View style={styles.card}>
        <View style={styles.grid}>
          <View style={styles.gridItem} />
          <View style={styles.gridItem} />
          <View style={styles.gridItem} />
        </View>
      </View>
    </>
  );

  const renderWellnessSkeleton = () => (
    <>
      {/* Header */}
      <View style={styles.header} />

      {/* Summary Cards */}
      <View style={styles.row}>
        <View style={styles.smallCard} />
        <View style={styles.smallCard} />
      </View>

      {/* Chart Area */}
      <View style={styles.chart} />

      {/* Weekly Data */}
      <View style={styles.card}>
        <View style={styles.listItem} />
        <View style={styles.listItem} />
        <View style={styles.listItem} />
      </View>
    </>
  );

  const renderAnalyticsSkeleton = () => (
    <>
      {/* Header */}
      <View style={styles.header} />

      {/* Metrics Row */}
      <View style={styles.row}>
        <View style={styles.smallCard} />
        <View style={styles.smallCard} />
        <View style={styles.smallCard} />
      </View>

      {/* Chart */}
      <View style={styles.chart} />

      {/* Data Table */}
      <View style={styles.card}>
        <View style={styles.listItem} />
        <View style={styles.listItem} />
        <View style={styles.listItem} />
        <View style={styles.listItem} />
      </View>
    </>
  );

  const renderHolisticSkeleton = () => (
    <>
      {/* Header */}
      <View style={styles.header} />

      {/* Wellness Scores Card */}
      <View style={styles.card} />

      {/* Advanced Metrics Card */}
      <View style={styles.card} />

      {/* Cross-Module Insights Card */}
      <View style={styles.card}>
        <View style={styles.listItem} />
        <View style={styles.listItem} />
      </View>

      {/* Achievements Card */}
      <View style={styles.card}>
        <View style={styles.listItem} />
        <View style={styles.listItem} />
        <View style={styles.listItem} />
      </View>

      {/* Recommendations Card */}
      <View style={styles.card}>
        <View style={styles.listItem} />
        <View style={styles.listItem} />
      </View>
    </>
  );

  const renderDefaultSkeleton = () => (
    <>
      <View style={styles.header} />
      <View style={styles.card} />
      <View style={styles.card} />
      <View style={styles.card} />
    </>
  );

  const renderSkeleton = () => {
    switch (variant) {
      case 'finance':
        return renderFinanceSkeleton();
      case 'wellness':
        return renderWellnessSkeleton();
      case 'analytics':
        return renderAnalyticsSkeleton();
      case 'holistic':
        return renderHolisticSkeleton();
      default:
        return renderDefaultSkeleton();
    }
  };

  return (
    <View style={styles.container}>
      <SkeletonPlaceholder
        backgroundColor={backgroundColor}
        highlightColor={highlightColor}
        speed={800}
      >
        {renderSkeleton()}
      </SkeletonPlaceholder>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    height: 60,
    borderRadius: 12,
    marginBottom: 16,
  },
  card: {
    height: 120,
    borderRadius: 12,
    marginBottom: 16,
  },
  smallCard: {
    height: 80,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  chart: {
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  listItem: {
    height: 50,
    borderRadius: 8,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    height: 80,
    borderRadius: 12,
    marginBottom: 12,
  },
});

export default DashboardSkeleton;
