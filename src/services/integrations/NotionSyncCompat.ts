/**
 * NotionSync compatibility shim
 */
import NotionSyncService from './NotionSyncService';

const svcAny: any = (NotionSyncService as any).default || NotionSyncService;

const NotionSyncCompat: any = {
  async initialize() {
    if (typeof svcAny.initialize === 'function') return svcAny.initialize();
    return Promise.resolve();
  },
  async queryDatabase(databaseId: string, opts?: any) {
    if (typeof svcAny.queryDatabase === 'function') return svcAny.queryDatabase(databaseId, opts);
    if (typeof svcAny.query === 'function') return svcAny.query(databaseId, opts);
    return Promise.resolve([]);
  },
  async search(query: string, options?: any) {
    if (typeof svcAny.search === 'function') return svcAny.search(query, options);
    if (typeof svcAny.find === 'function') return svcAny.find(query, options);
    return Promise.resolve([]);
  },
  async getOrCreateDatabase(name: string, schema?: any) {
    if (typeof svcAny.getOrCreateDatabase === 'function') return svcAny.getOrCreateDatabase(name, schema);
    if (typeof svcAny.ensureDatabase === 'function') return svcAny.ensureDatabase(name, schema);
    return Promise.resolve({ id: `db_${name}` });
  },
  async createPage(databaseId: string, payload: any) {
    if (typeof svcAny.createPage === 'function') return svcAny.createPage(databaseId, payload);
    if (typeof svcAny.insertPage === 'function') return svcAny.insertPage(databaseId, payload);
    return Promise.resolve({ id: 'page_mock' });
  },
  async updatePage(pageId: string, patch: any) {
    if (typeof svcAny.updatePage === 'function') return svcAny.updatePage(pageId, patch);
    if (typeof svcAny.patchPage === 'function') return svcAny.patchPage(pageId, patch);
    return Promise.resolve({ id: pageId });
  }
};

export default NotionSyncCompat;
