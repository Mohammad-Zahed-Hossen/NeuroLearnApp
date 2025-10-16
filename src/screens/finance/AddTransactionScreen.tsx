import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Text as RNText } from 'react-native';

const AnimatedText = Animated.createAnimatedComponent(RNText);
import * as Haptics from 'expo-haptics';
import { GlassCard } from '../../components/GlassComponents';
import { supabase } from '../../services/storage/SupabaseService';
import TrieService from '../../utils/TrieService';
import { perf } from '../../utils/perfMarks';
import { colors, ThemeType } from '../../theme/colors';

const categories = [
  { id: 'food', name: 'Food', icon: 'food', color: '#F59E0B' },
  { id: 'transport', name: 'Transport', icon: 'car', color: '#10B981' },
  { id: 'education', name: 'Education', icon: 'school', color: '#8B5CF6' },
  { id: 'health', name: 'Health', icon: 'medical-bag', color: '#EF4444' },
  { id: 'entertainment', name: 'Fun', icon: 'movie', color: '#06B6D4' },
  { id: 'shopping', name: 'Shopping', icon: 'shopping', color: '#EC4899' },
  { id: 'income', name: 'Income', icon: 'cash-plus', color: '#10B981' },
];

interface AddTransactionScreenProps {
  onBack?: () => void;
  theme?: ThemeType;
}

