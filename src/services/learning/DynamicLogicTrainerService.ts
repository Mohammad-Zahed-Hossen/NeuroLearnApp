import StorageService from '../storage/StorageService';

interface LogicExercise {
  question: string;
  premise1: string;
  premise2: string;
  conclusion: string;
  type: 'deductive' | 'inductive' | 'abductive';
  domain: 'programming' | 'math' | 'english' | 'general';
  difficulty: 1 | 2 | 3 | 4 | 5;
}

interface ExerciseTemplate {
  type: 'deductive' | 'inductive' | 'abductive';
  domain: 'programming' | 'math' | 'english' | 'general';
  difficulty: 1 | 2 | 3 | 4 | 5;
  templates: {
    question: string;
    premise1: string;
    premise2: string;
    conclusion: string;
  }[];
}

export class DynamicLogicTrainerService {
  private static instance: DynamicLogicTrainerService;
  private storage: StorageService;
  private exerciseTemplates: ExerciseTemplate[];

  private constructor() {
    this.storage = StorageService.getInstance();
    this.initializeExerciseTemplates();
  }

  static getInstance(): DynamicLogicTrainerService {
    if (!DynamicLogicTrainerService.instance) {
      DynamicLogicTrainerService.instance = new DynamicLogicTrainerService();
    }
    return DynamicLogicTrainerService.instance;
  }

  private initializeExerciseTemplates(): void {
    this.exerciseTemplates = [
      // Programming Domain - Deductive
      {
        type: 'deductive',
        domain: 'programming',
        difficulty: 2,
        templates: [
          {
            question: 'Function behavior analysis',
            premise1: 'All functions that return null indicate an error condition',
            premise2: 'The getUserData() function returned null',
            conclusion: 'Therefore, getUserData() encountered an error condition'
          },
          {
            question: 'Code optimization principle',
            premise1: 'All O(n²) algorithms are inefficient for large datasets',
            premise2: 'This sorting algorithm has O(n²) complexity',
            conclusion: 'Therefore, this sorting algorithm is inefficient for large datasets'
          }
        ]
      },
      // Math Domain - Inductive
      {
        type: 'inductive',
        domain: 'math',
        difficulty: 3,
        templates: [
          {
            question: 'Pattern recognition in sequences',
            premise1: 'In sequence: 2, 4, 8, 16, each term doubles the previous',
            premise2: 'The pattern holds for the first four terms consistently',
            conclusion: 'Therefore, the next term will likely be 32 (16 × 2)'
          },
          {
            question: 'Statistical inference',
            premise1: 'In 100 coin flips, 52 resulted in heads',
            premise2: 'In another 100 flips, 48 resulted in heads',
            conclusion: 'Therefore, the coin appears to be approximately fair'
          }
        ]
      },
      // English Domain - Abductive
      {
        type: 'abductive',
        domain: 'english',
        difficulty: 2,
        templates: [
          {
            question: 'Literary interpretation',
            premise1: 'The character consistently avoids eye contact in dialogue',
            premise2: 'The character speaks in short, hesitant sentences',
            conclusion: 'The most likely explanation is that the character is nervous or hiding something'
          },
          {
            question: 'Communication analysis',
            premise1: 'The email response was delayed by three days',
            premise2: 'The tone was unusually formal compared to previous messages',
            conclusion: 'The sender was likely upset or reconsidering their position'
          }
        ]
      },
      // General Domain - Mixed
      {
        type: 'deductive',
        domain: 'general',
        difficulty: 1,
        templates: [
          {
            question: 'Daily life reasoning',
            premise1: 'All stores in the mall close at 9 PM on weekdays',
            premise2: 'Today is Tuesday and it is currently 9:15 PM',
            conclusion: 'Therefore, all stores in the mall are now closed'
          }
        ]
      },
      {
        type: 'inductive',
        domain: 'general',
        difficulty: 2,
        templates: [
          {
            question: 'Weather pattern observation',
            premise1: 'It has rained every Tuesday for the past month',
            premise2: 'The weather patterns have been consistent this season',
            conclusion: 'Therefore, it will likely rain next Tuesday'
          }
        ]
      },
      // Advanced Programming
      {
        type: 'abductive',
        domain: 'programming',
        difficulty: 4,
        templates: [
          {
            question: 'System debugging',
            premise1: 'The application crashes only when processing large files',
            premise2: 'Memory usage spikes to 95% just before each crash',
            conclusion: 'The most likely cause is a memory leak or insufficient memory allocation'
          }
        ]
      },
      // Advanced Math
      {
        type: 'deductive',
        domain: 'math',
        difficulty: 5,
        templates: [
          {
            question: 'Proof by contradiction setup',
            premise1: 'Assume √2 is rational, so √2 = p/q where p,q are integers with no common factors',
            premise2: 'Then 2 = p²/q², which means p² = 2q², so p² is even',
            conclusion: 'Therefore, p must be even (since only even numbers have even squares)'
          }
        ]
      }
    ];
  }

