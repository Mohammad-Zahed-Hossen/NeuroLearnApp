import StorageService from '../storage/StorageService';
import { StudySession } from '../../types';

interface MenuItem {
  id: string;
  title: string;
  icon: string;
  screen?: string;
  action?: string;
}

interface DynamicStats {
  studySessions: number;
  currentStreak: number;
  level: number;
  insights: string;
  weeklyProgress: number;
  strongestSkill: string;
  nextGoal: string;
}

interface UserActivity {
  mostUsedFeatures: string[];
  preferredStudyTimes: number[];
  averageSessionLength: number;
  completionRate: number;
  learningVelocity: number;
}

export class DynamicProfileService {
  private static instance: DynamicProfileService;
  private storage: StorageService;

  private constructor() {
    this.storage = StorageService.getInstance();
  }

  static getInstance(): DynamicProfileService {
    if (!DynamicProfileService.instance) {
      DynamicProfileService.instance = new DynamicProfileService();
    }
    return DynamicProfileService.instance;
  }

  async generateDynamicStats(): Promise<DynamicStats> {
    try {
      const userActivity = await this.analyzeUserActivity();
      const sessions = await this.storage.getStudySessions();
      const flashcards = await this.storage.getFlashcards();
      const logicNodes = await this.storage.getLogicNodes();

      // Calculate real stats
      const studySessions = sessions.length;
      const currentStreak = await this.calculateCurrentStreak(sessions);
      const level = this.calculateLevel(userActivity);
      const insights = this.generateInsights(userActivity, sessions);

      return {
        studySessions,
        currentStreak,
        level,
        insights,
        weeklyProgress: this.calculateWeeklyProgress(sessions),
        strongestSkill: this.identifyStrongestSkill(userActivity),
        nextGoal: this.suggestNextGoal(userActivity, level)
      };
    } catch (error) {
      console.error('Error generating dynamic stats:', error);
      return this.getFallbackStats();
    }
  }

  async generatePersonalizedMenu(): Promise<MenuItem[]> {
    try {
      const userActivity = await this.analyzeUserActivity();
      const personalizedItems: MenuItem[] = [];

      // Add most used features first
      if (userActivity.mostUsedFeatures.includes('flashcards')) {
        personalizedItems.push({
          id: 'quick-review',
          title: 'Quick Review',
          icon: 'cards',
          screen: 'flashcards'
        });
      }

      if (userActivity.mostUsedFeatures.includes('focus')) {
        personalizedItems.push({
          id: 'focus-session',
          title: 'Start Focus Session',
          icon: 'timer',
          screen: 'focus'
        });
      }

      // Add analytics if user is engaged
      if (userActivity.completionRate > 0.7) {
        personalizedItems.push({
          id: 'detailed-analytics',
          title: 'Performance Analytics',
          icon: 'chart-line',
          screen: 'holistic-analytics'
        });
      }

      // Add learning recommendations
      personalizedItems.push({
        id: 'learning-path',
        title: 'Recommended Learning',
        icon: 'lightbulb',
        screen: 'neural-mind-map'
      });

      // Add time-sensitive items
      const currentHour = new Date().getHours();
      if (userActivity.preferredStudyTimes.includes(currentHour)) {
        personalizedItems.push({
          id: 'optimal-study',
          title: 'Optimal Study Time!',
          icon: 'star',
          screen: 'adaptive-focus'
        });
      }

      // Add improvement areas
      if (userActivity.completionRate < 0.5) {
        personalizedItems.push({
          id: 'study-tips',
          title: 'Study Tips & Techniques',
          icon: 'school',
          action: 'study-tips'
        });
      }

      // Always include settings and help
      personalizedItems.push(
        {
          id: 'settings',
          title: 'Settings',
          icon: 'cog',
          screen: 'settings'
        },
        {
          id: 'ai-coach',
          title: 'AI Learning Coach',
          icon: 'robot',
          screen: 'ai-assistant'
        }
      );

      return personalizedItems;
    } catch (error) {
      console.error('Error generating personalized menu:', error);
      return this.getFallbackMenu();
    }
  }

