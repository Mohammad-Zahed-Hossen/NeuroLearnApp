import { MemoryPalace, MemoryLocation } from '../../types';
import StorageService from '../storage/StorageService';

interface UserPreferences {
  interests: string[];
  familiarPlaces: string[];
  learningStyle: 'visual' | 'auditory' | 'kinesthetic';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface PalaceTemplate {
  category: string;
  name: string;
  description: string;
  locations: string[];
  icon: string;
}

export class DynamicMemoryPalaceService {
  private static instance: DynamicMemoryPalaceService;
  private storage: StorageService;
  private palaceTemplates: PalaceTemplate[];

  private constructor() {
    this.storage = StorageService.getInstance();
    this.initializePalaceTemplates();
  }

  static getInstance(): DynamicMemoryPalaceService {
    if (!DynamicMemoryPalaceService.instance) {
      DynamicMemoryPalaceService.instance = new DynamicMemoryPalaceService();
    }
    return DynamicMemoryPalaceService.instance;
  }

  private initializePalaceTemplates(): void {
    this.palaceTemplates = [
      {
        category: 'workplace',
        name: 'Your Office Building',
        description: 'Navigate through your professional environment',
        locations: ['Reception Desk', 'Elevator', 'Your Desk', 'Meeting Room', 'Coffee Machine'],
        icon: '🏢'
      },
      {
        category: 'transportation',
        name: 'Daily Commute Route',
        description: 'Follow your familiar journey to work',
        locations: ['Bus Stop', 'Train Platform', 'Transfer Station', 'Office Building', 'Parking Lot'],
        icon: '🚌'
      },
      {
        category: 'shopping',
        name: 'Grocery Store Layout',
        description: 'Walk through your regular shopping route',
        locations: ['Entrance', 'Produce Section', 'Dairy Aisle', 'Checkout Counter', 'Exit'],
        icon: '🛒'
      },
      {
        category: 'fitness',
        name: 'Gym Workout Circuit',
        description: 'Follow your exercise routine path',
        locations: ['Locker Room', 'Cardio Area', 'Weight Section', 'Stretching Zone', 'Water Fountain'],
        icon: '💪'
      },
      {
        category: 'nature',
        name: 'Local Park Walk',
        description: 'Stroll through your favorite outdoor space',
        locations: ['Park Entrance', 'Pond Area', 'Playground', 'Walking Trail', 'Picnic Tables'],
        icon: '🌳'
      },
      {
        category: 'entertainment',
        name: 'Movie Theater Experience',
        description: 'Navigate through cinema visit',
        locations: ['Ticket Counter', 'Concession Stand', 'Theater Entrance', 'Your Seat', 'Exit Lobby'],
        icon: '🎬'
      }
    ];
  }

  async generatePersonalizedPalaces(): Promise<MemoryPalace[]> {
    try {
      const userPrefs = await this.getUserPreferences();
      const generatedPalaces: MemoryPalace[] = [];

      // Generate 2-3 AI-suggested palaces based on user preferences
      const selectedTemplates = this.selectRelevantTemplates(userPrefs);

      for (const template of selectedTemplates.slice(0, 3)) {
        const palace = this.createPalaceFromTemplate(template, userPrefs);
        generatedPalaces.push(palace);
      }

      // Add location-based palace if user has location data
      if (userPrefs.familiarPlaces.length > 0) {
        const locationPalace = this.createLocationBasedPalace(userPrefs);
        generatedPalaces.push(locationPalace);
      }

      return generatedPalaces;
    } catch (error) {
      console.error('Error generating personalized palaces:', error);
      return [];
    }
  }

  private async getUserPreferences(): Promise<UserPreferences> {
    try {
      // Try to get stored preferences
      const stored = await this.storage.getUserPreferences();
      if (stored) {
        return stored;
      }

      // Generate default preferences based on usage patterns
      const usageData = await this.storage.getUsageAnalytics();
      return this.inferPreferencesFromUsage(usageData);
    } catch (error) {
      // Fallback to default preferences
      return {
        interests: ['learning', 'productivity', 'memory'],
        familiarPlaces: [],
        learningStyle: 'visual',
        difficulty: 'intermediate'
      };
    }
  }

  private inferPreferencesFromUsage(usageData: any): UserPreferences {
    // Analyze usage patterns to infer preferences
    const interests: string[] = [];
    const familiarPlaces: string[] = [];

    // Check which features are used most
    if (usageData?.flashcardsUsage > 10) interests.push('studying', 'academics');
    if (usageData?.focusTimerUsage > 5) interests.push('productivity', 'work');
    if (usageData?.logicTrainingUsage > 3) interests.push('problem-solving', 'logic');


    let learningStyle: 'visual' | 'auditory' | 'kinesthetic' = 'visual';
    const visualScore = usageData?.visualUsage || 0;
    const audioScore = usageData?.audioUsage || 0;
    const kinestheticScore = usageData?.logicTrainingUsage || 0;

    if (audioScore > visualScore && audioScore > kinestheticScore) {
      learningStyle = 'auditory';
    } else if (kinestheticScore > visualScore && kinestheticScore > audioScore) {
      learningStyle = 'kinesthetic';
    }
    return {
      interests: interests.length > 0 ? interests : ['learning', 'memory'],
      familiarPlaces,
      learningStyle,
      difficulty: usageData?.averagePerformance > 0.8 ? 'advanced' : 'intermediate'
    };
  }

