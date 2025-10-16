import { supabase } from './SupabaseService';

export class SchemaManager {
  private static instance: SchemaManager;

  public static getInstance(): SchemaManager {
    if (!SchemaManager.instance) {
      SchemaManager.instance = new SchemaManager();
    }
    return SchemaManager.instance;
  }

  /**
   * Validate that all required tables exist in the database
   */
  async validateSchema(): Promise<{ valid: boolean; missingTables: string[]; existingTables: string[] }> {
    const requiredTables = [
      'health_metrics',
      'reading_sessions',
      'user_profiles',
      'focus_sessions',
      'flashcards',
      'logic_nodes',
      'neural_logs',
      'source_links',
      'cognitive_metrics',
      'sleep_logs',
      'budget_analysis'
    ];

    const missingTables: string[] = [];
    const existingTables: string[] = [];

    for (const table of requiredTables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('id')
          .limit(1);

        if (error && error.code === 'PGRST205') {
          missingTables.push(table);
        } else {
          existingTables.push(table);
        }
      } catch (err) {
        missingTables.push(table);
      }
    }

    return {
      valid: missingTables.length === 0,
      missingTables,
      existingTables
    };
  }

  /**
   * Initialize schema by creating missing tables
   * This is mainly for development - production should use proper migrations
   */
  async initializeSchema(): Promise<{ success: boolean; created: string[]; errors: string[] }> {
    const { valid, missingTables } = await this.validateSchema();

    if (valid) {
      console.log('✅ All required tables exist');
      return { success: true, created: [], errors: [] };
    }

    console.warn('⚠️ Missing tables detected:', missingTables);

    if (!__DEV__) {
      throw new Error(`Production database missing tables: ${missingTables.join(', ')}`);
    }

    // In development, try to create missing tables
    const created: string[] = [];
    const errors: string[] = [];

    for (const table of missingTables) {
      try {
        await this.createTable(table);
        created.push(table);
        console.log(`✅ Created table: ${table}`);
      } catch (error) {
        errors.push(`${table}: ${error}`);
        console.error(`❌ Failed to create table ${table}:`, error);
      }
    }

    return {
      success: errors.length === 0,
      created,
      errors
    };
  }
  /**
   * Batch migrate table data for large datasets
   */
  async batchMigrateTable(table: string, items: any[], batchSize: number = 100): Promise<{ migrated: number; failed: number }> {
    let migrated = 0;
    let failed = 0;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      try {
        // Replace with actual migration logic, e.g. upsert to Supabase
        // await supabase.from(table).upsert(batch);
        migrated += batch.length;
      } catch (e) {
        failed += batch.length;
      }
    }
    return { migrated, failed };
  }
  /**
   * Conflict resolution for migration
   */
  resolveMigrationConflict(local: any, remote: any): any {
    // Example: last-write-wins
    if (!local || !remote) return local || remote;
    return (local.updatedAt > remote.updatedAt) ? local : remote;
  }
  /**
   * Create a specific table (development only)
   */
  private async createTable(tableName: string): Promise<void> {
    switch (tableName) {
      case 'health_metrics':
        await this.createHealthMetricsTable();
        break;
      case 'reading_sessions':
        await this.createReadingSessionsTable();
        break;
      case 'user_profiles':
        await this.createUserProfilesTable();
        break;
      case 'focus_sessions':
        await this.createFocusSessionsTable();
        break;
      case 'flashcards':
        await this.createFlashcardsTable();
        break;
      case 'logic_nodes':
        await this.createLogicNodesTable();
        break;
      case 'neural_logs':
        await this.createNeuralLogsTable();
        break;
      case 'source_links':
        await this.createSourceLinksTable();
        break;
      case 'cognitive_metrics':
        await this.createCognitiveMetricsTable();
        break;
      case 'sleep_logs':
        await this.createSleepLogsTable();
        break;
      case 'budget_analysis':
        await this.createBudgetAnalysisTable();
        break;
      default:
        throw new Error(`Unknown table: ${tableName}`);
    }
  }

  private async createHealthMetricsTable(): Promise<void> {
    const { error } = await supabase.rpc('create_health_metrics_table');
    if (error) throw error;
  }

  private async createReadingSessionsTable(): Promise<void> {
    const { error } = await supabase.rpc('create_reading_sessions_table');
    if (error) throw error;
  }

  private async createUserProfilesTable(): Promise<void> {
    const { error } = await supabase.rpc('create_user_profiles_table');
    if (error) throw error;
  }

  private async createFocusSessionsTable(): Promise<void> {
    const { error } = await supabase.rpc('create_focus_sessions_table');
    if (error) throw error;
  }

  private async createFlashcardsTable(): Promise<void> {
    const { error } = await supabase.rpc('create_flashcards_table');
    if (error) throw error;
  }

  private async createLogicNodesTable(): Promise<void> {
    const { error } = await supabase.rpc('create_logic_nodes_table');
    if (error) throw error;
  }

  private async createNeuralLogsTable(): Promise<void> {
    const { error } = await supabase.rpc('create_neural_logs_table');
    if (error) throw error;
  }

  private async createSourceLinksTable(): Promise<void> {
    const { error } = await supabase.rpc('create_source_links_table');
    if (error) throw error;
  }

  private async createCognitiveMetricsTable(): Promise<void> {
    const { error } = await supabase.rpc('create_cognitive_metrics_table');
    if (error) throw error;
  }

  private async createSleepLogsTable(): Promise<void> {
    const { error } = await supabase.rpc('create_sleep_logs_table');
    if (error) throw error;
  }

  private async createBudgetAnalysisTable(): Promise<void> {
    const { error } = await supabase.rpc('create_budget_analysis_table');
    if (error) throw error;
  }

  /**
   * Check database connectivity and schema health
   */
  async checkHealth(): Promise<{
    connected: boolean;
    schemaValid: boolean;
    missingTables: string[];
    recommendations: string[];
  }> {
    const recommendations: string[] = [];

    try {
      // Test basic connectivity
      const { error: authError } = await supabase.auth.getUser();
      const connected = !authError;

      if (!connected) {
        recommendations.push('Check Supabase connection and authentication');
        return {
          connected: false,
          schemaValid: false,
          missingTables: [],
          recommendations
        };
      }

      // Check schema
      const { valid, missingTables } = await this.validateSchema();

      if (!valid) {
        recommendations.push('Run database migrations to create missing tables');
        recommendations.push('Execute: supabase db push');
      }

      return {
        connected: true,
        schemaValid: valid,
        missingTables,
        recommendations
      };
    } catch (error) {
      recommendations.push('Database health check failed - check connection and credentials');
      return {
        connected: false,
        schemaValid: false,
        missingTables: [],
        recommendations
      };
    }
  }
}

export default SchemaManager;
