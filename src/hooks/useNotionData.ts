import { useOptimizedQuery } from './useOptimizedQuery';

// A small wrapper hook that batches fetching of Notion-related data
// (workspace info, sync stats, neural links) using useOptimizedQuery.
export const useNotionData = (notionSyncInstance?: any) => {
  return useOptimizedQuery<{
    workspaceInfo: any | null;
    syncStats: any | null;
    neuralLinks: any[];
  }>({
    queryKey: ['notion-data'],
    queryFn: async () => {
  // Metro resolves modules without .js; silence TS node resolution check
  // @ts-ignore
  const NotionSyncService = notionSyncInstance ?? (await import('../services/integrations/NotionSyncService')).default;
      const ns = NotionSyncService.getInstance();

      const [workspaceInfo, syncStats, neuralLinks] = await Promise.all([
        (async () => {
          try {
            return await ns.getWorkspaceInfo();
          } catch (e) {
            return null;
          }
        })(),
        (async () => {
          try {
            return await ns.getSyncStats();
          } catch (e) {
            return null;
          }
        })(),
        (async () => {
          try {
            return await ns.getNeuralLinks();
          } catch (e) {
            return [];
          }
        })(),
      ]);

      return {
        workspaceInfo,
        syncStats,
        neuralLinks,
      };
    },
  staleTime: 1000 * 60 * 2,
  });
};

export default useNotionData;
