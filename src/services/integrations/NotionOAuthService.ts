import { Linking } from 'react-native';
import { base64Encode } from '../../utils/base64';
import SecureStorageService from '../storage/SecureStorageService';
import { NOTION_CONFIG } from '../../config/integrations';

interface NotionTokenData {
  accessToken: string;
  tokenType: string;
  botId: string;
  workspaceId?: string;
  workspaceName?: string;
  workspaceIcon?: string;
  owner?: {
    type: string;
    user?: any;
  };
  duplicatedTemplateId?: string;
  refreshToken?: string;
  expiresAt?: number; // epoch ms when token expires
  rawExpiresIn?: number; // seconds as returned by server
}

export class NotionOAuthService {
  private static instance: NotionOAuthService;
  private secureStorage: SecureStorageService;
  private refreshTimer: NodeJS.Timeout | null = null;
  private refreshInProgress: boolean = false;
  // telemetry and notification sinks
  private telemetrySinks: Array<(event: string, payload?: any) => void> = [];
  private notificationSinks: Array<(payload: { level: 'info' | 'warning' | 'critical'; message: string; meta?: any }) => void> = [];

  private constructor() {
    this.secureStorage = SecureStorageService.getInstance();
  }

  public static getInstance(): NotionOAuthService {
    if (!NotionOAuthService.instance) {
      NotionOAuthService.instance = new NotionOAuthService();
    }
    return NotionOAuthService.instance;
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
   * Initiate OAuth flow by opening Notion authorization URL
   */
  public async initiateOAuth(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!NOTION_CONFIG.CLIENT_ID) {
        return { success: false, error: 'Notion OAuth not configured' };
      }

      const state = this.generateState();
      const authUrl = this.buildAuthUrl(state);

  // Store state for verification (5 minutes expressed in milliseconds)
  await this.secureStorage.storeToken('notion_oauth_state', state, 'OAuth State', 300000); // 5 min expiry

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
  public async handleOAuthCallback(url: string): Promise<{ success: boolean; token?: NotionTokenData; error?: string }> {
    try {
      const params = this.parseCallbackUrl(url);

      if (params.error) {
        return { success: false, error: params.error_description || params.error };
      }

      if (!params.code || !params.state) {
        return { success: false, error: 'Missing authorization code or state' };
      }

      // Verify state
      const storedState = await this.secureStorage.getToken('notion_oauth_state');
      if (!storedState || storedState !== params.state) {
        return { success: false, error: 'Invalid OAuth state' };
      }

      // Exchange code for token
      const tokenData = await this.exchangeCodeForToken(params.code);

    // Store token securely (will also schedule refresh if supported)
    await this.storeTokenData(tokenData);

    // Clean up state
    await this.secureStorage.deleteToken('notion_oauth_state');

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
      const valid = await this.getValidAccessToken();
      return valid;
    } catch (error) {
      console.error('Failed to get Notion access token:', error);
      return null;
    }
  }

  /**
   * Return an access token, refreshing it if it's near expiry.
   */
  public async getValidAccessToken(): Promise<string | null> {
    try {
      const tokenDataRaw = await this.secureStorage.getToken('notion_oauth_token');
      if (!tokenDataRaw) return null;
      const token = JSON.parse(tokenDataRaw) as NotionTokenData;

      // If no expiry info, assume token is long-lived
      if (!token.expiresAt) return token.accessToken;

      const now = Date.now();
      const refreshMargin = 60 * 1000; // 60s
      if (token.expiresAt - now <= refreshMargin) {
        // attempt refresh (best-effort)
        try {
          await this.refreshAccessToken();
          const refreshedRaw = await this.secureStorage.getToken('notion_oauth_token');
          if (!refreshedRaw) return null;
          const refreshed = JSON.parse(refreshedRaw) as NotionTokenData;
          return refreshed.accessToken;
        } catch (e) {
          console.warn('Token refresh failed while obtaining valid token:', e);
          return token.accessToken; // fall back to existing token
        }
      }

      return token.accessToken;
    } catch (e) {
      console.error('getValidAccessToken error:', e);
      return null;
    }
  }

  /**
   * Get stored workspace information
   */
  public async getWorkspaceInfo(): Promise<{
    workspaceId?: string;
    workspaceName?: string;
    workspaceIcon?: string;
    botId?: string;
  } | null> {
    try {
      const tokenData = await this.secureStorage.getToken('notion_oauth_token');
      if (!tokenData) return null;

      const token = JSON.parse(tokenData) as NotionTokenData;
      // Only include properties when defined to avoid assigning `| undefined` into required slots
      return {
        ...(token.workspaceId ? { workspaceId: token.workspaceId } : {}),
        ...(token.workspaceName ? { workspaceName: token.workspaceName } : {}),
        ...(token.workspaceIcon ? { workspaceIcon: token.workspaceIcon } : {}),
        ...(token.botId ? { botId: token.botId } : {})
      };
    } catch (error) {
      console.error('Failed to get Notion workspace info:', error);
      return null;
    }
  }

  /**
   * Clear stored tokens
   */
  public async clearTokens(): Promise<void> {
  await this.secureStorage.deleteToken('notion_oauth_token');
  await this.secureStorage.deleteToken('notion_oauth_state');
  }

  /**
   * Check if user is authenticated
   */
  public async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return !!token;
  }

