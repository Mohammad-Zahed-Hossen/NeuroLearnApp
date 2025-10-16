import StorageService from '../storage/StorageService';

interface TextPreset {
  id: string;
  title: string;
  content: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  wordCount: number;
}

interface ContentTemplate {
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topics: string[];
  templates: {
    title: string;
    content: string;
  }[];
}

export class DynamicSpeedReadingService {
  private static instance: DynamicSpeedReadingService;
  private storage: StorageService;
  private contentTemplates: ContentTemplate[];

  private constructor() {
    this.storage = StorageService.getInstance();
    this.initializeContentTemplates();
  }

  static getInstance(): DynamicSpeedReadingService {
    if (!DynamicSpeedReadingService.instance) {
      DynamicSpeedReadingService.instance = new DynamicSpeedReadingService();
    }
    return DynamicSpeedReadingService.instance;
  }

  private initializeContentTemplates(): void {
    this.contentTemplates = [
      // Technology & Programming - Easy
      {
        category: 'technology',
        difficulty: 'Easy',
        topics: ['programming', 'software', 'web development', 'mobile apps'],
        templates: [
          {
            title: 'Introduction to Web Development',
            content: `Web development is the process of creating websites and web applications. It involves both front-end development, which focuses on what users see and interact with, and back-end development, which handles server-side logic and databases. Modern web development uses languages like HTML for structure, CSS for styling, and JavaScript for interactivity. Popular frameworks like React, Vue, and Angular help developers build complex applications more efficiently. The field is constantly evolving with new tools and technologies emerging regularly. Understanding the basics of web development opens doors to many career opportunities in the digital age. Whether you're building a simple personal website or a complex e-commerce platform, the fundamental principles remain the same. Good web development practices include writing clean code, ensuring accessibility, and optimizing for performance across different devices and browsers.`
          },
          {
            title: 'Mobile App Development Basics',
            content: `Mobile app development has become increasingly important as smartphones dominate our daily lives. There are two main approaches: native development and cross-platform development. Native apps are built specifically for one platform using platform-specific languages like Swift for iOS or Kotlin for Android. Cross-platform frameworks like React Native and Flutter allow developers to write code once and deploy to multiple platforms. The development process typically involves planning, design, coding, testing, and deployment. User experience is crucial in mobile apps since screen space is limited and users expect intuitive interfaces. Performance optimization is also critical as mobile devices have limited resources compared to desktop computers. App store guidelines and approval processes add another layer of complexity to mobile development. Success in mobile development requires understanding both technical skills and user behavior patterns.`
          }
        ]
      },
      // Science & Health - Medium
      {
        category: 'science',
        difficulty: 'Medium',
        topics: ['neuroscience', 'psychology', 'health', 'biology', 'physics'],
        templates: [
          {
            title: 'The Science of Learning and Memory',
            content: `Learning and memory are fundamental cognitive processes that enable us to acquire, store, and retrieve information. The brain's ability to form new neural connections, known as neuroplasticity, is the biological foundation of learning. When we learn something new, synapses between neurons strengthen through repeated activation, a process called long-term potentiation. Memory formation involves three main stages: encoding, consolidation, and retrieval. During encoding, sensory information is converted into a form that can be stored in the brain. Consolidation is the process by which memories become stable and are transferred from short-term to long-term storage. The hippocampus plays a crucial role in this process, particularly for declarative memories. Sleep is essential for memory consolidation, with different sleep stages contributing to different types of memory formation. Retrieval involves accessing stored information when needed, and this process can actually modify the memory itself. Understanding these mechanisms has led to the development of more effective learning strategies, such as spaced repetition, interleaving, and elaborative encoding. These techniques leverage the brain's natural learning processes to improve retention and recall.`
          },
          {
            title: 'Cognitive Load Theory in Practice',
            content: `Cognitive Load Theory, developed by John Sweller, provides a framework for understanding how the mind processes information during learning. The theory is based on the premise that human working memory has limited capacity, typically able to hold seven plus or minus two items simultaneously. When this capacity is exceeded, learning becomes inefficient or impossible. The theory distinguishes between three types of cognitive load: intrinsic load, which relates to the inherent difficulty of the material; extraneous load, which is caused by poor instructional design; and germane load, which is the mental effort devoted to processing and automating schemas. Effective learning strategies must consider cognitive load management to optimize the learning process. Techniques such as chunking information into smaller units, eliminating unnecessary elements, and providing worked examples can reduce cognitive burden. Progressive disclosure of complex information allows learners to build understanding incrementally without overwhelming their cognitive resources. The theory has significant implications for educational design, suggesting that instruction should be structured to minimize extraneous load while maximizing germane load. This approach leads to more efficient learning and better long-term retention of information.`
          }
        ]
      },
      // Business & Productivity - Medium
      {
        category: 'business',
        difficulty: 'Medium',
        topics: ['productivity', 'management', 'leadership', 'entrepreneurship'],
        templates: [
          {
            title: 'Effective Time Management Strategies',
            content: `Time management is a critical skill for personal and professional success. Effective time management involves planning, prioritizing, and executing tasks in a way that maximizes productivity while maintaining work-life balance. The Eisenhower Matrix is a popular framework that categorizes tasks based on urgency and importance, helping individuals focus on what truly matters. Time blocking is another powerful technique where specific time slots are allocated to different activities, reducing decision fatigue and improving focus. The Pomodoro Technique uses timed work sessions followed by short breaks to maintain concentration and prevent burnout. Technology can be both a help and a hindrance to time management. While productivity apps and tools can streamline workflows, constant notifications and digital distractions can significantly impact focus. Setting boundaries with technology, such as designated phone-free times or using website blockers, can improve concentration. Delegation is an often-overlooked aspect of time management that involves assigning tasks to others when appropriate. This not only frees up time for higher-priority activities but also helps develop team members' skills. Regular review and adjustment of time management strategies ensure they remain effective as circumstances change.`
          }
        ]
      },
      // Literature & Philosophy - Hard
      {
        category: 'literature',
        difficulty: 'Hard',
        topics: ['philosophy', 'literature', 'critical thinking', 'ethics'],
        templates: [
          {
            title: 'The Philosophy of Consciousness',
            content: `Consciousness represents one of the most profound and perplexing questions in philosophy and neuroscience. The hard problem of consciousness, as formulated by philosopher David Chalmers, concerns why and how physical processes give rise to subjective experience. While we can explain the functional aspects of the brain—how it processes information, controls behavior, and responds to stimuli—the question of why there is something it is like to have these experiences remains elusive. Various philosophical positions attempt to address this mystery. Materialism holds that consciousness emerges from complex neural activity, while dualism suggests that consciousness is fundamentally different from physical matter. Panpsychism proposes that consciousness is a fundamental feature of reality, present even in basic particles. The integrated information theory attempts to quantify consciousness based on the amount of integrated information a system can generate. Phenomenology, pioneered by Edmund Husserl, focuses on the structure of experience itself rather than its underlying mechanisms. The study of consciousness has practical implications for artificial intelligence, medical ethics regarding patients in vegetative states, and our understanding of animal cognition. As neuroscience advances, we may develop better tools to study consciousness empirically, but the philosophical questions about the nature of subjective experience continue to challenge our understanding of what it means to be conscious beings.`
          }
        ]
      },
      // Personal Development - Easy to Medium
      {
        category: 'personal_development',
        difficulty: 'Easy',
        topics: ['habits', 'motivation', 'goal setting', 'mindfulness'],
        templates: [
          {
            title: 'Building Effective Habits',
            content: `Habits are the building blocks of personal transformation. Research shows that approximately 40% of our daily actions are driven by habits rather than conscious decisions. Understanding how habits work can help us build positive behaviors and eliminate negative ones. The habit loop consists of three components: a cue that triggers the behavior, the routine or behavior itself, and the reward that reinforces the habit. To build a new habit, start small and focus on consistency rather than intensity. For example, if you want to develop a reading habit, begin with just five minutes per day rather than attempting to read for an hour. Environmental design plays a crucial role in habit formation. Making desired behaviors easier and unwanted behaviors harder can significantly impact success rates. This might involve placing a book on your pillow to encourage bedtime reading or putting your phone in another room to reduce social media usage. Habit stacking, a technique popularized by James Clear, involves linking a new habit to an existing one. The accountability and social support also enhance habit formation. Sharing your goals with others or joining a community with similar objectives can provide motivation and encouragement during challenging times.`
          }
        ]
      }
    ];
  }

