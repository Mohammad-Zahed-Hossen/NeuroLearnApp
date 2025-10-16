// Simple per-screen performance budgets helper
export type PerfBudget = {
  screen: string;
  op: string;
  maxMs: number;
};

const DEFAULT_BUDGETS: PerfBudget[] = [
  { screen: 'StorageMonitoringScreen', op: 'refresh', maxMs: 500 },
  { screen: 'StorageMonitoringScreen', op: 'render', maxMs: 250 },
];

export function getBudgets(): PerfBudget[] {
  return DEFAULT_BUDGETS;
}

export function checkPerfBudget(screen: string, ms: number, op: string) {
  const found = DEFAULT_BUDGETS.find(b => b.screen === screen && b.op === op);
  if (!found) return { ok: true, budget: null };
  return { ok: ms <= found.maxMs, budget: found };
}

export default { getBudgets, checkPerfBudget };
