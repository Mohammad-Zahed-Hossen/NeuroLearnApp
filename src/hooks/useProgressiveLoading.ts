/**
 * Progressive Loading Hook - Loads data in stages for better UX
 */

import { useState, useCallback, useEffect } from 'react';
import { SmartCacheManager } from '../utils/SmartCacheManager';

interface LoadingStage<T> {
  key: string;
  loader: () => Promise<T>;
  priority: 'critical' | 'important' | 'optional';
  dependencies?: string[];
}

interface ProgressiveLoadingState<T> {
  data: Partial<T>;
  loading: Record<string, boolean>;
  errors: Record<string, string>;
  progress: number;
  stage: string;
}

export function useProgressiveLoading<T extends Record<string, any>>(
  stages: LoadingStage<any>[]
) {
  const [state, setState] = useState<ProgressiveLoadingState<T>>({
    data: {} as Partial<T>,
    loading: {},
    errors: {},
    progress: 0,
    stage: 'Initializing...',
  });

  const cacheManager = SmartCacheManager.getInstance();

  const loadStage = useCallback(async (stage: LoadingStage<any>) => {
    const { key, loader, priority } = stage;
    
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, [key]: true },
      stage: `Loading ${key}...`,
    }));

    try {
      // Try cache first
      let data = await cacheManager.get(key);
      
      if (!data) {
        data = await loader();
        await cacheManager.set(key, data, priority === 'critical' ? 'hot' : 'warm');
      }

      setState(prev => ({
        ...prev,
        data: { ...prev.data, [key]: data },
        loading: { ...prev.loading, [key]: false },
        errors: { ...prev.errors, [key]: '' },
      }));

      return data;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, [key]: false },
        errors: { ...prev.errors, [key]: (error as Error).message },
      }));
      throw error;
    }
  }, [cacheManager]);

  const loadAll = useCallback(async () => {
    const criticalStages = stages.filter(s => s.priority === 'critical');
    const importantStages = stages.filter(s => s.priority === 'important');
    const optionalStages = stages.filter(s => s.priority === 'optional');

    try {
      // Load critical stages first
      await Promise.all(criticalStages.map(loadStage));
      setState(prev => ({ ...prev, progress: 33 }));

      // Load important stages
      await Promise.all(importantStages.map(loadStage));
      setState(prev => ({ ...prev, progress: 66 }));

      // Load optional stages in background
      Promise.all(optionalStages.map(loadStage)).then(() => {
        setState(prev => ({ ...prev, progress: 100, stage: 'Complete' }));
      });

    } catch (error) {
      console.error('Progressive loading failed:', error);
    }
  }, [stages, loadStage]);

  return { ...state, loadAll, loadStage };
}