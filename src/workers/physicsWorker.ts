/**
 * Physics Web Worker - Offloads expensive physics calculations
 *
 * This worker handles the computationally intensive parts of the physics simulation:
 * - Force calculations (link forces, many-body repulsion)
 * - Position updates with damping
 * - Context-specific behavior application
 * - Performance monitoring and adaptive quality
 */

import {
  PhysicsWorkerMessage,
  PhysicsWorkerResponse,
  WorkerNode,
  WorkerLink,
  WorkerPhysicsConfig,
  WorkerPhysicsState,
  InitMessageData,
  UpdateGraphMessageData,
  SimulateStepMessageData,
  UpdateContextMessageData,
  PositionsResponseData,
  isPhysicsMessage,
} from '../types/workerMessages';

// ==================== WORKER STATE ====================

let config: WorkerPhysicsConfig | null = null;
let physicsState: WorkerPhysicsState | null = null;
let nodes: WorkerNode[] = [];
let links: WorkerLink[] = [];
let isInitialized = false;

// Performance tracking
let lastFrameTime = 0;
let currentFPS = 60;
let frameCount = 0;

// ==================== PHYSICS CALCULATIONS ====================

/**
 * Calculate link forces between connected nodes
 */
function calculateLinkForces(deltaTime: number): void {
  if (!config || !physicsState || !nodes || !links) return;

  links.forEach(link => {
    const sourceNode = nodes.find(n => n.id === link.source);
    const targetNode = nodes.find(n => n.id === link.target);

    if (!sourceNode || !targetNode) return;

    const dx = targetNode.x - sourceNode.x;
    const dy = targetNode.y - sourceNode.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return;

    // Calculate link force
    const linkForce = calculateLinkForceMagnitude(link, distance, config!, physicsState!);
    const fx = (dx / distance) * linkForce * deltaTime;
    const fy = (dy / distance) * linkForce * deltaTime;

    // Apply forces
    sourceNode.vx += fx;
    sourceNode.vy += fy;
    targetNode.vx -= fx;
    targetNode.vy -= fy;
  });
}

/**
 * Calculate individual link force magnitude
 */
function calculateLinkForceMagnitude(
  link: WorkerLink,
  distance: number,
  config: WorkerPhysicsConfig,
  state: WorkerPhysicsState
): number {
  const baseForce = link.adaptiveStrength * config.linkStrength.contextMultiplier;
  const contextRelevance = link.contextRelevance[state.currentContext] || 0.5;
  const distanceModifier = (distance - link.distance) / link.distance;

  return baseForce * contextRelevance * distanceModifier;
}

/**
 * Calculate many-body repulsion forces
 */
function calculateRepulsionForces(deltaTime: number): void {
  if (!config || !physicsState) return;

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];

      const dx = nodeB.x - nodeA.x;
      const dy = nodeB.y - nodeA.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance === 0 || distance > 200) continue;

      // Calculate repulsion force
      const repulsionForce = calculateRepulsionForceMagnitude(nodeA, nodeB, distance, config, physicsState);
      const fx = (dx / distance) * repulsionForce * deltaTime;
      const fy = (dy / distance) * repulsionForce * deltaTime;

      nodeA.vx -= fx;
      nodeA.vy -= fy;
      nodeB.vx += fx;
      nodeB.vy += fy;
    }
  }
}

/**
 * Calculate individual repulsion force magnitude
 */
function calculateRepulsionForceMagnitude(
  nodeA: WorkerNode,
  nodeB: WorkerNode,
  distance: number,
  config: WorkerPhysicsConfig,
  state: WorkerPhysicsState
): number {
  const baseRepulsion = config.repulsionForce.base;
  const cognitiveLoadMultiplier = 1 + (state.cognitiveLoad * config.repulsionForce.cognitiveLoadMultiplier);
  const sizeMultiplier = Math.sqrt(nodeA.size * nodeB.size);

  return (baseRepulsion * cognitiveLoadMultiplier * sizeMultiplier) / (distance * distance);
}

