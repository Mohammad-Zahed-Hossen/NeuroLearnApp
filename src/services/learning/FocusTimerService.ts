import { NeuralPhysicsEngine } from './NeuralPhysicsEngine';
import StorageService from '../storage/StorageService';
import {
  DistractionEvent,
  FocusSession,
  FocusHealthMetrics,
} from '../storage/StorageService';
import { TodoistService } from '../integrations/TodoistService';
import { MindMapGenerator } from './MindMapGeneratorService';
import { eyeTrackingService } from './EyeTrackingService';
import { NeuroIDGenerator } from '../../utils/idGenerator';

/**
 * Phase 6: Focus Timer Service - Anti-Distraction Layer
 *
 * This service manages the complete session lifecycle and enforces
 * the neurological cost of distraction through intelligent tracking
 * and neural map weakening.
 */

export interface ActiveSession {
  id: string;
  taskId: string;
  nodeId?: string;
  startTime: Date;
  plannedDurationMinutes: number;
  distractionCount: number;
  cognitiveLoadStart: number;
  focusLockActive: boolean;
}

export interface DistractionLogOptions {
  reason?: string;
  severity?: 1 | 2 | 3 | 4 | 5;
  triggerType?: 'internal' | 'external' | 'notification' | 'unknown';
  duration?: number;
}

/**
 * Input validation for DistractionLogOptions
 */
export class DistractionLogValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'DistractionLogValidationError';
  }
}

export const validateDistractionLogOptions = (
  options: DistractionLogOptions,
): void => {
  if (
    options.reason !== undefined &&
    (typeof options.reason !== 'string' || options.reason.trim().length === 0)
  ) {
    throw new DistractionLogValidationError(
      'Reason must be a non-empty string',
      'reason',
    );
  }

  if (
    options.severity !== undefined &&
    (!Number.isInteger(options.severity) ||
      options.severity < 1 ||
      options.severity > 5)
  ) {
    throw new DistractionLogValidationError(
      'Severity must be an integer between 1 and 5',
      'severity',
    );
  }

  if (
    options.triggerType !== undefined &&
    !['internal', 'external', 'notification', 'unknown'].includes(
      options.triggerType,
    )
  ) {
    throw new DistractionLogValidationError(
      'Trigger type must be one of: internal, external, notification, unknown',
      'triggerType',
    );
  }

  if (
    options.duration !== undefined &&
    (!Number.isFinite(options.duration) || options.duration < 0)
  ) {
    throw new DistractionLogValidationError(
      'Duration must be a non-negative number',
      'duration',
    );
  }
};

/**
 * Exponential backoff retry utility for critical async operations
 */
export class RetryError extends Error {
  constructor(
    message: string,
    public attempts: number,
    public lastError: Error,
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

export const withExponentialBackoff = async <T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000,
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt}/${maxAttempts} failed:`, error);

      if (attempt === maxAttempts) {
        throw new RetryError(
          `Operation failed after ${maxAttempts} attempts`,
          maxAttempts,
          lastError,
        );
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      const jitter = Math.random() * 0.1 * delay; // Add up to 10% jitter
      const totalDelay = delay + jitter;

      console.log(`Retrying in ${Math.round(totalDelay)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, totalDelay));
    }
  }

  throw lastError!;
};

export interface SessionEndOptions {
  selfReportFocus: 1 | 2 | 3 | 4 | 5;
  distractionReason?: string;
  completionRate: number;
  todoistTaskCompleted?: boolean;
}

export class FocusTimerService {
  private static instance: FocusTimerService;

  // Core dependencies
  private storageService: StorageService;
  private todoistService: TodoistService;
  private mindMapGenerator: MindMapGenerator;
  private physicsEngine: NeuralPhysicsEngine | null = null;
  // Eye tracking integration
  private eyeTrackingEnabled: boolean = false;
  private adaptiveBreakCheckInterval: NodeJS.Timeout | null = null;

  // Active session state
  private activeSession: ActiveSession | null = null;
  private sessionTimer: NodeJS.Timeout | null = null;
  private distractionTimer: NodeJS.Timeout | null = null;

  // Event listeners
  private sessionCallbacks: ((session: ActiveSession | null) => void)[] = [];
  private distractionCallbacks: ((event: DistractionEvent) => void)[] = [];
  private eyeTrackingCallbacks: ((metrics: any) => void)[] = [];