  private async analyzeUserActivity(): Promise<UserActivity> {
    try {
      const sessions = await this.storage.getStudySessions();
      const flashcards = await this.storage.getFlashcards();
      const logicNodes = await this.storage.getLogicNodes();

      // Analyze feature usage
      const featureUsage = new Map<string, number>();
      sessions.forEach(session => {
        const feature = this.mapSessionTypeToFeature(session.type || 'general');
        featureUsage.set(feature, (featureUsage.get(feature) || 0) + 1);
      });

      const mostUsedFeatures = Array.from(featureUsage.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([feature]) => feature);

      // Analyze study times
      const studyHours = sessions.filter(s => s.startTime != null).map(s => new Date(s.startTime!).getHours());
      const hourCounts = new Map<number, number>();
      studyHours.forEach(hour => {
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      });

      const preferredStudyTimes = Array.from(hourCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([hour]) => hour);

      // Calculate other metrics
      const completedSessions = sessions.filter(s => s.completed).length;
      const completionRate = sessions.length > 0 ? completedSessions / sessions.length : 0;

      const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
      const averageSessionLength = sessions.length > 0 ? totalDuration / sessions.length : 0;

      // Calculate learning velocity (sessions per week)
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentSessions = sessions.filter(s => s.startTime != null && new Date(s.startTime) > oneWeekAgo);
      const learningVelocity = recentSessions.length;

      return {
        mostUsedFeatures,
        preferredStudyTimes,
        averageSessionLength,
        completionRate,
        learningVelocity
      };
    } catch (error) {
      return {
        mostUsedFeatures: ['flashcards'],
        preferredStudyTimes: [9, 14, 19],
        averageSessionLength: 25,
        completionRate: 0.8,
        learningVelocity: 5
      };
    }
  }

  private mapSessionTypeToFeature(sessionType: string): string {
    switch (sessionType) {
      case 'flashcard':
      case 'review':
        return 'flashcards';
      case 'focus':
      case 'pomodoro':
        return 'focus';
      case 'reading':
        return 'speed-reading';
      case 'logic':
        return 'logic-training';
      case 'memory':
        return 'memory-palace';
      default:
        return 'general';
    }
  }

  private async calculateCurrentStreak(sessions: StudySession[]): Promise<number> {
    if (sessions.length === 0) return 0;

    // Sort sessions by date
    const sortedSessions = sessions
      .filter(s => s.completed && s.startTime)
      .sort((a, b) => {
        const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
        const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
        return bTime - aTime;
      });

    if (sortedSessions.length === 0) return 0;


    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if there's a session today or yesterday
    const latestSessionDate = sortedSessions[0]!.startTime;
    if (!latestSessionDate) return 0;
    const latestSession = new Date(latestSessionDate);
    latestSession.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today.getTime() - latestSession.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff > 1) return 0; // Streak broken

    // Count consecutive days
    const sessionDates = new Set<string>();
    sortedSessions.forEach(session => {
      if (session.startTime) {
        const date = new Date(session.startTime);
        date.setHours(0, 0, 0, 0);
        const dateStr = date.toISOString().split('T')[0];
        if (dateStr) {
          sessionDates.add(dateStr);
        }
      }
    });

    const uniqueDates = Array.from(sessionDates).sort().reverse();

