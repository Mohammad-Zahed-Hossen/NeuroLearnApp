// ContextSnapshotModel scaffold: when WatermelonDB is installed, export a model
// class; otherwise export a no-op placeholder to keep imports safe.
let ContextSnapshotModel: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  const { Model } = require('@nozbe/watermelondb');
  const { field, date, relation } = require('@nozbe/watermelondb/decorators');

  class _ContextSnapshotModel extends Model {
    static table = 'context_snapshots';
    @field('timestamp') timestamp!: number;
    @field('focus_level') focusLevel?: number;
    @field('energy_level') energyLevel?: number;
    @field('mood_state') moodState?: string;
    @field('activity_pattern') activityPattern?: string;
    @field('context_hash') contextHash?: string;
    @field('version') version?: number;
    @field('user_id') userId?: string;
    @field('synced') synced?: boolean;
    @field('synced_at') syncedAt?: number;
    @field('created_at') createdAt?: number;
    @field('updated_at') updatedAt?: number;
  }

  ContextSnapshotModel = _ContextSnapshotModel;
} catch (e) {
  // WatermelonDB not installed - export null placeholder
  ContextSnapshotModel = null;
}

export default ContextSnapshotModel;
