import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BackHandler } from 'react-native';
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
import { ThemeType } from './src/theme/colors';
import { TodoistService } from './src/services/TodoistService';
import { FocusProvider } from './src/contexts/FocusContext';
import { SoundscapeProvider } from './src/contexts/SoundscapeContext';
import { MiniPlayer } from './src/components/MiniPlayerComponent';

export default function App() {
  const [theme, setTheme] = useState<ThemeType>('dark');
  const [navigationStack, setNavigationStack] = useState<string[]>([
    'dashboard',
  ]);

  const currentScreen = navigationStack[navigationStack.length - 1];

  const handleNavigate = (screen: string) => {
    setNavigationStack((prev) => [...prev, screen]);
  };

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