  private selectRelevantTemplates(userPrefs: UserPreferences): PalaceTemplate[] {
    // Score templates based on user preferences
    const scoredTemplates = this.palaceTemplates.map(template => {
      let score = 0;

      // Score based on interests
      userPrefs.interests.forEach(interest => {
        if (template.category.includes(interest) || template.description.toLowerCase().includes(interest)) {
          score += 2;
        }
      });

      // Score based on difficulty
      if (userPrefs.difficulty === 'beginner' && template.locations.length <= 5) score += 1;
      if (userPrefs.difficulty === 'advanced' && template.locations.length > 5) score += 1;

      return { template, score };
    });

    // Sort by score and return top templates
    return scoredTemplates
      .sort((a, b) => b.score - a.score)
      .map(item => item.template);
  }

  private createPalaceFromTemplate(template: PalaceTemplate, userPrefs: UserPreferences): MemoryPalace {
    const locations: MemoryLocation[] = template.locations.map((locationName, index) => ({
      id: `ai_loc_${Date.now()}_${index}`,
      name: locationName,
      description: this.generateLocationDescription(locationName, template.category),
      order: index + 1,
      items: []
    }));

    return {
      id: `ai_palace_${Date.now()}_${template.category}`,
      name: template.name,
      description: `${template.description} - AI suggested based on your preferences`,
      category: template.category,
      created: new Date(),
      locations,
      totalItems: 0,
      masteredItems: 0,
      lastStudied: new Date(),
      isAiGenerated: true
    };
  }

  private createLocationBasedPalace(userPrefs: UserPreferences): MemoryPalace {
    const familiarPlace = userPrefs.familiarPlaces[0] || 'Your Neighborhood';

    const locations: MemoryLocation[] = [
      'Starting Point',
      'Landmark 1',
      'Midway Point',
      'Landmark 2',
      'Destination'
    ].map((name, index) => ({
      id: `loc_based_${Date.now()}_${index}`,
      name: `${name} (${familiarPlace})`,
      description: `A memorable spot along your route in ${familiarPlace}`,
      order: index + 1,
      items: []
    }));

    return {
      id: `location_palace_${Date.now()}`,
      name: `${familiarPlace} Journey`,
      description: `A personalized memory palace based on your familiar location: ${familiarPlace}`,
      category: 'personal',
      created: new Date(),
      locations,
      totalItems: 0,
      masteredItems: 0,
      lastStudied: new Date(),
      isAiGenerated: true
    };
  }

  private generateLocationDescription(locationName: string, category: string): string {
    const descriptions: Record<string, Record<string, string>> = {
      workplace: {
        'Reception Desk': 'The welcoming entrance where visitors are greeted',
        'Elevator': 'The vertical transport connecting different floors',
        'Your Desk': 'Your personal workspace where ideas come to life',
        'Meeting Room': 'The collaborative space for important discussions',
        'Coffee Machine': 'The energizing hub where colleagues gather'
      },
      transportation: {
        'Bus Stop': 'The starting point of your daily journey',
        'Train Platform': 'The bustling platform filled with commuters',
        'Transfer Station': 'The connection point between different routes',
        'Office Building': 'The towering structure that houses your workplace',
        'Parking Lot': 'The final destination for your vehicle'
      },
      shopping: {
        'Entrance': 'The gateway to your shopping experience',
        'Produce Section': 'The colorful display of fresh fruits and vegetables',
        'Dairy Aisle': 'The cool section with milk, cheese, and yogurt',
        'Checkout Counter': 'The final stop before completing your purchase',
        'Exit': 'The way out with your completed shopping'
      }
    };

    return descriptions[category]?.[locationName] || `A significant location in your ${category} environment`;
  }

  async saveUserPreferences(preferences: UserPreferences): Promise<void> {
    try {
      await this.storage.saveUserPreferences(preferences);
    } catch (error) {
      console.error('Error saving user preferences:', error);
    }
  }

  async updatePalaceUsage(palaceId: string, studyMode: string): Promise<void> {
    try {
      const usageData = {
        palaceId,
        studyMode,
        timestamp: new Date(),
        sessionDuration: 0 // Will be updated when session ends
      };

      const sessionData = {
        id: `palace_${Date.now()}`,
        type: 'memory',
        mode: studyMode,
        duration: 15,
        completed: true,
        startTime: new Date(),
        endTime: new Date()
      };

      await this.storage.saveStudySession(sessionData);
    } catch (error) {
      console.error('Error updating palace usage:', error);
    }
  }

  async getPersonalizedRecommendations(): Promise<string[]> {
    try {
      const userPrefs = await this.getUserPreferences();
      const recommendations: string[] = [];

      if (userPrefs.learningStyle === 'visual') {
        recommendations.push('Use vivid colors and shapes in your visualizations');
        recommendations.push('Create detailed mental images for each location');
      }

      if (userPrefs.difficulty === 'beginner') {
        recommendations.push('Start with 3-5 locations per palace');
        recommendations.push('Use familiar places for better retention');
      } else if (userPrefs.difficulty === 'advanced') {
        recommendations.push('Try complex multi-story palaces');
        recommendations.push('Link multiple palaces together for large datasets');
      }

      return recommendations;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return ['Practice regularly for best results', 'Use familiar locations for stronger memories'];
    }
  }
}
