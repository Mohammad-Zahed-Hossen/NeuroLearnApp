/**
 * Enhanced AICoachingService - Notion Integration Extension
 *
 * Adds Notion reflection capabilities to the existing AICoachingService
 * Automatically pushes AI-generated insights to Notion databases
 *
 * This file extends the existing AICoachingService with Notion integration
 */

import NotionSyncService from '../integrations/NotionSyncService';
import { supabase } from '../storage/SupabaseService';

// Types for Notion integration
interface NotionReflectionData {
  sessionId: string;
  sessionType: 'focus' | 'reading' | 'logic' | 'flashcard' | 'general';
  reflectionText: string;
  keyInsights: string[];
  metrics: {
    duration?: number;
    performance?: number;
    cognitiveLoad?: number;
    [key: string]: any;
  };
  recommendations?: string[];
}

interface NotionInsightPayload {
  type: string;
  content: string;
  metadata: {
    session_id: string;
    session_type: string;
    generated_at: string;
    metrics: any;
    insights: string[];
    recommendations?: string[];
    confidence_score?: number;
  };
}

/**
 * Enhanced AI Coaching Service Extension for Notion Integration
 *
 * This class extends the existing AICoachingService with Notion-specific
 * functionality for pushing reflections and insights
 */
export class AICoachingNotionExtension {
  private notionSync: NotionSyncService;
  private enabled: boolean = true;

  constructor() {
    this.notionSync = NotionSyncService.getInstance();
    this.checkNotionConnection();
  }

