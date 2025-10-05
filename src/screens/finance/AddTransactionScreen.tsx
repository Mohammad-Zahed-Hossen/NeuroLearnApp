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
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { GlassCard } from '../../components/GlassComponents';
import { supabase } from '../../services/storage/SupabaseService';
import TrieService from '../../utils/TrieService';

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
}

const AddTransactionScreen: React.FC<AddTransactionScreenProps> = ({ onBack }) => {
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
    if (description.length >= 2) {
      const newSuggestions = trieService.getSuggestions(description, 5);
      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [description]);

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

      const { error } = await supabase.from('transactions').insert(transactionData);
      if (error) throw error;

      // Update Trie with new transaction
      await trieService.updateWithTransaction(
        transactionData.description,
        transactionData.category,
        transactionData.amount
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
      colors={['#1F2937', '#111827']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 48, paddingBottom: 10 }}
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
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' }}>
            Add Transaction
          </Text>
        </View>

        <GlassCard theme="dark" style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#FFFFFF',
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
              <Text style={{ textAlign: 'center', fontWeight: '500', color: '#FFFFFF' }}>
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
              <Text style={{ textAlign: 'center', fontWeight: '500', color: '#FFFFFF' }}>
                Income
              </Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        <GlassCard theme="dark" style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#FFFFFF',
              marginBottom: 16,
            }}
          >
            Amount
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', marginRight: 8, color: '#FFFFFF' }}>
              ৳
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              onFocus={() => setShowNumpad(true)}
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              style={{ flex: 1, fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' }}
              showSoftInputOnFocus={false}
            />
          </View>
        </GlassCard>

        <GlassCard theme="dark" style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#FFFFFF',
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
                <TouchableOpacity
                  key={category.id}
                  onPress={() => {
                    setSelectedCategory(category);
                    Haptics.selectionAsync();
                  }}
                  style={{
                    width: '30%',
                    padding: 12,
                    marginBottom: 12,
                    marginRight: 8,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor:
                      selectedCategory?.id === category.id
                        ? '#6366F1'
                        : '#E5E7EB',
                    shadowColor:
                      selectedCategory?.id === category.id ? '#6366F1' : 'transparent',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: selectedCategory?.id === category.id ? 0.5 : 0,
                    shadowRadius: selectedCategory?.id === category.id ? 4 : 0,
                    transform: selectedCategory?.id === category.id ? [{ scale: 1.05 }] : [{ scale: 1 }],
                  }}
                >
                  <View style={{ alignItems: 'center' }}>
                    <Icon
                      name={category.icon}
                      size={24}
                      color={category.color}
                    />
                    <Text style={{ fontSize: 12, marginTop: 4, color: '#FFFFFF' }}>
                      {category.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
          </View>
        </GlassCard>

        <GlassCard theme="dark" style={{ marginBottom: 32 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#FFFFFF',
              marginBottom: 16,
            }}
          >
            Description
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Add note..."
            placeholderTextColor="#9CA3AF"
            style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: 16,
              color: '#FFFFFF',
            }}
          />

          {/* Smart Suggestions */}
          {showSuggestions && (
            <View style={{ marginTop: 8 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {suggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      setDescription(suggestion.text);
                      if (suggestion.category) {
                        const category = categories.find(c => c.id === suggestion.category);
                        if (category) setSelectedCategory(category);
                      }
                      setShowSuggestions(false);
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
                    <Text style={{ fontSize: 14, color: '#6366F1', fontWeight: '500' }}>
                      {suggestion.text}
                    </Text>
                    {suggestion.category && (
                      <View style={{
                        marginTop: 4,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 8,
                        backgroundColor: categories.find(c => c.id === suggestion.category)?.color + '20'
                      }}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#FFFFFF' }}>
                          {categories.find(c => c.id === suggestion.category)?.name}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
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
                    const newAmount = (parseFloat(amount) || 0) + parseFloat(val);
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
                  <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
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
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((key) => (
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
                  <Text style={{ fontSize: 24, fontWeight: '600' }}>{key}</Text>
                </TouchableOpacity>
              ))}
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
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 18, textAlign: 'center' }}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Success Feedback Modal */}
      <Modal
        visible={showSuccess}
        animationType="fade"
        transparent
        onRequestClose={() => {}}
      >
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
            <Icon name="check-circle" size={64} color="white" />
            <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 16 }}>
              Transaction Added!
            </Text>
            <Text style={{ color: 'white', fontSize: 16, marginTop: 8, textAlign: 'center' }}>
              Your transaction has been saved successfully.
            </Text>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

export default AddTransactionScreen;
