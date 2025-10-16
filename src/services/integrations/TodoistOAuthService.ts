import { Linking } from 'react-native';
import SecureStorageService from '../storage/SecureStorageService';
import { RequestDeduplicator } from '../../utils/RequestDeduplicator';
import { TODOIST_CONFIG } from '../../config/integrations';

interface TodoistOAuthConfig {
  clientId: string;
  clientSecret?: string; // Optional - handled server-side
  redirectUri: string;
  scopes: string[];
}

interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType: string;
}

export class TodoistOAuthService {
  private static instance: TodoistOAuthService;
  private config: TodoistOAuthConfig;
  private secureStorage: SecureStorageService;
  private deduplicator: RequestDeduplicator;
  private telemetrySinks: Array<(event: string, payload?: any) => void> = [];
  private notificationSinks: Array<(payload: { level: 'info' | 'warning' | 'critical'; message: string; meta?: any }) => void> = [];

  private constructor() {
    this.config = {
      clientId: process.env.EXPO_PUBLIC_TODOIST_CLIENT_ID || '',
      // clientSecret removed - handled server-side only
      redirectUri: 'neurolearn://oauth/todoist',
      scopes: ['data:read', 'data:write', 'project:read']
    };
    this.secureStorage = SecureStorageService.getInstance();
    this.deduplicator = new RequestDeduplicator();
  }

  public static getInstance(): TodoistOAuthService {
    if (!TodoistOAuthService.instance) {
      TodoistOAuthService.instance = new TodoistOAuthService();
    }
    return TodoistOAuthService.instance;
  }

  public registerTelemetrySink(cb: (event: string, payload?: any) => void): () => void {
    if (typeof cb === 'function') this.telemetrySinks.push(cb);
    return () => { this.telemetrySinks = this.telemetrySinks.filter(s => s !== cb); };
  }

  public registerNotificationSink(cb: (payload: { level: 'info' | 'warning' | 'critical'; message: string; meta?: any }) => void): () => void {
    if (typeof cb === 'function') this.notificationSinks.push(cb);
    return () => { this.notificationSinks = this.notificationSinks.filter(s => s !== cb); };
  }

  private emitTelemetry(event: string, payload?: any) {
    try { this.telemetrySinks.forEach(s => { try { s(event, payload); } catch (e) {} }); } catch (e) {}
  }

  private emitNotification(level: 'info' | 'warning' | 'critical', message: string, meta?: any) {
    try { this.notificationSinks.forEach(s => { try { s({ level, message, meta }); } catch (e) {} }); } catch (e) {}
  }

  /**
   * Initiate OAuth flow by opening Todoist authorization URL
   */
  public async initiateOAuth(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.config.clientId) {
        return { success: false, error: 'Todoist OAuth not configured' };
      }

      const state = this.generateState();
      const authUrl = this.buildAuthUrl(state);

      // Store state for verification
  // store state with 5 minutes expiry (milliseconds)
  await this.secureStorage.storeToken('todoist_oauth_state', state, 'OAuth State', 300000); // 5 min expiry

      const canOpen = await Linking.canOpenURL(authUrl);
      if (!canOpen) {
        return { success: false, error: 'Cannot open authorization URL' };
      }

