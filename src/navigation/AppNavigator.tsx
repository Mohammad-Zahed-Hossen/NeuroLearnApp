// import React, { useState, useRef, useCallback, useEffect } from 'react';
// import { NavigationContainer } from '@react-navigation/native';
// import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// import { createStackNavigator } from '@react-navigation/stack';
// import { View, Text, TouchableOpacity, Platform, Animated, Dimensions } from 'react-native';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// import BlurViewWrapper from './BlurViewWrapper';
// import { useCognitive } from '../contexts/CognitiveProvider';
// import { useSoundscape } from '../contexts/SoundscapeContext';
// import { GlassCard } from './GlassComponents';

// // Import screens
// import {DashboardScreen} from '../screens/DashboardScreen';
// import FinanceDashboardScreen from '../screens/finance/FinanceDashboardScreen';
// import WellnessDashboardScreen from '../screens/wellness/WellnessDashboardScreen';
// import AddTransactionScreen from '../screens/finance/AddTransactionScreen';
// import BudgetManagerScreen from '../screens/finance/BudgetManagerScreen';
// import TransactionHistoryScreen from '../screens/finance/TransactionHistoryScreen';
// import SleepTrackerScreen from '../screens/wellness/SleepTrackerScreen';
// import WorkoutLoggerScreen from '../screens/wellness/WorkoutLoggerScreen';
// import ProfileScreen from '../screens/Profile/ProfileScreen';
// import AIAssistantScreen from '../screens/Learning Tools/AIAssistantScreen';
// import {SettingsScreen} from '../screens/Profile/SettingsScreen';
// import { ThemeType, colors, spacing, typography, borderRadius } from '../theme/colors';

// const Tab = createBottomTabNavigator();
// const Stack = createStackNavigator();
// const { width: SCREEN_WIDTH } = Dimensions.get('window');

// interface TabItem {
//   id: string;
//   name: string;
//   icon: string;
//   label: string;
//   color: string;
//   badge?: number;
// }

// interface TabBarProps {
//   state: any;
//   descriptors: any;
//   navigation: any;
// }

// // Smart tab configuration that adapts based on usage patterns
// const getTabConfiguration = (cognitiveLoad: number, uiMode: string): TabItem[] => {
//   const baseTabs: TabItem[] = [
//     { id: 'Dashboard', name: 'Dashboard', icon: 'home', label: 'Home', color: '#6366F1' },
//     { id: 'Learn', name: 'Learn', icon: 'brain', label: 'Learn', color: '#8B5CF6' },
//     { id: 'Finance', name: 'Finance', icon: 'wallet', label: 'Finance', color: '#10B981' },
//     { id: 'Wellness', name: 'Wellness', icon: 'heart-pulse', label: 'Wellness', color: '#EF4444' },
//     { id: 'Profile', name: 'Profile', icon: 'account', label: 'Profile', color: '#06B6D4' },
//   ];

//   // In simple mode, reduce to 3 most essential tabs
//   if (uiMode === 'simple' || cognitiveLoad > 0.8) {
//     return baseTabs.slice(0, 3);
//   }

//   return baseTabs;
// };

// const GlassTabBar: React.FC<TabBarProps> = ({ state, descriptors, navigation }) => {
//   const insets = useSafeAreaInsets();
//   const cognitive = useCognitive();
//   const soundscape = useSoundscape();
//   const themeColors = colors['light' as ThemeType]; // Assuming light theme for now

//   const [selectedTab, setSelectedTab] = useState('Dashboard');
//   const slideAnim = useRef(new Animated.Value(0)).current;

//   const tabs = getTabConfiguration(cognitive?.cognitiveLoad || 0.3, cognitive?.uiMode || 'normal');

//   // Sync selectedTab with navigation state and initialize slideAnim
//   useEffect(() => {
//     const currentRoute = state.routes[state.index];
//     const matchingTab = tabs.find(tab => tab.name === currentRoute.name);
//     if (matchingTab && matchingTab.id !== selectedTab) {
//       setSelectedTab(matchingTab.id);
//       const tabIndex = tabs.findIndex(t => t.id === matchingTab.id);
//       const targetPosition = (SCREEN_WIDTH / tabs.length) * tabIndex;
//       slideAnim.setValue(targetPosition);
//     }
//   }, [state, tabs, selectedTab, slideAnim]);

