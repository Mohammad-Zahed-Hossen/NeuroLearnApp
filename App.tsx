import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, BackHandler, Linking, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Existing screens
import { DashboardScreen } from './src/screens/DashboardScreen';
import { FocusTimerScreen } from './src/screens/Focus & Productivity/FocusTimerScreen';
import { FlashcardsScreen } from './src/screens/Learning Tools/FlashcardsScreen';
import { SpeedReadingScreen } from './src/screens/Learning Tools/SpeedReadingScreen';
import { TasksScreen } from './src/screens/Focus & Productivity/TasksScreen';
import { SettingsScreen } from './src/screens/Profile/SettingsScreen';
import { CognitivePrivacyScreen } from './src/screens/Profile/CognitivePrivacyScreen';
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
  IntegrationHubScreen,
} from './src/components/navigation/TabScreens';

// Overlay components
import { CommandPalette } from './src/components/navigation/CommandPalette';
import { FloatingActionButton } from './src/components/shared/FloatingActionButton';
import { QuickActionBottomSheet } from './src/components/navigation/QuickActionBottomSheet';
import FloatingChatBubble from './src/components/ai/FloatingChatBubble';
import FloatingElementsOrchestrator from './src/components/shared/FloatingElementsOrchestrator';
import { usePerformanceMetrics } from './src/hooks/usePerformanceMetrics';
import { MicroTaskCard } from './src/components/shared/MicroTaskCard';
import FloatingCommandCenter from './src/components/shared/FloatingCommandCenter';
import { EngineStatusIndicator } from './src/components/shared/EngineStatusIndicator';

// Contexts
import { FocusProvider } from './src/contexts/FocusContext';
import { SoundscapeProvider } from './src/contexts/SoundscapeContext';
import { CognitiveProvider } from './src/contexts/CognitiveProvider';

// Services
import SupabaseService from './src/services/storage/SupabaseService';
import { neuralIntegrationService } from './src/services/learning/NeuralIntegrationService';
import EngineService from './src/services/EngineService';

// Cognitive Aura Engine Integration
import {
  initializeAuraStore,
  useCurrentAuraState,
} from './src/store/useAuraStore';

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
import NotionDashboardScreen from './src/screens/Learning Tools/NotionDashboardScreen';
import ProfileScreen from './src/screens/Profile/ProfileScreen';
import SynapseBuilderScreen from './src/screens/NeuroPlastisity/SynapseBuilderScreen';
import HolisticAnalyticsScreen from './src/screens/Analytics/HolisticAnalyticsScreen';
import PatientsScreen from './src/screens/PatientsScreen';
import { MonitoringScreen } from './src/screens/Profile/MonitoringScreen';

import { ThemeType, colors } from './src/theme/colors';

// Import Logger to configure log level
import { Logger, LogLevel } from './src/core/utils/Logger';
// DI
import createDefaultContainer from './src/core/di/bootstrap';
import TOKENS from './src/core/di/tokens';
import ContainerContext from './src/core/di/ContainerContext';

// Create app-level container (singleton for app lifetime)
const appContainer = createDefaultContainer();
// Register important service singletons into the container. We register
// instances (useValue) because many existing services expose getInstance()
// singletons; the DI container will then provide a stable access point
// without changing existing service code.
try {
  // SupabaseService and EngineService are singletons via getInstance()
  const supabaseSvc = SupabaseService.getInstance();
  appContainer.register(TOKENS.StorageService, { useValue: supabaseSvc });
} catch (e) {
  // Non-fatal: registration may be skipped in some test environments
  // where the service isn't available at module-eval time.
  // eslint-disable-next-line no-console
  console.debug('SupabaseService not registered in DI container:', e);
}

try {
  const engineSvc = EngineService.getInstance();
  appContainer.register(TOKENS.EngineService, { useValue: engineSvc });
} catch (e) {
  console.debug('EngineService not registered in DI container:', e);
}

try {
  appContainer.register(TOKENS.NeuralIntegrationService, {
    useValue: neuralIntegrationService,
  });
} catch (e) {
  console.debug('NeuralIntegrationService not registered in DI container:', e);
}

type AppState = 'loading' | 'auth' | 'app';
type NavigationMode = 'hamburger' | 'modern' | 'hybrid';

// Create a client for React Query
const queryClient = new QueryClient({
  // Cast to any because @tanstack/react-query types vary across versions; preserve runtime defaults
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  } as any,
});

