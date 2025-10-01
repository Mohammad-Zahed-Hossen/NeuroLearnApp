/**
 * Simple EMA helper used by CognitiveSoundscapeEngine
 */
export function updateEMA(
  prev: number | undefined,
  value: number,
  alpha = 0.2,
) {
  const initial = typeof prev === 'number' ? prev : value;
  return initial * (1 - alpha) + value * alpha;
}

export default { updateEMA };
