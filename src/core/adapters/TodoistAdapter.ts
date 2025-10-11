/**
 * TodoistAdapter - Todoist Integration Adapter
 *
 * Adapter for integrating with Todoist API to sync tasks, projects,
 * and productivity data with the NeuroLearn learning ecosystem.
 */

import { Logger } from '../utils/Logger';
import TodoistService from '../../services/integrations/TodoistCompat';

export interface TodoistTask {
  id: string;
  content: string;
  description?: string;
  project_id: string;
  due?: {
    date: string;
    datetime?: string;
    recurring?: boolean;
  };
  priority: number;
  labels: string[];
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  cognitiveLoad?: number;
  estimatedDuration?: number;
}

export interface TodoistProject {
  id: string;
  name: string;
  comment_count: number;
  order: number;
  color: string;
  shared: boolean;
  favorite: boolean;
  tasks: TodoistTask[];
}

export interface TodoistSyncConfig {
  enableAutoSync: boolean;
  syncInterval: number; // minutes
  syncProjects: string[];
  enableCognitiveMapping: boolean;
  enableLearningCorrelation: boolean;
}

/**
 * Todoist Adapter
 *
 * Provides unified access to Todoist for task and project management.
 */
export class TodoistAdapter {
  private logger: Logger;
  private todoistService: any;
  private config: TodoistSyncConfig;

  private isInitialized = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private connectedProjects: Map<string, TodoistProject> = new Map();
  private cognitiveTaskMap: Map<string, number> = new Map();

  constructor(config?: Partial<TodoistSyncConfig>) {
    this.logger = new Logger('TodoistAdapter');
    this.config = {
      enableAutoSync: true,
      syncInterval: 15, // 15 minutes
      syncProjects: [],
      enableCognitiveMapping: true,
      enableLearningCorrelation: true,
      ...config
    };
  }

  /**
   * Initialize the Todoist adapter
   */
  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Todoist Adapter...');

      // Initialize Todoist service
      this.todoistService = TodoistService.getInstance();
      await this.todoistService.initialize();

      // Load projects
      await this.loadProjects();

      // Start auto-sync if enabled
      if (this.config.enableAutoSync) {
        this.startAutoSync();
      }

