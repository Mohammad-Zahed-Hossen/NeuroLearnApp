/**
 * ContextSensorService - Environmental & Biometric Context Sensing
 *
 * This service establishes Layer 1 (Environmental Context) and Layer 2 (Biometric Context)
 * of the Cognitive Aura 2.0 architecture, enabling the engine to move beyond internal
 * data analysis to true environmental and physiological awareness.
 *
 * Key Capabilities:
 * - Time Intelligence with Circadian Analysis
 * - Location & Social Context Detection
 * - Digital Body Language (DBL) Monitoring
 * - Pattern Recognition & Predictive Analytics
 * - Environmental Optimization Recommendations
 */

import { EventEmitter } from 'eventemitter3';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import * as Battery from 'expo-battery';
import * as Device from 'expo-device';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { differenceInMinutes } from 'date-fns';
import StorageService from '../storage/StorageService';
import CrossModuleBridgeService from '../integrations/CrossModuleBridgeService';
import database from '../../database/database';

// ==================== TYPE DEFINITIONS ====================

type Interaction = {
  timestamp: Date;
  type: 'touch' | 'scroll' | 'type' | 'switch';
  metadata: any;
};

// ==================== CORE INTERFACES ====================

/**
 * Time Intelligence: Circadian rhythm and temporal patterns
 */
export interface TimeIntelligence {
  circadianHour: number; // 0-24 float
  timeOfDay: 'early_morning' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'late_night';
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  isOptimalLearningWindow: boolean;
  energyLevel: 'peak' | 'high' | 'medium' | 'low' | 'recovery';
  historicalPerformance: number; // 0-1 based on past performance at this time
  nextOptimalWindow: Date | null;
}

/**
 * Location & Social Context: Environmental awareness
 */
export interface LocationContext {
  environment: 'home' | 'office' | 'library' | 'commute' | 'outdoor' | 'unknown';
  noiseLevel: 'silent' | 'quiet' | 'moderate' | 'noisy' | 'very_noisy';
  socialSetting: 'alone' | 'with_others' | 'public' | 'private';
  stabilityScore: number; // 0-1, how stable/settled the location is
  privacyLevel: number; // 0-1, how private the setting is
  distractionRisk: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  coordinates: { latitude: number; longitude: number } | null;
  isKnownLocation: boolean;
  locationConfidence: number; // 0-1
}

/**
 * Digital Body Language: User interaction patterns
 */
export interface DigitalBodyLanguage {
  state: 'engaged' | 'fragmented' | 'restless' | 'focused' | 'overwhelmed';
  appSwitchFrequency: number; // Switches per minute
  scrollingVelocity: number; // Average pixels per second
  typingSpeed: number; // WPM when typing
  typingAccuracy: number; // 0-1
  touchPressure: number; // 0-1 (if available)
  interactionPauses: number[]; // Array of pause durations
  deviceOrientation: 'portrait' | 'landscape';
  attentionSpan: number; // Estimated attention span in minutes
  cognitiveLoadIndicator: number; // 0-1 derived from interaction patterns
  stressIndicators: number; // 0-1 based on interaction stress signs
}

/**
 * Complete environmental snapshot
 */
export interface ContextSnapshot {
  timestamp: Date;
  sessionId: string;

  // Core context layers
  timeIntelligence: TimeIntelligence;
  locationContext: LocationContext;
  digitalBodyLanguage: DigitalBodyLanguage;

  // Device state
  batteryLevel: number;
  isCharging: boolean;
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  deviceTemperature: number | null;

  // Aggregated insights
  overallOptimality: number; // 0-1 how optimal current conditions are
  recommendedAction: 'proceed' | 'optimize_environment' | 'take_break' | 'reschedule';
  contextQualityScore: number; // 0-1 overall context quality

  // Predictive elements
  anticipatedChanges: Array<{
    factor: string;
    predictedValue: any;
    timeframe: number; // minutes until change
    confidence: number; // 0-1
  }>;
}

/**
 * Historical pattern recognition
 */
export interface LearningPattern {
  id: string;
  type: 'time' | 'location' | 'interaction' | 'performance';
  pattern: {
    triggers: any[];
    outcomes: any[];
    frequency: number;
    confidence: number;
  };
  lastSeen: Date;
  effectiveness: number; // 0-1
}

// ==================== CONTEXT SENSOR SERVICE ====================

export class ContextSensorService extends EventEmitter {
  private static instance: ContextSensorService;

  // Core services
  private storage: StorageService;
  private crossModuleBridge: CrossModuleBridgeService;

  // State management
  private currentSnapshot: ContextSnapshot | null = null;
  private isMonitoring: boolean = false;
  private sessionId: string;

  // Sensors and timers
  private locationSubscription: any = null;
  private appStateSubscription: any = null;
  private monitoringInterval: NodeJS.Timeout | null = null;

  // Digital Body Language tracking
  private interactionHistory: Array<{
    timestamp: Date;
    type: 'touch' | 'scroll' | 'type' | 'switch';
    metadata: any;
  }> = [];

  private appSwitchHistory: Array<{
    fromApp: string;
    toApp: string;
    timestamp: Date;
  }> = [];

  // Pattern recognition
  private learnedPatterns: LearningPattern[] = [];
  private patternLearningEnabled = true;

  // Cache and optimization
  private contextCache: Map<string, any> = new Map();
  private readonly CACHE_TTL = 300000; // 5 minutes
  private lastLocationUpdate = 0;
  private lastNetworkCheck = 0;

  // User preferences and history
  private optimalLearningTimes: Array<{
    hour: number;
    dayOfWeek: number;
    performance: number;
    lastUpdated: Date;
  }> = [];

  private knownLocations: Array<{
    coordinates: { latitude: number; longitude: number };
    environment: LocationContext['environment'];
    name: string;
    performanceHistory: number[];
  }> = [];

  public static getInstance(): ContextSensorService {
    if (!ContextSensorService.instance) {
      ContextSensorService.instance = new ContextSensorService();
    }
    return ContextSensorService.instance;
  }