  async generatePersonalizedExercises(): Promise<LogicExercise[]> {
    try {
      const userPerformance = await this.getUserPerformanceData();
      const preferences = await this.getUserPreferences();

      const exercises: LogicExercise[] = [];

      // Generate 3-5 exercises based on user needs
      const targetCount = Math.min(5, Math.max(3, userPerformance.weakAreas.length + 2));

      for (let i = 0; i < targetCount; i++) {
        const exercise = this.generateExerciseForUser(userPerformance, preferences);
        if (exercise) {
          exercises.push(exercise);
        }
      }

      return exercises;
    } catch (error) {
      console.error('Error generating personalized exercises:', error);
      return this.getFallbackExercises();
    }
  }

  private async getUserPerformanceData(): Promise<{
    averageScore: number;
    weakAreas: Array<{ type: 'deductive' | 'inductive' | 'abductive'; domain: 'programming' | 'math' | 'english' | 'general'; difficulty: 1 | 2 | 3 | 4 | 5 }>;
    strongAreas: Array<{ type: 'deductive' | 'inductive' | 'abductive'; domain: 'programming' | 'math' | 'english' | 'general'; difficulty: 1 | 2 | 3 | 4 | 5 }>;
    preferredDifficulty: number;
  }> {
    try {
      const logicNodes = await this.storage.getLogicNodes();

      if (logicNodes.length === 0) {
        return {
          averageScore: 3,
          weakAreas: [],
          strongAreas: [],
          preferredDifficulty: 2
        };
      }

      // Calculate performance metrics
      const scores = logicNodes.map(node => node.totalAttempts > 0 ? (node.correctAttempts / node.totalAttempts) * 5 : 3);
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

      // Identify weak and strong areas
      const performanceByArea = new Map<string, number[]>();

      logicNodes.forEach(node => {
        const key = `${node.type}-${node.domain}-${node.difficulty}`;
        if (!performanceByArea.has(key)) {
          performanceByArea.set(key, []);
        }
        performanceByArea.get(key)!.push(node.totalAttempts > 0 ? (node.correctAttempts / node.totalAttempts) * 5 : 3);
      });

      const weakAreas: Array<{ type: 'deductive' | 'inductive' | 'abductive'; domain: 'programming' | 'math' | 'english' | 'general'; difficulty: 1 | 2 | 3 | 4 | 5 }> = [];
      const strongAreas: Array<{ type: 'deductive' | 'inductive' | 'abductive'; domain: 'programming' | 'math' | 'english' | 'general'; difficulty: 1 | 2 | 3 | 4 | 5 }> = [];

      performanceByArea.forEach((scores, key) => {
        const parts = key.split('-');
        if (parts.length !== 3) return;

        const [type, domain, difficultyStr] = parts;
        if (!type || !domain || !difficultyStr) return;

        const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

        const area = {
          type: type as 'deductive' | 'inductive' | 'abductive',
          domain: domain as 'programming' | 'math' | 'english' | 'general',
          difficulty: parseInt(difficultyStr) as 1 | 2 | 3 | 4 | 5
        };

        if (avgScore < 3) {
          weakAreas.push(area);
        } else if (avgScore >= 4) {
          strongAreas.push(area);
        }
      });

      return {
        averageScore,
        weakAreas,
        strongAreas,
        preferredDifficulty: Math.max(1, Math.min(5, Math.round(averageScore)))
      };
    } catch (error) {
      console.error('Error analyzing user performance:', error);
      return {
        averageScore: 3,
        weakAreas: [],
        strongAreas: [],
        preferredDifficulty: 2
      };
    }
  }

