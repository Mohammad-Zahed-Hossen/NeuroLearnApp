import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '../../types';
import HybridStorageService from '../storage/HybridStorageService';
import { FocusSession, DistractionEvent } from '../storage/StorageService';

/**
 * Phase 5 Enhancement: TodoistService with Focus Timer Integration
 *
 * Adds adaptive focus session tracking and task convergence
 * Ensures external to-do list aligns with internal learning goals
 */

export class TodoistService {
  private static instance: TodoistService;
  private apiToken: string = '';
  private baseURL = 'https://api.todoist.com/rest/v2';
  private storageService: HybridStorageService;

  // Phase 5: Focus session management
  private taskTimerActiveMap: Map<string, boolean> = new Map();
  private activeFocusSession: FocusSession | null = null;
  private focusSessionHistory: FocusSession[] = [];

  private constructor() {
    this.storageService = HybridStorageService.getInstance();
    this.loadFocusHistory();
  }

  private async loadFocusHistory(): Promise<void> {
    try {
      // Load focus sessions from HybridStorageService (which uses Supabase as primary)
      const sessions = await this.storageService.getFocusSessions();
      this.focusSessionHistory = sessions.map((s: any) => ({
        ...s,
        startTime: new Date(s.startTime),
      }));
    } catch (error) {
      console.error('Error loading focus history:', error);
    }
  }

  private async loadApiToken(): Promise<void> {
    try {
      // Load settings from HybridStorageService (which uses Supabase as primary)
      const settings = await this.storageService.getSettings();
      const token = settings?.todoistToken;

      if (token) {
        this.apiToken = token;
        console.log('🔑 Todoist API token loaded from storage');
      } else {
        console.log('ℹ️ No Todoist API token found in storage');
      }
    } catch (error) {
      console.error('Error loading Todoist API token:', error);
    }
  }

  private async saveFocusHistory(): Promise<void> {
    try {
      // Save focus sessions using HybridStorageService (which uses Supabase as primary)
      await this.storageService.saveFocusSessions(this.focusSessionHistory);
    } catch (error) {
      console.error('Error saving focus history:', error);
    }
  }

  public static getInstance(): TodoistService {
    if (!TodoistService.instance) {
      TodoistService.instance = new TodoistService();
    }
    return TodoistService.instance;
  }

  setApiToken(token: string) {
    this.apiToken = token;
    // Save token to storage for persistence
    AsyncStorage.setItem('todoistApiToken', token).catch((error) =>
      console.error('Error saving Todoist API token:', error),
    );
  }

  private getAuthHeaders() {
    return {
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Test connection to Todoist API
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.apiToken) {
      return { success: false, message: 'No API token provided' };
    }

    try {
      const response = await axios.get(`${this.baseURL}/projects`, {
        headers: this.getAuthHeaders(),
        timeout: 10000,
      });

      if (response.status === 200) {
        return {
          success: true,
          message: `Connected successfully! Found ${response.data.length} projects.`,
        };
      } else {
        return { success: false, message: 'Unexpected response from Todoist' };
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        return { success: false, message: 'Invalid API token' };
      } else if (error.code === 'ENOTFOUND') {
        return { success: false, message: 'No internet connection' };
      } else {
        return {
          success: false,
          message: `Connection failed: ${error.message}`,
        };
      }
    }
  }

  /**
   * Get all tasks from Todoist
   */
  async getTasks(): Promise<Task[]> {
    if (!this.apiToken) {
      await this.loadApiToken();
      if (!this.apiToken) {
        // No token available, return empty array instead of throwing
        return [];
      }
    }

    try {
      const response = await axios.get(`${this.baseURL}/tasks`, {
        headers: this.getAuthHeaders(),
        timeout: 10000,
      });

      // Line ~110: Change 'title' to 'content'
      const tasks: Task[] = response.data.map((item: any) => ({
        id: item.id,
        content: item.content, // ✅ This is correct
        description: item.description || '',
        isCompleted: item.is_completed || false,
        priority: item.priority || 1,
        due: item.due?.date
          ? {
              // ✅ Change dueDate to due
              date: item.due.date,
              datetime: item.due.datetime,
            }
          : undefined,
        projectName: item.project_name || '', // ✅ Change projectId to projectName
        source: 'todoist' as const,
        labels: item.labels || [],
        created: new Date(item.created_at),
      }));

      console.log(`📋 Loaded ${tasks.length} tasks from Todoist`);
      return tasks;
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      throw new Error(`Failed to fetch tasks: ${error.message}`);
    }
  }

