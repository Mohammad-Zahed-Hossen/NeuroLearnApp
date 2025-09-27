import axios from 'axios';
import { Task } from '../types';

export class TodoistService {
  private static instance: TodoistService;
  private apiToken: string = '';
  private baseURL = 'https://api.todoist.com/rest/v2';

  public static getInstance(): TodoistService {
    if (!TodoistService.instance) {
      TodoistService.instance = new TodoistService();
    }
    return TodoistService.instance;
  }

  setApiToken(token: string) {
    this.apiToken = token;
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
        return { success: false, message: 'Invalid response from Todoist API' };
      }
    } catch (error: any) {
      console.error('Todoist connection error:', error);

      if (error.response?.status === 401) {
        return {
          success: false,
          message: 'Invalid API token. Please check your Todoist token.',
        };
      } else if (error.response?.status === 403) {
        return {
          success: false,
          message: 'Access forbidden. Please verify your token permissions.',
        };
      } else if (error.code === 'ENOTFOUND' || error.code === 'NETWORK_ERROR') {
        return {
          success: false,
          message: 'Network error. Please check your internet connection.',
        };
      } else {
        return {
          success: false,
          message: `Connection failed: ${error.message || 'Unknown error'}`,
        };
      }
    }
  }

  /**
   * Fetch all tasks from Todoist
   */
  async getTasks(): Promise<Task[]> {
    if (!this.apiToken) {
      throw new Error('Todoist API token not set');
    }

    try {
      const response = await axios.get(`${this.baseURL}/tasks`, {
        headers: this.getAuthHeaders(),
        timeout: 15000,
      });

      return response.data.map((task: any) => ({
        id: `todoist_${task.id}`,
        content: task.content,
        isCompleted: task.is_completed || false,
        priority: this.mapTodoistPriority(task.priority),
        due: task.due
          ? {
              date: task.due.date,
              datetime: task.due.datetime,
            }
          : undefined,
        projectName: task.project_name || 'Inbox',
        source: 'todoist' as const,
        created: new Date(task.created_at),
        labels: task.labels || [],
        description: task.description || undefined,
      }));
    } catch (error: any) {
      console.error('Error fetching Todoist tasks:', error);
      throw new Error(`Failed to fetch tasks: ${error.message}`);
    }
  }

  /**
   * Create a new task in Todoist
   */
  async createTask(task: {
    content: string;
    description?: string;
    projectId?: string;
    priority?: number;
    dueDate?: string;
    labels?: string[];
  }): Promise<Task> {
    if (!this.apiToken) {
      throw new Error('Todoist API token not set');
    }

    try {
      const todoistTask = {
        content: task.content,
        description: task.description,
        project_id: task.projectId,
        priority: task.priority || 1,
        due_date: task.dueDate,
        labels: task.labels,
      };

      const response = await axios.post(`${this.baseURL}/tasks`, todoistTask, {
        headers: this.getAuthHeaders(),
        timeout: 10000,
      });

      const createdTask = response.data;
      return {
        id: `todoist_${createdTask.id}`,
        content: createdTask.content,
        isCompleted: createdTask.is_completed || false,
        priority: this.mapTodoistPriority(createdTask.priority),
        due: createdTask.due
          ? {
              date: createdTask.due.date,
              datetime: createdTask.due.datetime,
            }
          : undefined,
        projectName: createdTask.project_name || 'Inbox',
        source: 'todoist' as const,
        created: new Date(createdTask.created_at),
        labels: createdTask.labels || [],
      };
    } catch (error: any) {
      console.error('Error creating Todoist task:', error);
      throw new Error(`Failed to create task: ${error.message}`);
    }
  }

  /**
   * Update a task in Todoist
   */
  async updateTask(
    taskId: string,
    updates: {
      content?: string;
      description?: string;
      priority?: number;
      dueDate?: string;
      labels?: string[];
    },
  ): Promise<Task> {
    if (!this.apiToken) {
      throw new Error('Todoist API token not set');
    }

    // Extract the actual Todoist ID from our prefixed ID
    const actualTaskId = taskId.replace('todoist_', '');

    try {
      const todoistUpdates = {
        content: updates.content,
        description: updates.description,
        priority: updates.priority,
        due_date: updates.dueDate,
        labels: updates.labels,
      };

      // Remove undefined values
      Object.keys(todoistUpdates).forEach((key) => {
        if (todoistUpdates[key as keyof typeof todoistUpdates] === undefined) {
          delete todoistUpdates[key as keyof typeof todoistUpdates];
        }
      });

      const response = await axios.post(
        `${this.baseURL}/tasks/${actualTaskId}`,
        todoistUpdates,
        {
          headers: this.getAuthHeaders(),
          timeout: 10000,
        },
      );

      const updatedTask = response.data;
      return {
        id: `todoist_${updatedTask.id}`,
        content: updatedTask.content,
        isCompleted: updatedTask.is_completed || false,
        priority: this.mapTodoistPriority(updatedTask.priority),
        due: updatedTask.due
          ? {
              date: updatedTask.due.date,
              datetime: updatedTask.due.datetime,
            }
          : undefined,
        projectName: updatedTask.project_name || 'Inbox',
        source: 'todoist' as const,
        created: new Date(updatedTask.created_at),
        labels: updatedTask.labels || [],
      };
    } catch (error: any) {
      console.error('Error updating Todoist task:', error);
      throw new Error(`Failed to update task: ${error.message}`);
    }
  }

  /**
   * Complete a task in Todoist
   */
  async completeTask(taskId: string): Promise<void> {
    if (!this.apiToken) {
      throw new Error('Todoist API token not set');
    }

    const actualTaskId = taskId.replace('todoist_', '');

    try {
      await axios.post(
        `${this.baseURL}/tasks/${actualTaskId}/close`,
        {},
        {
          headers: this.getAuthHeaders(),
          timeout: 10000,
        },
      );
    } catch (error: any) {
      console.error('Error completing Todoist task:', error);
      throw new Error(`Failed to complete task: ${error.message}`);
    }
  }

  /**
   * Delete a task in Todoist
   */
  async deleteTask(taskId: string): Promise<void> {
    if (!this.apiToken) {
      throw new Error('Todoist API token not set');
    }

    const actualTaskId = taskId.replace('todoist_', '');

    try {
      await axios.delete(`${this.baseURL}/tasks/${actualTaskId}`, {
        headers: this.getAuthHeaders(),
        timeout: 10000,
      });
    } catch (error: any) {
      console.error('Error deleting Todoist task:', error);
      throw new Error(`Failed to delete task: ${error.message}`);
    }
  }

  /**
   * Get projects from Todoist
   */
  async getProjects(): Promise<
    Array<{ id: string; name: string; color: string }>
  > {
    if (!this.apiToken) {
      throw new Error('Todoist API token not set');
    }

    try {
      const response = await axios.get(`${this.baseURL}/projects`, {
        headers: this.getAuthHeaders(),
        timeout: 10000,
      });

      return response.data.map((project: any) => ({
        id: project.id,
        name: project.name,
        color: project.color,
      }));
    } catch (error: any) {
      console.error('Error fetching Todoist projects:', error);
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }
  }

  /**
   * Map Todoist priority (1-4) to our priority system (1-4)
   * Todoist: 1=normal, 2=high, 3=very high, 4=urgent
   * Our system: 1=low, 2=normal, 3=high, 4=urgent
   */
  private mapTodoistPriority(todoistPriority: number): 1 | 2 | 3 | 4 {
    switch (todoistPriority) {
      case 1:
        return 2; // normal -> normal
      case 2:
        return 3; // high -> high
      case 3:
        return 4; // very high -> urgent
      case 4:
        return 4; // urgent -> urgent
      default:
        return 2;
    }
  }

  /**
   * Map our priority system back to Todoist
   */
  private mapToTodoistPriority(ourPriority: 1 | 2 | 3 | 4): number {
    switch (ourPriority) {
      case 1:
        return 1; // low -> normal
      case 2:
        return 1; // normal -> normal
      case 3:
        return 2; // high -> high
      case 4:
        return 3; // urgent -> very high
      default:
        return 1;
    }
  }
}