  public static getInstance(): FocusTimerService {
    if (!FocusTimerService.instance) {
      FocusTimerService.instance = new FocusTimerService();
    }
    return FocusTimerService.instance;
  }

  private constructor() {
  this.storageService = StorageService.getInstance();
    this.todoistService = TodoistService.getInstance();
    this.mindMapGenerator = MindMapGenerator.getInstance();

    console.log('🔒 Focus Timer Service initialized for Phase 5.5');
  }

  /**
   * Enable eye tracking integration
   */
  public async enableEyeTracking(): Promise<boolean> {
    try {
      const ok = await eyeTrackingService.initialize();
      if (ok) {
        this.eyeTrackingEnabled = true;
        eyeTrackingService.startTracking();
        this.startAdaptiveBreakMonitoring();
        console.log('👁️ Eye tracking integrated with FocusTimerService');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to enable eye tracking:', String(error ?? 'Unknown error'));
      return false;
    }
  }

  private startAdaptiveBreakMonitoring(): void {
    if (this.adaptiveBreakCheckInterval) {
      clearInterval(this.adaptiveBreakCheckInterval);
    }

    this.adaptiveBreakCheckInterval = setInterval(() => {
      this.checkAdaptiveBreak();
    }, 30000); // every 30s
  }

  private checkAdaptiveBreak(): void {
    if (!this.eyeTrackingEnabled) return;

    const breakCheck = eyeTrackingService.shouldTakeBreak();
    if (breakCheck.needed) {
      this.triggerAdaptiveBreak(breakCheck.reason);
    }

    const metrics = eyeTrackingService.getMetrics();
    this.eyeTrackingCallbacks.forEach((cb) => {
      try {
        cb(metrics);
      } catch (e) {
        console.error(e);
      }
    });

    // Update cognitive load from eye tracking
    this.updateCognitiveLoad(eyeTrackingService.getCognitiveLoad());
  }

  private async triggerAdaptiveBreak(reason: string): Promise<void> {
    if (!this.activeSession) return;

    console.log(`🧠 Adaptive break triggered: ${reason}`);

    // Soft pause of current timer
    if (this.sessionTimer) clearTimeout(this.sessionTimer);

    // Emit an event via distractionCallbacks to allow UI to show a break
    const evt: DistractionEvent = {
      id: `adaptive_break_${Date.now()}`,
      sessionId: this.activeSession.id,
      timestamp: new Date(),
      reason: `Adaptive break: ${reason}`,
      severity: 1,
      triggerType: 'unknown',
      contextSwitch: false,
    };

    this.notifyDistractionListeners(evt);

    // Auto-resume after 5 minutes
    setTimeout(() => {
      if (this.activeSession) {
        // restart session timer for remaining planned minutes
        this.sessionTimer = setTimeout(
          () => this.handleSessionTimeUp(),
          this.activeSession.plannedDurationMinutes * 60 * 1000,
        );
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Subscribe to eye tracking metrics
   */
  public onEyeTrackingMetrics(callback: (metrics: any) => void): () => void {
    this.eyeTrackingCallbacks.push(callback);
    return () => {
      const idx = this.eyeTrackingCallbacks.indexOf(callback);
      if (idx > -1) this.eyeTrackingCallbacks.splice(idx, 1);
    };
  }

  /**
   * Update cognitive load from external sources (AI coaching, etc.)
   */
  public updateCognitiveLoad(
    level: number,
    duration: number = 5 * 60 * 1000,
  ): void {
    // clamp
    const clamped = Math.max(0, Math.min(1, level));
    // store lightly on the activeSession for session-level reporting
    if (this.activeSession) {
      this.activeSession.cognitiveLoadStart = clamped;
    }
    console.log(`🧠 Cognitive load updated to: ${clamped}`);
    // Emit an event for UI/other services
    this.notifySessionListeners();

    // After duration, reduce the cognitive load effect
    setTimeout(() => {
      if (this.activeSession) {
        this.activeSession.cognitiveLoadStart = Math.max(
          0.3,
          this.activeSession.cognitiveLoadStart - 0.2,
        );
        this.notifySessionListeners();
      }
    }, duration);
  }

  public getCognitiveLoad(): number {
    return this.activeSession ? this.activeSession.cognitiveLoadStart : 0.5;
  }

  /**
   * Set the physics engine reference for focus lock control
   */
  public setPhysicsEngine(engine: NeuralPhysicsEngine): void {
    this.physicsEngine = engine;
    console.log('🔬 Physics engine connected to Focus Timer Service');
  }

  /**
   * Phase 5.5: Start a new focus session with anti-distraction enforcement
   */
  public async startSession(
    taskId: string,
    nodeId: string | undefined,
    plannedDurationMinutes: number,
    cognitiveLoadStart: number,
  ): Promise<ActiveSession> {
    try {
      // Periodic cleanup: prune old focus data to prevent storage bloat
      await this.storageService.pruneOldFocusData();

      // End any existing session first
      if (this.activeSession) {
        await this.endSession({
          selfReportFocus: 3,
          distractionReason: 'Interrupted by new session',
          completionRate: 0.5,
        });
      }

      // Generate unique session ID using NeuroIDGenerator for UUID compliance
      const sessionId = NeuroIDGenerator.generateLogicNodeID();

      // Create active session
      this.activeSession = {
        id: sessionId,
        taskId,
        nodeId,
        startTime: new Date(),
        plannedDurationMinutes,
        distractionCount: 0,
        cognitiveLoadStart,
        focusLockActive: false,
      };

      // Phase 5.5: Enforce Focus Lock
      await this.engageFocusLock();

      // Start Todoist timer integration
      if (taskId.startsWith('task_')) {
        const realTaskId = taskId.replace('task_', '');
        this.todoistService.startTaskTimer(
          realTaskId,
          nodeId,
          plannedDurationMinutes,
          cognitiveLoadStart,
        );
      }

      // Set up session completion timer
      this.sessionTimer = setTimeout(() => {
        this.handleSessionTimeUp();
      }, plannedDurationMinutes * 60 * 1000);

      // Notify listeners
      this.notifySessionListeners();

      console.log(
        `🎯 Focus session started: ${sessionId} (${plannedDurationMinutes}min)`,
      );
      console.log(`🔒 Anti-distraction layer active`);

      return this.activeSession;
    } catch (error) {
      console.error('Error starting focus session:', String(error ?? 'Unknown error'));
      throw new Error(`Failed to start focus session: ${String(error ?? 'Unknown error')}`);
    }
  }

  /**
   * Phase 5.5: Log a distraction event during active session
   */
  public async logDistraction(
    options: DistractionLogOptions = {},
  ): Promise<DistractionEvent> {
    if (!this.activeSession) {
      throw new Error('No active session to log distraction');
    }

    // Validate input options
    try {
      validateDistractionLogOptions(options);
    } catch (validationError) {
      if (validationError instanceof DistractionLogValidationError) {
        console.error(
          `Distraction log validation failed: ${validationError.message} (field: ${validationError.field})`,
        );
        throw validationError;
      }
      throw validationError;
    }

    try {
      const distractionEvent: DistractionEvent = {
        id: `distraction_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        sessionId: this.activeSession.id,
        timestamp: new Date(),
        reason: options.reason || 'Unspecified distraction',
        severity: options.severity || 3,
        triggerType: options.triggerType || 'unknown',
        duration: options.duration,
        contextSwitch: false, // Could be detected via app state changes
      };

      // Save distraction event with retry logic
      await withExponentialBackoff(
        () => this.storageService.saveDistractionEvent(distractionEvent),
        3, // max attempts
        1000, // base delay
        5000, // max delay
      );

      // Update active session distraction count
      this.activeSession.distractionCount++;

      // Phase 5.5: Apply neural penalty for distraction
      await this.applyDistractionPenalty(distractionEvent);

      // Notify listeners
      this.notifyDistractionListeners(distractionEvent);

      console.log(
        `😬 Distraction logged: ${distractionEvent.reason} (severity: ${distractionEvent.severity})`,
      );
      console.log(
        `🧠 Distraction count for session: ${this.activeSession.distractionCount}`,
      );

      return distractionEvent;
    } catch (error) {
      console.error('Error logging distraction:', String(error ?? 'Unknown error'));
      throw new Error(`Failed to log distraction: ${String(error ?? 'Unknown error')}`);
    }
  }

  /**
   * Phase 5.5: End the current focus session with micro-reflection
   */
  public async endSession(
    options: SessionEndOptions,
  ): Promise<FocusSession | null> {
    if (!this.activeSession) {
      console.warn('No active session to end');
      return null;
    }

    try {
      const endTime = new Date();
      const actualDurationMinutes = Math.round(
        (endTime.getTime() - this.activeSession.startTime.getTime()) /
          (1000 * 60),
      );

      // Get distraction events for this session
      const distractionEvents = await this.storageService.getDistractionEvents(
        this.activeSession.id,
      );

      // Calculate completion metrics
      const focusEfficiency =
        actualDurationMinutes / this.activeSession.plannedDurationMinutes;
      const cognitiveLoadEnd = await this.calculateEndCognitiveLoad();

      // Create completed session record
      const completedSession: FocusSession = {
        id: this.activeSession.id,
        taskId: this.activeSession.taskId,
        nodeId: this.activeSession.nodeId,
        startTime: this.activeSession.startTime,
        endTime: endTime,
        durationMinutes: actualDurationMinutes,
        plannedDurationMinutes: this.activeSession.plannedDurationMinutes,
        distractionCount: this.activeSession.distractionCount,
        distractionEvents: distractionEvents,
        selfReportFocus: options.selfReportFocus,
        distractionReason: options.distractionReason,
        completionRate: options.completionRate,

        // Neural health impact
        cognitiveLoadStart: this.activeSession.cognitiveLoadStart,
        cognitiveLoadEnd: cognitiveLoadEnd,
        focusLockUsed: this.activeSession.focusLockActive,

        // Task convergence
        todoistTaskCompleted: options.todoistTaskCompleted,
        neuralNodeStrengthened: await this.calculateNeuralReinforcement(
          options,
        ),

        created: this.activeSession.startTime,
        modified: endTime,
      };

      // Save completed session with retry logic
      await withExponentialBackoff(
        () => this.storageService.saveFocusSession(completedSession),
        3, // max attempts
        1000, // base delay
        5000, // max delay
      );

      // Phase 5.5: Apply neural rewards/penalties based on session quality
      await this.applySessionOutcome(completedSession);

      // Stop Todoist timer
      if (this.activeSession.taskId.startsWith('task_')) {
        const realTaskId = this.activeSession.taskId.replace('task_', '');
        const outcome =
          options.selfReportFocus >= 4 ? 'completed' : 'interrupted';
        // Map outcome to self-report focus rating
        const selfReportFocus = outcome === 'completed' ? 4 : 2; // 4 for good focus, 2 for poor focus
        this.todoistService.stopTaskTimer(realTaskId, selfReportFocus);

        if (options.todoistTaskCompleted) {
          await this.todoistService.completeTask(realTaskId);
        }
      }

      // Phase 5.5: Disengage Focus Lock
      await this.disengageFocusLock();

      // Clear active session
      const sessionToReturn = { ...completedSession };
      this.activeSession = null;

      // Clear timers
      if (this.sessionTimer) {
        clearTimeout(this.sessionTimer);
        this.sessionTimer = null;
      }
      if (this.distractionTimer) {
        clearTimeout(this.distractionTimer);
        this.distractionTimer = null;
      }

      // Notify listeners
      this.notifySessionListeners();

      console.log(`🏁 Focus session completed: ${completedSession.id}`);
      console.log(
        `📊 Session stats: ${actualDurationMinutes}min, ${completedSession.distractionCount} distractions, focus: ${options.selfReportFocus}/5`,
      );
      console.log(`🔓 Anti-distraction layer disengaged`);

      return sessionToReturn;
    } catch (error) {
      console.error('Error ending focus session:', String(error ?? 'Unknown error'));
      throw new Error(`Failed to end focus session: ${String(error ?? 'Unknown error')}`);
    }
  }

  /**
   * Phase 5.5: Engage neural focus lock
   */
  private async engageFocusLock(): Promise<void> {
    if (!this.activeSession) return;

    try {
      // Set focus lock in physics engine
      if (this.physicsEngine && this.activeSession.nodeId) {
        this.physicsEngine.setFocusNode(this.activeSession.nodeId);
        console.log(
          `🧠 Neural focus lock engaged on node: ${this.activeSession.nodeId}`,
        );
      }

      // Set general focus lock state
      if (this.physicsEngine) {
        this.physicsEngine.setFocusLock(true, this.activeSession.id);
        console.log('🔒 General focus lock engaged');
      }

      this.activeSession.focusLockActive = true;
    } catch (error) {
      console.error('Error engaging focus lock:', String(error ?? 'Unknown error'));
    }
  }

  /**
   * Phase 5.5: Disengage neural focus lock
   */
  private async disengageFocusLock(): Promise<void> {
    try {
      // Clear focus lock in physics engine
      if (this.physicsEngine) {
        this.physicsEngine.setFocusNode(null);
        this.physicsEngine.setFocusLock(false);
        console.log('🔓 Neural focus lock disengaged');
      }
    } catch (error) {
      console.error('Error disengaging focus lock:', String(error ?? 'Unknown error'));
    }
  }

  /**
   * Phase 5.5: Apply neurological penalty for distraction
   */
  private async applyDistractionPenalty(
    distractionEvent: DistractionEvent,
  ): Promise<void> {
    if (!this.activeSession || !this.activeSession.nodeId) return;

    try {
      const logicNodes = await this.storageService.getLogicNodes();
      const targetNode = logicNodes.find(
        (node) => node.id === this.activeSession!.nodeId,
      );

      if (targetNode) {
        // Calculate penalty based on distraction severity and frequency
        const basePenalty = 0.1;
        const severityMultiplier = (distractionEvent.severity || 3) / 5;
        const frequencyMultiplier = Math.min(
          2.0,
          1 + (this.activeSession.distractionCount - 1) * 0.2,
        );

        const penalty = basePenalty * severityMultiplier * frequencyMultiplier;

        // Apply penalty to node
        targetNode.distractionPenalty =
          (targetNode.distractionPenalty || 0) + penalty;
        targetNode.modified = new Date();

        // Update storage
        await this.storageService.updateLogicNode(targetNode.id, {
          distractionPenalty: targetNode.distractionPenalty,
          modified: targetNode.modified,
        });

        console.log(
          `⚡ Distraction penalty applied to node ${
            targetNode.id
          }: -${penalty.toFixed(3)}`,
        );
      }

      // Also apply penalty to flashcards if applicable
      if (this.activeSession.taskId.includes('flashcard')) {
        const flashcards = await this.storageService.getFlashcards();
        const targetCard = flashcards.find((card) =>
          this.activeSession!.taskId.includes(card.id),
        );

        if (targetCard) {
          const penalty = 0.05 * ((distractionEvent.severity || 3) / 5);
          const enhanced = targetCard as unknown as any;
          enhanced.distractionWeakening = (enhanced.distractionWeakening || 0) + penalty;

          await this.storageService.saveFlashcards(flashcards);
          console.log(
            `📚 Distraction penalty applied to flashcard ${targetCard.id}: -${penalty.toFixed(3)}`,
          );
        }
      }
    } catch (error) {
      console.error('Error applying distraction penalty:', String(error ?? 'Unknown error'));
    }
  }

  /**
   * Phase 5.5: Apply session outcome rewards/penalties to neural network
   */
  private async applySessionOutcome(session: FocusSession): Promise<void> {
    if (!session.nodeId) return;

    try {
      const logicNodes = await this.storageService.getLogicNodes();
      const targetNode = logicNodes.find((node) => node.id === session.nodeId);

      if (targetNode) {
        // Calculate reinforcement based on session quality
        let reinforcement = 0;

        // Base reinforcement from focus quality
        if (session.selfReportFocus >= 4) {
          reinforcement += 0.2; // Strong positive reinforcement
        } else if (session.selfReportFocus >= 3) {
          reinforcement += 0.1; // Moderate positive reinforcement
        } else {
          reinforcement -= 0.1; // Negative reinforcement for poor focus
        }

        // Adjust for distraction count
        const distractionPenalty = Math.min(
          0.15,
          session.distractionCount * 0.03,
        );
        reinforcement -= distractionPenalty;

        // Adjust for completion rate
        reinforcement *= session.completionRate;

        // Apply reinforcement
        targetNode.focusSessionStrength =
          (targetNode.focusSessionStrength || 0) + reinforcement;
        targetNode.modified = new Date();

        await this.storageService.updateLogicNode(targetNode.id, {
          focusSessionStrength: targetNode.focusSessionStrength,
          modified: targetNode.modified,
        });

        console.log(
          `🧠 Neural reinforcement applied to node ${targetNode.id}: ${
            reinforcement > 0 ? '+' : ''
          }${reinforcement.toFixed(3)}`,
        );
      }

      // Apply similar logic to flashcards
      if (session.taskId.includes('flashcard')) {
        const flashcards = await this.storageService.getFlashcards();
        const targetCard = flashcards.find((card) =>
          session.taskId.includes(card.id),
        );

        if (targetCard) {
          let reinforcement = 0;

          if (session.selfReportFocus >= 4) {
            reinforcement += 0.15;
          } else if (session.selfReportFocus >= 3) {
            reinforcement += 0.08;
          }

          reinforcement *= session.completionRate;
          reinforcement -= Math.min(0.1, session.distractionCount * 0.02);

          const enhanced = targetCard as unknown as any;
          enhanced.focusSessionStrength = (enhanced.focusSessionStrength || 0) + reinforcement;

          await this.storageService.saveFlashcards(flashcards);
          console.log(
            `📚 Neural reinforcement applied to flashcard ${targetCard.id}: ${reinforcement > 0 ? '+' : ''}${reinforcement.toFixed(3)}`,
          );
        }
      }
    } catch (error) {
      console.error('Error applying session outcome:', String(error ?? 'Unknown error'));
    }
  }

  /**
   * Calculate end cognitive load based on session performance
   */
  private async calculateEndCognitiveLoad(): Promise<number> {
    if (!this.activeSession) return 0.5;

    try {
      // Get current neural graph
      const neuralGraph = await this.mindMapGenerator.generateNeuralGraph(
        false,
      );

      // Base cognitive load
      let cognitiveLoad =
        neuralGraph.dueNodesCount / 20 +
        neuralGraph.cognitiveComplexity / 100 +
        (100 - neuralGraph.knowledgeHealth) / 200;

      // Adjust based on session performance
      const distractionFactor = Math.min(
        1.5,
        1 + this.activeSession.distractionCount * 0.1,
      );
      cognitiveLoad *= distractionFactor;

      return Math.max(0, Math.min(1, cognitiveLoad));
    } catch (error) {
      console.error('Error calculating end cognitive load:', String(error ?? 'Unknown error'));
      return this.activeSession.cognitiveLoadStart;
    }
  }

  /**
   * Calculate if session strengthened neural connections
   */
  private async calculateNeuralReinforcement(
    options: SessionEndOptions,
  ): Promise<boolean> {
    if (!this.activeSession) return false;

    // Session strengthens neural connections if:
    // 1. High focus rating (4-5)
    // 2. Low distraction count (0-2)
    // 3. High completion rate (>0.7)
    // 4. Used focus lock

    const highFocus = options.selfReportFocus >= 4;
    const lowDistractions = this.activeSession.distractionCount <= 2;
    const highCompletion = options.completionRate > 0.7;
    const usedFocusLock = this.activeSession.focusLockActive;

    const reinforcementCriteria = [
      highFocus,
      lowDistractions,
      highCompletion,
      usedFocusLock,
    ];
    const metCriteria = reinforcementCriteria.filter(Boolean).length;

    // Need to meet at least 3 out of 4 criteria
    return metCriteria >= 3;
  }

  /**
   * Handle automatic session completion when time is up
   */
  private async handleSessionTimeUp(): Promise<void> {
    if (!this.activeSession) return;

    console.log('⏰ Session time completed - triggering auto-end');

    // Auto-end with moderate ratings
    await this.endSession({
      selfReportFocus: 3,
      distractionReason: 'Session completed naturally',
      completionRate: 0.8, // Assume decent completion if time was fully used
    });
  }

  // ==================== PUBLIC QUERY METHODS ====================

  /**
   * Get current active session
   */
  public getActiveSession(): ActiveSession | null {
    return this.activeSession;
  }

  /**
   * Check if a focus session is currently active
   */
  public isSessionActive(): boolean {
    return this.activeSession !== null;
  }

  /**
   * Get focus health metrics
   */
  public async getFocusHealthMetrics(): Promise<FocusHealthMetrics> {
    const metrics = await this.storageService.getFocusHealthMetrics();
    // Ensure non-null return for callers
    return metrics ?? {
      streakCount: 0,
      averageFocusRating: 3,
      distractionsPerSession: 0,
      focusEfficiency: 1.0,
      neuralReinforcement: 0,
      dailyFocusTime: 0,
      weeklyFocusTime: 0,
      bestFocusTimeOfDay: 'morning',
      commonDistractionTriggers: [],
      mostDistractiveDays: [],
      focusImprovement: 0,
    };
  }

  /**
   * Get recent focus sessions
   */
  public async getRecentFocusSessions(
    daysBack: number = 7,
  ): Promise<FocusSession[]> {
    const allSessions = await this.storageService.getFocusSessions();
    const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    return allSessions
      .filter((session) => session.endTime > cutoffDate)
      .sort((a, b) => b.endTime.getTime() - a.endTime.getTime());
  }

  /**
   * Get distraction patterns analysis
   */
  public async getDistractionAnalysis(): Promise<{
    commonReasons: { reason: string; count: number }[];
    averagePerSession: number;
    totalDistractions: number;
    mostDistractiveTimes: { hour: number; count: number }[];
  }> {
    const recentSessions = await this.getRecentFocusSessions(30); // Last 30 days
    const allDistractions = recentSessions.flatMap(
      (session) => session.distractionEvents,
    );

    // Count reasons
    const reasonCounts = new Map<string, number>();
    const hourCounts = new Map<number, number>();

    allDistractions.forEach((event) => {
      if (event.reason) {
        reasonCounts.set(
          event.reason,
          (reasonCounts.get(event.reason) || 0) + 1,
        );
      }

      const hour = event.timestamp.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    const commonReasons = Array.from(reasonCounts.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const mostDistractiveTimes = Array.from(hourCounts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      commonReasons,
      averagePerSession:
        recentSessions.length > 0
          ? allDistractions.length / recentSessions.length
          : 0,
      totalDistractions: allDistractions.length,
      mostDistractiveTimes,
    };
  }

  // ==================== EVENT LISTENERS ====================

  /**
   * Subscribe to session state changes
   */
  public onSessionChange(
    callback: (session: ActiveSession | null) => void,
  ): () => void {
    this.sessionCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.sessionCallbacks.indexOf(callback);
      if (index > -1) {
        this.sessionCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to distraction events
   */
  public onDistraction(
    callback: (event: DistractionEvent) => void,
  ): () => void {
    this.distractionCallbacks.push(callback);

    return () => {
      const index = this.distractionCallbacks.indexOf(callback);
      if (index > -1) {
        this.distractionCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify session listeners
   */
  private notifySessionListeners(): void {
    this.sessionCallbacks.forEach((callback) => {
      try {
        callback(this.activeSession);
      } catch (error) {
        console.error('Error in session callback:', error);
      }
    });
  }

  /**
   * Notify distraction listeners
   */
  private notifyDistractionListeners(event: DistractionEvent): void {
    this.distractionCallbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in distraction callback:', error);
      }
    });
  }

  // ==================== CLEANUP ====================

  /**
   * Stop the service and clean up resources
   */
  public async cleanup(): Promise<void> {
    // Periodic cleanup: prune old focus data before shutting down
    await this.storageService.pruneOldFocusData();

    // End active session if exists
    if (this.activeSession) {
      await this.endSession({
        selfReportFocus: 3,
        distractionReason: 'App closing',
        completionRate: 0.5,
      });
    }

    // Clear timers
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }
    if (this.distractionTimer) {
      clearTimeout(this.distractionTimer);
    }
    if (this.adaptiveBreakCheckInterval) {
      clearInterval(this.adaptiveBreakCheckInterval);
      this.adaptiveBreakCheckInterval = null;
    }

    // Clear callbacks
    this.sessionCallbacks.length = 0;
    this.distractionCallbacks.length = 0;

    console.log('🔒 Focus Timer Service cleaned up');
  }
}

export default FocusTimerService;
