import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { GlassCard } from '../../components/GlassComponents';
import { colors } from '../../theme/colors';

interface MenuItem {
  id: string;
  title: string;
  icon: string;
  screen?: string;
  action?: string;
}

interface ProfileScreenProps {
  onNavigate?: (screen: string) => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onNavigate }) => {
  const theme = 'light'; // Assuming light theme, can be made dynamic
  const themeColors = colors[theme];

  const menuItems: MenuItem[] = [
    { id: 'settings', title: 'Settings', icon: 'cog', screen: 'Settings' },
    { id: 'ai', title: 'AI Assistant', icon: 'robot', screen: 'AIAssistant' },
    { id: 'export', title: 'Export Data', icon: 'download', action: 'export' },
    {
      id: 'help',
      title: 'Help & Support',
      icon: 'help-circle',
      action: 'help',
    },
  ];

  const handleMenuPress = (item: MenuItem) => {
    if (item.screen) {
      onNavigate?.(item.screen);
    }
  };

  return (
    <LinearGradient
      colors={['#FAFAFA', '#F3F4F6']} // Approximate purple-50 to pink-50 gradient
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Profile</Text>

        <GlassCard theme={theme} style={styles.card}>
          <View style={styles.profileSection}>
            <View style={styles.avatar}>
              <Icon name="account" size={40} color="#2D3BE3" />
            </View>
            <Text style={styles.userName}>NeuroLearn User</Text>
            <Text style={styles.userDesc}>Learning enthusiast</Text>
          </View>
        </GlassCard>

        <GlassCard theme={theme} style={styles.card}>
          <Text style={styles.statsTitle}>Quick Stats</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: themeColors.primary }]}>
                15
              </Text>
              <Text style={styles.statLabel}>Study Sessions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#16A34A' }]}>7</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#9333EA' }]}>3</Text>
              <Text style={styles.statLabel}>Level</Text>
            </View>
          </View>
        </GlassCard>

        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => handleMenuPress(item)}
            style={styles.menuItem}
          >
            <GlassCard theme={theme}>
              <View style={styles.menuContent}>
                <View style={styles.menuLeft}>
                  <Icon name={item.icon} size={24} color="#6B7280" />
                  <Text style={styles.menuText}>{item.title}</Text>
                </View>
                <Icon name="chevron-right" size={24} color="#9CA3AF" />
              </View>
            </GlassCard>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </LinearGradient>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 48,
  },
  title: {
    marginBottom: 32,
    fontSize: 30,
    fontWeight: 'bold',
    color: '#111827',
  },
  card: {
    marginBottom: 24,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    marginBottom: 16,
    borderRadius: 40,
    backgroundColor: 'rgba(45, 59, 227, 0.2)',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  userDesc: {
    color: '#6B7280',
  },
  statsTitle: {
    marginBottom: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  menuItem: {
    marginBottom: 12,
  },
  menuContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuText: {
    marginLeft: 16,
    fontSize: 18,
    fontWeight: '500',
    color: '#111827',
  },
});
