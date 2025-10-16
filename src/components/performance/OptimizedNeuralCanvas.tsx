import React from 'react';
import { NeuralMindMap } from '../../components/ai/NeuralCanvas';

// Adapter: delegate to the canonical NeuralMindMap component to avoid
// duplication and keep a single maintainable implementation for canvas logic.
const OptimizedNeuralCanvas: React.FC<any> = (props) => {
  return <NeuralMindMap {...props} />;
};

export default OptimizedNeuralCanvas;
