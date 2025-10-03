import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BackHandler, Linking } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { FocusTimerScreen } from './src/screens/FocusTimerScreen';
import { FlashcardsScreen } from './src/screens/FlashcardsScreen';
import { SpeedReadingScreen } from './src/screens/SpeedReadingScreen';
import { TasksScreen } from './src/screens/TasksScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { MemoryPalaceScreen } from './src/screens/MemoryPalaceScreen';
import { NeuralMindMapScreen } from './src/screens/NeuralMindMapScreen';
import { LogicTrainerScreen } from './src/screens/LogicTrainerScreen';
import { AdaptiveFocusScreen } from './src/screens/AdaptiveFocusScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { ThemeType } from './src/theme/colors';
import { TodoistService } from './src/services/TodoistService';
import { FocusProvider } from './src/contexts/FocusContext';
import { SoundscapeProvider } from './src/contexts/SoundscapeContext';
import { MiniPlayer } from './src/components/MiniPlayerComponent';
import SupabaseService from './src/services/SupabaseService';

type AppState = 'loading' | 'auth' | 'app';

export default function App() {
  const [theme, setTheme] = useState<ThemeType>('dark');
  const [appState, setAppState] = useState<AppState>('loading');
  const [navigationStack, setNavigationStack] = useState<string[]>([
    'dashboard',
  ]);

  const currentScreen = navigationStack[navigationStack.length - 1];
  const supabaseService = SupabaseService.getInstance();

  const handleNavigate = (screen: string) => {
    setNavigationStack((prev) => [...prev, screen]);
  };

  useEffect(() => {
    initializeApp();
  }, []);

  // Handle deep linking for email confirmation
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const { url } = event;
      console.log('Deep link received:', url);

      if (url.includes('neurolearn://')) {
        try {
          // Handle the auth callback
          const { data, error } = await supabaseService.getClient().auth.getSession();
          if (error) {
            console.error('Auth callback error:', error);
          } else if (data.session) {
            console.log('User confirmed email successfully');
            // Refresh the app state
            initializeApp();
          }
        } catch (error) {
          console.error('Deep link handling error:', error);
        }
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened from a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription?.remove();
    };
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
      const isAuthenticated = await supabaseService.isAuthenticated();
      
      if (!isAuthenticated) {
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



  const handleThemeChange = (newTheme: ThemeType) => {
    setTheme(newTheme);
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



  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <FocusProvider>
          <SoundscapeProvider>
            {renderCurrentScreen()}
            <MiniPlayer theme={theme} />
          </SoundscapeProvider>
          <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        </FocusProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
