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

interface AIAssistantScreenProps {
  onBack?: () => void;
}

const AIAssistantScreen: React.FC<AIAssistantScreenProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState('');
  const [insights, setInsights] = useState<string[]>([]);

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
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    'How is my spending this month?',
    'What are my health trends?',
    'Give me financial advice',
    'How can I improve my sleep?',
  ];

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

        {/* Quick Questions */}
        <GlassCard theme="light" style={{ marginBottom: 24 }}>
          <Text style={{ marginBottom: 16, fontSize: 18, fontWeight: '600' }}>
            Quick Questions
          </Text>
          <View>
            {quickQuestions.map((q, index) => (
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
            ))}
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
