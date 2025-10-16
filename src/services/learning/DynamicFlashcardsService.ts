import StorageService from '../storage/StorageService';
import { Flashcard } from '../../types';

interface FlashcardTemplate {
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  templates: {
    front: string;
    back: string;
  }[];
}

export class DynamicFlashcardsService {
  private static instance: DynamicFlashcardsService;
  private storage: StorageService;
  private cardTemplates: FlashcardTemplate[];

  private constructor() {
    this.storage = StorageService.getInstance();
    this.initializeCardTemplates();
  }

  static getInstance(): DynamicFlashcardsService {
    if (!DynamicFlashcardsService.instance) {
      DynamicFlashcardsService.instance = new DynamicFlashcardsService();
    }
    return DynamicFlashcardsService.instance;
  }

  private initializeCardTemplates(): void {
    this.cardTemplates = [
      {
        category: 'programming',
        difficulty: 'easy',
        templates: [
          { front: 'What does HTML stand for?', back: 'HyperText Markup Language' },
          { front: 'What is a variable in programming?', back: 'A storage location with an associated name that contains data' },
          { front: 'What does CSS control?', back: 'The styling and layout of web pages' }
        ]
      },
      {
        category: 'science',
        difficulty: 'medium',
        templates: [
          { front: 'What is neuroplasticity?', back: 'The brain\'s ability to reorganize and form new neural connections' },
          { front: 'Define cognitive load theory', back: 'Framework explaining how working memory limitations affect learning' },
          { front: 'What is spaced repetition?', back: 'Learning technique using increasing intervals between reviews' }
        ]
      },
      {
        category: 'general',
        difficulty: 'easy',
        templates: [
          { front: 'What is the capital of France?', back: 'Paris' },
          { front: 'How many days are in a leap year?', back: '366 days' },
          { front: 'What is the largest planet in our solar system?', back: 'Jupiter' }
        ]
      }
    ];
  }

  async generatePersonalizedCards(): Promise<Flashcard[]> {
    try {
      const userPrefs = await this.getUserPreferences();
      const cards: Flashcard[] = [];

      for (let i = 0; i < 5; i++) {
        const card = this.generateCardForUser(userPrefs);
        if (card) cards.push(card);
      }

      return cards;
    } catch (error) {
      console.error('Error generating personalized cards:', error);
      return [];
    }
  }

  private async getUserPreferences(): Promise<{
    interests: string[];
    difficulty: 'easy' | 'medium' | 'hard';
  }> {
    try {
      const stored = await this.storage.getUserPreferences();
      if (stored?.flashcards) return stored.flashcards;

      const cards = await this.storage.getFlashcards();
      const categories = [...new Set(cards.map(c => c.category || 'general'))];
      
      return {
        interests: categories.length > 0 ? categories : ['general'],
        difficulty: 'medium'
      };
    } catch (error) {
      return { interests: ['general'], difficulty: 'medium' };
    }
  }

  private generateCardForUser(prefs: any): Flashcard | null {
    const relevantTemplates = this.cardTemplates.filter(t => 
      prefs.interests.includes(t.category) && t.difficulty === prefs.difficulty
    );

    if (relevantTemplates.length === 0) return null;

    const template = relevantTemplates[Math.floor(Math.random() * relevantTemplates.length)]!;
    const cardTemplate = template.templates[Math.floor(Math.random() * template.templates.length)]!;

    return {
      id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      front: cardTemplate.front,
      back: cardTemplate.back,
      category: template.category,
      nextReview: new Date(),
      created: new Date(),
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      isAiGenerated: true
    };
  }
}