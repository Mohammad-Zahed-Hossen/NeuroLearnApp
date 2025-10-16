/**
 * Phase 6: Speed Reading UI Components
 *
 * React Native components for integrating with the enhanced SpeedReadingService:
 * - WPMSelector: Speed control with cognitive load adaptation
 * - RSVPDisplay: Advanced text presentation with fixation guides
 * - ComprehensionQuiz: Post-reading quiz interface
 * - ReadingAnalytics: Performance visualization
 * - ControlPanel: Session management controls
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  Component,
  ErrorInfo,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme/colors';
import { ThemeType } from '../../theme/colors';
import {
  ReadingAnalytics,
  ComprehensionQuiz,
  QuizQuestion,
  ReadingSession,
} from '../../services/learning/SpeedReadingService';

// ==================== ERROR BOUNDARY COMPONENT ====================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry?: () => void }>;
}

/**
 * Error boundary component to catch and handle React errors gracefully
 * Provides fallback UI and retry functionality
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('SpeedReadingUIComponents Error:', error, errorInfo);
  }

  retry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      // Only pass error when it's non-null to avoid Error | undefined type mismatch
      return this.state.error ? (
        <FallbackComponent error={this.state.error} retry={this.retry} />
      ) : (
        <FallbackComponent retry={this.retry} />
      );
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component
 */
const DefaultErrorFallback: React.FC<{ error?: Error; retry?: () => void }> = ({
  error,
  retry,
}) => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorTitle}>Something went wrong</Text>
    <Text style={styles.errorMessage}>
      {error?.message ||
        'An unexpected error occurred in the speed reading component.'}
    </Text>
    {retry && (
      <TouchableOpacity style={styles.retryButton} onPress={retry}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    )}
  </View>
);

// TypeScript Enhancements: Comprehensive prop interfaces and union types

// Union types for component variants
type RSVPMode = 'word' | 'chunk' | 'bionic' | 'adaptive';
type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'technical';
type QuizState = 'active' | 'completed' | 'timed-out';

// Extended analytics interface with missing properties
interface ExtendedReadingAnalytics extends ReadingAnalytics {
  averageComprehension: number;
  readingStreak: number;
  totalSessions: number;
  totalWordsRead: number;
  performanceByDifficulty: {
    [difficulty: string]: {
      wpm: number;
      comprehension: number;
      sessions: number;
    };
  };
  bestReadingHour: number;
}

// Discriminated unions for complex state objects
type QuizResult =
  | {
      type: 'correct';
      answer: number;
    }
  | {
      type: 'incorrect';
      answer: number;
      correctAnswer: number;
    }
  | {
      type: 'skipped';
    };

// ==================== WPM SELECTOR COMPONENT ====================

interface WPMSelectorProps {
  theme: ThemeType;
  currentWPM: number;
  onWPMChange: (wpm: number) => void;
  cognitiveLoad?: number;
  disabled?: boolean;
}

/**
 * WPMSelector component for controlling reading speed with cognitive load adaptation
 *
 * Features:
 * - Debounced WPM adjustments to prevent rapid state updates
 * - Adaptive speed suggestions based on cognitive load
 * - Accessible controls with proper screen reader support
 * - Visual feedback for current speed and suggestions
 *
 * @param theme - The current theme for styling
 * @param currentWPM - Current words per minute setting
 * @param onWPMChange - Callback when WPM changes
 * @param cognitiveLoad - Current cognitive load (0-1), affects adaptive suggestions
 * @param disabled - Whether controls are disabled
 */
