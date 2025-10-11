/**
 * Performance Optimizer - Critical Performance Fixes
 * 
 * This service implements immediate performance optimizations to address
 * the most critical bottlenecks identified in the NeuroLearn app.
 */

import { Platform } from 'react-native';

export interface DeviceCapabilities {
  tier: 'low' | 'medium' | 'high';
  maxNodes: number;
  maxLinks: number;
  renderQuality: 'low' | 'medium' | 'high';
  enableWorkers: boolean;
  enableAnimations: boolean;
}

export interface PerformanceMetrics {
  frameRate: number;
  memoryUsage: number;
  renderTime: number;
  interactionLatency: number;
  frameDrops: number;
}

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private deviceCapabilities: DeviceCapabilities;
  private metrics: PerformanceMetrics;
  private frameMonitor: number | null = null;
  private lastFrameTime = 0;

  public static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  private constructor() {
    this.deviceCapabilities = this.detectDeviceCapabilities();
    this.metrics = this.initializeMetrics();
    this.startPerformanceMonitoring();
  }

  private detectDeviceCapabilities(): DeviceCapabilities {
    try {
      // Simple device detection based on platform
      let tier: 'low' | 'medium' | 'high' = 'low';

      if (Platform.OS === 'ios') {
        tier = 'high'; // iOS generally performs better
      } else if (Platform.OS === 'web') {
        tier = 'medium';
      }
      // Android defaults to 'low'

      const capabilities: DeviceCapabilities = {
        tier,
        maxNodes: tier === 'low' ? 50 : tier === 'medium' ? 150 : 500,
        maxLinks: tier === 'low' ? 100 : tier === 'medium' ? 300 : 1000,
        renderQuality: tier === 'low' ? 'low' : tier === 'medium' ? 'medium' : 'high',
        enableWorkers: tier !== 'low' && Platform.OS !== 'web',
        enableAnimations: tier !== 'low',
      };

      console.log('🔧 Device capabilities detected:', capabilities);
      return capabilities;
    } catch (error) {
      console.warn('Failed to detect device capabilities:', error);
      return {
        tier: 'medium',
        maxNodes: 100,
        maxLinks: 200,
        renderQuality: 'medium',
        enableWorkers: false,
        enableAnimations: true,
      };
    }
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      frameRate: 60,
      memoryUsage: 0,
      renderTime: 0,
      interactionLatency: 0,
      frameDrops: 0,
    };
  }

  private startPerformanceMonitoring(): void {
    if (this.frameMonitor) return;

    let frameCount = 0;
    let lastSecond = Date.now();
    this.lastFrameTime = performance.now();

    const monitorFrame = () => {
      const now = performance.now();
      const deltaTime = now - this.lastFrameTime;

      if (deltaTime > 16.67) {
        this.metrics.frameDrops++;
      }

      frameCount++;
      
      if (now - lastSecond >= 1000) {
        this.metrics.frameRate = frameCount;
        frameCount = 0;
        lastSecond = now;
        
        if (this.metrics.frameRate < 30) {
          console.warn('⚠️ Low frame rate detected:', this.metrics.frameRate);
        }
      }

      this.lastFrameTime = now;
      this.frameMonitor = requestAnimationFrame(monitorFrame);
    };

    this.frameMonitor = requestAnimationFrame(monitorFrame);
  }

  public getDeviceCapabilities(): DeviceCapabilities {
    return { ...this.deviceCapabilities };
  }

  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public optimizeGraphData(nodes: any[], links: any[]): { nodes: any[]; links: any[] } {
    const { maxNodes, maxLinks } = this.deviceCapabilities;

    let optimizedNodes = nodes;
    if (nodes.length > maxNodes) {
      optimizedNodes = nodes
        .sort((a, b) => {
          const aScore = (a.isActive ? 1 : 0) + (a.healthScore || 0.5);
          const bScore = (b.isActive ? 1 : 0) + (b.healthScore || 0.5);
          return bScore - aScore;
        })
        .slice(0, maxNodes);
    }

    let optimizedLinks = links;
    if (links.length > maxLinks) {
      const nodeIds = new Set(optimizedNodes.map(n => n.id));
      optimizedLinks = links
        .filter(link => {
          const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
          const targetId = typeof link.target === 'string' ? link.target : link.target.id;
          return nodeIds.has(sourceId) && nodeIds.has(targetId);
        })
        .sort((a, b) => (b.strength || 0) - (a.strength || 0))
        .slice(0, maxLinks);
    }

    return { nodes: optimizedNodes, links: optimizedLinks };
  }

  public getAdaptiveRenderSettings(cognitiveLoad: number = 0.5): {
    showLabels: boolean;
    animationIntensity: number;
    renderQuality: 'low' | 'medium' | 'high';
    maxRenderDistance: number;
  } {
    const { renderQuality, enableAnimations } = this.deviceCapabilities;
    const currentFPS = this.metrics.frameRate;

    let adaptiveQuality = renderQuality;
    if (currentFPS < 30) {
      adaptiveQuality = 'low';
    } else if (currentFPS < 45 && renderQuality === 'high') {
      adaptiveQuality = 'medium';
    }

    return {
      showLabels: adaptiveQuality !== 'low' && cognitiveLoad < 0.7,
      animationIntensity: enableAnimations ? (adaptiveQuality === 'high' ? 1.0 : 0.5) : 0,
      renderQuality: adaptiveQuality,
      maxRenderDistance: adaptiveQuality === 'low' ? 200 : adaptiveQuality === 'medium' ? 400 : 800,
    };
  }

  public recordRenderTime(renderTime: number): void {
    this.metrics.renderTime = renderTime;
    
    if (renderTime > 16) {
      console.warn('⚠️ High render time detected:', renderTime + 'ms');
    }
  }

  public recordInteractionLatency(latency: number): void {
    this.metrics.interactionLatency = latency;
    
    if (latency > 100) {
      console.warn('⚠️ High interaction latency detected:', latency + 'ms');
    }
  }

  public getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    const { frameRate, frameDrops, interactionLatency } = this.metrics;

    if (frameRate < 30) {
      recommendations.push('Reduce visual complexity - consider lowering render quality');
    }

    if (frameDrops > 10) {
      recommendations.push('High frame drops detected - optimize animations');
    }

    if (interactionLatency > 100) {
      recommendations.push('Slow interactions - reduce computational load');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is optimal');
    }

    return recommendations;
  }

  public dispose(): void {
    if (this.frameMonitor) {
      cancelAnimationFrame(this.frameMonitor);
      this.frameMonitor = null;
    }
  }
}

export default PerformanceOptimizer;