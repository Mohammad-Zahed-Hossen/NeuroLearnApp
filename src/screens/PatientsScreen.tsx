import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { GlassCard } from '../components/GlassComponents';

interface PatientsScreenProps {
  onBack?: () => void;
}

const PatientsScreen: React.FC<PatientsScreenProps> = ({ onBack }) => {
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
              Patients
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
            <Icon name="account-group" size={24} color="#8B5CF6" />
          </View>
        </View>

        <GlassCard theme="light" style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16 }}>
            Patient Management
          </Text>
          <Text style={{ color: '#4B5563', lineHeight: 24 }}>
            This screen is for managing patient data and information.
            Functionality can be expanded based on requirements.
          </Text>
        </GlassCard>
      </ScrollView>
    </View>
  );
};

export default PatientsScreen;