  /**
   * Test connection with current token
   */
  public async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        return { success: false, error: 'No access token available' };
      }

      const response = await fetch('https://api.notion.com/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: `Connection test failed: ${error}` };
    }
  }

  private buildAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: NOTION_CONFIG.CLIENT_ID,
      response_type: 'code',
      owner: 'user',
      state,
      redirect_uri: NOTION_CONFIG.REDIRECT_URI || 'neurolearn://oauth/notion'
    });

    return `${NOTION_CONFIG.AUTH_URL}?${params.toString()}`;
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

  private async exchangeCodeForToken(code: string): Promise<NotionTokenData> {
    // Prefer server-side token exchange for security
    if (NOTION_CONFIG.TOKEN_EXCHANGE_FUNCTION_URL) {
      const functionUrl = NOTION_CONFIG.TOKEN_EXCHANGE_FUNCTION_URL;
      const resp = await fetch(functionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirect_uri: NOTION_CONFIG.REDIRECT_URI })
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Server-side token exchange failed: ${resp.status} - ${errText}`);
      }

      const json = await resp.json();
      if (!json.success) {
        throw new Error(`Server-side token exchange error: ${JSON.stringify(json.error)}`);
      }

      const data = json.data;

      return {
        accessToken: data.access_token,
        tokenType: data.token_type || 'bearer',
        botId: data.bot_id,
        workspaceId: data.workspace_id,
        workspaceName: data.workspace_name,
        workspaceIcon: data.workspace_icon,
        owner: data.owner,
        duplicatedTemplateId: data.duplicated_template_id,
        refreshToken: data.refresh_token,
        rawExpiresIn: data.expires_in
      };
    }

    // No client-side fallback - server-side token exchange is required for security
    throw new Error(
      'Server-side token exchange is required. Please configure TOKEN_EXCHANGE_FUNCTION_URL in your environment.'
    );
  }

  private async storeTokenData(tokenData: NotionTokenData): Promise<void> {
    try {
      const now = Date.now();
      if (tokenData.rawExpiresIn && Number.isFinite(tokenData.rawExpiresIn)) {
        tokenData.expiresAt = now + (Number(tokenData.rawExpiresIn) * 1000);
      }

      await this.secureStorage.storeToken(
        'notion_oauth_token',
        JSON.stringify(tokenData),
        'Notion OAuth Token',
        0
      );

      // schedule refresh if supported
      if (tokenData.expiresAt && tokenData.refreshToken) {
        this.scheduleTokenRefresh(tokenData.expiresAt);
      }
    } catch (e) {
      console.error('Failed to store Notion token data:', e);
      throw e;
    }
  }

  private scheduleTokenRefresh(expiresAt: number) {
    try {
      // Clear any existing timer
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }

      const now = Date.now();
      // Refresh 60s before expiry, but at least 5s from now
      const refreshAt = Math.max(now + 5000, expiresAt - 60 * 1000);
      const delay = Math.max(0, refreshAt - now);
      this.refreshTimer = setTimeout(() => {
        // Fire-and-forget refresh
        this.refreshAccessToken().catch(err => console.warn('Scheduled token refresh failed:', err));
      }, delay);
    } catch (e) {
      // swallow
    }
  }

  private async refreshAccessToken(): Promise<void> {
    if (this.refreshInProgress) return;
    this.refreshInProgress = true;
    try {
      const tokenRaw = await this.secureStorage.getToken('notion_oauth_token');
      if (!tokenRaw) throw new Error('No token to refresh');
      const token = JSON.parse(tokenRaw) as NotionTokenData;
      if (!token.refreshToken) throw new Error('No refresh token available');

      if (!NOTION_CONFIG.TOKEN_REFRESH_FUNCTION_URL) {
        throw new Error('TOKEN_REFRESH_FUNCTION_URL not configured. Server-side refresh required.');
      }

      // Try refresh with exponential backoff and telemetry
      const maxAttempts = 5;
      let attempt = 0;
      let lastErr: any = null;
      while (attempt < maxAttempts) {
        attempt++;
        try {
          this.emitTelemetry('notion.refresh.attempt', { attempt });
          const resp = await fetch(NOTION_CONFIG.TOKEN_REFRESH_FUNCTION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: token.refreshToken })
          });

          if (!resp.ok) {
            const text = await resp.text();
            throw new Error(`Refresh endpoint error ${resp.status}: ${text}`);
          }

          const json = await resp.json();
          if (!json.success) throw new Error(`Refresh failed: ${JSON.stringify(json.error)}`);

          const data = json.data;
          const newToken: NotionTokenData = {
            accessToken: data.access_token,
            tokenType: data.token_type || 'bearer',
            botId: data.bot_id || token.botId,
            workspaceId: data.workspace_id || token.workspaceId,
            workspaceName: data.workspace_name || token.workspaceName,
            workspaceIcon: data.workspace_icon || token.workspaceIcon,
            owner: data.owner || token.owner,
            duplicatedTemplateId: data.duplicated_template_id || token.duplicatedTemplateId,
            refreshToken: data.refresh_token || token.refreshToken,
            rawExpiresIn: data.expires_in || token.rawExpiresIn
          };

          // Rotate refresh token if provided
          if (data.refresh_token && data.refresh_token !== token.refreshToken) {
            this.emitTelemetry('notion.refresh.rotate_refresh_token', { old: !!token.refreshToken, new: true });
          }

          await this.storeTokenData(newToken);
          this.emitTelemetry('notion.refresh.success', { attempt });
          return;
        } catch (e) {
          lastErr = e;
          const backoff = Math.min(500 * Math.pow(2, attempt), 15000);
          this.emitTelemetry('notion.refresh.failure', { attempt, error: String(e) });
          // On server-known permanent failure, break early
          if (String(e).toLowerCase().includes('invalid_refresh') || String(e).toLowerCase().includes('invalid grant')) {
            break;
          }
          await new Promise(r => setTimeout(r, backoff));
        }
      }

      // Exhausted attempts
      this.emitTelemetry('notion.refresh.exhausted', { attempts: maxAttempts, lastError: String(lastErr) });
      this.emitNotification('critical', 'Notion token refresh repeatedly failed; user re-auth required', { lastError: String(lastErr) });
      throw lastErr || new Error('Refresh attempts exhausted');
    } finally {
      this.refreshInProgress = false;
    }
  }

  // Public helper to force refresh (used by tests)
  public async forceRefresh(): Promise<void> {
    return this.refreshAccessToken();
  }
}
