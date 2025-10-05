// src/navigation/ModernNavigation.tsx
// Modern tab navigation that works alongside existing hamburger menu

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  ThemeType,
} from '../theme/colors';
import { useCognitive } from '../contexts/CognitiveProvider';
import { useSoundscape } from '../contexts/SoundscapeContext';
import { GlassCard } from '../components/GlassComponents';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TabItem {
  id: string;
  label: string;
  icon: string;
  screen: string;
  badge?: number;
  color: string;
}

interface ModernNavigationProps {
  theme: ThemeType;
  onNavigate: (screen: string, params?: any) => void;
  currentScreen: string;
  showHamburgerMenu?: boolean; // Fallback to existing menu
  onShowHamburger?: () => void;
}

// Smart tab configuration that adapts based on usage patterns
const getTabConfiguration = (cognitiveLoad: number, uiMode: string) => {
  const baseTabs: TabItem[] = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: '🏠',
      screen: 'dashboard',
      color: '#6366F1',
    },
    {
      id: 'learn',
      label: 'Learn',
      icon: '🧠',
      screen: 'learn',
      color: '#8B5CF6',
    },
    {
      id: 'finance',
      label: 'Finance',
      icon: '💰',
      screen: 'finance',
      color: '#10B981',
    },
    {
      id: 'wellness',
      label: 'Health',
      icon: '❤️',
      screen: 'wellness',
      color: '#EF4444',
    },
    {
      id: 'profile',
      label: 'You',
      icon: '👤',
      screen: 'profile',
      color: '#06B6D4',
    },
  ];

  // In simple mode, reduce to 3 most essential tabs
  if (uiMode === 'simple' || cognitiveLoad > 0.8) {
    return baseTabs.slice(0, 3);
  }

  return baseTabs;
};