  private async getUserPreferences(): Promise<{
    preferredDomains: ('programming' | 'math' | 'english' | 'general')[];
    preferredTypes: ('deductive' | 'inductive' | 'abductive')[];
    learningStyle: 'progressive' | 'challenging' | 'mixed';
  }> {
    try {
      const stored = await this.storage.getUserPreferences();
      if (stored?.logicTraining) {
        return stored.logicTraining;
      }

      // Infer from usage patterns
      const logicNodes = await this.storage.getLogicNodes();
      const domainCounts = new Map<string, number>();
      const typeCounts = new Map<string, number>();

      logicNodes.forEach(node => {
        domainCounts.set(node.domain, (domainCounts.get(node.domain) || 0) + 1);
        typeCounts.set(node.type, (typeCounts.get(node.type) || 0) + 1);
      });

      const preferredDomains = Array.from(domainCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([domain]) => domain as 'programming' | 'math' | 'english' | 'general');

      const preferredTypes = Array.from(typeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([type]) => type as 'deductive' | 'inductive' | 'abductive');

      return {
        preferredDomains: preferredDomains.length > 0 ? preferredDomains : ['general', 'programming'],
        preferredTypes: preferredTypes.length > 0 ? preferredTypes : ['deductive', 'inductive'],
        learningStyle: 'mixed'
      };
    } catch (error) {
      return {
        preferredDomains: ['general', 'programming'],
        preferredTypes: ['deductive', 'inductive'],
        learningStyle: 'mixed'
      };
    }
  }

  private generateExerciseForUser(
    performance: {
      averageScore: number;
      weakAreas: Array<{ type: 'deductive' | 'inductive' | 'abductive'; domain: 'programming' | 'math' | 'english' | 'general'; difficulty: 1 | 2 | 3 | 4 | 5 }>;
      strongAreas: Array<{ type: 'deductive' | 'inductive' | 'abductive'; domain: 'programming' | 'math' | 'english' | 'general'; difficulty: 1 | 2 | 3 | 4 | 5 }>;
      preferredDifficulty: number;
    },
    preferences: {
      preferredDomains: ('programming' | 'math' | 'english' | 'general')[];
      preferredTypes: ('deductive' | 'inductive' | 'abductive')[];
      learningStyle: 'progressive' | 'challenging' | 'mixed';
    }
  ): LogicExercise | null {
    // Focus on weak areas first, then preferred areas
    const targetAreas = performance.weakAreas.length > 0
      ? performance.weakAreas
      : this.generateTargetAreas(preferences);

    if (targetAreas.length === 0) {
      return this.generateRandomExercise();
    }

    const targetArea = targetAreas[Math.floor(Math.random() * targetAreas.length)]!;

    // Find matching templates
    const matchingTemplates = this.exerciseTemplates.filter(template =>
      template.type === targetArea.type &&
      template.domain === targetArea.domain &&
      Math.abs(template.difficulty - targetArea.difficulty) <= 1
    );

    if (matchingTemplates.length === 0) {
      return this.generateRandomExercise();
    }

    const selectedTemplate = matchingTemplates[Math.floor(Math.random() * matchingTemplates.length)]!;
    const exerciseTemplate = selectedTemplate.templates[
      Math.floor(Math.random() * selectedTemplate.templates.length)
    ]!;

    if (!exerciseTemplate) {
      return null;
    }

    return {
      question: this.personalizeText(exerciseTemplate.question),
      premise1: this.personalizeText(exerciseTemplate.premise1),
      premise2: this.personalizeText(exerciseTemplate.premise2),
      conclusion: this.personalizeText(exerciseTemplate.conclusion),
      type: selectedTemplate.type,
      domain: selectedTemplate.domain,
      difficulty: selectedTemplate.difficulty
    };
  }

