
/**
 * Integration configurations for external services
 * Client IDs are public, but secrets should be stored securely (e.g., in environment variables)
 */

export const NOTION_CONFIG = {
  CLIENT_ID: process.env.NOTION_CLIENT_ID || '279d872b-594c-800f-a3fd-00377a0819f8',
  CLIENT_SECRET: process.env.NOTION_CLIENT_SECRET ,
  REDIRECT_URI: process.env.NOTION_REDIRECT_URI ,
  AUTH_URL: 'https://api.notion.com/v1/oauth/authorize',
  TOKEN_URL: 'https://api.notion.com/v1/oauth/token',
} as const;

// For future integrations
export const INTEGRATION_CONFIGS = {
  notion: NOTION_CONFIG,
} as const;
