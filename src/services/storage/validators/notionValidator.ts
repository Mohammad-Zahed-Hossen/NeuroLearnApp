import { z } from 'zod';

// Notion API response validation schemas
export const NotionTokenSchema = z.object({
  access_token: z.string().regex(/^secret_[a-zA-Z0-9]{43}$|^ntn_[a-zA-Z0-9_]{50,}$/, {
    message: 'Invalid Notion token format'
  }),
  token_type: z.string().optional(),
  workspace_id: z.string().optional(),
  workspace_name: z.string().optional(),
  bot_id: z.string().optional(),
  owner: z.object({
    type: z.string(),
    user: z.object({
      object: z.string(),
      id: z.string(),
      name: z.string().nullable(),
      avatar_url: z.string().nullable(),
      type: z.string(),
      person: z.object({}).optional()
    }).optional()
  }).optional()
});

export const NotionPageSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/).refine((val) => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(val), {
    message: 'Invalid Notion page ID format'
  }),
  title: z.string().min(1).max(500).refine((val) => {
    // Sanitize title - remove potential script tags and excessive whitespace
    return !/<script|javascript:|data:/i.test(val) && val.trim().length > 0;
  }),
  url: z.string().url().optional().or(z.literal('')),
  pageType: z.enum(['page', 'database']),
  databaseId: z.string().regex(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/).optional().nullable(),
  lastEditedTime: z.string().datetime(),
  createdTime: z.string().datetime(),
  parentId: z.string().regex(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/).optional().nullable(),
  archived: z.boolean(),
  properties: z.record(z.string(), z.unknown()).optional(),
  contentPreview: z.string().max(500).optional()
});

export const NotionBlockSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/).refine((val) => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(val), {
    message: 'Invalid Notion block ID format'
  }),
  pageId: z.string().regex(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/),
  blockType: z.string().min(1).max(50),
  contentText: z.string().max(10000).refine((val) => {
    // Basic sanitization - remove potential script content
    return !/<script|javascript:|data:/i.test(val);
  }),
  richText: z.array(z.unknown()),
  parentBlockId: z.string().regex(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/).optional().nullable(),
  hasChildren: z.boolean(),
  blockOrder: z.number().int().min(0),
  properties: z.record(z.string(), z.unknown()).optional(),
  annotations: z.record(z.string(), z.unknown()).optional(),
  href: z.string().url().optional().nullable()
});

export const NotionLinkSchema = z.object({
  notionBlockId: z.string().regex(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/),
  neuralNodeId: z.string().min(1).max(100),
  linkType: z.enum(['concept_mapping', 'flashcard_source', 'task_reference', 'session_summary']),
  confidenceScore: z.number().min(0).max(1),
  autoLinked: z.boolean(),
  linkContext: z.string().max(500).refine((val) => {
    return !/<script|javascript:|data:/i.test(val);
  }),
  mentionText: z.string().max(200)
});

export const NotionAuthConfigSchema = z.object({
  token: z.string().regex(/^secret_[a-zA-Z0-9]{43}$|^ntn_[a-zA-Z0-9_]{50,}$/),
  workspaceId: z.string().optional(),
  workspaceName: z.string().optional(),
  botId: z.string().optional()
});

// Validation functions
export function validateNotionToken(token: string): boolean {
  try {
    return NotionTokenSchema.shape.access_token.safeParse(token).success;
  } catch {
    return false;
  }
}

export function validateAndSanitizeNotionPage(obj: any): z.infer<typeof NotionPageSchema> | null {
  try {
    return NotionPageSchema.parse(obj);
  } catch (e) {
    console.warn('NotionPage validation failed:', e);
    return null;
  }
}

export function validateAndSanitizeNotionBlock(obj: any): z.infer<typeof NotionBlockSchema> | null {
  try {
    return NotionBlockSchema.parse(obj);
  } catch (e) {
    console.warn('NotionBlock validation failed:', e);
    return null;
  }
}

export function validateAndSanitizeNotionLink(obj: any): z.infer<typeof NotionLinkSchema> | null {
  try {
    return NotionLinkSchema.parse(obj);
  } catch (e) {
    console.warn('NotionLink validation failed:', e);
    return null;
  }
}

export function validateNotionAuthConfig(obj: any): z.infer<typeof NotionAuthConfigSchema> | null {
  try {
    return NotionAuthConfigSchema.parse(obj);
  } catch (e) {
    console.warn('NotionAuthConfig validation failed:', e);
    return null;
  }
}

// Sanitization utilities
export function sanitizeNotionText(text: string): string {
  if (!text) return '';

  return text
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/data:/gi, '') // Remove data: URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

export function sanitizeNotionUrl(url: string): string | null {
  if (!url) return null;

  try {
    const parsedUrl = new URL(url);
    // Only allow https URLs from notion.so domain
    if (parsedUrl.protocol === 'https:' && parsedUrl.hostname === 'notion.so') {
      return url;
    }
    return null;
  } catch {
    return null;
  }
}
