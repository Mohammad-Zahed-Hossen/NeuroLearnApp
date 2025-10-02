/**
 * Migration Service - Local to Supabase Data Migration
 * 
 * Handles seamless migration from AsyncStorage to Supabase
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './SupabaseService';
import { StorageService } from './StorageService';
import { v4 as uuidv4 } from 'uuid';

export interface MigrationStatus {
  isComplete: boolean;
  migratedTables: string[];
  errors: string[];
  totalRecords: number;
  migratedRecords: number;
}

export class MigrationService {
  private static instance: MigrationService;
  private storageService: StorageService;

  private constructor() {
    this.storageService = StorageService.getInstance();
  }

  public static getInstance(): MigrationService {
    if (!MigrationService.instance) {
      MigrationService.instance = new MigrationService();
    }
    return MigrationService.instance;
  }

  /**
   * Check if migration is needed
   */
  public async needsMigration(): Promise<boolean> {
    try {
      const migrationFlag = await AsyncStorage.getItem('@neurolearn/migration_complete');
      return migrationFlag !== 'true';
    } catch (error) {
      console.error('Error checking migration status:', error);
      return true;
    }
  }

  /**
   * Perform complete migration from AsyncStorage to Supabase
   */
  public async migrateAllData(): Promise<MigrationStatus> {
    const status: MigrationStatus = {
      isComplete: false,
      migratedTables: [],
      errors: [],
      totalRecords: 0,
      migratedRecords: 0,
    };

    try {
      console.log('🚀 Starting data migration to Supabase...');

      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated to migrate data');
      }

      // Migrate user profile/settings
      await this.migrateUserProfile(user.id, status);

      // Migrate flashcards
      await this.migrateFlashcards(user.id, status);

      // Migrate logic nodes
      await this.migrateLogicNodes(user.id, status);

      // Migrate focus sessions
      await this.migrateFocusSessions(user.id, status);

      // Migrate reading sessions
      await this.migrateReadingSessions(user.id, status);

      // Migrate neural logs
      await this.migrateNeuralLogs(user.id, status);

      // Mark migration as complete
      await AsyncStorage.setItem('@neurolearn/migration_complete', 'true');
      status.isComplete = true;

      console.log('✅ Migration completed successfully');
      console.log(`📊 Migrated ${status.migratedRecords}/${status.totalRecords} records`);

    } catch (error) {
      console.error('❌ Migration failed:', error);
      status.errors.push(error instanceof Error ? error.message : String(error));
    }

    return status;
  }

  /**
   * Migrate user profile and settings
   */
  private async migrateUserProfile(userId: string, status: MigrationStatus): Promise<void> {
    try {
      const settings = await this.storageService.getSettings();
      const soundSettings = await this.storageService.getSoundSettings();

      const profileData = {
        id: userId,
        theme: settings.theme,
        daily_goal: settings.dailyGoal,
        auto_sync_enabled: settings.autoSync,
        todoist_token: settings.todoistToken,
        notion_token: settings.notionToken,
        notifications: settings.notifications,
        optimal_profile: soundSettings.optimalProfile || {},
      };

      const { error } = await supabase
        .from('user_profiles')
        .upsert(profileData);

      if (error) throw error;

      status.migratedTables.push('user_profiles');
      status.totalRecords += 1;
      status.migratedRecords += 1;

      console.log('✅ User profile migrated');
    } catch (error) {
      console.error('❌ Failed to migrate user profile:', error);
      status.errors.push(`User profile: ${error}`);
    }
  }

  /**
   * Migrate flashcards
   */
  private async migrateFlashcards(userId: string, status: MigrationStatus): Promise<void> {
    try {
      const flashcards = await this.storageService.getFlashcards();

      if (flashcards.length === 0) {
        console.log('📚 No flashcards to migrate');
        return;
      }

      const flashcardData = flashcards.map(card => ({
        id: uuidv4(), // Generate proper UUID instead of using string ID
        user_id: userId,
        front: card.front,
        back: card.back,
        category: card.category,
        next_review_date: card.nextReview.toISOString(),
        stability: (card as any).stability,
        focus_strength: (card as any).focusSessionStrength || 0,
        created_at: card.created.toISOString(),
      }));

      const { error } = await supabase
        .from('flashcards')
        .upsert(flashcardData);

      if (error) throw error;

      status.migratedTables.push('flashcards');
      status.totalRecords += flashcards.length;
      status.migratedRecords += flashcards.length;

      console.log(`✅ ${flashcards.length} flashcards migrated`);
    } catch (error) {
      console.error('❌ Failed to migrate flashcards:', error);
      status.errors.push(`Flashcards: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Migrate logic nodes
   */
  private async migrateLogicNodes(userId: string, status: MigrationStatus): Promise<void> {
    try {
      const logicNodes = await this.storageService.getLogicNodes();
      
      if (logicNodes.length === 0) {
        console.log('🧠 No logic nodes to migrate');
        return;
      }

      const nodeData = logicNodes.map(node => ({
        id: node.id,
        user_id: userId,
        question: node.question,
        type: node.type,
        next_review_date: node.nextReviewDate.toISOString(),
        total_attempts: node.totalAttempts,
        created_at: node.created.toISOString(),
      }));

      const { error } = await supabase
        .from('logic_nodes')
        .upsert(nodeData);

      if (error) throw error;

      status.migratedTables.push('logic_nodes');
      status.totalRecords += logicNodes.length;
      status.migratedRecords += logicNodes.length;

      console.log(`✅ ${logicNodes.length} logic nodes migrated`);
    } catch (error) {
      console.error('❌ Failed to migrate logic nodes:', error);
      status.errors.push(`Logic nodes: ${error}`);
    }
  }

  /**
   * Migrate focus sessions
   */
  private async migrateFocusSessions(userId: string, status: MigrationStatus): Promise<void> {
    try {
      const focusSessions = await this.storageService.getFocusSessions();

      if (focusSessions.length === 0) {
        console.log('🎯 No focus sessions to migrate');
        return;
      }

      // Create mapping of old IDs to new UUIDs for foreign key relationships
      const sessionIdMapping = new Map<string, string>();

      const sessionData = focusSessions.map(session => {
        const newId = uuidv4();
        sessionIdMapping.set(session.id, newId);
        return {
          id: newId, // Generate proper UUID instead of using string ID
          user_id: userId,
          start_time: session.startTime.toISOString(),
          end_time: session.endTime.toISOString(),
          duration_minutes: session.durationMinutes,
          self_report_focus: session.selfReportFocus,
          created_at: session.created.toISOString(),
        };
      });

      const { error } = await supabase
        .from('focus_sessions')
        .upsert(sessionData);

      if (error) throw error;

      // Migrate distraction events with correct session_id references
      const allDistractions = focusSessions.flatMap(session =>
        session.distractionEvents.map(event => ({
          id: uuidv4(), // Generate UUID for distraction events too
          session_id: sessionIdMapping.get(session.id)!, // Use mapped UUID
          timestamp: event.timestamp.toISOString(),
          trigger_type: event.triggerType || 'unknown',
        }))
      );

      if (allDistractions.length > 0) {
        const { error: distractionError } = await supabase
          .from('distraction_events')
          .upsert(allDistractions);

        if (distractionError) throw distractionError;
      }

      status.migratedTables.push('focus_sessions', 'distraction_events');
      status.totalRecords += focusSessions.length + allDistractions.length;
      status.migratedRecords += focusSessions.length + allDistractions.length;

      console.log(`✅ ${focusSessions.length} focus sessions and ${allDistractions.length} distraction events migrated`);
    } catch (error) {
      console.error('❌ Failed to migrate focus sessions:', error);
      status.errors.push(`Focus sessions: ${error}`);
    }
  }

  /**
   * Migrate reading sessions
   */
  private async migrateReadingSessions(userId: string, status: MigrationStatus): Promise<void> {
    try {
      const readingSessions = await this.storageService.getReadingSessions();

      if (readingSessions.length === 0) {
        console.log('📖 No reading sessions to migrate');
        return;
      }

      const sessionData = readingSessions.map(session => ({
        id: uuidv4(), // Generate proper UUID instead of using string ID
        user_id: userId,
        wpm: session.wpmAchieved,
        comprehension_score: session.comprehensionScore,
        session_text: session.textSource,
        concepts: session.conceptsIdentified || [],
        created_at: session.startTime.toISOString(),
      }));

      const { error } = await supabase
        .from('reading_sessions')
        .upsert(sessionData);

      if (error) throw error;

      status.migratedTables.push('reading_sessions');
      status.totalRecords += readingSessions.length;
      status.migratedRecords += readingSessions.length;

      console.log(`✅ ${readingSessions.length} reading sessions migrated`);
    } catch (error) {
      console.error('❌ Failed to migrate reading sessions:', error);
      status.errors.push(`Reading sessions: ${error}`);
    }
  }

  /**
   * Migrate neural logs
   */
  private async migrateNeuralLogs(userId: string, status: MigrationStatus): Promise<void> {
    try {
      const neuralLogs = await this.storageService.getNeuralLogs();
      
      if (neuralLogs.length === 0) {
        console.log('🧠 No neural logs to migrate');
        return;
      }

      const logData = neuralLogs.map(log => ({
        id: log.id,
        user_id: userId,
        timestamp: log.timestamp,
        cognitive_load: log.metrics?.cognitiveLoad || 0.5,
        entrainment_score: log.metrics?.entrainmentScore || 0.5,
      }));

      const { error } = await supabase
        .from('neural_logs')
        .upsert(logData);

      if (error) throw error;

      status.migratedTables.push('neural_logs');
      status.totalRecords += neuralLogs.length;
      status.migratedRecords += neuralLogs.length;

      console.log(`✅ ${neuralLogs.length} neural logs migrated`);
    } catch (error) {
      console.error('❌ Failed to migrate neural logs:', error);
      status.errors.push(`Neural logs: ${error}`);
    }
  }

  /**
   * Reset migration status (for testing)
   */
  public async resetMigrationStatus(): Promise<void> {
    await AsyncStorage.removeItem('@neurolearn/migration_complete');
    console.log('🔄 Migration status reset');
  }
}

export default MigrationService;