      await Linking.openURL(authUrl);
      return { success: true };
    } catch (error) {
      return { success: false, error: `OAuth initiation failed: ${error}` };
    }
  }

  /**
   * Handle OAuth callback and exchange code for token
   */
  public async handleOAuthCallback(url: string): Promise<{ success: boolean; token?: TokenData; error?: string }> {
    try {
      const params = this.parseCallbackUrl(url);

      if (params.error) {
        return { success: false, error: params.error_description || params.error };
      }

      if (!params.code || !params.state) {
        return { success: false, error: 'Missing authorization code or state' };
      }

      // Verify state
        const storedState = await this.secureStorage.getToken('todoist_oauth_state');
        if (!storedState || storedState !== params.state) {
        return { success: false, error: 'Invalid OAuth state' };
      }

      // Exchange code for token
      const tokenData = await this.exchangeCodeForToken(params.code);

      // Store token securely
      await this.storeTokenData(tokenData);

      // Clean up state
        await this.secureStorage.deleteToken('todoist_oauth_state');

      return { success: true, token: tokenData };
    } catch (error) {
      return { success: false, error: `OAuth callback failed: ${error}` };
    }
  }

  /**
   * Get stored access token
   */
  public async getAccessToken(): Promise<string | null> {
    try {
      const tokenData = await this.secureStorage.getToken('todoist_oauth_token');
      if (!tokenData) return null;

        const token = JSON.parse(tokenData) as TokenData;

      // Check if token is expired
      if (token.expiresAt && new Date() >= token.expiresAt) {
        if (token.refreshToken) {
          // Try server-side refresh if configured
          if (TODOIST_CONFIG.TOKEN_EXCHANGE_FUNCTION_URL) {
            // Try server-side refresh with retries/backoff
            const maxAttempts = 4;
            let attempt = 0;
            let lastErr: any = null;
            while (attempt < maxAttempts) {
              attempt++;
              try {
                this.emitTelemetry('todoist.refresh.attempt', { attempt });
                const resp = await fetch(TODOIST_CONFIG.TOKEN_EXCHANGE_FUNCTION_URL, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ refreshToken: token.refreshToken })
                });

                if (!resp.ok) {
                  const text = await resp.text();
                  throw new Error(`Refresh endpoint error ${resp.status}: ${text}`);
                }

                const json = await resp.json();
                if (json?.success && json.data) {
                  const updated: TokenData = {
                    accessToken: json.data.access_token,
                    refreshToken: json.data.refresh_token || token.refreshToken,
                    tokenType: json.data.token_type || token.tokenType,
                  } as any;
                  if (json.data.expires_at) (updated as any).expiresAt = new Date(json.data.expires_at);
                  await this.storeTokenData(updated);
                  this.emitTelemetry('todoist.refresh.success', { attempt });
                  return updated.accessToken;
                }
                throw new Error('Refresh response missing data');
              } catch (e) {
                lastErr = e;
                const backoff = Math.min(300 * Math.pow(2, attempt), 10000);
                this.emitTelemetry('todoist.refresh.failure', { attempt, error: String(e) });
                await new Promise(r => setTimeout(r, backoff));
              }
            }
            this.emitTelemetry('todoist.refresh.exhausted', { attempts: maxAttempts, lastError: String(lastErr) });
            this.emitNotification('critical', 'Todoist token refresh repeatedly failed; user re-auth required', { lastError: String(lastErr) });
            // continue to client refresh fallback attempt below
          }

          // Fallback to client-side refresh only if explicitly allowed (not recommended)
          try {
            const refreshed = await this.refreshToken(token.refreshToken);
            return refreshed ? refreshed.accessToken : null;
          } catch (e) {
            console.warn('Client-side token refresh failed:', e);
            return null;
          }
        }
        return null;
      }

      return token.accessToken;
    } catch (error) {
      console.error('Failed to get Todoist access token:', error);
      return null;
    }
  }

  /**
   * Refresh expired token
   * Now requires server-side implementation for security
   */
  private async refreshToken(refreshToken: string): Promise<TokenData | null> {
    // Client-side token refresh is not secure - should be handled server-side
    throw new Error(
      'Token refresh must be handled server-side. Please implement a server endpoint for Todoist token refresh.'
    );
  }

  /**
   * Clear stored tokens
   */
  public async clearTokens(): Promise<void> {
  await this.secureStorage.deleteToken('todoist_oauth_token');
  await this.secureStorage.deleteToken('todoist_oauth_state');
  }

  /**
   * Check if user is authenticated
   */
  public async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return !!token;
  }

  private buildAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      scope: this.config.scopes.join(','),
      state,
      response_type: 'code',
      redirect_uri: this.config.redirectUri
    });

    return `https://todoist.com/oauth/authorize?${params.toString()}`;
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }

  private parseCallbackUrl(url: string): Record<string, string> {
    const urlObj = new URL(url);
    const params: Record<string, string> = {};

    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    return params;
  }

  private async exchangeCodeForToken(code: string): Promise<TokenData> {
    // Client-side token exchange is not secure - should be handled server-side
    throw new Error(
      'Token exchange must be handled server-side. Please implement a server endpoint for Todoist token exchange.'
    );
  }

  private async storeTokenData(tokenData: TokenData): Promise<void> {
    const expirySeconds = tokenData.expiresAt ?
      Math.floor((tokenData.expiresAt.getTime() - Date.now()) / 1000) : 0;

    await this.secureStorage.storeToken(
      'todoist_oauth_token',
      JSON.stringify(tokenData),
      'Todoist OAuth Token',
      expirySeconds
    );
  }
}
