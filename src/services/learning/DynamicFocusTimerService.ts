import StorageService from '../storage/StorageService';
import { FocusMode } from '../../types';

interface FocusPattern {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  averageDuration: number;
  successRate: number;
  preferredType: string;
}

interface UserFocusProfile {
  optimalDurations: Record<string, number>;
  circadianPeaks: number[]; // Hours of day when focus is best
  attentionSpan: number; // Average attention span in minutes
  breakPreferences: {
    shortBreak: number;
    longBreak: number;
    frequency: number;
  };
  distractionPatterns: {
    commonTriggers: string[];
    peakDistractionTimes: number[];
    averageSeverity: number;
  };
}

export class DynamicFocusTimerService {
  private static instance: DynamicFocusTimerService;
  private storage: StorageService;

  private constructor() {
    this.storage = StorageService.getInstance();
  }

  static getInstance(): DynamicFocusTimerService {
    if (!DynamicFocusTimerService.instance) {
      DynamicFocusTimerService.instance = new DynamicFocusTimerService();
    }
    return DynamicFocusTimerService.instance;
  }

  async generatePersonalizedModes(): Promise<FocusMode[]> {
    try {
      const userProfile = await this.getUserFocusProfile();
      const currentHour = new Date().getHours();

      const personalizedModes: FocusMode[] = [];

      // Generate optimal duration mode based on current time
      const optimalMode = this.generateOptimalMode(userProfile, currentHour);
      personalizedModes.push(optimalMode);

      // Generate attention span-based mode
      const attentionMode = this.generateAttentionSpanMode(userProfile);
      personalizedModes.push(attentionMode);

      // Generate circadian-optimized mode
      const circadianMode = this.generateCircadianMode(userProfile, currentHour);
      personalizedModes.push(circadianMode);

      // Generate micro-focus mode for high distraction periods
      if (this.isHighDistractionTime(userProfile, currentHour)) {
        const microMode = this.generateMicroFocusMode(userProfile);
        personalizedModes.push(microMode);
      }

      return personalizedModes;
    } catch (error) {
      console.error('Error generating personalized focus modes:', error);
      return this.getFallbackModes();
    }
  }

  private async getUserFocusProfile(): Promise<UserFocusProfile> {
    try {
      // Get stored profile or analyze usage patterns
      const stored = await this.storage.getUserPreferences();
      if (stored?.focusTimer) {
        return stored.focusTimer;
      }

      // Analyze historical focus sessions
      const sessions = await this.storage.getStudySessions();
      const focusSessions = sessions.filter(s => s.type === 'focus' || s.mode?.includes('min'));

      return this.analyzeFocusPatterns(focusSessions);
    } catch (error) {
      return this.getDefaultProfile();
    }
  }

  private analyzeFocusPatterns(sessions: any[]): UserFocusProfile {
    if (sessions.length === 0) {
      return this.getDefaultProfile();
    }

    // Analyze session durations
    const durations = sessions.map(s => s.duration || 25);
    const averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;

    // Analyze completion rates by time of day
    const hourlySuccess = new Map<number, { total: number; completed: number }>();

    sessions.forEach(session => {
      const hour = new Date(session.startTime).getHours();
      if (!hourlySuccess.has(hour)) {
        hourlySuccess.set(hour, { total: 0, completed: 0 });
      }
      const stats = hourlySuccess.get(hour)!;
      stats.total++;
      if (session.completed) {
        stats.completed++;
      }
    });

    // Find peak performance hours
    const circadianPeaks: number[] = [];
    hourlySuccess.forEach((stats, hour) => {
      const successRate = stats.completed / stats.total;
      if (successRate > 0.8 && stats.total >= 2) {
        circadianPeaks.push(hour);
      }
    });

    return {
      optimalDurations: {
        'deep-work': Math.min(60, Math.max(30, averageDuration * 1.5)),
        'pomodoro': Math.min(30, Math.max(15, averageDuration)),
        'micro': Math.min(15, Math.max(5, averageDuration * 0.5))
      },
      circadianPeaks: circadianPeaks.length > 0 ? circadianPeaks : [9, 14, 19],
      attentionSpan: Math.min(45, Math.max(10, averageDuration)),
      breakPreferences: {
        shortBreak: 5,
        longBreak: 15,
        frequency: 4
      },
      distractionPatterns: {
        commonTriggers: ['phone', 'notifications', 'thoughts'],
        peakDistractionTimes: [12, 15, 20], // Typical distraction hours
        averageSeverity: 3
      }
    };
  }

