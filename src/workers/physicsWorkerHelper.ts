export type Node = { id: string; x?: number; y?: number };

export const computeNeuralLayout = (nodes: Node[], edges: Array<[string, string]>) => {
  const width = 800;
  const height = 600;
  const cols = Math.ceil(Math.sqrt(nodes.length || 1));

  return nodes.map((n, i) => ({
    id: n.id,
    x: ((i % cols) / Math.max(1, cols - 1)) * width,
    y: (Math.floor(i / cols) / Math.max(1, Math.ceil(nodes.length / cols) - 1)) * height,
  }));
};

export default { computeNeuralLayout };
