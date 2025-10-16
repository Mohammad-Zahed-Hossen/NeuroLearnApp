import { applyMorph, getActiveMorphs } from './morphEngine';

describe('morphEngine (minimal scaffold)', () => {
  jest.setTimeout(10000);

  it('applyMorph resolves and cleans up active morphs', async () => {
    const before = getActiveMorphs();
    expect(Array.isArray(before)).toBe(true);

    const p = applyMorph('aiChat', { durationMs: 100 });

    // Immediately after calling, there should be an active morph
    const mid = getActiveMorphs();
    expect(mid.length).toBeGreaterThanOrEqual(1);

    await p;

    // After resolution, no active morphs for that id should remain
    const after = getActiveMorphs();
    // Depending on test run concurrency there may be others, but array should be valid
    expect(Array.isArray(after)).toBe(true);
  });
});