  private generateTargetAreas(preferences: {
    preferredDomains: ('programming' | 'math' | 'english' | 'general')[];
    preferredTypes: ('deductive' | 'inductive' | 'abductive')[];
    learningStyle: 'progressive' | 'challenging' | 'mixed';
  }): Array<{ type: 'deductive' | 'inductive' | 'abductive'; domain: 'programming' | 'math' | 'english' | 'general'; difficulty: 1 | 2 | 3 | 4 | 5 }> {
    const areas: Array<{ type: 'deductive' | 'inductive' | 'abductive'; domain: 'programming' | 'math' | 'english' | 'general'; difficulty: 1 | 2 | 3 | 4 | 5 }> = [];

    for (const domain of preferences.preferredDomains) {
      for (const type of preferences.preferredTypes) {
        areas.push({
          type,
          domain,
          difficulty: (Math.floor(Math.random() * 3) + 2) as 1 | 2 | 3 | 4 | 5 // 2-4 difficulty
        });
      }
    }

    return areas;
  }

  private generateRandomExercise(): LogicExercise {
    const template = this.exerciseTemplates[Math.floor(Math.random() * this.exerciseTemplates.length)]!;
    const exerciseTemplate = template.templates[Math.floor(Math.random() * template.templates.length)]!;

    return {
      question: exerciseTemplate.question,
      premise1: exerciseTemplate.premise1,
      premise2: exerciseTemplate.premise2,
      conclusion: exerciseTemplate.conclusion,
      type: template.type,
      domain: template.domain,
      difficulty: template.difficulty
    };
  }

  private personalizeText(text: string): string {
    // Simple personalization - could be enhanced with AI
    const personalizations = [
      { from: 'the application', to: 'your application' },
      { from: 'the function', to: 'your function' },
      { from: 'the algorithm', to: 'your algorithm' },
      { from: 'the character', to: 'this character' },
      { from: 'the email', to: 'this email' }
    ];

    let personalizedText = text;
    personalizations.forEach(({ from, to }) => {
      personalizedText = personalizedText.replace(new RegExp(from, 'gi'), to);
    });

    return personalizedText;
  }

  private getFallbackExercises(): LogicExercise[] {
    // Return a few basic exercises if generation fails
    return [
      {
        question: 'Basic logical reasoning',
        premise1: 'All birds have feathers',
        premise2: 'A robin is a bird',
        conclusion: 'Therefore, a robin has feathers',
        type: 'deductive',
        domain: 'general',
        difficulty: 1
      },
      {
        question: 'Pattern observation',
        premise1: 'Every time I water my plants, they grow taller',
        premise2: 'I have observed this pattern for three months',
        conclusion: 'Therefore, watering likely causes plant growth',
        type: 'inductive',
        domain: 'general',
        difficulty: 2
      }
    ];
  }

  async recordExercisePerformance(
    exercise: LogicExercise,
    score: number,
    timeSpent: number
  ): Promise<void> {
    try {
      const performanceData = {
        exercise,
        score,
        timeSpent,
        timestamp: new Date(),
        source: 'dynamic'
      };

      const sessionData = {
        id: `logic_${Date.now()}`,
        type: 'logic',
        duration: Math.round(timeSpent / 60),
        completed: score >= 3,
        startTime: new Date(),
        endTime: new Date()
      };

      await this.storage.saveStudySession(sessionData);
    } catch (error) {
      console.error('Error recording exercise performance:', error);
    }
  }

  async getPersonalizedRecommendations(): Promise<string[]> {
    try {
      const performance = await this.getUserPerformanceData();
      const recommendations: string[] = [];

      if (performance.averageScore < 3) {
        recommendations.push('Focus on understanding the logical structure before writing conclusions');
        recommendations.push('Practice with easier exercises to build confidence');
      }

      if (performance.weakAreas.length > 0) {
        const weakDomains = [...new Set(performance.weakAreas.map(area => area.domain))];
        recommendations.push(`Consider additional practice in: ${weakDomains.join(', ')}`);
      }

      if (performance.averageScore >= 4) {
        recommendations.push('Try more challenging exercises to push your limits');
        recommendations.push('Explore new domains to broaden your logical reasoning skills');
      }

      return recommendations.length > 0 ? recommendations : [
        'Practice regularly to improve logical reasoning',
        'Focus on clear premise-conclusion relationships'
      ];
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return ['Practice regularly to improve logical reasoning'];
    }
  }
}