export const ModernNavigation: React.FC<ModernNavigationProps> = ({
  theme,
  onNavigate,
  currentScreen,
  showHamburgerMenu = true,
  onShowHamburger,
}) => {
  const insets = useSafeAreaInsets();
  const themeColors = colors[theme];
  const cognitive = useCognitive();
  const soundscape = useSoundscape();

  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [tabContainerWidth, setTabContainerWidth] = useState(SCREEN_WIDTH);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const tabs = getTabConfiguration(
    cognitive?.cognitiveLoad || 0.3,
    cognitive?.uiMode || 'normal',
  );

  const handleTabContainerLayout = useCallback((event: any) => {
    const { width } = event.nativeEvent.layout;
    setTabContainerWidth(width);
  }, []);

  // Calculate effective tab width and position accounting for margins and hamburger menu
  const getTabMetrics = useCallback(() => {
    const hamburgerWidth = showHamburgerMenu ? 50 : 0; // Estimated width for hamburger menu
    const effectiveWidth = tabContainerWidth - hamburgerWidth;
    const totalMargin = tabs.length * 4; // marginHorizontal: 2 on each side = 4 per tab
    const tabWidth = (effectiveWidth - totalMargin) / tabs.length;
    const tabSpace = effectiveWidth / tabs.length;
    const offset = (tabSpace - tabWidth) / 2; // Center the indicator in the tab space
    return { tabWidth, offset, tabSpace };
  }, [tabContainerWidth, tabs.length, showHamburgerMenu]);

  // Sync selectedTab with currentScreen and initialize slideAnim
  useEffect(() => {
    const matchingTab = tabs.find((tab) => tab.screen === currentScreen);
    if (matchingTab && matchingTab.id !== selectedTab) {
      setSelectedTab(matchingTab.id);
      const tabIndex = tabs.findIndex((t) => t.id === matchingTab.id);
      const { tabWidth, offset, tabSpace } = getTabMetrics();
      const targetPosition = tabIndex * tabSpace + offset;
      slideAnim.setValue(targetPosition);
    }
  }, [currentScreen, tabs, selectedTab, slideAnim, getTabMetrics, tabContainerWidth]);

  const handleTabPress = useCallback(
    (tab: TabItem) => {
      setSelectedTab(tab.id);
      onNavigate(tab.screen);

      // Animate selection indicator
      const tabIndex = tabs.findIndex((t) => t.id === tab.id);
      const { tabWidth, offset, tabSpace } = getTabMetrics();
      const targetPosition = tabIndex * tabSpace + offset;

      Animated.spring(slideAnim, {
        toValue: targetPosition,
        useNativeDriver: true,
        tension: 120,
        friction: 7,
      }).start();

      // Update soundscape context for navigation
      if (soundscape && typeof soundscape.switchScreen === 'function') {
        soundscape.switchScreen(tab.screen);
      }
    },
    [tabs, onNavigate, slideAnim, soundscape, getTabMetrics, tabContainerWidth],
  );

  const getTabStyle = (tab: TabItem, isSelected: boolean) => {
    if (isSelected) {
      return [
        styles.tab,
        {
          backgroundColor: tab.color + '20',
        },
      ];
    }

    return [styles.tab];
  };

  const getTabTextStyle = (tab: TabItem, isSelected: boolean) => {
    if (isSelected) {
      return [styles.tabText, { color: tab.color, fontWeight: '600' as const }];
    }

    return [styles.tabText, { color: themeColors.textMuted }];
  };

  const renderTab = (tab: TabItem, index: number) => {
    const isSelected = selectedTab === tab.id;

    return (
      <TouchableOpacity
        key={tab.id}
        style={getTabStyle(tab, isSelected)}
        onPress={() => handleTabPress(tab)}
        activeOpacity={0.7}
        accessibilityLabel={tab.label}
        accessibilityState={{ selected: isSelected }}
      >
        <Text style={[styles.tabIcon, isSelected && { color: tab.color }]}>
          {tab.icon}
        </Text>
        <Text style={getTabTextStyle(tab, isSelected)}>{tab.label}</Text>
        {tab.badge && tab.badge > 0 && (
          <View style={[styles.badge, { backgroundColor: tab.color }]}>
            <Text style={styles.badgeText}>
              {tab.badge > 99 ? '99+' : tab.badge}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <GlassCard
        theme={theme}
        style={[
          styles.navigationCard,
          {
            backgroundColor: themeColors.surface,
            borderTopColor: themeColors.border,
          },
        ]}
      >
        {/* Cognitive Load Indicator */}
        {cognitive && cognitive.cognitiveLoad > 0.6 && (
          <View style={styles.cognitiveIndicator}>
            <View
              style={[
                styles.cognitiveBar,
                {
                  width: `${(cognitive?.cognitiveLoad || 0) * 100}%`,
                  backgroundColor:
                    (cognitive?.cognitiveLoad || 0) > 0.8
                      ? themeColors.error
                      : (cognitive?.cognitiveLoad || 0) > 0.6
                      ? themeColors.warning
                      : themeColors.success,
                },
              ]}
            />
          </View>
        )}

        {/* Tab Navigation */}
        <View style={styles.tabContainer} onLayout={handleTabContainerLayout}>
          {/* Selection Indicator */}
          <Animated.View
            style={[
              styles.selectionIndicator,
              {
                width: getTabMetrics().tabWidth,
                backgroundColor:
                  tabs.find((t) => t.id === selectedTab)?.color ||
                  themeColors.primary,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          />

          {tabs.map((tab, index) => renderTab(tab, index))}

          {/* Hamburger Menu Button (fallback) */}
          {showHamburgerMenu && (
            <TouchableOpacity
              style={styles.hamburgerButton}
              onPress={onShowHamburger}
              activeOpacity={0.7}
              accessibilityLabel="More options"
            >
              <Text style={[styles.tabIcon, { color: themeColors.textMuted }]}>
                ⋯
              </Text>
              <Text style={[styles.tabText, { color: themeColors.textMuted }]}>
                More
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* UI Mode Indicator */}
        {cognitive && cognitive.uiMode === 'simple' && (
          <View style={styles.modeIndicator}>
            <Text style={[styles.modeText, { color: themeColors.textMuted }]}>
              Simple Mode
            </Text>
          </View>
        )}
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'transparent',
  },
  navigationCard: {
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    minHeight: 70,
  },
  cognitiveIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  cognitiveBar: {
    height: '100%',
    borderTopLeftRadius: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    height: 56,
  },
  selectionIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    borderRadius: 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginHorizontal: 2,
    position: 'relative',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  hamburgerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginLeft: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  modeIndicator: {
    position: 'absolute',
    bottom: 4,
    right: spacing.sm,
  },
  modeText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '500',
  },
});

export default ModernNavigation;
