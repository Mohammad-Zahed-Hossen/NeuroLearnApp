/**
 * Todoist compatibility shim
 */
import TodoistService from './TodoistService';

const svcAny: any = (TodoistService as any).default || TodoistService;

const TodoistCompat: any = {
  async initialize() {
    if (typeof svcAny.initialize === 'function') return svcAny.initialize();
    return Promise.resolve();
  },
  async createTask(task: any) {
    if (typeof svcAny.createTask === 'function') return svcAny.createTask(task);
    if (typeof svcAny.addTask === 'function') return svcAny.addTask(task);
    return Promise.resolve({ id: 'task_mock', ...task });
  },
  async getTasks(filters?: any) {
    if (typeof svcAny.getTasks === 'function') return svcAny.getTasks(filters || {});
    return Promise.resolve([]);
  },
  async getTask(id: string) {
    if (typeof svcAny.getTask === 'function') return svcAny.getTask(id);
    if (typeof svcAny.getTasks === 'function') {
      const all = await svcAny.getTasks();
      return all.find((t: any) => t.id === id) || null;
    }
    return null;
  },
  async closeTask(id: string) {
    if (typeof svcAny.closeTask === 'function') return svcAny.closeTask(id);
    if (typeof svcAny.completeTask === 'function') return svcAny.completeTask(id);
    return Promise.resolve();
  },
  async createProject(project: any) {
    if (typeof svcAny.createProject === 'function') return svcAny.createProject(project);
    if (typeof svcAny.addProject === 'function') return svcAny.addProject(project);
    return Promise.resolve({ id: 'project_mock', ...project });
  },
  async getProjects() {
    if (typeof svcAny.getProjects === 'function') return svcAny.getProjects();
    return Promise.resolve([]);
  }
};

export default TodoistCompat;
