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
  Image,
} from 'react-native';
import {
  AppHeader,
  HamburgerMenu,
} from '../../components/navigation/Navigation';
import {
  GlassCard,
  Button,
  ScreenContainer,
} from '../../components/GlassComponents';
import { colors, spacing, typography, borderRadius } from '../../theme/colors';
import { ThemeType } from '../../theme/colors';
import HybridStorageService from '../../services/storage/HybridStorageService';
import { MemoryPalace, MemoryLocation, MemoryItem } from '../../types';

interface MemoryPalaceScreenProps {
  theme: ThemeType;
  onNavigate: (screen: string) => void;
}

interface CreatePalaceForm {
  name: string;
  description: string;
  category: string;
  locations: string[];
}

interface StudySession {
  palace: MemoryPalace;
  currentLocationIndex: number;
  studyMode: 'memorize' | 'recall' | 'review';
  startTime: Date;
  correctAnswers: number;
  totalItems: number;
}

const defaultPalaces: MemoryPalace[] = [
  {
    id: 'home-palace',
    name: 'Your Home',
    description: 'Navigate through your familiar living space',
    category: 'personal',
    created: new Date(),
    locations: [
      {
        id: '1',
        name: 'Front Door',
        description: 'The main entrance to your home',
        order: 1,
      },
      {
        id: '2',
        name: 'Living Room Sofa',
        description: 'The comfortable seating area',
        order: 2,
      },
      {
        id: '3',
        name: 'Kitchen Counter',
        description: 'Where you prepare meals',
        order: 3,
      },
      {
        id: '4',
        name: 'Bedroom Closet',
        description: 'Where you store your clothes',
        order: 4,
      },
      {
        id: '5',
        name: 'Bathroom Mirror',
        description: 'Where you see your reflection',
        order: 5,
      },
    ],
    totalItems: 0,
    masteredItems: 0,
    lastStudied: new Date(),
  },
  {
    id: 'campus-palace',
    name: 'University Campus',
    description: 'Walk through your academic environment',
    category: 'academic',
    created: new Date(),
    locations: [
      {
        id: '1',
        name: 'Main Gate',
        description: 'The entrance to your academic journey',
        order: 1,
      },
      {
        id: '2',
        name: 'Library Study Hall',
        description: 'Where knowledge is gathered',
        order: 2,
      },
      {
        id: '3',
        name: 'Lecture Theater',
        description: 'Where wisdom is shared',
        order: 3,
      },
      {
        id: '4',
        name: 'Student Cafeteria',
        description: 'Where minds meet and ideas flow',
        order: 4,
      },
      {
        id: '5',
        name: 'Laboratory',
        description: 'Where theories become reality',
        order: 5,
      },
    ],
    totalItems: 0,
    masteredItems: 0,
    lastStudied: new Date(),
  },
];

