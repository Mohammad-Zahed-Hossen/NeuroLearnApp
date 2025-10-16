import { physicsWorkerManager } from '../learning/PhysicsWorkerManager';

// Adapter: expose the canonical physicsWorkerManager under the performance
// namespace so existing imports continue to work while preventing duplicate
// manager implementations.

// Export the manager instance as the module default so legacy imports of
// `OptimizedPhysicsWorker` continue to work without introducing a second
// implementation in the codebase.
const exportedWorker = physicsWorkerManager as unknown as any;

export default exportedWorker;
// /**
//  * Optimized Physics Worker Manager - Critical Fix
//  *
//  * This fixes the main performance bottleneck by ensuring physics calculations
//  * run entirely off the main thread with proper fallback mechanisms.
//  */

// import {
//   PhysicsWorkerMessage,
//   PhysicsWorkerResponse,
//   WorkerNode,
//   WorkerLink,
//   WorkerPhysicsConfig,
//   WorkerPhysicsState,
//   PositionsResponseData,
// } from '../../types/workerMessages';

// export interface OptimizedWorkerCallbacks {
//   onPositionsUpdated?: (data: PositionsResponseData) => void;
//   onError?: (error: string) => void;
//   onFallbackActivated?: () => void;
// }

// export class OptimizedPhysicsWorker {
//   private static instance: OptimizedPhysicsWorker;
//   private worker: Worker | null = null;
//   private isInitialized = false;
//   private useMainThreadFallback = false;
//   private callbacks: OptimizedWorkerCallbacks = {};

//   // Main thread fallback state
//   private fallbackNodes: WorkerNode[] = [];
//   private fallbackLinks: WorkerLink[] = [];
//   private fallbackConfig: WorkerPhysicsConfig | null = null;
//   private animationFrame: number | null = null;

//   public static getInstance(): OptimizedPhysicsWorker {
//     if (!OptimizedPhysicsWorker.instance) {
//       OptimizedPhysicsWorker.instance = new OptimizedPhysicsWorker();
//     }
//     return OptimizedPhysicsWorker.instance;
//   }

//   private constructor() {
//     this.initializeWorker();
//   }

//   /**
//    * CRITICAL FIX: Robust worker initialization with fallback
//    */
//   private async initializeWorker(): Promise<void> {
//     try {
//       // Check if workers are supported
//       if (typeof Worker === 'undefined') {
//         console.warn('🔄 Workers not supported, using main thread fallback');
//         this.activateMainThreadFallback();
//         return;
//       }

//       // Create worker from inline code to avoid URL resolution issues
//       const workerCode = this.getInlineWorkerCode();
//       const blob = new Blob([workerCode], { type: 'application/javascript' });
//       const workerUrl = URL.createObjectURL(blob);

//       this.worker = new Worker(workerUrl);

//       // Set up message handlers
//       this.worker.onmessage = this.handleWorkerMessage.bind(this);
//       this.worker.onerror = this.handleWorkerError.bind(this);
//       this.worker.onmessageerror = this.handleWorkerError.bind(this);

//       // Test worker with ping
//       this.worker.postMessage({ type: 'ping' });

//       // Set timeout for worker response
//       setTimeout(() => {
//         if (!this.isInitialized) {
//           console.warn('🔄 Worker initialization timeout, using fallback');
//           this.activateMainThreadFallback();
//         }
//       }, 2000);

//       console.log('🚀 Physics worker initialized successfully');

//     } catch (error) {
//       console.warn('🔄 Worker initialization failed:', error);
//       this.activateMainThreadFallback();
//     }
//   }

//   /**
//    * Inline worker code to avoid external file dependencies
//    */
//   private getInlineWorkerCode(): string {
//     return `
//       // Inline physics worker implementation
//       let nodes = [];
//       let links = [];
//       let config = null;
//       let isRunning = false;

//       // Simple physics simulation
//       function simulatePhysics() {
//         if (!isRunning || !nodes.length) return;

