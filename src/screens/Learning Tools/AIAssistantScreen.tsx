import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { GlassCard } from '../../components/GlassComponents';
import AIInsightsService from '../../services/ai/AIInsightsService';
import { supabase } from '../../services/storage/SupabaseService';
import { StorageService } from '../../services/storage/StorageService';
import useAuraStore from '../../store/useAuraStore';

interface AIAssistantScreenProps {
  onBack?: () => void;
}

const AIAssistantScreen: React.FC<AIAssistantScreenProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState('');
  const [insights, setInsights] = useState<string[]>([]);
  const [quickQuestions, setQuickQuestions] = useState<string[]>([]);
  const { currentAuraState } = useAuraStore();

  const aiService = AIInsightsService.getInstance();

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const combinedInsights = await aiService.generateCombinedInsights(
        user.id,
      );
      setInsights(combinedInsights);

      // Generate dynamic questions based on user data
      const dynamicQuestions = await generateDynamicQuestions(user.id);
      setQuickQuestions(dynamicQuestions);
    } catch (error) {
      console.error('Error loading insights:', error);
      // Fallback to default questions
      setQuickQuestions([
        'How is my learning progress?',
        'What should I focus on today?',
        'How can I improve my retention?',
        'What are my cognitive patterns?',
      ]);
    } finally {
      setLoading(false);
    }
  };

  const generateDynamicQuestions = async (userId: string): Promise<string[]> => {
    try {
      const storage = StorageService.getInstance();
      const questions: string[] = [];

      // Get user data to generate contextual questions
      const flashcards = await storage.getFlashcards();
      const focusSessions = await storage.getFocusSessions();
      const contextAnalytics = await storage.getContextAnalytics(7);

      // Generate questions based on flashcard data
      if (flashcards.length > 0) {
        const dueCards = flashcards.filter(card =>
          card.nextReview && new Date(card.nextReview) <= new Date()
        );
        if (dueCards.length > 0) {
          questions.push(`I have ${dueCards.length} cards due - what's my review strategy?`);
        }

        const difficultCards = flashcards.filter(card => card.difficulty && card.difficulty > 0.7);
        if (difficultCards.length > 0) {
          questions.push(`How can I improve my ${difficultCards.length} challenging cards?`);
        }
      }

      // Generate questions based on focus sessions
      if (focusSessions.length > 0) {
        const recentSessions = focusSessions.slice(-7);
        const avgFocus = recentSessions.reduce((sum, s) => sum + s.selfReportFocus, 0) / recentSessions.length;
        if (avgFocus < 3) {
          questions.push('My focus has been low lately - what can help?');
        }

        const avgDistractions = recentSessions.reduce((sum, s) => sum + s.distractionCount, 0) / recentSessions.length;
        if (avgDistractions > 3) {
          questions.push('How can I reduce my distractions during study?');
        }
      }

      // Generate questions based on current aura state
      if (currentAuraState) {
        switch (currentAuraState.context) {
          case 'DeepFocus':
            questions.push('I\'m in deep focus - what challenging topic should I tackle?');
            break;
          case 'CreativeFlow':
            questions.push('I\'m feeling creative - how can I explore new connections?');
            break;
          case 'FragmentedAttention':
            questions.push('My attention is fragmented - what quick wins can I achieve?');
            break;
          case 'CognitiveOverload':
            questions.push('I\'m feeling overwhelmed - how should I recover?');
            break;
        }
      }

      // Generate questions based on context analytics
      if (contextAnalytics && contextAnalytics.optimalTimePatterns.length > 0) {
        const bestTime = contextAnalytics.optimalTimePatterns[0];
        if (bestTime) {
          questions.push(`My best learning time is ${bestTime.hour}:00 - how can I optimize it?`);
        }
      }

      // Ensure we have at least 4 questions, add defaults if needed
      const defaultQuestions = [
        'What\'s my learning progress this week?',
        'How can I improve my study efficiency?',
        'What topics need more attention?',
        'How is my cognitive performance trending?',
      ];

      while (questions.length < 4) {
        const defaultQ = defaultQuestions[questions.length];
        if (defaultQ && !questions.includes(defaultQ)) {
          questions.push(defaultQ);
        } else {
          break;
        }
      }

      return questions.slice(0, 4); // Return max 4 questions
    } catch (error) {
      console.warn('Failed to generate dynamic questions:', error);
      return [
        'How is my learning progress?',
        'What should I focus on today?',
        'How can I improve my retention?',
        'What are my cognitive patterns?',
      ];
    }
  };

  const handleQuickQuestion = (q: string) => {
    setQuestion(q);
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: 'linear-gradient(to bottom right, #FAFAFA, #E0E7FF)',
      }}
    >
      <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 48 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => onBack?.()}
              style={{ marginRight: 16 }}
            >
              <Icon name="close" size={24} color="#374151" />
            </TouchableOpacity>
            <Text
              style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}
            >
              AI Assistant
            </Text>
          </View>
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              backgroundColor: '#DDD6FE',
              borderRadius: 20,
            }}
          >
            <Icon name="robot" size={24} color="#8B5CF6" />
          </View>
        </View>

        {/* AI Insights */}
        <GlassCard theme="light" style={{ marginBottom: 24 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Icon name="lightbulb" size={24} color="#F59E0B" />
            <Text style={{ marginLeft: 8, fontSize: 18, fontWeight: '600' }}>
              Smart Insights
            </Text>
          </View>

          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Icon name="loading" size={32} color="#8B5CF6" />
              <Text style={{ marginTop: 8, color: '#6B7280' }}>
                Analyzing your data...
              </Text>
            </View>
          ) : (
            <View>
              {insights &&
                insights.map((insight, index) => (
                  <View key={index} style={{ paddingVertical: 8 }}>
                    <Text style={{ lineHeight: 24, color: '#1F2937' }}>
                      {insight}
                    </Text>
                  </View>
                ))}
            </View>
          )}
        </GlassCard>

        {/* Dynamic Quick Questions */}
        <GlassCard theme="light" style={{ marginBottom: 24 }}>
          <Text style={{ marginBottom: 16, fontSize: 18, fontWeight: '600' }}>
            Personalized Questions
          </Text>
          <View>
            {quickQuestions.length > 0 ? (
              quickQuestions.map((q, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleQuickQuestion(q)}
                  style={{
                    padding: 12,
                    backgroundColor: 'rgba(255,255,255,0.5)',
                    borderRadius: 16,
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ color: '#4B5563' }}>{q}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <Icon name="loading" size={24} color="#8B5CF6" />
                <Text style={{ marginTop: 8, color: '#6B7280' }}>
                  Generating personalized questions...
                </Text>
              </View>
            )}
          </View>
        </GlassCard>

        {/* Chat Input */}
        <GlassCard theme="light" style={{ marginBottom: 32 }}>
          <Text style={{ marginBottom: 16, fontSize: 18, fontWeight: '600' }}>
            Ask Anything
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="Type your question..."
              style={{
                flex: 1,
                padding: 16,
                backgroundColor: 'rgba(255,255,255,0.5)',
                borderRadius: 16,
              }}
              multiline
            />
            <TouchableOpacity
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                backgroundColor: '#7C3AED',
                borderRadius: 24,
              }}
              disabled={!question.trim()}
            >
              <Icon name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* AI Features */}
        <GlassCard theme="light" style={{ padding: 16 }}>
          <Text style={{ marginBottom: 16, fontSize: 18, fontWeight: '600' }}>
            AI Features
          </Text>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="chart-line" size={20} color="#10B981" />
              <Text style={{ marginLeft: 12, color: '#4B5563' }}>
                Financial trend analysis
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="heart-pulse" size={20} color="#EF4444" />
              <Text style={{ marginLeft: 12, color: '#4B5563' }}>
                Health pattern recognition
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="brain" size={20} color="#8B5CF6" />
              <Text style={{ marginLeft: 12, color: '#4B5563' }}>
                Personalized recommendations
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="target" size={20} color="#F59E0B" />
              <Text style={{ marginLeft: 12, color: '#4B5563' }}>
                Goal optimization
              </Text>
            </View>
          </View>
        </GlassCard>
      </ScrollView>
    </View>
  );
};

export default AIAssistantScreen;
