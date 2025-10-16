// Lightweight performance utilities for automated tests

export async function measureAsync(fn: () => Promise<any>, iterations = 5): Promise<number> {
  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await fn();
    const end = Date.now();
    times.push(end - start);
    // small pause to allow GC in environments that support it
    await new Promise((r) => setTimeout(r, 50));
  }
  // return median
  times.sort((a, b) => a - b);
  if (times.length === 0) return 0;
  const idx = Math.floor(times.length / 2);
  return typeof times[idx] === 'number' ? (times[idx] as number) : 0;
}

export function simpleMemorySnapshot(): { heapUsed?: number } {
  try {
    // In Node/Jest environment process.memoryUsage is available
    const mem = (process as any).memoryUsage?.();
    if (!mem) return {};
    return { heapUsed: mem.heapUsed };
  } catch (e) {
    return {};
  }
}

export function diffMemory(before: { heapUsed?: number }, after: { heapUsed?: number }) {
  if (typeof before.heapUsed === 'number' && typeof after.heapUsed === 'number') {
    return after.heapUsed - before.heapUsed;
  }
  return undefined;
}