export default function App() {
  // Configure logger to hide DEBUG messages
  Logger.configure({ level: LogLevel.INFO });

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

  const currentScreen =
    navigationStack[navigationStack.length - 1] ?? 'dashboard';
  const supabaseService = SupabaseService.getInstance();
  const engineService = EngineService.getInstance();

  const [user, setUser] = React.useState<any>(null);
  // Ensure hooks run in stable order: call aura hook at top-level of component
  const auraState = useCurrentAuraState();
  const [microTaskDismissed, setMicroTaskDismissed] = useState(false);
  const { trackScreenLoad } = usePerformanceMetrics();

  // track screen load performance
  useEffect(() => {
    const perf = trackScreenLoad(currentScreen);
    return () => {
      perf.end();
    };
  }, [currentScreen, trackScreenLoad]);

  const handleNavigate = useCallback((screen: string, params?: any) => {
    console.log(
      'handleNavigate called with screen:',
      typeof screen === 'string' ? screen.replace(/[\r\n\t]/g, '') : '[invalid]',
      'params:',
      params ? '[object]' : 'none',
    ); // Debug log
    setNavigationStack((prev) => [...prev, screen]);
    setMenuVisible(false);
    setCommandPaletteVisible(false);
    setQuickActionVisible(false);
  }, []);

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

  // Cleanup services on app unmount
  useEffect(() => {
    return () => {
      neuralIntegrationService.dispose();
      // Cleanup engine on unmount
      engineService.shutdown().catch(console.error);
    };
  }, []);

  // OAuth deep links are handled by OAuthCallbackHandler to avoid duplication
  // No need for additional deep link handling in App.tsx

  const initializeApp = async () => {
    try {
      const currentUser = await supabaseService.getCurrentUser();
      setUser(currentUser);

      if (!currentUser) {
        setAppState('auth');
        return;
      }

      // Initialize Cognitive Aura Engine only if user is authenticated
      try {
        await initializeAuraStore();
      } catch (auraError) {
        console.warn(
          'Aura initialization failed, continuing without aura features:',
          auraError,
        );
        // Don't block app startup if aura fails
      }

      // Initialize NeuroLearn Orchestration Engine
      try {
        await engineService.initialize(currentUser.id);
        console.log('✅ NeuroLearn Orchestration Engine initialized');
      } catch (engineError) {
        console.warn(
          'Engine initialization failed, continuing with individual services:',
          engineError,
        );
        // Don't block app startup if engine fails
      }

      // Initialize warm-tier database if available. Use dynamic import so
      // tests and environments without WatermelonDB/MMKV won't fail at
      // module-evaluation time.
      try {
        // Dynamic import the initDatabase module. Use the TS-resolvable
        // path (no .js extension) and accept either a default export or a
        // named export. Some bundlers/TS configurations make the module
        // namespace the inferred type which caused the "not callable"
        // TypeScript error; casting to `any` and checking at runtime
        // ensures we only call a function.
        // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
        // Metro resolves local TS modules without .js extension; silence TS node resolution warning
        // @ts-ignore
        const mod = (await import('./src/database/initDatabase')) as any;
        const initDatabaseFn = mod.default ?? mod.initDatabase ?? mod;
        // initDatabase() will attempt to initialize a real WatermelonDB
        // instance if native modules and schema are present, otherwise it
        // returns the fallback DB. We call it to eagerly initialize the
        // warm-tier where possible. Do a runtime check before calling.
        if (typeof initDatabaseFn === 'function') {
          initDatabaseFn();
        } else {
          // If module returned a constructor bag or fallback value, log it
          // for diagnostics — don't throw.
          // eslint-disable-next-line no-console
          console.debug('initDatabase not callable, module:', initDatabaseFn);
        }
      } catch (dbInitErr) {
        // Non-fatal — log for diagnostics but don't block app startup.
        // Tests that mock DB modules won't throw because we import dynamically.
        // eslint-disable-next-line no-console
        console.debug(
          'initDatabase not run:',
          dbInitErr instanceof Error ? dbInitErr.message : String(dbInitErr),
        );
      }

      setAppState('app');
    } catch (error) {
      console.error('App initialization error:', error);
      // If user is authenticated but aura init failed, still allow app access
      if (user) {
        setAppState('app');
      } else {
        setAppState('auth');
      }
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

  // OAuth callbacks are now handled by OAuthCallbackHandler to avoid duplication

  // Handle micro-task completion from Cognitive Aura Engine
  const handleMicroTaskComplete = useCallback(
    async (completed: boolean, timeSpent: number, satisfaction: number = 3) => {
      try {
        if (!auraState) return;

        // Import the CAE service dynamically to avoid circular dependencies
        const { cognitiveAuraService } = await import(
          './src/services/ai/CognitiveAuraService'
        );
        const CAE = cognitiveAuraService;

        // Record performance metrics
        const Metrics = {
          accuracy: completed ? 1.0 : 0.0,
          taskCompletion: completed ? 1.0 : 0.0,
          timeToComplete: timeSpent / 1000,
          userSatisfaction: satisfaction,
          contextRelevance:
            auraState.environmentalContext?.contextQualityScore ?? 0,
          environmentOptimality:
            auraState.environmentalContext?.overallOptimality ?? 0,
          predictiveAccuracy: auraState.predictionAccuracy ?? 0,
          adaptationEffectiveness: auraState.biologicalAlignment ?? 0,
        };

        await CAE.recordPerformance(Metrics);

        // Generate new aura state
        await CAE.refreshAuraState();

        console.log(
          `✅ Micro-task ${completed ? 'completed' : 'skipped'} in ${(
            timeSpent / 1000
          ).toFixed(1)}s`,
        );

        // Dismiss the micro-task card after completion
        setMicroTaskDismissed(true);
      } catch (error) {
        console.error('❌ Micro-task completion handling failed:', error);
      }
    },
    [auraState],
  );

  const currentScreenComponent = useMemo(() => {
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
      case 'cognitive-privacy':
        return <CognitivePrivacyScreen />;
      case 'learn':
        return <LearnHubScreen theme={theme} onNavigate={handleNavigate} />;
      case 'integrations':
        return (
          <IntegrationHubScreen theme={theme} onNavigate={handleNavigate} />
        );
      case 'profile':
        return <ProfileHubScreen theme={theme} onNavigate={handleNavigate} />;
      case 'finance':
        return (
          <FinanceDashboardScreen onNavigate={handleNavigate} theme={theme} />
        );
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
      case 'notion-dashboard':
        return (
          <NotionDashboardScreen theme={theme} onNavigate={handleNavigate} />
        );
      case 'user-profile':
        return <ProfileScreen onNavigate={handleNavigate} />;
      case 'synapse-builder':
        return (
          <SynapseBuilderScreen
            theme={theme}
            navigation={{
              goBack: () => setNavigationStack((prev) => prev.slice(0, -1)),
            }}
          />
        );
      case 'holistic-analytics':
        return (
          <HolisticAnalyticsScreen
            navigation={{
              goBack: () => setNavigationStack((prev) => prev.slice(0, -1)),
            }}
            theme={theme}
          />
        );
      case 'monitoring':
        return (
          <MonitoringScreen
            theme={theme}
            navigation={{
              goBack: () => setNavigationStack((prev) => prev.slice(0, -1)),
            }}
          />
        );
      case 'patients':
        return (
          <PatientsScreen
            onBack={() => setNavigationStack((prev) => prev.slice(0, -1))}
          />
        );
      default:
        return <DashboardScreen theme={theme} onNavigate={handleNavigate} />;
    }
  }, [currentScreen, theme, handleNavigate, handleThemeChange, user?.id]);

  const renderCurrentScreen = () => currentScreenComponent;

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

    'cognitive-privacy',

    'ai-assistant',

    'synapse-builder',

    'holistic-analytics',

    'monitoring',

    'patients',
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

  // Integration screens that should hide the tab bar for immersive experience

  const integrationScreens = ['notion-dashboard'];

  const shouldHideTabBar = useMemo(
    () =>
      coreLearningScreens.includes(currentScreen) ||
      financeAndHealthScreens.includes(currentScreen) ||
      integrationScreens.includes(currentScreen),

    [currentScreen],
  );

  // Render navigation is used by the orchestratorElement below. Define it
  // before orchestratorElement so it is available when the memo runs.
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
            {auraState && auraState.microTask && !microTaskDismissed && (
              <MicroTaskCard
                auraState={auraState}
                theme={theme}
                position="floating"
                onTaskComplete={handleMicroTaskComplete}
                onClose={() => setMicroTaskDismissed(true)}
              />
            )}
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
            {auraState && auraState.microTask && (
              <MicroTaskCard
                auraState={auraState}
                theme={theme}
                position="floating"
                onTaskComplete={handleMicroTaskComplete}
              />
            )}
          </>
        );

      case 'hybrid':
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
            {auraState && auraState.microTask && (
              <MicroTaskCard
                auraState={auraState}
                theme={theme}
                position="floating"
                onTaskComplete={handleMicroTaskComplete}
              />
            )}
          </>
        );

      default:
        return renderCurrentScreen();
    }
  };

  // Build the app's orchestrator tree as a memoized element at the top-level
  // so the hook order remains stable across renders (avoid calling hooks
  // conditionally inside JSX). This element is used inside the main return
  // but must be created unconditionally so React's hooks order doesn't change
  // between 'loading'|'auth' and 'app' states.
  const orchestratorElement = useMemo(
    () => (
      <FloatingElementsOrchestrator
        cognitiveLoad="low"
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
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

        <FloatingActionButton
          theme={theme}
          onPress={() => setQuickActionVisible(true)}
          currentScreen={currentScreen}
        />

        {user && <FloatingChatBubble theme={theme} userId={user.id} />}

        <CommandPalette
          theme={theme}
          visible={commandPaletteVisible}
          onClose={() => setCommandPaletteVisible(false)}
          onNavigate={handleNavigate}
        />

        <EngineStatusIndicator theme={theme} />
      </FloatingElementsOrchestrator>
    ),
    [
      currentScreen,
      handleNavigate,
      quickActionVisible,
      user?.id,
      commandPaletteVisible,
      theme,
      handleQuickAction,
    ],
  );

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

  return (
    <QueryClientProvider client={queryClient}>
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
                  {/* Provide DI container so components can opt-in to resolve services */}
                  <ContainerContext.Provider value={appContainer}>
                    {/** Render the precomputed orchestrator element */}
                    {orchestratorElement}
                  </ContainerContext.Provider>
                </CognitiveProvider>
              </SoundscapeProvider>
            </FocusProvider>
            <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
          </SafeAreaView>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