      this.isInitialized = true;
      this.logger.info('Todoist Adapter initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize Todoist Adapter', error);
      throw error;
    }
  }

  /**
   * Create learning-related task
   */
  public async createLearningTask(taskData: {
    content: string;
    description?: string;
    dueDate?: Date;
    priority?: number;
    labels?: string[];
    cognitiveLoad?: number;
    sessionType?: string;
  }): Promise<TodoistTask> {
    if (!this.isInitialized) {
      throw new Error('TodoistAdapter not initialized');
    }

    try {
      const task = await this.todoistService.createTask({
        content: taskData.content,
        description: taskData.description,
        due: taskData.dueDate ? {
          date: taskData.dueDate.toISOString().split('T')[0]
        } : undefined,
        priority: taskData.priority || 2,
        labels: [
          ...(taskData.labels || []),
          'neurolearn',
          taskData.sessionType || 'learning'
        ]
      });

      const mappedTask = this.mapToTodoistTask(task);

      // Store cognitive load mapping if enabled
      if (this.config.enableCognitiveMapping && taskData.cognitiveLoad) {
        this.cognitiveTaskMap.set(mappedTask.id, taskData.cognitiveLoad);
        mappedTask.cognitiveLoad = taskData.cognitiveLoad;
      }

      this.logger.info('Learning task created in Todoist', { taskId: mappedTask.id });
      return mappedTask;

    } catch (error) {
      this.logger.error('Failed to create learning task in Todoist', error);
      throw error;
    }
  }

  /**
   * Update task completion with learning correlation
   */
  public async completeTask(taskId: string, completionData?: {
    actualDuration?: number;
    difficulty?: number;
    satisfaction?: number;
  }): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('TodoistAdapter not initialized');
    }

    try {
      await this.todoistService.closeTask(taskId);

      // Store completion data for learning correlation
      if (this.config.enableLearningCorrelation && completionData) {
        await this.storeTaskCompletionData(taskId, completionData);
      }

      this.logger.info('Task completed in Todoist', { taskId });

    } catch (error) {
      this.logger.error('Failed to complete task in Todoist', error);
      throw error;
    }
  }

  /**
   * Get tasks related to learning
   */
  public async getLearningTasks(filters?: {
    projectId?: string;
    completed?: boolean;
    dueWithin?: number; // days
    priority?: number;
  }): Promise<TodoistTask[]> {
    if (!this.isInitialized) {
      throw new Error('TodoistAdapter not initialized');
    }

    try {
      let tasks: any[] = await this.todoistService.getTasks({
        label: 'neurolearn',
        ...filters
      });

      // Map tasks and add cognitive load data
      const learningTasks = tasks.map((task: any) => {
        const mappedTask = this.mapToTodoistTask(task);
        const cognitiveLoad = this.cognitiveTaskMap.get(mappedTask.id);

        if (cognitiveLoad) {
          mappedTask.cognitiveLoad = cognitiveLoad;
        }

        return mappedTask;
      });

      return learningTasks;

    } catch (error) {
      this.logger.error('Failed to get learning tasks from Todoist', error);
      return [];
    }
  }

  /**
   * Sync task completion with learning session
   */
  public async correlateTaskWithLearningSession(
    taskId: string,
    sessionData: any
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('TodoistAdapter not initialized');
    }

    try {
      // Update task with learning session correlation
      const task = await this.todoistService.getTask(taskId);

      if (task) {
        const updatedDescription = `${task.description || ''}\n\n--- Learning Session Correlation ---\nSession Type: ${sessionData.type}\nPerformance: ${sessionData.performance}\nDuration: ${sessionData.duration}ms\nCompleted: ${new Date().toISOString()}`;

        await this.todoistService.updateTask(taskId, {
          description: updatedDescription
        });

        // Store correlation data
        await this.storeTaskSessionCorrelation(taskId, sessionData);
      }

    } catch (error) {
      this.logger.error('Failed to correlate task with learning session', error);
    }
  }

  /**
   * Get productivity insights from Todoist data
   */
  public async getProductivityInsights(timeframe: string = '30d'): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('TodoistAdapter not initialized');
    }

    try {
      const tasks = await this.getLearningTasks();
      const completedTasks = tasks.filter(task => task.completed);
      const cutoffDate = this.getTimeframeCutoff(timeframe);

      const recentTasks = tasks.filter(task =>
        task.createdAt >= cutoffDate
      );

      const recentCompleted = completedTasks.filter(task =>
        task.updatedAt >= cutoffDate
      );

        const insights: {
          totalTasks: number;
          completedTasks: number;
          completionRate: number;
          averagePriority: number;
          cognitiveLoadAverage: number;
          productivityTrends: any;
          timeDistribution: any;
        } = {
          totalTasks: recentTasks.length,
          completedTasks: recentCompleted.length,
          completionRate: recentTasks.length > 0 ? recentCompleted.length / recentTasks.length : 0,
          averagePriority: recentTasks.reduce((sum, task) => sum + task.priority, 0) / recentTasks.length,
          cognitiveLoadAverage: this.calculateAverageCognitiveLoad(recentTasks),
          productivityTrends: await this.calculateProductivityTrends(recentTasks),
          timeDistribution: this.calculateTimeDistribution(recentTasks)
        };

      return insights;

    } catch (error) {
      this.logger.error('Failed to get productivity insights', error);
      return null;
    }
  }

  /**
   * Create project for learning activities
   */
  public async createLearningProject(projectData: {
    name: string;
    color?: string;
    favorite?: boolean;
  }): Promise<TodoistProject> {
    if (!this.isInitialized) {
      throw new Error('TodoistAdapter not initialized');
    }

    try {
      const project = await this.todoistService.createProject({
        name: `[NeuroLearn] ${projectData.name}`,
        color: projectData.color || 'blue',
        favorite: projectData.favorite || false
      });

      const mappedProject = this.mapToTodoistProject(project);
      this.connectedProjects.set(mappedProject.id, mappedProject);

      this.logger.info('Learning project created in Todoist', { projectId: mappedProject.id });
      return mappedProject;

    } catch (error) {
      this.logger.error('Failed to create learning project in Todoist', error);
      throw error;
    }
  }

  /**
   * Force synchronization with Todoist
   */
  public async forceSync(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('TodoistAdapter not initialized');
    }

    try {
      this.logger.info('Starting forced Todoist synchronization...');

      // Reload all projects and tasks
      await this.loadProjects();

      // Sync cognitive load mappings
      if (this.config.enableCognitiveMapping) {
        await this.syncCognitiveLoadMappings();
      }

      this.logger.info('Forced Todoist synchronization completed');

    } catch (error) {
      this.logger.error('Failed to force sync with Todoist', error);
      throw error;
    }
  }

  /**
   * Shutdown the adapter
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down Todoist Adapter...');

    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    this.isInitialized = false;
    this.logger.info('Todoist Adapter shutdown completed');
  }

  // Private Methods

  private async loadProjects(): Promise<void> {
    try {
      const projects = await this.todoistService.getProjects();

      for (const project of projects) {
        const mappedProject = this.mapToTodoistProject(project);

        // Load tasks for this project
        const tasks: any[] = await this.todoistService.getTasks({ project_id: project.id });
        mappedProject.tasks = tasks.map((task: any) => this.mapToTodoistTask(task));

        this.connectedProjects.set(mappedProject.id, mappedProject);
      }

      this.logger.info(`Loaded ${projects.length} projects from Todoist`);

    } catch (error) {
      this.logger.error('Failed to load projects from Todoist', error);
    }
  }

  private startAutoSync(): void {
    this.syncTimer = setInterval(async () => {
      try {
        await this.performAutoSync();
      } catch (error) {
        this.logger.warn('Auto-sync failed', error);
      }
    }, this.config.syncInterval * 60 * 1000);
  }

  private async performAutoSync(): Promise<void> {
    this.logger.debug('Performing automatic Todoist sync...');

    // Sync project updates
    await this.loadProjects();

    // Sync cognitive load mappings
    if (this.config.enableCognitiveMapping) {
      await this.syncCognitiveLoadMappings();
    }
  }

  private async syncCognitiveLoadMappings(): Promise<void> {
    // Sync cognitive load data for tasks
    // This would typically involve storing/retrieving from local storage
    this.logger.debug('Syncing cognitive load mappings...');
  }

  private async storeTaskCompletionData(taskId: string, completionData: any): Promise<void> {
    // Store completion data for learning correlation
    // This would integrate with your storage system
    this.logger.debug(`Storing completion data for task ${taskId}`, completionData);
  }

  private async storeTaskSessionCorrelation(taskId: string, sessionData: any): Promise<void> {
    // Store correlation between task and learning session
    this.logger.debug(`Storing session correlation for task ${taskId}`, sessionData);
  }

  private calculateAverageCognitiveLoad(tasks: TodoistTask[]): number {
    const tasksWithLoad = tasks.filter(task => task.cognitiveLoad !== undefined);

    if (tasksWithLoad.length === 0) return 0;

    return tasksWithLoad.reduce((sum, task) => sum + (task.cognitiveLoad || 0), 0) / tasksWithLoad.length;
  }

  private async calculateProductivityTrends(tasks: TodoistTask[]): Promise<any> {
    // Calculate productivity trends based on task completion patterns
    const now = new Date();
    const trends: { daily: any[]; weekly: any[]; monthly: any[] } = {
      daily: [],
      weekly: [],
      monthly: []
    };

    // Group tasks by completion date and calculate trends
    const completedTasks = tasks.filter(task => task.completed);

    // Daily trend (last 30 days)
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayTasks = completedTasks.filter(task =>
        task.updatedAt.toDateString() === date.toDateString()
      );

      trends.daily.push({
        date: date.toISOString().split('T')[0],
        completed: dayTasks.length,
        averagePriority: dayTasks.length > 0 ?
          dayTasks.reduce((sum: number, task: any) => sum + task.priority, 0) / dayTasks.length : 0
      });
    }

    return trends;
  }

  private calculateTimeDistribution(tasks: TodoistTask[]): any {
    const distribution: {
      byPriority: Record<number, number>;
      byLabels: Record<string, number>;
      byProject: Record<string, number>;
    } = {
      byPriority: { 1: 0, 2: 0, 3: 0, 4: 0 },
      byLabels: {} as Record<string, number>,
      byProject: {} as Record<string, number>
    };

    tasks.forEach((task: TodoistTask) => {
      // Priority distribution
      distribution.byPriority[task.priority] = (distribution.byPriority[task.priority] || 0) + 1;

      // Label distribution
      task.labels.forEach(label => {
        distribution.byLabels[label] = (distribution.byLabels[label] || 0) + 1;
      });

      // Project distribution
      distribution.byProject[task.project_id] = (distribution.byProject[task.project_id] || 0) + 1;
    });

    return distribution;
  }

  private mapToTodoistTask(todoistTask: any): TodoistTask {
    return {
      id: todoistTask.id,
      content: todoistTask.content,
      description: todoistTask.description,
      project_id: todoistTask.project_id,
      due: todoistTask.due,
      priority: todoistTask.priority,
      labels: todoistTask.labels || [],
      completed: todoistTask.completed || false,
      createdAt: new Date(todoistTask.created_at || todoistTask.created || Date.now()),
      updatedAt: new Date(todoistTask.updated_at || todoistTask.updated || Date.now())
    };
  }

  private mapToTodoistProject(todoistProject: any): TodoistProject {
    return {
      id: todoistProject.id,
      name: todoistProject.name,
      comment_count: todoistProject.comment_count || 0,
      order: todoistProject.order || 0,
      color: todoistProject.color || 'grey',
      shared: todoistProject.shared || false,
      favorite: todoistProject.favorite || false,
      tasks: []
    };
  }

  private getTimeframeCutoff(timeframe: string): Date {
    const now = new Date();
    const match = timeframe.match(/(\d+)([hdwmy])/);

    if (!match) return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30 days

    const [, amount, unit] = match;
    const num = parseInt(amount);

    switch (unit) {
      case 'h': return new Date(now.getTime() - num * 60 * 60 * 1000);
      case 'd': return new Date(now.getTime() - num * 24 * 60 * 60 * 1000);
      case 'w': return new Date(now.getTime() - num * 7 * 24 * 60 * 60 * 1000);
      case 'm': return new Date(now.getTime() - num * 30 * 24 * 60 * 60 * 1000);
      case 'y': return new Date(now.getTime() - num * 365 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }
}

export default TodoistAdapter;
