import { useEffect, useRef } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import morphEngine from './morphEngine';

export type MorphSpec = {
  scale?: number;
  opacity?: number;
  durationMs?: number;
  easing?: 'spring' | 'timing';
};

/**
 * useMorph - returns Reanimated shared values bound to a morph id.
 * It registers a morph with the central morphEngine and keeps local
 * references to the shared values so components can bind animated styles.
 */
export default function useMorph(id: string, spec?: MorphSpec) {
  const scale = useSharedValue<number>(1);
  const opacity = useSharedValue<number>(1);

  const registeredRef = useRef(false);

  useEffect(() => {
    // Build a spec object that omits undefined fields so typechecking is happy
    const safeSpec: any = {};
    if (spec?.scale !== undefined) safeSpec.scale = spec.scale;
    if (spec?.opacity !== undefined) safeSpec.opacity = spec.opacity;
    if (spec?.durationMs !== undefined) safeSpec.durationMs = spec.durationMs;
    if (spec?.easing !== undefined) safeSpec.easing = spec.easing;

    // applyMorph will use the shared values we provide so components can bind to them
    const active = morphEngine.applyMorph(id, safeSpec, { scale, opacity });

    registeredRef.current = true;

    return () => {
      if (registeredRef.current) {
        morphEngine.cancelMorph(id);
        registeredRef.current = false;
      }
    };
    // Intentionally run only when id changes; spec updates should be applied via applyMorph manually
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return { scale, opacity };
}