  private getDefaultProfile(): UserFocusProfile {
    return {
      optimalDurations: {
        'deep-work': 45,
        'pomodoro': 25,
        'micro': 10
      },
      circadianPeaks: [9, 14, 19], // Typical peak focus hours
      attentionSpan: 25,
      breakPreferences: {
        shortBreak: 5,
        longBreak: 15,
        frequency: 4
      },
      distractionPatterns: {
        commonTriggers: ['phone', 'notifications'],
        peakDistractionTimes: [12, 15, 20],
        averageSeverity: 3
      }
    };
  }

  private generateOptimalMode(profile: UserFocusProfile, currentHour: number): FocusMode {
    // Determine optimal duration based on current time and historical performance
    let duration = profile.attentionSpan;

    // Adjust based on circadian rhythm
    if (profile.circadianPeaks.includes(currentHour)) {
      duration = Math.min(60, duration * 1.3); // Extend during peak hours
    } else if (this.isLowEnergyTime(currentHour)) {
      duration = Math.max(10, duration * 0.7); // Shorten during low energy
    }

    return {
      id: `optimal_${Date.now()}`,
      name: 'Optimal Focus',
      duration: Math.round(duration),
      color: '#10B981',
      icon: '🎯',
      description: `AI-optimized ${Math.round(duration)}min session based on your peak performance patterns`
    };
  }

  private generateAttentionSpanMode(profile: UserFocusProfile): FocusMode {
    const duration = profile.attentionSpan;

    return {
      id: `attention_${Date.now()}`,
      name: 'Attention Span',
      duration: Math.round(duration),
      color: '#8B5CF6',
      icon: '🧠',
      description: `${Math.round(duration)}min session matching your natural attention span`
    };
  }

  private generateCircadianMode(profile: UserFocusProfile, currentHour: number): FocusMode {
    const isPeakHour = profile.circadianPeaks.includes(currentHour);
    const duration = isPeakHour ?
      Math.min(60, profile.attentionSpan * 1.5) :
      Math.max(15, profile.attentionSpan * 0.8);

    return {
      id: `circadian_${Date.now()}`,
      name: isPeakHour ? 'Peak Energy' : 'Steady Focus',
      duration: Math.round(duration),
      color: isPeakHour ? '#F59E0B' : '#6B7280',
      icon: isPeakHour ? '☀️' : '🌙',
      description: `${Math.round(duration)}min session optimized for your ${isPeakHour ? 'peak' : 'current'} energy level`
    };
  }

  private generateMicroFocusMode(profile: UserFocusProfile): FocusMode {
    const duration = Math.max(5, Math.min(15, profile.attentionSpan * 0.4));

    return {
      id: `micro_${Date.now()}`,
      name: 'Micro Focus',
      duration: Math.round(duration),
      color: '#EF4444',
      icon: '⚡',
      description: `Short ${Math.round(duration)}min burst for high-distraction periods`
    };
  }

  private isHighDistractionTime(profile: UserFocusProfile, currentHour: number): boolean {
    return profile.distractionPatterns.peakDistractionTimes.includes(currentHour);
  }

  private isLowEnergyTime(currentHour: number): boolean {
    // Typical low energy periods
    return currentHour >= 13 && currentHour <= 15 || // Post-lunch dip
           currentHour >= 21 || currentHour <= 6;     // Late night/early morning
  }

