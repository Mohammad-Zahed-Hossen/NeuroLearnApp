import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonPlaceholder from '../shared/ExpoSkeletonPlaceholder';
import { ThemeType } from '../../theme/colors';

interface TaskSkeletonProps {
  theme: ThemeType;
  variant?: 'list' | 'card' | 'compact';
  count?: number;
}

export const TaskSkeleton: React.FC<TaskSkeletonProps> = ({
  theme,
  variant = 'list',
  count = 5,
}) => {
  const isDark = theme === 'dark';
  const backgroundColor = isDark ? '#2a2a2a' : '#f0f0f0';
  const highlightColor = isDark ? '#3a3a3a' : '#e0e0e0';

  const renderTaskItem = () => {
    switch (variant) {
      case 'card':
        return (
          <View style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <View style={styles.checkbox} />
              <View style={styles.taskContent}>
                <View style={styles.taskTitle} />
                <View style={styles.taskDescription} />
              </View>
            </View>
            <View style={styles.taskMeta}>
              <View style={styles.priorityBadge} />
              <View style={styles.dueDate} />
            </View>
          </View>
        );
      case 'compact':
        return (
          <View style={styles.taskCompact}>
            <View style={styles.checkboxSmall} />
            <View style={styles.taskTitleCompact} />
            <View style={styles.priorityBadgeSmall} />
          </View>
        );
      default: // 'list'
        return (
          <View style={styles.taskListItem}>
            <View style={styles.checkbox} />
            <View style={styles.taskContent}>
              <View style={styles.taskTitle} />
              <View style={styles.taskDescription} />
            </View>
            <View style={styles.taskActions}>
              <View style={styles.actionButton} />
              <View style={styles.actionButton} />
            </View>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <SkeletonPlaceholder
        backgroundColor={backgroundColor}
        highlightColor={highlightColor}
        speed={800}
      >
        {Array.from({ length: count }, (_, index) => (
          <View key={index} style={styles.taskWrapper}>
            {renderTaskItem()}
          </View>
        ))}
      </SkeletonPlaceholder>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  taskWrapper: {
    marginBottom: 12,
  },
  // List variant styles
  taskListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    height: 80,
  },
  // Card variant styles
  taskCard: {
    padding: 16,
    borderRadius: 12,
    height: 120,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Compact variant styles
  taskCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    height: 50,
  },
  taskTitleCompact: {
    flex: 1,
    height: 16,
    borderRadius: 4,
    marginHorizontal: 12,
  },
  priorityBadgeSmall: {
    width: 60,
    height: 20,
    borderRadius: 10,
  },
  // Common styles
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    marginRight: 12,
    marginTop: 2,
  },
  checkboxSmall: {
    width: 20,
    height: 20,
    borderRadius: 3,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    height: 18,
    borderRadius: 4,
    marginBottom: 6,
  },
  taskDescription: {
    height: 14,
    borderRadius: 3,
    width: '70%',
  },
  priorityBadge: {
    width: 50,
    height: 24,
    borderRadius: 12,
  },
  dueDate: {
    width: 80,
    height: 16,
    borderRadius: 4,
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 60,
    height: 32,
    borderRadius: 8,
    marginLeft: 8,
  },
});

export default TaskSkeleton;
