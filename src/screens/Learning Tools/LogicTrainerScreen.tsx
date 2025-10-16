import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Vibration,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
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
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../../theme/colors';
import { ThemeType } from '../../theme/colors';
import StorageService, {
  LogicNode,
} from '../../services/storage/StorageService';
import { logicTrainingFSRS } from '../../services/learning/LogicTrainingFSRS';
import { MindMapGenerator } from '../../services/learning/MindMapGeneratorService';
import { DynamicLogicTrainerService } from '../../services/learning/DynamicLogicTrainerService';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Phase 4, Step 2: Logic Trainer Screen - The Brain Gym
 *
 * This is the CORE UI for logic training that directly addresses
 * your critical thinking weakness through structured practice
 */

interface LogicTrainerScreenProps {
  theme: ThemeType;
  onNavigate: (screen: string) => void;
}

interface LogicExercise {
  question: string;
  premise1: string;
  premise2: string;
  conclusion: string;
  type: 'deductive' | 'inductive' | 'abductive';
  domain: 'programming' | 'math' | 'english' | 'general';
  difficulty: 1 | 2 | 3 | 4 | 5;
}

interface AIFeedback {
  grammarFeedback: {
    hasErrors: boolean;
    corrections: Array<{
      text: string;
      suggestion: string;
      type: 'grammar' | 'clarity' | 'structure';
    }>;
  };
  logicFeedback: {
    score: 1 | 2 | 3 | 4 | 5;
    reasoning: string;
    strengths: string[];
    improvements: string[];
  };
  isLoading: boolean;
}

interface SessionState {
  isActive: boolean;
  startTime: Date | null;
  nodesCompleted: number;
  sessionGoal: number;
  averagePerformance: number;
}

const LOGIC_TYPES: Array<{
  id: 'deductive' | 'inductive' | 'abductive';
  name: string;
  description: string;
  example: string;
}> = [
  {
    id: 'deductive',
    name: 'Deductive',
    description:
      'General → Specific (If premises true, conclusion must be true)',
    example:
      'All humans are mortal; Socrates is human; Therefore, Socrates is mortal',
  },
  {
    id: 'inductive',
    name: 'Inductive',
    description: 'Specific → General (Conclusions probable, not certain)',
    example:
      'The sun rose yesterday and today; Therefore, the sun will rise tomorrow',
  },
  {
    id: 'abductive',
    name: 'Abductive',
    description: 'Best Explanation (Most likely cause given the evidence)',
    example:
      'The grass is wet; It probably rained (among possible explanations)',
  },
];

const DOMAINS: Array<{
  id: 'programming' | 'math' | 'english' | 'general';
  name: string;
  icon: string;
  color: string;
}> = [
  { id: 'programming', name: 'Programming', icon: '💻', color: '#3B82F6' },
  { id: 'math', name: 'Mathematics', icon: '🧮', color: '#8B5CF6' },
  { id: 'english', name: 'English', icon: '📝', color: '#10B981' },
  { id: 'general', name: 'General', icon: '🧠', color: '#6B7280' },
];

const DIFFICULTY_LEVELS = [
  {
    level: 1,
    name: 'Beginner',
    color: '#10B981',
    description: 'Simple logical structures',
  },
  {
    level: 2,
    name: 'Easy',
    color: '#84CC16',
    description: 'Basic reasoning chains',
  },
  {
    level: 3,
    name: 'Medium',
    color: '#F59E0B',
    description: 'Moderate complexity',
  },
  {
    level: 4,
    name: 'Hard',
    color: '#F97316',
    description: 'Complex reasoning',
  },
  {
    level: 5,
    name: 'Expert',
    color: '#EF4444',
    description: 'Advanced logical challenges',
  },
];

const LOGIC_EXERCISE_PRESETS: LogicExercise[] = [
  {
    question: 'Basic Deductive Reasoning',
    premise1: 'All roses are flowers',
    premise2: 'Some flowers fade quickly',
    conclusion: 'Therefore, some roses may fade quickly',
    type: 'deductive',
    domain: 'general',
    difficulty: 2,
  },
  {
    question: 'Programming Logic',
    premise1: 'If a function returns null, it indicates an error state',
    premise2: 'The validateInput() function returned null',
    conclusion: 'Therefore, validateInput() encountered an error',
    type: 'deductive',
    domain: 'programming',
    difficulty: 3,
  },
  {
    question: 'Mathematical Reasoning',
    premise1: 'All prime numbers greater than 2 are odd',
    premise2: '17 is a prime number greater than 2',
    conclusion: 'Therefore, 17 is an odd number',
    type: 'deductive',
    domain: 'math',
    difficulty: 2,
  },
  {
    question: 'Scientific Method',
    premise1: 'The hypothesis predicts that plants grow faster with music',
    premise2: 'In the experiment, plants with music grew 20% faster',
    conclusion: 'Therefore, the hypothesis may be supported by this evidence',
    type: 'inductive',
    domain: 'general',
    difficulty: 3,
  },
  {
    question: 'English Literature Analysis',
    premise1: 'Shakespeare often uses iambic pentameter in his sonnets',
    premise2: 'Sonnet 18 follows iambic pentameter structure',
    conclusion: 'Therefore, Sonnet 18 is likely written by Shakespeare',
    type: 'abductive',
    domain: 'english',
    difficulty: 4,
  },
];

