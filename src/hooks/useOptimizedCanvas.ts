/**
 * Optimized Canvas Hook - Manages canvas rendering with performance optimizations
 */

import { useCallback, useRef, useMemo } from 'react';
import { AdaptiveUIManager } from '../utils/AdaptiveUIManager';
import { NeuralGraph, NeuralNode } from '../services/learning/MindMapGeneratorService';

interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LODLevel {
  distance: number;
  maxNodes: number;
  detail: 'high' | 'medium' | 'low';
}

export function useOptimizedCanvas() {
  const adaptiveUIManager = AdaptiveUIManager.getInstance();
  const viewportBoundsRef = useRef<ViewportBounds>({ x: 0, y: 0, width: 800, height: 600 });
  const lastRenderTimeRef = useRef(Date.now());

  const lodLevels: LODLevel[] = useMemo(() => [
    { distance: 0, maxNodes: 100, detail: 'high' },
    { distance: 500, maxNodes: 50, detail: 'medium' },
    { distance: 1000, maxNodes: 25, detail: 'low' }
  ], []);

  const getCurrentLOD = useCallback((zoomLevel: number = 1): LODLevel => {
    const distance = 1000 / zoomLevel; // Inverse relationship

    for (const level of lodLevels) {
      if (distance <= level.distance) {
        return level;
      }
    }

    // Fallback to last defined level (array is static so this is safe)
    return lodLevels[lodLevels.length - 1] as LODLevel;
  }, [lodLevels]);

  const getVisibleNodes = useCallback((
    nodes: NeuralNode[],
    viewport: ViewportBounds,
    zoomLevel: number = 1
  ): NeuralNode[] => {
    const currentLOD = getCurrentLOD(zoomLevel);
    const uiConfig = adaptiveUIManager.getCurrentConfig();

    // Apply viewport culling
    const visibleNodes = nodes.filter(node => {
      const nodeX = node.x || 0;
      const nodeY = node.y || 0;

      return (
        nodeX >= viewport.x - 50 &&
        nodeX <= viewport.x + viewport.width + 50 &&
        nodeY >= viewport.y - 50 &&
        nodeY <= viewport.y + viewport.height + 50
      );
    });

    // Apply LOD and performance limits
    const maxNodes = Math.min(currentLOD.maxNodes, uiConfig.maxNodes);

    // Sort by importance/centrality and take top N. centrality may be missing on NeuralNode - guard via any.
    return visibleNodes
      .sort((a, b) => ((b as any).centrality || 0) - ((a as any).centrality || 0))
      .slice(0, maxNodes);
  }, [getCurrentLOD, adaptiveUIManager]);

  const shouldSkipFrame = useCallback((): boolean => {
    const now = Date.now();
    const uiConfig = adaptiveUIManager.getCurrentConfig();
    const timeSinceLastRender = now - lastRenderTimeRef.current;

    if (timeSinceLastRender < uiConfig.updateFrequency) {
      return true;
    }

    lastRenderTimeRef.current = now;
    return false;
  }, [adaptiveUIManager]);

  const updateViewport = useCallback((bounds: ViewportBounds) => {
    viewportBoundsRef.current = bounds;
  }, []);

  const getOptimizedRenderData = useCallback((
    graph: NeuralGraph | null,
    zoomLevel: number = 1
  ) => {
    if (!graph || shouldSkipFrame()) {
      return null;
    }

    const viewport = viewportBoundsRef.current;
    const visibleNodes = getVisibleNodes(graph.nodes, viewport, zoomLevel);
    const currentLOD = getCurrentLOD(zoomLevel);

    // Filter links to only those between visible nodes
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
    const visibleLinks = graph.links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
    });

    return {
      nodes: visibleNodes,
      links: visibleLinks,
      lodLevel: currentLOD,
      renderQuality: currentLOD.detail,
      totalNodes: graph.nodes.length,
      visibleCount: visibleNodes.length,
    };
  }, [getVisibleNodes, getCurrentLOD, shouldSkipFrame]);

  return {
    getOptimizedRenderData,
    updateViewport,
    getCurrentLOD,
    shouldSkipFrame,
  };
}
