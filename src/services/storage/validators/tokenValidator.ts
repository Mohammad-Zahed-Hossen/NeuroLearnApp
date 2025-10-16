import { z } from 'zod';

// Token validation schemas
export const SecureTokenSchema = z.object({
  token: z.string().min(1).max(1000),
  service: z.string().min(1).max(100),
  createdAt: z.date(),
  expiresAt: z.date().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const NotionTokenFormatSchema = z.string().regex(/^secret_[a-zA-Z0-9]{43}$|^ntn_[a-zA-Z0-9_]{50,}$/, {
  message: 'Invalid Notion token format - must start with secret_ or ntn_'
});

export const GenericTokenFormatSchema = z.string().min(10).max(2000).refine((val) => {
  // Basic token format validation - no whitespace, reasonable length
  return !/\s/.test(val) && val.length >= 10;
}, {
  message: 'Token must be at least 10 characters and contain no whitespace'
});

// Validation functions
export function validateSecureToken(obj: any): z.infer<typeof SecureTokenSchema> | null {
  try {
    return SecureTokenSchema.parse(obj);
  } catch (e) {
    console.warn('SecureToken validation failed:', e);
    return null;
  }
}

export function validateNotionTokenFormat(token: string): boolean {
  try {
    NotionTokenFormatSchema.parse(token);
    return true;
  } catch {
    return false;
  }
}

export function validateGenericTokenFormat(token: string): boolean {
  try {
    GenericTokenFormatSchema.parse(token);
    return true;
  } catch {
    return false;
  }
}

export function isTokenExpired(expiresAt?: Date): boolean {
  if (!expiresAt) return false;
  return new Date() >= expiresAt;
}

export function getTokenTimeUntilExpiry(expiresAt?: Date): number | null {
  if (!expiresAt) return null;
  const now = new Date();
  const expiry = new Date(expiresAt);
  return Math.max(0, expiry.getTime() - now.getTime());
}

// Sanitization utilities
export function sanitizeToken(token: string): string {
  if (!token) return '';

  // Remove any potential whitespace or control characters
  return token.trim().replace(/[\x00-\x1F\x7F]/g, '');
}

export function maskToken(token: string, visibleChars: number = 4): string {
  if (!token || token.length <= visibleChars * 2) {
    return '*'.repeat(token.length);
  }

  const start = token.substring(0, visibleChars);
  const end = token.substring(token.length - visibleChars);
  const maskLength = token.length - (visibleChars * 2);

  return `${start}${'*'.repeat(maskLength)}${end}`;
}