export const LogicTrainerScreen: React.FC<LogicTrainerScreenProps> = ({
  theme,
  onNavigate,
}) => {
  const themeColors = colors[theme];
  const storage = StorageService.getInstance();
  const mindMapGenerator = MindMapGenerator.getInstance();
  const dynamicService = DynamicLogicTrainerService.getInstance();

  // Core state
  const [menuVisible, setMenuVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dataSource, setDataSource] = useState<'static' | 'dynamic' | 'hybrid'>('hybrid');
  const [dynamicExercises, setDynamicExercises] = useState<LogicExercise[]>([]);
  const [dynamicExercisesLoading, setDynamicExercisesLoading] = useState(false);

  // Logic exercise state
  const [currentExercise, setCurrentExercise] = useState<LogicExercise>({
    question: '',
    premise1: '',
    premise2: '',
    conclusion: '',
    type: 'deductive',
    domain: 'general',
    difficulty: 3,
  });

  // Session management
  const [sessionState, setSessionState] = useState<SessionState>({
    isActive: false,
    startTime: null,
    nodesCompleted: 0,
    sessionGoal: 5,
    averagePerformance: 0,
  });

  // Due nodes for practice
  const [dueLogicNodes, setDueLogicNodes] = useState<LogicNode[]>([]);
  const [currentNodeIndex, setCurrentNodeIndex] = useState(0);
  const [isReviewMode, setIsReviewMode] = useState(false);

  // AI feedback state
  const [aiFeedback, setAIFeedback] = useState<AIFeedback>({
    grammarFeedback: { hasErrors: false, corrections: [] },
    logicFeedback: { score: 3, reasoning: '', strengths: [], improvements: [] },
    isLoading: false,
  });

  // Input refs for AI feedback integration
  const premise1Ref = useRef<TextInput>(null);
  const premise2Ref = useRef<TextInput>(null);
  const conclusionRef = useRef<TextInput>(null);

  // Debounce timer for AI feedback
  const debounceTimerRef = useRef<NodeJS.Timeout>(null);

  /**
   * Initialize screen with due logic nodes
   */
  useEffect(() => {
    const initializeScreen = async () => {
      try {
        setIsLoading(true);

        // Load due logic nodes for review
        const allLogicNodes = await storage.getLogicNodes();
        const dueNodes = logicTrainingFSRS.getLogicNodesDueToday(allLogicNodes);

        setDueLogicNodes(dueNodes);

        // Load dynamic exercises if enabled
        if (dataSource === 'dynamic' || dataSource === 'hybrid') {
          try {
            setDynamicExercisesLoading(true);
            const generatedExercises = await dynamicService.generatePersonalizedExercises();
            setDynamicExercises(generatedExercises);
          } catch (error) {
            console.error('Error loading dynamic exercises:', error);
            Alert.alert(
              'AI Service Unavailable',
              'Unable to generate personalized exercises. Using static presets only.',
              [{ text: 'OK' }]
            );
            setDynamicExercises([]);
          } finally {
            setDynamicExercisesLoading(false);
          }
        }

        // If there are due nodes, start in review mode
        if (dueNodes.length > 0) {
          setIsReviewMode(true);
          loadLogicNodeIntoExercise(dueNodes[0]!);
        } else if (dynamicExercises.length > 0 && (dataSource === 'dynamic' || dataSource === 'hybrid')) {
          // Load first dynamic exercise if no due nodes
          setCurrentExercise(dynamicExercises[0]!);
        } else if (dataSource === 'static' && LOGIC_EXERCISE_PRESETS.length > 0) {
          // Load first static preset if no dynamic content and static mode
          setCurrentExercise(LOGIC_EXERCISE_PRESETS[0]!);
        }

        console.log(
          `🧠 Logic Trainer initialized: ${dueNodes.length} nodes due for review`,
        );
      } catch (error) {
        console.error('Error initializing logic trainer:', error);
        Alert.alert('Error', 'Failed to load logic training data');
      } finally {
        setIsLoading(false);
      }
    };

    initializeScreen();
  }, []);

  // Memoize expensive calculations
  const memoizedDueNodes = useMemo(() => {
    return logicTrainingFSRS.getLogicNodesDueToday(dueLogicNodes);
  }, [dueLogicNodes]);

  const memoizedOptimalSession = useMemo(() => {
    return logicTrainingFSRS.getOptimalLogicSessionSize(
      memoizedDueNodes,
      0.5, // Default cognitive load
      30 // Default 30 minutes
    );
  }, [memoizedDueNodes]);

  /**
   * Load a logic node into the exercise form for review
   */
  const loadLogicNodeIntoExercise = useCallback((logicNode: LogicNode) => {
    setCurrentExercise({
      question: logicNode.question,
      premise1: logicNode.premise1,
      premise2: logicNode.premise2,
      conclusion: logicNode.conclusion,
      type: logicNode.type,
      domain: logicNode.domain,
      difficulty: logicNode.difficulty,
    });
  }, []);

  /**
   * Phase 4, Step 4: Debounced AI feedback (non-intrusive)
   *
   * This provides real-time English correction and logic evaluation
   * without disrupting the user's flow
   */
  const requestAIFeedback = useCallback(
    async (premise1: string, premise2: string, conclusion: string) => {
      // Skip if any field is too short
      if (
        premise1.length < 10 ||
        premise2.length < 10 ||
        conclusion.length < 10
      ) {
        return;
      }

      try {
        setAIFeedback((prev) => ({ ...prev, isLoading: true }));

        // TODO: Phase 4, Step 4 - Replace with actual AI service call
        // For now, use local logic evaluation
        const localFeedback = evaluateLogicLocally(
          premise1,
          premise2,
          conclusion,
        );

        setAIFeedback({
          grammarFeedback: {
            hasErrors: false, // TODO: Add grammar checking
            corrections: [],
          },
          logicFeedback: localFeedback,
          isLoading: false,
        });
      } catch (error) {
        console.error('Error getting AI feedback:', error);
        setAIFeedback((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [],
  );

  /**
   * Phase 4, Step 3: Local logic evaluation (temporary until AI integration)
   *
   * Provides basic logic scoring based on structural completeness
   */
  const evaluateLogicLocally = useCallback(
    (
      premise1: string,
      premise2: string,
      conclusion: string,
    ): AIFeedback['logicFeedback'] => {
      let score: 1 | 2 | 3 | 4 | 5 = 3;
      const strengths: string[] = [];
      const improvements: string[] = [];
      let reasoning = '';

      // Check completeness
      const hasAllFields =
        premise1.length >= 10 &&
        premise2.length >= 10 &&
        conclusion.length >= 10;

      if (hasAllFields) {
        strengths.push('All premises and conclusion provided');
        score = Math.min(5, score + 1) as 1 | 2 | 3 | 4 | 5;
      } else {
        improvements.push('Complete all fields with substantial content');
        score = Math.max(1, score - 1) as 1 | 2 | 3 | 4 | 5;
      }

      // Check for logical connectors
      const hasLogicalConnectors =
        /\b(therefore|thus|hence|consequently|because|since|if|then)\b/i.test(
          conclusion,
        );

      if (hasLogicalConnectors) {
        strengths.push('Uses logical connectors effectively');
        score = Math.min(5, score + 1) as 1 | 2 | 3 | 4 | 5;
      } else {
        improvements.push(
          'Add logical connectors (therefore, thus, hence, etc.)',
        );
      }

      // Check conclusion length and structure
      if (conclusion.length > 50) {
        strengths.push('Detailed conclusion shows thorough reasoning');
      } else if (conclusion.length < 20) {
        improvements.push('Expand conclusion with more detailed reasoning');
        score = Math.max(1, score - 1) as 1 | 2 | 3 | 4 | 5;
      }

      // Generate reasoning based on type
      switch (currentExercise.type) {
        case 'deductive':
          reasoning =
            'Deductive reasoning requires premises that logically guarantee the conclusion';
          break;
        case 'inductive':
          reasoning =
            'Inductive reasoning builds general principles from specific observations';
          break;
        case 'abductive':
          reasoning =
            'Abductive reasoning finds the most likely explanation for given evidence';
          break;
      }

      return { score, reasoning, strengths, improvements };
    },
    [currentExercise.type],
  );

  /**
   * Debounced text change handler for AI feedback
   */
  const handleTextChange = useCallback(
    (field: 'premise1' | 'premise2' | 'conclusion', text: string) => {
      setCurrentExercise((prev) => ({ ...prev, [field]: text }));

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounced timer for AI feedback
      debounceTimerRef.current = setTimeout(() => {
        const updatedExercise = { ...currentExercise, [field]: text };
        requestAIFeedback(
          updatedExercise.premise1,
          updatedExercise.premise2,
          updatedExercise.conclusion,
        );
      }, 1500); // 1.5 second debounce
    },
    [currentExercise, requestAIFeedback],
  );

  /**
   * Phase 4, Step 3: Submit logic exercise for FSRS processing
   *
   * This is where the training loop closes with FSRS scheduling
   */
  const handleSubmitExercise = useCallback(async () => {
    if (
      !currentExercise.premise1.trim() ||
      !currentExercise.premise2.trim() ||
      !currentExercise.conclusion.trim()
    ) {
      Alert.alert(
        'Incomplete Exercise',
        'Please fill in all fields before submitting.',
      );
      return;
    }

    try {
      setIsSubmitting(true);

      // Get final AI evaluation (or use cached)
      let finalScore = aiFeedback.logicFeedback.score;

      // Allow user to self-assess if AI feedback is not available
      if (aiFeedback.isLoading || finalScore === 3) {
        finalScore = await promptUserForSelfAssessment();
      }

      let updatedLogicNode: LogicNode | null;

      if (isReviewMode && dueLogicNodes[currentNodeIndex]) {
        // Update existing logic node
        const currentNode = dueLogicNodes[currentNodeIndex];
        updatedLogicNode = logicTrainingFSRS.scheduleNextLogicReview(
          currentNode,
          finalScore,
          0.5, // TODO: Get actual cognitive load
          new Date(),
        );

        // Update the node in storage
        await storage.updateLogicNode(currentNode.id, {
          ...updatedLogicNode,
          premise1: currentExercise.premise1,
          premise2: currentExercise.premise2,
          conclusion: currentExercise.conclusion,
        });
      } else {
        // Create new logic node
        updatedLogicNode = await storage.addLogicNode({
          question: currentExercise.question || 'Logic Training Exercise',
          premise1: currentExercise.premise1,
          premise2: currentExercise.premise2,
          conclusion: currentExercise.conclusion,
          type: currentExercise.type,
          domain: currentExercise.domain,
          difficulty: currentExercise.difficulty,
        });

        // If creation failed (e.g., offline and queued), abort gracefully
        if (!updatedLogicNode) {
          console.warn(
            'addLogicNode returned null - node was not created immediately',
          );
          Alert.alert(
            'Saved Offline',
            'Your exercise was saved locally and will be synced when online. It may not appear immediately in reviews.',
          );
          // Exit early; finally block will clear submitting state
          return;
        }

        // Schedule first review with FSRS
        updatedLogicNode = logicTrainingFSRS.scheduleNextLogicReview(
          updatedLogicNode,
          finalScore,
          0.5,
          new Date(),
        );

        await storage.updateLogicNode(
          updatedLogicNode.id,
          updatedLogicNode as LogicNode,
        );
      }

      // Update session state
      setSessionState((prev) => ({
        ...prev,
        nodesCompleted: prev.nodesCompleted + 1,
        averagePerformance:
          (prev.averagePerformance * prev.nodesCompleted + finalScore) /
          (prev.nodesCompleted + 1),
      }));

      // Provide feedback
      if (Platform.OS !== 'web') {
        Vibration.vibrate(finalScore >= 4 ? [0, 100, 50, 100] : [0, 200]);
      }

      Alert.alert(
        'Exercise Complete!',
        `Score: ${finalScore}/5\n${
          aiFeedback.logicFeedback.reasoning
        }\n\nNext review: ${updatedLogicNode.nextReviewDate.toLocaleDateString()}`,
        [
          {
            text: 'Continue Training',
            onPress: () => loadNextExercise(),
          },
          {
            text: 'View Neural Map',
            onPress: () => {
              // Regenerate neural map to include new logic node
              mindMapGenerator.generateNeuralGraph(true);
              onNavigate('neural-mind-map');
            },
          },
        ],
      );
    } catch (error) {
      console.error('Error submitting logic exercise:', error);
      Alert.alert('Error', 'Failed to save logic exercise. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    currentExercise,
    aiFeedback,
    isReviewMode,
    dueLogicNodes,
    currentNodeIndex,
    storage,
    onNavigate,
    mindMapGenerator,
  ]);

  /**
   * Prompt user for self-assessment when AI is not available
   */
  const promptUserForSelfAssessment = (): Promise<1 | 2 | 3 | 4 | 5> => {
    return new Promise((resolve) => {
      Alert.alert(
        'Rate Your Logic',
        'How would you rate your logical reasoning in this exercise?',
        [
          { text: '1 - Poor Logic', onPress: () => resolve(1) },
          { text: '2 - Weak Logic', onPress: () => resolve(2) },
          { text: '3 - Good Logic', onPress: () => resolve(3) },
          { text: '4 - Strong Logic', onPress: () => resolve(4) },
          { text: '5 - Perfect Logic', onPress: () => resolve(5) },
        ],
        { cancelable: false },
      );
    });
  };

  /**
   * Load next exercise (either due node or new exercise)
   */
  const loadNextExercise = useCallback(() => {
    if (isReviewMode && currentNodeIndex < dueLogicNodes.length - 1) {
      // Load next due node
      const nextIndex = currentNodeIndex + 1;
      setCurrentNodeIndex(nextIndex);
      loadLogicNodeIntoExercise(dueLogicNodes[nextIndex]!);
    } else {
      // Create fresh exercise or switch to creation mode
      setIsReviewMode(false);
      setCurrentExercise({
        question: '',
        premise1: '',
        premise2: '',
        conclusion: '',
        type: 'deductive',
        domain: 'general',
        difficulty: 3,
      });
      setAIFeedback({
        grammarFeedback: { hasErrors: false, corrections: [] },
        logicFeedback: {
          score: 3,
          reasoning: '',
          strengths: [],
          improvements: [],
        },
        isLoading: false,
      });
    }
  }, [
    isReviewMode,
    currentNodeIndex,
    dueLogicNodes,
    loadLogicNodeIntoExercise,
  ]);

  /**
   * Start a focused training session
   */
  const startTrainingSession = useCallback(() => {
    setSessionState({
      isActive: true,
      startTime: new Date(),
      nodesCompleted: 0,
      sessionGoal: 5,
      averagePerformance: 0,
    });

    Alert.alert(
      'Logic Training Session Started',
      `Goal: Complete ${5} logic exercises\nFocus on structured reasoning and clear conclusions.`,
      [{ text: 'Begin Training', style: 'default' }],
    );
  }, [memoizedOptimalSession.sessionSize]);

  // Loading state
  if (isLoading) {
    return (
      <ScreenContainer theme={theme} style={styles.container}>
        <AppHeader
          title="Logic Brain Gym"
          theme={theme}
          onMenuPress={() => setMenuVisible(true)}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.text }]}>
            Loading logic training environment...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer theme={theme} style={styles.container}>
      <AppHeader
        title="Logic Brain Gym"
        theme={theme}
        onMenuPress={() => setMenuVisible(true)}
        rightComponent={
          <TouchableOpacity onPress={startTrainingSession}>
            <Text
              style={[styles.sessionButton, { color: themeColors.primary }]}
            >
              {sessionState.isActive
                ? `${sessionState.nodesCompleted}/${sessionState.sessionGoal}`
                : 'Start Session'}
            </Text>
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
      >
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Data Source Toggle */}
          <GlassCard theme={theme} style={styles.dataSourceCard}>
            <Text style={[styles.dataSourceTitle, { color: themeColors.text }]}>
              🎯 Exercise Source
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
                  AI-Generated
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.dataSourceDescription, { color: themeColors.textSecondary }]}>
              {dataSource === 'static' && 'Using predefined logic types and examples'}
              {dataSource === 'hybrid' && 'Combining static templates with AI-generated exercises'}
              {dataSource === 'dynamic' && 'Using AI-generated exercises based on your performance'}
            </Text>
            {dynamicExercises.length > 0 && (
              <Text style={[styles.aiExercisesCount, { color: themeColors.success }]}>
                {dynamicExercises.length} AI exercises available
              </Text>
            )}
          </GlassCard>

          {/* Session Status */}
          {sessionState.isActive && (
            <GlassCard theme={theme} style={styles.sessionStatusCard}>
              <Text
                style={[styles.sessionStatusTitle, { color: themeColors.text }]}
              >
                🧠 Active Training Session
              </Text>
              <View style={styles.sessionStatusRow}>
                <Text
                  style={[
                    styles.sessionStatusText,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  Progress: {sessionState.nodesCompleted}/
                  {sessionState.sessionGoal}
                </Text>
                <Text
                  style={[
                    styles.sessionStatusText,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  Avg Score: {sessionState.averagePerformance.toFixed(1)}/5
                </Text>
              </View>
            </GlassCard>
          )}

          {/* Review Mode Header */}
          {isReviewMode && dueLogicNodes.length > 0 && (
            <GlassCard theme={theme} style={styles.reviewHeaderCard}>
              <Text
                style={[
                  styles.reviewHeaderTitle,
                  { color: themeColors.warning },
                ]}
              >
                📚 Review Mode
              </Text>
              <Text
                style={[
                  styles.reviewHeaderText,
                  { color: themeColors.textSecondary },
                ]}
              >
                {currentNodeIndex + 1} of {dueLogicNodes.length} due for review
              </Text>
            </GlassCard>
          )}

          {/* Exercise Type & Domain Selection */}
          <GlassCard theme={theme} style={styles.selectionCard}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
              Logic Exercise Setup
            </Text>

            {/* Logic Type Selection */}
            <Text
              style={[
                styles.subsectionTitle,
                { color: themeColors.textSecondary },
              ]}
            >
              Reasoning Type
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.typeSelector}
            >
              {LOGIC_TYPES.map((logicType) => (
                <TouchableOpacity
                  key={logicType.id}
                  onPress={() =>
                    setCurrentExercise((prev) => ({
                      ...prev,
                      type: logicType.id,
                    }))
                  }
                  style={[
                    styles.typeButton,
                    currentExercise.type === logicType.id && [
                      styles.typeButtonActive,
                      {
                        borderColor: themeColors.primary,
                        backgroundColor: themeColors.primary + '20',
                      },
                    ],
                    { borderColor: themeColors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeButtonTitle,
                      {
                        color:
                          currentExercise.type === logicType.id
                            ? themeColors.primary
                            : themeColors.text,
                      },
                    ]}
                  >
                    {logicType.name}
                  </Text>
                  <Text
                    style={[
                      styles.typeButtonDescription,
                      {
                        color:
                          currentExercise.type === logicType.id
                            ? themeColors.primary
                            : themeColors.textSecondary,
                      },
                    ]}
                  >
                    {logicType.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Domain Selection */}
            <Text
              style={[
                styles.subsectionTitle,
                { color: themeColors.textSecondary },
              ]}
            >
              Domain
            </Text>
            <View style={styles.domainSelector}>
              {DOMAINS.map((domain) => (
                <TouchableOpacity
                  key={domain.id}
                  onPress={() =>
                    setCurrentExercise((prev) => ({
                      ...prev,
                      domain: domain.id,
                    }))
                  }
                  style={[
                    styles.domainButton,
                    currentExercise.domain === domain.id && [
                      styles.domainButtonActive,
                      {
                        backgroundColor: domain.color + '20',
                        borderColor: domain.color,
                      },
                    ],
                    { borderColor: themeColors.border },
                  ]}
                >
                  <Text style={styles.domainIcon}>{domain.icon}</Text>
                  <Text
                    style={[
                      styles.domainText,
                      {
                        color:
                          currentExercise.domain === domain.id
                            ? domain.color
                            : themeColors.text,
                      },
                    ]}
                  >
                    {domain.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Difficulty Selection */}
            <Text
              style={[
                styles.subsectionTitle,
                { color: themeColors.textSecondary },
              ]}
            >
              Difficulty Level
            </Text>
            <View style={styles.difficultySelector}>
              {DIFFICULTY_LEVELS.map((diff) => (
                <TouchableOpacity
                  key={diff.level}
                  onPress={() =>
                    setCurrentExercise((prev) => ({
                      ...prev,
                      difficulty: diff.level as 1 | 2 | 3 | 4 | 5,
                    }))
                  }
                  style={[
                    styles.difficultyButton,
                    currentExercise.difficulty === diff.level && [
                      styles.difficultyButtonActive,
                      {
                        backgroundColor: diff.color + '20',
                        borderColor: diff.color,
                      },
                    ],
                    { borderColor: themeColors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.difficultyLevel,
                      {
                        color:
                          currentExercise.difficulty === diff.level
                            ? diff.color
                            : themeColors.text,
                      },
                    ]}
                  >
                    {diff.level}
                  </Text>
                  <Text
                    style={[
                      styles.difficultyName,
                      {
                        color:
                          currentExercise.difficulty === diff.level
                            ? diff.color
                            : themeColors.textSecondary,
                      },
                    ]}
                  >
                    {diff.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>

          {/* Logic Exercise Form - The Core Brain Gym */}
          <GlassCard theme={theme} style={styles.exerciseCard}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
              🧠 Logic Structure Training
            </Text>

            {/* Question/Topic (Optional) */}
            <View style={styles.inputGroup}>
              <Text
                style={[
                  styles.inputLabel,
                  { color: themeColors.textSecondary },
                ]}
              >
                Question or Topic (Optional)
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: themeColors.text,
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.surface + '50',
                  },
                ]}
                placeholder="What logical question are you exploring?"
                placeholderTextColor={themeColors.textSecondary + '80'}
                value={currentExercise.question}
                onChangeText={(text) =>
                  setCurrentExercise((prev) => ({ ...prev, question: text }))
                }
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Premise 1 - Primary Input */}
            <View style={styles.inputGroup}>
              <Text
                style={[
                  styles.inputLabel,
                  { color: themeColors.textSecondary },
                ]}
              >
                Premise 1 - First Statement
              </Text>
              <TextInput
                ref={premise1Ref}
                style={[
                  styles.textInput,
                  styles.premiseInput,
                  {
                    color: themeColors.text,
                    borderColor: currentExercise.premise1
                      ? themeColors.success
                      : themeColors.border,
                    backgroundColor: themeColors.surface + '50',
                  },
                ]}
                placeholder="Enter your first logical premise..."
                placeholderTextColor={themeColors.textSecondary + '80'}
                value={currentExercise.premise1}
                onChangeText={(text) => handleTextChange('premise1', text)}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              {aiFeedback.isLoading && (
                <ActivityIndicator
                  size="small"
                  color={themeColors.primary}
                  style={styles.feedbackIndicator}
                />
              )}
            </View>

            {/* Premise 2 - Secondary Input */}
            <View style={styles.inputGroup}>
              <Text
                style={[
                  styles.inputLabel,
                  { color: themeColors.textSecondary },
                ]}
              >
                Premise 2 - Second Statement
              </Text>
              <TextInput
                ref={premise2Ref}
                style={[
                  styles.textInput,
                  styles.premiseInput,
                  {
                    color: themeColors.text,
                    borderColor: currentExercise.premise2
                      ? themeColors.success
                      : themeColors.border,
                    backgroundColor: themeColors.surface + '50',
                  },
                ]}
                placeholder="Enter your second logical premise..."
                placeholderTextColor={themeColors.textSecondary + '80'}
                value={currentExercise.premise2}
                onChangeText={(text) => handleTextChange('premise2', text)}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Conclusion - Critical Reasoning Output */}
            <View style={styles.inputGroup}>
              <Text
                style={[
                  styles.inputLabel,
                  { color: themeColors.textSecondary },
                ]}
              >
                Conclusion - Logical Result
              </Text>
              <TextInput
                ref={conclusionRef}
                style={[
                  styles.textInput,
                  styles.conclusionInput,
                  {
                    color: themeColors.text,
                    borderColor: currentExercise.conclusion
                      ? themeColors.primary
                      : themeColors.border,
                    backgroundColor: themeColors.surface + '50',
                  },
                ]}
                placeholder="What conclusion logically follows from your premises?"
                placeholderTextColor={themeColors.textSecondary + '80'}
                value={currentExercise.conclusion}
                onChangeText={(text) => handleTextChange('conclusion', text)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* AI Feedback Display (Non-intrusive) */}
            {aiFeedback.logicFeedback.reasoning && (
              <View style={styles.feedbackContainer}>
                <Text
                  style={[styles.feedbackTitle, { color: themeColors.info }]}
                >
                  🎯 Logic Analysis
                </Text>
                <Text
                  style={[styles.feedbackScore, { color: themeColors.primary }]}
                >
                  Score: {aiFeedback.logicFeedback.score}/5
                </Text>
                <Text
                  style={[
                    styles.feedbackReasoning,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  {aiFeedback.logicFeedback.reasoning}
                </Text>

                {aiFeedback.logicFeedback.strengths.length > 0 && (
                  <View style={styles.feedbackSection}>
                    <Text
                      style={[
                        styles.feedbackSectionTitle,
                        { color: themeColors.success },
                      ]}
                    >
                      ✅ Strengths:
                    </Text>
                    {aiFeedback.logicFeedback.strengths.map(
                      (strength, index) => (
                        <Text
                          key={index}
                          style={[
                            styles.feedbackItem,
                            { color: themeColors.textSecondary },
                          ]}
                        >
                          • {strength}
                        </Text>
                      ),
                    )}
                  </View>
                )}

                {aiFeedback.logicFeedback.improvements.length > 0 && (
                  <View style={styles.feedbackSection}>
                    <Text
                      style={[
                        styles.feedbackSectionTitle,
                        { color: themeColors.warning },
                      ]}
                    >
                      🎯 Improvements:
                    </Text>
                    {aiFeedback.logicFeedback.improvements.map(
                      (improvement, index) => (
                        <Text
                          key={index}
                          style={[
                            styles.feedbackItem,
                            { color: themeColors.textSecondary },
                          ]}
                        >
                          • {improvement}
                        </Text>
                      ),
                    )}
                  </View>
                )}
              </View>
            )}
          </GlassCard>

          {/* Submit Button */}
          <View style={styles.submitContainer}>
            <Button
              title={
                isSubmitting
                  ? 'Processing...'
                  : 'Evaluate & Save Logic Exercise'
              }
              onPress={handleSubmitExercise}
              variant="primary"
              theme={theme}
              disabled={
                isSubmitting ||
                !currentExercise.premise1.trim() ||
                !currentExercise.premise2.trim() ||
                !currentExercise.conclusion.trim()
              }
              style={styles.submitButton}
            />

            {isReviewMode && currentNodeIndex < dueLogicNodes.length - 1 && (
              <Button
                title="Skip to Next Review"
                onPress={loadNextExercise}
                variant="outline"
                theme={theme}
                style={styles.skipButton}
              />
            )}
          </View>

          {/* Logic Type Example */}
          <GlassCard theme={theme} style={styles.exampleCard}>
            <Text style={[styles.exampleTitle, { color: themeColors.text }]}>
              💡 {LOGIC_TYPES.find((t) => t.id === currentExercise.type)?.name}{' '}
              Example
            </Text>
            <Text
              style={[styles.exampleText, { color: themeColors.textSecondary }]}
            >
              {LOGIC_TYPES.find((t) => t.id === currentExercise.type)?.example}
            </Text>
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>

      <HamburgerMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={onNavigate}
        currentScreen="logic-trainer"
        theme={theme}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingContainer: {
    flex: 1,
    paddingTop: 100, // Account for header
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },

  // Data Source Toggle
  dataSourceCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
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
  aiExercisesCount: {
    ...typography.caption,
    fontWeight: '600',
  },
  loadingText: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.md,
  },

  // Session Management
  sessionButton: {
    ...typography.caption,
    fontWeight: '600',
  },
  sessionStatusCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  sessionStatusTitle: {
    ...typography.h4,
    marginBottom: spacing.xs,
  },
  sessionStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sessionStatusText: {
    ...typography.caption,
  },

  // Review Mode
  reviewHeaderCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  reviewHeaderTitle: {
    ...typography.h4,
    marginBottom: spacing.xs,
  },
  reviewHeaderText: {
    ...typography.body,
  },

  // Selection Cards
  selectionCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  subsectionTitle: {
    ...typography.h4,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },

  // Type Selection
  typeSelector: {
    marginBottom: spacing.sm,
  },
  typeButton: {
    width: 200,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
  },
  typeButtonActive: {
    borderWidth: 2,
  },
  typeButtonTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  typeButtonDescription: {
    ...typography.caption,
    lineHeight: 16,
  },

  // Domain Selection
  domainSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  domainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  domainButtonActive: {
    borderWidth: 2,
  },
  domainIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  domainText: {
    ...typography.body,
  },

  // Difficulty Selection
  difficultySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  difficultyButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginHorizontal: 2,
  },
  difficultyButtonActive: {
    borderWidth: 2,
  },
  difficultyLevel: {
    ...typography.h4,
    fontWeight: '600',
  },
  difficultyName: {
    ...typography.caption,
    marginTop: spacing.xs,
  },

  // Exercise Form
  exerciseCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
    position: 'relative',
  },
  inputLabel: {
    ...typography.body,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  textInput: {
    ...typography.body,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  premiseInput: {
    minHeight: 80,
  },
  conclusionInput: {
    minHeight: 100,
  },

  // Feedback
  feedbackIndicator: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.sm,
  },
  feedbackContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
  },
  feedbackTitle: {
    ...typography.h4,
    marginBottom: spacing.xs,
  },
  feedbackScore: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  feedbackReasoning: {
    ...typography.body,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  feedbackSection: {
    marginTop: spacing.sm,
  },
  feedbackSectionTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  feedbackItem: {
    ...typography.caption,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },

  // Submit
  submitContainer: {
    marginBottom: spacing.md,
  },
  submitButton: {
    marginBottom: spacing.sm,
  },
  skipButton: {
    marginBottom: spacing.sm,
  },

  // Example
  exampleCard: {
    padding: spacing.md,
  },
  exampleTitle: {
    ...typography.h4,
    marginBottom: spacing.sm,
  },
  exampleText: {
    ...typography.body,
    lineHeight: 22,
    fontStyle: 'italic',
  },
});