//   const handleTabPress = useCallback((tab: TabItem) => {
//     setSelectedTab(tab.id);
//     navigation.navigate(tab.name);

//     // Animate selection indicator
//     const tabIndex = tabs.findIndex(t => t.id === tab.id);
//     const targetPosition = (SCREEN_WIDTH / tabs.length) * tabIndex;

//     Animated.spring(slideAnim, {
//       toValue: targetPosition,
//       useNativeDriver: true,
//       tension: 120,
//       friction: 7,
//     }).start();

//     // Update soundscape context for navigation
//     if (soundscape && typeof soundscape.switchScreen === 'function') {
//       soundscape.switchScreen(tab.name.toLowerCase());
//     }
//   }, [tabs, navigation, slideAnim, soundscape]);

//   const renderTab = (tab: TabItem, index: number) => {
//     const isSelected = selectedTab === tab.id;

//     return (
//       <TouchableOpacity
//         key={tab.id}
//         onPress={() => handleTabPress(tab)}
//         style={{
//           flex: 1,
//           alignItems: 'center',
//           justifyContent: 'center',
//           paddingVertical: 8,
//           paddingHorizontal: 4,
//           borderRadius: 12,
//           backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'transparent',
//         }}
//         activeOpacity={0.7}
//         accessibilityLabel={tab.label}
//         accessibilityState={{ selected: isSelected }}
//       >
//         <View style={{
//           alignItems: 'center',
//           justifyContent: 'center',
//           width: 40,
//           height: 40,
//           borderRadius: 20,
//           backgroundColor: isSelected ? 'rgba(255,255,255,0.1)' : 'transparent',
//         }}>
//           <Icon
//             name={tab.icon}
//             size={isSelected ? 26 : 24}
//             color={isSelected ? tab.color : '#6B7280'}
//           />
//         </View>
//         <Text
//           style={{
//             marginTop: 4,
//             fontSize: 12,
//             fontWeight: '500',
//             color: isSelected ? tab.color : '#6B7280',
//           }}
//         >
//           {tab.label}
//         </Text>
//         {tab.badge && tab.badge > 0 && (
//           <View style={{
//             position: 'absolute',
//             top: 4,
//             right: 8,
//             minWidth: 16,
//             height: 16,
//             borderRadius: 8,
//             backgroundColor: tab.color,
//             justifyContent: 'center',
//             alignItems: 'center',
//             paddingHorizontal: 4,
//           }}>
//             <Text style={{
//               color: '#FFFFFF',
//               fontSize: 10,
//               fontWeight: '600',
//             }}>
//               {tab.badge > 99 ? '99+' : tab.badge}
//             </Text>
//           </View>
//         )}
//       </TouchableOpacity>
//     );
//   };

//   return (
//     <View style={[styles.container, { paddingBottom: insets.bottom }]}>
//       <GlassCard
//         theme={'light' as ThemeType}
//         style={[
//           styles.navigationCard,
//           {
//             backgroundColor: themeColors.surface,
//             borderTopColor: themeColors.border,
//           }
//         ]}
//       >
//         {/* Cognitive Load Indicator */}
//         {cognitive && cognitive.cognitiveLoad > 0.6 && (
//           <View style={styles.cognitiveIndicator}>
//             <View
//               style={[
//                 styles.cognitiveBar,
//                 {
//                   width: `${(cognitive?.cognitiveLoad || 0) * 100}%`,
//                   backgroundColor:
//                     (cognitive?.cognitiveLoad || 0) > 0.8 ? themeColors.error :
//                     (cognitive?.cognitiveLoad || 0) > 0.6 ? themeColors.warning :
//                     themeColors.success,
//                 }
//               ]}
//             />
//           </View>
//         )}

//         {/* Tab Navigation */}
//         <View style={styles.tabContainer}>
//           {/* Selection Indicator */}
//           <Animated.View
//             style={[
//               styles.selectionIndicator,
//               {
//                 width: SCREEN_WIDTH / tabs.length,
//                 backgroundColor: tabs.find(t => t.id === selectedTab)?.color || themeColors.primary,
//                 transform: [{ translateX: slideAnim }],
//               }
//             ]}
//           />

//           {tabs.map((tab, index) => renderTab(tab, index))}
//         </View>

