import { useCallback, useState } from 'react';
import { useInfiniteQuery, InfiniteData } from '@tanstack/react-query';
import StorageService from '../services/storage/StorageService';
import { TodoistService } from '../services/integrations/TodoistService';

const PAGE_SIZE = 20;

interface TasksPage {
  localTasks: any[];
  todoistTasks: any[];
  nextPage: number;
  hasNextPage: boolean;
}

export const useTasksData = () => {
  const storage = StorageService.getInstance();
  const todoist = TodoistService.getInstance();
  const [syncProgress, setSyncProgress] = useState<{
    isSyncing: boolean;
    progress: number;
    message: string;
  }>({
    isSyncing: false,
    progress: 0,
    message: '',
  });

  const query = useInfiniteQuery<TasksPage, Error, InfiniteData<TasksPage, number>, string[], number>({
    queryKey: ['tasks', 'infinite'],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      // Read settings first to decide whether to call Todoist
      const settings = await storage.getSettings();

      setSyncProgress({
        isSyncing: true,
        progress: 10,
        message: 'Loading settings...',
      });

      const localPromise = storage.getTasks(PAGE_SIZE, pageParam);
      const todoistPromise = settings.todoistToken
        ? (async () => {
            try {
              setSyncProgress(prev => ({ ...prev, progress: 30, message: 'Connecting to Todoist...' }));
              todoist.setApiToken(settings.todoistToken);
              setSyncProgress(prev => ({ ...prev, progress: 50, message: 'Fetching Todoist tasks...' }));
              const tasks = await todoist.getTasks(PAGE_SIZE, pageParam);
              setSyncProgress(prev => ({ ...prev, progress: 80, message: 'Processing Todoist data...' }));
              return tasks;
            } catch (e) {
              console.warn('Todoist fetch failed in useTasksData', e);
              return [];
            }
          })()
        : Promise.resolve([]);

      setSyncProgress(prev => ({ ...prev, progress: 20, message: 'Loading local tasks...' }));

      const [localTasks, todoistTasks] = await Promise.all([
        localPromise,
        todoistPromise,
      ]);

      setSyncProgress({
        isSyncing: false,
        progress: 100,
        message: 'Sync complete',
      });

      // Clear progress after a short delay
      setTimeout(() => {
        setSyncProgress({
          isSyncing: false,
          progress: 0,
          message: '',
        });
      }, 1000);

      return {
        localTasks,
        todoistTasks,
        nextPage: pageParam + PAGE_SIZE,
        hasNextPage: localTasks.length === PAGE_SIZE || todoistTasks.length === PAGE_SIZE,
      };
    },
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.nextPage : undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Flatten all pages into single arrays
  const data = query.data ? {
    localTasks: query.data.pages.flatMap((page: TasksPage) => page.localTasks),
    todoistTasks: query.data.pages.flatMap((page: TasksPage) => page.todoistTasks),
  } : undefined;

  // Expose a stable refetch wrapper
  const refetch = useCallback(async () => {
    setSyncProgress({
      isSyncing: true,
      progress: 0,
      message: 'Starting sync...',
    });
    return query.refetch();
  }, [query]);

  // Load next page
  const fetchNextPage = useCallback(async () => {
    return query.fetchNextPage();
  }, [query]);

  return {
    data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch,
    fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    syncProgress,
  };
};

export default useTasksData;