  private constructor() {
    super();

    // Initialize services
  this.storage = StorageService.getInstance();
    this.crossModuleBridge = CrossModuleBridgeService.getInstance();

    // Generate unique session ID
    this.sessionId = `context_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('🌍 Context Sensor Service initialized');
    console.log(`📊 Session ID: ${this.sessionId}`);

    // Load historical data
    this.loadHistoricalData();
  }

  // ==================== MAIN CONTEXT SENSING METHOD ====================

  /**
   * Get current complete context snapshot - THE CORE METHOD
   */
  public async getCurrentContext(forceRefresh: boolean = false): Promise<ContextSnapshot> {
    try {
      console.log('🔍 Gathering environmental context...');

      // Check cache if not forced refresh
      if (!forceRefresh && this.currentSnapshot && this.isSnapshotFresh()) {
        console.log('⚡ Using cached context snapshot');
        return this.currentSnapshot;
      }

      const timestamp = new Date();

      // Gather all context layers in parallel
      const [
        timeIntelligence,
        locationContext,
        digitalBodyLanguage,
        deviceState
      ] = await Promise.all([
        this.analyzeTimeIntelligence(),
        this.analyzeLocationContext(),
        this.analyzeDigitalBodyLanguage(),
        this.analyzeDeviceState()
      ]);

      // Calculate aggregated insights
      const overallOptimality = this.calculateOptimality(timeIntelligence, locationContext, digitalBodyLanguage);
      const recommendedAction = this.determineRecommendedAction(overallOptimality, timeIntelligence, locationContext);
      const contextQualityScore = this.calculateContextQuality(timeIntelligence, locationContext, digitalBodyLanguage);

      // Generate predictive insights
      const anticipatedChanges = await this.generatePredictiveInsights(timeIntelligence, locationContext);

      // Create complete snapshot
      const snapshot: ContextSnapshot = {
        timestamp,
        sessionId: this.sessionId,
        timeIntelligence,
        locationContext,
        digitalBodyLanguage,
        batteryLevel: deviceState.batteryLevel,
        isCharging: deviceState.isCharging,
        networkQuality: deviceState.networkQuality,
        deviceTemperature: deviceState.deviceTemperature,
        overallOptimality,
        recommendedAction,
        contextQualityScore,
        anticipatedChanges,
      };

      // Update current snapshot and emit event only if significant change
      const shouldEmit = this.shouldEmitContextUpdate(snapshot);
      this.currentSnapshot = snapshot;

      if (shouldEmit) {
        this.emit('context_updated', snapshot);
      }

      // Learn from this context
      if (this.patternLearningEnabled) {
        await this.updatePatternLearning(snapshot);
      }

      // Store snapshot for historical analysis
      await this.storeContextSnapshot(snapshot);

      console.log('✅ Context snapshot captured', {
        optimality: (overallOptimality * 100).toFixed(1) + '%',
        environment: locationContext.environment,
        timeOfDay: timeIntelligence.timeOfDay,
        dblState: digitalBodyLanguage.state,
        quality: (contextQualityScore * 100).toFixed(1) + '%',
      });

      return snapshot;

    } catch (error) {
      console.error('❌ Failed to capture context snapshot:', error);
      return this.createFallbackSnapshot();
    }
  }

  // ==================== EVENT EMISSION CONTROL ====================

  /**
   * Check if context update should be emitted to prevent infinite loops
   */
  private shouldEmitContextUpdate(newSnapshot: ContextSnapshot): boolean {
    if (!this.currentSnapshot) {
      return true; // First snapshot should always be emitted
    }

    // Check if significant time has passed (at least 30 seconds)
    const timeDiff = newSnapshot.timestamp.getTime() - this.currentSnapshot.timestamp.getTime();
    if (timeDiff < 30000) { // 30 seconds
      return false;
    }

    // Check if there's a significant change in key metrics
    const optimalityDiff = Math.abs(newSnapshot.overallOptimality - this.currentSnapshot.overallOptimality);
    const qualityDiff = Math.abs(newSnapshot.contextQualityScore - this.currentSnapshot.contextQualityScore);

    // Only emit if there's a meaningful change (5% or more)
    return optimalityDiff > 0.05 || qualityDiff > 0.05;
  }

  // ==================== TIME INTELLIGENCE ====================

  /**
   * Analyze time intelligence and circadian patterns
   */
  private async analyzeTimeIntelligence(): Promise<TimeIntelligence> {
    const now = new Date();

    // Calculate circadian hour (0-24 with decimal precision)
    const circadianHour = now.getHours() + (now.getMinutes() / 60);

    // Determine time of day
    const timeOfDay = this.mapToTimeOfDay(circadianHour);

    // Get day of week
    const dayOfWeek = this.mapToDayOfWeek(now.getDay());

    // Analyze if this is an optimal learning window
    const historicalPerformance = this.getHistoricalPerformance(circadianHour, now.getDay());
    const isOptimalLearningWindow = historicalPerformance > 0.7;

    // Determine energy level based on circadian rhythm and personal patterns
    const energyLevel = this.determineEnergyLevel(circadianHour, historicalPerformance);

    // Find next optimal window
    const nextOptimalWindow = await this.findNextOptimalLearningWindow();

    return {
      circadianHour,
      timeOfDay,
      dayOfWeek,
      isOptimalLearningWindow,
      energyLevel,
      historicalPerformance,
      nextOptimalWindow,
    };
  }

  /**
   * Map circadian hour to time of day
   */
  private mapToTimeOfDay(hour: number): TimeIntelligence['timeOfDay'] {
    if (hour < 6) return 'late_night';
    if (hour < 9) return 'early_morning';
    if (hour < 12) return 'morning';
    if (hour < 14) return 'midday';
    if (hour < 18) return 'afternoon';
    if (hour < 22) return 'evening';
    return 'late_night';
  }

  /**
   * Map day number to day of week
   */
  private mapToDayOfWeek(dayNum: number): TimeIntelligence['dayOfWeek'] {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const dayIndex = dayNum as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    return days[dayIndex];
  }

  /**
   * Get historical performance for this time
   */
  private getHistoricalPerformance(circadianHour: number, dayOfWeek: number): number {
    const relevantData = this.optimalLearningTimes.filter(entry =>
      Math.abs(entry.hour - circadianHour) < 2 && entry.dayOfWeek === dayOfWeek
    );

    if (relevantData.length === 0) {
      // Default performance based on general circadian patterns
      if (circadianHour >= 9 && circadianHour <= 11) return 0.85; // Morning peak
      if (circadianHour >= 14 && circadianHour <= 16) return 0.75; // Afternoon peak
      if (circadianHour >= 19 && circadianHour <= 21) return 0.65; // Evening moderate
      return 0.45; // Other times
    }

    const averagePerformance = relevantData.reduce((sum, entry) => sum + entry.performance, 0) / relevantData.length;
    return averagePerformance;
  }

  /**
   * Determine energy level based on circadian patterns
   */
  private determineEnergyLevel(circadianHour: number, performance: number): TimeIntelligence['energyLevel'] {
    // Combine circadian science with personal performance data
    if (performance > 0.8) return 'peak';
    if (performance > 0.7) return 'high';
    if (performance > 0.5) return 'medium';
    if (performance > 0.3) return 'low';
    return 'recovery';
  }

  /**
   * Find the next optimal learning window
   */
  private async findNextOptimalLearningWindow(): Promise<Date | null> {
    const now = new Date();
    const currentHour = now.getHours();

    // Look for next optimal window in the next 24 hours
    for (let hourOffset = 1; hourOffset <= 24; hourOffset++) {
      const futureTime = new Date(now.getTime() + (hourOffset * 60 * 60 * 1000));
      const futureHour = futureTime.getHours();
      const futureDayOfWeek = futureTime.getDay();

      const performance = this.getHistoricalPerformance(futureHour, futureDayOfWeek);

      if (performance > 0.7) {
        return futureTime;
      }
    }

    return null; // No optimal window found in next 24 hours
  }

  // ==================== LOCATION CONTEXT ====================

  /**
   * Analyze location and social context
   */
  private async analyzeLocationContext(): Promise<LocationContext> {
    try {
      // Check permissions
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        console.warn('⚠️ Location permission not granted');
        return this.createFallbackLocationContext();
      }

      // Get current location (with caching to avoid excessive requests)
      const location = await this.getCachedLocation();

      if (!location) {
        return this.createFallbackLocationContext();
      }

      const { latitude, longitude } = location.coords;

      // Analyze environment based on location patterns
      const environment = this.classifyEnvironment({ latitude, longitude });

      // Determine social setting using network analysis
      const socialSetting = await this.analyzeSocialSetting();

      // Assess noise level and distractions
      const { noiseLevel, distractionRisk } = this.assessEnvironmentalFactors(environment, socialSetting);

      // Calculate stability and privacy
      const stabilityScore = this.calculateLocationStability({ latitude, longitude });
      const privacyLevel = this.assessPrivacyLevel(environment, socialSetting);

      // Check if this is a known location
      const knownLocation = this.findKnownLocation({ latitude, longitude });
      const isKnownLocation = knownLocation !== null;

      return {
        environment,
        noiseLevel,
        socialSetting,
        stabilityScore,
        privacyLevel,
        distractionRisk,
        coordinates: { latitude, longitude },
        isKnownLocation,
        locationConfidence: 0.8, // High confidence when location available
      };

    } catch (error) {
      console.error('❌ Location analysis failed:', error);
      return this.createFallbackLocationContext();
    }
  }

  /**
   * Get cached location to avoid excessive requests
   */
  private async getCachedLocation(): Promise<any> {
    const now = Date.now();

    // Use cached location if recent (within 5 minutes)
    if ((now - this.lastLocationUpdate) < 300000) {
      const cached = this.contextCache.get('location');
      if (cached) return cached;
    }

    try {

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      this.contextCache.set('location', location);
      this.lastLocationUpdate = now;

      return location;
    } catch (error) {
      console.warn('⚠️ Could not get current location:', error);
      return null;
    }
  }

  /**
   * Classify environment based on location
   */
  private classifyEnvironment(coordinates: { latitude: number; longitude: number }): LocationContext['environment'] {
    // Check against known locations first
    const knownLocation = this.findKnownLocation(coordinates);
    if (knownLocation) {
      return knownLocation.environment;
    }

    // Use simple heuristics (in a real implementation, you'd use reverse geocoding)
    // For now, return a reasonable default
    return 'unknown';
  }

  /**
   * Analyze social setting using network proxies
   */
  private async analyzeSocialSetting(): Promise<LocationContext['socialSetting']> {
    try {
      // Use network state and device connectivity as proxy for social context
      const networkState = await Network.getNetworkStateAsync();

      if (!networkState.isConnected) {
        return 'alone'; // Likely in isolated location
      }

      if (networkState.type === Network.NetworkStateType.WIFI) {
        return 'private'; // Connected to private WiFi
      }

      if (networkState.type === Network.NetworkStateType.CELLULAR) {
        return 'public'; // Using cellular, likely in public
      }

      return 'alone';

    } catch (error) {
      console.warn('⚠️ Social setting analysis failed:', error);
      return 'alone';
    }
  }

  /**
   * Assess environmental factors
   */
  private assessEnvironmentalFactors(
    environment: LocationContext['environment'],
    social: LocationContext['socialSetting']
  ): { noiseLevel: LocationContext['noiseLevel']; distractionRisk: LocationContext['distractionRisk'] } {

    // Simple mapping based on environment and social context
    let noiseLevel: LocationContext['noiseLevel'] = 'moderate';
    let distractionRisk: LocationContext['distractionRisk'] = 'medium';

    if (environment === 'library') {
      noiseLevel = 'quiet';
      distractionRisk = 'low';
    } else if (environment === 'home' && social === 'alone') {
      noiseLevel = 'quiet';
      distractionRisk = 'low';
    } else if (environment === 'office') {
      noiseLevel = 'moderate';
      distractionRisk = 'medium';
    } else if (environment === 'commute') {
      noiseLevel = 'noisy';
      distractionRisk = 'high';
    } else if (social === 'with_others') {
      noiseLevel = 'moderate';
      distractionRisk = 'medium';
    }

    return { noiseLevel, distractionRisk };
  }

  /**
   * Calculate location stability
   */
  private calculateLocationStability(coordinates: { latitude: number; longitude: number }): number {
    // Simple stability calculation based on location history
    const recentLocations = Array.from(this.contextCache.values())
      .filter(item => item && item.coords)
      .slice(-5); // Last 5 location readings

    if (recentLocations.length < 2) return 1.0;

    const distances = recentLocations.map(loc => {
      const dist = this.calculateDistance(coordinates, loc.coords);
      return dist;
    });

    const averageDistance = distances.reduce((sum, dist) => sum + dist, 0) / distances.length;

    // High stability if staying in same general area
    return Math.max(0, 1 - (averageDistance / 1000)); // Normalize by 1km
  }

  /**
   * Calculate distance between two coordinates (simple approximation)
   */
  private calculateDistance(
    coord1: { latitude: number; longitude: number },
    coord2: { latitude: number; longitude: number }
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in meters
  }

  /**
   * Assess privacy level
   */
  private assessPrivacyLevel(
    environment: LocationContext['environment'],
    social: LocationContext['socialSetting']
  ): number {
    if (environment === 'home' && social === 'alone') return 1.0;
    if (environment === 'library' && social === 'alone') return 0.8;
    if (environment === 'office' && social === 'private') return 0.7;
    if (social === 'with_others') return 0.4;
    if (social === 'public') return 0.2;
    return 0.6; // Default moderate privacy
  }

  /**
   * Find known location by coordinates
   */
  private findKnownLocation(coordinates: { latitude: number; longitude: number }): any {
    return this.knownLocations.find(location => {
      const distance = this.calculateDistance(coordinates, location.coordinates);
      return distance < 100; // Within 100 meters
    });
  }

  /**
   * Create fallback location context when location unavailable
   */
  private createFallbackLocationContext(): LocationContext {
    return {
      environment: 'unknown',
      noiseLevel: 'moderate',
      socialSetting: 'alone',
      stabilityScore: 0.5,
      privacyLevel: 0.5,
      distractionRisk: 'medium',
      coordinates: null,
      isKnownLocation: false,
      locationConfidence: 0.3,
    };
  }

  // ==================== DIGITAL BODY LANGUAGE ====================

  /**
   * Analyze digital body language from user interactions
   */
  private analyzeDigitalBodyLanguage(): DigitalBodyLanguage {
    const recentInteractions = this.getRecentInteractions();

    // Calculate app switch frequency
    const appSwitchFrequency = this.calculateAppSwitchFrequency();

    // Analyze scrolling patterns
    const scrollingVelocity = this.calculateScrollingVelocity(recentInteractions);

    // Estimate typing metrics
    const { typingSpeed, typingAccuracy } = this.analyzeTypingPatterns(recentInteractions);

    // Calculate interaction pauses
    const interactionPauses = this.calculateInteractionPauses(recentInteractions);

    // Determine attention span
    const attentionSpan = this.estimateAttentionSpan();

    // Calculate cognitive load indicators
    const cognitiveLoadIndicator = this.calculateCognitiveLoadFromDBL(
      appSwitchFrequency,
      scrollingVelocity,
      interactionPauses
    );

    // Detect stress indicators
    const stressIndicators = this.detectStressIndicators(recentInteractions);

    // Determine overall DBL state
    const state = this.determineDBLState(
      appSwitchFrequency,
      cognitiveLoadIndicator,
      attentionSpan,
      stressIndicators
    );

    return {
      state,
      appSwitchFrequency,
      scrollingVelocity,
      typingSpeed,
      typingAccuracy,
      touchPressure: 0.5, // Default - would need native implementation
      interactionPauses,
      deviceOrientation: 'portrait', // Would get from DeviceMotion
      attentionSpan,
      cognitiveLoadIndicator,
      stressIndicators,
    };
  }

  /**
   * Get recent interaction history
   */
  private getRecentInteractions(): typeof this.interactionHistory {
    const fiveMinutesAgo = new Date(Date.now() - 300000);
    return this.interactionHistory.filter(interaction => interaction.timestamp > fiveMinutesAgo);
  }

  /**
   * Calculate app switch frequency
   */
  private calculateAppSwitchFrequency(): number {
    const recentSwitches = this.appSwitchHistory.filter(
      (switch_): switch_ is NonNullable<typeof switch_> =>
        switch_ !== null && switch_ !== undefined && switch_.timestamp !== undefined && switch_.timestamp > new Date(Date.now() - 600000) // Last 10 minutes
    );

    return recentSwitches.length / 10; // Switches per minute
  }

  /**
   * Calculate scrolling velocity
   */
  private calculateScrollingVelocity(interactions: typeof this.interactionHistory): number {
    const scrollEvents = interactions.filter(i => i.type === 'scroll');

    if (scrollEvents.length === 0) return 0;

    const totalVelocity = scrollEvents.reduce((sum, event) => {
      return sum + (event.metadata?.velocity || 0);
    }, 0);

    return totalVelocity / scrollEvents.length;
  }

  /**
   * Analyze typing patterns
   */
  private analyzeTypingPatterns(interactions: typeof this.interactionHistory): {
    typingSpeed: number;
    typingAccuracy: number;
  } {
    const typeEvents = interactions.filter(i => i.type === 'type');

    if (typeEvents.length === 0) {
      return { typingSpeed: 0, typingAccuracy: 1.0 };
    }

    // Simple estimation based on available data
    const averageSpeed = typeEvents.reduce((sum, event) => {
      return sum + (event.metadata?.speed || 200); // Default 200 WPM
    }, 0) / typeEvents.length;

    const averageAccuracy = typeEvents.reduce((sum, event) => {
      return sum + (event.metadata?.accuracy || 0.95);
    }, 0) / typeEvents.length;

    return {
      typingSpeed: averageSpeed,
      typingAccuracy: averageAccuracy,
    };
  }

  /**
   * Calculate interaction pauses
   */
  private calculateInteractionPauses(interactions: typeof this.interactionHistory): number[] {
    if (interactions.length < 2) return [];

    const pauses: number[] = [];

    for (let i = 1; i < interactions.length; i++) {
      const current = interactions[i];
      const previous = interactions[i-1];
      if (current && previous) {
        const pauseDuration = current!.timestamp.getTime() - previous!.timestamp.getTime();
        pauses.push(pauseDuration);
      }
    }

    return pauses.slice(-10); // Last 10 pauses
  }

  /**
   * Estimate attention span based on interaction patterns
   */
  private estimateAttentionSpan(): number {
    // Use app state and interaction continuity to estimate attention span
    const recentSwitches = this.appSwitchHistory.slice(-5);

    if (recentSwitches.length < 2) return 20; // Default 20 minutes

    const intervals = recentSwitches.map((switch_, index) => {
      if (index === 0) return 0;
      const prev = recentSwitches[index - 1];
      if (!prev) return 0;
      return differenceInMinutes(switch_.timestamp, prev.timestamp);
    }).filter(interval => interval > 0);

    if (intervals.length === 0) return 20;

    const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    return Math.max(2, Math.min(60, averageInterval)); // Clamp between 2-60 minutes
  }

  /**
   * Calculate cognitive load from digital body language
   */
  private calculateCognitiveLoadFromDBL(
    appSwitchFreq: number,
    scrollingVel: number,
    pauses: number[]
  ): number {
    let cognitiveLoad = 0.5; // Base load

    // High app switching indicates cognitive overload
    if (appSwitchFreq > 2) cognitiveLoad += 0.3;
    else if (appSwitchFreq > 1) cognitiveLoad += 0.1;

    // Rapid scrolling can indicate searching/restlessness
    if (scrollingVel > 1000) cognitiveLoad += 0.2;

    // Inconsistent pauses indicate fragmented attention
    if (pauses.length > 3) {
      const pauseVariance = this.calculateVariance(pauses);
      if (pauseVariance > 10000) cognitiveLoad += 0.2; // High variance in pause timing
    }

    return Math.max(0, Math.min(1, cognitiveLoad));
  }

  /**
   * Detect stress indicators from interaction patterns
   */
  private detectStressIndicators(interactions: typeof this.interactionHistory): number {
    let stressScore = 0;

    // Rapid consecutive actions
    let rapidActions = 0;
    for (let i = 1; i < interactions.length; i++) {
      const current = interactions[i];
      const previous = interactions[i-1];
      if (current && previous) {
        const timeDiff = current!.timestamp.getTime() - previous!.timestamp.getTime();
        if (timeDiff < 500) rapidActions++; // Less than 500ms between actions
      }
    }

    if (rapidActions > 5) stressScore += 0.3;

    // High frequency of corrections/backtracking
    const typeEvents = interactions.filter((i): i is Interaction => i !== null && i !== undefined && i.type === 'type');
    const corrections = typeEvents.filter(e => {
      if (!e.metadata || typeof e.metadata !== 'object') return false;
      return 'isCorrection' in e.metadata && Boolean((e.metadata as any).isCorrection);
    }).length;

    if (corrections > typeEvents.length * 0.2) stressScore += 0.2;

    return Math.max(0, Math.min(1, stressScore));
  }

  /**
   * Determine overall DBL state
   */
  private determineDBLState(
    appSwitchFreq: number,
    cognitiveLoad: number,
    attentionSpan: number,
    stress: number
  ): DigitalBodyLanguage['state'] {
    if (stress > 0.7 || cognitiveLoad > 0.8) return 'overwhelmed';
    if (appSwitchFreq > 2 || attentionSpan < 5) return 'fragmented';
    if (appSwitchFreq > 1 || cognitiveLoad > 0.6) return 'restless';
    if (attentionSpan > 15 && cognitiveLoad < 0.4) return 'focused';
    return 'engaged';
  }

  /**
   * Calculate variance of an array of numbers
   */
  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;

    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }

  // ==================== DEVICE STATE ANALYSIS ====================

  /**
   * Analyze device state and performance factors
   */
  private async analyzeDeviceState(): Promise<{
    batteryLevel: number;
    isCharging: boolean;
    networkQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
    deviceTemperature: number | null;
  }> {
    try {
      // Get battery information
      const batteryLevel = await Battery.getBatteryLevelAsync();
      const batteryState = await Battery.getBatteryStateAsync();
      const isCharging = batteryState === Battery.BatteryState.CHARGING;

      // Get network quality
      const networkQuality = await this.assessNetworkQuality();

      // Device temperature (would need native implementation)
      const deviceTemperature = null;

      return {
        batteryLevel,
        isCharging,
        networkQuality,
        deviceTemperature,
      };

    } catch (error) {
      console.error('❌ Device state analysis failed:', error);
      return {
        batteryLevel: 0.5,
        isCharging: false,
        networkQuality: 'good',
        deviceTemperature: null,
      };
    }
  }

  /**
   * Assess network quality
   */
  private async assessNetworkQuality(): Promise<'excellent' | 'good' | 'fair' | 'poor' | 'offline'> {
    try {
      const now = Date.now();

      // Use cached result if recent
      if ((now - this.lastNetworkCheck) < 30000) {
        const cached = this.contextCache.get('networkQuality');
        if (cached) return cached;
      }

      const networkState = await Network.getNetworkStateAsync();

      if (!networkState.isConnected) {
        this.contextCache.set('networkQuality', 'offline');
        return 'offline';
      }

      // Simple heuristic based on connection type
      let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'good';

      if (networkState.type === Network.NetworkStateType.WIFI) {
        quality = 'excellent';
      } else if (networkState.type === Network.NetworkStateType.CELLULAR) {
        quality = 'good';
      } else if (networkState.type === Network.NetworkStateType.OTHER) {
        quality = 'fair';
      }

      this.contextCache.set('networkQuality', quality);
      this.lastNetworkCheck = now;

      return quality;

    } catch (error) {
      console.warn('⚠️ Network quality assessment failed:', error);
      return 'fair';
    }
  }

  // ==================== AGGREGATED INSIGHTS ====================

  /**
   * Calculate overall optimality score
   */
  private calculateOptimality(
    timeIntel: TimeIntelligence,
    locationCtx: LocationContext,
    dbl: DigitalBodyLanguage
  ): number {
    let optimality = 0.5; // Base optimality

    // Time intelligence factors (40% weight)
    if (timeIntel.isOptimalLearningWindow) optimality += 0.2;
    optimality += (timeIntel.historicalPerformance - 0.5) * 0.2;

    // Location factors (35% weight)
    if (locationCtx.environment === 'library' || locationCtx.environment === 'home') optimality += 0.15;
    if (locationCtx.socialSetting === 'alone' || locationCtx.socialSetting === 'private') optimality += 0.1;
    if (locationCtx.distractionRisk === 'very_low' || locationCtx.distractionRisk === 'low') optimality += 0.1;

    // Digital body language factors (25% weight)
    if (dbl.state === 'focused') optimality += 0.15;
    else if (dbl.state === 'engaged') optimality += 0.1;
    else if (dbl.state === 'overwhelmed' || dbl.state === 'fragmented') optimality -= 0.1;

    optimality -= (dbl.cognitiveLoadIndicator - 0.5) * 0.1;

    return Math.max(0, Math.min(1, optimality));
  }

  /**
   * Determine recommended action based on context
   */
  private determineRecommendedAction(
    optimality: number,
    timeIntel: TimeIntelligence,
    locationCtx: LocationContext
  ): ContextSnapshot['recommendedAction'] {
    if (optimality > 0.8) return 'proceed';

    if (timeIntel.energyLevel === 'recovery' || timeIntel.energyLevel === 'low') {
      return 'take_break';
    }

    if (locationCtx.distractionRisk === 'very_high' || locationCtx.distractionRisk === 'high') {
      return 'optimize_environment';
    }

    if (optimality < 0.4) return 'reschedule';

    if (optimality < 0.6) return 'optimize_environment';

    return 'proceed';
  }

  /**
   * Calculate context quality score
   */
  private calculateContextQuality(
    timeIntel: TimeIntelligence,
    locationCtx: LocationContext,
    dbl: DigitalBodyLanguage
  ): number {
    const timeQuality = timeIntel.historicalPerformance;
    const locationQuality = (locationCtx.stabilityScore + locationCtx.privacyLevel +
      (locationCtx.distractionRisk === 'low' ? 1 : 0.5)) / 3;
    const interactionQuality = 1 - dbl.cognitiveLoadIndicator;

    return (timeQuality * 0.4 + locationQuality * 0.35 + interactionQuality * 0.25);
  }

  /**
   * Generate predictive insights
   */
  private async generatePredictiveInsights(
    timeIntel: TimeIntelligence,
    locationCtx: LocationContext
  ): Promise<ContextSnapshot['anticipatedChanges']> {
    const insights: ContextSnapshot['anticipatedChanges'] = [];

    // Predict energy level changes
    if (timeIntel.energyLevel === 'peak') {
      insights.push({
        factor: 'energy_level',
        predictedValue: 'high',
        timeframe: 60, // 1 hour
        confidence: 0.8,
      });
    }

    // Predict optimal window ending
    if (timeIntel.isOptimalLearningWindow && timeIntel.nextOptimalWindow) {
      const timeUntilNext = differenceInMinutes(timeIntel.nextOptimalWindow, new Date());
      insights.push({
        factor: 'optimal_window',
        predictedValue: false,
        timeframe: Math.max(30, timeUntilNext / 2),
        confidence: 0.7,
      });
    }

    // Predict location stability changes (if moving)
    if (locationCtx.stabilityScore < 0.7) {
      insights.push({
        factor: 'location_stability',
        predictedValue: 0.9,
        timeframe: 15,
        confidence: 0.6,
      });
    }

    return insights;
  }

  // ==================== MONITORING AND EVENTS ====================

  /**
   * Start continuous context monitoring
   */
  public async startMonitoring(intervalMinutes: number = 2): Promise<void> {
    if (this.isMonitoring) {
      console.log('📊 Context monitoring already running');
      return;
    }

    console.log(`🚀 Starting context monitoring (${intervalMinutes}min intervals)`);

    this.isMonitoring = true;

    // Set up app state monitoring
    this.setupAppStateMonitoring();

    // Set up location monitoring
    await this.setupLocationMonitoring();

    // Set up periodic context updates
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.getCurrentContext(true);
      } catch (error) {
        console.error('❌ Context monitoring error:', error);
      }
    }, intervalMinutes * 60 * 1000);

    // Take initial snapshot
    await this.getCurrentContext(true);
  }

  /**
   * Stop context monitoring
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) return;

    console.log('⏹️ Stopping context monitoring');

    this.isMonitoring = false;

    // Clear intervals and subscriptions
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }
  }

  /**
   * Setup app state monitoring for DBL
   */
  private setupAppStateMonitoring(): void {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      this.recordInteraction({
        timestamp: new Date(),
        type: 'switch',
        metadata: {
          appState: nextAppState,
        },
      });
    });
  }

  /**
   * Setup location monitoring
   */
  private async setupLocationMonitoring(): Promise<void> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 300000, // 5 minutes
          distanceInterval: 100, // 100 meters
        },
        (location) => {
          this.contextCache.set('location', location);
          this.lastLocationUpdate = Date.now();
        }
      );

    } catch (error) {
      console.warn('⚠️ Location monitoring setup failed:', error);
    }
  }

  /**
   * Record user interaction for DBL analysis
   */
  public recordInteraction(interaction: {
    timestamp: Date;
    type: 'touch' | 'scroll' | 'type' | 'switch';
    metadata: any;
  }): void {
    this.interactionHistory.push(interaction);

    // Keep only last 1000 interactions
    if (this.interactionHistory.length > 1000) {
      this.interactionHistory = this.interactionHistory.slice(-1000);
    }

    // Emit real-time DBL update if significant change
    if (this.interactionHistory.length % 10 === 0) {
      const dbl = this.analyzeDigitalBodyLanguage();
      this.emit('dbl_updated', dbl);
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Check if current snapshot is fresh
   */
  private isSnapshotFresh(): boolean {
    if (!this.currentSnapshot) return false;
    const age = Date.now() - this.currentSnapshot.timestamp.getTime();
    return age < this.CACHE_TTL;
  }

  /**
   * Create fallback snapshot when sensing fails
   */
  private createFallbackSnapshot(): ContextSnapshot {
    const timestamp = new Date();

    return {
      timestamp,
      sessionId: this.sessionId,
      timeIntelligence: {
        circadianHour: timestamp.getHours() + (timestamp.getMinutes() / 60),
        timeOfDay: this.mapToTimeOfDay(timestamp.getHours()),
        dayOfWeek: this.mapToDayOfWeek(timestamp.getDay()),
        isOptimalLearningWindow: false,
        energyLevel: 'medium',
        historicalPerformance: 0.5,
        nextOptimalWindow: null,
      },
      locationContext: this.createFallbackLocationContext(),
      digitalBodyLanguage: {
        state: 'engaged',
        appSwitchFrequency: 0,
        scrollingVelocity: 0,
        typingSpeed: 0,
        typingAccuracy: 1.0,
        touchPressure: 0.5,
        interactionPauses: [],
        deviceOrientation: 'portrait',
        attentionSpan: 20,
        cognitiveLoadIndicator: 0.5,
        stressIndicators: 0,
      },
      batteryLevel: 0.5,
      isCharging: false,
      networkQuality: 'good',
      deviceTemperature: null,
      overallOptimality: 0.5,
      recommendedAction: 'proceed',
      contextQualityScore: 0.5,
      anticipatedChanges: [],
    };
  }

  // ==================== PATTERN LEARNING ====================

  /**
   * Update pattern learning from context snapshots
   */
  private async updatePatternLearning(snapshot: ContextSnapshot): Promise<void> {
    try {
      // This is where we'd implement machine learning for pattern recognition
      // For now, we'll do simple statistical learning

      // Record optimal learning time patterns
      if (snapshot.timeIntelligence.isOptimalLearningWindow) {
        this.recordOptimalTime(snapshot.timeIntelligence);
      }

      // Record successful location patterns
      if (snapshot.overallOptimality > 0.7 && snapshot.locationContext.coordinates) {
        this.recordSuccessfulLocation(snapshot.locationContext);
      }

    } catch (error) {
      console.error('❌ Pattern learning update failed:', error);
    }
  }

  /**
   * Record optimal learning time
   */
  private recordOptimalTime(timeIntel: TimeIntelligence): void {
    const existingEntry = this.optimalLearningTimes.find(
      entry => Math.abs(entry.hour - timeIntel.circadianHour) < 1 &&
               entry.dayOfWeek === new Date().getDay()
    );

    if (existingEntry) {
      // Update existing entry with weighted average
      existingEntry.performance = (existingEntry.performance * 0.8) + (timeIntel.historicalPerformance * 0.2);
      existingEntry.lastUpdated = new Date();
    } else {
      // Create new entry
      this.optimalLearningTimes.push({
        hour: timeIntel.circadianHour,
        dayOfWeek: new Date().getDay(),
        performance: timeIntel.historicalPerformance,
        lastUpdated: new Date(),
      });
    }
  }

  /**
   * Record successful location
   */
  private recordSuccessfulLocation(locationCtx: LocationContext): void {
    if (!locationCtx.coordinates) return;

    const existingLocation = this.findKnownLocation(locationCtx.coordinates);

    if (existingLocation) {
      // Update performance history
      existingLocation.performanceHistory.push(0.8); // Good performance
      if (existingLocation.performanceHistory.length > 20) {
        existingLocation.performanceHistory = existingLocation.performanceHistory.slice(-20);
      }
    } else {
      // Add new known location
      this.knownLocations.push({
        coordinates: locationCtx.coordinates,
        environment: locationCtx.environment,
        name: `Location ${this.knownLocations.length + 1}`,
        performanceHistory: [0.8],
      });
    }
  }

  // ==================== DATA PERSISTENCE ====================

  /**
   * Store context snapshot for historical analysis
   */
  private async storeContextSnapshot(snapshot: ContextSnapshot): Promise<void> {
    try {
      // Use StorageService facade for persistence
      const storage = StorageService.getInstance();
      try {
        await storage.saveContextSnapshot(snapshot as any);
        return;
      } catch (err) {
        console.warn('StorageService.saveContextSnapshot failed, falling back to local AsyncStorage:', err);
        // Fallback: persist locally only if facade fails
        const storageKey = `context_snapshot_${snapshot.timestamp.getTime()}`;
        const snapshotData = {
          ...snapshot,
          timestamp: snapshot.timestamp.toISOString(), // Serialize date
        };
        await AsyncStorage.setItem(storageKey, JSON.stringify(snapshotData));
        await this.cleanupOldSnapshots();
      }
    } catch (error) {
      console.warn('⚠️ Failed to store context snapshot (fallback path):', error);
    }
  }

  /**
   * Cleanup old context snapshots to prevent storage full errors
   * AGGRESSIVE CLEANUP: Reduced from 1000 to 100 snapshots to prevent database full
   */
  private async cleanupOldSnapshots(): Promise<void> {
    try {
      // Prefer cleaning from warm-tier DB first
      try {
        const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000); // keep 30 days in warm DB
        await database.write(async () => {
          const col = database.collections.get('context_snapshots');
          const old = await col.query(
            // if Q is available, fallbackDB.query() accepts no args as well; guard loosely
          ).fetch();

          // Fallback DB doesn't support complex where clauses here; do a manual filter/delete
          for (const rec of old) {
            try {
              const ts = rec._raw ? rec._raw.timestamp : rec.timestamp;
              if (ts && ts < cutoff) {
                if (typeof rec.markAsDeleted === 'function') await rec.markAsDeleted();
                else if (rec._raw && rec._raw.id && typeof (col as any).markAsDeletedById === 'function') {
                  await (col as any).markAsDeletedById(rec._raw.id);
                }
              }
            } catch (e) {
              // ignore individual failures
            }
          }
        });
      } catch (dbCleanupErr) {
        // If DB cleanup is not possible, fallback to legacy AsyncStorage cleanup
        try {
          // Prefer Hybrid/StorageService for key listing if available
          let keys: readonly string[] = [];
          try {
            const svc: any = StorageService.getInstance();
            if (svc && typeof svc.getAllKeys === 'function') {
              keys = await svc.getAllKeys();
            } else if (svc && svc.getHybridService && typeof svc.getHybridService().getAllKeys === 'function') {
              keys = await svc.getHybridService().getAllKeys();
            } else {
              keys = await AsyncStorage.getAllKeys() as readonly string[];
            }
          } catch (e) {
            keys = await AsyncStorage.getAllKeys() as readonly string[];
          }
          const snapshotKeys = keys.filter(key => key.startsWith('context_snapshot_'));

          // AGGRESSIVE: Keep only last 100 snapshots instead of 1000
          const MAX_SNAPSHOTS = 100;

          if (snapshotKeys.length > MAX_SNAPSHOTS) {
            // Sort keys by timestamp extracted from key (oldest first)
            const sortedKeys = snapshotKeys.sort((a, b) => {
              const aTime = parseInt(a.replace('context_snapshot_', ''), 10);
              const bTime = parseInt(b.replace('context_snapshot_', ''), 10);
              return aTime - bTime;
            });

            // Delete oldest snapshots, keep only the most recent MAX_SNAPSHOTS
            const keysToDelete = sortedKeys.slice(0, snapshotKeys.length - MAX_SNAPSHOTS);

            // Remove keys via StorageService facade if possible for consistency
            try {
              const svc: any = StorageService.getInstance();
              if (svc && typeof svc.removeItem === 'function') {
                await Promise.all(keysToDelete.map(k => svc.removeItem(k)));
              } else {
                await AsyncStorage.multiRemove(keysToDelete);
              }
            } catch (e) {
              await AsyncStorage.multiRemove(keysToDelete);
            }

            console.log(`🧹 Aggressively cleaned up ${keysToDelete.length} old context snapshots (keeping ${MAX_SNAPSHOTS})`);
          }

          // Also cleanup other CAE-related storage to prevent buildup
          await this.cleanupRelatedStorage();
        } catch (e) {
          console.warn('⚠️ Failed to cleanup old context snapshots via AsyncStorage as fallback:', e);
        }
      }

    } catch (error) {
      console.warn('⚠️ Failed to cleanup old context snapshots:', error);
      // Try emergency cleanup if regular cleanup fails
      await this.emergencyCleanup();
    }
  }

  /**
   * Cleanup related CAE storage to prevent database bloat
   */
  private async cleanupRelatedStorage(): Promise<void> {
    try {
          let keys: readonly string[] = [];
          try {
            const svc: any = StorageService.getInstance();
            if (svc && typeof svc.getAllKeys === 'function') keys = await svc.getAllKeys();
            else if (svc && svc.getHybridService && typeof svc.getHybridService().getAllKeys === 'function') keys = await svc.getHybridService().getAllKeys();
            else keys = await AsyncStorage.getAllKeys() as readonly string[];
          } catch (e) {
            keys = await AsyncStorage.getAllKeys() as readonly string[];
          }

      // Cleanup old CAE cache entries
      const caeKeys = keys.filter(key =>
        key.startsWith('@neurolearn/cache_context_snapshots') ||
        key.startsWith('@neurolearn/cache_cognitive_forecasts') ||
        key.startsWith('@neurolearn/cache_learned_patterns')
      );

      // Keep only last 50 entries for each type
      const MAX_CAE_ENTRIES = 50;

      for (const prefix of ['@neurolearn/cache_context_snapshots', '@neurolearn/cache_cognitive_forecasts', '@neurolearn/cache_learned_patterns']) {
        const prefixKeys = caeKeys.filter(key => key.startsWith(prefix));

        if (prefixKeys.length > MAX_CAE_ENTRIES) {
          // Sort by timestamp if available, otherwise just keep recent ones
          const keysToDelete = prefixKeys.slice(0, prefixKeys.length - MAX_CAE_ENTRIES);
          try {
            const svc: any = StorageService.getInstance();
            if (svc && typeof svc.removeItem === 'function') {
              await Promise.all(keysToDelete.map(k => svc.removeItem(k)));
            } else {
              await AsyncStorage.multiRemove(keysToDelete);
            }
          } catch (e) {
            await AsyncStorage.multiRemove(keysToDelete);
          }
          console.log(`🧹 Cleaned up ${keysToDelete.length} old ${prefix} entries`);
        }
      }

    } catch (error) {
      console.warn('⚠️ Failed to cleanup related CAE storage:', error);
    }
  }

  /**
   * Emergency cleanup when regular cleanup fails
   */
  private async emergencyCleanup(): Promise<void> {
    try {
      console.log('🚨 Emergency cleanup triggered');

      // Delete all context snapshots older than 1 hour
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      const keys = await AsyncStorage.getAllKeys();
      const oldSnapshotKeys = keys.filter(key => {
        if (!key.startsWith('context_snapshot_')) return false;
        const timestamp = parseInt(key.replace('context_snapshot_', ''), 10);
        return timestamp < oneHourAgo;
      });

      if (oldSnapshotKeys.length > 0) {
        await AsyncStorage.multiRemove(oldSnapshotKeys);
        console.log(`🚨 Emergency: Deleted ${oldSnapshotKeys.length} snapshots older than 1 hour`);
      }

    } catch (error) {
      console.error('🚨 Emergency cleanup also failed:', error);
    }
  }

  /**
   * Load historical data on initialization
   */
  private async loadHistoricalData(): Promise<void> {
    try {
      const svc = StorageService.getInstance();

      // Try loading optimal learning windows from the facade (preferred)
      if (svc.getOptimalLearningWindows) {
        const windows = await svc.getOptimalLearningWindows();
        if (windows && windows.length > 0) {
          this.optimalLearningTimes = windows.map(w => ({
            hour: w.circadianHour,
            dayOfWeek: w.dayOfWeek,
            performance: w.performanceScore,
            lastUpdated: new Date(w.lastSeen),
          }));
        }
      } else {
        const savedOptimalTimes = await AsyncStorage.getItem('@neurolearn/optimal_learning_times');
        if (savedOptimalTimes) {
          const parsedTimes = JSON.parse(savedOptimalTimes) as Array<{
            hour: number;
            dayOfWeek: number;
            performance: number;
            lastUpdated: string;
          }>;
          this.optimalLearningTimes = parsedTimes.map((entry) => ({
            ...entry,
            lastUpdated: new Date(entry.lastUpdated),
          }));
        }
      }

      // Known locations: prefer facade
      if (svc.getKnownLocations) {
        const locations = await svc.getKnownLocations();
        if (locations && locations.length > 0) {
          this.knownLocations = locations.map(l => ({
            coordinates: l.coordinates,
            environment: l.environment,
            name: l.name,
            performanceHistory: l.performanceHistory || [],
          }));
        }
      } else {
        const savedLocations = await AsyncStorage.getItem('@neurolearn/known_locations');
        if (savedLocations) {
          this.knownLocations = JSON.parse(savedLocations) as typeof this.knownLocations;
        }
      }

      console.log(`📚 Loaded historical data: ${this.optimalLearningTimes.length} time patterns, ${this.knownLocations.length} locations`);

    } catch (error) {
      console.warn('⚠️ Failed to load historical data (falling back to AsyncStorage):', error);
      // Best-effort fallback to AsyncStorage
      try {
        const savedOptimalTimes = await AsyncStorage.getItem('@neurolearn/optimal_learning_times');
        if (savedOptimalTimes) {
          const parsedTimes = JSON.parse(savedOptimalTimes) as Array<{
            hour: number;
            dayOfWeek: number;
            performance: number;
            lastUpdated: string;
          }>;
          this.optimalLearningTimes = parsedTimes.map((entry) => ({
            ...entry,
            lastUpdated: new Date(entry.lastUpdated),
          }));
        }

        const savedLocations = await AsyncStorage.getItem('@neurolearn/known_locations');
        if (savedLocations) {
          this.knownLocations = JSON.parse(savedLocations) as typeof this.knownLocations;
        }
      } catch (err) {
        console.warn('⚠️ AsyncStorage fallback also failed:', err);
      }
    }
  }

  /**
   * Save historical data
   */
  private async saveHistoricalData(): Promise<void> {
    try {
      const svc = StorageService.getInstance();

      // Persist optimal learning times via facade if available, fallback to AsyncStorage only if facade fails
      for (const entry of this.optimalLearningTimes) {
        try {
          await svc.saveOptimalLearningWindow({
            circadianHour: entry.hour,
            dayOfWeek: entry.dayOfWeek,
            performanceScore: entry.performance,
            frequency: 1,
            lastPerformance: entry.performance,
            lastSeen: entry.lastUpdated.toISOString(),
          });
        } catch (err) {
          console.warn('⚠️ Failed to persist optimal window via facade, falling back to AsyncStorage:', err);
          await AsyncStorage.setItem('@neurolearn/optimal_learning_times', JSON.stringify(this.optimalLearningTimes));
        }
      }

      // Persist known locations via facade if available, fallback to AsyncStorage only if facade fails
      for (const loc of this.knownLocations) {
        try {
          await svc.saveKnownLocation({
            name: loc.name,
            coordinates: loc.coordinates,
            environment: loc.environment,
            performanceHistory: loc.performanceHistory || [],
            averagePerformance: loc.performanceHistory && loc.performanceHistory.length > 0 ? (loc.performanceHistory.reduce((a,b)=>a+b,0)/loc.performanceHistory.length) : 0,
            visitCount: loc.performanceHistory ? loc.performanceHistory.length : 0,
            lastVisit: new Date().toISOString(),
          });
        } catch (err) {
          console.warn('⚠️ Failed to persist known location via facade, falling back to AsyncStorage:', err);
          await AsyncStorage.setItem('@neurolearn/known_locations', JSON.stringify(this.knownLocations));
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to save historical data (falling back to AsyncStorage):', error);
      try {
        await AsyncStorage.setItem('@neurolearn/optimal_learning_times', JSON.stringify(this.optimalLearningTimes));
        await AsyncStorage.setItem('@neurolearn/known_locations', JSON.stringify(this.knownLocations));
      } catch (err) {
        console.warn('⚠️ AsyncStorage fallback failed to save historical data:', err);
      }
    }
  }

  // ==================== PUBLIC API ====================

  /**
   * Get current digital body language state
   */
  public getCurrentDBL(): DigitalBodyLanguage {
    return this.analyzeDigitalBodyLanguage();
  }

  /**
   * Get current time intelligence
   */
  public async getCurrentTimeIntelligence(): Promise<TimeIntelligence> {
    return this.analyzeTimeIntelligence();
  }

  /**
   * Get current location context
   */
  public async getCurrentLocationContext(): Promise<LocationContext> {
    return this.analyzeLocationContext();
  }

  /**
   * Add known location manually
   */
  public addKnownLocation(
    coordinates: { latitude: number; longitude: number },
    environment: LocationContext['environment'],
    name: string
  ): void {
    this.knownLocations.push({
      coordinates,
      environment,
      name,
      performanceHistory: [],
    });

    this.saveHistoricalData();
  }

  /**
   * Get analytics about context patterns
   */
  public getContextAnalytics(): {
    optimalTimeWindows: Array<{
      hour: number;
      dayOfWeek: number;
      performance: number;
      lastUpdated: Date;
    }>;
    knownLocations: Array<{
      coordinates: { latitude: number; longitude: number };
      environment: LocationContext['environment'];
      name: string;
      performanceHistory: number[];
    }>;
    totalSnapshots: number;
    averageOptimality: number;
  } {
    return {
      optimalTimeWindows: this.optimalLearningTimes,
      knownLocations: this.knownLocations,
      totalSnapshots: this.interactionHistory.length,
      averageOptimality: 0.65, // Would calculate from stored snapshots
    };
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.stopMonitoring();
    this.saveHistoricalData();
    this.removeAllListeners();

    console.log('🧹 Context Sensor Service disposed');
  }
}

// Export singleton instance
export const contextSensorService = ContextSensorService.getInstance();
export default ContextSensorService;
