/**
 * Supabase Service - Backend Integration
 *
 * Provides authenticated database access with Row Level Security
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Type for updating user profile (matches snake_case names in user_profiles table)
type UserProfileUpdate = {
  daily_goal?: number;
  auto_sync_enabled?: boolean;
  todoist_token?: string | null;
  notion_token?: string | null;
  notion_db_id?: string | null;
  notion_db_id_logs?: string | null;
  // ... other user_profiles fields
};

// Sync queue item
type SyncQueueItem = {
  type: 'sync-up' | 'sync-down' | 'test-connection';
  data?: any;
  timestamp: number;
};

// Load environment variables from Expo Constants
// NOTE: In test environment we provide safe defaults so the module can be
// imported without failing (tests mock the supabase client behavior).
let SUPABASE_URL = Constants.expoConfig?.extra?.SUPABASE_URL;
let SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.SUPABASE_ANON_KEY;
let ENCRYPTION_KEY = Constants.expoConfig?.extra?.ENCRYPTION_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !ENCRYPTION_KEY) {
  if (process.env.NODE_ENV === 'test') {
    // Provide benign defaults during tests. The actual network calls are
    // mocked in Jest setup, so these values are not used for real requests.
    SUPABASE_URL = SUPABASE_URL || 'http://localhost:9999';
    SUPABASE_ANON_KEY = SUPABASE_ANON_KEY || 'test-anon-key';
    ENCRYPTION_KEY = ENCRYPTION_KEY || 'test-encryption-key';
  } else {
    throw new Error('FATAL: SUPABASE_URL, SUPABASE_ANON_KEY and ENCRYPTION_KEY must be set in app.config.js. Check your .env file.');
  }
}

export class SupabaseService {
  private static instance: SupabaseService;
  private client: SupabaseClient;
  private currentUser: User | null = null;
  private lastSyncTime: { [key: string]: number } = {};
  private syncQueue: SyncQueueItem[] = [];

  public constructor() {
    this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
      global: {
        headers: {
          'X-Client-Info': 'neurolearn-mobile-app',
        },
      },
    });

    // Listen for auth changes
    this.client.auth.onAuthStateChange((event, session) => {
      this.currentUser = session?.user || null;
      console.log('🔐 Auth state changed:', event, this.currentUser?.id);
    });
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  public getClient(): SupabaseClient {
    return this.client;
  }

  public async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { session } } = await this.client.auth.getSession();
      this.currentUser = session?.user || null; // Update cached user
      return this.currentUser;
    } catch (e) {
      console.error('Error getting current user:', e);
      return this.currentUser; // Fallback to cached user
    }
  }

  /**
   * Ensure session is valid, attempt refresh if expired.
   */
  public async ensureValidSession(): Promise<boolean> {
    try {
      const { data: { session } } = await this.client.auth.getSession();
      if (session && session.expires_at && session.expires_at * 1000 > Date.now()) return true;

      // Try to refresh by retrieving a new session from storage
      try {
        // supabase-js autoRefreshToken=true should handle this, but call getSession again
        const res = await this.client.auth.getSession();
        const fresh = res?.data?.session;
        if (fresh) {
          this.currentUser = fresh.user || null;
          return true;
        }
      } catch (inner) {
        console.warn('Session refresh attempt failed:', inner);
      }

      // As last resort, attempt to refresh using stored refresh token via server endpoint if available
      // (Implementers may add a refresh endpoint). For now, clear cached user.
      this.currentUser = null;
      return false;
    } catch (e) {
      console.error('ensureValidSession error:', e);
      return false;
    }
  }

  /**
   * Execute a Supabase call with auto-retry on auth failure.
   */
  public async safeExecute<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      // Detect auth/session related errors
      if (msg.toLowerCase().includes('jwt') || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('expired')) {
        const ok = await this.ensureValidSession();
        if (ok) return await fn();
      }
      throw err;
    }
  }

  public async signUp(email: string, password: string): Promise<{ user: User | null; error: any }> {
    try {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'neurolearn://',
        },
      });
      return { user: data.user, error };
    } catch (e: any) {
      return { user: null, error: e };
    }
  }

  public async signIn(email: string, password: string): Promise<{ user: User | null; error: any }> {
    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password,
      });
      return { user: data.user, error };
    } catch (e: any) {
      return { user: null, error: e };
    }
  }

  public async signOut(): Promise<{ error: any }> {
    try {
      const { error } = await this.client.auth.signOut();
      this.currentUser = null;
      return { error };
    } catch (e: any) {
      return { error: e };
    }
  }

  public async resetPassword(email: string): Promise<{ error: any }> {
    try {
      const { error } = await this.client.auth.resetPasswordForEmail(email, {
        redirectTo: 'neurolearn://reset-password',
      });
      return { error };
    } catch (e: any) {
      return { error: e };
    }
  }

  public async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { session } } = await this.client.auth.getSession();
      return !!session;
    } catch (e) {
      return false;
    }
  }

  // ==================== CORE STORAGE METHODS ====================

  public async saveFlashcard(flashcard: any): Promise<{ error: any }> {
    if (!this.currentUser) {
      return { error: new Error('Not authenticated') };
    }

    const { error } = await this.client
      .from('flashcards')
      .upsert({
        ...flashcard,
        user_id: this.currentUser.id,
        next_review_date: flashcard.nextReview?.toISOString() || new Date().toISOString(),
        created_at: flashcard.created?.toISOString() || new Date().toISOString(),
      });

    return { error };
  }

  public async getFlashcards(): Promise<{ data: any[] | null; error: any }> {
    if (!this.currentUser) {
      return { data: null, error: new Error('Not authenticated') };
    }

    const { data, error } = await this.client
      .from('flashcards')
      .select('*')
      .eq('user_id', this.currentUser.id)
      .order('created_at', { ascending: false });

    return { data, error };
  }

  public async saveSettings(settings: any): Promise<{ error: any }> {
    if (!this.currentUser) {
      return { error: new Error('Not authenticated') };
    }

    try {
      // Encrypt sensitive tokens before saving
      const encryptedSettings: any = {
        id: this.currentUser.id,
        theme: settings.theme,
        daily_goal: settings.dailyGoal,
        auto_sync_enabled: settings.autoSync,
        notifications: settings.notifications,
      };

      // Encrypt Todoist token if provided
      if (settings.todoistToken) {
        encryptedSettings.todoist_token = await this.encryptToken(settings.todoistToken);
      }

      // Encrypt Notion token if provided
      if (settings.notionToken) {
        encryptedSettings.notion_token = await this.encryptToken(settings.notionToken);
      }

      const { error } = await this.client
        .from('user_profiles')
        .upsert(encryptedSettings);

      return { error };
    } catch (encryptionError) {
      console.error('Failed to encrypt tokens:', encryptionError);
      return { error: new Error('Failed to save settings securely') };
    }
  }

  public async getSettings(): Promise<{ data: any | null; error: any }> {
    if (!this.currentUser) {
      return { data: null, error: new Error('Not authenticated') };
    }

    const { data, error } = await this.client
      .from('user_profiles')
      .select('*')
      .eq('id', this.currentUser.id)
      .single();

    if (error || !data) {
      return { data, error };
    }

    try {
      // Decrypt sensitive tokens if they exist
      const decryptedData = { ...data };

      if (data.todoist_token) {
        decryptedData.todoistToken = await this.decryptToken(data.todoist_token);
      }

      if (data.notion_token) {
        decryptedData.notionToken = await this.decryptToken(data.notion_token);
      }

      return { data: decryptedData, error: null };
    } catch (decryptionError) {
      console.error('Failed to decrypt tokens:', decryptionError);
      // Return data without decrypted tokens rather than failing completely
      return { data, error: null };
    }
  }

  /**
   * Validates Notion integration token format
   */
  private validateNotionToken(token: string): boolean {
    return token.startsWith('secret_') || token.startsWith('ntn_');
  }

  /**
   * Encrypts sensitive data using PostgreSQL pgcrypto
   */
  private async encryptToken(token: string): Promise<string> {
    // Use Supabase RPC to encrypt token
    const { data, error } = await this.client.rpc('encrypt_token', {
      input_token: token,
      encryption_key: ENCRYPTION_KEY
    });

    if (error) {
      console.error('Token encryption failed:', error);
      throw new Error('Failed to encrypt token');
    }

    return data;
  }

  /**
   * Decrypts sensitive data using PostgreSQL pgcrypto
   */
  private async decryptToken(encryptedToken: string): Promise<string> {
    // Use Supabase RPC to decrypt token
    try {
      const { data, error } = await this.client.rpc('decrypt_token', {
        encrypted_token: encryptedToken,
        encryption_key: ENCRYPTION_KEY,
      });

      if (error) {
        // Specific error when RPC not found: let callers handle fallback
        console.error('Token decryption RPC returned error:', error);
        return null as any;
      }

      return data;
    } catch (e: any) {
      // If the RPC function is not available in the database schema (common
      // in local or test setups), return null so callers can fallback to
      // sending the encrypted token to server-side functions.
      console.warn('Token decryption failed or RPC missing:', e?.message || e);
      return null as any;
    }
  }

  /**
   * Updates sync analytics in user profile
   */
  private async updateSyncAnalytics(success: boolean): Promise<void> {
    if (!this.currentUser) return;

    const field = success ? 'sync_success_count' : 'sync_fail_count';
    const increment = success ? 1 : 1;

    const { error } = await this.client.rpc('increment_sync_count', {
      user_id: this.currentUser.id,
      is_success: success,
      increment_by: increment
    });

    if (error) {
      console.error('Failed to update sync analytics:', error);
    }
  }

  /**
   * Checks if user should receive failure notifications
   */
  private async shouldNotifyOnFailure(): Promise<boolean> {
    if (!this.currentUser) return false;

    try {
      const { data, error } = await this.client
        .from('user_profiles')
        .select('sync_fail_count, last_failure_notification')
        .eq('id', this.currentUser.id)
        .single();

      if (error || !data) return false;

      const failCount = data.sync_fail_count || 0;
      const lastNotification = data.last_failure_notification;

      // Notify if failures >= 3 and no notification in last 24 hours
      const shouldNotify = failCount >= 3 && (
        !lastNotification ||
        Date.now() - new Date(lastNotification).getTime() > 24 * 60 * 60 * 1000
      );

      return shouldNotify;
    } catch (e) {
      return false;
    }
  }

  /**
   * Sends push notification for repeated sync failures
   */
  private async sendFailureNotification(): Promise<void> {
    // Implementation depends on your push notification service
    // For now, we'll use a placeholder
    console.log('Sending push notification: Repeated sync failures detected');

    // Update last notification timestamp
    if (this.currentUser) {
      await this.client
        .from('user_profiles')
        .update({ last_failure_notification: new Date().toISOString() })
        .eq('id', this.currentUser.id);
    }
  }

  /**
   * Saves user profile settings with validation and encryption
   */
  public async updateUserProfile(updates: UserProfileUpdate): Promise<{ error: any }> {
    if (!this.currentUser) {
      return { error: new Error('No authenticated user found.') };
    }

    if (updates.notion_token && !this.validateNotionToken(updates.notion_token)) {
      return { error: new Error('Invalid Notion token format') };
    }

    try {
      // Encrypt sensitive tokens before saving
      const encryptedUpdates = { ...updates };
      if (updates.notion_token) {
        encryptedUpdates.notion_token = await this.encryptToken(updates.notion_token);
      }

      const { error } = await this.client
        .from('user_profiles')
        .update(encryptedUpdates)
        .eq('id', this.currentUser.id); // RLS handles the security check here

      return { error };
    } catch (e: any) {
      return { error: e };
    }
  }

  /**
   * Calls the secure Notion sync Edge Function with rate limiting, retry logic, and analytics
   */
  public async syncNotionData(syncType: 'sync-up' | 'sync-down' | 'test-connection'): Promise<{ data: any; error: any }> {
    if (!this.currentUser) {
      return { error: new Error('No authenticated user found.'), data: null };
    }

    // Rate limit: 1 sync per 5 seconds per type
    const now = Date.now();
    if (this.lastSyncTime[syncType] && now - this.lastSyncTime[syncType] < 5000) {
      return {
        data: null,
        error: new Error('Please wait before syncing again'),
      };
    }
    this.lastSyncTime[syncType] = now;

    // Get user settings to retrieve notion token. getSettings attempts to
    // decrypt tokens via RPC; if that RPC is missing in the database (common
    // in local/dev environments) the decrypted token may be absent while the
    // encrypted value remains in `notion_token`. We accept either the
    // decrypted `notionToken` or the encrypted `notion_token` as a fallback
    // and pass the encrypted value to the server-side Edge Function which
    // can decrypt it using the server's key.
    const { data: settings, error: settingsError } = await this.getSettings();
    if (settingsError || (!settings?.notionToken && !settings?.notion_token)) {
      return {
        error: new Error('Notion token not found. Please connect to Notion first.'),
        data: null,
      };
    }

    // Map syncType to edge function action
    let action: string;
    let edgeSyncType: 'full' | 'incremental' = 'incremental';

    switch (syncType) {
      case 'sync-up':
        action = 'sync_pages';
        edgeSyncType = 'full';
        break;
      case 'sync-down':
        action = 'sync_pages';
        edgeSyncType = 'incremental';
        break;
      case 'test-connection':
        action = 'validate_token';
        break;
      default:
        action = 'sync_pages';
    }

    const maxRetries = 3;
    let lastError: any = null;
    let success = false;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Prepare token payload: prefer decrypted token, otherwise send the
        // encrypted token as `notion_token_encrypted` so the Edge Function
        // can handle decryption server-side.
        const tokenPayload: any = {};
        if (settings.notionToken) {
          tokenPayload.notion_token = settings.notionToken;
        } else if (settings.notion_token) {
          tokenPayload.notion_token_encrypted = settings.notion_token;
        }

        const { data, error } = await this.client.functions.invoke('notion-sync-manager', {
          method: 'POST',
          body: {
            action,
            user_id: this.currentUser.id,
            sync_type: edgeSyncType,
            ...tokenPayload,
          },
        });

        if (error) {
          console.error(`Edge Function Error (${syncType}):`, error);
          lastError = error;
          if (attempt < maxRetries - 1) {
            // Exponential backoff: wait 1s, 2s, 4s...
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }
        } else {
          // Success
          success = true;
          return { data, error: null };
        }

      } catch (e: any) {
        console.error(`Network Error (${syncType}, attempt ${attempt + 1}):`, e);
        lastError = e;
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }
      }
    }

    // Update analytics after sync attempt
    await this.updateSyncAnalytics(success);

    // Check for failure notifications
    if (!success) {
      const shouldNotify = await this.shouldNotifyOnFailure();
      if (shouldNotify) {
        await this.sendFailureNotification();
      }
    }

    return { data: null, error: lastError };
  }

  /**
   * Queues a sync operation for background processing
   */
  public queueSync(type: 'sync-up' | 'sync-down' | 'test-connection', data?: any) {
    this.syncQueue.push({ type, data, timestamp: Date.now() });
    AsyncStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
  }

  /**
   * Processes the sync queue with error handling and persistence
   */
  public async processSyncQueue(): Promise<{ processed: number; errors: number }> {
    let processed = 0;
    let errors = 0;

    while (this.syncQueue.length > 0) {
  const item = this.syncQueue[0];
  if (!item) break;
  const result = await this.syncNotionData(item.type);

      if (!result.error) {
        this.syncQueue.shift();
        processed++;
        await AsyncStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
      } else {
        console.error('Sync queue error:', result.error);
        errors++;
        // Move failed item to end of queue for retry later
        const failedItem = this.syncQueue.shift();
        if (failedItem) {
          this.syncQueue.push(failedItem);
        }
        break; // Stop processing on first error to avoid rate limits
      }
    }

    return { processed, errors };
  }

  /**
   * Loads the sync queue from persistent storage
   */
  public async loadSyncQueue() {
    try {
      const queueData = await AsyncStorage.getItem('sync_queue');
      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
      }
    } catch (e) {
      console.error('Error loading sync queue:', e);
      this.syncQueue = [];
    }
  }

  /**
   * Clears the sync queue (useful for reset operations)
   */
  public async clearSyncQueue() {
    this.syncQueue = [];
    await AsyncStorage.removeItem('sync_queue');
  }

  /**
   * Test database connection health
   */
  public async checkConnectionHealth(): Promise<void> {
    try {
      // Simple query to test database connectivity
      const { error } = await this.client
        .from('user_profiles')
        .select('id')
        .limit(1);

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned, which is fine
        throw new Error(`Database connection failed: ${error.message}`);
      }
    } catch (error) {
      throw new Error(`Supabase health check failed: ${error}`);
    }
  }

  /**
   * Check connection and measure latency
   */
  public async checkConnectionAndLatency(): Promise<number> {
    const startTime = Date.now();
    await this.checkConnectionHealth();
    return Date.now() - startTime;
  }

  /**
   * Get database status information
   */
  public async getDatabaseStatus(): Promise<{
    isConnected: boolean;
    latency: number;
    region?: string;
    version?: string;
  }> {
    try {
      const startTime = Date.now();

      // Try to get database info via RPC
      const { data, error } = await this.client.rpc('get_database_info');
      const latency = Date.now() - startTime;

      // If RPC exists and returns data, use it; otherwise just return connection status
      if (!error && data) {
        return {
          isConnected: true,
          latency,
          region: data.region || undefined,
          version: data.version || undefined,
        };
      }

      // Fallback: just test connection with a simple query
      const { error: testError } = await this.client.from('user_profiles').select('id').limit(1);

      return {
        isConnected: !testError,
        latency,
        // Don't return static values - omit if not available
      };
    } catch (error) {
      return {
        isConnected: false,
        latency: 0,
      };
    }
  }
}

export const supabase = SupabaseService.getInstance().getClient();
// Provide compatibility for CommonJS-style require() used in some tests/mocks.
// Tests may import the module via require('../../src/services/storage/SupabaseService')
// and expect either a named export or the default. Ensure both are present.
export default SupabaseService;
