import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import GradientFallback from '../../components/shared/GradientFallback';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { GlassCard } from '../../components/GlassComponents';
import { colors } from '../../theme/colors';
import StorageService from '../../services/storage/StorageService';
import { UserProfile } from '../../services/storage/StorageService';
import SupabaseService from '../../services/storage/SupabaseService';
import { DynamicProfileService } from '../../services/learning/DynamicProfileService';

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 100, // Add bottom padding to prevent overlap with TabBar
  },
  scrollView: {
    flex: 1,
  },
  title: {
    marginBottom: 32,
    fontSize: 30,
    fontWeight: 'bold',
    color: colors.dark.text,
  },
  card: {
    marginBottom: 24,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(45, 59, 227, 0.2)',
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2D3BE3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.dark.text,
  },
  userDesc: {
    color: colors.dark.textSecondary,
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
    color: colors.dark.textSecondary,
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
    color: colors.dark.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.dark.surface,
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.dark.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark.text,
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.dark.text,
    backgroundColor: colors.dark.background,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: colors.dark.surface,
  },
  saveButton: {
    backgroundColor: colors.dark.primary,
  },
  cancelButtonText: {
    color: colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: colors.dark.surface,
    fontSize: 16,
    fontWeight: '600',
  },

  // Enhanced Stats
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  insightsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark.text,
    marginBottom: 8,
  },
  insightsText: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    lineHeight: 20,
  },
  // Data Source Toggle
  dataSourceHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  dataSourceButtons: {
    flexDirection: 'row',
    marginTop: 12,
  },
  dataSourceButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  dataSourceButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Enhanced Menu
  menuCard: {
    // Additional styles for menu cards
  },
  menuTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onNavigate }) => {
  const theme = 'dark'; // Assuming dark theme, can be made dynamic
  const themeColors = colors[theme];

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userProgress, setUserProgress] = useState<any | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [dynamicStats, setDynamicStats] = useState<any>(null);
  const [dynamicMenuItems, setDynamicMenuItems] = useState<MenuItem[]>([]);
  const [dataSourceMode, setDataSourceMode] = useState<'static' | 'hybrid' | 'live'>('live');

  const storage = StorageService.getInstance();
  const dynamicService = DynamicProfileService.getInstance();

  useEffect(() => {
    loadUserId();
  }, []);

  useEffect(() => {
    if (currentUserId !== null) {
      loadUserProfile();
      loadUserProgress();
      loadDynamicContent();
    }
  }, [currentUserId, dataSourceMode]);

  const loadDynamicContent = async () => {
    if (dataSourceMode === 'static') {
      setDynamicStats(null);
      setDynamicMenuItems([]);
      return;
    }

    try {
      const stats = await dynamicService.generateDynamicStats();
      const menuItems = await dynamicService.generatePersonalizedMenu();
      setDynamicStats(stats);
      setDynamicMenuItems(menuItems);
    } catch (error) {
      console.error('Error loading dynamic content:', error);
      if (dataSourceMode === 'live') {
        // For live mode, fall back to static if dynamic fails
        setDynamicStats(null);
        setDynamicMenuItems([]);
      }
      // For hybrid mode, keep trying or handle differently
    }
  };

  const loadUserId = async () => {
    try {
      const currentUser = await SupabaseService.getInstance().getCurrentUser();
      setCurrentUserId(currentUser?.id || null);
    } catch (error) {
      console.error('Error getting user ID:', error);
      setCurrentUserId(null);
    }
  };

  const loadUserProfile = async () => {
    if (!currentUserId) return;

    try {
      const profile = await storage.getUserProfile(currentUserId);
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
      setUserProfile(null);
    }
  };

  const loadUserProgress = async () => {
    if (!currentUserId) return;

    try {
      const progress = await storage.getUserProgress(currentUserId);
      setUserProgress(progress);
    } catch (error) {
      console.error('Error loading user progress:', error);
      setUserProgress(null);
    }
  };

  const loadUserData = async () => {
    if (!currentUserId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      await Promise.all([
        loadUserProfile(),
        loadUserProgress()
      ]);
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProfile = () => {
    if (userProfile) {
      setEditingName(userProfile.name);
      setEditingDescription(userProfile.description);
      setIsEditModalVisible(true);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await storage.saveUserProfile({
        name: editingName.trim() || 'NeuroLearn User',
        description: editingDescription.trim() || 'Learning enthusiast',
      });
      setIsEditModalVisible(false);
      await loadUserData(); // Reload profile data
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile changes');
    }
  };

  const menuItems: MenuItem[] = [
    {
      id: 'analytics',
      title: 'Analytics',
      icon: 'chart-line',
      screen: 'holistic-analytics',
    },
    { id: 'settings', title: 'Settings', icon: 'cog', screen: 'settings' },
    { id: 'ai', title: 'AI Assistant', icon: 'robot', screen: 'ai-assistant' },
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
    <GradientFallback
      colors={colors.dark.gradientBackground} // Dark theme gradient
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Profile</Text>



        <GlassCard theme={theme} style={styles.card}>
          <View style={styles.profileSection}>
            <TouchableOpacity onPress={handleEditProfile} style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Icon name="account" size={40} color="#2D3BE3" />
              </View>
              <View style={styles.editIcon}>
                <Icon name="pencil" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.userName}>
              {isLoading ? 'Loading...' : userProfile?.name || 'NeuroLearn User'}
            </Text>
            <Text style={styles.userDesc}>
              {isLoading ? '' : userProfile?.description || 'Learning enthusiast'}
            </Text>
          </View>
        </GlassCard>

        {/* Data Source Toggle */}
        <GlassCard theme={theme} style={styles.card}>
          <View style={styles.dataSourceHeader}>
            <Text style={styles.statsTitle}>Data Source</Text>
            <View style={styles.dataSourceButtons}>
              <TouchableOpacity
                style={[
                  styles.dataSourceButton,
                  dataSourceMode === 'static' && { backgroundColor: themeColors.primary },
                  { borderColor: themeColors.border }
                ]}
                onPress={() => setDataSourceMode('static')}
              >
                <Text style={[styles.dataSourceButtonText, { color: dataSourceMode === 'static' ? '#FFFFFF' : themeColors.text }]}>
                  Static
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.dataSourceButton,
                  dataSourceMode === 'hybrid' && { backgroundColor: themeColors.primary },
                  { borderColor: themeColors.border }
                ]}
                onPress={() => setDataSourceMode('hybrid')}
              >
                <Text style={[styles.dataSourceButtonText, { color: dataSourceMode === 'hybrid' ? '#FFFFFF' : themeColors.text }]}>
                  Hybrid
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.dataSourceButton,
                  dataSourceMode === 'live' && { backgroundColor: themeColors.primary },
                  { borderColor: themeColors.border }
                ]}
                onPress={() => setDataSourceMode('live')}
              >
                <Text style={[styles.dataSourceButtonText, { color: dataSourceMode === 'live' ? '#FFFFFF' : themeColors.text }]}>
                  Live
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </GlassCard>

        <GlassCard theme={theme} style={styles.card}>
          <View style={styles.statsHeader}>
            <Text style={styles.statsTitle}>Quick Stats</Text>
            {dynamicStats ? (
              <Text style={[styles.statsTag, { backgroundColor: themeColors.success }]}>
                Live Data
              </Text>
            ) : (
              <Text style={[styles.statsTag, { backgroundColor: themeColors.warning }]}>
                Static Data
              </Text>
            )}
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: themeColors.primary }]}>
                {isLoading ? '...' : (dynamicStats?.studySessions || userProgress?.totalPoints || 15)}
              </Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#16A34A' }]}>
                {isLoading ? '...' : (dynamicStats?.currentStreak || userProgress?.currentStreak || 7)}
              </Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#9333EA' }]}>
                {isLoading ? '...' : (dynamicStats?.level || userProgress?.level || 3)}
              </Text>
              <Text style={styles.statLabel}>Level</Text>
            </View>
          </View>
          {dynamicStats?.insights && (
            <View style={styles.insightsContainer}>
              <Text style={styles.insightsTitle}>💡 Insights</Text>
              <Text style={styles.insightsText}>{dynamicStats.insights}</Text>
            </View>
          )}
        </GlassCard>

        {/* Menu Items */}
        {(dynamicMenuItems.length > 0 ? dynamicMenuItems : menuItems).map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => handleMenuPress(item)}
            style={styles.menuItem}
          >
            <GlassCard theme={theme} style={styles.menuCard}>
              <View style={styles.menuContent}>
                <View style={styles.menuLeft}>
                  <Icon name={item.icon} size={24} color="#6B7280" />
                  <Text style={styles.menuText}>{item.title}</Text>
                  {dynamicMenuItems.length > 0 && (
                    <Text style={[styles.menuTag, { backgroundColor: themeColors.success }]}>
                      Personalized
                    </Text>
                  )}
                </View>
                <Icon name="chevron-right" size={24} color="#9CA3AF" />
              </View>
            </GlassCard>
          </TouchableOpacity>
        ))}

        {/* Edit Profile Modal */}
        <Modal
          visible={isEditModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsEditModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Profile</Text>

              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.textInput}
                value={editingName}
                onChangeText={setEditingName}
                placeholder="Enter your name"
                maxLength={50}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.textInput}
                value={editingDescription}
                onChangeText={setEditingDescription}
                placeholder="Tell us about yourself"
                multiline
                numberOfLines={3}
                maxLength={200}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setIsEditModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSaveProfile}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </GradientFallback>
  );
};

export default ProfileScreen;