const CategoryButton = ({
  category,
  isSelected,
  onPress,
  theme = 'dark',
}: {
  category: any;
  isSelected: boolean;
  onPress: () => void;
  theme?: ThemeType;
}) => {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.9, {}, () => {
      scale.value = withSpring(1);
    });
    rotate.value = withSpring(-5, {}, () => {
      rotate.value = withSpring(5, {}, () => {
        rotate.value = withSpring(0);
      });
    });
    onPress();
  };

  return (
    <Animated.View
      style={[
        animatedStyle,
        { width: '30%', marginRight: 8, marginBottom: 12 },
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        style={{
          padding: 12,
          borderRadius: 12,
          borderWidth: 2,
          borderColor: isSelected ? '#6366F1' : '#E5E7EB',
          shadowColor: isSelected ? '#6366F1' : 'transparent',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isSelected ? 0.5 : 0,
          shadowRadius: isSelected ? 4 : 0,
          alignItems: 'center',
          backgroundColor: isSelected
            ? 'rgba(99, 102, 241, 0.1)'
            : 'transparent',
          transform: isSelected ? [{ scale: 1.05 }] : [{ scale: 1 }],
        }}
      >
        <Icon name={category.icon} size={24} color={category.color} />
        <Text style={{ fontSize: 12, marginTop: 4, color: colors[theme].text }}>
          {category.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const AddTransactionScreen: React.FC<AddTransactionScreenProps> = ({
  onBack,
  theme = 'dark',
}) => {
  const mountMarkRef = React.useRef<string | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [transactionType, setTransactionType] = useState('expense');
  const [loading, setLoading] = useState(false);

  // Smart input features
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // UI Enhancements
  const [showNumpad, setShowNumpad] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const trieService = TrieService.getInstance();

  useEffect(() => {
    mountMarkRef.current = perf.startMark('AddTransactionScreen');
    if (description.length >= 2) {
      const newSuggestions = trieService.getSuggestions(description, 5);
      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [description]);

  useEffect(() => {
    if (!loading && mountMarkRef.current) {
      try {
        perf.measureReady('AddTransactionScreen', mountMarkRef.current);
      } catch (e) {}
      mountMarkRef.current = null;
    }
  }, [loading]);

  // Animated styles for currency symbol
  const currencyScale = useSharedValue(1);
  const animatedCurrency = useAnimatedStyle(() => ({
    transform: [{ scale: currencyScale.value }],
  }));

  useEffect(() => {
    if (amount) {
      currencyScale.value = withSpring(1.2);
    } else {
      currencyScale.value = withSpring(1);
    }
  }, [amount]);

  const handleSave = async () => {
    if (!amount || !selectedCategory) {
      Alert.alert('Error', 'Please fill required fields');
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const transactionData = {
        user_id: user.id,
        amount: parseFloat(amount),
        category: selectedCategory.id,
        description: description || selectedCategory.name,
        type: transactionType,
        date: new Date().toISOString().split('T')[0],
      };

      const { error } = await supabase
        .from('transactions')
        .insert(transactionData);
      if (error) throw error;

      // Update Trie with new transaction
      await trieService.updateWithTransaction(
        transactionData.description,
        transactionData.category,
        transactionData.amount,
      );

      // Show success feedback
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onBack?.();
      }, 2000);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={colors[theme].gradientBackground}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 48,
            paddingBottom: 10,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 24,
            }}
          >
            <TouchableOpacity
              onPress={() => onBack?.()}
              style={{ marginRight: 16 }}
            >
              <Icon name="arrow-left" size={24} color={colors[theme].text} />
            </TouchableOpacity>
            <Text
              style={{ fontSize: 24, fontWeight: 'bold', color: colors[theme].text }}
            >
              Add Transaction
            </Text>
          </View>

          <GlassCard theme={theme} style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: colors[theme].text,
                marginBottom: 16,
              }}
            >
              Type
            </Text>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                onPress={() => setTransactionType('expense')}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor:
                    transactionType === 'expense' ? '#EF4444' : '#E5E7EB',
                  backgroundColor:
                    transactionType === 'expense' ? '#FEF2F2' : 'transparent',
                  marginRight: 16,
                }}
              >
                <Text
                  style={{
                    textAlign: 'center',
                    fontWeight: '500',
                    color: colors[theme].text,
                  }}
                >
                  Expense
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTransactionType('income')}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor:
                    transactionType === 'income' ? '#10B981' : '#E5E7EB',
                  backgroundColor:
                    transactionType === 'income' ? '#F0FDF4' : 'transparent',
                }}
              >
                <Text
                  style={{
                    textAlign: 'center',
                    fontWeight: '500',
                    color: colors[theme].text,
                  }}
                >
                  Income
                </Text>
              </TouchableOpacity>
            </View>
          </GlassCard>

          <GlassCard theme={theme} style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: colors[theme].text,
                marginBottom: 16,
              }}
            >
              Amount
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AnimatedText
                style={{
                  fontSize: 24,
                  fontWeight: 'bold',
                  marginRight: 8,
                  color: colors[theme].text,
                  ...animatedCurrency,
                }}
              >
                ৳
              </AnimatedText>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                onFocus={() => setShowNumpad(true)}
                placeholder="0.00"
                placeholderTextColor={colors[theme].textSecondary + '80'}
                keyboardType="numeric"
                style={{
                  flex: 1,
                  fontSize: 24,
                  fontWeight: 'bold',
                  color: colors[theme].text,
                }}
                showSoftInputOnFocus={false}
              />
            </View>
          </GlassCard>

          <GlassCard theme={theme} style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: colors[theme].text,
                marginBottom: 16,
              }}
            >
              Category
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {categories
                .filter((cat) =>
                  transactionType === 'income'
                    ? cat.id === 'income'
                    : cat.id !== 'income',
                )
                .map((category) => (
                  <CategoryButton
                    key={category.id}
                    category={category}
                    isSelected={selectedCategory?.id === category.id}
                    theme={theme}
                    onPress={() => {
                      setSelectedCategory(category);
                      Haptics.selectionAsync();
                    }}
                  />
                ))}
            </View>
          </GlassCard>

          <GlassCard theme={theme} style={{ marginBottom: 32 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: colors[theme].text,
                marginBottom: 16,
              }}
            >
              Description
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Add note..."
              placeholderTextColor={colors[theme].textSecondary + '80'}
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 12,
                padding: 16,
                color: colors[theme].text,
              }}
            />

            {/* Smart Suggestions */}
            {showSuggestions && (
              <View style={{ marginTop: 8 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {suggestions.map((suggestion, index) => (
                    <View key={index}>
                      <TouchableOpacity
                        onPress={() => {
                          setDescription(suggestion.text);
                          if (suggestion.category) {
                            const category = categories.find(
                              (c) => c.id === suggestion.category,
                            );
                            if (category) setSelectedCategory(category);
                          }
                          setShowSuggestions(false);
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light,
                          );
                        }}
                        style={{
                          backgroundColor: 'rgba(99, 102, 241, 0.1)',
                          borderRadius: 20,
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          marginRight: 8,
                          borderWidth: 1,
                          borderColor: 'rgba(99, 102, 241, 0.3)',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            color: '#6366F1',
                            fontWeight: '500',
                          }}
                        >
                          {suggestion.text}
                        </Text>
                        {suggestion.category && (
                          <View
                            style={{
                              marginTop: 4,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 8,
                              backgroundColor:
                                (categories.find(
                                  (c) => c.id === suggestion.category,
                                )?.color || '#6366F1') + '20',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '600',
                                color: colors[theme].text,
                              }}
                            >
                              {
                                categories.find(
                                  (c) => c.id === suggestion.category,
                                )?.name
                              }
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </GlassCard>

          <TouchableOpacity
            onPress={handleSave}
            disabled={loading || !amount || !selectedCategory}
            style={{
              paddingVertical: 16,
              borderRadius: 12,
              marginBottom: 32,
              backgroundColor:
                loading || !amount || !selectedCategory ? '#D1D5DB' : '#6366F1',
            }}
          >
            <Text
              style={{
                textAlign: 'center',
                color: 'white',
                fontWeight: '600',
                fontSize: 18,
              }}
            >
              {loading ? 'Saving...' : 'Save Transaction'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {/* Custom Calculator Numpad Modal */}
      <Modal
        visible={showNumpad}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNumpad(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
          activeOpacity={1}
          onPressOut={() => setShowNumpad(false)}
        >
          <View
            style={{
              backgroundColor: '#fff',
              padding: 18,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              minHeight: 300,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              {['50', '100', '500', '1000'].map((val) => (
                <TouchableOpacity
                  key={val}
                  onPress={() => {
                    const newAmount =
                      (parseFloat(amount) || 0) + parseFloat(val);
                    setAmount(newAmount.toString());
                    Haptics.selectionAsync();
                  }}
                  style={{
                    backgroundColor: '#6366F1',
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    borderRadius: 12,
                  }}
                >
                  <Text
                    style={{ color: 'white', fontWeight: '600', fontSize: 16 }}
                  >
                    ₹{val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map(
                (key) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => {
                      if (key === '⌫') {
                        setAmount((prev) => prev.slice(0, -1));
                      } else {
                        setAmount((prev) => prev + key);
                      }
                      Haptics.selectionAsync();
                    }}
                    style={{
                      width: Dimensions.get('window').width / 4 - 24,
                      height: 60,
                      margin: 8,
                      backgroundColor: '#E0E7FF',
                      borderRadius: 12,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 24, fontWeight: '600' }}>
                      {key}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>

            <TouchableOpacity
              onPress={() => setShowNumpad(false)}
              style={{
                marginTop: 16,
                backgroundColor: '#6366F1',
                paddingVertical: 14,
                borderRadius: 12,
              }}
            >
              <Text
                style={{
                  color: 'white',
                  fontWeight: '600',
                  fontSize: 18,
                  textAlign: 'center',
                }}
              >
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Success Feedback Modal */}
      {showSuccess && (
        <View style={StyleSheet.absoluteFill}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.7)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                backgroundColor: '#10B981',
                padding: 32,
                borderRadius: 20,
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
              }}
            >
              <Icon name="check-circle" size={80} color="white" />
              <Text
                style={{
                  color: 'white',
                  fontSize: 24,
                  fontWeight: 'bold',
                  marginTop: 16,
                }}
              >
                Transaction Added!
              </Text>
              <Text
                style={{
                  color: 'white',
                  fontSize: 16,
                  marginTop: 8,
                  textAlign: 'center',
                }}
              >
                Your transaction has been saved successfully.
              </Text>
            </View>
          </View>
        </View>
      )}
    </LinearGradient>
  );
};

export default AddTransactionScreen;
