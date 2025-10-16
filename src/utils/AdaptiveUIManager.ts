/**
 * AdaptiveUIManager - Intelligent UI adaptation based on device capabilities and cognitive load
 */

import { Dimensions, Platform } from 'react-native';

export interface AdaptiveUIConfig {
  cognitiveLoad: number;
  devicePerformance: 'low' | 'medium' | 'high';
  batteryLevel: number;
  networkQuality: 'poor' | 'good' | 'excellent';
  memoryPressure: 'low' | 'medium' | 'high';
}

export interface UIConfiguration {
  animationsEnabled: boolean;
  maxNodes: number;
  updateFrequency: number;
  visualEffects: 'minimal' | 'standard' | 'enhanced';
  physicsQuality: 'low' | 'medium' | 'high';
  renderDistance: number;
  particleEffects: boolean;
  backgroundProcessing: boolean;
}

export class AdaptiveUIManager {
  private static instance: AdaptiveUIManager;
  private currentConfig: UIConfiguration;

  private constructor() {
    this.currentConfig = this.getDefaultConfig();
  }

  public static getInstance(): AdaptiveUIManager {
    if (!AdaptiveUIManager.instance) {
      AdaptiveUIManager.instance = new AdaptiveUIManager();
    }
    return AdaptiveUIManager.instance;
  }

  private getDevicePerformance(): 'low' | 'medium' | 'high' {
    const { width, height } = Dimensions.get('window');
    const screenSize = width * height;
    
    // Simple heuristic based on screen size and platform
    if (Platform.OS === 'ios') {
      return screenSize > 2000000 ? 'high' : screenSize > 1000000 ? 'medium' : 'low';
    } else {
      // Android - more conservative due to fragmentation
      return screenSize > 2500000 ? 'high' : screenSize > 1500000 ? 'medium' : 'low';
    }
  }

  private getDefaultConfig(): UIConfiguration {
    const devicePerf = this.getDevicePerformance();
    
    switch (devicePerf) {
      case 'high':
        return {
          animationsEnabled: true,
          maxNodes: 100,
          updateFrequency: 16, // 60fps
          visualEffects: 'enhanced',
          physicsQuality: 'high',
          renderDistance: 1000,
          particleEffects: true,
          backgroundProcessing: true,
        };
      case 'medium':
        return {
          animationsEnabled: true,
          maxNodes: 50,
          updateFrequency: 33, // 30fps
          visualEffects: 'standard',
          physicsQuality: 'medium',
          renderDistance: 500,
          particleEffects: false,
          backgroundProcessing: true,
        };
      default:
        return {
          animationsEnabled: false,
          maxNodes: 25,
          updateFrequency: 66, // 15fps
          visualEffects: 'minimal',
          physicsQuality: 'low',
          renderDistance: 250,
          particleEffects: false,
          backgroundProcessing: false,
        };
    }
  }

  public getOptimalConfig(metrics: AdaptiveUIConfig): UIConfiguration {
    const baseConfig = this.getDefaultConfig();
    
    // Adjust based on cognitive load
    if (metrics.cognitiveLoad > 0.8) {
      return {
        ...baseConfig,
        animationsEnabled: false,
        maxNodes: Math.min(baseConfig.maxNodes, 25),
        updateFrequency: Math.max(baseConfig.updateFrequency, 66),
        visualEffects: 'minimal',
        particleEffects: false,
      };
    }
    
    // Adjust based on battery level
    if (metrics.batteryLevel < 0.2) {
      return {
        ...baseConfig,
        updateFrequency: Math.max(baseConfig.updateFrequency, 50),
        backgroundProcessing: false,
        particleEffects: false,
        physicsQuality: 'low',
      };
    }
    
    // Adjust based on memory pressure
    if (metrics.memoryPressure === 'high') {
      return {
        ...baseConfig,
        maxNodes: Math.min(baseConfig.maxNodes, 30),
        renderDistance: Math.min(baseConfig.renderDistance, 300),
        backgroundProcessing: false,
      };
    }
    
    // Adjust based on network quality for cloud features
    if (metrics.networkQuality === 'poor') {
      return {
        ...baseConfig,
        backgroundProcessing: false,
      };
    }
    
    return baseConfig;
  }

  public updateConfiguration(metrics: AdaptiveUIConfig): UIConfiguration {
    this.currentConfig = this.getOptimalConfig(metrics);
    return this.currentConfig;
  }

  public getCurrentConfig(): UIConfiguration {
    return this.currentConfig;
  }

  public shouldReduceQuality(metrics: AdaptiveUIConfig): boolean {
    return (
      metrics.cognitiveLoad > 0.7 ||
      metrics.batteryLevel < 0.3 ||
      metrics.memoryPressure === 'high' ||
      metrics.devicePerformance === 'low'
    );
  }
}