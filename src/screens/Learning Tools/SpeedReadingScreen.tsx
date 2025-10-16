import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  TouchableOpacity,
  Animated,
} from 'react-native';
import {
  AppHeader,
  HamburgerMenu,
} from '../../components/navigation/Navigation';
import {
  GlassCard,
  Button,
  ScreenContainer,
} from '../../components/GlassComponents';
import { colors, spacing, typography, borderRadius } from '../../theme/colors';
import { ThemeType } from '../../theme/colors';
import StorageService from '../../services/storage/StorageService';
import { aiCoachingService } from '../../services/learning/AICoachingService';
import SpeedReadingService from '../../services/learning/SpeedReadingService';
import { useSoundscape } from '../../contexts/SoundscapeContext';
import { neuralIntegrationService } from '../../services/learning/NeuralIntegrationService';
import { StudySession } from '../../types';
import { DynamicSpeedReadingService } from '../../services/learning/DynamicSpeedReadingService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SpeedReadingScreenProps {
  theme: ThemeType;
  onNavigate: (screen: string) => void;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  highlightElement?: string; // CSS selector or component to highlight
  actionText: string;
}

interface ReadingState {
  active: boolean;
  words: string[];
  currentIndex: number;
  startTime: Date;
  wpm: number;
  mode: 'word' | 'chunk';
  chunkSize: number;
  sessionStarted: boolean;
}

interface ReadingSession {
  wordsRead: number;
  timeElapsed: number;
  averageWPM: number;
  comprehensionScore?: number;
}

interface TextPreset {
  id: string;
  title: string;
  content: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  wordCount: number;
}

const textPresets: TextPreset[] = [
  {
    id: '1',
    title: 'Neuroplasticity Basics',
    difficulty: 'Easy',
    wordCount: 150,
    content: `Neuroplasticity represents one of the most significant discoveries in neuroscience. The brain's ability to reorganize itself by forming new neural connections throughout life means that learning is not limited by age or previous experience. This remarkable capacity allows neurons to compensate for injury and disease and to adjust their activities in response to new situations or to changes in their environment. Understanding neuroplasticity has revolutionized approaches to education, rehabilitation, and personal development. When we learn something new, our brain physically changes. New synapses form, existing ones strengthen, and neural pathways become more efficient. This process, known as synaptic plasticity, is the biological foundation of all learning and memory formation. The implications for cognitive enhancement are profound, suggesting that with proper training and practice, we can literally rewire our brains for better performance.`,
  },
  {
    id: '2',
    title: 'Cognitive Load Theory',
    difficulty: 'Medium',
    wordCount: 200,
    content: `Cognitive Load Theory, developed by John Sweller, provides a framework for understanding how the mind processes information during learning. The theory distinguishes between three types of cognitive load: intrinsic load, which relates to the inherent difficulty of the material; extraneous load, which is caused by poor instructional design; and germane load, which is the mental effort devoted to processing, constructing, and automating schemas. The human working memory has limited capacity, typically able to hold seven plus or minus two items simultaneously. When this capacity is exceeded, learning becomes inefficient or impossible. Effective learning strategies must therefore consider cognitive load management. Techniques such as chunking information into smaller units, eliminating unnecessary elements, and providing worked examples can reduce cognitive burden. Progressive disclosure of complex information allows learners to build understanding incrementally without overwhelming their cognitive resources. Understanding these principles is crucial for designing effective learning experiences and optimizing personal study strategies.`,
  },
  {
    id: '3',
    title: 'Advanced Memory Systems',
    difficulty: 'Hard',
    wordCount: 250,
    content: `The human memory system operates through multiple interconnected networks that process, store, and retrieve information with remarkable efficiency. Sensory memory acts as a buffer, briefly holding perceptual information for milliseconds to seconds. Working memory, the active workspace of consciousness, manipulates information from sensory input and long-term storage. Long-term memory encompasses declarative memory for facts and events, and procedural memory for skills and habits. Within declarative memory, episodic memory stores personal experiences while semantic memory contains general knowledge. The hippocampus plays a crucial role in memory consolidation, converting temporary memories into permanent storage through a process called systems consolidation. During this process, memories become independent of the hippocampus and are maintained by cortical networks. Sleep plays a vital role in memory consolidation, with slow-wave sleep facilitating declarative memory and REM sleep supporting procedural learning. Understanding these mechanisms enables the development of sophisticated learning strategies that leverage natural memory processes. Techniques such as spaced repetition, interleaving, and elaborative encoding align with how the brain naturally processes and retains information, maximizing learning efficiency and long-term retention.`,
  },
];

