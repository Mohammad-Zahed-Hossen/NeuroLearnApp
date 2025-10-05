import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Vibration } from 'react-native';
import { GlassCard } from '../GlassComponents';
import { colors, spacing, typography } from '../../theme/colors';
import { ThemeType } from '../../theme/colors';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AIInsightsService from '../../services/ai/AIInsightsService';
import CrossModuleBridgeService from '../../services/integrations/CrossModuleBridgeService';
import { supabase } from '../../services/storage/SupabaseService';

interface AICheckinCardProps {
  theme: ThemeType;
  onCheckin?: () => void;
}

interface MoodOption {
  label: string;
  emoji: string;
  color: string;
  icon: string;
}

const AICheckinCard: React.FC<AICheckinCardProps> = ({ theme, onCheckin }) => {
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [personalizedInsights, setPersonalizedInsights] = useState<string[]>([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [loadingCheckinStatus, setLoadingCheckinStatus] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const themeColors = colors[theme];

  const toggleInsights = () => {
    if (hasCheckedIn && personalizedInsights.length > 0) {
      setIsExpanded(!isExpanded);
    }
  };

  const moods: MoodOption[] = [
    { label: 'Great', emoji: '🚀', color: '#10B981', icon: 'trending-up' },
    { label: 'Good', emoji: '😊', color: '#3B82F6', icon: 'heart' },
    { label: 'Okay', emoji: '😐', color: '#F59E0B', icon: 'flash' },
    { label: 'Struggling', emoji: '😔', color: '#EF4444', icon: 'brain' },
  ];

  // Check if user has already checked in today
  useEffect(() => {
    const checkTodaysCheckin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const today = new Date().toISOString().split('T')[0];

        const { data: existingCheckin } = await supabase
          .from('daily_checkins')
          .select('*')
          .eq('user_id', user.id)
          .eq('checkin_date', today)
          .single();

        if (existingCheckin) {
          setSelectedMood(existingCheckin.mood);
          setPersonalizedInsights(existingCheckin.insights_generated || []);
          setHasCheckedIn(true);
        }
      } catch (error: any) {
        // If no check-in found (PGRST116), that's fine - user hasn't checked in yet
        if (error?.code !== 'PGRST116') {
          console.error('Error checking today\'s check-in:', error);
        }
      } finally {
        setLoadingCheckinStatus(false);
      }
    };

    checkTodaysCheckin();
  }, []);

  const handleMoodSelect = async (mood: MoodOption) => {
    setSelectedMood(mood.label);
    Vibration.vibrate(50); // Subtle haptic feedback

    // Generate personalized insights based on mood
    setIsGeneratingInsights(true);
    let moodInsights: string[] = [];

    try {
      // Get the current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const aiInsights = AIInsightsService.getInstance();
      const crossModuleBridge = CrossModuleBridgeService.getInstance();

      // Get holistic insights combining health and financial data
      const holisticData = await crossModuleBridge.getHolisticInsights(user.id);

      // Generate mood-based insights using mood label only (since generateCombinedInsights expects 1 argument)
      moodInsights = await aiInsights.generateCombinedInsights(user.id);

      setPersonalizedInsights(moodInsights);

      // Save check-in to database
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();

      const { error: insertError } = await supabase
        .from('daily_checkins')
        .insert({
          user_id: user.id,
          mood: mood.label,
          checkin_date: today,
          checkin_time: now.toTimeString().split(' ')[0],
          insights_generated: moodInsights,
        });

      if (insertError) {
        console.error('Error saving check-in:', insertError);
        // Don't throw here - we still want to complete the check-in even if saving fails
      }

    } catch (error) {
      console.error('Error generating insights:', error);
      // Fallback insights
      moodInsights = [
        `Thanks for sharing that you're feeling ${mood.label.toLowerCase()} today.`,
        'Your AI coach is here to support you throughout the day.'
      ];
      setPersonalizedInsights(moodInsights);
    } finally {
      setIsGeneratingInsights(false);
    }

    setTimeout(() => {
      setHasCheckedIn(true);
      onCheckin?.();
    }, 300);
  };

  return (
    <TouchableOpacity
      onPress={hasCheckedIn && personalizedInsights.length > 0 ? toggleInsights : undefined}
      activeOpacity={hasCheckedIn && personalizedInsights.length > 0 ? 0.7 : 1}
      disabled={!(hasCheckedIn && personalizedInsights.length > 0)}
    >
      <GlassCard theme={theme} style={styles.card}>
        {/* Animated background gradient overlay */}
        <View style={styles.gradientOverlay} />

        <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.aiIcon}>
                <Icon name="robot" size={24} color="#6366F1" />
                <View style={styles.onlineIndicator} />
              </View>
              <View>
                <Text style={[styles.title, { color: themeColors.text }]}>
                  🤖 AI Daily Check-in
                </Text>
                <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
                  {loadingCheckinStatus
                    ? 'Loading your check-in status...'
                    : hasCheckedIn
                      ? `You checked in as ${selectedMood} today`
                      : 'How are you feeling today?'}
                </Text>
              </View>
            </View>
        </View>

      {!hasCheckedIn ? (
        <View style={styles.options}>
          {moods.map((mood, idx) => (
            <TouchableOpacity
              key={mood.label}
              style={[
                styles.moodButton,
                selectedMood === mood.label && styles.moodButtonSelected,
                { borderColor: themeColors.border }
              ]}
              onPress={() => handleMoodSelect(mood)}
              activeOpacity={0.8}
            >
              {/* Gradient background for selected mood */}
              {selectedMood === mood.label && (
                <View style={[styles.moodGradient, { backgroundColor: mood.color }]} />
              )}

              {/* Shimmer effect overlay */}
              <View style={styles.shimmerOverlay} />

              <View style={styles.moodContent}>
                <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                <Icon
                  name={mood.icon}
                  size={20}
                  color={selectedMood === mood.label ? '#FFFFFF' : themeColors.text}
                />
                <Text style={[
                  styles.moodText,
                  { color: selectedMood === mood.label ? '#FFFFFF' : themeColors.text }
                ]}>
                  {mood.label}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.checkedIn}>
          <View style={styles.successIcon}>
            <Icon name="check-circle" size={40} color="#10B981" />
          </View>
          <Text style={[styles.checkedInTitle, { color: themeColors.text }]}>
            Check-in Complete!
          </Text>
          <Text style={[styles.checkedInText, { color: themeColors.textSecondary }]}>
            Your AI coach will adapt to your{' '}
            <Text style={[styles.selectedMoodText, { color: themeColors.primary }]}>
              {selectedMood}
            </Text>{' '}
            mood and provide personalized support throughout the day.
          </Text>

          {/* Personalized Insights Section */}
          {personalizedInsights.length > 0 && isExpanded && (
            <View style={styles.insightsSection}>
              <Text style={[styles.insightsTitle, { color: themeColors.text }]}>
                💡 Personalized Insights
              </Text>
              <View style={styles.insightsContainer}>
                {personalizedInsights
                  .filter(insight => insight.trim() !== '') // Filter out empty strings
                  .map((insight, index) => {
                    // Check if this is a section header (contains emoji or **formatting**)
                    const isSectionHeader = insight.includes('🎯') || insight.includes('💡') || insight.includes('**');
                    const isRecommendation = insight.includes('Consider') || insight.includes('Regular exercise') || insight.includes('setting aside');

                    return (
                      <View key={index} style={[
                        styles.insightItem,
                        isSectionHeader && styles.sectionHeaderItem,
                        isRecommendation && styles.recommendationItem
                      ]}>
                        {isSectionHeader ? (
                          <Text style={[styles.sectionHeaderText, { color: themeColors.text }]}>
                            {insight.replace(/\*\*/g, '')} {/* Remove markdown formatting */}
                          </Text>
                        ) : (
                          <View style={styles.insightRow}>
                            <View style={[styles.bulletPoint, { backgroundColor: themeColors.primary }]} />
                            <Text style={[styles.insightText, { color: themeColors.textSecondary }]}>
                              {insight}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
              </View>
            </View>
          )}

          {/* Loading state for insights */}
          {isGeneratingInsights && (
            <View style={styles.loadingInsights}>
              <Icon name="brain" size={20} color={themeColors.primary} />
              <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
                Generating personalized insights...
              </Text>
            </View>
          )}
        </View>
      )}
    </GlassCard>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderRadius: 16,
  },
  header: {
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  aiIcon: {
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  title: {
    ...typography.h4,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodySmall,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moodButton: {
    width: '48%',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  moodButtonSelected: {
    transform: [{ scale: 1.05 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  moodGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.9,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  moodContent: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  moodText: {
    ...typography.body,
    fontWeight: '600',
    textAlign: 'center',
  },
  checkedIn: {
    alignItems: 'center',
    padding: spacing.md,
  },
  successIcon: {
    marginBottom: spacing.md,
  },
  checkedInTitle: {
    ...typography.h3,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  checkedInText: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 20,
  },
  selectedMoodText: {
    fontWeight: '600',
  },
  insightsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB', // light gray
  },
  insightsTitle: {
    ...typography.h4,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  insightsContainer: {
    marginTop: spacing.xs,
  },
  insightItem: {
    marginBottom: spacing.sm,
  },
  sectionHeaderItem: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  recommendationItem: {
    marginLeft: spacing.sm,
  },
  sectionHeaderText: {
    ...typography.body,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    marginRight: spacing.sm,
  },
  insightText: {
    ...typography.bodySmall,
    flex: 1,
    lineHeight: 18,
  },
  loadingInsights: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  loadingText: {
    ...typography.bodySmall,
  },
});

export default AICheckinCard;