/**
 * Apply target node magnetism
 */
function applyTargetNodeMagnetism(deltaTime: number): void {
  if (!physicsState?.targetNodeId || !config) return;

  const targetNode = nodes.find(n => n.id === physicsState!.targetNodeId);
  if (!targetNode) return;

  // Mock center position (would be passed from main thread)
  const centerX = 400;
  const centerY = 300;

  const dx = centerX - targetNode.x;
  const dy = centerY - targetNode.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > 50) {
    const magnetism = config.contextualBehavior[physicsState.currentContext]?.targetNodeMagnetism || 1.0;
    const force = magnetism * 0.1;
    targetNode.vx += (dx / distance) * force * deltaTime;
    targetNode.vy += (dy / distance) * force * deltaTime;
  }
}

/**
 * Update node positions with damping and boundaries
 */
function updatePositions(deltaTime: number): void {
  if (!config) return;

  const damping = config.damping.base * config.damping.contextMultiplier;
  const layoutStability = physicsState?.activeConfig?.layoutStability || 0.8;

  nodes.forEach(node => {
    // Apply velocity with damping
    node.x += node.vx * layoutStability;
    node.y += node.vy * layoutStability;

    // Apply damping
    node.vx *= damping;
    node.vy *= damping;

    // Boundary constraints (mock values - would be passed from main thread)
    const margin = node.size;
    node.x = Math.max(margin, Math.min(800 - margin, node.x));
    node.y = Math.max(margin, Math.min(600 - margin, node.y));
  });
}

/**
 * Apply context-specific behaviors
 */
function applyContextBehaviors(deltaTime: number): void {
  if (!physicsState) return;

  const context = physicsState.currentContext;
  const config = physicsState.activeConfig;

  nodes.forEach(node => {
    // Update animation state based on context
    updateNodeAnimationState(node, config, context);

    // Update visual properties
    updateNodeVisualProperties(node, config, context);

    // Update attention weight
    updateNodeAttentionWeight(node, config);
  });

  links.forEach(link => {
    updateLinkVisualProperties(link, config, context);
  });
}

/**
 * Update node animation state
 */
function updateNodeAnimationState(node: WorkerNode, config: any, context: string): void {
  if (node.isTargetNode) {
    node.animationState = 'highlighted';
    node.pulseIntensity = config.nodeAnimationIntensity * 1.5;
  } else if (node.contextRelevance[context] > 0.7) {
    node.animationState = context === 'CreativeFlow' ? 'sparking' : 'pulsing';
    node.pulseIntensity = config.nodeAnimationIntensity;
  } else {
    node.animationState = 'idle';
    node.pulseIntensity = config.nodeAnimationIntensity * 0.3;
  }
}

/**
 * Update node visual properties
 */
function updateNodeVisualProperties(node: WorkerNode, config: any, context: string): void {
  const relevance = node.contextRelevance[context];

  // Determine visibility category
  let visibilityCategory: 'focused' | 'peripheral' | 'hidden';
  if (node.isTargetNode || relevance > 0.8) {
    visibilityCategory = 'focused';
  } else if (relevance > 0.3) {
    visibilityCategory = 'peripheral';
  } else {
    visibilityCategory = 'hidden';
  }

  // Update opacity
  const targetOpacity = config.nodeVisibility[visibilityCategory];
  node.adaptiveOpacity = lerp(node.adaptiveOpacity, targetOpacity, 0.1);

  // Update size
  const baseSize = config.adaptive ?
    (node.cognitiveLoad * 0.5 + node.masteryLevel * 0.3 + relevance * 0.2) *
    (config.nodeSize.max - config.nodeSize.min) + config.nodeSize.min :
    node.size;

  const cognitiveReduction = 1 - config.cognitiveLoadReduction;
  const targetSize = baseSize * cognitiveReduction * (node.isTargetNode ? 1.2 : 1.0);

  node.adaptiveSize = lerp(node.adaptiveSize, targetSize, 0.1);

  // Update glow effect
  node.glowEffect = node.isTargetNode ? config.selectionFeedback : 0;
}