export const WPMSelector: React.FC<WPMSelectorProps> = ({
  theme,
  currentWPM,
  onWPMChange,
  cognitiveLoad = 0.5,
  disabled = false,
}) => {
  const themeColors = colors[theme];

  /**
   * Creates a debounced WPM change handler to prevent rapid updates
   * that could cause performance issues or excessive re-renders
   *
   * @returns A debounced function that calls onWPMChange after 150ms delay
   */
  const debouncedWPMChange = useCallback(() => {
    let timeoutId: NodeJS.Timeout;
    return (wpm: number): void => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => onWPMChange(wpm), 150);
    };
  }, [onWPMChange])();

  /**
   * Calculates adaptive WPM suggestion based on cognitive load
   *
   * High cognitive load (>0.7) reduces speed by 30% for better comprehension
   * Low cognitive load (<0.3) increases speed by 30% for efficiency
   * Medium load keeps the base speed
   *
   * @param baseWPM - The current base WPM setting
   * @param load - Cognitive load factor (0-1)
   * @returns Suggested adaptive WPM, rounded to nearest integer
   */
  const getAdaptiveWPM = (baseWPM: number, load: number): number => {
    if (load > 0.7) return Math.round(baseWPM * 0.7); // Reduce for high load
    if (load < 0.3) return Math.round(baseWPM * 1.3); // Increase for low load
    return baseWPM;
  };

  const adaptiveWPM = getAdaptiveWPM(currentWPM, cognitiveLoad);
  const isAdaptiveDifferent = adaptiveWPM !== currentWPM;

  return (
    <View
      style={styles.wpmSelector}
      accessible={true}
      accessibilityRole="adjustable"
      accessibilityLabel={`Reading speed selector, current speed ${currentWPM} words per minute`}
    >
      <Text
        style={[styles.wpmLabel, { color: themeColors.text }]}
        accessibilityRole="header"
      >
        Reading Speed: {currentWPM} WPM
      </Text>

      {isAdaptiveDifferent && (
        <Text
          style={[styles.adaptiveHint, { color: themeColors.accent }]}
          accessibilityRole="text"
        >
          💡 Suggested: {adaptiveWPM} WPM (based on cognitive load)
        </Text>
      )}

      <View
        style={styles.wpmControls}
        accessibilityRole="toolbar"
        accessibilityLabel="Speed adjustment controls"
      >
        <TouchableOpacity
          style={[styles.wpmButton, { backgroundColor: themeColors.surface }]}
          onPress={() => debouncedWPMChange(Math.max(100, currentWPM - 50))}
          disabled={disabled}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Decrease speed by 50, new speed ${Math.max(
            100,
            currentWPM - 50,
          )} words per minute`}
          accessibilityHint="Double tap to decrease reading speed by 50 words per minute"
        >
          <Text style={[styles.wpmButtonText, { color: themeColors.text }]}>
            -50
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.wpmButton, { backgroundColor: themeColors.surface }]}
          onPress={() => debouncedWPMChange(Math.max(100, currentWPM - 25))}
          disabled={disabled}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Decrease speed by 25, new speed ${Math.max(
            100,
            currentWPM - 25,
          )} words per minute`}
          accessibilityHint="Double tap to decrease reading speed by 25 words per minute"
        >
          <Text style={[styles.wpmButtonText, { color: themeColors.text }]}>
            -25
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.wpmButton, { backgroundColor: themeColors.primary }]}
          onPress={() => debouncedWPMChange(Math.min(1000, currentWPM + 25))}
          disabled={disabled}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Increase speed by 25, new speed ${Math.min(
            1000,
            currentWPM + 25,
          )} words per minute`}
          accessibilityHint="Double tap to increase reading speed by 25 words per minute"
        >
          <Text
            style={[styles.wpmButtonText, { color: themeColors.background }]}
          >
            +25
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.wpmButton, { backgroundColor: themeColors.primary }]}
          onPress={() => debouncedWPMChange(Math.min(1000, currentWPM + 50))}
          disabled={disabled}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Increase speed by 50, new speed ${Math.min(
            1000,
            currentWPM + 50,
          )} words per minute`}
          accessibilityHint="Double tap to increase reading speed by 50 words per minute"
        >
          <Text
            style={[styles.wpmButtonText, { color: themeColors.background }]}
          >
            +50
          </Text>
        </TouchableOpacity>
      </View>

      {isAdaptiveDifferent && (
        <TouchableOpacity
          style={[
            styles.adaptiveButton,
            { backgroundColor: themeColors.accent },
          ]}
          onPress={() => debouncedWPMChange(adaptiveWPM)}
          disabled={disabled}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Use adaptive speed of ${adaptiveWPM} words per minute`}
          accessibilityHint="Double tap to set reading speed to the suggested adaptive speed based on cognitive load"
        >
          <Text
            style={[
              styles.adaptiveButtonText,
              { color: themeColors.background },
            ]}
          >
            Use Adaptive ({adaptiveWPM} WPM)
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ==================== RSVP DISPLAY COMPONENT ====================

interface RSVPDisplayProps {
  theme: ThemeType;
  currentWord: string;
  currentIndex: number;
  totalWords: number;
  isActive: boolean;
  showFixationPoint?: boolean;
  highlightVowels?: boolean;
}

export const RSVPDisplay: React.FC<RSVPDisplayProps> = ({
  theme,
  currentWord,
  currentIndex,
  totalWords,
  isActive,
  showFixationPoint = true,
  highlightVowels = false,
}) => {
  const themeColors = colors[theme];
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Animate word transitions
  useEffect(() => {
    if (isActive) {
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
    }
  }, [currentWord]);

  const renderWord = (): string | React.JSX.Element[] => {
    if (!highlightVowels) {
      return currentWord;
    }

    // Highlight vowels for better fixation
    return currentWord.split('').map((char, index) => {
      const isVowel = /[aeiouAEIOU]/.test(char);
      return (
        <Text
          key={index}
          style={isVowel ? { color: themeColors.accent } : undefined}
        >
          {char}
        </Text>
      );
    });
  };

  return (
    <View style={styles.rsvpContainer}>
      {/* Progress indicator */}
      <View
        style={[
          styles.progressBar,
          { backgroundColor: 'rgba(255,255,255,0.1)' },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: themeColors.primary,
              width: `${(currentIndex / totalWords) * 100}%`,
            },
          ]}
        />
      </View>

      <Text style={[styles.progressText, { color: themeColors.text }]}>
        {currentIndex + 1} / {totalWords} (
        {Math.round((currentIndex / totalWords) * 100)}%)
      </Text>

      {/* Main RSVP display */}
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
          {renderWord()}
        </Text>

        {/* Fixation point */}
        {showFixationPoint && (
          <View
            style={[
              styles.fixationPoint,
              { backgroundColor: themeColors.accent },
            ]}
          />
        )}
      </Animated.View>

      {/* Reading info */}
      <View style={styles.readingInfo}>
        <Text style={[styles.infoText, { color: themeColors.textSecondary }]}>
          Keep your eyes on the center point
        </Text>
      </View>
    </View>
  );
};

// ==================== COMPREHENSION QUIZ COMPONENT ====================

interface ComprehensionQuizProps {
  theme: ThemeType;
  quiz: ComprehensionQuiz;
  onComplete: (score: number, answers: number[]) => void;
  onClose: () => void;
}

export const ComprehensionQuizComponent: React.FC<ComprehensionQuizProps> = ({
  theme,
  quiz,
  onComplete,
  onClose,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(quiz.timeLimit || 30);
  const [isCompleted, setIsCompleted] = useState(false);
  const themeColors = colors[theme];

  const questions = quiz.questions ?? [];
  const currentQuestion: QuizQuestion = ((questions[currentQuestionIndex] ??
    questions[0]) as QuizQuestion) ?? {
    id: 'default',
    question: 'No questions available',
    options: ['No options'],
    correctAnswer: 0,
    difficulty: 1,
    conceptTested: 'general',
  };
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // Timer
  useEffect(() => {
    if (!isCompleted && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (timeRemaining === 0) {
      handleTimeUp();
    }
  }, [timeRemaining, isCompleted]);

  const handleTimeUp = (): void => {
    // Auto-advance or complete quiz when time runs out
    if (isLastQuestion) {
      handleComplete();
    } else {
      handleNext(-1); // -1 indicates no answer selected
    }
  };

  const handleAnswerSelect = (answerIndex: number): void => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setAnswers(newAnswers);
  };

  const handleNext = (selectedAnswer: number = -1): void => {
    if (selectedAnswer === -1 && answers[currentQuestionIndex] === undefined) {
      // No answer selected, mark as incorrect
      handleAnswerSelect(-1);
    }

    if (isLastQuestion) {
      handleComplete();
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
      setTimeRemaining(quiz.timeLimit || 30);
    }
  };

  const handleComplete = (): void => {
    setIsCompleted(true);

    // Calculate score
    const correctCount = answers.reduce((count, answer, index) => {
      const q = questions[index];
      return count + (q && answer === q.correctAnswer ? 1 : 0);
    }, 0);

    const score = questions.length > 0 ? correctCount / questions.length : 0;
    onComplete(score, answers);
  };

  const handleSkip = (): void => {
    handleAnswerSelect(-1);
    handleNext(-1);
  };

  if (isCompleted) {
    const correctCount = answers.reduce((count, answer, index) => {
      const q = questions[index];
      return count + (q && answer === q.correctAnswer ? 1 : 0);
    }, 0);

    return (
      <Modal visible={true} animationType="slide">
        <View
          style={[
            styles.quizContainer,
            { backgroundColor: themeColors.background },
          ]}
        >
          <View style={styles.quizHeader}>
            <Text style={[styles.quizTitle, { color: themeColors.text }]}>
              Quiz Complete! 🎉
            </Text>
          </View>

          <View style={styles.scoreDisplay}>
            <Text style={[styles.scoreText, { color: themeColors.primary }]}>
              {correctCount} / {questions.length}
            </Text>
            <Text style={[styles.scoreLabel, { color: themeColors.text }]}>
              {questions.length > 0
                ? Math.round((correctCount / questions.length) * 100)
                : 0}
              % Correct
            </Text>
          </View>

          <ScrollView style={styles.resultsScroll}>
            {questions.map((question, index) => {
              const userAnswer = answers[index];
              const isCorrect = userAnswer === question.correctAnswer;

              return (
                <View key={question.id} style={styles.resultItem}>
                  <Text
                    style={[styles.questionNumber, { color: themeColors.text }]}
                  >
                    Question {index + 1}
                  </Text>
                  <Text
                    style={[styles.questionText, { color: themeColors.text }]}
                  >
                    {question.question}
                  </Text>

                  <View style={styles.answerComparison}>
                    <View style={styles.answerRow}>
                      <Text
                        style={[
                          styles.answerLabel,
                          {
                            color: isCorrect
                              ? themeColors.success
                              : themeColors.error,
                          },
                        ]}
                      >
                        Your Answer:
                      </Text>
                      <Text
                        style={[styles.answerText, { color: themeColors.text }]}
                      >
                        {userAnswer !== undefined && userAnswer >= 0
                          ? question.options[userAnswer]
                          : 'No answer'}
                      </Text>
                    </View>

                    {!isCorrect && (
                      <View style={styles.answerRow}>
                        <Text
                          style={[
                            styles.answerLabel,
                            { color: themeColors.success },
                          ]}
                        >
                          Correct Answer:
                        </Text>
                        <Text
                          style={[
                            styles.answerText,
                            { color: themeColors.text },
                          ]}
                        >
                          {question.options[question.correctAnswer]}
                        </Text>
                      </View>
                    )}

                    {question.explanation && (
                      <Text
                        style={[
                          styles.explanation,
                          { color: themeColors.textSecondary },
                        ]}
                      >
                        {question.explanation}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.quizButton,
              { backgroundColor: themeColors.primary },
            ]}
            onPress={onClose}
          >
            <Text
              style={[styles.quizButtonText, { color: themeColors.background }]}
            >
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
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

          <View style={styles.quizProgress}>
            <Text style={[styles.progressLabel, { color: themeColors.text }]}>
              Question {currentQuestionIndex + 1} of {questions.length}
            </Text>
            <Text style={[styles.timerText, { color: themeColors.accent }]}>
              ⏱️ {timeRemaining}s
            </Text>
          </View>
        </View>

        <ScrollView style={styles.questionContainer}>
          <Text style={[styles.questionText, { color: themeColors.text }]}>
            {currentQuestion?.question ?? 'Question'}
          </Text>

          <View style={styles.optionsContainer}>
            {(currentQuestion.options || []).map((option, index) => {
              const isSelected = answers[currentQuestionIndex] === index;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor: isSelected
                        ? themeColors.primary
                        : themeColors.surface,
                      borderColor: themeColors.primary,
                    },
                  ]}
                  onPress={() => handleAnswerSelect(index)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color: isSelected
                          ? themeColors.background
                          : themeColors.text,
                      },
                    ]}
                  >
                    {String.fromCharCode(65 + index)}. {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.difficultyIndicator}>
            <Text
              style={[
                styles.difficultyText,
                { color: themeColors.textSecondary },
              ]}
            >
              Difficulty: {'★'.repeat(currentQuestion.difficulty || 3)}
              {'☆'.repeat(5 - (currentQuestion.difficulty || 3))}
            </Text>
          </View>
        </ScrollView>

        <View style={styles.quizControls}>
          <TouchableOpacity
            style={[
              styles.quizButton,
              styles.skipButton,
              { borderColor: themeColors.textSecondary },
            ]}
            onPress={handleSkip}
          >
            <Text
              style={[
                styles.quizButtonText,
                { color: themeColors.textSecondary },
              ]}
            >
              Skip
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quizButton,
              {
                backgroundColor:
                  answers[currentQuestionIndex] !== undefined
                    ? themeColors.primary
                    : themeColors.surface,
              },
            ]}
            onPress={() => handleNext()}
            disabled={answers[currentQuestionIndex] === undefined}
          >
            <Text
              style={[
                styles.quizButtonText,
                {
                  color:
                    answers[currentQuestionIndex] !== undefined
                      ? themeColors.background
                      : themeColors.textSecondary,
                },
              ]}
            >
              {isLastQuestion ? 'Finish' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ==================== READING ANALYTICS COMPONENT ====================

interface ReadingAnalyticsDisplayProps {
  theme: ThemeType;
  analytics: ExtendedReadingAnalytics;
  currentSession?: ReadingSession;
  onClose: () => void;
}

export const ReadingAnalyticsDisplay: React.FC<
  ReadingAnalyticsDisplayProps
> = ({ theme, analytics, currentSession, onClose }) => {
  const themeColors = colors[theme];

  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy':
        return themeColors.success;
      case 'medium':
        return themeColors.warning;
      case 'hard':
        return themeColors.error;
      case 'technical':
        return themeColors.accent;
      default:
        return themeColors.text;
    }
  };

  return (
    <Modal visible={true} animationType="slide">
      <View
        style={[
          styles.analyticsContainer,
          { backgroundColor: themeColors.background },
        ]}
      >
        <View style={styles.analyticsHeader}>
          <Text style={[styles.analyticsTitle, { color: themeColors.text }]}>
            📊 Reading Performance
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.closeButton, { color: themeColors.text }]}>
              ×
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.analyticsContent}>
          {/* Current Session Stats */}
          {currentSession && (
            <View
              style={[
                styles.sessionCard,
                { backgroundColor: themeColors.surface },
              ]}
            >
              <Text style={[styles.cardTitle, { color: themeColors.text }]}>
                Current Session
              </Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text
                    style={[styles.statValue, { color: themeColors.primary }]}
                  >
                    {currentSession.wpmAchieved}
                  </Text>
                  <Text style={[styles.statLabel, { color: themeColors.text }]}>
                    WPM
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text
                    style={[styles.statValue, { color: themeColors.accent }]}
                  >
                    {Math.round(currentSession.comprehensionScore * 100)}%
                  </Text>
                  <Text style={[styles.statLabel, { color: themeColors.text }]}>
                    Comprehension
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text
                    style={[styles.statValue, { color: themeColors.success }]}
                  >
                    {currentSession.conceptsIdentified.length}
                  </Text>
                  <Text style={[styles.statLabel, { color: themeColors.text }]}>
                    Concepts
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Overall Stats */}
          <View
            style={[
              styles.sessionCard,
              { backgroundColor: themeColors.surface },
            ]}
          >
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>
              Overall Performance
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text
                  style={[styles.statValue, { color: themeColors.primary }]}
                >
                  {analytics.averageWPM.toFixed(0)}
                </Text>
                <Text style={[styles.statLabel, { color: themeColors.text }]}>
                  Avg WPM
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: themeColors.accent }]}>
                  {(analytics.averageComprehension * 100).toFixed(0)}%
                </Text>
                <Text style={[styles.statLabel, { color: themeColors.text }]}>
                  Avg Comp
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text
                  style={[styles.statValue, { color: themeColors.success }]}
                >
                  {analytics.readingStreak}
                </Text>
                <Text style={[styles.statLabel, { color: themeColors.text }]}>
                  Streak
                </Text>
              </View>
            </View>

            <View style={styles.additionalStats}>
              <Text style={[styles.statText, { color: themeColors.text }]}>
                📚 Total Sessions: {analytics.totalSessions}
              </Text>
              <Text style={[styles.statText, { color: themeColors.text }]}>
                📖 Words Read: {analytics.totalWordsRead.toLocaleString()}
              </Text>
              <Text style={[styles.statText, { color: themeColors.text }]}>
                ⏱️ Reading Time: {formatTime(analytics.totalReadingTimeMinutes)}
              </Text>
              <Text style={[styles.statText, { color: themeColors.text }]}>
                🏆 Peak WPM: {analytics.peakWPM}
              </Text>
            </View>
          </View>

          {/* Performance by Difficulty */}
          <View
            style={[
              styles.sessionCard,
              { backgroundColor: themeColors.surface },
            ]}
          >
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>
              Performance by Difficulty
            </Text>
            {Object.entries(analytics.performanceByDifficulty).map(
              ([difficulty, stats]) => (
                <View key={difficulty} style={styles.difficultyRow}>
                  <Text
                    style={[
                      styles.difficultyLabel,
                      { color: getDifficultyColor(difficulty) },
                    ]}
                  >
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </Text>
                  <View style={styles.difficultyStats}>
                    <Text
                      style={[
                        styles.difficultyValue,
                        { color: themeColors.text },
                      ]}
                    >
                      {stats.wpm.toFixed(0)} WPM
                    </Text>
                    <Text
                      style={[
                        styles.difficultyValue,
                        { color: themeColors.text },
                      ]}
                    >
                      {(stats.comprehension * 100).toFixed(0)}%
                    </Text>
                    <Text
                      style={[
                        styles.difficultyValue,
                        { color: themeColors.text },
                      ]}
                    >
                      {stats.sessions} sessions
                    </Text>
                  </View>
                </View>
              ),
            )}
          </View>

          {/* Best Reading Time */}
          <View
            style={[
              styles.sessionCard,
              { backgroundColor: themeColors.surface },
            ]}
          >
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>
              Optimal Reading Time
            </Text>
            <Text style={[styles.bestTimeText, { color: themeColors.accent }]}>
              🕐 {analytics.bestReadingHour}:00 -{' '}
              {analytics.bestReadingHour + 1}:00
            </Text>
            <Text
              style={[
                styles.bestTimeHint,
                { color: themeColors.textSecondary },
              ]}
            >
              You perform best during this hour
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

// ==================== CONTROL PANEL COMPONENT ====================

interface ControlPanelProps {
  theme: ThemeType;
  isActive: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onShowAnalytics?: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  theme,
  isActive,
  onPlay,
  onPause,
  onStop,
  onShowAnalytics,
}) => {
  const themeColors = colors[theme];

  return (
    <View style={styles.controlPanel}>
      <TouchableOpacity
        style={[styles.controlButton, { backgroundColor: themeColors.primary }]}
        onPress={isActive ? onPause : onPlay}
      >
        <Text
          style={[styles.controlButtonText, { color: themeColors.background }]}
        >
          {isActive ? '⏸️ Pause' : '▶️ Play'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.controlButton,
          styles.stopButton,
          { borderColor: themeColors.error },
        ]}
        onPress={onStop}
      >
        <Text style={[styles.controlButtonText, { color: themeColors.error }]}>
          ⏹️ Stop
        </Text>
      </TouchableOpacity>

      {onShowAnalytics && (
        <TouchableOpacity
          style={[
            styles.controlButton,
            { backgroundColor: themeColors.surface },
          ]}
          onPress={onShowAnalytics}
        >
          <Text style={[styles.controlButtonText, { color: themeColors.text }]}>
            📊 Stats
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ==================== STYLES ====================

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  // WPM Selector styles
  wpmSelector: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  wpmLabel: {
    ...typography.h4,
    marginBottom: spacing.sm,
  },
  adaptiveHint: {
    ...typography.caption,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  wpmControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.sm,
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
  adaptiveButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  adaptiveButtonText: {
    ...typography.body,
    fontWeight: '600',
  },

  // RSVP Display styles
  rsvpContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  progressBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    ...typography.caption,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  rsvpDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    minWidth: 200,
  },
  rsvpText: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 40,
  },
  fixationPoint: {
    position: 'absolute',
    bottom: -20,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  readingInfo: {
    marginTop: spacing.xl,
  },
  infoText: {
    ...typography.caption,
    textAlign: 'center',
  },

  // Quiz styles
  quizContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  quizHeader: {
    paddingTop: 40,
    marginBottom: spacing.lg,
  },
  quizTitle: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  quizProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    ...typography.body,
  },
  timerText: {
    ...typography.body,
    fontWeight: 'bold',
  },
  questionContainer: {
    flex: 1,
    marginBottom: spacing.lg,
  },
  questionText: {
    ...typography.h4,
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  optionsContainer: {
    marginBottom: spacing.lg,
  },
  optionButton: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
  },
  optionText: {
    ...typography.body,
    lineHeight: 20,
  },
  difficultyIndicator: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  difficultyText: {
    ...typography.caption,
  },
  quizControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quizButton: {
    flex: 0.45,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  quizButtonText: {
    ...typography.body,
    fontWeight: '600',
  },
  scoreDisplay: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  scoreText: {
    ...typography.h1,
    fontSize: 48,
  },
  scoreLabel: {
    ...typography.h4,
  },
  resultsScroll: {
    flex: 1,
    marginBottom: spacing.lg,
  },
  resultItem: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  questionNumber: {
    ...typography.bodySmall,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  answerComparison: {
    marginTop: spacing.sm,
  },
  answerRow: {
    marginBottom: spacing.xs,
  },
  answerLabel: {
    ...typography.bodySmall,
    fontWeight: 'bold',
  },
  answerText: {
    ...typography.body,
    marginTop: spacing.xs / 2,
  },
  explanation: {
    ...typography.bodySmall,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },

  // Analytics styles
  analyticsContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  analyticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 40,
    marginBottom: spacing.lg,
  },
  analyticsTitle: {
    ...typography.h2,
  },
  closeButton: {
    ...typography.h2,
    fontSize: 32,
  },
  analyticsContent: {
    flex: 1,
  },
  sessionCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.sm,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h3,
    fontWeight: 'bold',
  },
  statLabel: {
    ...typography.caption,
  },
  additionalStats: {
    marginTop: spacing.md,
  },
  statText: {
    ...typography.body,
    marginBottom: spacing.xs,
  },
  difficultyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  difficultyLabel: {
    ...typography.body,
    fontWeight: 'bold',
    flex: 1,
  },
  difficultyStats: {
    flexDirection: 'row',
    flex: 2,
    justifyContent: 'space-around',
  },
  difficultyValue: {
    ...typography.bodySmall,
  },
  bestTimeText: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  bestTimeHint: {
    ...typography.body,
    textAlign: 'center',
  },

  // Control Panel styles
  controlPanel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  controlButton: {
    flex: 0.3,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  controlButtonText: {
    ...typography.body,
    fontWeight: '600',
  },

  // Error boundary styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorTitle: {
    ...typography.h2,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  errorMessage: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#007AFF',
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default {
  WPMSelector,
  RSVPDisplay,
  ComprehensionQuizComponent,
  ReadingAnalyticsDisplay,
  ControlPanel,
  ErrorBoundary,
};