  async generatePersonalizedTexts(): Promise<TextPreset[]> {
    try {
      const userPreferences = await this.getUserPreferences();
      const readingHistory = await this.getReadingHistory();

      const texts: TextPreset[] = [];

      // Generate 3-4 texts based on user preferences and performance
      const targetCount = 4;

      for (let i = 0; i < targetCount; i++) {
        const text = this.generateTextForUser(userPreferences, readingHistory);
        if (text) {
          texts.push(text);
        }
      }

      return texts;
    } catch (error) {
      console.error('Error generating personalized texts:', error);
      return this.getFallbackTexts();
    }
  }

  private async getUserPreferences(): Promise<{
    interests: string[];
    preferredDifficulty: 'Easy' | 'Medium' | 'Hard';
    averageWPM: number;
    preferredLength: 'short' | 'medium' | 'long';
  }> {
    try {
      const stored = await this.storage.getUserPreferences();
      if (stored?.speedReading) {
        return stored.speedReading;
      }

      // Infer from usage patterns
      const sessions = await this.storage.getStudySessions();
      const readingSessions = sessions.filter(s => s.type === 'reading');

      let averageWPM = 300; // Default
      if (readingSessions.length > 0) {
        // Extract WPM from session modes if available
        const wpmValues = readingSessions
          .map(s => {
            const match = s.mode?.match(/(\d+)wpm/);
            return match ? parseInt(match[1]!, 10) : null;
          })
          .filter((wpm): wpm is number => wpm !== null);

        if (wpmValues.length > 0) {
          averageWPM = wpmValues.reduce((sum, wpm) => sum + wpm, 0) / wpmValues.length;
        }
      }

      return {
        interests: ['technology', 'science', 'personal_development'],
        preferredDifficulty: averageWPM > 400 ? 'Hard' : averageWPM > 250 ? 'Medium' : 'Easy',
        averageWPM,
        preferredLength: 'medium'
      };
    } catch (error) {
      return {
        interests: ['technology', 'science'],
        preferredDifficulty: 'Medium',
        averageWPM: 300,
        preferredLength: 'medium'
      };
    }
  }

