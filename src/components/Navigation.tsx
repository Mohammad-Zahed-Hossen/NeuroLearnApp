import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  StatusBar,
  Animated,
  Vibration,
} from 'react-native';
import { GlassCard } from './GlassComponents';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { ThemeType } from '../theme/colors';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Optimal overlay darkness
  },
  menuContainer: {
    width: 320, // Optimal width for thumb reachability
    paddingTop: StatusBar.currentHeight || 44,
    elevation: 16, // Deeper shadow for better depth perception
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flex: 1,
  },
  appTitle: {
    ...typography.h3,
    fontWeight: '700', // Higher contrast for importance
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
    fontSize: 12, // Slightly larger for readability
  },
  closeButton: {
    borderRadius: 22, // Perfect circle for touch
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  closeIcon: {
    fontSize: 24,
    fontWeight: '300',
    lineHeight: 24,
  },
  menuList: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: spacing.lg,
    marginBottom: spacing.sm,
  },
  menuItem: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  frequentItem: {
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(139, 92, 246, 0.3)',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  iconContainer: {
    position: 'relative',
    width: 40,
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuIcon: {
    fontSize: 20, // Optimal icon size
    textAlign: 'center',
  },
  frequencyDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  menuTextContent: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
  menuTitle: {
    ...typography.body,
    fontWeight: '500',
    marginBottom: 2, // Tighter spacing
  },
  menuDescription: {
    ...typography.caption,
    lineHeight: 14,
    fontSize: 11, // Smaller for secondary information
  },
  cognitiveWeight: {
    width: 20,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginLeft: spacing.sm,
  },
  weightBar: {
    height: '100%',
    borderRadius: 2,
  },
  activeIndicator: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 3, // Thinner for subtlety
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  footerText: {
    ...typography.caption,
    fontSize: 10, // Minimal footprint
  },

  // NEW FLOATING HEADER STYLES (MODIFIED FOR FLOATING BAR)
  hamburgerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburgerLine: {
    height: 2,
    width: 20,
    borderRadius: 1,
    marginVertical: 2,
  },
  headerTitle: {
    ...typography.h4,
    fontWeight: '600',
    fontSize: 18,
  },
  rightContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 24,
    height: 24,
  },
  cognitiveLoadBar: {
    // Positioned absolutely in the component
  },
  loadProgress: {
    // Styled in the component
  },
});

interface MenuItem {
  id: string;
  title: string;
  icon: string;
  screen: string;
  description: string;
  cognitiveWeight: number; // 1-5 scale for mental effort required
  usageFrequency: number; // 1-5 scale for how often used
}

interface HamburgerMenuProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
  currentScreen: string;
  theme: ThemeType;
  userBehavior?: {
    frequentlyUsed: string[];
    lastUsed: { [key: string]: Date };
  };
}

