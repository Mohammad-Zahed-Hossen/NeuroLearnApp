import React, { useState, useEffect } from 'react';
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
import { AppHeader, HamburgerMenu } from '../components/Navigation';
import {
  GlassCard,
  Button,
  ScreenContainer,
} from '../components/GlassComponents';
import { colors, spacing, typography, borderRadius } from '../theme/colors';
import { ThemeType } from '../theme/colors';
import { HybridStorageService } from '../services/HybridStorageService';
import { SpacedRepetitionService } from '../services/SpacedRepetitionService';
import { Flashcard, StudySession } from '../types';


// Add this helper function after imports
const ensureDate = (dateValue: any): Date => {
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'string' || typeof dateValue === 'number') {
    return new Date(dateValue);
  }
  return new Date();
};

interface FlashcardsScreenProps {
  theme: ThemeType;
  onNavigate: (screen: string) => void;
}

interface StudyState {
  active: boolean;
  cards: Flashcard[];
  currentIndex: number;
  showAnswer: boolean;
  sessionStartTime: Date;
  cardsStudied: number;
  cognitiveLoad: number;
}

export const FlashcardsScreen: React.FC<FlashcardsScreenProps> = ({
  theme,
  onNavigate,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);

  // Study session state
  const [studyState, setStudyState] = useState<StudyState>({
    active: false,
    cards: [],
    currentIndex: 0,
    showAnswer: false,
    sessionStartTime: new Date(),
    cardsStudied: 0,
    cognitiveLoad: 1.0,
  });

  // Form state
  const [formData, setFormData] = useState({
    front: '',
    back: '',
    category: 'general',
  });

  // Animation
  const fadeAnim = useState(new Animated.Value(1))[0];

  const themeColors = colors[theme];
  const storage = HybridStorageService.getInstance();
  const srs = SpacedRepetitionService.getInstance();

  useEffect(() => {
    loadFlashcards();
  }, []);

  const loadFlashcards = async () => {
    try {
      setLoading(true);
      const cards = await storage.getFlashcards();
      const sessions = await storage.getStudySessions();

      setFlashcards(cards);

      // Calculate due cards and cognitive load
      const due = srs.getDueCards(cards);
      setDueCards(due);

      const cognitiveLoad = srs.calculateCognitiveLoad(sessions.slice(-10));
      setStudyState((prev) => ({ ...prev, cognitiveLoad }));
} catch (error) {
      console.error('Error loading flashcards:', error);
    } finally {
      setLoading(false);
    }
  };

  const createFlashcard = async () => {
    if (!formData.front.trim() || !formData.back.trim()) {
      Alert.alert('Error', 'Please fill in both front and back of the card');
      return;
    }

    try {
      const newCard: Flashcard = {
        id: Date.now().toString(),
        front: formData.front.trim(),
        back: formData.back.trim(),
        category: formData.category,
        nextReview: ensureDate(new Date()),
        created: ensureDate(new Date()),
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
      };

      const updatedCards = [...flashcards, newCard];
      await storage.saveFlashcards(updatedCards);
      setFlashcards(updatedCards);

      // Reset form and close modal
      setFormData({ front: '', back: '', category: 'general' });
      setCreateModalVisible(false);

      // Refresh due cards
      const due = srs.getDueCards(updatedCards);
      setDueCards(due);
} catch (error) {
      console.error('Error creating flashcard:', error);
      Alert.alert('Error', 'Failed to create flashcard');
    }
  };

  const updateFlashcard = async () => {
    if (!editingCard || !formData.front.trim() || !formData.back.trim()) {
      Alert.alert('Error', 'Please fill in both front and back of the card');
      return;
    }

    try {
      const updatedCard = {
        ...editingCard,
        front: formData.front.trim(),
        back: formData.back.trim(),
        category: formData.category,
      };

      const updatedCards = flashcards.map((card) =>
        card.id === editingCard.id ? updatedCard : card,
      );

      await storage.saveFlashcards(updatedCards);
      setFlashcards(updatedCards);

      // Reset form and close modal
      setFormData({ front: '', back: '', category: 'general' });
      setEditModalVisible(false);
      setEditingCard(null);

      // Refresh due cards
      const due = srs.getDueCards(updatedCards);
      setDueCards(due);
} catch (error) {
      console.error('Error updating flashcard:', error);
      Alert.alert('Error', 'Failed to update flashcard');
    }
  };

  const deleteFlashcard = async (cardId: string) => {
    Alert.alert(
      'Delete Card',
      'Are you sure you want to delete this flashcard?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedCards = flashcards.filter(
                (card) => card.id !== cardId,
              );
              await storage.saveFlashcards(updatedCards);
              setFlashcards(updatedCards);

              // Refresh due cards
              const due = srs.getDueCards(updatedCards);
              setDueCards(due);
} catch (error) {
              console.error('Error deleting flashcard:', error);
              Alert.alert('Error', 'Failed to delete flashcard');
            }
          },
        },
      ],
    );
  };

  const startStudySession = () => {
    if (dueCards.length === 0) {
      Alert.alert(
        'No Cards Due',
        'All cards are up to date! Come back later for reviews.',
      );
      return;
    }

    // Calculate optimal session size based on cognitive load
    const optimalSize = srs.getOptimalSessionSize(
      studyState.cognitiveLoad,
      dueCards.length,
    );
    const sessionCards = dueCards.slice(0, optimalSize);

    setStudyState({
      active: true,
      cards: sessionCards,
      currentIndex: 0,
      showAnswer: false,
      sessionStartTime: new Date(),
      cardsStudied: 0,
      cognitiveLoad: studyState.cognitiveLoad,
    });
  };

  const showAnswer = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    setStudyState((prev) => ({ ...prev, showAnswer: true }));
  };