//         // Basic force simulation
//         nodes.forEach(node => {
//           if (!node.vx) node.vx = 0;
//           if (!node.vy) node.vy = 0;

//           // Apply damping
//           node.vx *= 0.9;
//           node.vy *= 0.9;

//           // Update position
//           node.x += node.vx;
//           node.y += node.y;

//           // Boundary constraints
//           node.x = Math.max(20, Math.min(380, node.x));
//           node.y = Math.max(20, Math.min(580, node.y));
//         });

//         // Send position update
//         self.postMessage({
//           type: 'positions_updated',
//           data: {
//             nodes: nodes.map(n => ({
//               id: n.id,
//               x: n.x,
//               y: n.y,
//               size: n.size || 15,
//               opacity: n.opacity || 1,
//               glow: 0,
//               animation: 'idle',
//               pulseIntensity: 0.5
//             })),
//             links: links.map(l => ({
//               id: l.id,
//               opacity: l.opacity || 0.5,
//               width: l.width || 1,
//               flow: 'none',
//               animationSpeed: 1
//             })),
//             timestamp: Date.now()
//           }
//         });

//         // Continue simulation
//         setTimeout(simulatePhysics, 16); // ~60fps
//       }

//       self.onmessage = function(e) {
//         const { type, data } = e.data;

//         switch (type) {
//           case 'ping':
//             self.postMessage({ type: 'pong' });
//             break;

//           case 'init':
//             config = data.config;
//             self.postMessage({ type: 'initialized' });
//             break;

//           case 'update_graph':
//             nodes = data.nodes || [];
//             links = data.links || [];
//             self.postMessage({ type: 'graph_updated', data: { nodeCount: nodes.length, linkCount: links.length } });
//             break;

//           case 'start':
//             isRunning = true;
//             simulatePhysics();
//             self.postMessage({ type: 'started' });
//             break;

//           case 'stop':
//             isRunning = false;
//             self.postMessage({ type: 'stopped' });
//             break;

//           default:
//             self.postMessage({ type: 'error', error: 'Unknown message type: ' + type });
//         }
//       };
//     `;
//   }

//   /**
//    * Handle messages from worker
//    */
//   private handleWorkerMessage(event: MessageEvent): void {
//     const { type, data, error } = event.data;

//     switch (type) {
//       case 'pong':
//         this.isInitialized = true;
//         console.log('✅ Physics worker is responsive');
//         break;

//       case 'positions_updated':
//         this.callbacks.onPositionsUpdated?.(data);
//         break;

//       case 'error':
//         console.error('Physics worker error:', error);
//         this.callbacks.onError?.(error);
//         break;

//       case 'initialized':
//       case 'graph_updated':
//       case 'started':
//       case 'stopped':
//         // Acknowledge messages
//         break;

//       default:
//         console.warn('Unknown worker message type:', type);
//     }
//   }

//   /**
//    * Handle worker errors
//    */
//   private handleWorkerError(error: ErrorEvent): void {
//     console.error('Physics worker error:', error);
//     this.activateMainThreadFallback();
//   }

//   /**
//    * Activate main thread fallback when worker fails
//    */
//   private activateMainThreadFallback(): void {
//     if (this.useMainThreadFallback) return;

//     console.log('🔄 Activating main thread physics fallback');
//     this.useMainThreadFallback = true;
//     this.isInitialized = true;

//     this.callbacks.onFallbackActivated?.();

//     // Start main thread simulation
//     this.startMainThreadSimulation();
//   }

//   /**
//    * Main thread physics simulation (simplified)
//    */
//   private startMainThreadSimulation(): void {
//     if (this.animationFrame) return;

//     const simulate = () => {
//       if (!this.useMainThreadFallback) return;

//       // Simple position updates
//       this.fallbackNodes.forEach(node => {
//         // Add small random movement to simulate physics
//         node.x += (Math.random() - 0.5) * 0.5;
//         node.y += (Math.random() - 0.5) * 0.5;

//         // Keep within bounds
//         node.x = Math.max(20, Math.min(380, node.x));
//         node.y = Math.max(20, Math.min(580, node.y));
//       });