//         {/* UI Mode Indicator */}
//         {cognitive && cognitive.uiMode === 'simple' && (
//           <View style={styles.modeIndicator}>
//             <Text style={[styles.modeText, { color: themeColors.textMuted }]}>
//               Simple Mode
//             </Text>
//           </View>
//         )}
//       </GlassCard>
//     </View>
//   );
// };

// // Wrapper components to provide required props
// const DashboardWrapper = (props: any) => (
//   <DashboardScreen theme={'light' as ThemeType} onNavigate={props.navigation.navigate} />
// );

// const FinanceDashboardWrapper = (props: any) => (
//   <FinanceDashboardScreen onNavigate={props.navigation.navigate} />
// );

// const SettingsWrapper = (props: any) => (
//   <SettingsScreen theme={'light' as ThemeType} onNavigate={props.navigation.navigate} />
// );

// const LearnStackNavigator = () => {
//   return (
//     <Stack.Navigator screenOptions={{ headerShown: false }}>
//       <Stack.Screen name="LearnDashboard" component={DashboardWrapper} />
//     </Stack.Navigator>
//   );
// };

// const FinanceStackNavigator = () => {
//   return (
//     <Stack.Navigator screenOptions={{ headerShown: false }}>
//       <Stack.Screen name="FinanceDashboard" component={FinanceDashboardWrapper} />
//       <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
//       <Stack.Screen name="BudgetManager" component={BudgetManagerScreen} />
//       <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} />
//     </Stack.Navigator>
//   );
// };

// const WellnessStackNavigator = () => {
//   return (
//     <Stack.Navigator screenOptions={{ headerShown: false }}>
//       <Stack.Screen name="WellnessDashboard" component={WellnessDashboardScreen} />
//       <Stack.Screen name="SleepTracker" component={SleepTrackerScreen} />
//       <Stack.Screen name="WorkoutLogger" component={WorkoutLoggerScreen} />
//     </Stack.Navigator>
//   );
// };

// const MainTabs = () => {
//   return (
//     <Tab.Navigator
//       tabBar={(props) => <GlassTabBar {...props} />}
//       screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}
//     >
//       <Tab.Screen name="Dashboard" component={DashboardWrapper} />
//       <Tab.Screen name="Learn" component={LearnStackNavigator} />
//       <Tab.Screen name="Finance" component={FinanceStackNavigator} />
//       <Tab.Screen name="Wellness" component={WellnessStackNavigator} />
//       <Tab.Screen name="Profile" component={ProfileScreen} />
//     </Tab.Navigator>
//   );
// };

// const AppNavigator = () => {
//   return (
//     <NavigationContainer>
//       <Stack.Navigator screenOptions={{ headerShown: false }}>
//         <Stack.Screen name="MainTabs" component={MainTabs} />
//       <Stack.Group screenOptions={{ presentation: 'modal' }}>
//         <Stack.Screen name="AIAssistant" component={AIAssistantScreen} />
//         <Stack.Screen name="Settings" component={SettingsWrapper} />
//       </Stack.Group>
//       </Stack.Navigator>
//     </NavigationContainer>
//   );
// };

// export default AppNavigator;

// const styles = {
//   container: {
//     position: 'absolute' as const,
//     bottom: 0,
//     left: 0,
//     right: 0,
//     zIndex: 100,
//     backgroundColor: 'transparent',
//   },
//   navigationCard: {
//     borderTopWidth: 1,
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     paddingTop: spacing.sm,
//     paddingHorizontal: spacing.sm,
//     minHeight: 70,
//   },
//   cognitiveIndicator: {
//     position: 'absolute' as const,
//     top: 0,
//     left: 0,
//     right: 0,
//     height: 2,
//     backgroundColor: 'rgba(255, 255, 255, 0.1)',
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     overflow: 'hidden' as const,
//   },
//   cognitiveBar: {
//     height: '100%' as any,
//     borderTopLeftRadius: 20,
//   },
//   tabContainer: {
//     flexDirection: 'row' as const,
//     alignItems: 'center' as const,
//     position: 'relative' as const,
//     height: 56,
//   },
//   selectionIndicator: {
//     position: 'absolute' as const,
//     bottom: 0,
//     height: 3,
//     borderRadius: 2,
//   },
//   modeIndicator: {
//     position: 'absolute' as const,
//     bottom: 4,
//     right: spacing.sm,
//   },
//   modeText: {
//     fontSize: 9,
//     fontWeight: '500' as const,
//     lineHeight: 16,
//     letterSpacing: 0.2,
//   },
// };
