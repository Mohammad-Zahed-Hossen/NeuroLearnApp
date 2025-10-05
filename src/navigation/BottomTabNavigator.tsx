// // src/navigation/BottomTabNavigator.tsx
// import React, { useState, useCallback, useRef } from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   Animated,
//   StatusBar,
//   Platform,
//   Vibration,
// } from 'react-native';
// import { AppHeader, HamburgerMenu } from '../components/Navigation';
// import { LearnHubScreen, FocusHubScreen, ProfileHubScreen } from '../components/TabScreens';
// import { colors, spacing, typography, ThemeType } from '../theme/colors';
// import { TabName, FeatureScreen, NavigationParams, Tab } from './NavigationTypes';

// // Import your feature screens (you'll need to create these paths)
// // For now, we'll use placeholder components that you'll replace
// interface FeatureScreenProps {
//   theme: ThemeType;
//   onBack: () => void;
//   params?: NavigationParams;
// }

// // Placeholder - replace with your actual DashboardScreen import
// const DashboardScreen: React.FC<FeatureScreenProps> = ({ theme, onBack }) => (
//   <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
//     <Text>Dashboard Screen</Text>
//   </View>
// );

// interface BottomTabNavigatorProps {
//   theme: ThemeType;
//   initialTab?: TabName;
// }

// export const BottomTabNavigator: React.FC<BottomTabNavigatorProps> = ({ 
//   theme,
//   initialTab = 'home'
// }) => {
//   const themeColors = colors[theme];
  
//   // Navigation state
//   const [activeTab, setActiveTab] = useState<TabName>(initialTab);
//   const [menuVisible, setMenuVisible] = useState(false);
//   const [featureScreen, setFeatureScreen] = useState<FeatureScreen | null>(null);
//   const [screenParams, setScreenParams] = useState<NavigationParams>({});
  
//   // Animation refs
//   const tabIndicatorAnim = useRef(new Animated.Value(0)).current;
//   const screenSlideAnim = useRef(new Animated.Value(0)).current;

//   // Tab definitions
//   const tabs: Tab[] = [
//     { id: 'home', icon: '🏠', label: 'Home' },
//     { id: 'learn', icon: '🧠', label: 'Learn' },
//     { id: 'focus', icon: '🎯', label: 'Focus' },
//     { id: 'profile', icon: '👤', label: 'Profile' },
//   ];

//   // Navigation handler - called from hub screens
//   const handleNavigate = useCallback((screen: string, params?: NavigationParams) => {
//     Vibration.vibrate(5);
    
//     // Animate screen transition
//     Animated.timing(screenSlideAnim, {
//       toValue: 1,
//       duration: 250,
//       useNativeDriver: true,
//     }).start(() => {
//       setFeatureScreen(screen as FeatureScreen);
//       setScreenParams(params || {});
//       screenSlideAnim.setValue(0);
//     });
//   }, []);

//   // Back navigation - returns to hub
//   const handleBack = useCallback(() => {
//     Vibration.vibrate(5);
    
//     Animated.timing(screenSlideAnim, {
//       toValue: 1,
//       duration: 250,
//       useNativeDriver: true,
//     }).start(() => {
//       setFeatureScreen(null);
//       setScreenParams({});
//       screenSlideAnim.setValue(0);
//     });
//   }, []);

//   // Tab switching
//   const handleTabChange = useCallback((tabId: TabName) => {
//     if (tabId === activeTab) return;
    
//     Vibration.vibrate(3);
    
//     // Close any open feature screen
//     setFeatureScreen(null);
//     setScreenParams({});
    
//     // Animate tab indicator
//     const tabIndex = tabs.findIndex(t => t.id === tabId);
//     Animated.spring(tabIndicatorAnim, {
//       toValue: tabIndex,
//       useNativeDriver: true,
//       tension: 100,
//       friction: 10,
//     }).start();
    
//     setActiveTab(tabId);
//   }, [activeTab, tabs]);

//   // Get screen title
//   const getScreenTitle = (): string => {
//     if (featureScreen) {
//       const titles: Record<FeatureScreen, string> = {
//         'dashboard': 'Dashboard',
//         'flashcards': 'Flashcards',
//         'speed-reading': 'Speed Reading',
//         'logic-trainer': 'Logic Trainer',
//         'memory-palace': 'Memory Palace',
//         'focus': 'Focus Timer',
//         'tasks': 'Tasks',
//         'neural-mind-map': 'Mind Map',
//         'progress': 'Analytics',
//         'settings': 'Settings',
//       };
//       return titles[featureScreen] || 'NeuroLearn';
//     }
    
//     const tabTitles: Record<TabName, string> = {
//       'home': 'Dashboard',
//       'learn': 'Learning Hub',
//       'focus': 'Focus Hub',
//       'profile': 'Profile',
//     };
//     return tabTitles[activeTab];
//   };

//   // Render hub screen based on active tab
//   const renderHubScreen = () => {
//     const hubProps = { theme, onNavigate: handleNavigate };
    
//     switch (activeTab) {
//       case 'home':
//         return <DashboardScreen theme={theme} onBack={handleBack} />;
//       case 'learn':
//         return <LearnHubScreen {...hubProps} />;
//       case 'focus':
//         return <FocusHubScreen {...hubProps} />;
//       case 'profile':
//         return <ProfileHubScreen {...hubProps} />;
//       default:
//         return null;
//     }
//   };

//   // Render feature screen (placeholder - you'll implement actual screens)
//   const renderFeatureScreen = () => {
//     if (!featureScreen) return null;

