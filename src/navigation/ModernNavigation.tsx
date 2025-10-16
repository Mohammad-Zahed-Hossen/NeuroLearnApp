// src/navigation/ModernNavigation.tsx
// Modern tab navigation that works alongside existing hamburger menu

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  memo,
  lazy,
} from 'react';
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
import { useQueryClient } from '@tanstack/react-query';
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
import { TabItem, CognitiveLoad, UIMode } from './NavigationTypes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ModernNavigationProps {
  theme: ThemeType;
  onNavigate: (screen: string, params?: any) => void;
  currentScreen?: string | undefined;
  showHamburgerMenu?: boolean; // Fallback to existing menu
  onShowHamburger?: () => void;
}

const MemoizedCognitiveIndicator = memo(
  ({
    cognitiveLoad,
    themeColors,
  }: {
    cognitiveLoad: number;
    themeColors: any;
  }) => {
    if (cognitiveLoad <= 0.6) return null;

    return (
      <View style={styles.cognitiveIndicator}>
        <View
          style={[
            styles.cognitiveBar,
            {
              width: `${cognitiveLoad * 100}%`,
              backgroundColor:
                cognitiveLoad > 0.8
                  ? themeColors.error
                  : cognitiveLoad > 0.6
                  ? themeColors.warning
                  : themeColors.success,
            },
          ]}
        />
      </View>
    );
  },
);

// Smart tab configuration that adapts based on usage patterns
const getTabConfiguration = (cognitiveLoad: CognitiveLoad, uiMode: UIMode) => {
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
      id: 'integrations',
      label: 'Hub',
      icon: '🔗',
      screen: 'integrations',
      color: '#F59E0B',
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
  const queryClient = useQueryClient();

  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [tabContainerWidth, setTabContainerWidth] = useState(SCREEN_WIDTH);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const navigationStartTime = useRef<number>(0);

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

  // Prefetch data and lazy load screens when component mounts or cognitive load changes
  useEffect(() => {
    const prefetchTabData = async () => {
      // Only prefetch if cognitive load is low to avoid overwhelming the user
      if ((cognitive?.cognitiveLoad || 0) < 0.7) {
        try {
          // Prefetch dashboard data
          queryClient.prefetchQuery({
            queryKey: ['dashboard-data'],
            queryFn: async () => {
              // Import dashboard data fetching logic
              const { useOptimizedQuery } = await import(
                '../hooks/useOptimizedQuery'
              );
              // This would be the actual query function for dashboard data
              return { summary: {}, recentActivity: [] };
            },
            staleTime: 5 * 60 * 1000, // 5 minutes
          });

          // Lazy load dashboard screen component
          lazy(() =>
            import('../screens/DashboardScreen').then((module) => ({
              default: module.DashboardScreen,
            })),
          );

          // Prefetch finance data if user has finance access
          queryClient.prefetchQuery({
            queryKey: ['finance-summary'],
            queryFn: async () => {
              const { useFinanceData } = await import(
                '../hooks/useFinanceData'
              );
              return { totalBalance: 0, monthlyIncome: 0, monthlyExpenses: 0 };
            },
            staleTime: 10 * 60 * 1000, // 10 minutes
          });

          // Lazy load finance screen component
          lazy(() => import('../screens/finance/FinanceDashboardScreen'));

          // Prefetch wellness data
          queryClient.prefetchQuery({
            queryKey: ['wellness-summary'],
            queryFn: async () => {
              return { sleep: [], workout: [], water: [] };
            },
            staleTime: 15 * 60 * 1000, // 15 minutes
          });

          // Lazy load wellness screen component
          lazy(() => import('../screens/wellness/WellnessDashboardScreen'));
        } catch (error) {
          console.warn('Prefetch failed:', error);
        }
      }
    };

    prefetchTabData();
  }, [cognitive?.cognitiveLoad, queryClient]);

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
  }, [
    currentScreen,
    tabs,
    selectedTab,
    slideAnim,
    getTabMetrics,
    tabContainerWidth,
  ]);

  const trackNavigationPerformance = useCallback(
    (tab: TabItem, duration: number) => {
      console.log(`Navigation to ${tab.screen} took ${duration.toFixed(2)}ms`);

      // Detailed performance metrics
      const metrics = {
        screen: tab.screen,
        duration,
        cognitiveLoad: cognitive?.cognitiveLoad || 0,
        timestamp: Date.now(),
        tabIndex: tabs.findIndex((t) => t.id === tab.id),
        totalTabs: tabs.length,
      };

      // Log to console for debugging
      console.log('Navigation Performance Metrics:', metrics);

      // Placeholder for analytics integration
      // Example: Send to external analytics service
      // analytics.track('navigation_transition', metrics);
      // Or send to custom performance monitoring service
      // performanceMonitor.track('navigation', metrics);
    },
    [cognitive?.cognitiveLoad, tabs],
  );

  const handleTabPress = useCallback(
    (tab: TabItem) => {
      // Start performance tracking
      navigationStartTime.current = performance.now();

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
      }).start(() => {
        // Track navigation performance when animation completes
        const navigationDuration =
          performance.now() - navigationStartTime.current;
        trackNavigationPerformance(tab, navigationDuration);
      });

      // Update soundscape context for navigation
      if (soundscape && typeof soundscape.switchScreen === 'function') {
        soundscape.switchScreen(tab.screen);
      }
    },
    [
      tabs,
      onNavigate,
      slideAnim,
      soundscape,
      getTabMetrics,
      tabContainerWidth,
      trackNavigationPerformance,
    ],
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

  const MemoizedTab = memo(
    ({
      tab,
      isSelected,
      onPress,
      themeColors,
    }: {
      tab: TabItem;
      isSelected: boolean;
      onPress: () => void;
      themeColors: any;
    }) => (
      <TouchableOpacity
        style={getTabStyle(tab, isSelected)}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityLabel={tab.label}
        accessibilityState={{ selected: isSelected }}
      >
        <Text style={[styles.tabIcon, isSelected && { color: tab.color }]}>
          {tab.icon}
        </Text>
        <Text style={getTabTextStyle(tab, isSelected)} numberOfLines={1}>
          {tab.label}
        </Text>
        {tab.badge && tab.badge > 0 && (
          <View style={[styles.badge, { backgroundColor: tab.color }]}>
            <Text style={styles.badgeText}>
              {tab.badge > 99 ? '99+' : tab.badge}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    ),
  );

  const renderTab = (tab: TabItem, index: number) => {
    const isSelected = selectedTab === tab.id;

    return (
      <MemoizedTab
        key={tab.id}
        tab={tab}
        isSelected={isSelected}
        onPress={() => handleTabPress(tab)}
        themeColors={themeColors}
      />
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
        <MemoizedCognitiveIndicator
          cognitiveLoad={cognitive?.cognitiveLoad || 0}
          themeColors={themeColors}
        />

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
    textAlign: 'center',
    lineHeight: 14,
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
