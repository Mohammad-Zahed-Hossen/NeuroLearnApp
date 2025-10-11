// Optional WatermelonDB schema scaffolding - used when WatermelonDB is installed
let schema: any = undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  const { appSchema, tableSchema } = require('@nozbe/watermelondb');

  schema = appSchema({
    version: 1,
    tables: [
      tableSchema({
        name: 'context_snapshots',
        columns: [
          { name: 'timestamp', type: 'number', isIndexed: true },
          { name: 'focus_level', type: 'number' },
          { name: 'energy_level', type: 'number' },
          { name: 'mood_state', type: 'string' },
          { name: 'activity_pattern', type: 'string' },
          { name: 'context_hash', type: 'string' },
          { name: 'version', type: 'number' },
          { name: 'user_id', type: 'string', isOptional: true },
          { name: 'synced', type: 'boolean' },
          { name: 'synced_at', type: 'number', isOptional: true },
          { name: 'created_at', type: 'number' },
          { name: 'updated_at', type: 'number', isOptional: true },
        ],
      }),
      tableSchema({
        name: 'sync_queue',
        columns: [
          { name: 'operation', type: 'string' },
          { name: 'table_name', type: 'string' },
          { name: 'record_id', type: 'string' },
          { name: 'payload', type: 'string' },
          { name: 'attempts', type: 'number' },
          { name: 'last_attempt', type: 'number', isOptional: true },
          { name: 'created_at', type: 'number', isIndexed: true },
        ],
      }),
      tableSchema({
        name: 'daily_insights',
        columns: [
          { name: 'date', type: 'string', isIndexed: true },
          { name: 'avg_focus', type: 'number' },
          { name: 'avg_energy', type: 'number' },
          { name: 'peak_hours', type: 'string' },
          { name: 'total_contexts', type: 'number' },
          { name: 'patterns', type: 'string' },
          { name: 'created_at', type: 'number' },
        ],
      }),
    ],
  });
} catch (e) {
  // WatermelonDB not installed - no-op
}

export { schema };
