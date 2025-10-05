// physicsWorker.js - Web Worker for offloading expensive physics calculations

self.onmessage = function(e) {
  const { type, data } = e.data;
  
  if (type === 'computeForces') {
    const { nodes, links, config, currentCognitiveLoad, focusNodeId, isFocusLocked, focusConnectedNodes } = data;
    
    try {
      // Reset temporary velocities
      nodes.forEach(node => {
        node.tempVx = (node.tempVx || 0);
        node.tempVy = (node.tempVy || 0);
      });
      
      // Compute Link Forces (simplified version of d3.forceLink)
      if (links && links.length > 0) {
        links.forEach(link => {
          let source = typeof link.source === 'object' ? link.source : nodes.find(n => n.id === link.source);
          let target = typeof link.target === 'object' ? link.target : nodes.find(n => n.id === link.target);
          
          if (!source || !target) return;
          
          const x1 = source.x || 0;
          const y1 = source.y || 0;
          const x2 = target.x || 0;
          const y2 = target.y || 0;
          
          const dx = x2 - x1;
          const dy = y2 - y1;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          // Calculate desired distance based on config and state
          let desiredDistance = config.linkDistance;
          if (currentCognitiveLoad > 0.7) {
            desiredDistance *= 1.4;
          } else if (currentCognitiveLoad < 0.3) {
            desiredDistance *= 0.7;
          }
          
          if (focusNodeId) {
            const sourceId = source.id;
            const targetId = target.id;
            if (sourceId === focusNodeId || targetId === focusNodeId) {
              desiredDistance *= isFocusLocked ? 0.4 : 0.6;
            } else if (focusConnectedNodes.has(sourceId) || focusConnectedNodes.has(targetId)) {
              desiredDistance *= isFocusLocked ? 0.6 : 0.8;
            } else {
              desiredDistance *= isFocusLocked ? 2.5 : 1.5;
            }
          }
          
          const difference = desiredDistance - distance;
          let strength = config.linkStrength * (link.strength || 0.5);
          
          if (focusNodeId) {
            const sourceId = source.id;
            const targetId = target.id;
            if (sourceId === focusNodeId || targetId === focusNodeId) {
              strength *= isFocusLocked ? config.lockStrength : config.focusStrength;
            } else if (focusConnectedNodes.has(sourceId) || focusConnectedNodes.has(targetId)) {
              strength *= isFocusLocked ? 2.0 : 1.5;
            } else {
              strength *= isFocusLocked ? 0.1 : 0.3;
            }
          }
          
          const forceMagnitude = (difference * strength) / distance;
          
          const fx = (dx / distance) * forceMagnitude;
          const fy = (dy / distance) * forceMagnitude;
          
          source.tempVx += fx;
          source.tempVy += fy;
          target.tempVx -= fx;
          target.tempVy -= fy;
        });
      }
      
      // Compute Many-Body Forces (simplified version of d3.forceManyBody)
      for (let i = 0; i < nodes.length; i++) {
        const nodeI = nodes[i];
        let baseStrength = config.repulsion;
        
        if (currentCognitiveLoad > 0.7) {
          baseStrength *= 1.5;
        } else if (currentCognitiveLoad < 0.3) {
          baseStrength *= 0.7;
        }
        
        if (focusNodeId) {
          if (nodeI.id === focusNodeId) {
            baseStrength *= (isFocusLocked ? 0.3 : 0.5);
          } else if (focusConnectedNodes.has(nodeI.id)) {
            // normal
          } else {
            baseStrength = isFocusLocked ? config.lockRepulsion : config.distractionRepulsion;
          }
        }
        
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeJ = nodes[j];
          
          const x1 = nodeI.x || 0;
          const y1 = nodeI.y || 0;
          const x2 = nodeJ.x || 0;
          const y2 = nodeJ.y || 0;
          
          const dx = x2 - x1;
          const dy = y2 - y1;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 1 || distance > (isFocusLocked ? 300 : 200)) continue;
          
          const force = baseStrength / distance;
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          
          // Apply to both nodes (symmetric)
          nodeI.tempVx += fx;
          nodeI.tempVy += fy;
          nodeJ.tempVx -= fx;
          nodeJ.tempVy -= fy;
        }
      }
      
      // Apply temporary velocities to actual vx, vy
      nodes.forEach(node => {
        node.vx = (node.vx || 0) + (node.tempVx || 0);
        node.vy = (node.vy || 0) + (node.tempVy || 0);
        delete node.tempVx;
        delete node.tempVy;
      });
      
      // Send back updated nodes
      self.postMessage({
        type: 'forcesComputed',
        nodes: nodes
      });
      
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error.message
      });
    }
  }
};