    for (let i = 0; i < uniqueDates.length; i++) {
      const dateStr = uniqueDates[i];
      if (!dateStr) continue;
      const currentDate = new Date(dateStr);
      const expectedDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      expectedDate.setHours(0, 0, 0, 0);

      if (currentDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private calculateLevel(activity: UserActivity): number {
    // Level based on multiple factors
    const sessionFactor = Math.min(10, activity.learningVelocity);
    const completionFactor = activity.completionRate * 5;
    const consistencyFactor = activity.mostUsedFeatures.length;

    const totalScore = sessionFactor + completionFactor + consistencyFactor;
    return Math.max(1, Math.min(10, Math.floor(totalScore / 3)));
  }

  private calculateWeeklyProgress(sessions: any[]): number {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const thisWeek = sessions.filter(s => s.startTime != null && new Date(s.startTime) > oneWeekAgo).length;
    const lastWeek = sessions.filter(s => {
      if (s.startTime == null) return false;
      const date = new Date(s.startTime);
      return date > twoWeeksAgo && date <= oneWeekAgo;
    }).length;

    if (lastWeek === 0) return thisWeek > 0 ? 100 : 0;

    return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  }

  private identifyStrongestSkill(activity: UserActivity): string {
    if (activity.mostUsedFeatures.length === 0) return 'Getting Started';

    const skillMap: Record<string, string> = {
      'flashcards': 'Memory Retention',
      'focus': 'Concentration',
      'speed-reading': 'Information Processing',
      'logic-training': 'Critical Thinking',
      'memory-palace': 'Spatial Memory'
    };

    return skillMap[activity.mostUsedFeatures[0]!] || 'Learning Fundamentals';
  }

  private suggestNextGoal(activity: UserActivity, level: number): string {
    if (level < 3) {
      return 'Complete 5 study sessions this week';
    } else if (level < 6) {
      return 'Maintain a 7-day learning streak';
    } else if (activity.completionRate < 0.8) {
      return 'Improve session completion rate to 80%';
    } else {
      return 'Master advanced learning techniques';
    }
  }

  private generateInsights(activity: UserActivity, sessions: any[]): string {
    const insights: string[] = [];

    if (activity.completionRate > 0.8) {
      insights.push('Excellent completion rate! You\'re building strong learning habits.');
    } else if (activity.completionRate < 0.5) {
      insights.push('Consider shorter sessions to improve completion rates.');
    }

    if (activity.learningVelocity > 7) {
      insights.push('High learning velocity - you\'re making great progress!');
    } else if (activity.learningVelocity < 3) {
      insights.push('Try to maintain at least 3-4 sessions per week for optimal progress.');
    }

    if (activity.preferredStudyTimes.length > 0) {
      const bestHour = activity.preferredStudyTimes[0];
      if (bestHour !== undefined) {
        const timeStr = bestHour < 12 ? `${bestHour}AM` : `${bestHour - 12 || 12}PM`;
        insights.push(`Your peak study time appears to be around ${timeStr}.`);
      }
    }

    return insights.length > 0 ? insights[0]! : 'Keep up the great work with your learning journey!';
  }

  private getFallbackStats(): DynamicStats {
    return {
      studySessions: 12,
      currentStreak: 3,
      level: 2,
      insights: 'Start building consistent learning habits for better progress tracking.',
      weeklyProgress: 25,
      strongestSkill: 'Getting Started',
      nextGoal: 'Complete your first week of consistent learning'
    };
  }

  private getFallbackMenu(): MenuItem[] {
    return [
      {
        id: 'quick-start',
        title: 'Quick Start Guide',
        icon: 'play',
        action: 'quick-start'
      },
      {
        id: 'flashcards',
        title: 'Practice Flashcards',
        icon: 'cards',
        screen: 'flashcards'
      },
      {
        id: 'focus',
        title: 'Focus Timer',
        icon: 'timer',
        screen: 'focus'
      },
      {
        id: 'settings',
        title: 'Settings',
        icon: 'cog',
        screen: 'settings'
      }
    ];
  }

  async updateUserEngagement(action: string, screen: string): Promise<void> {
    try {
      const engagementData = {
        action,
        screen,
        timestamp: new Date(),
        source: 'profile'
      };

      // await this.storage.recordUserEngagement(engagementData); // Method not implemented
    } catch (error) {
      console.error('Error updating user engagement:', error);
    }
  }

  async getPersonalizedRecommendations(): Promise<string[]> {
    try {
      const activity = await this.analyzeUserActivity();
      const recommendations: string[] = [];

      if (activity.completionRate < 0.6) {
        recommendations.push('Try shorter study sessions to build consistency');
        recommendations.push('Set up study reminders for your peak hours');
      }

      if (activity.learningVelocity < 3) {
        recommendations.push('Aim for at least 3 study sessions per week');
        recommendations.push('Use the focus timer to build regular habits');
      }

      if (activity.mostUsedFeatures.length < 2) {
        recommendations.push('Explore different learning tools to find what works best');
        recommendations.push('Try the neural mind map for visual learning');
      }

      return recommendations.length > 0 ? recommendations : [
        'You\'re doing great! Keep up the consistent learning',
        'Consider exploring new learning techniques to expand your skills'
      ] as string[];
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return ['Focus on building consistent learning habits'];
    }
  }
}
