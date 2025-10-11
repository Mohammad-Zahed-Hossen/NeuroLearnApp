import { z } from 'zod';
import { MemoryPalace, MemoryLocation, MemoryItem } from '../../../types';

const MemoryItemSchema = z.object({
  id: z.string().optional(),
  content: z.string().optional(),
  position: z.number().optional(),
  association: z.string().optional(),
  imageUrl: z.string().optional(),
  recalled: z.boolean().optional(),
  lastRecalled: z.preprocess((arg) => (arg ? new Date(arg as any) : undefined), z.date().optional()),
  visualization: z.string().optional(),
  created: z.preprocess((arg) => (arg ? new Date(arg as any) : new Date()), z.date()).optional(),
  reviewCount: z.number().optional(),
  mastered: z.boolean().optional(),
});

const MemoryLocationSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  items: z.array(MemoryItemSchema).optional(),
  position: z.number().optional(),
  imageUrl: z.string().optional(),
  description: z.string().optional(),
  order: z.number().optional(),
});

export const MemoryPalaceSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  rooms: z.array(z.any()).optional(),
  locations: z.array(MemoryLocationSchema).optional(),
  created: z.preprocess((arg) => (arg ? new Date(arg as any) : new Date()), z.date()).optional(),
  modified: z.preprocess((arg) => (arg ? new Date(arg as any) : undefined), z.date().optional()),
  isActive: z.boolean().optional(),
  totalItems: z.number().optional(),
  category: z.string().optional(),
  masteredItems: z.number().optional(),
  lastStudied: z.preprocess((arg) => (arg ? new Date(arg as any) : undefined), z.date().optional()),
});

export type MemoryPalaceValidated = z.infer<typeof MemoryPalaceSchema> & MemoryPalace;

export function validateMemoryPalace(obj: any): MemoryPalaceValidated | null {
  try {
    return MemoryPalaceSchema.parse(obj) as MemoryPalaceValidated;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('MemoryPalace validation failed', e);
    return null;
  }
}
