import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Keyboard,
  Alert,
  Vibration
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BlurView } from 'expo-blur';
import Reanimated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  interpolate,
  runOnJS
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { GlassCard } from '../GlassComponents';
import { colors } from '../../theme/colors';
import { supabase } from '../../services/storage/SupabaseService';
import TrieService from '../../utils/TrieService';

interface QuickAddFABProps {
  onTransactionAdded: () => void;
  theme: 'light' | 'dark';
}

interface Suggestion {
  text: string;
  category?: string;
  frequency: number;
  score: number;
}

const QuickAddFAB: React.FC<QuickAddFABProps> = ({ onTransactionAdded, theme }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [loading, setLoading] = useState(false);
  
  // Smart input features
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const trieService = TrieService.getInstance();
  const amountInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);
  
  // Animations
  const fabScale = useSharedValue(1);
  const modalOpacity = useSharedValue(0);
  const slideUp = useSharedValue(300);

  // Enhanced categories with colors and icons
  const categories = [
    { id: 'food', name: 'Food', icon: 'food', color: '#F59E0B' },
    { id: 'transport', name: 'Transport', icon: 'car', color: '#10B981' },
    { id: 'education', name: 'Education', icon: 'school', color: '#8B5CF6' },
    { id: 'health', name: 'Health', icon: 'medical-bag', color: '#EF4444' },
    { id: 'entertainment', name: 'Fun', icon: 'movie', color: '#06B6D4' },
    { id: 'shopping', name: 'Shopping', icon: 'shopping', color: '#EC4899' },
    { id: 'income', name: 'Income', icon: 'cash-plus', color: '#10B981' },
  ];

  useEffect(() => {
    if (description.length >= 2) {
      const newSuggestions = trieService.getSuggestions(description, 5);
      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [description]);

  const openModal = () => {
    setIsVisible(true);
    modalOpacity.value = withTiming(1, { duration: 300 });
    slideUp.value = withSpring(0, { damping: 20, stiffness: 300 });
    
    // Focus on amount input after animation
    setTimeout(() => {
      amountInputRef.current?.focus();
    }, 350);
  };

  const closeModal = () => {
    modalOpacity.value = withTiming(0, { duration: 200 });
    slideUp.value = withTiming(300, { duration: 200 });
    
    setTimeout(() => {
      setIsVisible(false);
      resetForm();
    }, 200);
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setSelectedCategory('');
    setTransactionType('expense');
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedDate(new Date());
  };

  const handleSuggestionSelect = (suggestion: Suggestion) => {
    setDescription(suggestion.text);
    if (suggestion.category) {
      setSelectedCategory(suggestion.category);
    }
    setShowSuggestions(false);
    Vibration.vibrate(50); // Haptic feedback
  };

  const formatAmount = (text: string): string => {
    // Remove non-numeric characters except decimal
    const cleaned = text.replace(/[^0-9.]/g, '');
    
    // Handle decimal places
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts + '.' + parts;
    }
    
    // Limit decimal places to 2
    // Limit decimal places to 2
if (parts && parts.length > 2) {
    const firstTwoParts = parts.slice(0, 2);
    return parts.join('.') + '.' + firstTwoParts.join('');
  }
    
    return cleaned;
  };

  const handleAmountChange = (text: string) => {
    const formatted = formatAmount(text);
    setAmount(formatted);
  };

  const validateForm = (): boolean => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return false;
    }
    
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return false;
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const transactionData = {
        user_id: user.id,
        amount: parseFloat(amount),
        category: selectedCategory,
        description: description || categories.find(c => c.id === selectedCategory)?.name || 'Transaction',
        type: transactionType,
        // Store as YYYY-MM-DD for DATE columns
        date: selectedDate.toISOString().split('T')[0],
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('transactions').insert(transactionData);
      if (error) throw error;

      // Update Trie with new transaction
      await trieService.updateWithTransaction(
        transactionData.description,
        transactionData.category,
        transactionData.amount
      );

      // Success feedback
      Vibration.vibrate([100, 50, 100]);
      Alert.alert(
        'Success! 💰',
        `${transactionType === 'income' ? 'Income' : 'Expense'} of ৳${parseFloat(amount).toLocaleString()} added successfully.`,
        [{ text: 'Great!', style: 'default' }]
      );
      
      onTransactionAdded();
      closeModal();
      
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Gesture for FAB press
  const fabGesture = Gesture.Tap()
    .onBegin(() => {
      fabScale.value = withSpring(0.95);
    })
    .onFinalize(() => {
      fabScale.value = withSpring(1);
      runOnJS(openModal)();
    });

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }]
  }));

  const modalStyle = useAnimatedStyle(() => ({
    opacity: modalOpacity.value
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideUp.value }]
  }));

  return (
    <>
      {/* Floating Action Button */}
      <GestureDetector gesture={fabGesture}>
        <Reanimated.View style={[styles.fab, fabStyle]}>
          <BlurView intensity={20} style={styles.fabBlur}>
            <Icon name="plus" size={24} color="#FFFFFF" />
          </BlurView>
        </Reanimated.View>
      </GestureDetector>

      {/* Quick Add Modal */}
      <Modal
        visible={isVisible}
        transparent
        animationType="none"
        statusBarTranslucent
      >
        <Reanimated.View style={[styles.modalOverlay, modalStyle]}>
          <BlurView intensity={20} style={styles.modalBlur}>
            <TouchableOpacity 
              style={styles.modalBackground} 
              activeOpacity={1}
              onPress={closeModal}
            />
            
            <Reanimated.View style={[styles.modalContent, contentStyle]}>
              <GlassCard style={styles.card} theme={theme}>
                {/* Header */}
                <View style={styles.header}>
                  <Text style={styles.headerTitle}>Quick Add Transaction</Text>
                  <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                    <Icon name="close" size={24} color={colors[theme].text} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Transaction Type */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Type</Text>
                    <View style={styles.typeButtons}>
                      <TouchableOpacity
                        style={[
                          styles.typeButton,
                          transactionType === 'expense' && styles.typeButtonSelected,
                          { borderColor: '#EF4444' }
                        ]}
                        onPress={() => setTransactionType('expense')}
                      >
                        <Icon name="minus" size={20} color="#EF4444" />
                        <Text style={[styles.typeButtonText, { color: '#EF4444' }]}>
                          Expense
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[
                          styles.typeButton,
                          transactionType === 'income' && styles.typeButtonSelected,
                          { borderColor: '#10B981' }
                        ]}
                        onPress={() => setTransactionType('income')}
                      >
                        <Icon name="plus" size={20} color="#10B981" />
                        <Text style={[styles.typeButtonText, { color: '#10B981' }]}>
                          Income
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Smart Amount Input */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Amount</Text>
                    <View style={styles.amountContainer}>
                      <Text style={styles.currencySymbol}>৳</Text>
                      <TextInput
                        ref={amountInputRef}
                        style={styles.amountInput}
                        value={amount}
                        onChangeText={handleAmountChange}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor={colors[theme].textSecondary}
                        returnKeyType="next"
                        onSubmitEditing={() => descriptionInputRef.current?.focus()}
                      />
                    </View>
                  </View>

                  {/* Smart Description Input */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Description</Text>
                    <TextInput
                      ref={descriptionInputRef}
                      style={styles.descriptionInput}
                      value={description}
                      onChangeText={setDescription}
                      placeholder="What did you spend on?"
                      placeholderTextColor={colors[theme].textSecondary}
                      returnKeyType="done"
                      onSubmitEditing={() => Keyboard.dismiss()}
                    />
                    
                    {/* Smart Suggestions */}
                    {showSuggestions && (
                      <View style={styles.suggestionsContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {suggestions.map((suggestion, index) => (
                            <TouchableOpacity
                              key={index}
                              style={styles.suggestionChip}
                              onPress={() => handleSuggestionSelect(suggestion)}
                            >
                              <Text style={styles.suggestionText}>
                                {suggestion.text}
                              </Text>
                              {suggestion.category && (
                                <View style={[
                                  styles.suggestionCategory,
                                  { backgroundColor: categories.find(c => c.id === suggestion.category)?.color + '20' }
                                ]}>
                                  <Text style={styles.suggestionCategoryText}>
                                    {categories.find(c => c.id === suggestion.category)?.name}
                                  </Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Enhanced Category Selection */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Category</Text>
                    <View style={styles.categoriesGrid}>
                      {categories
                        .filter(cat => 
                          transactionType === 'income' 
                            ? cat.id === 'income' 
                            : cat.id !== 'income'
                        )
                        .map((category) => (
                        <TouchableOpacity
                          key={category.id}
                          style={[
                            styles.categoryButton,
                            selectedCategory === category.id && styles.categoryButtonSelected,
                            { borderColor: category.color }
                          ]}
                          onPress={() => setSelectedCategory(category.id)}
                        >
                          <Icon 
                            name={category.icon} 
                            size={20} 
                            color={selectedCategory === category.id ? '#FFFFFF' : category.color} 
                          />
                          <Text style={[
                            styles.categoryButtonText,
                            { color: selectedCategory === category.id ? '#FFFFFF' : category.color }
                          ]}>
                            {category.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Save Button */}
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      (!amount || !selectedCategory || loading) && styles.saveButtonDisabled
                    ]}
                    onPress={handleSave}
                    disabled={!amount || !selectedCategory || loading}
                  >
                    <Text style={styles.saveButtonText}>
                      {loading ? 'Saving...' : '💰 Add Transaction'}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </GlassCard>
            </Reanimated.View>
          </BlurView>
        </Reanimated.View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabBlur: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
  },
  modalBlur: {
    flex: 1,
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '90%',
  },
  card: {
    margin: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    maxHeight: 600,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    gap: 8,
  },
  typeButtonSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366F1',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    paddingVertical: 16,
  },
  descriptionInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  suggestionsContainer: {
    marginTop: 8,
  },
  suggestionChip: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  suggestionText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
  },
  suggestionCategory: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  suggestionCategoryText: {
    fontSize: 10,
    fontWeight: '600',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    gap: 6,
    minWidth: 90,
  },
  categoryButtonSelected: {
    backgroundColor: '#6366F1',
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#6366F1',
    borderRadius: 16,
    paddingVertical: 18,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default QuickAddFAB;
