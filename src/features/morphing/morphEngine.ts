// morphEngine - single clean minimal implementation
// Improved morphEngine: drives provided shared values (eg. Reanimated `sharedValue.value`)
// and performs simple JS interpolation (timing) or a lightweight spring approximation.
type MorphSpec = {
  scale?: number;
  opacity?: number;
  color?: string;
  durationMs?: number;
  easing?: 'spring' | 'timing';
  opacityOnly?: boolean;
};

type SharedHandles = {
  scale?: { value: number } | any;
  opacity?: { value: number } | any;
};

type InternalMorph = {
  id: string;
  elementId: string;
  spec: MorphSpec;
  shared?: SharedHandles | undefined;
  cancel: () => void;
};

const activeMorphs = new Map<string, InternalMorph>();
const DEFAULT_DURATION = 300;

function nowMs() {
  return new Date().getTime();
}

function safeSetShared(sharedVal: any, next: number) {
  try {
    if (!sharedVal) return;
    // Support Reanimated-like shared values (.value) or plain objects with set
    if (typeof sharedVal === 'object' && 'value' in sharedVal) {
      sharedVal.value = next;
    } else if (typeof sharedVal === 'function') {
      sharedVal(next);
    } else if (typeof sharedVal.set === 'function') {
      sharedVal.set(next);
    }
  } catch (e) {
    // swallow errors - animation is best-effort
  }
}

export function applyMorph(
  elementId: string,
  spec: MorphSpec = {},
  shared?: SharedHandles,
): Promise<{ status: 'finished' | 'aborted' }> {
  const id = `${elementId}_${nowMs()}_${Math.random().toString(36).slice(2, 6)}`;

  // Cancel existing morphs for element
  Array.from(activeMorphs.values())
    .filter((m) => m.elementId === elementId)
    .forEach((m) => m.cancel());

  let cancelled = false;
  const dur = Math.max(50, spec.durationMs ?? DEFAULT_DURATION);
  const startTime = nowMs();

  // Capture start values (if provided) and target values
  const startScale = (shared && shared.scale && typeof shared.scale.value === 'number') ? shared.scale.value : 1;
  const startOpacity = (shared && shared.opacity && typeof shared.opacity.value === 'number') ? shared.opacity.value : 1;

  const targetScale = spec.scale !== undefined ? spec.scale : startScale;
  const targetOpacity = spec.opacity !== undefined ? spec.opacity : startOpacity;

  const easing = spec.easing || 'timing';

  let rafHandle: any = null;

  const promise = new Promise<{ status: 'finished' | 'aborted' }>((resolve) => {
    function step() {
      const elapsed = nowMs() - startTime;
      const t = Math.min(1, elapsed / dur);

      // easing functions
      let k = t;
      if (easing === 'spring') {
        // lightweight spring-ish easing (damped oscillation approximation)
        const damping = 0.6;
        k = 1 - Math.exp(-3 * t) * Math.cos(12 * t) * damping;
      } else {
        // timing: ease-out cubic
        k = 1 - Math.pow(1 - t, 3);
      }

      // Interpolate
      const nextScale = startScale + (targetScale - startScale) * k;
      const nextOpacity = startOpacity + (targetOpacity - startOpacity) * k;

      if (!(spec.opacityOnly)) {
        safeSetShared(shared && shared.scale, nextScale);
      }
      safeSetShared(shared && shared.opacity, nextOpacity);

      if (t < 1 && !cancelled) {
        // schedule next frame - prefer requestAnimationFrame if available
        if (typeof requestAnimationFrame !== 'undefined') {
          rafHandle = requestAnimationFrame(step as any);
        } else {
          rafHandle = setTimeout(step, 16);
        }
        return;
      }

      // finished
      try {
        activeMorphs.delete(id);
      } catch (e) {}

      resolve({ status: cancelled ? 'aborted' : 'finished' });
    }

    const cancel = () => {
      cancelled = true;
      try {
        if (rafHandle && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(rafHandle);
        else if (rafHandle) clearTimeout(rafHandle);
      } catch (e) {}
      try {
        activeMorphs.delete(id);
      } catch (e) {}
      resolve({ status: 'aborted' });
    };

    activeMorphs.set(id, { id, elementId, spec, shared, cancel });

    // kick off
    step();
  });

  return promise;
}

export function cancelMorph(idOrElementId: string) {
  const byId = activeMorphs.get(idOrElementId);
  if (byId) {
    byId.cancel();
    return true;
  }
  let found = false;
  Array.from(activeMorphs.values())
    .filter((m) => m.elementId === idOrElementId)
    .forEach((m) => {
      m.cancel();
      found = true;
    });
  return found;
}

export function getActiveMorphs() {
  return Array.from(activeMorphs.values()).map((m) => ({ id: m.id, elementId: m.elementId, spec: m.spec }));
}

export default {
  applyMorph,
  cancelMorph,
  getActiveMorphs,
};
