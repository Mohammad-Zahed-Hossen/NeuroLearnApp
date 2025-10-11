// src/components/CommandPalette.tsx
// Global search and command palette for power users

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Keyboard,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  ThemeType,
} from '../../theme/colors';
import { GlassCard } from '../GlassComponents';
import { CognitiveLoadIndicator } from '../CognitiveIndicators';
import { useCognitive } from '../../contexts/CognitiveProvider';
import { useSoundscape } from '../../contexts/SoundscapeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Command {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'navigation' | 'action' | 'setting' | 'cognitive';
  keywords: string[];
  action: () => void;
  cognitiveLoad?: number; // How much mental effort this action requires
}

interface CommandPaletteProps {
  theme: ThemeType;
  visible: boolean;
  onClose: () => void;
  onNavigate: (screen: string, params?: any) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  theme,
  visible,
  onClose,
  onNavigate,
}) => {
  const insets = useSafeAreaInsets();
  const themeColors = colors[theme];
  const cognitive = useCognitive();
  const soundscape = useSoundscape();

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCommands, setFilteredCommands] = useState<Command[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const searchInputRef = useRef<TextInput>(null);

  // Generate commands based on app state and cognitive context
  const generateCommands = useCallback((): Command[] => {
    const baseCommands: Command[] = [
      // Navigation Commands
      {
        id: 'nav_dashboard',
        title: 'Go to Dashboard',
        description: 'Main overview and analytics',
        icon: '🏠',
        category: 'navigation' as const,
        keywords: ['home', 'dashboard', 'main', 'overview'],
        cognitiveLoad: 0.1,
        action: () => onNavigate('dashboard'),
      },
      {
        id: 'nav_flashcards',
        title: 'Study Flashcards',
        description: 'FSRS spaced repetition system',
        icon: '🎴',
        category: 'navigation' as const,
        keywords: ['flashcards', 'study', 'review', 'memory', 'fsrs'],
        cognitiveLoad: 0.7,
        action: () => onNavigate('flashcards'),
      },
      {
        id: 'nav_focus_timer',
        title: 'Start Focus Timer',
        description: 'Pomodoro focus sessions',
        icon: '⏱️',
        category: 'navigation' as const,
        keywords: ['focus', 'timer', 'pomodoro', 'concentrate'],
        cognitiveLoad: 0.3,
        action: () => onNavigate('focus'),
      },
      {
        id: 'nav_speed_reading',
        title: 'Speed Reading',
        description: 'RSVP and comprehension training',
        icon: '⚡',
        category: 'navigation' as const,
        keywords: ['speed', 'reading', 'rsvp', 'comprehension'],
        cognitiveLoad: 0.7,
        action: () => onNavigate('speed-reading'),
      },
      {
        id: 'nav_logic_trainer',
        title: 'Logic Trainer',
        description: 'Logical reasoning practice',
        icon: '🧩',
        category: 'navigation' as const,
        keywords: ['logic', 'reasoning', 'problem', 'solving'],
        cognitiveLoad: 0.7,
        action: () => onNavigate('logic-trainer'),
      },
      {
        id: 'nav_memory_palace',
        title: 'Memory Palace',
        description: 'Method of loci visualization',
        icon: '🏰',
        category: 'navigation' as const,
        keywords: ['memory', 'palace', 'loci', 'visualization'],
        cognitiveLoad: 0.6,
        action: () => onNavigate('memory-palace'),
      },
      {
        id: 'nav_neural_map',
        title: 'Neural Mind Map',
        description: 'AI-powered knowledge graph',
        icon: '🧠',
        category: 'navigation' as const,
        keywords: ['mind', 'map', 'neural', 'knowledge', 'graph'],
        cognitiveLoad: 0.5,
        action: () => onNavigate('neural-mind-map'),
      },
      {
        id: 'nav_tasks',
        title: 'Task Manager',
        description: 'GTD productivity system',
        icon: '✅',
        category: 'navigation' as const,
        keywords: ['tasks', 'todo', 'gtd', 'productivity'],
        cognitiveLoad: 0.4,
        action: () => onNavigate('tasks'),
      },
      {
        id: 'nav_settings',
        title: 'Settings',
        description: 'App configuration and preferences',
        icon: '⚙️',
        category: 'navigation' as const,
        keywords: ['settings', 'config', 'preferences'],
        cognitiveLoad: 0.2,
        action: () => onNavigate('settings'),
      },
      {
        id: 'nav_progress',
        title: 'Analytics',
        description: 'Learning progress and metrics',
        icon: '📊',
        category: 'navigation' as const,
        keywords: ['analytics', 'progress', 'metrics', 'stats'],
        cognitiveLoad: 0.3,
        action: () => onNavigate('progress'),
      },

      // Action Commands
      {
        id: 'action_quick_flashcard',
        title: 'Quick Flashcard Review',
        description: 'Review 5 due flashcards',
        icon: '⚡',
        category: 'action' as const,
        keywords: ['quick', 'review', 'flashcards', 'five'],
        cognitiveLoad: 0.6,
        action: () => onNavigate('flashcards', { quickMode: true, count: 5 }),
      },
      {
        id: 'action_start_pomodoro',
        title: 'Start 25min Focus',
        description: 'Begin a Pomodoro session',
        icon: '🍅',
        category: 'action' as const,
        keywords: ['pomodoro', '25', 'focus', 'timer', 'start'],
        cognitiveLoad: 0.3,
        action: () => onNavigate('focus', { duration: 25, autoStart: true }),
      },
      {
        id: 'action_break_suggestion',
        title: 'Take a Smart Break',
        description: 'AI-recommended break activity',
        icon: '🧘',
        category: 'action' as const,
        keywords: ['break', 'rest', 'mindful', 'relax'],
        cognitiveLoad: 0.1,
        action: async () => {
          const recommendations =
            await cognitive.getPersonalizedRecommendations();
          onNavigate('dashboard', { showBreakSuggestion: recommendations[0] });
        },
      },

      // Soundscape Commands
      ...(soundscape
        ? [
            {
              id: 'soundscape_focus',
              title: 'Deep Focus Soundscape',
              description: 'Beta waves for concentration',
              icon: '🎵',
              category: 'action' as const,
              keywords: ['soundscape', 'focus', 'beta', 'concentration'],
              cognitiveLoad: 0.2,
              action: () => soundscape.startPreset('deep_focus'),
            },
            {
              id: 'soundscape_memory',
              title: 'Memory Flow Soundscape',
              description: 'Alpha waves for learning',
              icon: '🎶',
              category: 'action' as const,
              keywords: ['soundscape', 'memory', 'alpha', 'learning'],
              cognitiveLoad: 0.2,
              action: () => soundscape.startPreset('memory_flow'),
            },
            {
              id: 'soundscape_stop',
              title: 'Stop Soundscape',
              description: 'Turn off current audio',
              icon: '⏹️',
              category: 'action' as const,
              keywords: ['stop', 'soundscape', 'audio', 'off'],
              cognitiveLoad: 0.1,
              action: () => soundscape.stopSoundscape(),
            },
          ]
        : []),

      // Cognitive Commands
      {
        id: 'cognitive_simple_mode',
        title: 'Enable Simple Mode',
        description: 'Reduce UI complexity for focus',
        icon: '🎯',
        category: 'cognitive' as const,
        keywords: ['simple', 'mode', 'minimal', 'focus'],
        cognitiveLoad: 0.1,
        action: () => cognitive.adaptUI('simple'),
      },
      {
        id: 'cognitive_advanced_mode',
        title: 'Enable Advanced Mode',
        description: 'Show all features and options',
        icon: '🚀',
        category: 'cognitive' as const,
        keywords: ['advanced', 'mode', 'expert', 'full'],
        cognitiveLoad: 0.2,
        action: () => cognitive.adaptUI('advanced'),
      },
      {
        id: 'cognitive_reset_day',
        title: 'Reset Daily Progress',
        description: "Clear today's session counters",
        icon: '🔄',
        category: 'cognitive' as const,
        keywords: ['reset', 'day', 'progress', 'clear'],
        cognitiveLoad: 0.1,
        action: () => cognitive.resetDay(),
      },
    ];

    // Filter commands based on cognitive load
    if (cognitive.uiMode === 'simple') {
      return baseCommands.filter((cmd) => (cmd.cognitiveLoad || 0) <= 0.5);
    }

    return baseCommands;
  }, [onNavigate, cognitive, soundscape]);

  // Filter commands based on search query
  useEffect(() => {
    const commands = generateCommands();

    if (!searchQuery.trim()) {
      // Show recent/frequent commands when no search
      setFilteredCommands(commands.slice(0, 8));
    } else {
      const filtered = commands.filter((command) => {
        const query = searchQuery.toLowerCase();
        return (
          command.title.toLowerCase().includes(query) ||
          command.description.toLowerCase().includes(query) ||
          command.keywords.some((keyword) =>
            keyword.toLowerCase().includes(query),
          )
        );
      });

      // Sort by relevance (exact matches first)
      filtered.sort((a, b) => {
        const aExact = a.title.toLowerCase().includes(searchQuery.toLowerCase())
          ? 1
          : 0;
        const bExact = b.title.toLowerCase().includes(searchQuery.toLowerCase())
          ? 1
          : 0;
        return bExact - aExact;
      });

      setFilteredCommands(filtered.slice(0, 12));
    }

    setSelectedIndex(0);
  }, [searchQuery, generateCommands]);

  // Animation effects
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start(() => {
        searchInputRef.current?.focus();
      });
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -50,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleCommandSelect = (command: Command) => {
    command.action();
    setSearchQuery('');
    onClose();
    Keyboard.dismiss();
  };

  const handleKeyPress = (key: string) => {
    if (key === 'ArrowDown') {
      setSelectedIndex(
        Math.min(selectedIndex + 1, filteredCommands.length - 1),
      );
    } else if (key === 'ArrowUp') {
      setSelectedIndex(Math.max(selectedIndex - 1, 0));
    } else if (key === 'Enter') {
      if (filteredCommands[selectedIndex]) {
        handleCommandSelect(filteredCommands[selectedIndex]);
      }
    } else if (key === 'Escape') {
      onClose();
    }
  };

  const getCategoryIcon = (category: Command['category']) => {
    switch (category) {
      case 'navigation':
        return '🧭';
      case 'action':
        return '⚡';
      case 'setting':
        return '⚙️';
      case 'cognitive':
        return '🧠';
      default:
        return '📋';
    }
  };

  const getCategoryColor = (category: Command['category']) => {
    switch (category) {
      case 'navigation':
        return themeColors.primary;
      case 'action':
        return themeColors.success;
      case 'setting':
        return themeColors.accent;
      case 'cognitive':
        return themeColors.tertiary;
      default:
        return themeColors.textMuted;
    }
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.paletteContainer,
            {
              paddingTop: insets.top + 60,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <GlassCard
            theme={theme}
            style={[
              styles.palette,
              {
                backgroundColor: themeColors.surface + 'F5',
                borderColor: themeColors.border,
              },
            ]}
          >
            {/* Search Header */}
            <View style={styles.searchContainer}>
              <Text style={[styles.searchIcon, { color: themeColors.primary }]}>
                🔍
              </Text>
              <TextInput
                ref={searchInputRef}
                style={[
                  styles.searchInput,
                  {
                    color: themeColors.text,
                    backgroundColor: themeColors.background + '80',
                    borderColor: themeColors.border,
                  },
                ]}
                placeholder="Search commands or type action..."
                placeholderTextColor={themeColors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Cognitive Load Warning */}
            {cognitive.cognitiveLoad > 0 && (
              <CognitiveLoadIndicator
                theme={theme}
                load={cognitive.cognitiveLoad}
              />
            )}

            {/* Commands List */}
            <ScrollView
              style={styles.commandsList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {filteredCommands.map((command, index) => (
                <TouchableOpacity
                  key={command.id}
                  style={[
                    styles.commandItem,
                    {
                      backgroundColor:
                        index === selectedIndex
                          ? themeColors.primary + '20'
                          : 'transparent',
                    },
                  ]}
                  onPress={() => handleCommandSelect(command)}
                  activeOpacity={0.7}
                >
                  <View style={styles.commandLeft}>
                    <View
                      style={[
                        styles.commandIconContainer,
                        {
                          backgroundColor:
                            getCategoryColor(command.category) + '20',
                        },
                      ]}
                    >
                      <Text style={styles.commandIcon}>{command.icon}</Text>
                    </View>

                    <View style={styles.commandText}>
                      <Text
                        style={[
                          styles.commandTitle,
                          { color: themeColors.text },
                        ]}
                      >
                        {command.title}
                      </Text>
                      <Text
                        style={[
                          styles.commandDescription,
                          { color: themeColors.textMuted },
                        ]}
                      >
                        {command.description}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.commandRight}>
                    <Text
                      style={[
                        styles.categoryIcon,
                        { color: getCategoryColor(command.category) },
                      ]}
                    >
                      {getCategoryIcon(command.category)}
                    </Text>

                    {/* Cognitive Load Indicator */}
                    {command.cognitiveLoad && command.cognitiveLoad > 0.5 && (
                      <View
                        style={[
                          styles.loadIndicator,
                          {
                            backgroundColor:
                              command.cognitiveLoad > 0.7
                                ? themeColors.error
                                : themeColors.warning,
                          },
                        ]}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              {filteredCommands.length === 0 && (
                <View style={styles.emptyState}>
                  <Text
                    style={[styles.emptyIcon, { color: themeColors.textMuted }]}
                  >
                    🔍
                  </Text>
                  <Text
                    style={[styles.emptyText, { color: themeColors.textMuted }]}
                  >
                    No commands found
                  </Text>
                  <Text
                    style={[
                      styles.emptySubtext,
                      { color: themeColors.textMuted },
                    ]}
                  >
                    Try different keywords
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Footer Tips */}
            <View style={styles.footer}>
              <Text
                style={[styles.footerText, { color: themeColors.textMuted }]}
              >
                ↑↓ Navigate • ↵ Execute • Esc Close
              </Text>
            </View>
          </GlassCard>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  backdrop: {
    flex: 1,
  },
  paletteContainer: {
    position: 'absolute',
    top: 0,
    left: spacing.md,
    right: spacing.md,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  palette: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: '100%',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    fontWeight: '400',
  },
  warningBanner: {
    padding: spacing.sm,
    borderRadius: 8,
    margin: spacing.sm,
  },
  warningText: {
    ...typography.caption,
    textAlign: 'center',
    fontWeight: '500',
  },
  commandsList: {
    maxHeight: 400,
  },
  commandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    marginHorizontal: spacing.xs,
    marginVertical: 2,
  },
  commandLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  commandIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  commandIcon: {
    fontSize: 18,
  },
  commandText: {
    flex: 1,
  },
  commandTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  commandDescription: {
    ...typography.caption,
    fontSize: 12,
  },
  commandRight: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  categoryIcon: {
    fontSize: 12,
    marginRight: spacing.xs,
  },
  loadIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.caption,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  footerText: {
    ...typography.caption,
    fontSize: 11,
  },
});

export default CommandPalette;