  /**
   * Complete a task in Todoist
   */
  async completeTask(taskId: string): Promise<boolean> {
    if (!this.apiToken) {
      console.warn('No API token - marking task as complete locally only');
      return true;
    }

    try {
      await axios.post(
        `${this.baseURL}/tasks/${taskId}/close`,
        {},
        {
          headers: this.getAuthHeaders(),
          timeout: 10000,
        },
      );

      console.log(`✅ Task ${taskId} marked as complete in Todoist`);
      return true;
    } catch (error: any) {
      console.error(`Error completing task ${taskId}:`, error);
      return false;
    }
  }

  /**
   * Delete a task in Todoist
   */
  async deleteTask(taskId: string): Promise<boolean> {
    if (!this.apiToken) {
      console.warn('No API token - cannot delete task in Todoist');
      return false;
    }

    try {
      await axios.delete(`${this.baseURL}/tasks/${taskId}`, {
        headers: this.getAuthHeaders(),
        timeout: 10000,
      });

      console.log(`🗑️ Task ${taskId} deleted from Todoist`);
      return true;
    } catch (error: any) {
      console.error(`Error deleting task ${taskId}:`, error);
      return false;
    }
  }

  /**
   * Update task in Todoist
   */
  async updateTask(taskId: string, updates: Partial<Task>): Promise<boolean> {
    if (!this.apiToken) {
      console.warn('No API token - cannot update task in Todoist');
      return false;
    }

    try {
      const updateData: any = {};

      if (updates.content) updateData.content = updates.content; // ✅ Changed from title
      if (updates.description) updateData.description = updates.description;
      if (updates.priority) updateData.priority = updates.priority;
      if (updates.due?.date) {
        // ✅ Changed from dueDate
        updateData.due_string = updates.due.date;
      }

      await axios.post(`${this.baseURL}/tasks/${taskId}`, updateData, {
        headers: this.getAuthHeaders(),
        timeout: 10000,
      });

      console.log(`Task ${taskId} updated in Todoist`);
      return true;
    } catch (error: any) {
      console.error(`Error updating task ${taskId}:`, error);
      return false;
    }
  }

  /**
   * Create new task in Todoist
   */
  async createTask(task: Omit<Task, 'id' | 'created'>): Promise<string | null> {
    // ✅ Remove 'modified' from Omit
    if (!this.apiToken) {
      console.warn('No API token - cannot create task in Todoist');
      return null;
    }

    try {
      const taskData: any = {
        content: task.content, // ✅ Changed from title
        description: task.description || '',
        priority: task.priority || 1,
        labels: task.labels || [],
      };

      if (task.due?.date) {
        // ✅ Changed from dueDate
        taskData.due_string = task.due.date;
      }

      // Remove projectId reference since it doesn't exist in Task interface

      const response = await axios.post(`${this.baseURL}/tasks`, taskData, {
        headers: this.getAuthHeaders(),
        timeout: 10000,
      });

      const taskId = response.data.id;
      console.log(`Task created in Todoist with ID: ${taskId}`);
      return taskId;
    } catch (error: any) {
      console.error('Error creating task:', error);
      return null;
    }
  }