const rateCard = async (rating: 1 | 2 | 3 | 4 | 5) => {
  if (!studyState.active || studyState.currentIndex >= studyState.cards.length)
    return;

  const currentCard = studyState.cards[studyState.currentIndex];

  // Convert numeric rating to difficulty string
  const difficultyMap: {
    [key: number]: 'again' | 'hard' | 'good' | 'easy' | 'perfect';
  } = {
    1: 'again',
    2: 'hard',
    3: 'good',
    4: 'easy',
    5: 'perfect',
  };

  const difficulty = difficultyMap[rating];

  // Update card using spaced repetition algorithm
  const nextReviewDate = srs.scheduleNextReview(difficulty, currentCard);

  // Ensure nextReviewDate is a proper Date object
  const safeNextReviewDate =
    nextReviewDate instanceof Date ? nextReviewDate : new Date(nextReviewDate);

  // Create updated card with new review date
  const updatedCard = {
    ...currentCard,
    nextReview: ensureDate(nextReviewDate),
  };

  // Update flashcards array
  const updatedCards = flashcards.map((card) =>
    card.id === currentCard.id ? updatedCard : card,
  );

  try {
    await storage.saveFlashcards(updatedCards);
    setFlashcards(updatedCards);

    // Move to next card or finish session
    const nextIndex = studyState.currentIndex + 1;
    if (nextIndex >= studyState.cards.length) {
      await finishStudySession();
    } else {
      setStudyState((prev) => ({
        ...prev,
        currentIndex: nextIndex,
        showAnswer: false,
        cardsStudied: prev.cardsStudied + 1,
      }));

      // Animate card transition
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  } catch (error) {
    console.error('Error updating card:', error);
    Alert.alert('Error', 'Failed to update card');
  }
};

  const finishStudySession = async () => {
    const sessionDuration =
      (new Date().getTime() - studyState.sessionStartTime.getTime()) /
      1000 /
  60;

    // Save study session
    const session: StudySession = {
      id: Date.now().toString(),
      type: 'flashcards',
      startTime: studyState.sessionStartTime,
      endTime: new Date(),
      duration: Math.round(sessionDuration),
      cardsStudied: studyState.cardsStudied + 1,
      completed: true,
    };

    try {
      await storage.saveStudySession(session);

      // Reset study state
      setStudyState({
        active: false,
        cards: [],
        currentIndex: 0,
        showAnswer: false,
        sessionStartTime: new Date(),
        cardsStudied: 0,
        cognitiveLoad: studyState.cognitiveLoad,
      });

      // Refresh due cards
      const due = srs.getDueCards(flashcards);
      setDueCards(due);

      Alert.alert(
        'Session Complete! 🎉',
        `Great job! You reviewed ${session.cardsStudied} cards in ${session.duration} minutes.\n\nYour spaced repetition algorithm has been optimized based on your performance.`,
        [{ text: 'Continue Learning', onPress: () => {} }],
      );
} catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const openEditModal = (card: Flashcard) => {
    setEditingCard(card);
    setFormData({
      front: card.front,
      back: card.back,
      category: card.category,
    });
    setEditModalVisible(true);
  };

  const getRatingColor = (rating: number): string => {
    switch (rating) {
      case 1:
        return themeColors.error;
      case 2:
        return themeColors.warning;
      case 3:
        return themeColors.textSecondary;
      case 4:
        return themeColors.success;
      case 5:
        return themeColors.primary;
      default:
        return themeColors.textSecondary;
    }
  };

  const getRatingLabel = (rating: number): string => {
    switch (rating) {
      case 1:
        return 'Again';
      case 2:
        return 'Hard';
      case 3:
        return 'Good';
      case 4:
        return 'Easy';
      case 5:
        return 'Perfect';
      default:
        return 'Good';
    }
  };

  if (loading) {
    return (
      <ScreenContainer theme={theme}>
        <AppHeader
          title="Loading..."
          theme={theme}
          onMenuPress={() => setMenuVisible(true)}
        />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: themeColors.text }]}>
            Loading your flashcards...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // Study Session View
  if (studyState.active && studyState.cards.length > 0) {
    const currentCard = studyState.cards[studyState.currentIndex];
    const progress =
      ((studyState.currentIndex + 1) / studyState.cards.length) * 100;

    return (
      <ScreenContainer theme={theme}>
        <AppHeader
          title={`Study Session (${studyState.currentIndex + 1}/${
            studyState.cards.length
          })`}
          theme={theme}
          onMenuPress={() => setMenuVisible(true)}
          rightComponent={
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'End Session',
                  'Are you sure you want to end this study session?',
                  [
                    { text: 'Continue', style: 'cancel' },
                    { text: 'End Session', onPress: finishStudySession },
                  ],
                );
              }}
            >
              <Text style={{ color: themeColors.error, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          }
        />

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.studyContainer}
        >
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress}%`,
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
              {Math.round(progress)}% Complete
            </Text>
          </View>

          {/* Cognitive Load Indicator */}
          <GlassCard theme={theme} style={styles.cognitiveLoadCard}>
            <Text
              style={[
                styles.cognitiveLoadText,
                { color: themeColors.textMuted },
              ]}
            >
              Cognitive Load: {studyState.cognitiveLoad.toFixed(1)} •
              {studyState.cognitiveLoad > 1.5
                ? ' Take breaks between cards'
                : ' Optimal learning state'}
            </Text>
          </GlassCard>

          {/* Flashcard */}
          <Animated.View style={[styles.cardContainer, { opacity: fadeAnim }]}>
            <GlassCard theme={theme} style={styles.studyCard}>
              <View style={styles.cardHeader}>
                <Text
                  style={[styles.cardCategory, { color: themeColors.primary }]}
                >
                  {currentCard.category.toUpperCase()}
                </Text>
                <Text
                  style={[styles.cardMeta, { color: themeColors.textMuted }]}
                >
                  Interval: {currentCard.interval} days • Factor:{' '}
                  {currentCard.easeFactor.toFixed(1)}
                </Text>
              </View>

              <View style={styles.cardContent}>
                <Text style={[styles.cardSide, { color: themeColors.text }]}>
                  {currentCard.front}
                </Text>

                {studyState.showAnswer && (
                  <>
                    <View
                      style={[
                        styles.divider,
                        { backgroundColor: themeColors.border },
                      ]}
                    />
                    <Text
                      style={[
                        styles.cardSide,
                        { color: themeColors.textSecondary },
                      ]}
                    >
                      {currentCard.back}
                    </Text>
                  </>
                )}
              </View>
            </GlassCard>
          </Animated.View>

          {/* Controls */}
          {!studyState.showAnswer ? (
            <Button
              title="Show Answer"
              onPress={showAnswer}
              variant="primary"
              size="large"
              theme={theme}
              style={styles.showAnswerButton}
            />
          ) : (
            <View style={styles.ratingContainer}>
              <Text style={[styles.ratingTitle, { color: themeColors.text }]}>
                How well did you recall this?
              </Text>

              <View style={styles.ratingButtons}>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <TouchableOpacity
                    key={rating}
                    onPress={() => rateCard(rating as 1 | 2 | 3 | 4 | 5)}
                    style={[
                      styles.ratingButton,
                      {
                        backgroundColor: getRatingColor(rating),
                        borderColor: getRatingColor(rating),
                      },
                    ]}
                  >
                    <Text style={styles.ratingButtonText}>{rating}</Text>
                    <Text style={[styles.ratingLabel, { color: '#FFFFFF' }]}>
                      {getRatingLabel(rating)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

<Text
                style={[styles.ratingHint, { color: themeColors.textMuted }]}
              >
                Your rating optimizes the FSRS algorithm for maximum retention
              </Text>
            </View>
          )}
        </ScrollView>

        <HamburgerMenu
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          onNavigate={onNavigate}
          currentScreen="flashcards"
          theme={theme}
        />
      </ScreenContainer>
    );
  }

  // Main Flashcards View
  return (
    <ScreenContainer theme={theme}>
      <AppHeader
        title="FSRS Flashcards"
        theme={theme}
        onMenuPress={() => setMenuVisible(true)}
        rightComponent={
          <TouchableOpacity onPress={() => setCreateModalVisible(true)}>
            <Text style={{ color: themeColors.primary, fontSize: 24 }}>+</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.container}
      >
        {/* Study Status */}
        <GlassCard theme={theme} style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Text
                style={[styles.statusValue, { color: themeColors.primary }]}
              >
                {dueCards.length}
              </Text>
              <Text style={[styles.statusLabel, { color: themeColors.text }]}>
                Due Cards
              </Text>
            </View>

            <View style={styles.statusItem}>
              <Text
                style={[styles.statusValue, { color: themeColors.success }]}
              >
                {flashcards.length}
              </Text>
              <Text style={[styles.statusLabel, { color: themeColors.text }]}>
                Total Cards
              </Text>
            </View>

            <View style={styles.statusItem}>
              <Text
                style={[
                  styles.statusValue,
                  {
                    color:
                      studyState.cognitiveLoad > 1.5
                        ? themeColors.warning
                        : themeColors.success,
                  },
                ]}
              >
                {studyState.cognitiveLoad.toFixed(1)}
              </Text>
              <Text style={[styles.statusLabel, { color: themeColors.text }]}>
                Cog. Load
              </Text>
            </View>
          </View>

          {dueCards.length > 0 && (
            <Button
              title={`Start Session (${srs.getOptimalSessionSize(
                studyState.cognitiveLoad,
                dueCards.length,
              )} cards)`}
              onPress={startStudySession}
              variant="primary"
              size="large"
              theme={theme}
              style={styles.startButton}
            />
          )}
        </GlassCard>

        {/* At Risk Cards */}
        {srs.getAtRiskCards(flashcards).length > 0 && (
          <GlassCard theme={theme} style={styles.warningCard}>
            <Text style={[styles.warningTitle, { color: themeColors.warning }]}>
              ⚠️ Cards At Risk
            </Text>
            <Text
              style={[styles.warningText, { color: themeColors.textSecondary }]}
            >
              {srs.getAtRiskCards(flashcards).length} cards are predicted to be
              forgotten soon.The FSRS algorithm recommends reviewing them
              early.
            </Text>
          </GlassCard>
        )}

        {/* Cards List */}
        <View style={styles.cardsSection}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            All Cards ({flashcards.length})
          </Text>

          {flashcards.length === 0 ? (
            <GlassCard theme={theme} style={styles.emptyCard}>
              <Text
                style={[styles.emptyText, { color: themeColors.textSecondary }]}
              >
                No flashcards yet. Create your first card to start learning with
                the scientifically-proven FSRS algorithm.
              </Text>
            </GlassCard>
          ) : (
            flashcards.map((card) => {
              const isDue = srs.isCardDue(card);
              const isAtRisk = srs.getAtRiskCards([card]).length > 0;

              return (
                <GlassCard
                  key={card.id}
                  theme={theme}
                  style={[
                    styles.cardItem,
                    isDue && {
                      borderColor: themeColors.primary,
                      borderWidth: 1,
                    },
                    isAtRisk && {
                      borderColor: themeColors.warning,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <View style={styles.cardItemHeader}>
                    <View style={styles.cardItemInfo}>
                      <Text
                        style={[
                          styles.cardItemCategory,
                          { color: themeColors.primary },
                        ]}
                      >
                        {card.category.toUpperCase()}
                      </Text>
                      <Text
                        style={[
                          styles.cardItemFront,
                          { color: themeColors.text },
                        ]}
                      >
                        {card.front}
                      </Text>
                    </View>

                    <View style={styles.cardItemActions}>
                      <TouchableOpacity
                        onPress={() => openEditModal(card)}
                        style={[
                          styles.actionButton,
                          { backgroundColor: themeColors.primary },
                        ]}
                      >
                        <Text style={styles.actionButtonText}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => deleteFlashcard(card.id)}
                        style={[
                          styles.actionButton,
                          { backgroundColor: themeColors.error },
                        ]}
                      >
                        <Text style={styles.actionButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

<Text
                    style={[
                      styles.cardItemBack,
                      { color: themeColors.textSecondary },
                    ]}
                  >
                    {card.back}
                  </Text>

                  <View style={styles.cardItemFooter}>
                    <Text
                      style={[
                        styles.cardItemMeta,
                        { color: themeColors.textMuted },
                      ]}
                    >
                      Next: {card.nextReview.toLocaleDateString()} •Interval:{' '}
                      {card.interval}d •Factor: {card.easeFactor.toFixed(1)}
                    </Text>

{isDue && (
                      <Text
                        style={[
                          styles.dueLabel,
                          { color: themeColors.primary },
                        ]}
                      >
                        DUE
  </Text>
                    )}

                    {isAtRisk && !isDue && (
                      <Text
                        style={[
                          styles.riskLabel,
                          { color: themeColors.warning },
                        ]}
                      >
                        AT RISK
                      </Text>
                    )}
                  </View>
                </GlassCard>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Create Card Modal */}
      <Modal
        visible={createModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassCard theme={theme} style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              Create New Flashcard
            </Text>

            <View style={styles.formGroup}>
              <Text
                style={[styles.formLabel, { color: themeColors.textSecondary }]}
              >
                Front (Question/Prompt)
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    borderColor: themeColors.border,
                    color: themeColors.text,
                    backgroundColor: themeColors.surfaceLight,
                  },
                ]}
                placeholder="Enter the question or prompt..."
                placeholderTextColor={themeColors.textMuted}
                value={formData.front}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, front: text }))
                }
                multiline
              />
            </View>

            <View style={styles.formGroup}>
              <Text
                style={[styles.formLabel, { color: themeColors.textSecondary }]}
              >
                Back (Answer/Definition)
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    borderColor: themeColors.border,
                    color: themeColors.text,
                    backgroundColor: themeColors.surfaceLight,
                  },
                ]}
                placeholder="Enter the answer or definition..."
                placeholderTextColor={themeColors.textMuted}
                value={formData.back}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, back: text }))
                }
                multiline
              />
            </View>

            <View style={styles.formGroup}>
              <Text
                style={[styles.formLabel, { color: themeColors.textSecondary }]}
              >
                Category
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    borderColor: themeColors.border,
                    color: themeColors.text,
                    backgroundColor: themeColors.surfaceLight,
                  },
                ]}
                placeholder="e.g., vocabulary, concepts, formulas..."
                placeholderTextColor={themeColors.textMuted}
                value={formData.category}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, category: text }))
                }
              />
</View>

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => {
                  setCreateModalVisible(false);
                  setFormData({ front: '', back: '', category: 'general' });
                }}
                variant="ghost"
                theme={theme}
                style={styles.modalButton}
              />

              <Button
                title="Create Card"
                onPress={createFlashcard}
                variant="primary"
                theme={theme}
                style={styles.modalButton}
              />
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* Edit Card Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassCard theme={theme} style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              Edit Flashcard
            </Text>

            <View style={styles.formGroup}>
              <Text
                style={[styles.formLabel, { color: themeColors.textSecondary }]}
              >
                Front (Question/Prompt)
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    borderColor: themeColors.border,
                    color: themeColors.text,
                    backgroundColor: themeColors.surfaceLight,
                  },
                ]}
                placeholder="Enter the question or prompt..."
                placeholderTextColor={themeColors.textMuted}
                value={formData.front}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, front: text }))
                }
                multiline
              />
            </View>

            <View style={styles.formGroup}>
              <Text
                style={[styles.formLabel, { color: themeColors.textSecondary }]}
              >
                Back (Answer/Definition)
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    borderColor: themeColors.border,
                    color: themeColors.text,
                    backgroundColor: themeColors.surfaceLight,
                  },
                ]}
                placeholder="Enter the answer or definition..."
                placeholderTextColor={themeColors.textMuted}
                value={formData.back}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, back: text }))
                }
                multiline
              />
            </View>

            <View style={styles.formGroup}>
              <Text
                style={[styles.formLabel, { color: themeColors.textSecondary }]}
              >
                Category
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    borderColor: themeColors.border,
                    color: themeColors.text,
                    backgroundColor: themeColors.surfaceLight,
                  },
                ]}
                placeholder="e.g., vocabulary, concepts, formulas..."
                placeholderTextColor={themeColors.textMuted}
                value={formData.category}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, category: text }))
                }
              />
</View>

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => {
                  setEditModalVisible(false);
                  setEditingCard(null);
                  setFormData({ front: '', back: '', category: 'general' });
                }}
                variant="ghost"
                theme={theme}
                style={styles.modalButton}
              />

              <Button
                title="Update Card"
                onPress={updateFlashcard}
                variant="primary"
                theme={theme}
                style={styles.modalButton}
              />
            </View>
          </GlassCard>
        </View>
      </Modal>

      <HamburgerMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={onNavigate}
        currentScreen="flashcards"
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
    paddingBottom: spacing.xl,
  },
  studyContainer: {
    paddingTop: 100,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
  },

  // Study Session Styles
  progressContainer: {
    width: '100%',
    marginBottom: spacing.lg,
    alignItems: 'center',
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
  },
  cognitiveLoadCard: {
    width: '100%',
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  cognitiveLoadText: {
    ...typography.caption,
    textAlign: 'center',
  },
  cardContainer: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  studyCard: {
    minHeight: 300,
  },
  cardHeader: {
    marginBottom: spacing.lg,
  },
  cardCategory: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  cardMeta: {
    ...typography.caption,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  cardSide: {
    ...typography.h4,
    textAlign: 'center',
    lineHeight: 28,
  },
  divider: {
    height: 1,
    marginVertical: spacing.xl,
  },
  showAnswerButton: {
    width: '100%',
  },
  ratingContainer: {
    width: '100%',
    alignItems: 'center',
  },
  ratingTitle: {
    ...typography.h4,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  ratingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.lg,
  },
  ratingButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
  },
  ratingButtonText: {
    color: '#FFFFFF',
    ...typography.h4,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  ratingLabel: {
    ...typography.caption,
    fontWeight: '600',
  },
  ratingHint: {
    ...typography.caption,
    textAlign: 'center',
  },

  // Main View Styles
  statusCard: {
    marginBottom: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusValue: {
    ...typography.h2,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  statusLabel: {
    ...typography.bodySmall,
  },
  startButton: {
    width: '100%',
  },
  warningCard: {
    marginBottom: spacing.lg,
  },
  warningTitle: {
    ...typography.h4,
    marginBottom: spacing.sm,
  },
  warningText: {
    ...typography.body,
    lineHeight: 22,
  },
  cardsSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.lg,
  },
  emptyCard: {
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  cardItem: {
    marginBottom: spacing.md,
  },
  cardItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  cardItemInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  cardItemCategory: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  cardItemFront: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  cardItemBack: {
    ...typography.bodySmall,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  cardItemActions: {
    flexDirection: 'row',
  },
  actionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  actionButtonText: {
    color: '#FFFFFF',
    ...typography.caption,
    fontWeight: '600',
  },
  cardItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardItemMeta: {
    ...typography.caption,
    flex: 1,
  },
  dueLabel: {
    ...typography.caption,
    fontWeight: 'bold',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  riskLabel: {
    ...typography.caption,
    fontWeight: 'bold',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
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
    marginBottom: spacing.xl,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    ...typography.bodySmall,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  formInput: {
    borderWidth: 2,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
    ...typography.body,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 0.48,
  },
});

