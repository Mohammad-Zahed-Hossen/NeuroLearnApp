import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { GlassCard } from '../../components/GlassComponents';
import { supabase } from '../../services/storage/SupabaseService';
import { perf } from '../../utils/perfMarks';

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  description: string;
  type: string;
  date: string;
}

interface TransactionHistoryScreenProps {
  onBack?: () => void;
}

const TransactionHistoryScreen: React.FC<TransactionHistoryScreenProps> = ({
  onBack,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const mountMarkRef = React.useRef<string | null>(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    mountMarkRef.current = perf.startMark('TransactionHistoryScreen');
    loadTransactions();
  }, [filter]);

  const loadTransactions = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('type', filter);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;

      setTransactions((data as Transaction[]) || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && mountMarkRef.current) {
      try {
        perf.measureReady('TransactionHistoryScreen', mountMarkRef.current);
      } catch (e) {}
      mountMarkRef.current = null;
    }
  }, [loading]);

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      food: 'food',
      transport: 'car',
      education: 'school',
      health: 'medical-bag',
      entertainment: 'movie',
      shopping: 'shopping',
      income: 'cash-plus',
    };
    return icons[category] || 'cash';
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <GlassCard theme="dark" style={{ marginBottom: 12 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
              backgroundColor:
                item.type === 'income' ? '#10B98120' : '#EF444420',
            }}
          >
            <Icon
              name={getCategoryIcon(item.category)}
              size={20}
              color={item.type === 'income' ? '#10B981' : '#EF4444'}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '600', color: '#111827' }}>
              {item.description || item.category}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: '#6B7280',
                textTransform: 'capitalize',
              }}
            >
              {item.category} • {new Date(item.date).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <Text
          style={{
            fontWeight: 'bold',
            fontSize: 18,
            color: item.type === 'income' ? '#10B981' : '#EF4444',
          }}
        >
          {item.type === 'income' ? '+' : '-'}৳{item.amount.toLocaleString()}
        </Text>
      </View>
    </GlassCard>
  );

  return (
    <LinearGradient
      colors={['#DBEAFE', '#FAF5FF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <View
        style={{ paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16 }}
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
            <Icon name="arrow-left" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
            Transaction History
          </Text>
        </View>

        {/* Filter Tabs */}
        <View style={{ flexDirection: 'row', marginBottom: 16 }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'expense', label: 'Expenses' },
            { key: 'income', label: 'Income' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setFilter(tab.key)}
              style={{
                flex: 1,
                paddingVertical: 12,
                marginHorizontal: 4,
                borderRadius: 12,
                backgroundColor:
                  filter === tab.key ? '#6366F1' : 'rgba(255,255,255,0.5)',
              }}
            >
              <Text
                style={{
                  textAlign: 'center',
                  fontWeight: '500',
                  color: filter === tab.key ? 'white' : '#374151',
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="loading" size={48} color="#2D3BE3" />
          <Text style={{ color: '#6B7280', marginTop: 16 }}>
            Loading transactions...
          </Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <GlassCard theme="dark">
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Icon name="receipt-outline" size={48} color="#9CA3AF" />
                <Text
                  style={{
                    color: '#9CA3AF',
                    marginTop: 16,
                    textAlign: 'center',
                  }}
                >
                  No transactions found. Start by adding your first transaction.
                </Text>
              </View>
            </GlassCard>
          }
        />
      )}
    </LinearGradient>
  );
};

export default TransactionHistoryScreen;