  /**
   * Phase 5, Step 1: Start Focus Timer Session
   *
   * This is the KEY method that begins adaptive focus sessions
   * Links Todoist tasks with neural nodes for unified focus tracking
   */
  public async startTaskTimer(
    taskId: string,
    nodeId: string | undefined,
    plannedDuration: number,
    cognitiveLoad: number,
  ): Promise<FocusSession> {
    // End any existing session first
    if (this.activeFocusSession) {
      await this.endCurrentFocusSession(2, 'Session interrupted by new session');
    }

    const now = new Date();
    // Create new focus session
    const session: FocusSession = {
      id: `focus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      taskId,
      nodeId,
      startTime: now,
      endTime: now, // Will be updated when session ends
      durationMinutes: 0, // Will be updated when session ends
      plannedDurationMinutes: plannedDuration,
      distractionCount: 0,
      distractionEvents: [],
      selfReportFocus: 3, // Default neutral
      completionRate: 0, // Will be updated when session ends
      cognitiveLoadStart: cognitiveLoad,
      focusLockUsed: false,
      created: now,
      modified: now,
    };

    // Set active session
    this.activeFocusSession = session;
    this.taskTimerActiveMap.set(taskId, true);

    console.log(`🎯 Focus session started:`, {
      taskId,
      nodeId,
      duration: plannedDuration,
      cognitiveLoad,
      sessionId: session.id,
    });

    return session;
  }

  /**
   * Check if task timer is currently active
   */
  public isTaskTimerActive(taskId: string): boolean {
    return this.taskTimerActiveMap.get(taskId) || false;
  }

  /**
   * Get current active focus session
   */
  public getActiveFocusSession(): FocusSession | null {
    return this.activeFocusSession;
  }

  /**
   * Stop current focus timer session
   */
  public async stopTaskTimer(
    taskId: string,
    selfReportFocus: 1 | 2 | 3 | 4 | 5 = 3,
    distractionReason?: string,
  ): Promise<FocusSession | null> {
    if (!this.activeFocusSession || this.activeFocusSession.taskId !== taskId) {
      console.warn(`No active focus session for task ${taskId}`);
      return null;
    }

    return await this.endCurrentFocusSession(selfReportFocus, distractionReason);
  }

  /**
   * End the current focus session with outcome tracking
   */
  private async endCurrentFocusSession(
    selfReportFocus: 1 | 2 | 3 | 4 | 5,
    distractionReason?: string,
  ): Promise<FocusSession | null> {
    if (!this.activeFocusSession) return null;

    const session = this.activeFocusSession;
    const now = new Date();

    // Calculate actual duration
    const actualDurationMs = now.getTime() - session.startTime.getTime();
    const actualDurationMinutes = Math.round(actualDurationMs / (1000 * 60));

    // Calculate completion rate (actual / planned)
    const completionRate = Math.min(actualDurationMinutes / session.plannedDurationMinutes, 1);

    // Update session with completion data
    const completedSession: FocusSession = {
      ...session,
      endTime: now,
      durationMinutes: actualDurationMinutes,
      selfReportFocus,
      completionRate,
      distractionReason,
      modified: now,
    };

    // Add to history
    this.focusSessionHistory.push(completedSession);
    await this.saveFocusHistory();

    // Clear active session
    this.activeFocusSession = null;
    this.taskTimerActiveMap.delete(session.taskId);

    console.log(`🏁 Focus session ended:`, {
      sessionId: session.id,
      taskId: session.taskId,
      selfReportFocus,
      planned: session.plannedDurationMinutes,
      actual: actualDurationMinutes,
      completionRate: Math.round(completionRate * 100) + '%',
    });

    return completedSession;
  }

  /**
   * Phase 5: Get focus session analytics
   *
   * Provides insights for adaptive timer adjustments
   */
  public getFocusSessionAnalytics(): {
    totalSessions: number;
    averageActualDuration: number;
    averagePlannedDuration: number;
    completionRate: number;
    avgCognitiveLoad: number;
    sessionsToday: number;
    mostProductiveTimeSlot: string;
    adaptiveRecommendations: string[];
  } {
    const sessions = this.focusSessionHistory;

    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        averageActualDuration: 0,
        averagePlannedDuration: 0,
        completionRate: 0,
        avgCognitiveLoad: 0.5,
        sessionsToday: 0,
        mostProductiveTimeSlot: 'morning',
        adaptiveRecommendations: [
          'Start your first focus session to build data',
        ],
      };
    }

    const completedSessions = sessions.filter((s) => s.completionRate >= 0.8);
    const totalSessions = sessions.length;
    const completionRate = completedSessions.length / totalSessions;

    const avgActual =
      sessions
        .filter((s) => s.durationMinutes)
        .reduce((sum, s) => sum + (s.durationMinutes || 0), 0) / sessions.length;

    const avgPlanned =
      sessions.reduce((sum, s) => sum + s.plannedDurationMinutes, 0) / sessions.length;

    const avgCognitiveLoad =
      sessions.reduce((sum, s) => sum + s.cognitiveLoadStart, 0) / sessions.length;

    // Today's sessions
    const today = new Date().toDateString();
    const sessionsToday = sessions.filter(
      (s) => s.startTime.toDateString() === today,
    ).length;

    // Time slot analysis (simplified)
    const hourCounts = new Map<number, number>();
    sessions.forEach((session) => {
      const hour = session.startTime.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    const mostActiveHour =
      Array.from(hourCounts.entries()).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      9;

    const mostProductiveTimeSlot =
      mostActiveHour < 12
        ? 'morning'
        : mostActiveHour < 17
        ? 'afternoon'
        : 'evening';

    // Generate adaptive recommendations
    const recommendations = this.generateAdaptiveRecommendations(
      completionRate,
      avgActual,
      avgPlanned,
      avgCognitiveLoad,
    );

    return {
      totalSessions,
      averageActualDuration: Math.round(avgActual),
      averagePlannedDuration: Math.round(avgPlanned),
      completionRate,
      avgCognitiveLoad,
      sessionsToday,
      mostProductiveTimeSlot,
      adaptiveRecommendations: recommendations,
    };
  }

  /**
   * Generate personalized focus recommendations based on session history
   */
  private generateAdaptiveRecommendations(
    completionRate: number,
    avgActual: number,
    avgPlanned: number,
    avgCognitiveLoad: number,
  ): string[] {
    const recommendations: string[] = [];

    // Completion rate insights
    if (completionRate < 0.6) {
      recommendations.push(
        '🎯 Try shorter focus sessions to build consistency',
      );
      recommendations.push(
        '⚡ Focus on single-task clarity before session start',
      );
    } else if (completionRate > 0.85) {
      recommendations.push(
        '🚀 Great focus discipline! Ready for longer sessions',
      );
    }

    // Duration insights
    const durationRatio = avgActual / avgPlanned;
    if (durationRatio < 0.8) {
      recommendations.push('⏰ Sessions ending early - check for distractions');
    } else if (durationRatio > 1.2) {
      recommendations.push(
        '🔥 Sessions running long - good flow state engagement',
      );
    }

    // Cognitive load insights
    if (avgCognitiveLoad > 0.7) {
      recommendations.push(
        '🧠 High cognitive load detected - prioritize easier tasks',
      );
      recommendations.push(
        '🌅 Consider morning sessions when mental energy is fresh',
      );
    } else if (avgCognitiveLoad < 0.3) {
      recommendations.push(
        '⚡ Low cognitive load - ready for challenging tasks',
      );
    }

    // Default recommendation
    if (recommendations.length === 0) {
      recommendations.push(
        '📈 Consistent focus patterns - maintain current approach',
      );
    }

    return recommendations.slice(0, 3); // Limit to 3 recommendations
  }

  /**
   * Phase 5: Get focus-ready tasks
   *
   * Returns tasks suitable for focus sessions based on priority and urgency
   */
  public async getFocusReadyTasks(): Promise<{
    urgent: Task[];
    important: Task[];
    quick: Task[];
    recommended: Task;
  }> {
    try {
      const allTasks = await this.getTasks();
      const incompleteTasks = allTasks.filter((task) => !task.isCompleted);

      // Fix dueDate references to use due.date
      const urgent = incompleteTasks
        .filter((task) => {
          if (!task.due?.date) return false;
          const daysUntilDue =
            (new Date(task.due.date).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24);
          return daysUntilDue <= 1;
        })
        .slice(0, 5);

      const important = incompleteTasks
        .filter((task) => task.priority >= 3)
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 5);

      const quick = incompleteTasks
        .filter((task) => {
          const title = task.content.toLowerCase(); // ✅ Changed from title to content
          return (
            title.includes('quick') ||
            title.includes('review') ||
            title.includes('check') ||
            title.length < 30
          );
        })
        .slice(0, 5);

      // Fix recommended task structure
      const recommended = urgent[0] ||
        important[0] ||
        incompleteTasks[0] || {
          id: 'no-tasks',
          content: 'No tasks available', // ✅ Changed from title to content
          description: 'Create a new task to start a focus session',
          isCompleted: false,
          priority: 1 as const,
          projectName: '',
          source: 'local' as const,
          created: new Date(),
        };

      return { urgent, important, quick, recommended };
    } catch (error) {
      console.error('Error getting focus-ready tasks:', error);
      return {
        urgent: [],
        important: [],
        quick: [],
        recommended: {
          id: 'error',
          content: 'Unable to load tasks', // ✅ Changed from title to content
          description: 'Check your Todoist connection',
          isCompleted: false,
          priority: 1 as const,
          projectName: '',
          source: 'local' as const,
          created: new Date(),
        },
      };
    }
  }

  /**
   * Clear focus session history (for testing/reset)
   */
  public async clearFocusHistory(): Promise<void> {
    this.focusSessionHistory = [];
    this.activeFocusSession = null;
    this.taskTimerActiveMap.clear();
    await this.saveFocusHistory();
    console.log('🗑️ Focus session history cleared');
  }
}

export default TodoistService;
