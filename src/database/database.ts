import fallbackDB from './FallbackDatabase';
import { Q } from './Q';

// Try to dynamically require WatermelonDB. If it's not installed, export a
// small compatibility layer backed by the AsyncStorage fallback DB above.
let database: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  const { Database } = require('@nozbe/watermelondb');
  const SQLiteAdapter = require('@nozbe/watermelondb/adapters/sqlite').default;
  // Try to load schema and model scaffolds if available
  let schema: any = undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    schema = require('./schema').schema;
  } catch (e) {
    schema = undefined;
  }

  let modelClasses: any[] = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const ctxModel = require('./models/ContextSnapshotModel').default;
    if (ctxModel) modelClasses.push(ctxModel);
  } catch (e) {
    // ignore - model not present
  }

  // If schema is present we can create a default SQLite adapter and DB instance.
  // Otherwise export the raw WatermelonDB constructors so the app can initialize later.
  if (schema) {
    try {
      // Try to enable JSI (new architecture) when possible for faster queries.
      // If the platform doesn't support it the adapter constructor may still succeed or throw,
      // in which case we fall back to the compatibility layer below.
      const adapter = new SQLiteAdapter({ schema, jsi: true });
      const dbInstance = new Database({ adapter, modelClasses });
      database = dbInstance;
    } catch (e) {
      // If initialization fails (native modules missing), fall back to compatibility layer
      database = {
        collections: {
          get: (name: string) => fallbackDB.collectionsGet(name),
        },
        write: async (fn: () => Promise<void>) => fallbackDB.write(fn),
        Q,
      };
    }
  } else {
    // Expose constructors so upstream code can initialize when ready
    database = { Database, SQLiteAdapter, modelClasses, Q };
  }
} catch (err) {
  // WatermelonDB not available - provide a minimal compatible API
  database = {
    // Provide a .collections.get(name) API
    collections: {
      get: (name: string) => fallbackDB.collectionsGet(name),
    },
    write: async (fn: () => Promise<void>) => {
      return fallbackDB.write(fn);
    },
    Q,
  };
}

export { Q };
export default database;
