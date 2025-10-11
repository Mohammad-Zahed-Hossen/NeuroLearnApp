import fallbackDB from './FallbackDatabase';
import { Q } from './Q';

/**
 * Try to initialize a WatermelonDB Database instance using the supplied
 * schema and model scaffolds. If WatermelonDB (native JSI) is not available,
 * return the AsyncStorage-backed fallback DB.
 */
export function initDatabase(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const { Database } = require('@nozbe/watermelondb');
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const SQLiteAdapter = require('@nozbe/watermelondb/adapters/sqlite').default;

    let schema: any = undefined;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      schema = require('./schema').schema;
    } catch (e) {
      schema = undefined;
    }

    const modelClasses: any[] = [];
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      const ctxModel = require('./models/ContextSnapshotModel').default;
      if (ctxModel) modelClasses.push(ctxModel);
    } catch (e) {
      // ignore
    }

    if (schema) {
      try {
        const adapter = new SQLiteAdapter({ schema });
        const dbInstance = new Database({ adapter, modelClasses });
        return dbInstance;
      } catch (e) {
        // fall through to fallback DB
      }
    }

    // Return constructors so callers can initialize later if needed
    return { Database, SQLiteAdapter, modelClasses, Q };
  } catch (err) {
    // WatermelonDB not present — return the fallback DB
    return fallbackDB;
  }
}

export default initDatabase;