export const SpeedReadingScreen: React.FC<SpeedReadingScreenProps> = ({
  theme,
  onNavigate,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [customTextModalVisible, setCustomTextModalVisible] = useState(false);
  const [customText, setCustomText] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<TextPreset | null>(null);

  const [readingState, setReadingState] = useState<ReadingState>({
    active: false,
    words: [],
    currentIndex: 0,
    startTime: new Date(),
    wpm: 300,
    mode: 'word',
    chunkSize: 3,
    sessionStarted: false,
  });

  const [session, setSession] = useState<ReadingSession>({
    wordsRead: 0,
    timeElapsed: 0,
    averageWPM: 0,
  });

  const [settings, setSettings] = useState({
    showProgress: true,
    highlightCurrent: true,
    pauseOnComplete: true,
  });

  // Phase 6: AI Quiz state
  const [quizVisible, setQuizVisible] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quiz, setQuiz] = useState<{
    id: string;
    sessionId: string;
    questions: Array<{
      id: string;
      question: string;
      options: string[];
      correctAnswer: number;
      explanation?: string;
      difficulty: 1 | 2 | 3 | 4 | 5;
      conceptTested: string;
    }>;
    timeLimit?: number;
    created: Date;
  } | null>(null);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [lastTextRead, setLastTextRead] = useState<string>('');
  const [currentWord, setCurrentWord] = useState<string>('Ready to read...');
  const [analytics, setAnalytics] = useState<any>(null);
  const [dataSource, setDataSource] = useState<'static' | 'dynamic' | 'hybrid'>('hybrid');
  const [dynamicTexts, setDynamicTexts] = useState<TextPreset[]>([]);
  const [dynamicTextsLoading, setDynamicTextsLoading] = useState(false);

  // Onboarding state
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState(0);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  // Animation and refs
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Event handlers for SpeedReadingService
  const handleWordDisplay = (data: any) => {
    const { word, progress, analytics } = data;
    setCurrentWord(word);
    setAnalytics(analytics);

    // Update reading state
    setReadingState((prev) => ({
      ...prev,
      currentIndex: data.index,
    }));

    // Enhance soundscape based on reading performance
    if (analytics && soundscape.isActive) {
      neuralIntegrationService.enhanceSpeedReading(
        analytics.currentWPM,
        analytics.comprehensionPrediction,
        (selectedPreset?.difficulty?.toLowerCase() as any) || 'medium',
      );

      // Update cognitive load based on reading difficulty
      const loadAdjustment =
        analytics.comprehensionPrediction < 0.6 ? 0.2 : -0.1;
      soundscape.updateCognitiveLoad(
        Math.max(0, Math.min(1, soundscape.cognitiveLoad + loadAdjustment)),
      );
    }

    // Animate word transition
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 50,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const handleSessionComplete = async (completedSession: any) => {
    try {
      // Record performance for soundscape learning
      if (soundscape.isActive) {
        const performance = completedSession.comprehensionScore || 0.8;
        await soundscape.recordPerformance(performance);
      }

      // Reset reading state
      setReadingState((prev) => ({
        ...prev,
        active: false,
        sessionStarted: false,
      }));

      // Show completion alert
      Alert.alert(
        'Reading Complete! 📚',
        `Speed: ${completedSession.wpmAchieved} WPM\nComprehension: Ready for quiz\nConcepts: ${completedSession.conceptsIdentified.length}`,
        [
          { text: 'Take Quiz', onPress: () => setQuizVisible(true) },
          { text: 'Continue', onPress: () => {} },
        ],
      );
    } catch (error) {
      console.error('Error handling session completion:', error);
      // Fallback to basic completion
      setReadingState((prev) => ({
        ...prev,
        active: false,
        sessionStarted: false,
      }));
    }
  };

  const handleQuizReady = (quizData: any) => {
    setQuiz(quizData as any);
    setAnswers(
      quizData.questions.reduce((acc: any, q: any) => {
        acc[q.id] = null;
        return acc;
      }, {}),
    );
    setQuizVisible(true);
  };

  const themeColors = colors[theme];
  const storage = StorageService.getInstance();
  const speedReadingService = SpeedReadingService.getInstance();
  const soundscape = useSoundscape();
  const dynamicService = DynamicSpeedReadingService.getInstance();

  // Notify neural integration of screen change and load dynamic content
  useEffect(() => {
    neuralIntegrationService.onScreenChange('speed_reading');

    // Load dynamic texts if enabled
    const loadDynamicContent = async () => {
      if (dataSource === 'dynamic' || dataSource === 'hybrid') {
        setDynamicTextsLoading(true);
        try {
          const generatedTexts = await dynamicService.generatePersonalizedTexts();
          setDynamicTexts(generatedTexts);
        } catch (error) {
          console.error('Error loading dynamic texts:', error);
          Alert.alert(
            'AI Service Unavailable',
            'Unable to generate personalized texts. Using curated texts only.',
            [{ text: 'OK' }]
          );
          setDynamicTexts([]);
        } finally {
          setDynamicTextsLoading(false);
        }
      }
    };

    loadDynamicContent();
  }, [dataSource]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      try {
        // Remove any listeners we registered on the service
        speedReadingService.off('wordDisplay', handleWordDisplay);
        speedReadingService.off('sessionCompleted', handleSessionComplete);
        speedReadingService.off('quizReady', handleQuizReady);
      } catch (e) {
        /* best-effort cleanup */
      }
    };
  }, []);

  const prepareText = (text: string) => {
    // Clean and prepare text for RSVP
    const cleanedText = text
      .replace(/\s+/g, ' ')
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .trim();

    return cleanedText.split(/\s+/).filter((word) => word.length > 0);
  };

  const startReading = async (text: string, preset?: TextPreset) => {
    try {
      setLastTextRead(text);

      // Start optimal soundscape for speed reading
      if (soundscape.isInitialized && !soundscape.isActive) {
        // Guard against missing presets
        await soundscape.startPreset('speed_integration', {
          cognitiveLoad:
            textPresets && textPresets[1] && textPresets[1].content
              ? textPresets[1].content
              : 'No preset available',
          fadeIn: true,
        });
      }

      const session = await speedReadingService.startSession(text, {
        title: preset?.title || 'Custom Reading',
        difficulty: (preset?.difficulty?.toLowerCase() as any) || 'medium',
        wpm: readingState.wpm,
        mode: readingState.mode as any,
        cognitiveLoad: soundscape.cognitiveLoad || 0.5,
      });

      setReadingState({
        active: true,
        words: speedReadingService.getProcessedText()?.words || [],
        currentIndex: 0,
        startTime: session.startTime,
        wpm: session.wpmGoal,
        mode: readingState.mode,
        chunkSize: readingState.chunkSize,
        sessionStarted: true,
      });

      setSelectedPreset(preset || null);

      // Listen for service events
      speedReadingService.on('wordDisplay', handleWordDisplay);
      speedReadingService.on('sessionCompleted', handleSessionComplete);
      speedReadingService.on('quizReady', handleQuizReady);
    } catch (error) {
      Alert.alert('Error', 'Failed to start reading session');
      console.error('Reading start error:', error);
    }
  };

  const startRSVP = (words: string[]) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const intervalMs =
      readingState.mode === 'word'
        ? (60 / readingState.wpm) * 1000
        : (60 / readingState.wpm) * 1000 * readingState.chunkSize;

    intervalRef.current = setInterval(() => {
      setReadingState((prev) => {
        const nextIndex =
          prev.mode === 'word'
            ? prev.currentIndex + 1
            : prev.currentIndex + prev.chunkSize;

        if (nextIndex >= words.length) {
          completeReading();
          return prev;
        }

        // Animate word transition
        Animated.sequence([
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 0.8,
              duration: 50,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
          ]),
        ]).start();

        return {
          ...prev,
          currentIndex: nextIndex,
        };
      });
    }, intervalMs);
  };

  const pauseReading = () => {
    speedReadingService.pauseSession();
    setReadingState((prev) => ({ ...prev, active: false }));
  };

  const resumeReading = () => {
    speedReadingService.resumeSession();
    setReadingState((prev) => ({ ...prev, active: true }));
  };

  const stopReading = async () => {
    await speedReadingService.stopSession();

    // Transition soundscape to calm state
    if (soundscape.isActive) {
      await soundscape.startPreset('calm_readiness', { fadeIn: true });
    }

    setReadingState({
      active: false,
      words: [],
      currentIndex: 0,
      startTime: new Date(),
      wpm: readingState.wpm,
      mode: readingState.mode,
      chunkSize: readingState.chunkSize,
      sessionStarted: false,
    });
    setCurrentWord('Ready to read...');
    setSelectedPreset(null);
  };

  const completeReading = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const endTime = new Date();
    const timeElapsed =
      (endTime.getTime() - readingState.startTime.getTime()) / 1000 / 60; // minutes
    const wordsRead = readingState.words.length;
    const averageWPM = Math.round(wordsRead / timeElapsed);

    const finalSession: ReadingSession = {
      wordsRead,
      timeElapsed: Math.round(timeElapsed * 100) / 100,
      averageWPM,
    };

    setSession(finalSession);

    // Save session to storage
    try {
      const studySession: StudySession = {
        id: Date.now().toString(),
        type: 'reading',
        startTime: readingState.startTime,
        endTime,
        duration: Math.round(timeElapsed),
        completed: true,
        mode: `${readingState.wpm}wpm_${readingState.mode}`,
      };

      await storage.saveStudySession(studySession);
    } catch (error) {
      console.error('Error saving reading session:', error);
    }

    // Reset state
    setReadingState((prev) => ({
      ...prev,
      active: false,
      sessionStarted: false,
    }));

    // Show completion alert
    Alert.alert(
      'Reading Complete! 📚',
      `Great job! You read ${wordsRead} words in ${
        finalSession.timeElapsed
      } minutes.\n\nAverage Speed: ${averageWPM} WPM\nTarget Speed: ${
        readingState.wpm
      } WPM\n\n${
        averageWPM > readingState.wpm
          ? 'Excellent! You exceeded your target speed!'
          : 'Good practice! Try increasing your target speed next time.'
      }`,
      [
        {
          text: 'Practice Again',
          onPress: () => {
            if (selectedPreset) {
              startReading(selectedPreset.content, selectedPreset);
            }
          },
        },
        { text: 'Take Quiz', onPress: () => generateQuiz() },
      ],
    );
  };

  // Generate AI quiz from last text read (or selected preset)
  const generateQuiz = async () => {
    const text = lastTextRead || selectedPreset?.content || '';
    if (!text || text.trim().length < 20) {
      Alert.alert(
        'Quiz unavailable',
        'No recent text to generate a quiz from.',
      );
      return;
    }

    setQuizLoading(true);
    try {
      const sessionId = `ui_quiz_${Date.now()}`;
      const generated = await aiCoachingService.generateComprehensionQuiz(
        sessionId,
        {},
      );

      setQuiz(generated as any);
      setAnswers(
        generated.questions.reduce((acc: any, q: any) => {
          acc[q.id] = null;
          return acc;
        }, {}),
      );
      setQuizScore(null);
      setQuizVisible(true);
    } catch (error) {
      console.warn('Quiz generation failed', error);
      Alert.alert(
        'AI Service Unavailable',
        'Unable to generate quiz. Please try again later.',
      );
    } finally {
      setQuizLoading(false);
    }
  };

  const submitQuiz = () => {
    if (!quiz) return;
    let correct = 0;
    quiz.questions.forEach((q) => {
      const ans = answers[q.id];
      if (ans === q.correctAnswer) correct++;
    });
    const score = Math.round((correct / quiz.questions.length) * 100);
    setQuizScore(score);
  };

  const adjustWPM = (newWPM: number) => {
    const clampedWPM = Math.max(100, Math.min(1000, newWPM));
    setReadingState((prev) => ({ ...prev, wpm: clampedWPM }));

    // If currently reading, restart with new speed
    if (readingState.active && intervalRef.current) {
      clearInterval(intervalRef.current);
      startRSVP(readingState.words);
    }
  };

  const getCurrentDisplay = () => {
    if (!readingState.sessionStarted) {
      return currentWord;
    }
    return currentWord;
  };

  const getProgress = () => {
    if (analytics) {
      return analytics.progressPercent || 0;
    }
    if (readingState.words.length === 0) return 0;
    return (readingState.currentIndex / readingState.words.length) * 100;
  };

  const startCustomText = () => {
    if (!customText.trim()) {
      Alert.alert('Error', 'Please enter text to read');
      return;
    }

    startReading(customText);
    setCustomTextModalVisible(false);
  };

  if (readingState.sessionStarted) {
    return (
      <ScreenContainer theme={theme}>
        <AppHeader
          title={`RSVP Reading (${readingState.wpm} WPM)`}
          theme={theme}
          onMenuPress={() => setMenuVisible(true)}
          rightComponent={
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Stop Reading',
                  'Are you sure you want to stop the reading session?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Stop',
                      onPress: stopReading,
                      style: 'destructive',
                    },
                  ],
                );
              }}
            >
              <Text style={{ color: themeColors.error, fontSize: 16 }}>
                Stop
              </Text>
            </TouchableOpacity>
          }
        />

        <View style={styles.rsvpContainer}>
          {/* Progress Bar */}
          {settings.showProgress && (
            <View style={styles.progressSection}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${getProgress()}%`,
                      backgroundColor: themeColors.primary,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.progressText,
                  { color: themeColors.textSecondary },
                ]}
              >
                {Math.round(getProgress())}% • Word{' '}
                {readingState.currentIndex + 1} of {readingState.words.length}
              </Text>
            </View>
          )}

          {/* RSVP Display */}
          <View style={styles.rsvpDisplayContainer}>
            <Animated.View
              style={[
                styles.rsvpDisplay,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <Text style={[styles.rsvpText, { color: themeColors.text }]}>
                {getCurrentDisplay()}
              </Text>

              {/* Real-time analytics display */}
              {analytics && (
                <View style={styles.analyticsOverlay}>
                  <Text
                    style={[
                      styles.analyticsText,
                      { color: themeColors.accent },
                    ]}
                  >
                    {Math.round(analytics.currentWPM)} WPM •{' '}
                    {Math.round(analytics.comprehensionPrediction * 100)}%
                    predicted
                  </Text>
                </View>
              )}
            </Animated.View>

            {/* Fixation Point */}
            <View
              style={[
                styles.fixationPoint,
                { backgroundColor: themeColors.primary },
              ]}
            />
          </View>

          {/* Reading Info */}
          <GlassCard theme={theme} style={styles.readingInfo}>
            <View style={styles.infoRow}>
              <Text
                style={[styles.infoLabel, { color: themeColors.textSecondary }]}
              >
                Speed:
              </Text>
              <Text style={[styles.infoValue, { color: themeColors.text }]}>
                {readingState.wpm} WPM
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text
                style={[styles.infoLabel, { color: themeColors.textSecondary }]}
              >
                Mode:
              </Text>
              <Text style={[styles.infoValue, { color: themeColors.text }]}>
                {readingState.mode === 'word'
                  ? 'Single Word'
                  : `${readingState.chunkSize} Word Chunks`}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text
                style={[styles.infoLabel, { color: themeColors.textSecondary }]}
              >
                Elapsed:
              </Text>
              <Text style={[styles.infoValue, { color: themeColors.text }]}>
                {Math.round(
                  (new Date().getTime() - readingState.startTime.getTime()) /
                    1000,
                )}{' '}
                sec
              </Text>
            </View>

            {analytics && (
              <>
                <View style={styles.infoRow}>
                  <Text
                    style={[
                      styles.infoLabel,
                      { color: themeColors.textSecondary },
                    ]}
                  >
                    Current WPM:
                  </Text>
                  <Text
                    style={[styles.infoValue, { color: themeColors.primary }]}
                  >
                    {Math.round(analytics.currentWPM)}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text
                    style={[
                      styles.infoLabel,
                      { color: themeColors.textSecondary },
                    ]}
                  >
                    Comprehension:
                  </Text>
                  <Text
                    style={[styles.infoValue, { color: themeColors.success }]}
                  >
                    {Math.round(analytics.comprehensionPrediction * 100)}%
                  </Text>
                </View>
              </>
            )}
          </GlassCard>

          {/* Controls */}
          <View style={styles.rsvpControls}>
            {readingState.active ? (
              <Button
                title="Pause"
                onPress={pauseReading}
                variant="secondary"
                size="large"
                theme={theme}
                style={styles.controlButton}
              />
            ) : (
              <Button
                title="Resume"
                onPress={resumeReading}
                variant="primary"
                size="large"
                theme={theme}
                style={styles.controlButton}
              />
            )}

            <Button
              title="Stop Reading"
              onPress={() => {
                Alert.alert(
                  'Stop Reading',
                  'Are you sure you want to stop the reading session?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Stop',
                      onPress: stopReading,
                      style: 'destructive',
                    },
                  ],
                );
              }}
              variant="outline"
              size="large"
              theme={theme}
              style={styles.controlButton}
            />
          </View>
        </View>

        <HamburgerMenu
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          onNavigate={onNavigate}
          currentScreen="speed-reading"
          theme={theme}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer theme={theme}>
      <AppHeader
        title="Speed Reading Training"
        theme={theme}
        onMenuPress={() => setMenuVisible(true)}
        rightComponent={
          <TouchableOpacity onPress={() => setCustomTextModalVisible(true)}>
            <Text style={{ color: themeColors.primary, fontSize: 18 }}>📝</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.container}
      >
        {/* Data Source Toggle */}
        <GlassCard theme={theme} style={styles.dataSourceCard}>
          <Text style={[styles.dataSourceTitle, { color: themeColors.text }]}>
            📚 Content Source
          </Text>
          <View style={styles.dataSourceButtons}>
            <TouchableOpacity
              style={[
                styles.dataSourceButton,
                dataSource === 'static' && { backgroundColor: themeColors.primary },
                { borderColor: themeColors.border }
              ]}
              onPress={() => setDataSource('static')}
            >
              <Text style={[styles.dataSourceButtonText, { color: dataSource === 'static' ? '#FFFFFF' : themeColors.text }]}>
                Static
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.dataSourceButton,
                dataSource === 'hybrid' && { backgroundColor: themeColors.primary },
                { borderColor: themeColors.border }
              ]}
              onPress={() => setDataSource('hybrid')}
            >
              <Text style={[styles.dataSourceButtonText, { color: dataSource === 'hybrid' ? '#FFFFFF' : themeColors.text }]}>
                Hybrid
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.dataSourceButton,
                dataSource === 'dynamic' && { backgroundColor: themeColors.primary },
                { borderColor: themeColors.border }
              ]}
              onPress={() => setDataSource('dynamic')}
            >
              <Text style={[styles.dataSourceButtonText, { color: dataSource === 'dynamic' ? '#FFFFFF' : themeColors.text }]}>
                Personalized
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.dataSourceDescription, { color: themeColors.textSecondary }]}>
            {dataSource === 'static' && 'Using curated reading materials only'}
            {dataSource === 'hybrid' && 'Combining curated texts with personalized content'}
            {dataSource === 'dynamic' && 'Using AI-generated content based on your interests'}
          </Text>
          {dynamicTexts.length > 0 && (
            <Text style={[styles.dynamicTextsCount, { color: themeColors.success }]}>
              {dynamicTexts.length} personalized texts available
            </Text>
          )}
        </GlassCard>

        {/* Speed Settings */}
        <GlassCard theme={theme} style={styles.settingsCard}>
          <Text style={[styles.cardTitle, { color: themeColors.text }]}>
            ⚡ Reading Speed Settings
          </Text>

          <View style={styles.wpmContainer}>
            <Text
              style={[styles.wpmLabel, { color: themeColors.textSecondary }]}
            >
              Target Speed: {readingState.wpm} WPM
            </Text>

            <View style={styles.wpmControls}>
              <TouchableOpacity
                onPress={() => adjustWPM(readingState.wpm - 25)}
                style={[
                  styles.wpmButton,
                  { backgroundColor: themeColors.surface },
                ]}
              >
                <Text
                  style={[styles.wpmButtonText, { color: themeColors.text }]}
                >
                  -25
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => adjustWPM(readingState.wpm - 50)}
                style={[
                  styles.wpmButton,
                  { backgroundColor: themeColors.surface },
                ]}
              >
                <Text
                  style={[styles.wpmButtonText, { color: themeColors.text }]}
                >
                  -50
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => adjustWPM(readingState.wpm + 25)}
                style={[
                  styles.wpmButton,
                  { backgroundColor: themeColors.primary },
                ]}
              >
                <Text style={[styles.wpmButtonText, { color: '#FFFFFF' }]}>
                  +25
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => adjustWPM(readingState.wpm + 50)}
                style={[
                  styles.wpmButton,
                  { backgroundColor: themeColors.primary },
                ]}
              >
                <Text style={[styles.wpmButtonText, { color: '#FFFFFF' }]}>
                  +50
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.wpmHint, { color: themeColors.textMuted }]}>
              Average reading: 200-250 WPM • Speed reading: 400-700 WPM
            </Text>
          </View>

          {/* Reading Mode */}
          <View style={styles.modeContainer}>
            <Text
              style={[styles.modeLabel, { color: themeColors.textSecondary }]}
            >
              Display Mode:
            </Text>

            <View style={styles.modeButtons}>
              <TouchableOpacity
                onPress={() =>
                  setReadingState((prev) => ({ ...prev, mode: 'word' }))
                }
                style={[
                  styles.modeButton,
                  readingState.mode === 'word' && {
                    backgroundColor: themeColors.primary,
                  },
                  { borderColor: themeColors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    {
                      color:
                        readingState.mode === 'word'
                          ? '#FFFFFF'
                          : themeColors.text,
                    },
                  ]}
                >
                  Single Word
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  setReadingState((prev) => ({ ...prev, mode: 'chunk' }))
                }
                style={[
                  styles.modeButton,
                  readingState.mode === 'chunk' && {
                    backgroundColor: themeColors.primary,
                  },
                  { borderColor: themeColors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    {
                      color:
                        readingState.mode === 'chunk'
                          ? '#FFFFFF'
                          : themeColors.text,
                    },
                  ]}
                >
                  Word Chunks
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </GlassCard>

        {/* Text Presets */}
        <View style={styles.presetsSection}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            📚 Practice Texts
            {dynamicTexts.length > 0 && (
              <Text style={[styles.dynamicTextsIndicator, { color: themeColors.success }]}>
                {' '}(+{dynamicTexts.length} personalized)
              </Text>
            )}
          </Text>

          {/* Static texts (always show unless dynamic-only) */}
          {dataSource !== 'dynamic' && textPresets.map((preset) => (
            <GlassCard
              key={preset.id}
              theme={theme}
              onPress={() => startReading(preset.content, preset)}
              style={[
                styles.presetCard,
                { borderColor: themeColors.warning, borderWidth: 1 }
              ]}
            >
              <View style={styles.presetHeader}>
                <View style={styles.presetTitleContainer}>
                  <Text style={[styles.presetTitle, { color: themeColors.text }]}>
                    {preset.title}
                  </Text>
                  <Text style={[styles.presetTag, { backgroundColor: themeColors.warning }]}>
                    Curated
                  </Text>
                </View>
                <View style={styles.presetMeta}>
                  <Text
                    style={[
                      styles.difficultyBadge,
                      {
                        backgroundColor:
                          preset.difficulty === 'Easy'
                            ? themeColors.success
                            : preset.difficulty === 'Medium'
                            ? themeColors.warning
                            : themeColors.error,
                        color: '#FFFFFF',
                      },
                    ]}
                  >
                    {preset.difficulty}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.presetDescription,
                  { color: themeColors.textSecondary },
                ]}
              >
                {preset.content.substring(0, 120)}...
              </Text>

              <View style={styles.presetFooter}>
                <Text
                  style={[styles.presetStats, { color: themeColors.textMuted }]}
                >
                  {preset.wordCount} words • ~
                  {Math.round(preset.wordCount / readingState.wpm)} min at{' '}
                  {readingState.wpm} WPM
                </Text>
              </View>
            </GlassCard>
          ))}

          {/* Dynamic texts */}
          {(dataSource === 'dynamic' || dataSource === 'hybrid') && dynamicTexts.map((preset) => (
            <GlassCard
              key={preset.id}
              theme={theme}
              onPress={() => startReading(preset.content, preset)}
              style={[
                styles.presetCard,
                { borderColor: themeColors.success, borderWidth: 1 }
              ]}
            >
              <View style={styles.presetHeader}>
                <View style={styles.presetTitleContainer}>
                  <Text style={[styles.presetTitle, { color: themeColors.text }]}>
                    {preset.title}
                  </Text>
                  <Text style={[styles.presetTag, { backgroundColor: themeColors.success }]}>
                    AI-Generated
                  </Text>
                </View>
                <View style={styles.presetMeta}>
                  <Text
                    style={[
                      styles.difficultyBadge,
                      {
                        backgroundColor:
                          preset.difficulty === 'Easy'
                            ? themeColors.success
                            : preset.difficulty === 'Medium'
                            ? themeColors.warning
                            : themeColors.error,
                        color: '#FFFFFF',
                      },
                    ]}
                  >
                    {preset.difficulty}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.presetDescription,
                  { color: themeColors.textSecondary },
                ]}
              >
                {preset.content.substring(0, 120)}...
              </Text>

              <View style={styles.presetFooter}>
                <Text
                  style={[styles.presetStats, { color: themeColors.textMuted }]}
                >
                  {preset.wordCount} words • ~
                  {Math.round(preset.wordCount / readingState.wpm)} min at{' '}
                  {readingState.wpm} WPM
                </Text>
              </View>
            </GlassCard>
          ))}
        </View>

        {/* Quick Actions */}
        <GlassCard theme={theme} style={styles.actionsCard}>
          <Text style={[styles.cardTitle, { color: themeColors.text }]}>
            🎯 Quick Actions
          </Text>

          <View style={styles.actionsGrid}>
            <Button
              title="Custom Text"
              onPress={() => setCustomTextModalVisible(true)}
              variant="primary"
              size="medium"
              theme={theme}
              style={styles.actionButton}
            />

            <Button
              title="Speed Test"
              onPress={() => {
                Alert.alert(
                  'Start Speed Test',
                  `This will begin a speed reading test at ${readingState.wpm} WPM with a medium difficulty text. Are you ready?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Start Test',
                      onPress: () => {
                        const preset =
                          textPresets && textPresets[1] ? textPresets[1] : null;
                        startReading(
                          preset ? preset.content : 'No preset available',
                          preset || undefined,
                        );
                      },
                    },
                  ],
                );
              }}
              variant="secondary"
              size="medium"
              theme={theme}
              style={styles.actionButton}
            />
          </View>
        </GlassCard>
      </ScrollView>

      {/* Custom Text Modal */}
      <Modal
        visible={customTextModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCustomTextModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassCard theme={theme} variant="modal" style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              Custom Text Practice
            </Text>

            <Text
              style={[
                styles.modalSubtitle,
                { color: themeColors.textSecondary },
              ]}
            >
              Paste or type text you want to practice speed reading with
            </Text>

            <TextInput
              style={[
                styles.customTextInput,
                {
                  borderColor: themeColors.border,
                  color: themeColors.text,
                  backgroundColor: themeColors.surfaceLight,
                },
              ]}
              placeholder="Paste your text here..."
              placeholderTextColor={themeColors.textMuted}
              value={customText}
              onChangeText={setCustomText}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => {
                  setCustomTextModalVisible(false);
                  setCustomText('');
                }}
                variant="ghost"
                theme={theme}
                style={styles.modalButton}
              />

              <Button
                title="Start Reading"
                onPress={startCustomText}
                variant="primary"
                theme={theme}
                style={styles.modalButton}
              />
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* Quiz Modal using enhanced UI components */}
      {quizVisible && quiz && (
        <Modal visible={true} animationType="slide">
          <View
            style={[
              styles.quizContainer,
              { backgroundColor: themeColors.background },
            ]}
          >
            <View style={styles.quizHeader}>
              <Text style={[styles.quizTitle, { color: themeColors.text }]}>
                Comprehension Quiz
              </Text>
              <TouchableOpacity onPress={() => setQuizVisible(false)}>
                <Text style={[styles.closeButton, { color: themeColors.text }]}>
                  ×
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.quizContent}>
              {quiz.questions.map((question, index) => (
                <View
                  key={question.id}
                  style={[
                    styles.questionCard,
                    { backgroundColor: themeColors.surface },
                  ]}
                >
                  <Text
                    style={[styles.questionText, { color: themeColors.text }]}
                  >
                    {index + 1}. {question.question}
                  </Text>

                  {question.options.map((option, optionIndex) => (
                    <TouchableOpacity
                      key={optionIndex}
                      style={[
                        styles.optionButton,
                        {
                          backgroundColor:
                            answers[question.id] === optionIndex
                              ? themeColors.primary
                              : themeColors.surfaceLight,
                          borderColor: themeColors.primary,
                        },
                      ]}
                      onPress={() =>
                        setAnswers((prev) => ({
                          ...prev,
                          [question.id]: optionIndex,
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.optionText,
                          {
                            color:
                              answers[question.id] === optionIndex
                                ? themeColors.background
                                : themeColors.text,
                          },
                        ]}
                      >
                        {String.fromCharCode(65 + optionIndex)}. {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>

            <View style={styles.quizActions}>
              <Button
                title="Submit Quiz"
                onPress={submitQuiz}
                variant="primary"
                theme={theme}
                style={styles.submitButton}
              />
            </View>

            {quizScore !== null && (
              <View
                style={[
                  styles.scoreDisplay,
                  { backgroundColor: themeColors.surface },
                ]}
              >
                <Text
                  style={[styles.scoreText, { color: themeColors.primary }]}
                >
                  Score: {quizScore}%
                </Text>
                <Text
                  style={[styles.scoreMessage, { color: themeColors.text }]}
                >
                  {quizScore >= 80
                    ? 'Excellent comprehension!'
                    : quizScore >= 60
                    ? 'Good understanding!'
                    : 'Consider reviewing the material.'}
                </Text>
              </View>
            )}
          </View>
        </Modal>
      )}

      <HamburgerMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={onNavigate}
        currentScreen="speed-reading"
        theme={theme}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  container: {
    paddingTop: 100,
    padding: spacing.lg,
    paddingBottom: spacing.md, // Reduced since tab bar is hidden on this screen
  },

  // RSVP View Styles
  rsvpContainer: {
    flex: 1,
    paddingTop: 100,
    padding: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressSection: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
  rsvpDisplayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    width: '100%',
    position: 'relative',
  },
  rsvpDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    paddingHorizontal: spacing.xl,
  },
  rsvpText: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 40,
  },
  fixationPoint: {
    position: 'absolute',
    bottom: 20,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  readingInfo: {
    width: '100%',
    marginVertical: spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoLabel: {
    ...typography.bodySmall,
  },
  infoValue: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  rsvpControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  controlButton: {
    flex: 0.48,
  },

  // Data Source Toggle
  dataSourceCard: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  dataSourceTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  dataSourceButtons: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  dataSourceButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    marginHorizontal: spacing.xs,
  },
  dataSourceButtonText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  dataSourceDescription: {
    ...typography.caption,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  dynamicTextsCount: {
    ...typography.caption,
    fontWeight: '600',
  },
  dynamicTextsIndicator: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  presetTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  presetTag: {
    ...typography.caption,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Main View Styles
  settingsCard: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    ...typography.h4,
    marginBottom: spacing.lg,
  },
  wpmContainer: {
    marginBottom: spacing.lg,
  },
  wpmLabel: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  wpmControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  wpmButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  wpmButtonText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  wpmHint: {
    ...typography.caption,
    textAlign: 'center',
  },
  modeContainer: {
    alignItems: 'center',
  },
  modeLabel: {
    ...typography.bodySmall,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  modeButtons: {
    flexDirection: 'row',
  },
  modeButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 2,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.sm,
  },
  modeButtonText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  presetsSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.lg,
  },
  presetCard: {
    marginBottom: spacing.md,
  },
  presetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  presetTitle: {
    ...typography.body,
    fontWeight: '600',
  },
  presetMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  difficultyBadge: {
    ...typography.caption,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    fontWeight: '600',
  },
  presetDescription: {
    ...typography.bodySmall,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  presetFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: spacing.sm,
  },
  presetStats: {
    ...typography.caption,
  },
  actionsCard: {
    marginBottom: spacing.lg,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 0.48,
  },

  // Analytics overlay
  analyticsOverlay: {
    position: 'absolute',
    top: -40,
    alignItems: 'center',
  },
  analyticsText: {
    ...typography.caption,
    fontWeight: '600',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalTitle: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  customTextInput: {
    borderWidth: 2,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 200,
    textAlignVertical: 'top',
    ...typography.body,
    marginBottom: spacing.xl,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 0.48,
  },

  // Quiz Styles
  quizContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 40,
    marginBottom: spacing.lg,
  },
  quizTitle: {
    ...typography.h2,
  },
  closeButton: {
    ...typography.h2,
    fontSize: 32,
  },
  quizContent: {
    flex: 1,
  },
  questionCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  questionText: {
    ...typography.body,
    marginBottom: spacing.md,
    lineHeight: 24,
  },
  optionButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
  },
  optionText: {
    ...typography.bodySmall,
  },
  quizActions: {
    paddingVertical: spacing.md,
  },
  submitButton: {
    width: '100%',
  },
  scoreDisplay: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  scoreText: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  scoreMessage: {
    ...typography.body,
    textAlign: 'center',
  },
});