/**
 * Update node attention weight
 */
function updateNodeAttentionWeight(node: WorkerNode, config: any): void {
  let attentionWeight = 1.0;

  if (node.isTargetNode) {
    attentionWeight *= config.attentionGuidance;
  }

  attentionWeight *= (1 - node.cognitiveLoad * 0.3) * (1 + node.masteryLevel * 0.2);
  node.attentionWeight = lerp(node.attentionWeight, attentionWeight, 0.1);
}

/**
 * Update link visual properties
 */
function updateLinkVisualProperties(link: WorkerLink, config: any, context: string): void {
  const relevance = link.contextRelevance[context];

  const targetOpacity = relevance > config.linkVisibilityThreshold ?
    relevance * config.connectionEmphasis : 0;

  link.adaptiveVisibility = lerp(link.adaptiveVisibility, targetOpacity, 0.1);
  link.flowDirection = getLinkFlowDirection(link, context, config);
  link.animationSpeed = config.nodeAnimationIntensity;
}

/**
 * Get link flow direction based on context
 */
function getLinkFlowDirection(link: WorkerLink, context: string, config: any): 'none' | 'forward' | 'backward' | 'bidirectional' {
  switch (config.linkAnimationStyle) {
    case 'flowing':
      return link.type === 'prerequisite' ? 'forward' : 'bidirectional';
    case 'sparking':
      return 'bidirectional';
    case 'pulsing':
      return 'none';
    case 'static':
    default:
      return 'none';
  }
}

/**
 * Linear interpolation utility
 */
function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

// ==================== MESSAGE HANDLERS ====================

/**
 * Handle initialization message
 */
function handleInit(data: InitMessageData, messageId: string): void {
  config = data.config;
  physicsState = data.state;
  isInitialized = true;

  console.log('🎯 Physics Worker initialized');

  postMessage({
    type: 'initialized',
    id: messageId,
    data: { success: true },
  } as PhysicsWorkerResponse);
}

/**
 * Handle graph update message
 */
function handleUpdateGraph(data: UpdateGraphMessageData, messageId: string): void {
  nodes = data.nodes.map(node => ({ ...node })); // Deep copy
  links = data.links.map(link => ({ ...link }));

  // Update physics state
  if (physicsState) {
    physicsState.nodeCount = nodes.length;
    physicsState.linkCount = links.length;
  }

  console.log(`🔬 Graph updated: ${nodes.length} nodes, ${links.length} links`);

  postMessage({
    type: 'graph_updated',
    id: messageId,
    data: { nodeCount: nodes.length, linkCount: links.length },
  } as PhysicsWorkerResponse);
}

/**
 * Handle simulation step message
 */
function handleSimulateStep(data: SimulateStepMessageData, messageId: string): void {
  if (!isInitialized || !config || !physicsState) {
    postMessage({
      type: 'error',
      id: messageId,
      error: 'Worker not initialized',
    } as PhysicsWorkerResponse);
    return;
  }

  const { deltaTime, currentTime } = data;

  // Calculate FPS
  if (lastFrameTime > 0) {
    currentFPS = 1000 / Math.max(deltaTime, 1);
  }
  lastFrameTime = currentTime;
  frameCount++;

  // Run physics step
  calculateLinkForces(deltaTime);
  calculateRepulsionForces(deltaTime);
  applyTargetNodeMagnetism(deltaTime);
  updatePositions(deltaTime);
  applyContextBehaviors(deltaTime);

  // Emit position updates every few frames for performance
  if (frameCount % 3 === 0) {
    const positionsData: PositionsResponseData = {
      nodes: nodes.map(node => ({
        id: node.id,
        x: node.x,
        y: node.y,
        size: node.adaptiveSize,
        opacity: node.adaptiveOpacity,
        glow: node.glowEffect,
        animation: node.animationState,
        pulseIntensity: node.pulseIntensity,
      })),
      links: links.map(link => ({
        id: link.id,
        opacity: link.adaptiveVisibility,
        width: link.width,
        flow: link.flowDirection,
        animationSpeed: link.animationSpeed,
      })),
      timestamp: currentTime,
    };

    postMessage({
      type: 'positions_updated',
      id: messageId,
      data: positionsData,
    } as PhysicsWorkerResponse);
  }

  postMessage({
    type: 'step_completed',
    id: messageId,
    data: { fps: currentFPS },
  } as PhysicsWorkerResponse);
}

