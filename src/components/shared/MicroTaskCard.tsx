/**
 * MicroTaskCard Component - Cognitive Aura Engine UI Integration
 *
 * This component displays the AI-generated micro-task in a persistent,
 * non-intrusive overlay that adapts to the current cognitive context.
 *
 * Features:
 * - Context-aware visual styling (Recovery/Focus/Overload)
 * - Smooth animations and transitions
 * - Completion tracking and feedback
 * - Integration with performance recording
 * - Collapsible interface for minimal distraction
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { GlassCard } from '../GlassComponents';
import { colors, spacing, typography, borderRadius } from '../../theme/colors';
import { ThemeType } from '../../theme/colors';
import { AuraState, AuraContext } from '../../services/ai/CognitiveAuraService';

interface MicroTaskCardProps {
  auraState: AuraState;
  theme: ThemeType;
  onTaskComplete?: (completed: boolean, timeSpent: number, satisfaction?: number) => void;
  onTaskSkip?: () => void;
  position?: 'top' | 'bottom' | 'floating';
  minimized?: boolean;
  onMinimizeToggle?: (minimized: boolean) => void;
  onClose?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

/**
 * Context-specific styling configurations
 */
const CONTEXT_STYLES = {
  DeepFocus: {
    primaryColor: '#3B82F6', // Clear blue
    backgroundColor: '#EFF6FF', // Light blue background
    borderColor: '#93C5FD', // Soft blue border
    iconName: 'target',
    gradientColors: ['#EFF6FF', '#DBEAFE'],
  },
  CreativeFlow: {
    primaryColor: '#8B5CF6', // Creative purple
    backgroundColor: '#F3F4F6', // Light purple background
    borderColor: '#C4B5FD', // Soft purple border
    iconName: 'lightbulb-on',
    gradientColors: ['#F3F4F6', '#E9D5FF'],
  },
  FragmentedAttention: {
    primaryColor: '#10B981', // Gentle green
    backgroundColor: '#ECFDF5', // Light green background
    borderColor: '#6EE7B7', // Soft green border
    iconName: 'heart-pulse',
    gradientColors: ['#ECFDF5', '#D1FAE5'],
  },
  CognitiveOverload: {
    primaryColor: '#F59E0B', // Warm amber
    backgroundColor: '#FFFBEB', // Light amber background
    borderColor: '#FCD34D', // Soft amber border
    iconName: 'brain',
    gradientColors: ['#FFFBEB', '#FEF3C7'],
  },
} as const;

// Fallback context style used when an unknown/unsupported context is provided
const DEFAULT_CONTEXT_STYLE = {
  primaryColor: '#374151',
  backgroundColor: '#FFFFFF',
  borderColor: '#E5E7EB',
  iconName: 'information-outline',
  gradientColors: ['#FFFFFF', '#F3F4F6'],
};

