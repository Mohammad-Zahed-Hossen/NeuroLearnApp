import { z } from 'zod';
import { Task } from '../../../types';

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  content: z.string().optional().or(z.string()),
  description: z.string().optional(),
  completed: z.boolean().optional(),
  isCompleted: z.boolean().optional().default(false),
  priority: z.number().int().min(0).max(10).optional().default(1),
  due: z
    .object({ date: z.string(), timezone: z.string().optional() })
    .optional()
    .nullable(),
  dueDate: z.preprocess((arg) => {
    if (typeof arg === 'string' || arg instanceof Date) return new Date(arg as any);
    return arg;
  }, z.date().optional()),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional(),
  created: z.preprocess((arg) => new Date(arg as any), z.date()),
  modified: z.preprocess((arg) => (arg ? new Date(arg as any) : undefined), z.date().optional()),
  todoistId: z.string().optional(),
  source: z.string().optional(),
  projectName: z.string().optional(),
  focusTime: z.number().optional(),
  estimatedMinutes: z.number().optional(),
});

export type TaskValidated = z.infer<typeof TaskSchema> & Task;

export function validateTask(obj: any): TaskValidated | null {
  try {
    return TaskSchema.parse(obj) as TaskValidated;
  } catch (e) {
    // be forgiving: log and return null for callers to handle
    // In production, we could attempt to coerce or sanitize further
    // eslint-disable-next-line no-console
    console.warn('Task validation failed', e);
    return null;
  }
}
