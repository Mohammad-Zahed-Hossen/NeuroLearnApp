import React, { useState, useEffect } from 'react';
import { BackHandler, Linking, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

// Existing screens
import { DashboardScreen } from './src/screens/DashboardScreen';
import { FocusTimerScreen } from './src/screens/Focus & Productivity/FocusTimerScreen';
import { FlashcardsScreen } from './src/screens/Learning Tools/FlashcardsScreen';
import { SpeedReadingScreen } from './src/screens/Learning Tools/SpeedReadingScreen';
import { TasksScreen } from './src/screens/Focus & Productivity/TasksScreen';
import { SettingsScreen } from './src/screens/Profile/SettingsScreen';
import { MemoryPalaceScreen } from './src/screens/Learning Tools/MemoryPalaceScreen';
import { NeuralMindMapScreen } from './src/screens/Focus & Productivity/NeuralMindMapScreen';
import { LogicTrainerScreen } from './src/screens/Learning Tools/LogicTrainerScreen';
import { AdaptiveFocusScreen } from './src/screens/Focus & Productivity/AdaptiveFocusScreen';
import { AuthScreen } from './src/screens/Profile/AuthScreen';
// Navigation components
import { HamburgerMenu } from './src/components/navigation/Navigation';
import { ModernNavigation } from './src/navigation/ModernNavigation';
import {
  LearnHubScreen,
  FocusHubScreen,
  ProfileHubScreen,
} from './src/components/navigation/TabScreens';

// Overlay components
import { MiniPlayer } from './src/components/MiniPlayerComponent';
import { CommandPalette } from './src/components/navigation/CommandPalette';
import { FloatingActionButton } from './src/components/shared/FloatingActionButton';
import { QuickActionBottomSheet } from './src/components/navigation/QuickActionBottomSheet';
import FloatingChatBubble from './src/components/ai/FloatingChatBubble';
import FloatingElementsOrchestrator from './src/components/shared/FloatingElementsOrchestrator';

// Contexts
import { FocusProvider } from './src/contexts/FocusContext';
import { SoundscapeProvider } from './src/contexts/SoundscapeContext';
import { CognitiveProvider } from './src/contexts/CognitiveProvider';

// Services
import SupabaseService from './src/services/storage/SupabaseService';

// New screens
import FinanceDashboardScreen from './src/screens/finance/FinanceDashboardScreen';
import WellnessDashboardScreen from './src/screens/wellness/WellnessDashboardScreen';
import AddTransactionScreen from './src/screens/finance/AddTransactionScreen';
import BudgetManagerScreen from './src/screens/finance/BudgetManagerScreen';
import TransactionHistoryScreen from './src/screens/finance/TransactionHistoryScreen';
import SleepTrackerScreen from './src/screens/wellness/SleepTrackerScreen';
import WorkoutLoggerScreen from './src/screens/wellness/WorkoutLoggerScreen';
import SmartSleepTracker from './src/screens/health/SmartSleepTracker';
import AdvancedWorkoutLogger from './src/screens/health/AdvancedWorkoutLogger';
import AIAssistantScreen from './src/screens/Learning Tools/AIAssistantScreen';
import ProfileScreen from './src/screens/Profile/ProfileScreen';

import { ThemeType, colors } from './src/theme/colors';

type AppState = 'loading' | 'auth' | 'app';
type NavigationMode = 'hamburger' | 'modern' | 'hybrid';

export default function App() {
  const [theme, setTheme] = useState<ThemeType>('dark');
  const [appState, setAppState] = useState<AppState>('loading');
  const [navigationMode, setNavigationMode] =
    useState<NavigationMode>('hybrid');
  const [navigationStack, setNavigationStack] = useState<string[]>([
    'dashboard',
  ]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [commandPaletteVisible, setCommandPaletteVisible] = useState(false);
  const [quickActionVisible, setQuickActionVisible] = useState(false);

  const currentScreen = navigationStack[navigationStack.length - 1];
  const supabaseService = SupabaseService.getInstance();

  const [user, setUser] = React.useState<any>(null);

  const handleNavigate = (screen: string, params?: any) => {
    console.log(
      'handleNavigate called with screen:',
      screen,
      'params:',
      params,
    ); // Debug log
    setNavigationStack((prev) => [...prev, screen]);
    setMenuVisible(false);
    setCommandPaletteVisible(false);
    setQuickActionVisible(false);
  };

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    const backAction = () => {
      if (navigationStack.length > 1) {
        setNavigationStack((prev) => prev.slice(0, -1));
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );
    return () => backHandler.remove();
  }, [navigationStack]);

  const initializeApp = async () => {
    try {
      const currentUser = await supabaseService.getCurrentUser();
      setUser(currentUser);

      if (!currentUser) {
        setAppState('auth');
        return;
      }

      setAppState('app');
    } catch (error) {
      console.error('App initialization error:', error);
      setAppState('auth');
    }
  };

  const handleAuthenticated = () => {
    initializeApp();
  };

  const handleMigrationComplete = () => {
    setAppState('app');
  };

  const handleThemeChange = (newTheme: ThemeType) => {
    setTheme(newTheme);
  };

  const handleFABPress = () => {
    setQuickActionVisible(!quickActionVisible);
  };

  const handleQuickAction = (actionId: string, params?: any) => {
    switch (actionId) {
      case 'quick-study':
        handleNavigate('flashcards', { quickMode: true, count: 5 });
        break;
      case 'start-timer':
        handleNavigate('focus', { autoStart: true });
        break;
      default:
        console.log('Quick action:', actionId);
    }
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return <DashboardScreen theme={theme} onNavigate={handleNavigate} />;
      case 'focus':
        return <FocusTimerScreen theme={theme} onNavigate={handleNavigate} />;
      case 'flashcards':
        return <FlashcardsScreen theme={theme} onNavigate={handleNavigate} />;
      case 'speed-reading':
        return <SpeedReadingScreen theme={theme} onNavigate={handleNavigate} />;
      case 'tasks':
        return <TasksScreen theme={theme} onNavigate={handleNavigate} />;
      case 'memory-palace':
        return <MemoryPalaceScreen theme={theme} onNavigate={handleNavigate} />;
      case 'neural-mind-map':
        return (
          <NeuralMindMapScreen theme={theme} onNavigate={handleNavigate} />
        );
      case 'logic-trainer':
        return <LogicTrainerScreen theme={theme} onNavigate={handleNavigate} />;
      case 'adaptive-focus':
        return (
          <AdaptiveFocusScreen theme={theme} onNavigate={handleNavigate} />
        );
      case 'settings':
        return (
          <SettingsScreen
            theme={theme}
            onNavigate={handleNavigate}
            onThemeChange={handleThemeChange}
          />
        );
      case 'learn':
        return <LearnHubScreen theme={theme} onNavigate={handleNavigate} />;
      case 'profile':
        return <ProfileHubScreen theme={theme} onNavigate={handleNavigate} />;
      case 'finance':
        return <FinanceDashboardScreen onNavigate={handleNavigate} />;
      case 'wellness':
        return (
          <WellnessDashboardScreen theme={theme} onNavigate={handleNavigate} />
        );
      case 'add-transaction':
        return (
          <AddTransactionScreen
            onBack={() => setNavigationStack((prev) => prev.slice(0, -1))}
          />
        );
      case 'budget-manager':
        return (
          <BudgetManagerScreen
            theme={theme}
            onBack={() => setNavigationStack((prev) => prev.slice(0, -1))}
          />
        );
      case 'transaction-history':
        return (
          <TransactionHistoryScreen
            onBack={() => setNavigationStack((prev) => prev.slice(0, -1))}
          />
        );
      case 'sleep-tracker':
        return (
          <SleepTrackerScreen
            onBack={() => setNavigationStack((prev) => prev.slice(0, -1))}
          />
        );
      case 'workout-logger':
        return (
          <WorkoutLoggerScreen
            theme={theme}
            onBack={() => setNavigationStack((prev) => prev.slice(0, -1))}
          />
        );
      case 'smart-sleep-tracker':
        return (
          <SmartSleepTracker
            userId={user?.id || ''}
            theme={theme}
            onNavigate={handleNavigate}
          />
        );
      case 'advanced-workout-logger':
        return (
          <AdvancedWorkoutLogger
            userId={user?.id || ''}
            theme={theme}
            onNavigate={handleNavigate}
          />
        );
      case 'ai-assistant':
        return (
          <AIAssistantScreen
            onBack={() => setNavigationStack((prev) => prev.slice(0, -1))}
          />
        );
      case 'user-profile':
        return <ProfileScreen onNavigate={handleNavigate} />;
      default:
        return <DashboardScreen theme={theme} onNavigate={handleNavigate} />;
    }
  };

  if (appState === 'loading') {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (appState === 'auth') {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AuthScreen theme={theme} onAuthenticated={handleAuthenticated} />
          <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  // Core learning screens that should hide the tab bar for immersive experience
  const coreLearningScreens = [
    'flashcards',
    'speed-reading',
    'memory-palace',
    'logic-trainer',
    'neural-mind-map',
    'focus',
    'tasks',
    'adaptive-focus',
    'settings',
    'ai-assistant',
  ];

  // Finance and health screens that should hide the tab bar
  const financeAndHealthScreens = [
    'add-transaction',
    'budget-manager',
    'transaction-history',
    'sleep-tracker',
    'workout-logger',
    'smart-sleep-tracker',
    'advanced-workout-logger',
  ];

  const shouldHideTabBar =
    coreLearningScreens.includes(currentScreen) ||
    financeAndHealthScreens.includes(currentScreen);

  const renderNavigation = () => {
    switch (navigationMode) {
      case 'hamburger':
        return (
          <>
            {renderCurrentScreen()}
            <HamburgerMenu
              visible={menuVisible}
              onClose={() => setMenuVisible(false)}
              onNavigate={handleNavigate}
              currentScreen={currentScreen}
              theme={theme}
            />
          </>
        );

      case 'modern':
        return (
          <>
            {!shouldHideTabBar && (
              <ModernNavigation
                theme={theme}
                onNavigate={handleNavigate}
                currentScreen={currentScreen}
                showHamburgerMenu={false}
                onShowHamburger={() => setMenuVisible(true)}
              />
            )}
            {renderCurrentScreen()}
          </>
        );

      case 'hybrid':
        // Hybrid mode: Modern navigation with hamburger menu button
        // Hide tab bar on core learning screens for immersive experience
        return (
          <>
            {!shouldHideTabBar && (
              <ModernNavigation
                theme={theme}
                onNavigate={handleNavigate}
                currentScreen={currentScreen}
                showHamburgerMenu={true}
                onShowHamburger={() => setMenuVisible(true)}
              />
            )}
            {renderCurrentScreen()}
            <HamburgerMenu
              visible={menuVisible}
              onClose={() => setMenuVisible(false)}
              onNavigate={handleNavigate}
              currentScreen={currentScreen}
              theme={theme}
            />
          </>
        );

      default:
        return renderCurrentScreen();
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor:
              theme === 'dark'
                ? colors.dark.background
                : colors.light.background,
          }}
        >
          <FocusProvider>
            <SoundscapeProvider>
              <CognitiveProvider>
                <FloatingElementsOrchestrator
                  cognitiveLoad="low"
                  currentScreen={currentScreen}
                >
                  {renderNavigation()}

                  {quickActionVisible && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 10000,
                      }}
                    >
                      <QuickActionBottomSheet
                        theme={theme}
                        currentScreen={currentScreen}
                        visible={quickActionVisible}
                        onAction={handleQuickAction}
                        onClose={() => setQuickActionVisible(false)}
                      />
                    </View>
                  )}

                  <MiniPlayer theme={theme} />

                  <FloatingActionButton
                    theme={theme}
                    onPress={() => setQuickActionVisible(true)}
                    currentScreen={currentScreen}
                  />

                  <FloatingChatBubble theme={theme} userId={user?.id} />

                  <CommandPalette
                    theme={theme}
                    visible={commandPaletteVisible}
                    onClose={() => setCommandPaletteVisible(false)}
                    onNavigate={handleNavigate}
                  />
                </FloatingElementsOrchestrator>
              </CognitiveProvider>
            </SoundscapeProvider>
          </FocusProvider>
          <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