  private getFallbackModes(): FocusMode[] {
    return [
      {
        id: 'adaptive_25',
        name: 'Adaptive Focus',
        duration: 25,
        color: '#10B981',
        icon: '🎯',
        description: 'AI-recommended 25min session for balanced productivity'
      },
      {
        id: 'smart_15',
        name: 'Smart Sprint',
        duration: 15,
        color: '#8B5CF6',
        icon: '⚡',
        description: 'Quick 15min burst for immediate focus needs'
      }
    ];
  }

  async recordFocusSession(
    mode: FocusMode,
    actualDuration: number,
    completed: boolean,
    distractions: number
  ): Promise<void> {
    try {
      const sessionData = {
        mode: mode.name,
        plannedDuration: mode.duration,
        actualDuration,
        completed,
        distractions,
        timestamp: new Date(),
        hour: new Date().getHours(),
        source: 'dynamic'
      };

      await this.storage.recordFocusSession(sessionData);

      // Update user profile based on session results
      await this.updateUserProfile(sessionData);
    } catch (error) {
      console.error('Error recording focus session:', error);
    }
  }

  private async updateUserProfile(sessionData: any): Promise<void> {
    try {
      const currentProfile = await this.getUserFocusProfile();

      // Update attention span based on successful completions
      if (sessionData.completed && sessionData.distractions <= 2) {
        const newAttentionSpan = Math.min(60,
          (currentProfile.attentionSpan * 0.9) + (sessionData.actualDuration * 0.1)
        );
        currentProfile.attentionSpan = newAttentionSpan;
      }

      // Update circadian peaks based on successful sessions
      if (sessionData.completed && sessionData.distractions <= 1) {
        if (!currentProfile.circadianPeaks.includes(sessionData.hour)) {
          currentProfile.circadianPeaks.push(sessionData.hour);
          // Keep only top 5 peak hours
          currentProfile.circadianPeaks = currentProfile.circadianPeaks
            .slice(-5);
        }
      }

      // Save updated profile
      const preferences = await this.storage.getUserPreferences();
      await this.storage.saveUserPreferences({
        ...preferences,
        focusTimer: currentProfile
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
    }
  }

  async getPersonalizedRecommendations(): Promise<string[]> {
    try {
      const profile = await this.getUserFocusProfile();
      const currentHour = new Date().getHours();
      const recommendations: string[] = [];
      // Time-based recommendations
      if (profile.circadianPeaks.includes(currentHour)) {
        recommendations.push('Perfect timing! This is one of your peak focus hours');
        recommendations.push('Consider a longer session to maximize your natural energy');
      } else if (this.isLowEnergyTime(currentHour)) {
        recommendations.push('Energy levels may be lower now - try shorter sessions');
        recommendations.push('Consider a brief walk or stretch before focusing');
      }

      // Attention span recommendations
      if (profile.attentionSpan < 20) {
        recommendations.push('Build focus gradually with shorter sessions');
        recommendations.push('Celebrate small wins to build momentum');
      } else if (profile.attentionSpan > 40) {
        recommendations.push('Your attention span is excellent - try deep work sessions');
        recommendations.push('Consider tackling your most challenging tasks');
      }

      // Distraction-based recommendations
      if (this.isHighDistractionTime(profile, currentHour)) {
        recommendations.push('High distraction period - try micro-focus sessions');
        recommendations.push('Put your phone in another room for better focus');
      }

      return recommendations.length > 0 ? recommendations : [
        'Start with a session that feels comfortable',
        'Consistency is more important than duration'
      ];
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return ['Focus on building consistent habits'];
    }
  }

  async getOptimalBreakDuration(sessionDuration: number): Promise<number> {
    try {
      const profile = await this.getUserFocusProfile();

      // Calculate break based on session length and user preferences
      if (sessionDuration <= 15) {
        return 3; // Short break for micro sessions
      } else if (sessionDuration <= 30) {
        return profile.breakPreferences.shortBreak;
      } else {
        return profile.breakPreferences.longBreak;
      }
    } catch (error) {
      // Default break calculation
      return Math.max(3, Math.min(15, Math.round(sessionDuration * 0.2)));
    }
  }
}