  private async checkNotionConnection(): Promise<void> {
    this.enabled = this.notionSync.isConnected();
    console.log(`🔗 Notion integration ${this.enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Push AI reflection to Notion after a learning session
   */
  public async pushReflectionToNotion(reflectionData: NotionReflectionData): Promise<{
    success: boolean;
    pageId?: string;
    error?: string;
  }> {
    if (!this.enabled) {
      console.log('⚠️ Notion integration disabled, skipping reflection push');
      return { success: false, error: 'Notion not connected' };
    }

    try {
      console.log(`💭 Pushing ${reflectionData.sessionType} reflection to Notion...`);

      // Format the reflection content
      const formattedContent = this.formatReflectionContent(reflectionData);

      // Prepare the insight payload
      const insightPayload: NotionInsightPayload = {
        type: this.getReflectionType(reflectionData.sessionType),
        content: formattedContent,
        metadata: {
          session_id: reflectionData.sessionId,
          session_type: reflectionData.sessionType,
          generated_at: new Date().toISOString(),
          metrics: reflectionData.metrics,
          insights: reflectionData.keyInsights,
          ...(reflectionData.recommendations ? { recommendations: reflectionData.recommendations } : {}),
          ...(this.calculateConfidenceScore(reflectionData) ? { confidence_score: this.calculateConfidenceScore(reflectionData) } : {})
        }
      };

      // Push to Notion
      const result = await this.notionSync.pushInsightsToNotion(
        insightPayload.type,
        insightPayload.content,
        insightPayload.metadata
      );

        if (result.success) {
        console.log('✅ Reflection successfully pushed to Notion:', result.pageId);

        // Store local reference
        await this.storeNotionReflectionReference(reflectionData.sessionId, result.pageId ?? '');

        return { success: true, ...(result.pageId ? { pageId: result.pageId } : {}) };
        } else {
          console.error('❌ Failed to push reflection to Notion:', result.error);
          return { success: false, error: result.error ?? 'Unknown error' };
        }

    } catch (error) {
      console.error('❌ Error pushing reflection to Notion:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate and push automatic session summary to Notion
   */
  public async generateAndPushSessionSummary(
    sessionId: string,
    sessionType: string,
    sessionData: any
  ): Promise<{ success: boolean; pageId?: string; error?: string }> {
    try {
      console.log(`📝 Generating session summary for ${sessionType} session: ${sessionId}`);

      // Generate AI reflection based on session data
      const reflection = await this.generateSessionReflection(sessionType, sessionData);

      const reflectionData: NotionReflectionData = {
        sessionId,
        sessionType: sessionType as any,
        reflectionText: reflection.text,
        keyInsights: reflection.insights,
        metrics: this.extractSessionMetrics(sessionData),
        recommendations: reflection.recommendations
      };

      // Push to Notion
      return await this.pushReflectionToNotion(reflectionData);

    } catch (error) {
      console.error('❌ Error generating session summary:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate summary'
      };
    }
  }

  /**
   * Push daily learning insights to Notion
   */
  public async pushDailyInsights(
    date: Date,
    insights: {
      totalFocusTime: number;
      sessionsCompleted: number;
      topPerformingAreas: string[];
      areasForImprovement: string[];
      cognitivePatterns: any;
      recommendations: string[];
    }
  ): Promise<{ success: boolean; pageId?: string; error?: string }> {
    if (!this.enabled) {
      return { success: false, error: 'Notion not connected' };
    }

    try {
      console.log(`📊 Pushing daily insights for ${date.toLocaleDateString()}...`);

      const insightText = this.formatDailyInsights(insights);
      const insightType = 'Daily Learning Summary';

      const result = await this.notionSync.pushInsightsToNotion(
        insightType,
        insightText,
        {
          date: date.toISOString(),
          insights_type: 'daily_summary',
          metrics: insights,
          generated_at: new Date().toISOString()
        }
      );

      if (result.success) {
        console.log('✅ Daily insights pushed to Notion:', result.pageId);
      }

      return result;

    } catch (error) {
      console.error('❌ Error pushing daily insights:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to push insights'
      };
    }
  }

  /**
   * Create Notion page for weekly learning review
   */
  public async createWeeklyReview(
    weekStartDate: Date,
    weeklyData: {
      totalSessions: number;
      totalFocusTime: number;
      averagePerformance: number;
      topConcepts: string[];
      challengingAreas: string[];
      improvements: string[];
      goals: string[];
    }
  ): Promise<{ success: boolean; pageId?: string; error?: string }> {
    if (!this.enabled) {
      return { success: false, error: 'Notion not connected' };
    }

    try {
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 6);

      const reviewText = this.formatWeeklyReview(weekStartDate, weekEndDate, weeklyData);
      const reviewType = 'Weekly Learning Review';

      const result = await this.notionSync.pushInsightsToNotion(
        reviewType,
        reviewText,
        {
          week_start: weekStartDate.toISOString(),
          week_end: weekEndDate.toISOString(),
          review_type: 'weekly_summary',
          metrics: weeklyData,
          generated_at: new Date().toISOString()
        }
      );

      return result;

    } catch (error) {
      console.error('❌ Error creating weekly review:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create review'
      };
    }
  }

  // ==============================
  // PRIVATE HELPER METHODS
  // ==============================

  private formatReflectionContent(data: NotionReflectionData): string {
    const { sessionType, reflectionText, keyInsights, metrics, recommendations } = data;

    let content = `# ${this.getSessionTypeDisplayName(sessionType)} Session Reflection\n\n`;

    // Add session metadata
    content += `**Session Date:** ${new Date().toLocaleDateString()}\n`;
    content += `**Session ID:** ${data.sessionId}\n\n`;

    // Add main reflection
    content += `## AI Reflection\n\n${reflectionText}\n\n`;

    // Add key insights
    if (keyInsights.length > 0) {
      content += `## Key Insights\n\n`;
      keyInsights.forEach((insight, index) => {
        content += `${index + 1}. ${insight}\n`;
      });
      content += '\n';
    }

    // Add metrics if available
    if (Object.keys(metrics).length > 0) {
      content += `## Session Metrics\n\n`;

      if (metrics.duration) {
        content += `- **Duration:** ${Math.round(metrics.duration / 60)} minutes\n`;
      }
      if (metrics.performance) {
        content += `- **Performance Score:** ${Math.round(metrics.performance * 100)}%\n`;
      }
      if (metrics.cognitiveLoad) {
        content += `- **Cognitive Load:** ${Math.round(metrics.cognitiveLoad * 100)}%\n`;
      }

      // Add other metrics
      Object.entries(metrics).forEach(([key, value]) => {
        if (!['duration', 'performance', 'cognitiveLoad'].includes(key)) {
          content += `- **${this.formatMetricName(key)}:** ${value}\n`;
        }
      });

      content += '\n';
    }

    // Add recommendations
    if (recommendations && recommendations.length > 0) {
      content += `## Recommendations\n\n`;
      recommendations.forEach((rec, index) => {
        content += `${index + 1}. ${rec}\n`;
      });
    }

    return content;
  }

  private formatDailyInsights(insights: any): string {
    let content = `# Daily Learning Summary - ${new Date().toLocaleDateString()}\n\n`;

    content += `## Overview\n\n`;
    content += `- **Total Focus Time:** ${Math.round(insights.totalFocusTime / 60)} minutes\n`;
    content += `- **Sessions Completed:** ${insights.sessionsCompleted}\n`;
    content += `- **Average Session Length:** ${Math.round((insights.totalFocusTime / insights.sessionsCompleted) / 60)} minutes\n\n`;

    if (insights.topPerformingAreas.length > 0) {
      content += `## Top Performing Areas\n\n`;
      insights.topPerformingAreas.forEach((area: string, index: number) => {
        content += `${index + 1}. ${area}\n`;
      });
      content += '\n';
    }

    if (insights.areasForImprovement.length > 0) {
      content += `## Areas for Improvement\n\n`;
      insights.areasForImprovement.forEach((area: string, index: number) => {
        content += `${index + 1}. ${area}\n`;
      });
      content += '\n';
    }

    if (insights.recommendations.length > 0) {
      content += `## AI Recommendations for Tomorrow\n\n`;
      insights.recommendations.forEach((rec: string, index: number) => {
        content += `${index + 1}. ${rec}\n`;
      });
    }

    return content;
  }

  private formatWeeklyReview(startDate: Date, endDate: Date, data: any): string {
    let content = `# Weekly Learning Review\n\n`;
    content += `**Week of:** ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}\n\n`;

    content += `## Summary Statistics\n\n`;
    content += `- **Total Sessions:** ${data.totalSessions}\n`;
    content += `- **Total Focus Time:** ${Math.round(data.totalFocusTime / 3600)} hours\n`;
    content += `- **Average Performance:** ${Math.round(data.averagePerformance * 100)}%\n`;
    content += `- **Daily Average:** ${Math.round(data.totalFocusTime / 7 / 60)} minutes/day\n\n`;

    content += `## Top Concepts Mastered\n\n`;
    data.topConcepts.forEach((concept: string, index: number) => {
      content += `${index + 1}. [[Concept: ${concept}]]\n`;
    });
    content += '\n';

    content += `## Challenging Areas\n\n`;
    data.challengingAreas.forEach((area: string, index: number) => {
      content += `${index + 1}. ${area}\n`;
    });
    content += '\n';

    content += `## Notable Improvements\n\n`;
    data.improvements.forEach((improvement: string, index: number) => {
      content += `${index + 1}. ${improvement}\n`;
    });
    content += '\n';

    content += `## Goals for Next Week\n\n`;
    data.goals.forEach((goal: string, index: number) => {
      content += `- [ ] ${goal}\n`;
    });

    return content;
  }

  private async generateSessionReflection(sessionType: string, sessionData: any): Promise<{
    text: string;
    insights: string[];
    recommendations: string[];
  }> {
    // This would integrate with your existing AI services to generate reflections
    // For now, providing a template-based approach

    const reflectionTemplates = {
      focus: {
        text: `Today's focus session showed ${this.getPerformanceDescription(sessionData.performance)}. You maintained concentration for ${Math.round(sessionData.duration / 60)} minutes, demonstrating ${this.getCognitiveDescription(sessionData.cognitiveLoad)}.`,
        insights: [
          `Peak performance occurred during ${this.getOptimalTimeDescription(sessionData)}`,
          `Cognitive load patterns suggest ${this.getCognitivePattern(sessionData)}`,
          `Session efficiency was ${this.getEfficiencyDescription(sessionData)}`
        ],
        recommendations: [
          `Consider ${this.getOptimizationSuggestion(sessionData)}`,
          `Your next session should focus on ${this.getNextFocusArea(sessionData)}`
        ]
      },
      // Add templates for other session types...
    };

    const template = reflectionTemplates[sessionType as keyof typeof reflectionTemplates] || reflectionTemplates.focus;

    return {
      text: template.text,
      insights: template.insights,
      recommendations: template.recommendations
    };
  }

  private extractSessionMetrics(sessionData: any): any {
    return {
      duration: sessionData.duration || 0,
      performance: sessionData.performance || 0,
      cognitiveLoad: sessionData.cognitiveLoad || 0,
      accuracy: sessionData.accuracy || 0,
      efficiency: sessionData.efficiency || 0,
      // Add more metrics as needed
    };
  }

  private calculateConfidenceScore(data: NotionReflectionData): number {
    // Simple confidence calculation based on data completeness
    let score = 0.5; // Base score

    if (data.keyInsights.length > 0) score += 0.2;
    if (data.recommendations && data.recommendations.length > 0) score += 0.1;
    if (Object.keys(data.metrics).length > 2) score += 0.1;
    if (data.reflectionText.length > 100) score += 0.1;

    return Math.min(score, 1.0);
  }

  private getReflectionType(sessionType: string): string {
    const typeMap: { [key: string]: string } = {
      focus: 'Focus Session Reflection',
      reading: 'Reading Session Analysis',
      logic: 'Logic Training Review',
      flashcard: 'Memory Training Summary',
      general: 'Learning Session Reflection'
    };

    return typeMap[sessionType] || 'Learning Reflection';
  }

  private getSessionTypeDisplayName(sessionType: string): string {
    const displayMap: { [key: string]: string } = {
      focus: 'Focus Training',
      reading: 'Speed Reading',
      logic: 'Logic Training',
      flashcard: 'Memory Training',
      general: 'General Learning'
    };

    return displayMap[sessionType] || 'Learning';
  }

  private formatMetricName(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  private async storeNotionReflectionReference(sessionId: string, notionPageId: string): Promise<void> {
    try {
      await supabase
        .from('session_notion_links')
        .insert({
          session_id: sessionId,
          notion_page_id: notionPageId,
          link_type: 'reflection',
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('⚠️ Failed to store Notion reflection reference:', error);
    }
  }

  // Placeholder methods for AI analysis (would be implemented with actual AI logic)
  private getPerformanceDescription(performance: number): string {
    if (performance > 0.8) return 'excellent focus and concentration';
    if (performance > 0.6) return 'good attention with some fluctuations';
    if (performance > 0.4) return 'moderate focus with room for improvement';
    return 'challenging focus that may benefit from shorter sessions';
  }

  private getCognitiveDescription(cognitiveLoad: number): string {
    if (cognitiveLoad > 0.8) return 'high cognitive engagement';
    if (cognitiveLoad > 0.6) return 'optimal cognitive load';
    if (cognitiveLoad > 0.4) return 'moderate mental effort';
    return 'light cognitive engagement';
  }

  private getOptimalTimeDescription(sessionData: any): string {
    // Placeholder - would analyze session data for optimal periods
    return 'the middle portion of your session';
  }

  private getCognitivePattern(sessionData: any): string {
    // Placeholder - would analyze cognitive load patterns
    return 'steady engagement with natural fluctuations';
  }

  private getEfficiencyDescription(sessionData: any): string {
    // Placeholder - would calculate session efficiency
    return 'above average for this type of session';
  }

  private getOptimizationSuggestion(sessionData: any): string {
    // Placeholder - would provide personalized optimization suggestions
    return 'slightly shorter sessions during this time of day';
  }

  private getNextFocusArea(sessionData: any): string {
    // Placeholder - would suggest next focus area based on performance
    return 'consolidating concepts from today\'s session';
  }
}

// Export singleton instance
export const aiCoachingNotionExtension = new AICoachingNotionExtension();

// Integration hook for existing AICoachingService
export const integrateNotionWithAICoaching = (aiCoachingService: any) => {
  // Add Notion methods to existing AI coaching service
  aiCoachingService.pushReflectionToNotion = aiCoachingNotionExtension.pushReflectionToNotion.bind(aiCoachingNotionExtension);
  aiCoachingService.generateAndPushSessionSummary = aiCoachingNotionExtension.generateAndPushSessionSummary.bind(aiCoachingNotionExtension);
  aiCoachingService.pushDailyInsights = aiCoachingNotionExtension.pushDailyInsights.bind(aiCoachingNotionExtension);
  aiCoachingService.createWeeklyReview = aiCoachingNotionExtension.createWeeklyReview.bind(aiCoachingNotionExtension);

  console.log('✅ Notion integration added to AI Coaching Service');

  return aiCoachingService;
};