export const MemoryPalaceScreen: React.FC<MemoryPalaceScreenProps> = ({
  theme,
  onNavigate,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [palaces, setPalaces] = useState<MemoryPalace[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [createPalaceModalVisible, setCreatePalaceModalVisible] =
    useState(false);
  const [palaceDetailsModalVisible, setPalaceDetailsModalVisible] =
    useState(false);
  const [addItemModalVisible, setAddItemModalVisible] = useState(false);

  // Selected palace and location
  const [selectedPalace, setSelectedPalace] = useState<MemoryPalace | null>(
    null,
  );
  const [selectedLocation, setSelectedLocation] =
    useState<MemoryLocation | null>(null);

  // Study session
  const [studySession, setStudySession] = useState<StudySession | null>(null);

  // Forms
  const [createForm, setCreateForm] = useState<CreatePalaceForm>({
    name: '',
    description: '',
    category: 'personal',
    locations: ['', '', '', '', ''],
  });

  const [itemForm, setItemForm] = useState({
    content: '',
    association: '',
    visualization: '',
  });

  const themeColors = colors[theme];
  const storage = HybridStorageService.getInstance();

  useEffect(() => {
    loadMemoryPalaces();
  }, []);

  const loadMemoryPalaces = async () => {
    try {
      setLoading(true);
      let savedPalaces = await storage.getMemoryPalaces();

      // If no palaces exist, create default ones
      if (savedPalaces.length === 0) {
        await storage.saveMemoryPalaces(defaultPalaces);
        savedPalaces = defaultPalaces;
      }

      setPalaces(savedPalaces);
    } catch (error) {
      console.error('Error loading memory palaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPalace = async () => {
    if (!createForm.name.trim()) {
      Alert.alert('Error', 'Please enter a palace name');
      return;
    }

    const validLocations = createForm.locations.filter(
      (loc) => loc.trim().length > 0,
    );
    if (validLocations.length < 3) {
      Alert.alert(
        'Error',
        'Please enter at least 3 locations for your memory palace',
      );
      return;
    }

    try {
      const newPalace: MemoryPalace = {
        id: `palace_${Date.now()}`,
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        category: createForm.category,
        created: new Date(),
        locations: validLocations.map((name, index) => ({
          id: `loc_${Date.now()}_${index}`,
          name: name.trim(),
          description: `Location ${index + 1} in your memory palace`,
          order: index + 1,
        })),
        totalItems: 0,
        masteredItems: 0,
        lastStudied: new Date(),
      };

      const updatedPalaces = [newPalace, ...palaces];
      await storage.saveMemoryPalaces(updatedPalaces);
      setPalaces(updatedPalaces);

      // Reset form and close modal
      setCreateForm({
        name: '',
        description: '',
        category: 'personal',
        locations: ['', '', '', '', ''],
      });
      setCreatePalaceModalVisible(false);

      Alert.alert(
        'Palace Created! 🏰',
        `Your "${newPalace.name}" memory palace is ready. Now you can add memory items to each location.`,
      );
    } catch (error) {
      console.error('Error creating palace:', error);
      Alert.alert('Error', 'Failed to create memory palace');
    }
  };

  const viewPalaceDetails = (palace: MemoryPalace) => {
    setSelectedPalace(palace);
    setPalaceDetailsModalVisible(true);
  };

  const addMemoryItem = (palace: MemoryPalace, location: MemoryLocation) => {
    setSelectedPalace(palace);
    setSelectedLocation(location);
    setAddItemModalVisible(true);
  };

  const saveMemoryItem = async () => {
    if (!selectedPalace || !selectedLocation || !itemForm.content.trim()) {
      Alert.alert('Error', 'Please enter the content you want to remember');
      return;
    }

    try {
      const newItem: MemoryItem = {
        id: `item_${Date.now()}`,
        content: itemForm.content.trim(),
        association: itemForm.association.trim(),
        visualization: itemForm.visualization.trim(),
        created: new Date(),
        reviewCount: 0,
        mastered: false,
      };

      // Add item to the location
      const updatedPalaces = palaces.map((palace) => {
        if (palace.id === selectedPalace.id) {
          return {
            ...palace,
            locations: palace.locations
              ? palace.locations.map((loc) => {
                  if (loc.id === selectedLocation.id) {
                    return {
                      ...loc,
                      items: [...(loc.items || []), newItem],
                    };
                  }
                  return loc;
                })
              : palace.locations,
            totalItems: (palace.totalItems as number) + 1,
          };
        }
        return palace;
      });

      await storage.saveMemoryPalaces(updatedPalaces);
      setPalaces(updatedPalaces);

      // Reset form and close modal
      setItemForm({
        content: '',
        association: '',
        visualization: '',
      });
      setAddItemModalVisible(false);
      setPalaceDetailsModalVisible(false);

      Alert.alert(
        'Memory Item Added! 🧠',
        `"${newItem.content}" has been placed at ${selectedLocation.name}. Use visualization to create a strong mental connection.`,
      );
    } catch (error) {
      console.error('Error adding memory item:', error);
      Alert.alert('Error', 'Failed to add memory item');
    }
  };

  const startStudySession = (
    palace: MemoryPalace,
    mode: 'memorize' | 'recall' | 'review',
  ) => {
    const totalItems =
      palace.locations?.reduce(
        (total, loc) => total + (loc.items?.length || 0),
        0,
      ) || 0;

    if (totalItems === 0) {
      Alert.alert(
        'No Items to Study',
        'Add some memory items to this palace first before starting a study session.',
      );
      return;
    }

    setStudySession({
      palace,
      currentLocationIndex: 0,
      studyMode: mode,
      startTime: new Date(),
      correctAnswers: 0,
      totalItems,
    });
  };

  const deletePalace = (palace: MemoryPalace) => {
    Alert.alert(
      'Delete Memory Palace',
      `Are you sure you want to delete "${palace.name}"? This will remove all memory items stored in this palace.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedPalaces = palaces.filter((p) => p.id !== palace.id);
              await storage.saveMemoryPalaces(updatedPalaces);
              setPalaces(updatedPalaces);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete memory palace');
            }
          },
        },
      ],
    );
  };

  const getPalaceCategoryIcon = (category: string): string => {
    switch (category) {
      case 'personal':
        return '🏠';
      case 'academic':
        return '🎓';
      case 'professional':
        return '💼';
      case 'creative':
        return '🎨';
      default:
        return '🏰';
    }
  };

  const getPalaceStats = (palace: MemoryPalace) => {
    const totalLocations = palace.locations?.length || 0;
    const locationsWithItems =
      palace.locations?.filter((loc) => (loc.items?.length || 0) > 0).length ||
      0;
    const completionRate =
      totalLocations > 0
        ? Math.round((locationsWithItems / totalLocations) * 100)
        : 0;

    return {
      totalLocations,
      locationsWithItems,
      completionRate,
      totalItems: palace.totalItems || 0,
      masteredItems: palace.masteredItems || 0,
    };
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
            Loading your memory palaces...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // Study Session View
  if (studySession) {
    const currentLocation =
      studySession.palace.locations?.[studySession.currentLocationIndex];
    const items = currentLocation?.items || [];

    if (!currentLocation) {
      return (
        <ScreenContainer theme={theme}>
          <AppHeader
            title="Error"
            theme={theme}
            onMenuPress={() => setMenuVisible(true)}
            rightComponent={
              <TouchableOpacity onPress={() => setStudySession(null)}>
                <Text style={{ color: themeColors.error, fontSize: 16 }}>
                  End
                </Text>
              </TouchableOpacity>
            }
          />
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: themeColors.text }]}>
              Location not found. Ending session...
            </Text>
          </View>
        </ScreenContainer>
      );
    }

    return (
      <ScreenContainer theme={theme}>
        <AppHeader
          title={`${studySession.palace.name} - ${studySession.studyMode}`}
          theme={theme}
          onMenuPress={() => setMenuVisible(true)}
          rightComponent={
            <TouchableOpacity onPress={() => setStudySession(null)}>
              <Text style={{ color: themeColors.error, fontSize: 16 }}>
                End
              </Text>
            </TouchableOpacity>
          }
        />

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.studyContainer}
        >
          {/* Progress */}
          <GlassCard theme={theme} style={styles.progressCard}>
            <Text style={[styles.progressText, { color: themeColors.text }]}>
              Location {studySession.currentLocationIndex + 1} of{' '}
              {studySession.palace.locations?.length || 0}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${
                      ((studySession.currentLocationIndex + 1) /
                        (studySession.palace.locations?.length || 1)) *
                      100
                    }%`,
                    backgroundColor: themeColors.primary,
                  },
                ]}
              />
            </View>
          </GlassCard>

          {/* Current Location */}
          <GlassCard theme={theme} style={styles.locationCard}>
            <Text style={[styles.locationName, { color: themeColors.primary }]}>
              📍 {currentLocation.name}
            </Text>
            <Text
              style={[
                styles.locationDescription,
                { color: themeColors.textSecondary },
              ]}
            >
              {currentLocation.description}
            </Text>

            {items.length > 0 ? (
              <View style={styles.itemsList}>
                {items.map((item, index) => (
                  <View key={item.id} style={styles.memoryItem}>
                    <Text
                      style={[styles.itemContent, { color: themeColors.text }]}
                    >
                      {studySession.studyMode === 'recall'
                        ? '🤔 What do you remember here?'
                        : item.content}
                    </Text>

                    {studySession.studyMode !== 'recall' &&
                      item.association && (
                        <Text
                          style={[
                            styles.itemAssociation,
                            { color: themeColors.textSecondary },
                          ]}
                        >
                          💭 {item.association}
                        </Text>
                      )}

                    {studySession.studyMode !== 'recall' &&
                      item.visualization && (
                        <Text
                          style={[
                            styles.itemVisualization,
                            { color: themeColors.textMuted },
                          ]}
                        >
                          👁️ {item.visualization}
                        </Text>
                      )}
                  </View>
                ))}
              </View>
            ) : (
              <Text
                style={[styles.noItemsText, { color: themeColors.textMuted }]}
              >
                No memory items at this location yet.
              </Text>
            )}
          </GlassCard>

          {/* Navigation */}
          <View style={styles.navigationControls}>
            <Button
              title="← Previous"
              onPress={() => {
                if (studySession.currentLocationIndex > 0) {
                  setStudySession((prev) =>
                    prev
                      ? {
                          ...prev,
                          currentLocationIndex: prev.currentLocationIndex - 1,
                        }
                      : null,
                  );
                }
              }}
              variant="outline"
              size="medium"
              theme={theme}
              disabled={studySession.currentLocationIndex === 0}
              style={styles.navButton}
            />

            <Text style={[styles.locationCounter, { color: themeColors.text }]}>
              {studySession.currentLocationIndex + 1} /{' '}
              {studySession.palace.locations?.length || 0}
            </Text>

            <Button
              title="Next →"
              onPress={() => {
                if (
                  studySession.currentLocationIndex <
                  (studySession.palace.locations?.length || 0) - 1
                ) {
                  setStudySession((prev) =>
                    prev
                      ? {
                          ...prev,
                          currentLocationIndex: prev.currentLocationIndex + 1,
                        }
                      : null,
                  );
                } else {
                  Alert.alert(
                    'Journey Complete! 🎉',
                    `You've walked through your entire "${studySession.palace.name}" memory palace. Great job!`,
                    [{ text: 'Finish', onPress: () => setStudySession(null) }],
                  );
                }
              }}
              variant="primary"
              size="medium"
              theme={theme}
              style={styles.navButton}
            />
          </View>

          {/* Study Tips */}
          <GlassCard theme={theme} style={styles.tipsCard}>
            <Text style={[styles.tipsTitle, { color: themeColors.text }]}>
              💡 Memory Palace Tips
            </Text>
            <Text
              style={[styles.tipsText, { color: themeColors.textSecondary }]}
            >
              {studySession.studyMode === 'memorize'
                ? 'Visualize each item clearly at its location. Create vivid, unusual associations.'
                : studySession.studyMode === 'recall'
                ? 'Walk through mentally and try to recall what you placed at each location.'
                : 'Review your associations. Strengthen weak connections with more vivid imagery.'}
            </Text>
          </GlassCard>
        </ScrollView>

        <HamburgerMenu
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          onNavigate={onNavigate}
          currentScreen="memory-palace"
          theme={theme}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer theme={theme}>
      <AppHeader
        title="Memory Palaces"
        theme={theme}
        onMenuPress={() => setMenuVisible(true)}
        rightComponent={
          <TouchableOpacity onPress={() => setCreatePalaceModalVisible(true)}>
            <Text style={{ color: themeColors.primary, fontSize: 24 }}>+</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.container}
      >
        {/* Introduction Card */}
        <GlassCard theme={theme} style={styles.introCard}>
          <Text style={[styles.introTitle, { color: themeColors.text }]}>
            🏰 The Method of Loci
          </Text>
          <Text
            style={[styles.introText, { color: themeColors.textSecondary }]}
          >
            Memory palaces use spatial memory to store information. Ancient
            Greek orators used this technique to remember long speeches. Modern
            memory champions still use it today.
          </Text>
        </GlassCard>

        {/* Memory Palaces List */}
        <View style={styles.palacesSection}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            Your Memory Palaces ({palaces.length})
          </Text>

          {palaces.map((palace) => {
            const stats = getPalaceStats(palace);

            return (
              <GlassCard
                key={palace.id}
                theme={theme}
                onPress={() => viewPalaceDetails(palace)}
                style={styles.palaceCard}
              >
                <View style={styles.palaceHeader}>
                  <View style={styles.palaceInfo}>
                    <Text style={styles.palaceIcon}>
                      {getPalaceCategoryIcon(
                        palace.category ?? 'defaultCategory',
                      )}
                    </Text>
                    <View style={styles.palaceDetails}>
                      <Text
                        style={[styles.palaceName, { color: themeColors.text }]}
                      >
                        {palace.name}
                      </Text>
                      <Text
                        style={[
                          styles.palaceDescription,
                          { color: themeColors.textSecondary },
                        ]}
                      >
                        {palace.description}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => deletePalace(palace)}
                    style={[
                      styles.deleteButton,
                      { backgroundColor: themeColors.error },
                    ]}
                  >
                    <Text style={styles.deleteButtonText}>×</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.palaceStats}>
                  <View style={styles.statItem}>
                    <Text
                      style={[styles.statValue, { color: themeColors.primary }]}
                    >
                      {stats.totalLocations}
                    </Text>
                    <Text
                      style={[
                        styles.statLabel,
                        { color: themeColors.textMuted },
                      ]}
                    >
                      Locations
                    </Text>
                  </View>

                  <View style={styles.statItem}>
                    <Text
                      style={[styles.statValue, { color: themeColors.success }]}
                    >
                      {stats.totalItems}
                    </Text>
                    <Text
                      style={[
                        styles.statLabel,
                        { color: themeColors.textMuted },
                      ]}
                    >
                      Items
                    </Text>
                  </View>

                  <View style={styles.statItem}>
                    <Text
                      style={[styles.statValue, { color: themeColors.warning }]}
                    >
                      {stats.completionRate}%
                    </Text>
                    <Text
                      style={[
                        styles.statLabel,
                        { color: themeColors.textMuted },
                      ]}
                    >
                      Complete
                    </Text>
                  </View>
                </View>

                <View style={styles.palaceActions}>
                  <Button
                    title="Walk Through"
                    onPress={() => startStudySession(palace, 'memorize')}
                    variant="primary"
                    size="small"
                    theme={theme}
                    style={styles.actionButton}
                  />

                  <Button
                    title="Test Recall"
                    onPress={() => startStudySession(palace, 'recall')}
                    variant="secondary"
                    size="small"
                    theme={theme}
                    style={styles.actionButton}
                  />

                  <Button
                    title="Review"
                    onPress={() => startStudySession(palace, 'review')}
                    variant="outline"
                    size="small"
                    theme={theme}
                    style={styles.actionButton}
                  />
                </View>
              </GlassCard>
            );
          })}
        </View>

        {/* Memory Techniques Guide */}
        <GlassCard theme={theme} style={styles.guideCard}>
          <Text style={[styles.guideTitle, { color: themeColors.text }]}>
            🧠 Memory Techniques
          </Text>

          <View style={styles.techniqueItem}>
            <Text
              style={[styles.techniqueName, { color: themeColors.primary }]}
            >
              Visualization
            </Text>
            <Text
              style={[
                styles.techniqueDescription,
                { color: themeColors.textSecondary },
              ]}
            >
              Create vivid, unusual, and exaggerated mental images
            </Text>
          </View>

          <View style={styles.techniqueItem}>
            <Text
              style={[styles.techniqueName, { color: themeColors.primary }]}
            >
              Association
            </Text>
            <Text
              style={[
                styles.techniqueDescription,
                { color: themeColors.textSecondary },
              ]}
            >
              Link new information to familiar concepts or memories
            </Text>
          </View>

          <View style={styles.techniqueItem}>
            <Text
              style={[styles.techniqueName, { color: themeColors.primary }]}
            >
              Sequential Path
            </Text>
            <Text
              style={[
                styles.techniqueDescription,
                { color: themeColors.textSecondary },
              ]}
            >
              Follow a consistent route through your familiar spaces
            </Text>
          </View>
        </GlassCard>
      </ScrollView>

      {/* Create Palace Modal */}
      <Modal
        visible={createPalaceModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCreatePalaceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassCard theme={theme} variant="modal" style={styles.modalContent}>
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                Create New Memory Palace
              </Text>

              <View style={styles.formGroup}>
                <Text
                  style={[
                    styles.formLabel,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  Palace Name *
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
                  placeholder="e.g., My Childhood Home, Office Building..."
                  placeholderTextColor={themeColors.textMuted}
                  value={createForm.name}
                  onChangeText={(text) =>
                    setCreateForm((prev) => ({ ...prev, name: text }))
                  }
                />
              </View>

              <View style={styles.formGroup}>
                <Text
                  style={[
                    styles.formLabel,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  Description
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
                  placeholder="Brief description of this space..."
                  placeholderTextColor={themeColors.textMuted}
                  value={createForm.description}
                  onChangeText={(text) =>
                    setCreateForm((prev) => ({ ...prev, description: text }))
                  }
                  multiline
                />
              </View>

              <View style={styles.formGroup}>
                <Text
                  style={[
                    styles.formLabel,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  Locations (3-5 required) *
                </Text>
                {createForm.locations.map((location, index) => (
                  <TextInput
                    key={index}
                    style={[
                      styles.locationInput,
                      {
                        borderColor: themeColors.border,
                        color: themeColors.text,
                        backgroundColor: themeColors.surfaceLight,
                      },
                    ]}
                    placeholder={`Location ${index + 1}...`}
                    placeholderTextColor={themeColors.textMuted}
                    value={location}
                    onChangeText={(text) => {
                      const newLocations = [...createForm.locations];
                      newLocations[index] = text;
                      setCreateForm((prev) => ({
                        ...prev,
                        locations: newLocations,
                      }));
                    }}
                  />
                ))}
              </View>

              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  onPress={() => {
                    setCreatePalaceModalVisible(false);
                    setCreateForm({
                      name: '',
                      description: '',
                      category: 'personal',
                      locations: ['', '', '', '', ''],
                    });
                  }}
                  variant="ghost"
                  theme={theme}
                  style={styles.modalButton}
                />

                <Button
                  title="Create Palace"
                  onPress={createPalace}
                  variant="primary"
                  theme={theme}
                  style={styles.modalButton}
                />
              </View>
            </ScrollView>
          </GlassCard>
        </View>
      </Modal>

      {/* Palace Details Modal */}
      <Modal
        visible={palaceDetailsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPalaceDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassCard theme={theme} variant="modal" style={styles.modalContent}>
            {selectedPalace && (
              <ScrollView contentContainerStyle={styles.modalScrollContent}>
                <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                  {selectedPalace.name}
                </Text>

                <Text
                  style={[
                    styles.palaceModalDescription,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  {selectedPalace.description}
                </Text>

                <ScrollView style={styles.locationsList}>
                  {selectedPalace.locations?.map((location) => (
                    <TouchableOpacity
                      key={location.id}
                      onPress={() => addMemoryItem(selectedPalace, location)}
                      style={[
                        styles.locationItem,
                        { borderColor: themeColors.border },
                      ]}
                    >
                      <View style={styles.locationHeader}>
                        <Text
                          style={[
                            styles.locationItemName,
                            { color: themeColors.text },
                          ]}
                        >
                          📍 {location.name}
                        </Text>
                        <Text
                          style={[
                            styles.itemCount,
                            { color: themeColors.primary },
                          ]}
                        >
                          {location.items?.length || 0} items
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.locationItemDescription,
                          { color: themeColors.textSecondary },
                        ]}
                      >
                        {location.description}
                      </Text>

                      {location.items && location.items.length > 0 && (
                        <View style={styles.itemPreview}>
                          {location.items.slice(0, 2).map((item, index) => (
                            <Text
                              key={item.id}
                              style={[
                                styles.previewText,
                                { color: themeColors.textMuted },
                              ]}
                            >
                              • {item.content}
                            </Text>
                          ))}
                          {location.items.length > 2 && (
                            <Text
                              style={[
                                styles.moreItems,
                                { color: themeColors.textMuted },
                              ]}
                            >
                              +{location.items.length - 2} more...
                            </Text>
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Button
                  title="Close"
                  onPress={() => setPalaceDetailsModalVisible(false)}
                  variant="outline"
                  theme={theme}
                  style={styles.closeButton}
                />
              </ScrollView>
            )}
          </GlassCard>
        </View>
      </Modal>

      {/* Add Memory Item Modal */}
      <Modal
        visible={addItemModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAddItemModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassCard theme={theme} variant="modal" style={styles.modalContent}>
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                Add Memory Item
              </Text>

              {selectedLocation && (
                <Text
                  style={[
                    styles.locationContext,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  at {selectedLocation.name}
                </Text>
              )}

              <View style={styles.formGroup}>
                <Text
                  style={[
                    styles.formLabel,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  What do you want to remember? *
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
                  placeholder="The information you want to memorize..."
                  placeholderTextColor={themeColors.textMuted}
                  value={itemForm.content}
                  onChangeText={(text) =>
                    setItemForm((prev) => ({ ...prev, content: text }))
                  }
                  multiline
                />
              </View>

              <View style={styles.formGroup}>
                <Text
                  style={[
                    styles.formLabel,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  Mental Association
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
                  placeholder="How does this connect to the location?"
                  placeholderTextColor={themeColors.textMuted}
                  value={itemForm.association}
                  onChangeText={(text) =>
                    setItemForm((prev) => ({ ...prev, association: text }))
                  }
                />
              </View>

              <View style={styles.formGroup}>
                <Text
                  style={[
                    styles.formLabel,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  Visualization
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
                  placeholder="Describe the vivid mental image..."
                  placeholderTextColor={themeColors.textMuted}
                  value={itemForm.visualization}
                  onChangeText={(text) =>
                    setItemForm((prev) => ({ ...prev, visualization: text }))
                  }
                  multiline
                />
              </View>

              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  onPress={() => {
                    setAddItemModalVisible(false);
                    setItemForm({
                      content: '',
                      association: '',
                      visualization: '',
                    });
                  }}
                  variant="ghost"
                  theme={theme}
                  style={styles.modalButton}
                />

                <Button
                  title="Add Item"
                  onPress={saveMemoryItem}
                  variant="primary"
                  theme={theme}
                  style={styles.modalButton}
                />
              </View>
            </ScrollView>
          </GlassCard>
        </View>
      </Modal>

      <HamburgerMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={onNavigate}
        currentScreen="memory-palace"
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
  },

  // Introduction
  introCard: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  introTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  introText: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Palaces List
  palacesSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.lg,
  },
  palaceCard: {
    marginBottom: spacing.lg,
  },
  palaceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  palaceInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  palaceIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  palaceDetails: {
    flex: 1,
  },
  palaceName: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  palaceDescription: {
    ...typography.bodySmall,
    lineHeight: 18,
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  palaceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h4,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
  },
  palaceActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 0.31,
  },

  // Study Session
  progressCard: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  progressText: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  locationCard: {
    marginBottom: spacing.lg,
  },
  locationName: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  locationDescription: {
    ...typography.body,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  itemsList: {
    marginTop: spacing.md,
  },
  memoryItem: {
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  itemContent: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  itemAssociation: {
    ...typography.bodySmall,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  itemVisualization: {
    ...typography.bodySmall,
    lineHeight: 18,
  },
  noItemsText: {
    ...typography.body,
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: spacing.lg,
  },
  navigationControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  navButton: {
    flex: 0.35,
  },
  locationCounter: {
    ...typography.body,
    fontWeight: '600',
  },
  tipsCard: {
    alignItems: 'center',
  },
  tipsTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  tipsText: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Guide
  guideCard: {
    marginBottom: spacing.xl,
  },
  guideTitle: {
    ...typography.h4,
    marginBottom: spacing.lg,
  },
  techniqueItem: {
    marginBottom: spacing.md,
  },
  techniqueName: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  techniqueDescription: {
    ...typography.bodySmall,
    lineHeight: 18,
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
    flex: 1,
  },
  modalScrollContent: {
    padding: spacing.lg,
  },
  modalTitle: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  palaceModalDescription: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  locationContext: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
    fontStyle: 'italic',
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
    minHeight: 50,
    textAlignVertical: 'top',
    ...typography.body,
  },
  locationInput: {
    borderWidth: 2,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...typography.body,
  },
  locationsList: {
    maxHeight: 300,
    marginBottom: spacing.lg,
  },
  locationItem: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  locationItemName: {
    ...typography.body,
    fontWeight: '600',
  },
  itemCount: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  locationItemDescription: {
    ...typography.bodySmall,
    marginBottom: spacing.sm,
  },
  itemPreview: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  previewText: {
    ...typography.caption,
    marginBottom: spacing.xs / 2,
  },
  moreItems: {
    ...typography.caption,
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 0.48,
  },
  closeButton: {
    width: '100%',
  },
});