//     // TODO: Import and map your actual feature screen components
//     // For now, return placeholder
//     const FeatureComponent = DashboardScreen; // Replace with actual screen mapping
    
//     return (
//       <Animated.View 
//         style={[
//           styles.featureScreenContainer,
//           {
//             opacity: screenSlideAnim.interpolate({
//               inputRange: [0, 1],
//               outputRange: [1, 0],
//             }),
//           }
//         ]}
//       >
//         <FeatureComponent 
//           theme={theme} 
//           onBack={handleBack}
//           params={screenParams}
//         />
//       </Animated.View>
//     );
//   };

//   // Calculate tab indicator position
//   const activeTabIndex = tabs.findIndex(t => t.id === activeTab);
//   const tabWidth = 100 / tabs.length;
//   const indicatorTranslateX = tabIndicatorAnim.interpolate({
//     inputRange: tabs.map((_, i) => i),
//     outputRange: tabs.map((_, i) => i * (tabWidth)),
//   });

//   return (
//     <View style={[styles.container, { backgroundColor: themeColors.background }]}>
//       <StatusBar
//         barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
//         translucent={true}
//         backgroundColor="transparent"
//       />

//       {/* Floating Header */}
//       <AppHeader
//         title={getScreenTitle()}
//         theme={theme}
//         onMenuPress={() => setMenuVisible(true)}
//         floating={true}
//         rightComponent={
//           featureScreen ? (
//             <TouchableOpacity 
//               onPress={handleBack}
//               style={styles.backButton}
//               hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
//             >
//               <Text style={[styles.backIcon, { color: themeColors.text }]}>←</Text>
//             </TouchableOpacity>
//           ) : null
//         }
//       />

//       {/* Main Content Area */}
//       <View style={styles.content}>
//         {featureScreen ? renderFeatureScreen() : renderHubScreen()}
//       </View>

//       {/* Bottom Tab Bar */}
//       <View style={[styles.tabBar, { backgroundColor: themeColors.surface }]}>
//         {/* Animated Indicator */}
//         <Animated.View
//           style={[
//             styles.tabIndicator,
//             {
//               backgroundColor: themeColors.primary,
//               width: `${tabWidth}%`,
//               transform: [{ translateX: indicatorTranslateX.interpolate({
//                 inputRange: [0, 100],
//                 outputRange: ['0%', '100%'],
//               }) }],
//             },
//           ]}
//         />

//         {/* Tab Buttons */}
//         {tabs.map((tab, index) => {
//           const isActive = activeTab === tab.id;
          
//           return (
//             <TouchableOpacity
//               key={tab.id}
//               style={styles.tabItem}
//               onPress={() => handleTabChange(tab.id)}
//               activeOpacity={0.7}
//               hitSlop={{ top: 8, bottom: 8 }}
//             >
//               <Animated.View
//                 style={[
//                   styles.tabIconContainer,
//                   {
//                     transform: [{
//                       scale: isActive ? 1.1 : 1,
//                     }],
//                   },
//                 ]}
//               >
//                 <Text style={styles.tabIcon}>{tab.icon}</Text>
//               </Animated.View>
              
//               <Text
//                 style={[
//                   styles.tabLabel,
//                   {
//                     color: isActive ? themeColors.primary : themeColors.textSecondary,
//                     fontWeight: isActive ? '600' : '400',
//                   },
//                 ]}
//               >
//                 {tab.label}
//               </Text>

//               {/* Badge (optional) */}
//               {tab.badge && tab.badge > 0 && (
//                 <View style={[styles.badge, { backgroundColor: themeColors.error }]}>
//                   <Text style={styles.badgeText}>
//                     {tab.badge > 99 ? '99+' : tab.badge}
//                   </Text>
//                 </View>
//               )}
//             </TouchableOpacity>
//           );
//         })}
//       </View>

//       {/* Hamburger Menu Overlay */}
//       <HamburgerMenu
//         visible={menuVisible}
//         onClose={() => setMenuVisible(false)}
//         onNavigate={handleNavigate}
//         currentScreen={featureScreen || activeTab}
//         theme={theme}
//       />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   content: {
//     flex: 1,
//   },
//   featureScreenContainer: {
//     flex: 1,
//   },
//   backButton: {
//     width: 40,
//     height: 40,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   backIcon: {
//     fontSize: 28,
//     lineHeight: 32,
//   },
//   tabBar: {
//     flexDirection: 'row',
//     height: 64,
//     borderTopWidth: 1,
//     borderTopColor: 'rgba(255, 255, 255, 0.1)',
//     paddingBottom: Platform.OS === 'ios' ? 20 : 8,
//     elevation: 8,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: -2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 8,
//     position: 'relative',
//   },
//   tabIndicator: {
//     position: 'absolute',
//     top: 0,
//     height: 3,
//     borderRadius: 2,
//   },
//   tabItem: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingTop: 8,
//     position: 'relative',
//   },
//   tabIconContainer: {
//     marginBottom: 4,
//   },
//   tabIcon: {
//     fontSize: 24,
//   },
//   tabLabel: {
//     fontSize: 11,
//     letterSpacing: 0.2,
//   },
//   badge: {
//     position: 'absolute',
//     top: 4,
//     right: '25%',
//     minWidth: 18,
//     height: 18,
//     borderRadius: 9,
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingHorizontal: 4,
//   },
//   badgeText: {
//     color: '#FFFFFF',
//     fontSize: 10,
//     fontWeight: '700',
//   },
// });
