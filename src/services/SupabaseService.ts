/**
 * Supabase Service - Backend Integration
 * 
 * Provides authenticated database access with Row Level Security
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your actual Supabase credentials
const SUPABASE_URL = 'https://hitywyvtckdnwkmwwlxr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdHl3eXZ0Y2tkbndrbXd3bHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzM5MzAsImV4cCI6MjA3NDkwOTkzMH0.uFPCG-VW0Pd_EWuwSiLfNU6k_M4ChwXRXdvWneKhS08';

export class SupabaseService {
  private static instance: SupabaseService;
  private client: SupabaseClient;
  private currentUser: User | null = null;

  private constructor() {
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

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public async signUp(email: string, password: string): Promise<{ user: User | null; error: any }> {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'neurolearn://',
      },
    });
    return { user: data.user, error };
  }

  public async signIn(email: string, password: string): Promise<{ user: User | null; error: any }> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });
    return { user: data.user, error };
  }

  public async signOut(): Promise<{ error: any }> {
    const { error } = await this.client.auth.signOut();
    this.currentUser = null;
    return { error };
  }

  public async isAuthenticated(): Promise<boolean> {
    const { data: { session } } = await this.client.auth.getSession();
    return !!session;
  }
}

export const supabase = SupabaseService.getInstance().getClient();
export default SupabaseService;