//       // Send position update
//       const positionsData: PositionsResponseData = {
//         nodes: this.fallbackNodes.map(n => ({
//           id: n.id,
//           x: n.x,
//           y: n.y,
//           size: n.size || 15,
//           opacity: n.opacity || 1,
//           glow: 0,
//           animation: 'idle',
//           pulseIntensity: 0.5
//         })),
//         links: this.fallbackLinks.map(l => ({
//           id: l.id,
//           opacity: l.opacity || 0.5,
//           width: l.width || 1,
//           flow: 'none',
//           animationSpeed: 1
//         })),
//         timestamp: Date.now()
//       };

//       this.callbacks.onPositionsUpdated?.(positionsData);

//       // Continue simulation at reduced rate for performance
//       this.animationFrame = requestAnimationFrame(simulate);
//     };

//     this.animationFrame = requestAnimationFrame(simulate);
//   }

//   /**
//    * Initialize physics system
//    */
//   public async initialize(config: WorkerPhysicsConfig, state: WorkerPhysicsState): Promise<void> {
//     this.fallbackConfig = config;

//     if (this.useMainThreadFallback) {
//       console.log('🔄 Using main thread fallback for physics');
//       return Promise.resolve();
//     }

//     if (this.worker && this.isInitialized) {
//       this.worker.postMessage({
//         type: 'init',
//         data: { config, state }
//       });
//     }
//   }

//   /**
//    * Update graph data
//    */
//   public async updateGraph(nodes: WorkerNode[], links: WorkerLink[]): Promise<void> {
//     this.fallbackNodes = [...nodes];
//     this.fallbackLinks = [...links];

//     if (this.useMainThreadFallback) {
//       return Promise.resolve();
//     }

//     if (this.worker && this.isInitialized) {
//       this.worker.postMessage({
//         type: 'update_graph',
//         data: { nodes, links }
//       });
//     }
//   }

//   /**
//    * Start physics simulation
//    */
//   public start(): void {
//     if (this.useMainThreadFallback) {
//       this.startMainThreadSimulation();
//       return;
//     }

//     if (this.worker && this.isInitialized) {
//       this.worker.postMessage({ type: 'start' });
//     }
//   }

//   /**
//    * Stop physics simulation
//    */
//   public stop(): void {
//     if (this.useMainThreadFallback) {
//       if (this.animationFrame) {
//         cancelAnimationFrame(this.animationFrame);
//         this.animationFrame = null;
//       }
//       return;
//     }

//     if (this.worker && this.isInitialized) {
//       this.worker.postMessage({ type: 'stop' });
//     }
//   }

//   /**
//    * Set callbacks for worker events
//    */
//   public setCallbacks(callbacks: OptimizedWorkerCallbacks): void {
//     this.callbacks = { ...callbacks };
//   }

//   /**
//    * Check if using main thread fallback
//    */
//   public isUsingFallback(): boolean {
//     return this.useMainThreadFallback;
//   }

//   /**
//    * Get performance info
//    */
//   public getPerformanceInfo(): {
//     workerSupported: boolean;
//     usingFallback: boolean;
//     isInitialized: boolean;
//   } {
//     return {
//       workerSupported: typeof Worker !== 'undefined',
//       usingFallback: this.useMainThreadFallback,
//       isInitialized: this.isInitialized,
//     };
//   }

//   /**
//    * Dispose of worker and cleanup
//    */
//   public dispose(): void {
//     if (this.worker) {
//       this.worker.terminate();
//       this.worker = null;
//     }

//     if (this.animationFrame) {
//       cancelAnimationFrame(this.animationFrame);
//       this.animationFrame = null;
//     }

//     this.isInitialized = false;
//     this.useMainThreadFallback = false;
//     this.callbacks = {};
//   }
// }

// The rest of this file previously contained an alternate implementation of
// an OptimizedPhysicsWorker class. That implementation has been removed in
// favor of the shared `physicsWorkerManager` (imported above). Keeping that
// code would lead to duplicated declarations and divergent runtime behavior.