/**
 * Handle context update message
 */
function handleUpdateContext(data: UpdateContextMessageData, messageId: string): void {
  if (!physicsState) return;

  const { context, cognitiveLoad, targetNodeId, config: newConfig } = data;

  physicsState.currentContext = context;
  physicsState.cognitiveLoad = cognitiveLoad;
  physicsState.targetNodeId = targetNodeId;
  physicsState.activeConfig = newConfig;

  // Update target node flag
  nodes.forEach(node => {
    node.isTargetNode = node.id === targetNodeId;
  });

  console.log(`🔄 Context updated: ${context}, load: ${cognitiveLoad}`);

  postMessage({
    type: 'context_updated',
    id: messageId,
    data: { context, cognitiveLoad },
  } as PhysicsWorkerResponse);
}

/**
 * Handle get positions message
 */
function handleGetPositions(messageId: string): void {
  const positionsData: PositionsResponseData = {
    nodes: nodes.map(node => ({
      id: node.id,
      x: node.x,
      y: node.y,
      size: node.adaptiveSize,
      opacity: node.adaptiveOpacity,
      glow: node.glowEffect,
      animation: node.animationState,
      pulseIntensity: node.pulseIntensity,
    })),
    links: links.map(link => ({
      id: link.id,
      opacity: link.adaptiveVisibility,
      width: link.width,
      flow: link.flowDirection,
      animationSpeed: link.animationSpeed,
    })),
    timestamp: Date.now(),
  };

  postMessage({
    type: 'positions_updated',
    id: messageId,
    data: positionsData,
  } as PhysicsWorkerResponse);
}

// ==================== MAIN MESSAGE HANDLER ====================

self.onmessage = function(e: MessageEvent) {
  const message = e.data;

  if (!isPhysicsMessage(message)) {
    postMessage({
      type: 'error',
      id: message.id || 'unknown',
      error: 'Invalid message format',
    } as PhysicsWorkerResponse);
    return;
  }

  try {
    switch (message.type) {
      case 'init':
        handleInit(message.data, message.id);
        break;

      case 'update_graph':
        handleUpdateGraph(message.data, message.id);
        break;

      case 'simulate_step':
        handleSimulateStep(message.data, message.id);
        break;

      case 'update_context':
        handleUpdateContext(message.data, message.id);
        break;

      case 'get_positions':
        handleGetPositions(message.id);
        break;

      case 'dispose':
        // Cleanup
        nodes = [];
        links = [];
        config = null;
        physicsState = null;
        isInitialized = false;
        postMessage({
          type: 'disposed',
          id: message.id,
          data: { success: true },
        } as PhysicsWorkerResponse);
        break;

      default:
        postMessage({
          type: 'error',
          id: message.id,
          error: `Unknown message type: ${message.type}`,
        } as PhysicsWorkerResponse);
    }
  } catch (error) {
    postMessage({
      type: 'error',
      id: message.id,
      error: (error as Error).message,
    } as PhysicsWorkerResponse);
  }
};

// Export for TypeScript (will be compiled to work in worker context)
export {};
