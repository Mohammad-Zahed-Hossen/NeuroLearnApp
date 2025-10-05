// src/components/HubCardList.tsx
import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ListRenderItem,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import { GlassCard } from '../GlassComponents';
import { colors, spacing, typography, ThemeType } from '../../theme/colors';

export interface HubCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  screen: string;
  color: string;
  cognitiveLoad?: number;
  params?: any;
}

interface HubCardListProps {
  cards: HubCard[];
  theme: ThemeType;
  onNavigate: (screen: string, params?: any) => void;
}

export const HubCardList: React.FC<HubCardListProps> = ({ cards, theme, onNavigate }) => {
  const themeColors = colors[theme];

  const renderItem: ListRenderItem<HubCard> = useCallback(
    ({ item: card }) => {
      // Shared value for scale animation
      const scale = useSharedValue(1);

      const tapGesture = Gesture.Tap()
        .onBegin(() => {
          scale.value = withSpring(0.96, { stiffness: 300, damping: 20 });
        })
        .onEnd(() => {
          scale.value = withSpring(1, { stiffness: 300, damping: 20 });
          // Trigger navigation on tap end
          onNavigate(card.screen, card.params);
        });

      const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
      }));

      return (
        <GestureDetector gesture={tapGesture}>
          <Animated.View
            style={[styles.cardContainer, animatedStyle]}
            accessibilityLabel={`${card.title} card`}
            accessibilityHint={`Opens ${card.title} training: ${card.description}`}
          >
            <GlassCard theme={theme} style={styles.hubCard}>
              {/* Icon */}
              <View style={[styles.cardIcon, { backgroundColor: card.color + '20' }]}>
                <Text style={styles.cardIconText}>{card.icon}</Text>
              </View>

              {/* Title + Description */}
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: themeColors.text }]}>
                  {card.title}
                </Text>
                <Text style={[styles.cardDescription, { color: themeColors.textSecondary }]}>
                  {card.description}
                </Text>
              </View>

              {/* Cognitive Load Badge */}
              {card.cognitiveLoad !== undefined && (
                <View
                  style={[
                    styles.loadBadge,
                    {
                      backgroundColor:
                        card.cognitiveLoad > 0.8
                          ? themeColors.warning
                          : card.cognitiveLoad > 0.5
                          ? themeColors.info
                          : themeColors.success,
                    },
                  ]}
                >
                  <Text style={styles.loadBadgeText}>
                    {card.cognitiveLoad > 0.8
                      ? 'High Focus'
                      : card.cognitiveLoad > 0.5
                      ? 'Medium Focus'
                      : 'Light Focus'}
                  </Text>
                </View>
              )}
            </GlassCard>
          </Animated.View>
        </GestureDetector>
      );
    },
    [theme, onNavigate, themeColors]
  );

  return (
    <FlatList
      data={cards}
      renderItem={renderItem}
      keyExtractor={(card) => card.id}
      contentContainerStyle={styles.cardsList}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      initialNumToRender={4}
      maxToRenderPerBatch={6}
      windowSize={5}
      getItemLayout={(_, index) => ({
        length: 96, // approx card height
        offset: 96 * index,
        index,
      })}
    />
  );
};

const styles = StyleSheet.create({
  cardsList: {
    marginBottom: spacing.lg,
  },
  cardContainer: {
    marginBottom: spacing.md,
  },
  hubCard: {
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 80,
  },
  cardContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardIconText: {
    fontSize: 24,
  },
  cardTitle: {
    ...typography.h4,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  cardDescription: {
    ...typography.caption,
    lineHeight: 16,
  },
  loadBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 8,
  },
  loadBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '600',
  },
});