  private async getReadingHistory(): Promise<{
    completedTexts: string[];
    averageComprehension: number;
    preferredTopics: string[];
  }> {
    try {
      const sessions = await this.storage.getStudySessions();
      const readingSessions = sessions.filter(s => s.type === 'reading');

      // Type predicate to narrow the type
      const hasId = (s: any): s is any & { id: string } => s.id !== undefined;

      return {
        completedTexts: readingSessions.filter(hasId).map(s => s.id!),
        averageComprehension: 0.8, // Default assumption
        preferredTopics: ['technology', 'science']
      };
    } catch (error) {
      return {
        completedTexts: [],
        averageComprehension: 0.8,
        preferredTopics: ['technology']
      };
    }
  }

  private generateTextForUser(
    preferences: any,
    history: any
  ): TextPreset | null {
    // Select templates based on user interests and difficulty
    const relevantTemplates = this.contentTemplates.filter(template =>
      preferences.interests.includes(template.category) &&
      template.difficulty === preferences.preferredDifficulty
    );

    if (relevantTemplates.length === 0) {
      // Fallback to any template with matching difficulty
      const fallbackTemplates = this.contentTemplates.filter(template =>
        template.difficulty === preferences.preferredDifficulty
      );

      if (fallbackTemplates.length === 0) {
        return this.generateFallbackText();
      }

      relevantTemplates.push(...fallbackTemplates);
    }

    const selectedTemplate = relevantTemplates[Math.floor(Math.random() * relevantTemplates.length)]!;
    const textTemplate = selectedTemplate.templates[
      Math.floor(Math.random() * selectedTemplate.templates.length)
    ];
    if (!textTemplate) {
      return this.generateFallbackText();
    }
    // Personalize the content
    const personalizedContent = this.personalizeContent(textTemplate.content, preferences);
    const wordCount = personalizedContent.split(/\s+/).length;

    return {
      id: `dynamic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: this.personalizeTitle(textTemplate.title, preferences),
      content: personalizedContent,
      difficulty: selectedTemplate.difficulty,
      wordCount
    };
  }

  private personalizeContent(content: string, preferences: any): string {
    // Simple personalization - could be enhanced with AI
    let personalizedContent = content;

    // Adjust complexity based on user's reading level
    if (preferences.averageWPM > 500) {
      // Add more complex sentences for advanced readers
      personalizedContent = personalizedContent.replace(
        /\. /g,
        '. Furthermore, '
      );
    } else if (preferences.averageWPM < 200) {
      // Simplify for slower readers
      personalizedContent = personalizedContent.replace(
        /; /g,
        '. '
      );
    }

    // Add user-relevant examples
    if (preferences.interests.includes('technology')) {
      personalizedContent = personalizedContent.replace(
        /for example/gi,
        'for example, in software development'
      );
    }

    return personalizedContent;
  }

  private personalizeTitle(title: string, preferences: any): string {
    const personalizations = [
      'Your Guide to',
      'Understanding',
      'Mastering',
      'Exploring',
      'Advanced'
    ];

    const prefix = personalizations[Math.floor(Math.random() * personalizations.length)];
    return `${prefix} ${title}`;
  }

  private generateFallbackText(): TextPreset {
    return {
      id: `fallback_${Date.now()}`,
      title: 'Effective Learning Strategies',
      content: `Learning is a lifelong process that can be optimized through various strategies and techniques. Active learning involves engaging with material through questioning, summarizing, and applying concepts rather than passive reading. Spaced repetition helps consolidate information in long-term memory by reviewing material at increasing intervals. The Feynman Technique involves explaining concepts in simple terms to identify knowledge gaps. Mind mapping creates visual representations of information to enhance understanding and recall. Setting specific, measurable goals provides direction and motivation for learning efforts. Regular breaks and adequate sleep are essential for memory consolidation and cognitive performance. Different learning styles may benefit from different approaches, such as visual aids, auditory explanations, or hands-on practice. Metacognition, or thinking about thinking, helps learners monitor their understanding and adjust strategies accordingly. Creating connections between new information and existing knowledge strengthens neural pathways and improves retention.`,
      difficulty: 'Medium',
      wordCount: 150
    };
  }

  private getFallbackTexts(): TextPreset[] {
    return [
      this.generateFallbackText(),
      {
        id: `fallback_2_${Date.now()}`,
        title: 'The Power of Focused Attention',
        content: `In our increasingly distracted world, the ability to maintain focused attention has become a superpower. Attention is not just about concentration; it's about directing mental resources toward what matters most. Deep work, a concept popularized by Cal Newport, refers to the ability to focus on cognitively demanding tasks without distraction. This skill is becoming increasingly rare and valuable in the knowledge economy. Research shows that it takes an average of 23 minutes to fully refocus after an interruption. Multitasking, despite being praised in many work environments, actually reduces productivity and increases errors. The brain cannot truly multitask; instead, it rapidly switches between tasks, creating cognitive overhead. Meditation and mindfulness practices can strengthen attention muscles over time. Environmental design plays a crucial role in maintaining focus, including minimizing distractions and creating dedicated spaces for deep work. Technology can both help and hinder attention, making it important to use digital tools mindfully.`,
        difficulty: 'Medium',
        wordCount: 160
      }
    ];
  }

  async recordReadingPerformance(
    textId: string,
    wpm: number,
    comprehensionScore: number,
    timeSpent: number
  ): Promise<void> {
    try {
      const performanceData = {
        textId,
        wpm,
        comprehensionScore,
        timeSpent,
        timestamp: new Date(),
        source: 'dynamic'
      };

      const sessionData = {
        id: `reading_${Date.now()}`,
        type: 'reading',
        mode: `${wpm}wpm`,
        duration: Math.round(timeSpent / 60),
        completed: comprehensionScore > 0.6,
        startTime: new Date(),
        endTime: new Date()
      };

      await this.storage.saveStudySession(sessionData);
    } catch (error) {
      console.error('Error recording reading performance:', error);
    }
  }

  async getPersonalizedRecommendations(): Promise<string[]> {
    try {
      const preferences = await this.getUserPreferences();
      const recommendations: string[] = [];

      if (preferences.averageWPM < 250) {
        recommendations.push('Start with easier texts to build confidence');
        recommendations.push('Focus on comprehension over speed initially');
      } else if (preferences.averageWPM > 500) {
        recommendations.push('Challenge yourself with more complex materials');
        recommendations.push('Practice maintaining comprehension at high speeds');
      }

      if (preferences.preferredDifficulty === 'Easy') {
        recommendations.push('Gradually increase text complexity as you improve');
      }

      return recommendations.length > 0 ? recommendations : [
        'Practice regularly to improve reading speed',
        'Focus on understanding key concepts'
      ];
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return ['Practice regularly to improve reading speed'];
    }
  }

  async updateUserPreferences(preferences: any): Promise<void> {
    try {
      const currentPrefs = await this.storage.getUserPreferences();
      const updatedPrefs = {
        ...currentPrefs,
        speedReading: {
          ...currentPrefs?.speedReading,
          ...preferences
        }
      };

      await this.storage.saveUserPreferences(updatedPrefs);
    } catch (error) {
      console.error('Error updating user preferences:', error);
    }
  }
}
