
/**
 * Integration configurations for external services
 * Client IDs are public, but secrets should be stored securely (e.g., in environment variables)
 */

export const NOTION_CONFIG = {
  // Only public client configuration - secrets handled server-side
  CLIENT_ID:
    process.env.NOTION_CLIENT_ID || process.env.EXPO_PUBLIC_NOTION_CLIENT_ID,
  // CLIENT_SECRET removed from client - handled server-side only
  REDIRECT_URI:
    process.env.NOTION_REDIRECT_URI || process.env.EXPO_PUBLIC_NOTION_REDIRECT_URI ||
    'neurolearn://oauth/notion',
  AUTH_URL: 'https://api.notion.com/v1/oauth/authorize',
  // TOKEN_URL removed - client should not call directly
  // Server-side token exchange endpoint (Supabase Edge function)
  TOKEN_EXCHANGE_FUNCTION_URL:
    process.env.SUPABASE_URL
      ? `${process.env.SUPABASE_URL.replace(/\/$/, '')}/functions/v1/notion-token-exchange`
      : process.env.NOTION_TOKEN_EXCHANGE_URL || undefined,
  // Server-side token refresh endpoint (Supabase Edge function)
  TOKEN_REFRESH_FUNCTION_URL:
    process.env.SUPABASE_URL
      ? `${process.env.SUPABASE_URL.replace(/\/$/, '')}/functions/v1/notion-token-refresh`
      : process.env.NOTION_TOKEN_REFRESH_URL || undefined,
} as const;

export const TODOIST_CONFIG = {
  // Only public client configuration - secrets handled server-side
  CLIENT_ID: process.env.TODOIST_CLIENT_ID || process.env.EXPO_PUBLIC_TODOIST_CLIENT_ID || '',
  // CLIENT_SECRET removed from client - handled server-side only
  REDIRECT_URI:
    process.env.TODOIST_REDIRECT_URI || process.env.EXPO_PUBLIC_TODOIST_REDIRECT_URI ||
    'neurolearn://oauth/todoist',
  AUTH_URL: 'https://todoist.com/oauth/authorize',
  // TOKEN_URL removed - client should not call directly
  // Server-side token exchange endpoint (Supabase Edge function)
  TOKEN_EXCHANGE_FUNCTION_URL:
    process.env.SUPABASE_FUNCTIONS_URL
      ? `${process.env.SUPABASE_FUNCTIONS_URL.replace(/\/$/, '')}/todoist-token-exchange`
      : process.env.TODOIST_TOKEN_EXCHANGE_URL || undefined,
} as const;

export const INTEGRATION_CONFIGS = {
  notion: NOTION_CONFIG,
  todoist: TODOIST_CONFIG,
} as const;