export const MicroTaskCard: React.FC<MicroTaskCardProps> = ({
  auraState,
  theme,
  onTaskComplete,
  onTaskSkip,
  position = 'top',
  minimized = false,
  onMinimizeToggle,
  onClose,
}) => {
  // Component state
  const [isMinimized, setIsMinimized] = useState(minimized);
  const [taskStartTime, setTaskStartTime] = useState<Date | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Animations
  const slideAnimation = new Animated.Value(isMinimized ? 0 : 1);
  const pulseAnimation = new Animated.Value(1);

  // Theme colors
  const themeColors = colors[theme];
  const contextStyle =
    CONTEXT_STYLES[auraState.context] ?? DEFAULT_CONTEXT_STYLE;

  // Start task timer when component becomes visible
  useEffect(() => {
    if (!isMinimized && !taskStartTime) {
      setTaskStartTime(new Date());
    }
  }, [isMinimized, taskStartTime]);

  // Animate minimize/expand
  useEffect(() => {
    Animated.timing(slideAnimation, {
      toValue: isMinimized ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isMinimized]);

  // Pulse animation for attention
  useEffect(() => {
    if (!isMinimized && auraState.context === 'CognitiveOverload') {
      const pulseSequence = Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]);

      Animated.loop(pulseSequence).start();
    } else {
      pulseAnimation.setValue(1);
    }
  }, [auraState.context, isMinimized]);

  // Handle minimize toggle
  const handleMinimizeToggle = useCallback(() => {
    const newMinimized = !isMinimized;
    setIsMinimized(newMinimized);
    onMinimizeToggle?.(newMinimized);
  }, [isMinimized, onMinimizeToggle]);

  // Handle task completion
  const handleTaskComplete = useCallback(
    (completed: boolean, satisfaction: number = 3) => {
      if (taskStartTime) {
        const timeSpent = Date.now() - taskStartTime.getTime();
        onTaskComplete?.(completed, timeSpent, satisfaction);
        setTaskStartTime(null);
      }
    },
    [taskStartTime, onTaskComplete],
  );

  // Handle task skip
  const handleTaskSkip = useCallback(() => {
    handleTaskComplete(false);
    onTaskSkip?.();
  }, [handleTaskComplete, onTaskSkip]);

  // Get context-specific message
  const getContextMessage = useCallback((context: AuraContext): string => {
    switch (context) {
      case 'FragmentedAttention':
        return 'Gentle learning mode - take your time';
      case 'DeepFocus':
        return 'Optimal learning window - seize the moment';
      case 'CreativeFlow':
        return 'Creative flow - let ideas emerge naturally';
      case 'CognitiveOverload':
        return 'High cognitive load - keep it simple';
      default:
        return 'Adaptive learning mode';
    }
  }, []);

  // Get priority badge
  const getPriorityBadge = useCallback(() => {
    if (!auraState.targetNodePriority) return null;

    const priorityConfig: Record<
      string,
      { label: string; color: string; text: string }
    > = {
      P1_URGENT_PREREQUISITE: { label: 'P1', color: '#EF4444', text: 'Urgent' },
      P2_FORGETTING_RISK: {
        label: 'P2',
        color: '#F59E0B',
        text: 'Memory Risk',
      },
      P3_COGNITIVE_LOAD: { label: 'P3', color: '#6B7280', text: 'High Load' },
    };

    const config = priorityConfig[auraState.targetNodePriority];
    if (!config) {
      // Unknown priority value — don't render a badge to avoid runtime errors
      return null;
    }

    return (
      <View style={[styles.priorityBadge, { backgroundColor: config.color }]}>
        <Text style={styles.priorityLabel}>{config.label}</Text>
      </View>
    );
  }, [auraState.targetNodePriority]);

  // Minimized view
  if (isMinimized) {
    return (
      <Animated.View
        style={[
          styles.minimizedContainer,
          { backgroundColor: contextStyle.backgroundColor },
          position === 'floating' && styles.floatingPosition,
          { transform: [{ scale: pulseAnimation }] },
        ]}
      >
        <TouchableOpacity
          onPress={handleMinimizeToggle}
          style={styles.minimizedButton}
          activeOpacity={0.8}
        >
          <View style={styles.minimizedContent}>
            <Icon
              name={contextStyle.iconName}
              size={16}
              color={contextStyle.primaryColor}
            />
            <Text
              style={[
                styles.minimizedText,
                { color: contextStyle.primaryColor },
              ]}
            >
              {auraState.context}
            </Text>
            {getPriorityBadge()}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Full view
  return (
    <Animated.View
      style={[
        styles.container,
        position === 'top' && styles.topPosition,
        position === 'bottom' && styles.bottomPosition,
        position === 'floating' && styles.floatingPosition,
        {
          opacity: slideAnimation,
          transform: [
            { scale: pulseAnimation },
            {
              translateY: slideAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: position === 'top' ? [-100, 0] : [100, 0],
              }),
            },
          ],
        },
      ]}
    >
      <GlassCard
        theme={theme}
        style={[styles.card, { borderColor: contextStyle.borderColor }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Icon
              name={contextStyle.iconName}
              size={20}
              color={contextStyle.primaryColor}
            />
            <Text
              style={[
                styles.contextLabel,
                { color: contextStyle.primaryColor },
              ]}
            >
              {auraState.context}
            </Text>
            {getPriorityBadge()}
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => setShowDetails(!showDetails)}
              style={styles.headerButton}
            >
              <Icon
                name={showDetails ? 'chevron-up' : 'information-outline'}
                size={18}
                color={themeColors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleMinimizeToggle}
              style={styles.headerButton}
            >
              <Icon name="minus" size={18} color={themeColors.textSecondary} />
            </TouchableOpacity>

            {onClose && (
              <TouchableOpacity
                onPress={onClose}
                style={styles.headerButton}
              >
                <Icon name="close" size={18} color={themeColors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Context Message */}
        <Text
          style={[styles.contextMessage, { color: themeColors.textSecondary }]}
        >
          {getContextMessage(auraState.context)}
        </Text>

        {/* Micro Task */}
        <View style={styles.taskContainer}>
          <Text style={[styles.taskText, { color: themeColors.text }]}>
            {auraState.microTask}
          </Text>
        </View>

        {/* Details Section */}
        {showDetails && (
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text
                style={[
                  styles.detailLabel,
                  { color: themeColors.textSecondary },
                ]}
              >
                Cognitive Score:
              </Text>
              <Text
                style={[
                  styles.detailValue,
                  { color: contextStyle.primaryColor },
                ]}
              >
                {(auraState.compositeCognitiveScore * 100).toFixed(0)}%
              </Text>
            </View>

            {auraState.targetNode && (
              <View style={styles.detailRow}>
                <Text
                  style={[
                    styles.detailLabel,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  Focus Target:
                </Text>
                <Text style={[styles.detailValue, { color: themeColors.text }]}>
                  {auraState.targetNode.label}
                </Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text
                style={[
                  styles.detailLabel,
                  { color: themeColors.textSecondary },
                ]}
              >
                Confidence:
              </Text>
              <Text style={[styles.detailValue, { color: themeColors.text }]}>
                {(auraState.confidence * 100).toFixed(0)}%
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text
                style={[
                  styles.detailLabel,
                  { color: themeColors.textSecondary },
                ]}
              >
                Adaptations:
              </Text>
              <Text style={[styles.detailValue, { color: themeColors.text }]}>
                {auraState.adaptationCount}
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            onPress={() => handleTaskComplete(true)}
            style={[
              styles.actionButton,
              styles.completeButton,
              { backgroundColor: contextStyle.primaryColor },
            ]}
            activeOpacity={0.8}
          >
            <Icon name="check" size={16} color="white" />
            <Text style={styles.actionButtonText}>Complete</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleTaskSkip}
            style={[
              styles.actionButton,
              styles.skipButton,
              { borderColor: themeColors.border },
            ]}
            activeOpacity={0.8}
          >
            <Icon
              name="skip-next"
              size={16}
              color={themeColors.textSecondary}
            />
            <Text
              style={[
                styles.actionButtonText,
                { color: themeColors.textSecondary },
              ]}
            >
              Skip
            </Text>
          </TouchableOpacity>
        </View>

        {/* Confidence Indicator */}
        <View style={styles.confidenceContainer}>
          <View
            style={[
              styles.confidenceBar,
              { backgroundColor: themeColors.border },
            ]}
          >
            <View
              style={[
                styles.confidenceFill,
                {
                  backgroundColor: contextStyle.primaryColor,
                  width: `${auraState.confidence * 100}%`,
                },
              ]}
            />
          </View>
          <Text
            style={[
              styles.confidenceText,
              { color: themeColors.textSecondary },
            ]}
          >
            Algorithm Confidence
          </Text>
        </View>
      </GlassCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    zIndex: 1000,
  },
  topPosition: {
    top: Platform.OS === 'ios' ? 100 : 80,
  },
  bottomPosition: {
    bottom: spacing.xl,
  },
  floatingPosition: {
    top: '40%',
  },
  minimizedContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: spacing.sm,
    zIndex: 1000,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  minimizedButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  minimizedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  minimizedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    padding: spacing.md,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  contextLabel: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  priorityBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
  },
  priorityLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
  contextMessage: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  taskContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  taskText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  detailsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    flex: 1,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  actionContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  completeButton: {
    // backgroundColor set dynamically
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  confidenceContainer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  confidenceBar: {
    width: '100%',
    height: 3,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  confidenceText: {
    fontSize: 10,
    textAlign: 'center',
  },
});

export default MicroTaskCard;