// Scientifically ordered based on Fitts's Law and Hick's Law
const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: '🧠',
    screen: 'dashboard',
    description: 'Cognitive Load & Learning Analytics',
    cognitiveWeight: 1,
    usageFrequency: 5,
  },
  {
    id: 'focus',
    title: 'Focus Timer',
    icon: '⏱️',
    screen: 'focus',
    description: 'Scientific Pomodoro & Deep Work Sessions',
    cognitiveWeight: 2,
    usageFrequency: 4,
  },
  {
    id: 'flashcards',
    title: 'Flashcards',
    icon: '🎴',
    screen: 'flashcards',
    description: 'FSRS Spaced Repetition System',
    cognitiveWeight: 3,
    usageFrequency: 4,
  },
  {
    id: 'tasks',
    title: 'Task Manager',
    icon: '✓',
    screen: 'tasks',
    description: 'GTD-Based Productivity System',
    cognitiveWeight: 2,
    usageFrequency: 3,
  },
  {
    id: 'speed-reading',
    title: 'Speed Reading',
    icon: '⚡',
    screen: 'speed-reading',
    description: 'RSVP & Comprehension Training',
    cognitiveWeight: 4,
    usageFrequency: 2,
  },
  {
    id: 'memory-palace',
    title: 'Memory Palace',
    icon: '🏰',
    screen: 'memory-palace',
    description: 'Method of Loci Implementation',
    cognitiveWeight: 5,
    usageFrequency: 2,
  },
  {
    id: 'progress',
    title: 'Analytics',
    icon: '📊',
    screen: 'progress',
    description: 'Learning Performance Metrics',
    cognitiveWeight: 2,
    usageFrequency: 3,
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: '⚙️',
    screen: 'settings',
    description: 'Configuration & API Integration',
    cognitiveWeight: 1,
    usageFrequency: 1,
  },
  {
    id: 'neural-mind-map',
    title: 'Neural Mind Map',
    icon: '🧠',
    screen: 'neural-mind-map',
    description: 'AI-Powered Knowledge Visualization',
    cognitiveWeight: 3,
    usageFrequency: 3,
  },
  {
    id: 'logic-trainer',
    title: 'Logic Trainer',
    icon: '🧩',
    screen: 'logic-trainer',
    description: 'Logical Reasoning & Problem Solving',
    cognitiveWeight: 4,
    usageFrequency: 3,
  },
];

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  visible,
  onClose,
  onNavigate,
  currentScreen,
  theme,
  userBehavior,
}) => {
  const themeColors = colors[theme];
  const slideAnim = React.useRef(new Animated.Value(-320)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Miller's Law: Chunk items into meaningful groups (7±2 items)
  const primaryItems = menuItems.filter((item) => item.usageFrequency >= 3);
  const secondaryItems = menuItems.filter((item) => item.usageFrequency < 3);

  React.useEffect(() => {
    if (visible) {
      // Animate menu entrance with proper timing based on research
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations when closing
      slideAnim.setValue(-320);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const handleNavigate = (screen: string) => {
    // Provide haptic feedback (sensory confirmation)
    Vibration.vibrate(5);
    onNavigate(screen);
    onClose();
  };

  const getMenuItemStyle = (item: MenuItem, isActive: boolean) => {
    // Fitts's Law: Larger touch targets for frequent actions
    const baseStyle = {
      minHeight: item.usageFrequency >= 4 ? 70 : 60,
      paddingVertical: item.usageFrequency >= 4 ? spacing.lg : spacing.md,
    };

    if (isActive) {
      return {
        ...baseStyle,
        backgroundColor: themeColors.primary + '20', // 20% opacity
        borderLeftWidth: 4,
        borderLeftColor: themeColors.primary,
      };
    }

    return baseStyle;
  };

  const renderMenuSection = (items: MenuItem[], title?: string) => (
    <View style={styles.section}>
      {title && (
        <Text style={[styles.sectionTitle, { color: themeColors.textMuted }]}>
          {title}
        </Text>
      )}
      {items.map((item) => {
        const isActive = currentScreen === item.screen;
        const isFrequentlyUsed = userBehavior?.frequentlyUsed?.includes(
          item.id,
        );

        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => handleNavigate(item.screen)}
            style={[
              styles.menuItem,
              getMenuItemStyle(item, isActive),
              isFrequentlyUsed && styles.frequentItem,
            ]}
            activeOpacity={0.7}
            // Accessibility: Larger touch area for cognitive ease
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <View style={styles.menuItemContent}>
              <View style={styles.iconContainer}>
                <Text
                  style={[
                    styles.menuIcon,
                    isActive && { transform: [{ scale: 1.1 }] },
                  ]}
                >
                  {item.icon}
                </Text>
                {isFrequentlyUsed && (
                  <View
                    style={[
                      styles.frequencyDot,
                      { backgroundColor: themeColors.primary },
                    ]}
                  />
                )}
              </View>

              <View style={styles.menuTextContent}>
                <Text
                  style={[
                    styles.menuTitle,
                    {
                      color: isActive ? themeColors.primary : themeColors.text,
                      fontWeight: isActive ? '600' : '500',
                    },
                  ]}
                  numberOfLines={1}
                  // Optimal line length for reading (45-75 characters)
                >
                  {item.title}
                </Text>
                <Text
                  style={[
                    styles.menuDescription,
                    { color: themeColors.textSecondary },
                  ]}
                  numberOfLines={2}
                  // Cognitive load reduction: Limit description length
                >
                  {item.description}
                </Text>
              </View>

              {/* Visual hierarchy indicator */}
              <View style={styles.cognitiveWeight}>
                <View
                  style={[
                    styles.weightBar,
                    {
                      width: `${item.cognitiveWeight * 20}%`,
                      backgroundColor:
                        item.cognitiveWeight >= 4
                          ? themeColors.warning
                          : item.cognitiveWeight >= 3
                          ? themeColors.primary
                          : themeColors.success,
                    },
                  ]}
                />
              </View>
            </View>

            {isActive && (
              <View
                style={[
                  styles.activeIndicator,
                  { backgroundColor: themeColors.primary },
                ]}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none" // We handle animation manually
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
          // Fitts's Law: Easy to dismiss by tapping anywhere outside
        />

        <Animated.View
          style={[
            styles.menuContainer,
            {
              backgroundColor: themeColors.surface,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Header with optimized information density */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={[styles.appTitle, { color: themeColors.text }]}>
                NeuroLearn
              </Text>
              <Text
                style={[styles.subtitle, { color: themeColors.textSecondary }]}
                numberOfLines={1}
              >
                Smart Cognitive Learning System
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeButton,
                {
                  borderColor: themeColors.border,
                  // Fitts's Law: Larger close target
                  width: 44,
                  height: 44,
                },
              ]}
              hitSlop={8}
            >
              <Text style={[styles.closeIcon, { color: themeColors.text }]}>
                ×
              </Text>
            </TouchableOpacity>
          </View>

          {/* Scrollable content with chunked sections */}
          <ScrollView
            style={styles.menuList}
            showsVerticalScrollIndicator={false}
            // Gestalt: Clear visual separation
            contentContainerStyle={styles.scrollContent}
          >
            {renderMenuSection(primaryItems, 'Frequently Used')}
            {secondaryItems.length > 0 &&
              renderMenuSection(secondaryItems, 'Advanced Tools')}
          </ScrollView>

          {/* Footer with minimal cognitive load */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: themeColors.textMuted }]}>
              v1.0.0 • Evidence-Based Design
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

interface HeaderProps {
  title: string;
  theme: ThemeType;
  onMenuPress: () => void;
  rightComponent?: React.ReactNode;
  cognitiveLoad?: number; // 0-1 scale for adaptive UI
}


// NEW FLOATING AppHeader COMPONENT (MODIFIED)
export const AppHeader: React.FC<HeaderProps> = ({
  title,
  theme,
  onMenuPress,
  rightComponent,
  cognitiveLoad = 0.5,
}) => {
  const themeColors = colors[theme];
  const [pulseAnim] = React.useState(new Animated.Value(1));

  // Adaptive UI based on cognitive load
  const getHeaderStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      top: 40,
      left: 20,
      right: 20,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 20,
      borderWidth: 1,
      zIndex: 1000,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      marginHorizontal: spacing.md,
      // Glass morphism effect
      backgroundColor: themeColors.surface + 'CC', // Semi-transparent
      borderColor: themeColors.border + '40',
    };

    if (cognitiveLoad > 0.8) {
      return {
        ...baseStyle,
        backgroundColor: themeColors.warning + '20', // Reduced stimulation for high cognitive load
      };
    }
    return baseStyle;
  };

  const handleMenuPress = () => {
    // Provide immediate feedback
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    Vibration.vibrate(3);
    onMenuPress();
  };

  return (
    <View style={getHeaderStyle()}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        translucent={true}
      />

      {/* Hamburger Menu Button */}
      <TouchableOpacity
        onPress={handleMenuPress}
        style={styles.hamburgerButton}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          {/* Adaptive hamburger icon based on cognitive load */}
          {cognitiveLoad > 0.7 ? (
            // Simplified icon for high cognitive load
            <>
              <View
                style={[
                  styles.hamburgerLine,
                  {
                    backgroundColor: themeColors.text,
                    height: 2,
                    marginVertical: 3,
                  },
                ]}
              />
              <View
                style={[
                  styles.hamburgerLine,
                  {
                    backgroundColor: themeColors.text,
                    height: 2,
                    marginVertical: 3,
                  },
                ]}
              />
            </>
          ) : (
            // Standard three-line icon
            <>
              <View
                style={[
                  styles.hamburgerLine,
                  { backgroundColor: themeColors.text },
                ]}
              />
              <View
                style={[
                  styles.hamburgerLine,
                  { backgroundColor: themeColors.text },
                ]}
              />
              <View
                style={[
                  styles.hamburgerLine,
                  { backgroundColor: themeColors.text },
                ]}
              />
            </>
          )}
        </Animated.View>
      </TouchableOpacity>

      {/* Center Title */}
      <Text
        style={[
          styles.headerTitle,
          {
            color: themeColors.text,
            flex: 1,
            textAlign: 'center',
            marginHorizontal: spacing.md,
          }
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {title}
      </Text>

      {/* Right Component or Placeholder */}
      <View style={styles.rightContainer}>
        {rightComponent || <View style={styles.placeholder} />}
      </View>

      {/* Cognitive load indicator - Only show when relevant */}
      {cognitiveLoad > 0.6 && (
        <View
          style={[
            styles.cognitiveLoadBar,
            {
              position: 'absolute' as const,
              bottom: -2,
              left: 0,
              right: 0,
              height: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }
          ]}
        >
          <View
            style={[
              styles.loadProgress,
              {
                width: `${cognitiveLoad * 100}%`,
                backgroundColor:
                  cognitiveLoad > 0.8
                    ? themeColors.warning
                    : cognitiveLoad > 0.6
                    ? themeColors.primary
                    : themeColors.success,
                height: '100%',
              },
            ]}
          />
        </View>
      )}
    </View>
  );
};










